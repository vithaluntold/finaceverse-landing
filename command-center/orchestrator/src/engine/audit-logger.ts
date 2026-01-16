// ============================================
// ACCUTE ORCHESTRATOR - Audit Logger
// Comprehensive audit trail for compliance
// ============================================

import pino from 'pino';
import { Pool } from 'pg';

const logger = pino({ name: 'audit-logger' });

export interface AuditLogEntry {
  executionId: string;
  event: string;
  workflowId?: string;
  tenantId?: string;
  nodeId?: string;
  nodeName?: string;
  nodeType?: string;
  duration?: number;
  data?: unknown;
  userId?: string;
  ipAddress?: string;
}

export class AuditLogger {
  private pool: Pool | null = null;
  private buffer: AuditLogEntry[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initializeDatabase();
    this.startFlushInterval();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL
      });

      // Create audit table if not exists
      await this.pool.query(`
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
      `);

      logger.info('Audit log table initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize audit database');
    }
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 5000); // Flush every 5 seconds
  }

  /**
   * Log an audit entry
   */
  async log(entry: AuditLogEntry): Promise<void> {
    this.buffer.push({
      ...entry,
      data: this.sanitizeData(entry.data)
    });

    // Immediate flush for critical events
    if (entry.event.includes('failed') || entry.event.includes('error')) {
      await this.flush();
    }

    // Flush if buffer is large
    if (this.buffer.length >= 100) {
      await this.flush();
    }
  }

  /**
   * Flush buffer to database
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.pool) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      const values = entries.map(e => [
        e.executionId,
        e.event,
        e.workflowId,
        e.tenantId,
        e.nodeId,
        e.nodeName,
        e.nodeType,
        e.duration,
        e.data ? JSON.stringify(e.data) : null,
        e.userId,
        e.ipAddress
      ]);

      const placeholders = values.map((_, i) => {
        const offset = i * 11;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`;
      }).join(', ');

      await this.pool.query(
        `INSERT INTO orchestrator_audit_log 
         (execution_id, event, workflow_id, tenant_id, node_id, node_name, node_type, duration_ms, data, user_id, ip_address)
         VALUES ${placeholders}`,
        values.flat()
      );

      logger.debug({ count: entries.length }, 'Flushed audit entries');
    } catch (error) {
      logger.error({ error, count: entries.length }, 'Failed to flush audit entries');
      // Re-add failed entries
      this.buffer.unshift(...entries);
    }
  }

  /**
   * Query audit log
   */
  async query(options: AuditQueryOptions): Promise<AuditLogEntry[]> {
    if (!this.pool) return [];

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.executionId) {
      conditions.push(`execution_id = $${paramIndex++}`);
      params.push(options.executionId);
    }

    if (options.workflowId) {
      conditions.push(`workflow_id = $${paramIndex++}`);
      params.push(options.workflowId);
    }

    if (options.tenantId) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      params.push(options.tenantId);
    }

    if (options.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(options.startDate);
    }

    if (options.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(options.endDate);
    }

    if (options.event) {
      conditions.push(`event = $${paramIndex++}`);
      params.push(options.event);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    const result = await this.pool.query(
      `SELECT * FROM orchestrator_audit_log 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return (result.rows as Array<Record<string, unknown>>).map((row) => ({
      executionId: row.execution_id as string,
      event: row.event as string,
      workflowId: row.workflow_id as string,
      tenantId: row.tenant_id as string,
      nodeId: row.node_id as string | undefined,
      nodeName: row.node_name as string | undefined,
      nodeType: row.node_type as string | undefined,
      duration: row.duration_ms as number | undefined,
      data: row.data,
      userId: row.user_id as string | undefined,
      ipAddress: row.ip_address as string | undefined
    }));
  }

  /**
   * Sanitize sensitive data before logging
   */
  private sanitizeData(data: unknown): unknown {
    if (!data || typeof data !== 'object') return data;

    const sensitiveKeys = [
      'password', 'secret', 'token', 'apiKey', 'api_key',
      'authorization', 'credit_card', 'creditCard', 'ssn',
      'pan', 'cvv', 'pin'
    ];

    const sanitize = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
            result[key] = '***REDACTED***';
          } else {
            result[key] = sanitize(value);
          }
        }
        return result;
      }

      return obj;
    };

    return sanitize(data);
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
    if (this.pool) {
      await this.pool.end();
    }
  }
}

interface AuditQueryOptions {
  executionId?: string;
  workflowId?: string;
  tenantId?: string;
  startDate?: Date;
  endDate?: Date;
  event?: string;
  limit?: number;
  offset?: number;
}
