// ============================================
// INFRASTRUCTURE CONTROL - Module 12
// Backup, Disaster Recovery, Maintenance Windows
// ============================================

import express, { Request, Response, NextFunction, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pg = require('pg');
import { z } from 'zod';

const { Pool } = pg;
type PoolType = InstanceType<typeof Pool>;

// Simple logger
const logger = {
  info: (obj: object | string, msg?: string) => console.log(JSON.stringify({ level: 'info', ...( typeof obj === 'string' ? { msg: obj } : { ...obj, msg }) })),
  warn: (obj: object | string, msg?: string) => console.log(JSON.stringify({ level: 'warn', ...(typeof obj === 'string' ? { msg: obj } : { ...obj, msg }) })),
  error: (obj: object | string, msg?: string) => console.log(JSON.stringify({ level: 'error', ...(typeof obj === 'string' ? { msg: obj } : { ...obj, msg }) })),
};

// ============================================
// TYPES
// ============================================

interface AuthenticatedRequest extends Request {
  userId?: string;
  username?: string;
  role?: 'superadmin' | 'admin' | 'operator' | 'viewer';
  tenantId?: string;
  isSuperAdmin?: boolean;
}

type BackupStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
type BackupType = 'full' | 'incremental' | 'differential';
type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

interface Backup {
  id: string;
  tenantId: string | null;
  type: BackupType;
  status: BackupStatus;
  sizeBytes: number;
  location: string;
  retentionDays: number;
  startedAt: Date;
  completedAt: Date | null;
  expiresAt: Date;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
}

interface MaintenanceWindow {
  id: string;
  tenantId: string | null;
  title: string;
  description: string;
  status: MaintenanceStatus;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart: Date | null;
  actualEnd: Date | null;
  affectedServices: string[];
  notificationSent: boolean;
  createdBy: string;
  createdAt: Date;
}

interface ScalingRule {
  id: string;
  tenantId: string | null;
  name: string;
  resourceType: string;
  metricName: string;
  threshold: number;
  scaleDirection: 'up' | 'down';
  scaleAmount: number;
  cooldownSeconds: number;
  isEnabled: boolean;
  lastTriggeredAt: Date | null;
  createdBy: string;
  createdAt: Date;
}

interface CostRecord {
  id: string;
  tenantId: string;
  resourceType: string;
  resourceId: string;
  usageAmount: number;
  usageUnit: string;
  costAmount: number;
  costCurrency: string;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateBackupSchema = z.object({
  type: z.enum(['full', 'incremental', 'differential']).default('full'),
  retentionDays: z.number().min(1).max(365).default(30),
  metadata: z.record(z.unknown()).default({}),
  isGlobal: z.boolean().default(false),
});

const RestoreBackupSchema = z.object({
  targetTimestamp: z.string().datetime().optional(),
  targetTenantId: z.string().uuid().optional(),
});

const CreateMaintenanceSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  affectedServices: z.array(z.string()).default(['all']),
  isGlobal: z.boolean().default(false),
});

const CreateScalingRuleSchema = z.object({
  name: z.string().min(1).max(100),
  resourceType: z.enum(['compute', 'memory', 'storage', 'database', 'cache']),
  metricName: z.string().min(1),
  threshold: z.number(),
  scaleDirection: z.enum(['up', 'down']),
  scaleAmount: z.number().min(1),
  cooldownSeconds: z.number().min(60).default(300),
  isGlobal: z.boolean().default(false),
});

const RecordCostSchema = z.object({
  resourceType: z.string(),
  resourceId: z.string(),
  usageAmount: z.number(),
  usageUnit: z.string(),
  costAmount: z.number(),
  costCurrency: z.string().default('USD'),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});

// ============================================
// BACKUP SERVICE
// ============================================

class BackupService {
  private pool: PoolType;

  constructor(pool: PoolType) {
    this.pool = pool;
    this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    await this.pool.query(`
      CREATE SCHEMA IF NOT EXISTS infrastructure;
      
      CREATE TABLE IF NOT EXISTS infrastructure.backups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        type VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        size_bytes BIGINT DEFAULT 0,
        location TEXT,
        retention_days INTEGER DEFAULT 30,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_by UUID NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS infrastructure.restore_points (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        backup_id UUID NOT NULL REFERENCES infrastructure.backups(id),
        tenant_id UUID,
        timestamp TIMESTAMPTZ NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_backups_tenant ON infrastructure.backups(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_backups_status ON infrastructure.backups(status);
      CREATE INDEX IF NOT EXISTS idx_backups_expires ON infrastructure.backups(expires_at);
    `);
    logger.info('Backup tables initialized');
  }

  async create(tenantId: string | null, createdBy: string, data: z.infer<typeof CreateBackupSchema>): Promise<Backup> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.retentionDays);

    const result = await this.pool.query(
      `INSERT INTO infrastructure.backups 
       (tenant_id, type, status, retention_days, started_at, expires_at, metadata, created_by)
       VALUES ($1, $2, 'in_progress', $3, NOW(), $4, $5, $6)
       RETURNING *`,
      [
        data.isGlobal ? null : tenantId,
        data.type,
        data.retentionDays,
        expiresAt,
        JSON.stringify(data.metadata),
        createdBy,
      ]
    );

    const backup = this.mapRow(result.rows[0]);

    // Simulate backup process (in production, this would be async)
    this.processBackup(backup.id);

    return backup;
  }

  private async processBackup(backupId: string): Promise<void> {
    // Simulate backup processing
    setTimeout(async () => {
      const sizeBytes = Math.floor(Math.random() * 1000000000) + 100000000; // 100MB - 1GB
      const location = `s3://finaceverse-backups/${backupId}.tar.gz`;

      await this.pool.query(
        `UPDATE infrastructure.backups 
         SET status = 'completed', size_bytes = $1, location = $2, completed_at = NOW()
         WHERE id = $3`,
        [sizeBytes, location, backupId]
      );
      logger.info({ backupId, sizeBytes }, 'Backup completed');
    }, 5000);
  }

  async list(tenantId: string | null, status?: BackupStatus): Promise<Backup[]> {
    let query = `SELECT * FROM infrastructure.backups WHERE (tenant_id = $1 OR tenant_id IS NULL)`;
    const params: unknown[] = [tenantId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async get(id: string, tenantId: string | null): Promise<Backup | null> {
    const result = await this.pool.query(
      `SELECT * FROM infrastructure.backups 
       WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)`,
      [id, tenantId]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async restore(id: string, tenantId: string, data: z.infer<typeof RestoreBackupSchema>): Promise<{ success: boolean; message: string }> {
    const backup = await this.get(id, tenantId);
    if (!backup) {
      return { success: false, message: 'Backup not found' };
    }

    if (backup.status !== 'completed') {
      return { success: false, message: 'Backup is not in completed state' };
    }

    // Log restore request
    logger.info({ backupId: id, tenantId, targetTimestamp: data.targetTimestamp }, 'Restore initiated');

    // In production, this would trigger actual restore process
    return { 
      success: true, 
      message: `Restore from backup ${id} initiated. Target: ${data.targetTimestamp || 'latest'}` 
    };
  }

  async deleteExpired(): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM infrastructure.backups WHERE expires_at < NOW() RETURNING id`
    );
    const count = result.rowCount ?? 0;
    if (count > 0) {
      logger.info({ count }, 'Expired backups deleted');
    }
    return count;
  }

  async getStats(tenantId: string | null): Promise<Record<string, unknown>> {
    const result = await this.pool.query(
      `SELECT 
         COUNT(*) as total_backups,
         SUM(size_bytes) as total_size,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'failed') as failed,
         MAX(completed_at) as last_backup_at
       FROM infrastructure.backups
       WHERE tenant_id = $1 OR tenant_id IS NULL`,
      [tenantId]
    );
    return result.rows[0];
  }

  private mapRow(row: Record<string, unknown>): Backup {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string | null,
      type: row.type as BackupType,
      status: row.status as BackupStatus,
      sizeBytes: Number(row.size_bytes),
      location: row.location as string,
      retentionDays: row.retention_days as number,
      startedAt: row.started_at as Date,
      completedAt: row.completed_at as Date | null,
      expiresAt: row.expires_at as Date,
      metadata: row.metadata as Record<string, unknown>,
      createdBy: row.created_by as string,
      createdAt: row.created_at as Date,
    };
  }
}

// ============================================
// MAINTENANCE SERVICE
// ============================================

class MaintenanceService {
  private pool: PoolType;

  constructor(pool: PoolType) {
    this.pool = pool;
    this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS infrastructure.maintenance_windows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'scheduled',
        scheduled_start TIMESTAMPTZ NOT NULL,
        scheduled_end TIMESTAMPTZ NOT NULL,
        actual_start TIMESTAMPTZ,
        actual_end TIMESTAMPTZ,
        affected_services JSONB DEFAULT '["all"]',
        notification_sent BOOLEAN DEFAULT false,
        created_by UUID NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_maintenance_tenant ON infrastructure.maintenance_windows(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_maintenance_status ON infrastructure.maintenance_windows(status);
      CREATE INDEX IF NOT EXISTS idx_maintenance_scheduled ON infrastructure.maintenance_windows(scheduled_start);
    `);
    logger.info('Maintenance tables initialized');
  }

  async create(tenantId: string | null, createdBy: string, data: z.infer<typeof CreateMaintenanceSchema>): Promise<MaintenanceWindow> {
    const result = await this.pool.query(
      `INSERT INTO infrastructure.maintenance_windows 
       (tenant_id, title, description, scheduled_start, scheduled_end, affected_services, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.isGlobal ? null : tenantId,
        data.title,
        data.description,
        data.scheduledStart,
        data.scheduledEnd,
        JSON.stringify(data.affectedServices),
        createdBy,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async list(tenantId: string | null, status?: MaintenanceStatus): Promise<MaintenanceWindow[]> {
    let query = `SELECT * FROM infrastructure.maintenance_windows WHERE (tenant_id = $1 OR tenant_id IS NULL)`;
    const params: unknown[] = [tenantId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY scheduled_start DESC`;

    const result = await this.pool.query(query, params);
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async get(id: string, tenantId: string | null): Promise<MaintenanceWindow | null> {
    const result = await this.pool.query(
      `SELECT * FROM infrastructure.maintenance_windows 
       WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)`,
      [id, tenantId]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async start(id: string, tenantId: string | null): Promise<MaintenanceWindow | null> {
    const result = await this.pool.query(
      `UPDATE infrastructure.maintenance_windows 
       SET status = 'in_progress', actual_start = NOW()
       WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL) AND status = 'scheduled'
       RETURNING *`,
      [id, tenantId]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async complete(id: string, tenantId: string | null): Promise<MaintenanceWindow | null> {
    const result = await this.pool.query(
      `UPDATE infrastructure.maintenance_windows 
       SET status = 'completed', actual_end = NOW()
       WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL) AND status = 'in_progress'
       RETURNING *`,
      [id, tenantId]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async cancel(id: string, tenantId: string | null): Promise<MaintenanceWindow | null> {
    const result = await this.pool.query(
      `UPDATE infrastructure.maintenance_windows 
       SET status = 'cancelled'
       WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL) AND status = 'scheduled'
       RETURNING *`,
      [id, tenantId]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async getUpcoming(tenantId: string | null, hours = 24): Promise<MaintenanceWindow[]> {
    const result = await this.pool.query(
      `SELECT * FROM infrastructure.maintenance_windows 
       WHERE (tenant_id = $1 OR tenant_id IS NULL)
         AND status = 'scheduled'
         AND scheduled_start <= NOW() + INTERVAL '${hours} hours'
       ORDER BY scheduled_start ASC`,
      [tenantId]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  private mapRow(row: Record<string, unknown>): MaintenanceWindow {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string | null,
      title: row.title as string,
      description: row.description as string,
      status: row.status as MaintenanceStatus,
      scheduledStart: row.scheduled_start as Date,
      scheduledEnd: row.scheduled_end as Date,
      actualStart: row.actual_start as Date | null,
      actualEnd: row.actual_end as Date | null,
      affectedServices: row.affected_services as string[],
      notificationSent: row.notification_sent as boolean,
      createdBy: row.created_by as string,
      createdAt: row.created_at as Date,
    };
  }
}

// ============================================
// SCALING SERVICE
// ============================================

class ScalingService {
  private pool: PoolType;

  constructor(pool: PoolType) {
    this.pool = pool;
    this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS infrastructure.scaling_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        name VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        metric_name VARCHAR(100) NOT NULL,
        threshold NUMERIC NOT NULL,
        scale_direction VARCHAR(10) NOT NULL,
        scale_amount INTEGER NOT NULL,
        cooldown_seconds INTEGER DEFAULT 300,
        is_enabled BOOLEAN DEFAULT true,
        last_triggered_at TIMESTAMPTZ,
        created_by UUID NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS infrastructure.scaling_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_id UUID NOT NULL REFERENCES infrastructure.scaling_rules(id),
        tenant_id UUID,
        metric_value NUMERIC NOT NULL,
        scale_action VARCHAR(10) NOT NULL,
        previous_capacity INTEGER,
        new_capacity INTEGER,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_scaling_rules_tenant ON infrastructure.scaling_rules(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_scaling_events_rule ON infrastructure.scaling_events(rule_id);
    `);
    logger.info('Scaling tables initialized');
  }

  async createRule(tenantId: string | null, createdBy: string, data: z.infer<typeof CreateScalingRuleSchema>): Promise<ScalingRule> {
    const result = await this.pool.query(
      `INSERT INTO infrastructure.scaling_rules 
       (tenant_id, name, resource_type, metric_name, threshold, scale_direction, scale_amount, cooldown_seconds, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.isGlobal ? null : tenantId,
        data.name,
        data.resourceType,
        data.metricName,
        data.threshold,
        data.scaleDirection,
        data.scaleAmount,
        data.cooldownSeconds,
        createdBy,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async listRules(tenantId: string | null): Promise<ScalingRule[]> {
    const result = await this.pool.query(
      `SELECT * FROM infrastructure.scaling_rules 
       WHERE tenant_id = $1 OR tenant_id IS NULL
       ORDER BY created_at DESC`,
      [tenantId]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async toggleRule(id: string, tenantId: string | null, isEnabled: boolean): Promise<ScalingRule | null> {
    const result = await this.pool.query(
      `UPDATE infrastructure.scaling_rules 
       SET is_enabled = $1
       WHERE id = $2 AND (tenant_id = $3 OR tenant_id IS NULL)
       RETURNING *`,
      [isEnabled, id, tenantId]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async deleteRule(id: string, tenantId: string | null): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM infrastructure.scaling_rules 
       WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)`,
      [id, tenantId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getScalingEvents(tenantId: string | null, ruleId?: string): Promise<Array<Record<string, unknown>>> {
    let query = `SELECT e.*, r.name as rule_name FROM infrastructure.scaling_events e
                 JOIN infrastructure.scaling_rules r ON e.rule_id = r.id
                 WHERE (e.tenant_id = $1 OR e.tenant_id IS NULL)`;
    const params: unknown[] = [tenantId];

    if (ruleId) {
      query += ` AND e.rule_id = $2`;
      params.push(ruleId);
    }

    query += ` ORDER BY e.created_at DESC LIMIT 100`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  private mapRow(row: Record<string, unknown>): ScalingRule {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string | null,
      name: row.name as string,
      resourceType: row.resource_type as string,
      metricName: row.metric_name as string,
      threshold: Number(row.threshold),
      scaleDirection: row.scale_direction as 'up' | 'down',
      scaleAmount: row.scale_amount as number,
      cooldownSeconds: row.cooldown_seconds as number,
      isEnabled: row.is_enabled as boolean,
      lastTriggeredAt: row.last_triggered_at as Date | null,
      createdBy: row.created_by as string,
      createdAt: row.created_at as Date,
    };
  }
}

// ============================================
// COST ATTRIBUTION SERVICE
// ============================================

class CostService {
  private pool: PoolType;

  constructor(pool: PoolType) {
    this.pool = pool;
    this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS infrastructure.cost_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(100) NOT NULL,
        usage_amount NUMERIC NOT NULL,
        usage_unit VARCHAR(20) NOT NULL,
        cost_amount NUMERIC NOT NULL,
        cost_currency VARCHAR(3) DEFAULT 'USD',
        period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_cost_tenant ON infrastructure.cost_records(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_cost_period ON infrastructure.cost_records(period_start, period_end);
      CREATE INDEX IF NOT EXISTS idx_cost_resource ON infrastructure.cost_records(resource_type);
    `);
    logger.info('Cost tables initialized');
  }

  async record(tenantId: string, data: z.infer<typeof RecordCostSchema>): Promise<CostRecord> {
    const result = await this.pool.query(
      `INSERT INTO infrastructure.cost_records 
       (tenant_id, resource_type, resource_id, usage_amount, usage_unit, cost_amount, cost_currency, period_start, period_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        tenantId,
        data.resourceType,
        data.resourceId,
        data.usageAmount,
        data.usageUnit,
        data.costAmount,
        data.costCurrency,
        data.periodStart,
        data.periodEnd,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async getTenantCosts(tenantId: string, startDate: Date, endDate: Date): Promise<CostRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM infrastructure.cost_records 
       WHERE tenant_id = $1 AND period_start >= $2 AND period_end <= $3
       ORDER BY period_start DESC`,
      [tenantId, startDate, endDate]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async getCostSummary(tenantId: string, startDate: Date, endDate: Date): Promise<Record<string, unknown>> {
    const result = await this.pool.query(
      `SELECT 
         resource_type,
         SUM(cost_amount) as total_cost,
         SUM(usage_amount) as total_usage,
         cost_currency
       FROM infrastructure.cost_records
       WHERE tenant_id = $1 AND period_start >= $2 AND period_end <= $3
       GROUP BY resource_type, cost_currency
       ORDER BY total_cost DESC`,
      [tenantId, startDate, endDate]
    );
    return {
      tenantId,
      period: { start: startDate, end: endDate },
      byResource: result.rows,
      totalCost: result.rows.reduce((sum: number, r: Record<string, unknown>) => sum + Number(r.total_cost), 0),
    };
  }

  async getAllTenantsCostSummary(startDate: Date, endDate: Date): Promise<Array<Record<string, unknown>>> {
    const result = await this.pool.query(
      `SELECT 
         tenant_id,
         SUM(cost_amount) as total_cost,
         cost_currency
       FROM infrastructure.cost_records
       WHERE period_start >= $1 AND period_end <= $2
       GROUP BY tenant_id, cost_currency
       ORDER BY total_cost DESC`,
      [startDate, endDate]
    );
    return result.rows;
  }

  private mapRow(row: Record<string, unknown>): CostRecord {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      resourceType: row.resource_type as string,
      resourceId: row.resource_id as string,
      usageAmount: Number(row.usage_amount),
      usageUnit: row.usage_unit as string,
      costAmount: Number(row.cost_amount),
      costCurrency: row.cost_currency as string,
      periodStart: row.period_start as Date,
      periodEnd: row.period_end as Date,
      createdAt: row.created_at as Date,
    };
  }
}

// ============================================
// INFRASTRUCTURE CONTROL SERVER
// ============================================

export class InfrastructureControlServer {
  private app: express.Application;
  private pool: PoolType;
  private backupService: BackupService;
  private maintenanceService: MaintenanceService;
  private scalingService: ScalingService;
  private costService: CostService;

  constructor() {
    this.app = express();
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });

    this.backupService = new BackupService(this.pool);
    this.maintenanceService = new MaintenanceService(this.pool);
    this.scalingService = new ScalingService(this.pool);
    this.costService = new CostService(this.pool);

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));

    this.app.get('/health', (_req, res) => {
      res.json({ status: 'healthy', service: 'infrastructure-control', timestamp: new Date().toISOString() });
    });
  }

  private setupRoutes(): void {
    const router = Router();

    // ============================================
    // BACKUP ROUTES
    // ============================================

    router.post('/backups', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = CreateBackupSchema.parse(req.body);
        const tenantId = data.isGlobal && req.isSuperAdmin ? null : req.tenantId!;
        const backup = await this.backupService.create(tenantId, req.userId!, data);

        logger.info({ backupId: backup.id, userId: req.userId }, 'Backup initiated');
        res.status(201).json(backup);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
          logger.error({ error }, 'Failed to create backup');
          res.status(500).json({ error: 'Failed to create backup' });
        }
      }
    });

    router.get('/backups', this.requireAuth('operator'), async (req: AuthenticatedRequest, res) => {
      try {
        const status = req.query.status as BackupStatus | undefined;
        const backups = await this.backupService.list(req.tenantId!, status);
        res.json({ backups });
      } catch (error) {
        res.status(500).json({ error: 'Failed to list backups' });
      }
    });

    router.get('/backups/stats', this.requireAuth('operator'), async (req: AuthenticatedRequest, res) => {
      try {
        const stats = await this.backupService.getStats(req.tenantId!);
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get backup stats' });
      }
    });

    router.get('/backups/:id', this.requireAuth('operator'), async (req: AuthenticatedRequest, res) => {
      try {
        const backup = await this.backupService.get(req.params.id, req.tenantId!);
        if (!backup) {
          res.status(404).json({ error: 'Backup not found' });
          return;
        }
        res.json(backup);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get backup' });
      }
    });

    router.post('/backups/:id/restore', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = RestoreBackupSchema.parse(req.body);
        const result = await this.backupService.restore(req.params.id, req.tenantId!, data);

        if (result.success) {
          logger.info({ backupId: req.params.id, userId: req.userId }, 'Restore initiated');
        }
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to restore backup' });
      }
    });

    // ============================================
    // MAINTENANCE ROUTES
    // ============================================

    router.post('/maintenance', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = CreateMaintenanceSchema.parse(req.body);
        const tenantId = data.isGlobal && req.isSuperAdmin ? null : req.tenantId!;
        const window = await this.maintenanceService.create(tenantId, req.userId!, data);

        logger.info({ maintenanceId: window.id, userId: req.userId }, 'Maintenance scheduled');
        res.status(201).json(window);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
          res.status(500).json({ error: 'Failed to schedule maintenance' });
        }
      }
    });

    router.get('/maintenance', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const status = req.query.status as MaintenanceStatus | undefined;
        const windows = await this.maintenanceService.list(req.tenantId!, status);
        res.json({ maintenanceWindows: windows });
      } catch (error) {
        res.status(500).json({ error: 'Failed to list maintenance windows' });
      }
    });

    router.get('/maintenance/upcoming', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const hours = parseInt(req.query.hours as string) || 24;
        const windows = await this.maintenanceService.getUpcoming(req.tenantId!, hours);
        res.json({ upcoming: windows });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get upcoming maintenance' });
      }
    });

    router.post('/maintenance/:id/start', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const window = await this.maintenanceService.start(req.params.id, req.tenantId!);
        if (!window) {
          res.status(404).json({ error: 'Maintenance window not found or not in scheduled state' });
          return;
        }
        logger.info({ maintenanceId: window.id, userId: req.userId }, 'Maintenance started');
        res.json(window);
      } catch (error) {
        res.status(500).json({ error: 'Failed to start maintenance' });
      }
    });

    router.post('/maintenance/:id/complete', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const window = await this.maintenanceService.complete(req.params.id, req.tenantId!);
        if (!window) {
          res.status(404).json({ error: 'Maintenance window not found or not in progress' });
          return;
        }
        logger.info({ maintenanceId: window.id, userId: req.userId }, 'Maintenance completed');
        res.json(window);
      } catch (error) {
        res.status(500).json({ error: 'Failed to complete maintenance' });
      }
    });

    router.post('/maintenance/:id/cancel', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const window = await this.maintenanceService.cancel(req.params.id, req.tenantId!);
        if (!window) {
          res.status(404).json({ error: 'Maintenance window not found or cannot be cancelled' });
          return;
        }
        logger.info({ maintenanceId: window.id, userId: req.userId }, 'Maintenance cancelled');
        res.json(window);
      } catch (error) {
        res.status(500).json({ error: 'Failed to cancel maintenance' });
      }
    });

    // ============================================
    // SCALING ROUTES
    // ============================================

    router.post('/scaling/rules', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = CreateScalingRuleSchema.parse(req.body);
        const tenantId = data.isGlobal && req.isSuperAdmin ? null : req.tenantId!;
        const rule = await this.scalingService.createRule(tenantId, req.userId!, data);

        logger.info({ ruleId: rule.id, userId: req.userId }, 'Scaling rule created');
        res.status(201).json(rule);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
          res.status(500).json({ error: 'Failed to create scaling rule' });
        }
      }
    });

    router.get('/scaling/rules', this.requireAuth('operator'), async (req: AuthenticatedRequest, res) => {
      try {
        const rules = await this.scalingService.listRules(req.tenantId!);
        res.json({ rules });
      } catch (error) {
        res.status(500).json({ error: 'Failed to list scaling rules' });
      }
    });

    router.post('/scaling/rules/:id/toggle', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const isEnabled = req.body.isEnabled === true;
        const rule = await this.scalingService.toggleRule(req.params.id, req.tenantId!, isEnabled);
        if (!rule) {
          res.status(404).json({ error: 'Scaling rule not found' });
          return;
        }
        res.json(rule);
      } catch (error) {
        res.status(500).json({ error: 'Failed to toggle scaling rule' });
      }
    });

    router.delete('/scaling/rules/:id', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const success = await this.scalingService.deleteRule(req.params.id, req.tenantId!);
        if (!success) {
          res.status(404).json({ error: 'Scaling rule not found' });
          return;
        }
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete scaling rule' });
      }
    });

    router.get('/scaling/events', this.requireAuth('operator'), async (req: AuthenticatedRequest, res) => {
      try {
        const ruleId = req.query.ruleId as string | undefined;
        const events = await this.scalingService.getScalingEvents(req.tenantId!, ruleId);
        res.json({ events });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get scaling events' });
      }
    });

    // ============================================
    // COST ROUTES
    // ============================================

    router.post('/costs', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = RecordCostSchema.parse(req.body);
        const record = await this.costService.record(req.tenantId!, data);
        res.status(201).json(record);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
          res.status(500).json({ error: 'Failed to record cost' });
        }
      }
    });

    router.get('/costs', this.requireAuth('operator'), async (req: AuthenticatedRequest, res) => {
      try {
        const startDate = new Date(req.query.startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        const endDate = new Date(req.query.endDate as string || new Date());
        const costs = await this.costService.getTenantCosts(req.tenantId!, startDate, endDate);
        res.json({ costs });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get costs' });
      }
    });

    router.get('/costs/summary', this.requireAuth('operator'), async (req: AuthenticatedRequest, res) => {
      try {
        const startDate = new Date(req.query.startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        const endDate = new Date(req.query.endDate as string || new Date());
        const summary = await this.costService.getCostSummary(req.tenantId!, startDate, endDate);
        res.json(summary);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get cost summary' });
      }
    });

    router.get('/costs/all-tenants', this.requireAuth('superadmin'), async (req: AuthenticatedRequest, res) => {
      try {
        const startDate = new Date(req.query.startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        const endDate = new Date(req.query.endDate as string || new Date());
        const summary = await this.costService.getAllTenantsCostSummary(startDate, endDate);
        res.json({ tenantCosts: summary });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get all tenants cost summary' });
      }
    });

    this.app.use('/api/v1', router);
  }

  private requireAuth(minimumRole: 'superadmin' | 'admin' | 'operator' | 'viewer') {
    const roleHierarchy: Record<string, number> = {
      superadmin: 100,
      admin: 80,
      operator: 60,
      viewer: 40,
    };

    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const token = authHeader.split(' ')[1];

      try {
        const parts = token.split('.');
        if (parts.length !== 3) {
          res.status(401).json({ error: 'Invalid token' });
          return;
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
          res.status(401).json({ error: 'Token expired' });
          return;
        }

        const userLevel = roleHierarchy[payload.role] || 0;
        const requiredLevel = roleHierarchy[minimumRole] || 0;

        if (userLevel < requiredLevel) {
          res.status(403).json({ error: `Minimum role required: ${minimumRole}` });
          return;
        }

        req.userId = payload.userId;
        req.username = payload.username;
        req.role = payload.role;
        req.tenantId = payload.tenantId || 'default';
        req.isSuperAdmin = payload.role === 'superadmin';

        next();
      } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
      }
    };
  }

  async start(port = 3505): Promise<void> {
    await this.pool.connect();

    this.app.listen(port, () => {
      logger.info({ port }, '🏗️ Infrastructure Control API running');
    });
  }

  async stop(): Promise<void> {
    await this.pool.end();
  }
}

// ============================================
// START SERVER
// ============================================

if (require.main === module) {
  const server = new InfrastructureControlServer();
  server.start(parseInt(process.env.INFRASTRUCTURE_PORT || '3505'));
}

export default InfrastructureControlServer;
