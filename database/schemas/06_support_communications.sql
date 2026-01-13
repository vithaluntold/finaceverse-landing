-- ============================================================================
-- COMMAND CENTER: SUPPORT, COMMUNICATIONS & PLATFORM HEALTH
-- ============================================================================
-- Module 5: Support Center (tickets, live chat, AI bot)
-- Module 9: Communication Hub
-- Module 2: Platform Health Center (monitoring, SLA tracking)
-- ============================================================================

-- ============================================================================
-- SUPPORT TICKETS
-- ============================================================================
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('TKT-'),
    
    -- Requester
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    
    -- For non-registered users
    requester_email TEXT,
    requester_name TEXT,
    
    -- Classification
    category TEXT,                         -- 'technical', 'billing', 'account', 'feature_request'
    subcategory TEXT,
    product product_type,
    
    -- Ticket details
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    
    -- Status
    status ticket_status DEFAULT 'new',
    priority ticket_priority DEFAULT 'medium',
    
    -- Assignment
    assigned_team TEXT,
    assigned_to UUID REFERENCES users(id),
    
    -- SLA
    sla_tier sla_tier,
    first_response_due TIMESTAMPTZ,
    resolution_due TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    sla_breached BOOLEAN DEFAULT FALSE,
    
    -- Resolution
    resolution_type TEXT,                  -- 'solved', 'not_applicable', 'wont_fix', 'duplicate'
    resolution_summary TEXT,
    
    -- Satisfaction
    satisfaction_rating INTEGER,           -- 1-5
    satisfaction_comment TEXT,
    satisfaction_submitted_at TIMESTAMPTZ,
    
    -- Linked items
    related_tickets UUID[],
    linked_document_ids UUID[],
    
    -- AI analysis
    ai_suggested_category TEXT,
    ai_suggested_priority ticket_priority,
    ai_sentiment_score DECIMAL(3,2),
    ai_suggested_response TEXT,
    
    -- Tags
    tags TEXT[],
    
    -- Source
    channel comm_channel DEFAULT 'email',
    source_id TEXT,                        -- Original email ID, chat ID, etc.
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ
);

-- Ticket messages/replies
CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    
    -- Author
    author_type TEXT NOT NULL,             -- 'customer', 'agent', 'system', 'ai_bot'
    author_user_id UUID REFERENCES users(id),
    author_name TEXT,
    
    -- Content
    content TEXT NOT NULL,
    content_html TEXT,
    
    -- Attachments
    attachments JSONB DEFAULT '[]',        -- [{filename, url, size, mime_type}]
    
    -- Message type
    message_type TEXT DEFAULT 'reply',     -- 'reply', 'note', 'status_change', 'auto_response'
    is_internal BOOLEAN DEFAULT FALSE,
    
    -- AI
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_model TEXT,
    
    -- Delivery
    sent_via comm_channel,
    external_message_id TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- LIVE CHAT
-- ============================================================================
CREATE TABLE chat_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('CHT-'),
    
    -- Participants
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    
    -- For visitors
    visitor_id TEXT,
    visitor_name TEXT,
    visitor_email TEXT,
    
    -- Context
    product product_type,
    page_url TEXT,
    
    -- Assignment
    assigned_to UUID REFERENCES users(id),
    team TEXT,
    
    -- Status
    status TEXT DEFAULT 'waiting',         -- 'waiting', 'active', 'resolved', 'missed'
    
    -- Metrics
    wait_time_seconds INTEGER,
    duration_seconds INTEGER,
    message_count INTEGER DEFAULT 0,
    
    -- AI involvement
    handled_by_ai BOOLEAN DEFAULT FALSE,
    ai_escalated_at TIMESTAMPTZ,
    escalation_reason TEXT,
    
    -- Satisfaction
    rating INTEGER,
    feedback TEXT,
    
    -- Convert to ticket
    converted_to_ticket_id UUID REFERENCES support_tickets(id),
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    first_response_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    
    -- Sender
    sender_type TEXT NOT NULL,             -- 'visitor', 'agent', 'bot'
    sender_user_id UUID REFERENCES users(id),
    sender_name TEXT,
    
    -- Content
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',      -- 'text', 'image', 'file', 'quick_reply'
    
    -- Attachments
    attachments JSONB DEFAULT '[]',
    
    -- AI
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_confidence DECIMAL(5,4),
    
    -- Delivery
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- AI SUPPORT BOT
-- ============================================================================
CREATE TABLE support_bot_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),  -- NULL = platform default
    
    -- Configuration
    name TEXT NOT NULL,
    
    -- Model
    model_provider TEXT DEFAULT 'openai',
    model_name TEXT DEFAULT 'gpt-4',
    
    -- Behavior
    greeting_message TEXT,
    system_prompt TEXT,
    
    -- Capabilities
    can_handle_categories TEXT[],
    escalation_keywords TEXT[],
    max_messages_before_escalation INTEGER DEFAULT 5,
    
    -- Knowledge base
    knowledge_base_ids UUID[],
    
    -- Hours
    operating_hours JSONB,                 -- {"mon": {"start": "09:00", "end": "17:00"}}
    timezone TEXT DEFAULT 'UTC',
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge base for support bot
CREATE TABLE knowledge_base_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    
    -- Article info
    title TEXT NOT NULL,
    slug CITEXT NOT NULL,
    
    -- Content
    content TEXT NOT NULL,
    content_html TEXT,
    summary TEXT,
    
    -- Classification
    category TEXT,
    subcategory TEXT,
    product product_type,
    tags TEXT[],
    
    -- SEO
    meta_title TEXT,
    meta_description TEXT,
    
    -- Status
    status TEXT DEFAULT 'draft',           -- 'draft', 'published', 'archived'
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    
    -- Search
    search_vector TSVECTOR,
    
    -- AI embedding for semantic search
    embedding VECTOR(1536),
    
    -- Author
    author_id UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ,
    
    UNIQUE(tenant_id, slug)
);

-- ============================================================================
-- COMMUNICATION HUB
-- ============================================================================
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    
    -- Template identity
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Category
    category TEXT NOT NULL,                -- 'transactional', 'marketing', 'system'
    event_type TEXT,                       -- 'invoice_created', 'password_reset', etc.
    
    -- Channels
    channels comm_channel[] NOT NULL,
    
    -- Content per channel
    email_subject TEXT,
    email_body_html TEXT,
    email_body_text TEXT,
    
    sms_body TEXT,
    
    push_title TEXT,
    push_body TEXT,
    push_data JSONB,
    
    in_app_title TEXT,
    in_app_body TEXT,
    in_app_action_url TEXT,
    
    -- Variables
    available_variables TEXT[],
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, code)
);

-- Notifications sent
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Recipient
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    
    -- For external recipients
    recipient_email TEXT,
    recipient_phone TEXT,
    
    -- Template
    template_id UUID REFERENCES notification_templates(id),
    template_code TEXT,
    
    -- Channel
    channel comm_channel NOT NULL,
    
    -- Content (rendered)
    subject TEXT,
    body TEXT,
    body_html TEXT,
    
    -- Delivery
    status TEXT DEFAULT 'pending',         -- 'pending', 'sent', 'delivered', 'failed', 'bounced'
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Failure
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Engagement
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    
    -- External
    external_provider TEXT,
    external_message_id TEXT,
    
    -- Context
    event_type TEXT,
    event_data JSONB,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Notification preferences (user-level)
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id),
    
    -- Global settings
    do_not_disturb BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone TEXT DEFAULT 'UTC',
    
    -- Channel preferences
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    push_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    
    -- Category preferences
    category_preferences JSONB DEFAULT '{}',  -- {category: {channel: enabled}}
    
    -- Frequency
    digest_frequency TEXT DEFAULT 'realtime',  -- 'realtime', 'daily', 'weekly'
    
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, tenant_id)
);

-- ============================================================================
-- PLATFORM HEALTH & MONITORING
-- ============================================================================
CREATE TABLE system_health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Service
    service_name TEXT NOT NULL,
    instance_id TEXT,
    region TEXT,
    
    -- Metrics
    metric_type TEXT NOT NULL,             -- 'uptime', 'latency', 'error_rate', 'throughput'
    metric_value DECIMAL(20,4) NOT NULL,
    unit TEXT,
    
    -- Thresholds
    warning_threshold DECIMAL(20,4),
    critical_threshold DECIMAL(20,4),
    status TEXT,                           -- 'healthy', 'degraded', 'critical'
    
    -- Timestamp
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Partitioned for time-series data
CREATE TABLE system_metrics_timeseries (
    time TIMESTAMPTZ NOT NULL,
    service_name TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    value DECIMAL(20,4) NOT NULL,
    tags JSONB DEFAULT '{}',
    
    PRIMARY KEY (time, service_name, metric_name)
);

-- Convert to hypertable if using TimescaleDB
-- SELECT create_hypertable('system_metrics_timeseries', 'time');

-- Incidents
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL DEFAULT generate_short_id('INC-'),
    
    -- Classification
    severity TEXT NOT NULL,                -- 'critical', 'major', 'minor'
    status TEXT DEFAULT 'investigating',   -- 'investigating', 'identified', 'monitoring', 'resolved'
    
    -- Details
    title TEXT NOT NULL,
    description TEXT,
    
    -- Impact
    affected_services TEXT[],
    affected_products product_type[],
    affected_tenants UUID[],
    user_impact TEXT,
    
    -- Timeline
    started_at TIMESTAMPTZ NOT NULL,
    identified_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- Response
    incident_commander UUID REFERENCES users(id),
    responders UUID[],
    
    -- Postmortem
    postmortem_url TEXT,
    root_cause TEXT,
    action_items JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Incident updates
CREATE TABLE incident_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    
    status TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Author
    posted_by UUID REFERENCES users(id),
    
    -- Visibility
    is_public BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- SLA definitions
CREATE TABLE sla_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identity
    tier sla_tier NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Uptime
    uptime_percentage DECIMAL(5,2) NOT NULL,  -- 99.99, 99.95, etc.
    
    -- Response times
    response_time_critical_minutes INTEGER,
    response_time_high_minutes INTEGER,
    response_time_medium_minutes INTEGER,
    response_time_low_minutes INTEGER,
    
    -- Resolution times
    resolution_time_critical_hours INTEGER,
    resolution_time_high_hours INTEGER,
    resolution_time_medium_hours INTEGER,
    resolution_time_low_hours INTEGER,
    
    -- Support
    support_hours TEXT,                    -- '24x7', 'business_hours'
    dedicated_support BOOLEAN DEFAULT FALSE,
    
    -- Credits
    credit_policy JSONB,                   -- Downtime to credit mapping
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- SLA tracking
CREATE TABLE sla_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- SLA
    sla_tier sla_tier NOT NULL,
    
    -- Metrics
    uptime_percentage DECIMAL(5,4),
    downtime_minutes INTEGER DEFAULT 0,
    
    -- Tickets
    tickets_total INTEGER DEFAULT 0,
    tickets_within_sla INTEGER DEFAULT 0,
    first_response_sla_met_percent DECIMAL(5,2),
    resolution_sla_met_percent DECIMAL(5,2),
    
    -- Credits
    credits_earned_cents INTEGER DEFAULT 0,
    credits_applied BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, period_start, period_end)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Tickets
CREATE INDEX idx_tickets_tenant ON support_tickets(tenant_id);
CREATE INDEX idx_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX idx_tickets_sla_due ON support_tickets(first_response_due) WHERE status = 'new';
CREATE INDEX idx_tickets_created ON support_tickets(created_at DESC);
CREATE INDEX idx_tickets_tags ON support_tickets USING GIN(tags);

-- Chat
CREATE INDEX idx_chat_tenant ON chat_conversations(tenant_id);
CREATE INDEX idx_chat_status ON chat_conversations(status);
CREATE INDEX idx_chat_assigned ON chat_conversations(assigned_to);
CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_channel ON notifications(channel, status);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Knowledge base
CREATE INDEX idx_kb_tenant ON knowledge_base_articles(tenant_id);
CREATE INDEX idx_kb_status ON knowledge_base_articles(status);
CREATE INDEX idx_kb_category ON knowledge_base_articles(category);
CREATE INDEX idx_kb_search ON knowledge_base_articles USING GIN(search_vector);
CREATE INDEX idx_kb_tags ON knowledge_base_articles USING GIN(tags);

-- Health metrics
CREATE INDEX idx_health_service ON system_health_metrics(service_name, recorded_at DESC);
CREATE INDEX idx_health_status ON system_health_metrics(status, recorded_at DESC);

-- Incidents
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_started ON incidents(started_at DESC);
CREATE INDEX idx_incidents_services ON incidents USING GIN(affected_services);

-- SLA
CREATE INDEX idx_sla_metrics_tenant ON sla_metrics(tenant_id, period_start);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_tickets_timestamp
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_kb_timestamp
    BEFORE UPDATE ON knowledge_base_articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Full-text search for knowledge base
CREATE OR REPLACE FUNCTION update_kb_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kb_search_vector_update
    BEFORE INSERT OR UPDATE ON knowledge_base_articles
    FOR EACH ROW EXECUTE FUNCTION update_kb_search_vector();
