/**
 * SEO Routes Module
 * 
 * Protected endpoints for SEO AI infrastructure:
 * - Keyword management
 * - Page scanning and optimization
 * - SEO issues tracking
 * - Content analysis history
 * - Local SEO management (9 countries)
 */

const express = require('express');
const router = express.Router();

// ============ ROUTE FACTORY ============

/**
 * Creates SEO routes with injected dependencies
 * @param {Object} deps - Dependencies
 * @param {Object} deps.pool - PostgreSQL connection pool
 * @param {Object} deps.seoLimiter - SEO rate limiter
 * @param {Object} deps.apiLimiter - API rate limiter
 * @param {Function} deps.authMiddleware - Authentication middleware
 * @param {Object} deps.keywordOptimizer - Keyword optimizer service
 * @param {Object} deps.localSEOManager - Local SEO manager service
 */
function createSEORoutes({ 
  pool, 
  seoLimiter, 
  apiLimiter, 
  authMiddleware,
  keywordOptimizer,
  localSEOManager,
  siteUrl = 'https://www.finaceverse.io'
}) {

  // ============ KEYWORDS ============
  router.get('/keywords', authMiddleware, seoLimiter, async (req, res) => {
    try {
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

  // ============ PAGE SCAN ============
  router.get('/scan/:page', authMiddleware, seoLimiter, async (req, res) => {
    try {
      if (!keywordOptimizer) {
        return res.status(503).json({ error: 'SEO optimizer not available' });
      }
      
      const { page } = req.params;
      
      // SECURITY: Validate page parameter
      const sanitizedPage = page.replace(/[^a-zA-Z0-9-_]/g, '');
      if (sanitizedPage !== page) {
        console.warn(`🚨 Potential path traversal attempt: ${page}`);
        return res.status(400).json({ error: 'Invalid page parameter' });
      }
      
      const pageUrl = sanitizedPage === 'home' ? 
        `${siteUrl}/` : 
        `${siteUrl}/${sanitizedPage}`;
      
      console.log(`📊 Scanning page: ${pageUrl} (tenant: ${req.tenantId})`);
      const analysis = await keywordOptimizer.scanPageOptimization(pageUrl);
      
      res.json(analysis);
    } catch (error) {
      console.error('Page scan error:', error);
      res.status(500).json({ error: error.message || 'Failed to scan page' });
    }
  });

  // ============ SCAN ALL PAGES ============
  router.post('/scan-all', authMiddleware, seoLimiter, async (req, res) => {
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

  // ============ SEO REPORT ============
  router.get('/report', authMiddleware, seoLimiter, async (req, res) => {
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

  // ============ CONTENT ANALYSIS HISTORY ============
  router.get('/history/:page', authMiddleware, apiLimiter, async (req, res) => {
    try {
      const { page } = req.params;
      const pageUrl = page === 'home' ? 
        `${siteUrl}/` : 
        `${siteUrl}/${page}`;
      
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

  // ============ SEO ISSUES ============
  router.get('/issues', authMiddleware, apiLimiter, async (req, res) => {
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
          `${siteUrl}/` : 
          `${siteUrl}/${page}`;
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

  // ============ LOCAL SEO STATUS ============
  router.get('/local/status', authMiddleware, apiLimiter, async (req, res) => {
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

  // ============ LOCAL SEO SETUP (SINGLE COUNTRY) ============
  router.post('/local/setup/:countryCode', authMiddleware, seoLimiter, async (req, res) => {
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

  // ============ LOCAL SEO SETUP ALL ============
  router.post('/local/setup-all', authMiddleware, seoLimiter, async (req, res) => {
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

  // ============ COUNTRY PRIORITIES ============
  router.get('/local/priorities', authMiddleware, apiLimiter, async (req, res) => {
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

  // ============ CITY PAGES ============
  router.get('/local/cities/:countryCode', authMiddleware, apiLimiter, async (req, res) => {
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

  return router;
}

module.exports = createSEORoutes;
