/**
 * Middleware Module
 * Authentication, validation, rate limiting, and security middleware
 */

const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { config, pool } = require('../config');

// Import security services
const {
  JWTSecurityService,
  CSRFProtection,
  TenantIsolation,
  securityHeaders,
} = require('../../security');

// ============================================================================
// INITIALIZE SECURITY SERVICES
// ============================================================================

const jwtService = new JWTSecurityService({
  accessSecret: config.jwt.secret,
  refreshSecret: config.jwt.refreshSecret,
  accessTokenExpiry: config.jwt.accessExpiry,
  refreshTokenExpiry: config.jwt.refreshExpiry,
  issuer: 'finaceverse',
  audience: 'finaceverse-app',
});

const csrfProtection = new CSRFProtection(config.csrf.secret);
const tenantIsolation = new TenantIsolation();

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * JWT Authentication middleware with fingerprinting
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No valid token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwtService.verifyAccessToken(token, req);
    
    req.userId = decoded.userId;
    req.username = decoded.username;
    req.role = decoded.role || 'admin';
    req.tenantId = decoded.tenantId || req.tenantId || 'platform';
    
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired, please refresh', code: 'TOKEN_EXPIRED' });
    }
    if (err.message === 'Token has been revoked') {
      return res.status(401).json({ error: 'Token has been revoked', code: 'TOKEN_REVOKED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Role-based access control middleware
 */
const requireRole = (role) => {
  return (req, res, next) => {
    if (req.role !== role && req.role !== 'superadmin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

/**
 * Optional auth - doesn't fail if no token, just doesn't set user
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwtService.verifyAccessToken(token, req);
    req.userId = decoded.userId;
    req.username = decoded.username;
    req.role = decoded.role || 'user';
    req.tenantId = decoded.tenantId || 'platform';
  } catch (err) {
    // Ignore errors for optional auth
  }
  
  next();
};

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

/**
 * Sanitize input to prevent injection
 */
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.replace(/[<>'"]/g, '');
  }
  return input;
};

/**
 * Validate password strength
 */
const validatePassword = (password) => {
  if (password.length < 12) {
    return { valid: false, message: 'Password must be at least 12 characters long' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  return { valid: true };
};

// ============================================================================
// RATE LIMITING MIDDLEWARE
// ============================================================================

/**
 * Create rate limiter with custom key generator
 */
const createRateLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Too many requests',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ((req) => req.ip),
    skip: options.skip,
  });
};

// Burst limiter (DoS protection)
const burstLimiter = createRateLimiter({
  windowMs: config.rateLimit.burst.windowMs,
  max: config.rateLimit.burst.max,
  message: 'Request burst detected, please slow down',
});

// Auth limiter (brute force protection)
const authLimiter = createRateLimiter({
  windowMs: config.rateLimit.auth.windowMs,
  max: config.rateLimit.auth.max,
  message: 'Too many authentication attempts, please try again later',
});

// API limiter (per-user)
const apiLimiter = createRateLimiter({
  windowMs: config.rateLimit.api.windowMs,
  max: config.rateLimit.api.max,
  message: 'API rate limit exceeded, please slow down',
  keyGenerator: (req) => req.userId ? `user:${req.userId}` : `ip:${req.ip}`,
  skip: (req) => req.path === '/api/health',
});

// Tracking limiter (very permissive)
const trackingLimiter = createRateLimiter({
  windowMs: config.rateLimit.tracking.windowMs,
  max: config.rateLimit.tracking.max,
  message: 'Rate limit exceeded',
});

// SEO limiter (per-tenant)
const seoLimiter = createRateLimiter({
  windowMs: config.rateLimit.seo.windowMs,
  max: config.rateLimit.seo.max,
  message: 'SEO operations rate limit exceeded',
  keyGenerator: (req) => `tenant:${req.tenantId || 'platform'}`,
});

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

const validators = {
  username: body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  
  password: body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  
  email: body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  
  page: param('page')
    .matches(/^[a-zA-Z0-9-_]+$/)
    .withMessage('Invalid page parameter'),
  
  countryCode: param('countryCode')
    .isLength({ min: 2, max: 2 })
    .withMessage('Country code must be 2 characters')
    .isAlpha()
    .withMessage('Country code must be letters only'),
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Auth
  authMiddleware,
  requireRole,
  optionalAuth,
  jwtService,
  
  // Validation
  handleValidationErrors,
  sanitizeInput,
  validatePassword,
  validators,
  
  // Rate limiting
  burstLimiter,
  authLimiter,
  apiLimiter,
  trackingLimiter,
  seoLimiter,
  
  // Security
  csrfProtection,
  tenantIsolation,
  securityHeaders,
};
