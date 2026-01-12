#!/usr/bin/env node
/**
 * Submit Sitemaps to Google Search Console
 * 
 * Usage: node scripts/submit-sitemaps.js
 * 
 * This script submits your sitemaps to Google Search Console API.
 * Requires OAuth authentication with webmasters scope.
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const SITE_URL = 'https://www.finaceverse.io/';
const SITEMAPS = [
  'https://www.finaceverse.io/sitemap.xml',
  'https://www.finaceverse.io/blog-sitemap.xml'
];

// OAuth credentials
const CREDENTIALS_PATH = path.join(__dirname, '..', 'client_secret_769485286130-vo2li94tgjaj7i7aqkvmmamkhq69ie1a.apps.googleusercontent.com.json');
const TOKEN_PATH = path.join(__dirname, '..', '.gsc-token.json');

// Scopes required for Search Console
const SCOPES = ['https://www.googleapis.com/auth/webmasters'];

async function authorize() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_id, client_secret, redirect_uris } = credentials.web;
  
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost:5000/api/auth/google/callback'
  );

  // Check if we have a saved token
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
    
    // Check if token is expired
    if (token.expiry_date && token.expiry_date < Date.now()) {
      console.log('Token expired, need to re-authenticate...');
    } else {
      return oAuth2Client;
    }
  }

  // Generate auth URL
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('\n🔐 Authorization Required');
  console.log('='.repeat(50));
  console.log('\nTo submit sitemaps, please authorize this app:');
  console.log('\n1. Open this URL in your browser:\n');
  console.log(authUrl);
  console.log('\n2. Sign in with your Google account that owns finaceverse.io');
  console.log('3. Copy the authorization code from the redirect URL');
  console.log('\nThe redirect URL will look like:');
  console.log('http://localhost:5000/api/auth/google/callback?code=XXXXX');
  console.log('\nCopy the code after "code=" and paste it below.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('Enter the authorization code: ', async (code) => {
      rl.close();
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        
        // Save token for future use
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log('\n✅ Token saved for future use');
        
        resolve(oAuth2Client);
      } catch (err) {
        reject(new Error('Error getting token: ' + err.message));
      }
    });
  });
}

async function listSites(auth) {
  const webmasters = google.webmasters({ version: 'v3', auth });
  
  try {
    const res = await webmasters.sites.list();
    console.log('\n📋 Verified Sites in Search Console:');
    console.log('='.repeat(50));
    
    if (res.data.siteEntry && res.data.siteEntry.length > 0) {
      res.data.siteEntry.forEach(site => {
        console.log(`  • ${site.siteUrl} (${site.permissionLevel})`);
      });
    } else {
      console.log('  No verified sites found.');
      console.log('\n⚠️  You need to verify ownership of finaceverse.io first.');
      console.log('  Visit: https://search.google.com/search-console');
    }
    
    return res.data.siteEntry || [];
  } catch (err) {
    console.error('Error listing sites:', err.message);
    return [];
  }
}

async function submitSitemap(auth, siteUrl, sitemapUrl) {
  const webmasters = google.webmasters({ version: 'v3', auth });
  
  try {
    await webmasters.sitemaps.submit({
      siteUrl: siteUrl,
      feedpath: sitemapUrl
    });
    console.log(`  ✅ Submitted: ${sitemapUrl}`);
    return true;
  } catch (err) {
    console.error(`  ❌ Failed: ${sitemapUrl} - ${err.message}`);
    return false;
  }
}

async function listSitemaps(auth, siteUrl) {
  const webmasters = google.webmasters({ version: 'v3', auth });
  
  try {
    const res = await webmasters.sitemaps.list({ siteUrl });
    console.log('\n📄 Current Sitemaps:');
    console.log('='.repeat(50));
    
    if (res.data.sitemap && res.data.sitemap.length > 0) {
      res.data.sitemap.forEach(sm => {
        const status = sm.errors > 0 ? '⚠️' : '✅';
        console.log(`  ${status} ${sm.path}`);
        console.log(`     Last submitted: ${sm.lastSubmitted || 'Never'}`);
        console.log(`     URLs: ${sm.contents?.[0]?.submitted || 0} submitted, ${sm.contents?.[0]?.indexed || 0} indexed`);
      });
    } else {
      console.log('  No sitemaps submitted yet.');
    }
    
    return res.data.sitemap || [];
  } catch (err) {
    console.error('Error listing sitemaps:', err.message);
    return [];
  }
}

async function main() {
  console.log('\n🚀 Google Search Console Sitemap Submitter');
  console.log('='.repeat(50));
  console.log(`Site: ${SITE_URL}`);
  
  try {
    // Authorize
    const auth = await authorize();
    console.log('\n✅ Authenticated successfully');
    
    // List verified sites
    const sites = await listSites(auth);
    
    // Check if our site is verified
    const siteVerified = sites.some(s => 
      s.siteUrl === SITE_URL || 
      s.siteUrl === 'sc-domain:finaceverse.io' ||
      s.siteUrl === 'https://finaceverse.io/'
    );
    
    if (!siteVerified) {
      console.log('\n⚠️  Site not verified in Search Console');
      console.log('Please verify ownership first at:');
      console.log('https://search.google.com/search-console/welcome');
      return;
    }
    
    // Find the correct site URL format
    const verifiedSite = sites.find(s => 
      s.siteUrl.includes('finaceverse.io')
    );
    const actualSiteUrl = verifiedSite ? verifiedSite.siteUrl : SITE_URL;
    
    // List current sitemaps
    await listSitemaps(auth, actualSiteUrl);
    
    // Submit new sitemaps
    console.log('\n📤 Submitting Sitemaps:');
    console.log('='.repeat(50));
    
    for (const sitemap of SITEMAPS) {
      await submitSitemap(auth, actualSiteUrl, sitemap);
    }
    
    // List sitemaps again to confirm
    console.log('\n');
    await listSitemaps(auth, actualSiteUrl);
    
    console.log('\n✅ Done! Your sitemaps have been submitted.');
    console.log('Google will start crawling your pages soon.\n');
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();
