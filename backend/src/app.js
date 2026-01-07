/**
 * FinACEverse Backend Application
 * 
 * Enterprise-grade Express.js application with:
 * - Military-grade security (AES-256-GCM, JWT fingerprinting, CSRF, SSRF, XSS)
 * - Multi-tenant architecture
 * - Scale-ready for 100K+ users
 * - Modular route structure
 * 
 * This file composes the Express app from modular components.
 * The server startup logic remains in server.js.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { validationResult } = require('express-validator');

// Security Module
const {
  EncryptionService,
  JWTSecurityService,
  CSRFProtection,
  SSRFProtection,
  XSSSanitizer,
  TenantIsolation,
  securityHeaders,
} = require('../security');

// SEO Services
const KeywordOptimizer = require('./modules/seo/keyword-optimizer.service');
const LocalSEOManager = require('./modules/local-seo/local-seo-manager.service');

// Route Factories
const {
  createAuthRoutes,
  createTrackingRoutes,
  createAnalyticsRoutes,
  createSEORoutes,
  createExperimentsRoutes,
  createSecurityRoutes,
} = require('./routes');

// ============ CONFIGURATION ============

const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
  encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!',
  csrfSecret: process.env.CSRF_SECRET || 'csrf-secret-key-change-in-prod!',
  googleApiKey: process.env.GOOGLE_API_KEY || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN || '',
  allowedOrigins: process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : 
    ['http://localhost:3000', 'https://www.finaceverse.io', 'https://finaceverse.io'],
  siteUrl: 'https://www.finaceverse.io',
  isProduction: process.env.NODE_ENV === 'production',
};

// ============ APPLICATION FACTORY ============

/**
 * Creates and configures the Express application
 * @param {Object} deps - Dependencies
 * @param {Object} deps.pool - PostgreSQL connection pool
 * @param {Object} deps.redisClient - Redis client (optional)
 * @returns {Object} { app, services } - Express app and initialized services
 */
function createApp({ pool, redisClient = null }) {
  const app = express();

  // ============ INITIALIZE SECURITY SERVICES ============

  const encryptionService = new EncryptionService(config.encryptionKey);
  console.log('✓ Encryption Service initialized (AES-256-GCM)');

  const jwtService = new JWTSecurityService({
    accessSecret: config.jwtSecret,
    refreshSecret: config.jwtRefreshSecret,
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    issuer: 'finaceverse',
    audience: 'finaceverse-app',
  });
  console.log('✓ JWT Security Service initialized (fingerprinting enabled)');

  const csrfProtection = new CSRFProtection(config.csrfSecret);
  console.log('✓ CSRF Protection initialized');

  const ssrfProtection = new SSRFProtection();
  ssrfProtection.allowDomain('finaceverse.io');
  ssrfProtection.allowDomain('www.finaceverse.io');
  console.log('✓ SSRF Protection initialized');

  const xssSanitizer = new XSSSanitizer();
  console.log('✓ XSS Sanitizer initialized');

  const tenantIsolation = new TenantIsolation();
  console.log('✓ Multi-tenant isolation initialized');

  // ============ INITIALIZE SEO SERVICES ============

  let keywordOptimizer;
  let localSEOManager;

  try {
    keywordOptimizer = new KeywordOptimizer(pool, { ssrfProtection, xssSanitizer });
    localSEOManager = new LocalSEOManager(pool);
    console.log('✓ SEO AI services initialized (with security wrappers)');
  } catch (error) {
    console.warn('⚠️  SEO AI services not available:', error.message);
  }

  // ============ TRUST PROXY (for Railway/Cloudflare) ============

  // Required for rate limiting and IP detection behind reverse proxies
  app.set('trust proxy', 1);

  // ============ SECURITY MIDDLEWARE ============

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
        upgradeInsecureRequests: config.isProduction ? [] : null,
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  const corsOptions = {
    origin: function (origin, callback) {
      if (!origin || config.allowedOrigins.indexOf(origin) !== -1 || !config.isProduction) {
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

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(hpp());
  app.use(cookieParser());
  app.use(securityHeaders);
  app.use(tenantIsolation.middleware());
  app.use(csrfProtection.middleware());

  // ============ RATE LIMITERS ============

  // Helper for IPv6-safe IP extraction
  const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  };

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
  });

  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 300,
    message: 'API rate limit exceeded, please slow down',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.userId ? `user:${req.userId}` : getClientIp(req),
    skip: (req) => req.path === '/api/health',
    validate: { xForwardedForHeader: false },
  });

  const publicTrackingLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 1000,
    message: 'Rate limit exceeded',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.headers['x-internal-request'] === process.env.INTERNAL_SECRET,
    validate: { xForwardedForHeader: false },
  });

  const seoLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: 'SEO operations rate limit exceeded - these are resource-intensive',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `tenant:${req.tenantId || 'platform'}`,
    validate: { xForwardedForHeader: false },
  });

  const burstLimiter = rateLimit({
    windowMs: 1000,
    max: 50,
    message: 'Request burst detected, please slow down',
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
  });

  app.use(burstLimiter);

  // ============ SHARED MIDDLEWARE ============

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

  const requireRole = (role) => {
    return (req, res, next) => {
      if (req.role !== role && req.role !== 'superadmin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    };
  };

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

  // ============ UTILITY FUNCTIONS ============

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

  const runPageSpeedTest = async (url, strategy = 'mobile') => {
    if (!config.googleApiKey) {
      console.warn('Google API key not configured, skipping PageSpeed test');
      return null;
    }
    
    try {
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${config.googleApiKey}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) {
          console.warn('⚠️  PageSpeed Insights API not enabled.');
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

  const getGoogleAccessToken = async () => {
    if (!config.googleClientId || !config.googleClientSecret || !config.googleRefreshToken) {
      throw new Error('Google OAuth credentials not configured');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        refresh_token: config.googleRefreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    const data = await response.json();
    return data.access_token;
  };

  // ============ STATIC FILES ============

  app.use(express.static(path.join(__dirname, '../../build')));

  // ============ HEALTH CHECK ============

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // ============ MOUNT ROUTES ============

  // Auth routes
  app.use('/api/auth', createAuthRoutes({
    pool,
    jwtService,
    csrfProtection,
    authLimiter,
    handleValidationErrors,
    authMiddleware,
  }));

  // CSRF token (also accessible at root level)
  app.get('/api/csrf-token', (req, res) => {
    const token = csrfProtection.generateToken(res);
    res.json({ csrfToken: token });
  });

  // Create tracking router instance for legacy route forwarding
  const trackingRouter = createTrackingRoutes({
    pool,
    publicTrackingLimiter,
    handleValidationErrors,
    broadcastAnalytics: global.broadcastAnalytics,
  });

  // Tracking routes (public)
  app.use('/api/track', trackingRouter);

  // Legacy tracking endpoints (backwards compatibility) - forward to tracking router
  // Note: Rate limiting is applied inside the router, not here (avoid double-limiting)
  app.post('/api/track-performance', (req, res, next) => {
    req.url = '/performance';
    req.baseUrl = '/api/track';
    trackingRouter(req, res, next);
  });
  app.post('/api/track-visit', (req, res, next) => {
    req.url = '/visit';
    req.baseUrl = '/api/track';
    trackingRouter(req, res, next);
  });
  app.post('/api/track-event', (req, res, next) => {
    req.url = '/event';
    req.baseUrl = '/api/track';
    trackingRouter(req, res, next);
  });
  app.post('/api/track-error', (req, res, next) => {
    req.url = '/error';
    req.baseUrl = '/api/track';
    trackingRouter(req, res, next);
  });

  // Create analytics router instance for legacy route forwarding
  const analyticsRouter = createAnalyticsRoutes({
    pool,
    apiLimiter,
    authMiddleware,
    cacheWrapper,
    runPageSpeedTest,
    getGoogleAccessToken,
    siteUrl: config.siteUrl,
  });

  // Analytics routes (protected)
  app.use('/api/analytics', analyticsRouter);

  // Route prediction (also at root level for backwards compatibility)
  app.post('/api/predict-route', (req, res, next) => {
    req.url = '/predict-route';
    req.baseUrl = '/api/analytics';
    analyticsRouter(req, res, next);
  });

  // Create SEO router instance for legacy route forwarding
  const seoRouter = createSEORoutes({
    pool,
    seoLimiter,
    apiLimiter,
    authMiddleware,
    keywordOptimizer,
    localSEOManager,
    siteUrl: config.siteUrl,
  });

  // SEO routes (protected)
  app.use('/api/seo', seoRouter);

  // Local SEO routes (backwards compatibility) - forward to SEO router's /local/* paths
  app.get('/api/local-seo/status', authMiddleware, (req, res, next) => {
    req.url = '/local/status';
    req.baseUrl = '/api/seo';
    seoRouter(req, res, next);
  });
  app.post('/api/local-seo/setup/:countryCode', authMiddleware, (req, res, next) => {
    req.url = `/local/setup/${req.params.countryCode}`;
    req.baseUrl = '/api/seo';
    seoRouter(req, res, next);
  });
  app.post('/api/local-seo/setup-all', authMiddleware, (req, res, next) => {
    req.url = '/local/setup-all';
    req.baseUrl = '/api/seo';
    seoRouter(req, res, next);
  });
  app.get('/api/local-seo/priorities', authMiddleware, (req, res, next) => {
    req.url = '/local/priorities';
    req.baseUrl = '/api/seo';
    seoRouter(req, res, next);
  });
  app.get('/api/local-seo/cities/:countryCode', authMiddleware, (req, res, next) => {
    req.url = `/local/cities/${req.params.countryCode}`;
    req.baseUrl = '/api/seo';
    seoRouter(req, res, next);
  });

  // Experiments routes (protected)
  app.use('/api/experiments', createExperimentsRoutes({
    pool,
    apiLimiter,
    authMiddleware,
  }));

  // Security routes (admin only)
  app.use('/api/security', createSecurityRoutes({
    authMiddleware,
    requireRole,
    handleValidationErrors,
    encryptionService,
  }));

  // Search Console routes (backwards compatibility)
  app.get('/api/search-console/queries', authMiddleware, (req, res, next) => {
    req.url = '/search-console/queries';
    req.baseUrl = '/api/analytics';
    analyticsRouter(req, res, next);
  });

  app.get('/api/search-console/performance', authMiddleware, (req, res, next) => {
    req.url = '/search-console/performance';
    req.baseUrl = '/api/analytics';
    analyticsRouter(req, res, next);
  });

  // ============ SPA FALLBACK ============

  // Serve static files from build directory
  app.use(express.static(path.join(__dirname, '../../build')));

  // API 404 handler - must come before SPA fallback
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // SPA fallback - serve index.html for all non-API routes (Express 5 syntax)
  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '../../build', 'index.html'));
  });

  // ============ RETURN APP AND SERVICES ============

  return {
    app,
    services: {
      encryptionService,
      jwtService,
      csrfProtection,
      ssrfProtection,
      xssSanitizer,
      tenantIsolation,
      keywordOptimizer,
      localSEOManager,
      runPageSpeedTest,
      cacheWrapper,
    },
    config,
  };
}

module.exports = { createApp, config };
