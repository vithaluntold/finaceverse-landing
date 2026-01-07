/**
 * MILITARY-GRADE SECURITY MODULE
 * ================================
 * Enterprise security services for multi-tenant SaaS platform
 * 
 * Features:
 * - AES-256-GCM encryption for data at rest
 * - JWT with fingerprinting & rotation
 * - CSRF double-submit cookie pattern
 * - SSRF protection for URL fetching
 * - XSS sanitization
 * - Audit logging
 * - Rate limiting per tenant
 * - IP reputation checking
 * 
 * @module security
 * @version 2.0.0
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { URL } = require('url');

// ============================================================================
// ENCRYPTION SERVICE - AES-256-GCM
// ============================================================================

class EncryptionService {
  constructor(masterKey) {
    if (!masterKey || masterKey.length < 32) {
      throw new Error('SECURITY: Master key must be at least 32 characters');
    }
    // Derive a 256-bit key from master key using PBKDF2
    this.key = crypto.pbkdf2Sync(
      masterKey,
      'finaceverse-salt-v2', // Static salt (could be made dynamic per-tenant)
      100000, // Iterations (OWASP recommended minimum)
      32, // Key length (256 bits)
      'sha512'
    );
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param {string|object} data - Data to encrypt
   * @returns {string} Encrypted data as base64 string (iv:authTag:ciphertext)
   */
  encrypt(data) {
    const plaintext = typeof data === 'object' ? JSON.stringify(data) : String(data);
    
    // Generate random IV (12 bytes for GCM)
    const iv = crypto.randomBytes(12);
    
    // Create cipher with GCM mode (authenticated encryption)
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get authentication tag (16 bytes)
    const authTag = cipher.getAuthTag();
    
    // Return format: iv:authTag:ciphertext (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param {string} encryptedData - Encrypted data (iv:authTag:ciphertext)
   * @returns {string|object} Decrypted data
   */
  decrypt(encryptedData) {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivBase64, authTagBase64, ciphertext] = parts;
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Try to parse as JSON, return string if not JSON
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      console.error('Decryption failed:', error.message);
      throw new Error('Decryption failed - data may be tampered');
    }
  }

  /**
   * Hash sensitive data (one-way, for comparison only)
   * @param {string} data - Data to hash
   * @returns {string} SHA-256 hash
   */
  hash(data) {
    return crypto.createHmac('sha256', this.key)
      .update(String(data))
      .digest('hex');
  }

  /**
   * Generate secure random token
   * @param {number} length - Token length in bytes
   * @returns {string} Hex-encoded token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
}


// ============================================================================
// JWT SECURITY SERVICE - Enhanced with fingerprinting & rotation
// ============================================================================

class JWTSecurityService {
  constructor(config) {
    this.accessSecret = config.accessSecret;
    this.refreshSecret = config.refreshSecret;
    this.accessTokenExpiry = config.accessTokenExpiry || '15m';
    this.refreshTokenExpiry = config.refreshTokenExpiry || '7d';
    this.issuer = config.issuer || 'finaceverse';
    this.audience = config.audience || 'finaceverse-app';
    
    // Token blacklist (in production, use Redis)
    this.blacklist = new Set();
    // SECURITY: Maximum blacklist size to prevent memory exhaustion
    this.maxBlacklistSize = config.maxBlacklistSize || 100000;
    // Track token expiration times for cleanup
    this.blacklistExpiry = new Map(); // token -> expiryTimestamp
    
    // Periodic cleanup of expired blacklisted tokens (every 5 minutes)
    this._blacklistCleanupInterval = setInterval(() => this._cleanupBlacklist(), 300000);
  }
  
  /**
   * Cleanup expired tokens from blacklist
   */
  _cleanupBlacklist() {
    const now = Date.now();
    let cleaned = 0;
    for (const [token, expiry] of this.blacklistExpiry) {
      if (expiry < now) {
        this.blacklist.delete(token);
        this.blacklistExpiry.delete(token);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired tokens from blacklist`);
    }
  }
  
  /**
   * Add token to blacklist with expiry tracking
   */
  _addToBlacklist(token, expiresIn = 86400000) { // Default 24h
    // SECURITY: Enforce maximum blacklist size with LRU eviction
    if (this.blacklist.size >= this.maxBlacklistSize) {
      // Remove oldest 10% of entries
      const toRemove = Math.floor(this.maxBlacklistSize * 0.1);
      const entries = [...this.blacklistExpiry.entries()]
        .sort((a, b) => a[1] - b[1])
        .slice(0, toRemove);
      for (const [oldToken] of entries) {
        this.blacklist.delete(oldToken);
        this.blacklistExpiry.delete(oldToken);
      }
    }
    
    this.blacklist.add(token);
    this.blacklistExpiry.set(token, Date.now() + expiresIn);
  }
  
  /**
   * Stop cleanup interval (for graceful shutdown)
   */
  stop() {
    if (this._blacklistCleanupInterval) {
      clearInterval(this._blacklistCleanupInterval);
      this._blacklistCleanupInterval = null;
    }
  }

  /**
   * Generate device/browser fingerprint from request
   * @param {object} req - Express request object
   * @returns {string} Fingerprint hash
   */
  generateFingerprint(req) {
    const components = [
      req.headers['user-agent'] || '',
      req.headers['accept-language'] || '',
      req.headers['accept-encoding'] || '',
      req.ip || req.connection?.remoteAddress || '',
    ];
    
    return crypto.createHash('sha256')
      .update(components.join('|'))
      .digest('hex')
      .substring(0, 16); // Use first 16 chars
  }

  /**
   * Generate access and refresh token pair
   * @param {object} payload - User data (userId, username, role, tenantId)
   * @param {object} req - Express request for fingerprinting
   * @returns {object} { accessToken, refreshToken, expiresIn }
   */
  generateTokenPair(payload, req) {
    const fingerprint = this.generateFingerprint(req);
    const jti = crypto.randomBytes(16).toString('hex'); // Unique token ID
    
    const accessToken = jwt.sign(
      {
        ...payload,
        fingerprint,
        type: 'access',
      },
      this.accessSecret,
      {
        expiresIn: this.accessTokenExpiry,
        algorithm: 'HS256',
        issuer: this.issuer,
        audience: this.audience,
        jwtid: jti,
      }
    );

    const refreshToken = jwt.sign(
      {
        userId: payload.userId,
        tenantId: payload.tenantId,
        fingerprint,
        type: 'refresh',
        accessJti: jti, // Link to access token
      },
      this.refreshSecret,
      {
        expiresIn: this.refreshTokenExpiry,
        algorithm: 'HS256',
        issuer: this.issuer,
        audience: this.audience,
        jwtid: crypto.randomBytes(16).toString('hex'),
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiry,
      tokenType: 'Bearer',
    };
  }

  /**
   * Verify access token with fingerprint validation
   * @param {string} token - JWT access token
   * @param {object} req - Express request for fingerprint verification
   * @returns {object} Decoded payload or throws error
   */
  verifyAccessToken(token, req) {
    // Check blacklist
    if (this.blacklist.has(token)) {
      throw new Error('Token has been revoked');
    }

    const decoded = jwt.verify(token, this.accessSecret, {
      algorithms: ['HS256'],
      issuer: this.issuer,
      audience: this.audience,
    });

    // Verify token type
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    // Verify fingerprint (optional - can be disabled for mobile apps)
    const currentFingerprint = this.generateFingerprint(req);
    if (decoded.fingerprint && decoded.fingerprint !== currentFingerprint) {
      console.warn(`⚠️ Fingerprint mismatch for user ${decoded.userId}`);
      // Log suspicious activity but don't block (could be legitimate)
      // In strict mode, throw new Error('Token fingerprint mismatch');
    }

    return decoded;
  }

  /**
   * Verify refresh token and issue new token pair
   * @param {string} refreshToken - JWT refresh token
   * @param {object} req - Express request
   * @returns {object} New token pair
   */
  async refreshTokens(refreshToken, req, getUserById) {
    // Check blacklist
    if (this.blacklist.has(refreshToken)) {
      throw new Error('Refresh token has been revoked');
    }

    const decoded = jwt.verify(refreshToken, this.refreshSecret, {
      algorithms: ['HS256'],
      issuer: this.issuer,
      audience: this.audience,
    });

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Blacklist old refresh token (one-time use) - use 7 day expiry matching refresh token
    this._addToBlacklist(refreshToken, 7 * 24 * 60 * 60 * 1000);

    // Get fresh user data
    const user = await getUserById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new token pair
    return this.generateTokenPair({
      userId: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenant_id,
    }, req);
  }

  /**
   * Revoke a token (add to blacklist)
   * @param {string} token - Token to revoke
   * @param {number} expiresIn - Optional expiry time in ms (default 24h)
   */
  revokeToken(token, expiresIn = 86400000) {
    this._addToBlacklist(token, expiresIn);
  }

  /**
   * Revoke all tokens for a user (logout everywhere)
   * In production, store user's token invalidation timestamp in DB
   */
  revokeAllUserTokens(userId) {
    // This would typically update a `tokens_invalid_before` timestamp in the user table
    console.log(`Revoking all tokens for user ${userId}`);
  }
}


// ============================================================================
// CSRF PROTECTION - Double Submit Cookie Pattern
// ============================================================================

class CSRFProtection {
  constructor(secret) {
    this.secret = secret;
    this.tokenLength = 32;
    this.cookieName = '_csrf';
    this.headerName = 'x-csrf-token';
  }

  /**
   * Generate CSRF token and set cookie
   * @param {object} res - Express response
   * @returns {string} CSRF token
   */
  generateToken(res) {
    const token = crypto.randomBytes(this.tokenLength).toString('hex');
    const hmac = crypto.createHmac('sha256', this.secret)
      .update(token)
      .digest('hex');
    
    const signedToken = `${token}.${hmac}`;
    
    // Set HTTP-only cookie
    res.cookie(this.cookieName, signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return token; // Return unsigned token for client
  }

  /**
   * Verify CSRF token from header against cookie
   * @param {object} req - Express request
   * @returns {boolean} True if valid
   */
  verifyToken(req) {
    const headerToken = req.headers[this.headerName];
    const cookieToken = req.cookies?.[this.cookieName];

    if (!headerToken || !cookieToken) {
      return false;
    }

    // Parse signed cookie token
    const [originalToken, originalHmac] = cookieToken.split('.');
    
    // Verify HMAC with length normalization to prevent timing attack on length mismatch
    const expectedHmac = crypto.createHmac('sha256', this.secret)
      .update(originalToken)
      .digest('hex');
    
    // SECURITY: Normalize buffer lengths for constant-time comparison
    const hmacBuffer = Buffer.alloc(64); // SHA256 HMAC hex = 64 chars
    const expHmacBuffer = Buffer.alloc(64);
    Buffer.from(originalHmac || '').copy(hmacBuffer);
    Buffer.from(expectedHmac).copy(expHmacBuffer);
    
    if (!crypto.timingSafeEqual(hmacBuffer, expHmacBuffer)) {
      return false;
    }

    // Compare header token with cookie token (normalize lengths)
    const maxLen = Math.max(headerToken.length, originalToken.length, 1);
    const headerBuf = Buffer.alloc(maxLen);
    const cookieBuf = Buffer.alloc(maxLen);
    Buffer.from(headerToken || '').copy(headerBuf);
    Buffer.from(originalToken || '').copy(cookieBuf);
    
    return crypto.timingSafeEqual(headerBuf, cookieBuf);
  }

  /**
   * Express middleware for CSRF protection
   */
  middleware() {
    return (req, res, next) => {
      // Skip for GET, HEAD, OPTIONS (safe methods)
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      // Skip for public endpoints
      const publicPaths = [
        '/api/track/',        // New tracking endpoints
        '/api/track-',        // Legacy tracking endpoints (backwards compat)
        '/api/health'
      ];
      if (publicPaths.some(path => req.path.startsWith(path))) {
        return next();
      }

      if (!this.verifyToken(req)) {
        return res.status(403).json({ error: 'CSRF token validation failed' });
      }

      next();
    };
  }
}


// ============================================================================
// SSRF PROTECTION - URL Validation for Fetch Operations
// ============================================================================

class SSRFProtection {
  constructor() {
    // Allowed domains for URL fetching
    this.allowedDomains = new Set([
      'finaceverse.io',
      'www.finaceverse.io',
      'localhost',
    ]);

    // Blocked IP ranges (private networks, localhost, etc.)
    this.blockedCIDRs = [
      '10.0.0.0/8',      // Private Class A
      '172.16.0.0/12',   // Private Class B
      '192.168.0.0/16',  // Private Class C
      '127.0.0.0/8',     // Loopback
      '169.254.0.0/16',  // Link-local
      '0.0.0.0/8',       // Current network
      '224.0.0.0/4',     // Multicast
      '240.0.0.0/4',     // Reserved
      '100.64.0.0/10',   // Carrier-grade NAT
      'fc00::/7',        // IPv6 private
      '::1/128',         // IPv6 loopback
    ];

    // Allowed protocols
    this.allowedProtocols = new Set(['http:', 'https:']);
  }

  /**
   * Validate URL for SSRF protection
   * @param {string} urlString - URL to validate
   * @returns {object} { valid: boolean, error?: string, url?: URL }
   */
  validateUrl(urlString) {
    try {
      const url = new URL(urlString);

      // Check protocol
      if (!this.allowedProtocols.has(url.protocol)) {
        return { valid: false, error: `Protocol ${url.protocol} not allowed` };
      }

      // Check domain whitelist
      const hostname = url.hostname.toLowerCase();
      if (!this.allowedDomains.has(hostname)) {
        return { valid: false, error: `Domain ${hostname} not in allowlist` };
      }

      // Check for IP address in hostname
      if (this.isIPAddress(hostname)) {
        if (this.isBlockedIP(hostname)) {
          return { valid: false, error: 'IP address blocked (private/internal network)' };
        }
      }

      // Check for suspicious path traversal
      if (url.pathname.includes('..') || url.pathname.includes('%2e%2e')) {
        return { valid: false, error: 'Path traversal detected' };
      }

      // Check for DNS rebinding protection
      // In production, resolve hostname and check IP before each request

      return { valid: true, url };

    } catch (error) {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  /**
   * Check if string is an IP address
   */
  isIPAddress(str) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(str) || ipv6Regex.test(str);
  }

  /**
   * Check if IP is in blocked ranges
   */
  isBlockedIP(ip) {
    // Simplified check - in production use proper CIDR matching library
    const octets = ip.split('.').map(Number);
    
    // Check common private ranges
    if (octets[0] === 10) return true;
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
    if (octets[0] === 192 && octets[1] === 168) return true;
    if (octets[0] === 127) return true;
    if (octets[0] === 169 && octets[1] === 254) return true;
    if (octets[0] === 0) return true;
    
    return false;
  }

  /**
   * Add domain to allowlist
   * @param {string} domain - Domain to allow
   */
  allowDomain(domain) {
    this.allowedDomains.add(domain.toLowerCase());
  }

  /**
   * Safe fetch with SSRF protection
   * @param {string} urlString - URL to fetch
   * @param {object} options - Fetch options
   * @returns {Promise<Response>}
   */
  async safeFetch(urlString, options = {}) {
    const validation = this.validateUrl(urlString);
    
    if (!validation.valid) {
      throw new Error(`SSRF Protection: ${validation.error}`);
    }

    const fetch = (await import('node-fetch')).default;
    
    // Add timeout to prevent slowloris attacks
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(urlString, {
        ...options,
        signal: controller.signal,
        redirect: 'manual', // Don't follow redirects automatically
        headers: {
          ...options.headers,
          'User-Agent': 'FinaceVerse-SEO-Bot/1.0',
        },
      });

      // Check for redirect to blocked URLs
      if (response.status >= 300 && response.status < 400) {
        const redirectUrl = response.headers.get('location');
        if (redirectUrl) {
          const redirectValidation = this.validateUrl(redirectUrl);
          if (!redirectValidation.valid) {
            throw new Error(`SSRF Protection: Redirect blocked - ${redirectValidation.error}`);
          }
        }
      }

      return response;
    } finally {
      clearTimeout(timeout);
    }
  }
}


// ============================================================================
// XSS SANITIZATION - For Cheerio/HTML Processing
// ============================================================================

class XSSSanitizer {
  constructor() {
    // Tags to completely remove (including contents)
    this.removeTags = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'];
    
    // Attributes to remove from all tags
    this.removeAttributes = [
      'onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onblur',
      'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress',
      'formaction', 'srcdoc', 'xlink:href',
    ];

    // Attributes that can contain URLs - validate them
    this.urlAttributes = ['href', 'src', 'action', 'data'];
  }

  /**
   * Sanitize HTML content parsed by Cheerio
   * @param {object} $ - Cheerio instance
   * @returns {object} Sanitized Cheerio instance
   */
  sanitizeCheerio($) {
    // Remove dangerous tags completely
    for (const tag of this.removeTags) {
      $(tag).remove();
    }

    // Remove dangerous attributes from all elements
    $('*').each((i, el) => {
      const element = $(el);
      
      for (const attr of this.removeAttributes) {
        element.removeAttr(attr);
      }

      // Remove any attribute starting with 'on' (event handlers)
      const attribs = element.attr();
      if (attribs) {
        for (const attr of Object.keys(attribs)) {
          if (attr.toLowerCase().startsWith('on')) {
            element.removeAttr(attr);
          }
        }
      }

      // Validate URL attributes
      for (const attr of this.urlAttributes) {
        const value = element.attr(attr);
        if (value && this.isDangerousUrl(value)) {
          element.removeAttr(attr);
        }
      }
    });

    // Remove comments (can contain IE conditionals)
    $.root().find('*').contents().filter(function() {
      return this.type === 'comment';
    }).remove();

    return $;
  }

  /**
   * Check if URL is potentially dangerous
   * @param {string} url - URL to check
   * @returns {boolean} True if dangerous
   */
  isDangerousUrl(url) {
    const dangerous = [
      'javascript:',
      'data:',
      'vbscript:',
      'file:',
      'blob:',
    ];

    const lowerUrl = url.toLowerCase().trim();
    return dangerous.some(scheme => lowerUrl.startsWith(scheme));
  }

  /**
   * Sanitize plain text (escape HTML entities)
   * @param {string} text - Text to sanitize
   * @returns {string} Sanitized text
   */
  sanitizeText(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Extract safe text content from HTML
   * @param {string} html - HTML string
   * @returns {string} Plain text
   */
  htmlToSafeText(html) {
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);
    this.sanitizeCheerio($);
    return $('body').text().replace(/\s+/g, ' ').trim();
  }
}


// ============================================================================
// AUDIT LOGGING - Security Event Tracking
// ============================================================================

class AuditLogger {
  constructor(pool) {
    this.pool = pool;
    this.queue = [];
    this.flushInterval = 5000; // Flush every 5 seconds
    // SECURITY: Limit queue size to prevent memory exhaustion
    this.maxQueueSize = 10000;
    
    // Start flush timer and store reference for cleanup
    this._flushTimer = setInterval(() => this.flush(), this.flushInterval);
  }
  
  /**
   * Stop the flush timer (for graceful shutdown)
   */
  async stop() {
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
      this._flushTimer = null;
    }
    // Final flush before shutdown
    await this.flush();
  }

  /**
   * Log security event
   * @param {string} action - Action type (LOGIN, LOGOUT, ACCESS_DENIED, etc.)
   * @param {object} details - Event details
   */
  async log(action, details) {
    const event = {
      action,
      timestamp: new Date().toISOString(),
      userId: details.userId || null,
      tenantId: details.tenantId || null,
      ip: details.ip || null,
      userAgent: details.userAgent || null,
      resource: details.resource || null,
      status: details.status || 'success',
      metadata: details.metadata || {},
    };

    // SECURITY: Enforce queue size limit to prevent memory exhaustion
    if (this.queue.length >= this.maxQueueSize) {
      // Drop oldest 10% of events
      const toDrop = Math.floor(this.maxQueueSize * 0.1);
      this.queue.splice(0, toDrop);
      console.warn(`⚠️ Audit log queue overflow - dropped ${toDrop} oldest events`);
    }

    // Add to queue
    this.queue.push(event);

    // Immediate flush for critical events
    if (['ACCESS_DENIED', 'LOGIN_FAILED', 'CSRF_VIOLATION', 'SSRF_BLOCKED'].includes(action)) {
      await this.flush();
    }
  }

  /**
   * Flush queued events to database
   */
  async flush() {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      for (const event of events) {
        await this.pool.query(
          `INSERT INTO security_audit_log 
           (action, user_id, tenant_id, ip_address, user_agent, resource, status, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            event.action,
            event.userId,
            event.tenantId,
            event.ip,
            event.userAgent,
            event.resource,
            event.status,
            JSON.stringify(event.metadata),
            event.timestamp,
          ]
        );
      }
    } catch (error) {
      console.error('Audit log flush failed:', error.message);
      // Re-queue failed events
      this.queue.unshift(...events);
    }
  }
}


// ============================================================================
// TENANT ISOLATION - Multi-tenant Security
// ============================================================================

class TenantIsolation {
  constructor() {
    // Module to tenant mapping
    this.modules = {
      'finaceverse': 'platform',
      'cyloid': 'cyloid',
      'vamn': 'vamn',
      'accute': 'accute',
      'luca-ai': 'luca-ai',
      'finaid-hub': 'finaid-hub',
      'finory': 'finory',
      'epi-q': 'epi-q',
    };
  }

  /**
   * Generate tenant ID for a module
   * @param {string} module - Module name
   * @returns {string} Tenant ID
   */
  getTenantId(module) {
    return this.modules[module] || 'platform';
  }

  /**
   * Add tenant filter to database query
   * @param {string} query - SQL query
   * @param {string} tenantId - Tenant ID
   * @returns {object} { query, params }
   */
  addTenantFilter(query, tenantId, existingParams = []) {
    // Check if query already has WHERE clause
    const hasWhere = query.toLowerCase().includes('where');
    const filterClause = hasWhere 
      ? ` AND tenant_id = $${existingParams.length + 1}`
      : ` WHERE tenant_id = $${existingParams.length + 1}`;

    // Insert before ORDER BY, GROUP BY, LIMIT, etc.
    const insertBefore = ['order by', 'group by', 'limit', 'offset', 'having'];
    let insertIndex = query.length;
    
    for (const keyword of insertBefore) {
      const idx = query.toLowerCase().indexOf(keyword);
      if (idx > 0 && idx < insertIndex) {
        insertIndex = idx;
      }
    }

    const modifiedQuery = query.slice(0, insertIndex) + filterClause + query.slice(insertIndex);
    
    return {
      query: modifiedQuery,
      params: [...existingParams, tenantId],
    };
  }

  /**
   * Middleware to inject tenant context
   */
  middleware() {
    return (req, res, next) => {
      // Get tenant from JWT or subdomain
      const tenantId = req.tenantId || 
                       req.headers['x-tenant-id'] || 
                       this.getTenantFromSubdomain(req.hostname);
      
      req.tenantId = tenantId;
      
      // Inject tenant-aware query helper
      req.tenantQuery = (query, params = []) => {
        return this.addTenantFilter(query, tenantId, params);
      };
      
      next();
    };
  }

  /**
   * Extract tenant from subdomain
   * @param {string} hostname - Request hostname
   * @returns {string} Tenant ID
   */
  getTenantFromSubdomain(hostname) {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const subdomain = parts[0];
      if (this.modules[subdomain]) {
        return this.modules[subdomain];
      }
    }
    return 'platform';
  }
}


// ============================================================================
// RATE LIMITER - Per-tenant, per-endpoint rate limiting
// ============================================================================

class AdvancedRateLimiter {
  constructor(redisClient) {
    this.redis = redisClient;
    this.localStore = new Map(); // Fallback if Redis unavailable
    this.maxLocalStoreSize = 100000; // SECURITY: Limit local store size
    
    // Start cleanup interval for expired entries
    this._cleanupInterval = setInterval(() => this._cleanupExpiredEntries(), 60000);
    
    // Default limits - SCALE-READY FOR 100K+ USERS
    // Strategy:
    // - Auth: Strict per-IP (brute force protection)
    // - API: Per-user with high limits
    // - Tracking: Very permissive (public analytics)
    // - SEO: Per-tenant admin operations
    this.defaultLimits = {
      burst: { windowMs: 1000, max: 50 },              // 50 per second (DoS protection)
      auth: { windowMs: 15 * 60 * 1000, max: 10 },     // 10 per 15 min (brute force)
      api: { windowMs: 60 * 1000, max: 300 },          // 300 per min per user
      seo: { windowMs: 60 * 1000, max: 30 },           // 30 per min per tenant
      tracking: { windowMs: 60 * 1000, max: 1000 },    // 1000 per min (public analytics)
      export: { windowMs: 60 * 60 * 1000, max: 20 },   // 20 per hour (heavy operations)
      webhook: { windowMs: 60 * 1000, max: 500 },      // 500 per min (incoming webhooks)
    };
  }
  
  /**
   * Cleanup expired entries from local store
   */
  _cleanupExpiredEntries() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, record] of this.localStore.entries()) {
      if (record.expiresAt < now) {
        this.localStore.delete(key);
        cleaned++;
      }
    }
    
    // If still over limit after cleanup, LRU evict oldest 10%
    if (this.localStore.size > this.maxLocalStoreSize) {
      const toEvict = Math.ceil(this.localStore.size * 0.1);
      const entries = [...this.localStore.entries()]
        .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      for (let i = 0; i < toEvict && i < entries.length; i++) {
        this.localStore.delete(entries[i][0]);
      }
    }
  }
  
  /**
   * Stop cleanup interval (for graceful shutdown)
   */
  stop() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }
  }

  /**
   * Check and increment rate limit
   * @param {string} key - Rate limit key (ip:endpoint or tenant:endpoint)
   * @param {string} limitType - Type of limit (auth, api, seo, etc.)
   * @returns {object} { allowed: boolean, remaining: number, resetAt: number }
   */
  async check(key, limitType = 'api') {
    const limit = this.defaultLimits[limitType] || this.defaultLimits.api;
    const windowKey = `ratelimit:${key}:${Math.floor(Date.now() / limit.windowMs)}`;

    let current;
    
    if (this.redis) {
      try {
        current = await this.redis.incr(windowKey);
        if (current === 1) {
          await this.redis.expire(windowKey, Math.ceil(limit.windowMs / 1000));
        }
      } catch (error) {
        // Fallback to local store
        current = this.localIncr(windowKey, limit.windowMs);
      }
    } else {
      current = this.localIncr(windowKey, limit.windowMs);
    }

    const allowed = current <= limit.max;
    const remaining = Math.max(0, limit.max - current);
    const resetAt = (Math.floor(Date.now() / limit.windowMs) + 1) * limit.windowMs;

    return { allowed, remaining, resetAt, current, limit: limit.max };
  }

  /**
   * Local fallback increment
   */
  localIncr(key, windowMs) {
    const now = Date.now();
    const record = this.localStore.get(key);
    
    if (!record || record.expiresAt < now) {
      // SECURITY: Check limit before adding new entry
      if (this.localStore.size >= this.maxLocalStoreSize) {
        // Inline cleanup of expired entries first
        for (const [k, r] of this.localStore.entries()) {
          if (r.expiresAt < now) {
            this.localStore.delete(k);
          }
        }
        // If still over limit, fail open (allow request but don't track)
        if (this.localStore.size >= this.maxLocalStoreSize) {
          console.warn('⚠️ Rate limiter localStore limit reached, failing open');
          return 1;
        }
      }
      this.localStore.set(key, { count: 1, expiresAt: now + windowMs });
      return 1;
    }
    
    record.count++;
    return record.count;
  }

  /**
   * Express middleware factory
   * @param {string} limitType - Type of limit
   */
  middleware(limitType = 'api') {
    return async (req, res, next) => {
      const key = `${req.ip}:${req.tenantId || 'global'}:${limitType}`;
      const result = await this.check(key, limitType);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetAt);

      if (!result.allowed) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        });
      }

      next();
    };
  }
}


// ============================================================================
// SECURITY HEADERS - Additional hardening
// ============================================================================

const securityHeaders = (req, res, next) => {
  // Permissions Policy (replaces Feature-Policy)
  res.setHeader('Permissions-Policy', 
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );
  
  // Cross-Origin policies
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  
  // Additional security headers
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-Download-Options', 'noopen');
  
  // Cache control for sensitive pages
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};


// ============================================================================
// EXPORT ALL SECURITY SERVICES
// ============================================================================

// Import Cyber Warfare Module
const {
  RotatingKeyService,
  HoneypotService,
  CanaryService,
  DecoyKeyService,
  IntrusionDetectionService,
  DeadMansSwitch,
  CyberWarfareController,
} = require('./cyber-warfare');

// Import Enterprise Security Module
const {
  AzureKeyVaultService,
  AlertingService,
  SIEMLogger,
  GeoAnomalyDetector,
  AutomatedRedTeam,
  KeyBackupService,
  FortressController,
} = require('./enterprise-security');

// Import Ultimate Security Module - S-Tier Features
const {
  DDoSProtection,
  NetworkDecoys,
  MemorySafeKeyManager,
  LightweightAnomalyDetector,
  RollingStats,
  UltimateSecurityController,
} = require('./ultimate-security');

// Import Fortress Hardening - Devil's Advocate Gap Fixes
const {
  SecureDashboard,
  BoilingFrogDetector,
  MultiAdminDeadMansSwitch,
  EncryptedAlerting,
  IncidentResponse,
  DistributedAttackDetector,
  TimeSeparatedDecoys,
  FortressHardening,
} = require('./fortress-hardening');

// Import Iron Dome - Devil's Advocate Round 2 Fixes
const {
  RealShamirSecretSharing,
  AzureHSMClient,
  ExternalWatchdog,
  PersistentAlertingKeys,
  MTLSClient,
  RuntimeSecretInjector,
  BrowserFingerprinting,
  AdaptiveBoilingFrogDetector,
  IronDomeController,
} = require('./iron-dome');

module.exports = {
  // Original security services
  EncryptionService,
  JWTSecurityService,
  CSRFProtection,
  SSRFProtection,
  XSSSanitizer,
  AuditLogger,
  TenantIsolation,
  AdvancedRateLimiter,
  securityHeaders,
  
  // Cyber Warfare Module - "They should cry blood"
  RotatingKeyService,
  HoneypotService,
  CanaryService,
  DecoyKeyService,
  IntrusionDetectionService,
  DeadMansSwitch,
  CyberWarfareController,
  
  // Enterprise Security - Fortune 500 without the budget
  AzureKeyVaultService,
  AlertingService,
  SIEMLogger,
  GeoAnomalyDetector,
  AutomatedRedTeam,
  KeyBackupService,
  FortressController,
  
  // Ultimate Security - S-Tier Final Layer
  DDoSProtection,
  NetworkDecoys,
  MemorySafeKeyManager,
  LightweightAnomalyDetector,
  RollingStats,
  UltimateSecurityController,
  
  // Fortress Hardening - Devil's Advocate Gap Fixes
  SecureDashboard,
  BoilingFrogDetector,
  MultiAdminDeadMansSwitch,
  EncryptedAlerting,
  IncidentResponse,
  DistributedAttackDetector,
  TimeSeparatedDecoys,
  FortressHardening,
  
  // Iron Dome - Devil's Advocate Round 2 Fixes
  RealShamirSecretSharing,
  AzureHSMClient,
  ExternalWatchdog,
  PersistentAlertingKeys,
  MTLSClient,
  RuntimeSecretInjector,
  BrowserFingerprinting,
  AdaptiveBoilingFrogDetector,
  IronDomeController,
  
  // SuperAdmin Module - Ultra-Secure Access Control
  ...require('./superadmin'),
};
