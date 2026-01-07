/**
 * CYBER WARFARE MODULE
 * ====================
 * "They should cry blood." - The Client
 * 
 * Multi-layer defense system designed to:
 * 1. Limit blast radius of any breach
 * 2. Detect intrusions through tripwires
 * 3. Waste attacker's time with decoys
 * 4. Collect evidence for prosecution
 * 5. Make hackers question their life choices
 * 
 * @module cyber-warfare
 * @version 1.0.0
 * @codename MIDDLE_FINGER
 */

const crypto = require('crypto');

// ============================================================================
// LAYER 1: ROTATING KEY SERVICE
// Daily keys = 1/365th blast radius per compromised key
// ============================================================================

class RotatingKeyService {
  constructor(masterSecret, options = {}) {
    if (!masterSecret || masterSecret.length < 32) {
      throw new Error('Master secret must be at least 32 characters');
    }
    
    this.masterSecret = masterSecret;
    this.keyRotationPeriod = options.rotationPeriod || 'daily'; // daily, hourly, weekly
    this.keyCache = new Map(); // Cache derived keys: period -> { key, cachedAt }
    this.maxCacheSize = options.maxCacheSize || 90; // Keep 90 days of keys in memory
    this.cacheTTLMs = options.cacheTTLMs || 24 * 60 * 60 * 1000; // 24 hours TTL
    
    console.log('🔐 Rotating Key Service initialized (blast radius: 1 day)');
  }

  /**
   * Get the current time period identifier
   * @returns {string} Period ID (e.g., "2026-01-07" for daily)
   */
  getCurrentPeriod() {
    const now = new Date();
    
    switch (this.keyRotationPeriod) {
      case 'hourly':
        return `${now.toISOString().slice(0, 13)}`; // 2026-01-07T14
      case 'weekly':
        const week = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
        return `week-${week}`;
      case 'daily':
      default:
        return now.toISOString().slice(0, 10); // 2026-01-07
    }
  }

  /**
   * Derive a key for a specific time period
   * Uses HKDF-like derivation for cryptographic safety
   * @param {string} period - Time period identifier
   * @returns {Buffer} 32-byte derived key
   */
  deriveKeyForPeriod(period) {
    const now = Date.now();
    
    // Check cache first - verify not expired
    if (this.keyCache.has(period)) {
      const cached = this.keyCache.get(period);
      if (now - cached.cachedAt < this.cacheTTLMs) {
        return cached.key;
      }
      // Expired, remove it
      this.keyCache.delete(period);
    }

    // HKDF-expand: master + period + salt → unique key
    const salt = 'finaceverse-temporal-isolation-v1';
    const info = `dek:${period}:aes256gcm`;
    
    // Extract phase
    const prk = crypto.createHmac('sha512', salt)
      .update(this.masterSecret)
      .digest();
    
    // Expand phase
    const key = crypto.createHmac('sha512', prk)
      .update(info)
      .update(Buffer.from([1])) // Counter
      .digest()
      .slice(0, 32); // 256 bits

    // Cache the key with timestamp
    this.keyCache.set(period, { key, cachedAt: now });
    
    // Prune expired and oldest keys from cache
    if (this.keyCache.size > this.maxCacheSize) {
      // First, remove expired entries
      for (const [cachedPeriod, data] of this.keyCache) {
        if (now - data.cachedAt > this.cacheTTLMs) {
          this.keyCache.delete(cachedPeriod);
        }
      }
      // If still over limit, remove oldest
      while (this.keyCache.size > this.maxCacheSize) {
        const oldestKey = this.keyCache.keys().next().value;
        this.keyCache.delete(oldestKey);
      }
    }

    return key;
  }

  /**
   * Get current encryption key
   * @returns {{ key: Buffer, period: string, version: string }}
   */
  getCurrentKey() {
    const period = this.getCurrentPeriod();
    return {
      key: this.deriveKeyForPeriod(period),
      period,
      version: `v1:${period}`,
    };
  }

  /**
   * Get key for a specific version string
   * @param {string} version - Version string from encrypted data
   * @returns {Buffer} Derived key
   */
  getKeyForVersion(version) {
    const [, period] = version.split(':');
    if (!period) {
      throw new Error('Invalid key version format');
    }
    return this.deriveKeyForPeriod(period);
  }

  /**
   * Encrypt data with current rotating key
   * Format: version:iv:authTag:ciphertext
   * @param {string|object} data - Data to encrypt
   * @returns {string} Encrypted data with version prefix
   */
  encrypt(data) {
    const plaintext = typeof data === 'object' ? JSON.stringify(data) : String(data);
    const { key, version } = this.getCurrentKey();
    
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    // Format: version:iv:authTag:ciphertext
    return `${version}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  /**
   * Decrypt data using the correct rotating key
   * Automatically detects which period's key to use
   * @param {string} encryptedData - Encrypted data with version prefix
   * @returns {string|object} Decrypted data
   */
  decrypt(encryptedData) {
    const parts = encryptedData.split(':');
    if (parts.length !== 5) {
      throw new Error('Invalid encrypted data format (expected version:period:iv:authTag:ciphertext)');
    }

    const [v, period, ivBase64, authTagBase64, ciphertext] = parts;
    const version = `${v}:${period}`;
    const key = this.getKeyForVersion(version);
    
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  }

  /**
   * Check if data was encrypted with today's key
   * @param {string} encryptedData - Encrypted data
   * @returns {boolean}
   */
  isCurrentPeriod(encryptedData) {
    const [v, period] = encryptedData.split(':');
    return period === this.getCurrentPeriod();
  }

  /**
   * Get age of encrypted data in days
   * @param {string} encryptedData - Encrypted data
   * @returns {number} Age in days
   */
  getDataAge(encryptedData) {
    const [, period] = encryptedData.split(':');
    const encryptedDate = new Date(period);
    const now = new Date();
    return Math.floor((now - encryptedDate) / (24 * 60 * 60 * 1000));
  }
}


// ============================================================================
// LAYER 2: HONEYPOT SERVICE
// Fake credentials that trigger alerts when used
// ============================================================================

class HoneypotService {
  constructor(alertCallback, options = {}) {
    this.alertCallback = alertCallback || this.defaultAlert;
    this.maxTriggerLog = options.maxTriggerLog || 10000; // SECURITY: Limit trigger log size
    
    // Honeypot credentials - these look real but trigger alerts
    this.honeypots = new Map([
      // Fake admin accounts
      ['admin@finaceverse.io', { password: 'Admin123!@#', type: 'email' }],
      ['administrator', { password: 'Sup3rS3cur3!2024', type: 'username' }],
      ['root', { password: 'r00t@dm1n!', type: 'username' }],
      ['backup_admin', { password: 'B4ckup#2024', type: 'username' }],
      ['devops', { password: 'D3v0ps!Pr0d', type: 'username' }],
      
      // Fake API keys (if someone tries to use these)
      ['sk_live_51ABC123FAKE', { type: 'stripe_key' }],
      ['AKIA1234567890FAKE', { type: 'aws_key' }],
      
      // Fake service accounts
      ['sa_database_backup', { password: 'DbB4ckup!2024', type: 'service' }],
      ['jenkins_deploy', { password: 'J3nk1ns#Pr0d', type: 'service' }],
    ]);

    // Evidence collection
    this.triggerLog = [];
    
    console.log('🍯 Honeypot Service initialized (9 traps active)');
  }

  defaultAlert(event) {
    console.error('🚨🚨🚨 HONEYPOT TRIGGERED 🚨🚨🚨');
    console.error(JSON.stringify(event, null, 2));
  }

  /**
   * Check if credentials match a honeypot
   * @param {string} username - Username or email
   * @param {string} password - Password (optional for API keys)
   * @param {object} context - Request context for evidence
   * @returns {boolean} True if honeypot was triggered
   */
  check(username, password, context = {}) {
    const normalizedUsername = username?.toLowerCase().trim();
    
    // SECURITY: Constant-time lookup to prevent timing attacks
    // Always do a fake check even if honeypot doesn't exist
    let isHoneypot = false;
    let honeypot = null;
    
    // Always iterate to maintain constant time
    for (const [key, value] of this.honeypots) {
      if (key === normalizedUsername) {
        isHoneypot = true;
        honeypot = value;
      }
    }
    
    // Always do a password comparison to prevent timing leak
    const dummyPassword = 'dummy-comparison-value';
    const passwordToCheck = honeypot?.password || dummyPassword;
    const providedPassword = password || '';
    
    // Constant-time string comparison
    let passwordMatch = providedPassword.length === passwordToCheck.length;
    for (let i = 0; i < Math.max(providedPassword.length, passwordToCheck.length); i++) {
      if (providedPassword[i] !== passwordToCheck[i]) {
        passwordMatch = false;
      }
    }
    
    // For non-password honeypots (API keys), any match triggers
    if (!isHoneypot) {
      return false;
    }
    
    // For password-based honeypots, require password match
    if (honeypot.password && !passwordMatch) {
      return false; // Wrong password, might be legitimate typo
    }

    // HONEYPOT TRIGGERED - Collect evidence
    const evidence = {
      timestamp: new Date().toISOString(),
      type: 'HONEYPOT_TRIGGERED',
      honeypotType: honeypot.type,
      attemptedCredential: normalizedUsername,
      ip: context.ip || 'unknown',
      userAgent: context.userAgent || 'unknown',
      headers: context.headers || {},
      requestPath: context.path || 'unknown',
      requestBody: context.body ? this.sanitizeBody(context.body) : {},
      sessionId: context.sessionId || 'none',
      geoLocation: context.geo || 'unknown',
    };

    // Store evidence - SECURITY: Limit size to prevent memory exhaustion
    this.triggerLog.push(evidence);
    if (this.triggerLog.length > this.maxTriggerLog) {
      this.triggerLog = this.triggerLog.slice(-Math.floor(this.maxTriggerLog / 2));
    }

    // Fire alert
    this.alertCallback(evidence);

    return true;
  }

  /**
   * Sanitize request body for logging (remove sensitive data)
   */
  sanitizeBody(body) {
    const sanitized = { ...body };
    if (sanitized.password) sanitized.password = '[REDACTED]';
    if (sanitized.token) sanitized.token = '[REDACTED]';
    return sanitized;
  }

  /**
   * Get all trigger events for incident response
   * @returns {Array} All honeypot triggers
   */
  getTriggerLog() {
    return [...this.triggerLog];
  }

  /**
   * Middleware for Express - auto-check login attempts
   */
  middleware() {
    return (req, res, next) => {
      // Only check POST to auth endpoints
      if (req.method === 'POST' && req.path.includes('/auth/login')) {
        const { username, email, password } = req.body || {};
        const credential = username || email;

        if (this.check(credential, password, {
          ip: req.ip || req.headers['x-forwarded-for'],
          userAgent: req.headers['user-agent'],
          headers: req.headers,
          path: req.path,
          body: req.body,
        })) {
          // Return fake "success" to waste attacker's time
          // They think they're in, but we're watching
          return setTimeout(() => {
            res.status(401).json({ 
              error: 'Invalid credentials',
              // Add slight delay to simulate real auth
            });
          }, 2000 + Math.random() * 1000);
        }
      }

      next();
    };
  }
}


// ============================================================================
// LAYER 3: CANARY SERVICE
// Fake data that triggers alerts when accessed/decrypted
// ============================================================================

class CanaryService {
  constructor(alertCallback, options = {}) {
    this.alertCallback = alertCallback || this.defaultAlert;
    this.prefix = options.prefix || 'CANARY';
    
    // Canary identifiers - if these appear in logs/queries, we're compromised
    this.canaries = new Map([
      ['customer', {
        id: 'cust_CANARY_7742',
        name: 'John Wick Holdings LLC',
        email: 'j.wick@continental.fake',
        ssn: 'CANARY-7742-BREACH',
        balance: 4200069.00,
      }],
      ['transaction', {
        id: 'txn_CANARY_1337',
        amount: 1337420.69,
        description: 'CANARY TRANSACTION - IF YOU SEE THIS, BREACH DETECTED',
        account: 'CANARY-ACCT-0001',
      }],
      ['api_key', {
        key: 'fv_sk_canary_DO_NOT_USE_breach_detection_7742',
        name: 'Production API Key (Legacy)',
      }],
      ['config', {
        key: 'DATABASE_URL_BACKUP',
        value: 'postgresql://canary:tripwire@breach.detection:5432/fake',
      }],
    ]);

    this.triggerLog = [];
    
    console.log('🐦 Canary Service initialized (4 tripwires planted)');
  }

  defaultAlert(event) {
    console.error('🚨🚨🚨 CANARY TRIGGERED - BREACH DETECTED 🚨🚨🚨');
    console.error(JSON.stringify(event, null, 2));
  }

  /**
   * Get canary data to plant in database/config
   * @param {string} type - Type of canary (customer, transaction, api_key, config)
   * @returns {object} Fake data to plant
   */
  getCanaryData(type) {
    return this.canaries.get(type);
  }

  /**
   * Check if data contains canary markers
   * @param {string|object} data - Data to check
   * @param {object} context - Context for evidence
   * @returns {boolean} True if canary detected
   */
  check(data, context = {}) {
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
    
    // Check for any canary markers
    const canaryPatterns = [
      'CANARY',
      'canary',
      'John Wick Holdings',
      '4200069',
      '1337420',
      'breach.detection',
      'continental.fake',
      'CANARY-7742',
    ];

    for (const pattern of canaryPatterns) {
      if (dataStr.includes(pattern)) {
        const evidence = {
          timestamp: new Date().toISOString(),
          type: 'CANARY_TRIGGERED',
          pattern,
          dataSnippet: dataStr.substring(0, 200),
          context,
        };

        // SECURITY: Limit size to prevent memory exhaustion
        this.triggerLog.push(evidence);
        if (this.triggerLog.length > 10000) {
          this.triggerLog = this.triggerLog.slice(-5000);
        }
        this.alertCallback(evidence);
        return true;
      }
    }

    return false;
  }

  /**
   * SQL query interceptor - check for canary access
   * Wrap your pool.query with this
   */
  wrapQuery(pool) {
    const originalQuery = pool.query.bind(pool);
    
    return async (sql, params = []) => {
      const result = await originalQuery(sql, params);
      
      // Check if query returned canary data
      if (result.rows) {
        for (const row of result.rows) {
          if (this.check(row, { sql, params })) {
            // Canary was accessed - breach detected
            // Continue returning data to not alert attacker
          }
        }
      }
      
      return result;
    };
  }

  /**
   * Get all canary triggers
   */
  getTriggerLog() {
    return [...this.triggerLog];
  }

  /**
   * Generate SQL to plant canaries in database
   */
  getPlantingSQL() {
    return `
-- CANARY DATA - DO NOT DELETE
-- These records trigger breach detection when accessed

-- Canary Customer
INSERT INTO customers (id, name, email, ssn, balance, is_canary)
VALUES ('cust_CANARY_7742', 'John Wick Holdings LLC', 'j.wick@continental.fake', 'CANARY-7742-BREACH', 4200069.00, true)
ON CONFLICT (id) DO NOTHING;

-- Canary Transaction
INSERT INTO transactions (id, amount, description, account_id, is_canary)
VALUES ('txn_CANARY_1337', 1337420.69, 'CANARY TRANSACTION - IF YOU SEE THIS, BREACH DETECTED', 'CANARY-ACCT-0001', true)
ON CONFLICT (id) DO NOTHING;

-- Canary API Key
INSERT INTO api_keys (key, name, is_canary)
VALUES ('fv_sk_canary_DO_NOT_USE_breach_detection_7742', 'Production API Key (Legacy)', true)
ON CONFLICT (key) DO NOTHING;
    `;
  }
}


// ============================================================================
// LAYER 4: DECOY KEY SERVICE
// Fake keys that decrypt to garbage/trolling messages
// ============================================================================

class DecoyKeyService {
  constructor(options = {}) {
    this.maxUsageLog = options.maxUsageLog || 10000; // SECURITY: Limit usage log size
    
    // Decoy keys - look legitimate, decrypt to troll messages
    this.decoyKeys = new Map([
      ['default-encryption-key-32-chars!', 'DECOY_ENV_VAR'],
      ['super-secret-encryption-key-2024', 'DECOY_LEAKED'],
      ['production-aes-256-key-finace!!', 'DECOY_GITHUB'],
      ['finaceverse-master-key-prod-v1!', 'DECOY_BACKUP'],
    ]);

    // Messages to show when decoy is used
    this.trollMessages = [
      '🖕 Nice try. Your IP has been logged. Authorities notified.',
      '🎣 You fell for the bait. We are watching.',
      '💀 This key is fake. The real data is somewhere else.',
      '🚨 BREACH DETECTED. Evidence collected. Good luck.',
      '😂 Did you really think it would be this easy?',
      '🔒 Decoy activated. All your queries are being logged.',
    ];

    this.usageLog = [];
    
    console.log('🎭 Decoy Key Service initialized (4 fake keys planted)');
  }

  /**
   * Check if a key is a decoy
   * @param {string} key - Key to check
   * @returns {boolean}
   */
  isDecoy(key) {
    return this.decoyKeys.has(key);
  }

  /**
   * "Decrypt" with decoy key - returns troll message
   * @param {string} key - Decoy key
   * @param {string} data - "Encrypted" data
   * @param {object} context - Context for logging
   * @returns {string} Troll message
   */
  decrypt(key, data, context = {}) {
    if (!this.isDecoy(key)) {
      throw new Error('Not a decoy key');
    }

    const decoyType = this.decoyKeys.get(key);
    
    // Log the attempt
    const evidence = {
      timestamp: new Date().toISOString(),
      type: 'DECOY_KEY_USED',
      decoyType,
      keyUsed: key.substring(0, 10) + '...',
      dataLength: data?.length || 0,
      context,
    };
    // SECURITY: Limit size to prevent memory exhaustion
    this.usageLog.push(evidence);
    if (this.usageLog.length > this.maxUsageLog) {
      this.usageLog = this.usageLog.slice(-Math.floor(this.maxUsageLog / 2));
    }

    // Return random troll message
    return this.trollMessages[Math.floor(Math.random() * this.trollMessages.length)];
  }

  /**
   * Generate fake .env content with decoy keys
   * Plant this in obvious places (old backups, etc.)
   */
  generateFakeEnv() {
    return `# FinACEverse Production Configuration
# Last updated: ${new Date().toISOString()}
# WARNING: Do not commit this file

NODE_ENV=production
PORT=5000

# Database (PostgreSQL)
DATABASE_URL=postgresql://finaceverse_prod:${crypto.randomBytes(16).toString('hex')}@db.finaceverse.io:5432/finaceverse_production

# Security Keys
ENCRYPTION_KEY=super-secret-encryption-key-2024
JWT_SECRET=jwt-production-secret-key-2024!
CSRF_SECRET=csrf-super-secret-production!!

# API Keys
STRIPE_SECRET_KEY=sk_test_EXAMPLE_FAKE_KEY_REPLACE_ME
AWS_ACCESS_KEY_ID=AKIAEXAMPLE000FAKE00
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/EXAMPLE/FAKEKEY0000000

# Google APIs
GOOGLE_API_KEY=AIzaSy0000000000000000000FAKE
GOOGLE_CLIENT_SECRET=GOCSPX-FAKE00000000000000000

# Redis
REDIS_URL=redis://:${crypto.randomBytes(8).toString('hex')}@cache.finaceverse.io:6379

# Admin
ADMIN_EMAIL=admin@finaceverse.io
ADMIN_PASSWORD=Admin123!@#
`;
  }

  /**
   * Get usage log
   */
  getUsageLog() {
    return [...this.usageLog];
  }
}


// ============================================================================
// LAYER 5: INTRUSION DETECTION SERVICE
// Behavioral analysis to detect attackers
// ============================================================================

class IntrusionDetectionService {
  constructor(alertCallback, options = {}) {
    this.alertCallback = alertCallback || console.error;
    
    // Configuration
    this.config = {
      maxBodySizeForRegex: options.maxBodySizeForRegex || 10000, // Don't run regex on bodies > 10KB
      maxUrlLengthForRegex: options.maxUrlLengthForRegex || 2048,
      maxIncidentLog: options.maxIncidentLog || 10000, // SECURITY: Limit incident log size
      maxSuspiciousIPs: options.maxSuspiciousIPs || 50000, // SECURITY: Limit suspicious IPs set
    };
    
    // Suspicious patterns (all patterns are non-catastrophic backtracking safe)
    this.patterns = {
      // SQL injection attempts
      sqlInjection: /('|"|;|--|\bOR\b|\bAND\b|\bUNION\b|\bSELECT\b|\bDROP\b|\bDELETE\b)/i,
      
      // Path traversal
      pathTraversal: /(\.\.|\/etc\/|\/proc\/|\/var\/|\\\\)/i,
      
      // XSS attempts
      xss: /(<script|javascript:|on\w+\s*=)/i,
      
      // Command injection
      cmdInjection: /(\||;|`|\$\(|&&)/,
      
      // Suspicious user agents
      suspiciousAgents: /(sqlmap|nikto|nmap|masscan|burp|zap|hydra|medusa)/i,
    };

    // Rate tracking per IP
    this.requestCounts = new Map();
    this.suspiciousIPs = new Set();
    
    // Thresholds
    this.maxRequestsPerMinute = 100;
    this.maxFailedLoginsPerHour = 5;
    
    this.incidentLog = [];
    
    console.log('🔍 Intrusion Detection Service initialized');
  }

  /**
   * Analyze request for suspicious patterns
   * @param {object} req - Express request
   * @returns {{ isSuspicious: boolean, reasons: string[] }}
   */
  analyzeRequest(req) {
    const reasons = [];
    
    // SECURITY: Check URL length to prevent ReDoS
    if (req.url && req.url.length > this.config.maxUrlLengthForRegex) {
      reasons.push('URL_TOO_LONG');
    } else if (this.patterns.pathTraversal.test(req.url)) {
      reasons.push('PATH_TRAVERSAL_ATTEMPT');
    }

    // Check body - SECURITY: Skip regex on large bodies to prevent ReDoS
    const bodyStr = JSON.stringify(req.body || {});
    if (bodyStr.length > this.config.maxBodySizeForRegex) {
      reasons.push('BODY_TOO_LARGE_FOR_SCAN');
    } else {
      if (this.patterns.sqlInjection.test(bodyStr)) {
        reasons.push('SQL_INJECTION_ATTEMPT');
      }
      if (this.patterns.xss.test(bodyStr)) {
        reasons.push('XSS_ATTEMPT');
      }
      if (this.patterns.cmdInjection.test(bodyStr)) {
        reasons.push('COMMAND_INJECTION_ATTEMPT');
      }
    }

    // Check user agent
    const userAgent = req.headers['user-agent'] || '';
    if (this.patterns.suspiciousAgents.test(userAgent)) {
      reasons.push('SUSPICIOUS_USER_AGENT');
    }

    // Check rate
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    if (this.isRateLimitExceeded(ip)) {
      reasons.push('RATE_LIMIT_EXCEEDED');
    }

    // Check if already flagged
    if (this.suspiciousIPs.has(ip)) {
      reasons.push('PREVIOUSLY_FLAGGED_IP');
    }

    if (reasons.length > 0) {
      this.logIncident(req, reasons);
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Check rate limiting
   */
  isRateLimitExceeded(ip) {
    const now = Date.now();
    const key = `${ip}:${Math.floor(now / 60000)}`; // Per minute
    
    const count = (this.requestCounts.get(key) || 0) + 1;
    this.requestCounts.set(key, count);
    
    // Cleanup old entries
    if (this.requestCounts.size > 10000) {
      const cutoff = Math.floor(now / 60000) - 5;
      for (const [k] of this.requestCounts) {
        const [, minute] = k.split(':');
        if (parseInt(minute, 10) < cutoff) {
          this.requestCounts.delete(k);
        }
      }
    }
    
    if (count > this.maxRequestsPerMinute) {
      // SECURITY: Limit suspiciousIPs set size
      if (this.suspiciousIPs.size >= this.config.maxSuspiciousIPs) {
        // Remove a random entry (approximate LRU)
        const firstIP = this.suspiciousIPs.values().next().value;
        this.suspiciousIPs.delete(firstIP);
      }
      this.suspiciousIPs.add(ip);
      return true;
    }
    
    return false;
  }

  /**
   * Log security incident
   */
  logIncident(req, reasons) {
    const incident = {
      timestamp: new Date().toISOString(),
      type: 'INTRUSION_ATTEMPT',
      reasons,
      ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0],
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
      body: this.sanitize(req.body),
    };
    
    // SECURITY: Limit incident log size to prevent memory exhaustion
    this.incidentLog.push(incident);
    if (this.incidentLog.length > this.config.maxIncidentLog) {
      this.incidentLog = this.incidentLog.slice(-Math.floor(this.config.maxIncidentLog / 2));
    }
    this.alertCallback(incident);
  }

  /**
   * Sanitize data for logging
   */
  sanitize(obj) {
    if (!obj) return {};
    const sanitized = { ...obj };
    ['password', 'token', 'secret', 'key'].forEach(k => {
      if (sanitized[k]) sanitized[k] = '[REDACTED]';
    });
    return sanitized;
  }

  /**
   * Express middleware
   */
  middleware() {
    return (req, res, next) => {
      const analysis = this.analyzeRequest(req);
      
      if (analysis.isSuspicious) {
        // Add delay to slow down attackers
        const delay = analysis.reasons.length * 500;
        
        // Tag the request for logging
        req.suspiciousActivity = analysis;
        
        // Optionally block obvious attacks
        if (analysis.reasons.includes('SQL_INJECTION_ATTEMPT') ||
            analysis.reasons.includes('COMMAND_INJECTION_ATTEMPT')) {
          return setTimeout(() => {
            res.status(400).json({ error: 'Invalid request' });
          }, delay);
        }
      }
      
      next();
    };
  }

  /**
   * Get incident log
   */
  getIncidentLog() {
    return [...this.incidentLog];
  }
}


// ============================================================================
// LAYER 6: DEAD MAN'S SWITCH
// Auto-rotate keys if no admin activity detected
// ============================================================================

class DeadMansSwitch {
  constructor(options = {}) {
    this.heartbeatInterval = options.heartbeatInterval || 24 * 60 * 60 * 1000; // 24 hours
    this.maxMissedHeartbeats = options.maxMissedHeartbeats || 2; // 48 hours
    this.onTrigger = options.onTrigger || this.defaultTrigger;
    
    this.lastHeartbeat = Date.now();
    this.missedHeartbeats = 0;
    this.isTriggered = false;
    
    // Start monitoring
    this.monitorInterval = setInterval(() => this.checkHeartbeat(), this.heartbeatInterval);
    
    console.log('💀 Dead Man\'s Switch initialized (48h trigger)');
  }

  /**
   * Admin heartbeat - call this regularly from admin activity
   */
  heartbeat() {
    this.lastHeartbeat = Date.now();
    this.missedHeartbeats = 0;
    console.log('💓 Dead Man\'s Switch heartbeat received');
  }

  /**
   * Check if heartbeat was missed
   */
  checkHeartbeat() {
    const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
    
    if (timeSinceLastHeartbeat > this.heartbeatInterval) {
      this.missedHeartbeats++;
      console.warn(`⚠️ Dead Man's Switch: ${this.missedHeartbeats} missed heartbeat(s)`);
      
      if (this.missedHeartbeats >= this.maxMissedHeartbeats && !this.isTriggered) {
        this.trigger();
      }
    }
  }

  /**
   * Trigger the dead man's switch
   */
  trigger() {
    this.isTriggered = true;
    console.error('💀💀💀 DEAD MAN\'S SWITCH TRIGGERED 💀💀💀');
    this.onTrigger();
  }

  /**
   * Default trigger action
   */
  defaultTrigger() {
    console.error('Dead Man\'s Switch activated - implement key rotation');
    // In production:
    // 1. Rotate all encryption keys
    // 2. Invalidate all sessions
    // 3. Alert security team
    // 4. Enable enhanced logging
  }

  /**
   * Disarm the switch (admin confirmed safe)
   */
  disarm() {
    this.heartbeat();
    this.isTriggered = false;
    console.log('✅ Dead Man\'s Switch disarmed');
  }

  /**
   * Stop monitoring
   */
  stop() {
    clearInterval(this.monitorInterval);
  }
}


// ============================================================================
// UNIFIED CYBER WARFARE CONTROLLER
// Coordinates all defense layers
// ============================================================================

class CyberWarfareController {
  constructor(config = {}) {
    // Alert handler - in production, send to Slack/PagerDuty/etc.
    this.alertHandler = config.alertHandler || this.defaultAlertHandler;
    
    // SECURITY: Require explicit master secret in production
    let masterSecret = config.masterSecret || process.env.MASTER_SECRET;
    if (!masterSecret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('MASTER_SECRET is required in production - cannot use random key');
      }
      console.warn('⚠️ WARNING: Using random master secret - data will be unrecoverable after restart!');
      masterSecret = crypto.randomBytes(32).toString('hex');
    }
    
    // Initialize all layers
    this.rotatingKeys = new RotatingKeyService(
      masterSecret,
      { rotationPeriod: config.keyRotationPeriod || 'daily' }
    );
    
    this.honeypots = new HoneypotService(this.alertHandler);
    this.canaries = new CanaryService(this.alertHandler);
    this.decoys = new DecoyKeyService();
    this.ids = new IntrusionDetectionService(this.alertHandler);
    
    if (config.enableDeadMansSwitch !== false) {
      this.deadMansSwitch = new DeadMansSwitch({
        onTrigger: () => this.emergencyRotation(),
        ...config.deadMansSwitchOptions,
      });
    }

    // Statistics
    this.stats = {
      encryptionOperations: 0,
      decryptionOperations: 0,
      honeypotTriggers: 0,
      canaryTriggers: 0,
      intrusionAttempts: 0,
    };

    console.log('\n' + '='.repeat(60));
    console.log('  🔥 CYBER WARFARE SYSTEM ONLINE 🔥');
    console.log('  "They should cry blood."');
    console.log('='.repeat(60) + '\n');
  }

  defaultAlertHandler(event) {
    console.error('\n' + '🚨'.repeat(20));
    console.error('SECURITY ALERT:', event.type);
    console.error(JSON.stringify(event, null, 2));
    console.error('🚨'.repeat(20) + '\n');
    
    // TODO: In production, integrate with:
    // - Slack webhook
    // - PagerDuty
    // - Email alerts
    // - SMS alerts
    // - Security incident management system
  }

  /**
   * Encrypt data with rotating keys
   */
  encrypt(data) {
    this.stats.encryptionOperations++;
    return this.rotatingKeys.encrypt(data);
  }

  /**
   * Decrypt data (auto-detects which key to use)
   */
  decrypt(encryptedData) {
    this.stats.decryptionOperations++;
    
    // Check for canary markers after decryption
    const decrypted = this.rotatingKeys.decrypt(encryptedData);
    this.canaries.check(decrypted, { operation: 'decrypt' });
    
    return decrypted;
  }

  /**
   * Get Express middleware stack
   */
  getMiddleware() {
    return [
      this.ids.middleware(),
      this.honeypots.middleware(),
    ];
  }

  /**
   * Wrap database pool with canary detection
   */
  wrapDatabasePool(pool) {
    return {
      ...pool,
      query: this.canaries.wrapQuery(pool),
    };
  }

  /**
   * Admin heartbeat
   */
  adminHeartbeat() {
    if (this.deadMansSwitch) {
      this.deadMansSwitch.heartbeat();
    }
  }

  /**
   * Emergency key rotation (triggered by dead man's switch)
   */
  emergencyRotation() {
    console.error('🔄 EMERGENCY KEY ROTATION INITIATED');
    // In production:
    // 1. Generate new master secret
    // 2. Re-encrypt all data with new keys
    // 3. Invalidate all sessions
    // 4. Force password resets
  }

  /**
   * Get security incident report
   */
  getIncidentReport() {
    return {
      generatedAt: new Date().toISOString(),
      stats: this.stats,
      honeypotTriggers: this.honeypots.getTriggerLog(),
      canaryTriggers: this.canaries.getTriggerLog(),
      decoyKeyUsage: this.decoys.getUsageLog(),
      intrusionAttempts: this.ids.getIncidentLog(),
    };
  }

  /**
   * Plant canary data in database
   */
  getCanaryPlantingSQL() {
    return this.canaries.getPlantingSQL();
  }

  /**
   * Generate fake .env for decoy
   */
  generateDecoyEnv() {
    return this.decoys.generateFakeEnv();
  }
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  RotatingKeyService,
  HoneypotService,
  CanaryService,
  DecoyKeyService,
  IntrusionDetectionService,
  DeadMansSwitch,
  CyberWarfareController,
};
