-- SEO AI Infrastructure Database Schema
-- Migration: 002_seo_tables.sql
-- Description: Core SEO monitoring and optimization tables

-- Target keyword tracking with positions
CREATE TABLE IF NOT EXISTS target_keywords (
  id SERIAL PRIMARY KEY,
  keyword TEXT NOT NULL,
  keyword_type VARCHAR(50), -- 'primary', 'long-tail', 'semantic'
  target_page VARCHAR(500),
  search_volume INTEGER,
  difficulty INTEGER, -- 0-100
  current_position INTEGER,
  best_position INTEGER,
  
  -- Optimization tracking
  optimized_in_h1 BOOLEAN DEFAULT FALSE,
  optimized_in_h2 BOOLEAN DEFAULT FALSE,
  optimized_in_first_100_words BOOLEAN DEFAULT FALSE,
  optimized_in_alt_text BOOLEAN DEFAULT FALSE,
  optimized_in_url BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content analysis
CREATE TABLE IF NOT EXISTS content_analysis (
  id SERIAL PRIMARY KEY,
  page_url VARCHAR(500),
  word_count INTEGER,
  keyword_density JSONB,
  readability_score DECIMAL,
  heading_structure JSONB,
  internal_links INTEGER,
  external_links INTEGER,
  images_count INTEGER,
  images_without_alt INTEGER,
  meta_title TEXT,
  meta_description TEXT,
  seo_score INTEGER, -- 0-100
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backlink monitoring
CREATE TABLE IF NOT EXISTS backlink_monitor (
  id SERIAL PRIMARY KEY,
  source_url TEXT,
  target_url VARCHAR(500),
  anchor_text TEXT,
  domain_authority INTEGER,
  discovered_at TIMESTAMP,
  status VARCHAR(20), -- active, lost, broken
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SEO issues tracking
CREATE TABLE IF NOT EXISTS seo_issues (
  id SERIAL PRIMARY KEY,
  issue_type VARCHAR(100),
  severity VARCHAR(20), -- critical, high, medium, low
  page_url VARCHAR(500),
  description TEXT,
  recommendation TEXT,
  auto_fixable BOOLEAN,
  fixed BOOLEAN DEFAULT FALSE,
  fixed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI insights and recommendations
CREATE TABLE IF NOT EXISTS ai_insights (
  id SERIAL PRIMARY KEY,
  insight_type VARCHAR(100), -- 'keyword_opportunity', 'content_gap', 'ranking_prediction'
  title TEXT,
  description TEXT,
  data JSONB,
  priority INTEGER, -- 1-5
  acted_upon BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User brainstorm sessions with AI
CREATE TABLE IF NOT EXISTS user_brainstorm_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  session_topic TEXT,
  messages JSONB, -- Array of {role: 'user'|'ai', content: '...'}
  insights_generated JSONB,
  actions_taken JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SEO actions log
CREATE TABLE IF NOT EXISTS seo_actions (
  id SERIAL PRIMARY KEY,
  action_type VARCHAR(100), -- 'keyword_added', 'content_updated', 'link_built'
  page_url VARCHAR(500),
  description TEXT,
  before_data JSONB,
  after_data JSONB,
  impact_measured BOOLEAN DEFAULT FALSE,
  impact_data JSONB,
  performed_by VARCHAR(50), -- 'ai', 'user'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Keyword rankings history
CREATE TABLE IF NOT EXISTS keyword_rankings_history (
  id SERIAL PRIMARY KEY,
  keyword_id INTEGER REFERENCES target_keywords(id),
  position INTEGER,
  url VARCHAR(500),
  search_volume INTEGER,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_target_keywords_keyword ON target_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_content_analysis_url ON content_analysis(page_url);
CREATE INDEX IF NOT EXISTS idx_backlink_monitor_target ON backlink_monitor(target_url);
CREATE INDEX IF NOT EXISTS idx_seo_issues_severity ON seo_issues(severity);
CREATE INDEX IF NOT EXISTS idx_seo_issues_fixed ON seo_issues(fixed);
CREATE INDEX IF NOT EXISTS idx_ai_insights_priority ON ai_insights(priority);
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_keyword ON keyword_rankings_history(keyword_id);
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_date ON keyword_rankings_history(recorded_at);

-- Insert default target keywords
INSERT INTO target_keywords (keyword, keyword_type, target_page, difficulty) VALUES
('AI-powered accounting software', 'primary', '/', 65),
('automated financial operations platform', 'primary', '/', 58),
('cognitive finance system', 'primary', '/', 52),
('VAMN technology financial automation', 'long-tail', '/modules', 45),
('intelligent accounting automation', 'long-tail', '/modules', 48),
('best AI accounting software for enterprises', 'long-tail', '/request-demo', 62),
('automated financial compliance platform', 'long-tail', '/modules', 55),
('cognitive operating system for finance', 'semantic', '/', 50),
('AI-powered tax compliance automation', 'long-tail', '/modules', 53),
('machine learning financial operations', 'semantic', '/modules', 57),
('automated financial reporting system', 'long-tail', '/modules', 51),
('AI finance automation for CFOs', 'long-tail', '/expert-consultation', 49),
('intelligent financial workflow orchestration', 'semantic', '/modules', 47)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE target_keywords IS 'Tracks target keywords and their optimization status';
COMMENT ON TABLE content_analysis IS 'Stores comprehensive SEO analysis of each page';
COMMENT ON TABLE backlink_monitor IS 'Monitors all backlinks to the site';
COMMENT ON TABLE seo_issues IS 'Tracks SEO issues and their resolution status';
COMMENT ON TABLE ai_insights IS 'AI-generated SEO insights and recommendations';
COMMENT ON TABLE user_brainstorm_sessions IS 'Chat sessions between users and SEO AI';
COMMENT ON TABLE seo_actions IS 'Log of all SEO actions taken';
COMMENT ON TABLE keyword_rankings_history IS 'Historical keyword ranking positions';
