// ============================================
// ACCUTE ORCHESTRATOR - Authentication Middleware
// SuperAdmin & Tenant Authentication for Command Center
// ============================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pino from 'pino';

const logger = pino({ name: 'auth-middleware' });

// ============================================
// TYPES
// ============================================

export interface AuthenticatedRequest extends Request {
  userId?: string;
  username?: string;
  role?: 'superadmin' | 'admin' | 'operator' | 'viewer';
  tenantId?: string;
  isSuperAdmin?: boolean;
  superadminSession?: string;
  permissions?: string[];
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  tenantId: string;
  superadminSession?: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
}

// ============================================
// CONFIGURATION
// ============================================

const AUTH_CONFIG = {
  // JWT secret - MUST be set in environment
  jwtSecret: process.env.JWT_SECRET || process.env.SUPERADMIN_MASTER_KEY || 'finaceverse-jwt-secret-change-in-production',
  
  // Issuer for JWT validation
  issuer: process.env.JWT_ISSUER || 'finaceverse-platform',
  
  // Allowed roles for command center access
  allowedRoles: ['superadmin', 'admin', 'operator', 'viewer'] as const,
  
  // Role hierarchy (higher number = more permissions)
  roleHierarchy: {
    superadmin: 100,
    admin: 80,
    operator: 60,
    viewer: 40,
  } as Record<string, number>,
  
  // Endpoints that don't require authentication
  publicEndpoints: [
    '/health',
    '/api/health',
    '/api/v1/health',
    '/metrics',
  ],
  
  // Rate limiting for failed auth attempts
  maxFailedAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
};

// ============================================
// FAILED ATTEMPTS TRACKING
// ============================================

interface FailedAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

const failedAttempts = new Map<string, FailedAttempt>();

function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function isLockedOut(ip: string): boolean {
  const attempt = failedAttempts.get(ip);
  if (!attempt || !attempt.lockedUntil) return false;
  if (Date.now() > attempt.lockedUntil) {
    failedAttempts.delete(ip);
    return false;
  }
  return true;
}

function recordFailedAttempt(ip: string): void {
  const attempt = failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  attempt.count++;
  attempt.lastAttempt = Date.now();
  
  if (attempt.count >= AUTH_CONFIG.maxFailedAttempts) {
    attempt.lockedUntil = Date.now() + AUTH_CONFIG.lockoutDuration;
    logger.warn({ ip, attempts: attempt.count }, 'IP locked out due to failed auth attempts');
  }
  
  failedAttempts.set(ip, attempt);
}

function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

// ============================================
// TOKEN VERIFICATION
// ============================================

function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, AUTH_CONFIG.jwtSecret, {
      issuer: AUTH_CONFIG.issuer,
    }) as unknown as JWTPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.debug('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.debug({ error: (error as Error).message }, 'Invalid token');
    }
    return null;
  }
}

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

/**
 * Main authentication middleware for Command Center APIs
 * Validates JWT tokens and sets user context on request
 */
export function requireAuth(
  options: {
    requireSuperAdmin?: boolean;
    minimumRole?: 'superadmin' | 'admin' | 'operator' | 'viewer';
    requiredPermissions?: string[];
  } = {}
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const ip = getClientIP(req);
    
    // Check if endpoint is public
    const isPublicEndpoint = AUTH_CONFIG.publicEndpoints.some(
      endpoint => req.path === endpoint || req.path.endsWith(endpoint)
    );
    
    if (isPublicEndpoint) {
      return next();
    }
    
    // Check lockout
    if (isLockedOut(ip)) {
      logger.warn({ ip }, 'Request from locked out IP');
      res.status(429).json({
        error: 'Too many failed authentication attempts',
        code: 'LOCKED_OUT',
        retryAfter: Math.ceil(AUTH_CONFIG.lockoutDuration / 1000),
      });
      return;
    }
    
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      recordFailedAttempt(ip);
      res.status(401).json({
        error: 'Authentication required',
        code: 'NO_TOKEN',
        message: 'Please provide a valid Bearer token in the Authorization header',
      });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      recordFailedAttempt(ip);
      res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
      return;
    }
    
    // Check role is allowed
    if (!AUTH_CONFIG.allowedRoles.includes(payload.role as typeof AUTH_CONFIG.allowedRoles[number])) {
      recordFailedAttempt(ip);
      logger.warn({ role: payload.role, userId: payload.userId }, 'Unauthorized role attempted access');
      res.status(403).json({
        error: 'Insufficient permissions',
        code: 'UNAUTHORIZED_ROLE',
      });
      return;
    }
    
    // Check if superadmin is required
    if (options.requireSuperAdmin && payload.role !== 'superadmin') {
      logger.warn({ role: payload.role, userId: payload.userId }, 'Non-superadmin attempted superadmin action');
      res.status(403).json({
        error: 'SuperAdmin access required',
        code: 'SUPERADMIN_REQUIRED',
      });
      return;
    }
    
    // Check minimum role requirement
    if (options.minimumRole) {
      const userLevel = AUTH_CONFIG.roleHierarchy[payload.role] || 0;
      const requiredLevel = AUTH_CONFIG.roleHierarchy[options.minimumRole] || 0;
      
      if (userLevel < requiredLevel) {
        logger.warn(
          { role: payload.role, requiredRole: options.minimumRole, userId: payload.userId },
          'User role below minimum required'
        );
        res.status(403).json({
          error: `Minimum role required: ${options.minimumRole}`,
          code: 'INSUFFICIENT_ROLE',
        });
        return;
      }
    }
    
    // Check required permissions
    if (options.requiredPermissions && options.requiredPermissions.length > 0) {
      const userPermissions = payload.permissions || [];
      const hasAllPermissions = options.requiredPermissions.every(
        perm => userPermissions.includes(perm) || payload.role === 'superadmin'
      );
      
      if (!hasAllPermissions) {
        logger.warn(
          { required: options.requiredPermissions, has: userPermissions, userId: payload.userId },
          'Missing required permissions'
        );
        res.status(403).json({
          error: 'Missing required permissions',
          code: 'MISSING_PERMISSIONS',
          required: options.requiredPermissions,
        });
        return;
      }
    }
    
    // Clear failed attempts on successful auth
    clearFailedAttempts(ip);
    
    // Set user context on request
    req.userId = payload.userId;
    req.username = payload.username;
    req.role = payload.role as AuthenticatedRequest['role'];
    req.tenantId = payload.tenantId;
    req.isSuperAdmin = payload.role === 'superadmin';
    req.superadminSession = payload.superadminSession;
    req.permissions = payload.permissions;
    
    // Log successful authentication
    logger.debug(
      { userId: payload.userId, role: payload.role, tenantId: payload.tenantId },
      'Request authenticated'
    );
    
    next();
  };
}

/**
 * Convenience middleware: Require superadmin access
 */
export const requireSuperAdmin = requireAuth({ requireSuperAdmin: true });

/**
 * Convenience middleware: Require admin or higher
 */
export const requireAdmin = requireAuth({ minimumRole: 'admin' });

/**
 * Convenience middleware: Require operator or higher
 */
export const requireOperator = requireAuth({ minimumRole: 'operator' });

/**
 * Convenience middleware: Basic authentication (viewer or higher)
 */
export const requireViewer = requireAuth({ minimumRole: 'viewer' });

// ============================================
// TENANT ISOLATION MIDDLEWARE
// ============================================

/**
 * Ensures requests are properly scoped to a tenant
 * SuperAdmins can access any tenant, others are restricted
 */
export function enforceTenantIsolation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // SuperAdmins can bypass tenant isolation
  if (req.isSuperAdmin) {
    // SuperAdmin can optionally specify a tenant via header
    const headerTenantId = req.headers['x-tenant-id'] as string;
    if (headerTenantId) {
      req.tenantId = headerTenantId;
    }
    return next();
  }
  
  // Non-superadmins must have a tenantId
  if (!req.tenantId) {
    res.status(400).json({
      error: 'Tenant context required',
      code: 'NO_TENANT',
    });
    return;
  }
  
  // Ensure request doesn't try to access other tenants
  const headerTenantId = req.headers['x-tenant-id'] as string;
  if (headerTenantId && headerTenantId !== req.tenantId) {
    logger.warn(
      { requestedTenant: headerTenantId, userTenant: req.tenantId, userId: req.userId },
      'User attempted to access different tenant'
    );
    res.status(403).json({
      error: 'Cannot access resources from another tenant',
      code: 'TENANT_MISMATCH',
    });
    return;
  }
  
  next();
}

// ============================================
// AUDIT LOGGING MIDDLEWARE
// ============================================

export interface AuditLogEntry {
  timestamp: string;
  userId: string;
  username: string;
  role: string;
  tenantId: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  success: boolean;
  statusCode?: number;
  duration?: number;
  error?: string;
}

// Audit log storage (in production, this would go to database/external service)
const auditLog: AuditLogEntry[] = [];
const MAX_AUDIT_LOG_SIZE = 10000;

/**
 * Middleware to log all authenticated actions for audit trail
 */
export function auditLogger(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const ip = getClientIP(req);
  
  // Capture response to log status
  const originalSend = res.send.bind(res);
  res.send = function(body: unknown) {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      userId: req.userId || 'anonymous',
      username: req.username || 'anonymous',
      role: req.role || 'none',
      tenantId: req.tenantId || 'none',
      action: getActionFromMethod(req.method),
      resource: getResourceFromPath(req.path),
      resourceId: extractResourceId(req.path),
      method: req.method,
      path: req.path,
      ip,
      userAgent: req.headers['user-agent'] || 'unknown',
      success: res.statusCode >= 200 && res.statusCode < 400,
      statusCode: res.statusCode,
      duration: Date.now() - startTime,
    };
    
    // Add to audit log
    auditLog.push(entry);
    
    // Trim if too large
    if (auditLog.length > MAX_AUDIT_LOG_SIZE) {
      auditLog.splice(0, Math.floor(MAX_AUDIT_LOG_SIZE * 0.1));
    }
    
    // Log to console for monitoring
    if (!entry.success) {
      logger.warn(entry, 'Audit: Failed request');
    } else if (entry.action !== 'READ') {
      logger.info(entry, 'Audit: Mutation request');
    }
    
    return originalSend(body);
  };
  
  next();
}

function getActionFromMethod(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET': return 'READ';
    case 'POST': return 'CREATE';
    case 'PUT': return 'UPDATE';
    case 'PATCH': return 'PATCH';
    case 'DELETE': return 'DELETE';
    default: return method;
  }
}

function getResourceFromPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  // Return the first non-api segment as the resource
  for (const segment of segments) {
    if (segment !== 'api' && segment !== 'v1' && segment !== 'v2') {
      return segment;
    }
  }
  return 'unknown';
}

function extractResourceId(path: string): string | undefined {
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = path.match(uuidRegex);
  return match ? match[0] : undefined;
}

/**
 * Get audit log entries (for admin dashboard)
 */
export function getAuditLog(options: {
  limit?: number;
  userId?: string;
  tenantId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
}): AuditLogEntry[] {
  let filtered = [...auditLog];
  
  if (options.userId) {
    filtered = filtered.filter(e => e.userId === options.userId);
  }
  if (options.tenantId) {
    filtered = filtered.filter(e => e.tenantId === options.tenantId);
  }
  if (options.action) {
    filtered = filtered.filter(e => e.action === options.action);
  }
  if (options.startDate) {
    filtered = filtered.filter(e => new Date(e.timestamp) >= options.startDate!);
  }
  if (options.endDate) {
    filtered = filtered.filter(e => new Date(e.timestamp) <= options.endDate!);
  }
  
  return filtered.slice(-(options.limit || 100)).reverse();
}

// ============================================
// EXPORT ALL
// ============================================

export default {
  requireAuth,
  requireSuperAdmin,
  requireAdmin,
  requireOperator,
  requireViewer,
  enforceTenantIsolation,
  auditLogger,
  getAuditLog,
  AUTH_CONFIG,
};
