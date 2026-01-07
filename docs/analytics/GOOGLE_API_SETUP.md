# Google API Keys Setup Guide

This guide explains how to obtain and configure all Google API keys needed for FinACEverse analytics.

## 1. Google Analytics 4 (GA4) - Already Configured

**Current Status:** ✅ Already configured with measurement ID `G-FLZNK5GKTT`

**Location in Code:** `src/utils/analytics.js`

No additional setup needed - GA4 is already tracking page views, events, and user interactions.

---

## 2. Google PageSpeed Insights API

**Purpose:** Automated website performance monitoring every 6 hours

### Step-by-Step Setup:

#### A. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name: `FinACEverse Analytics`
4. Click "Create"

#### B. Enable PageSpeed Insights API
1. In Cloud Console, go to "APIs & Services" → "Library"
2. Search for "PageSpeed Insights API"
3. Click on it → Click "Enable"

#### C. Create API Key
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the generated key (looks like: `AIzaSyC1234567890abcdefghijklmnopqrstuvw`)

#### D. Restrict API Key (Security Best Practice)
1. Click "Edit API key" (pencil icon)
2. Under "API restrictions":
   - Select "Restrict key"
   - Check only "PageSpeed Insights API"
3. Under "Application restrictions":
   - Select "HTTP referrers (web sites)"
   - Add: `https://www.finaceverse.io/*`
4. Click "Save"

#### E. Add to Railway Environment
```bash
railway variables set GOOGLE_API_KEY="AIzaSyC1234567890abcdefghijklmnopqrstuvw"
```

**Current Implementation:** `server.js` lines 160-220 (runPageSpeedTest function)

---

## 3. Google Search Console API

**Purpose:** Track search queries, clicks, impressions, and CTR from Google Search results

### Step-by-Step Setup:

#### A. Verify Website Ownership
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Click "Add property"
3. Enter: `https://www.finaceverse.io`
4. Choose verification method:
   - **HTML File Upload:** Download verification file, add to `public/` folder
   - **DNS Verification:** Add TXT record to domain DNS (recommended)
   - **Meta Tag:** Add to `public/index.html` <head>
5. Click "Verify"

#### B. Enable Search Console API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (`FinACEverse Analytics`)
3. Go to "APIs & Services" → "Library"
4. Search for "Google Search Console API"
5. Click "Enable"

#### C. Create OAuth 2.0 Credentials
Search Console API requires OAuth (not just API key):

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - User Type: External
   - App name: FinACEverse Analytics
   - Support email: your email
   - Authorized domains: `finaceverse.io`
   - Developer contact: your email
4. Application type: "Web application"
5. Name: "FinACEverse Server"
6. Authorized redirect URIs:
   - `https://www.finaceverse.io/api/auth/google/callback`
   - `http://localhost:5000/api/auth/google/callback` (for testing)
7. Click "Create"
8. Download JSON credentials (looks like `client_secret_123456.json`)

#### D. Add Credentials to Railway
```bash
# Copy client ID and secret from downloaded JSON
railway variables set GOOGLE_CLIENT_ID="123456789-abcdefg.apps.googleusercontent.com"
railway variables set GOOGLE_CLIENT_SECRET="GOCSPX-abc123def456"
```

#### E. Get Refresh Token (One-time Setup)
1. Run this curl command (replace CLIENT_ID):
```bash
https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:5000/api/auth/google/callback&response_type=code&scope=https://www.googleapis.com/auth/webmasters.readonly&access_type=offline&prompt=consent
```

2. Authorize in browser, copy the `code` from callback URL
3. Exchange code for tokens:
```bash
curl -X POST https://oauth2.googleapis.com/token \
  -d "code=YOUR_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=http://localhost:5000/api/auth/google/callback" \
  -d "grant_type=authorization_code"
```

4. Save refresh_token to Railway:
```bash
railway variables set GOOGLE_REFRESH_TOKEN="1//0abc123def456"
```

---

## 4. ipapi.co Geolocation (Currently Free)

**Current Status:** ✅ Already in use for geographic analytics

**Implementation:** `server.js` line 237 (`https://ipapi.co/${ip}/json/`)

**Free Tier:** 30,000 requests/month

**Upgrade (if needed):**
1. Go to [ipapi.co](https://ipapi.co/)
2. Sign up for paid plan
3. Get API key
4. Add to Railway: `railway variables set IPAPI_KEY="your_key"`
5. Update URL: `https://api.ipapi.co/${ip}/json/?key=${process.env.IPAPI_KEY}`

---

## 5. Environment Variables Summary

After completing all setups, your Railway variables should include:

```bash
DATABASE_URL=postgresql://...            # ✅ Already configured
JWT_SECRET=...                            # ✅ Already configured
ADMIN_SECRET_KEY=...                      # ✅ Already configured
PORT=5000                                 # ✅ Already configured

# TO BE ADDED:
GOOGLE_API_KEY=AIzaSy...                 # PageSpeed Insights
GOOGLE_CLIENT_ID=123456789-abc...        # Search Console OAuth
GOOGLE_CLIENT_SECRET=GOCSPX-abc123...    # Search Console OAuth
GOOGLE_REFRESH_TOKEN=1//0abc123def...    # Search Console OAuth
REDIS_URL=redis://...                     # Optional: For caching
```

---

## 6. Testing Your Setup

### Test PageSpeed API:
```bash
curl "https://www.finaceverse.io/api/performance/pagespeed-latest" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Search Console (after implementation):
```bash
curl "https://www.finaceverse.io/api/search-console/queries" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 7. Cost Breakdown

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Google Analytics 4 | Unlimited | Free forever |
| PageSpeed Insights API | 25,000 queries/day | Free (no paid tier) |
| Search Console API | 1,200 queries/day | Free (no paid tier) |
| ipapi.co | 30,000 requests/month | $10/mo for 100k |
| Railway PostgreSQL | Shared CPU | $5-20/mo |
| Railway Hosting | $5/mo credit | Pay as you go |

**Expected Monthly Cost:** $5-15/month (mostly Railway hosting)

---

## 8. Security Best Practices

✅ **API Key Restrictions:** Restrict PageSpeed API to your domain only
✅ **OAuth Scopes:** Use read-only scope for Search Console
✅ **Environment Variables:** Never commit keys to git
✅ **JWT Authentication:** All analytics endpoints require valid JWT
✅ **Rate Limiting:** Implement rate limiting on API endpoints
✅ **HTTPS Only:** All API calls use HTTPS in production

---

## 9. Troubleshooting

### "API Key not valid" Error
- Check API is enabled in Google Cloud Console
- Verify key restrictions allow your domain
- Wait 5 minutes after creating key (propagation delay)

### "Insufficient permissions" Error (Search Console)
- Ensure you verified website ownership
- Check OAuth scope includes `webmasters.readonly`
- Regenerate refresh token with `prompt=consent`

### "Quota exceeded" Error
- Check quota limits in Cloud Console
- Implement caching to reduce API calls
- Upgrade to paid ipapi.co if geolocation fails

---

## 10. Next Steps

After obtaining API keys:
1. Add all environment variables to Railway
2. Test each API endpoint manually
3. Monitor usage in Google Cloud Console
4. Set up billing alerts if using paid services
5. Implement error tracking for failed API calls

Need help? Check Railway logs:
```bash
railway logs --service finaceverse-landing
```
