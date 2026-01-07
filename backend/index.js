/**
 * Backend Module Index
 * 
 * Main entry point for the modular backend architecture.
 * Exports all major components for easy import.
 */

const { createApp, config } = require('./src/app');
const securityModule = require('./security');
const routes = require('./src/routes');

module.exports = {
  createApp,
  config,
  security: securityModule,
  routes,
};
