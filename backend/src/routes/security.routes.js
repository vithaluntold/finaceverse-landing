/**
 * Security Routes Module
 * 
 * Admin-only security management endpoints:
 * - Security status overview
 * - Encrypt/decrypt data
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// ============ ROUTE FACTORY ============

/**
 * Creates security routes with injected dependencies
 * @param {Object} deps - Dependencies
 * @param {Function} deps.authMiddleware - Authentication middleware
 * @param {Function} deps.requireRole - Role-based access control middleware
 * @param {Function} deps.handleValidationErrors - Validation error handler
 * @param {Object} deps.encryptionService - Encryption service
 */
function createSecurityRoutes({ 
  authMiddleware, 
  requireRole, 
  handleValidationErrors,
  encryptionService 
}) {

  // ============ SECURITY STATUS ============
  router.get('/status', authMiddleware, requireRole('admin'), (req, res) => {
    res.json({
      status: 'active',
      features: {
        encryption: 'AES-256-GCM',
        jwt: {
          algorithm: 'HS256',
          accessTokenExpiry: '15m',
          refreshTokenExpiry: '7d',
          fingerprinting: true,
        },
        csrf: 'Double Submit Cookie',
        ssrf: 'URL Whitelist + IP Blocking',
        xss: 'HTML Sanitization via Cheerio wrapper',
        rateLimit: {
          strategy: 'Scale-ready for 100K+ users',
          burst: '50 per second per IP (DoS protection)',
          auth: '10 per 15min per IP (brute force protection)',
          api: '300 per min per user (authenticated)',
          seo: '30 per min per tenant (admin operations)',
          tracking: '1000 per min per IP (public analytics)',
        },
        multiTenant: true,
        auditLog: true,
      },
      headers: {
        helmet: true,
        hsts: true,
        csp: true,
        cors: 'Whitelist only',
      },
      timestamp: new Date().toISOString(),
    });
  });

  // ============ ENCRYPT DATA ============
  router.post('/encrypt', 
    authMiddleware, 
    requireRole('admin'),
    [body('data').notEmpty().withMessage('Data is required')],
    handleValidationErrors,
    (req, res) => {
      try {
        const { data } = req.body;
        const encrypted = encryptionService.encrypt(data);
        res.json({ encrypted });
      } catch (error) {
        res.status(500).json({ error: 'Encryption failed' });
      }
    }
  );

  // ============ DECRYPT DATA ============
  router.post('/decrypt', 
    authMiddleware, 
    requireRole('admin'),
    [body('encrypted').notEmpty().withMessage('Encrypted data is required')],
    handleValidationErrors,
    (req, res) => {
      try {
        const { encrypted } = req.body;
        const decrypted = encryptionService.decrypt(encrypted);
        res.json({ decrypted });
      } catch (error) {
        res.status(500).json({ error: 'Decryption failed - data may be corrupted' });
      }
    }
  );

  return router;
}

module.exports = createSecurityRoutes;
