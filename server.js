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

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/finaceverse_analytics';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'build')));

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test database connection and create tables
pool.connect()
  .then(async (client) => {
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
    
    client.release();
    console.log('✓ Database tables created/verified');
    
    // Start scheduled jobs after DB connection
    startScheduledJobs();
  })
  .catch(err => console.error('PostgreSQL connection error:', err));

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
      throw new Error(`PageSpeed API error: ${response.statusText}`);
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
      console.log('✓ PageSpeed test completed');
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

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ============ AUTHENTICATION ROUTES ============

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await pool.query('SELECT * FROM users WHERE username = \$1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '24h',
    });
    
    res.json({ token, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Create initial admin user (run once)
app.post('/api/auth/create-admin', async (req, res) => {
  try {
    const { username, password, secretKey } = req.body;
    
    // Verify secret key
    if (secretKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ error: 'Invalid secret key' });
    }
    
    const existingUser = await pool.query('SELECT id FROM users WHERE username = \$1', [username]);
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, password, role) VALUES (\$1, \$2, \$3)',
      [username, hashedPassword, 'admin']
    );
    
    res.json({ message: 'Admin user created successfully' });
  } catch (err) {
    console.error('Create admin error:', err);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// ============ TRACKING ROUTES (Public) ============

// Track performance metrics
app.post('/api/track-performance', async (req, res) => {
  try {
    const { name, delta, value, id, page, timestamp, userAgent, connection } = req.body;
    
    await pool.query(
      'INSERT INTO performance_metrics (name, delta, value, metric_id, page, user_agent, connection, ip, timestamp) VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9)',
      [name, delta, value, id, page, userAgent, JSON.stringify(connection), req.ip, timestamp]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Track performance error:', err);
    res.status(500).json({ error: 'Failed to track performance' });
  }
});

// Track visit with geography
app.post('/api/track-visit', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
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

// ============ ANALYTICS ROUTES (Protected) ============

// Get performance metrics
app.get('/api/analytics/performance', authMiddleware, async (req, res) => {
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
app.get('/api/analytics/geography', authMiddleware, async (req, res) => {
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
app.get('/api/analytics/events', authMiddleware, async (req, res) => {
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
app.get('/api/analytics/errors', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM errors ORDER BY timestamp DESC LIMIT 100');
    
    res.json({ data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('Get errors error:', err);
    res.status(500).json({ error: 'Failed to get errors' });
  }
});

// Get dashboard summary
app.get('/api/analytics/summary', authMiddleware, async (req, res) => {
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
app.get('/api/analytics/pagespeed', authMiddleware, async (req, res) => {
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
app.post('/api/experiments', authMiddleware, async (req, res) => {
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
app.get('/api/experiments', authMiddleware, async (req, res) => {
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
app.get('/api/experiments/:id', authMiddleware, async (req, res) => {
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
app.post('/api/experiments/:id/end', authMiddleware, async (req, res) => {
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
app.get('/api/search-console/queries', authMiddleware, async (req, res) => {
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
app.get('/api/search-console/performance', authMiddleware, async (req, res) => {
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

// Catch-all route - serve React app for any non-API routes
app.get('*', (req, res) => {
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

server.listen(PORT, () => {
  console.log(`🚀 Analytics API running on port ${PORT}`);
  console.log(`🔌 WebSocket server ready`);
});
