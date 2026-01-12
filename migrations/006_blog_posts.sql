-- ============================================================================
-- BLOG POSTS TABLE
-- Migration for Blog Management System
-- ============================================================================

-- Blog Posts Table
CREATE TABLE IF NOT EXISTS blog_posts (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    excerpt TEXT,
    content TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'Technology',
    author VARCHAR(200) NOT NULL DEFAULT 'FinACEverse Team',
    image_url TEXT,
    
    -- SEO Fields
    meta_title VARCHAR(70),
    meta_description VARCHAR(160),
    meta_keywords TEXT,
    
    -- Status Fields
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    featured BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    
    -- Audit
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(featured) WHERE featured = TRUE;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_blog_posts_search ON blog_posts USING gin(to_tsvector('english', title || ' ' || COALESCE(excerpt, '') || ' ' || COALESCE(content, '')));

-- Insert initial blog posts (migrate from hardcoded data)
INSERT INTO blog_posts (slug, title, excerpt, category, author, image_url, status, published_at, created_at) VALUES
    ('why-cognitive-operating-systems-are-future', 'Why Cognitive Operating Systems Are the Future of Finance', 'Traditional accounting software was built for record-keeping. The future demands intelligent systems that think, learn, and act.', 'Industry Insights', 'Vithal Valluri', 'https://images.pexels.com/photos/30547577/pexels-photo-30547577.jpeg?auto=compress&cs=tinysrgb&w=1500', 'published', '2026-01-05', NOW()),
    ('ai-workforce-multiplier-explained', 'The AI Workforce Multiplier: What It Is and Why It Matters', 'Understanding how AI can make one accountant as productive as ten—without replacing a single human.', 'Technology', 'FinACEverse Team', 'https://images.pexels.com/photos/30547598/pexels-photo-30547598.jpeg?auto=compress&cs=tinysrgb&w=1500', 'published', '2026-01-03', NOW()),
    ('pilot-program-results-2-5x-capacity', 'Pilot Program Results: 2.5x Capacity Uplift Without New Hires', 'Early adopters share their experience implementing FinACEverse and the results they''ve achieved.', 'Case Studies', 'FinACEverse Research', 'https://images.pexels.com/photos/30547606/pexels-photo-30547606.jpeg?auto=compress&cs=tinysrgb&w=1500', 'published', '2025-12-28', NOW()),
    ('process-mining-accounting-firms', 'Process Mining for Accounting Firms: Finding Hidden Inefficiencies', 'How EPI-Q reveals the actual workflows in your firm—and why they''re probably different from what you think.', 'Technology', 'FinACEverse Team', 'https://images.pexels.com/photos/30547577/pexels-photo-30547577.jpeg?auto=compress&cs=tinysrgb&w=1500', 'published', '2025-12-20', NOW())
ON CONFLICT (slug) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER trigger_blog_posts_updated_at
    BEFORE UPDATE ON blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_blog_posts_updated_at();

-- ============================================================================
-- BLOG CATEGORIES TABLE (for dynamic categories)
-- ============================================================================
CREATE TABLE IF NOT EXISTS blog_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#00d4ff',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO blog_categories (name, slug, color) VALUES
    ('Technology', 'technology', '#00d4ff'),
    ('Industry Insights', 'industry-insights', '#8b5cf6'),
    ('Case Studies', 'case-studies', '#10b981'),
    ('Compliance', 'compliance', '#f59e0b'),
    ('Product Updates', 'product-updates', '#ec4899')
ON CONFLICT (slug) DO NOTHING;
