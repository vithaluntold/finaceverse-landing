-- ============================================
-- FinACEverse Command Center - Database Initialization
-- Phase 3: Orchestrator & Unleash Databases
-- ============================================

-- Create databases for Phase 3 services
CREATE DATABASE IF NOT EXISTS orchestrator;
CREATE DATABASE IF NOT EXISTS unleash;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE orchestrator TO finaceverse;
GRANT ALL PRIVILEGES ON DATABASE unleash TO finaceverse;

-- Connect to orchestrator database and create schema
\c orchestrator

-- Workflows table
CREATE TABLE IF NOT EXISTS orchestrator_workflows (
  id VARCHAR(255) PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'draft',
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  triggers JSONB,
  variables JSONB,
  credentials TEXT[],
  settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflows_tenant ON orchestrator_workflows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON orchestrator_workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_name ON orchestrator_workflows(name);

-- Executions table
CREATE TABLE IF NOT EXISTS orchestrator_executions (
  id VARCHAR(255) PRIMARY KEY,
  workflow_id VARCHAR(255) NOT NULL REFERENCES orchestrator_workflows(id) ON DELETE CASCADE,
  workflow_version INTEGER NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  triggered_by VARCHAR(255),
  trigger_data JSONB,
  node_executions JSONB,
  variables JSONB,
  output JSONB,
  error JSONB,
  checkpoints JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_executions_workflow ON orchestrator_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_tenant ON orchestrator_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON orchestrator_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_started ON orchestrator_executions(started_at);

-- Audit log table
CREATE TABLE IF NOT EXISTS orchestrator_audit_log (
  id SERIAL PRIMARY KEY,
  execution_id VARCHAR(255) NOT NULL,
  event VARCHAR(100) NOT NULL,
  workflow_id VARCHAR(255),
  tenant_id VARCHAR(255),
  node_id VARCHAR(255),
  node_name VARCHAR(255),
  node_type VARCHAR(100),
  duration_ms INTEGER,
  data JSONB,
  user_id VARCHAR(255),
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_execution ON orchestrator_audit_log(execution_id);
CREATE INDEX IF NOT EXISTS idx_audit_workflow ON orchestrator_audit_log(workflow_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON orchestrator_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON orchestrator_audit_log(created_at);

-- Workflow versions table
CREATE TABLE IF NOT EXISTS orchestrator_workflow_versions (
  id SERIAL PRIMARY KEY,
  workflow_id VARCHAR(255) NOT NULL REFERENCES orchestrator_workflows(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  change_description TEXT,
  UNIQUE(workflow_id, version)
);

-- Pending approvals table
CREATE TABLE IF NOT EXISTS orchestrator_pending_approvals (
  id VARCHAR(255) PRIMARY KEY,
  execution_id VARCHAR(255) NOT NULL REFERENCES orchestrator_executions(id) ON DELETE CASCADE,
  node_id VARCHAR(255) NOT NULL,
  approvers TEXT[] NOT NULL,
  required_count INTEGER DEFAULT 1,
  current_approvals JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approvals_execution ON orchestrator_pending_approvals(execution_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON orchestrator_pending_approvals(status);

-- ============================================
-- Done
-- ============================================
