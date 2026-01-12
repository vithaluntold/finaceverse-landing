#!/usr/bin/env node
/**
 * PageSpeed Insights Monitoring Cron
 * 
 * Runs automated PageSpeed tests and generates AI-powered insights
 * 
 * Usage:
 *   node pagespeed-monitor.js              # Single run
 *   node pagespeed-monitor.js --schedule   # Run on schedule (every 6 hours)
 * 
 * Required Environment Variables:
 *   - PAGESPEED_API_KEY: Google PageSpeed Insights API key (optional, increases quota)
 *   - DATABASE_URL: PostgreSQL connection string
 *   - OPENAI_API_KEY: OpenAI API key for AI insights (optional)
 */

require('dotenv').config();
const { Pool } = require('pg');

const SITE_URL = 'https://finaceverse.io';
const PAGESPEED_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

// Target scores
const TARGETS = {
  performance: 95,
  accessibility: 95,
  bestPractices: 95,
  seo: 95,
};

// Issue priority weights
const PRIORITY_WEIGHTS = {
  performance: 1.5,
  accessibility: 1.2,
  seo: 1.3,
  bestPractices: 1.0,
};

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Ensure pagespeed_results table exists
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pagespeed_results (
      id SERIAL PRIMARY KEY,
      strategy VARCHAR(20) NOT NULL,
      performance_score INTEGER,
      accessibility_score INTEGER,
      best_practices_score INTEGER,
      seo_score INTEGER,
      lcp DECIMAL(10,2),
      fid DECIMAL(10,2),
      cls DECIMAL(10,4),
      tbt DECIMAL(10,2),
      fcp DECIMAL(10,2),
      speed_index DECIMAL(10,2),
      audits JSONB,
      opportunities JSONB,
      diagnostics JSONB,
      timestamp TIMESTAMP DEFAULT NOW()
    )
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pagespeed_insights (
      id SERIAL PRIMARY KEY,
      result_id INTEGER REFERENCES pagespeed_results(id),
      category VARCHAR(50),
      severity VARCHAR(20),
      title TEXT,
      description TEXT,
      impact_score DECIMAL(5,2),
      fix_suggestion TEXT,
      ai_recommendation TEXT,
      timestamp TIMESTAMP DEFAULT NOW()
    )
  `);
  
  console.log('✅ Database tables ready');
}

// Fetch PageSpeed data from API
async function fetchPageSpeed(strategy = 'mobile') {
  const apiKey = process.env.PAGESPEED_API_KEY || '';
  const categories = ['performance', 'accessibility', 'best-practices', 'seo'];
  
  const params = new URLSearchParams({
    url: SITE_URL,
    strategy,
    ...categories.reduce((acc, cat) => ({ ...acc, [`category`]: cat }), {}),
  });
  
  // Add all categories
  categories.forEach(cat => params.append('category', cat));
  
  if (apiKey) {
    params.append('key', apiKey);
  }
  
  const url = `${PAGESPEED_API}?${params.toString()}`;
  
  console.log(`🔍 Fetching PageSpeed data for ${strategy}...`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PageSpeed API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

// Parse PageSpeed response
function parseResults(data, strategy) {
  const lighthouse = data.lighthouseResult;
  const categories = lighthouse.categories;
  const audits = lighthouse.audits;
  
  // Core scores (0-100)
  const scores = {
    performance: Math.round((categories.performance?.score || 0) * 100),
    accessibility: Math.round((categories.accessibility?.score || 0) * 100),
    bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
    seo: Math.round((categories.seo?.score || 0) * 100),
  };
  
  // Core Web Vitals
  const metrics = {
    lcp: audits['largest-contentful-paint']?.numericValue / 1000 || null,
    fcp: audits['first-contentful-paint']?.numericValue / 1000 || null,
    tbt: audits['total-blocking-time']?.numericValue || null,
    cls: audits['cumulative-layout-shift']?.numericValue || null,
    speedIndex: audits['speed-index']?.numericValue / 1000 || null,
    fid: audits['max-potential-fid']?.numericValue || null,
  };
  
  // Opportunities (things to fix)
  const opportunities = [];
  const opportunityAudits = [
    'render-blocking-resources',
    'unused-javascript',
    'unused-css-rules',
    'modern-image-formats',
    'uses-optimized-images',
    'uses-text-compression',
    'uses-responsive-images',
    'offscreen-images',
    'unminified-css',
    'unminified-javascript',
    'efficient-animated-content',
    'uses-long-cache-ttl',
    'total-byte-weight',
    'uses-rel-preconnect',
    'server-response-time',
    'redirects',
    'uses-rel-preload',
    'uses-http2',
    'font-display',
    'third-party-summary',
  ];
  
  for (const auditId of opportunityAudits) {
    const audit = audits[auditId];
    if (audit && audit.score !== null && audit.score < 1) {
      opportunities.push({
        id: auditId,
        title: audit.title,
        description: audit.description,
        score: audit.score,
        savings: audit.overallSavingsMs || audit.overallSavingsBytes || 0,
        displayValue: audit.displayValue || '',
      });
    }
  }
  
  // Diagnostics
  const diagnostics = [];
  const diagnosticAudits = [
    'dom-size',
    'critical-request-chains',
    'long-tasks',
    'user-timings',
    'bootup-time',
    'mainthread-work-breakdown',
    'layout-shift-elements',
    'largest-contentful-paint-element',
  ];
  
  for (const auditId of diagnosticAudits) {
    const audit = audits[auditId];
    if (audit && audit.score !== null && audit.score < 1) {
      diagnostics.push({
        id: auditId,
        title: audit.title,
        description: audit.description,
        score: audit.score,
        displayValue: audit.displayValue || '',
      });
    }
  }
  
  // Accessibility issues
  const accessibilityIssues = [];
  const a11yAudits = [
    'color-contrast',
    'button-name',
    'link-name',
    'image-alt',
    'label',
    'html-has-lang',
    'meta-viewport',
    'document-title',
    'heading-order',
    'tap-targets',
    'bypass',
  ];
  
  for (const auditId of a11yAudits) {
    const audit = audits[auditId];
    if (audit && audit.score !== null && audit.score < 1) {
      accessibilityIssues.push({
        id: auditId,
        title: audit.title,
        description: audit.description,
        score: audit.score,
      });
    }
  }
  
  return {
    strategy,
    scores,
    metrics,
    opportunities: opportunities.sort((a, b) => a.score - b.score),
    diagnostics,
    accessibilityIssues,
    audits: lighthouse.audits,
  };
}

// Generate AI insights
async function generateAIInsights(results) {
  const insights = [];
  const { scores, opportunities, diagnostics, accessibilityIssues, strategy } = results;
  
  // Calculate gaps from target
  const gaps = {
    performance: TARGETS.performance - scores.performance,
    accessibility: TARGETS.accessibility - scores.accessibility,
    bestPractices: TARGETS.bestPractices - scores.bestPractices,
    seo: TARGETS.seo - scores.seo,
  };
  
  // Prioritize categories by gap size and weight
  const prioritizedCategories = Object.entries(gaps)
    .map(([cat, gap]) => ({
      category: cat,
      gap,
      priority: gap * (PRIORITY_WEIGHTS[cat] || 1),
    }))
    .filter(c => c.gap > 0)
    .sort((a, b) => b.priority - a.priority);
  
  // Generate insights for performance opportunities
  for (const opp of opportunities.slice(0, 5)) {
    const impact = (1 - opp.score) * 100;
    insights.push({
      category: 'performance',
      severity: impact > 50 ? 'critical' : impact > 25 ? 'high' : 'medium',
      title: opp.title,
      description: opp.description,
      impactScore: impact,
      fixSuggestion: generateFixSuggestion(opp.id, opp),
      aiRecommendation: await generateAIRecommendation(opp, 'performance'),
    });
  }
  
  // Generate insights for accessibility issues
  for (const issue of accessibilityIssues) {
    const impact = (1 - issue.score) * 100;
    insights.push({
      category: 'accessibility',
      severity: impact > 50 ? 'critical' : impact > 25 ? 'high' : 'medium',
      title: issue.title,
      description: issue.description,
      impactScore: impact,
      fixSuggestion: generateFixSuggestion(issue.id, issue),
      aiRecommendation: await generateAIRecommendation(issue, 'accessibility'),
    });
  }
  
  // Summary insight
  if (prioritizedCategories.length > 0) {
    const topCategory = prioritizedCategories[0];
    insights.unshift({
      category: 'summary',
      severity: topCategory.gap > 20 ? 'critical' : topCategory.gap > 10 ? 'high' : 'medium',
      title: `Focus on ${topCategory.category} to reach 95+ scores`,
      description: `${topCategory.category} needs ${topCategory.gap} more points to reach target. This should be your top priority for ${strategy}.`,
      impactScore: topCategory.priority,
      fixSuggestion: `Address the top ${topCategory.category} issues first before moving to other categories.`,
      aiRecommendation: generateCategorySummary(topCategory.category, scores, opportunities),
    });
  }
  
  return insights;
}

// Generate fix suggestions based on audit ID
function generateFixSuggestion(auditId, audit) {
  const suggestions = {
    'render-blocking-resources': 'Add async/defer to scripts, use media="print" onload trick for CSS, inline critical CSS.',
    'unused-javascript': 'Implement code splitting with React.lazy(), remove unused dependencies, use tree shaking.',
    'unused-css-rules': 'Use PurgeCSS or UnCSS to remove unused styles, split CSS by route.',
    'modern-image-formats': 'Convert images to WebP format, use <picture> element for fallbacks.',
    'uses-optimized-images': 'Compress images with tools like ImageOptim, use appropriate dimensions.',
    'uses-responsive-images': 'Add srcset and sizes attributes, serve different sizes for different viewports.',
    'offscreen-images': 'Add loading="lazy" to images below the fold.',
    'uses-text-compression': 'Enable gzip or Brotli compression on the server.',
    'uses-long-cache-ttl': 'Set Cache-Control headers with max-age for static assets.',
    'uses-rel-preconnect': 'Add <link rel="preconnect"> for third-party origins.',
    'server-response-time': 'Optimize server-side code, use caching, consider a CDN.',
    'font-display': 'Add font-display: swap to @font-face rules.',
    'color-contrast': 'Increase contrast ratio between text and background colors.',
    'tap-targets': 'Increase button/link sizes to at least 48x48px with proper spacing.',
    'dom-size': 'Reduce DOM complexity, use virtualization for long lists.',
    'long-tasks': 'Break up long JavaScript tasks, use requestIdleCallback or web workers.',
    'layout-shift-elements': 'Add explicit width/height to images and embeds.',
  };
  
  return suggestions[auditId] || `Review and address: ${audit.title}`;
}

// Generate AI recommendation (simplified version without OpenAI)
async function generateAIRecommendation(issue, category) {
  // In production, you could call OpenAI API here
  // For now, generate smart recommendations based on patterns
  
  const recommendations = {
    'unused-javascript': `Your bundle has significant unused JavaScript. Prioritize:
1. Audit with \`npx source-map-explorer build/static/js/*.js\`
2. Remove unused npm packages with \`npx depcheck\`
3. Implement route-based code splitting with React.lazy()
4. Consider replacing heavy libraries (moment.js → date-fns, lodash → native)`,

    'render-blocking-resources': `Render-blocking resources are your biggest bottleneck:
1. External fonts: Use \`media="print" onload="this.media='all'"\` trick
2. CSS: Inline critical CSS in <head>, defer rest
3. Third-party scripts: Add \`async\` or \`defer\` attributes
4. Google Fonts: Preconnect to fonts.googleapis.com and fonts.gstatic.com`,

    'color-contrast': `Low contrast affects readability and accessibility compliance:
1. Use WebAIM Contrast Checker to find issues
2. Minimum ratio: 4.5:1 for normal text, 3:1 for large text
3. Common fix: Darken light text or lighten dark backgrounds
4. Test with grayscale filter to verify contrast`,

    'tap-targets': `Touch targets are too small for mobile users:
1. Minimum size: 48x48 CSS pixels
2. Add padding to links and buttons
3. Ensure 8px minimum spacing between targets
4. Test on actual mobile devices`,
  };
  
  return recommendations[issue.id] || 
    `To fix "${issue.title}": Review the specific elements flagged in the Lighthouse report and address each instance. This issue affects your ${category} score by approximately ${Math.round((1 - issue.score) * 100)}%.`;
}

// Generate category summary
function generateCategorySummary(category, scores, opportunities) {
  const summaries = {
    performance: `Performance score: ${scores.performance}/100 (target: 95+)

Top opportunities for improvement:
${opportunities.slice(0, 3).map((o, i) => `${i + 1}. ${o.title} (${o.displayValue || 'Fix needed'})`).join('\n')}

Quick wins to prioritize:
• Code splitting and lazy loading
• Image optimization and lazy loading
• Font loading optimization
• Third-party script management`,

    accessibility: `Accessibility score: ${scores.accessibility}/100 (target: 95+)

Focus areas:
• Ensure sufficient color contrast (WCAG AA minimum 4.5:1)
• Add proper ARIA labels and landmarks
• Ensure all images have alt text
• Make touch targets at least 48x48px
• Test with screen readers`,

    seo: `SEO score: ${scores.seo}/100 (target: 95+)

Checklist:
• Descriptive link text (avoid "click here", "learn more")
• Meta descriptions for all pages
• Proper heading hierarchy (h1 → h2 → h3)
• Mobile-friendly viewport
• Valid structured data`,

    bestPractices: `Best Practices score: ${scores.bestPractices}/100 (target: 95+)

Common issues:
• Browser console errors
• HTTPS for all resources
• Proper Content Security Policy
• No deprecated APIs`,
  };
  
  return summaries[category] || `Focus on improving ${category} to reach target score.`;
}

// Save results to database
async function saveResults(results, insights) {
  const { strategy, scores, metrics, opportunities, diagnostics } = results;
  
  const insertResult = await pool.query(`
    INSERT INTO pagespeed_results (
      strategy, performance_score, accessibility_score, best_practices_score, seo_score,
      lcp, fid, cls, tbt, fcp, speed_index, opportunities, diagnostics
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id
  `, [
    strategy,
    scores.performance,
    scores.accessibility,
    scores.bestPractices,
    scores.seo,
    metrics.lcp,
    metrics.fid,
    metrics.cls,
    metrics.tbt,
    metrics.fcp,
    metrics.speedIndex,
    JSON.stringify(opportunities),
    JSON.stringify(diagnostics),
  ]);
  
  const resultId = insertResult.rows[0].id;
  
  // Save insights
  for (const insight of insights) {
    await pool.query(`
      INSERT INTO pagespeed_insights (
        result_id, category, severity, title, description, impact_score, fix_suggestion, ai_recommendation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      resultId,
      insight.category,
      insight.severity,
      insight.title,
      insight.description,
      insight.impactScore,
      insight.fixSuggestion,
      insight.aiRecommendation,
    ]);
  }
  
  return resultId;
}

// Print report to console
function printReport(results, insights) {
  const { strategy, scores, metrics } = results;
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 PageSpeed Report - ${strategy.toUpperCase()}`);
  console.log('='.repeat(60));
  
  console.log('\n📈 Scores:');
  const formatScore = (score, target) => {
    const icon = score >= target ? '✅' : score >= target - 10 ? '⚠️' : '❌';
    return `${icon} ${score}/100 (target: ${target})`;
  };
  
  console.log(`   Performance:     ${formatScore(scores.performance, TARGETS.performance)}`);
  console.log(`   Accessibility:   ${formatScore(scores.accessibility, TARGETS.accessibility)}`);
  console.log(`   Best Practices:  ${formatScore(scores.bestPractices, TARGETS.bestPractices)}`);
  console.log(`   SEO:             ${formatScore(scores.seo, TARGETS.seo)}`);
  
  console.log('\n⚡ Core Web Vitals:');
  console.log(`   LCP: ${metrics.lcp?.toFixed(1)}s ${metrics.lcp <= 2.5 ? '✅' : metrics.lcp <= 4 ? '⚠️' : '❌'}`);
  console.log(`   FCP: ${metrics.fcp?.toFixed(1)}s ${metrics.fcp <= 1.8 ? '✅' : metrics.fcp <= 3 ? '⚠️' : '❌'}`);
  console.log(`   CLS: ${metrics.cls?.toFixed(3)} ${metrics.cls <= 0.1 ? '✅' : metrics.cls <= 0.25 ? '⚠️' : '❌'}`);
  console.log(`   TBT: ${metrics.tbt?.toFixed(0)}ms ${metrics.tbt <= 200 ? '✅' : metrics.tbt <= 600 ? '⚠️' : '❌'}`);
  
  console.log('\n🔧 AI Insights:');
  for (const insight of insights.filter(i => i.category !== 'summary').slice(0, 5)) {
    const severityIcon = { critical: '🔴', high: '🟠', medium: '🟡' }[insight.severity] || '⚪';
    console.log(`\n${severityIcon} [${insight.category.toUpperCase()}] ${insight.title}`);
    console.log(`   Fix: ${insight.fixSuggestion}`);
  }
  
  console.log('\n' + '='.repeat(60));
}

// Main function
async function main() {
  console.log('🚀 PageSpeed Insights Monitor');
  console.log(`   URL: ${SITE_URL}`);
  console.log(`   Time: ${new Date().toISOString()}`);
  
  try {
    await ensureTable();
    
    // Run for both mobile and desktop
    for (const strategy of ['mobile', 'desktop']) {
      const data = await fetchPageSpeed(strategy);
      const results = parseResults(data, strategy);
      const insights = await generateAIInsights(results);
      
      printReport(results, insights);
      
      const resultId = await saveResults(results, insights);
      console.log(`\n💾 Saved to database (ID: ${resultId})`);
    }
    
    console.log('\n✅ PageSpeed monitoring complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { fetchPageSpeed, parseResults, generateAIInsights };
