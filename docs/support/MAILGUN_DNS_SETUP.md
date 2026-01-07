# Mailgun DNS Configuration for finaceverse.io

## Required DNS Records for Mailgun

To enable Mailgun email sending from `finaceverse.io`, add these DNS records in GoDaddy:

### 1. MX Records (For Receiving Email)
```
Type: MX
Host: @
Points to: mxa.mailgun.org
Priority: 10
TTL: 1 Hour

Type: MX  
Host: @
Points to: mxb.mailgun.org
Priority: 10
TTL: 1 Hour
```

### 2. TXT Record (SPF - Sender Policy Framework)
```
Type: TXT
Host: @
Value: v=spf1 include:mailgun.org ~all
TTL: 1 Hour
```

### 3. TXT Record (Domain Verification)
Check your Mailgun dashboard for the exact verification TXT record. It will look like:
```
Type: TXT
Host: @ (or sometimes mg.finaceverse.io)
Value: [Mailgun will provide this - check dashboard]
TTL: 1 Hour
```

### 4. CNAME Record (Tracking)
```
Type: CNAME
Host: email.finaceverse.io
Points to: mailgun.org
TTL: 1 Hour
```

### 5. TXT Record (DKIM - DomainKeys Identified Mail)
Check Mailgun dashboard for your specific DKIM records. Usually 2 records like:
```
Type: TXT
Host: k1._domainkey
Value: [Long key from Mailgun - check dashboard]
TTL: 1 Hour

Type: TXT
Host: k2._domainkey  
Value: [Long key from Mailgun - check dashboard]
TTL: 1 Hour
```

## How to Add DNS Records in GoDaddy

1. Log into GoDaddy account
2. Go to "My Products" → "Domains"
3. Click "DNS" next to finaceverse.io
4. Click "Add" for each record type
5. Enter the details above
6. Save changes
7. Wait 10-60 minutes for propagation

## Verify DNS Records

### Using GoDaddy Webmail
1. Log into webmail.secureserver.net
2. Check if you can receive emails at newsletter@finaceverse.io

### Using Command Line
```bash
# Check MX records
dig MX finaceverse.io

# Check SPF record
dig TXT finaceverse.io

# Check DKIM records
dig TXT k1._domainkey.finaceverse.io
dig TXT k2._domainkey.finaceverse.io
```

### Using Mailgun Dashboard
1. Go to https://app.mailgun.com/
2. Navigate to "Sending" → "Domains"
3. Select finaceverse.io
4. Check DNS verification status
5. All records should show green checkmarks

## Credentials Reference

**Mailing List:** newsletter@finaceverse.io
**API Key:** [Stored in .env file - see credentials document]
**Sending Key:** [Stored in .env file - see credentials document]

⚠️ **Credentials are configured in .env file (not committed to git)**

## Testing Newsletter

After DNS records are verified:

1. **Test Subscribe:**
   ```bash
   curl -X POST https://finaceverse.io/api/mailgun \
     -H "Content-Type: application/json" \
     -d '{"action":"subscribe","email":"test@example.com"}'
   ```

2. **Check Mailgun Dashboard:**
   - Go to Mailing Lists
   - Find newsletter@finaceverse.io
   - Verify subscriber was added

3. **Test on Live Site:**
   - Go to https://finaceverse.io/blog
   - Enter email in newsletter form
   - Submit and check Mailgun dashboard

## Troubleshooting

### "Domain not verified" error
- DNS records not added or not propagated yet
- Wait up to 48 hours for full DNS propagation
- Check records with dig commands above

### "Failed to subscribe" error
- API key might be incorrect
- Check .env file has correct MAILGUN_API_KEY
- Restart Railway deployment after adding environment variables

### "Mailing list not found" error
- Mailing list newsletter@finaceverse.io doesn't exist
- Create it in Mailgun dashboard under "Mailing Lists"
- Use exact email: newsletter@finaceverse.io

## Railway Environment Variables

Don't forget to add these to Railway project settings:
1. Go to Railway dashboard
2. Select your project
3. Click "Variables"
4. Add:
   - `MAILGUN_API_KEY` = [Your Mailgun API key from dashboard]
   - `MAILGUN_DOMAIN` = finaceverse.io
   - `MAILGUN_MAILING_LIST` = newsletter@finaceverse.io
5. Redeploy the service

## Next Steps After DNS Verification

1. ✅ Add DNS records in GoDaddy
2. ✅ Wait for DNS propagation (10-60 minutes)
3. ✅ Verify in Mailgun dashboard (all green)
4. ✅ Add environment variables to Railway
5. ✅ Redeploy Railway service
6. ✅ Test newsletter signup on live site
7. ✅ Send test email to verify receiving works
