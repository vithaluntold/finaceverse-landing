// ============================================
// ACCUTE ORCHESTRATOR - Core Type Definitions
// AI-Native Workflow Engine for Financial Automation
// ============================================

// ============================================
// WORKFLOW DEFINITION
// ============================================

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: number;
  status: WorkflowStatus;
  tenantId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Workflow structure
  trigger?: TriggerNode;
  triggers?: TriggerNode[];  // Support for multiple triggers
  nodes: WorkflowNode[];
  edges: Edge[];
  
  // Configuration
  settings?: WorkflowSettings;
  variables?: Record<string, Variable>;
  credentials?: string[]; // Reference to Vault secrets
  
  // Metadata
  tags?: string[];
  category?: WorkflowCategory;
  compliance?: ComplianceRequirement[];
}

export type WorkflowStatus = 
  | 'draft' 
  | 'active' 
  | 'paused' 
  | 'inactive' 
  | 'archived' 
  | 'error';

export type WorkflowCategory = 
  | 'invoice_processing'
  | 'bank_reconciliation'
  | 'tax_calculation'
  | 'payroll'
  | 'expense_management'
  | 'revenue_recognition'
  | 'audit_preparation'
  | 'compliance'
  | 'custom';

export interface WorkflowSettings {
  maxExecutionTime?: number; // seconds
  retryPolicy?: RetryPolicy;
  errorHandling?: ErrorHandling;
  parallelism?: number;
  timeout?: number;
  timezone?: string;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelay: number; // ms
  maxDelay: number; // ms
}

export interface ErrorHandling {
  onError: 'stop' | 'continue' | 'retry' | 'fallback';
  fallbackNodeId?: string;
  notifyOnError: boolean;
  notifyChannels: string[];
}

// ============================================
// NODES
// ============================================

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  position: { x: number; y: number };
  config: NodeConfig;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  
  // Execution settings
  timeout?: number;
  retryPolicy?: RetryPolicy;
  condition?: string; // Expression to evaluate
  
  // AI settings
  aiVerification?: AIVerificationConfig;
  
  // Compliance
  auditLevel: AuditLevel;
  dataClassification: DataClassification;
}

export type NodeType = 
  // Triggers
  | 'trigger_webhook'
  | 'trigger_schedule'
  | 'trigger_event'
  | 'trigger_file'
  | 'trigger_email'
  
  // Financial Operations
  | 'invoice_ocr'
  | 'invoice_validate'
  | 'bank_reconcile'
  | 'journal_entry'
  | 'tax_calculate'
  | 'payment_process'
  | 'revenue_recognize'
  | 'expense_categorize'
  
  // AI Nodes
  | 'ai_vamn_verify'
  | 'ai_luca_analyze'
  | 'ai_anomaly_detect'
  | 'ai_document_classify'
  | 'ai_entity_extract'
  | 'ai_summarize'
  | 'ai_translate'
  
  // ERP Connectors
  | 'erp_tally'
  | 'erp_zoho'
  | 'erp_sap'
  | 'erp_quickbooks'
  | 'erp_xero'
  | 'erp_sage'
  | 'erp_odoo'
  
  // Communication
  | 'notify_email'
  | 'notify_slack'
  | 'notify_teams'
  | 'notify_whatsapp'
  | 'notify_sms'
  
  // Control Flow
  | 'control_condition'
  | 'control_switch'
  | 'control_loop'
  | 'control_parallel'
  | 'control_wait'
  | 'control_merge'
  
  // Human in Loop
  | 'human_approval'
  | 'human_review'
  | 'human_input'
  
  // Data Operations
  | 'data_transform'
  | 'data_filter'
  | 'data_aggregate'
  | 'data_split'
  | 'data_merge'
  | 'data_validate'
  
  // Integration
  | 'http_request'
  | 'graphql_query'
  | 'database_query'
  | 'file_read'
  | 'file_write'
  | 'ftp_transfer'
  
  // Legacy/Shorthand Node Types (backward compatibility)
  | 'condition'
  | 'loop'
  | 'merge'
  | 'delay'
  | 'transform'
  | 'filter'
  | 'aggregate'
  | 'set_variable'
  | 'notify'
  | 'gst_return'
  | 'financial_ratio'
  | 'ai_classify'
  | 'ai_extract'
  | 'ai_predict'
  | 'ai_query';

export interface NodeConfig {
  [key: string]: unknown;
}

export interface NodeInput {
  name: string;
  type: DataType;
  required: boolean;
  source?: string; // nodeId.outputName
}

export interface NodeOutput {
  name: string;
  type: DataType;
}

export type DataType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'object'
  | 'array'
  | 'file'
  | 'currency'
  | 'percentage'
  | 'any';

export interface Edge {
  id?: string;
  source: string; // nodeId
  sourceOutput?: string;
  target: string; // nodeId
  targetInput?: string;
  condition?: string;
}

// ============================================
// TRIGGERS
// ============================================

export interface TriggerNode {
  id: string;
  type: TriggerType;
  name: string;
  config: TriggerConfig;
  outputs: NodeOutput[];
  enabled?: boolean;
}

export type TriggerType = 
  | 'webhook'
  | 'schedule'
  | 'event'
  | 'file'
  | 'email'
  | 'manual';

export interface TriggerConfig {
  // Webhook
  webhookPath?: string;
  webhookMethod?: 'GET' | 'POST' | 'PUT';
  webhookAuth?: WebhookAuth;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';  // HTTP method for webhook
  waitForCompletion?: boolean;  // Wait for workflow to complete before responding
  
  // Schedule
  cronExpression?: string;
  cron?: string;  // Alias for cronExpression
  timezone?: string;
  
  // Event
  eventType?: string;
  eventFilter?: Record<string, unknown>;
  filters?: Record<string, unknown>;  // Alias for eventFilter
  
  // File
  filePath?: string;
  filePattern?: string;
  
  // Email
  emailFolder?: string;
  emailFilter?: EmailFilter;
  
  // Additional options
  priority?: 'low' | 'normal' | 'high' | 'critical';
  maxRetries?: number;
}

export interface WebhookAuth {
  type: 'none' | 'basic' | 'bearer' | 'hmac' | 'api_key';
  config: Record<string, string>;
}

export interface EmailFilter {
  from?: string;
  subject?: string;
  hasAttachment?: boolean;
}

// ============================================
// EXECUTION
// ============================================

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowVersion: number;
  tenantId: string;
  status: ExecutionStatus;
  
  // Timing
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // ms
  
  // Trigger info
  triggeredBy: string;
  triggerData: unknown;
  
  // Execution data
  nodeExecutions: NodeExecution[];
  variables: Record<string, unknown>;
  
  // Results
  output?: unknown;
  error?: ExecutionError;
  
  // Audit
  auditTrail: AuditEntry[];
  
  // Checkpoints (for resume)
  checkpoints: Checkpoint[];
}

export type ExecutionStatus = 
  | 'pending'
  | 'running'
  | 'waiting_approval'
  | 'waiting_input'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface NodeExecution {
  id?: string;
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  status: ExecutionStatus;
  
  // Timing
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  retryCount: number;
  attempts?: number;
  
  // Data
  input: unknown;
  output?: unknown;
  error?: ExecutionError;
  
  // AI Verification
  verification?: VerificationResult;
  aiVerification?: AIVerificationResult;
}

// Flexible AI verification result from runtime AI verifier
export interface AIVerificationResult {
  passed: boolean;
  confidence: number;
  reason?: string;
  suggestions?: string[];
  anomalies?: unknown[];
  aiModel: string;
  processingTime: number;
}

export interface ExecutionError {
  code: string;
  message: string;
  stack?: string;
  nodeId?: string;
  recoverable: boolean;
}

export interface Checkpoint {
  id: string;
  nodeId: string;
  createdAt: Date;
  state: unknown;
}

// ============================================
// EXECUTION CONTEXT
// ============================================

export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  tenantId: string;
  variables: Record<string, unknown>;
  credentials: Record<string, unknown>;
  nodeOutputs: Map<string, unknown>;
  startTime: number;
}

// ============================================
// AI VERIFICATION
// ============================================

export type AIVerificationType = 
  | 'vamn_verify'
  | 'luca_analyze'
  | 'anomaly_detect'
  | 'format_validate'
  | 'threshold_check';

export interface AIVerificationConfig {
  enabled: boolean;
  model: 'vamn' | 'gpt4' | 'claude';
  verifyCalculations: boolean;
  verifyCompliance: boolean;
  confidenceThreshold: number; // 0-1
  onLowConfidence: 'approve' | 'reject' | 'human_review';
  
  // Extended verification options
  type?: AIVerificationType;
  strictMode?: boolean;
  rules?: Record<string, unknown>;
  context?: Record<string, unknown>;
  
  // Format validation
  expectedFormat?: Record<string, unknown>;
  financialRules?: Record<string, unknown>;
  
  // Anomaly detection
  requiredFields?: string[];
  nonNegativeFields?: string[];
  expectedRanges?: Record<string, { min: number; max: number }>;
  maxHighAnomalies?: number;
  
  // Threshold checking
  thresholds?: Record<string, { min?: number; max?: number }>;
}

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  model: string;
  timestamp: Date;
  
  // Calculation verification
  calculationsChecked?: number;
  calculationsValid?: number;
  discrepancies?: Discrepancy[];
  
  // Compliance verification
  complianceChecks?: ComplianceCheck[];
  
  // Explanation
  reasoning?: string;
  citations?: Citation[];
}

export interface Discrepancy {
  field: string;
  expected: unknown;
  actual: unknown;
  severity: 'info' | 'warning' | 'error';
  explanation: string;
}

export interface ComplianceCheck {
  regulation: string;
  requirement: string;
  status: 'pass' | 'fail' | 'warning' | 'not_applicable';
  details: string;
}

export interface Citation {
  source: string;
  section?: string;
  page?: number;
  text: string;
}

// ============================================
// AUDIT & COMPLIANCE
// ============================================

export type AuditLevel = 'none' | 'minimal' | 'standard' | 'detailed' | 'forensic';

export type DataClassification = 
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted'
  | 'pii'
  | 'financial';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  action: string;
  actor: string;
  actorType: 'user' | 'system' | 'ai';
  
  // What happened
  nodeId?: string;
  nodeName?: string;
  operation: string;
  
  // Data (hashed for sensitive)
  inputHash?: string;
  outputHash?: string;
  
  // Verification
  verified: boolean;
  verificationMethod?: string;
  
  // Compliance
  dataClassification: DataClassification;
  retentionPeriod: number; // days
  
  // Immutability
  previousHash: string;
  hash: string;
}

export type ComplianceRequirement = 
  | 'SOC2'
  | 'GDPR'
  | 'HIPAA'
  | 'PCI_DSS'
  | 'RBI'
  | 'ASC_606'
  | 'IFRS_15'
  | 'GST_INDIA';

// ============================================
// VARIABLES & CREDENTIALS
// ============================================

export interface Variable {
  name: string;
  type: DataType;
  defaultValue?: unknown;
  description?: string;
  sensitive: boolean;
}

export interface CredentialReference {
  id: string;
  name: string;
  type: CredentialType;
  vaultPath: string;
}

export type CredentialType = 
  | 'api_key'
  | 'oauth2'
  | 'basic_auth'
  | 'database'
  | 'ssh'
  | 'certificate';

// ============================================
// API RESPONSES
// ============================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: APIMeta;
}

export interface APIError {
  code: string;
  message: string;
  details?: unknown;
}

export interface APIMeta {
  requestId: string;
  timestamp: Date;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ============================================
// EVENTS
// ============================================

export interface WorkflowEvent {
  id: string;
  type: WorkflowEventType;
  workflowId: string;
  executionId?: string;
  timestamp: Date;
  data: unknown;
}

export type WorkflowEventType = 
  | 'workflow.created'
  | 'workflow.updated'
  | 'workflow.activated'
  | 'workflow.paused'
  | 'workflow.deleted'
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'execution.cancelled'
  | 'node.started'
  | 'node.completed'
  | 'node.failed'
  | 'approval.requested'
  | 'approval.granted'
  | 'approval.denied';
