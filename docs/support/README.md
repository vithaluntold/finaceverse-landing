# Configuration & Support

This folder contains configuration files, credentials, and third-party service setup guides.

## 📄 Documents

### [CREDENTIALS.md](CREDENTIALS.md) 🔒
Credentials and secrets management:
- Environment variables reference
- API keys location
- Database credentials
- Third-party service tokens
- Secrets management best practices
- How to rotate credentials

**⚠️ IMPORTANT:** This file may contain sensitive information. Never commit actual credentials to git.

### [MAILGUN_DNS_SETUP.md](MAILGUN_DNS_SETUP.md)
Mailgun email service configuration:
- DNS records setup (SPF, DKIM, DMARC)
- Domain verification
- Sending domain configuration
- Webhook setup for events
- Testing email delivery
- Troubleshooting delivery issues

**Use Case:** Transactional emails, password resets, notifications

### [NEWSLETTER_SETUP.md](NEWSLETTER_SETUP.md)
Newsletter and email marketing setup:
- Email service provider integration
- Subscriber management
- Email template configuration
- Automation workflows
- List segmentation
- Compliance (CAN-SPAM, GDPR)
- Unsubscribe handling

**Use Case:** Marketing emails, product updates, newsletters

---

## 🔧 Configuration Checklist

**Required Environment Variables:**
```bash
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Authentication
JWT_SECRET=...
SESSION_SECRET=...

# Email
MAILGUN_API_KEY=...
MAILGUN_DOMAIN=...

# Analytics
GOOGLE_ANALYTICS_ID=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://finaceverse.io
```

**Setup Order:**
1. Database credentials → [CREDENTIALS.md](CREDENTIALS.md)
2. Email service → [MAILGUN_DNS_SETUP.md](MAILGUN_DNS_SETUP.md)
3. Newsletter → [NEWSLETTER_SETUP.md](NEWSLETTER_SETUP.md)

---

## 🔐 Security Notes

- **Never commit** CREDENTIALS.md with actual secrets
- Use `.env` files for local development
- Use Railway/platform secrets for production
- Rotate credentials regularly (every 90 days recommended)
- Use different credentials for dev/staging/production

---

**Back to:** [Documentation Index](../INDEX.md) | [Main README](../../README.md)
