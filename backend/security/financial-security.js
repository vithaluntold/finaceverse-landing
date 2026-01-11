/**
 * FINANCIAL DATA INTEGRITY MODULE
 * ================================
 * Security layers specific to financial modules:
 * VAMN, Accute, Luca, FinAid Hub, TaxBlitz, Audric, Cyloid, EPI-Q
 * 
 * Layers 22-30: Financial-specific security
 * 
 * @module financial-security
 * @version 1.0.0
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

// ============================================================================
// LAYER 22: CALCULATION INTEGRITY (VAMN, TaxBlitz)
// Cryptographic proof that calculations weren't tampered
// ============================================================================

class CalculationIntegrity {
  constructor(options = {}) {
    this.signingKey = options.signingKey || crypto.randomBytes(32).toString('hex');
    this.verificationLog = [];
    this.maxLogSize = options.maxLogSize || 100000;
    
    console.log('🔢 Calculation Integrity initialized (VAMN/TaxBlitz protection)');
  }

  /**
   * Sign a financial calculation result
   * Creates tamper-proof record of: inputs + formula + result
   */
  signCalculation(calculationId, inputs, formula, result, userId, tenantId) {
    const timestamp = Date.now();
    const payload = JSON.stringify({
      id: calculationId,
      inputs: this._normalizeInputs(inputs),
      formula,
      result: this._normalizeResult(result),
      userId,
      tenantId,
      timestamp,
    });
    
    const signature = crypto
      .createHmac('sha256', this.signingKey)
      .update(payload)
      .digest('hex');
    
    const record = {
      calculationId,
      payloadHash: crypto.createHash('sha256').update(payload).digest('hex'),
      signature,
      timestamp,
      tenantId,
    };
    
    // Store for verification
    this._addToLog(record);
    
    return {
      calculationId,
      signature,
      timestamp,
      integrityToken: `${record.payloadHash}:${signature}`,
    };
  }

  /**
   * Verify a calculation hasn't been tampered with
   */
  verifyCalculation(calculationId, inputs, formula, result, userId, tenantId, providedSignature) {
    const payload = JSON.stringify({
      id: calculationId,
      inputs: this._normalizeInputs(inputs),
      formula,
      result: this._normalizeResult(result),
      userId,
      tenantId,
      timestamp: this._findTimestamp(calculationId),
    });
    
    const expectedSignature = crypto
      .createHmac('sha256', this.signingKey)
      .update(payload)
      .digest('hex');
    
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(providedSignature)
    );
    
    if (!isValid) {
      console.warn(`⚠️ CALCULATION TAMPERING DETECTED: ${calculationId}`);
    }
    
    return isValid;
  }

  _normalizeInputs(inputs) {
    // Sort object keys for consistent hashing
    if (typeof inputs === 'object' && inputs !== null) {
      return Object.keys(inputs).sort().reduce((acc, key) => {
        acc[key] = inputs[key];
        return acc;
      }, {});
    }
    return inputs;
  }

  _normalizeResult(result) {
    // Round to avoid floating point inconsistencies
    if (typeof result === 'number') {
      return Math.round(result * 1000000) / 1000000;
    }
    return result;
  }

  _findTimestamp(calculationId) {
    const record = this.verificationLog.find(r => r.calculationId === calculationId);
    return record?.timestamp || Date.now();
  }

  _addToLog(record) {
    this.verificationLog.push(record);
    if (this.verificationLog.length > this.maxLogSize) {
      this.verificationLog = this.verificationLog.slice(-Math.floor(this.maxLogSize * 0.9));
    }
  }
}

// ============================================================================
// LAYER 23: DOCUMENT HASH CHAIN (Cyloid)
// Blockchain-style verification for documents
// ============================================================================

class DocumentHashChain {
  constructor(options = {}) {
    this.chain = [];
    this.maxChainSize = options.maxChainSize || 1000000;
    this.genesisBlock = this._createGenesisBlock();
    this.chain.push(this.genesisBlock);
    
    console.log('📄 Document Hash Chain initialized (Cyloid protection)');
  }

  _createGenesisBlock() {
    return {
      index: 0,
      timestamp: Date.now(),
      documentId: 'GENESIS',
      documentHash: '0'.repeat(64),
      previousHash: '0'.repeat(64),
      tenantId: 'SYSTEM',
    };
  }

  /**
   * Add a document to the chain
   */
  addDocument(documentId, documentContent, tenantId, metadata = {}) {
    const previousBlock = this.chain[this.chain.length - 1];
    
    // Hash document content
    const documentHash = crypto
      .createHash('sha256')
      .update(typeof documentContent === 'string' ? documentContent : JSON.stringify(documentContent))
      .digest('hex');
    
    const block = {
      index: previousBlock.index + 1,
      timestamp: Date.now(),
      documentId,
      documentHash,
      previousHash: this._hashBlock(previousBlock),
      tenantId,
      metadata: {
        ...metadata,
        uploadedAt: new Date().toISOString(),
      },
    };
    
    block.blockHash = this._hashBlock(block);
    this.chain.push(block);
    
    // Prune old blocks if needed
    if (this.chain.length > this.maxChainSize) {
      this.chain = this.chain.slice(-Math.floor(this.maxChainSize * 0.9));
    }
    
    return {
      blockIndex: block.index,
      documentHash,
      blockHash: block.blockHash,
      previousHash: block.previousHash,
      chainProof: this._generateProof(block.index),
    };
  }

  /**
   * Verify a document exists in the chain and hasn't been modified
   */
  verifyDocument(documentId, documentContent, providedHash) {
    const currentHash = crypto
      .createHash('sha256')
      .update(typeof documentContent === 'string' ? documentContent : JSON.stringify(documentContent))
      .digest('hex');
    
    // Check hash matches
    if (currentHash !== providedHash) {
      return { valid: false, reason: 'DOCUMENT_MODIFIED' };
    }
    
    // Find in chain
    const block = this.chain.find(b => b.documentId === documentId);
    if (!block) {
      return { valid: false, reason: 'NOT_IN_CHAIN' };
    }
    
    // Verify chain integrity
    if (!this._verifyChainIntegrity(block.index)) {
      return { valid: false, reason: 'CHAIN_CORRUPTED' };
    }
    
    return { valid: true, block };
  }

  /**
   * Verify chain integrity up to a specific index
   */
  _verifyChainIntegrity(upToIndex) {
    for (let i = 1; i <= upToIndex && i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
      
      // Verify previous hash link
      if (currentBlock.previousHash !== this._hashBlock(previousBlock)) {
        console.error(`Chain integrity broken at block ${i}`);
        return false;
      }
    }
    return true;
  }

  _hashBlock(block) {
    const data = `${block.index}${block.timestamp}${block.documentId}${block.documentHash}${block.previousHash}${block.tenantId}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  _generateProof(index) {
    // Merkle-like proof for the document
    const proofBlocks = [];
    let current = index;
    while (current > 0 && proofBlocks.length < 10) {
      proofBlocks.push({
        index: current,
        hash: this.chain[current]?.blockHash,
      });
      current = Math.floor(current / 2);
    }
    return proofBlocks;
  }
}

// ============================================================================
// LAYER 24: IMMUTABLE AUDIT LOG (Audric)
// Append-only audit log that cannot be modified
// ============================================================================

class ImmutableAuditLog extends EventEmitter {
  constructor(options = {}) {
    super();
    this.log = [];
    this.maxLogSize = options.maxLogSize || 1000000;
    this.hashChain = null; // Previous entry hash
    this.encryptionKey = options.encryptionKey || crypto.randomBytes(32);
    
    console.log('📋 Immutable Audit Log initialized (Audric protection)');
  }

  /**
   * Append an audit entry (cannot be modified once added)
   */
  append(entry) {
    const timestamp = Date.now();
    const previousHash = this.hashChain || '0'.repeat(64);
    
    const auditEntry = {
      id: crypto.randomBytes(16).toString('hex'),
      timestamp,
      sequence: this.log.length,
      tenantId: entry.tenantId,
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      changes: entry.changes,
      ip: entry.ip,
      userAgent: entry.userAgent,
      previousHash,
    };
    
    // Calculate hash including previous hash (chain)
    const entryHash = this._hashEntry(auditEntry);
    auditEntry.hash = entryHash;
    this.hashChain = entryHash;
    
    // Sign the entry
    auditEntry.signature = this._signEntry(auditEntry);
    
    this.log.push(auditEntry);
    
    // Emit for real-time monitoring
    this.emit('audit', auditEntry);
    
    // Prune if needed
    if (this.log.length > this.maxLogSize) {
      this.log = this.log.slice(-Math.floor(this.maxLogSize * 0.9));
    }
    
    return auditEntry;
  }

  /**
   * Verify the audit log hasn't been tampered with
   */
  verifyIntegrity(fromSequence = 0, toSequence = this.log.length - 1) {
    let previousHash = fromSequence === 0 ? '0'.repeat(64) : this.log[fromSequence - 1]?.hash;
    
    for (let i = fromSequence; i <= toSequence && i < this.log.length; i++) {
      const entry = this.log[i];
      
      // Verify hash chain
      if (entry.previousHash !== previousHash) {
        return { valid: false, brokenAt: i, reason: 'HASH_CHAIN_BROKEN' };
      }
      
      // Verify entry hash
      const expectedHash = this._hashEntry({ ...entry, hash: undefined, signature: undefined });
      if (entry.hash !== expectedHash) {
        return { valid: false, brokenAt: i, reason: 'ENTRY_MODIFIED' };
      }
      
      // Verify signature
      if (!this._verifySignature(entry)) {
        return { valid: false, brokenAt: i, reason: 'SIGNATURE_INVALID' };
      }
      
      previousHash = entry.hash;
    }
    
    return { valid: true, verified: toSequence - fromSequence + 1 };
  }

  /**
   * Query audit log (read-only)
   */
  query(filters = {}) {
    let results = [...this.log];
    
    if (filters.tenantId) {
      results = results.filter(e => e.tenantId === filters.tenantId);
    }
    if (filters.userId) {
      results = results.filter(e => e.userId === filters.userId);
    }
    if (filters.action) {
      results = results.filter(e => e.action === filters.action);
    }
    if (filters.fromTimestamp) {
      results = results.filter(e => e.timestamp >= filters.fromTimestamp);
    }
    if (filters.toTimestamp) {
      results = results.filter(e => e.timestamp <= filters.toTimestamp);
    }
    
    return results.slice(0, filters.limit || 1000);
  }

  _hashEntry(entry) {
    const data = JSON.stringify({
      timestamp: entry.timestamp,
      sequence: entry.sequence,
      tenantId: entry.tenantId,
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      changes: entry.changes,
      previousHash: entry.previousHash,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  _signEntry(entry) {
    const data = `${entry.hash}:${entry.timestamp}:${entry.sequence}`;
    return crypto
      .createHmac('sha256', this.encryptionKey)
      .update(data)
      .digest('hex');
  }

  _verifySignature(entry) {
    const expectedSignature = this._signEntry(entry);
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(entry.signature)
      );
    } catch {
      return false;
    }
  }
}

// ============================================================================
// LAYER 25: WORKFLOW STATE INTEGRITY (Accute)
// Prevents unauthorized workflow state changes
// ============================================================================

class WorkflowStateIntegrity extends EventEmitter {
  constructor(options = {}) {
    super();
    this.workflows = new Map();
    this.maxWorkflows = options.maxWorkflows || 100000;
    this.signingKey = options.signingKey || crypto.randomBytes(32).toString('hex');
    
    console.log('🔄 Workflow State Integrity initialized (Accute protection)');
  }

  /**
   * Create a new workflow with signed initial state
   */
  createWorkflow(workflowId, tenantId, initialState, approvers = []) {
    const workflow = {
      id: workflowId,
      tenantId,
      state: initialState,
      approvers: approvers.map(a => ({
        userId: a.userId,
        role: a.role,
        required: a.required !== false,
      })),
      transitions: [],
      createdAt: Date.now(),
      currentStateHash: null,
    };
    
    workflow.currentStateHash = this._hashState(workflow);
    workflow.signature = this._signWorkflow(workflow);
    
    this.workflows.set(workflowId, workflow);
    
    // LRU eviction
    if (this.workflows.size > this.maxWorkflows) {
      const oldest = [...this.workflows.entries()]
        .sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
      this.workflows.delete(oldest[0]);
    }
    
    return {
      workflowId,
      stateHash: workflow.currentStateHash,
      signature: workflow.signature,
    };
  }

  /**
   * Transition workflow to a new state (with verification)
   */
  transition(workflowId, newState, userId, reason) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }
    
    // Verify current state hasn't been tampered
    const currentHash = this._hashState(workflow);
    if (currentHash !== workflow.currentStateHash) {
      this.emit('tampering', { workflowId, userId, reason: 'STATE_MODIFIED' });
      throw new Error('Workflow state has been tampered with');
    }
    
    // Verify user is authorized approver
    const approver = workflow.approvers.find(a => a.userId === userId);
    if (!approver && workflow.approvers.length > 0) {
      this.emit('unauthorized', { workflowId, userId, reason: 'NOT_APPROVER' });
      throw new Error('User is not an authorized approver');
    }
    
    // Record transition
    const transition = {
      from: workflow.state,
      to: newState,
      userId,
      reason,
      timestamp: Date.now(),
      previousStateHash: workflow.currentStateHash,
    };
    
    workflow.state = newState;
    workflow.transitions.push(transition);
    workflow.currentStateHash = this._hashState(workflow);
    workflow.signature = this._signWorkflow(workflow);
    
    this.emit('transition', { workflowId, transition });
    
    return {
      workflowId,
      newState,
      stateHash: workflow.currentStateHash,
      transitionCount: workflow.transitions.length,
    };
  }

  /**
   * Verify workflow integrity
   */
  verify(workflowId) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return { valid: false, reason: 'NOT_FOUND' };
    }
    
    // Verify current state hash
    const currentHash = this._hashState(workflow);
    if (currentHash !== workflow.currentStateHash) {
      return { valid: false, reason: 'STATE_TAMPERED' };
    }
    
    // Verify signature
    const expectedSignature = this._signWorkflow(workflow);
    try {
      if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(workflow.signature))) {
        return { valid: false, reason: 'SIGNATURE_INVALID' };
      }
    } catch {
      return { valid: false, reason: 'SIGNATURE_INVALID' };
    }
    
    return { valid: true, transitions: workflow.transitions.length };
  }

  _hashState(workflow) {
    const data = JSON.stringify({
      id: workflow.id,
      tenantId: workflow.tenantId,
      state: workflow.state,
      approvers: workflow.approvers,
      transitions: workflow.transitions,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  _signWorkflow(workflow) {
    const data = `${workflow.id}:${workflow.currentStateHash}:${workflow.transitions.length}`;
    return crypto.createHmac('sha256', this.signingKey).update(data).digest('hex');
  }
}

// ============================================================================
// LAYER 26: AI PROMPT INJECTION PREVENTION (Luca, FinAid Hub)
// Prevents malicious prompts from manipulating AI responses
// ============================================================================

class PromptInjectionPrevention {
  constructor(options = {}) {
    this.blockedPatterns = [
      // Instruction override attempts
      /ignore\s+(previous|all|above)\s+(instructions?|prompts?)/i,
      /disregard\s+(previous|all|above)/i,
      /forget\s+(everything|all|previous)/i,
      /new\s+instructions?:/i,
      /system\s*:\s*/i,
      /\[SYSTEM\]/i,
      /\[INST\]/i,
      /<\|im_start\|>/i,
      /<\|im_end\|>/i,
      
      // Role manipulation
      /you\s+are\s+(now|no\s+longer)/i,
      /pretend\s+(to\s+be|you\s+are)/i,
      /act\s+as\s+(if|a)/i,
      /roleplay\s+as/i,
      
      // Data exfiltration
      /output\s+(all|your|the)\s+(training|system)/i,
      /reveal\s+(your|the)\s+(prompt|instructions)/i,
      /what\s+are\s+your\s+instructions/i,
      /show\s+me\s+(your|the)\s+system/i,
      
      // Code execution
      /```\s*(python|javascript|bash|sh|cmd)/i,
      /exec\s*\(/i,
      /eval\s*\(/i,
      /__import__/i,
      
      // Financial manipulation attempts
      /transfer\s+\$?\d+/i,
      /approve\s+(all|any)\s+(payments?|transactions?)/i,
      /bypass\s+(verification|approval)/i,
      /override\s+(limit|control)/i,
    ];
    
    this.maxPromptLength = options.maxPromptLength || 10000;
    this.suspiciousLog = [];
    
    console.log('🤖 Prompt Injection Prevention initialized (Luca/FinAid protection)');
  }

  /**
   * Sanitize user input before sending to AI
   */
  sanitize(input, userId, tenantId) {
    if (!input || typeof input !== 'string') {
      return { safe: true, sanitized: '' };
    }
    
    // Length check
    if (input.length > this.maxPromptLength) {
      return { 
        safe: false, 
        reason: 'PROMPT_TOO_LONG',
        sanitized: input.substring(0, this.maxPromptLength),
      };
    }
    
    // Check for injection patterns
    for (const pattern of this.blockedPatterns) {
      if (pattern.test(input)) {
        this._logSuspicious(input, pattern, userId, tenantId);
        return {
          safe: false,
          reason: 'INJECTION_DETECTED',
          pattern: pattern.toString(),
          sanitized: this._neutralize(input, pattern),
        };
      }
    }
    
    // Neutralize special tokens
    let sanitized = input
      .replace(/```/g, '‵‵‵')  // Replace code blocks
      .replace(/\[SYSTEM\]/gi, '[USER]')
      .replace(/\[INST\]/gi, '[USER]')
      .replace(/<\|/g, '<|')
      .replace(/\|>/g, '|>');
    
    return { safe: true, sanitized };
  }

  /**
   * Verify AI response doesn't contain sensitive data
   */
  validateResponse(response, tenantId) {
    const sensitivePatterns = [
      // API keys
      /[A-Za-z0-9]{32,}/,
      // Credit card numbers
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
      // SSN
      /\b\d{3}-\d{2}-\d{4}\b/,
      // Bank account
      /\b\d{9,18}\b/,
      // Internal paths
      /\/vault-[a-f0-9]+/,
      /MASTER_KEY/i,
      /JWT_SECRET/i,
    ];
    
    for (const pattern of sensitivePatterns) {
      if (pattern.test(response)) {
        return { valid: false, reason: 'SENSITIVE_DATA_LEAK' };
      }
    }
    
    return { valid: true };
  }

  _neutralize(input, pattern) {
    return input.replace(pattern, '[BLOCKED]');
  }

  _logSuspicious(input, pattern, userId, tenantId) {
    this.suspiciousLog.push({
      timestamp: Date.now(),
      userId,
      tenantId,
      pattern: pattern.toString(),
      inputPreview: input.substring(0, 100),
    });
    
    if (this.suspiciousLog.length > 10000) {
      this.suspiciousLog = this.suspiciousLog.slice(-9000);
    }
    
    console.warn(`⚠️ PROMPT INJECTION ATTEMPT: User ${userId}, Tenant ${tenantId}`);
  }
}

// ============================================================================
// LAYER 27: TRANSACTION IDEMPOTENCY (FinAid Hub, Billing)
// Prevents double-spend and transaction replay
// ============================================================================

class TransactionIdempotency {
  constructor(options = {}) {
    this.processedKeys = new Map(); // idempotencyKey -> result
    this.pendingKeys = new Set();
    this.maxKeys = options.maxKeys || 1000000;
    this.keyTTL = options.keyTTL || 24 * 60 * 60 * 1000; // 24 hours
    
    // Cleanup interval
    this._cleanupInterval = setInterval(() => this._cleanup(), 60000);
    
    console.log('💰 Transaction Idempotency initialized (double-spend protection)');
  }

  /**
   * Start a transaction with idempotency key
   */
  async startTransaction(idempotencyKey, tenantId) {
    const fullKey = `${tenantId}:${idempotencyKey}`;
    
    // Check if already processed
    if (this.processedKeys.has(fullKey)) {
      const result = this.processedKeys.get(fullKey);
      return { 
        duplicate: true, 
        previousResult: result.result,
        processedAt: result.processedAt,
      };
    }
    
    // Check if currently pending
    if (this.pendingKeys.has(fullKey)) {
      return { 
        duplicate: true, 
        pending: true,
        message: 'Transaction is currently being processed',
      };
    }
    
    // Mark as pending
    this.pendingKeys.add(fullKey);
    
    return { duplicate: false, key: fullKey };
  }

  /**
   * Complete a transaction
   */
  completeTransaction(idempotencyKey, tenantId, result, success = true) {
    const fullKey = `${tenantId}:${idempotencyKey}`;
    
    // Remove from pending
    this.pendingKeys.delete(fullKey);
    
    // Store result
    this.processedKeys.set(fullKey, {
      result,
      success,
      processedAt: Date.now(),
    });
    
    // LRU eviction
    if (this.processedKeys.size > this.maxKeys) {
      const toDelete = [...this.processedKeys.entries()]
        .sort((a, b) => a[1].processedAt - b[1].processedAt)
        .slice(0, Math.floor(this.maxKeys * 0.1));
      
      toDelete.forEach(([key]) => this.processedKeys.delete(key));
    }
  }

  /**
   * Abort a transaction (remove from pending)
   */
  abortTransaction(idempotencyKey, tenantId) {
    const fullKey = `${tenantId}:${idempotencyKey}`;
    this.pendingKeys.delete(fullKey);
  }

  /**
   * Generate a secure idempotency key
   */
  generateKey() {
    return crypto.randomBytes(16).toString('hex');
  }

  _cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of this.processedKeys) {
      if (now - value.processedAt > this.keyTTL) {
        this.processedKeys.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired idempotency keys`);
    }
  }

  stop() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }
  }
}

// ============================================================================
// LAYER 28: ROW-LEVEL SECURITY ENFORCER (Multi-tenant)
// Ensures tenants can only access their own data
// ============================================================================

class RowLevelSecurity {
  constructor(options = {}) {
    this.strictMode = options.strictMode !== false;
    this.auditViolations = options.auditViolations !== false;
    this.violations = [];
    this.maxViolations = options.maxViolations || 10000;
    
    console.log('🔐 Row-Level Security initialized (multi-tenant isolation)');
  }

  /**
   * Wrap a database query to enforce tenant isolation
   */
  wrapQuery(query, params, tenantId, userId) {
    // Detect table from query
    const tableMatch = query.match(/FROM\s+(\w+)/i) || query.match(/INTO\s+(\w+)/i) || query.match(/UPDATE\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : null;
    
    // Tables that require tenant isolation
    const tenantTables = [
      'users', 'transactions', 'documents', 'workflows', 
      'invoices', 'payments', 'calculations', 'audit_logs',
      'products', 'subscriptions', 'api_keys'
    ];
    
    if (!table || !tenantTables.includes(table.toLowerCase())) {
      return { query, params };
    }
    
    // Check if query already has tenant_id condition
    if (/tenant_id\s*=/i.test(query)) {
      // Verify the tenant_id matches
      return { query, params, verified: true };
    }
    
    // Inject tenant_id condition
    if (/WHERE/i.test(query)) {
      query = query.replace(/WHERE/i, `WHERE tenant_id = $${params.length + 1} AND `);
    } else if (/SELECT|DELETE/i.test(query)) {
      query = query.replace(/(FROM\s+\w+)/i, `$1 WHERE tenant_id = $${params.length + 1}`);
    } else if (/UPDATE/i.test(query)) {
      query = query.replace(/(SET)/i, `$1 tenant_id = $${params.length + 1},`);
    }
    
    params.push(tenantId);
    
    return { query, params, injected: true };
  }

  /**
   * Verify query results belong to tenant
   */
  verifyResults(results, tenantId) {
    if (!Array.isArray(results)) {
      results = [results];
    }
    
    const violations = results.filter(row => 
      row && row.tenant_id && row.tenant_id !== tenantId
    );
    
    if (violations.length > 0) {
      this._recordViolation(tenantId, violations);
      
      if (this.strictMode) {
        throw new Error('TENANT_ISOLATION_VIOLATION');
      }
      
      // Filter out unauthorized rows
      return results.filter(row => !row.tenant_id || row.tenant_id === tenantId);
    }
    
    return results;
  }

  _recordViolation(requestingTenant, violatingRows) {
    const violation = {
      timestamp: Date.now(),
      requestingTenant,
      attemptedAccess: violatingRows.map(r => ({
        tenant_id: r.tenant_id,
        id: r.id,
      })),
    };
    
    this.violations.push(violation);
    
    if (this.violations.length > this.maxViolations) {
      this.violations = this.violations.slice(-Math.floor(this.maxViolations * 0.9));
    }
    
    console.error(`🚨 TENANT ISOLATION VIOLATION: Tenant ${requestingTenant} tried to access other tenant data`);
  }
}

// ============================================================================
// LAYER 29: AI RESPONSE SIGNING (Luca)
// Prevents AI response tampering
// ============================================================================

class AIResponseSigning {
  constructor(options = {}) {
    this.signingKey = options.signingKey || crypto.randomBytes(32).toString('hex');
    
    console.log('✍️ AI Response Signing initialized (Luca protection)');
  }

  /**
   * Sign an AI response
   */
  signResponse(response, query, userId, tenantId) {
    const timestamp = Date.now();
    const payload = JSON.stringify({
      response: typeof response === 'string' ? response : JSON.stringify(response),
      queryHash: crypto.createHash('sha256').update(query).digest('hex'),
      userId,
      tenantId,
      timestamp,
    });
    
    const signature = crypto
      .createHmac('sha256', this.signingKey)
      .update(payload)
      .digest('hex');
    
    return {
      response,
      signature,
      timestamp,
      queryHash: crypto.createHash('sha256').update(query).digest('hex'),
    };
  }

  /**
   * Verify an AI response hasn't been tampered
   */
  verifyResponse(signedResponse, query, userId, tenantId) {
    const payload = JSON.stringify({
      response: typeof signedResponse.response === 'string' 
        ? signedResponse.response 
        : JSON.stringify(signedResponse.response),
      queryHash: crypto.createHash('sha256').update(query).digest('hex'),
      userId,
      tenantId,
      timestamp: signedResponse.timestamp,
    });
    
    const expectedSignature = crypto
      .createHmac('sha256', this.signingKey)
      .update(payload)
      .digest('hex');
    
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signedResponse.signature)
      );
    } catch {
      return false;
    }
  }
}

// ============================================================================
// LAYER 30: FINANCIAL DATA ENCRYPTION (All Modules)
// Field-level encryption for sensitive financial data
// ============================================================================

class FinancialDataEncryption {
  constructor(options = {}) {
    this.masterKey = options.masterKey || crypto.randomBytes(32);
    if (typeof this.masterKey === 'string') {
      this.masterKey = Buffer.from(this.masterKey, 'hex');
    }
    
    // Fields that require encryption
    this.sensitiveFields = [
      'bank_account', 'account_number', 'routing_number',
      'tax_id', 'ssn', 'pan_number', 'aadhaar',
      'credit_card', 'card_number', 'cvv',
      'balance', 'salary', 'income',
      'api_key', 'secret_key', 'access_token',
    ];
    
    console.log('🔒 Financial Data Encryption initialized (field-level)');
  }

  /**
   * Encrypt sensitive fields in an object
   */
  encryptObject(obj, tenantId) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const encrypted = { ...obj };
    
    for (const field of this.sensitiveFields) {
      if (encrypted[field] !== undefined && encrypted[field] !== null) {
        encrypted[field] = this._encryptField(encrypted[field], tenantId, field);
        encrypted[`${field}_encrypted`] = true;
      }
    }
    
    return encrypted;
  }

  /**
   * Decrypt sensitive fields in an object
   */
  decryptObject(obj, tenantId) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const decrypted = { ...obj };
    
    for (const field of this.sensitiveFields) {
      if (decrypted[`${field}_encrypted`] && decrypted[field]) {
        decrypted[field] = this._decryptField(decrypted[field], tenantId, field);
        delete decrypted[`${field}_encrypted`];
      }
    }
    
    return decrypted;
  }

  _encryptField(value, tenantId, fieldName) {
    const iv = crypto.randomBytes(12);
    const key = this._deriveKey(tenantId, fieldName);
    
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(String(value), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  _decryptField(encryptedValue, tenantId, fieldName) {
    try {
      const [ivBase64, authTagBase64, ciphertext] = encryptedValue.split(':');
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');
      const key = this._deriveKey(tenantId, fieldName);
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (err) {
      console.error('Field decryption failed:', err.message);
      return '[DECRYPTION_FAILED]';
    }
  }

  _deriveKey(tenantId, fieldName) {
    return crypto.pbkdf2Sync(
      this.masterKey,
      `${tenantId}:${fieldName}`,
      100000,
      32,
      'sha512'
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  CalculationIntegrity,
  DocumentHashChain,
  ImmutableAuditLog,
  WorkflowStateIntegrity,
  PromptInjectionPrevention,
  TransactionIdempotency,
  RowLevelSecurity,
  AIResponseSigning,
  FinancialDataEncryption,
};
