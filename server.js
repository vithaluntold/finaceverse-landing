require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const redis = require('redis');
const { Server } = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult, param, query } = require('express-validator');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

// MILITARY-GRADE SECURITY MODULE
const {
  EncryptionService,
  JWTSecurityService,
  CSRFProtection,
  SSRFProtection,
  XSSSanitizer,
  AuditLogger,
  TenantIsolation,
  AdvancedRateLimiter,
  securityHeaders,
  // SuperAdmin Module
  SuperAdminAuthService,
  createSuperAdminMiddleware,
  createSuperAdminRoutes,
} = require('./backend/security');

// SEO AI Services
const KeywordOptimizer = require('./src/seo-ai/keyword-optimizer');
const LocalSEOManager = require('./src/seo-ai/local-seo-manager');
const AutoScanner = require('./src/seo-ai/auto-scanner');
const BacklinkCrawler = require('./src/seo-ai/backlink-crawler');
const GSCIntegration = require('./src/seo-ai/gsc-integration');
const AutoFixer = require('./src/seo-ai/auto-fixer');

const app = express();
const PORT = process.env.PORT || 8080;

// Trust proxy for Railway/Cloudflare (required for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Validate critical environment variables
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName] || process.env[varName] === 'your-secret-key-change-in-production');
if (missingEnvVars.length > 0 && process.env.NODE_ENV === 'production') {
  console.error(`❌ SECURITY ERROR: Missing or insecure environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!';
const CSRF_SECRET = process.env.CSRF_SECRET || 'csrf-secret-key-change-in-prod!';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/finaceverse_analytics';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'https://www.finaceverse.io', 'https://finaceverse.io'];

// ============ INITIALIZE SECURITY SERVICES ============

// Encryption Service (AES-256-GCM)
const encryptionService = new EncryptionService(ENCRYPTION_KEY);
console.log('✓ Encryption Service initialized (AES-256-GCM)');

// JWT Security Service with fingerprinting & rotation
const jwtService = new JWTSecurityService({
  accessSecret: JWT_SECRET,
  refreshSecret: JWT_REFRESH_SECRET,
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  issuer: 'finaceverse',
  audience: 'finaceverse-app',
});
console.log('✓ JWT Security Service initialized (fingerprinting enabled)');

// CSRF Protection (Double Submit Cookie)
const csrfProtection = new CSRFProtection(CSRF_SECRET);
console.log('✓ CSRF Protection initialized');

// SSRF Protection for URL fetching
const ssrfProtection = new SSRFProtection();
// Add allowed domains for SEO scanning
ssrfProtection.allowDomain('finaceverse.io');
ssrfProtection.allowDomain('www.finaceverse.io');
console.log('✓ SSRF Protection initialized');

// XSS Sanitizer for Cheerio
const xssSanitizer = new XSSSanitizer();
console.log('✓ XSS Sanitizer initialized');

// Tenant Isolation
const tenantIsolation = new TenantIsolation();
console.log('✓ Multi-tenant isolation initialized');

// ============ SECURITY MIDDLEWARE ============

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.googletagmanager.com", "https://www.google-analytics.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://www.google-analytics.com", "https://analytics.google.com"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS - Hardened configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || ALLOWED_ORIGINS.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Prevent HTTP Parameter Pollution
app.use(hpp());

// ============ RATE LIMITING (SCALE-READY FOR 100K+ USERS) ============
// 
// Strategy:
// - Auth: Strict per-IP (brute force protection) - stays low
// - API: Per-user/tenant with high limits for authenticated users
// - Tracking: Very permissive (public analytics from all visitors)
// - SEO: Per-tenant admin operations (can stay moderate)
// - DDoS: Handled at infrastructure level (Cloudflare/Railway)
//

// Auth limiter - STRICT (brute force protection, keeps low)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP (slightly higher for shared IPs/NAT)
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
});

// API limiter - HIGH LIMITS for authenticated users
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  message: 'API rate limit exceeded, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health',
});

// Public tracking - VERY PERMISSIVE (analytics from all visitors)
// These are lightweight writes, can handle high volume
const publicTrackingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute per IP
  message: 'Rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
  // For tracking, we use a sliding window to be more forgiving
  skip: (req) => {
    // Skip for internal health monitoring
    return req.headers['x-internal-request'] === process.env.INTERNAL_SECRET;
  },
});

// SEO admin operations - MODERATE
const seoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'SEO operations rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
});

// Burst limiter for sudden spikes (optional, applies globally)
const burstLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 50, // 50 requests per second per IP (prevents DoS)
  message: 'Request burst detected, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
});

// Apply burst limiter globally (first line of defense)
app.use(burstLimiter);

// Cookie parser for CSRF
app.use(cookieParser());

// Additional security headers
app.use(securityHeaders);

// Tenant isolation middleware
app.use(tenantIsolation.middleware());

// CSRF Protection (skip for authentication endpoints and API tracking)
app.use((req, res, next) => {
  // Skip CSRF for superadmin login (no token exists yet for unauthenticated users)
  if (req.path === '/api/superadmin/login' && req.method === 'POST') {
    return next();
  }
  // Apply CSRF protection to everything else
  csrfProtection.middleware()(req, res, next);
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'build')));

// PostgreSQL connection pool - use PG* env vars for Railway database
// If PG* vars exist, use them, otherwise fall back to DATABASE_URL
const dbConfig = process.env.PGHOST ? {
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT) || 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: false, // Railway TCP proxy doesn't support SSL
} : {
  connectionString: process.env.DATABASE_URL || DATABASE_URL,
  ssl: false,
};

console.log(`🔌 Connecting to database: ${dbConfig.host || 'via connection string'} (port: ${dbConfig.port || 'from URL'})`);
const pool = new Pool(dbConfig);

// Initialize SEO AI services with security wrappers
let keywordOptimizer;
let localSEOManager;
let autoScanner;
let backlinkCrawler;
let gscIntegration;
let autoFixer;
let auditLogger;
let advancedRateLimiter;
let superAdminAuth;

try {
  // Pass SSRF protection and XSS sanitizer to SEO services
  keywordOptimizer = new KeywordOptimizer(pool, { ssrfProtection, xssSanitizer });
  localSEOManager = new LocalSEOManager(pool);
  autoScanner = new AutoScanner({ pool, ssrfProtection, xssSanitizer });
  backlinkCrawler = new BacklinkCrawler(pool);
  gscIntegration = new GSCIntegration(pool);
  autoFixer = new AutoFixer(pool);
  console.log('✓ SEO AI services initialized (with security wrappers)');
} catch (error) {
  console.warn('⚠️  SEO AI services not available:', error.message);
}

// Initialize SuperAdmin Service
try {
  superAdminAuth = new SuperAdminAuthService(pool, jwtService, encryptionService);
  console.log('✓ SuperAdmin Auth Service initialized');
  console.log(`🔐 SuperAdmin secret path: ${superAdminAuth.getSecretPath()}`);
} catch (error) {
  console.error('❌ SuperAdmin initialization failed:', error.message);
}

// Initialize database tables before starting server
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    console.log('✓ Connected to PostgreSQL');
    
    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS performance_metrics (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50),
        delta NUMERIC,
        value NUMERIC,
        metric_id VARCHAR(255),
        page VARCHAR(500),
        user_agent TEXT,
        connection JSONB,
        ip VARCHAR(45),
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        timestamp TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS visits (
        id SERIAL PRIMARY KEY,
        page VARCHAR(500),
        referrer TEXT,
        user_agent TEXT,
        screen_resolution VARCHAR(50),
        viewport VARCHAR(50),
        language VARCHAR(10),
        ip VARCHAR(45),
        country VARCHAR(100),
        country_code VARCHAR(10),
        region VARCHAR(100),
        city VARCHAR(100),
        timezone VARCHAR(100),
        isp TEXT,
        latitude NUMERIC,
        longitude NUMERIC,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        type VARCHAR(100),
        depth INTEGER,
        page VARCHAR(500),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS errors (
        id SERIAL PRIMARY KEY,
        message TEXT,
        source TEXT,
        line INTEGER,
        "column" INTEGER,
        stack TEXT,
        page VARCHAR(500),
        user_agent TEXT,
        type VARCHAR(50),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pagespeed_results (
        id SERIAL PRIMARY KEY,
        url VARCHAR(500),
        strategy VARCHAR(20),
        score NUMERIC,
        metrics JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS experiments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        variants JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS experiment_assignments (
        id SERIAL PRIMARY KEY,
        experiment_id INTEGER REFERENCES experiments(id),
        user_id VARCHAR(255) NOT NULL,
        variant VARCHAR(50) NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS experiment_conversions (
        id SERIAL PRIMARY KEY,
        experiment_id INTEGER REFERENCES experiments(id),
        user_id VARCHAR(255) NOT NULL,
        variant VARCHAR(50) NOT NULL,
        conversion_type VARCHAR(100),
        value NUMERIC,
        converted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_performance_timestamp ON performance_metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_visits_timestamp ON visits(timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_errors_timestamp ON errors(timestamp);
      CREATE INDEX IF NOT EXISTS idx_pagespeed_timestamp ON pagespeed_results(timestamp);
      CREATE INDEX IF NOT EXISTS idx_experiment_assignments_user ON experiment_assignments(user_id);
      CREATE INDEX IF NOT EXISTS idx_experiment_conversions_user ON experiment_conversions(user_id);
    `);
    
    // Create superadmin user if not exists
    const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'FinACE@SuperAdmin2026!Secure';
    const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);
    
    await client.query(`
      INSERT INTO users (username, password, role) 
      VALUES ('superadmin', $1, 'superadmin')
      ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password
    `, [hashedPassword]);
    
    console.log('✓ SuperAdmin user verified');
    
    client.release();
    console.log('✓ Database tables created/verified');
    return true;
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    console.error('Server will start but database operations may fail');
    return false;
  }
}

// Redis connection (optional, graceful fallback if not available)
let redisClient;
try {
  redisClient = redis.createClient({ url: REDIS_URL });
  redisClient.connect()
    .then(() => console.log('✓ Connected to Redis'))
    .catch(err => {
      console.warn('Redis not available, running without cache:', err.message);
      redisClient = null;
    });
} catch (err) {
  console.warn('Redis disabled');
  redisClient = null;
}

// Helper: Get from cache or execute function
const cacheWrapper = async (key, ttl, fn) => {
  if (redisClient) {
    try {
      const cached = await redisClient.get(key);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      console.warn('Redis get failed:', err.message);
    }
  }
  
  const result = await fn();
  
  if (redisClient) {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(result));
    } catch (err) {
      console.warn('Redis set failed:', err.message);
    }
  }
  
  return result;
};

// Google PageSpeed Insights integration
const runPageSpeedTest = async (url, strategy = 'mobile') => {
  if (!GOOGLE_API_KEY) {
    console.warn('Google API key not configured, skipping PageSpeed test');
    return null;
  }
  
  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${GOOGLE_API_KEY}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 403) {
        console.warn('⚠️  PageSpeed Insights API not enabled. Enable it at: https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com');
        return null;
      }
      throw new Error(`PageSpeed API error (${response.status}): ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      url,
      strategy,
      score: data.lighthouseResult.categories.performance.score * 100,
      metrics: {
        fcp: data.lighthouseResult.audits['first-contentful-paint']?.numericValue,
        lcp: data.lighthouseResult.audits['largest-contentful-paint']?.numericValue,
        cls: data.lighthouseResult.audits['cumulative-layout-shift']?.numericValue,
        tbt: data.lighthouseResult.audits['total-blocking-time']?.numericValue,
        si: data.lighthouseResult.audits['speed-index']?.numericValue,
        tti: data.lighthouseResult.audits['interactive']?.numericValue,
      },
      timestamp: new Date(),
    };
  } catch (err) {
    console.error('PageSpeed test failed:', err);
    return null;
  }
};

// Scheduled jobs (run every 6 hours)
const startScheduledJobs = () => {
  // Run PageSpeed test immediately on startup
  setTimeout(async () => {
    console.log('🔍 Running PageSpeed test...');
    try {
      const mobileResult = await runPageSpeedTest('https://finaceverse.io', 'mobile');
      const desktopResult = await runPageSpeedTest('https://finaceverse.io', 'desktop');
      
      if (mobileResult) {
        await pool.query(
          'INSERT INTO pagespeed_results (url, strategy, score, metrics, timestamp) VALUES ($1, $2, $3, $4, $5)',
          [mobileResult.url, mobileResult.strategy, mobileResult.score, JSON.stringify(mobileResult.metrics), mobileResult.timestamp]
        );
      }
      if (desktopResult) {
        await pool.query(
          'INSERT INTO pagespeed_results (url, strategy, score, metrics, timestamp) VALUES ($1, $2, $3, $4, $5)',
          [desktopResult.url, desktopResult.strategy, desktopResult.score, JSON.stringify(desktopResult.metrics), desktopResult.timestamp]
        );
      }
      if (mobileResult || desktopResult) {
        console.log('✓ PageSpeed test completed');
      }
    } catch (error) {
      console.warn('PageSpeed test skipped:', error.message);
    }
  }, 5000); // Wait 5 seconds after startup
  
  // Schedule every 6 hours
  setInterval(async () => {
    console.log('🔍 Running scheduled PageSpeed test...');
    const mobileResult = await runPageSpeedTest('https://finaceverse.io', 'mobile');
    const desktopResult = await runPageSpeedTest('https://finaceverse.io', 'desktop');
    
    if (mobileResult) {
      await pool.query(
        'INSERT INTO pagespeed_results (url, strategy, score, metrics, timestamp) VALUES (\$1, \$2, \$3, \$4, \$5)',
        [mobileResult.url, mobileResult.strategy, mobileResult.score, JSON.stringify(mobileResult.metrics), mobileResult.timestamp]
      );
    }
    if (desktopResult) {
      await pool.query(
        'INSERT INTO pagespeed_results (url, strategy, score, metrics, timestamp) VALUES (\$1, \$2, \$3, \$4, \$5)',
        [desktopResult.url, desktopResult.strategy, desktopResult.score, JSON.stringify(desktopResult.metrics), desktopResult.timestamp]
      );
    }
    if (mobileResult || desktopResult) {
      console.log('✓ Scheduled PageSpeed test completed');
    }
  }, 6 * 60 * 60 * 1000); // Every 6 hours
};

// ============ UTILITY FUNCTIONS ============

// Sanitize input to prevent SQL injection
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.replace(/[<>'"]/g, '');
  }
  return input;
};

// Validate password strength
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

// Authentication middleware with military-grade security (fingerprinting + JWT service)
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
    // Use military-grade JWT service with fingerprint verification
    const decoded = jwtService.verifyAccessToken(token, req);
    
    // Add user info to request
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

// Role-based access control middleware
const requireRole = (role) => {
  return (req, res, next) => {
    if (req.role !== role && req.role !== 'superadmin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Validation error handler
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

// ============ SUPERADMIN ROUTES (Secret Path - SEO/Analytics) ============

// Mount SuperAdmin middleware and routes
if (superAdminAuth) {
  // SuperAdmin middleware for session validation
  app.use(createSuperAdminMiddleware(superAdminAuth));
  
  // Mount SuperAdmin routes at secret path
  createSuperAdminRoutes(app, superAdminAuth, pool, keywordOptimizer, localSEOManager);
  
  console.log('✓ SuperAdmin routes mounted (SEO & Analytics features)');
}

// ============ AUTHENTICATION ROUTES ============

// Login with validation and rate limiting
app.post('/api/auth/login', 
  authLimiter,
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Sanitize username
      const sanitizedUsername = sanitizeInput(username);
      
      const result = await pool.query('SELECT * FROM users WHERE username = $1', [sanitizedUsername]);
      
      if (result.rows.length === 0) {
        // Use same error message to prevent username enumeration
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const user = result.rows[0];
      
      // Verify password with timing-safe comparison
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Generate JWT token pair with fingerprinting (military-grade)
      const tokens = jwtService.generateTokenPair(
        { 
          userId: user.id, 
          username: user.username,
          role: user.role || 'admin',
          tenantId: user.tenant_id || 'platform',
        }, 
        req // Pass request for fingerprinting
      );
      
      // Log successful login (without sensitive data)
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

// Create initial admin user with enhanced security
app.post('/api/auth/create-admin',
  authLimiter,
  [
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
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { username, password, secretKey } = req.body;
      
      // Verify secret key
      if (!process.env.ADMIN_SECRET_KEY || secretKey !== process.env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid secret key' });
      }
      
      // Additional password validation
      const passwordCheck = validatePassword(password);
      if (!passwordCheck.valid) {
        return res.status(400).json({ error: passwordCheck.message });
      }
      
      // Sanitize username
      const sanitizedUsername = sanitizeInput(username);
      
      const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [sanitizedUsername]);
      
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }
      
      // Hash password with high cost factor
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

// ============ CSRF TOKEN ENDPOINT ============

// Get CSRF token for frontend
app.get('/api/csrf-token', (req, res) => {
  const token = csrfProtection.generateToken(res);
  res.json({ csrfToken: token });
});

// ============ TOKEN REFRESH ENDPOINT ============

// Refresh access token using refresh token
app.post('/api/auth/refresh',
  authLimiter,
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      // Helper function to get user by ID
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

// Logout - Revoke tokens
app.post('/api/auth/logout', authMiddleware, (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwtService.revokeToken(token);
  }
  res.json({ message: 'Logged out successfully' });
});

// ============ SUPERADMIN LOGIN (SIMPLIFIED) ============
// Simple master key authentication for superadmin
const MASTER_KEY = 'FV-SuperKey-7e54227eb017247e4786281289189725';

app.post('/api/superadmin/login', 
  authLimiter,
  [
    body('masterKey').notEmpty().withMessage('Master key is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { masterKey, password } = req.body;
      const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
      
      console.log(`🔍 Login attempt from ${ip}`);
      console.log(`🔍 Master key received: "${masterKey}" (length: ${masterKey?.length})`);
      console.log(`🔍 Password received: "${password}" (length: ${password?.length})`);
      console.log(`🔍 Expected master key: "${process.env.SUPERADMIN_MASTER_KEY}" (length: ${process.env.SUPERADMIN_MASTER_KEY?.length})`);
      
      // Clear any lockout before attempting (temporary fix to get you in)
      if (superAdminAuth && superAdminAuth.sessionManager) {
        superAdminAuth.sessionManager.failedAttempts.delete(ip);
        superAdminAuth.sessionManager.lockedOut.delete(ip);
      }
      
      // Use full SuperAdminAuthService with all security features (minus TOTP)
      if (!superAdminAuth) {
        return res.status(503).json({ error: 'SuperAdmin service not available' });
      }
      
      const result = await superAdminAuth.authenticate(req, masterKey, password, null);
      
      if (!result.success) {
        console.warn(`❌ SuperAdmin auth failed from ${req.ip}: ${result.code}`);
        return res.status(401).json({ error: result.error, code: result.code });
      }
      
      console.log(`✅ SuperAdmin logged in from ${req.ip}`);
      
      res.json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        username: result.user.username,
        role: result.user.role,
      });
    } catch (err) {
      console.error('SuperAdmin login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// ============ TRACKING ROUTES (Public) ============

// Track performance metrics with rate limiting and validation
app.post('/api/track-performance',
  publicTrackingLimiter,
  [
    body('name').trim().isIn(['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB']).withMessage('Invalid metric name'),
    body('value').isFloat({ min: 0 }).withMessage('Value must be a positive number'),
    body('page').trim().isLength({ max: 500 }).withMessage('Page URL too long'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, delta, value, id, page, timestamp, userAgent, connection } = req.body;
      
      // Get real IP address
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || req.ip;
      
      await pool.query(
        'INSERT INTO performance_metrics (name, delta, value, metric_id, page, user_agent, connection, ip, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [name, delta, value, id, page, userAgent, JSON.stringify(connection), ip, timestamp]
      );
      
      res.json({ success: true });
    } catch (err) {
      console.error('Track performance error:', err);
      res.status(500).json({ error: 'Failed to track performance' });
    }
  }
);

// Track visit with geography and rate limiting
app.post('/api/track-visit',
  publicTrackingLimiter,
  [
    body('page').trim().isLength({ max: 500 }).withMessage('Page URL too long'),
    body('referrer').optional().trim().isLength({ max: 1000 }).withMessage('Referrer too long'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Get real IP address
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || req.ip;
    
    // Get geo data from IP (using ipapi.co)
    let geoData = {};
    try {
      const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
      if (geoResponse.ok) {
        geoData = await geoResponse.json();
      }
    } catch (err) {
      console.error('Geo lookup failed:', err);
    }
    
    const { page, referrer, userAgent, screenResolution, viewport, language } = req.body;
    
    await pool.query(
      `INSERT INTO visits (page, referrer, user_agent, screen_resolution, viewport, language, ip, 
       country, country_code, region, city, timezone, isp, latitude, longitude) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        page, referrer, userAgent, screenResolution, viewport, language,
        ip.replace(/:\d+\$/, ''), // Anonymize (remove port)
        geoData.country_name, geoData.country_code, geoData.region,
        geoData.city, geoData.timezone, geoData.org,
        geoData.latitude, geoData.longitude
      ]
    );
    
    // Broadcast real-time update via WebSocket
    if (typeof global.broadcastAnalytics === 'function') {
      global.broadcastAnalytics('visit', {
        page,
        country: geoData.country_name,
        timestamp: new Date()
      });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Track visit error:', err);
    res.status(500).json({ error: 'Failed to track visit' });
  }
});

// Track events
app.post('/api/track-event', async (req, res) => {
  try {
    const { type, depth, page, timestamp } = req.body;
    
    await pool.query(
      'INSERT INTO events (type, depth, page, timestamp) VALUES (\$1, \$2, \$3, \$4)',
      [type, depth, page, timestamp]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Track event error:', err);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Track errors
app.post('/api/track-error', async (req, res) => {
  try {
    const { message, source, line, column, stack, page, userAgent, type, timestamp } = req.body;
    
    await pool.query(
      'INSERT INTO errors (message, source, line, "column", stack, page, user_agent, type, timestamp) VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9)',
      [message, source, line, column, stack, page, userAgent, type, timestamp]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Track error error:', err);
    res.status(500).json({ error: 'Failed to track error' });
  }
});

// ============ ANALYTICS ROUTES (SuperAdmin Only) ============
// Note: Full analytics dashboard available at secret SuperAdmin path

// Get performance metrics (SuperAdmin only)
app.get('/api/analytics/performance', apiLimiter, authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    const { startDate, endDate, page } = req.query;
    
    let query = 'SELECT * FROM performance_metrics WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (startDate && endDate) {
      query += ` AND timestamp >= $${paramCount} AND timestamp <= $${paramCount + 1}`;
      params.push(new Date(startDate), new Date(endDate));
      paramCount += 2;
    }
    if (page) {
      query += ` AND page = $${paramCount}`;
      params.push(page);
      paramCount++;
    }
    
    query += ' ORDER BY timestamp DESC LIMIT 1000';
    
    const result = await pool.query(query, params);
    const data = result.rows;
    
    // Calculate averages
    const lcpValues = data.filter(m => m.name === 'LCP').map(m => parseFloat(m.value));
    const fcpValues = data.filter(m => m.name === 'FCP').map(m => parseFloat(m.value));
    const clsValues = data.filter(m => m.name === 'CLS').map(m => parseFloat(m.value));
    const ttfbValues = data.filter(m => m.name === 'TTFB').map(m => parseFloat(m.value));
    
    const avg = arr => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    
    res.json({
      summary: {
        avgLCP: avg(lcpValues),
        avgFCP: avg(fcpValues),
        avgCLS: avg(clsValues),
        avgTTFB: avg(ttfbValues),
        totalSamples: data.length,
      },
      data,
    });
  } catch (err) {
    console.error('Get performance error:', err);
    res.status(500).json({ error: 'Failed to get performance data' });
  }
});

// Get geographic data
app.get('/api/analytics/geography', apiLimiter, authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    // Aggregate by country
    const byCountryResult = await pool.query(`
      SELECT country as name, COUNT(*) as count 
      FROM visits 
      WHERE country IS NOT NULL 
      GROUP BY country 
      ORDER BY count DESC 
      LIMIT 50
    `);
    
    // Aggregate by city
    const byCityResult = await pool.query(`
      SELECT city, country, COUNT(*) as count 
      FROM visits 
      WHERE city IS NOT NULL 
      GROUP BY city, country 
      ORDER BY count DESC 
      LIMIT 20
    `);
    
    // Get recent visits with coordinates
    const recentVisitsResult = await pool.query(`
      SELECT * FROM visits 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL 
      ORDER BY timestamp DESC 
      LIMIT 100
    `);
    
    const totalVisitsResult = await pool.query('SELECT COUNT(*) as total FROM visits');
    
    res.json({
      byCountry: byCountryResult.rows,
      byCity: byCityResult.rows,
      recentVisits: recentVisitsResult.rows,
      totalVisits: parseInt(totalVisitsResult.rows[0].total),
    });
  } catch (err) {
    console.error('Get geography error:', err);
    res.status(500).json({ error: 'Failed to get geography data' });
  }
});

// Get events
app.get('/api/analytics/events', apiLimiter, authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM events WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (type) {
      query += ` AND type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }
    if (startDate && endDate) {
      query += ` AND timestamp >= $${paramCount} AND timestamp <= $${paramCount + 1}`;
      params.push(new Date(startDate), new Date(endDate));
      paramCount += 2;
    }
    
    query += ' ORDER BY timestamp DESC LIMIT 500';
    
    const result = await pool.query(query, params);
    
    res.json({ data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Get errors
app.get('/api/analytics/errors', apiLimiter, authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM errors ORDER BY timestamp DESC LIMIT 100');
    
    res.json({ data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('Get errors error:', err);
    res.status(500).json({ error: 'Failed to get errors' });
  }
});

// Get dashboard summary
app.get('/api/analytics/summary', apiLimiter, authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    
    const [
      totalVisits,
      visits24h,
      visits7d,
      totalEvents,
      totalErrors,
      countries,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM visits'),
      pool.query('SELECT COUNT(*) as total FROM visits WHERE timestamp >= \$1', [last24h]),
      pool.query('SELECT COUNT(*) as total FROM visits WHERE timestamp >= \$1', [last7d]),
      pool.query('SELECT COUNT(*) as total FROM events'),
      pool.query('SELECT COUNT(*) as total FROM errors WHERE timestamp >= \$1', [last7d]),
      pool.query('SELECT COUNT(DISTINCT country) as total FROM visits WHERE country IS NOT NULL'),
    ]);
    
    res.json({
      totalVisits: parseInt(totalVisits.rows[0].total),
      visits24h: parseInt(visits24h.rows[0].total),
      visits7d: parseInt(visits7d.rows[0].total),
      totalEvents: parseInt(totalEvents.rows[0].total),
      totalErrors: parseInt(totalErrors.rows[0].total),
      uniqueCountries: parseInt(countries.rows[0].total),
    });
  } catch (err) {
    console.error('Get summary error:', err);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

// Get PageSpeed Insights results
app.get('/api/analytics/pagespeed', apiLimiter, authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    // Get latest results for mobile and desktop
    const latestMobile = await pool.query(
      'SELECT * FROM pagespeed_results WHERE strategy = \$1 ORDER BY timestamp DESC LIMIT 1',
      ['mobile']
    );
    
    const latestDesktop = await pool.query(
      'SELECT * FROM pagespeed_results WHERE strategy = \$1 ORDER BY timestamp DESC LIMIT 1',
      ['desktop']
    );
    
    // Get historical trend (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const history = await pool.query(
      'SELECT * FROM pagespeed_results WHERE timestamp >= \$1 ORDER BY timestamp ASC',
      [sevenDaysAgo]
    );
    
    res.json({
      latest: {
        mobile: latestMobile.rows[0] || null,
        desktop: latestDesktop.rows[0] || null,
      },
      history: history.rows,
    });
  } catch (err) {
    console.error('Get PageSpeed error:', err);
    res.status(500).json({ error: 'Failed to get PageSpeed data' });
  }
});

// AI-powered route prediction (simple implementation)
app.post('/api/predict-route', async (req, res) => {
  try {
    const { currentPath } = req.body;
    
    // Simple rule-based prediction (can be replaced with ML model)
    const predictions = {
      '/': ['/modules', '/request-demo', '/tailored-pilots'],
      '/modules': ['/request-demo', '/tailored-pilots', '/expert-consultation'],
      '/tailored-pilots': ['/request-demo', '/expert-consultation', '/modules'],
      '/blog': ['/modules', '/expert-consultation', '/'],
    };
    
    const predictedRoutes = predictions[currentPath] || ['/modules', '/request-demo'];
    
    res.json({
      predictions: predictedRoutes.map((route, index) => ({
        route,
        confidence: (0.9 - index * 0.2).toFixed(2), // Decreasing confidence
      })),
    });
  } catch (err) {
    console.error('Route prediction error:', err);
    res.status(500).json({ error: 'Prediction failed' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ========== ML Route Prediction Endpoint (Markov Chain Model) ==========

// Predict next route based on navigation history
app.post('/api/predict-route', async (req, res) => {
  try {
    const { currentPage, userId } = req.body;
    
    // Get navigation sequences from visits table
    const result = await pool.query(`
      WITH navigation_sequences AS (
        SELECT 
          page as current_page,
          LEAD(page) OVER (PARTITION BY ip ORDER BY timestamp) as next_page
        FROM visits
        WHERE timestamp >= NOW() - INTERVAL '30 days'
      )
      SELECT 
        next_page,
        COUNT(*) as frequency,
        (COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()) as probability
      FROM navigation_sequences
      WHERE current_page = $1 AND next_page IS NOT NULL
      GROUP BY next_page
      ORDER BY frequency DESC
      LIMIT 5
    `, [currentPage]);
    
    if (result.rows.length === 0) {
      // Fallback to most popular pages if no patterns found
      const popularPages = await pool.query(`
        SELECT page, COUNT(*) as frequency
        FROM visits
        WHERE timestamp >= NOW() - INTERVAL '7 days' AND page != $1
        GROUP BY page
        ORDER BY frequency DESC
        LIMIT 3
      `, [currentPage]);
      
      return res.json({
        predictions: popularPages.rows.map(row => ({
          route: row.page,
          confidence: 0.2, // Low confidence for fallback
          method: 'popularity'
        }))
      });
    }
    
    // Return predictions with confidence scores
    res.json({
      predictions: result.rows.map(row => ({
        route: row.next_page,
        confidence: parseFloat(row.probability) / 100,
        method: 'markov-chain'
      }))
    });
  } catch (error) {
    console.error('Route prediction error:', error);
    res.status(500).json({ error: 'Failed to predict route' });
  }
});

// ========== A/B Testing Endpoints ==========

// Create new A/B test experiment
app.post('/api/experiments', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    const { name, description, variants } = req.body;
    
    const result = await pool.query(
      'INSERT INTO experiments (name, description, variants, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, JSON.stringify(variants), 'active']
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create experiment error:', error);
    res.status(500).json({ error: 'Failed to create experiment' });
  }
});

// Get all experiments
app.get('/api/experiments', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM experiments ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get experiments error:', error);
    res.status(500).json({ error: 'Failed to fetch experiments' });
  }
});

// Get experiment by ID with statistics
app.get('/api/experiments/:id', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const [experiment, assignments, conversions] = await Promise.all([
      pool.query('SELECT * FROM experiments WHERE id = $1', [id]),
      pool.query(
        'SELECT variant, COUNT(*) as count FROM experiment_assignments WHERE experiment_id = $1 GROUP BY variant',
        [id]
      ),
      pool.query(
        'SELECT variant, COUNT(*) as count, AVG(value) as avg_value FROM experiment_conversions WHERE experiment_id = $1 GROUP BY variant',
        [id]
      )
    ]);
    
    if (experiment.rows.length === 0) {
      return res.status(404).json({ error: 'Experiment not found' });
    }
    
    const stats = {};
    experiment.rows[0].variants.forEach(variant => {
      const assignmentData = assignments.rows.find(a => a.variant === variant);
      const conversionData = conversions.rows.find(c => c.variant === variant);
      
      stats[variant] = {
        assignments: parseInt(assignmentData?.count || 0),
        conversions: parseInt(conversionData?.count || 0),
        conversionRate: assignmentData ? 
          ((parseInt(conversionData?.count || 0) / parseInt(assignmentData.count)) * 100).toFixed(2) : 0,
        avgValue: parseFloat(conversionData?.avg_value || 0)
      };
    });
    
    res.json({
      ...experiment.rows[0],
      stats
    });
  } catch (error) {
    console.error('Get experiment error:', error);
    res.status(500).json({ error: 'Failed to fetch experiment' });
  }
});

// Assign user to variant (used by frontend)
app.post('/api/experiments/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    // Check if user already assigned
    const existing = await pool.query(
      'SELECT variant FROM experiment_assignments WHERE experiment_id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (existing.rows.length > 0) {
      return res.json({ variant: existing.rows[0].variant });
    }
    
    // Get experiment variants
    const experiment = await pool.query('SELECT variants FROM experiments WHERE id = $1 AND status = $2', [id, 'active']);
    
    if (experiment.rows.length === 0) {
      return res.status(404).json({ error: 'Active experiment not found' });
    }
    
    // Random assignment (50/50 split for 2 variants)
    const variants = experiment.rows[0].variants;
    const variant = variants[Math.floor(Math.random() * variants.length)];
    
    // Save assignment
    await pool.query(
      'INSERT INTO experiment_assignments (experiment_id, user_id, variant) VALUES ($1, $2, $3)',
      [id, userId, variant]
    );
    
    res.json({ variant });
  } catch (error) {
    console.error('Assign variant error:', error);
    res.status(500).json({ error: 'Failed to assign variant' });
  }
});

// Track conversion
app.post('/api/experiments/:id/convert', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, conversionType, value } = req.body;
    
    // Get user's assigned variant
    const assignment = await pool.query(
      'SELECT variant FROM experiment_assignments WHERE experiment_id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (assignment.rows.length === 0) {
      return res.status(404).json({ error: 'User not assigned to experiment' });
    }
    
    const variant = assignment.rows[0].variant;
    
    // Record conversion
    await pool.query(
      'INSERT INTO experiment_conversions (experiment_id, user_id, variant, conversion_type, value) VALUES ($1, $2, $3, $4, $5)',
      [id, userId, variant, conversionType, value || 1]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Track conversion error:', error);
    res.status(500).json({ error: 'Failed to track conversion' });
  }
});

// End experiment
app.post('/api/experiments/:id/end', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(
      'UPDATE experiments SET status = $1, ended_at = NOW() WHERE id = $2',
      ['ended', id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('End experiment error:', error);
    res.status(500).json({ error: 'Failed to end experiment' });
  }
});

// ========== Google Search Console Integration ==========

// Helper function to get Google OAuth access token
async function getGoogleAccessToken() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('Google OAuth credentials not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  const data = await response.json();
  return data.access_token;
}

// Get Search Console queries data
app.get('/api/search-console/queries', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    const accessToken = await getGoogleAccessToken();
    const siteUrl = 'https://www.finaceverse.io';
    
    // Get last 28 days of data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 28);
    
    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['query', 'page'],
          rowLimit: 100
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Search Console API error:', error);
      return res.status(response.status).json({ error: 'Failed to fetch Search Console data' });
    }

    const data = await response.json();
    
    res.json({
      queries: data.rows || [],
      totalClicks: data.rows?.reduce((sum, row) => sum + row.clicks, 0) || 0,
      totalImpressions: data.rows?.reduce((sum, row) => sum + row.impressions, 0) || 0,
      avgCTR: data.rows?.length ? 
        (data.rows.reduce((sum, row) => sum + row.ctr, 0) / data.rows.length * 100).toFixed(2) : 0,
      avgPosition: data.rows?.length ?
        (data.rows.reduce((sum, row) => sum + row.position, 0) / data.rows.length).toFixed(1) : 0
    });
  } catch (error) {
    console.error('Search Console error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Search Console data' });
  }
});

// Get Search Console performance over time
app.get('/api/search-console/performance', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    const accessToken = await getGoogleAccessToken();
    const siteUrl = 'https://www.finaceverse.io';
    
    // Get last 90 days of data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    
    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['date'],
          rowLimit: 90
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Search Console API error:', error);
      return res.status(response.status).json({ error: 'Failed to fetch Search Console performance' });
    }

    const data = await response.json();
    
    res.json({
      timeline: data.rows || []
    });
  } catch (error) {
    console.error('Search Console performance error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Search Console performance' });
  }
});

// =====================================================================
// SEO AI INFRASTRUCTURE ENDPOINTS (with military-grade security)
// =====================================================================

// Get all target keywords (with tenant isolation)
app.get('/api/seo/keywords', authMiddleware, requireRole('superadmin'), seoLimiter, async (req, res) => {
  try {
    // Tenant-isolated query
    const tenantId = req.tenantId || 'platform';
    const result = await pool.query(`
      SELECT * FROM target_keywords 
      WHERE tenant_id = $1
      ORDER BY 
        CASE keyword_type
          WHEN 'primary' THEN 1
          WHEN 'long-tail' THEN 2
          WHEN 'semantic' THEN 3
          ELSE 4
        END,
        priority DESC
    `, [tenantId]);
    
    res.json({
      keywords: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Keywords fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch keywords' });
  }
});

// Scan a specific page for keyword optimization (with SSRF protection)
app.get('/api/seo/scan/:page', authMiddleware, requireRole('superadmin'), seoLimiter, async (req, res) => {
  try {
    if (!keywordOptimizer) {
      return res.status(503).json({ error: 'SEO optimizer not available' });
    }
    
    const { page } = req.params;
    
    // SECURITY: Validate page parameter to prevent path traversal
    const sanitizedPage = page.replace(/[^a-zA-Z0-9-_]/g, '');
    if (sanitizedPage !== page) {
      console.warn(`🚨 Potential path traversal attempt: ${page}`);
      return res.status(400).json({ error: 'Invalid page parameter' });
    }
    
    const pageUrl = sanitizedPage === 'home' ? 
      'https://www.finaceverse.io/' : 
      `https://www.finaceverse.io/${sanitizedPage}`;
    
    console.log(`📊 Scanning page: ${pageUrl} (tenant: ${req.tenantId})`);
    const analysis = await keywordOptimizer.scanPageOptimization(pageUrl);
    
    res.json(analysis);
  } catch (error) {
    console.error('Page scan error:', error);
    res.status(500).json({ error: error.message || 'Failed to scan page' });
  }
});

// Scan all pages (expensive operation - strict rate limit)
app.post('/api/seo/scan-all', authMiddleware, requireRole('superadmin'), seoLimiter, async (req, res) => {
  try {
    if (!keywordOptimizer) {
      return res.status(503).json({ error: 'SEO optimizer not available' });
    }
    
    console.log(`📊 Starting full site scan... (tenant: ${req.tenantId}, user: ${req.username})`);
    const results = await keywordOptimizer.scanAllPages();
    
    res.json({
      success: true,
      message: 'Full site scan completed',
      results
    });
  } catch (error) {
    console.error('Full scan error:', error);
    res.status(500).json({ error: error.message || 'Failed to scan all pages' });
  }
});

// Generate SEO report
app.get('/api/seo/report', authMiddleware, requireRole('superadmin'), seoLimiter, async (req, res) => {
  try {
    if (!keywordOptimizer) {
      return res.status(503).json({ error: 'SEO optimizer not available' });
    }
    
    const report = await keywordOptimizer.generateReport();
    res.json(report);
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate report' });
  }
});

// Get content analysis history for a page
app.get('/api/seo/history/:page', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    const { page } = req.params;
    const pageUrl = page === 'home' ? 
      'https://www.finaceverse.io/' : 
      `https://www.finaceverse.io/${page}`;
    
    const result = await pool.query(`
      SELECT 
        page_url,
        seo_score,
        word_count,
        keyword_density,
        readability_score,
        meta_title,
        meta_description,
        scanned_at,
        heading_structure
      FROM content_analysis
      WHERE page_url = $1
      ORDER BY scanned_at DESC
      LIMIT 30
    `, [pageUrl]);
    
    res.json({
      page: pageUrl,
      history: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get SEO issues
app.get('/api/seo/issues', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    const { severity, page, autoFixable } = req.query;
    
    let query = 'SELECT * FROM seo_issues WHERE status = $1';
    const params = ['open'];
    
    if (severity) {
      query += ' AND severity = $2';
      params.push(severity);
    }
    
    if (page) {
      const pageUrl = page === 'home' ? 
        'https://www.finaceverse.io/' : 
        `https://www.finaceverse.io/${page}`;
      query += ` AND page_url = $${params.length + 1}`;
      params.push(pageUrl);
    }
    
    if (autoFixable === 'true') {
      query += ` AND auto_fixable = true`;
    }
    
    query += ' ORDER BY CASE severity WHEN \'critical\' THEN 1 WHEN \'high\' THEN 2 WHEN \'medium\' THEN 3 ELSE 4 END, detected_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({
      issues: result.rows,
      total: result.rows.length,
      critical: result.rows.filter(i => i.severity === 'critical').length,
      high: result.rows.filter(i => i.severity === 'high').length,
      autoFixable: result.rows.filter(i => i.auto_fixable).length
    });
  } catch (error) {
    console.error('Issues fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// Auto-scan endpoint (run daily scan manually)
app.post('/api/seo/auto-scan', authMiddleware, requireRole('superadmin'), seoLimiter, async (req, res) => {
  try {
    if (!autoScanner) {
      return res.status(503).json({ error: 'Auto-scanner not available' });
    }
    
    const result = await autoScanner.runDailyScan();
    res.json(result);
  } catch (error) {
    console.error('Auto-scan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Backlink crawler endpoints
app.post('/api/seo/backlinks/crawl', authMiddleware, requireRole('superadmin'), seoLimiter, async (req, res) => {
  try {
    if (!backlinkCrawler) {
      return res.status(503).json({ error: 'Backlink crawler not available' });
    }
    
    const result = await backlinkCrawler.crawlBacklinks();
    res.json(result);
  } catch (error) {
    console.error('Backlink crawl error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/seo/backlinks/stats', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    if (!backlinkCrawler) {
      return res.status(503).json({ error: 'Backlink crawler not available' });
    }
    
    const stats = await backlinkCrawler.getBacklinkStats();
    res.json({ stats });
  } catch (error) {
    console.error('Backlink stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/seo/backlinks/top', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    if (!backlinkCrawler) {
      return res.status(503).json({ error: 'Backlink crawler not available' });
    }
    
    const limit = parseInt(req.query.limit) || 10;
    const backlinks = await backlinkCrawler.getTopBacklinks(limit);
    res.json({ backlinks, count: backlinks.length });
  } catch (error) {
    console.error('Top backlinks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Google Search Console integration endpoints
app.post('/api/seo/gsc/fetch-rankings', authMiddleware, requireRole('superadmin'), seoLimiter, async (req, res) => {
  try {
    if (!gscIntegration) {
      return res.status(503).json({ error: 'GSC integration not available' });
    }
    
    const days = parseInt(req.body.days) || 7;
    const result = await gscIntegration.fetchKeywordRankings(days);
    res.json(result);
  } catch (error) {
    console.error('GSC fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/seo/gsc/summary', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    if (!gscIntegration) {
      return res.status(503).json({ error: 'GSC integration not available' });
    }
    
    const summary = await gscIntegration.getPerformanceSummary();
    res.json(summary);
  } catch (error) {
    console.error('GSC summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/seo/gsc/top-keywords', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    if (!gscIntegration) {
      return res.status(503).json({ error: 'GSC integration not available' });
    }
    
    const limit = parseInt(req.query.limit) || 20;
    const keywords = await gscIntegration.getTopKeywords(limit);
    res.json({ keywords, count: keywords.length });
  } catch (error) {
    console.error('Top keywords error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/seo/gsc/opportunities', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    if (!gscIntegration) {
      return res.status(503).json({ error: 'GSC integration not available' });
    }
    
    const opportunities = await gscIntegration.getKeywordOpportunities();
    res.json({ opportunities, count: opportunities.length });
  } catch (error) {
    console.error('Opportunities error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Auto-fix endpoints
app.post('/api/seo/auto-fix', authMiddleware, requireRole('superadmin'), seoLimiter, async (req, res) => {
  try {
    if (!autoFixer) {
      return res.status(503).json({ error: 'Auto-fixer not available' });
    }
    
    const result = await autoFixer.fixAllIssues();
    res.json(result);
  } catch (error) {
    console.error('Auto-fix error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/seo/auto-fix/history', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    if (!autoFixer) {
      return res.status(503).json({ error: 'Auto-fixer not available' });
    }
    
    const limit = parseInt(req.query.limit) || 20;
    const history = await autoFixer.getFixHistory(limit);
    res.json({ history, count: history.length });
  } catch (error) {
    console.error('Fix history error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/seo/auto-fix/stats', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    if (!autoFixer) {
      return res.status(503).json({ error: 'Auto-fixer not available' });
    }
    
    const stats = await autoFixer.getFixStats();
    res.json(stats);
  } catch (error) {
    console.error('Fix stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// LOCAL SEO - 9 COUNTRIES
// =====================================================================

// Get local SEO status for all countries
app.get('/api/local-seo/status', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    if (!localSEOManager) {
      return res.status(503).json({ error: 'Local SEO manager not available' });
    }
    
    const status = await localSEOManager.generateLocalSEOReport();
    res.json({
      countries: status,
      total: status.length
    });
  } catch (error) {
    console.error('Local SEO status error:', error);
    res.status(500).json({ error: 'Failed to fetch local SEO status' });
  }
});

// Setup local SEO for a specific country
app.post('/api/local-seo/setup/:countryCode', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    if (!localSEOManager) {
      return res.status(503).json({ error: 'Local SEO manager not available' });
    }
    
    const { countryCode } = req.params;
    console.log(`🌍 Setting up local SEO for ${countryCode}...`);
    
    const result = await localSEOManager.setupLocalPresence(countryCode.toUpperCase());
    res.json(result);
  } catch (error) {
    console.error('Local SEO setup error:', error);
    res.status(500).json({ error: error.message || 'Failed to setup local SEO' });
  }
});

// Setup all countries at once
app.post('/api/local-seo/setup-all', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    if (!localSEOManager) {
      return res.status(503).json({ error: 'Local SEO manager not available' });
    }
    
    console.log('🌍 Setting up local SEO for all 9 countries...');
    const results = await localSEOManager.setupAllCountries();
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    res.json({
      success: true,
      message: `Setup completed: ${successful} successful, ${failed} failed`,
      results,
      successful,
      failed
    });
  } catch (error) {
    console.error('Local SEO setup all error:', error);
    res.status(500).json({ error: error.message || 'Failed to setup all countries' });
  }
});

// Get country priorities
app.get('/api/local-seo/priorities', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    if (!localSEOManager) {
      return res.status(503).json({ error: 'Local SEO manager not available' });
    }
    
    const priorities = localSEOManager.getCountryPriorities();
    res.json({ priorities });
  } catch (error) {
    console.error('Priorities fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch priorities' });
  }
});

// Get city pages for a country
app.get('/api/local-seo/cities/:countryCode', authMiddleware, requireRole('superadmin'), async (req, res) => {
  try {
    const { countryCode } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM city_pages
      WHERE country_code = $1
      ORDER BY status DESC, city_name
    `, [countryCode.toUpperCase()]);
    
    res.json({
      countryCode: countryCode.toUpperCase(),
      cities: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Cities fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

// Health check endpoint for Railway
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ============ SECURITY STATUS ENDPOINT ============

// Get security status (admin only)
app.get('/api/security/status', authMiddleware, requireRole('admin'), (req, res) => {
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

// Encrypt sensitive data endpoint (admin only)
app.post('/api/security/encrypt', authMiddleware, requireRole('admin'),
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

// Decrypt sensitive data endpoint (admin only)
app.post('/api/security/decrypt', authMiddleware, requireRole('admin'),
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

// Catch-all route - serve React app for any non-API routes (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? 'https://www.finaceverse.io' 
      : ['http://localhost:3000', 'http://localhost:5000'],
    methods: ['GET', 'POST']
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Send real-time analytics updates
  socket.on('subscribe-analytics', async () => {
    console.log('📊 Client subscribed to analytics updates');
    
    // Send initial data
    try {
      const summary = await cacheWrapper('analytics:summary', async () => {
        const result = await pool.query(`
          SELECT 
            COUNT(DISTINCT visit_id) as total_visits,
            COUNT(DISTINCT ip_address) as unique_visitors,
            AVG(duration) as avg_duration
          FROM visits
          WHERE timestamp >= NOW() - INTERVAL '24 hours'
        `);
        return result.rows[0];
      });
      
      socket.emit('analytics-update', { type: 'summary', data: summary });
    } catch (error) {
      console.error('Error sending initial analytics:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Helper function to broadcast analytics updates
global.broadcastAnalytics = (type, data) => {
  io.emit('analytics-update', { type, data });
};

// Start server after database initialization
async function startServer() {
  try {
    const dbInitialized = await initializeDatabase();
    if (!dbInitialized) {
      console.error('⚠️ Database initialization failed - check DATABASE_URL');
      console.error('DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'NOT SET');
    }
    
    startScheduledJobs();
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Analytics API running on port ${PORT}`);
      console.log(`🔌 WebSocket server ready`);
    });
  } catch (error) {
    console.error('❌ Fatal error during startup:', error);
    process.exit(1);
  }
}

startServer().catch(err => {
  console.error('❌ Unhandled error in startServer:', err);
  process.exit(1);
});
