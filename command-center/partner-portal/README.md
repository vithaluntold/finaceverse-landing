# Partner Portal API

**The Revenue Engine for FinACEverse**  
Complete partner management system for resellers, affiliates, and white-label partners.

---

## Features

### 1. Multi-Partner Type Support
- **Resellers**: Full customer management, billing control, pricing authority
- **Affiliates**: Commission-based referral tracking with cookie management
- **Referral Partners**: Simple referral code tracking
- **White-Label**: Complete brand customization with custom domains

### 2. Commission Management
- Flexible commission types: percentage, flat, tiered
- Automatic commission calculation
- Approval workflows
- Commission history and tracking
- Multi-currency support

### 3. Automated Payouts
- Configurable payout frequencies: weekly, biweekly, monthly, quarterly
- Multiple payout methods: bank transfer, PayPal, Stripe, Razorpay
- Automatic payout generation from approved commissions
- Payout history and reconciliation
- Failed payout retry logic

### 4. Partner Tiers
- 5 tiers: Bronze, Silver, Gold, Platinum, Diamond
- Tier-based commission rates and benefits
- Automatic tier progression based on performance
- Custom benefits per tier
- Dedicated account managers for top tiers

### 5. White-Label Capabilities
- Custom branding: logos, colors, domain
- Custom email templates
- Hide FinACEverse branding
- Custom dashboards and reports
- API access control

### 6. Analytics & Metrics
- Real-time partner performance dashboards
- Conversion rate tracking
- Average order value
- Customer lifetime value
- Referral source tracking
- Revenue forecasting

---

## API Endpoints

### Partners

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/partners` | List all partners (with filters) |
| GET | `/api/v1/partners/:id` | Get partner details |
| POST | `/api/v1/partners` | Create new partner |
| PUT | `/api/v1/partners/:id` | Update partner |
| DELETE | `/api/v1/partners/:id` | Delete partner |

**Query Filters:**
- `tier` - Filter by partner tier
- `status` - Filter by status (active, inactive, suspended, pending)
- `partnerType` - Filter by type (reseller, affiliate, referral, white_label)

### Commissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/commissions` | List commissions |
| POST | `/api/v1/commissions` | Create commission |
| POST | `/api/v1/commissions/:id/approve` | Approve commission |

### Payouts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/payouts` | List payouts |
| POST | `/api/v1/payouts` | Create payout |

### Referrals

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/referrals/track` | Track referral click |
| POST | `/api/v1/referrals/:id/convert` | Convert referral to customer |

### Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/partners/:id/metrics` | Get partner metrics |
| POST | `/api/v1/partners/:id/metrics/calculate` | Recalculate metrics |

---

## Environment Variables

```bash
NODE_ENV=production
PORT=3500
DATABASE_URL=postgresql://user:pass@localhost:5432/partner_portal
JWT_SECRET=your-jwt-secret-here
REDIS_URL=redis://localhost:6379

# Payment Gateways
STRIPE_SECRET_KEY=sk_live_xxx
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx
```

---

## Database Schema

### Tables

1. **partners** - Core partner information
2. **reseller_configs** - Reseller-specific settings
3. **affiliate_configs** - Affiliate-specific settings
4. **white_label_configs** - White-label branding
5. **partner_tier_configs** - Tier definitions
6. **commissions** - Commission records
7. **payouts** - Payout transactions
8. **referrals** - Referral tracking
9. **partner_metrics** - Performance metrics

### Key Features

- Automatic `updated_at` timestamps via triggers
- UUID primary keys for all tables
- JSONB for flexible metadata storage
- Materialized partner metrics
- Built-in functions for metric calculation

---

## Partner Tier System

| Tier | Min Revenue/Month | Min Customers | Commission | Benefits |
|------|------------------|---------------|------------|----------|
| Bronze | $0 | 0 | 10% | Standard support, 1K API calls/hour |
| Silver | $5K | 10 | 15% | Standard support, 2.5K API calls/hour |
| Gold | $25K | 50 | 20% | Priority support, 5K API calls/hour |
| Platinum | $100K | 200 | 25% | Dedicated manager, 10K API calls/hour |
| Diamond | $500K | 1000 | 30% | Dedicated manager, 25K API calls/hour |

---

## Reseller Features

### Customer Management
- Create and manage customer accounts
- Provision subscriptions
- Manage billing for customers
- Set custom pricing (within authority limits)

### Territory Management
- Restrict sales to specific countries
- Product-level restrictions
- Minimum order values
- Credit limits

### Revenue Tracking
- Monthly Recurring Revenue (MRR)
- Active subscription count
- Customer churn tracking

---

## Affiliate Features

### Tracking
- Cookie-based attribution (configurable duration)
- Multi-touch attribution support
- Referral source tracking
- Conversion funnel analytics

### Commission Options
- First purchase only or recurring
- Configurable recurring months
- Product-specific commissions
- Minimum purchase thresholds

### Performance Metrics
- Total referrals vs converted
- Conversion rate
- Average order value
- Customer lifetime value

---

## White-Label Configuration

### Branding
```json
{
  "brandName": "Acme Financial",
  "logo": {
    "primary": "https://cdn.example.com/logo.png",
    "favicon": "https://cdn.example.com/favicon.ico"
  },
  "colors": {
    "primary": "#1a73e8",
    "secondary": "#34a853",
    "accent": "#fbbc04"
  },
  "domain": "finance.acme.com",
  "hideFinACEverseBranding": true
}
```

### Custom Features
- Custom dashboard layouts
- Branded reports (PDF/Excel)
- API access with custom rate limits
- Custom email templates
- Dedicated subdomain/domain

---

## Usage Examples

### Create a Reseller

```bash
curl -X POST http://localhost:3500/api/v1/partners \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-123",
    "partnerType": "reseller",
    "companyName": "Acme Resellers Inc",
    "contactName": "John Smith",
    "email": "john@acme.com",
    "tier": "silver",
    "commissionRate": 15,
    "payoutFrequency": "monthly",
    "contractStartDate": "2026-01-16"
  }'
```

### Track a Referral

```bash
curl -X POST http://localhost:3500/api/v1/referrals/track \
  -H "Content-Type: application/json" \
  -d '{
    "referralCode": "ACME1234",
    "landingUrl": "https://finaceverse.com/pricing",
    "referrerUrl": "https://acme.com/partners",
    "ipAddress": "203.0.113.42",
    "userAgent": "Mozilla/5.0..."
  }'
```

### Create Commission

```bash
curl -X POST http://localhost:3500/api/v1/commissions \
  -H "Content-Type: application/json" \
  -d '{
    "partnerId": "550e8400-e29b-41d4-a716-446655440000",
    "customerId": "cust_abc123",
    "subscriptionId": "sub_xyz789",
    "type": "signup",
    "amount": 999.00,
    "commissionRate": 20
  }'
```

### Generate Payout

```bash
curl -X POST http://localhost:3500/api/v1/payouts \
  -H "Content-Type: application/json" \
  -d '{
    "partnerId": "550e8400-e29b-41d4-a716-446655440000",
    "periodStart": "2026-01-01",
    "periodEnd": "2026-01-31",
    "method": "bank_transfer",
    "initiatedBy": "admin@finaceverse.com"
  }'
```

---

## Security

### Authentication
- JWT-based API authentication
- Role-based access control via Cerbos
- Partner portal login with Zitadel SSO

### Data Protection
- All sensitive data encrypted at rest
- PCI-DSS compliant payment handling
- GDPR-compliant data retention
- Audit logs for all financial transactions

### Rate Limiting
- Tier-based API rate limits
- IP-based throttling
- Webhook retry logic with exponential backoff

---

## Deployment

### Docker

```bash
cd command-center
docker-compose up -d partner-portal
```

### Direct

```bash
cd command-center/partner-portal
npm install
npm run build
npm start
```

### Environment

Ensure PostgreSQL is running with the partner_portal schema initialized:

```bash
psql -U finaceverse -d finaceverse -f init-scripts/postgres/04_partner_portal.sql
```

---

## Integration with FinACEverse

### Billing Integration (Lago)
- Automatic commission creation on invoice payment
- Subscription tracking for resellers
- Recurring commission processing

### Customer Management
- Partner-tagged customers
- Reseller customer provisioning
- White-label customer isolation

### Analytics (Metabase)
- Partner performance dashboards
- Revenue attribution reports
- Commission forecasting

---

## Roadmap

### Q1 2026
- [x] Core partner management
- [x] Commission & payout automation
- [x] Multi-tier system
- [ ] Partner portal UI (React)
- [ ] Mobile app for partners

### Q2 2026
- [ ] Advanced analytics & forecasting
- [ ] Co-marketing campaign tracking
- [ ] Partner training & certification
- [ ] Marketplace for partner services

### Q3 2026
- [ ] Multi-level marketing (MLM) support
- [ ] Partner collaboration tools
- [ ] Automated tier progression
- [ ] Predictive churn detection

---

*Built for FinACEverse Command Center - Phase 4*  
*Last Updated: January 16, 2026*
