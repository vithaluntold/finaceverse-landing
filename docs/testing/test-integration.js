/**
 * Integration Test Suite for FinACEverse Backend
 * Tests all major endpoints to ensure proper routing and authentication
 */

const http = require('http');
const { createApp } = require('./backend/src/app');

// Mock database
const mockPool = {
  query: async (sql, params) => {
    if (sql.includes('INSERT')) {
      return { rows: [{ id: 1 }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
};

const { app } = createApp({ pool: mockPool });
const server = http.createServer(app);
const PORT = 9999;

async function testEndpoint(method, path, body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch(e) { parsed = data.substring(0, 50); }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('\n========================================');
  console.log('  INTEGRATION TEST SUITE');
  console.log('========================================\n');

  let passed = 0, failed = 0;

  const tests = [
    // Health checks
    { name: 'GET /health', method: 'GET', path: '/health', expectStatus: 200 },
    { name: 'GET /api/health', method: 'GET', path: '/api/health', expectStatus: 200 },
    
    // CSRF
    { name: 'GET /api/csrf-token', method: 'GET', path: '/api/csrf-token', expectStatus: 200 },
    
    // Legacy tracking (backwards compatibility)
    { name: 'POST /api/track-performance (legacy)', method: 'POST', path: '/api/track-performance', body: { name: 'LCP', value: 2500, page: '/home' }, expectStatus: 200 },
    { name: 'POST /api/track-visit (legacy)', method: 'POST', path: '/api/track-visit', body: { page: '/home' }, expectStatus: 200 },
    { name: 'POST /api/track-event (legacy)', method: 'POST', path: '/api/track-event', body: { category: 'test', action: 'click' }, expectStatus: 200 },
    { name: 'POST /api/track-error (legacy)', method: 'POST', path: '/api/track-error', body: { message: 'test', page: '/home' }, expectStatus: 200 },
    
    // New tracking endpoints
    { name: 'POST /api/track/performance (new)', method: 'POST', path: '/api/track/performance', body: { name: 'LCP', value: 2500, page: '/home' }, expectStatus: 200 },
    { name: 'POST /api/track/visit (new)', method: 'POST', path: '/api/track/visit', body: { page: '/home' }, expectStatus: 200 },
    
    // Auth (CSRF required - should fail without token)
    { name: 'POST /api/auth/login (no CSRF)', method: 'POST', path: '/api/auth/login', body: {}, expectStatus: 403 },
    
    // Protected endpoints (should require auth)
    { name: 'GET /api/analytics/summary (no auth)', method: 'GET', path: '/api/analytics/summary', expectStatus: 401 },
    { name: 'GET /api/analytics/events (no auth)', method: 'GET', path: '/api/analytics/events', expectStatus: 401 },
    { name: 'GET /api/seo/keywords (no auth)', method: 'GET', path: '/api/seo/keywords', expectStatus: 401 },
    { name: 'GET /api/seo/issues (no auth)', method: 'GET', path: '/api/seo/issues', expectStatus: 401 },
    { name: 'GET /api/local-seo/status (no auth)', method: 'GET', path: '/api/local-seo/status', expectStatus: 401 },
    { name: 'GET /api/experiments (no auth)', method: 'GET', path: '/api/experiments', expectStatus: 401 },
    { name: 'GET /api/search-console/queries (no auth)', method: 'GET', path: '/api/search-console/queries', expectStatus: 401 },
    
    // API 404 handler
    { name: 'GET /api/nonexistent (404)', method: 'GET', path: '/api/nonexistent-xyz', expectStatus: 404 },
  ];

  for (const t of tests) {
    const r = await testEndpoint(t.method, t.path, t.body);
    if (r.error) {
      console.log('❌ ' + t.name + ' -> ERROR: ' + r.error);
      failed++;
    } else if (r.status === t.expectStatus) {
      console.log('✅ ' + t.name + ' -> ' + r.status);
      passed++;
    } else {
      console.log('❌ ' + t.name + ' -> Expected ' + t.expectStatus + ', got ' + r.status);
      if (r.body) console.log('   Response: ' + JSON.stringify(r.body).substring(0, 80));
      failed++;
    }
  }

  console.log('\n========================================');
  console.log('  RESULTS: ' + passed + ' passed, ' + failed + ' failed');
  console.log('========================================\n');

  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

server.listen(PORT, () => {
  console.log('Test server running on port ' + PORT);
  runTests();
});
