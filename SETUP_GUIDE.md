# FinACEverse Analytics & Performance System - Complete Setup Guide

## 🎯 Overview

This system provides:
- **Google Analytics 4** integration for user behavior tracking
- **Core Web Vitals** monitoring (LCP, FCP, CLS, TTFB, INP)
- **Geographic tracking** of visitors by country/city
- **Performance monitoring** with MongoDB storage
- **Google PageSpeed Insights** automated testing
- **AI-powered route prefetching** for faster navigation
- **Redis caching** for improved API performance
- **Protected analytics dashboard** with JWT authentication

---

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- Redis (optional, for caching)
- Google Analytics 4 account
- Google Cloud account (for PageSpeed API, optional)

---

## 🚀 Quick Start (5 Minutes)

### 1. Install Dependencies

```bash
cd /path/to/scary\ impeccable\ ibex-react
npm install
```

### 2. Create Environment File

```bash
cp .env.example .env
```

### 3. Configure Required Variables

Edit `.env` and set minimum required values:

```bash
# Required for analytics tracking
REACT_APP_GA_MEASUREMENT_ID=G-XXXXXXXXXX  # Get from analytics.google.com

# Required for backend API
REACT_APP_API_URL=http://localhost:5000/api
PORT=5000

# Required for database
MONGODB_URI=mongodb://localhost:27017/finaceverse-analytics

# Required for authentication
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
ADMIN_SECRET_KEY=your-admin-secret-for-creating-users
```

### 4. Start MongoDB (if local)

```bash
# macOS with Homebrew
brew services start mongodb-community@7.0

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:7
```

### 5. Start the Application

```bash
# Terminal 1: Start backend server
node server.js

# Terminal 2: Start React app (in new terminal)
npm start
```

### 6. Create Admin User

```bash
curl -X POST http://localhost:5000/api/auth/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "YourSecurePassword123!",
    "secretKey": "your-admin-secret-for-creating-users"
  }'
```

### 7. Access the System

- **Public Site**: http://localhost:3000
- **Analytics Dashboard**: http://localhost:3000/analytics/login
- **API Health**: http://localhost:5000/health

---

## 📊 Features Breakdown

### ✅ Already Working (No Config Needed)

- Core Web Vitals tracking (automatic)
- Error logging (automatic)
- Scroll depth tracking (automatic)
- Navigation timing metrics (automatic)
- Geographic IP detection (uses free tier)

### 🔧 Requires Configuration

#### Google Analytics 4 Setup

1. Go to [analytics.google.com](https://analytics.google.com)
2. Click **Admin** → **Create Property**
3. Name it "FinACEverse"
4. Configure data stream for your website
5. Copy **Measurement ID** (format: `G-XXXXXXXXXX`)
6. Add to `.env`: `REACT_APP_GA_MEASUREMENT_ID=G-XXXXXXXXXX`
7. Restart React app: `npm start`

#### MongoDB Atlas (Recommended for Production)

1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create free account and M0 cluster
3. Click **Connect** → **Connect your application**
4. Copy connection string
5. Update `.env`:
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/finaceverse-analytics?retryWrites=true&w=majority
```
6. Restart server: `node server.js`

#### Redis Setup (Optional, for Caching)

**Local Redis:**
```bash
# macOS
brew install redis
brew services start redis

# Docker
docker run -d -p 6379:6379 --name redis redis:alpine
```

**Redis Cloud (Free Tier):**
1. Go to [redis.com/try-free](https://redis.com/try-free/)
2. Create database
3. Copy connection string
4. Update `.env`:
```bash
REDIS_URL=redis://default:password@redis-12345.cloud.redislabs.com:12345
```

#### Google PageSpeed Insights API (Optional)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project or select existing
3. Enable **PageSpeed Insights API**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy API key
6. Update `.env`:
```bash
GOOGLE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```
7. Restart server to trigger PageSpeed tests

---

## 🔐 Security Best Practices

### Environment Variables

❌ **Never commit `.env` file to git**

✅ Use different values for development and production:

```bash
# Development (.env)
JWT_SECRET=dev-secret-not-for-production
MONGODB_URI=mongodb://localhost:27017/finaceverse-dev

# Production (Railway/environment)
JWT_SECRET=super-long-random-string-min-32-chars-generated-securely
MONGODB_URI=mongodb+srv://...atlas.mongodb.net/...
```

### JWT Secret Generation

```bash
# Generate secure random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Password Requirements

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, special chars
- Use a password manager

---

## 📈 Monitoring & Alerts

### Check System Health

```bash
# Backend health
curl http://localhost:5000/health

# Should return: {"status":"ok","timestamp":"2026-01-06T..."}
```

### View Logs

```bash
# Backend logs (shows tracking events)
node server.js

# Look for:
# ✓ Connected to MongoDB
# ✓ Connected to Redis
# 🔍 Running PageSpeed test...
# ✓ PageSpeed test completed
```

### Database Inspection

```bash
# Connect to MongoDB
mongosh

# Switch to database
use finaceverse-analytics

# View collections
show collections

# Count documents
db.visits.countDocuments()
db.performance_metrics.countDocuments()
db.events.countDocuments()

# View recent visits
db.visits.find().sort({timestamp:-1}).limit(5).pretty()
```

---

## 🐛 Troubleshooting

### "Cannot GET /api/analytics/summary"

**Cause:** Backend server not running

**Fix:**
```bash
node server.js
```

### "Invalid token" in analytics dashboard

**Cause:** JWT token expired (24h lifetime) or server restarted

**Fix:** Logout and login again at `/analytics/login`

### Performance metrics not appearing

**Cause:** Frontend not sending data to correct API

**Fix:** Check `.env` file:
```bash
REACT_APP_API_URL=http://localhost:5000/api  # Must match backend port
```

Restart React:
```bash
npm start
```

### MongoDB connection refused

**Cause:** MongoDB not running

**Fix:**
```bash
# Check if running
brew services list | grep mongodb

# Start if stopped
brew services start mongodb-community@7.0

# Or use Docker
docker start mongodb
```

### Redis warnings (optional feature)

**Cause:** Redis not installed/running

**Effect:** No caching, but everything else works

**Fix (if you want caching):**
```bash
brew install redis
brew services start redis
```

### PageSpeed tests not running

**Cause:** Missing `GOOGLE_API_KEY` in `.env`

**Effect:** Manual tests only, no automated monitoring

**Fix:** Follow Google PageSpeed API setup above or leave optional

### IP geolocation rate limit

**Cause:** More than 1000 requests/day to ipapi.co (free tier)

**Effect:** No country/city data for new visits

**Fix:** 
- Wait 24 hours for reset
- Upgrade to paid tier at ipapi.co
- Or use alternative service

---

## 🚢 Deployment to Production

### Railway Deployment

1. **Push code to GitHub**
```bash
git add .
git commit -m "Add analytics system"
git push origin main
```

2. **Deploy backend (server.js)**
   - Go to Railway dashboard
   - Create new project
   - Connect GitHub repo
   - Add environment variables from `.env`
   - Deploy command: `node server.js`
   - Note the backend URL (e.g., `https://your-app.railway.app`)

3. **Update frontend API URL**
   - In Railway, update frontend environment:
   ```
   REACT_APP_API_URL=https://your-app.railway.app/api
   ```
   - Redeploy frontend

4. **Create production admin user**
```bash
curl -X POST https://your-app.railway.app/api/auth/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "VerySecureProductionPassword123!",
    "secretKey": "your-production-admin-secret"
  }'
```

---

## 📊 API Endpoints Reference

### Public Endpoints (No Auth)

```bash
POST /api/track-performance    # Track Core Web Vitals
POST /api/track-visit          # Track geographic data
POST /api/track-event          # Track custom events
POST /api/track-error          # Track JavaScript errors
```

### Auth Endpoints

```bash
POST /api/auth/login           # Get JWT token
POST /api/auth/create-admin    # Create admin user (one-time)
```

### Protected Endpoints (Require JWT in Authorization header)

```bash
GET /api/analytics/summary     # Dashboard overview
GET /api/analytics/performance # Core Web Vitals data
GET /api/analytics/geography   # Geographic data
GET /api/analytics/events      # Custom events log
GET /api/analytics/errors      # JavaScript errors log
GET /api/analytics/pagespeed   # PageSpeed Insights results
```

### Example Request with Auth

```bash
# Login first
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YourPassword"}' \
  | jq -r '.token')

# Use token for protected endpoints
curl http://localhost:5000/api/analytics/summary \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎨 Customization

### Add Custom Events

In your React components:

```javascript
import { trackEvent } from './utils/analytics';

// In your component
const handleButtonClick = () => {
  trackEvent('Engagement', 'special_button_click', 'Feature X');
  // ... rest of logic
};
```

### Modify Route Prediction

Edit `server.js`, find `app.post('/api/predict-route')`:

```javascript
const predictions = {
  '/': ['/modules', '/request-demo', '/tailored-pilots'],
  '/modules': ['/request-demo', '/tailored-pilots'],
  // Add your custom predictions
};
```

### Adjust PageSpeed Test Frequency

In `server.js`, find `startScheduledJobs()`:

```javascript
// Change from 6 hours to 12 hours
setInterval(async () => {
  // ... test logic
}, 12 * 60 * 60 * 1000); // Every 12 hours
```

---

## 💰 Cost Estimate

| Service | Free Tier | Cost |
|---------|-----------|------|
| MongoDB Atlas | 512MB storage | $0 |
| Redis Cloud | 30MB | $0 |
| Google Analytics | Unlimited | $0 |
| IP Geolocation | 1000 req/day | $0 |
| PageSpeed API | 25,000 req/day | $0 |
| Railway Backend | 500 hrs/month | $5-10 |
| **Total** | | **$5-10/month** |

---

## 🔮 Future Enhancements

- [ ] Real-time WebSocket dashboard updates
- [ ] A/B testing framework
- [ ] Machine learning route prediction (TensorFlow.js)
- [ ] Automated performance alerts (Slack/email)
- [ ] Google Search Console integration
- [ ] Custom report generation (PDF/CSV export)
- [ ] User session replay
- [ ] Heatmap click tracking

---

## 📧 Support & Questions

For technical issues, check:
1. Server logs: `node server.js`
2. Browser console: DevTools → Console
3. MongoDB logs: `mongosh` → `use finaceverse-analytics`
4. GitHub Issues: [repository issues page]

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] React app runs at `http://localhost:3000`
- [ ] Backend API runs at `http://localhost:5000`
- [ ] MongoDB connection shows ✓ in server logs
- [ ] Can create admin user successfully
- [ ] Can login to `/analytics/login`
- [ ] Dashboard shows data at `/analytics/dashboard`
- [ ] Browser console shows no errors
- [ ] Page views tracked in Google Analytics
- [ ] Performance metrics appear in MongoDB
- [ ] (Optional) PageSpeed test runs every 6 hours
- [ ] (Optional) Redis shows ✓ in server logs

---

**Last Updated:** January 6, 2026  
**Version:** 1.0.0
