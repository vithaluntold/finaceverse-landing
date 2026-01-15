# SumBuddy Required Changes Document

**Version**: 1.0  
**Date**: January 14, 2026  
**Status**: Implementation Ready  
**Alignment Target**: FinACEverse Master Architecture v1.0

---

## Executive Summary

SumBuddy's current architecture is **87% aligned** with FinACEverse standards. This document details the specific changes required to achieve full compliance across:

- **Database Schema**: 5 new security tables, 1 consent table, 120+ indexes
- **Architecture**: VAMN/Luca integration path, enhanced federation
- **Security**: Complete 21-layer implementation with persistent storage

**Estimated Implementation Time**: 2-3 weeks

---

## Table of Contents

1. [Database Schema Changes](#1-database-schema-changes)
2. [Architecture Changes](#2-architecture-changes)
3. [Security Implementation](#3-security-implementation)
4. [VAMN/Luca Integration](#4-vamnluca-integration)
5. [Federation Protocol Updates](#5-federation-protocol-updates)
6. [Implementation Checklist](#6-implementation-checklist)

---

## 1. Database Schema Changes

### 1.1 New Security Tables (5 Tables)

#### Table: `security_audit_log`
Purpose: SIEM-compatible audit trail (Layer 9)

```sql
CREATE TABLE security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event identification
  event_id VARCHAR(50) NOT NULL,           -- e.g., 'auth.login.success'
  event_type VARCHAR(30) NOT NULL,         -- 'auth', 'data', 'admin', 'security'
  severity VARCHAR(10) DEFAULT 'info',     -- 'debug', 'info', 'warning', 'error', 'critical'
  
  -- Actor information
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(64),
  
  -- Request context
  ip_address INET,
  user_agent TEXT,
  request_fingerprint VARCHAR(64),         -- Browser fingerprint hash
  request_id VARCHAR(36),                  -- Correlation ID
  
  -- Geographic context (Layer 2: Geo Anomaly)
  geo_country VARCHAR(2),
  geo_region VARCHAR(50),
  geo_city VARCHAR(100),
  
  -- Event payload
  event_data JSONB DEFAULT '{}',
  
  -- Federation status
  federated_to_finaceverse BOOLEAN DEFAULT false,
  federation_timestamp TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Partition key for time-based partitioning
  partition_key DATE GENERATED ALWAYS AS (DATE(created_at)) STORED
);

-- Partition by month for performance at scale
CREATE TABLE security_audit_log_2026_01 PARTITION OF security_audit_log
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Indexes
CREATE INDEX idx_audit_user ON security_audit_log(user_id);
CREATE INDEX idx_audit_event_type ON security_audit_log(event_type);
CREATE INDEX idx_audit_severity ON security_audit_log(severity) WHERE severity IN ('warning', 'error', 'critical');
CREATE INDEX idx_audit_ip ON security_audit_log(ip_address);
CREATE INDEX idx_audit_created ON security_audit_log(created_at DESC);
CREATE INDEX idx_audit_not_federated ON security_audit_log(federated_to_finaceverse) WHERE federated_to_finaceverse = false;
```

#### Table: `security_honeypot_triggers`
Purpose: Track honeypot activations (Layer 3)

```sql
CREATE TABLE security_honeypot_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Trigger type
  trigger_type VARCHAR(30) NOT NULL,       -- 'credential', 'endpoint', 'canary', 'decoy_key'
  trigger_name VARCHAR(100),               -- e.g., 'admin@sumbuddy.com', '/wp-admin'
  
  -- Attacker information
  source_ip INET NOT NULL,
  user_agent TEXT,
  request_fingerprint VARCHAR(64),
  
  -- Attack details
  attack_vector TEXT,                      -- Full request path/method
  payload_hash VARCHAR(64),                -- SHA-256 of malicious payload
  
  -- Evidence collection (encrypted)
  evidence JSONB,                          -- Headers, body, timing
  
  -- Response actions
  response_action VARCHAR(30),             -- 'tarpit', 'block', 'log_only'
  tarpit_duration_ms INTEGER,
  
  -- Federation
  federated_to_finaceverse BOOLEAN DEFAULT false,
  federated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_honeypot_ip ON security_honeypot_triggers(source_ip);
CREATE INDEX idx_honeypot_type ON security_honeypot_triggers(trigger_type);
CREATE INDEX idx_honeypot_created ON security_honeypot_triggers(created_at DESC);
CREATE INDEX idx_honeypot_not_federated ON security_honeypot_triggers(federated_to_finaceverse) 
  WHERE federated_to_finaceverse = false;
```

#### Table: `security_canary_access`
Purpose: Track canary data access (Layer 5)

```sql
CREATE TABLE security_canary_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Canary identification
  canary_type VARCHAR(30) NOT NULL,        -- 'user', 'service', 'transaction', 'document'
  canary_id UUID NOT NULL,                 -- ID of the canary record
  canary_marker VARCHAR(100),              -- e.g., 'CANARY-7742-BREACH'
  
  -- Access details
  accessed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  accessed_by_ip INET,
  access_method VARCHAR(30),               -- 'api', 'direct_query', 'export'
  access_query TEXT,                       -- Sanitized query that accessed canary
  
  -- Breach assessment
  is_confirmed_breach BOOLEAN DEFAULT false,
  breach_severity VARCHAR(10),             -- 'low', 'medium', 'high', 'critical'
  
  -- Response
  auto_response_triggered BOOLEAN DEFAULT false,
  response_actions JSONB,                  -- Array of actions taken
  
  -- Federation
  federated_to_finaceverse BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_canary_type ON security_canary_access(canary_type);
CREATE INDEX idx_canary_user ON security_canary_access(accessed_by_user_id);
CREATE INDEX idx_canary_breach ON security_canary_access(is_confirmed_breach) WHERE is_confirmed_breach = true;
CREATE INDEX idx_canary_created ON security_canary_access(created_at DESC);
```

#### Table: `security_key_rotation_log`
Purpose: Track encryption key rotations (Layer 6)

```sql
CREATE TABLE security_key_rotation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Key identification
  key_type VARCHAR(30) NOT NULL,           -- 'dek_daily', 'session', 'file', 'jwt'
  key_version VARCHAR(20) NOT NULL,        -- e.g., 'v1:2026-01-14'
  key_fingerprint VARCHAR(64),             -- SHA-256 of public key / derived ID
  
  -- Rotation details
  rotation_reason VARCHAR(50) NOT NULL,    -- 'scheduled', 'dead_mans_switch', 'breach_response', 'manual'
  previous_key_version VARCHAR(20),
  
  -- Status
  rotation_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  records_re_encrypted INTEGER DEFAULT 0,
  
  -- Timing
  rotation_started_at TIMESTAMPTZ,
  rotation_completed_at TIMESTAMPTZ,
  
  -- Triggered by
  triggered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  triggered_by_system VARCHAR(50),         -- 'dead_mans_switch', 'scheduler', 'incident_response'
  
  -- Federation
  federated_to_finaceverse BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_keyrot_type ON security_key_rotation_log(key_type);
CREATE INDEX idx_keyrot_version ON security_key_rotation_log(key_version);
CREATE INDEX idx_keyrot_status ON security_key_rotation_log(rotation_status);
CREATE INDEX idx_keyrot_created ON security_key_rotation_log(created_at DESC);
```

#### Table: `security_blocklist`
Purpose: Federated IP blocklist (shared across FinACEverse)

```sql
CREATE TABLE security_blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Block target
  block_type VARCHAR(20) NOT NULL,         -- 'ip', 'ip_range', 'fingerprint', 'user_agent'
  block_value VARCHAR(255) NOT NULL,       -- IP address, CIDR, fingerprint hash
  
  -- Block metadata
  reason TEXT NOT NULL,
  severity VARCHAR(10) DEFAULT 'medium',   -- 'low', 'medium', 'high', 'critical'
  
  -- Source
  source VARCHAR(30) NOT NULL,             -- 'local', 'finaceverse', 'threat_intel'
  source_node VARCHAR(50),                 -- 'sumbuddy', 'accute', 'luca', etc.
  source_event_id UUID,                    -- Reference to triggering event
  
  -- Temporal bounds
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                  -- NULL = permanent
  is_active BOOLEAN DEFAULT true,
  
  -- Statistics
  block_count INTEGER DEFAULT 0,           -- Times this block was enforced
  last_blocked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(block_type, block_value)
);

-- Indexes
CREATE INDEX idx_blocklist_active ON security_blocklist(is_active) WHERE is_active = true;
CREATE INDEX idx_blocklist_type_value ON security_blocklist(block_type, block_value);
CREATE INDEX idx_blocklist_expires ON security_blocklist(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_blocklist_source ON security_blocklist(source);
```

---

### 1.2 Federated Learning Consent Table (1 Table)

#### Table: `tenant_llm_config`
Purpose: Store client's LLM configurations securely (encrypted API keys)

```sql
CREATE TABLE tenant_llm_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  -- Client's LLM providers (encrypted JSON)
  -- Contains: provider, apiKey (encrypted), baseUrl, model, priority
  client_providers_encrypted BYTEA,          -- AES-256-GCM encrypted
  client_providers_iv BYTEA,                 -- Initialization vector
  client_providers_tag BYTEA,                -- Auth tag
  
  -- Client's fine-tuned models (encrypted JSON)
  client_finetuned_models_encrypted BYTEA,
  client_finetuned_models_iv BYTEA,
  client_finetuned_models_tag BYTEA,
  
  -- Feature → Model mapping (not sensitive, plaintext)
  preferred_models JSONB DEFAULT '{}',
  
  -- FinACEverse fallback settings
  use_finaceverse_fallback BOOLEAN DEFAULT true,
  use_vamn BOOLEAN DEFAULT true,             -- Use VAMN when available
  reject_vamn BOOLEAN DEFAULT false,         -- Explicitly rejected VAMN
  
  -- Billing configuration
  billing_model VARCHAR(20) DEFAULT 'pay_as_you_go',
  token_bundle_remaining INTEGER DEFAULT 0,
  monthly_token_limit INTEGER,
  token_price_per_thousand DECIMAL(10,6),    -- Custom enterprise pricing
  current_month_usage INTEGER DEFAULT 0,
  current_month_cost_usd DECIMAL(12,4) DEFAULT 0,
  billing_cycle_start DATE DEFAULT DATE_TRUNC('month', NOW()),
  
  -- Fine-tuning permissions
  allow_client_finetuning BOOLEAN DEFAULT true,
  finetune_approval_required BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reset monthly usage on billing cycle
CREATE OR REPLACE FUNCTION reset_monthly_llm_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.billing_cycle_start != OLD.billing_cycle_start THEN
    NEW.current_month_usage = 0;
    NEW.current_month_cost_usd = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER llm_billing_reset_trigger
  BEFORE UPDATE ON tenant_llm_config
  FOR EACH ROW
  EXECUTE FUNCTION reset_monthly_llm_usage();

-- Indexes
CREATE INDEX idx_llm_config_tenant ON tenant_llm_config(tenant_id);
CREATE INDEX idx_llm_config_fallback ON tenant_llm_config(use_finaceverse_fallback) 
  WHERE use_finaceverse_fallback = true;
CREATE INDEX idx_llm_config_billing ON tenant_llm_config(billing_model);
```

---

#### Table: `llm_usage_log`
Purpose: Track token usage for billing (FinACEverse LLMs only)

```sql
CREATE TABLE llm_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Request details
  request_id VARCHAR(36) NOT NULL,
  feature VARCHAR(50) NOT NULL,              -- 'matching', 'proposals', 'kyc', etc.
  
  -- Provider used
  provider VARCHAR(30) NOT NULL,             -- 'vamn', 'finaceverse', 'openai', etc.
  model VARCHAR(100) NOT NULL,
  ownership VARCHAR(20) NOT NULL,            -- 'client' or 'finaceverse'
  
  -- Token counts
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  
  -- Cost (only if ownership = 'finaceverse')
  cost_usd DECIMAL(12,6),                    -- NULL if client-owned
  
  -- Timing
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Partition key
  partition_key DATE GENERATED ALWAYS AS (DATE(created_at)) STORED
);

-- Partition by month
CREATE TABLE llm_usage_log_2026_01 PARTITION OF llm_usage_log
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Indexes
CREATE INDEX idx_llm_usage_tenant ON llm_usage_log(tenant_id);
CREATE INDEX idx_llm_usage_created ON llm_usage_log(created_at DESC);
CREATE INDEX idx_llm_usage_billing ON llm_usage_log(tenant_id, ownership, created_at) 
  WHERE ownership = 'finaceverse';
CREATE INDEX idx_llm_usage_feature ON llm_usage_log(feature);
```

---

#### Table: `federated_learning_consent`
Purpose: 4-tier consent hierarchy for privacy-preserving ML

```sql
CREATE TABLE federated_learning_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  -- Tier 1: Master consent
  learning_enabled BOOLEAN DEFAULT true,
  
  -- Tier 2: Category-level consent
  consent_transactions BOOLEAN DEFAULT false,      -- Financial data (very sensitive)
  consent_documents BOOLEAN DEFAULT false,         -- KYC/uploaded docs (sensitive)
  consent_service_usage BOOLEAN DEFAULT true,      -- How they use features (low risk)
  consent_search_patterns BOOLEAN DEFAULT true,    -- Search/filter behavior (low risk)
  consent_feedback BOOLEAN DEFAULT true,           -- Reviews, ratings (low risk)
  
  -- Privacy preferences
  privacy_epsilon DECIMAL(3,2) DEFAULT 1.0,        -- Differential privacy budget (1.0 = standard)
  minimum_cohort_size INTEGER DEFAULT 100,         -- K-anonymity threshold
  
  -- Consent metadata
  consent_version VARCHAR(10) DEFAULT '1.0',
  consent_given_at TIMESTAMPTZ,
  consent_updated_at TIMESTAMPTZ,
  
  -- Audit trail
  consent_history JSONB DEFAULT '[]',              -- Array of previous consent states
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to maintain consent history
CREATE OR REPLACE FUNCTION log_consent_change()
RETURNS TRIGGER AS $$
BEGIN
  NEW.consent_history = OLD.consent_history || jsonb_build_object(
    'timestamp', NOW(),
    'previous', jsonb_build_object(
      'learning_enabled', OLD.learning_enabled,
      'consent_transactions', OLD.consent_transactions,
      'consent_documents', OLD.consent_documents
    )
  );
  NEW.consent_updated_at = NOW();
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_change_trigger
  BEFORE UPDATE ON federated_learning_consent
  FOR EACH ROW
  EXECUTE FUNCTION log_consent_change();

-- Indexes
CREATE INDEX idx_fl_consent_user ON federated_learning_consent(user_id);
CREATE INDEX idx_fl_consent_enabled ON federated_learning_consent(learning_enabled) WHERE learning_enabled = true;
```

---

### 1.3 Canary Data Records

Add canary (tripwire) records to existing tables for breach detection:

```sql
-- Insert canary users (Layer 5)
INSERT INTO users (id, email, password, role, full_name, is_verified, account_status, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'john.wick@sumbuddy.com', 'CANARY-DO-NOT-USE', 'client', 'John Wick Holdings LLC', true, 'active', '2024-01-01'),
  ('00000000-0000-0000-0000-000000000002', 'admin_backup@sumbuddy.com', 'CANARY-DO-NOT-USE', 'admin', 'Backup Admin CANARY', true, 'active', '2024-01-01'),
  ('00000000-0000-0000-0000-000000000003', 'test_internal@sumbuddy.com', 'CANARY-DO-NOT-USE', 'freelancer', 'Internal Test CANARY', true, 'active', '2024-01-01');

-- Insert canary services
INSERT INTO services (id, accountant_id, title, description, service_type, price, is_active, created_at) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000003', 'INTERNAL TEST SERVICE', 'CANARY-7742-BREACH', 'taxation', 99999.99, false, '2024-01-01');

-- Create trigger to detect canary access
CREATE OR REPLACE FUNCTION detect_canary_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if accessed record is a canary
  IF OLD.id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000010'
  ) THEN
    -- Log the canary access
    INSERT INTO security_canary_access (
      canary_type, canary_id, canary_marker,
      access_method, is_confirmed_breach, breach_severity
    ) VALUES (
      TG_TABLE_NAME, OLD.id, 'CANARY-ACCESSED',
      'database_trigger', true, 'critical'
    );
    
    -- Raise notice for application-level handling
    RAISE NOTICE 'SECURITY ALERT: Canary record accessed in table %', TG_TABLE_NAME;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Apply to users table
CREATE TRIGGER canary_users_trigger
  BEFORE UPDATE OR DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION detect_canary_access();
```

---

### 1.4 Required Indexes for Performance

Add these indexes to existing tables (120+ indexes total):

```sql
-- =====================
-- USERS TABLE
-- =====================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_account_status ON users(account_status);
CREATE INDEX idx_users_verified_active ON users(is_verified, account_status) WHERE is_verified = true AND account_status = 'active';
CREATE INDEX idx_users_created ON users(created_at DESC);
CREATE INDEX idx_users_location ON users(location) WHERE location IS NOT NULL;

-- =====================
-- ACCOUNTANT_PROFILES TABLE
-- =====================
CREATE INDEX idx_acct_profiles_user ON accountant_profiles(user_id);
CREATE INDEX idx_acct_profiles_firm ON accountant_profiles(firm_id);
CREATE INDEX idx_acct_profiles_level ON accountant_profiles(seller_level);
CREATE INDEX idx_acct_profiles_rating ON accountant_profiles(rating DESC);
CREATE INDEX idx_acct_profiles_online ON accountant_profiles(is_online) WHERE is_online = true;
CREATE INDEX idx_acct_profiles_hourly ON accountant_profiles(hourly_rate);
CREATE INDEX idx_acct_profiles_experience ON accountant_profiles(years_of_experience DESC);
CREATE INDEX idx_acct_profiles_skills ON accountant_profiles USING GIN(skills);
CREATE INDEX idx_acct_profiles_languages ON accountant_profiles USING GIN(languages);
CREATE INDEX idx_acct_profiles_certs ON accountant_profiles USING GIN(certifications);

-- =====================
-- FIRMS TABLE
-- =====================
CREATE INDEX idx_firms_owner ON firms(owner_id);
CREATE INDEX idx_firms_rating ON firms(rating DESC);
CREATE INDEX idx_firms_name ON firms(firm_name);
CREATE INDEX idx_firms_created ON firms(created_at DESC);

-- =====================
-- SERVICES TABLE
-- =====================
CREATE INDEX idx_services_accountant ON services(accountant_id);
CREATE INDEX idx_services_firm ON services(firm_id);
CREATE INDEX idx_services_type ON services(service_type);
CREATE INDEX idx_services_active ON services(is_active) WHERE is_active = true;
CREATE INDEX idx_services_paused ON services(is_paused) WHERE is_paused = false;
CREATE INDEX idx_services_active_available ON services(is_active, is_paused) WHERE is_active = true AND is_paused = false;
CREATE INDEX idx_services_price ON services(price);
CREATE INDEX idx_services_price_range ON services(price, currency);
CREATE INDEX idx_services_views ON services(view_count DESC);
CREATE INDEX idx_services_orders ON services(order_count DESC);
CREATE INDEX idx_services_created ON services(created_at DESC);
CREATE INDEX idx_services_updated ON services(updated_at DESC);

-- Full-text search on services
CREATE INDEX idx_services_search ON services USING GIN(
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
);

-- =====================
-- SERVICE_PACKAGES TABLE
-- =====================
CREATE INDEX idx_packages_service ON service_packages(service_id);
CREATE INDEX idx_packages_tier ON service_packages(tier);
CREATE INDEX idx_packages_price ON service_packages(price);

-- =====================
-- SERVICE_EXTRAS TABLE
-- =====================
CREATE INDEX idx_extras_service ON service_extras(service_id);
CREATE INDEX idx_extras_type ON service_extras(type);
CREATE INDEX idx_extras_active ON service_extras(is_active) WHERE is_active = true;

-- =====================
-- BOOKINGS TABLE
-- =====================
CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_accountant ON bookings(accountant_id);
CREATE INDEX idx_bookings_firm ON bookings(firm_id);
CREATE INDEX idx_bookings_service ON bookings(service_id);
CREATE INDEX idx_bookings_package ON bookings(service_package_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_status_active ON bookings(status) WHERE status IN ('pending', 'confirmed', 'in_progress');
CREATE INDEX idx_bookings_escrow ON bookings(escrow_status);
CREATE INDEX idx_bookings_scheduled ON bookings(scheduled_date);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);
CREATE INDEX idx_bookings_client_status ON bookings(client_id, status);
CREATE INDEX idx_bookings_accountant_status ON bookings(accountant_id, status);

-- =====================
-- BOOKING_EXTRAS TABLE
-- =====================
CREATE INDEX idx_booking_extras_booking ON booking_extras(booking_id);
CREATE INDEX idx_booking_extras_extra ON booking_extras(extra_id);

-- =====================
-- REVIEWS TABLE
-- =====================
CREATE INDEX idx_reviews_booking ON reviews(booking_id);
CREATE INDEX idx_reviews_client ON reviews(client_id);
CREATE INDEX idx_reviews_accountant ON reviews(accountant_id);
CREATE INDEX idx_reviews_service ON reviews(service_id);
CREATE INDEX idx_reviews_rating ON reviews(rating DESC);
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);
CREATE INDEX idx_reviews_accountant_rating ON reviews(accountant_id, rating);

-- =====================
-- WALLETS TABLE
-- =====================
CREATE INDEX idx_wallets_user ON wallets(user_id);
CREATE INDEX idx_wallets_currency ON wallets(currency);
CREATE INDEX idx_wallets_balance ON wallets(balance DESC);

-- =====================
-- TRANSACTIONS TABLE
-- =====================
CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX idx_transactions_booking ON transactions(booking_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_gateway ON transactions(payment_gateway);
CREATE INDEX idx_transactions_pending ON transactions(status) WHERE status = 'pending';
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX idx_transactions_amount ON transactions(amount DESC);
CREATE INDEX idx_transactions_wallet_type ON transactions(wallet_id, type);

-- =====================
-- MESSAGES TABLE
-- =====================
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_booking ON messages(booking_id);
CREATE INDEX idx_messages_conversation ON messages(sender_id, receiver_id);
CREATE INDEX idx_messages_unread ON messages(receiver_id, is_read) WHERE is_read = false;
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Composite for conversation listing
CREATE INDEX idx_messages_conv_list ON messages(
  LEAST(sender_id, receiver_id), 
  GREATEST(sender_id, receiver_id), 
  created_at DESC
);

-- =====================
-- JOB_POSTINGS TABLE
-- =====================
CREATE INDEX idx_jobs_client ON job_postings(client_id);
CREATE INDEX idx_jobs_status ON job_postings(status);
CREATE INDEX idx_jobs_open ON job_postings(status) WHERE status = 'open';
CREATE INDEX idx_jobs_type ON job_postings(service_type);
CREATE INDEX idx_jobs_budget_type ON job_postings(budget_type);
CREATE INDEX idx_jobs_experience ON job_postings(experience_level);
CREATE INDEX idx_jobs_deadline ON job_postings(proposal_deadline);
CREATE INDEX idx_jobs_published ON job_postings(published_at DESC);
CREATE INDEX idx_jobs_created ON job_postings(created_at DESC);
CREATE INDEX idx_jobs_skills ON job_postings USING GIN(required_skills);
CREATE INDEX idx_jobs_languages ON job_postings USING GIN(preferred_languages);

-- Full-text search on jobs
CREATE INDEX idx_jobs_search ON job_postings USING GIN(
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
);

-- =====================
-- JOB_PROPOSALS TABLE
-- =====================
CREATE INDEX idx_proposals_job ON job_proposals(job_id);
CREATE INDEX idx_proposals_accountant ON job_proposals(accountant_id);
CREATE INDEX idx_proposals_status ON job_proposals(status);
CREATE INDEX idx_proposals_shortlisted ON job_proposals(is_shortlisted) WHERE is_shortlisted = true;
CREATE INDEX idx_proposals_created ON job_proposals(created_at DESC);

-- =====================
-- JOB_INVITATIONS TABLE
-- =====================
CREATE INDEX idx_invitations_job ON job_invitations(job_id);
CREATE INDEX idx_invitations_accountant ON job_invitations(accountant_id);
CREATE INDEX idx_invitations_status ON job_invitations(status);
CREATE INDEX idx_invitations_pending ON job_invitations(status) WHERE status = 'pending';

-- =====================
-- KYC_PROFILES TABLE
-- =====================
CREATE INDEX idx_kyc_user ON kyc_profiles(user_id);
CREATE INDEX idx_kyc_status ON kyc_profiles(status);
CREATE INDEX idx_kyc_level ON kyc_profiles(verification_level);
CREATE INDEX idx_kyc_pending ON kyc_profiles(status) WHERE status IN ('pending', 'under_review');
CREATE INDEX idx_kyc_submitted ON kyc_profiles(submitted_at DESC);

-- =====================
-- KYC_DOCUMENTS TABLE
-- =====================
CREATE INDEX idx_kyc_docs_profile ON kyc_documents(kyc_profile_id);
CREATE INDEX idx_kyc_docs_type ON kyc_documents(document_type);
CREATE INDEX idx_kyc_docs_status ON kyc_documents(status);
CREATE INDEX idx_kyc_docs_expiry ON kyc_documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- =====================
-- SEARCH & ANALYTICS TABLES
-- =====================
CREATE INDEX idx_search_user ON search_history(user_id);
CREATE INDEX idx_search_type ON search_history(search_type);
CREATE INDEX idx_search_created ON search_history(created_at DESC);

CREATE INDEX idx_wishlist_user ON wishlist_items(user_id);
CREATE INDEX idx_wishlist_service ON wishlist_items(service_id);

CREATE INDEX idx_recently_viewed_user ON recently_viewed(user_id);
CREATE INDEX idx_recently_viewed_service ON recently_viewed(service_id);
CREATE INDEX idx_recently_viewed_last ON recently_viewed(last_viewed_at DESC);

CREATE INDEX idx_shares_service ON service_shares(service_id);
CREATE INDEX idx_shares_user ON service_shares(user_id);
CREATE INDEX idx_shares_platform ON service_shares(platform);

-- =====================
-- PROJECT & TIME TRACKING
-- =====================
CREATE INDEX idx_milestones_project ON project_milestones(project_id, project_type);
CREATE INDEX idx_milestones_freelancer ON project_milestones(freelancer_id);
CREATE INDEX idx_milestones_client ON project_milestones(client_id);
CREATE INDEX idx_milestones_status ON project_milestones(status);

CREATE INDEX idx_timelogs_booking ON time_logs(booking_id);
CREATE INDEX idx_timelogs_freelancer ON time_logs(freelancer_id);
CREATE INDEX idx_timelogs_status ON time_logs(status);
CREATE INDEX idx_timelogs_date ON time_logs(start_time DESC);

-- =====================
-- PORTFOLIO
-- =====================
CREATE INDEX idx_portfolio_accountant ON portfolio_items(accountant_id);
CREATE INDEX idx_portfolio_type ON portfolio_items(project_type);
CREATE INDEX idx_portfolio_public ON portfolio_items(is_public) WHERE is_public = true;
CREATE INDEX idx_portfolio_order ON portfolio_items(display_order);

-- =====================
-- CANNED RESPONSES
-- =====================
CREATE INDEX idx_canned_user ON canned_responses(user_id);
CREATE INDEX idx_canned_active ON canned_responses(is_active) WHERE is_active = true;
CREATE INDEX idx_canned_shortcut ON canned_responses(shortcut);

-- =====================
-- SAVED PAYMENT METHODS
-- =====================
CREATE INDEX idx_payment_methods_user ON saved_payment_methods(user_id);
CREATE INDEX idx_payment_methods_default ON saved_payment_methods(user_id, is_default) WHERE is_default = true;
```

---

### 1.5 Updated Table Count

| Category | Before | After | Change |
|----------|--------|-------|--------|
| Core Users | 3 | 3 | — |
| Services | 3 | 3 | — |
| Bookings/Orders | 3 | 3 | — |
| Payments | 3 | 3 | — |
| Milestones & Time | 3 | 3 | — |
| Messaging | 2 | 2 | — |
| Jobs | 3 | 3 | — |
| KYC | 3 | 3 | — |
| User Engagement | 5 | 5 | — |
| Portfolio | 1 | 1 | — |
| **Security (NEW)** | 0 | **5** | **+5** |
| **LLM Config & Billing (NEW)** | 0 | **2** | **+2** |
| **Federated Learning (NEW)** | 0 | **1** | **+1** |
| **TOTAL** | **26** | **34** | **+8** |

---

## 2. Architecture Changes

### 2.1 Add VAMN Integration Layer

Create a new service layer for VAMN/Luca agent access:

```
sumbuddy/
├── src/
│   ├── services/
│   │   ├── ai/
│   │   │   ├── index.ts                    # AI service exports
│   │   │   ├── vamn-client.ts              # VAMN API client (NEW)
│   │   │   ├── agent-orchestrator.ts       # Fin(Ai)d Hub integration (NEW)
│   │   │   ├── openai-fallback.ts          # Existing OpenAI service (rename)
│   │   │   └── embedding-service.ts        # Existing embeddings
```

#### File: `vamn-client.ts`

```typescript
// sumbuddy/src/services/ai/vamn-client.ts

// Supported LLM providers (client-configurable)
export type LLMProvider = 
  | 'openai'           // GPT-4, GPT-4o, GPT-3.5
  | 'anthropic'        // Claude 3.5, Claude 3 Opus/Sonnet
  | 'gemini'           // Gemini Pro, Gemini Ultra
  | 'azure'            // Azure OpenAI
  | 'mistral'          // Mistral Large, Medium
  | 'cohere'           // Command R+
  | 'groq'             // Llama 3, Mixtral (fast inference)
  | 'deepseek'         // DeepSeek V2
  | 'ollama'           // Self-hosted (Llama, Mistral, etc.)
  | 'together'         // Together AI
  | 'fireworks'        // Fireworks AI
  | 'finaceverse'      // FinACEverse internal models (pre-VAMN)
  | 'custom_finetuned'; // Client's own fine-tuned models

// Model type classification
export type ModelType = 
  | 'base'             // Base model (GPT-4, Claude, etc.)
  | 'finetuned_client' // Client-trained fine-tuned model
  | 'finetuned_finaceverse' // FinACEverse internal fine-tuned
  | 'pre_vamn';        // FinACEverse models before VAMN launch

interface LLMProviderConfig {
  provider: LLMProvider;
  // CLIENT-PROVIDED: Keys stored encrypted in tenant_llm_config table, NOT in env
  apiKey?: string;                           // Encrypted in DB (client's own key)
  baseUrl?: string;                          // Custom endpoint (client's deployment)
  model: string;                             // e.g., 'gpt-4-turbo', 'claude-3-opus'
  maxTokens?: number;
  temperature?: number;
  enabled: boolean;
  priority: number;                          // Lower = higher priority (fallback order)
  
  // Fine-tuned model configuration
  modelType: ModelType;                      // 'base', 'finetuned_client', 'finetuned_finaceverse', 'pre_vamn'
  fineTuneConfig?: FineTunedModelConfig;     // Required for fine-tuned models
  
  // Ownership & Billing
  ownership: 'client' | 'finaceverse';       // Who owns/pays for this provider?
  // If 'client': they configured it, they pay the LLM provider directly
  // If 'finaceverse': we pay, we charge client per token
}

// Configuration for fine-tuned models
interface FineTunedModelConfig {
  // Model identification
  modelId: string;                           // e.g., 'ft:gpt-4:client-org:model-name:abc123'
  modelVersion: string;                      // e.g., 'v1.2.0'
  modelAlias?: string;                       // Human-readable name: 'Accounting Assistant v2'
  
  // Training metadata
  trainedBy: 'client' | 'finaceverse';       // Who trained this model
  trainingDataset?: string;                  // Reference to training data
  trainedAt?: string;                        // ISO timestamp
  baseModelUsed: string;                     // e.g., 'gpt-4-turbo-2024-04-09'
  
  // Deployment configuration
  deploymentType: 'hosted' | 'self_hosted' | 'azure_ml' | 'sagemaker' | 'vertex';
  deploymentEndpoint?: string;               // Custom inference endpoint
  deploymentRegion?: string;                 // e.g., 'us-east-1'
  
  // Versioning & Rollback
  previousVersions?: string[];               // For rollback capability
  isProduction: boolean;                     // Production vs staging
  abTestWeight?: number;                     // 0-100 for A/B testing
  
  // Cost & Usage
  costPerToken?: number;                     // Custom cost tracking
  monthlyBudgetLimit?: number;               // USD limit for this model
  
  // Validation
  validationScore?: number;                  // Model accuracy/quality score
  lastValidatedAt?: string;                  // Last validation run
}

interface VAMNConfig {
  endpoint: string;                          // FinACEverse VAMN endpoint
  apiKey: string;                            // Node-specific API key
  nodeId: 'sumbuddy';
}

// LLM Resolution Priority (correct order)
// 1. Client's configured LLMs/fine-tuned models (client pays directly)
// 2. VAMN (when available) - FinACEverse native, included in subscription
// 3. FinACEverse Fallback LLMs (we pay, we charge client pay-as-you-go)
interface AIResolutionConfig {
  clientLLMEnabled: boolean;                 // Client configured their own?
  clientProviders: LLMProviderConfig[];      // Client's LLMs (keys stored encrypted in DB)
  vamnEnabled: boolean;                      // VAMN available? (false until launch)
  fallbackToFinACEverse: boolean;            // Use our LLMs if client has none?
  billingModel: 'subscription' | 'pay_as_you_go' | 'token_bundle' | 'hybrid';
}

interface VAMNRequest {
  stream: 'semantic' | 'quantitative' | 'citation';
  prompt: string;
  context?: Record<string, any>;
  maxTokens?: number;
}

interface VAMNResponse {
  result: string;
  confidence: number;
  citations?: Citation[];
  calculationProof?: CalculationProof;
  latencyMs: number;
  provider: 'vamn' | LLMProvider;            // Which provider handled the request
}

export class AIOrchestrator {
  private vamnConfig: VAMNConfig;
  private tenantConfig: TenantLLMConfig;
  private clientRouter: MultiLLMRouter | null;
  private fallbackRouter: FinACEverseFallbackRouter;

  constructor(vamnConfig: VAMNConfig, tenantConfig: TenantLLMConfig) {
    this.vamnConfig = vamnConfig;
    this.tenantConfig = tenantConfig;
    
    // Initialize client's LLM router (if they configured any)
    if (tenantConfig.clientProviders.length > 0) {
      this.clientRouter = new MultiLLMRouter(tenantConfig.clientProviders);
    } else {
      this.clientRouter = null;
    }
    
    // Initialize FinACEverse fallback (our LLMs, we charge for usage)
    this.fallbackRouter = new FinACEverseFallbackRouter(tenantConfig);
  }

  /**
   * AI Resolution Priority:
   * 1. Client's configured LLMs/fine-tuned models (client pays directly)
   * 2. VAMN (when available) - included in subscription
   * 3. FinACEverse Fallback LLMs (we pay, we charge client)
   */
  async invoke(request: VAMNRequest): Promise<VAMNResponse> {
    const startTime = Date.now();
    
    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY 1: Client's own LLMs (client pays their provider directly)
    // ═══════════════════════════════════════════════════════════════════
    if (this.clientRouter) {
      try {
        const response = await this.clientRouter.invokeWithFallback(request);
        // Log usage but NO cost (client pays their provider)
        await this.logUsage(request, response, 'client', null);
        return response;
      } catch (error) {
        console.warn('Client LLM failed, trying VAMN/fallback:', error);
        // Fall through to VAMN/fallback
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY 2: VAMN (when available, unless client rejected it)
    // ═══════════════════════════════════════════════════════════════════
    if (this.tenantConfig.useVAMN && !this.tenantConfig.rejectVAMN && this.isVAMNAvailable()) {
      try {
        const response = await this.callVAMN(request);
        // VAMN included in subscription - no per-token charge
        await this.logUsage(request, response, 'finaceverse', 0);
        return { ...response, provider: 'vamn' };
      } catch (error) {
        console.warn('VAMN failed, trying fallback:', error);
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PRIORITY 3: FinACEverse Fallback (we pay, we charge client)
    // ═══════════════════════════════════════════════════════════════════
    if (this.tenantConfig.useFinACEverseFallback) {
      const response = await this.fallbackRouter.invoke(request);
      // Calculate cost and charge client
      const cost = this.calculateCost(response.inputTokens, response.outputTokens);
      await this.logUsage(request, response, 'finaceverse', cost);
      await this.updateTenantBilling(cost, response.totalTokens);
      return response;
    }
    
    throw new Error('No AI provider available. Client has no LLMs configured and fallback is disabled.');
  }
  
  private isVAMNAvailable(): boolean {
    // VAMN availability check (false until launch)
    return process.env.VAMN_ENABLED === 'true';
  }
  
  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Default pricing or custom enterprise pricing
    const pricePerK = this.tenantConfig.tokenPricePerThousand ?? 0.002; // $0.002/1K default
    return ((inputTokens + outputTokens) / 1000) * pricePerK;
  }
  
  private async updateTenantBilling(cost: number, tokens: number): Promise<void> {
    // Update tenant's monthly usage
    await db.tenantLLMConfig.update({
      where: { tenantId: this.tenantConfig.tenantId },
      data: {
        currentMonthUsage: { increment: tokens },
        currentMonthCostUSD: { increment: cost },
      },
    });
    
    // Check if approaching/exceeding limits
    const updated = await db.tenantLLMConfig.findUnique({ 
      where: { tenantId: this.tenantConfig.tenantId } 
    });
    
    if (updated?.monthlyTokenLimit && updated.currentMonthUsage >= updated.monthlyTokenLimit) {
      throw new Error('Monthly token limit exceeded. Please upgrade your plan or configure your own LLM.');
    }
  }

  private async callVAMN(request: VAMNRequest): Promise<VAMNResponse> {
    const startTime = Date.now();
    
    const response = await fetch(`${this.config.endpoint}/v1/inference`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-Node-ID': this.config.nodeId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stream: request.stream,
        prompt: request.prompt,
        context: request.context,
        max_tokens: request.maxTokens ?? 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(`VAMN error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      result: data.result,
      confidence: data.confidence,
      citations: data.citations,
      calculationProof: data.calculation_proof,
      latencyMs: Date.now() - startTime,
    };
  }
}

// Multi-LLM Router - Routes through CLIENT's configured providers only
export class MultiLLMRouter {
  private providers: Map<string, LLMProviderAdapter>;  // key = provider:model for uniqueness
  private fallbackOrder: string[];

  constructor(configs: LLMProviderConfig[]) {
    this.providers = new Map();
    
    // Sort by priority and filter enabled CLIENT providers only
    const sorted = configs
      .filter(c => c.enabled && c.ownership === 'client')
      .sort((a, b) => a.priority - b.priority);
    
    this.fallbackOrder = sorted.map(c => `${c.provider}:${c.model}`);
    
    // Initialize adapters
    for (const config of sorted) {
      const key = `${config.provider}:${config.model}`;
      this.providers.set(key, this.createAdapter(config));
    }
  }
}

// FinACEverse Fallback Router - Uses OUR LLMs, charges client
export class FinACEverseFallbackRouter {
  private tenantConfig: TenantLLMConfig;
  private fallbackProviders: LLMProviderAdapter[];

  constructor(tenantConfig: TenantLLMConfig) {
    this.tenantConfig = tenantConfig;
    
    // Our fallback chain (keys from env, not from client)
    this.fallbackProviders = [
      // 1. FinACEverse internal models (pre-VAMN)
      new FinACEverseModelAdapter({
        provider: 'finaceverse',
        model: process.env.FINACEVERSE_DEFAULT_MODEL ?? 'finace-general-v1',
        baseUrl: process.env.FINACEVERSE_MODEL_ENDPOINT,
        apiKey: process.env.FINACEVERSE_MODEL_API_KEY,
        ownership: 'finaceverse',
        enabled: true,
        priority: 1,
        modelType: 'pre_vamn',
      }),
      // 2. OpenAI (our key, we pay)
      new OpenAIAdapter({
        provider: 'openai',
        model: process.env.FINACEVERSE_OPENAI_MODEL ?? 'gpt-4-turbo',
        apiKey: process.env.FINACEVERSE_OPENAI_KEY,  // OUR key, not client's
        ownership: 'finaceverse',
        enabled: true,
        priority: 2,
        modelType: 'base',
      }),
      // 3. Anthropic (our key, we pay)
      new AnthropicAdapter({
        provider: 'anthropic',
        model: process.env.FINACEVERSE_ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-20241022',
        apiKey: process.env.FINACEVERSE_ANTHROPIC_KEY,  // OUR key
        ownership: 'finaceverse',
        enabled: true,
        priority: 3,
        modelType: 'base',
      }),
    ];
  }

  async invoke(request: VAMNRequest): Promise<VAMNResponse & { inputTokens: number; outputTokens: number; totalTokens: number }> {
    for (const adapter of this.fallbackProviders) {
      try {
        const result = await adapter.invoke(request);
        return {
          result: result.content,
          confidence: result.confidence ?? 0.8,
          latencyMs: 0, // calculated by caller
          provider: 'finaceverse',
          inputTokens: result.inputTokens ?? this.estimateTokens(request.prompt),
          outputTokens: result.outputTokens ?? this.estimateTokens(result.content),
          totalTokens: (result.inputTokens ?? 0) + (result.outputTokens ?? 0),
        };
      } catch (error) {
        console.warn('FinACEverse fallback provider failed:', error);
      }
    }
    throw new Error('All FinACEverse fallback providers failed');
  }

  private estimateTokens(text: string): number {
    // Rough estimate: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  private createAdapter(config: LLMProviderConfig): LLMProviderAdapter {
    // Handle fine-tuned models first
    if (config.modelType !== 'base' && config.fineTuneConfig) {
      return new FineTunedModelAdapter(config);
    }
    
    switch (config.provider) {
      case 'openai':
        return new OpenAIAdapter(config);
      case 'anthropic':
        return new AnthropicAdapter(config);
      case 'gemini':
        return new GeminiAdapter(config);
      case 'azure':
        return new AzureOpenAIAdapter(config);
      case 'mistral':
        return new MistralAdapter(config);
      case 'cohere':
        return new CohereAdapter(config);
      case 'groq':
        return new GroqAdapter(config);
      case 'deepseek':
        return new DeepSeekAdapter(config);
      case 'ollama':
        return new OllamaAdapter(config);
      case 'together':
        return new TogetherAdapter(config);
      case 'fireworks':
        return new FireworksAdapter(config);
      case 'finaceverse':
        return new FinACEverseModelAdapter(config);  // Pre-VAMN internal models
      case 'custom_finetuned':
        return new FineTunedModelAdapter(config);    // Client fine-tuned
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }

  async invokeWithFallback(request: VAMNRequest): Promise<VAMNResponse> {
    const errors: Error[] = [];
    
    for (const provider of this.fallbackOrder) {
      try {
        const adapter = this.providers.get(provider)!;
        const startTime = Date.now();
        const result = await adapter.invoke(request);
        
        return {
          result: result.content,
          confidence: result.confidence ?? 0.8,
          latencyMs: Date.now() - startTime,
          provider,
        };
      } catch (error) {
        console.warn(`LLM provider ${provider} failed:`, error);
        errors.push(error as Error);
        // Continue to next provider
      }
    }
    
    throw new Error(`All LLM providers failed: ${errors.map(e => e.message).join(', ')}`);
  }
}

// Base adapter interface
interface LLMProviderAdapter {
  invoke(request: VAMNRequest): Promise<{ content: string; confidence?: number }>;
}
```

#### File: `agent-orchestrator.ts`

```typescript
// sumbuddy/src/services/ai/agent-orchestrator.ts

interface AgentConfig {
  finaidHubEndpoint: string;
  apiKey: string;
  nodeId: 'sumbuddy';
}

// Available Luca agents for SumBuddy use cases
export const SUMBUDDY_AGENTS = {
  // Matching & Discovery
  MATCH_MAKER: 'luca.financial-match-maker',
  SERVICE_RECOMMENDER: 'luca.service-recommender',
  
  // Compliance & Verification
  TAX_COMPLIANCE: 'luca.tax-compliance-advisor',
  KYC_VERIFIER: 'luca.kyc-document-verifier',
  RISK_ASSESSOR: 'luca.risk-assessor',
  
  // Document Processing (via Cyloid)
  DOC_EXTRACTOR: 'cyloid.document-extractor',
  DOC_CLASSIFIER: 'cyloid.document-classifier',
  
  // Content Generation
  PROPOSAL_WRITER: 'luca.proposal-writer',
  REVIEW_SUMMARIZER: 'luca.review-summarizer',
} as const;

export class AgentOrchestrator {
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  async invokeAgent(
    agentId: string,
    input: Record<string, any>,
    options?: { timeout?: number; priority?: 'low' | 'normal' | 'high' }
  ): Promise<AgentResponse> {
    const response = await fetch(`${this.config.finaidHubEndpoint}/v1/agents/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-Node-ID': this.config.nodeId,
        'X-Priority': options?.priority ?? 'normal',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        input,
        timeout_ms: options?.timeout ?? 30000,
      }),
      signal: AbortSignal.timeout(options?.timeout ?? 30000),
    });

    if (!response.ok) {
      throw new Error(`Agent ${agentId} error: ${response.status}`);
    }

    return response.json();
  }

  // Convenience methods for common SumBuddy operations
  async matchClientToAccountants(
    clientRequirements: ClientRequirements
  ): Promise<AccountantMatch[]> {
    const result = await this.invokeAgent(SUMBUDDY_AGENTS.MATCH_MAKER, {
      requirements: clientRequirements,
      marketplace: 'sumbuddy',
      limit: 10,
    });
    return result.matches;
  }

  async verifyKYCDocument(
    documentUrl: string,
    documentType: string
  ): Promise<KYCVerificationResult> {
    const result = await this.invokeAgent(SUMBUDDY_AGENTS.KYC_VERIFIER, {
      document_url: documentUrl,
      document_type: documentType,
      verification_level: 'enhanced',
    });
    return result.verification;
  }

  async generateProposal(
    jobDetails: JobDetails,
    accountantProfile: AccountantProfile
  ): Promise<GeneratedProposal> {
    const result = await this.invokeAgent(SUMBUDDY_AGENTS.PROPOSAL_WRITER, {
      job: jobDetails,
      accountant: accountantProfile,
      tone: 'professional',
      max_length: 500,
    });
    return result.proposal;
  }
}
```

---

### 2.2 Updated Architecture Diagram

Add VAMN/Luca layer to existing architecture:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SUMBUDDY AI LAYER                                │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         AI SERVICE ROUTER                             │ │
│  │                                                                       │ │
│  │   Request → [Feature Flags] → Route to appropriate AI backend        │ │
│  │                                                                       │ │
│  └─────────────────────────────────┬─────────────────────────────────────┘ │
│                                    │                                       │
│           ┌────────────────────────┼────────────────────────┐             │
│           │                        │                        │             │
│           ▼                        ▼                        ▼             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐       │
│  │  VAMN Client    │    │ Agent Orch.     │    │ OpenAI Fallback │       │
│  │  (Phase 2)      │    │ (Fin(Ai)d Hub)  │    │ (Current)       │       │
│  │                 │    │                 │    │                 │       │
│  │ • Semantic      │    │ • Luca Agents   │    │ • GPT-4 Turbo   │       │
│  │ • Quantitative  │    │ • Cyloid Agents │    │ • Embeddings    │       │
│  │ • Citation      │    │ • 103 Agents    │    │ • Vision        │       │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘       │
│           │                      │                      │                 │
│           └──────────────────────┼──────────────────────┘                 │
│                                  │                                        │
│                                  ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐│
│  │                      FINACEVERSE API GATEWAY                          ││
│  │                      (mTLS, rate limiting, auth)                      ││
│  └───────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Security Implementation

### 3.1 Security Middleware Stack

Update Express middleware to integrate all 21 layers:

```typescript
// sumbuddy/src/middleware/security-stack.ts

import { 
  IntrusionDetectionService,    // Layer 1
  GeoAnomalyDetector,           // Layer 2
  HoneypotService,              // Layer 3
  DecoyKeyService,              // Layer 4
  CanaryService,                // Layer 5
  RotatingKeyService,           // Layer 6
  AzureKeyVaultService,         // Layer 7
  KeyBackupService,             // Layer 8
  SIEMLogger,                   // Layer 9
  AlertingService,              // Layer 10
  DeadMansSwitch,               // Layer 11
  DDoSProtection,               // Layer 12
  NetworkDecoys,                // Layer 13
  MemorySafeKeyManager,         // Layer 14
  AnomalyDetector,              // Layer 15
  SecureDashboard,              // Layer 16
  BoilingFrogDetector,          // Layer 17
  // Layers 18-21 in server.js
} from '@finaceverse/security';

export function createSecurityStack(app: Express, pool: Pool) {
  // Initialize all security services
  const security = {
    ids: new IntrusionDetectionService(),
    geo: new GeoAnomalyDetector({ pool }),
    honeypot: new HoneypotService(),
    decoy: new DecoyKeyService(),
    canary: new CanaryService({ pool }),
    rotatingKeys: new RotatingKeyService({ masterSecret: process.env.MASTER_SECRET }),
    hsm: new AzureKeyVaultService({
      keyVaultName: process.env.AZURE_KEYVAULT_NAME,
      tenantId: process.env.AZURE_TENANT_ID,
      clientId: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
    }),
    backup: new KeyBackupService({ threshold: 3, shares: 5 }),
    siem: new SIEMLogger({ pool, batchSize: 100 }),
    alerting: new AlertingService({
      slackWebhook: process.env.SLACK_WEBHOOK_URL,
      twilioSid: process.env.TWILIO_SID,
      twilioToken: process.env.TWILIO_TOKEN,
      twilioFrom: process.env.TWILIO_FROM,
      alertPhone: process.env.ALERT_PHONE,
    }),
    deadMansSwitch: new DeadMansSwitch({
      heartbeatInterval: 24 * 60 * 60 * 1000,
      onTrigger: async () => {
        await security.rotatingKeys.forceRotate();
        await security.alerting.alert({
          severity: 'critical',
          message: 'Dead Man\'s Switch triggered - all keys rotated',
        });
      },
    }),
    ddos: new DDoSProtection({
      maxRequestsPerSecond: 50,
      enableTarpit: true,
      tarpitDelay: 5000,
    }),
    decoys: new NetworkDecoys(),
    memoryKeys: new MemorySafeKeyManager(),
    anomaly: new AnomalyDetector(),
    boilingFrog: new BoilingFrogDetector(),
  };

  // Apply middleware in order
  app.use(security.ddos.middleware());           // Layer 12
  app.use(security.ids.middleware());            // Layer 1
  app.use(security.geo.middleware());            // Layer 2
  app.use(security.decoys.middleware());         // Layer 13
  app.use(security.honeypot.middleware());       // Layer 3
  app.use(security.siem.middleware());           // Layer 9
  app.use(security.anomaly.middleware());        // Layer 15
  app.use(security.boilingFrog.middleware());    // Layer 17

  // Start background services
  security.deadMansSwitch.start();
  security.rotatingKeys.startDailyRotation();

  return security;
}
```

### 3.2 Federation Event Emitter

```typescript
// sumbuddy/src/services/federation/security-events.ts

import { Kafka } from 'kafkajs';

const SECURITY_EVENTS_TOPIC = 'finaceverse.security.events';

export class SecurityEventFederator {
  private kafka: Kafka;
  private producer: Producer;

  async emitSecurityEvent(event: SecurityEvent): Promise<void> {
    await this.producer.send({
      topic: SECURITY_EVENTS_TOPIC,
      messages: [{
        key: event.type,
        value: JSON.stringify({
          ...event,
          source_node: 'sumbuddy',
          timestamp: new Date().toISOString(),
          signature: await this.signEvent(event),
        }),
      }],
    });
  }

  // Convenience methods
  async emitHoneypotTrigger(data: HoneypotTriggerData): Promise<void> {
    await this.emitSecurityEvent({
      type: 'security.honeypot.triggered',
      severity: 'high',
      payload: data,
    });
  }

  async emitBreachDetected(data: BreachData): Promise<void> {
    await this.emitSecurityEvent({
      type: 'security.breach.detected',
      severity: 'critical',
      payload: data,
    });
  }

  async emitAnomalyDetected(data: AnomalyData): Promise<void> {
    await this.emitSecurityEvent({
      type: 'security.anomaly.detected',
      severity: data.severity,
      payload: data,
    });
  }
}
```

---

## 4. VAMN/Luca Integration

### 4.1 Integration Points in SumBuddy

| Feature | Current Implementation | VAMN/Luca Integration |
|---------|----------------------|----------------------|
| **Service Matching** | OpenAI embeddings + Pinecone | Luca `match-maker` agent + VAMN semantic |
| **Proposal Generation** | GPT-4 Turbo | Luca `proposal-writer` agent |
| **KYC Verification** | Stripe Identity | Luca `kyc-verifier` + Cyloid extraction |
| **Document OCR** | OpenAI Vision | Cyloid `document-extractor` |
| **Compliance Check** | Manual rules | Luca `tax-compliance-advisor` |
| **Search Ranking** | Basic scoring | VAMN semantic ranking |
| **Review Summarization** | GPT-4 | Luca `review-summarizer` |

### 4.2 Multi-LLM Configuration (Client-Configurable)

```typescript
// sumbuddy/src/config/llm-config.ts

import { LLMProvider, LLMProviderConfig } from '../services/ai/vamn-client';

// Default LLM configuration (can be overridden per-tenant)
export const DEFAULT_LLM_CONFIG: LLMProviderConfig[] = [
  {
    provider: 'openai',
    model: 'gpt-4-turbo',
    enabled: true,
    priority: 1,
  },
  {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    enabled: true,
    priority: 2,
  },
  {
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    enabled: false,
    priority: 3,
  },
  {
    provider: 'groq',
    model: 'llama-3.1-70b-versatile',
    enabled: false,
    priority: 4,
  },
  {
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'llama3.1',
    enabled: false,
    priority: 10,  // Last resort (self-hosted)
  },
];

// Per-tenant LLM configuration (stored encrypted in DB - tenant_llm_config table)
export interface TenantLLMConfig {
  tenantId: string;
  
  // ═══════════════════════════════════════════════════════════════════
  // CLIENT-OWNED CONFIGURATION (Client provides their own keys)
  // Keys stored encrypted in DB. Client pays their LLM provider directly.
  // ═══════════════════════════════════════════════════════════════════
  clientProviders: LLMProviderConfig[];      // Client's own LLMs
  clientFineTunedModels: FineTunedModelRegistry;  // Client's fine-tuned models
  clientPreferredModels: Record<string, string>;  // Feature → Model mapping
  
  // ═══════════════════════════════════════════════════════════════════
  // FINACEVERSE FALLBACK (When client has no config)
  // We use our LLMs, we charge client via billing model below.
  // ═══════════════════════════════════════════════════════════════════
  useFinACEverseFallback: boolean;           // Allow fallback to our LLMs?
  useVAMN: boolean;                          // Use VAMN when available? (default: true)
  rejectVAMN: boolean;                       // Client explicitly rejected VAMN?
  
  // ═══════════════════════════════════════════════════════════════════
  // BILLING (Only applies when using FinACEverse LLMs, not client's)
  // ═══════════════════════════════════════════════════════════════════
  billingModel: 'pay_as_you_go' | 'token_bundle' | 'unlimited_tier' | 'hybrid';
  tokenBundleRemaining?: number;             // Remaining tokens if bundle
  monthlyTokenLimit?: number;                // Hard limit
  tokenPricePerThousand?: number;            // Custom pricing (enterprise)
  currentMonthUsage: number;                 // Tokens used this month
  currentMonthCostUSD: number;               // Cost this month
  
  // Fine-tuning permissions
  allowClientFineTuning: boolean;            // Can client upload fine-tuned models?
  fineTuneApprovalRequired: boolean;         // Require admin approval?
}

// Registry of fine-tuned models per tenant
export interface FineTunedModelRegistry {
  models: Record<string, FineTunedModelConfig>;  // modelAlias → config
  activeProductionModel?: string;                 // Current production model alias
  activeStagingModel?: string;                    // Current staging model alias
  
  // A/B testing configuration
  abTestEnabled: boolean;
  abTestModels?: {
    modelA: string;                              // Model alias
    modelB: string;                              // Model alias
    splitPercentage: number;                     // % traffic to modelA (rest to modelB)
    metricsCollectionEnabled: boolean;
  };
  
  // Model lifecycle
  pendingApproval: string[];                     // Models awaiting admin approval
  deprecated: string[];                          // Models marked for sunset
}

// Feature-specific AI backend selection
export const AI_FEATURE_FLAGS = {
  // Phase 1 (Current): Client-configured LLM
  PHASE_1: {
    matching: 'client_llm',       // Uses tenant's configured LLM
    proposals: 'client_llm',
    kyc: 'stripe_identity',
    ocr: 'client_llm',
    search: 'elasticsearch',
  },
  
  // Phase 2 (After VAMN ready): VAMN primary + Client LLM fallback
  PHASE_2: {
    matching: 'luca_agent',        // Fin(Ai)d Hub → Luca → VAMN
    proposals: 'luca_agent',
    kyc: 'luca_agent',
    ocr: 'cyloid_agent',
    search: 'vamn_semantic',
    fallback: 'client_llm',        // Tenant's configured LLM as fallback
  },
  
  // Phase 3 (Full VAMN): VAMN only + emergency fallback
  PHASE_3: {
    matching: 'vamn',
    proposals: 'vamn',
    kyc: 'vamn',
    ocr: 'vamn',
    search: 'vamn',
    fallback: 'client_llm',        // Emergency fallback to tenant LLM
  },
};

// Load tenant-specific LLM configuration
export async function getTenantLLMConfig(tenantId: string): Promise<TenantLLMConfig> {
  // Load from database or return defaults
  const stored = await db.tenantLLMConfigs.findUnique({ where: { tenantId } });
  
  if (!stored) {
    return {
      tenantId,
      providers: DEFAULT_LLM_CONFIG,
      primaryProvider: 'openai',
      fallbackEnabled: true,
      maxFallbackAttempts: 3,
    };
  }
  
  return stored;
}
```

### 4.3 LLM Provider Adapters

```typescript
// sumbuddy/src/services/ai/adapters/index.ts

// OpenAI Adapter
export class OpenAIAdapter implements LLMProviderAdapter {
  private client: OpenAI;
  
  constructor(config: LLMProviderConfig) {
    this.client = new OpenAI({ 
      apiKey: config.apiKey ?? process.env.OPENAI_API_KEY,
      baseURL: config.baseUrl,
    });
    this.model = config.model;
  }
  
  async invoke(request: VAMNRequest) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: request.prompt }],
      max_tokens: request.maxTokens ?? 1024,
    });
    return { content: response.choices[0].message.content! };
  }
}

// Anthropic Adapter
export class AnthropicAdapter implements LLMProviderAdapter {
  private client: Anthropic;
  
  constructor(config: LLMProviderConfig) {
    this.client = new Anthropic({ 
      apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY 
    });
    this.model = config.model;
  }
  
  async invoke(request: VAMNRequest) {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: request.maxTokens ?? 1024,
      messages: [{ role: 'user', content: request.prompt }],
    });
    return { content: response.content[0].text };
  }
}

// Ollama Adapter (Self-hosted)
export class OllamaAdapter implements LLMProviderAdapter {
  private baseUrl: string;
  private model: string;
  
  constructor(config: LLMProviderConfig) {
    this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
    this.model = config.model;
  }
  
  async invoke(request: VAMNRequest) {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: request.prompt,
        stream: false,
      }),
    });
    const data = await response.json();
    return { content: data.response };
  }
}

// FinACEverse Internal Model Adapter (pre-VAMN models)
export class FinACEverseModelAdapter implements LLMProviderAdapter {
  private endpoint: string;
  private apiKey: string;
  private model: string;
  
  constructor(config: LLMProviderConfig) {
    this.endpoint = config.baseUrl ?? process.env.FINACEVERSE_MODEL_ENDPOINT!;
    this.apiKey = config.apiKey ?? process.env.FINACEVERSE_MODEL_API_KEY!;
    this.model = config.model;  // e.g., 'finace-accounting-v1', 'finace-tax-v2'
  }
  
  async invoke(request: VAMNRequest) {
    const response = await fetch(`${this.endpoint}/v1/inference`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Model-ID': this.model,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: request.prompt,
        context: request.context,
        max_tokens: request.maxTokens ?? 1024,
      }),
    });
    const data = await response.json();
    return { content: data.result, confidence: data.confidence };
  }
}

// Fine-Tuned Model Adapter (client or FinACEverse fine-tuned)
export class FineTunedModelAdapter implements LLMProviderAdapter {
  private config: LLMProviderConfig;
  private ftConfig: FineTunedModelConfig;
  
  constructor(config: LLMProviderConfig) {
    this.config = config;
    this.ftConfig = config.fineTuneConfig!;
  }
  
  async invoke(request: VAMNRequest) {
    // Route based on deployment type
    switch (this.ftConfig.deploymentType) {
      case 'hosted':
        return this.invokeHostedModel(request);
      case 'azure_ml':
        return this.invokeAzureML(request);
      case 'sagemaker':
        return this.invokeSageMaker(request);
      case 'vertex':
        return this.invokeVertexAI(request);
      case 'self_hosted':
        return this.invokeSelfHosted(request);
      default:
        throw new Error(`Unknown deployment type: ${this.ftConfig.deploymentType}`);
    }
  }
  
  // OpenAI-hosted fine-tuned model
  private async invokeHostedModel(request: VAMNRequest) {
    const client = new OpenAI({ apiKey: this.config.apiKey ?? process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: this.ftConfig.modelId,  // e.g., 'ft:gpt-4:client-org:model-name:abc123'
      messages: [{ role: 'user', content: request.prompt }],
      max_tokens: request.maxTokens ?? 1024,
    });
    return { content: response.choices[0].message.content! };
  }
  
  // Azure ML deployed fine-tuned model
  private async invokeAzureML(request: VAMNRequest) {
    const response = await fetch(this.ftConfig.deploymentEndpoint!, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: request.prompt,
        parameters: { max_new_tokens: request.maxTokens ?? 1024 },
      }),
    });
    const data = await response.json();
    return { content: data[0].generated_text };
  }
  
  // AWS SageMaker deployed model
  private async invokeSageMaker(request: VAMNRequest) {
    // Use AWS SDK SageMaker Runtime
    const { SageMakerRuntimeClient, InvokeEndpointCommand } = await import('@aws-sdk/client-sagemaker-runtime');
    const client = new SageMakerRuntimeClient({ region: this.ftConfig.deploymentRegion });
    
    const command = new InvokeEndpointCommand({
      EndpointName: this.ftConfig.deploymentEndpoint!.split('/').pop(),
      ContentType: 'application/json',
      Body: JSON.stringify({ inputs: request.prompt }),
    });
    
    const response = await client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.Body));
    return { content: result[0].generated_text };
  }
  
  // Google Vertex AI deployed model
  private async invokeVertexAI(request: VAMNRequest) {
    const response = await fetch(this.ftConfig.deploymentEndpoint!, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ prompt: request.prompt }],
        parameters: { maxOutputTokens: request.maxTokens ?? 1024 },
      }),
    });
    const data = await response.json();
    return { content: data.predictions[0].content };
  }
  
  // Self-hosted fine-tuned model (vLLM, TGI, etc.)
  private async invokeSelfHosted(request: VAMNRequest) {
    const response = await fetch(this.ftConfig.deploymentEndpoint!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.ftConfig.modelId,
        prompt: request.prompt,
        max_tokens: request.maxTokens ?? 1024,
      }),
    });
    const data = await response.json();
    return { content: data.choices?.[0]?.text ?? data.generated_text };
  }
}

// Similar adapters for: Gemini, Azure, Mistral, Cohere, Groq, DeepSeek, Together, Fireworks
```

---

## 5. Federation Protocol Updates

### 5.1 New Event Types

Add these events to SumBuddy's federation protocol:

```typescript
// sumbuddy/src/types/federation-events.ts

// Events SumBuddy sends to FinACEverse
export type OutboundEvents =
  // User lifecycle
  | { type: 'user.created'; payload: { localId: string; email: string; role: string } }
  | { type: 'user.kyc.submitted'; payload: { localId: string; level: string } }
  | { type: 'user.kyc.verified'; payload: { localId: string; level: string; verifiedBy: string } }
  
  // Security events (federated to SIEM)
  | { type: 'security.honeypot.triggered'; payload: HoneypotTriggerPayload }
  | { type: 'security.canary.accessed'; payload: CanaryAccessPayload }
  | { type: 'security.breach.detected'; payload: BreachPayload }
  | { type: 'security.anomaly.detected'; payload: AnomalyPayload }
  | { type: 'security.key.rotated'; payload: KeyRotationPayload }
  
  // Business events (for cross-product analytics)
  | { type: 'booking.created'; payload: { amount: number; currency: string; serviceType: string } }
  | { type: 'booking.completed'; payload: { bookingId: string; rating?: number } }
  | { type: 'transaction.completed'; payload: { amount: number; type: string } }
  
  // Health
  | { type: 'node.heartbeat'; payload: { status: 'healthy' | 'degraded'; metrics: NodeMetrics } };

// Events SumBuddy receives from FinACEverse
export type InboundEvents =
  // Identity federation
  | { type: 'user.federated'; payload: { localId: string; federatedId: string } }
  | { type: 'user.sso.validated'; payload: { federatedId: string; token: string } }
  
  // Security directives
  | { type: 'security.blocklist.updated'; payload: { ips: string[]; action: 'add' | 'remove' } }
  | { type: 'security.threat.broadcast'; payload: { threatType: string; indicators: string[] } }
  | { type: 'security.key.rotate.command'; payload: { keyType: string; reason: string } }
  
  // Configuration
  | { type: 'config.updated'; payload: { key: string; value: any } }
  | { type: 'feature.flag.updated'; payload: { flag: string; enabled: boolean } };
```

### 5.2 Kafka Topics

```typescript
// sumbuddy/src/config/kafka-topics.ts

export const FEDERATION_TOPICS = {
  // SumBuddy → FinACEverse
  OUTBOUND: 'finaceverse.sumbuddy.events',
  
  // FinACEverse → SumBuddy
  INBOUND: 'finaceverse.commands.sumbuddy',
  
  // Shared across all nodes
  SECURITY: 'finaceverse.security.events',
  BLOCKLIST: 'finaceverse.security.blocklist',
  
  // Analytics (write-only)
  ANALYTICS: 'finaceverse.analytics.events',
};
```

---

## 6. Implementation Checklist

### Week 1: Database Changes

- [ ] Create migration file for security tables (5 tables)
- [ ] Create migration file for federated_learning_consent
- [ ] Add canary records to users, services tables
- [ ] Create canary detection triggers
- [ ] Run index creation script (120+ indexes)
- [ ] Test partition creation for security_audit_log
- [ ] Verify all foreign keys and constraints

### Week 2: Security Implementation

- [ ] Install @finaceverse/security package (or copy modules)
- [ ] Configure security middleware stack
- [ ] Set up Azure Key Vault connection
- [ ] Configure Shamir backup (generate 5 shares)
- [ ] Set up alerting channels (Slack, Twilio)
- [ ] Configure SIEM federation to FinACEverse
- [ ] Test all 21 security layers
- [ ] Deploy honeypot endpoints

### Week 3: AI & Federation

- [ ] Create VAMN client (with OpenAI fallback)
- [ ] Create Agent Orchestrator for Fin(Ai)d Hub
- [ ] Configure feature flags for AI backends
- [ ] Set up Kafka topics for federation
- [ ] Implement federation event producer
- [ ] Implement federation event consumer
- [ ] Test identity federation flow
- [ ] Test security event federation

### Post-Launch Monitoring

- [ ] Monitor security_audit_log growth
- [ ] Check federation event delivery
- [ ] Validate blocklist sync
- [ ] Test dead man's switch
- [ ] Run penetration test against honeypots
- [ ] Verify canary detection works

---

## Environment Variables (New)

Add these to SumBuddy's `.env`:

```bash
# FinACEverse Federation
FINACEVERSE_ENDPOINT=https://api.finaceverse.io
FINACEVERSE_NODE_ID=sumbuddy
FINACEVERSE_API_KEY=<node-specific-key>

# VAMN (Phase 2)
VAMN_ENDPOINT=https://vamn.finaceverse.io
VAMN_API_KEY=<vamn-key>
VAMN_FALLBACK_ENABLED=true

# ═══════════════════════════════════════════════════════════════════════════
# CLIENT LLM KEYS: NOT STORED IN ENV!
# Client's API keys are stored encrypted in the `tenant_llm_config` table.
# Clients configure their own providers via the SumBuddy Settings UI.
# They pay their LLM providers directly - we don't see their bills.
# ═══════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════
# FINACEVERSE FALLBACK LLMS (Our keys - we pay, we charge clients)
# Used ONLY when: client has no LLMs configured AND fallback is enabled
# ═══════════════════════════════════════════════════════════════════════════

# FinACEverse Internal Models (Pre-VAMN fine-tuned)
FINACEVERSE_MODEL_ENDPOINT=https://models.finaceverse.io
FINACEVERSE_MODEL_API_KEY=<our-internal-key>
FINACEVERSE_DEFAULT_MODEL=finace-general-v1

# Fallback: OpenAI (OUR key, we charge clients for usage)
FINACEVERSE_OPENAI_KEY=<our-openai-key>
FINACEVERSE_OPENAI_MODEL=gpt-4-turbo

# Fallback: Anthropic (OUR key, we charge clients for usage)
FINACEVERSE_ANTHROPIC_KEY=<our-anthropic-key>
FINACEVERSE_ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# ═══════════════════════════════════════════════════════════════════════════
# BILLING CONFIGURATION (For FinACEverse fallback usage)
# ═══════════════════════════════════════════════════════════════════════════
DEFAULT_BILLING_MODEL=pay_as_you_go  # or 'token_bundle', 'unlimited_tier'
DEFAULT_TOKEN_PRICE_PER_K=0.002      # $0.002 per 1K tokens
FREE_TIER_MONTHLY_TOKENS=10000       # Free tokens for new users

# ═══════════════════════════════════════════════════════════════════════════
# FINE-TUNED MODEL HOSTING
# ═══════════════════════════════════════════════════════════════════════════
FINETUNED_MODELS_ENABLED=true
FINETUNED_APPROVAL_REQUIRED=true
FINETUNED_MAX_MODELS_PER_TENANT=5

# Fin(Ai)d Hub (Agents)
FINAID_HUB_ENDPOINT=https://agents.finaceverse.io
FINAID_HUB_API_KEY=<agent-key>

# AI Phase (PHASE_1, PHASE_2, PHASE_3)
AI_PHASE=PHASE_1

# Azure Key Vault (HSM)
AZURE_KEYVAULT_NAME=finaceverse-sumbuddy-vault
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>

# Kafka Federation
KAFKA_BROKERS=kafka1.finaceverse.io:9092,kafka2.finaceverse.io:9092
KAFKA_CLIENT_ID=sumbuddy-node
KAFKA_GROUP_ID=sumbuddy-consumers

# Security Alerting
SLACK_SECURITY_WEBHOOK=https://hooks.slack.com/services/xxx/yyy/zzz
TWILIO_SID=<twilio-sid>
TWILIO_TOKEN=<twilio-token>
TWILIO_FROM=+1234567890
ALERT_PHONE=+1234567890
PAGERDUTY_KEY=<pagerduty-key>
```

---

## Summary of Changes

| Category | Items | Priority |
|----------|-------|----------|
| **Database Tables** | +8 new tables (5 security, 2 LLM, 1 consent) | Critical |
| **Database Indexes** | +130 indexes | Critical |
| **Database Canaries** | +3 tripwire records | High |
| **Security Middleware** | 21-layer stack | Critical |
| **AI Services** | +2 new clients (VAMN, Agents) + 13 LLM adapters + fine-tune support | Medium |
| **Federation Events** | +15 event types | High |
| **Environment Variables** | +20 new vars | High |

**Total Effort**: ~120 developer hours (2-3 weeks for 1 developer)

---

*Document Version: 1.0*  
*Created: January 14, 2026*  
*Author: FinACEverse Architecture Team*
