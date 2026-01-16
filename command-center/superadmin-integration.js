// ============================================
// COMMAND CENTER - SuperAdmin Integration Module
// Connects Command Center services with main platform SuperAdmin
// ============================================

/**
 * This module provides the integration layer between the Command Center
 * (Orchestrator + Partner Portal) and the main platform's SuperAdmin
 * authentication system.
 * 
 * Features:
 * - Unified authentication across all Command Center services
 * - Token validation against main platform
 * - Role-based access control integration
 * - Audit log synchronization
 * - Session management coordination
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');

// ============================================
// CONFIGURATION
// ============================================

const INTEGRATION_CONFIG = {
  // Main platform URL
  platformUrl: process.env.PLATFORM_URL || 'http://localhost:3001',
  
  // SuperAdmin API endpoints
  endpoints: {
    validate: '/api/superadmin/validate',
    login: '/api/superadmin/login',
    logout: '/api/superadmin/logout',
    refresh: '/api/superadmin/refresh',
    audit: '/api/superadmin/audit',
  },
  
  // Shared secret for inter-service communication
  serviceSecret: process.env.SERVICE_SECRET || process.env.SUPERADMIN_MASTER_KEY || 'finaceverse-service-secret',
  
  // Command Center services
  services: {
    orchestrator: {
      name: 'Accute Orchestrator',
      port: parseInt(process.env.ORCHESTRATOR_PORT || '3500'),
      path: '/orchestrator',
    },
    partnerPortal: {
      name: 'Partner Portal',
      port: parseInt(process.env.PARTNER_PORTAL_PORT || '3501'),
      path: '/partner-portal',
    },
  },
  
  // Token settings
  tokenRefreshBuffer: 5 * 60 * 1000, // Refresh 5 minutes before expiry
  
  // Cache settings
  tokenCacheTTL: 5 * 60 * 1000, // Cache token validations for 5 minutes
};

// ============================================
// TOKEN VALIDATION CACHE
// ============================================

class TokenCache {
  constructor() {
    this.cache = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  set(token, validationResult, ttl = INTEGRATION_CONFIG.tokenCacheTTL) {
    const hash = this.hashToken(token);
    this.cache.set(hash, {
      result: validationResult,
      expiresAt: Date.now() + ttl,
    });
  }

  get(token) {
    const hash = this.hashToken(token);
    const entry = this.cache.get(hash);
    
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(hash);
      return null;
    }
    
    return entry.result;
  }

  invalidate(token) {
    const hash = this.hashToken(token);
    this.cache.delete(hash);
  }

  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
  }

  cleanup() {
    const now = Date.now();
    for (const [hash, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(hash);
      }
    }
  }

  stop() {
    clearInterval(this.cleanupInterval);
  }
}

// ============================================
// PLATFORM CONNECTOR
// ============================================

class PlatformConnector {
  constructor() {
    this.tokenCache = new TokenCache();
    this.connected = false;
    this.lastHealthCheck = null;
    
    console.log('🔗 Platform Connector initialized');
    console.log(`   Platform URL: ${INTEGRATION_CONFIG.platformUrl}`);
  }

  /**
   * Make HTTP request to platform API
   */
  async request(method, endpoint, data = null, token = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, INTEGRATION_CONFIG.platformUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Secret': INTEGRATION_CONFIG.serviceSecret,
          'X-Service-Name': 'command-center',
        },
      };

      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      const req = client.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            resolve({ status: res.statusCode, data: result });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Validate a token against the main platform
   */
  async validateToken(token) {
    // Check cache first
    const cached = this.tokenCache.get(token);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.request(
        'POST',
        INTEGRATION_CONFIG.endpoints.validate,
        { token },
        token
      );

      const result = {
        valid: response.status === 200 && response.data.valid,
        user: response.data.user,
        error: response.data.error,
      };

      // Cache successful validations
      if (result.valid) {
        this.tokenCache.set(token, result);
      }

      return result;
    } catch (error) {
      console.error('Token validation error:', error);
      return { valid: false, error: 'Platform connection failed' };
    }
  }

  /**
   * Login through the main platform
   */
  async login(credentials) {
    try {
      const response = await this.request(
        'POST',
        INTEGRATION_CONFIG.endpoints.login,
        credentials
      );

      return {
        success: response.status === 200 && response.data.success,
        ...response.data,
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Platform connection failed' };
    }
  }

  /**
   * Logout through the main platform
   */
  async logout(token) {
    this.tokenCache.invalidate(token);
    
    try {
      await this.request(
        'POST',
        INTEGRATION_CONFIG.endpoints.logout,
        {},
        token
      );
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: 'Platform connection failed' };
    }
  }

  /**
   * Refresh token through the main platform
   */
  async refreshToken(refreshToken) {
    try {
      const response = await this.request(
        'POST',
        INTEGRATION_CONFIG.endpoints.refresh,
        { refreshToken }
      );

      return {
        success: response.status === 200 && response.data.success,
        ...response.data,
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return { success: false, error: 'Platform connection failed' };
    }
  }

  /**
   * Send audit log entries to the main platform
   */
  async syncAuditLog(entries, token) {
    try {
      await this.request(
        'POST',
        INTEGRATION_CONFIG.endpoints.audit,
        { entries, source: 'command-center' },
        token
      );
      return { success: true };
    } catch (error) {
      console.error('Audit sync error:', error);
      return { success: false, error: 'Platform connection failed' };
    }
  }

  /**
   * Health check for platform connectivity
   */
  async healthCheck() {
    try {
      const response = await this.request('GET', '/health');
      this.connected = response.status === 200;
      this.lastHealthCheck = new Date();
      return this.connected;
    } catch (error) {
      this.connected = false;
      this.lastHealthCheck = new Date();
      return false;
    }
  }

  stop() {
    this.tokenCache.stop();
  }
}

// ============================================
// SUPERADMIN INTEGRATION SERVICE
// ============================================

class SuperAdminIntegration {
  constructor() {
    this.platformConnector = new PlatformConnector();
    this.localMode = process.env.COMMAND_CENTER_LOCAL_MODE === 'true';
    this.auditBuffer = [];
    this.auditSyncInterval = null;
    
    // Start audit sync if not in local mode
    if (!this.localMode) {
      this.auditSyncInterval = setInterval(() => this.syncAuditBuffer(), 60000);
    }
    
    console.log('🔐 SuperAdmin Integration initialized');
    console.log(`   Mode: ${this.localMode ? 'LOCAL (standalone)' : 'INTEGRATED (platform connected)'}`);
  }

  /**
   * Validate access token
   * In local mode, validates using local JWT verification
   * In integrated mode, validates against platform
   */
  async validateToken(token) {
    if (this.localMode) {
      return this.validateTokenLocal(token);
    }
    
    return this.platformConnector.validateToken(token);
  }

  /**
   * Local token validation (standalone mode)
   */
  validateTokenLocal(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Invalid token format' };
      }

      const [headerB64, payloadB64, signature] = parts;
      
      // Verify signature
      const secret = process.env.JWT_SECRET || process.env.SUPERADMIN_MASTER_KEY || 'finaceverse-jwt-secret';
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        return { valid: false, error: 'Invalid signature' };
      }

      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
      
      // Check expiry
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, error: 'Token expired' };
      }

      return {
        valid: true,
        user: {
          id: payload.userId,
          username: payload.username,
          role: payload.role,
          tenantId: payload.tenantId,
        },
      };
    } catch (error) {
      return { valid: false, error: 'Token verification failed' };
    }
  }

  /**
   * Login through platform or locally
   */
  async login(username, password, options = {}) {
    if (this.localMode) {
      // In local mode, login is handled by each service's auth-service
      return { success: false, error: 'Use service-specific login endpoint' };
    }

    return this.platformConnector.login({
      username,
      password,
      masterKey: options.masterKey,
      totpCode: options.totpCode,
      service: 'command-center',
    });
  }

  /**
   * Logout
   */
  async logout(token) {
    if (this.localMode) {
      return { success: true };
    }
    
    return this.platformConnector.logout(token);
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshToken) {
    if (this.localMode) {
      return { success: false, error: 'Use service-specific refresh endpoint' };
    }
    
    return this.platformConnector.refreshToken(refreshToken);
  }

  /**
   * Log audit entry
   */
  logAudit(entry) {
    this.auditBuffer.push({
      ...entry,
      timestamp: new Date().toISOString(),
      source: 'command-center',
    });

    // Limit buffer size
    if (this.auditBuffer.length > 1000) {
      this.auditBuffer = this.auditBuffer.slice(-500);
    }
  }

  /**
   * Sync audit buffer to platform
   */
  async syncAuditBuffer() {
    if (this.auditBuffer.length === 0) return;
    
    const entries = [...this.auditBuffer];
    this.auditBuffer = [];
    
    // Need a service token for audit sync
    const serviceToken = this.generateServiceToken();
    const result = await this.platformConnector.syncAuditLog(entries, serviceToken);
    
    if (!result.success) {
      // Put entries back in buffer
      this.auditBuffer = [...entries, ...this.auditBuffer];
    }
  }

  /**
   * Generate service-to-service token
   */
  generateServiceToken() {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      service: 'command-center',
      role: 'service',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    const signature = crypto
      .createHmac('sha256', INTEGRATION_CONFIG.serviceSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  /**
   * Check if user has required role
   */
  hasRole(userRole, requiredRole) {
    const hierarchy = {
      superadmin: 100,
      admin: 80,
      operator: 60,
      viewer: 40,
      partner: 30,
    };

    return (hierarchy[userRole] || 0) >= (hierarchy[requiredRole] || 0);
  }

  /**
   * Check if user has required permission
   */
  hasPermission(userPermissions, requiredPermission) {
    if (!userPermissions) return false;
    return userPermissions.includes(requiredPermission) || userPermissions.includes('*');
  }

  /**
   * Get status
   */
  async getStatus() {
    const platformConnected = !this.localMode && await this.platformConnector.healthCheck();
    
    return {
      mode: this.localMode ? 'local' : 'integrated',
      platformConnected,
      auditBufferSize: this.auditBuffer.length,
      services: INTEGRATION_CONFIG.services,
    };
  }

  /**
   * Cleanup
   */
  stop() {
    if (this.auditSyncInterval) {
      clearInterval(this.auditSyncInterval);
    }
    this.platformConnector.stop();
  }
}

// ============================================
// MIDDLEWARE FACTORY
// ============================================

/**
 * Create Express middleware for SuperAdmin integration
 */
function createIntegrationMiddleware(integration) {
  return async (req, res, next) => {
    // Skip public endpoints
    const publicPaths = ['/health', '/login', '/api/login'];
    if (publicPaths.some(p => req.path.endsWith(p))) {
      return next();
    }

    // Extract token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NO_TOKEN',
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Validate token
    const validation = await integration.validateToken(token);
    
    if (!validation.valid) {
      return res.status(401).json({
        error: validation.error || 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }

    // Set user context
    req.user = validation.user;
    req.userId = validation.user.id;
    req.username = validation.user.username;
    req.role = validation.user.role;
    req.tenantId = validation.user.tenantId;
    req.isSuperAdmin = validation.user.role === 'superadmin';

    // Log access
    integration.logAudit({
      action: 'ACCESS',
      userId: validation.user.id,
      username: validation.user.username,
      role: validation.user.role,
      path: req.path,
      method: req.method,
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    });

    next();
  };
}

/**
 * Create role requirement middleware
 */
function requireRole(integration, minimumRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NO_AUTH',
      });
    }

    if (!integration.hasRole(req.user.role, minimumRole)) {
      integration.logAudit({
        action: 'ACCESS_DENIED',
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        requiredRole: minimumRole,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      return res.status(403).json({
        error: `Minimum role required: ${minimumRole}`,
        code: 'INSUFFICIENT_ROLE',
      });
    }

    next();
  };
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let instance = null;

function getSuperAdminIntegration() {
  if (!instance) {
    instance = new SuperAdminIntegration();
  }
  return instance;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  SuperAdminIntegration,
  PlatformConnector,
  TokenCache,
  createIntegrationMiddleware,
  requireRole,
  getSuperAdminIntegration,
  INTEGRATION_CONFIG,
};
