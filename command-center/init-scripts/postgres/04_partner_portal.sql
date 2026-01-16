-- ============================================
-- PARTNER PORTAL - Database Schema
-- PostgreSQL schemas for partner management
-- ============================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS partner_portal;

SET search_path TO partner_portal;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PARTNERS TABLE
-- ============================================

CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(255) NOT NULL,
    partner_type VARCHAR(50) NOT NULL CHECK (partner_type IN ('reseller', 'affiliate', 'referral', 'white_label')),
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    website VARCHAR(500),
    tier VARCHAR(50) NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    commission_type VARCHAR(50) NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'flat', 'tiered')),
    payout_frequency VARCHAR(50) NOT NULL DEFAULT 'monthly' CHECK (payout_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly')),
    payout_method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer' CHECK (payout_method IN ('bank_transfer', 'paypal', 'stripe', 'razorpay')),
    payout_details JSONB NOT NULL DEFAULT '{}',
    total_earnings DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_paid_out DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    pending_payout DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    customer_id VARCHAR(255),
    referral_code VARCHAR(50) NOT NULL UNIQUE,
    onboarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_payout_at TIMESTAMP WITH TIME ZONE,
    contract_start_date DATE NOT NULL,
    contract_end_date DATE,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partners_tenant_id ON partners(tenant_id);
CREATE INDEX idx_partners_email ON partners(email);
CREATE INDEX idx_partners_referral_code ON partners(referral_code);
CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_tier ON partners(tier);

-- ============================================
-- RESELLER CONFIG TABLE
-- ============================================

CREATE TABLE reseller_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    can_create_customers BOOLEAN NOT NULL DEFAULT true,
    can_manage_billing BOOLEAN NOT NULL DEFAULT true,
    can_set_pricing BOOLEAN NOT NULL DEFAULT false,
    discount_authority DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    territory_restriction JSONB DEFAULT '[]',
    product_restrictions JSONB DEFAULT '[]',
    minimum_order_value DECIMAL(15,2),
    credit_limit DECIMAL(15,2),
    customers_managed INTEGER NOT NULL DEFAULT 0,
    active_subscriptions INTEGER NOT NULL DEFAULT 0,
    monthly_recurring_revenue DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(partner_id)
);

-- ============================================
-- AFFILIATE CONFIG TABLE
-- ============================================

CREATE TABLE affiliate_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    cookie_duration INTEGER NOT NULL DEFAULT 30,
    first_purchase_only BOOLEAN NOT NULL DEFAULT true,
    recurring_commission BOOLEAN NOT NULL DEFAULT false,
    recurring_months INTEGER DEFAULT 12,
    product_restrictions JSONB DEFAULT '[]',
    minimum_purchase_value DECIMAL(15,2),
    total_referrals INTEGER NOT NULL DEFAULT 0,
    converted_referrals INTEGER NOT NULL DEFAULT 0,
    conversion_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    average_order_value DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(partner_id)
);

-- ============================================
-- WHITE-LABEL CONFIG TABLE
-- ============================================

CREATE TABLE white_label_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    brand_name VARCHAR(255) NOT NULL,
    logo_primary VARCHAR(500),
    logo_secondary VARCHAR(500),
    logo_favicon VARCHAR(500),
    color_primary VARCHAR(7) NOT NULL DEFAULT '#1a73e8',
    color_secondary VARCHAR(7) NOT NULL DEFAULT '#34a853',
    color_accent VARCHAR(7) NOT NULL DEFAULT '#fbbc04',
    color_background VARCHAR(7) NOT NULL DEFAULT '#ffffff',
    color_text VARCHAR(7) NOT NULL DEFAULT '#202124',
    domain VARCHAR(255),
    email_domain VARCHAR(255),
    email_template_welcome TEXT,
    email_template_invoice TEXT,
    email_template_password_reset TEXT,
    support_email VARCHAR(255) NOT NULL,
    support_phone VARCHAR(50),
    legal_entity VARCHAR(255) NOT NULL,
    terms_url VARCHAR(500),
    privacy_url VARCHAR(500),
    hide_finaceverse_branding BOOLEAN NOT NULL DEFAULT false,
    custom_dashboard BOOLEAN NOT NULL DEFAULT false,
    custom_reports BOOLEAN NOT NULL DEFAULT false,
    api_access BOOLEAN NOT NULL DEFAULT false,
    customers_onboarded INTEGER NOT NULL DEFAULT 0,
    branded_domain VARCHAR(255),
    ssl_issuer VARCHAR(255),
    ssl_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(partner_id)
);

-- ============================================
-- PARTNER TIERS CONFIG TABLE
-- ============================================

CREATE TABLE partner_tier_configs (
    tier VARCHAR(50) PRIMARY KEY CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
    name VARCHAR(100) NOT NULL,
    minimum_monthly_revenue DECIMAL(15,2) NOT NULL,
    minimum_customers INTEGER NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    bonus_commission_rate DECIMAL(5,2) DEFAULT 0.00,
    benefits JSONB NOT NULL DEFAULT '[]',
    support_level VARCHAR(50) NOT NULL DEFAULT 'standard' CHECK (support_level IN ('standard', 'priority', 'dedicated')),
    dedicated_account_manager BOOLEAN NOT NULL DEFAULT false,
    co_marketing_budget DECIMAL(15,2),
    custom_integrations BOOLEAN NOT NULL DEFAULT false,
    api_rate_limit INTEGER NOT NULL DEFAULT 1000,
    certification_required BOOLEAN NOT NULL DEFAULT false,
    minimum_team_size INTEGER,
    case_studies_required INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default tier configurations
INSERT INTO partner_tier_configs (tier, name, minimum_monthly_revenue, minimum_customers, commission_rate, support_level, api_rate_limit)
VALUES 
('bronze', 'Bronze Partner', 0, 0, 10.00, 'standard', 1000),
('silver', 'Silver Partner', 5000, 10, 15.00, 'standard', 2500),
('gold', 'Gold Partner', 25000, 50, 20.00, 'priority', 5000),
('platinum', 'Platinum Partner', 100000, 200, 25.00, 'dedicated', 10000),
('diamond', 'Diamond Partner', 500000, 1000, 30.00, 'dedicated', 25000);

-- ============================================
-- COMMISSIONS TABLE
-- ============================================

CREATE TABLE commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    customer_id VARCHAR(255) NOT NULL,
    subscription_id VARCHAR(255),
    invoice_id VARCHAR(255),
    type VARCHAR(50) NOT NULL CHECK (type IN ('signup', 'recurring', 'upsell', 'renewal', 'referral')),
    amount DECIMAL(15,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    payout_id UUID,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_commissions_partner_id ON commissions(partner_id);
CREATE INDEX idx_commissions_customer_id ON commissions(customer_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_payout_id ON commissions(payout_id);
CREATE INDEX idx_commissions_created_at ON commissions(created_at);

-- ============================================
-- PAYOUTS TABLE
-- ============================================

CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    method VARCHAR(50) NOT NULL CHECK (method IN ('bank_transfer', 'paypal', 'stripe', 'razorpay')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
    commission_ids JSONB NOT NULL DEFAULT '[]',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    initiated_by VARCHAR(255) NOT NULL,
    initiated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    transaction_id VARCHAR(255),
    failure_reason TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payouts_partner_id ON payouts(partner_id);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_initiated_at ON payouts(initiated_at);

-- ============================================
-- REFERRALS TABLE
-- ============================================

CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    referral_code VARCHAR(50) NOT NULL,
    visitor_id VARCHAR(255),
    session_id VARCHAR(255),
    landing_url TEXT NOT NULL,
    referrer_url TEXT,
    ip_address INET,
    user_agent TEXT,
    country VARCHAR(2),
    converted BOOLEAN NOT NULL DEFAULT false,
    customer_id VARCHAR(255),
    conversion_value DECIMAL(15,2),
    conversion_date TIMESTAMP WITH TIME ZONE,
    commission_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referrals_partner_id ON referrals(partner_id);
CREATE INDEX idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX idx_referrals_customer_id ON referrals(customer_id);
CREATE INDEX idx_referrals_converted ON referrals(converted);
CREATE INDEX idx_referrals_created_at ON referrals(created_at);

-- ============================================
-- PARTNER METRICS TABLE (Materialized)
-- ============================================

CREATE TABLE partner_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_referrals INTEGER NOT NULL DEFAULT 0,
    converted_referrals INTEGER NOT NULL DEFAULT 0,
    conversion_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    total_revenue DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_commissions DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    average_order_value DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    active_customers INTEGER NOT NULL DEFAULT 0,
    churned_customers INTEGER NOT NULL DEFAULT 0,
    net_promoter_score DECIMAL(5,2),
    customers_at_risk INTEGER DEFAULT 0,
    top_products JSONB DEFAULT '[]',
    top_customers JSONB DEFAULT '[]',
    rank_in_tier INTEGER,
    next_tier_progress JSONB,
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(partner_id, period_start, period_end)
);

CREATE INDEX idx_partner_metrics_partner_id ON partner_metrics(partner_id);
CREATE INDEX idx_partner_metrics_period ON partner_metrics(period_start, period_end);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reseller_configs_updated_at BEFORE UPDATE ON reseller_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliate_configs_updated_at BEFORE UPDATE ON affiliate_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_white_label_configs_updated_at BEFORE UPDATE ON white_label_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON commissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTIONS FOR METRICS CALCULATION
-- ============================================

CREATE OR REPLACE FUNCTION calculate_partner_metrics(p_partner_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS void AS $$
DECLARE
    v_total_referrals INTEGER;
    v_converted_referrals INTEGER;
    v_total_revenue DECIMAL(15,2);
    v_total_commissions DECIMAL(15,2);
BEGIN
    -- Calculate metrics
    SELECT COUNT(*), SUM(CASE WHEN converted THEN 1 ELSE 0 END), COALESCE(SUM(conversion_value), 0)
    INTO v_total_referrals, v_converted_referrals, v_total_revenue
    FROM referrals
    WHERE partner_id = p_partner_id 
      AND created_at >= p_start_date 
      AND created_at < p_end_date + INTERVAL '1 day';

    SELECT COALESCE(SUM(commission_amount), 0)
    INTO v_total_commissions
    FROM commissions
    WHERE partner_id = p_partner_id
      AND created_at >= p_start_date
      AND created_at < p_end_date + INTERVAL '1 day';

    -- Insert or update metrics
    INSERT INTO partner_metrics (
        partner_id, period_start, period_end, 
        total_referrals, converted_referrals,
        conversion_rate, total_revenue, total_commissions,
        average_order_value
    ) VALUES (
        p_partner_id, p_start_date, p_end_date,
        v_total_referrals, v_converted_referrals,
        CASE WHEN v_total_referrals > 0 THEN (v_converted_referrals::DECIMAL / v_total_referrals * 100) ELSE 0 END,
        v_total_revenue, v_total_commissions,
        CASE WHEN v_converted_referrals > 0 THEN (v_total_revenue / v_converted_referrals) ELSE 0 END
    )
    ON CONFLICT (partner_id, period_start, period_end) 
    DO UPDATE SET
        total_referrals = EXCLUDED.total_referrals,
        converted_referrals = EXCLUDED.converted_referrals,
        conversion_rate = EXCLUDED.conversion_rate,
        total_revenue = EXCLUDED.total_revenue,
        total_commissions = EXCLUDED.total_commissions,
        average_order_value = EXCLUDED.average_order_value,
        calculated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA partner_portal TO partner_portal;
GRANT ALL ON ALL TABLES IN SCHEMA partner_portal TO partner_portal;
GRANT ALL ON ALL SEQUENCES IN SCHEMA partner_portal TO partner_portal;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA partner_portal TO partner_portal;
