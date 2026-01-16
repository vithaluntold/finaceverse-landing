// ============================================
// ACCUTE ORCHESTRATOR - Workflow Repository
// PostgreSQL-based workflow storage
// ============================================

import pino from 'pino';
import { Pool, PoolClient } from 'pg';
import { Workflow, WorkflowExecution, TriggerNode } from '../types/workflow';

const logger = pino({ name: 'repository' });

export class WorkflowRepository {
  private pool: Pool;

  constructor(databaseUrl?: string) {
    this.pool = new Pool({
      connectionString: databaseUrl || process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
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

        -- Workflow versions table (for version history)
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

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_approvals_execution ON orchestrator_pending_approvals(execution_id);
        CREATE INDEX IF NOT EXISTS idx_approvals_status ON orchestrator_pending_approvals(status);
      `);

      logger.info('Database schema initialized');
    } finally {
      client.release();
    }
  }

  /**
   * Create a workflow
   */
  async createWorkflow(workflow: Workflow): Promise<void> {
    await this.pool.query(
      `INSERT INTO orchestrator_workflows 
       (id, tenant_id, name, description, version, status, nodes, edges, triggers, variables, credentials, settings, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        workflow.id,
        workflow.tenantId,
        workflow.name,
        workflow.description,
        workflow.version,
        workflow.status,
        JSON.stringify(workflow.nodes),
        JSON.stringify(workflow.edges),
        workflow.triggers ? JSON.stringify(workflow.triggers) : null,
        workflow.variables ? JSON.stringify(workflow.variables) : null,
        workflow.credentials,
        workflow.settings ? JSON.stringify(workflow.settings) : null,
        workflow.createdBy
      ]
    );
  }

  /**
   * Get a workflow by ID
   */
  async getWorkflow(id: string): Promise<Workflow | null> {
    const result = await this.pool.query(
      'SELECT * FROM orchestrator_workflows WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToWorkflow(result.rows[0]);
  }

  /**
   * Update a workflow
   */
  async updateWorkflow(workflow: Workflow): Promise<void> {
    // Save version history
    await this.saveWorkflowVersion(workflow);

    await this.pool.query(
      `UPDATE orchestrator_workflows 
       SET name = $2, description = $3, version = $4, status = $5, 
           nodes = $6, edges = $7, triggers = $8, variables = $9, 
           credentials = $10, settings = $11, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        workflow.id,
        workflow.name,
        workflow.description,
        workflow.version,
        workflow.status,
        JSON.stringify(workflow.nodes),
        JSON.stringify(workflow.edges),
        workflow.triggers ? JSON.stringify(workflow.triggers) : null,
        workflow.variables ? JSON.stringify(workflow.variables) : null,
        workflow.credentials,
        workflow.settings ? JSON.stringify(workflow.settings) : null
      ]
    );
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    await this.pool.query('DELETE FROM orchestrator_workflows WHERE id = $1', [id]);
  }

  /**
   * List workflows
   */
  async listWorkflows(options: ListOptions): Promise<PaginatedResult<Workflow>> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (options.tenantId) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      params.push(options.tenantId);
    }

    if (options.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(options.status);
    }

    if (options.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${options.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit || 20;
    const offset = ((options.page || 1) - 1) * limit;

    // Get total count
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM orchestrator_workflows ${whereClause}`,
      params
    );
    const total = parseInt((countResult.rows[0] as { count: string }).count);

    // Get data
    const result = await this.pool.query(
      `SELECT * FROM orchestrator_workflows 
       ${whereClause}
       ORDER BY updated_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return {
      data: result.rows.map(this.mapRowToWorkflow),
      total,
      page: options.page || 1,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Save workflow version
   */
  private async saveWorkflowVersion(workflow: Workflow): Promise<void> {
    await this.pool.query(
      `INSERT INTO orchestrator_workflow_versions (workflow_id, version, snapshot, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (workflow_id, version) DO NOTHING`,
      [
        workflow.id,
        workflow.version,
        JSON.stringify(workflow),
        workflow.createdBy
      ]
    );
  }

  /**
   * Get workflow version history
   */
  async getWorkflowVersions(workflowId: string): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT version, created_at, created_by, change_description 
       FROM orchestrator_workflow_versions 
       WHERE workflow_id = $1 
       ORDER BY version DESC`,
      [workflowId]
    );
    return result.rows;
  }

  /**
   * Restore workflow to specific version
   */
  async restoreWorkflowVersion(workflowId: string, version: number): Promise<Workflow | null> {
    const result = await this.pool.query(
      'SELECT snapshot FROM orchestrator_workflow_versions WHERE workflow_id = $1 AND version = $2',
      [workflowId, version]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const snapshot = (result.rows[0] as { snapshot: Workflow }).snapshot;
    snapshot.version = await this.getNextVersion(workflowId);
    await this.updateWorkflow(snapshot);
    
    return snapshot;
  }

  private async getNextVersion(workflowId: string): Promise<number> {
    const result = await this.pool.query(
      'SELECT MAX(version) as max_version FROM orchestrator_workflows WHERE id = $1',
      [workflowId]
    );
    return ((result.rows[0] as { max_version: number | null }).max_version || 0) + 1;
  }

  /**
   * Save execution
   */
  async saveExecution(execution: WorkflowExecution): Promise<void> {
    await this.pool.query(
      `INSERT INTO orchestrator_executions 
       (id, workflow_id, workflow_version, tenant_id, status, started_at, completed_at, 
        duration_ms, triggered_by, trigger_data, node_executions, variables, output, error, checkpoints)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         completed_at = EXCLUDED.completed_at,
         duration_ms = EXCLUDED.duration_ms,
         node_executions = EXCLUDED.node_executions,
         output = EXCLUDED.output,
         error = EXCLUDED.error,
         checkpoints = EXCLUDED.checkpoints`,
      [
        execution.id,
        execution.workflowId,
        execution.workflowVersion,
        execution.tenantId,
        execution.status,
        execution.startedAt,
        execution.completedAt,
        execution.duration,
        execution.triggeredBy,
        execution.triggerData ? JSON.stringify(execution.triggerData) : null,
        JSON.stringify(execution.nodeExecutions),
        execution.variables ? JSON.stringify(execution.variables) : null,
        execution.output ? JSON.stringify(execution.output) : null,
        execution.error ? JSON.stringify(execution.error) : null,
        execution.checkpoints ? JSON.stringify(execution.checkpoints) : null
      ]
    );
  }

  /**
   * Get execution by ID
   */
  async getExecution(id: string): Promise<WorkflowExecution | null> {
    const result = await this.pool.query(
      'SELECT * FROM orchestrator_executions WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToExecution(result.rows[0]);
  }

  /**
   * List executions
   */
  async listExecutions(options: ExecutionListOptions): Promise<PaginatedResult<WorkflowExecution>> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (options.workflowId) {
      conditions.push(`workflow_id = $${paramIndex++}`);
      params.push(options.workflowId);
    }

    if (options.tenantId) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      params.push(options.tenantId);
    }

    if (options.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(options.status);
    }

    if (options.startDate) {
      conditions.push(`started_at >= $${paramIndex++}`);
      params.push(options.startDate);
    }

    if (options.endDate) {
      conditions.push(`started_at <= $${paramIndex++}`);
      params.push(options.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit || 20;
    const offset = ((options.page || 1) - 1) * limit;

    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM orchestrator_executions ${whereClause}`,
      params
    );
    const total = parseInt((countResult.rows[0] as { count: string }).count);

    const result = await this.pool.query(
      `SELECT * FROM orchestrator_executions 
       ${whereClause}
       ORDER BY started_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return {
      data: result.rows.map(this.mapRowToExecution),
      total,
      page: options.page || 1,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Query audit log
   */
  async queryAuditLog(options: AuditQueryOptions): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (options.tenantId) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      params.push(options.tenantId);
    }

    if (options.workflowId) {
      conditions.push(`workflow_id = $${paramIndex++}`);
      params.push(options.workflowId);
    }

    if (options.executionId) {
      conditions.push(`execution_id = $${paramIndex++}`);
      params.push(options.executionId);
    }

    if (options.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(options.startDate);
    }

    if (options.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(options.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit || 100;

    const result = await this.pool.query(
      `SELECT * FROM orchestrator_audit_log 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${limit}`,
      params
    );

    return result.rows;
  }

  /**
   * Create pending approval
   */
  async createPendingApproval(approval: PendingApproval): Promise<void> {
    await this.pool.query(
      `INSERT INTO orchestrator_pending_approvals 
       (id, execution_id, node_id, approvers, required_count, expires_at, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        approval.id,
        approval.executionId,
        approval.nodeId,
        approval.approvers,
        approval.requiredCount,
        approval.expiresAt,
        approval.data ? JSON.stringify(approval.data) : null
      ]
    );
  }

  /**
   * Get pending approval
   */
  async getPendingApproval(id: string): Promise<PendingApproval | null> {
    const result = await this.pool.query(
      'SELECT * FROM orchestrator_pending_approvals WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as PendingApproval;
  }

  /**
   * Add approval to pending
   */
  async addApproval(approvalId: string, approver: string, comments?: string): Promise<PendingApproval | null> {
    const approval = await this.getPendingApproval(approvalId);
    if (!approval) return null;

    const currentApprovals = approval.currentApprovals || [];
    currentApprovals.push({ approver, comments, approvedAt: new Date() });

    const newStatus = currentApprovals.length >= approval.requiredCount ? 'approved' : 'pending';

    await this.pool.query(
      `UPDATE orchestrator_pending_approvals 
       SET current_approvals = $2, status = $3 
       WHERE id = $1`,
      [approvalId, JSON.stringify(currentApprovals), newStatus]
    );

    return { ...approval, currentApprovals, status: newStatus };
  }

  private mapRowToWorkflow(row: any): Workflow {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      version: row.version,
      status: row.status,
      nodes: row.nodes,
      edges: row.edges,
      triggers: row.triggers,
      variables: row.variables,
      credentials: row.credentials || [],
      settings: row.settings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    };
  }

  private mapRowToExecution(row: any): WorkflowExecution {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      workflowVersion: row.workflow_version,
      tenantId: row.tenant_id,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      duration: row.duration_ms,
      triggeredBy: row.triggered_by,
      triggerData: row.trigger_data,
      nodeExecutions: row.node_executions,
      variables: row.variables,
      output: row.output,
      error: row.error,
      checkpoints: row.checkpoints,
      auditTrail: []
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Types
interface ListOptions {
  tenantId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface ExecutionListOptions extends ListOptions {
  workflowId?: string;
  startDate?: Date;
  endDate?: Date;
}

interface AuditQueryOptions {
  tenantId?: string;
  workflowId?: string;
  executionId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PendingApproval {
  id: string;
  executionId: string;
  nodeId: string;
  approvers: string[];
  requiredCount: number;
  currentApprovals: Array<{ approver: string; comments?: string; approvedAt: Date }>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  expiresAt?: Date;
  data?: unknown;
}
