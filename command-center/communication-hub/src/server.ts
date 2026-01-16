// ============================================
// COMMUNICATION HUB - Notifications & Messaging
// Module 9: In-App Announcements, Email Templates, Push Notifications
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
  role?: 'superadmin' | 'admin' | 'operator' | 'viewer';
  tenantId?: string;
  isSuperAdmin?: boolean;
}

interface Announcement {
  id: string;
  tenantId: string | null; // null = global
  title: string;
  content: string;
  type: 'banner' | 'modal' | 'toast' | 'tooltip';
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetAudience: string[];
  startAt: Date;
  endAt: Date | null;
  isDismissible: boolean;
  actionUrl: string | null;
  actionText: string | null;
  style: Record<string, string>;
  viewCount: number;
  dismissCount: number;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
}

interface EmailTemplate {
  id: string;
  tenantId: string | null;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variables: string[];
  category: string;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  channel: 'in_app' | 'email' | 'push' | 'sms';
  title: string;
  message: string;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  isRead: boolean;
  readAt: Date | null;
  sentAt: Date;
  createdAt: Date;
}

interface PushSubscription {
  id: string;
  tenantId: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
  isActive: boolean;
  createdAt: Date;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  type: z.enum(['banner', 'modal', 'toast', 'tooltip']).default('banner'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  targetAudience: z.array(z.string()).default(['all']),
  startAt: z.string().datetime().default(() => new Date().toISOString()),
  endAt: z.string().datetime().optional().nullable(),
  isDismissible: z.boolean().default(true),
  actionUrl: z.string().url().optional().nullable(),
  actionText: z.string().max(50).optional().nullable(),
  style: z.record(z.string()).default({}),
  isGlobal: z.boolean().default(false),
});

const CreateEmailTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(500),
  bodyHtml: z.string().min(1),
  bodyText: z.string().optional().default(''),
  category: z.string().default('general'),
  isGlobal: z.boolean().default(false),
});

const SendNotificationSchema = z.object({
  userId: z.string().uuid().optional(),
  userIds: z.array(z.string().uuid()).optional(),
  type: z.enum(['info', 'success', 'warning', 'error']).default('info'),
  channels: z.array(z.enum(['in_app', 'email', 'push', 'sms'])).default(['in_app']),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  actionUrl: z.string().url().optional().nullable(),
  metadata: z.record(z.unknown()).default({}),
});

const SendEmailSchema = z.object({
  templateId: z.string().uuid().optional(),
  to: z.string().email().or(z.array(z.string().email())),
  subject: z.string().min(1).max(500).optional(),
  bodyHtml: z.string().optional(),
  bodyText: z.string().optional(),
  variables: z.record(z.unknown()).default({}),
});

// ============================================
// ANNOUNCEMENT SERVICE
// ============================================

class AnnouncementService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    await this.pool.query(`
      CREATE SCHEMA IF NOT EXISTS communication_hub;
      
      CREATE TABLE IF NOT EXISTS communication_hub.announcements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(20) DEFAULT 'banner',
        priority VARCHAR(20) DEFAULT 'medium',
        target_audience JSONB DEFAULT '["all"]',
        start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        end_at TIMESTAMPTZ,
        is_dismissible BOOLEAN DEFAULT true,
        action_url TEXT,
        action_text VARCHAR(50),
        style JSONB DEFAULT '{}',
        view_count BIGINT DEFAULT 0,
        dismiss_count BIGINT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID NOT NULL
      );

      CREATE TABLE IF NOT EXISTS communication_hub.announcement_dismissals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        announcement_id UUID NOT NULL REFERENCES communication_hub.announcements(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        dismissed_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(announcement_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_announcements_tenant ON communication_hub.announcements(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_announcements_active ON communication_hub.announcements(is_active);
      CREATE INDEX IF NOT EXISTS idx_announcements_dates ON communication_hub.announcements(start_at, end_at);
    `);
    logger.info('Announcements tables initialized');
  }

  async create(tenantId: string | null, createdBy: string, data: z.infer<typeof CreateAnnouncementSchema>): Promise<Announcement> {
    const result = await this.pool.query(
      `INSERT INTO communication_hub.announcements 
       (tenant_id, title, content, type, priority, target_audience, start_at, end_at, 
        is_dismissible, action_url, action_text, style, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        data.isGlobal ? null : tenantId,
        data.title,
        data.content,
        data.type,
        data.priority,
        JSON.stringify(data.targetAudience),
        data.startAt,
        data.endAt || null,
        data.isDismissible,
        data.actionUrl || null,
        data.actionText || null,
        JSON.stringify(data.style),
        createdBy,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async getActiveAnnouncements(tenantId: string, userId: string, audience: string[] = ['all']): Promise<Announcement[]> {
    const now = new Date();
    const result = await this.pool.query(
      `SELECT a.* FROM communication_hub.announcements a
       LEFT JOIN communication_hub.announcement_dismissals d 
         ON a.id = d.announcement_id AND d.user_id = $1
       WHERE a.is_active = true
         AND a.start_at <= $2
         AND (a.end_at IS NULL OR a.end_at > $2)
         AND (a.tenant_id IS NULL OR a.tenant_id = $3)
         AND d.id IS NULL
         AND (a.target_audience ?| $4 OR a.target_audience ? 'all')
       ORDER BY a.priority DESC, a.created_at DESC`,
      [userId, now, tenantId, audience]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async recordView(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE communication_hub.announcements SET view_count = view_count + 1 WHERE id = $1`,
      [id]
    );
  }

  async dismiss(id: string, userId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO communication_hub.announcement_dismissals (announcement_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (announcement_id, user_id) DO NOTHING`,
      [id, userId]
    );
    await this.pool.query(
      `UPDATE communication_hub.announcements SET dismiss_count = dismiss_count + 1 WHERE id = $1`,
      [id]
    );
  }

  async list(tenantId: string | null): Promise<Announcement[]> {
    const result = await this.pool.query(
      `SELECT * FROM communication_hub.announcements 
       WHERE ($1::UUID IS NULL AND tenant_id IS NULL) OR tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async update(id: string, tenantId: string | null, data: Partial<z.infer<typeof CreateAnnouncementSchema>>): Promise<Announcement | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.title !== undefined) { updates.push(`title = $${idx++}`); values.push(data.title); }
    if (data.content !== undefined) { updates.push(`content = $${idx++}`); values.push(data.content); }
    if (data.type !== undefined) { updates.push(`type = $${idx++}`); values.push(data.type); }
    if (data.priority !== undefined) { updates.push(`priority = $${idx++}`); values.push(data.priority); }
    if (data.targetAudience !== undefined) { updates.push(`target_audience = $${idx++}`); values.push(JSON.stringify(data.targetAudience)); }
    if (data.endAt !== undefined) { updates.push(`end_at = $${idx++}`); values.push(data.endAt); }
    if (data.isDismissible !== undefined) { updates.push(`is_dismissible = $${idx++}`); values.push(data.isDismissible); }
    if (data.actionUrl !== undefined) { updates.push(`action_url = $${idx++}`); values.push(data.actionUrl); }
    if (data.actionText !== undefined) { updates.push(`action_text = $${idx++}`); values.push(data.actionText); }

    if (updates.length === 0) return this.get(id, tenantId);

    values.push(id, tenantId);
    const result = await this.pool.query(
      `UPDATE communication_hub.announcements SET ${updates.join(', ')}
       WHERE id = $${idx++} AND (tenant_id = $${idx} OR ($${idx}::UUID IS NULL AND tenant_id IS NULL))
       RETURNING *`,
      values
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async get(id: string, tenantId: string | null): Promise<Announcement | null> {
    const result = await this.pool.query(
      `SELECT * FROM communication_hub.announcements 
       WHERE id = $1 AND (tenant_id = $2 OR ($2::UUID IS NULL AND tenant_id IS NULL) OR tenant_id IS NULL)`,
      [id, tenantId]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async deactivate(id: string, tenantId: string | null): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE communication_hub.announcements SET is_active = false
       WHERE id = $1 AND (tenant_id = $2 OR ($2::UUID IS NULL AND tenant_id IS NULL))`,
      [id, tenantId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): Announcement {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string | null,
      title: row.title as string,
      content: row.content as string,
      type: row.type as Announcement['type'],
      priority: row.priority as Announcement['priority'],
      targetAudience: row.target_audience as string[],
      startAt: row.start_at as Date,
      endAt: row.end_at as Date | null,
      isDismissible: row.is_dismissible as boolean,
      actionUrl: row.action_url as string | null,
      actionText: row.action_text as string | null,
      style: row.style as Record<string, string>,
      viewCount: Number(row.view_count),
      dismissCount: Number(row.dismiss_count),
      isActive: row.is_active as boolean,
      createdAt: row.created_at as Date,
      createdBy: row.created_by as string,
    };
  }
}

// ============================================
// EMAIL TEMPLATE SERVICE
// ============================================

class EmailTemplateService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS communication_hub.email_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        name VARCHAR(100) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        body_html TEXT NOT NULL,
        body_text TEXT,
        variables JSONB DEFAULT '[]',
        category VARCHAR(50) DEFAULT 'general',
        is_active BOOLEAN DEFAULT true,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID NOT NULL,
        UNIQUE(tenant_id, name, version)
      );

      CREATE TABLE IF NOT EXISTS communication_hub.email_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        template_id UUID REFERENCES communication_hub.email_templates(id),
        recipient TEXT NOT NULL,
        subject VARCHAR(500) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        sent_at TIMESTAMPTZ,
        opened_at TIMESTAMPTZ,
        clicked_at TIMESTAMPTZ,
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_email_templates_tenant ON communication_hub.email_templates(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_email_templates_category ON communication_hub.email_templates(category);
      CREATE INDEX IF NOT EXISTS idx_email_logs_tenant ON communication_hub.email_logs(tenant_id);
    `);
    logger.info('Email templates tables initialized');
  }

  extractVariables(html: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables = new Set<string>();
    let match;
    while ((match = regex.exec(html)) !== null) {
      variables.add(match[1]);
    }
    return Array.from(variables);
  }

  async create(tenantId: string | null, createdBy: string, data: z.infer<typeof CreateEmailTemplateSchema>): Promise<EmailTemplate> {
    const variables = this.extractVariables(data.bodyHtml);
    
    const result = await this.pool.query(
      `INSERT INTO communication_hub.email_templates 
       (tenant_id, name, subject, body_html, body_text, variables, category, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.isGlobal ? null : tenantId,
        data.name,
        data.subject,
        data.bodyHtml,
        data.bodyText,
        JSON.stringify(variables),
        data.category,
        createdBy,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async list(tenantId: string | null, category?: string): Promise<EmailTemplate[]> {
    let query = `SELECT * FROM communication_hub.email_templates 
                 WHERE (tenant_id = $1 OR tenant_id IS NULL) AND is_active = true`;
    const params: unknown[] = [tenantId];
    
    if (category) {
      query += ` AND category = $2`;
      params.push(category);
    }
    
    query += ` ORDER BY name ASC`;
    
    const result = await this.pool.query(query, params);
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async get(id: string, tenantId: string | null): Promise<EmailTemplate | null> {
    const result = await this.pool.query(
      `SELECT * FROM communication_hub.email_templates 
       WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)`,
      [id, tenantId]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async getByName(name: string, tenantId: string | null): Promise<EmailTemplate | null> {
    const result = await this.pool.query(
      `SELECT * FROM communication_hub.email_templates 
       WHERE name = $1 AND (tenant_id = $2 OR tenant_id IS NULL) AND is_active = true
       ORDER BY tenant_id NULLS LAST, version DESC
       LIMIT 1`,
      [name, tenantId]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async update(id: string, tenantId: string | null, data: Partial<z.infer<typeof CreateEmailTemplateSchema>>): Promise<EmailTemplate | null> {
    const updates: string[] = ['updated_at = NOW()', 'version = version + 1'];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) { updates.push(`name = $${idx++}`); values.push(data.name); }
    if (data.subject !== undefined) { updates.push(`subject = $${idx++}`); values.push(data.subject); }
    if (data.bodyHtml !== undefined) {
      updates.push(`body_html = $${idx++}`);
      values.push(data.bodyHtml);
      updates.push(`variables = $${idx++}`);
      values.push(JSON.stringify(this.extractVariables(data.bodyHtml)));
    }
    if (data.bodyText !== undefined) { updates.push(`body_text = $${idx++}`); values.push(data.bodyText); }
    if (data.category !== undefined) { updates.push(`category = $${idx++}`); values.push(data.category); }

    values.push(id, tenantId);
    const result = await this.pool.query(
      `UPDATE communication_hub.email_templates SET ${updates.join(', ')}
       WHERE id = $${idx++} AND (tenant_id = $${idx} OR ($${idx}::UUID IS NULL AND tenant_id IS NULL))
       RETURNING *`,
      values
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  renderTemplate(template: EmailTemplate, variables: Record<string, unknown>): { subject: string; html: string; text: string } {
    let subject = template.subject;
    let html = template.bodyHtml;
    let text = template.bodyText;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const strValue = String(value ?? '');
      subject = subject.replace(regex, strValue);
      html = html.replace(regex, strValue);
      text = text.replace(regex, strValue);
    }

    return { subject, html, text };
  }

  private mapRow(row: Record<string, unknown>): EmailTemplate {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string | null,
      name: row.name as string,
      subject: row.subject as string,
      bodyHtml: row.body_html as string,
      bodyText: row.body_text as string,
      variables: row.variables as string[],
      category: row.category as string,
      isActive: row.is_active as boolean,
      version: row.version as number,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
      createdBy: row.created_by as string,
    };
  }
}

// ============================================
// NOTIFICATION SERVICE
// ============================================

class NotificationService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS communication_hub.notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        user_id UUID NOT NULL,
        type VARCHAR(20) DEFAULT 'info',
        channel VARCHAR(20) DEFAULT 'in_app',
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        action_url TEXT,
        metadata JSONB DEFAULT '{}',
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMPTZ,
        sent_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS communication_hub.push_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        user_id UUID NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(endpoint)
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user ON communication_hub.notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON communication_hub.notifications(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_unread ON communication_hub.notifications(user_id, is_read) WHERE is_read = false;
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON communication_hub.push_subscriptions(user_id);
    `);
    logger.info('Notifications tables initialized');
  }

  async send(tenantId: string, data: z.infer<typeof SendNotificationSchema>): Promise<Notification[]> {
    const userIds = data.userId ? [data.userId] : (data.userIds || []);
    const notifications: Notification[] = [];

    for (const userId of userIds) {
      for (const channel of data.channels) {
        const result = await this.pool.query(
          `INSERT INTO communication_hub.notifications 
           (tenant_id, user_id, type, channel, title, message, action_url, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [tenantId, userId, data.type, channel, data.title, data.message, data.actionUrl || null, JSON.stringify(data.metadata)]
        );
        notifications.push(this.mapRow(result.rows[0]));

        // Trigger channel-specific delivery
        if (channel === 'push') {
          await this.sendPushNotification(tenantId, userId, data.title, data.message);
        }
      }
    }

    return notifications;
  }

  async getUserNotifications(tenantId: string, userId: string, options: { unreadOnly?: boolean; limit?: number } = {}): Promise<Notification[]> {
    let query = `SELECT * FROM communication_hub.notifications 
                 WHERE tenant_id = $1 AND user_id = $2`;
    
    if (options.unreadOnly) {
      query += ` AND is_read = false`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $3`;
    
    const result = await this.pool.query(query, [tenantId, userId, options.limit || 50]);
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async markAsRead(id: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE communication_hub.notifications SET is_read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async markAllAsRead(tenantId: string, userId: string): Promise<number> {
    const result = await this.pool.query(
      `UPDATE communication_hub.notifications SET is_read = true, read_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2 AND is_read = false`,
      [tenantId, userId]
    );
    return result.rowCount ?? 0;
  }

  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) FROM communication_hub.notifications 
       WHERE tenant_id = $1 AND user_id = $2 AND is_read = false`,
      [tenantId, userId]
    );
    return parseInt(result.rows[0].count as string);
  }

  async registerPushSubscription(tenantId: string, userId: string, subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
  }): Promise<PushSubscription> {
    const result = await this.pool.query(
      `INSERT INTO communication_hub.push_subscriptions 
       (tenant_id, user_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (endpoint) DO UPDATE SET
         user_id = $2, p256dh = $4, auth = $5, is_active = true
       RETURNING *`,
      [tenantId, userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, subscription.userAgent]
    );
    return this.mapPushRow(result.rows[0]);
  }

  async unregisterPushSubscription(endpoint: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE communication_hub.push_subscriptions SET is_active = false WHERE endpoint = $1`,
      [endpoint]
    );
    return (result.rowCount ?? 0) > 0;
  }

  private async sendPushNotification(tenantId: string, userId: string, title: string, message: string): Promise<void> {
    // Get user's push subscriptions
    const result = await this.pool.query(
      `SELECT * FROM communication_hub.push_subscriptions 
       WHERE tenant_id = $1 AND user_id = $2 AND is_active = true`,
      [tenantId, userId]
    );

    // In production, use web-push library to send
    for (const row of result.rows) {
      logger.info({ userId, endpoint: row.endpoint }, 'Would send push notification');
      // await webpush.sendNotification(subscription, JSON.stringify({ title, message }));
    }
  }

  private mapRow(row: Record<string, unknown>): Notification {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      userId: row.user_id as string,
      type: row.type as Notification['type'],
      channel: row.channel as Notification['channel'],
      title: row.title as string,
      message: row.message as string,
      actionUrl: row.action_url as string | null,
      metadata: row.metadata as Record<string, unknown>,
      isRead: row.is_read as boolean,
      readAt: row.read_at as Date | null,
      sentAt: row.sent_at as Date,
      createdAt: row.created_at as Date,
    };
  }

  private mapPushRow(row: Record<string, unknown>): PushSubscription {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      userId: row.user_id as string,
      endpoint: row.endpoint as string,
      p256dh: row.p256dh as string,
      auth: row.auth as string,
      userAgent: row.user_agent as string,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as Date,
    };
  }
}

// ============================================
// COMMUNICATION HUB SERVER
// ============================================

export class CommunicationHubServer {
  private app: express.Application;
  private pool: Pool;
  private announcementService: AnnouncementService;
  private emailTemplateService: EmailTemplateService;
  private notificationService: NotificationService;

  constructor() {
    this.app = express();
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
    
    this.announcementService = new AnnouncementService(this.pool);
    this.emailTemplateService = new EmailTemplateService(this.pool);
    this.notificationService = new NotificationService(this.pool);

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));

    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', service: 'communication-hub', timestamp: new Date().toISOString() });
    });
  }

  private setupRoutes(): void {
    const router = Router();

    // ============================================
    // ANNOUNCEMENT ROUTES
    // ============================================

    // Get active announcements for user
    router.get('/announcements/active', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const audience = (req.query.audience as string)?.split(',') || ['all'];
        const announcements = await this.announcementService.getActiveAnnouncements(
          req.tenantId!, req.userId!, audience
        );
        res.json({ announcements });
      } catch (error) {
        logger.error({ error }, 'Failed to get announcements');
        res.status(500).json({ error: 'Failed to get announcements' });
      }
    });

    // Create announcement (admin+)
    router.post('/announcements', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = CreateAnnouncementSchema.parse(req.body);
        const tenantId = data.isGlobal && req.isSuperAdmin ? null : req.tenantId!;
        const announcement = await this.announcementService.create(tenantId, req.userId!, data);
        
        logger.info({ announcementId: announcement.id, userId: req.userId }, 'Announcement created');
        res.status(201).json(announcement);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
          logger.error({ error }, 'Failed to create announcement');
          res.status(500).json({ error: 'Failed to create announcement' });
        }
      }
    });

    // List all announcements
    router.get('/announcements', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const includeGlobal = req.query.includeGlobal === 'true' && req.isSuperAdmin;
        const announcements = await this.announcementService.list(includeGlobal ? null : req.tenantId!);
        res.json({ announcements });
      } catch (error) {
        logger.error({ error }, 'Failed to list announcements');
        res.status(500).json({ error: 'Failed to list announcements' });
      }
    });

    // Record announcement view
    router.post('/announcements/:id/view', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        await this.announcementService.recordView(req.params.id);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Failed to record view' });
      }
    });

    // Dismiss announcement
    router.post('/announcements/:id/dismiss', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        await this.announcementService.dismiss(req.params.id, req.userId!);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Failed to dismiss' });
      }
    });

    // Deactivate announcement
    router.post('/announcements/:id/deactivate', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const success = await this.announcementService.deactivate(req.params.id, req.tenantId!);
        if (!success) {
          res.status(404).json({ error: 'Announcement not found' });
          return;
        }
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Failed to deactivate' });
      }
    });

    // ============================================
    // EMAIL TEMPLATE ROUTES
    // ============================================

    // Create email template
    router.post('/email-templates', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = CreateEmailTemplateSchema.parse(req.body);
        const tenantId = data.isGlobal && req.isSuperAdmin ? null : req.tenantId!;
        const template = await this.emailTemplateService.create(tenantId, req.userId!, data);
        
        logger.info({ templateId: template.id, userId: req.userId }, 'Email template created');
        res.status(201).json(template);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
          logger.error({ error }, 'Failed to create email template');
          res.status(500).json({ error: 'Failed to create email template' });
        }
      }
    });

    // List email templates
    router.get('/email-templates', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const category = req.query.category as string | undefined;
        const templates = await this.emailTemplateService.list(req.tenantId!, category);
        res.json({ templates });
      } catch (error) {
        res.status(500).json({ error: 'Failed to list templates' });
      }
    });

    // Get email template
    router.get('/email-templates/:id', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const template = await this.emailTemplateService.get(req.params.id, req.tenantId!);
        if (!template) {
          res.status(404).json({ error: 'Template not found' });
          return;
        }
        res.json(template);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get template' });
      }
    });

    // Preview email template
    router.post('/email-templates/:id/preview', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const template = await this.emailTemplateService.get(req.params.id, req.tenantId!);
        if (!template) {
          res.status(404).json({ error: 'Template not found' });
          return;
        }
        
        const rendered = this.emailTemplateService.renderTemplate(template, req.body.variables || {});
        res.json(rendered);
      } catch (error) {
        res.status(500).json({ error: 'Failed to preview template' });
      }
    });

    // Send email
    router.post('/email/send', this.requireAuth('operator'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = SendEmailSchema.parse(req.body);
        
        let subject: string;
        let html: string;
        let text: string;

        if (data.templateId) {
          const template = await this.emailTemplateService.get(data.templateId, req.tenantId!);
          if (!template) {
            res.status(404).json({ error: 'Template not found' });
            return;
          }
          const rendered = this.emailTemplateService.renderTemplate(template, data.variables);
          subject = rendered.subject;
          html = rendered.html;
          text = rendered.text;
        } else {
          subject = data.subject || 'No Subject';
          html = data.bodyHtml || '';
          text = data.bodyText || '';
        }

        // Log the email (in production, integrate with email service)
        const recipients = Array.isArray(data.to) ? data.to : [data.to];
        for (const recipient of recipients) {
          await this.pool.query(
            `INSERT INTO communication_hub.email_logs 
             (tenant_id, template_id, recipient, subject, status, sent_at)
             VALUES ($1, $2, $3, $4, 'sent', NOW())`,
            [req.tenantId, data.templateId || null, recipient, subject]
          );
        }

        logger.info({ recipients, subject, userId: req.userId }, 'Email sent');
        res.json({ success: true, message: `Email sent to ${recipients.length} recipient(s)` });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
          logger.error({ error }, 'Failed to send email');
          res.status(500).json({ error: 'Failed to send email' });
        }
      }
    });

    // ============================================
    // NOTIFICATION ROUTES
    // ============================================

    // Get user notifications
    router.get('/notifications', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const unreadOnly = req.query.unreadOnly === 'true';
        const limit = parseInt(req.query.limit as string) || 50;
        const notifications = await this.notificationService.getUserNotifications(
          req.tenantId!, req.userId!, { unreadOnly, limit }
        );
        res.json({ notifications });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get notifications' });
      }
    });

    // Get unread count
    router.get('/notifications/unread-count', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const count = await this.notificationService.getUnreadCount(req.tenantId!, req.userId!);
        res.json({ count });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get count' });
      }
    });

    // Send notification
    router.post('/notifications/send', this.requireAuth('operator'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = SendNotificationSchema.parse(req.body);
        const notifications = await this.notificationService.send(req.tenantId!, data);
        
        logger.info({ count: notifications.length, userId: req.userId }, 'Notifications sent');
        res.status(201).json({ notifications, count: notifications.length });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
          logger.error({ error }, 'Failed to send notification');
          res.status(500).json({ error: 'Failed to send notification' });
        }
      }
    });

    // Mark notification as read
    router.post('/notifications/:id/read', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const success = await this.notificationService.markAsRead(req.params.id, req.userId!);
        res.json({ success });
      } catch (error) {
        res.status(500).json({ error: 'Failed to mark as read' });
      }
    });

    // Mark all as read
    router.post('/notifications/read-all', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const count = await this.notificationService.markAllAsRead(req.tenantId!, req.userId!);
        res.json({ success: true, count });
      } catch (error) {
        res.status(500).json({ error: 'Failed to mark all as read' });
      }
    });

    // Register push subscription
    router.post('/push/subscribe', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const subscription = await this.notificationService.registerPushSubscription(
          req.tenantId!, req.userId!, {
            endpoint: req.body.endpoint,
            keys: req.body.keys,
            userAgent: req.headers['user-agent'],
          }
        );
        res.status(201).json(subscription);
      } catch (error) {
        res.status(500).json({ error: 'Failed to register push subscription' });
      }
    });

    // Unregister push subscription
    router.post('/push/unsubscribe', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const success = await this.notificationService.unregisterPushSubscription(req.body.endpoint);
        res.json({ success });
      } catch (error) {
        res.status(500).json({ error: 'Failed to unregister' });
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

  async start(port = 3503): Promise<void> {
    await this.pool.connect();
    
    this.app.listen(port, () => {
      logger.info({ port }, '🚀 Communication Hub API running');
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
  const server = new CommunicationHubServer();
  server.start(parseInt(process.env.COMMUNICATION_HUB_PORT || '3503'));
}

export default CommunicationHubServer;
