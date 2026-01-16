# FinACEverse Command Center

**All 3 Phases: Core Infrastructure + Billing/Support + Custom Workflow Engine**  
**Version:** 3.0  
**Date:** January 16, 2026  
**Status:** ✅ Phase 1, 2, 3 Complete - Ready for Railway Deployment

---

## 🚀 Quick Start

```bash
# 1. Make startup script executable
chmod +x start.sh

# 2. Generate secure credentials
./start.sh init

# 3. Start all services
./start.sh start
```

---

## 📦 Services Included

### Phase 1: Core Infrastructure

| Service | Purpose | Port | Dashboard |
|---------|---------|------|-----------|
| **Zitadel** | Identity Provider (SSO, OIDC) | 8080 | http://localhost:8080 |
| **Cerbos** | Policy-Based Access Control | 3592/3593 | - |
| **Vault** | Secrets Management | 8200 | http://localhost:8200 |
| **APISIX** | API Gateway | 9080/9443 | http://localhost:9000 |
| **SigNoz** | APM & Tracing | 4317/4318 | http://localhost:3301 |
| **PostgreSQL** | Database | 5432 | - |
| **Redis** | Cache & Events | 6379 | - |

### Phase 2: Billing & Support

| Service | Purpose | Port | Dashboard |
|---------|---------|------|-----------|
| **Lago** | Subscription Billing (Module 1) | 3000/8081 | http://localhost:8081 |
| **Chatwoot** | Live Chat & Tickets (Module 5) | 3100 | http://localhost:3100 |
| **BookStack** | Knowledge Base | 6875 | http://localhost:6875 |

### Phase 3: Workflow Automation & Security

| Service | Purpose | Port | Dashboard |
|---------|---------|------|-----------|
| **Accute Orchestrator** | Custom Workflow Engine (beats n8n) | 3500 | http://localhost:3500/api |
| **Unleash** | Feature Flags | 4242 | http://localhost:4242 |
| **Wazuh** | SIEM & Security Monitoring | 5601/55000 | http://localhost:5601 |

---

## 🔐 Default Credentials

After running `./start.sh init`, credentials are stored in `.env` file.

**Zitadel SuperAdmin:**
- Username: `superadmin`
- Password: (see .env → `SUPERADMIN_PASSWORD`)

**APISIX Dashboard:**
- Username: `admin`
- Password: (see .env → `APISIX_DASHBOARD_PASSWORD`)

**BookStack:**
- Email: `admin@admin.com`
- Password: `password` (change on first login)

---

## 📁 Directory Structure

```
command-center/
├── docker-compose.yml      # All services definition
├── start.sh                # Startup script
├── .env                    # Credentials (auto-generated)
├── config/
│   ├── apisix/             # API Gateway config
│   │   ├── config.yaml
│   │   ├── apisix.yaml     # Routes & plugins
│   │   └── dashboard.yaml
│   ├── cerbos/
│   │   └── cerbos.yaml     # Policy engine config
│   ├── signoz/
│   │   └── otel-collector-config.yaml
│   ├── vault/              # Secrets config
│   └── zitadel/            # Identity config
├── policies/
│   ├── command_center.yaml # Core RBAC policies
│   └── modules.yaml        # Module-specific policies
└── init-scripts/
    └── postgres/
        └── 01-init.sql     # Database initialization
```

---

## 🛡️ Security Features

### Role-Based Access Control (Cerbos)

| Role | Permissions |
|------|-------------|
| **SuperAdmin** | Full access to everything |
| **Admin** | Manage users, billing, support (no delete) |
| **Operator** | Day-to-day operations, support |
| **Viewer** | Read-only access |
| **Finance Admin** | Billing & refunds (up to $10K) |
| **Security Admin** | SIEM, threats, incidents |
| **Partner Admin** | Partner/affiliate management |

### Honeypot Routes (APISIX)

Attackers probing these routes are logged and blocked:
- `/admin`
- `/wp-admin`
- `/.env`
- `/api/debug`

### Security Headers

All API responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy: default-src 'self'`

---

## 📊 Observability

### Tracing (SigNoz)

All requests are traced with OpenTelemetry:
- Request latency
- Error rates
- Service dependencies
- Database queries

Access dashboard: http://localhost:3301

### Metrics (Prometheus)

Metrics exported at: http://localhost:9080/apisix/prometheus/metrics

---

## 🔧 Commands

```bash
# Start services
./start.sh start

# Stop services
./start.sh stop

# Restart services
./start.sh restart

# View logs
./start.sh logs

# Check status
./start.sh status

# Clean everything (DESTRUCTIVE)
./start.sh clean
```

---

## 🗓️ Implementation Status

### ✅ Phase 1: Core Infrastructure (Complete)
- **Zitadel** - Identity & SSO with OIDC/SAML
- **Cerbos** - Policy-based access control (RBAC)
- **Vault** - Secrets management & encryption
- **APISIX** - API Gateway with honeypot routes
- **SigNoz** - APM & distributed tracing
- **PostgreSQL** - Primary database
- **Redis** - Cache & pub/sub

### ✅ Phase 2: Billing & Support (Complete)
- **Lago** - Usage-based billing engine
- **Chatwoot** - Multi-channel customer support
- **BookStack** - Knowledge base & documentation

### ✅ Phase 3: Workflow Automation & Security (Complete)
- **Accute Orchestrator** - Custom workflow engine
  - 50+ financial-first nodes (Invoice OCR, Bank Reconciliation, GST/TDS)
  - AI-native execution (VAMN + Luca verification at every step)
  - ERP connectors: Tally Prime, Zoho Books, SAP B1, QuickBooks, Xero
  - BullMQ job queues + PostgreSQL persistence
  - RESTful API with Express + Zod validation
  - Cron scheduling & event-driven triggers
  - Triple-stream verification: execution + AI + audit trail
  - Compliance automation: GDPR, SOC2, ISO27001, HIPAA, PCI-DSS
- **Unleash** - Feature flags & gradual rollouts
- **Wazuh** - SIEM for security monitoring & threat detection

---

## 🎯 Accute Orchestrator Highlights

**The AI-Native Workflow Engine That Makes n8n Look Like a Toy**

### Key Differentiators
1. **Financial-First Node Library** - Invoice processing, bank reconciliation, GST returns, TDS calculations
2. **AI-Native Execution** - VAMN verifies calculations, Luca analyzes patterns, anomaly detection built-in
3. **Triple-Stream Verification** - Execution logs + AI verification + immutable audit trail
4. **ERP Connectors (Pre-Built)** - Tally (TDL XML protocol), Zoho, SAP B1, QuickBooks, Xero
5. **Compliance Automation** - GDPR redaction, SOC2 logging, audit trails, data retention

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│  API Layer (Express + Zod)                                  │
│  ├─ Workflow CRUD                                           │
│  ├─ Execution Triggers                                      │
│  └─ Monitoring & Stats                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Workflow Engine                                            │
│  ├─ Node Registry (50+ nodes)                              │
│  ├─ Expression Evaluator                                   │
│  ├─ AI Verifier (VAMN + Luca)                             │
│  └─ Audit Logger                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Job Queue (BullMQ + Redis)                                │
│  ├─ Workflow Execution Jobs                                │
│  ├─ Scheduled Jobs (Cron)                                  │
│  └─ Event-Driven Jobs (Pub/Sub)                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Storage Layer (PostgreSQL)                                 │
│  ├─ Workflows & Versions                                   │
│  ├─ Executions & Results                                   │
│  └─ Audit Logs (Immutable)                                 │
└─────────────────────────────────────────────────────────────┘
```

See [orchestrator/README.md](./orchestrator/README.md) for detailed documentation.

---

## 🗓️ Next Steps

**Phase 4 (Future):**
1. Hyperswitch payment gateway integration
2. Module-specific workflow templates
3. AI-powered workflow optimization
4. Multi-tenant workflow isolation

**Immediate Deployment:**
```bash
# Deploy to Railway
railway up
railway open

# Or deploy to your cloud provider
docker-compose up -d
```

---

## 🚢 Railway Deployment

All services are configured for Railway deployment with:
- Automatic PostgreSQL provisioning
- Redis instance provisioning
- Environment variable management
- Health checks for all services
- Auto-restart on failure

See `railway.json` for deployment configuration.

---

## 📚 Related Documentation

- [Accute Orchestrator Documentation](./orchestrator/README.md)
- [Command Center Architecture](../docs/architecture/COMMAND_CENTER_ARCHITECTURE.md)
- [Open Source vs SaaS Decision](../docs/strategy/OPEN_SOURCE_VS_SAAS_DECISION.md)
- [Security Layers](../backend/security/)

---

*FinACEverse Command Center - All 3 Phases Complete*  
*Built for Scale, Secured by Design, Automated with AI*
