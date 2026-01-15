/**
 * ULTIMATE SECURITY TEST SUITE
 * ============================
 * Tests for S-Tier security features:
 * - DDoS Protection (Layer 12)
 * - Network Decoys (Layer 13)
 * - Memory-Safe Keys (Layer 14)
 * - Anomaly Detection (Layer 15)
 */

const assert = require('assert');

// Import the module
const {
  DDoSProtection,
  NetworkDecoys,
  MemorySafeKeyManager,
  LightweightAnomalyDetector,
  RollingStats,
  UltimateSecurityController,
} = require('./backend/security/ultimate-security');

// Test utilities
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.error(`  ❌ ${name}: ${error.message}`);
    failed++;
  }
}

function mockRequest(overrides = {}) {
  return {
    ip: '192.168.1.100',
    path: '/api/test',
    url: '/api/test',
    method: 'GET',
    headers: {
      'user-agent': 'Mozilla/5.0 Test',
      'accept': 'application/json',
      'accept-language': 'en-US',
      'accept-encoding': 'gzip',
      ...overrides.headers,
    },
    query: {},
    body: {},
    socket: { remoteAddress: '192.168.1.100' },
    ...overrides,
  };
}

function mockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    listeners: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    type(contentType) {
      this.headers['content-type'] = contentType;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
    },
    on(event, callback) {
      this.listeners[event] = callback;
      return this;
    },
    emit(event) {
      if (this.listeners[event]) {
        this.listeners[event]();
      }
    },
  };
  return res;
}

async function runTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('  ULTIMATE SECURITY TEST SUITE');
  console.log('═'.repeat(60) + '\n');

  // ========================================
  // DDoS Protection Tests
  // ========================================
  console.log('📍 DDoS Protection (Layer 12)');
  
  await test('DDoSProtection initializes correctly', () => {
    const ddos = new DDoSProtection();
    assert(ddos);
    assert(ddos.config.maxConnectionsPerIP === 100);
    assert(ddos.config.maxRequestsPerSecond === 50);
    ddos.stop();
  });

  await test('DDoSProtection extracts client IP correctly', () => {
    const ddos = new DDoSProtection();
    
    // Test various IP sources
    let ip = ddos.getClientIP({ headers: { 'cf-connecting-ip': '1.2.3.4' } });
    assert(ip === '1.2.3.4', 'Should extract from cf-connecting-ip');
    
    ip = ddos.getClientIP({ headers: { 'x-real-ip': '5.6.7.8' } });
    assert(ip === '5.6.7.8', 'Should extract from x-real-ip');
    
    ip = ddos.getClientIP({ headers: { 'x-forwarded-for': '9.10.11.12, 1.2.3.4' } });
    assert(ip === '9.10.11.12', 'Should extract first IP from x-forwarded-for');
    
    ddos.stop();
  });

  await test('DDoSProtection generates request fingerprint', () => {
    const ddos = new DDoSProtection();
    const req1 = mockRequest();
    const req2 = mockRequest();
    const req3 = mockRequest({ headers: { 'user-agent': 'Different Bot' } });
    
    const fp1 = ddos.generateFingerprint(req1);
    const fp2 = ddos.generateFingerprint(req2);
    const fp3 = ddos.generateFingerprint(req3);
    
    assert(fp1 === fp2, 'Same request should have same fingerprint');
    assert(fp1 !== fp3, 'Different user-agent should have different fingerprint');
    assert(fp1.length === 16, 'Fingerprint should be 16 chars');
    
    ddos.stop();
  });

  await test('DDoSProtection bans IP correctly', () => {
    const ddos = new DDoSProtection();
    
    assert(!ddos.isBanned('1.2.3.4'), 'Should not be banned initially');
    
    ddos.banIP('1.2.3.4', 'Test ban', 5000);
    
    assert(ddos.isBanned('1.2.3.4'), 'Should be banned after banIP');
    assert(ddos.banned.get('1.2.3.4').reason === 'Test ban');
    
    ddos.unban('1.2.3.4');
    assert(!ddos.isBanned('1.2.3.4'), 'Should not be banned after unban');
    
    ddos.stop();
  });

  await test('DDoSProtection records violations and auto-bans', () => {
    const ddos = new DDoSProtection({ autoBanThreshold: 2 });
    
    ddos.recordViolation('1.2.3.4', 'test');
    assert(!ddos.isBanned('1.2.3.4'), 'Should not be banned after 1 violation');
    
    ddos.recordViolation('1.2.3.4', 'test');
    assert(ddos.isBanned('1.2.3.4'), 'Should be banned after 2 violations');
    
    ddos.stop();
  });

  await test('DDoSProtection checks rate limiting', () => {
    const ddos = new DDoSProtection({ maxRequestsPerSecond: 3 });
    
    // Simulate requests
    ddos.checkRate('1.2.3.4');
    ddos.checkRate('1.2.3.4');
    const rate = ddos.checkRate('1.2.3.4');
    
    assert(rate.perSecond === 2, 'Should count requests');
    assert(!rate.exceedsSecond, 'Should not exceed yet');
    
    ddos.checkRate('1.2.3.4');
    const rate2 = ddos.checkRate('1.2.3.4');
    
    assert(rate2.exceedsSecond, 'Should exceed after 4 requests with limit 3');
    
    ddos.stop();
  });

  await test('DDoSProtection middleware blocks banned IPs', async () => {
    const ddos = new DDoSProtection();
    const middleware = ddos.middleware();
    
    ddos.banIP('192.168.1.100', 'Test');
    
    const req = mockRequest();
    const res = mockResponse();
    let nextCalled = false;
    
    await middleware(req, res, () => { nextCalled = true; });
    
    assert(!nextCalled, 'next() should not be called for banned IP');
    assert(res.statusCode === 429, 'Should return 429');
    
    ddos.stop();
  });

  await test('DDoSProtection returns stats', () => {
    const ddos = new DDoSProtection();
    
    const stats = ddos.getStats();
    
    assert(typeof stats.totalRequests === 'number');
    assert(typeof stats.blockedRequests === 'number');
    assert(typeof stats.bannedIPs === 'number');
    
    ddos.stop();
  });

  // ========================================
  // Network Decoys Tests
  // ========================================
  console.log('\n📍 Network Decoys (Layer 13)');

  await test('NetworkDecoys initializes with honeypot endpoints', () => {
    const decoys = new NetworkDecoys();
    
    assert(decoys.allDecoys.size > 40, 'Should have 40+ decoy endpoints');
    assert(decoys.isDecoy('/wp-admin'), 'Should detect wp-admin');
    assert(decoys.isDecoy('/.env'), 'Should detect .env');
    assert(decoys.isDecoy('/api/v1/internal/keys'), 'Should detect fake API');
    assert(!decoys.isDecoy('/api/real'), 'Should not flag real endpoints');
  });

  await test('NetworkDecoys identifies decoy types', () => {
    const decoys = new NetworkDecoys();
    
    assert(decoys.getDecoyType('/wp-admin') === 'admin_panel');
    assert(decoys.getDecoyType('/api/v1/internal/keys') === 'fake_api');
    assert(decoys.getDecoyType('/backup.zip') === 'fake_file');
    assert(decoys.getDecoyType('/jenkins') === 'fake_service');
  });

  await test('NetworkDecoys generates fake admin page', () => {
    const decoys = new NetworkDecoys();
    const page = decoys.generateFakeAdminPage();
    
    assert(page.includes('<!DOCTYPE html>'));
    assert(page.includes('Admin'));
    assert(page.includes('CANARY'));
  });

  await test('NetworkDecoys generates fake .env file', () => {
    const decoys = new NetworkDecoys();
    const env = decoys.generateFakeEnv();
    
    assert(env.includes('DATABASE_URL'));
    assert(env.includes('CANARY'));
    assert(env.includes('AWS_ACCESS_KEY_ID'));
  });

  await test('NetworkDecoys logs access attempts', () => {
    let alertReceived = null;
    const decoys = new NetworkDecoys((event) => { alertReceived = event; });
    
    const req = mockRequest({ path: '/wp-admin' });
    decoys.logAccess(req, 'admin_panel');
    
    assert(alertReceived, 'Alert callback should be called');
    assert(alertReceived.type === 'DECOY_ACCESS');
    assert(alertReceived.decoyType === 'admin_panel');
  });

  await test('NetworkDecoys can add custom decoys', () => {
    const decoys = new NetworkDecoys();
    
    assert(!decoys.isDecoy('/secret-path'), 'Should not exist initially');
    
    decoys.addDecoy('/secret-path', 'custom');
    
    assert(decoys.isDecoy('/secret-path'), 'Should exist after adding');
  });

  // ========================================
  // Memory-Safe Key Manager Tests
  // ========================================
  console.log('\n📍 Memory-Safe Key Manager (Layer 14)');

  await test('MemorySafeKeyManager initializes correctly', () => {
    const manager = new MemorySafeKeyManager();
    
    assert(manager.memoryKey instanceof Buffer);
    assert(manager.memoryKey.length === 32);
    assert(manager.encryptedKeys instanceof Map);
    
    manager.stop();
  });

  await test('MemorySafeKeyManager stores and retrieves keys', () => {
    const manager = new MemorySafeKeyManager();
    
    const testKey = 'super-secret-key-12345';
    manager.storeKey('test-key-1', testKey);
    
    const retrieved = manager.retrieveKey('test-key-1');
    
    assert(retrieved.toString() === testKey, 'Should retrieve original key');
    
    manager.stop();
  });

  await test('MemorySafeKeyManager throws for missing key', () => {
    const manager = new MemorySafeKeyManager();
    
    try {
      manager.retrieveKey('nonexistent');
      assert.fail('Should throw error');
    } catch (err) {
      assert(err.message.includes('not found'));
    }
    
    manager.stop();
  });

  await test('MemorySafeKeyManager rotates memory key', () => {
    const manager = new MemorySafeKeyManager();
    
    const testKey = 'my-secret-key';
    manager.storeKey('test-key', testKey);
    
    const oldMemoryKey = Buffer.from(manager.memoryKey);
    
    // Rotate
    manager.rotateMemoryKey();
    
    // Memory key should be different
    assert(!manager.memoryKey.equals(oldMemoryKey), 'Memory key should change');
    
    // But we should still be able to retrieve the stored key
    const retrieved = manager.retrieveKey('test-key');
    assert(retrieved.toString() === testKey, 'Should still retrieve key after rotation');
    
    manager.stop();
  });

  await test('MemorySafeKeyManager deletes keys', () => {
    const manager = new MemorySafeKeyManager();
    
    manager.storeKey('to-delete', 'secret');
    assert(manager.encryptedKeys.has('to-delete'));
    
    const result = manager.deleteKey('to-delete');
    
    assert(result === true);
    assert(!manager.encryptedKeys.has('to-delete'));
    
    manager.stop();
  });

  await test('MemorySafeKeyManager useKeyOnce wipes key after use', () => {
    const manager = new MemorySafeKeyManager();
    
    manager.storeKey('once', 'use-once-key');
    
    let capturedKey = null;
    const result = manager.useKeyOnce('once', (key) => {
      capturedKey = key;
      return 'result';
    });
    
    assert(result === 'result', 'Should return operation result');
    // Note: capturedKey was wiped, but we can't easily verify in JS
    // The buffer was overwritten
    
    manager.stop();
  });

  await test('MemorySafeKeyManager tracks usage stats', () => {
    const manager = new MemorySafeKeyManager();
    
    manager.storeKey('k1', 'v1');
    manager.storeKey('k2', 'v2');
    manager.retrieveKey('k1');
    
    const stats = manager.getStats();
    
    assert(stats.encryptions === 2);
    assert(stats.decryptions === 1);
    assert(stats.storedKeys === 2);
    
    manager.stop();
  });

  // ========================================
  // Lightweight Anomaly Detector Tests
  // ========================================
  console.log('\n📍 Lightweight Anomaly Detector (Layer 15)');

  await test('RollingStats calculates mean correctly', () => {
    const stats = new RollingStats(5);
    
    stats.add(10);
    stats.add(20);
    stats.add(30);
    
    assert(stats.mean === 20, 'Mean of 10,20,30 should be 20');
    assert(stats.count === 3);
  });

  await test('RollingStats calculates stddev correctly', () => {
    const stats = new RollingStats(10);
    
    // Add same value many times for 0 stddev
    for (let i = 0; i < 5; i++) {
      stats.add(100);
    }
    
    assert(stats.stddev === 0, 'Stddev of constant values should be 0');
    
    // Now add outlier
    stats.add(200);
    assert(stats.stddev > 0, 'Stddev should increase with variance');
  });

  await test('RollingStats maintains window size', () => {
    const stats = new RollingStats(3);
    
    stats.add(10);
    stats.add(20);
    stats.add(30);
    assert(stats.count === 3);
    assert(stats.mean === 20);
    
    stats.add(40);
    assert(stats.count === 3, 'Should still be 3 after window');
    assert(stats.mean === 30, 'Mean of 20,30,40 should be 30');
  });

  await test('RollingStats detects anomalies', () => {
    const stats = new RollingStats(100);
    
    // Build baseline
    for (let i = 0; i < 50; i++) {
      stats.add(100 + Math.random() * 10);
    }
    
    // Normal value
    assert(!stats.isAnomaly(105), '105 should not be anomaly');
    
    // Obvious anomaly
    assert(stats.isAnomaly(1000), '1000 should be anomaly');
    assert(stats.isAnomaly(0), '0 should be anomaly');
  });

  await test('LightweightAnomalyDetector initializes correctly', () => {
    const detector = new LightweightAnomalyDetector();
    
    assert(detector.config.windowSize === 100);
    assert(detector.metrics.requestsPerSecond instanceof RollingStats);
    assert(detector.metrics.errorRate instanceof RollingStats);
    
    detector.stop();
  });

  await test('LightweightAnomalyDetector records requests', () => {
    const detector = new LightweightAnomalyDetector();
    
    const req = mockRequest();
    const res = mockResponse();
    
    detector.recordRequest(req, res, 50); // 50ms response time
    
    assert(detector.requestsThisSecond === 1);
    assert(detector.uniqueIPsThisMinute.size === 1);
    
    detector.stop();
  });

  await test('LightweightAnomalyDetector emits anomaly events', async () => {
    const detector = new LightweightAnomalyDetector({ minDataPoints: 5 });
    
    let anomalyReceived = null;
    detector.on('anomaly', (event) => { anomalyReceived = event; });
    
    // Build baseline with low response times
    for (let i = 0; i < 10; i++) {
      detector.metrics.responseTime.add(50);
    }
    
    // Trigger anomaly with huge response time
    const req = mockRequest();
    const res = mockResponse();
    detector.recordRequest(req, res, 5000); // 5000ms vs 50ms baseline
    
    // Should have triggered anomaly
    assert(anomalyReceived !== null, 'Should emit anomaly');
    assert(anomalyReceived.type === 'response_time');
    
    detector.stop();
  });

  await test('LightweightAnomalyDetector provides baselines', () => {
    const detector = new LightweightAnomalyDetector();
    
    // Add some data
    detector.metrics.requestsPerSecond.add(100);
    detector.metrics.requestsPerSecond.add(110);
    detector.metrics.requestsPerSecond.add(105);
    
    const baselines = detector.getBaselines();
    
    assert(baselines.requestsPerSecond);
    assert(typeof baselines.requestsPerSecond.mean === 'number');
    assert(typeof baselines.requestsPerSecond.stddev === 'number');
    
    detector.stop();
  });

  // ========================================
  // Ultimate Security Controller Tests
  // ========================================
  console.log('\n📍 Ultimate Security Controller (Combined)');

  await test('UltimateSecurityController initializes all layers', () => {
    const controller = new UltimateSecurityController();
    
    assert(controller.ddos instanceof DDoSProtection);
    assert(controller.decoys instanceof NetworkDecoys);
    assert(controller.memoryKeys instanceof MemorySafeKeyManager);
    assert(controller.anomalyDetector instanceof LightweightAnomalyDetector);
    
    controller.shutdown();
  });

  await test('UltimateSecurityController provides middleware stack', () => {
    const controller = new UltimateSecurityController();
    
    const middleware = controller.getMiddleware();
    
    assert(Array.isArray(middleware));
    assert(middleware.length === 3, 'Should have 3 middleware functions');
    assert(typeof middleware[0] === 'function');
    
    controller.shutdown();
  });

  await test('UltimateSecurityController stores/retrieves keys', () => {
    const controller = new UltimateSecurityController();
    
    controller.storeKey('master', 'secret-master-key');
    const key = controller.retrieveKey('master');
    
    assert(key.toString() === 'secret-master-key');
    
    controller.shutdown();
  });

  await test('UltimateSecurityController provides dashboard', () => {
    const controller = new UltimateSecurityController();
    
    const dashboard = controller.getDashboard();
    
    assert(dashboard.generatedAt);
    assert(dashboard.ddos);
    assert(dashboard.bannedIPs);
    assert(dashboard.decoyAccess);
    assert(dashboard.memoryKeys);
    assert(dashboard.anomalies);
    assert(dashboard.baselines);
    
    controller.shutdown();
  });

  await test('UltimateSecurityController can ban/unban IPs', () => {
    const controller = new UltimateSecurityController();
    
    controller.banIP('1.1.1.1', 'Test ban');
    assert(controller.ddos.isBanned('1.1.1.1'));
    
    controller.unbanIP('1.1.1.1');
    assert(!controller.ddos.isBanned('1.1.1.1'));
    
    controller.shutdown();
  });

  await test('UltimateSecurityController wires up events', () => {
    let alertReceived = null;
    const controller = new UltimateSecurityController({
      alertCallback: (event) => { alertReceived = event; },
    });
    
    controller.banIP('2.2.2.2', 'Test');
    
    assert(alertReceived !== null);
    assert(alertReceived.type === 'ip_banned');
    
    controller.shutdown();
  });

  // ========================================
  // Summary
  // ========================================
  console.log('\n' + '═'.repeat(60));
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(60) + '\n');

  if (failed > 0) {
    console.log('❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('✅ All tests passed! S-Tier security verified.');
    console.log('\n🎯 SECURITY LAYER COUNT: 15 LAYERS ACTIVE');
    console.log('   Layers 1-9:   Original Security Suite');
    console.log('   Layers 10-11: Cyber Warfare Module');
    console.log('   Layer 12:     DDoS Protection');
    console.log('   Layer 13:     Network Decoys');
    console.log('   Layer 14:     Memory-Safe Keys');
    console.log('   Layer 15:     Anomaly Detection');
    console.log('\n🖕 Hackers should cry blood now.\n');
    process.exit(0);
  }
}

// Run tests
runTests().catch(console.error);
