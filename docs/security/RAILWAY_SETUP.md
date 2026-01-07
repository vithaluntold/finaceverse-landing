# Railway PostgreSQL Setup Guide

## Prerequisites
- Railway account (sign up at https://railway.app)
- Railway CLI installed

## Step 1: Install Railway CLI

```bash
# macOS (Homebrew)
brew install railway

# Or via npm
npm install -g @railway/cli

# Verify installation
railway --version
```

## Step 2: Login to Railway

```bash
railway login
```

This will open a browser window for authentication.

## Step 3: Link to Your Project

Navigate to your project directory:

```bash
cd /Users/apple/Downloads/scary\ impeccable\ ibex-react
railway link
```

Select your existing Railway project from the list, or create a new one.

## Step 4: Add PostgreSQL Plugin

```bash
# Via CLI
railway add --plugin postgresql

# Or via Railway Dashboard:
# 1. Go to your project dashboard
# 2. Click "New" → "Database" → "Add PostgreSQL"
# 3. Wait for provisioning (30-60 seconds)
```

## Step 5: Get Database Connection String

```bash
# View all environment variables
railway variables

# Get DATABASE_URL specifically
railway variables get DATABASE_URL
```

The DATABASE_URL format will be:
```
postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/railway
```

## Step 6: Set Environment Variables

Set all required environment variables in Railway:

```bash
# Database (automatically set by PostgreSQL plugin)
railway variables set DATABASE_URL="postgresql://..."

# Google Analytics
railway variables set REACT_APP_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
railway variables set GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY"

# JWT Authentication
railway variables set JWT_SECRET="your-super-secret-jwt-key-change-this"
railway variables set ADMIN_SECRET_KEY="your-admin-secret-for-account-creation"

# Redis (optional - for caching)
railway variables set REDIS_URL="redis://default:password@redis-url:6379"

# Node environment
railway variables set NODE_ENV="production"
railway variables set PORT="5000"
```

## Step 7: Verify Variables

```bash
railway variables
```

Should show:
- ✅ DATABASE_URL
- ✅ REACT_APP_GA_MEASUREMENT_ID
- ✅ GOOGLE_API_KEY
- ✅ JWT_SECRET
- ✅ ADMIN_SECRET_KEY
- ✅ NODE_ENV
- ✅ PORT
- ⚠️ REDIS_URL (optional)

## Step 8: Deploy

```bash
# Deploy current code
railway up

# Or link to GitHub and auto-deploy on push
railway link --github
```

## Step 9: Test Database Connection

Once deployed, check logs:

```bash
railway logs
```

Look for:
```
✓ Connected to PostgreSQL
✓ Database tables created/verified
🚀 Analytics API running on port 5000
```

## Step 10: Create Admin User

Use the `/api/auth/register` endpoint with your ADMIN_SECRET_KEY:

```bash
curl -X POST https://your-app.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-secure-password",
    "secretKey": "your-admin-secret-for-account-creation"
  }'
```

## Step 11: Test Login

```bash
curl -X POST https://your-app.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-secure-password"
  }'
```

You should receive a JWT token.

## Troubleshooting

### Database Connection Failed
```bash
# Check if PostgreSQL plugin is running
railway status

# Restart the service
railway restart
```

### Missing Environment Variables
```bash
# List all variables
railway variables

# Add missing ones
railway variables set KEY="VALUE"
```

### View Live Logs
```bash
railway logs --follow
```

### Access Railway Dashboard
```bash
railway open
```

## Database Management

### Access PostgreSQL CLI
```bash
railway run psql $DATABASE_URL
```

### View Tables
```sql
\dt
```

### Query Data
```sql
SELECT COUNT(*) FROM visits;
SELECT COUNT(*) FROM performance_metrics;
SELECT * FROM users;
```

### Drop All Tables (Caution!)
```sql
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS performance_metrics CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS errors CASCADE;
DROP TABLE IF EXISTS pagespeed_results CASCADE;
```

Tables will be recreated automatically on next server restart.

## Monitoring

### View Metrics
```bash
railway metrics
```

### Check Usage
```bash
railway usage
```

### Database Backups

Railway automatically backs up PostgreSQL databases. Access via dashboard:
1. Go to your PostgreSQL service
2. Click "Data" tab
3. Download backup

## Security Checklist

- ✅ Change default JWT_SECRET
- ✅ Change default ADMIN_SECRET_KEY
- ✅ Use strong passwords for admin users
- ✅ Enable CORS for your domain only (update server.js)
- ✅ Use HTTPS (Railway provides this automatically)
- ✅ Regularly rotate JWT secrets
- ✅ Monitor logs for suspicious activity

## Cost Optimization

Railway Free Tier includes:
- $5 free credit per month
- Up to 512 MB RAM
- 1 GB disk space
- Limited egress

For production:
- Upgrade to Hobby ($5/month) or Pro plan
- Enable autoscaling
- Add Redis for better caching

## Next Steps

1. ✅ PostgreSQL provisioned
2. ✅ Environment variables set
3. ✅ Application deployed
4. ⬜ Create admin user
5. ⬜ Test analytics endpoints
6. ⬜ Monitor logs for errors
7. ⬜ Set up custom domain (optional)

## Quick Reference

```bash
# Common Railway commands
railway login              # Login to Railway
railway link               # Link to project
railway up                 # Deploy current directory
railway logs               # View logs
railway variables          # List all variables
railway variables set K=V  # Set variable
railway open               # Open dashboard
railway status             # Check service status
railway restart            # Restart services
railway run CMD            # Run command in Railway environment
```

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Status Page: https://status.railway.app
