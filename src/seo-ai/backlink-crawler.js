// Backlink Crawler - Monitor and discover backlinks
// File: src/seo-ai/backlink-crawler.js

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { Pool } = require('pg');

class BacklinkCrawler {
  constructor(pool, options = {}) {
    this.pool = pool || new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    this.domain = options.domain || 'finaceverse.io';
    this.maxDepth = options.maxDepth || 2;
    this.timeout = options.timeout || 10000;
  }

  async crawlBacklinks() {
    console.log(`🔗 Starting backlink crawl for ${this.domain}...`);
    
    try {
      // 1. Check Google for mentions
      const googleBacklinks = await this.searchGoogleForMentions();
      
      // 2. Check social media
      const socialBacklinks = await this.checkSocialMedia();
      
      // 3. Combine and deduplicate
      const allBacklinks = [...googleBacklinks, ...socialBacklinks];
      const uniqueBacklinks = this.deduplicateBacklinks(allBacklinks);
      
      // 4. Store in database
      for (const backlink of uniqueBacklinks) {
        await this.storeBacklink(backlink);
      }
      
      console.log(`✓ Found ${uniqueBacklinks.length} backlinks`);
      
      return {
        success: true,
        total: uniqueBacklinks.length,
        bySource: this.groupBySource(uniqueBacklinks)
      };
      
    } catch (error) {
      console.error('❌ Backlink crawl failed:', error.message);
      throw error;
    }
  }

  async searchGoogleForMentions() {
    // Note: This is a basic implementation
    // For production, use proper Google Search Console API or commercial backlink tools
    
    const backlinks = [];
    const searchQueries = [
      `"${this.domain}"`,
      `"finaceverse"`,
      `"FinACE Group"`
    ];
    
    for (const query of searchQueries) {
      try {
        // Simple Google search (limited results without API)
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SEO-Bot/1.0)'
          },
          timeout: this.timeout
        });
        
        if (!response.ok) continue;
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Extract search result links
        $('a[href^="/url?q="]').each((i, elem) => {
          const href = $(elem).attr('href');
          const match = href.match(/\/url\?q=([^&]+)/);
          if (match && match[1]) {
            const decodedUrl = decodeURIComponent(match[1]);
            if (!decodedUrl.includes(this.domain)) {
              backlinks.push({
                source_url: decodedUrl,
                anchor_text: $(elem).text().trim(),
                discovered_via: 'google_search',
                status: 'discovered',
                domain_authority: null,
                is_dofollow: null
              });
            }
          }
        });
        
      } catch (error) {
        console.log(`⚠️ Failed to search Google for "${query}":`, error.message);
      }
    }
    
    return backlinks;
  }

  async checkSocialMedia() {
    const backlinks = [];
    
    // Check major social platforms for mentions
    const socialUrls = [
      { url: 'https://www.linkedin.com/search/results/content/?keywords=finaceverse', platform: 'linkedin' },
      { url: 'https://twitter.com/search?q=finaceverse', platform: 'twitter' },
      { url: 'https://www.reddit.com/search/?q=finaceverse', platform: 'reddit' }
    ];
    
    for (const social of socialUrls) {
      try {
        const response = await fetch(social.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SEO-Bot/1.0)'
          },
          timeout: this.timeout
        });
        
        if (response.ok) {
          backlinks.push({
            source_url: social.url,
            anchor_text: `${social.platform} mentions`,
            discovered_via: 'social_media',
            status: 'discovered',
            domain_authority: this.getSocialDA(social.platform),
            is_dofollow: false // Social media links are typically nofollow
          });
        }
      } catch (error) {
        console.log(`⚠️ Failed to check ${social.platform}:`, error.message);
      }
    }
    
    return backlinks;
  }

  getSocialDA(platform) {
    // Approximate domain authority for major platforms
    const daMap = {
      'linkedin': 95,
      'twitter': 93,
      'reddit': 91,
      'facebook': 96
    };
    return daMap[platform] || null;
  }

  deduplicateBacklinks(backlinks) {
    const seen = new Set();
    return backlinks.filter(link => {
      if (seen.has(link.source_url)) {
        return false;
      }
      seen.add(link.source_url);
      return true;
    });
  }

  groupBySource(backlinks) {
    const groups = {};
    for (const link of backlinks) {
      const source = link.discovered_via;
      if (!groups[source]) {
        groups[source] = 0;
      }
      groups[source]++;
    }
    return groups;
  }

  async storeBacklink(backlink) {
    // Check if backlink already exists
    const existing = await this.pool.query(
      'SELECT id FROM backlink_monitor WHERE source_url = $1 AND target_url = $2',
      [backlink.source_url, `https://${this.domain}`]
    );
    
    if (existing.rows.length > 0) {
      // Update existing
      await this.pool.query(
        `UPDATE backlink_monitor SET last_checked = NOW(), status = $1 WHERE id = $2`,
        [backlink.status, existing.rows[0].id]
      );
    } else {
      // Insert new
      await this.pool.query(
        `INSERT INTO backlink_monitor 
         (source_url, target_url, anchor_text, discovered_via, status, domain_authority, is_dofollow, first_seen, last_checked)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [
          backlink.source_url,
          `https://${this.domain}`,
          backlink.anchor_text,
          backlink.discovered_via,
          backlink.status,
          backlink.domain_authority,
          backlink.is_dofollow
        ]
      );
    }
  }

  async getBacklinkStats() {
    const result = await this.pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_dofollow = true THEN 1 END) as dofollow_count,
        AVG(domain_authority) as avg_da,
        COUNT(DISTINCT source_url) as unique_domains,
        discovered_via,
        COUNT(*) as count_by_source
      FROM backlink_monitor
      GROUP BY discovered_via
    `);
    
    return result.rows;
  }

  async getTopBacklinks(limit = 10) {
    const result = await this.pool.query(`
      SELECT source_url, anchor_text, domain_authority, is_dofollow, first_seen
      FROM backlink_monitor
      WHERE status = 'active'
      ORDER BY domain_authority DESC NULLS LAST
      LIMIT $1
    `, [limit]);
    
    return result.rows;
  }

  async checkBacklinkHealth() {
    // Check if previously discovered backlinks are still active
    const result = await this.pool.query(`
      SELECT id, source_url, target_url
      FROM backlink_monitor
      WHERE status = 'active'
      AND last_checked < NOW() - INTERVAL '7 days'
    `);
    
    for (const backlink of result.rows) {
      try {
        const response = await fetch(backlink.source_url, {
          timeout: this.timeout,
          redirect: 'follow'
        });
        
        if (response.ok) {
          const html = await response.text();
          const $ = cheerio.load(html);
          
          // Check if link to our domain still exists
          const hasLink = $(`a[href*="${this.domain}"]`).length > 0;
          
          const newStatus = hasLink ? 'active' : 'lost';
          
          await this.pool.query(
            `UPDATE backlink_monitor SET status = $1, last_checked = NOW() WHERE id = $2`,
            [newStatus, backlink.id]
          );
          
        } else {
          // Source URL is down
          await this.pool.query(
            `UPDATE backlink_monitor SET status = 'broken', last_checked = NOW() WHERE id = $1`,
            [backlink.id]
          );
        }
        
      } catch (error) {
        console.log(`⚠️ Failed to check backlink ${backlink.source_url}`);
      }
    }
    
    console.log(`✓ Checked health of ${result.rows.length} backlinks`);
  }
}

// CLI entry point
if (require.main === module) {
  const crawler = new BacklinkCrawler();
  crawler.crawlBacklinks()
    .then(result => {
      console.log('✓ Crawl result:', result);
      return crawler.getBacklinkStats();
    })
    .then(stats => {
      console.log('📊 Backlink stats:', stats);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Crawl failed:', error);
      process.exit(1);
    });
}

module.exports = BacklinkCrawler;
