/**
 * Experiments Routes Module
 * 
 * A/B Testing endpoints:
 * - Create experiments
 * - List experiments
 * - Get experiment details with stats
 * - Assign users to variants
 * - Track conversions
 * - End experiments
 */

const express = require('express');
const router = express.Router();

// ============ ROUTE FACTORY ============

/**
 * Creates experiment routes with injected dependencies
 * @param {Object} deps - Dependencies
 * @param {Object} deps.pool - PostgreSQL connection pool
 * @param {Object} deps.apiLimiter - API rate limiter
 * @param {Function} deps.authMiddleware - Authentication middleware
 */
function createExperimentsRoutes({ pool, apiLimiter, authMiddleware }) {

  // ============ CREATE EXPERIMENT ============
  router.post('/', authMiddleware, apiLimiter, async (req, res) => {
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

  // ============ LIST EXPERIMENTS ============
  router.get('/', authMiddleware, apiLimiter, async (req, res) => {
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

  // ============ GET EXPERIMENT WITH STATS ============
  router.get('/:id', authMiddleware, apiLimiter, async (req, res) => {
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

  // ============ ASSIGN USER TO VARIANT ============
  router.post('/:id/assign', async (req, res) => {
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
      const experiment = await pool.query(
        'SELECT variants FROM experiments WHERE id = $1 AND status = $2', 
        [id, 'active']
      );
      
      if (experiment.rows.length === 0) {
        return res.status(404).json({ error: 'Active experiment not found' });
      }
      
      // Random assignment
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

  // ============ TRACK CONVERSION ============
  router.post('/:id/convert', async (req, res) => {
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

  // ============ END EXPERIMENT ============
  router.post('/:id/end', authMiddleware, async (req, res) => {
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

  return router;
}

module.exports = createExperimentsRoutes;
