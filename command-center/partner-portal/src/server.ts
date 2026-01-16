// ============================================
// PARTNER PORTAL - API Server
// Express API for partner management
// ============================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { Pool } from 'pg';
import { z } from 'zod';
import { Partner, Reseller, Affiliate, WhiteLabelPartner, Commission, Payout, Referral, PartnerMetrics } from './types/partner';
import {
  requireAuth,
  requireSuperAdmin,
  requireAdmin,
  requireOperator,
  requirePartner,
  enforceTenantIsolation,
  enforcePartnerIsolation,
  auditLogger,
  getAuditLog,
  AuthenticatedRequest
} from './middleware/auth';
import {
  login,
  logout,
  refreshSession,
  createUser,
  createPartnerUser,
  listUsers,
  updateUserPassword,
  deactivateUser,
  invalidateAllUserSessions,
  getUserSessions
} from './services/auth-service';

const logger = pino({ name: 'partner-portal-api' });

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreatePartnerSchema = z.object({
  tenantId: z.string(),
  partnerType: z.enum(['reseller', 'affiliate', 'referral', 'white_label']),
  companyName: z.string(),
  contactName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond']).default('bronze'),
  commissionRate: z.number().min(0).max(100).default(10),
  payoutFrequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly']).default('monthly'),
  payoutMethod: z.enum(['bank_transfer', 'paypal', 'stripe', 'razorpay']).default('bank_transfer'),
  payoutDetails: z.record(z.unknown()).default({}),
  contractStartDate: z.string().transform(s => new Date(s)),
  contractEndDate: z.string().transform(s => new Date(s)).optional(),
  notes: z.string().optional()
});

const CreateCommissionSchema = z.object({
  partnerId: z.string().uuid(),
  customerId: z.string(),
  subscriptionId: z.string().optional(),
  invoiceId: z.string().optional(),
  type: z.enum(['signup', 'recurring', 'upsell', 'renewal', 'referral']),
  amount: z.number().positive(),
  commissionRate: z.number().min(0).max(100),
  currency: z.string().length(3).default('USD')
});

const CreatePayoutSchema = z.object({
  partnerId: z.string().uuid(),
  periodStart: z.string().transform(s => new Date(s)),
  periodEnd: z.string().transform(s => new Date(s)),
  method: z.enum(['bank_transfer', 'paypal', 'stripe', 'razorpay'])
});

// ============================================
// DATABASE SETUP
// ============================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ============================================
// API SERVER CLASS
// ============================================

export class PartnerPortalAPI {
  private app: express.Application;
  private port: number;

  constructor(port: number = 3500) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(pinoHttp({ logger }));
    
    // Audit logging for all requests
    this.app.use(auditLogger);
  }

  private setupRoutes(): void {
    const router = express.Router();

    // Health check (public)
    router.get('/health', (_, res) => {
      res.json({ status: 'healthy', service: 'partner-portal', timestamp: new Date().toISOString() });
    });

    // ============================================
    // AUTHENTICATION ROUTES (PUBLIC)
    // ============================================

    // Login
    router.post('/auth/login', async (req, res) => {
      try {
        const { username, password, totpCode } = req.body;
        
        if (!username || !password) {
          res.status(400).json({ error: 'Username and password required' });
          return;
        }

        const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        const result = await login({ username, password, totpCode }, ip, userAgent);
        
        if (!result.success) {
          res.status(401).json({
            error: result.error,
            code: result.code,
            requiresTOTP: result.requiresTOTP
          });
          return;
        }

        res.json({
          message: 'Login successful',
          token: result.token,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          user: result.user
        });
      } catch (error) {
        logger.error({ error }, 'Login error');
        res.status(500).json({ error: 'Login failed' });
      }
    });

    // Refresh token
    router.post('/auth/refresh', async (req, res) => {
      try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
          res.status(400).json({ error: 'Refresh token required' });
          return;
        }

        const result = await refreshSession(refreshToken);
        
        if (!result.success) {
          res.status(401).json({
            error: result.error,
            code: result.code
          });
          return;
        }

        res.json({
          message: 'Token refreshed',
          token: result.token,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn
        });
      } catch (error) {
        logger.error({ error }, 'Token refresh error');
        res.status(500).json({ error: 'Token refresh failed' });
      }
    });

    // Logout (requires auth)
    router.post('/auth/logout', requireAuth({ minimumRole: 'viewer' }), (req: AuthenticatedRequest, res) => {
      const sessionId = (req as AuthenticatedRequest & { superadminSession?: string }).superadminSession;
      if (sessionId) {
        logout(sessionId);
      }
      res.json({ message: 'Logged out successfully' });
    });

    // ============================================
    // USER MANAGEMENT (SuperAdmin only)
    // ============================================

    // List users
    router.get('/auth/users', requireSuperAdmin, (req: AuthenticatedRequest, res) => {
      const users = listUsers();
      res.json({ users, total: users.length });
    });

    // Create admin/operator user
    router.post('/auth/users', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
      try {
        const { username, email, password, role, tenantId, permissions } = req.body;
        
        if (!username || !email || !password || !role) {
          res.status(400).json({ error: 'Username, email, password, and role required' });
          return;
        }

        const user = await createUser({
          username,
          email,
          password,
          role,
          tenantId: tenantId || 'platform',
          permissions: permissions || [],
          isActive: true,
          totpEnabled: false
        });

        const { passwordHash, totpSecret, ...safeUser } = user;
        res.status(201).json({ message: 'User created', user: safeUser });
      } catch (error) {
        res.status(400).json({ error: (error as Error).message });
      }
    });

    // Create partner user (for partner self-service login)
    router.post('/auth/partner-users', requireAdmin, async (req: AuthenticatedRequest, res) => {
      try {
        const { partnerId, username, email, password, tenantId } = req.body;
        
        if (!partnerId || !username || !email || !password) {
          res.status(400).json({ error: 'Partner ID, username, email, and password required' });
          return;
        }

        const user = await createPartnerUser({
          partnerId,
          username,
          email,
          password,
          tenantId: tenantId || req.tenantId || 'platform'
        });

        const { passwordHash, totpSecret, ...safeUser } = user;
        res.status(201).json({ message: 'Partner user created', user: safeUser });
      } catch (error) {
        res.status(400).json({ error: (error as Error).message });
      }
    });

    // Update user password
    router.put('/auth/users/:username/password', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
      const { username } = req.params;
      const { newPassword } = req.body;
      
      if (!newPassword) {
        res.status(400).json({ error: 'New password required' });
        return;
      }

      const success = await updateUserPassword(username, newPassword);
      if (!success) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ message: 'Password updated successfully' });
    });

    // Deactivate user
    router.delete('/auth/users/:username', requireSuperAdmin, (req: AuthenticatedRequest, res) => {
      const { username } = req.params;
      
      const success = deactivateUser(username);
      if (!success) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Invalidate all sessions
      invalidateAllUserSessions(username);
      res.json({ message: 'User deactivated' });
    });

    // Get user sessions
    router.get('/auth/users/:userId/sessions', requireSuperAdmin, (req: AuthenticatedRequest, res) => {
      const { userId } = req.params;
      const sessions = getUserSessions(userId);
      res.json({ sessions, total: sessions.length });
    });

    // ============================================
    // AUTHENTICATION MIDDLEWARE
    // All routes below require authentication
    // ============================================
    
    router.use(requireAuth({ minimumRole: 'operator' }));
    router.use(enforceTenantIsolation);

    // ============================================
    // PARTNER ENDPOINTS (Admin+)
    // ============================================

    // List all partners (admin+)
    router.get('/partners', requireAdmin, async (req: AuthenticatedRequest, res) => {
      const { tier, status, partnerType } = req.query;
      let query = 'SELECT * FROM partner_portal.partners WHERE 1=1';
      const params: unknown[] = [];

      // Enforce tenant isolation for non-superadmins
      if (!req.isSuperAdmin && req.tenantId) {
        params.push(req.tenantId);
        query += ` AND tenant_id = $${params.length}`;
      }

      if (tier) {
        params.push(tier);
        query += ` AND tier = $${params.length}`;
      }
      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }
      if (partnerType) {
        params.push(partnerType);
        query += ` AND partner_type = $${params.length}`;
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);
      res.json({ partners: result.rows, total: result.rowCount });
    });

    // Get partner by ID (admin+ or own partner)
    router.get('/partners/:id', enforcePartnerIsolation, async (req: AuthenticatedRequest, res) => {
      let query = 'SELECT * FROM partner_portal.partners WHERE id = $1';
      const params: unknown[] = [req.params.id];
      
      // Tenant isolation for non-superadmins
      if (!req.isSuperAdmin && req.tenantId) {
        params.push(req.tenantId);
        query += ` AND tenant_id = $${params.length}`;
      }
      
      const result = await pool.query(query, params);
      
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Partner not found' });
        return;
      }

      res.json(result.rows[0]);
    });

    // Create partner (admin+ required)
    router.post('/partners', requireAdmin, async (req: AuthenticatedRequest, res) => {
      const data = CreatePartnerSchema.parse(req.body);
      
      // Enforce tenant from auth context
      const tenantId = req.isSuperAdmin ? (data.tenantId || req.tenantId) : req.tenantId;
      
      const referralCode = this.generateReferralCode(data.companyName);

      const result = await pool.query(`
        INSERT INTO partner_portal.partners (
          tenant_id, partner_type, company_name, contact_name, email, phone, website,
          tier, commission_rate, payout_frequency, payout_method, payout_details,
          referral_code, contract_start_date, contract_end_date, notes, customer_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `, [
        tenantId, data.partnerType, data.companyName, data.contactName,
        data.email, data.phone, data.website, data.tier, data.commissionRate,
        data.payoutFrequency, data.payoutMethod, JSON.stringify(data.payoutDetails),
        referralCode, data.contractStartDate, data.contractEndDate, data.notes,
        `partner_${referralCode}`
      ]);

      logger.info({ partnerId: result.rows[0].id, email: data.email, userId: req.userId }, 'Partner created');
      res.status(201).json(result.rows[0]);
    });

    // Update partner (admin+ required)
    router.put('/partners/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
      const data = CreatePartnerSchema.partial().parse(req.body);
      
      // Check tenant access
      const existingResult = await pool.query(
        'SELECT tenant_id FROM partner_portal.partners WHERE id = $1',
        [req.params.id]
      );
      
      if (existingResult.rows.length === 0) {
        res.status(404).json({ error: 'Partner not found' });
        return;
      }
      
      if (!req.isSuperAdmin && existingResult.rows[0].tenant_id !== req.tenantId) {
        res.status(404).json({ error: 'Partner not found' });
        return;
      }
      
      const updates: string[] = [];
      const params: unknown[] = [req.params.id];
      let paramIndex = 2;

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && key !== 'tenantId') { // Don't allow tenant change
          updates.push(`${key} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      });

      if (updates.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      const result = await pool.query(`
        UPDATE partner_portal.partners 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, params);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Partner not found' });
        return;
      }

      logger.info({ partnerId: req.params.id, userId: req.userId }, 'Partner updated');
      res.json(result.rows[0]);
    });

    // Delete partner (superadmin only)
    router.delete('/partners/:id', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
      await pool.query('DELETE FROM partner_portal.partners WHERE id = $1', [req.params.id]);
      logger.info({ partnerId: req.params.id, userId: req.userId }, 'Partner deleted');
      res.status(204).send();
    });

    // ============================================
    // COMMISSION ENDPOINTS (Admin+)
    // ============================================

    // List commissions (admin+)
    router.get('/commissions', requireAdmin, async (req: AuthenticatedRequest, res) => {
      const { partnerId, status } = req.query;
      let query = 'SELECT * FROM partner_portal.commissions WHERE 1=1';
      const params: unknown[] = [];

      if (partnerId) {
        params.push(partnerId);
        query += ` AND partner_id = $${params.length}`;
      }
      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);
      res.json({ commissions: result.rows, total: result.rowCount });
    });

    // Create commission (admin+ required)
    router.post('/commissions', requireAdmin, async (req: AuthenticatedRequest, res) => {
      const data = CreateCommissionSchema.parse(req.body);
      
      const commissionAmount = (data.amount * data.commissionRate) / 100;

      const result = await pool.query(`
        INSERT INTO partner_portal.commissions (
          partner_id, customer_id, subscription_id, invoice_id, type,
          amount, commission_rate, commission_amount, currency
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        data.partnerId, data.customerId, data.subscriptionId, data.invoiceId,
        data.type, data.amount, data.commissionRate, commissionAmount, data.currency
      ]);

      // Update partner earnings
      await pool.query(`
        UPDATE partner_portal.partners 
        SET total_earnings = total_earnings + $1,
            pending_payout = pending_payout + $1
        WHERE id = $2
      `, [commissionAmount, data.partnerId]);

      logger.info({ commissionId: result.rows[0].id, partnerId: data.partnerId, amount: commissionAmount, userId: req.userId }, 'Commission created');
      res.status(201).json(result.rows[0]);
    });

    // Approve commission (admin+ required)
    router.post('/commissions/:id/approve', requireAdmin, async (req: AuthenticatedRequest, res) => {
      const result = await pool.query(`
        UPDATE partner_portal.commissions
        SET status = 'approved', approved_by = $2, approved_at = NOW()
        WHERE id = $1 AND status = 'pending'
        RETURNING *
      `, [req.params.id, req.userId]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Commission not found or already processed' });
        return;
      }

      logger.info({ commissionId: req.params.id, userId: req.userId }, 'Commission approved');
      res.json(result.rows[0]);
    });

    // ============================================
    // PAYOUT ENDPOINTS (Admin+)
    // ============================================

    // List payouts (admin+)
    router.get('/payouts', requireAdmin, async (req: AuthenticatedRequest, res) => {
      const { partnerId, status } = req.query;
      let query = 'SELECT * FROM partner_portal.payouts WHERE 1=1';
      const params: unknown[] = [];

      if (partnerId) {
        params.push(partnerId);
        query += ` AND partner_id = $${params.length}`;
      }
      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }

      query += ' ORDER BY initiated_at DESC';

      const result = await pool.query(query, params);
      res.json({ payouts: result.rows, total: result.rowCount });
    });

    // Create payout (admin+ required)
    router.post('/payouts', requireAdmin, async (req: AuthenticatedRequest, res) => {
      const data = CreatePayoutSchema.parse(req.body);

      // Get approved commissions for this partner in the period
      const commissionsResult = await pool.query(`
        SELECT id, commission_amount
        FROM partner_portal.commissions
        WHERE partner_id = $1 
          AND status = 'approved'
          AND created_at >= $2
          AND created_at < $3 + INTERVAL '1 day'
          AND payout_id IS NULL
      `, [data.partnerId, data.periodStart, data.periodEnd]);

      if (commissionsResult.rows.length === 0) {
        res.status(400).json({ error: 'No approved commissions found for this period' });
        return;
      }

      const totalAmount = commissionsResult.rows.reduce((sum, c) => 
        sum + parseFloat(String(c.commission_amount)), 0
      );
      const commissionIds = commissionsResult.rows.map(c => c.id);

      // Create payout
      const payoutResult = await pool.query(`
        INSERT INTO partner_portal.payouts (
          partner_id, amount, method, period_start, period_end,
          commission_ids, initiated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        data.partnerId, totalAmount, data.method, data.periodStart,
        data.periodEnd, JSON.stringify(commissionIds), req.userId
      ]);

      // Update commissions with payout_id
      await pool.query(`
        UPDATE partner_portal.commissions
        SET payout_id = $1, status = 'paid', paid_at = NOW()
        WHERE id = ANY($2::uuid[])
      `, [payoutResult.rows[0].id, commissionIds]);

      // Update partner totals
      await pool.query(`
        UPDATE partner_portal.partners
        SET total_paid_out = total_paid_out + $1,
            pending_payout = pending_payout - $1,
            last_payout_at = NOW()
        WHERE id = $2
      `, [totalAmount, data.partnerId]);

      logger.info({ payoutId: payoutResult.rows[0].id, partnerId: data.partnerId, amount: totalAmount, userId: req.userId }, 'Payout created');
      res.status(201).json(payoutResult.rows[0]);
    });

    // ============================================
    // REFERRAL ENDPOINTS
    // ============================================

    // Track referral click
    router.post('/referrals/track', async (req, res) => {
      const { referralCode, landingUrl, referrerUrl, ipAddress, userAgent } = req.body;

      const partnerResult = await pool.query(
        'SELECT id FROM partner_portal.partners WHERE referral_code = $1',
        [referralCode]
      );

      if (partnerResult.rows.length === 0) {
        res.status(404).json({ error: 'Invalid referral code' });
        return;
      }

      const result = await pool.query(`
        INSERT INTO partner_portal.referrals (
          partner_id, referral_code, landing_url, referrer_url, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        partnerResult.rows[0].id, referralCode, landingUrl, referrerUrl,
        ipAddress, userAgent
      ]);

      res.status(201).json({ referralId: result.rows[0].id });
    });

    // Convert referral
    router.post('/referrals/:id/convert', async (req, res) => {
      const { customerId, conversionValue, commissionRate } = req.body;

      const result = await pool.query(`
        UPDATE partner_portal.referrals
        SET converted = true, customer_id = $2, conversion_value = $3, conversion_date = NOW()
        WHERE id = $1
        RETURNING *
      `, [req.params.id, customerId, conversionValue]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Referral not found' });
        return;
      }

      const referral = result.rows[0];

      // Create commission
      const commissionAmount = (conversionValue * commissionRate) / 100;
      const commissionResult = await pool.query(`
        INSERT INTO partner_portal.commissions (
          partner_id, customer_id, type, amount, commission_rate, commission_amount, currency
        ) VALUES ($1, $2, 'referral', $3, $4, $5, 'USD')
        RETURNING *
      `, [referral.partner_id, customerId, conversionValue, commissionRate, commissionAmount]);

      // Update referral with commission ID
      await pool.query(
        'UPDATE partner_portal.referrals SET commission_id = $1 WHERE id = $2',
        [commissionResult.rows[0].id, req.params.id]
      );

      res.json({ referral: result.rows[0], commission: commissionResult.rows[0] });
    });

    // ============================================
    // METRICS ENDPOINTS
    // ============================================

    // Get partner metrics
    router.get('/partners/:id/metrics', async (req, res) => {
      const { startDate, endDate } = req.query;

      const result = await pool.query(`
        SELECT * FROM partner_portal.partner_metrics
        WHERE partner_id = $1
          AND period_start >= $2
          AND period_end <= $3
        ORDER BY period_start DESC
      `, [req.params.id, startDate, endDate]);

      res.json({ metrics: result.rows });
    });

    // Calculate metrics (admin+ required)
    router.post('/partners/:id/metrics/calculate', requireAdmin, async (req: AuthenticatedRequest, res) => {
      const { startDate, endDate } = req.body;

      await pool.query(
        'SELECT partner_portal.calculate_partner_metrics($1, $2, $3)',
        [req.params.id, startDate, endDate]
      );

      logger.info({ partnerId: req.params.id, userId: req.userId }, 'Metrics calculated');
      res.json({ success: true, message: 'Metrics calculated successfully' });
    });

    // ============================================
    // AUDIT LOG (SuperAdmin only)
    // ============================================

    router.get('/audit', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
      const { userId, partnerId, tenantId, limit = 100 } = req.query;
      
      const entries = getAuditLog({
        userId: userId as string,
        partnerId: partnerId as string,
        tenantId: tenantId as string,
        limit: Number(limit)
      });

      res.json({ entries, total: entries.length });
    });

    this.app.use('/api/v1', router);
  }

  private setupErrorHandling(): void {
    this.app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      logger.error({ err }, 'Unhandled error');
      res.status(500).json({ error: 'Internal server error', message: err.message });
    });
  }

  private generateReferralCode(companyName: string): string {
    const cleaned = companyName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${cleaned.substring(0, 6)}${random}`;
  }

  public async start(): Promise<void> {
    this.app.listen(this.port, () => {
      logger.info({ port: this.port }, 'Partner Portal API started');
    });
  }
}

// Start server if run directly
if (require.main === module) {
  const api = new PartnerPortalAPI();
  api.start().catch(err => {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  });
}
