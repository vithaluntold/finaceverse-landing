# FinACEverse Newsletter & Blog Integration

## Overview
This update adds comprehensive newsletter management and blog functionality to the FinACEverse landing page.

## Changes Made

### 1. Removed Misleading Claims
- Changed "500+ firms" to "early adopters" messaging

### 2. Mailgun Integration
Created `/api/mailgun.js` with:
- Subscribe functionality
- Unsubscribe functionality
- Subscriber status checking
- Serverless function handler for API routes

### 3. Blog System
Created full blog page (`/src/views/blog.js` and `/src/views/blog.css`):
- Blog post grid with filtering by category
- Sample posts (Technology, Industry Insights, Case Studies)
- Newsletter subscription CTA
- Responsive design

### 4. Unsubscribe Page
Created dedicated unsubscribe page (`/src/views/unsubscribe.js` and `/src/views/unsubscribe.css`):
- Email unsubscribe form
- Success/error states
- Preference adjustment suggestions
- URL parameter support for email pre-filling

### 5. Updated Components
- **Footer**: Newsletter form now uses Mailgun API
- **Navigation**: Added Blog link to main menu
- **Routes**: Added `/blog` and `/unsubscribe` routes

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

New packages added:
- `mailgun.js` - Official Mailgun API client
- `form-data` - Required for Mailgun

### 2. Configure Mailgun
1. Sign up at https://mailgun.com
2. Create a mailing list (e.g., `newsletter@finaceverse.io`)
3. Get your API key from Mailgun dashboard
4. Copy `.env.example` to `.env`
5. Fill in your Mailgun credentials:

```bash
MAILGUN_API_KEY=key-your-api-key-here
MAILGUN_DOMAIN=mg.finaceverse.io
MAILGUN_MAILING_LIST=newsletter@mg.finaceverse.io
```

### 3. Deploy API Endpoint
The `/api/mailgun.js` file is set up as a serverless function. 

**For Railway (current deployment):**
- Railway supports serverless functions via the `api/` directory
- No additional configuration needed

**For other platforms:**
- Vercel: Automatically detects `api/` directory
- Netlify: Use Netlify Functions
- Custom server: Import and use as Express middleware

### 4. Test Newsletter
1. Go to any page with newsletter form (homepage footer, blog page)
2. Enter email and submit
3. Check Mailgun dashboard for new subscriber
4. Visit `/unsubscribe?email=test@example.com` to test unsubscribe

## API Usage

### Subscribe
```javascript
POST /api/mailgun
{
  "action": "subscribe",
  "email": "user@example.com",
  "name": "John Doe" // optional
}
```

### Unsubscribe
```javascript
POST /api/mailgun
{
  "action": "unsubscribe",
  "email": "user@example.com"
}
```

### Check Status
```javascript
POST /api/mailgun
{
  "action": "status",
  "email": "user@example.com"
}
```

## Email Templates (Future Enhancement)
Consider adding:
- Welcome email for new subscribers
- Confirmation email with unsubscribe link
- Monthly digest templates
- Blog post notification templates

## Content Management
Currently, blog posts are hardcoded in `/src/views/blog.js`. For production, consider:
- Headless CMS (Contentful, Strapi, Sanity)
- Markdown files with front matter
- Database with admin panel
- Ghost CMS integration

## Security Notes
- Never commit `.env` file (already in .gitignore)
- Use environment variables in production
- Validate email addresses server-side
- Rate limit API endpoints to prevent abuse
- Add CAPTCHA for public-facing forms if spam becomes an issue

## Next Steps
1. Configure actual Mailgun account
2. Design email templates in Mailgun
3. Add blog post management system (CMS)
4. Set up automated email campaigns
5. Add analytics tracking for newsletter signups
6. Create individual blog post pages (currently only list view)
