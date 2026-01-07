/**
 * Authentication Routes Module
 * 
 * Handles all authentication-related endpoints:
 * - Login
 * - Create admin
 * - Token refresh
 * - Logout
 * - CSRF token
 */

const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const router = express.Router();

// ============ VALIDATORS ============

const loginValidator = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const createAdminValidator = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('secretKey')
    .notEmpty()
    .withMessage('Secret key is required'),
];

const refreshTokenValidator = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];

// ============ UTILITY FUNCTIONS ============

const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.replace(/[<>'"]/g, '');
  }
  return input;
};

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

// ============ ROUTE FACTORY ============

/**
 * Creates auth routes with injected dependencies
 * @param {Object} deps - Dependencies
 * @param {Object} deps.pool - PostgreSQL connection pool
 * @param {Object} deps.jwtService - JWT security service
 * @param {Object} deps.csrfProtection - CSRF protection service
 * @param {Object} deps.authLimiter - Auth rate limiter
 * @param {Function} deps.handleValidationErrors - Validation error handler
 * @param {Function} deps.authMiddleware - Authentication middleware
 */
function createAuthRoutes({ pool, jwtService, csrfProtection, authLimiter, handleValidationErrors, authMiddleware }) {
  
  // ============ LOGIN ============
  router.post('/login',
    authLimiter,
    loginValidator,
    handleValidationErrors,
    async (req, res) => {
      try {
        const { username, password } = req.body;
        
        const sanitizedUsername = sanitizeInput(username);
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [sanitizedUsername]);
        
        if (result.rows.length === 0) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const tokens = jwtService.generateTokenPair(
          { 
            userId: user.id, 
            username: user.username,
            role: user.role || 'admin',
            tenantId: user.tenant_id || 'platform',
          }, 
          req
        );
        
        console.log(`✓ User logged in: ${user.username} (ID: ${user.id}, Tenant: ${user.tenant_id || 'platform'})`);
        
        res.json({ 
          ...tokens,
          username: user.username,
          role: user.role,
        });
      } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
      }
    }
  );

  // ============ CREATE ADMIN ============
  router.post('/create-admin',
    authLimiter,
    createAdminValidator,
    handleValidationErrors,
    async (req, res) => {
      try {
        const { username, password, secretKey } = req.body;
        
        if (!process.env.ADMIN_SECRET_KEY || secretKey !== process.env.ADMIN_SECRET_KEY) {
          return res.status(403).json({ error: 'Invalid secret key' });
        }
        
        const passwordCheck = validatePassword(password);
        if (!passwordCheck.valid) {
          return res.status(400).json({ error: passwordCheck.message });
        }
        
        const sanitizedUsername = sanitizeInput(username);
        const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [sanitizedUsername]);
        
        if (existingUser.rows.length > 0) {
          return res.status(400).json({ error: 'User already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 12);
        await pool.query(
          'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
          [sanitizedUsername, hashedPassword, 'admin']
        );
        
        console.log(`✓ Admin user created: ${sanitizedUsername}`);
        
        res.json({ message: 'Admin user created successfully' });
      } catch (err) {
        console.error('Create admin error:', err);
        res.status(500).json({ error: 'Failed to create admin' });
      }
    }
  );

  // ============ CSRF TOKEN ============
  router.get('/csrf-token', (req, res) => {
    const token = csrfProtection.generateToken(res);
    res.json({ csrfToken: token });
  });

  // ============ REFRESH TOKEN ============
  router.post('/refresh',
    authLimiter,
    refreshTokenValidator,
    handleValidationErrors,
    async (req, res) => {
      try {
        const { refreshToken } = req.body;
        
        const getUserById = async (userId) => {
          const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
          return result.rows[0];
        };
        
        const tokens = await jwtService.refreshTokens(refreshToken, req, getUserById);
        
        res.json(tokens);
      } catch (err) {
        console.error('Token refresh error:', err.message);
        res.status(401).json({ error: 'Invalid or expired refresh token' });
      }
    }
  );

  // ============ LOGOUT ============
  router.post('/logout', authMiddleware, (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      jwtService.revokeToken(token);
    }
    res.json({ message: 'Logged out successfully' });
  });

  return router;
}

module.exports = createAuthRoutes;
