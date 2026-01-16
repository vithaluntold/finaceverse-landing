// ============================================
// BUSINESS INTELLIGENCE - Module 14
// Revenue Analytics, Customer Health, Forecasting
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
  info: (obj: object | string, msg?: string) => console.log(JSON.stringify({ level: 'info', ...(typeof obj === 'string' ? { msg: obj } : { ...obj, msg }) })),
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

interface RevenueMetric {
  id: string;
  tenantId: string;
  metricDate: Date;
  mrr: number;
  arr: number;
  newMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnMrr: number;
  netNewMrr: number;
  activeSubscriptions: number;
  newSubscriptions: number;
  churnedSubscriptions: number;
  arpu: number;
  createdAt: Date;
}

interface CustomerHealth {
  id: string;
  tenantId: string;
  customerId: string;
  healthScore: number;
  engagementScore: number;
  usageScore: number;
  paymentScore: number;
  supportScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastActivityAt: Date;
  factors: Record<string, unknown>;
  calculatedAt: Date;
  createdAt: Date;
}

interface CohortData {
  id: string;
  tenantId: string;
  cohortMonth: string;
  monthNumber: number;
  customersStart: number;
  customersRetained: number;
  retentionRate: number;
  revenueStart: number;
  revenueRetained: number;
  revenueRetentionRate: number;
  createdAt: Date;
}

interface ChurnEvent {
  id: string;
  tenantId: string;
  customerId: string;
  churnerAt: Date;
  mrr: number;
  reason: string;
  feedbackNotes: string | null;
  wasPreventable: boolean;
  preventionAttempts: number;
  createdAt: Date;
}

interface Forecast {
  id: string;
  tenantId: string;
  forecastDate: Date;
  metricName: string;
  forecastedValue: number;
  confidenceLow: number;
  confidenceHigh: number;
  confidence: number;
  model: string;
  createdAt: Date;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const RecordRevenueSchema = z.object({
  metricDate: z.string().datetime(),
  mrr: z.number().min(0),
  newMrr: z.number().min(0).default(0),
  expansionMrr: z.number().min(0).default(0),
  contractionMrr: z.number().min(0).default(0),
  churnMrr: z.number().min(0).default(0),
  activeSubscriptions: z.number().min(0).default(0),
  newSubscriptions: z.number().min(0).default(0),
  churnedSubscriptions: z.number().min(0).default(0),
});

const RecordCustomerHealthSchema = z.object({
  customerId: z.string().uuid(),
  engagementScore: z.number().min(0).max(100),
  usageScore: z.number().min(0).max(100),
  paymentScore: z.number().min(0).max(100),
  supportScore: z.number().min(0).max(100),
  lastActivityAt: z.string().datetime(),
  factors: z.record(z.unknown()).default({}),
});

const RecordChurnSchema = z.object({
  customerId: z.string().uuid(),
  churnedAt: z.string().datetime(),
  mrr: z.number().min(0),
  reason: z.enum([
    'price', 'competitor', 'no_longer_needed', 'poor_support',
    'missing_features', 'technical_issues', 'business_closed', 'other'
  ]),
  feedbackNotes: z.string().optional(),
  wasPreventable: z.boolean().default(false),
  preventionAttempts: z.number().min(0).default(0),
});

const GenerateForecastSchema = z.object({
  metricName: z.enum(['mrr', 'arr', 'activeSubscriptions', 'churnRate']),
  months: z.number().min(1).max(24).default(6),
});

// ============================================
// REVENUE SERVICE
// ============================================

class RevenueService {
  private pool: PoolType;

  constructor(pool: PoolType) {
    this.pool = pool;
    this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    await this.pool.query(`
      CREATE SCHEMA IF NOT EXISTS business_intelligence;
      
      CREATE TABLE IF NOT EXISTS business_intelligence.revenue_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        metric_date DATE NOT NULL,
        mrr NUMERIC NOT NULL DEFAULT 0,
        arr NUMERIC GENERATED ALWAYS AS (mrr * 12) STORED,
        new_mrr NUMERIC DEFAULT 0,
        expansion_mrr NUMERIC DEFAULT 0,
        contraction_mrr NUMERIC DEFAULT 0,
        churn_mrr NUMERIC DEFAULT 0,
        net_new_mrr NUMERIC GENERATED ALWAYS AS (new_mrr + expansion_mrr - contraction_mrr - churn_mrr) STORED,
        active_subscriptions INTEGER DEFAULT 0,
        new_subscriptions INTEGER DEFAULT 0,
        churned_subscriptions INTEGER DEFAULT 0,
        arpu NUMERIC GENERATED ALWAYS AS (CASE WHEN active_subscriptions > 0 THEN mrr / active_subscriptions ELSE 0 END) STORED,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, metric_date)
      );

      CREATE INDEX IF NOT EXISTS idx_revenue_tenant ON business_intelligence.revenue_metrics(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_revenue_date ON business_intelligence.revenue_metrics(metric_date);
    `);
    logger.info('Revenue tables initialized');
  }

  async record(tenantId: string, data: z.infer<typeof RecordRevenueSchema>): Promise<RevenueMetric> {
    const result = await this.pool.query(
      `INSERT INTO business_intelligence.revenue_metrics 
       (tenant_id, metric_date, mrr, new_mrr, expansion_mrr, contraction_mrr, churn_mrr,
        active_subscriptions, new_subscriptions, churned_subscriptions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (tenant_id, metric_date) DO UPDATE SET
         mrr = $3, new_mrr = $4, expansion_mrr = $5, contraction_mrr = $6, churn_mrr = $7,
         active_subscriptions = $8, new_subscriptions = $9, churned_subscriptions = $10
       RETURNING *`,
      [
        tenantId,
        data.metricDate,
        data.mrr,
        data.newMrr,
        data.expansionMrr,
        data.contractionMrr,
        data.churnMrr,
        data.activeSubscriptions,
        data.newSubscriptions,
        data.churnedSubscriptions,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async getMetrics(tenantId: string, startDate: Date, endDate: Date): Promise<RevenueMetric[]> {
    const result = await this.pool.query(
      `SELECT * FROM business_intelligence.revenue_metrics 
       WHERE tenant_id = $1 AND metric_date >= $2 AND metric_date <= $3
       ORDER BY metric_date ASC`,
      [tenantId, startDate, endDate]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async getLatest(tenantId: string): Promise<RevenueMetric | null> {
    const result = await this.pool.query(
      `SELECT * FROM business_intelligence.revenue_metrics 
       WHERE tenant_id = $1 ORDER BY metric_date DESC LIMIT 1`,
      [tenantId]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async getDashboard(tenantId: string): Promise<Record<string, unknown>> {
    const latest = await this.getLatest(tenantId);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const metrics = await this.getMetrics(tenantId, thirtyDaysAgo, new Date());

    const previousMonth = metrics.length >= 2 ? metrics[0] : null;
    const currentMonth = latest;

    return {
      current: {
        mrr: currentMonth?.mrr || 0,
        arr: currentMonth?.arr || 0,
        activeSubscriptions: currentMonth?.activeSubscriptions || 0,
        arpu: currentMonth?.arpu || 0,
      },
      growth: {
        mrrGrowth: previousMonth && currentMonth
          ? ((currentMonth.mrr - previousMonth.mrr) / previousMonth.mrr * 100).toFixed(2)
          : 0,
        subscriptionGrowth: previousMonth && currentMonth
          ? ((currentMonth.activeSubscriptions - previousMonth.activeSubscriptions) / previousMonth.activeSubscriptions * 100).toFixed(2)
          : 0,
      },
      last30Days: {
        totalNewMrr: metrics.reduce((sum, m) => sum + m.newMrr, 0),
        totalExpansionMrr: metrics.reduce((sum, m) => sum + m.expansionMrr, 0),
        totalChurnMrr: metrics.reduce((sum, m) => sum + m.churnMrr, 0),
        netNewMrr: metrics.reduce((sum, m) => sum + m.netNewMrr, 0),
        newSubscriptions: metrics.reduce((sum, m) => sum + m.newSubscriptions, 0),
        churnedSubscriptions: metrics.reduce((sum, m) => sum + m.churnedSubscriptions, 0),
      },
      trend: metrics.map(m => ({
        date: m.metricDate,
        mrr: m.mrr,
        arr: m.arr,
        subscriptions: m.activeSubscriptions,
      })),
    };
  }

  private mapRow(row: Record<string, unknown>): RevenueMetric {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      metricDate: row.metric_date as Date,
      mrr: Number(row.mrr),
      arr: Number(row.arr),
      newMrr: Number(row.new_mrr),
      expansionMrr: Number(row.expansion_mrr),
      contractionMrr: Number(row.contraction_mrr),
      churnMrr: Number(row.churn_mrr),
      netNewMrr: Number(row.net_new_mrr),
      activeSubscriptions: row.active_subscriptions as number,
      newSubscriptions: row.new_subscriptions as number,
      churnedSubscriptions: row.churned_subscriptions as number,
      arpu: Number(row.arpu),
      createdAt: row.created_at as Date,
    };
  }
}

// ============================================
// CUSTOMER HEALTH SERVICE
// ============================================

class CustomerHealthService {
  private pool: PoolType;

  constructor(pool: PoolType) {
    this.pool = pool;
    this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS business_intelligence.customer_health (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        customer_id UUID NOT NULL,
        health_score NUMERIC NOT NULL,
        engagement_score NUMERIC NOT NULL,
        usage_score NUMERIC NOT NULL,
        payment_score NUMERIC NOT NULL,
        support_score NUMERIC NOT NULL,
        risk_level VARCHAR(20) NOT NULL,
        last_activity_at TIMESTAMPTZ,
        factors JSONB DEFAULT '{}',
        calculated_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_health_tenant ON business_intelligence.customer_health(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_health_customer ON business_intelligence.customer_health(customer_id);
      CREATE INDEX IF NOT EXISTS idx_health_risk ON business_intelligence.customer_health(risk_level);
    `);
    logger.info('Customer health tables initialized');
  }

  calculateHealthScore(data: z.infer<typeof RecordCustomerHealthSchema>): { score: number; riskLevel: 'low' | 'medium' | 'high' | 'critical' } {
    // Weighted average of scores
    const weights = { engagement: 0.3, usage: 0.3, payment: 0.25, support: 0.15 };
    const score = (
      data.engagementScore * weights.engagement +
      data.usageScore * weights.usage +
      data.paymentScore * weights.payment +
      data.supportScore * weights.support
    );

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (score >= 80) riskLevel = 'low';
    else if (score >= 60) riskLevel = 'medium';
    else if (score >= 40) riskLevel = 'high';
    else riskLevel = 'critical';

    return { score, riskLevel };
  }

  async record(tenantId: string, data: z.infer<typeof RecordCustomerHealthSchema>): Promise<CustomerHealth> {
    const { score, riskLevel } = this.calculateHealthScore(data);

    const result = await this.pool.query(
      `INSERT INTO business_intelligence.customer_health 
       (tenant_id, customer_id, health_score, engagement_score, usage_score, payment_score, support_score,
        risk_level, last_activity_at, factors)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        tenantId,
        data.customerId,
        score,
        data.engagementScore,
        data.usageScore,
        data.paymentScore,
        data.supportScore,
        riskLevel,
        data.lastActivityAt,
        JSON.stringify(data.factors),
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async getByCustomer(tenantId: string, customerId: string): Promise<CustomerHealth[]> {
    const result = await this.pool.query(
      `SELECT * FROM business_intelligence.customer_health 
       WHERE tenant_id = $1 AND customer_id = $2
       ORDER BY calculated_at DESC`,
      [tenantId, customerId]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async getLatestByCustomer(tenantId: string, customerId: string): Promise<CustomerHealth | null> {
    const result = await this.pool.query(
      `SELECT * FROM business_intelligence.customer_health 
       WHERE tenant_id = $1 AND customer_id = $2
       ORDER BY calculated_at DESC LIMIT 1`,
      [tenantId, customerId]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async getAtRiskCustomers(tenantId: string, riskLevels: string[] = ['high', 'critical']): Promise<CustomerHealth[]> {
    const result = await this.pool.query(
      `SELECT DISTINCT ON (customer_id) * FROM business_intelligence.customer_health 
       WHERE tenant_id = $1 AND risk_level = ANY($2)
       ORDER BY customer_id, calculated_at DESC`,
      [tenantId, riskLevels]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async getHealthDistribution(tenantId: string): Promise<Record<string, number>> {
    const result = await this.pool.query(
      `SELECT risk_level, COUNT(DISTINCT customer_id) as count 
       FROM (
         SELECT DISTINCT ON (customer_id) customer_id, risk_level 
         FROM business_intelligence.customer_health 
         WHERE tenant_id = $1
         ORDER BY customer_id, calculated_at DESC
       ) latest
       GROUP BY risk_level`,
      [tenantId]
    );

    const distribution: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    result.rows.forEach((row: Record<string, unknown>) => {
      distribution[row.risk_level as string] = Number(row.count);
    });
    return distribution;
  }

  private mapRow(row: Record<string, unknown>): CustomerHealth {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      customerId: row.customer_id as string,
      healthScore: Number(row.health_score),
      engagementScore: Number(row.engagement_score),
      usageScore: Number(row.usage_score),
      paymentScore: Number(row.payment_score),
      supportScore: Number(row.support_score),
      riskLevel: row.risk_level as CustomerHealth['riskLevel'],
      lastActivityAt: row.last_activity_at as Date,
      factors: row.factors as Record<string, unknown>,
      calculatedAt: row.calculated_at as Date,
      createdAt: row.created_at as Date,
    };
  }
}

// ============================================
// COHORT SERVICE
// ============================================

class CohortService {
  private pool: PoolType;

  constructor(pool: PoolType) {
    this.pool = pool;
    this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS business_intelligence.cohort_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        cohort_month VARCHAR(7) NOT NULL,
        month_number INTEGER NOT NULL,
        customers_start INTEGER NOT NULL,
        customers_retained INTEGER NOT NULL,
        retention_rate NUMERIC GENERATED ALWAYS AS (
          CASE WHEN customers_start > 0 THEN customers_retained::NUMERIC / customers_start * 100 ELSE 0 END
        ) STORED,
        revenue_start NUMERIC NOT NULL DEFAULT 0,
        revenue_retained NUMERIC NOT NULL DEFAULT 0,
        revenue_retention_rate NUMERIC GENERATED ALWAYS AS (
          CASE WHEN revenue_start > 0 THEN revenue_retained / revenue_start * 100 ELSE 0 END
        ) STORED,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, cohort_month, month_number)
      );

      CREATE INDEX IF NOT EXISTS idx_cohort_tenant ON business_intelligence.cohort_data(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_cohort_month ON business_intelligence.cohort_data(cohort_month);
    `);
    logger.info('Cohort tables initialized');
  }

  async recordCohort(tenantId: string, cohortMonth: string, monthNumber: number, data: {
    customersStart: number;
    customersRetained: number;
    revenueStart: number;
    revenueRetained: number;
  }): Promise<CohortData> {
    const result = await this.pool.query(
      `INSERT INTO business_intelligence.cohort_data 
       (tenant_id, cohort_month, month_number, customers_start, customers_retained, revenue_start, revenue_retained)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, cohort_month, month_number) DO UPDATE SET
         customers_retained = $5, revenue_retained = $7
       RETURNING *`,
      [tenantId, cohortMonth, monthNumber, data.customersStart, data.customersRetained, data.revenueStart, data.revenueRetained]
    );
    return this.mapRow(result.rows[0]);
  }

  async getCohortTable(tenantId: string): Promise<Record<string, unknown>> {
    const result = await this.pool.query(
      `SELECT * FROM business_intelligence.cohort_data 
       WHERE tenant_id = $1
       ORDER BY cohort_month DESC, month_number ASC`,
      [tenantId]
    );

    // Transform into cohort table format
    const cohorts: Record<string, Record<number, unknown>> = {};
    result.rows.forEach((row: Record<string, unknown>) => {
      const month = row.cohort_month as string;
      if (!cohorts[month]) cohorts[month] = {};
      cohorts[month][row.month_number as number] = {
        customersRetained: row.customers_retained,
        retentionRate: Number(row.retention_rate).toFixed(1),
        revenueRetained: row.revenue_retained,
        revenueRetentionRate: Number(row.revenue_retention_rate).toFixed(1),
      };
    });

    return cohorts;
  }

  async getAverageRetention(tenantId: string): Promise<Record<number, number>> {
    const result = await this.pool.query(
      `SELECT month_number, AVG(retention_rate) as avg_retention
       FROM business_intelligence.cohort_data 
       WHERE tenant_id = $1
       GROUP BY month_number
       ORDER BY month_number`,
      [tenantId]
    );

    const averages: Record<number, number> = {};
    result.rows.forEach((row: Record<string, unknown>) => {
      averages[row.month_number as number] = Number(Number(row.avg_retention).toFixed(1));
    });
    return averages;
  }

  private mapRow(row: Record<string, unknown>): CohortData {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      cohortMonth: row.cohort_month as string,
      monthNumber: row.month_number as number,
      customersStart: row.customers_start as number,
      customersRetained: row.customers_retained as number,
      retentionRate: Number(row.retention_rate),
      revenueStart: Number(row.revenue_start),
      revenueRetained: Number(row.revenue_retained),
      revenueRetentionRate: Number(row.revenue_retention_rate),
      createdAt: row.created_at as Date,
    };
  }
}

// ============================================
// CHURN SERVICE
// ============================================

class ChurnService {
  private pool: PoolType;

  constructor(pool: PoolType) {
    this.pool = pool;
    this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS business_intelligence.churn_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        customer_id UUID NOT NULL,
        churned_at TIMESTAMPTZ NOT NULL,
        mrr NUMERIC NOT NULL DEFAULT 0,
        reason VARCHAR(50) NOT NULL,
        feedback_notes TEXT,
        was_preventable BOOLEAN DEFAULT false,
        prevention_attempts INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_churn_tenant ON business_intelligence.churn_events(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_churn_date ON business_intelligence.churn_events(churned_at);
      CREATE INDEX IF NOT EXISTS idx_churn_reason ON business_intelligence.churn_events(reason);
    `);
    logger.info('Churn tables initialized');
  }

  async record(tenantId: string, data: z.infer<typeof RecordChurnSchema>): Promise<ChurnEvent> {
    const result = await this.pool.query(
      `INSERT INTO business_intelligence.churn_events 
       (tenant_id, customer_id, churned_at, mrr, reason, feedback_notes, was_preventable, prevention_attempts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        tenantId,
        data.customerId,
        data.churnedAt,
        data.mrr,
        data.reason,
        data.feedbackNotes || null,
        data.wasPreventable,
        data.preventionAttempts,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async getChurnEvents(tenantId: string, startDate: Date, endDate: Date): Promise<ChurnEvent[]> {
    const result = await this.pool.query(
      `SELECT * FROM business_intelligence.churn_events 
       WHERE tenant_id = $1 AND churned_at >= $2 AND churned_at <= $3
       ORDER BY churned_at DESC`,
      [tenantId, startDate, endDate]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async getChurnAnalysis(tenantId: string, startDate: Date, endDate: Date): Promise<Record<string, unknown>> {
    const events = await this.getChurnEvents(tenantId, startDate, endDate);

    // Group by reason
    const byReason: Record<string, { count: number; mrr: number }> = {};
    events.forEach(e => {
      if (!byReason[e.reason]) byReason[e.reason] = { count: 0, mrr: 0 };
      byReason[e.reason].count++;
      byReason[e.reason].mrr += e.mrr;
    });

    // Calculate preventability
    const preventable = events.filter(e => e.wasPreventable);

    return {
      totalChurned: events.length,
      totalMrrLost: events.reduce((sum, e) => sum + e.mrr, 0),
      byReason: Object.entries(byReason).map(([reason, data]) => ({
        reason,
        count: data.count,
        mrrLost: data.mrr,
        percentage: (data.count / events.length * 100).toFixed(1),
      })).sort((a, b) => b.count - a.count),
      preventability: {
        preventableCount: preventable.length,
        preventablePercentage: (preventable.length / events.length * 100).toFixed(1),
        preventableMrr: preventable.reduce((sum, e) => sum + e.mrr, 0),
        avgPreventionAttempts: preventable.length > 0
          ? (preventable.reduce((sum, e) => sum + e.preventionAttempts, 0) / preventable.length).toFixed(1)
          : 0,
      },
      period: { start: startDate, end: endDate },
    };
  }

  private mapRow(row: Record<string, unknown>): ChurnEvent {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      customerId: row.customer_id as string,
      churnerAt: row.churned_at as Date,
      mrr: Number(row.mrr),
      reason: row.reason as string,
      feedbackNotes: row.feedback_notes as string | null,
      wasPreventable: row.was_preventable as boolean,
      preventionAttempts: row.prevention_attempts as number,
      createdAt: row.created_at as Date,
    };
  }
}

// ============================================
// FORECAST SERVICE
// ============================================

class ForecastService {
  private pool: PoolType;
  private revenueService: RevenueService;

  constructor(pool: PoolType, revenueService: RevenueService) {
    this.pool = pool;
    this.revenueService = revenueService;
    this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS business_intelligence.forecasts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        forecast_date DATE NOT NULL,
        metric_name VARCHAR(50) NOT NULL,
        forecasted_value NUMERIC NOT NULL,
        confidence_low NUMERIC NOT NULL,
        confidence_high NUMERIC NOT NULL,
        confidence NUMERIC NOT NULL,
        model VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_forecast_tenant ON business_intelligence.forecasts(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_forecast_metric ON business_intelligence.forecasts(metric_name);
    `);
    logger.info('Forecast tables initialized');
  }

  async generate(tenantId: string, data: z.infer<typeof GenerateForecastSchema>): Promise<Forecast[]> {
    // Get historical data
    const startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000); // 6 months
    const endDate = new Date();
    const historical = await this.revenueService.getMetrics(tenantId, startDate, endDate);

    if (historical.length < 3) {
      throw new Error('Insufficient historical data for forecasting');
    }

    // Simple linear regression forecast
    const values = historical.map(m => {
      switch (data.metricName) {
        case 'mrr': return m.mrr;
        case 'arr': return m.arr;
        case 'activeSubscriptions': return m.activeSubscriptions;
        case 'churnRate': return m.churnedSubscriptions / (m.activeSubscriptions || 1) * 100;
        default: return m.mrr;
      }
    });

    // Calculate trend
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    values.forEach((y, x) => {
      numerator += (x - xMean) * (y - yMean);
      denominator += (x - xMean) ** 2;
    });
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    // Generate forecasts
    const forecasts: Forecast[] = [];
    const variance = values.reduce((sum, v) => sum + (v - yMean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);

    for (let month = 1; month <= data.months; month++) {
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + month);
      
      const forecastedValue = intercept + slope * (n - 1 + month);
      const confidence = Math.max(0.5, 1 - (month * 0.05)); // Confidence decreases over time
      const marginOfError = stdDev * (1.96 / Math.sqrt(n)) * (1 + month * 0.1);

      const result = await this.pool.query(
        `INSERT INTO business_intelligence.forecasts 
         (tenant_id, forecast_date, metric_name, forecasted_value, confidence_low, confidence_high, confidence, model)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          tenantId,
          forecastDate,
          data.metricName,
          Math.max(0, forecastedValue),
          Math.max(0, forecastedValue - marginOfError),
          forecastedValue + marginOfError,
          confidence,
          'linear_regression',
        ]
      );
      forecasts.push(this.mapRow(result.rows[0]));
    }

    return forecasts;
  }

  async getForecasts(tenantId: string, metricName?: string): Promise<Forecast[]> {
    let query = `SELECT * FROM business_intelligence.forecasts WHERE tenant_id = $1`;
    const params: unknown[] = [tenantId];

    if (metricName) {
      query += ` AND metric_name = $2`;
      params.push(metricName);
    }

    query += ` AND forecast_date >= CURRENT_DATE ORDER BY forecast_date ASC`;

    const result = await this.pool.query(query, params);
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  private mapRow(row: Record<string, unknown>): Forecast {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      forecastDate: row.forecast_date as Date,
      metricName: row.metric_name as string,
      forecastedValue: Number(row.forecasted_value),
      confidenceLow: Number(row.confidence_low),
      confidenceHigh: Number(row.confidence_high),
      confidence: Number(row.confidence),
      model: row.model as string,
      createdAt: row.created_at as Date,
    };
  }
}

// ============================================
// BUSINESS INTELLIGENCE SERVER
// ============================================

export class BusinessIntelligenceServer {
  private app: express.Application;
  private pool: PoolType;
  private revenueService: RevenueService;
  private healthService: CustomerHealthService;
  private cohortService: CohortService;
  private churnService: ChurnService;
  private forecastService: ForecastService;

  constructor() {
    this.app = express();
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });

    this.revenueService = new RevenueService(this.pool);
    this.healthService = new CustomerHealthService(this.pool);
    this.cohortService = new CohortService(this.pool);
    this.churnService = new ChurnService(this.pool);
    this.forecastService = new ForecastService(this.pool, this.revenueService);

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));

    this.app.get('/health', (_req, res) => {
      res.json({ status: 'healthy', service: 'business-intelligence', timestamp: new Date().toISOString() });
    });
  }

  private setupRoutes(): void {
    const router = Router();

    // ============================================
    // REVENUE ROUTES
    // ============================================

    router.post('/revenue', this.requireAuth('operator'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = RecordRevenueSchema.parse(req.body);
        const metric = await this.revenueService.record(req.tenantId!, data);
        res.status(201).json(metric);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
          res.status(500).json({ error: 'Failed to record revenue' });
        }
      }
    });

    router.get('/revenue/dashboard', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const dashboard = await this.revenueService.getDashboard(req.tenantId!);
        res.json(dashboard);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get dashboard' });
      }
    });

    router.get('/revenue/metrics', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const startDate = new Date(req.query.startDate as string || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
        const endDate = new Date(req.query.endDate as string || new Date());
        const metrics = await this.revenueService.getMetrics(req.tenantId!, startDate, endDate);
        res.json({ metrics });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get metrics' });
      }
    });

    // ============================================
    // CUSTOMER HEALTH ROUTES
    // ============================================

    router.post('/health', this.requireAuth('operator'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = RecordCustomerHealthSchema.parse(req.body);
        const health = await this.healthService.record(req.tenantId!, data);
        res.status(201).json(health);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
          res.status(500).json({ error: 'Failed to record health' });
        }
      }
    });

    router.get('/health/customer/:customerId', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const health = await this.healthService.getLatestByCustomer(req.tenantId!, req.params.customerId);
        if (!health) {
          res.status(404).json({ error: 'Customer health not found' });
          return;
        }
        res.json(health);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get health' });
      }
    });

    router.get('/health/at-risk', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const riskLevels = (req.query.levels as string)?.split(',') || ['high', 'critical'];
        const customers = await this.healthService.getAtRiskCustomers(req.tenantId!, riskLevels);
        res.json({ customers, count: customers.length });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get at-risk customers' });
      }
    });

    router.get('/health/distribution', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const distribution = await this.healthService.getHealthDistribution(req.tenantId!);
        res.json(distribution);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get distribution' });
      }
    });

    // ============================================
    // COHORT ROUTES
    // ============================================

    router.post('/cohorts', this.requireAuth('operator'), async (req: AuthenticatedRequest, res) => {
      try {
        const { cohortMonth, monthNumber, customersStart, customersRetained, revenueStart, revenueRetained } = req.body;
        const cohort = await this.cohortService.recordCohort(req.tenantId!, cohortMonth, monthNumber, {
          customersStart, customersRetained, revenueStart, revenueRetained,
        });
        res.status(201).json(cohort);
      } catch (error) {
        res.status(500).json({ error: 'Failed to record cohort' });
      }
    });

    router.get('/cohorts/table', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const table = await this.cohortService.getCohortTable(req.tenantId!);
        res.json(table);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get cohort table' });
      }
    });

    router.get('/cohorts/average-retention', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const averages = await this.cohortService.getAverageRetention(req.tenantId!);
        res.json(averages);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get average retention' });
      }
    });

    // ============================================
    // CHURN ROUTES
    // ============================================

    router.post('/churn', this.requireAuth('operator'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = RecordChurnSchema.parse(req.body);
        const event = await this.churnService.record(req.tenantId!, data);
        res.status(201).json(event);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else {
          res.status(500).json({ error: 'Failed to record churn' });
        }
      }
    });

    router.get('/churn/analysis', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const startDate = new Date(req.query.startDate as string || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
        const endDate = new Date(req.query.endDate as string || new Date());
        const analysis = await this.churnService.getChurnAnalysis(req.tenantId!, startDate, endDate);
        res.json(analysis);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get churn analysis' });
      }
    });

    router.get('/churn/events', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const startDate = new Date(req.query.startDate as string || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
        const endDate = new Date(req.query.endDate as string || new Date());
        const events = await this.churnService.getChurnEvents(req.tenantId!, startDate, endDate);
        res.json({ events });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get churn events' });
      }
    });

    // ============================================
    // FORECAST ROUTES
    // ============================================

    router.post('/forecasts/generate', this.requireAuth('admin'), async (req: AuthenticatedRequest, res) => {
      try {
        const data = GenerateForecastSchema.parse(req.body);
        const forecasts = await this.forecastService.generate(req.tenantId!, data);
        res.status(201).json({ forecasts });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Validation error', details: error.errors });
        } else if (error instanceof Error) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Failed to generate forecasts' });
        }
      }
    });

    router.get('/forecasts', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        const metricName = req.query.metric as string | undefined;
        const forecasts = await this.forecastService.getForecasts(req.tenantId!, metricName);
        res.json({ forecasts });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get forecasts' });
      }
    });

    // ============================================
    // UNIT ECONOMICS ROUTES
    // ============================================

    router.get('/unit-economics', this.requireAuth('viewer'), async (req: AuthenticatedRequest, res) => {
      try {
        // Calculate unit economics from available data
        const latest = await this.revenueService.getLatest(req.tenantId!);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const churnAnalysis = await this.churnService.getChurnAnalysis(req.tenantId!, thirtyDaysAgo, new Date());

        const arpu = latest?.arpu || 0;
        const churnRate = latest ? (churnAnalysis.totalChurned as number / latest.activeSubscriptions * 100) : 0;
        const avgLifetimeMonths = churnRate > 0 ? 1 / (churnRate / 100) : 24;
        const ltv = arpu * avgLifetimeMonths;

        // Assuming CAC is 3x monthly ARPU (placeholder - would come from marketing data)
        const cac = arpu * 3;
        const ltvCacRatio = cac > 0 ? ltv / cac : 0;
        const paybackMonths = arpu > 0 ? cac / arpu : 0;

        res.json({
          arpu,
          ltv,
          cac,
          ltvCacRatio: ltvCacRatio.toFixed(2),
          paybackMonths: paybackMonths.toFixed(1),
          avgLifetimeMonths: avgLifetimeMonths.toFixed(1),
          churnRate: churnRate.toFixed(2),
          note: 'CAC is estimated as 3x ARPU. Connect marketing data for accurate CAC.',
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to calculate unit economics' });
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

  async start(port = 3506): Promise<void> {
    await this.pool.connect();

    this.app.listen(port, () => {
      logger.info({ port }, '📊 Business Intelligence API running');
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
  const server = new BusinessIntelligenceServer();
  server.start(parseInt(process.env.BI_PORT || '3506'));
}

export default BusinessIntelligenceServer;
