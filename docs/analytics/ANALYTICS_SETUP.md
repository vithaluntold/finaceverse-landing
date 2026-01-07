# FinACEverse Analytics - Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# Google Analytics
REACT_APP_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# API URL
REACT_APP_API_URL=http://localhost:5000

# Backend
PORT=5000
MONGODB_URI=mongodb://localhost:27017/finaceverse-analytics
JWT_SECRET=your-secure-jwt-secret-change-in-production
ADMIN_SECRET_KEY=your-admin-creation-secret
```

### 3. Set Up MongoDB

**Option A: Local MongoDB**
```bash
# Install MongoDB locally
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

**Option B: MongoDB Atlas (Recommended for Production)**
1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create free M0 cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

### 4. Create Admin User

```bash
# Start the backend server
node server.js

# In another terminal, create admin user
curl -X POST http://localhost:5000/api/auth/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-secure-password",
    "secretKey": "your-admin-creation-secret"
  }'
```

### 5. Run the Application

```bash
# Terminal 1: Start backend
node server.js

# Terminal 2: Start frontend
npm start
```

### 6. Access Analytics Dashboard

1. Navigate to: `http://localhost:3000/analytics/login`
2. Login with admin credentials
3. View real-time analytics at: `/analytics/dashboard`

---

## 📊 Features

### Public Tracking (Automatic)
- ✅ Google Analytics 4 integration
- ✅ Core Web Vitals (LCP, FCP, CLS, TTFB, FID)
- ✅ Geographic tracking (country, city, ISP)
- ✅ Custom events (button clicks, scroll depth)
- ✅ JavaScript error tracking
- ✅ Performance metrics (page load, DNS, TCP)

### Protected Dashboard (Login Required)
- 🔒 JWT authentication
- 📈 Real-time metrics visualization
- 🌍 Geographic heat maps
- ⚡ Performance monitoring
- 🐛 Error logs
- 📊 Custom event tracking

---

## 🔐 Security

- JWT tokens expire after 24 hours
- Passwords hashed with bcrypt (10 rounds)
- IP addresses anonymized for GDPR compliance
- Protected dashboard routes require authentication
- Admin creation requires secret key

---

## 🚀 Deployment

### Backend (Railway)

1. Add environment variables in Railway dashboard
2. Deploy `server.js` as Node.js service
3. Update `REACT_APP_API_URL` to Railway backend URL

### Frontend (Railway)

Current setup already deploys frontend. Analytics tracking will work automatically.

### MongoDB Atlas

Use MongoDB Atlas for production database (free M0 tier available).

---

## 📝 API Endpoints

### Public Endpoints
- `POST /api/track-performance` - Track Core Web Vitals
- `POST /api/track-visit` - Track geographic data
- `POST /api/track-event` - Track custom events
- `POST /api/track-error` - Track JS errors

### Authentication
- `POST /api/auth/login` - Login to dashboard
- `POST /api/auth/create-admin` - Create admin user (requires secret)

### Protected Endpoints (Require JWT)
- `GET /api/analytics/summary` - Dashboard summary
- `GET /api/analytics/performance` - Performance metrics
- `GET /api/analytics/geography` - Geographic data
- `GET /api/analytics/events` - Custom events
- `GET /api/analytics/errors` - Error logs

---

## 🎯 Google Analytics Setup

1. Go to [analytics.google.com](https://analytics.google.com)
2. Create GA4 property for `finaceverse.io`
3. Get Measurement ID (format: `G-XXXXXXXXXX`)
4. Add to `.env` as `REACT_APP_GA_MEASUREMENT_ID`

---

## 📱 Tracked Events

The system automatically tracks:

- `request_demo_click` - Request Demo button clicks
- `module_card_view` - Module card interactions
- `newsletter_signup` - Newsletter subscriptions
- `expert_consultation_click` - Consultation bookings
- `social_icon_click` - Social media clicks
- `scroll_depth_25/50/75/100` - Scroll engagement
- `external_link_click` - Outbound links

---

## 🔍 Performance Metrics

### Core Web Vitals
- **LCP** (Largest Contentful Paint) - Target: <2.5s
- **FCP** (First Contentful Paint) - Target: <1.8s
- **CLS** (Cumulative Layout Shift) - Target: <0.1
- **TTFB** (Time to First Byte) - Target: <600ms
- **FID** (First Input Delay) - Target: <100ms

### Custom Metrics
- DOM Content Loaded time
- Window load time
- DNS lookup time
- TCP connection time
- Request/response time

---

## 🌍 Geographic Tracking

Uses `ipapi.co` for IP geolocation:
- Country
- Region/State
- City
- Timezone
- ISP
- Coordinates (for heat map)

**Privacy:** IP addresses are anonymized (last octet removed) for GDPR compliance.

---

## 🛠️ Troubleshooting

### "Cannot connect to MongoDB"
- Ensure MongoDB is running: `brew services list`
- Check connection string in `.env`

### "Invalid token" on dashboard
- Token expired (24h lifetime)
- Logout and login again

### Analytics not tracking
- Check browser console for errors
- Verify `REACT_APP_API_URL` is correct
- Ensure backend server is running

### No geographic data
- IP geolocation API might be rate-limited (1000 req/day free)
- Consider upgrading or switching to paid tier

---

## 💰 Cost Breakdown

- MongoDB Atlas: **$0** (M0 free tier)
- Google Analytics: **$0**
- IP Geolocation (ipapi.co): **$0** (1000 req/day)
- Backend hosting (Railway): **$5-10/month**

**Total: ~$5-10/month**

---

## 🔮 Future Enhancements

- [ ] Real-time WebSocket updates
- [ ] A/B testing framework
- [ ] AI route prediction model
- [ ] Automated performance alerts
- [ ] Custom dashboard reports
- [ ] Export data to CSV/JSON
- [ ] Google Search Console integration
- [ ] PageSpeed Insights automation

---

## 📧 Support

For issues or questions, contact the FinACEverse team.

---

**Dashboard URL:** `/analytics/login` (hidden, not linked from main site)
