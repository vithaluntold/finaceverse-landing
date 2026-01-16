# Phase 6: Developer Portal, Communication Hub & Legal Compliance

**Status:** ✅ Complete  
**Deployed:** January 16, 2026  
**Commit:** 1a45c41  

---

## 🎯 Overview

Phase 6 adds three critical services to the Command Center:

1. **Developer Portal** (Port 3502) - API key management, webhooks, rate limiting
2. **Communication Hub** (Port 3503) - Notifications, announcements, email templates
3. **Legal & Compliance** (Port 3504) - ToS versioning, GDPR, consent management

All services are TypeScript-based with Express, PostgreSQL, JWT authentication, and comprehensive validation.

---

## 📦 Services Added

### 1. Developer Portal (Port 3502)

**Purpose:** Provide developers with API access, webhook management, and monitoring tools.

**Features:**
- ✅ API Key Management
  - Create API keys with custom names and permissions
  - Rotate keys for security
  - Revoke compromised keys
  - Automatic expiration tracking
  - Per-key rate limiting (configurable limits)

- ✅ Webhook Management
  - Create webhooks with target URLs
  - 14 event types supported
  - Delivery queue with retry logic (exponential backoff)
  - Signature verification (HMAC SHA256)
  - Webhook logs and delivery status tracking
  - Test webhook delivery

- ✅ Rate Limiting
  - Per-key sliding window rate limiting
  - Configurable limits per tenant
  - Automatic blocking on limit exceeded
  - Rate limit stats and monitoring

**API Endpoints:**
```
POST   /api/v1/api-keys              Create API key (admin+)
GET    /api/v1/api-keys              List API keys (admin+)
POST   /api/v1/api-keys/:id/rotate   Rotate key (admin+)
DELETE /api/v1/api-keys/:id          Revoke key (admin+)
POST   /api/v1/api-keys/validate     Validate key (public)

POST   /api/v1/webhooks              Create webhook (admin+)
GET    /api/v1/webhooks              List webhooks (admin+)
GET    /api/v1/webhooks/:id          Get webhook (operator+)
PATCH  /api/v1/webhooks/:id          Update webhook (admin+)
POST   /api/v1/webhooks/:id/test     Test webhook (operator+)
GET    /api/v1/webhooks/:id/deliveries  Get delivery logs (operator+)
```

**Webhook Event Types:**
- `user.created`, `user.updated`, `user.deleted`
- `payment.success`, `payment.failed`, `payment.refunded`
- `subscription.created`, `subscription.cancelled`, `subscription.renewed`
- `invoice.created`, `invoice.paid`, `invoice.overdue`
- `workflow.started`, `workflow.completed`

---

### 2. Communication Hub (Port 3503)

**Purpose:** Centralized communication system for announcements, notifications, and emails.

**Features:**
- ✅ In-App Announcements
  - 4 display types: banner, modal, toast, tooltip
  - Priority levels: low, medium, high, critical
  - Target audience filtering
  - Start/end date scheduling
  - Dismissible with tracking
  - Action buttons with URLs
  - View and dismiss count analytics

- ✅ Email Templates
  - Template versioning
  - Variable interpolation with `{{variable}}` syntax
  - Category organization
  - HTML and text versions
  - Preview before sending
  - Global or tenant-specific templates

- ✅ Notification System
  - 4 channels: in_app, email, push, sms
  - Notification types: info, success, warning, error
  - Unread count tracking
  - Mark as read/unread
  - Bulk mark all as read
  - Action URLs for click-through

- ✅ Push Notifications
  - Web Push API integration
  - Subscription management
  - Device tracking (user agent)
  - Active/inactive subscription tracking

**API Endpoints:**
```
GET    /api/v1/announcements/active     Get active announcements (viewer+)
POST   /api/v1/announcements            Create announcement (admin+)
GET    /api/v1/announcements            List announcements (admin+)
POST   /api/v1/announcements/:id/view   Record view (viewer+)
POST   /api/v1/announcements/:id/dismiss  Dismiss announcement (viewer+)
POST   /api/v1/announcements/:id/deactivate  Deactivate (admin+)

POST   /api/v1/email-templates          Create template (admin+)
GET    /api/v1/email-templates          List templates (viewer+)
GET    /api/v1/email-templates/:id      Get template (viewer+)
POST   /api/v1/email-templates/:id/preview  Preview template (viewer+)
POST   /api/v1/email/send               Send email (operator+)

GET    /api/v1/notifications            Get user notifications (viewer+)
GET    /api/v1/notifications/unread-count  Get unread count (viewer+)
POST   /api/v1/notifications/send       Send notification (operator+)
POST   /api/v1/notifications/:id/read   Mark as read (viewer+)
POST   /api/v1/notifications/read-all   Mark all as read (viewer+)

POST   /api/v1/push/subscribe           Register push subscription (viewer+)
POST   /api/v1/push/unsubscribe         Unregister push (viewer+)
```

---

### 3. Legal & Compliance (Port 3504)

**Purpose:** Manage legal documents, user consent, and GDPR compliance.

**Features:**
- ✅ Legal Document Management
  - 7 document types: ToS, Privacy Policy, Cookie Policy, DPA, Acceptable Use, SLA, Custom
  - Version control with checksums
  - Effective date and expiration tracking
  - Publish workflow (draft → active)
  - Mandatory vs optional acceptance
  - Global or tenant-specific documents

- ✅ Consent Management
  - User consent tracking with IP and user agent
  - Automatic consent withdrawal on new version
  - Pending consent detection
  - Consent history with timestamps
  - Manual consent withdrawal

- ✅ GDPR Compliance
  - 6 request types: access, rectification, erasure, portability, restriction, objection
  - 30-day SLA tracking
  - Request status workflow: pending → in_progress → completed/rejected
  - Overdue request alerts
  - Data export (JSON format)
  - Data erasure with audit trail

- ✅ Consent Preferences
  - Category-based consent (marketing, analytics, etc.)
  - Version tracking for changes
  - Grant/withdraw timestamps
  - User-facing preference center

- ✅ Audit Trail
  - Immutable processing logs
  - All data access tracked
  - GDPR request audit trail
  - Consent changes logged

**API Endpoints:**
```
POST   /api/v1/documents                Create document (admin+)
POST   /api/v1/documents/:id/publish    Publish document (admin+)
GET    /api/v1/documents                List documents (viewer+)
GET    /api/v1/documents/active/:type   Get active by type (public)
GET    /api/v1/documents/history/:type  Get version history (admin+)

POST   /api/v1/consent                  Record consent (viewer+)
GET    /api/v1/consent                  Get user consents (viewer+)
GET    /api/v1/consent/pending          Check pending consents (viewer+)
POST   /api/v1/consent/:id/withdraw     Withdraw consent (viewer+)

POST   /api/v1/gdpr/requests            Create GDPR request (viewer+)
GET    /api/v1/gdpr/requests            List requests (admin+)
GET    /api/v1/gdpr/requests/overdue    Get overdue requests (admin+)
GET    /api/v1/gdpr/requests/:id        Get specific request (operator+)
PATCH  /api/v1/gdpr/requests/:id        Update request (operator+)

GET    /api/v1/preferences              Get consent preferences (viewer+)
PUT    /api/v1/preferences              Update preferences (viewer+)

GET    /api/v1/gdpr/export              Export user data (viewer+)
DELETE /api/v1/gdpr/erase/:userId       Erase user data (admin+)
GET    /api/v1/gdpr/processing-log      Get processing log (viewer+)
```

---

## 🗄️ Database Schema

All services auto-create their PostgreSQL tables on first run:

### Developer Portal Schema
```sql
CREATE SCHEMA IF NOT EXISTS developer_portal;

CREATE TABLE developer_portal.api_keys (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(100),
  key_hash VARCHAR(255) UNIQUE,
  prefix VARCHAR(20),
  permissions JSONB,
  rate_limit JSONB,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN,
  created_by UUID,
  created_at TIMESTAMPTZ
);

CREATE TABLE developer_portal.webhooks (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  url TEXT NOT NULL,
  events JSONB,
  secret VARCHAR(64),
  is_active BOOLEAN,
  retry_config JSONB,
  created_at TIMESTAMPTZ
);

CREATE TABLE developer_portal.webhook_deliveries (
  id UUID PRIMARY KEY,
  webhook_id UUID REFERENCES developer_portal.webhooks(id),
  event_type VARCHAR(50),
  payload JSONB,
  status VARCHAR(20),
  attempts INTEGER,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

### Communication Hub Schema
```sql
CREATE SCHEMA IF NOT EXISTS communication_hub;

CREATE TABLE communication_hub.announcements (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  title VARCHAR(200),
  content TEXT,
  type VARCHAR(20),
  priority VARCHAR(20),
  target_audience JSONB,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  is_dismissible BOOLEAN,
  action_url TEXT,
  action_text VARCHAR(50),
  style JSONB,
  view_count BIGINT,
  dismiss_count BIGINT,
  is_active BOOLEAN,
  created_by UUID,
  created_at TIMESTAMPTZ
);

CREATE TABLE communication_hub.email_templates (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  name VARCHAR(100),
  subject VARCHAR(500),
  body_html TEXT,
  body_text TEXT,
  variables JSONB,
  category VARCHAR(50),
  is_active BOOLEAN,
  version INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE TABLE communication_hub.notifications (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  type VARCHAR(20),
  channel VARCHAR(20),
  title VARCHAR(200),
  message TEXT,
  action_url TEXT,
  metadata JSONB,
  is_read BOOLEAN,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

### Legal Compliance Schema
```sql
CREATE SCHEMA IF NOT EXISTS legal_compliance;

CREATE TABLE legal_compliance.documents (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  type VARCHAR(50),
  title VARCHAR(200),
  content TEXT,
  version VARCHAR(20),
  effective_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN,
  is_mandatory BOOLEAN,
  requires_acceptance BOOLEAN,
  checksum VARCHAR(64),
  published_at TIMESTAMPTZ,
  published_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ
);

CREATE TABLE legal_compliance.user_consents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  document_id UUID REFERENCES legal_compliance.documents(id),
  document_version VARCHAR(20),
  ip_address INET,
  user_agent TEXT,
  accepted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  is_active BOOLEAN
);

CREATE TABLE legal_compliance.gdpr_requests (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  requester_id UUID,
  requester_email VARCHAR(255),
  request_type VARCHAR(20),
  status VARCHAR(20),
  description TEXT,
  data_categories JSONB,
  processing_notes TEXT,
  completed_data JSONB,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE TABLE legal_compliance.consent_preferences (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  category VARCHAR(50),
  is_granted BOOLEAN,
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  version INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(tenant_id, user_id, category)
);
```

---

## 🔐 Authentication

All endpoints (except health checks and public endpoints) require JWT authentication:

```bash
# Get token
curl -X POST http://localhost:3500/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-password"}'

# Use token
curl http://localhost:3502/api/v1/api-keys \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Role Requirements:**
- `superadmin` (100) - Full access
- `admin` (80) - Create/update/delete resources
- `operator` (60) - Execute operations, view data
- `viewer` (40) - Read-only access

---

## 🚀 Deployment

### Local Development

```bash
# Developer Portal
cd command-center/developer-portal
npm install
npm run dev

# Communication Hub
cd command-center/communication-hub
npm install
npm run dev

# Legal Compliance
cd command-center/legal-compliance
npm install
npm run dev
```

### Production (Docker)

```bash
# Build images
docker build -t finaceverse/developer-portal:latest ./command-center/developer-portal
docker build -t finaceverse/communication-hub:latest ./command-center/communication-hub
docker build -t finaceverse/legal-compliance:latest ./command-center/legal-compliance

# Run containers
docker run -d -p 3502:3502 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=... \
  finaceverse/developer-portal:latest
```

### Railway Deployment

All services automatically deploy when pushed to main branch. Railway detects Dockerfiles and builds/deploys automatically.

**Environment Variables Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT token validation
- `NODE_ENV=production`

---

## 📊 Monitoring

All services expose:
- Health endpoint: `GET /health`
- Structured logging with Pino
- PostgreSQL connection pooling
- Automatic retry logic for transient failures

**Health Check Response:**
```json
{
  "status": "healthy",
  "service": "developer-portal",
  "timestamp": "2026-01-16T12:00:00.000Z"
}
```

---

## 🧪 Testing Examples

### Create API Key
```bash
curl -X POST http://localhost:3502/api/v1/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API",
    "permissions": ["read", "write"],
    "rateLimit": {"requests": 1000, "window": 60}
  }'
```

### Create Announcement
```bash
curl -X POST http://localhost:3503/api/v1/announcements \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Scheduled Maintenance",
    "content": "System will be down for 1 hour",
    "type": "banner",
    "priority": "high",
    "targetAudience": ["all"],
    "startAt": "2026-01-20T00:00:00Z",
    "endAt": "2026-01-20T01:00:00Z"
  }'
```

### Create GDPR Request
```bash
curl -X POST http://localhost:3504/api/v1/gdpr/requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requesterEmail": "user@example.com",
    "requestType": "access",
    "description": "Request all my personal data",
    "dataCategories": ["profile", "transactions", "communications"]
  }'
```

---

## 📈 Next Steps

**Phase 7 (Planned):**
1. Advanced analytics dashboard for all services
2. Webhook retry dashboard with manual retry
3. Email delivery tracking (opens, clicks)
4. SMS notification support
5. Multi-language support for legal documents
6. Automated GDPR compliance reports

---

## 📚 Related Documentation

- [Command Center README](../README.md)
- [Command Center Architecture](../../docs/architecture/COMMAND_CENTER_ARCHITECTURE.md)
- [Security Layers](../../backend/security/)

---

*Phase 6 Complete - Deployed January 16, 2026*
