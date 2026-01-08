// Google Search Console Integration
// File: src/seo-ai/gsc-integration.js

const { google } = require('googleapis');
const { Pool } = require('pg');

class GSCIntegration {
  constructor(pool, options = {}) {
    this.pool = pool || new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    this.siteUrl = options.siteUrl || 'https://www.finaceverse.io/';
    
    // Initialize Google Search Console API client
    this.initializeGSC();
  }

  initializeGSC() {
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('⚠️ Google Search Console credentials not configured');
      this.gscClient = null;
      return;
    }
    
    try {
      const auth = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        null,
        process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/webmasters.readonly']
      );
      
      this.searchconsole = google.searchconsole({
        version: 'v1',
        auth: auth
      });
      
      this.gscClient = auth;
      console.log('✓ Google Search Console API initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize GSC:', error.message);
      this.gscClient = null;
    }
  }

  async fetchKeywordRankings(days = 7) {
    if (!this.gscClient) {
      throw new Error('Google Search Console not configured');
    }
    
    console.log(`📊 Fetching keyword rankings for last ${days} days...`);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    try {
      const response = await this.searchconsole.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dimensions: ['query', 'page'],
          rowLimit: 1000,
          dataState: 'final'
        }
      });
      
      const rankings = response.data.rows || [];
      console.log(`✓ Fetched ${rankings.length} keyword rankings`);
      
      // Store rankings in database
      for (const row of rankings) {
        await this.storeKeywordRanking(row);
      }
      
      return {
        success: true,
        total: rankings.length,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
      };
      
    } catch (error) {
      console.error('❌ Failed to fetch GSC data:', error.message);
      throw error;
    }
  }

  async storeKeywordRanking(row) {
    const [query, page] = row.keys;
    const { clicks, impressions, ctr, position } = row;
    
    // Find or create keyword in target_keywords
    let keywordResult = await this.pool.query(
      'SELECT id FROM target_keywords WHERE keyword = $1',
      [query]
    );
    
    let keywordId;
    if (keywordResult.rows.length === 0) {
      // Create new keyword discovered from GSC
      const insertResult = await this.pool.query(
        `INSERT INTO target_keywords (keyword, keyword_type, target_page, search_volume, created_at, updated_at)
         VALUES ($1, 'discovered', $2, $3, NOW(), NOW())
         RETURNING id`,
        [query, page, impressions]
      );
      keywordId = insertResult.rows[0].id;
    } else {
      keywordId = keywordResult.rows[0].id;
    }
    
    // Store the ranking
    await this.pool.query(
      `INSERT INTO keyword_rankings_history 
       (keyword_id, url, position, search_volume, recorded_at, clicks, impressions, ctr)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)`,
      [keywordId, page, Math.round(position), impressions, clicks, impressions, ctr]
    );
  }

  async getKeywordTrends(keyword, days = 30) {
    const result = await this.pool.query(`
      SELECT 
        ranking_date::date as date,
        AVG(ranking_position) as avg_position,
        SUM(clicks) as total_clicks,
        SUM(impressions) as total_impressions,
        AVG(ctr) as avg_ctr
      FROM keyword_rankings_history krh
      JOIN target_keywords tk ON tk.id = krh.keyword_id
      WHERE tk.keyword_text = $1
      AND ranking_date > NOW() - INTERVAL '${days} days'
      GROUP BY ranking_date::date
      ORDER BY date DESC
    `, [keyword]);
    
    return result.rows;
  }

  async getTopKeywords(limit = 20) {
    const result = await this.pool.query(`
      SELECT 
        tk.keyword_text,
        AVG(krh.ranking_position) as avg_position,
        SUM(krh.clicks) as total_clicks,
        SUM(krh.impressions) as total_impressions,
        AVG(krh.ctr) as avg_ctr,
        COUNT(*) as data_points
      FROM target_keywords tk
      JOIN keyword_rankings_history krh ON krh.keyword_id = tk.id
      WHERE krh.ranking_date > NOW() - INTERVAL '7 days'
      GROUP BY tk.keyword_text
      ORDER BY total_clicks DESC
      LIMIT $1
    `, [limit]);
    
    return result.rows;
  }

  async getKeywordOpportunities() {
    // Find keywords ranking 11-30 (page 2-3) that could be optimized to page 1
    const result = await this.pool.query(`
      SELECT 
        tk.keyword_text,
        AVG(krh.ranking_position) as avg_position,
        SUM(krh.impressions) as total_impressions,
        krh.page_url
      FROM target_keywords tk
      JOIN keyword_rankings_history krh ON krh.keyword_id = tk.id
      WHERE krh.ranking_date > NOW() - INTERVAL '7 days'
      GROUP BY tk.keyword_text, krh.page_url
      HAVING AVG(krh.ranking_position) BETWEEN 11 AND 30
      AND SUM(krh.impressions) > 100
      ORDER BY total_impressions DESC, avg_position ASC
      LIMIT 10
    `);
    
    return result.rows;
  }

  async getPerformanceSummary() {
    const result = await this.pool.query(`
      SELECT 
        COUNT(DISTINCT tk.id) as tracked_keywords,
        AVG(krh.position) as avg_position,
        SUM(krh.clicks) as total_clicks,
        SUM(krh.impressions) as total_impressions,
        AVG(krh.ctr) as avg_ctr,
        COUNT(CASE WHEN krh.position <= 3 THEN 1 END) as top_3_rankings,
        COUNT(CASE WHEN krh.position <= 10 THEN 1 END) as top_10_rankings
      FROM target_keywords tk
      LEFT JOIN keyword_rankings_history krh ON krh.keyword_id = tk.id
      WHERE krh.recorded_at > NOW() - INTERVAL '7 days'
    `);
    
    return result.rows[0];
  }

  async syncTargetKeywords() {
    // Sync top performing queries from GSC to target_keywords table
    if (!this.gscClient) {
      throw new Error('Google Search Console not configured');
    }
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    const response = await this.searchconsole.searchanalytics.query({
      siteUrl: this.siteUrl,
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['query'],
        rowLimit: 100
      }
    });
    
    const queries = response.data.rows || [];
    let addedCount = 0;
    
    for (const row of queries) {
      const query = row.keys[0];
      const { clicks, impressions } = row;
      
      // Add high-performing queries as target keywords
      if (clicks > 10 || impressions > 100) {
        await this.pool.query(
          `INSERT INTO target_keywords (keyword_text, priority, category, search_volume, competition_level, added_at)
           VALUES ($1, 'medium', 'discovered', $2, 'unknown', NOW())
           ON CONFLICT (keyword_text) DO NOTHING`,
          [query, impressions]
        );
        addedCount++;
      }
    }
    
    console.log(`✓ Added ${addedCount} new keywords from GSC`);
    return addedCount;
  }
}

// CLI entry point
if (require.main === module) {
  const gsc = new GSCIntegration();
  
  gsc.fetchKeywordRankings(7)
    .then(result => {
      console.log('✓ Fetch result:', result);
      return gsc.getPerformanceSummary();
    })
    .then(summary => {
      console.log('📊 Performance summary:', summary);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ GSC integration failed:', error);
      process.exit(1);
    });
}

module.exports = GSCIntegration;
