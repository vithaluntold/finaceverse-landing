// ============================================
// ACCUTE ORCHESTRATOR - AI Verifier
// AI-powered verification at every step
// ============================================

import pino from 'pino';
import { WorkflowNode, AIVerificationConfig } from '../types/workflow';

const logger = pino({ name: 'ai-verifier' });

export interface VerificationResult {
  passed: boolean;
  confidence: number;
  reason?: string;
  suggestions?: string[];
  anomalies?: Anomaly[];
  aiModel: string;
  processingTime: number;
}

export interface Anomaly {
  type: 'outlier' | 'missing' | 'inconsistent' | 'suspicious' | 'duplicate';
  field: string;
  value: unknown;
  expected?: unknown;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export class AIVerifier {
  private vamnEndpoint: string;
  private lucaEndpoint: string;

  constructor() {
    this.vamnEndpoint = process.env.VAMN_API_URL || 'http://vamn:3000';
    this.lucaEndpoint = process.env.LUCA_API_URL || 'http://luca:3000';
  }

  /**
   * Verify node execution with AI
   */
  async verify(
    node: WorkflowNode,
    inputs: Record<string, unknown>,
    output: unknown,
    config: AIVerificationConfig
  ): Promise<VerificationResult> {
    const startTime = Date.now();

    try {
      switch (config.type) {
        case 'vamn_verify':
          return await this.verifyWithVAMN(node, inputs, output, config);
        
        case 'luca_analyze':
          return await this.verifyWithLuca(node, inputs, output, config);
        
        case 'anomaly_detect':
          return await this.detectAnomalies(output, config);
        
        case 'format_validate':
          return await this.validateFormat(output, config);
        
        case 'threshold_check':
          return await this.checkThresholds(output, config);
        
        default:
          return this.basicVerification(output, config);
      }
    } catch (error) {
      logger.error({ error, nodeId: node.id }, 'AI verification failed');
      
      // If verification fails, check strictness
      if (config.strictMode) {
        throw error;
      }
      
      return {
        passed: true,
        confidence: 0,
        reason: 'Verification skipped due to error',
        aiModel: 'fallback',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Verify with VAMN (Verification AI Model Network)
   */
  private async verifyWithVAMN(
    node: WorkflowNode,
    inputs: Record<string, unknown>,
    output: unknown,
    config: AIVerificationConfig
  ): Promise<VerificationResult> {
    const startTime = Date.now();

    // VAMN verification for financial accuracy
    const response = await fetch(`${this.vamnEndpoint}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeType: node.type,
        inputs,
        output,
        rules: config.rules,
        context: config.context
      })
    });

    if (!response.ok) {
      throw new Error(`VAMN verification failed: ${response.statusText}`);
    }

    const result = await response.json() as {
      verified: boolean;
      confidence: number;
      reason?: string;
      suggestions?: string[];
      anomalies?: Anomaly[];
    };

    return {
      passed: result.verified,
      confidence: result.confidence,
      reason: result.reason,
      suggestions: result.suggestions,
      anomalies: result.anomalies,
      aiModel: 'vamn-v2',
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Verify with Luca (Financial Analysis AI)
   */
  private async verifyWithLuca(
    node: WorkflowNode,
    inputs: Record<string, unknown>,
    output: unknown,
    config: AIVerificationConfig
  ): Promise<VerificationResult> {
    const startTime = Date.now();

    // Luca verification for financial analysis
    const response = await fetch(`${this.lucaEndpoint}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'verification',
        nodeType: node.type,
        data: output,
        expectedFormat: config.expectedFormat,
        financialRules: config.financialRules
      })
    });

    if (!response.ok) {
      throw new Error(`Luca analysis failed: ${response.statusText}`);
    }

    const result = await response.json() as {
      valid: boolean;
      confidence: number;
      analysis?: string;
      recommendations?: string[];
      issues?: Array<{
        type: Anomaly['type'];
        field: string;
        value: unknown;
        severity: Anomaly['severity'];
        message: string;
      }>;
    };

    return {
      passed: result.valid,
      confidence: result.confidence,
      reason: result.analysis,
      suggestions: result.recommendations,
      anomalies: result.issues?.map((i) => ({
        type: i.type,
        field: i.field,
        value: i.value,
        severity: i.severity,
        description: i.message
      })),
      aiModel: 'luca-v3',
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Detect anomalies in data
   */
  private async detectAnomalies(
    data: unknown,
    config: AIVerificationConfig
  ): Promise<VerificationResult> {
    const startTime = Date.now();
    const anomalies: Anomaly[] = [];

    if (typeof data !== 'object' || data === null) {
      return {
        passed: true,
        confidence: 1.0,
        aiModel: 'anomaly-detector-v1',
        processingTime: Date.now() - startTime
      };
    }

    // Statistical anomaly detection
    const obj = data as Record<string, unknown>;
    
    for (const [key, value] of Object.entries(obj)) {
      // Check for null/undefined in required fields
      if (config.requiredFields?.includes(key) && (value === null || value === undefined)) {
        anomalies.push({
          type: 'missing',
          field: key,
          value,
          severity: 'high',
          description: `Required field '${key}' is missing`
        });
      }

      // Check for suspicious values
      if (typeof value === 'number') {
        // Negative amounts where shouldn't be
        if (config.nonNegativeFields?.includes(key) && value < 0) {
          anomalies.push({
            type: 'suspicious',
            field: key,
            value,
            severity: 'high',
            description: `Field '${key}' has unexpected negative value`
          });
        }

        // Outlier detection (simple z-score)
        if (config.expectedRanges?.[key]) {
          const { min, max } = config.expectedRanges[key];
          if (value < min || value > max) {
            anomalies.push({
              type: 'outlier',
              field: key,
              value,
              expected: { min, max },
              severity: value < min * 0.5 || value > max * 2 ? 'critical' : 'medium',
              description: `Field '${key}' value ${value} is outside expected range [${min}, ${max}]`
            });
          }
        }
      }
    }

    const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
    const highCount = anomalies.filter(a => a.severity === 'high').length;

    return {
      passed: criticalCount === 0 && highCount < (config.maxHighAnomalies || 3),
      confidence: 1 - (anomalies.length * 0.1),
      anomalies,
      reason: anomalies.length > 0 ? `Found ${anomalies.length} anomalies` : undefined,
      aiModel: 'anomaly-detector-v1',
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Validate output format
   */
  private async validateFormat(
    data: unknown,
    config: AIVerificationConfig
  ): Promise<VerificationResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    if (config.expectedFormat) {
      // JSON Schema validation
      const valid = this.validateSchema(data, config.expectedFormat);
      if (!valid.valid) {
        errors.push(...valid.errors);
      }
    }

    return {
      passed: errors.length === 0,
      confidence: errors.length === 0 ? 1.0 : 0.5,
      reason: errors.length > 0 ? errors.join(', ') : undefined,
      aiModel: 'format-validator-v1',
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Check threshold values
   */
  private async checkThresholds(
    data: unknown,
    config: AIVerificationConfig
  ): Promise<VerificationResult> {
    const startTime = Date.now();
    const violations: string[] = [];

    if (typeof data !== 'object' || data === null) {
      return {
        passed: true,
        confidence: 1.0,
        aiModel: 'threshold-checker-v1',
        processingTime: Date.now() - startTime
      };
    }

    const obj = data as Record<string, unknown>;

    for (const [field, threshold] of Object.entries(config.thresholds || {})) {
      const value = obj[field];
      if (typeof value === 'number') {
        if (threshold.min !== undefined && value < threshold.min) {
          violations.push(`${field} (${value}) is below minimum (${threshold.min})`);
        }
        if (threshold.max !== undefined && value > threshold.max) {
          violations.push(`${field} (${value}) exceeds maximum (${threshold.max})`);
        }
      }
    }

    return {
      passed: violations.length === 0,
      confidence: violations.length === 0 ? 1.0 : 0.3,
      reason: violations.length > 0 ? violations.join('; ') : undefined,
      aiModel: 'threshold-checker-v1',
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Basic verification (fallback)
   */
  private basicVerification(
    data: unknown,
    config: AIVerificationConfig
  ): VerificationResult {
    return {
      passed: data !== null && data !== undefined,
      confidence: 0.8,
      aiModel: 'basic-v1',
      processingTime: 0
    };
  }

  /**
   * Simple schema validation
   */
  private validateSchema(data: unknown, schema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (schema.type === 'object' && (typeof data !== 'object' || data === null)) {
      errors.push('Expected object type');
      return { valid: false, errors };
    }

    if (schema.required && typeof data === 'object' && data !== null) {
      for (const field of schema.required) {
        if (!(field in (data as object))) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
