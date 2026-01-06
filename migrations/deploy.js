#!/usr/bin/env node

// Migration deployment script
// Usage: node migrations/deploy.js

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/finaceverse_analytics';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration(filename) {
  console.log(`\n📦 Running migration: ${filename}`);
  
  const sqlPath = path.join(__dirname, filename);
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  try {
    await pool.query(sql);
    console.log(`✓ Migration ${filename} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Migration ${filename} failed:`, error.message);
    throw error;
  }
}

async function deploy() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('SEO AI INFRASTRUCTURE - DATABASE MIGRATION');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\nDatabase: ${DATABASE_URL.replace(/:[^:]*@/, ':****@')}\n`);
  
  try {
    // Test connection
    const client = await pool.connect();
    console.log('✓ Connected to PostgreSQL');
    client.release();
    
    // Run migrations in order
    const migrations = [
      '002_seo_tables.sql',
      '003_local_seo.sql'
    ];
    
    for (const migration of migrations) {
      await runMigration(migration);
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✓ ALL MIGRATIONS COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\nNew tables created:');
    console.log('  • target_keywords - 13 keywords pre-populated');
    console.log('  • content_analysis - Page SEO scoring');
    console.log('  • backlink_monitor - Backlink tracking');
    console.log('  • seo_issues - Issue tracking with auto-fix flags');
    console.log('  • ai_insights - AI recommendations');
    console.log('  • user_brainstorm_sessions - AI chat history');
    console.log('  • seo_actions - Action log');
    console.log('  • keyword_rankings_history - Position tracking');
    console.log('  • local_seo_presence - 9 countries pre-populated');
    console.log('  • ux_metrics - Conversion tracking');
    console.log('  • local_directory_listings - Directory submissions');
    console.log('  • city_pages - Location landing pages');
    console.log('\n👉 Next steps:');
    console.log('  1. npm install cheerio node-fetch');
    console.log('  2. Restart server: railway up (or npm start)');
    console.log('  3. Test SEO scanner: curl http://localhost:5000/api/seo/report');
    console.log('  4. Setup local SEO: POST /api/local-seo/setup-all');
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED');
    console.error('Error:', error.message);
    console.error('\nPlease check:');
    console.error('  • DATABASE_URL is set correctly in .env');
    console.error('  • Database is accessible');
    console.error('  • SQL syntax in migration files');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

deploy().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
