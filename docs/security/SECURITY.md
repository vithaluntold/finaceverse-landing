# FinACEverse Security Documentation

## 🔐 Overview

This document outlines the comprehensive security measures implemented in the FinACEverse platform to protect both frontend and backend systems. As a common administration platform for all 7 modules (VAMN, Accute, Cyloid, Luca AI, Finaid Hub, Finory, EPI-Q), security is paramount.

---

## 🛡️ Backend Security Features

### 1. Authentication & Authorization

#### JWT (JSON Web Tokens)
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Token Expiry**: 24 hours
- **Token Structure**: Includes userId, username, role
- **Issuer/Audience**: Validated for authenticity
- **Secure Secret**: Minimum 32 characters in production

#### Password Security
- **Hashing**: bcrypt with cost factor of 12
- **Password Requirements**:
  - Minimum 12 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character (@$!%*?&)
- **Timing-safe comparison**: Prevents timing attacks

#### Role-Based Access Control (RBAC)
- Admin role for standard operations
- Superadmin role for privileged operations
- Role validation on all protected endpoints

### 2. HTTP Security Headers (Helmet.js)

```javascript
Content-Security-Policy: Strict CSP rules
Strict-Transport-Security: HSTS with 1-year max-age
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### 3. Rate Limiting

#### Authentication Endpoints
- **Window**: 15 minutes
- **Max Attempts**: 5 requests
- **Protects**: Login, Admin creation

#### API Endpoints
- **Window**: 15 minutes
- **Max Requests**: 100 per IP
- **Protects**: All analytics/SEO endpoints

#### Public Tracking Endpoints
- **Window**: 1 minute
- **Max Requests**: 60 per minute
- **Protects**: Performance tracking, visit tracking

### 4. CORS (Cross-Origin Resource Sharing)

```javascript
Allowed Origins:
- https://www.finaceverse.io
- https://finaceverse.io
- http://localhost:3000 (development only)

Methods: GET, POST, PUT, DELETE, OPTIONS
Credentials: Enabled
```

### 5. Input Validation & Sanitization

#### Express Validator
- Username: 3-50 characters, alphanumeric + underscore/hyphen
- Password: Validated against strength requirements
- Email: Valid email format
- URLs: Maximum length validation
- Metric names: Whitelist validation

#### SQL Injection Protection
- Parameterized queries (PostgreSQL)
- Input sanitization
- No dynamic SQL construction

#### XSS Prevention
- HTML character escaping
- Content-Type validation
- No eval() or innerHTML usage

### 6. HTTP Parameter Pollution (HPP) Protection
- Prevents duplicate parameters
- Protects against query string attacks

### 7. Environment Variable Validation
- Checks for required variables on startup
- Prevents default/insecure values in production
- Exits process if critical variables missing

---

## 🌐 Frontend Security Features

### 1. Content Security Policy (CSP)
- Restricts resource loading to trusted sources
- Prevents inline script execution (where possible)
- Blocks object/embed tags

### 2. XSS Protection
- React's built-in JSX escaping
- Dangerous HTML sanitization
- No `dangerouslySetInnerHTML` without sanitization

### 3. HTTPS Enforcement
- All production traffic over HTTPS
- Upgrade Insecure Requests directive
- HSTS preloading

### 4. Secure Communication
- All API calls use Authorization header
- Token stored in memory (not localStorage)
- CORS credentials enabled

---

## 🔑 Environment Variables (Production)

### Required Variables
```bash
# JWT Security
JWT_SECRET=<64-character-random-string>

# Database
DATABASE_URL=<postgresql-connection-string>
REDIS_URL=<redis-connection-string>

# Admin Creation
ADMIN_SECRET_KEY=<strong-secret-key>

# CORS
ALLOWED_ORIGINS=https://www.finaceverse.io,https://finaceverse.io

# Google API (Optional but recommended)
GOOGLE_API_KEY=<api-key>
GOOGLE_CLIENT_ID=<client-id>
GOOGLE_CLIENT_SECRET=<client-secret>
GOOGLE_REFRESH_TOKEN=<refresh-token>

# Mailgun (Optional)
MAILGUN_API_KEY=<api-key>
MAILGUN_DOMAIN=<domain>
MAILGUN_MAILING_LIST=<mailing-list>
```

### Generating Secure Secrets

```bash
# JWT Secret (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Admin Secret Key
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
```

---

## 🚨 Security Best Practices

### 1. Database Security
- ✅ Use connection pooling
- ✅ Enable SSL in production
- ✅ Use parameterized queries only
- ✅ Regular backups
- ✅ Principle of least privilege for DB users

### 2. API Security
- ✅ All protected endpoints require valid JWT
- ✅ Rate limiting on all endpoints
- ✅ Input validation on all inputs
- ✅ Error messages don't leak sensitive info
- ✅ Logging (without sensitive data)

### 3. Authentication Security
- ✅ No username enumeration
- ✅ Token expiration enforced
- ✅ Secure password hashing
- ✅ Account lockout after failed attempts
- ✅ Admin creation requires secret key

### 4. Network Security
- ✅ HTTPS only in production
- ✅ CORS whitelist
- ✅ Cloudflare or CDN for DDoS protection
- ✅ IP-based rate limiting
- ✅ Firewall rules for PostgreSQL/Redis

### 5. Code Security
- ✅ Dependencies regularly updated
- ✅ No secrets in code
- ✅ .env file in .gitignore
- ✅ npm audit run regularly
- ✅ Security headers set

---

## 🔍 Security Checklist

### Pre-Deployment
- [ ] Generate strong JWT_SECRET
- [ ] Set strong ADMIN_SECRET_KEY
- [ ] Configure ALLOWED_ORIGINS
- [ ] Enable PostgreSQL SSL
- [ ] Set up HTTPS/SSL certificate
- [ ] Review all environment variables
- [ ] Run `npm audit`
- [ ] Test rate limiting
- [ ] Verify CSP headers
- [ ] Check CORS configuration

### Post-Deployment
- [ ] Monitor failed login attempts
- [ ] Check rate limit hits
- [ ] Review error logs
- [ ] Monitor database connections
- [ ] Set up alerting for suspicious activity
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Backup database regularly

---

## 🆘 Security Incident Response

### If You Suspect a Breach:

1. **Immediate Actions**
   - Rotate JWT_SECRET immediately
   - Force all users to re-authenticate
   - Check server logs for suspicious activity
   - Review database for unauthorized access

2. **Investigation**
   - Identify entry point
   - Assess scope of breach
   - Document timeline
   - Preserve evidence

3. **Remediation**
   - Patch vulnerabilities
   - Update passwords/secrets
   - Notify affected parties (if applicable)
   - Implement additional monitoring

4. **Prevention**
   - Review security measures
   - Update security policies
   - Train team members
   - Conduct security audit

---

## 📞 Security Contacts

For security issues:
- Email: security@finaceverse.io
- Report vulnerabilities privately
- Do not disclose publicly until fixed

---

## 🔄 Regular Maintenance

### Weekly
- Review access logs
- Check failed authentication attempts
- Monitor rate limit violations

### Monthly
- Run `npm audit` and fix vulnerabilities
- Review user accounts
- Update dependencies
- Check SSL certificate expiry

### Quarterly
- Full security audit
- Penetration testing
- Review and update security policies
- Team security training

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Last Updated**: January 2026  
**Version**: 1.0.0  
**Maintained by**: FinACEverse Security Team
