// ============================================
// PARTNER PORTAL - Authentication Middleware
// SuperAdmin & Tenant Authentication for Partner Management
// ============================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pino from 'pino';

const logger = pino({ name: 'partner-portal-auth' });

// ============================================
// TYPES
// ============================================

export interface AuthenticatedRequest extends Request {
  userId?: string;
  username?: string;
  role?: 'superadmin' | 'admin' | 'operator' | 'viewer' | 'partner';
  tenantId?: string;
  isSuperAdmin?: boolean;
  superadminSession?: string;
  permissions?: string[];
  partnerId?: string; // For partner-specific authentication
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  tenantId: string;
  superadminSession?: string;
  permissions?: string[];
  partnerId?: string;
  iat?: number;
  exp?: number;
}

// ============================================
// CONFIGURATION
// ============================================

const AUTH_CONFIG = {
  jwtSecret: process.env.JWT_SECRET || process.env.SUPERADMIN_MASTER_KEY || 'finaceverse-jwt-secret-change-in-production',
  issuer: process.env.JWT_ISSUER || 'finaceverse-platform',
  
  allowedRoles: ['superadmin', 'admin', 'operator', 'viewer', 'partner'] as const,
  
  roleHierarchy: {
    superadmin: 100,
    admin: 80,
    operator: 60,
    viewer: 40,
    partner: 30, // Partners have limited access
  } as Record<string, number>,
  
  publicEndpoints: [
    '/health',
    '/api/health',
  ],
  
  maxFailedAttempts: 5,
  lockoutDuration: 15 * 60 * 1000,
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
    logger.warn({ ip, attempts: attempt.count }, 'IP locked out');
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
    return jwt.verify(token, AUTH_CONFIG.jwtSecret, {
      issuer: AUTH_CONFIG.issuer,
    }) as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

export function requireAuth(
  options: {
    requireSuperAdmin?: boolean;
    minimumRole?: 'superadmin' | 'admin' | 'operator' | 'viewer' | 'partner';
    requiredPermissions?: string[];
    allowPartner?: boolean; // Allow partner role access
  } = {}
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const ip = getClientIP(req);
    
    // Check if endpoint is public
    if (AUTH_CONFIG.publicEndpoints.some(ep => req.path === ep || req.path.endsWith(ep))) {
      return next();
    }
    
    // Check lockout
    if (isLockedOut(ip)) {
      res.status(429).json({ error: 'Too many failed attempts', code: 'LOCKED_OUT' });
      return;
    }
    
    // Extract token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      recordFailedAttempt(ip);
      res.status(401).json({ error: 'Authentication required', code: 'NO_TOKEN' });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    
    if (!payload) {
      recordFailedAttempt(ip);
      res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
      return;
    }
    
    // Check role
    if (!AUTH_CONFIG.allowedRoles.includes(payload.role as typeof AUTH_CONFIG.allowedRoles[number])) {
      recordFailedAttempt(ip);
      res.status(403).json({ error: 'Unauthorized role', code: 'UNAUTHORIZED_ROLE' });
      return;
    }
    
    // Handle partner-specific access
    if (payload.role === 'partner' && !options.allowPartner) {
      res.status(403).json({ error: 'Partner access not allowed for this endpoint', code: 'PARTNER_NOT_ALLOWED' });
      return;
    }
    
    // Check superadmin requirement
    if (options.requireSuperAdmin && payload.role !== 'superadmin') {
      res.status(403).json({ error: 'SuperAdmin access required', code: 'SUPERADMIN_REQUIRED' });
      return;
    }
    
    // Check minimum role
    if (options.minimumRole) {
      const userLevel = AUTH_CONFIG.roleHierarchy[payload.role] || 0;
      const requiredLevel = AUTH_CONFIG.roleHierarchy[options.minimumRole] || 0;
      
      if (userLevel < requiredLevel) {
        res.status(403).json({ error: `Minimum role required: ${options.minimumRole}`, code: 'INSUFFICIENT_ROLE' });
        return;
      }
    }
    
    // Check permissions
    if (options.requiredPermissions?.length) {
      const userPerms = payload.permissions || [];
      const hasAll = options.requiredPermissions.every(p => userPerms.includes(p) || payload.role === 'superadmin');
      if (!hasAll) {
        res.status(403).json({ error: 'Missing permissions', code: 'MISSING_PERMISSIONS' });
        return;
      }
    }
    
    clearFailedAttempts(ip);
    
    // Set request context
    req.userId = payload.userId;
    req.username = payload.username;
    req.role = payload.role as AuthenticatedRequest['role'];
    req.tenantId = payload.tenantId;
    req.isSuperAdmin = payload.role === 'superadmin';
    req.superadminSession = payload.superadminSession;
    req.permissions = payload.permissions;
    req.partnerId = payload.partnerId;
    
    logger.debug({ userId: payload.userId, role: payload.role }, 'Authenticated');
    next();
  };
}

// Convenience exports
export const requireSuperAdmin = requireAuth({ requireSuperAdmin: true });
export const requireAdmin = requireAuth({ minimumRole: 'admin' });
export const requireOperator = requireAuth({ minimumRole: 'operator' });
export const requireViewer = requireAuth({ minimumRole: 'viewer' });
export const requirePartner = requireAuth({ allowPartner: true, minimumRole: 'partner' });

// ============================================
// TENANT/PARTNER ISOLATION
// ============================================

export function enforceTenantIsolation(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (req.isSuperAdmin) {
    const headerTenantId = req.headers['x-tenant-id'] as string;
    if (headerTenantId) req.tenantId = headerTenantId;
    return next();
  }
  
  if (!req.tenantId) {
    res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' });
    return;
  }
  
  const headerTenantId = req.headers['x-tenant-id'] as string;
  if (headerTenantId && headerTenantId !== req.tenantId) {
    logger.warn({ requested: headerTenantId, actual: req.tenantId }, 'Tenant mismatch');
    res.status(403).json({ error: 'Cannot access other tenant', code: 'TENANT_MISMATCH' });
    return;
  }
  
  next();
}

/**
 * For partner-specific endpoints, ensure partner can only access their own data
 */
export function enforcePartnerIsolation(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // SuperAdmins and admins can access all partners
  if (req.isSuperAdmin || req.role === 'admin') {
    return next();
  }
  
  // Partners can only access their own data
  if (req.role === 'partner') {
    const requestedPartnerId = req.params.id || req.params.partnerId;
    if (requestedPartnerId && requestedPartnerId !== req.partnerId) {
      logger.warn({ requested: requestedPartnerId, actual: req.partnerId }, 'Partner isolation violation');
      res.status(403).json({ error: 'Cannot access other partner data', code: 'PARTNER_MISMATCH' });
      return;
    }
  }
  
  next();
}

// ============================================
// AUDIT LOGGING
// ============================================

export interface AuditLogEntry {
  timestamp: string;
  userId: string;
  username: string;
  role: string;
  tenantId: string;
  partnerId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  ip: string;
  success: boolean;
  statusCode?: number;
  duration?: number;
}

const auditLog: AuditLogEntry[] = [];
const MAX_AUDIT_SIZE = 10000;

export function auditLogger(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const ip = getClientIP(req);
  
  const originalSend = res.send.bind(res);
  res.send = function(body: unknown) {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      userId: req.userId || 'anonymous',
      username: req.username || 'anonymous',
      role: req.role || 'none',
      tenantId: req.tenantId || 'none',
      partnerId: req.partnerId,
      action: getActionFromMethod(req.method),
      resource: getResourceFromPath(req.path),
      resourceId: extractResourceId(req.path),
      method: req.method,
      path: req.path,
      ip,
      success: res.statusCode >= 200 && res.statusCode < 400,
      statusCode: res.statusCode,
      duration: Date.now() - startTime,
    };
    
    auditLog.push(entry);
    if (auditLog.length > MAX_AUDIT_SIZE) {
      auditLog.splice(0, Math.floor(MAX_AUDIT_SIZE * 0.1));
    }
    
    if (!entry.success) {
      logger.warn(entry, 'Failed request');
    } else if (entry.action !== 'READ') {
      logger.info(entry, 'Mutation');
    }
    
    return originalSend(body);
  };
  
  next();
}

function getActionFromMethod(method: string): string {
  const map: Record<string, string> = { GET: 'READ', POST: 'CREATE', PUT: 'UPDATE', PATCH: 'PATCH', DELETE: 'DELETE' };
  return map[method.toUpperCase()] || method;
}

function getResourceFromPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  for (const seg of segments) {
    if (seg !== 'api' && seg !== 'v1') return seg;
  }
  return 'unknown';
}

function extractResourceId(path: string): string | undefined {
  const match = path.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0] : undefined;
}

export function getAuditLog(options: {
  limit?: number;
  userId?: string;
  partnerId?: string;
  tenantId?: string;
}): AuditLogEntry[] {
  let filtered = [...auditLog];
  
  if (options.userId) filtered = filtered.filter(e => e.userId === options.userId);
  if (options.partnerId) filtered = filtered.filter(e => e.partnerId === options.partnerId);
  if (options.tenantId) filtered = filtered.filter(e => e.tenantId === options.tenantId);
  
  return filtered.slice(-(options.limit || 100)).reverse();
}

export default {
  requireAuth,
  requireSuperAdmin,
  requireAdmin,
  requireOperator,
  requireViewer,
  requirePartner,
  enforceTenantIsolation,
  enforcePartnerIsolation,
  auditLogger,
  getAuditLog,
};
