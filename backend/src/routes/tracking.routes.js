/**
 * Tracking Routes Module
 * 
 * Public endpoints for analytics data collection:
 * - Performance metrics (Core Web Vitals)
 * - Page visits with geolocation
 * - Events tracking
 * - Error tracking
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// ============ VALIDATORS ============

const performanceValidator = [
  body('name')
    .trim()
    .isIn(['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB'])
    .withMessage('Invalid metric name'),
  body('value')
    .isFloat({ min: 0 })
    .withMessage('Value must be a positive number'),
  body('page')
    .trim()
    .isLength({ max: 500 })
    .withMessage('Page URL too long'),
];

const visitValidator = [
  body('page')
    .trim()
    .isLength({ max: 500 })
    .withMessage('Page URL too long'),
  body('referrer')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Referrer too long'),
];

// ============ UTILITY FUNCTIONS ============

const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || req.ip;
};

// ============ ROUTE FACTORY ============

/**
 * Creates tracking routes with injected dependencies
 * @param {Object} deps - Dependencies
 * @param {Object} deps.pool - PostgreSQL connection pool
 * @param {Object} deps.publicTrackingLimiter - Public tracking rate limiter
 * @param {Function} deps.handleValidationErrors - Validation error handler
 * @param {Function} deps.broadcastAnalytics - WebSocket broadcast function
 */
function createTrackingRoutes({ pool, publicTrackingLimiter, handleValidationErrors, broadcastAnalytics }) {

  // ============ TRACK PERFORMANCE ============
  router.post('/performance',
    publicTrackingLimiter,
    performanceValidator,
    handleValidationErrors,
    async (req, res) => {
      try {
        const { name, delta, value, id, page, timestamp, userAgent, connection } = req.body;
        const ip = getClientIP(req);
        
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

  // ============ TRACK VISIT ============
  router.post('/visit',
    publicTrackingLimiter,
    visitValidator,
    handleValidationErrors,
    async (req, res) => {
      try {
        const ip = getClientIP(req);
        
        // Get geo data from IP
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
            ip.replace(/:\d+\$/, ''), // Anonymize
            geoData.country_name, geoData.country_code, geoData.region,
            geoData.city, geoData.timezone, geoData.org,
            geoData.latitude, geoData.longitude
          ]
        );
        
        // Broadcast real-time update
        if (typeof broadcastAnalytics === 'function') {
          broadcastAnalytics('visit', {
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
    }
  );

  // ============ TRACK EVENT ============
  router.post('/event', publicTrackingLimiter, async (req, res) => {
    try {
      const { type, depth, page, timestamp } = req.body;
      
      await pool.query(
        'INSERT INTO events (type, depth, page, timestamp) VALUES ($1, $2, $3, $4)',
        [type, depth, page, timestamp]
      );
      
      res.json({ success: true });
    } catch (err) {
      console.error('Track event error:', err);
      res.status(500).json({ error: 'Failed to track event' });
    }
  });

  // ============ TRACK ERROR ============
  router.post('/error', publicTrackingLimiter, async (req, res) => {
    try {
      const { message, source, line, column, stack, page, userAgent, type, timestamp } = req.body;
      
      await pool.query(
        'INSERT INTO errors (message, source, line, "column", stack, page, user_agent, type, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [message, source, line, column, stack, page, userAgent, type, timestamp]
      );
      
      res.json({ success: true });
    } catch (err) {
      console.error('Track error error:', err);
      res.status(500).json({ error: 'Failed to track error' });
    }
  });

  return router;
}

module.exports = createTrackingRoutes;
