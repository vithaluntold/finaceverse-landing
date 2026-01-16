// ============================================
// LEGAL & COMPLIANCE MODULE
// Module 10: ToS Versioning, GDPR, Consent Management
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

type DocumentType = 'terms_of_service' | 'privacy_policy' | 'cookie_policy' | 'dpa' | 'acceptable_use' | 'sla' | 'custom';
type GDPRRequestType = 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
type GDPRRequestStatus = 'pending' | 'in_progress' | 'completed' | 'rejected' | 'expired';

interface LegalDocument {
  id: string;
  tenantId: string | null;
  type: DocumentType;
  title: string;
  content: string;
  version: string;
  effectiveDate: Date;
  expiresAt: Date | null;
  isActive: boolean;
  isMandatory: boolean;
  requiresAcceptance: boolean;
  checksum: string;
  createdAt: Date;
  createdBy: string;
  publishedAt: Date | null;
  publishedBy: string | null;
}

interface UserConsent {
  id: string;
  tenantId: string;
  userId: string;
  documentId: string;
  documentVersion: string;
  ipAddress: string;
  userAgent: string;
  acceptedAt: Date;
  withdrawnAt: Date | null;
  isActive: boolean;
}

interface GDPRRequest {
  id: string;
  tenantId: string;
  requesterId: string;
  requesterEmail: string;
  requestType: GDPRRequestType;
  status: GDPRRequestStatus;
  description: string;
  dataCategories: string[];
  processingNotes: string;
  completedData: Record<string, unknown> | null;
  dueDate: Date;
  completedAt: Date | null;
  completedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ConsentPreference {
  id: string;
  tenantId: string;
  userId: string;
  category: string;
  isGranted: boolean;
  grantedAt: Date | null;
  withdrawnAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateDocumentSchema = z.object({
  type: z.enum(['terms_of_service', 'privacy_policy', 'cookie_policy', 'dpa', 'acceptable_use', 'sla', 'custom']),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+(\.\d+)?$/),
  effectiveDate: z.string().datetime(),
  expiresAt: z.string().datetime().optional().nullable(),
  isMandatory: z.boolean().default(true),
  requiresAcceptance: z.boolean().default(true),
  isGlobal: z.boolean().default(false),
});

const RecordConsentSchema = z.object({
  documentId: z.string().uuid(),
});

const CreateGDPRRequestSchema = z.object({
  requesterEmail: z.string().email(),
  requestType: z.enum(['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection']),
  description: z.string().min(1).max(2000),
  dataCategories: z.array(z.string()).default(['all']),
});

const UpdateGDPRRequestSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'rejected', 'expired']).optional(),
  processingNotes: z.string().optional(),
  completedData: z.record(z.unknown()).optional(),
});

const UpdateConsentPreferencesSchema = z.object({
  preferences: z.array(z.object({
    category: z.string(),
    isGranted: z.boolean(),
  })),
});

// ============================================
// LEGAL DOCUMENT SERVICE
// ============================================

class LegalDocumentService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    await this.pool.query(`
      CREATE SCHEMA IF NOT EXISTS legal_compliance;
      
      CREATE TABLE IF NOT EXISTS legal_compliance.documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        version VARCHAR(20) NOT NULL,
        effective_date TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT false,
        is_mandatory BOOLEAN DEFAULT true,
        requires_acceptance BOOLEAN DEFAULT true,
        checksum VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID NOT NULL,
        published_at TIMESTAMPTZ,
        published_by UUID,
        UNIQUE(tenant_id, type, version)
      );

      CREATE TABLE IF NOT EXISTS legal_compliance.user_consents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        user_id UUID NOT NULL,
        document_id UUID NOT NULL REFERENCES legal_compliance.documents(id),
        document_version VARCHAR(20) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        accepted_at TIMESTAMPTZ DEFAULT NOW(),
        withdrawn_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true
      );

      CREATE INDEX IF NOT EXISTS idx_documents_tenant ON legal_compliance.documents(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_documents_type ON legal_compliance.documents(type);
      CREATE INDEX IF NOT EXISTS idx_consents_user ON legal_compliance.user_consents(user_id);
      CREATE INDEX IF NOT EXISTS idx_consents_document ON legal_compliance.user_consents(document_id);
      CREATE INDEX IF NOT EXISTS idx_consents_active ON legal_compliance.user_consents(user_id, is_active) WHERE is_active = true;
    `);
    logger.info('Legal documents tables initialized');
  }

  private computeChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async create(tenantId: string | null, createdBy: string, data: z.infer<typeof CreateDocumentSchema>): Promise<LegalDocument> {
    const checksum = this.computeChecksum(data.content);
    
    const result = await this.pool.query(
      `INSERT INTO legal_compliance.documents 
       (tenant_id, type, title, content, version, effective_date, expires_at, 
        is_mandatory, requires_acceptance, checksum, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.isGlobal ? null : tenantId,
        data.type,
        data.title,
        data.content,
        data.version,
        data.effectiveDate,
        data.expiresAt || null,
        data.isMandatory,
        data.requiresAcceptance,
        checksum,
        createdBy,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async publish(id: string, tenantId: string | null, publishedBy: string): Promise<LegalDocument | null> {
    // Deactivate previous versions of same type
    const doc = await this.get(id, tenantId);
    if (!doc) return null;

    await this.pool.query(
      `UPDATE legal_compliance.documents SET is_active = false 
       WHERE type = $1 AND (tenant_id = $2 OR ($2::UUID IS NULL AND tenant_id IS NULL)) AND id != $3`,
      [doc.type, tenantId, id]
    );

    const result = await this.pool.query(
      `UPDATE legal_compliance.documents 
       SET is_active = true, published_at = NOW(), published_by = $1
       WHERE id = $2
       RETURNING *`,
      [publishedBy, id]
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async get(id: string, tenantId: string | null): Promise<LegalDocument | null> {
    const result = await this.pool.query(
      `SELECT * FROM legal_compliance.documents 
       WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL OR $2::UUID IS NULL)`,
      [id, tenantId]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async getActiveByType(type: DocumentType, tenantId: string): Promise<LegalDocument | null> {
    const result = await this.pool.query(
      `SELECT * FROM legal_compliance.documents 
       WHERE type = $1 AND is_active = true 
         AND (tenant_id = $2 OR tenant_id IS NULL)
         AND effective_date <= NOW()
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY tenant_id NULLS LAST
       LIMIT 1`,
      [type, tenantId]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async list(tenantId: string | null, type?: DocumentType): Promise<LegalDocument[]> {
    let query = `SELECT * FROM legal_compliance.documents 
                 WHERE (tenant_id = $1 OR tenant_id IS NULL OR $1::UUID IS NULL)`;
    const params: unknown[] = [tenantId];

    if (type) {
      query += ` AND type = $2`;
      params.push(type);
    }

    query += ` ORDER BY type, version DESC`;
    
    const result = await this.pool.query(query, params);
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async getVersionHistory(type: DocumentType, tenantId: string | null): Promise<LegalDocument[]> {
    const result = await this.pool.query(
      `SELECT * FROM legal_compliance.documents 
       WHERE type = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
       ORDER BY version DESC`,
      [type, tenantId]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async recordConsent(tenantId: string, userId: string, documentId: string, ipAddress: string, userAgent: string): Promise<UserConsent> {
    const doc = await this.get(documentId, tenantId);
    if (!doc) throw new Error('Document not found');

    // Withdraw previous consent for same document type
    await this.pool.query(
      `UPDATE legal_compliance.user_consents SET is_active = false, withdrawn_at = NOW()
       WHERE user_id = $1 AND document_id IN (
         SELECT id FROM legal_compliance.documents WHERE type = (SELECT type FROM legal_compliance.documents WHERE id = $2)
       )`,
      [userId, documentId]
    );

    const result = await this.pool.query(
      `INSERT INTO legal_compliance.user_consents 
       (tenant_id, user_id, document_id, document_version, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tenantId, userId, documentId, doc.version, ipAddress, userAgent]
    );

    return this.mapConsentRow(result.rows[0]);
  }

  async getUserConsents(tenantId: string, userId: string): Promise<UserConsent[]> {
    const result = await this.pool.query(
      `SELECT * FROM legal_compliance.user_consents 
       WHERE tenant_id = $1 AND user_id = $2 AND is_active = true
       ORDER BY accepted_at DESC`,
      [tenantId, userId]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapConsentRow(row));
  }

  async checkPendingConsents(tenantId: string, userId: string): Promise<LegalDocument[]> {
    const result = await this.pool.query(
      `SELECT d.* FROM legal_compliance.documents d
       WHERE d.is_active = true 
         AND d.requires_acceptance = true
         AND (d.tenant_id = $1 OR d.tenant_id IS NULL)
         AND d.effective_date <= NOW()
         AND (d.expires_at IS NULL OR d.expires_at > NOW())
         AND NOT EXISTS (
           SELECT 1 FROM legal_compliance.user_consents c
           WHERE c.user_id = $2 
             AND c.document_id = d.id 
             AND c.is_active = true
         )
       ORDER BY d.is_mandatory DESC, d.type`,
      [tenantId, userId]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async withdrawConsent(consentId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE legal_compliance.user_consents 
       SET is_active = false, withdrawn_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [consentId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): LegalDocument {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string | null,
      type: row.type as DocumentType,
      title: row.title as string,
      content: row.content as string,
      version: row.version as string,
      effectiveDate: row.effective_date as Date,
      expiresAt: row.expires_at as Date | null,
      isActive: row.is_active as boolean,
      isMandatory: row.is_mandatory as boolean,
      requiresAcceptance: row.requires_acceptance as boolean,
      checksum: row.checksum as string,
      createdAt: row.created_at as Date,
      createdBy: row.created_by as string,
      publishedAt: row.published_at as Date | null,
      publishedBy: row.published_by as string | null,
    };
  }

  private mapConsentRow(row: Record<string, unknown>): UserConsent {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      userId: row.user_id as string,
      documentId: row.document_id as string,
      documentVersion: row.document_version as string,
      ipAddress: row.ip_address as string,
      userAgent: row.user_agent as string,
      acceptedAt: row.accepted_at as Date,
      withdrawnAt: row.withdrawn_at as Date | null,
      isActive: row.is_active as boolean,
    };
  }
}

// ============================================
// GDPR REQUEST SERVICE
// ============================================

class GDPRService {
  private pool: Pool;
  private readonly SLA_DAYS = 30;

  constructor(pool: Pool) {
    this.pool = pool;
    this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS legal_compliance.gdpr_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        requester_id UUID,
        requester_email VARCHAR(255) NOT NULL,
        request_type VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        description TEXT,
        data_categories JSONB DEFAULT '["all"]',
        processing_notes TEXT,
        completed_data JSONB,
        due_date TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ,
        completed_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS legal_compliance.consent_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        user_id UUID NOT NULL,
        category VARCHAR(50) NOT NULL,
        is_granted BOOLEAN DEFAULT false,
        granted_at TIMESTAMPTZ,
        withdrawn_at TIMESTAMPTZ,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, user_id, category)
      );

      CREATE TABLE IF NOT EXISTS legal_compliance.data_processing_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        user_id UUID NOT NULL,
        action VARCHAR(50) NOT NULL,
        data_category VARCHAR(50),
        description TEXT,
        performed_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_gdpr_requests_tenant ON legal_compliance.gdpr_requests(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON legal_compliance.gdpr_requests(status);
      CREATE INDEX IF NOT EXISTS idx_gdpr_requests_due ON legal_compliance.gdpr_requests(due_date) WHERE status IN ('pending', 'in_progress');
      CREATE INDEX IF NOT EXISTS idx_consent_prefs_user ON legal_compliance.consent_preferences(user_id);
    `);
    logger.info('GDPR tables initialized');
  }

  async createRequest(tenantId: string, requesterId: string | null, data: z.infer<typeof CreateGDPRRequestSchema>): Promise<GDPRRequest> {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + this.SLA_DAYS);

    const result = await this.pool.query(
      `INSERT INTO legal_compliance.gdpr_requests 
       (tenant_id, requester_id, requester_email, request_type, description, data_categories, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        tenantId,
        requesterId,
        data.requesterEmail,
        data.requestType,
        data.description,
        JSON.stringify(data.dataCategories),
        dueDate,
      ]
    );

    const request = this.mapGDPRRow(result.rows[0]);
    
    // Log the request
    await this.logDataProcessing(tenantId, requesterId || 'unknown', 'gdpr_request_created', 'all', 
      `GDPR ${data.requestType} request created`);

    return request;
  }

  async getRequest(id: string, tenantId: string): Promise<GDPRRequest | null> {
    const result = await this.pool.query(
      `SELECT * FROM legal_compliance.gdpr_requests WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    return result.rows.length > 0 ? this.mapGDPRRow(result.rows[0]) : null;
  }

  async listRequests(tenantId: string, status?: GDPRRequestStatus): Promise<GDPRRequest[]> {
    let query = `SELECT * FROM legal_compliance.gdpr_requests WHERE tenant_id = $1`;
    const params: unknown[] = [tenantId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY due_date ASC, created_at DESC`;
    
    const result = await this.pool.query(query, params);
    return result.rows.map((row: Record<string, unknown>) => this.mapGDPRRow(row));
  }

  async updateRequest(id: string, tenantId: string, userId: string, data: z.infer<typeof UpdateGDPRRequestSchema>): Promise<GDPRRequest | null> {
    const updates: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let idx = 1;

    if (data.status !== undefined) { 
      updates.push(`status = $${idx++}`); 
      values.push(data.status);
      if (data.status === 'completed') {
        updates.push(`completed_at = NOW(), completed_by = $${idx++}`);
        values.push(userId);
      }
    }
    if (data.processingNotes !== undefined) { 
      updates.push(`processing_notes = $${idx++}`); 
      values.push(data.processingNotes); 
    }
    if (data.completedData !== undefined) { 
      updates.push(`completed_data = $${idx++}`); 
      values.push(JSON.stringify(data.completedData)); 
    }

    values.push(id, tenantId);
    const result = await this.pool.query(
      `UPDATE legal_compliance.gdpr_requests SET ${updates.join(', ')}
       WHERE id = $${idx++} AND tenant_id = $${idx}
       RETURNING *`,
      values
    );

    if (result.rows.length > 0) {
      const request = this.mapGDPRRow(result.rows[0]);
      await this.logDataProcessing(tenantId, userId, 'gdpr_request_updated', 'all',
        `GDPR request ${id} updated to status: ${data.status || 'unchanged'}`);
      return request;
    }
    return null;
  }

  async getOverdueRequests(tenantId: string): Promise<GDPRRequest[]> {
    const result = await this.pool.query(
      `SELECT * FROM legal_compliance.gdpr_requests 
       WHERE tenant_id = $1 AND status IN ('pending', 'in_progress') AND due_date < NOW()
       ORDER BY due_date ASC`,
      [tenantId]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapGDPRRow(row));
  }

  async getConsentPreferences(tenantId: string, userId: string): Promise<ConsentPreference[]> {
    const result = await this.pool.query(
      `SELECT * FROM legal_compliance.consent_preferences 
       WHERE tenant_id = $1 AND user_id = $2
       ORDER BY category`,
      [tenantId, userId]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapPreferenceRow(row));
  }

  async updateConsentPreferences(tenantId: string, userId: string, preferences: Array<{ category: string; isGranted: boolean }>): Promise<ConsentPreference[]> {
    const results: ConsentPreference[] = [];

    for (const pref of preferences) {
      const result = await this.pool.query(
        `INSERT INTO legal_compliance.consent_preferences 
         (tenant_id, user_id, category, is_granted, granted_at, withdrawn_at, version)
         VALUES ($1, $2, $3, $4, $5, $6, 1)
         ON CONFLICT (tenant_id, user_id, category) DO UPDATE SET
           is_granted = $4,
           granted_at = CASE WHEN $4 = true THEN NOW() ELSE consent_preferences.granted_at END,
           withdrawn_at = CASE WHEN $4 = false THEN NOW() ELSE NULL END,
           version = consent_preferences.version + 1,
           updated_at = NOW()
         RETURNING *`,
        [
          tenantId,
          userId,
          pref.category,
          pref.isGranted,
          pref.isGranted ? new Date() : null,
          pref.isGranted ? null : new Date(),
        ]
      );
      results.push(this.mapPreferenceRow(result.rows[0]));
    }

    await this.logDataProcessing(tenantId, userId, 'consent_preferences_updated', 'preferences',
      `Updated ${preferences.length} consent preferences`);

    return results;
  }

  async exportUserData(tenantId: string, userId: string): Promise<Record<string, unknown>> {
    // Gather all user data for data portability
    const data: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      tenantId,
      userId,
    };

    // Get consents
    const consentsResult = await this.pool.query(
      `SELECT * FROM legal_compliance.user_consents WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId]
    );
    data.consents = consentsResult.rows;

    // Get preferences
    const prefsResult = await this.pool.query(
      `SELECT * FROM legal_compliance.consent_preferences WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId]
    );
    data.consentPreferences = prefsResult.rows;

    // Get processing log
    const logResult = await this.pool.query(
      `SELECT * FROM legal_compliance.data_processing_log WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId]
    );
    data.processingHistory = logResult.rows;

    await this.logDataProcessing(tenantId, userId, 'data_exported', 'all', 'User data exported for portability');

    return data;
  }

  async eraseUserData(tenantId: string, userId: string, performedBy: string): Promise<{ success: boolean; erasedCategories: string[] }> {
    const erasedCategories: string[] = [];

    // Delete consent preferences
    const prefsResult = await this.pool.query(
      `DELETE FROM legal_compliance.consent_preferences WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId]
    );
    if ((prefsResult.rowCount ?? 0) > 0) erasedCategories.push('consent_preferences');

    // Mark consents as withdrawn (keep for audit)
    const consentsResult = await this.pool.query(
      `UPDATE legal_compliance.user_consents SET is_active = false, withdrawn_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId]
    );
    if ((consentsResult.rowCount ?? 0) > 0) erasedCategories.push('consents');

    await this.logDataProcessing(tenantId, userId, 'data_erased', 'all',
      `User data erased. Categories: ${erasedCategories.join(', ')}`, performedBy);

    return { success: true, erasedCategories };
  }

  async logDataProcessing(tenantId: string, userId: string, action: string, category: string, description: string, performedBy?: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO legal_compliance.data_processing_log 
       (tenant_id, user_id, action, data_category, description, performed_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tenantId, userId, action, category, description, performedBy || userId]
    );
  }

  async getProcessingLog(tenantId: string, userId: string): Promise<Array<Record<string, unknown>>> {
    const result = await this.pool.query(
      `SELECT * FROM legal_compliance.data_processing_log 
       WHERE tenant_id = $1 AND user_id = $2
       ORDER BY created_at DESC`,
      [tenantId, userId]
    );
    return result.rows;
  }

  private mapGDPRRow(row: Record<string, unknown>): GDPRRequest {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      requesterId: row.requester_id as string,
      requesterEmail: row.requester_email as string,
      requestType: row.request_type as GDPRRequestType,
      status: row.status as GDPRRequestStatus,
      description: row.description as string,
      dataCategories: row.data_categories as string[],
      processingNotes: row.processing_notes as string,
      completedData: row.completed_data as Record<string, unknown> | null,
      dueDate: row.due_date as Date,
      completedAt: row.completed_at as Date | null,
      completedBy: row.completed_by as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapPreferenceRow(row: Record<string, unknown>): ConsentPreference {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      userId: row.user_id as string,
      category: row.category as string,
      isGranted: row.is_granted as boolean,
      grantedAt: row.granted_at as Date | null,
      withdrawnAt: row.withdrawn_at as Date | null,
      version: row.version as number,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}

// ============================================
// LEGAL COMPLIANCE SERVER
// ============================================

export class LegalComplianceServer {
  private app: express.Application;
  private pool: Pool;
  private documentService: LegalDocumentService;
  private gdprService: GDPRService;

  constructor() {
    this.app = express();
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
    
    this.documentService = new LegalDocumentService(this.pool);
    this.gdprService = new GDPRService(this.pool);

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));

    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', service: 'legal-compliance', timestamp: new Date().toISOString() });
    });
  }

  private setupRoutes(): void {
    const router = Router();

    // ============================================
    // LEGAL DOCUMENT ROUTES
    // ============================================

    // Create legal document (admin+)
    router.post('/documents', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = CreateDocumentSchema.parse(req.body);
        const tenantId = data.isGlobal && req.isSuperAdmin ? null : req.tenantId!;
        const document = await this.documentService.create(tenantId, req.userId!, data);
        
        logger.info({ documentId: document.id, type: document.type }, 'Legal document created');
        res.status(201).json(document);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
          logger.error({ error }, 'Failed to create document');
          res.status(500).json({ error: 'Failed to create document' });
        }
      }
    });

    // Publish document
    router.post('/documents/:id/publish', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const document = await this.documentService.publish(req.params.id, req.tenantId!, req.userId!);
        if (!document) {
          res.status(404).json({ error: 'Document not found' });
          return;
        }
        logger.info({ documentId: document.id }, 'Document published');
        res.json(document);
      } catch (error) {
        res.status(500).json({ error: 'Failed to publish document' });
      }
    });

    // List documents
    router.get('/documents', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const type = req.query.type as DocumentType | undefined;
        const documents = await this.documentService.list(req.tenantId!, type);
        res.json({ documents });
      } catch (error) {
        res.status(500).json({ error: 'Failed to list documents' });
      }
    });

    // Get active document by type (public endpoint for showing to users)
    router.get('/documents/active/:type', async (req: Request, res) => {
      try {
        const type = req.params.type as DocumentType;
        const tenantId = req.headers['x-tenant-id'] as string || 'default';
        const document = await this.documentService.getActiveByType(type, tenantId);
        if (!document) {
          res.status(404).json({ error: 'No active document found' });
          return;
        }
        res.json(document);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get document' });
      }
    });

    // Get version history
    router.get('/documents/history/:type', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const type = req.params.type as DocumentType;
        const documents = await this.documentService.getVersionHistory(type, req.tenantId!);
        res.json({ documents });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get version history' });
      }
    });

    // ============================================
    // CONSENT ROUTES
    // ============================================

    // Record consent
    router.post('/consent', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = RecordConsentSchema.parse(req.body);
        const ipAddress = (req.ip || req.headers['x-forwarded-for'] || 'unknown') as string;
        const userAgent = req.headers['user-agent'] || 'unknown';
        
        const consent = await this.documentService.recordConsent(
          req.tenantId!, req.userId!, data.documentId, ipAddress, userAgent
        );
        
        logger.info({ consentId: consent.id, userId: req.userId, documentId: data.documentId }, 'Consent recorded');
        res.status(201).json(consent);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
          res.status(500).json({ error: 'Failed to record consent' });
        }
      }
    });

    // Get user consents
    router.get('/consent', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const consents = await this.documentService.getUserConsents(req.tenantId!, req.userId!);
        res.json({ consents });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get consents' });
      }
    });

    // Check pending consents
    router.get('/consent/pending', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const pendingDocuments = await this.documentService.checkPendingConsents(req.tenantId!, req.userId!);
        res.json({ pendingDocuments, hasPending: pendingDocuments.length > 0 });
      } catch (error) {
        res.status(500).json({ error: 'Failed to check pending consents' });
      }
    });

    // Withdraw consent
    router.post('/consent/:id/withdraw', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const success = await this.documentService.withdrawConsent(req.params.id, req.userId!);
        if (!success) {
          res.status(404).json({ error: 'Consent not found' });
          return;
        }
        logger.info({ consentId: req.params.id, userId: req.userId }, 'Consent withdrawn');
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Failed to withdraw consent' });
      }
    });

    // ============================================
    // GDPR ROUTES
    // ============================================

    // Create GDPR request
    router.post('/gdpr/requests', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = CreateGDPRRequestSchema.parse(req.body);
        const request = await this.gdprService.createRequest(req.tenantId!, req.userId!, data);
        
        logger.info({ requestId: request.id, type: request.requestType }, 'GDPR request created');
        res.status(201).json(request);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
          res.status(500).json({ error: 'Failed to create GDPR request' });
        }
      }
    });

    // List GDPR requests (admin view)
    router.get('/gdpr/requests', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const status = req.query.status as GDPRRequestStatus | undefined;
        const requests = await this.gdprService.listRequests(req.tenantId!, status);
        res.json({ requests });
      } catch (error) {
        res.status(500).json({ error: 'Failed to list GDPR requests' });
      }
    });

    // Get overdue GDPR requests
    router.get('/gdpr/requests/overdue', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const requests = await this.gdprService.getOverdueRequests(req.tenantId!);
        res.json({ requests, count: requests.length });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get overdue requests' });
      }
    });

    // Get specific GDPR request
    router.get('/gdpr/requests/:id', this.requireAuth('operator'), async (req: AuthenticatedRequest, res) => {
      try {
        const request = await this.gdprService.getRequest(req.params.id, req.tenantId!);
        if (!request) {
          res.status(404).json({ error: 'Request not found' });
          return;
        }
        res.json(request);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get GDPR request' });
      }
    });

    // Update GDPR request
    router.patch('/gdpr/requests/:id', this.requireAuth('operator'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = UpdateGDPRRequestSchema.parse(req.body);
        const request = await this.gdprService.updateRequest(req.params.id, req.tenantId!, req.userId!, data);
        if (!request) {
          res.status(404).json({ error: 'Request not found' });
          return;
        }
        res.json(request);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
          res.status(500).json({ error: 'Failed to update GDPR request' });
        }
      }
    });

    // ============================================
    // CONSENT PREFERENCES ROUTES
    // ============================================

    // Get consent preferences
    router.get('/preferences', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const preferences = await this.gdprService.getConsentPreferences(req.tenantId!, req.userId!);
        res.json({ preferences });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get preferences' });
      }
    });

    // Update consent preferences
    router.put('/preferences', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = UpdateConsentPreferencesSchema.parse(req.body);
        const preferences = await this.gdprService.updateConsentPreferences(
          req.tenantId!, req.userId!, data.preferences
        );
        res.json({ preferences });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
          res.status(500).json({ error: 'Failed to update preferences' });
        }
      }
    });

    // ============================================
    // DATA PORTABILITY ROUTES
    // ============================================

    // Export user data
    router.get('/gdpr/export', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = await this.gdprService.exportUserData(req.tenantId!, req.userId!);
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: 'Failed to export data' });
      }
    });

    // Erase user data (admin only)
    router.delete('/gdpr/erase/:userId', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const result = await this.gdprService.eraseUserData(req.tenantId!, req.params.userId, req.userId!);
        logger.info({ userId: req.params.userId, performedBy: req.userId }, 'User data erased');
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to erase data' });
      }
    });

    // Get data processing log
    router.get('/gdpr/processing-log', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const log = await this.gdprService.getProcessingLog(req.tenantId!, req.userId!);
        res.json({ log });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get processing log' });
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

  async start(port = 3504): Promise<void> {
    await this.pool.connect();
    
    this.app.listen(port, () => {
      logger.info({ port }, '⚖️ Legal & Compliance API running');
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
  const server = new LegalComplianceServer();
  server.start(parseInt(process.env.LEGAL_COMPLIANCE_PORT || '3504'));
}

export default LegalComplianceServer;
