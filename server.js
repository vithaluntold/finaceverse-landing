require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finaceverse-analytics';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
let db;
MongoClient.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    db = client.db();
    console.log('✓ Connected to MongoDB');
  })
  .catch(err => console.error('MongoDB connection error:', err));

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
    if (!db) return;
    
    console.log('🔍 Running PageSpeed test...');
    const mobileResult = await runPageSpeedTest('https://finaceverse.io', 'mobile');
    const desktopResult = await runPageSpeedTest('https://finaceverse.io', 'desktop');
    
    if (mobileResult || desktopResult) {
      const pageSpeedCollection = db.collection('pagespeed_results');
      if (mobileResult) await pageSpeedCollection.insertOne(mobileResult);
      if (desktopResult) await pageSpeedCollection.insertOne(desktopResult);
      console.log('✓ PageSpeed test completed');
    }
  }, 5000); // Wait 5 seconds after startup
  
  // Schedule every 6 hours
  setInterval(async () => {
    if (!db) return;
    
    console.log('🔍 Running scheduled PageSpeed test...');
    const mobileResult = await runPageSpeedTest('https://finaceverse.io', 'mobile');
    const desktopResult = await runPageSpeedTest('https://finaceverse.io', 'desktop');
    
    if (mobileResult || desktopResult) {
      const pageSpeedCollection = db.collection('pagespeed_results');
      if (mobileResult) await pageSpeedCollection.insertOne(mobileResult);
      if (desktopResult) await pageSpeedCollection.insertOne(desktopResult);
      console.log('✓ Scheduled PageSpeed test completed');
    }
  }, 6 * 60 * 60 * 1000); // Every 6 hours
};

// MongoDB connection
let db;
MongoClient.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    db = client.db();
    console.log('✓ Connected to MongoDB');
    startScheduledJobs();
  })
  .catch(err => console.error('MongoDB connection error:', err));

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
    
    // Find user (in production, use database)
    const users = db.collection('users');
    const user = await users.findOne({ username });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, {
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
    
    const users = db.collection('users');
    const existingUser = await users.findOne({ username });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    await users.insertOne({
      username,
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
    });
    
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
    const metrics = db.collection('performance_metrics');
    await metrics.insertOne({
      ...req.body,
      ip: req.ip,
      receivedAt: new Date(),
    });
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
    
    const visits = db.collection('visits');
    await visits.insertOne({
      ...req.body,
      ip: ip.replace(/:\d+$/, ''), // Anonymize (remove port)
      country: geoData.country_name,
      countryCode: geoData.country_code,
      region: geoData.region,
      city: geoData.city,
      timezone: geoData.timezone,
      isp: geoData.org,
      latitude: geoData.latitude,
      longitude: geoData.longitude,
      timestamp: new Date(),
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Track visit error:', err);
    res.status(500).json({ error: 'Failed to track visit' });
  }
});

// Track events
app.post('/api/track-event', async (req, res) => {
  try {
    const events = db.collection('events');
    await events.insertOne({
      ...req.body,
      timestamp: new Date(),
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Track event error:', err);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Track errors
app.post('/api/track-error', async (req, res) => {
  try {
    const errors = db.collection('errors');
    await errors.insertOne({
      ...req.body,
      timestamp: new Date(),
    });
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
    const metrics = db.collection('performance_metrics');
    
    const query = {};
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    if (page) {
      query.page = page;
    }
    
    const data = await metrics.find(query).sort({ timestamp: -1 }).limit(1000).toArray();
    
    // Calculate averages
    const lcpValues = data.filter(m => m.name === 'LCP').map(m => m.value);
    const fcpValues = data.filter(m => m.name === 'FCP').map(m => m.value);
    const clsValues = data.filter(m => m.name === 'CLS').map(m => m.value);
    const ttfbValues = data.filter(m => m.name === 'TTFB').map(m => m.value);
    
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
    const visits = db.collection('visits');
    
    // Aggregate by country
    const byCountry = await visits.aggregate([
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]).toArray();
    
    // Aggregate by city
    const byCity = await visits.aggregate([
      { $group: { _id: { city: '$city', country: '$country' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]).toArray();
    
    // Get recent visits with coordinates
    const recentVisits = await visits.find({
      latitude: { $exists: true },
      longitude: { $exists: true },
    }).sort({ timestamp: -1 }).limit(100).toArray();
    
    res.json({
      byCountry,
      byCity,
      recentVisits,
      totalVisits: await visits.countDocuments(),
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
    const events = db.collection('events');
    
    const query = {};
    if (type) query.type = type;
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    
    const data = await events.find(query).sort({ timestamp: -1 }).limit(500).toArray();
    
    res.json({ data, count: data.length });
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Get errors
app.get('/api/analytics/errors', authMiddleware, async (req, res) => {
  try {
    const errors = db.collection('errors');
    const data = await errors.find({}).sort({ timestamp: -1 }).limit(100).toArray();
    
    res.json({ data, count: data.length });
  } catch (err) {
    console.error('Get errors error:', err);
    res.status(500).json({ error: 'Failed to get errors' });
  }
});

// Get dashboard summary
app.get('/api/analytics/summary', authMiddleware, async (req, res) => {
  try {
    const visits = db.collection('visits');
    const metrics = db.collection('performance_metrics');
    const events = db.collection('events');
    const errors = db.collection('errors');
    
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
      visits.countDocuments(),
      visits.countDocuments({ timestamp: { $gte: last24h } }),
      visits.countDocuments({ timestamp: { $gte: last7d } }),
      events.countDocuments(),
      errors.countDocuments({ timestamp: { $gte: last7d } }),
      visits.distinct('country'),
    ]);
    
    res.json({
      totalVisits,
      visits24h,
      visits7d,
      totalEvents,
      totalErrors,
      uniqueCountries: countries.length,
    });
  } catch (err) {
    console.error('Get summary error:', err);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

// Get PageSpeed Insights results
app.get('/api/analytics/pagespeed', authMiddleware, async (req, res) => {
  try {
    const pageSpeedCollection = db.collection('pagespeed_results');
    
    // Get latest results for mobile and desktop
    const latestMobile = await pageSpeedCollection.findOne(
      { strategy: 'mobile' },
      { sort: { timestamp: -1 } }
    );
    
    const latestDesktop = await pageSpeedCollection.findOne(
      { strategy: 'desktop' },
      { sort: { timestamp: -1 } }
    );
    
    // Get historical trend (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const history = await pageSpeedCollection.find({
      timestamp: { $gte: sevenDaysAgo }
    }).sort({ timestamp: 1 }).toArray();
    
    res.json({
      latest: {
        mobile: latestMobile,
        desktop: latestDesktop,
      },
      history,
    });
  } catch (err) {
    console.error('Get PageSpeed error:', err);
    res.status(500).json({ error: 'Failed to get PageSpeed data' });
  }
});

// AI-powered route prediction (simple implementation)
app.post('/api/predict-route', async (req, res) => {
  try {
    const { currentPath, history } = req.body;
    
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

app.listen(PORT, () => {
  console.log(`🚀 Analytics API running on port ${PORT}`);
});
