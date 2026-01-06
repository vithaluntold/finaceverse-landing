-- Local SEO Database Schema
-- Migration: 003_local_seo.sql
-- Description: Multi-country local SEO tracking

-- Local SEO presence for multiple countries
CREATE TABLE IF NOT EXISTS local_seo_presence (
  id SERIAL PRIMARY KEY,
  country VARCHAR(100), -- 'United States', 'Canada', 'UAE', etc.
  country_code VARCHAR(5), -- 'US', 'CA', 'AE', 'SG', 'SA', 'TR', 'IN', 'ID', 'PH'
  
  -- Local presence
  google_business_profile_id VARCHAR(255),
  google_business_status VARCHAR(50), -- 'pending', 'verified', 'active'
  google_business_url TEXT,
  
  -- Local listings
  local_directories JSONB, -- Array of directory listings
  local_citations INTEGER DEFAULT 0,
  
  -- Local rankings
  local_keywords JSONB, -- Keywords specific to this location
  avg_local_position DECIMAL,
  
  -- Landing pages
  location_landing_page TEXT,
  location_content_quality INTEGER, -- 0-100 score
  
  -- Local backlinks
  local_backlinks INTEGER DEFAULT 0,
  local_partnerships TEXT[],
  
  -- Performance
  local_organic_traffic INTEGER DEFAULT 0,
  local_conversions INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- UX metrics and optimization
CREATE TABLE IF NOT EXISTS ux_metrics (
  id SERIAL PRIMARY KEY,
  page_url VARCHAR(500),
  
  -- User behavior
  avg_time_on_page INTEGER, -- seconds
  bounce_rate DECIMAL,
  exit_rate DECIMAL,
  scroll_depth_avg INTEGER, -- percentage
  
  -- Engagement
  cta_clicks INTEGER DEFAULT 0,
  cta_conversion_rate DECIMAL,
  form_starts INTEGER DEFAULT 0,
  form_completions INTEGER DEFAULT 0,
  form_abandonment_rate DECIMAL,
  
  -- Navigation
  internal_link_clicks INTEGER DEFAULT 0,
  navigation_clicks JSONB,
  
  -- Issues
  rage_clicks INTEGER DEFAULT 0, -- Frustrated clicking
  dead_clicks INTEGER DEFAULT 0, -- Clicks on non-interactive elements
  
  measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Local directory listings
CREATE TABLE IF NOT EXISTS local_directory_listings (
  id SERIAL PRIMARY KEY,
  country_code VARCHAR(5),
  directory_name VARCHAR(255),
  directory_url TEXT,
  category VARCHAR(100),
  
  -- Submission
  submission_status VARCHAR(50), -- 'pending', 'submitted', 'approved', 'rejected', 'live'
  submission_date TIMESTAMP,
  approval_date TIMESTAMP,
  listing_url TEXT,
  
  -- Value
  domain_authority INTEGER,
  do_follow BOOLEAN,
  
  -- Performance
  monthly_clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- City-specific pages for local SEO
CREATE TABLE IF NOT EXISTS city_pages (
  id SERIAL PRIMARY KEY,
  country_code VARCHAR(5),
  city_name VARCHAR(255),
  page_url TEXT,
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  h1_content TEXT,
  
  -- Content
  content_quality_score INTEGER, -- 0-100
  local_keywords JSONB,
  
  -- Performance
  organic_traffic INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(50), -- 'draft', 'published', 'optimized'
  published_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_local_seo_country ON local_seo_presence(country_code);
CREATE INDEX IF NOT EXISTS idx_ux_metrics_url ON ux_metrics(page_url);
CREATE INDEX IF NOT EXISTS idx_directory_country ON local_directory_listings(country_code);
CREATE INDEX IF NOT EXISTS idx_city_pages_country ON city_pages(country_code);
CREATE INDEX IF NOT EXISTS idx_city_pages_status ON city_pages(status);

-- Insert default local SEO entries for 9 target countries
INSERT INTO local_seo_presence (country, country_code, google_business_status, location_landing_page) VALUES
('United States', 'US', 'pending', '/us'),
('Canada', 'CA', 'pending', '/ca'),
('United Arab Emirates', 'AE', 'pending', '/ae'),
('Singapore', 'SG', 'pending', '/sg'),
('Saudi Arabia', 'SA', 'pending', '/sa'),
('Turkey', 'TR', 'pending', '/tr'),
('India', 'IN', 'pending', '/in'),
('Indonesia', 'ID', 'pending', '/id'),
('Philippines', 'PH', 'pending', '/ph')
ON CONFLICT DO NOTHING;

-- Insert default local keywords for each country
UPDATE local_seo_presence SET local_keywords = 
  CASE country_code
    WHEN 'US' THEN '[
      "AI accounting software USA",
      "financial automation software United States",
      "best accounting software for US businesses"
    ]'::jsonb
    WHEN 'CA' THEN '[
      "AI accounting software Canada",
      "financial automation Toronto",
      "Canadian accounting software"
    ]'::jsonb
    WHEN 'AE' THEN '[
      "AI accounting software Dubai",
      "financial automation UAE",
      "cognitive finance Dubai"
    ]'::jsonb
    WHEN 'SG' THEN '[
      "AI accounting software Singapore",
      "MAS compliant accounting",
      "Singapore fintech automation"
    ]'::jsonb
    WHEN 'SA' THEN '[
      "AI accounting software Saudi Arabia",
      "financial automation Riyadh"
    ]'::jsonb
    WHEN 'TR' THEN '[
      "AI muhasebe yazılımı",
      "financial automation Turkey"
    ]'::jsonb
    WHEN 'IN' THEN '[
      "AI accounting software India",
      "GST automation software",
      "financial automation Bangalore"
    ]'::jsonb
    WHEN 'ID' THEN '[
      "software akuntansi AI Indonesia",
      "automation keuangan"
    ]'::jsonb
    WHEN 'PH' THEN '[
      "AI accounting software Philippines",
      "financial automation Manila"
    ]'::jsonb
  END
WHERE local_keywords IS NULL;

COMMENT ON TABLE local_seo_presence IS 'Tracks local SEO presence across 9 target countries';
COMMENT ON TABLE ux_metrics IS 'User experience metrics for conversion optimization';
COMMENT ON TABLE local_directory_listings IS 'Local business directory submissions';
COMMENT ON TABLE city_pages IS 'City-specific landing pages for local SEO';
