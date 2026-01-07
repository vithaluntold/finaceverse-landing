#!/usr/bin/env node

// Create admin user for SEO API access
// Usage: node scripts/create-admin.js
// Or interactive: node scripts/create-admin.js --interactive

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const readline = require('readline');

require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function createAdmin(username, password) {
  try {
    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    
    if (existing.rows.length > 0) {
      console.log(`⚠️  User '${username}' already exists. Updating password...`);
      const hash = bcrypt.hashSync(password, 10);
      await pool.query(
        'UPDATE users SET password = $1 WHERE username = $2',
        [hash, username]
      );
      console.log(`✓ Password updated for user: ${username}`);
    } else {
      const hash = bcrypt.hashSync(password, 10);
      await pool.query(
        'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
        [username, hash, 'admin']
      );
      console.log(`✓ Admin user created: ${username}`);
    }
    
    console.log('\n📝 Next steps:');
    console.log('1. Get JWT token:');
    console.log(`   curl -X POST https://www.finaceverse.io/api/login \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"username":"${username}","password":"YOUR_PASSWORD"}'`);
    console.log('\n2. Test SEO endpoints:');
    console.log('   curl -X GET https://www.finaceverse.io/api/seo/report \\');
    console.log('     -H "Authorization: Bearer YOUR_JWT_TOKEN"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Admin username [admin]: ', (username) => {
      const user = username || 'admin';
      rl.question('Admin password: ', (password) => {
        rl.close();
        
        if (!password || password.length < 6) {
          console.error('❌ Password must be at least 6 characters');
          process.exit(1);
        }
        
        resolve({ username: user, password });
      });
    });
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('SEO AI - ADMIN USER SETUP');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const isInteractive = process.argv.includes('--interactive') || process.argv.includes('-i');
  
  let username, password;
  
  if (isInteractive) {
    ({ username, password } = await interactiveMode());
  } else {
    // Non-interactive mode with args or defaults
    username = process.argv[2] || process.env.ADMIN_USERNAME || 'admin';
    password = process.argv[3] || process.env.ADMIN_PASSWORD;
    
    if (!password) {
      console.error('❌ Password required');
      console.log('\nUsage:');
      console.log('  node scripts/create-admin.js <username> <password>');
      console.log('  node scripts/create-admin.js --interactive');
      console.log('  ADMIN_USERNAME=admin ADMIN_PASSWORD=pass node scripts/create-admin.js');
      process.exit(1);
    }
    
    if (password.length < 6) {
      console.error('❌ Password must be at least 6 characters');
      process.exit(1);
    }
  }
  
  try {
    await pool.connect();
    console.log('✓ Connected to PostgreSQL\n');
    
    await createAdmin(username, password);
    
  } catch (error) {
    console.error('\n❌ Failed to create admin user');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
