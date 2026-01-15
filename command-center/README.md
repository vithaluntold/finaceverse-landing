# FinACEverse Command Center

**Phase 1 + Phase 2: Core Infrastructure, Billing & Support**  
**Version:** 2.0  
**Date:** January 16, 2026  
**Status:** ✅ Ready for Deployment

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

## 🗓️ Next Steps

After Phase 1 is running:

1. **Week 3-4:** Add Wazuh (SIEM) for security monitoring
2. **Week 5-6:** Deploy Lago (Billing) + Hyperswitch (Payments)
3. **Week 7-8:** Deploy Chatwoot (Support) + BookStack (Knowledge Base)

---

## 📚 Related Documentation

- [Command Center Architecture](../docs/architecture/COMMAND_CENTER_ARCHITECTURE.md)
- [Open Source vs SaaS Decision](../docs/strategy/OPEN_SOURCE_VS_SAAS_DECISION.md)
- [Security Layers](../backend/security/)

---

*FinACEverse Command Center - Built for Scale, Secured by Design*
