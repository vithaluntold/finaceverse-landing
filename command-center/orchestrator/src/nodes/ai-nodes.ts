// ============================================
// ACCUTE ORCHESTRATOR - AI Nodes
// VAMN, Luca, and AI-powered financial analysis
// ============================================

import pino from 'pino';
import { NodeRegistry } from '../engine/node-registry';
import { ExecutionContext } from '../types/workflow';

const logger = pino({ name: 'ai-nodes' });

/**
 * Register all AI nodes
 */
export function registerAINodes(registry: NodeRegistry): void {

  // ==========================================
  // VAMN VERIFY NODE
  // ==========================================
  registry.register({
    type: 'ai_vamn_verify',
    name: 'VAMN Verify',
    description: 'AI-powered verification of financial data',
    category: 'ai',
    configSchema: {
      type: 'object',
      properties: {
        verificationType: {
          type: 'string',
          title: 'Verification Type',
          enum: [
            'invoice_authenticity', 'document_classification', 'data_extraction_quality',
            'compliance_check', 'fraud_detection', 'duplicate_detection',
            'gstin_verification', 'pan_verification', 'bank_account_verification'
          ]
        },
        confidenceThreshold: { type: 'number', title: 'Confidence Threshold (%)', default: 85 },
        strictMode: { type: 'boolean', title: 'Strict Mode', default: false },
        includeExplanation: { type: 'boolean', title: 'Include Explanation', default: true }
      },
      required: ['verificationType']
    },
    inputsSchema: [
      { name: 'data', type: 'any', required: true, description: 'Data to verify' },
      { name: 'context', type: 'object', required: false, description: 'Additional context' }
    ],
    outputsSchema: [
      { name: 'verified', type: 'boolean', description: 'Verification result' },
      { name: 'confidence', type: 'number', description: 'Confidence score (0-100)' },
      { name: 'explanation', type: 'string', description: 'AI explanation' },
      { name: 'issues', type: 'array', description: 'Detected issues' }
    ],
    execute: async (inputs, config, context) => {
      const vamnUrl = process.env.VAMN_API_URL || 'http://vamn:3000';
      
      logger.info({ type: config.verificationType }, 'Running VAMN verification');

      const response = await fetch(`${vamnUrl}/api/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': context.tenantId,
          'X-Request-ID': context.executionId
        },
        body: JSON.stringify({
          type: config.verificationType,
          data: inputs.data,
          context: inputs.context,
          options: {
            confidenceThreshold: config.confidenceThreshold,
            strictMode: config.strictMode,
            includeExplanation: config.includeExplanation
          }
        })
      });

      if (!response.ok) {
        throw new Error(`VAMN verification failed: ${response.statusText}`);
      }

      const result = await response.json() as {
        confidence: number;
        explanation?: string;
        issues?: unknown[];
      };

      // Check against threshold
      const passed = result.confidence >= (config.confidenceThreshold as number);

      if (config.strictMode && !passed) {
        throw new Error(`Verification failed: confidence ${result.confidence}% below threshold ${config.confidenceThreshold}%`);
      }

      return {
        verified: passed,
        confidence: result.confidence,
        explanation: result.explanation,
        issues: result.issues || [],
        rawResult: result
      };
    }
  });

  // ==========================================
  // LUCA ANALYZE NODE
  // ==========================================
  registry.register({
    type: 'ai_luca_analyze',
    name: 'Luca Analyze',
    description: 'AI-powered financial analysis and insights',
    category: 'ai',
    configSchema: {
      type: 'object',
      properties: {
        analysisType: {
          type: 'string',
          title: 'Analysis Type',
          enum: [
            'financial_health', 'cash_flow_forecast', 'expense_categorization',
            'revenue_analysis', 'cost_optimization', 'working_capital',
            'trend_analysis', 'benchmark_comparison', 'risk_assessment',
            'tax_optimization', 'compliance_status', 'audit_preparation'
          ]
        },
        timeframe: { type: 'string', title: 'Timeframe', enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] },
        includeRecommendations: { type: 'boolean', title: 'Include Recommendations', default: true },
        compareWithIndustry: { type: 'boolean', title: 'Compare with Industry', default: false }
      },
      required: ['analysisType']
    },
    inputsSchema: [
      { name: 'financialData', type: 'object', required: true, description: 'Financial data to analyze' },
      { name: 'historicalData', type: 'array', required: false, description: 'Historical data for trends' }
    ],
    outputsSchema: [
      { name: 'analysis', type: 'object', description: 'Analysis results' },
      { name: 'insights', type: 'array', description: 'Key insights' },
      { name: 'recommendations', type: 'array', description: 'Recommendations' },
      { name: 'score', type: 'number', description: 'Health score' }
    ],
    execute: async (inputs, config, context) => {
      const lucaUrl = process.env.LUCA_API_URL || 'http://luca:3000';
      
      logger.info({ type: config.analysisType }, 'Running Luca analysis');

      const response = await fetch(`${lucaUrl}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': context.tenantId,
          'X-Request-ID': context.executionId
        },
        body: JSON.stringify({
          type: config.analysisType,
          data: inputs.financialData,
          historical: inputs.historicalData,
          options: {
            timeframe: config.timeframe,
            includeRecommendations: config.includeRecommendations,
            compareWithIndustry: config.compareWithIndustry
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Luca analysis failed: ${response.statusText}`);
      }

      const result = await response.json() as {
        analysis: unknown;
        insights?: unknown[];
        recommendations?: unknown[];
        score?: number;
        confidence?: number;
        visualizations?: unknown;
      };

      return {
        analysis: result.analysis,
        insights: result.insights || [],
        recommendations: result.recommendations || [],
        score: result.score,
        confidence: result.confidence,
        charts: result.visualizations
      };
    }
  });

  // ==========================================
  // ANOMALY DETECTION NODE
  // ==========================================
  registry.register({
    type: 'ai_anomaly_detect',
    name: 'Anomaly Detection',
    description: 'AI-powered anomaly detection in financial data',
    category: 'ai',
    configSchema: {
      type: 'object',
      properties: {
        detectionType: {
          type: 'string',
          title: 'Detection Type',
          enum: [
            'transaction_anomaly', 'pattern_deviation', 'amount_outlier',
            'timing_anomaly', 'frequency_anomaly', 'relationship_anomaly'
          ]
        },
        sensitivity: { type: 'string', title: 'Sensitivity', enum: ['low', 'medium', 'high'], default: 'medium' },
        alertThreshold: { type: 'number', title: 'Alert Threshold', default: 3 },
        learningMode: { type: 'boolean', title: 'Learning Mode', default: false }
      },
      required: ['detectionType']
    },
    inputsSchema: [
      { name: 'transactions', type: 'array', required: true, description: 'Transactions to analyze' },
      { name: 'baselineData', type: 'array', required: false, description: 'Baseline for comparison' }
    ],
    outputsSchema: [
      { name: 'anomalies', type: 'array', description: 'Detected anomalies' },
      { name: 'riskScore', type: 'number', description: 'Overall risk score' },
      { name: 'patterns', type: 'array', description: 'Detected patterns' }
    ],
    execute: async (inputs, config) => {
      const transactions = inputs.transactions as any[];
      const sensitivity = config.sensitivity as string;
      
      // Sensitivity multipliers
      const sensitivityMultiplier = { low: 3, medium: 2, high: 1.5 }[sensitivity] || 2;
      
      // Calculate statistics
      const amounts = transactions.map(t => Math.abs(t.amount));
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);

      const anomalies: any[] = [];
      
      for (const txn of transactions) {
        const zScore = Math.abs((Math.abs(txn.amount) - mean) / stdDev);
        
        if (zScore > sensitivityMultiplier) {
          anomalies.push({
            transaction: txn,
            type: 'amount_outlier',
            zScore,
            severity: zScore > 4 ? 'critical' : zScore > 3 ? 'high' : 'medium',
            explanation: `Amount ${txn.amount} deviates ${zScore.toFixed(2)} standard deviations from mean`
          });
        }

        // Check for suspicious patterns
        if (isRoundNumber(txn.amount) && txn.amount > 100000) {
          anomalies.push({
            transaction: txn,
            type: 'suspicious_pattern',
            severity: 'medium',
            explanation: 'Large round number transaction detected'
          });
        }

        // Check timing anomalies (weekend/holiday transactions)
        const txnDate = new Date(txn.date);
        if (txnDate.getDay() === 0 || txnDate.getDay() === 6) {
          if (txn.amount > mean * 2) {
            anomalies.push({
              transaction: txn,
              type: 'timing_anomaly',
              severity: 'low',
              explanation: 'Large transaction on weekend'
            });
          }
        }
      }

      // Calculate risk score
      const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
      const highCount = anomalies.filter(a => a.severity === 'high').length;
      const mediumCount = anomalies.filter(a => a.severity === 'medium').length;
      
      const riskScore = Math.min(100, 
        (criticalCount * 25) + (highCount * 15) + (mediumCount * 5)
      );

      return {
        anomalies,
        riskScore,
        patterns: detectPatterns(transactions),
        statistics: { mean, stdDev, transactionCount: transactions.length }
      };
    }
  });

  // ==========================================
  // DOCUMENT CLASSIFICATION NODE
  // ==========================================
  registry.register({
    type: 'ai_classify',
    name: 'Document Classification',
    description: 'AI-powered document classification',
    category: 'ai',
    configSchema: {
      type: 'object',
      properties: {
        classificationModel: {
          type: 'string',
          title: 'Model',
          enum: ['financial_documents', 'expense_receipts', 'legal_documents', 'custom']
        },
        multiLabel: { type: 'boolean', title: 'Multi-label Classification', default: false },
        customCategories: { type: 'array', title: 'Custom Categories', items: { type: 'string', title: 'Category' } }
      },
      required: ['classificationModel']
    },
    inputsSchema: [
      { name: 'document', type: 'file|text', required: true, description: 'Document to classify' }
    ],
    outputsSchema: [
      { name: 'category', type: 'string', description: 'Primary category' },
      { name: 'confidence', type: 'number', description: 'Confidence score' },
      { name: 'allCategories', type: 'array', description: 'All categories with scores' }
    ],
    execute: async (inputs, config, context) => {
      const vamnUrl = process.env.VAMN_API_URL || 'http://vamn:3000';
      
      const response = await fetch(`${vamnUrl}/api/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': context.tenantId
        },
        body: JSON.stringify({
          document: inputs.document,
          model: config.classificationModel,
          multiLabel: config.multiLabel,
          customCategories: config.customCategories
        })
      });

      if (!response.ok) {
        throw new Error(`Classification failed: ${response.statusText}`);
      }

      const result = await response.json() as {
        primaryCategory: string;
        confidence: number;
        allCategories: unknown[];
        metadata?: unknown;
      };

      return {
        category: result.primaryCategory,
        confidence: result.confidence,
        allCategories: result.allCategories,
        metadata: result.metadata
      };
    }
  });

  // ==========================================
  // SMART EXTRACTION NODE
  // ==========================================
  registry.register({
    type: 'ai_extract',
    name: 'Smart Extraction',
    description: 'AI-powered data extraction from documents',
    category: 'ai',
    configSchema: {
      type: 'object',
      properties: {
        extractionTemplate: {
          type: 'string',
          title: 'Template',
          enum: [
            'invoice', 'receipt', 'bank_statement', 'credit_note',
            'purchase_order', 'delivery_challan', 'gst_invoice',
            'salary_slip', 'form_16', 'itr', 'custom'
          ]
        },
        customFields: { type: 'array', title: 'Custom Fields', items: { type: 'string', title: 'Field' } },
        validateExtraction: { type: 'boolean', title: 'Validate Extraction', default: true },
        language: { type: 'string', title: 'Language', enum: ['en', 'hi', 'mr', 'ta', 'te', 'kn'], default: 'en' }
      },
      required: ['extractionTemplate']
    },
    inputsSchema: [
      { name: 'document', type: 'file|buffer|url', required: true }
    ],
    outputsSchema: [
      { name: 'extractedData', type: 'object' },
      { name: 'confidence', type: 'number' },
      { name: 'fields', type: 'array' }
    ],
    execute: async (inputs, config, context) => {
      const vamnUrl = process.env.VAMN_API_URL || 'http://vamn:3000';
      
      const response = await fetch(`${vamnUrl}/api/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': context.tenantId
        },
        body: JSON.stringify({
          document: inputs.document,
          template: config.extractionTemplate,
          customFields: config.customFields,
          validate: config.validateExtraction,
          language: config.language
        })
      });

      if (!response.ok) {
        throw new Error(`Extraction failed: ${response.statusText}`);
      }

      const result = await response.json() as {
        data: unknown;
        overallConfidence: number;
        fields: Array<{
          name: string;
          value: unknown;
          confidence: number;
          boundingBox?: unknown;
        }>;
        rawText?: string;
      };

      return {
        extractedData: result.data,
        confidence: result.overallConfidence,
        fields: result.fields.map((f) => ({
          name: f.name,
          value: f.value,
          confidence: f.confidence,
          location: f.boundingBox
        })),
        rawOcr: result.rawText
      };
    }
  });

  // ==========================================
  // PREDICTIVE ANALYTICS NODE
  // ==========================================
  registry.register({
    type: 'ai_predict',
    name: 'Predictive Analytics',
    description: 'AI-powered predictions and forecasting',
    category: 'ai',
    configSchema: {
      type: 'object',
      properties: {
        predictionType: {
          type: 'string',
          title: 'Prediction Type',
          enum: [
            'cash_flow_forecast', 'revenue_forecast', 'expense_forecast',
            'payment_probability', 'churn_prediction', 'growth_projection',
            'seasonality_analysis', 'demand_forecast'
          ]
        },
        horizonDays: { type: 'number', title: 'Forecast Horizon (days)', default: 30 },
        confidenceInterval: { type: 'number', title: 'Confidence Interval (%)', default: 95 },
        includeScenarios: { type: 'boolean', title: 'Include Scenarios', default: true }
      },
      required: ['predictionType']
    },
    inputsSchema: [
      { name: 'historicalData', type: 'array', required: true, description: 'Historical data for training' },
      { name: 'features', type: 'object', required: false, description: 'Additional features' }
    ],
    outputsSchema: [
      { name: 'prediction', type: 'any', description: 'Predicted values' },
      { name: 'confidence', type: 'number' },
      { name: 'scenarios', type: 'object', description: 'Best/worst/expected scenarios' }
    ],
    execute: async (inputs, config, context) => {
      const lucaUrl = process.env.LUCA_API_URL || 'http://luca:3000';
      
      const response = await fetch(`${lucaUrl}/api/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': context.tenantId
        },
        body: JSON.stringify({
          type: config.predictionType,
          historicalData: inputs.historicalData,
          features: inputs.features,
          horizonDays: config.horizonDays,
          confidenceInterval: config.confidenceInterval,
          includeScenarios: config.includeScenarios
        })
      });

      if (!response.ok) {
        throw new Error(`Prediction failed: ${response.statusText}`);
      }

      const result = await response.json() as {
        prediction: unknown;
        confidence: number;
        optimisticScenario?: unknown;
        pessimisticScenario?: unknown;
        expectedScenario?: unknown;
        contributingFactors?: unknown[];
        methodology?: string;
      };

      return {
        prediction: result.prediction,
        confidence: result.confidence,
        scenarios: {
          optimistic: result.optimisticScenario,
          pessimistic: result.pessimisticScenario,
          expected: result.expectedScenario
        },
        factors: result.contributingFactors,
        methodology: result.methodology
      };
    }
  });

  // ==========================================
  // NATURAL LANGUAGE QUERY NODE
  // ==========================================
  registry.register({
    type: 'ai_query',
    name: 'Natural Language Query',
    description: 'Query financial data using natural language',
    category: 'ai',
    configSchema: {
      type: 'object',
      properties: {
        dataSource: {
          type: 'string',
          title: 'Data Source',
          enum: ['ledger', 'transactions', 'reports', 'all']
        },
        maxResults: { type: 'number', title: 'Max Results', default: 100 },
        includeVisualization: { type: 'boolean', title: 'Include Visualization', default: true }
      }
    },
    inputsSchema: [
      { name: 'query', type: 'string', required: true, description: 'Natural language query' }
    ],
    outputsSchema: [
      { name: 'result', type: 'any', description: 'Query result' },
      { name: 'sqlGenerated', type: 'string', description: 'Generated SQL' },
      { name: 'visualization', type: 'object' }
    ],
    execute: async (inputs, config, context) => {
      const lucaUrl = process.env.LUCA_API_URL || 'http://luca:3000';
      
      const response = await fetch(`${lucaUrl}/api/nl-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': context.tenantId
        },
        body: JSON.stringify({
          query: inputs.query,
          dataSource: config.dataSource,
          maxResults: config.maxResults,
          includeVisualization: config.includeVisualization
        })
      });

      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`);
      }

      const result = await response.json() as {
        data: unknown;
        generatedQuery?: string;
        visualization?: unknown;
        explanation?: string;
      };

      return {
        result: result.data,
        sqlGenerated: result.generatedQuery,
        visualization: result.visualization,
        explanation: result.explanation
      };
    }
  });

  logger.info('Registered AI nodes');
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function isRoundNumber(amount: number): boolean {
  // Check if number is round (ends in multiple zeros)
  return amount >= 1000 && amount % 1000 === 0;
}

function detectPatterns(transactions: any[]): any[] {
  const patterns: any[] = [];
  
  // Detect recurring transactions
  const amountCounts = new Map<number, number>();
  for (const txn of transactions) {
    const roundedAmount = Math.round(txn.amount);
    amountCounts.set(roundedAmount, (amountCounts.get(roundedAmount) || 0) + 1);
  }
  
  for (const [amount, count] of amountCounts.entries()) {
    if (count >= 3) {
      patterns.push({
        type: 'recurring_amount',
        amount,
        frequency: count,
        description: `Amount ${amount} appears ${count} times`
      });
    }
  }

  // Detect time-based patterns
  const hourCounts = new Map<number, number>();
  for (const txn of transactions) {
    const hour = new Date(txn.date).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  }
  
  const avgPerHour = transactions.length / 24;
  for (const [hour, count] of hourCounts.entries()) {
    if (count > avgPerHour * 3) {
      patterns.push({
        type: 'time_concentration',
        hour,
        frequency: count,
        description: `High concentration of transactions at ${hour}:00`
      });
    }
  }

  return patterns;
}
