/**
 * Analytics Routes Module
 * 
 * Protected endpoints for analytics data retrieval:
 * - Performance metrics
 * - Geographic data
 * - Events and errors
 * - Dashboard summary
 * - PageSpeed insights
 * - A/B experiments
 * - Search Console
 */

const express = require('express');
const router = express.Router();

// ============ ROUTE FACTORY ============

/**
 * Creates analytics routes with injected dependencies
 * @param {Object} deps - Dependencies
 * @param {Object} deps.pool - PostgreSQL connection pool
 * @param {Object} deps.apiLimiter - API rate limiter
 * @param {Function} deps.authMiddleware - Authentication middleware
 * @param {Function} deps.cacheWrapper - Cache wrapper utility
 * @param {Function} deps.runPageSpeedTest - PageSpeed test function
 * @param {Function} deps.getGoogleAccessToken - Google OAuth token function
 */
function createAnalyticsRoutes({ 
  pool, 
  apiLimiter, 
  authMiddleware, 
  cacheWrapper, 
  runPageSpeedTest,
  getGoogleAccessToken,
  siteUrl = 'https://www.finaceverse.io'
}) {

  // ============ PERFORMANCE METRICS ============
  router.get('/performance', apiLimiter, authMiddleware, async (req, res) => {
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

  // ============ GEOGRAPHIC DATA ============
  router.get('/geography', apiLimiter, authMiddleware, async (req, res) => {
    try {
      const byCountryResult = await pool.query(`
        SELECT country as name, COUNT(*) as count 
        FROM visits 
        WHERE country IS NOT NULL 
        GROUP BY country 
        ORDER BY count DESC 
        LIMIT 50
      `);
      
      const byCityResult = await pool.query(`
        SELECT city, country, COUNT(*) as count 
        FROM visits 
        WHERE city IS NOT NULL 
        GROUP BY city, country 
        ORDER BY count DESC 
        LIMIT 20
      `);
      
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

  // ============ EVENTS ============
  router.get('/events', apiLimiter, authMiddleware, async (req, res) => {
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

  // ============ ERRORS ============
  router.get('/errors', apiLimiter, authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM errors ORDER BY timestamp DESC LIMIT 100');
      res.json({ data: result.rows, count: result.rows.length });
    } catch (err) {
      console.error('Get errors error:', err);
      res.status(500).json({ error: 'Failed to get errors' });
    }
  });

  // ============ DASHBOARD SUMMARY ============
  router.get('/summary', apiLimiter, authMiddleware, async (req, res) => {
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
        pool.query('SELECT COUNT(*) as total FROM visits WHERE timestamp >= $1', [last24h]),
        pool.query('SELECT COUNT(*) as total FROM visits WHERE timestamp >= $1', [last7d]),
        pool.query('SELECT COUNT(*) as total FROM events'),
        pool.query('SELECT COUNT(*) as total FROM errors WHERE timestamp >= $1', [last7d]),
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

  // ============ PAGESPEED ============
  router.get('/pagespeed', apiLimiter, authMiddleware, async (req, res) => {
    try {
      const latestMobile = await pool.query(
        'SELECT * FROM pagespeed_results WHERE strategy = $1 ORDER BY timestamp DESC LIMIT 1',
        ['mobile']
      );
      
      const latestDesktop = await pool.query(
        'SELECT * FROM pagespeed_results WHERE strategy = $1 ORDER BY timestamp DESC LIMIT 1',
        ['desktop']
      );
      
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const history = await pool.query(
        'SELECT * FROM pagespeed_results WHERE timestamp >= $1 ORDER BY timestamp ASC',
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

  // ============ ROUTE PREDICTION ============
  router.post('/predict-route', async (req, res) => {
    try {
      const { currentPage } = req.body;
      
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
            confidence: 0.2,
            method: 'popularity'
          }))
        });
      }
      
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

  // ============ SEARCH CONSOLE ============
  router.get('/search-console/queries', authMiddleware, async (req, res) => {
    try {
      const accessToken = await getGoogleAccessToken();
      
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

  router.get('/search-console/performance', authMiddleware, async (req, res) => {
    try {
      const accessToken = await getGoogleAccessToken();
      
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
      res.json({ timeline: data.rows || [] });
    } catch (error) {
      console.error('Search Console performance error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch Search Console performance' });
    }
  });

  return router;
}

module.exports = createAnalyticsRoutes;
