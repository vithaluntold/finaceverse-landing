/**
 * Cyber Warfare Module Test Suite
 * "They should cry blood."
 */

const {
  RotatingKeyService,
  HoneypotService,
  CanaryService,
  DecoyKeyService,
  IntrusionDetectionService,
  CyberWarfareController,
} = require('./backend/security/cyber-warfare');

console.log('\n' + '='.repeat(60));
console.log('  🔥 CYBER WARFARE TEST SUITE 🔥');
console.log('='.repeat(60) + '\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('✅ ' + name);
    passed++;
  } catch (err) {
    console.log('❌ ' + name);
    console.log('   Error: ' + err.message);
    failed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertContains(str, substr, message) {
  if (!str.includes(substr)) {
    throw new Error(message || `Expected string to contain "${substr}"`);
  }
}

// ============================================================================
// LAYER 1: ROTATING KEY SERVICE TESTS
// ============================================================================

console.log('\n--- Layer 1: Rotating Key Service ---\n');

const masterSecret = 'test-master-secret-at-least-32-chars!';
const rks = new RotatingKeyService(masterSecret);

test('Encrypt and decrypt returns original data', () => {
  const data = { secret: 'password123', userId: 42 };
  const encrypted = rks.encrypt(data);
  const decrypted = rks.decrypt(encrypted);
  assertEqual(decrypted.secret, 'password123');
  assertEqual(decrypted.userId, 42);
});

test('Encrypted data contains version prefix', () => {
  const encrypted = rks.encrypt('test');
  assertContains(encrypted, 'v1:');
});

test('Same data encrypted twice produces different ciphertext', () => {
  const data = 'same data';
  const enc1 = rks.encrypt(data);
  const enc2 = rks.encrypt(data);
  if (enc1 === enc2) {
    throw new Error('Encrypted data should be different due to random IV');
  }
});

test('Encrypted data includes date for temporal isolation', () => {
  const encrypted = rks.encrypt('test');
  const today = new Date().toISOString().slice(0, 10);
  assertContains(encrypted, today);
});

test('Different days produce different keys', () => {
  const key1 = rks.deriveKeyForPeriod('2026-01-01');
  const key2 = rks.deriveKeyForPeriod('2026-01-02');
  if (key1.equals(key2)) {
    throw new Error('Different days should produce different keys');
  }
});

// ============================================================================
// LAYER 2: HONEYPOT SERVICE TESTS
// ============================================================================

console.log('\n--- Layer 2: Honeypot Service ---\n');

let honeypotTriggered = false;
const honeypot = new HoneypotService((event) => {
  honeypotTriggered = true;
});

test('Honeypot triggers on admin@finaceverse.io', () => {
  honeypotTriggered = false;
  const result = honeypot.check('admin@finaceverse.io', 'Admin123!@#', { ip: '1.2.3.4' });
  assertEqual(result, true, 'Should trigger');
  assertEqual(honeypotTriggered, true, 'Alert should fire');
});

test('Honeypot does not trigger on legitimate users', () => {
  honeypotTriggered = false;
  const result = honeypot.check('real_user@gmail.com', 'password123', { ip: '1.2.3.4' });
  assertEqual(result, false, 'Should not trigger');
  assertEqual(honeypotTriggered, false, 'Alert should not fire');
});

test('Honeypot logs evidence', () => {
  const logs = honeypot.getTriggerLog();
  if (logs.length === 0) {
    throw new Error('Should have logged the trigger');
  }
  assertContains(logs[0].ip, '1.2.3.4');
});

// ============================================================================
// LAYER 3: CANARY SERVICE TESTS
// ============================================================================

console.log('\n--- Layer 3: Canary Service ---\n');

let canaryTriggered = false;
const canary = new CanaryService((event) => {
  canaryTriggered = true;
});

test('Canary triggers on John Wick Holdings', () => {
  canaryTriggered = false;
  const data = { customer: 'John Wick Holdings LLC', amount: 1000 };
  const result = canary.check(data, {});
  assertEqual(result, true, 'Should trigger');
  assertEqual(canaryTriggered, true, 'Alert should fire');
});

test('Canary triggers on CANARY marker', () => {
  canaryTriggered = false;
  const result = canary.check('CANARY-7742-BREACH', {});
  assertEqual(result, true, 'Should trigger');
});

test('Canary does not trigger on normal data', () => {
  canaryTriggered = false;
  const result = canary.check({ customer: 'Acme Corp', amount: 5000 }, {});
  assertEqual(result, false, 'Should not trigger');
});

test('Canary provides SQL for planting', () => {
  const sql = canary.getPlantingSQL();
  assertContains(sql, 'John Wick Holdings');
  assertContains(sql, 'CANARY');
});

// ============================================================================
// LAYER 4: DECOY KEY SERVICE TESTS
// ============================================================================

console.log('\n--- Layer 4: Decoy Key Service ---\n');

const decoys = new DecoyKeyService();

test('Identifies decoy keys', () => {
  const result = decoys.isDecoy('super-secret-encryption-key-2024');
  assertEqual(result, true, 'Should identify decoy');
});

test('Does not flag real keys as decoys', () => {
  const result = decoys.isDecoy('my-actual-real-encryption-key!');
  assertEqual(result, false, 'Should not flag real key');
});

test('Decoy decryption returns troll message', () => {
  const message = decoys.decrypt('super-secret-encryption-key-2024', 'fake-data', {});
  // Check that it contains any of the troll emoji markers
  if (!message.includes('🖕') && !message.includes('🎣') && !message.includes('💀') && 
      !message.includes('🚨') && !message.includes('😂') && !message.includes('🔒')) {
    throw new Error('Should return a troll message with emoji');
  }
});

test('Generates fake .env file', () => {
  const fakeEnv = decoys.generateFakeEnv();
  assertContains(fakeEnv, 'ENCRYPTION_KEY');
  assertContains(fakeEnv, 'JWT_SECRET');
  assertContains(fakeEnv, 'sk_live_');
});

// ============================================================================
// LAYER 5: INTRUSION DETECTION TESTS
// ============================================================================

console.log('\n--- Layer 5: Intrusion Detection ---\n');

let idsTriggered = false;
const ids = new IntrusionDetectionService((event) => {
  idsTriggered = true;
});

test('Detects SQL injection in body', () => {
  idsTriggered = false;
  const mockReq = {
    method: 'POST',
    url: '/api/login',
    path: '/api/login',
    body: { username: "admin' OR '1'='1" },
    headers: { 'user-agent': 'Mozilla/5.0' },
    ip: '1.2.3.4',
  };
  const result = ids.analyzeRequest(mockReq);
  assertEqual(result.isSuspicious, true);
  assertContains(result.reasons.join(','), 'SQL_INJECTION');
});

test('Detects path traversal', () => {
  const mockReq = {
    method: 'GET',
    url: '/api/../../../etc/passwd',
    path: '/api/../../../etc/passwd',
    body: {},
    headers: { 'user-agent': 'Mozilla/5.0' },
    ip: '1.2.3.5',
  };
  const result = ids.analyzeRequest(mockReq);
  assertEqual(result.isSuspicious, true);
  assertContains(result.reasons.join(','), 'PATH_TRAVERSAL');
});

test('Detects suspicious user agents', () => {
  const mockReq = {
    method: 'GET',
    url: '/api/users',
    path: '/api/users',
    body: {},
    headers: { 'user-agent': 'sqlmap/1.0' },
    ip: '1.2.3.6',
  };
  const result = ids.analyzeRequest(mockReq);
  assertEqual(result.isSuspicious, true);
  assertContains(result.reasons.join(','), 'SUSPICIOUS_USER_AGENT');
});

test('Normal requests pass through', () => {
  const mockReq = {
    method: 'GET',
    url: '/api/users',
    path: '/api/users',
    body: {},
    headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    ip: '192.168.1.1',
  };
  const result = ids.analyzeRequest(mockReq);
  assertEqual(result.isSuspicious, false);
});

// ============================================================================
// UNIFIED CONTROLLER TEST
// ============================================================================

console.log('\n--- Cyber Warfare Controller ---\n');

const controller = new CyberWarfareController({
  masterSecret: 'unified-test-master-secret-32char!',
  enableDeadMansSwitch: false, // Disable for testing
});

test('Controller encrypts with rotating keys', () => {
  const encrypted = controller.encrypt({ password: 'secret123' });
  assertContains(encrypted, 'v1:');
  const decrypted = controller.decrypt(encrypted);
  assertEqual(decrypted.password, 'secret123');
});

test('Controller generates incident report', () => {
  const report = controller.getIncidentReport();
  if (!report.generatedAt) {
    throw new Error('Report should have timestamp');
  }
  if (typeof report.stats.encryptionOperations !== 'number') {
    throw new Error('Report should have stats');
  }
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('  RESULTS: ' + passed + ' passed, ' + failed + ' failed');
console.log('='.repeat(60));

if (failed === 0) {
  console.log('\n🔥 CYBER WARFARE SYSTEM FULLY OPERATIONAL 🔥');
  console.log('Attackers will cry blood. 🖕😎🖕\n');
} else {
  console.log('\n⚠️ Some tests failed - review before deployment\n');
}

process.exit(failed > 0 ? 1 : 0);
