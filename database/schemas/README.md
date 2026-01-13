# FinACEverse Database Schema

## The World's First Cognitive Operating System for Finance

This directory contains the complete PostgreSQL database schema for FinACEverse, supporting 8 AI-powered financial products, 14 Command Center modules, and millions of users across multi-tenant, federated deployment modes.

---

## 📁 Schema Files

| File | Description |
|------|-------------|
| `00_extensions_and_types.sql` | PostgreSQL extensions and 25+ custom ENUM types |
| `01_core_identity.sql` | Multi-tenant identity, RBAC, SSO, API keys, consent |
| `02_audit_security.sql` | Audit logs (partitioned), security events, compliance frameworks |
| `03_ai_agents_federated.sql` | AI Agent Factory, executions, Roundtable, federated learning |
| `04_documents_intelligence.sql` | Documents, extraction, Fact Graph, 3-way matching |
| `05_billing_subscriptions.sql` | Pricing, subscriptions, invoices, payments, usage metering |
| `06_support_communications.sql` | Tickets, live chat, AI bot, notifications, platform health |
| `07_devops_api_infrastructure.sql` | Feature flags, deployments, API portal, webhooks, scheduled jobs |
| `08_legal_partners_bi.sql` | Legal, partners, referrals, SEO, analytics, BI dashboards |
| `09_products_vamn_accute_cyloid.sql` | VAMN, Accute, Cyloid product schemas |
| `10_products_luca_finaid_finory.sql` | Luca AI, Fin(Ai)d Hub, Finory product schemas |
| `11_products_epiq_sumbuddy.sql` | EPI-Q, SumBuddy product schemas |
| `12_views_materialized.sql` | Views and materialized views for dashboards |
| `13_procedures_functions.sql` | Stored procedures for business logic |
| `deploy_all.sql` | Master deployment script |

---

## 🚀 Quick Start

### Prerequisites

- PostgreSQL 15+ with superuser access
- Extensions: `uuid-ossp`, `pgcrypto`, `pg_trgm`, `btree_gin`, `btree_gist`, `pg_stat_statements`, `hstore`, `citext`, `tablefunc`
- Optional: `pg_partman` for automatic partition management

### Deployment

```bash
# Create database
createdb finaceverse

# Deploy schema
cd database/schemas
psql -d finaceverse -f deploy_all.sql
```

### Individual Deployment

```bash
# Deploy files in order
psql -d finaceverse -f 00_extensions_and_types.sql
psql -d finaceverse -f 01_core_identity.sql
# ... continue with each file in order
```

---

## 🏗 Architecture

### Multi-Tenant Design

```
┌─────────────────────────────────────────────────────────────┐
│                    SHARED INFRASTRUCTURE                     │
├─────────────────────────────────────────────────────────────┤
│  Identity    │  Audit      │  AI Agents   │  Documents      │
│  (tenants,   │  (logs,     │  (agents,    │  (storage,      │
│   users,     │   security, │   executions,│   extraction,   │
│   sessions)  │   compliance│   federated) │   matching)     │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         ▼                                         ▼
┌─────────────────────┐                 ┌─────────────────────┐
│   TENANT A (SaaS)   │                 │  TENANT B (Hybrid)  │
│  ┌───────────────┐  │                 │  ┌───────────────┐  │
│  │ Products:     │  │                 │  │ Products:     │  │
│  │ - Luca AI     │  │                 │  │ - VAMN        │  │
│  │ - Cyloid      │  │                 │  │ - Accute      │  │
│  │ - Finory      │  │                 │  │ - EPI-Q       │  │
│  └───────────────┘  │                 │  └───────────────┘  │
└─────────────────────┘                 └─────────────────────┘
```

### Row-Level Security (RLS)

All tables with `tenant_id` implement RLS policies:

```sql
-- Example RLS policy
CREATE POLICY tenant_isolation_policy ON documents
    FOR ALL
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
```

### Partitioning Strategy

High-volume tables are partitioned for performance:

| Table | Partition Key | Interval |
|-------|---------------|----------|
| `audit_logs` | `timestamp` | Monthly |
| `agent_executions` | `created_at` | Quarterly |
| `page_views` | `viewed_at` | Monthly |
| `analytics_events` | `occurred_at` | Quarterly |
| `epiq_activity_logs` | `timestamp` | Quarterly |
| `epiq_task_events` | `timestamp` | Quarterly |

---

## 📊 Products Covered

### 1. VAMN (Verification & Calculation)
- Triple-stream architecture (Human, AI, Verification)
- Calculation sessions with audit trails
- 99.99% accuracy targeting

### 2. Accute (Practice Management)
- 16+ AI agents for accounting firms
- Time tracking, engagements, clients
- AI Roundtable for complex decisions

### 3. Cyloid (Document Intelligence)
- Truth Engine with 3-way matching
- Entity extraction and verification
- Fact Graph for audit trails

### 4. Luca AI (Conversational Finance)
- 10 chat modes (accountant, analyst, advisor, etc.)
- 36 specialized agents
- Tax research and calculations

### 5. Fin(Ai)d Hub (Agent Factory)
- Universal Document Intelligence (UDI)
- Custom agent builder
- ERP connectors

### 6. Finory (ERP)
- Chart of Accounts
- Journal entries with AI verification
- Zero-Fallback Protocol (must balance)

### 7. EPI-Q (Process Mining)
- BPMN process modeling
- Task mining and activity logs
- Digital Twin and simulations
- PMQL (Process Mining Query Language)

### 8. SumBuddy (Marketplace)
- B2B and B2C services
- Provider management
- Orders, scheduling, reviews

---

## 🔧 Command Center Modules

| # | Module | Tables |
|---|--------|--------|
| 1 | Financial Operations | `subscriptions`, `invoices`, `payments`, `revenue_*` |
| 2 | Platform Health | `system_health_metrics`, `system_metrics_timeseries`, `incidents` |
| 3 | DevOps Center | `feature_flags`, `deployments`, `custom_modules` |
| 4 | Security Command | `security_events`, `security_rules`, `ip_access_lists` |
| 5 | Support Center | `support_tickets`, `ticket_messages`, `knowledge_base_articles` |
| 6 | Compliance Hub | `compliance_frameworks`, `compliance_controls`, `compliance_evidence` |
| 7 | User Administration | `users`, `tenant_memberships`, `tenant_roles`, `permissions` |
| 8 | API Portal | `api_versions`, `api_endpoints`, `webhooks` |
| 9 | Communication Hub | `notifications`, `notification_templates`, `chat_conversations` |
| 10 | Legal & Contracts | `legal_documents`, `contracts`, `legal_acceptances` |
| 11 | Partner Portal | `partners`, `partner_programs`, `referrals`, `commissions` |
| 12 | Infrastructure Control | `infrastructure_regions`, `infrastructure_resources`, `maintenance_windows` |
| 13 | SEO & Analytics | `seo_pages`, `page_views`, `analytics_events` |
| 14 | BI & Reporting | `bi_dashboards`, `bi_widgets`, `bi_reports`, `data_exports` |

---

## 🔐 Security Features

### Compliance Ready
- **SOC 2**: Full audit logging, access controls, encryption at rest
- **GDPR**: Consent management, data subject requests, right to erasure
- **HIPAA**: Data classification, encryption, access logging

### Security Tables
- `security_events` - Threat detection and response
- `security_rules` - Automated security policies
- `ip_access_lists` - IP whitelisting/blacklisting
- `rate_limit_rules` - API rate limiting
- `encryption_keys` - Key management with rotation
- `vulnerability_scans` - Security scanning results

---

## 📈 Scaling Strategies

### Horizontal Scaling
- Partitioned tables for time-series data
- Efficient indexes (B-tree, GIN, GIST)
- Materialized views for dashboard performance

### Indexing Patterns
```sql
-- Tenant isolation
CREATE INDEX idx_documents_tenant_id ON documents(tenant_id);

-- Time-based queries
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Full-text search
CREATE INDEX idx_documents_search ON documents USING GIN(search_vector);

-- JSONB queries
CREATE INDEX idx_users_metadata ON users USING GIN(metadata);
```

### Materialized Views
| View | Refresh | Purpose |
|------|---------|---------|
| `mv_platform_metrics` | Hourly | Platform-wide KPIs |
| `mv_product_usage_daily` | Daily | Product usage trends |
| `mv_tenant_health` | Hourly | Tenant health scores |
| `mv_federated_contributions` | Hourly | Federated learning stats |

---

## 🔄 Maintenance

### Partition Management

```sql
-- Create next month's partition
SELECT create_partition_if_not_exists('audit_logs', CURRENT_DATE + INTERVAL '1 month', 'month');

-- Automate with pg_cron
SELECT cron.schedule('create_partitions', '0 0 1 * *', 
    $$SELECT create_partition_if_not_exists('audit_logs', CURRENT_DATE + INTERVAL '1 month', 'month')$$);
```

### Data Cleanup

```sql
-- Clean up old data (sessions, notifications, etc.)
SELECT * FROM cleanup_old_data(90); -- Keep 90 days
```

### View Refresh

```sql
-- Refresh all materialized views
SELECT refresh_all_materialized_views();

-- Schedule hourly refresh
SELECT cron.schedule('refresh_mvs', '0 * * * *', 'SELECT refresh_all_materialized_views()');
```

---

## 📋 Table Count Summary

| Category | Tables |
|----------|--------|
| Core Identity | 12 |
| Audit & Security | 15 |
| AI & Federated | 14 |
| Documents | 15 |
| Billing | 17 |
| Support & Comms | 15 |
| DevOps & API | 17 |
| Legal & BI | 18 |
| VAMN | 4 |
| Accute | 6 |
| Cyloid | 4 |
| Luca AI | 5 |
| Fin(Ai)d Hub | 6 |
| Finory | 9 |
| EPI-Q | 7 |
| SumBuddy | 9 |
| **Total** | **~173 tables** |

---

## 🧪 Testing

### Verify Deployment

```sql
-- Check table counts
SELECT 
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') AS tables,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') AS indexes,
    (SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'public') AS materialized_views;
```

### Create Test Tenant

```sql
SELECT * FROM create_tenant(
    'Test Corp',
    'test-corp',
    'business',
    'professional',
    'saas',
    ARRAY['luca_ai', 'cyloid']::product_type[],
    'admin@testcorp.com',
    'Admin',
    'User'
);
```

---

## 📞 Support

For questions about the schema:
1. Check the inline comments in each SQL file
2. Review the ERD diagrams (if available)
3. Contact the FinACEverse platform team

---

## 📜 License

Proprietary - FinACEverse Platform

---

*Built for the future of intelligent finance.*
