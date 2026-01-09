const { Pool } = require('pg');
const GSCIntegration = require('./src/seo-ai/gsc-integration');
const BacklinkCrawler = require('./src/seo-ai/backlink-crawler');
const AutoFixer = require('./src/seo-ai/auto-fixer');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testAll() {
  console.log('=== TESTING ALL SEO FEATURES ===\n');
  
  const results = { passed: 0, failed: 0 };
  
  // 1. GSC Integration
  try {
    console.log('1. Testing GSC Integration...');
    const gsc = new GSCIntegration(pool);
    const gscResult = await gsc.fetchKeywordRankings(7);
    console.log(`✅ GSC: ${gscResult.total} keywords fetched`);
    results.passed++;
  } catch (e) {
    console.log(`❌ GSC Failed: ${e.message}`);
    results.failed++;
  }
  
  // 2. Backlink Crawler
  try {
    console.log('\n2. Testing Backlink Crawler...');
    const backlinks = new BacklinkCrawler(pool);
    const blResult = await backlinks.crawlBacklinks();
    console.log(`✅ Backlinks: ${blResult.total} discovered`);
    results.passed++;
  } catch (e) {
    console.log(`❌ Backlinks Failed: ${e.message}`);
    results.failed++;
  }
  
  // 3. Auto-Fixer
  try {
    console.log('\n3. Testing Auto-Fixer...');
    const fixer = new AutoFixer(pool);
    const fixResult = await fixer.fixAllIssues();
    console.log(`✅ Auto-Fix: ${fixResult.total} issues processed`);
    results.passed++;
  } catch (e) {
    console.log(`❌ Auto-Fix Failed: ${e.message}`);
    results.failed++;
  }
  
  console.log(`\n=== RESULTS ===`);
  console.log(`✅ Passed: ${results.passed}/3`);
  console.log(`❌ Failed: ${results.failed}/3`);
  console.log(`\n${results.passed === 3 ? '🎉 ALL SYSTEMS OPERATIONAL!' : '⚠️  Some systems need attention'}`);
  
  await pool.end();
}

testAll();
