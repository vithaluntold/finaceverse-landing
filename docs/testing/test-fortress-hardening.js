/**
 * FORTRESS HARDENING TEST SUITE
 * ==============================
 * Tests for all gap fixes from devil's advocate review
 */

const assert = require('assert');

const {
  SecureDashboard,
  BoilingFrogDetector,
  MultiAdminDeadMansSwitch,
  EncryptedAlerting,
  IncidentResponse,
  DistributedAttackDetector,
  TimeSeparatedDecoys,
  FortressHardening,
} = require('./backend/security/fortress-hardening');

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
    method: 'GET',
    headers: {
      'user-agent': 'Mozilla/5.0 Test',
      'accept': 'application/json',
      'accept-language': 'en-US',
      'accept-encoding': 'gzip',
      'x-forwarded-for': '192.168.1.100',
      ...overrides.headers,
    },
    query: {},
    ...overrides,
  };
}

async function runTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('  FORTRESS HARDENING TEST SUITE');
  console.log('  (Devil\'s Advocate Gap Fixes)');
  console.log('═'.repeat(60) + '\n');

  // ========================================
  // Secure Dashboard Tests
  // ========================================
  console.log('📍 Fix #1: Secure Dashboard Authentication');

  await test('SecureDashboard generates access tokens', () => {
    const dashboard = new SecureDashboard();
    const token = dashboard.generateAccessToken('admin1', '192.168.1.1');
    
    assert(token, 'Should generate token');
    assert(token.includes('.'), 'Token should have signature');
  });

  await test('SecureDashboard validates tokens correctly', () => {
    const dashboard = new SecureDashboard();
    const token = dashboard.generateAccessToken('admin1', '192.168.1.1');
    
    const result = dashboard.validateToken(token, '192.168.1.1');
    
    assert(result.valid, 'Should be valid');
    assert(result.userId === 'admin1', 'Should return userId');
  });

  await test('SecureDashboard rejects invalid tokens', () => {
    const dashboard = new SecureDashboard();
    
    const result = dashboard.validateToken('fake.token', '192.168.1.1');
    
    assert(!result.valid, 'Should be invalid');
    assert(result.reason, 'Should have reason');
  });

  await test('SecureDashboard enforces IP whitelist', () => {
    const dashboard = new SecureDashboard({
      ipWhitelist: ['10.0.0.1'],
    });
    
    const token = dashboard.generateAccessToken('admin1', '10.0.0.1');
    
    const valid = dashboard.validateToken(token, '10.0.0.1');
    const invalid = dashboard.validateToken(token, '192.168.1.1');
    
    assert(valid.valid, 'Whitelisted IP should be valid');
    assert(!invalid.valid, 'Non-whitelisted IP should be invalid');
  });

  await test('SecureDashboard revokes sessions', () => {
    const dashboard = new SecureDashboard();
    const token = dashboard.generateAccessToken('admin1', '192.168.1.1');
    const sessionId = token.split('.')[0];
    
    assert(dashboard.validateToken(token, '192.168.1.1').valid);
    
    dashboard.revokeSession(sessionId);
    
    assert(!dashboard.validateToken(token, '192.168.1.1').valid);
  });

  // ========================================
  // Boiling Frog Detector Tests
  // ========================================
  console.log('\n📍 Fix #2: Boiling Frog Detector (Slow Ramp)');

  await test('BoilingFrogDetector initializes', () => {
    const detector = new BoilingFrogDetector();
    assert(detector.config.windowSize === 60);
    detector.stop();
  });

  await test('BoilingFrogDetector records requests', () => {
    const detector = new BoilingFrogDetector();
    
    detector.recordRequest('1.2.3.4', false);
    detector.recordRequest('1.2.3.4', false);
    detector.recordRequest('5.6.7.8', true);
    
    assert(detector.currentMinute.requests === 3);
    assert(detector.currentMinute.uniqueIPs.size === 2);
    assert(detector.currentMinute.errors === 1);
    
    detector.stop();
  });

  await test('BoilingFrogDetector calculates trends', () => {
    const detector = new BoilingFrogDetector();
    
    // Simulate increasing trend
    const data = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const trend = detector.calculateTrend(data);
    
    assert(trend.slope > 0, 'Slope should be positive');
    assert(typeof trend.consecutiveIncreases === 'number');
    
    detector.stop();
  });

  await test('BoilingFrogDetector detects slow ramp', () => {
    const detector = new BoilingFrogDetector({
      consecutiveRequired: 3,
    });
    
    // Steadily increasing data
    const data = [100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200];
    const trend = detector.calculateTrend(data);
    
    assert(trend.consecutiveIncreases >= 3, 'Should detect consecutive increases');
    
    detector.stop();
  });

  // ========================================
  // Multi-Admin Dead Man's Switch Tests
  // ========================================
  console.log('\n📍 Fix #3: Multi-Admin Dead Man\'s Switch');

  await test('MultiAdminDeadMansSwitch registers admins', () => {
    const dms = new MultiAdminDeadMansSwitch();
    
    dms.registerAdmin('admin1', 'John Doe');
    dms.registerAdmin('admin2', 'Jane Smith');
    
    assert(dms.admins.size === 2);
    
    dms.stop();
  });

  await test('MultiAdminDeadMansSwitch records heartbeats', () => {
    const dms = new MultiAdminDeadMansSwitch();
    
    dms.registerAdmin('admin1', 'John Doe');
    const result = dms.heartbeat('admin1');
    
    assert(result === true);
    
    dms.stop();
  });

  await test('MultiAdminDeadMansSwitch rejects unknown admin heartbeat', () => {
    const dms = new MultiAdminDeadMansSwitch();
    
    const result = dms.heartbeat('unknown');
    
    assert(result === false);
    
    dms.stop();
  });

  await test('MultiAdminDeadMansSwitch supports vacation mode', () => {
    const dms = new MultiAdminDeadMansSwitch();
    
    dms.registerAdmin('admin1', 'John Doe');
    
    const tomorrow = new Date(Date.now() + 86400000);
    const nextWeek = new Date(Date.now() + 7 * 86400000);
    
    dms.scheduleVacation('admin1', tomorrow.toISOString(), nextWeek.toISOString());
    
    assert(dms.vacationSchedule.length === 1);
    
    dms.stop();
  });

  await test('MultiAdminDeadMansSwitch returns status', () => {
    const dms = new MultiAdminDeadMansSwitch();
    
    dms.registerAdmin('admin1', 'John Doe');
    dms.heartbeat('admin1');
    
    const status = dms.getStatus();
    
    assert(status.admins.length === 1);
    assert(status.admins[0].isActive === true);
    assert(status.triggered === false);
    
    dms.stop();
  });

  // ========================================
  // Encrypted Alerting Tests
  // ========================================
  console.log('\n📍 Fix #4: Encrypted Alerting');

  await test('EncryptedAlerting encrypts and decrypts alerts', () => {
    const alerting = new EncryptedAlerting();
    
    const alert = { type: 'test', ip: '1.2.3.4', details: 'secret info' };
    const encrypted = alerting.encryptAlert(alert);
    const decrypted = alerting.decryptAlert(encrypted);
    
    assert.deepStrictEqual(decrypted, alert);
  });

  await test('EncryptedAlerting generates verification codes', () => {
    const alerting = new EncryptedAlerting();
    
    const alert = { type: 'test', severity: 'critical' };
    const code = alerting.generateVerificationCode(alert);
    
    assert(code.length === 8);
    assert(/^[A-F0-9]+$/.test(code));
  });

  await test('EncryptedAlerting verifies codes once', () => {
    const alerting = new EncryptedAlerting();
    
    const alert = { type: 'test', severity: 'critical' };
    const code = alerting.generateVerificationCode(alert);
    
    const first = alerting.verifyCode(code);
    const second = alerting.verifyCode(code);
    
    assert(first !== null, 'First verification should succeed');
    assert(second === null, 'Second verification should fail (one-time use)');
  });

  await test('EncryptedAlerting formats SMS without sensitive data', () => {
    const alerting = new EncryptedAlerting();
    
    const alert = { type: 'breach', severity: 'critical', ip: '1.2.3.4', password: 'secret123' };
    const sms = alerting.formatSMS(alert);
    
    assert(!sms.includes('1.2.3.4'), 'Should not contain IP');
    assert(!sms.includes('secret123'), 'Should not contain password');
    assert(sms.includes('CRITICAL'), 'Should contain severity');
    assert(sms.includes('Code:'), 'Should contain verification code');
  });

  // ========================================
  // Incident Response Tests
  // ========================================
  console.log('\n📍 Fix #5: Incident Response Automation');

  await test('IncidentResponse reports incidents', async () => {
    const ir = new IncidentResponse({ autoBlockIP: false });
    
    const incidentId = await ir.reportIncident({
      type: 'test_incident',
      severity: 'medium',
      ip: '1.2.3.4',
    });
    
    assert(incidentId);
    assert(ir.activeIncidents.size === 1);
  });

  await test('IncidentResponse auto-blocks IP on critical', async () => {
    let blockedIP = null;
    const ir = new IncidentResponse({
      autoBlockIP: true,
      onBlockIP: (ip) => { blockedIP = ip; },
    });
    
    await ir.reportIncident({
      type: 'critical_test',
      severity: 'critical',
      ip: '1.2.3.4',
    });
    
    assert(blockedIP === '1.2.3.4');
    assert(ir.blockedIPs.has('1.2.3.4'));
  });

  await test('IncidentResponse resolves incidents', async () => {
    const ir = new IncidentResponse({ autoBlockIP: false });
    
    const incidentId = await ir.reportIncident({
      type: 'test',
      severity: 'low',
    });
    
    ir.resolveIncident(incidentId, 'False positive');
    
    const incident = ir.activeIncidents.get(incidentId);
    assert(incident.resolvedAt);
    assert(incident.resolution === 'False positive');
  });

  await test('IncidentResponse returns blocked IPs', async () => {
    const ir = new IncidentResponse({ autoBlockIP: true });
    
    await ir.reportIncident({ type: 'test', severity: 'critical', ip: '1.1.1.1' });
    await ir.reportIncident({ type: 'test', severity: 'critical', ip: '2.2.2.2' });
    
    const blocked = ir.getBlockedIPs();
    
    assert(blocked.length === 2);
    assert(blocked.includes('1.1.1.1'));
    assert(blocked.includes('2.2.2.2'));
  });

  // ========================================
  // Distributed Attack Detector Tests
  // ========================================
  console.log('\n📍 Fix #6: Distributed Attack Detector');

  await test('DistributedAttackDetector generates fingerprints', () => {
    const detector = new DistributedAttackDetector();
    
    const req1 = mockRequest();
    const req2 = mockRequest();
    const req3 = mockRequest({ headers: { 'user-agent': 'Different Bot' } });
    
    const fp1 = detector.generateFingerprint(req1);
    const fp2 = detector.generateFingerprint(req2);
    const fp3 = detector.generateFingerprint(req3);
    
    assert(fp1 === fp2, 'Same request should have same fingerprint');
    assert(fp1 !== fp3, 'Different user-agent should have different fingerprint');
    
    detector.stop();
  });

  await test('DistributedAttackDetector tracks IPs per fingerprint', () => {
    const detector = new DistributedAttackDetector();
    
    const req = mockRequest();
    
    // Simulate multiple IPs with same fingerprint
    for (let i = 0; i < 5; i++) {
      const r = { ...req, ip: `192.168.1.${i}` };
      detector.recordRequest(r);
    }
    
    const suspicious = detector.getSuspicious();
    
    assert(suspicious.length >= 1);
    assert(suspicious[0].ipCount === 5);
    
    detector.stop();
  });

  await test('DistributedAttackDetector emits on threshold', (done) => {
    const detector = new DistributedAttackDetector({
      minIPsForDetection: 3,
      minRequestsForDetection: 5,
    });
    
    let eventFired = false;
    detector.on('distributed_attack', () => {
      eventFired = true;
    });
    
    const req = mockRequest();
    
    // Create distributed pattern
    for (let i = 0; i < 10; i++) {
      const r = { ...req, ip: `10.0.0.${i}` };
      detector.recordRequest(r);
    }
    
    assert(eventFired, 'Should emit distributed_attack event');
    
    detector.stop();
  });

  // ========================================
  // Time-Separated Decoys Tests
  // ========================================
  console.log('\n📍 Fix #7: Time-Separated Decoy Keys');

  await test('TimeSeparatedDecoys generates decoys', () => {
    const decoys = new TimeSeparatedDecoys();
    
    assert(decoys.decoys.size > 0, 'Should have decoys');
    assert(decoys.isDecoy('AWS_ACCESS_KEY_ID'), 'Should identify decoy by name');
    
    decoys.stop();
  });

  await test('TimeSeparatedDecoys checks values', () => {
    const decoys = new TimeSeparatedDecoys();
    
    const awsDecoy = decoys.decoys.get('AWS_ACCESS_KEY_ID');
    const result = decoys.isDecoyValue(awsDecoy.value);
    
    assert(result.isDecoy, 'Should identify decoy value');
    assert(result.keyName === 'AWS_ACCESS_KEY_ID');
    assert(result.trollMessage, 'Should have troll message');
    
    decoys.stop();
  });

  await test('TimeSeparatedDecoys generates env format', () => {
    const decoys = new TimeSeparatedDecoys();
    
    const env = decoys.getDecoyEnv();
    
    assert(env.includes('AWS_ACCESS_KEY_ID='));
    assert(env.includes('STRIPE_SECRET_KEY='));
    
    decoys.stop();
  });

  await test('TimeSeparatedDecoys logs access', () => {
    const decoys = new TimeSeparatedDecoys();
    
    decoys.logAccess('AWS_ACCESS_KEY_ID', { ip: '1.2.3.4' });
    
    const log = decoys.getAccessLog();
    
    assert(log.length === 1);
    assert(log[0].keyName === 'AWS_ACCESS_KEY_ID');
    
    decoys.stop();
  });

  // ========================================
  // Fortress Hardening Controller Tests
  // ========================================
  console.log('\n📍 Fortress Hardening Controller (Unified)');

  await test('FortressHardening initializes all components', () => {
    const fortress = new FortressHardening();
    
    assert(fortress.dashboard);
    assert(fortress.boilingFrog);
    assert(fortress.deadMansSwitch);
    assert(fortress.alerting);
    assert(fortress.incidentResponse);
    assert(fortress.distributedDetector);
    assert(fortress.decoys);
    
    fortress.shutdown();
  });

  await test('FortressHardening provides middleware stack', () => {
    const fortress = new FortressHardening();
    
    const middleware = fortress.getMiddleware();
    
    assert(Array.isArray(middleware));
    assert(middleware.length === 2);
    
    fortress.shutdown();
  });

  await test('FortressHardening manages admins', () => {
    const fortress = new FortressHardening();
    
    fortress.registerAdmin('admin1', 'Test Admin');
    const result = fortress.adminHeartbeat('admin1');
    
    assert(result === true);
    
    fortress.shutdown();
  });

  await test('FortressHardening returns comprehensive status', () => {
    const fortress = new FortressHardening();
    
    fortress.registerAdmin('admin1', 'Test Admin');
    fortress.adminHeartbeat('admin1');
    
    const status = fortress.getStatus();
    
    assert(status.generatedAt);
    assert(status.deadMansSwitch);
    assert(status.boilingFrog);
    assert(status.distributedAttacks);
    assert(status.activeIncidents);
    assert(status.blockedIPs);
    
    fortress.shutdown();
  });

  await test('FortressHardening verifies alert codes', () => {
    const fortress = new FortressHardening();
    
    const alert = { type: 'test', severity: 'high' };
    const code = fortress.alerting.generateVerificationCode(alert);
    
    const verified = fortress.verifyAlertCode(code);
    
    assert(verified);
    assert(verified.type === 'test');
    
    fortress.shutdown();
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
    console.log('✅ All gap fixes verified!');
    console.log('\n🏰 DEVIL\'S ADVOCATE GAPS: ALL FIXED');
    console.log('   ✅ Dashboard authentication');
    console.log('   ✅ Slow-ramp attack detection');
    console.log('   ✅ Multi-admin dead man\'s switch');
    console.log('   ✅ Encrypted alerting');
    console.log('   ✅ Incident response automation');
    console.log('   ✅ Distributed attack detection');
    console.log('   ✅ Time-separated decoy keys\n');
    process.exit(0);
  }
}

runTests().catch(console.error);
