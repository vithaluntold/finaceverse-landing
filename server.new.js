/**
 * FinACEverse Server
 * 
 * Enterprise-grade backend server with:
 * - Military-grade security (AES-256-GCM, JWT fingerprinting, CSRF, SSRF, XSS)
 * - Multi-tenant architecture
 * - Scale-ready for 100K+ users
 * - WebSocket support for real-time analytics
 * - Scheduled jobs (PageSpeed tests)
 * 
 * This is the new modular version that uses the composable app architecture.
 */

require('dotenv').config();
const http = require('http');
const { Pool } = require('pg');
const redis = require('redis');
const { Server } = require('socket.io');
const { createApp, config } = require('./backend/src/app');

// ============ ENVIRONMENT VALIDATION ============

const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => 
  !process.env[varName] || process.env[varName] === 'your-secret-key-change-in-production'
);

if (missingEnvVars.length > 0 && process.env.NODE_ENV === 'production') {
  console.error(`❌ SECURITY ERROR: Missing or insecure environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/finaceverse_analytics';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? 
  process.env.ALLOWED_ORIGINS.split(',') : 
  ['http://localhost:3000', 'https://www.finaceverse.io', 'https://finaceverse.io'];

// ============ DATABASE CONNECTION ============

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ============ REDIS CONNECTION ============

let redisClient = null;

async function initRedis() {
  try {
    redisClient = redis.createClient({ url: REDIS_URL });
    await redisClient.connect();
    console.log('✓ Connected to Redis');
    return redisClient;
  } catch (err) {
    console.warn('Redis not available, running without cache:', err.message);
    return null;
  }
}

// ============ DATABASE INITIALIZATION ============

async function initializeDatabase() {
  try {
    const client = await pool.connect();
    console.log('✓ Connected to PostgreSQL');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        tenant_id VARCHAR(255) DEFAULT 'platform',
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
    
    client.release();
    console.log('✓ Database tables created/verified');
    return true;
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    console.error('Server will start but database operations may fail');
    return false;
  }
}

// ============ SCHEDULED JOBS ============

function startScheduledJobs(runPageSpeedTest) {
  // Run PageSpeed test after startup
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
  }, 5000);
  
  // Schedule every 6 hours
  setInterval(async () => {
    console.log('🔍 Running scheduled PageSpeed test...');
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
        console.log('✓ Scheduled PageSpeed test completed');
      }
    } catch (error) {
      console.warn('Scheduled PageSpeed test failed:', error.message);
    }
  }, 6 * 60 * 60 * 1000);
}

// ============ WEBSOCKET SETUP ============

function setupWebSocket(server, cacheWrapper) {
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? 'https://www.finaceverse.io' 
        : ['http://localhost:3000', 'http://localhost:5000'],
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    
    socket.on('subscribe-analytics', async () => {
      console.log('📊 Client subscribed to analytics updates');
      
      try {
        const summary = await cacheWrapper('analytics:summary', 60, async () => {
          const result = await pool.query(`
            SELECT 
              COUNT(*) as total_visits
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

  // Global broadcast function
  global.broadcastAnalytics = (type, data) => {
    io.emit('analytics-update', { type, data });
  };

  return io;
}

// ============ MAIN STARTUP ============

async function startServer() {
  try {
    // Initialize Redis (optional)
    await initRedis();
    
    // Initialize database
    const dbInitialized = await initializeDatabase();
    if (!dbInitialized) {
      console.error('⚠️ Database initialization failed - check DATABASE_URL');
      console.error('DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'NOT SET');
    }
    
    // Create Express app with dependencies
    const { app, services } = createApp({ pool, redisClient });
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Setup WebSocket
    setupWebSocket(server, services.cacheWrapper);
    
    // Start scheduled jobs
    startScheduledJobs(services.runPageSpeedTest);
    
    // Start listening
    server.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════');
      console.log('  FinACEverse Backend Server');
      console.log('═══════════════════════════════════════════════════');
      console.log(`  🚀 Server running on port ${PORT}`);
      console.log(`  🔌 WebSocket server ready`);
      console.log(`  🔐 Security: Military-grade (AES-256-GCM, JWT, CSRF)`);
      console.log(`  📊 Analytics: Real-time tracking enabled`);
      console.log(`  🌍 SEO AI: ${services.keywordOptimizer ? 'Active' : 'Not available'}`);
      console.log(`  💾 Redis: ${redisClient ? 'Connected' : 'Not available'}`);
      console.log(`  📈 Scale: Ready for 100K+ users`);
      console.log('═══════════════════════════════════════════════════');
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Fatal error during startup:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch(err => {
  console.error('❌ Unhandled error in startServer:', err);
  process.exit(1);
});
