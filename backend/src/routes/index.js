/**
 * Routes Index Module
 * 
 * Central export for all route modules.
 * Each route module is a factory function that receives dependencies.
 */

const createAuthRoutes = require('./auth.routes');
const createTrackingRoutes = require('./tracking.routes');
const createAnalyticsRoutes = require('./analytics.routes');
const createSEORoutes = require('./seo.routes');
const createExperimentsRoutes = require('./experiments.routes');
const createSecurityRoutes = require('./security.routes');

module.exports = {
  createAuthRoutes,
  createTrackingRoutes,
  createAnalyticsRoutes,
  createSEORoutes,
  createExperimentsRoutes,
  createSecurityRoutes,
};
