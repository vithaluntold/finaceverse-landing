// ============================================
// DEVELOPER PORTAL - API & Developer Services
// Module 8: API Key Management, Webhooks, SDK Generation
// ============================================

import express, { Request, Response, NextFunction, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import { z } from 'zod';

// Type declarations for pg module
interface PoolConfig {
  connectionString?: string;
  ssl?: { rejectUnauthorized: boolean } | boolean;
}

interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number | null;
}

interface Pool {
  query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
  connect(): Promise<void>;
  end(): Promise<void>;
}

interface PoolConstructor {
  new(config?: PoolConfig): Pool;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Pool } = require('pg') as { Pool: PoolConstructor };

// Simple logger implementation
interface LogFn {
  (msg: string): void;
  (obj: object, msg?: string): void;
}

interface PinoLogger {
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  debug: LogFn;
  child: (bindings: object) => PinoLogger;
}

const logger: PinoLogger = {
  info: (objOrMsg: string | object, msg?: string) => {
    const message = typeof objOrMsg === 'string' ? objOrMsg : msg || '';
    const data = typeof objOrMsg === 'object' ? objOrMsg : {};
    console.log(JSON.stringify({ level: 'info', msg: message, ...data, time: Date.now() }));
  },
  warn: (objOrMsg: string | object, msg?: string) => {
    const message = typeof objOrMsg === 'string' ? objOrMsg : msg || '';
    const data = typeof objOrMsg === 'object' ? objOrMsg : {};
    console.warn(JSON.stringify({ level: 'warn', msg: message, ...data, time: Date.now() }));
  },
  error: (objOrMsg: string | object, msg?: string) => {
    const message = typeof objOrMsg === 'string' ? objOrMsg : msg || '';
    const data = typeof objOrMsg === 'object' ? objOrMsg : {};
    console.error(JSON.stringify({ level: 'error', msg: message, ...data, time: Date.now() }));
  },
  debug: (objOrMsg: string | object, msg?: string) => {
    const message = typeof objOrMsg === 'string' ? objOrMsg : msg || '';
    const data = typeof objOrMsg === 'object' ? objOrMsg : {};
    console.debug(JSON.stringify({ level: 'debug', msg: message, ...data, time: Date.now() }));
  },
  child: () => logger,
};

// ============================================
// TYPES
// ============================================

interface AuthenticatedRequest extends Request {
  userId?: string;
  username?: string;
  role?: 'superadmin' | 'admin' | 'operator' | 'viewer' | 'developer';
  tenantId?: string;
  isSuperAdmin?: boolean;
}

interface APIKey {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  permissions: string[];
  rateLimit: number;
  rateLimitWindow: number;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  metadata: Record<string, unknown>;
}

interface Webhook {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  headers: Record<string, string>;
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
  deliveryStats: {
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    lastDeliveryAt: Date | null;
    lastDeliveryStatus: string | null;
  };
  createdAt: Date;
  createdBy: string;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  responseStatus: number | null;
  responseBody: string | null;
  deliveredAt: Date | null;
  attempts: number;
  nextRetryAt: Date | null;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  error: string | null;
  duration: number | null;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateAPIKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).default(['read']),
  rateLimit: z.number().min(1).max(100000).default(1000),
  rateLimitWindow: z.number().min(60).max(86400).default(3600), // seconds
  expiresAt: z.string().datetime().optional().nullable(),
  metadata: z.record(z.unknown()).default({}),
});

const CreateWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  headers: z.record(z.string()).default({}),
  retryConfig: z.object({
    maxRetries: z.number().min(0).max(10).default(3),
    retryDelay: z.number().min(1000).max(300000).default(5000),
    backoffMultiplier: z.number().min(1).max(5).default(2),
  }).default({ maxRetries: 3, retryDelay: 5000, backoffMultiplier: 2 }),
});

const UpdateWebhookSchema = CreateWebhookSchema.partial();

// ============================================
// API KEY SERVICE
// ============================================

class APIKeyService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    await this.pool.query(`
      CREATE SCHEMA IF NOT EXISTS developer_portal;
      
      CREATE TABLE IF NOT EXISTS developer_portal.api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        name VARCHAR(100) NOT NULL,
        key_prefix VARCHAR(12) NOT NULL,
        key_hash VARCHAR(128) NOT NULL,
        permissions JSONB DEFAULT '["read"]',
        rate_limit INTEGER DEFAULT 1000,
        rate_limit_window INTEGER DEFAULT 3600,
        expires_at TIMESTAMPTZ,
        last_used_at TIMESTAMPTZ,
        usage_count BIGINT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID NOT NULL,
        metadata JSONB DEFAULT '{}',
        UNIQUE(key_prefix)
      );

      CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON developer_portal.api_keys(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON developer_portal.api_keys(key_prefix);
      CREATE INDEX IF NOT EXISTS idx_api_keys_active ON developer_portal.api_keys(is_active);
    `);
    logger.info('API Keys tables initialized');
  }

  generateAPIKey(): { fullKey: string; prefix: string; hash: string } {
    const prefix = `fv_${crypto.randomBytes(4).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('base64url');
    const fullKey = `${prefix}_${secret}`;
    const hash = crypto.createHash('sha256').update(fullKey).digest('hex');
    
    return { fullKey, prefix, hash };
  }

  async createKey(tenantId: string, createdBy: string, data: z.infer<typeof CreateAPIKeySchema>): Promise<{ key: APIKey; fullKey: string }> {
    const { fullKey, prefix, hash } = this.generateAPIKey();
    
    const result = await this.pool.query(
      `INSERT INTO developer_portal.api_keys 
       (tenant_id, name, key_prefix, key_hash, permissions, rate_limit, rate_limit_window, expires_at, created_by, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        tenantId,
        data.name,
        prefix,
        hash,
        JSON.stringify(data.permissions),
        data.rateLimit,
        data.rateLimitWindow,
        data.expiresAt ? new Date(data.expiresAt) : null,
        createdBy,
        JSON.stringify(data.metadata),
      ]
    );

    const row = result.rows[0];
    return {
      key: this.mapRow(row),
      fullKey, // Only returned once at creation time
    };
  }

  async listKeys(tenantId: string): Promise<APIKey[]> {
    const result = await this.pool.query(
      `SELECT * FROM developer_portal.api_keys WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async getKey(id: string, tenantId: string): Promise<APIKey | null> {
    const result = await this.pool.query(
      `SELECT * FROM developer_portal.api_keys WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async validateKey(fullKey: string): Promise<{ valid: boolean; key?: APIKey; error?: string }> {
    const prefix = fullKey.split('_').slice(0, 2).join('_');
    const hash = crypto.createHash('sha256').update(fullKey).digest('hex');

    const result = await this.pool.query(
      `SELECT * FROM developer_portal.api_keys 
       WHERE key_prefix = $1 AND key_hash = $2 AND is_active = true`,
      [prefix, hash]
    );

    if (result.rows.length === 0) {
      return { valid: false, error: 'Invalid API key' };
    }

    const key = this.mapRow(result.rows[0]);

    // Check expiry
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return { valid: false, error: 'API key expired' };
    }

    // Update usage
    await this.pool.query(
      `UPDATE developer_portal.api_keys 
       SET last_used_at = NOW(), usage_count = usage_count + 1 
       WHERE id = $1`,
      [key.id]
    );

    return { valid: true, key };
  }

  async rotateKey(id: string, tenantId: string): Promise<{ key: APIKey; fullKey: string } | null> {
    const existing = await this.getKey(id, tenantId);
    if (!existing) return null;

    const { fullKey, prefix, hash } = this.generateAPIKey();

    const result = await this.pool.query(
      `UPDATE developer_portal.api_keys 
       SET key_prefix = $1, key_hash = $2, usage_count = 0, last_used_at = NULL
       WHERE id = $3 AND tenant_id = $4
       RETURNING *`,
      [prefix, hash, id, tenantId]
    );

    if (result.rows.length === 0) return null;

    return {
      key: this.mapRow(result.rows[0]),
      fullKey,
    };
  }

  async revokeKey(id: string, tenantId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE developer_portal.api_keys SET is_active = false WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async deleteKey(id: string, tenantId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM developer_portal.api_keys WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): APIKey {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      keyPrefix: row.key_prefix as string,
      keyHash: row.key_hash as string,
      permissions: row.permissions as string[],
      rateLimit: row.rate_limit as number,
      rateLimitWindow: row.rate_limit_window as number,
      expiresAt: row.expires_at as Date | null,
      lastUsedAt: row.last_used_at as Date | null,
      usageCount: Number(row.usage_count),
      isActive: row.is_active as boolean,
      createdAt: row.created_at as Date,
      createdBy: row.created_by as string,
      metadata: row.metadata as Record<string, unknown>,
    };
  }
}

// ============================================
// WEBHOOK SERVICE
// ============================================

class WebhookService {
  private pool: Pool;
  private deliveryQueue: Map<string, NodeJS.Timeout> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
    this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS developer_portal.webhooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        name VARCHAR(100) NOT NULL,
        url TEXT NOT NULL,
        events JSONB NOT NULL,
        secret VARCHAR(64) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        headers JSONB DEFAULT '{}',
        retry_config JSONB DEFAULT '{"maxRetries": 3, "retryDelay": 5000, "backoffMultiplier": 2}',
        total_deliveries BIGINT DEFAULT 0,
        successful_deliveries BIGINT DEFAULT 0,
        failed_deliveries BIGINT DEFAULT 0,
        last_delivery_at TIMESTAMPTZ,
        last_delivery_status VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID NOT NULL
      );

      CREATE TABLE IF NOT EXISTS developer_portal.webhook_deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id UUID NOT NULL REFERENCES developer_portal.webhooks(id) ON DELETE CASCADE,
        event VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        response_status INTEGER,
        response_body TEXT,
        delivered_at TIMESTAMPTZ,
        attempts INTEGER DEFAULT 0,
        next_retry_at TIMESTAMPTZ,
        status VARCHAR(20) DEFAULT 'pending',
        error TEXT,
        duration INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON developer_portal.webhooks(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_webhooks_active ON developer_portal.webhooks(is_active);
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON developer_portal.webhook_deliveries(webhook_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON developer_portal.webhook_deliveries(status);
    `);
    logger.info('Webhooks tables initialized');
  }

  async createWebhook(tenantId: string, createdBy: string, data: z.infer<typeof CreateWebhookSchema>): Promise<Webhook> {
    const secret = crypto.randomBytes(32).toString('hex');

    const result = await this.pool.query(
      `INSERT INTO developer_portal.webhooks 
       (tenant_id, name, url, events, secret, headers, retry_config, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        tenantId,
        data.name,
        data.url,
        JSON.stringify(data.events),
        secret,
        JSON.stringify(data.headers),
        JSON.stringify(data.retryConfig),
        createdBy,
      ]
    );

    return this.mapWebhookRow(result.rows[0]);
  }

  async listWebhooks(tenantId: string): Promise<Webhook[]> {
    const result = await this.pool.query(
      `SELECT * FROM developer_portal.webhooks WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapWebhookRow(row));
  }

  async getWebhook(id: string, tenantId: string): Promise<Webhook | null> {
    const result = await this.pool.query(
      `SELECT * FROM developer_portal.webhooks WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    return result.rows.length > 0 ? this.mapWebhookRow(result.rows[0]) : null;
  }

  async updateWebhook(id: string, tenantId: string, data: z.infer<typeof UpdateWebhookSchema>): Promise<Webhook | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.url !== undefined) {
      updates.push(`url = $${paramIndex++}`);
      values.push(data.url);
    }
    if (data.events !== undefined) {
      updates.push(`events = $${paramIndex++}`);
      values.push(JSON.stringify(data.events));
    }
    if (data.headers !== undefined) {
      updates.push(`headers = $${paramIndex++}`);
      values.push(JSON.stringify(data.headers));
    }
    if (data.retryConfig !== undefined) {
      updates.push(`retry_config = $${paramIndex++}`);
      values.push(JSON.stringify(data.retryConfig));
    }

    if (updates.length === 0) return this.getWebhook(id, tenantId);

    values.push(id, tenantId);
    const result = await this.pool.query(
      `UPDATE developer_portal.webhooks SET ${updates.join(', ')} 
       WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows.length > 0 ? this.mapWebhookRow(result.rows[0]) : null;
  }

  async toggleWebhook(id: string, tenantId: string, isActive: boolean): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE developer_portal.webhooks SET is_active = $1 WHERE id = $2 AND tenant_id = $3`,
      [isActive, id, tenantId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async deleteWebhook(id: string, tenantId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM developer_portal.webhooks WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async regenerateSecret(id: string, tenantId: string): Promise<string | null> {
    const newSecret = crypto.randomBytes(32).toString('hex');
    const result = await this.pool.query(
      `UPDATE developer_portal.webhooks SET secret = $1 WHERE id = $2 AND tenant_id = $3 RETURNING secret`,
      [newSecret, id, tenantId]
    );
    return result.rows.length > 0 ? newSecret : null;
  }

  async triggerWebhook(tenantId: string, event: string, payload: Record<string, unknown>): Promise<number> {
    // Find all active webhooks subscribed to this event
    const result = await this.pool.query(
      `SELECT * FROM developer_portal.webhooks 
       WHERE tenant_id = $1 AND is_active = true AND events ? $2`,
      [tenantId, event]
    );

    let triggered = 0;
    for (const row of result.rows) {
      const webhook = this.mapWebhookRow(row);
      await this.queueDelivery(webhook, event, payload);
      triggered++;
    }

    return triggered;
  }

  private async queueDelivery(webhook: Webhook, event: string, payload: Record<string, unknown>): Promise<void> {
    // Create delivery record
    const result = await this.pool.query(
      `INSERT INTO developer_portal.webhook_deliveries 
       (webhook_id, event, payload, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id`,
      [webhook.id, event, JSON.stringify(payload)]
    );

    const deliveryId = result.rows[0].id as string;
    
    // Attempt immediate delivery
    this.attemptDelivery(deliveryId, webhook, event, payload, 0);
  }

  private async attemptDelivery(
    deliveryId: string,
    webhook: Webhook,
    event: string,
    payload: Record<string, unknown>,
    attempt: number
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Generate signature
      const timestamp = Date.now();
      const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(signaturePayload)
        .digest('hex');

      // Make HTTP request (using fetch or http module)
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-Signature': `v1=${signature}`,
          'X-Webhook-Timestamp': timestamp.toString(),
          'X-Webhook-ID': deliveryId,
          ...webhook.headers,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const duration = Date.now() - startTime;
      const responseBody = await response.text();

      // Update delivery record
      await this.pool.query(
        `UPDATE developer_portal.webhook_deliveries 
         SET status = $1, response_status = $2, response_body = $3, 
             delivered_at = NOW(), attempts = $4, duration = $5, error = NULL
         WHERE id = $6`,
        [
          response.ok ? 'success' : 'failed',
          response.status,
          responseBody.substring(0, 10000), // Limit response size
          attempt + 1,
          duration,
          deliveryId,
        ]
      );

      // Update webhook stats
      await this.pool.query(
        `UPDATE developer_portal.webhooks 
         SET total_deliveries = total_deliveries + 1,
             ${response.ok ? 'successful_deliveries = successful_deliveries + 1' : 'failed_deliveries = failed_deliveries + 1'},
             last_delivery_at = NOW(),
             last_delivery_status = $1
         WHERE id = $2`,
        [response.ok ? 'success' : 'failed', webhook.id]
      );

      if (!response.ok && attempt < webhook.retryConfig.maxRetries) {
        // Schedule retry
        const delay = webhook.retryConfig.retryDelay * Math.pow(webhook.retryConfig.backoffMultiplier, attempt);
        const nextRetryAt = new Date(Date.now() + delay);
        
        await this.pool.query(
          `UPDATE developer_portal.webhook_deliveries 
           SET status = 'retrying', next_retry_at = $1 WHERE id = $2`,
          [nextRetryAt, deliveryId]
        );

        setTimeout(() => {
          this.attemptDelivery(deliveryId, webhook, event, payload, attempt + 1);
        }, delay);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.pool.query(
        `UPDATE developer_portal.webhook_deliveries 
         SET status = 'failed', attempts = $1, duration = $2, error = $3
         WHERE id = $4`,
        [attempt + 1, duration, errorMessage, deliveryId]
      );

      // Update webhook stats
      await this.pool.query(
        `UPDATE developer_portal.webhooks 
         SET total_deliveries = total_deliveries + 1,
             failed_deliveries = failed_deliveries + 1,
             last_delivery_at = NOW(),
             last_delivery_status = 'error'
         WHERE id = $1`,
        [webhook.id]
      );

      // Schedule retry if applicable
      if (attempt < webhook.retryConfig.maxRetries) {
        const delay = webhook.retryConfig.retryDelay * Math.pow(webhook.retryConfig.backoffMultiplier, attempt);
        const nextRetryAt = new Date(Date.now() + delay);
        
        await this.pool.query(
          `UPDATE developer_portal.webhook_deliveries 
           SET status = 'retrying', next_retry_at = $1 WHERE id = $2`,
          [nextRetryAt, deliveryId]
        );

        setTimeout(() => {
          this.attemptDelivery(deliveryId, webhook, event, payload, attempt + 1);
        }, delay);
      }

      logger.error({ error: errorMessage, webhookId: webhook.id, deliveryId }, 'Webhook delivery failed');
    }
  }

  async getDeliveries(webhookId: string, tenantId: string, limit = 50): Promise<WebhookDelivery[]> {
    // Verify webhook belongs to tenant
    const webhook = await this.getWebhook(webhookId, tenantId);
    if (!webhook) return [];

    const result = await this.pool.query(
      `SELECT * FROM developer_portal.webhook_deliveries 
       WHERE webhook_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [webhookId, limit]
    );

    return result.rows.map((row: Record<string, unknown>) => this.mapDeliveryRow(row));
  }

  async retryDelivery(deliveryId: string, tenantId: string): Promise<boolean> {
    // Get delivery and verify tenant access
    const result = await this.pool.query(
      `SELECT d.*, w.tenant_id, w.url, w.secret, w.headers, w.retry_config
       FROM developer_portal.webhook_deliveries d
       JOIN developer_portal.webhooks w ON d.webhook_id = w.id
       WHERE d.id = $1 AND w.tenant_id = $2`,
      [deliveryId, tenantId]
    );

    if (result.rows.length === 0) return false;

    const row = result.rows[0];
    const webhook: Webhook = {
      id: row.webhook_id as string,
      tenantId: row.tenant_id as string,
      name: '',
      url: row.url as string,
      events: [],
      secret: row.secret as string,
      isActive: true,
      headers: row.headers as Record<string, string>,
      retryConfig: row.retry_config as { maxRetries: number; retryDelay: number; backoffMultiplier: number },
      deliveryStats: {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        lastDeliveryAt: null,
        lastDeliveryStatus: null,
      },
      createdAt: new Date(),
      createdBy: '',
    };

    // Reset delivery status
    await this.pool.query(
      `UPDATE developer_portal.webhook_deliveries SET status = 'pending', attempts = 0 WHERE id = $1`,
      [deliveryId]
    );

    // Attempt delivery
    this.attemptDelivery(deliveryId, webhook, row.event as string, row.payload as Record<string, unknown>, 0);
    return true;
  }

  private mapWebhookRow(row: Record<string, unknown>): Webhook {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      url: row.url as string,
      events: row.events as string[],
      secret: row.secret as string,
      isActive: row.is_active as boolean,
      headers: row.headers as Record<string, string>,
      retryConfig: row.retry_config as Webhook['retryConfig'],
      deliveryStats: {
        totalDeliveries: Number(row.total_deliveries),
        successfulDeliveries: Number(row.successful_deliveries),
        failedDeliveries: Number(row.failed_deliveries),
        lastDeliveryAt: row.last_delivery_at as Date | null,
        lastDeliveryStatus: row.last_delivery_status as string | null,
      },
      createdAt: row.created_at as Date,
      createdBy: row.created_by as string,
    };
  }

  private mapDeliveryRow(row: Record<string, unknown>): WebhookDelivery {
    return {
      id: row.id as string,
      webhookId: row.webhook_id as string,
      event: row.event as string,
      payload: row.payload as Record<string, unknown>,
      responseStatus: row.response_status as number | null,
      responseBody: row.response_body as string | null,
      deliveredAt: row.delivered_at as Date | null,
      attempts: row.attempts as number,
      nextRetryAt: row.next_retry_at as Date | null,
      status: row.status as WebhookDelivery['status'],
      error: row.error as string | null,
      duration: row.duration as number | null,
    };
  }
}

// ============================================
// RATE LIMITER
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  check(keyId: string, limit: number, windowSeconds: number): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const key = `${keyId}:${Math.floor(now / windowMs)}`;

    let entry = this.limits.get(key);
    
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      this.limits.set(key, entry);
    }

    const allowed = entry.count < limit;
    if (allowed) {
      entry.count++;
    }

    return {
      allowed,
      remaining: Math.max(0, limit - entry.count),
      resetAt: entry.resetAt,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }

  stop(): void {
    clearInterval(this.cleanupInterval);
  }
}

// ============================================
// DEVELOPER PORTAL SERVER
// ============================================

export class DeveloperPortalServer {
  private app: express.Application;
  private pool: Pool;
  private apiKeyService: APIKeyService;
  private webhookService: WebhookService;
  private rateLimiter: RateLimiter;

  constructor() {
    this.app = express();
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
    
    this.apiKeyService = new APIKeyService(this.pool);
    this.webhookService = new WebhookService(this.pool);
    this.rateLimiter = new RateLimiter();

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', service: 'developer-portal', timestamp: new Date().toISOString() });
    });
  }

  private setupRoutes(): void {
    const router = Router();

    // ============================================
    // API KEY ROUTES
    // ============================================

    // Create API key
    router.post('/api-keys', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = CreateAPIKeySchema.parse(req.body);
        const result = await this.apiKeyService.createKey(req.tenantId!, req.userId!, data);
        
        logger.info({ keyId: result.key.id, userId: req.userId }, 'API key created');
        res.status(201).json({
          ...result.key,
          fullKey: result.fullKey, // Only shown once!
          warning: 'Save this key securely. It will not be shown again.',
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
          logger.error({ error }, 'Failed to create API key');
          res.status(500).json({ error: 'Failed to create API key' });
        }
      }
    });

    // List API keys
    router.get('/api-keys', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const keys = await this.apiKeyService.listKeys(req.tenantId!);
        res.json({ keys });
      } catch (error) {
        logger.error({ error }, 'Failed to list API keys');
        res.status(500).json({ error: 'Failed to list API keys' });
      }
    });

    // Get API key details
    router.get('/api-keys/:id', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const key = await this.apiKeyService.getKey(req.params.id, req.tenantId!);
        if (!key) {
          res.status(404).json({ error: 'API key not found' });
          return;
        }
        res.json(key);
      } catch (error) {
        logger.error({ error }, 'Failed to get API key');
        res.status(500).json({ error: 'Failed to get API key' });
      }
    });

    // Rotate API key
    router.post('/api-keys/:id/rotate', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const result = await this.apiKeyService.rotateKey(req.params.id, req.tenantId!);
        if (!result) {
          res.status(404).json({ error: 'API key not found' });
          return;
        }
        
        logger.info({ keyId: result.key.id, userId: req.userId }, 'API key rotated');
        res.json({
          ...result.key,
          fullKey: result.fullKey,
          warning: 'Save this key securely. It will not be shown again.',
        });
      } catch (error) {
        logger.error({ error }, 'Failed to rotate API key');
        res.status(500).json({ error: 'Failed to rotate API key' });
      }
    });

    // Revoke API key
    router.post('/api-keys/:id/revoke', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const success = await this.apiKeyService.revokeKey(req.params.id, req.tenantId!);
        if (!success) {
          res.status(404).json({ error: 'API key not found' });
          return;
        }
        
        logger.info({ keyId: req.params.id, userId: req.userId }, 'API key revoked');
        res.json({ success: true, message: 'API key revoked' });
      } catch (error) {
        logger.error({ error }, 'Failed to revoke API key');
        res.status(500).json({ error: 'Failed to revoke API key' });
      }
    });

    // Delete API key
    router.delete('/api-keys/:id', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const success = await this.apiKeyService.deleteKey(req.params.id, req.tenantId!);
        if (!success) {
          res.status(404).json({ error: 'API key not found' });
          return;
        }
        
        logger.info({ keyId: req.params.id, userId: req.userId }, 'API key deleted');
        res.status(204).send();
      } catch (error) {
        logger.error({ error }, 'Failed to delete API key');
        res.status(500).json({ error: 'Failed to delete API key' });
      }
    });

    // Validate API key (public endpoint for testing)
    router.post('/api-keys/validate', async (req, res) => {
      try {
        const { apiKey } = req.body;
        if (!apiKey) {
          res.status(400).json({ error: 'API key required' });
          return;
        }

        const result = await this.apiKeyService.validateKey(apiKey);
        if (!result.valid) {
          res.status(401).json({ valid: false, error: result.error });
          return;
        }

        // Check rate limit
        const rateLimitResult = this.rateLimiter.check(
          result.key!.id,
          result.key!.rateLimit,
          result.key!.rateLimitWindow
        );

        res.json({
          valid: true,
          permissions: result.key!.permissions,
          rateLimit: {
            allowed: rateLimitResult.allowed,
            remaining: rateLimitResult.remaining,
            resetAt: new Date(rateLimitResult.resetAt).toISOString(),
          },
        });
      } catch (error) {
        logger.error({ error }, 'Failed to validate API key');
        res.status(500).json({ error: 'Failed to validate API key' });
      }
    });

    // ============================================
    // WEBHOOK ROUTES
    // ============================================

    // Create webhook
    router.post('/webhooks', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = CreateWebhookSchema.parse(req.body);
        const webhook = await this.webhookService.createWebhook(req.tenantId!, req.userId!, data);
        
        logger.info({ webhookId: webhook.id, userId: req.userId }, 'Webhook created');
        res.status(201).json(webhook);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
          logger.error({ error }, 'Failed to create webhook');
          res.status(500).json({ error: 'Failed to create webhook' });
        }
      }
    });

    // List webhooks
    router.get('/webhooks', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const webhooks = await this.webhookService.listWebhooks(req.tenantId!);
        // Hide secrets in list view
        const sanitized = webhooks.map(w => ({ ...w, secret: '********' }));
        res.json({ webhooks: sanitized });
      } catch (error) {
        logger.error({ error }, 'Failed to list webhooks');
        res.status(500).json({ error: 'Failed to list webhooks' });
      }
    });

    // Get webhook details
    router.get('/webhooks/:id', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const webhook = await this.webhookService.getWebhook(req.params.id, req.tenantId!);
        if (!webhook) {
          res.status(404).json({ error: 'Webhook not found' });
          return;
        }
        res.json(webhook);
      } catch (error) {
        logger.error({ error }, 'Failed to get webhook');
        res.status(500).json({ error: 'Failed to get webhook' });
      }
    });

    // Update webhook
    router.patch('/webhooks/:id', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = UpdateWebhookSchema.parse(req.body);
        const webhook = await this.webhookService.updateWebhook(req.params.id, req.tenantId!, data);
        if (!webhook) {
          res.status(404).json({ error: 'Webhook not found' });
          return;
        }
        
        logger.info({ webhookId: webhook.id, userId: req.userId }, 'Webhook updated');
        res.json(webhook);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
          logger.error({ error }, 'Failed to update webhook');
          res.status(500).json({ error: 'Failed to update webhook' });
        }
      }
    });

    // Toggle webhook
    router.post('/webhooks/:id/toggle', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const { isActive } = req.body;
        const success = await this.webhookService.toggleWebhook(req.params.id, req.tenantId!, isActive);
        if (!success) {
          res.status(404).json({ error: 'Webhook not found' });
          return;
        }
        
        logger.info({ webhookId: req.params.id, isActive, userId: req.userId }, 'Webhook toggled');
        res.json({ success: true, isActive });
      } catch (error) {
        logger.error({ error }, 'Failed to toggle webhook');
        res.status(500).json({ error: 'Failed to toggle webhook' });
      }
    });

    // Regenerate webhook secret
    router.post('/webhooks/:id/regenerate-secret', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const newSecret = await this.webhookService.regenerateSecret(req.params.id, req.tenantId!);
        if (!newSecret) {
          res.status(404).json({ error: 'Webhook not found' });
          return;
        }
        
        logger.info({ webhookId: req.params.id, userId: req.userId }, 'Webhook secret regenerated');
        res.json({ secret: newSecret, warning: 'Update your endpoint to use the new secret.' });
      } catch (error) {
        logger.error({ error }, 'Failed to regenerate webhook secret');
        res.status(500).json({ error: 'Failed to regenerate webhook secret' });
      }
    });

    // Delete webhook
    router.delete('/webhooks/:id', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const success = await this.webhookService.deleteWebhook(req.params.id, req.tenantId!);
        if (!success) {
          res.status(404).json({ error: 'Webhook not found' });
          return;
        }
        
        logger.info({ webhookId: req.params.id, userId: req.userId }, 'Webhook deleted');
        res.status(204).send();
      } catch (error) {
        logger.error({ error }, 'Failed to delete webhook');
        res.status(500).json({ error: 'Failed to delete webhook' });
      }
    });

    // Test webhook (send test event)
    router.post('/webhooks/:id/test', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const webhook = await this.webhookService.getWebhook(req.params.id, req.tenantId!);
        if (!webhook) {
          res.status(404).json({ error: 'Webhook not found' });
          return;
        }

        // Queue a test delivery
        await this.webhookService.triggerWebhook(req.tenantId!, 'test.ping', {
          test: true,
          timestamp: new Date().toISOString(),
          webhookId: webhook.id,
        });
        
        logger.info({ webhookId: req.params.id, userId: req.userId }, 'Webhook test triggered');
        res.json({ success: true, message: 'Test event queued for delivery' });
      } catch (error) {
        logger.error({ error }, 'Failed to test webhook');
        res.status(500).json({ error: 'Failed to test webhook' });
      }
    });

    // Get webhook deliveries
    router.get('/webhooks/:id/deliveries', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const deliveries = await this.webhookService.getDeliveries(req.params.id, req.tenantId!, limit);
        res.json({ deliveries });
      } catch (error) {
        logger.error({ error }, 'Failed to get webhook deliveries');
        res.status(500).json({ error: 'Failed to get webhook deliveries' });
      }
    });

    // Retry webhook delivery
    router.post('/webhooks/deliveries/:id/retry', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const success = await this.webhookService.retryDelivery(req.params.id, req.tenantId!);
        if (!success) {
          res.status(404).json({ error: 'Delivery not found' });
          return;
        }
        
        logger.info({ deliveryId: req.params.id, userId: req.userId }, 'Webhook delivery retry triggered');
        res.json({ success: true, message: 'Retry queued' });
      } catch (error) {
        logger.error({ error }, 'Failed to retry webhook delivery');
        res.status(500).json({ error: 'Failed to retry webhook delivery' });
      }
    });

    // ============================================
    // AVAILABLE EVENTS
    // ============================================

    router.get('/webhook-events', this.requireAuth('viewer'), (req, res) => {
      res.json({
        events: [
          { name: 'test.ping', description: 'Test event for webhook verification' },
          { name: 'user.created', description: 'A new user was created' },
          { name: 'user.updated', description: 'A user was updated' },
          { name: 'user.deleted', description: 'A user was deleted' },
          { name: 'subscription.created', description: 'A new subscription was created' },
          { name: 'subscription.updated', description: 'A subscription was updated' },
          { name: 'subscription.cancelled', description: 'A subscription was cancelled' },
          { name: 'payment.succeeded', description: 'A payment was successful' },
          { name: 'payment.failed', description: 'A payment failed' },
          { name: 'invoice.created', description: 'An invoice was created' },
          { name: 'invoice.paid', description: 'An invoice was paid' },
          { name: 'document.processed', description: 'A document was processed by AI' },
          { name: 'workflow.completed', description: 'A workflow completed execution' },
          { name: 'workflow.failed', description: 'A workflow failed execution' },
        ],
      });
    });

    this.app.use('/api/v1', router);
  }

  private requireAuth(minimumRole: 'superadmin' | 'admin' | 'operator' | 'viewer' | 'developer') {
    const roleHierarchy: Record<string, number> = {
      superadmin: 100,
      admin: 80,
      operator: 60,
      viewer: 40,
      developer: 35,
    };

    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const token = authHeader.split(' ')[1];

      try {
        // Decode JWT (simplified - in production use proper JWT verification)
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

  async start(port = 3502): Promise<void> {
    await this.pool.connect();
    
    this.app.listen(port, () => {
      logger.info({ port }, '🚀 Developer Portal API running');
    });
  }

  async stop(): Promise<void> {
    this.rateLimiter.stop();
    await this.pool.end();
  }
}

// ============================================
// START SERVER
// ============================================

if (require.main === module) {
  const server = new DeveloperPortalServer();
  server.start(parseInt(process.env.DEVELOPER_PORTAL_PORT || '3502'));
}

export default DeveloperPortalServer;
