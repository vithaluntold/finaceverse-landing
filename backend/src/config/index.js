/**
 * Configuration Module
 * Centralized configuration for database, redis, and environment variables
 */

require('dotenv').config();

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(
  varName => !process.env[varName] || process.env[varName] === 'your-secret-key-change-in-production'
);

if (missingEnvVars.length > 0 && process.env.NODE_ENV === 'production') {
  console.error(`❌ SECURITY ERROR: Missing or insecure environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// ============================================================================
// CONFIGURATION OBJECT
// ============================================================================

const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  
  // Security
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!',
  },
  
  csrf: {
    secret: process.env.CSRF_SECRET || 'csrf-secret-key-change-in-prod!',
  },
  
  admin: {
    secretKey: process.env.ADMIN_SECRET_KEY,
  },
  
  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/finaceverse_analytics',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    poolSize: parseInt(process.env.DB_POOL_SIZE, 10) || 20,
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  // CORS
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : ['http://localhost:3000', 'https://www.finaceverse.io', 'https://finaceverse.io'],
  },
  
  // Google APIs
  google: {
    apiKey: process.env.GOOGLE_API_KEY || '',
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || '',
  },
  
  // Rate Limiting
  rateLimit: {
    burst: { windowMs: 1000, max: 50 },
    auth: { windowMs: 15 * 60 * 1000, max: 10 },
    api: { windowMs: 60 * 1000, max: 300 },
    seo: { windowMs: 60 * 1000, max: 30 },
    tracking: { windowMs: 60 * 1000, max: 1000 },
  },
  
  // Internal
  internal: {
    secret: process.env.INTERNAL_SECRET,
  },
};

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.database.ssl,
  max: config.database.poolSize,
});

// Test connection on load
pool.query('SELECT NOW()')
  .then(() => console.log('✓ PostgreSQL connection pool ready'))
  .catch(err => console.error('❌ PostgreSQL connection error:', err.message));

// ============================================================================
// REDIS CONNECTION
// ============================================================================

const redis = require('redis');

let redisClient = null;

const initRedis = async () => {
  try {
    redisClient = redis.createClient({ url: config.redis.url });
    await redisClient.connect();
    console.log('✓ Redis connection ready');
    return redisClient;
  } catch (err) {
    console.warn('⚠️ Redis not available, running without cache:', err.message);
    return null;
  }
};

// ============================================================================
// CACHE WRAPPER UTILITY
// ============================================================================

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

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  config,
  pool,
  initRedis,
  getRedisClient: () => redisClient,
  cacheWrapper,
};
