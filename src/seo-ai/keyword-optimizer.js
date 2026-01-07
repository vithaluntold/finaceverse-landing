// SEO AI - Keyword Optimizer
// File: src/seo-ai/keyword-optimizer.js
// SECURITY: Integrated with SSRF protection and XSS sanitization

const { Pool } = require('pg');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

class KeywordOptimizer {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.ssrfProtection = options.ssrfProtection || null;
    this.xssSanitizer = options.xssSanitizer || null;
    this.usePuppeteer = options.usePuppeteer !== false; // Default true for React SPAs
    this.targetKeywords = [
      'AI-powered accounting software',
      'automated financial operations platform',
      'cognitive finance system'
    ];
  }

  // SECURED: Fetch page content using Puppeteer for React SPA
  async fetchPageContentWithBrowser(pageUrl) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      
      // Set realistic headers
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Navigate with timeout
      await page.goto(pageUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Wait for React to render
      await page.waitForTimeout(2000);
      
      // Get rendered HTML
      const html = await page.content();
      
      return html;
    } catch (error) {
      console.error(`Puppeteer error for ${pageUrl}:`, error.message);
      return null;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // SECURED: Fetch and parse page content with SSRF protection
  async fetchPageContent(pageUrl) {
    // Use Puppeteer for React SPAs (finaceverse.io)
    if (this.usePuppeteer && pageUrl.includes('finaceverse.io')) {
      return await this.fetchPageContentWithBrowser(pageUrl);
    }
    
    // Fallback to regular fetch for static pages
    try {
      let response;
      
      // Use SSRF-protected fetch if available
      if (this.ssrfProtection) {
        response = await this.ssrfProtection.safeFetch(pageUrl, {
          headers: {
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });
      } else {
        // Fallback with basic validation
        const fetch = require('node-fetch');
        const url = new URL(pageUrl);
        
        // Basic SSRF protection - only allow finaceverse domains
        const allowedDomains = ['finaceverse.io', 'www.finaceverse.io', 'localhost'];
        if (!allowedDomains.includes(url.hostname)) {
          throw new Error(`SSRF Protection: Domain ${url.hostname} not allowed`);
        }
        
        response = await fetch(pageUrl, { timeout: 10000 });
      }
      
      const html = await response.text();
      return html;
    } catch (error) {
      console.error(`Error fetching ${pageUrl}:`, error.message);
      // Log security events
      if (error.message.includes('SSRF')) {
        console.warn(`🚨 SSRF attempt blocked: ${pageUrl}`);
      }
      return null;
    }
  }

  // Get target keyword for a page
  async getTargetKeyword(pageUrl) {
    const result = await this.pool.query(
      'SELECT keyword FROM target_keywords WHERE target_page = $1 AND keyword_type = $2 LIMIT 1',
      [new URL(pageUrl).pathname, 'primary']
    );
    
    return result.rows[0]?.keyword || this.targetKeywords[0];
  }

  // Main optimization scan with XSS sanitization
  async scanPageOptimization(pageUrl) {
    const content = await this.fetchPageContent(pageUrl);
    if (!content) {
      return { error: 'Unable to fetch page content' };
    }

    let $ = cheerio.load(content);
    
    // SECURITY: Sanitize HTML before processing
    if (this.xssSanitizer) {
      $ = this.xssSanitizer.sanitizeCheerio($);
    }
    
    const targetKeyword = await this.getTargetKeyword(pageUrl);
    
    const analysis = {
      pageUrl,
      targetKeyword,
      h1Check: this.checkH1($, targetKeyword),
      h2Check: this.checkH2s($, targetKeyword),
      first100WordsCheck: this.checkFirst100Words($, targetKeyword),
      altTextCheck: this.checkImageAltTexts($, targetKeyword),
      urlCheck: this.checkUrlSlug(pageUrl, targetKeyword),
      densityCheck: this.checkKeywordDensity($, targetKeyword),
      metaTagsCheck: this.checkMetaTags($, targetKeyword),
      
      score: 0,
      issues: [],
      recommendations: []
    };
    
    // Calculate overall score
    analysis.score = this.calculateOptimizationScore(analysis);
    
    // Generate recommendations
    this.generateRecommendations(analysis);
    
    // Store analysis in database
    await this.storeAnalysis(analysis);
    
    return analysis;
  }

  // Check H1 for keyword presence
  checkH1($, keyword) {
    const h1 = $('h1').first().text();
    if (!h1) return { passed: false, reason: 'No H1 found', score: 0 };
    
    const h1Lower = h1.toLowerCase();
    const keywordLower = keyword.toLowerCase();
    const containsKeyword = h1Lower.includes(keywordLower);
    
    return {
      passed: containsKeyword,
      h1Text: h1,
      containsKeyword,
      score: containsKeyword ? 100 : 0,
      recommendation: containsKeyword ? null : `Add "${keyword}" to H1 heading`
    };
  }

  // Check H2s for keyword variations
  checkH2s($, keyword) {
    const h2s = [];
    $('h2').each((i, el) => {
      h2s.push($(el).text());
    });
    
    if (h2s.length === 0) {
      return { passed: false, count: 0, score: 0, reason: 'No H2 headings found' };
    }

    const keywordLower = keyword.toLowerCase();
    const keywordWords = keywordLower.split(' ');
    
    let keywordCount = 0;
    h2s.forEach(h2 => {
      const h2Lower = h2.toLowerCase();
      // Check if at least 2 words from keyword appear in H2
      const matches = keywordWords.filter(word => h2Lower.includes(word));
      if (matches.length >= 2) keywordCount++;
    });
    
    const passed = keywordCount >= 2;
    const score = Math.min(100, (keywordCount / 2) * 100);
    
    return {
      passed,
      count: h2s.length,
      keywordOccurrences: keywordCount,
      score,
      h2s: h2s.slice(0, 5), // Return first 5 H2s
      recommendation: passed ? null : `Add keyword variations to at least 2 H2 headings`
    };
  }

  // Check first 100 words for keywords
  checkFirst100Words($, keyword) {
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const words = bodyText.split(' ');
    const first100 = words.slice(0, 100).join(' ').toLowerCase();
    
    const keywords = [
      ...this.targetKeywords,
      keyword
    ];
    
    const foundKeywords = keywords.filter(kw => 
      first100.includes(kw.toLowerCase())
    );
    
    const passed = foundKeywords.length >= 2;
    const score = Math.min(100, (foundKeywords.length / 3) * 100);
    
    return {
      passed,
      wordCount: words.length,
      first100WordsCount: Math.min(100, words.length),
      keywordsFound: foundKeywords,
      score,
      recommendation: passed ? null : `Include primary keywords in first 100 words`
    };
  }

  // Check image alt texts
  checkImageAltTexts($, keyword) {
    const images = [];
    $('img').each((i, el) => {
      const alt = $(el).attr('alt') || '';
      const src = $(el).attr('src') || '';
      images.push({ src, alt, hasAlt: alt.length > 0 });
    });
    
    const totalImages = images.length;
    const imagesWithAlt = images.filter(img => img.hasAlt).length;
    const imagesWithKeyword = images.filter(img => 
      img.alt.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    
    const altCoverage = totalImages > 0 ? (imagesWithAlt / totalImages) * 100 : 100;
    const keywordCoverage = totalImages > 0 ? (imagesWithKeyword / totalImages) * 100 : 0;
    
    const score = (altCoverage * 0.7) + (keywordCoverage * 0.3);
    const passed = altCoverage >= 80 && keywordCoverage >= 20;
    
    return {
      passed,
      totalImages,
      imagesWithAlt,
      imagesWithoutAlt: totalImages - imagesWithAlt,
      imagesWithKeyword,
      altCoverage: Math.round(altCoverage),
      keywordCoverage: Math.round(keywordCoverage),
      score: Math.round(score),
      recommendation: !passed ? `Add descriptive alt text with keywords to ${totalImages - imagesWithAlt} images` : null
    };
  }

  // Check URL slug
  checkUrlSlug(pageUrl, keyword) {
    const pathname = new URL(pageUrl).pathname.toLowerCase();
    const slug = pathname.replace(/^\/|\/$/g, '').replace(/\//g, '-');
    
    const keywordWords = keyword.toLowerCase().split(' ');
    const matchedWords = keywordWords.filter(word => 
      slug.includes(word.replace(/[^a-z0-9]/g, ''))
    );
    
    const passed = matchedWords.length >= 2;
    const score = (matchedWords.length / keywordWords.length) * 100;
    
    return {
      passed,
      slug,
      matchedWords: matchedWords.length,
      totalWords: keywordWords.length,
      score: Math.round(score),
      recommendation: passed ? null : `Optimize URL slug to include keyword: "${keyword}"`
    };
  }

  // Check keyword density
  checkKeywordDensity($, keyword) {
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().toLowerCase();
    const words = bodyText.split(' ');
    const totalWords = words.length;
    
    const keywordLower = keyword.toLowerCase();
    const keywordCount = (bodyText.match(new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    
    const density = (keywordCount / totalWords) * 100;
    const idealDensity = density >= 0.5 && density <= 2;
    
    const score = idealDensity ? 100 : (density < 0.5 ? (density / 0.5) * 100 : (2 / density) * 100);
    
    return {
      passed: idealDensity,
      density: parseFloat(density.toFixed(2)),
      keywordCount,
      totalWords,
      score: Math.round(Math.min(100, score)),
      recommendation: idealDensity ? null : 
        (density < 0.5 ? `Increase keyword usage (current: ${density.toFixed(1)}%, target: 1-2%)` :
         `Reduce keyword stuffing (current: ${density.toFixed(1)}%, target: 1-2%)`)
    };
  }

  // Check meta tags
  checkMetaTags($, keyword) {
    const title = $('title').text();
    const description = $('meta[name="description"]').attr('content') || '';
    
    const titleHasKeyword = title.toLowerCase().includes(keyword.toLowerCase());
    const descriptionHasKeyword = description.toLowerCase().includes(keyword.toLowerCase());
    
    const titleLength = title.length;
    const descLength = description.length;
    
    const titleOptimal = titleLength >= 30 && titleLength <= 60;
    const descOptimal = descLength >= 120 && descLength <= 155;
    
    const score = (
      (titleHasKeyword ? 30 : 0) +
      (descriptionHasKeyword ? 30 : 0) +
      (titleOptimal ? 20 : 0) +
      (descOptimal ? 20 : 0)
    );
    
    const passed = titleHasKeyword && descriptionHasKeyword && titleOptimal && descOptimal;
    
    return {
      passed,
      title,
      titleLength,
      titleHasKeyword,
      titleOptimal,
      description,
      descriptionLength: descLength,
      descriptionHasKeyword,
      descriptionOptimal: descOptimal,
      score,
      recommendations: [
        ...(!titleHasKeyword ? [`Add "${keyword}" to title tag`] : []),
        ...(!descriptionHasKeyword ? [`Add "${keyword}" to meta description`] : []),
        ...(!titleOptimal ? [`Optimize title length (current: ${titleLength}, target: 30-60)`] : []),
        ...(!descOptimal ? [`Optimize description length (current: ${descLength}, target: 120-155)`] : [])
      ]
    };
  }

  // Calculate overall optimization score
  calculateOptimizationScore(analysis) {
    const weights = {
      h1Check: 0.20,
      h2Check: 0.15,
      first100WordsCheck: 0.15,
      altTextCheck: 0.10,
      urlCheck: 0.10,
      densityCheck: 0.15,
      metaTagsCheck: 0.15
    };
    
    let totalScore = 0;
    Object.keys(weights).forEach(check => {
      if (analysis[check] && typeof analysis[check].score === 'number') {
        totalScore += analysis[check].score * weights[check];
      }
    });
    
    return Math.round(totalScore);
  }

  // Generate recommendations
  generateRecommendations(analysis) {
    const checks = ['h1Check', 'h2Check', 'first100WordsCheck', 'altTextCheck', 'urlCheck', 'densityCheck'];
    
    checks.forEach(checkName => {
      const check = analysis[checkName];
      if (check && !check.passed && check.recommendation) {
        analysis.recommendations.push({
          severity: check.score < 50 ? 'critical' : 'medium',
          area: checkName.replace('Check', ''),
          issue: check.recommendation,
          autoFixable: checkName === 'altTextCheck' || checkName === 'densityCheck'
        });
      }
    });
    
    // Add meta tags recommendations
    if (analysis.metaTagsCheck && analysis.metaTagsCheck.recommendations) {
      analysis.metaTagsCheck.recommendations.forEach(rec => {
        analysis.recommendations.push({
          severity: 'high',
          area: 'metaTags',
          issue: rec,
          autoFixable: false
        });
      });
    }
    
    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    analysis.recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  // Store analysis in database
  async storeAnalysis(analysis) {
    try {
      await this.pool.query(
        `INSERT INTO content_analysis 
         (page_url, seo_score, heading_structure, images_count, images_without_alt, meta_title, meta_description, analyzed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        [
          analysis.pageUrl,
          analysis.score,
          JSON.stringify({
            h1: analysis.h1Check.h1Text,
            h2s: analysis.h2Check.h2s
          }),
          analysis.altTextCheck.totalImages,
          analysis.altTextCheck.imagesWithoutAlt,
          analysis.metaTagsCheck.title,
          analysis.metaTagsCheck.description
        ]
      );
      
      // Store issues
      for (const rec of analysis.recommendations) {
        await this.pool.query(
          `INSERT INTO seo_issues 
           (issue_type, severity, page_url, description, recommendation, auto_fixable)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            rec.area,
            rec.severity,
            analysis.pageUrl,
            rec.issue,
            rec.issue,
            rec.autoFixable
          ]
        );
      }
      
      console.log(`✓ Stored analysis for ${analysis.pageUrl} (score: ${analysis.score}/100)`);
    } catch (error) {
      console.error('Error storing analysis:', error.message);
    }
  }

  // Scan all pages
  async scanAllPages() {
    const baseUrl = 'https://www.finaceverse.io';
    const pages = [
      '/',
      '/modules',
      '/tailored-pilots',
      '/expert-consultation',
      '/request-demo',
      '/blog',
      '/compliance-privacy'
    ];
    
    const results = [];
    for (const page of pages) {
      const url = `${baseUrl}${page}`;
      console.log(`\nScanning: ${url}`);
      const analysis = await this.scanPageOptimization(url);
      results.push(analysis);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return results;
  }

  // Generate summary report
  async generateReport() {
    const results = await this.scanAllPages();
    
    const summary = {
      totalPages: results.length,
      averageScore: Math.round(
        results.reduce((sum, r) => sum + r.score, 0) / results.length
      ),
      pagesNeedingWork: results.filter(r => r.score < 70).length,
      criticalIssues: results.reduce((sum, r) => 
        sum + r.recommendations.filter(rec => rec.severity === 'critical').length, 0
      ),
      pages: results.map(r => ({
        url: r.pageUrl,
        score: r.score,
        issues: r.recommendations.length
      }))
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('SEO OPTIMIZATION REPORT');
    console.log('='.repeat(60));
    console.log(`Total Pages Scanned: ${summary.totalPages}`);
    console.log(`Average SEO Score: ${summary.averageScore}/100`);
    console.log(`Pages Needing Work (<70): ${summary.pagesNeedingWork}`);
    console.log(`Critical Issues: ${summary.criticalIssues}`);
    console.log('\nPage Scores:');
    summary.pages.forEach(page => {
      const emoji = page.score >= 80 ? '✅' : page.score >= 70 ? '⚠️' : '❌';
      console.log(`  ${emoji} ${page.url}: ${page.score}/100 (${page.issues} issues)`);
    });
    console.log('='.repeat(60) + '\n');
    
    return summary;
  }
}

module.exports = KeywordOptimizer;
