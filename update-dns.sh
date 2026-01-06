#!/bin/bash

# GoDaddy DNS Update Script for finaceverse.io
# This script updates DNS records to point to Railway deployment

# GoDaddy API credentials (set these as environment variables)
GODADDY_API_KEY="${GODADDY_API_KEY}"
GODADDY_API_SECRET="${GODADDY_API_SECRET}"
DOMAIN="finaceverse.io"

# Railway deployment URL
RAILWAY_URL="finaceverse-production.up.railway.app"

# GoDaddy API endpoint
API_URL="https://api.godaddy.com/v1/domains/${DOMAIN}/records"

echo "Updating DNS records for ${DOMAIN}..."

# Update CNAME record for www subdomain
echo "Updating CNAME for www.${DOMAIN} -> ${RAILWAY_URL}"
curl -X PUT "${API_URL}/CNAME/www" \
  -H "Authorization: sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d "[{\"data\": \"${RAILWAY_URL}\", \"ttl\": 600}]"

echo -e "\n\nCNAME updated successfully!"

# Note: For root domain (@), Railway recommends using CNAME flattening
# or ALIAS records. If GoDaddy doesn't support this, you may need to:
# 1. Use the www subdomain as primary
# 2. Or keep A record and update it when Railway IP changes

echo -e "\n\nDNS records updated. Wait 10-60 minutes for propagation."
echo "Check status with: dig www.finaceverse.io +short"
