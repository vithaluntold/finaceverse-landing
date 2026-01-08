// Automated SEO Scanner - Daily Cron Job
// File: src/seo-ai/auto-scanner.js

const KeywordOptimizer = require('./keyword-optimizer');
const LocalSEOManager = require('./local-seo-manager');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

class AutoScanner {
  constructor(options = {}) {
    this.pool = options.pool || new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    this.keywordOptimizer = new KeywordOptimizer(this.pool, options);
    this.localSEOManager = new LocalSEOManager(this.pool);
    
    this.emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };
  }

  async runDailyScan() {
    console.log('🤖 Starting automated daily SEO scan...');
    const startTime = Date.now();
    
    try {
      // 1. Scan all pages
      console.log('📊 Scanning all pages...');
      const scanResults = await this.keywordOptimizer.scanAllPages();
      
      // 2. Detect critical issues
      const criticalIssues = await this.detectCriticalIssues(scanResults);
      
      // 3. Generate insights
      const insights = await this.generateInsights(scanResults);
      
      // 4. Check local SEO status
      const localSEOStatus = await this.localSEOManager.generateLocalSEOReport();
      
      // 5. Send email report if issues found
      if (criticalIssues.length > 0) {
        await this.sendAlertEmail(criticalIssues, scanResults);
      }
      
      // 6. Store daily snapshot
      await this.storeDailySnapshot(scanResults, insights);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✓ Daily scan complete in ${duration}s`);
      
      return {
        success: true,
        duration,
        pagesScanned: scanResults.pages.length,
        criticalIssues: criticalIssues.length,
        insights: insights.length
      };
      
    } catch (error) {
      console.error('❌ Daily scan failed:', error.message);
      await this.sendErrorEmail(error);
      throw error;
    }
  }

  async detectCriticalIssues(scanResults) {
    const issues = [];
    
    for (const page of scanResults.pages) {
      // Score below 50 is critical
      if (page.score < 50) {
        issues.push({
          severity: 'critical',
          page: page.url,
          score: page.score,
          type: 'low_seo_score',
          message: `Page score dropped below 50 (${page.score}/100)`
        });
      }
      
      // Missing H1 is critical
      if (!page.checks.h1.passed) {
        issues.push({
          severity: 'critical',
          page: page.url,
          type: 'missing_h1',
          message: 'Page missing H1 tag'
        });
      }
      
      // High percentage of images without alt
      if (page.checks.imageAlts.passed === false) {
        const missingPercent = (page.checks.imageAlts.missingCount / page.checks.imageAlts.totalImages) * 100;
        if (missingPercent > 50) {
          issues.push({
            severity: 'high',
            page: page.url,
            type: 'missing_alt_texts',
            message: `${Math.round(missingPercent)}% of images missing alt text`
          });
        }
      }
    }
    
    // Store issues in database
    for (const issue of issues) {
      await this.pool.query(
        `INSERT INTO seo_issues (issue_type, severity, page_url, description, auto_fixable, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (page_url, issue_type) DO UPDATE SET 
         severity = $2, description = $4, created_at = NOW()`,
        [issue.type, issue.severity, issue.page, issue.message, this.isAutoFixable(issue.type)]
      );
    }
    
    return issues;
  }

  isAutoFixable(issueType) {
    const autoFixableIssues = [
      'missing_alt_texts',
      'missing_meta_description',
      'low_keyword_density'
    ];
    return autoFixableIssues.includes(issueType);
  }

  async generateInsights(scanResults) {
    const insights = [];
    
    // Average score trend
    const avgScore = scanResults.summary.averageScore;
    if (avgScore < 70) {
      insights.push({
        type: 'performance',
        title: 'Site SEO Below Target',
        description: `Average SEO score is ${avgScore}/100. Target is 70+.`,
        impact_score: 90,
        action_items: [
          'Review pages scoring below 60',
          'Focus on keyword optimization',
          'Fix missing H1 tags'
        ]
      });
    }
    
    // Pages needing attention
    const poorPages = scanResults.pages.filter(p => p.score < 60);
    if (poorPages.length > 0) {
      insights.push({
        type: 'content',
        title: `${poorPages.length} Pages Need Immediate Attention`,
        description: 'Multiple pages have critical SEO issues',
        impact_score: 85,
        action_items: poorPages.map(p => `Fix ${p.url} (score: ${p.score})`)
      });
    }
    
    // Store insights
    for (const insight of insights) {
      await this.pool.query(
        `INSERT INTO ai_insights (insight_type, title, description, impact_score, action_items, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [insight.type, insight.title, insight.description, insight.impact_score, JSON.stringify(insight.action_items)]
      );
    }
    
    return insights;
  }

  async sendAlertEmail(issues, scanResults) {
    if (!this.emailConfig.auth.user) {
      console.log('⚠️ Email not configured, skipping alert');
      return;
    }
    
    const transporter = nodemailer.createTransporter(this.emailConfig);
    
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    
    const html = `
      <h2>🚨 SEO Alert - Critical Issues Detected</h2>
      <p><strong>Scan Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Average Score:</strong> ${scanResults.summary.averageScore}/100</p>
      
      <h3>Issues Summary:</h3>
      <ul>
        <li>Critical: ${criticalCount}</li>
        <li>High: ${highCount}</li>
      </ul>
      
      <h3>Critical Issues:</h3>
      <ul>
        ${issues.filter(i => i.severity === 'critical').map(i => 
          `<li><strong>${i.page}</strong>: ${i.message}</li>`
        ).join('')}
      </ul>
      
      <p>
        <a href="https://www.finaceverse.io/analytics-dashboard">View Full Report</a>
      </p>
    `;
    
    await transporter.sendMail({
      from: this.emailConfig.auth.user,
      to: process.env.ALERT_EMAIL || 'info@finacegroup.com',
      subject: `🚨 SEO Alert: ${criticalCount} Critical Issues`,
      html
    });
    
    console.log('✓ Alert email sent');
  }

  async sendErrorEmail(error) {
    if (!this.emailConfig.auth.user) return;
    
    const transporter = nodemailer.createTransporter(this.emailConfig);
    
    await transporter.sendMail({
      from: this.emailConfig.auth.user,
      to: process.env.ALERT_EMAIL || 'info@finacegroup.com',
      subject: '❌ SEO Scanner Error',
      html: `
        <h2>SEO Scanner Error</h2>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Error:</strong> ${error.message}</p>
        <pre>${error.stack}</pre>
      `
    });
  }

  async storeDailySnapshot(scanResults, insights) {
    // Store summary for historical tracking
    await this.pool.query(
      `INSERT INTO seo_actions (action_type, description, automated, status, result, executed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        'daily_scan',
        `Automated daily scan - ${scanResults.pages.length} pages`,
        true,
        'completed',
        JSON.stringify({
          averageScore: scanResults.summary.averageScore,
          totalPages: scanResults.summary.totalPages,
          criticalIssues: scanResults.summary.criticalIssues,
          insights: insights.length
        })
      ]
    );
  }
}

// CLI entry point for cron
if (require.main === module) {
  const scanner = new AutoScanner();
  scanner.runDailyScan()
    .then(result => {
      console.log('✓ Scan result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Scan failed:', error);
      process.exit(1);
    });
}

module.exports = AutoScanner;
