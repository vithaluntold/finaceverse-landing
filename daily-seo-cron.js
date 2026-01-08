#!/usr/bin/env node

/**
 * Daily SEO Automation Cron Job
 * 
 * This script runs daily at 2 AM to:
 * 1. Scan all pages for SEO issues
 * 2. Fetch keyword rankings from Google Search Console
 * 3. Crawl for new backlinks
 * 4. Check backlink health
 * 5. Apply auto-fixes for simple issues
 * 6. Send alert emails if critical issues found
 * 
 * Setup:
 * Add to crontab: 0 2 * * * /path/to/daily-seo-cron.js
 * Or use Railway Cron: */
require('dotenv').config();
const { Pool } = require('pg');
const AutoScanner = require('./src/seo-ai/auto-scanner');
const BacklinkCrawler = require('./src/seo-ai/backlink-crawler');
const GSCIntegration = require('./src/seo-ai/gsc-integration');
const AutoFixer = require('./src/seo-ai/auto-fixer');

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runDailyTasks() {
  console.log('🤖 Starting daily SEO automation...');
  console.log(`📅 Time: ${new Date().toISOString()}`);
  
  const results = {
    scan: null,
    gsc: null,
    backlinks: null,
    autoFix: null,
    errors: []
  };
  
  try {
    // 1. Run daily SEO scan
    console.log('\n📊 Task 1: Running SEO scan...');
    try {
      const autoScanner = new AutoScanner({ pool });
      results.scan = await autoScanner.runDailyScan();
      console.log(`✓ Scan complete: ${results.scan.pagesScanned} pages, score ${results.scan.averageScore || 'N/A'}`);
    } catch (error) {
      console.error('❌ Scan failed:', error.message);
      results.errors.push({ task: 'scan', error: error.message });
    }
    
    // 2. Fetch keyword rankings from Google Search Console
    console.log('\n🔍 Task 2: Fetching GSC keyword rankings...');
    try {
      const gscIntegration = new GSCIntegration(pool);
      results.gsc = await gscIntegration.fetchKeywordRankings(7);
      console.log(`✓ GSC data fetched: ${results.gsc.total} rankings`);
    } catch (error) {
      console.error('❌ GSC fetch failed:', error.message);
      results.errors.push({ task: 'gsc', error: error.message });
    }
    
    // 3. Crawl for new backlinks
    console.log('\n🔗 Task 3: Crawling backlinks...');
    try {
      const backlinkCrawler = new BacklinkCrawler(pool);
      results.backlinks = await backlinkCrawler.crawlBacklinks();
      console.log(`✓ Backlinks found: ${results.backlinks.total} new`);
      
      // Check health of existing backlinks
      await backlinkCrawler.checkBacklinkHealth();
    } catch (error) {
      console.error('❌ Backlink crawl failed:', error.message);
      results.errors.push({ task: 'backlinks', error: error.message });
    }
    
    // 4. Apply auto-fixes for simple issues
    console.log('\n🔧 Task 4: Running auto-fixes...');
    try {
      const autoFixer = new AutoFixer(pool, { dryRun: false, autoApprove: true });
      results.autoFix = await autoFixer.fixAllIssues();
      console.log(`✓ Auto-fixes applied: ${results.autoFix.fixed}/${results.autoFix.total}`);
    } catch (error) {
      console.error('❌ Auto-fix failed:', error.message);
      results.errors.push({ task: 'autoFix', error: error.message });
    }
    
    // 5. Log completion
    await pool.query(
      `INSERT INTO seo_actions (action_type, description, automated, status, result, executed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        'daily_automation',
        'Completed daily SEO automation tasks',
        true,
        results.errors.length === 0 ? 'completed' : 'partial',
        JSON.stringify(results)
      ]
    );
    
    console.log('\n✅ Daily SEO automation complete');
    console.log(`📊 Summary:`);
    console.log(`   - Pages scanned: ${results.scan?.pagesScanned || 0}`);
    console.log(`   - Keyword rankings: ${results.gsc?.total || 0}`);
    console.log(`   - Backlinks found: ${results.backlinks?.total || 0}`);
    console.log(`   - Issues fixed: ${results.autoFix?.fixed || 0}`);
    console.log(`   - Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.error('\n⚠️ Errors encountered:');
      results.errors.forEach(err => {
        console.error(`   - ${err.task}: ${err.error}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error during daily automation:', error);
    
    // Log fatal error
    try {
      await pool.query(
        `INSERT INTO seo_actions (action_type, description, automated, status, result, executed_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          'daily_automation',
          'Daily automation failed',
          true,
          'failed',
          JSON.stringify({ error: error.message, stack: error.stack })
        ]
      );
    } catch (logError) {
      console.error('Failed to log error:', logError.message);
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
  
  process.exit(results.errors.length === 0 ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  runDailyTasks();
}

module.exports = runDailyTasks;
