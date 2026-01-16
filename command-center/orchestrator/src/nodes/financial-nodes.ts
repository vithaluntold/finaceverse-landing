// ============================================
// ACCUTE ORCHESTRATOR - Financial Nodes
// The nodes that make n8n look like a toy
// ============================================

import pino from 'pino';
import { NodeHandler, NodeRegistry } from '../engine/node-registry';

const logger = pino({ name: 'financial-nodes' });

/**
 * Register all financial nodes
 */
export function registerFinancialNodes(registry: NodeRegistry): void {
  // ==========================================
  // INVOICE OCR NODE
  // ==========================================
  registry.register({
    type: 'invoice_ocr',
    name: 'Invoice OCR',
    description: 'Extract data from invoice images/PDFs using AI',
    category: 'financial',
    configSchema: {
      type: 'object',
      properties: {
        ocrProvider: { 
          type: 'string', 
          title: 'OCR Provider', 
          enum: ['vamn', 'azure', 'google', 'aws-textract'],
          default: 'vamn'
        },
        extractFields: {
          type: 'array',
          title: 'Fields to Extract',
          items: { type: 'string', title: 'Field Name' },
          default: ['vendor', 'invoice_number', 'date', 'due_date', 'line_items', 'subtotal', 'tax', 'total', 'gstin', 'hsn_codes']
        },
        validateGSTIN: { type: 'boolean', title: 'Validate GSTIN', default: true },
        matchWithPO: { type: 'boolean', title: 'Match with Purchase Order', default: false }
      }
    },
    inputsSchema: [
      { name: 'document', type: 'file|buffer|url', required: true, description: 'Invoice document' }
    ],
    outputsSchema: [
      { name: 'extractedData', type: 'object', description: 'Extracted invoice data' },
      { name: 'confidence', type: 'number', description: 'OCR confidence score' },
      { name: 'validations', type: 'object', description: 'Validation results' }
    ],
    execute: async (inputs, config, context) => {
      logger.info({ provider: config.ocrProvider }, 'Processing invoice OCR');
      
      const document = inputs.document;
      
      // Call VAMN OCR service
      const response = await fetch(`${process.env.VAMN_API_URL || 'http://vamn:3000'}/api/ocr/invoice`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Tenant-ID': context.tenantId
        },
        body: JSON.stringify({
          document,
          fields: config.extractFields,
          validateGSTIN: config.validateGSTIN
        })
      });

      if (!response.ok) {
        throw new Error(`OCR failed: ${response.statusText}`);
      }

      const result = await response.json() as {
        data: Record<string, unknown> & { gstin?: string };
        confidence: number;
        rawText: string;
      };

      // Validate GSTIN if configured
      let gstinValidation = null;
      if (config.validateGSTIN && result.data.gstin) {
        gstinValidation = await validateGSTIN(result.data.gstin);
      }

      return {
        extractedData: result.data,
        confidence: result.confidence,
        validations: {
          gstin: gstinValidation,
          arithmeticCheck: validateArithmetic(result.data),
          dateCheck: validateDates(result.data)
        },
        rawOcr: result.rawText
      };
    }
  });

  // ==========================================
  // BANK RECONCILIATION NODE
  // ==========================================
  registry.register({
    type: 'bank_reconcile',
    name: 'Bank Reconciliation',
    description: 'AI-powered bank statement reconciliation',
    category: 'financial',
    configSchema: {
      type: 'object',
      properties: {
        matchingThreshold: { type: 'number', title: 'Matching Threshold (%)', default: 95 },
        dateTolerance: { type: 'number', title: 'Date Tolerance (days)', default: 3 },
        amountTolerance: { type: 'number', title: 'Amount Tolerance', default: 0.01 },
        autoMatch: { type: 'boolean', title: 'Auto-match transactions', default: true },
        suggestMatches: { type: 'boolean', title: 'Suggest fuzzy matches', default: true }
      }
    },
    inputsSchema: [
      { name: 'bankTransactions', type: 'array', required: true, description: 'Bank statement transactions' },
      { name: 'ledgerEntries', type: 'array', required: true, description: 'Ledger entries to reconcile' }
    ],
    outputsSchema: [
      { name: 'matched', type: 'array', description: 'Matched transactions' },
      { name: 'unmatchedBank', type: 'array', description: 'Unmatched bank transactions' },
      { name: 'unmatchedLedger', type: 'array', description: 'Unmatched ledger entries' },
      { name: 'suggestedMatches', type: 'array', description: 'Suggested matches for review' },
      { name: 'summary', type: 'object', description: 'Reconciliation summary' }
    ],
    execute: async (inputs, config) => {
      const bankTxns = inputs.bankTransactions as Transaction[];
      const ledgerEntries = inputs.ledgerEntries as Transaction[];
      
      const matched: Match[] = [];
      const suggestedMatches: SuggestedMatch[] = [];
      const unmatchedBank = new Set(bankTxns);
      const unmatchedLedger = new Set(ledgerEntries);

      // First pass: Exact matches
      for (const bank of bankTxns) {
        for (const ledger of ledgerEntries) {
          if (isExactMatch(bank, ledger, config as any)) {
            matched.push({ bank, ledger, confidence: 100, matchType: 'exact' });
            unmatchedBank.delete(bank);
            unmatchedLedger.delete(ledger);
            break;
          }
        }
      }

      // Second pass: Fuzzy matches
      if (config.suggestMatches) {
        for (const bank of unmatchedBank) {
          for (const ledger of unmatchedLedger) {
            const similarity = calculateSimilarity(bank, ledger, config as any);
            if (similarity >= (config.matchingThreshold as number) * 0.8) {
              suggestedMatches.push({
                bank,
                ledger,
                confidence: similarity,
                matchType: 'fuzzy',
                reason: getMatchReason(bank, ledger)
              });
            }
          }
        }
      }

      // Calculate summary
      const summary = {
        totalBankTransactions: bankTxns.length,
        totalLedgerEntries: ledgerEntries.length,
        matchedCount: matched.length,
        unmatchedBankCount: unmatchedBank.size,
        unmatchedLedgerCount: unmatchedLedger.size,
        suggestedMatchCount: suggestedMatches.length,
        matchRate: (matched.length / Math.max(bankTxns.length, ledgerEntries.length)) * 100,
        bankBalance: bankTxns.reduce((sum, t) => sum + t.amount, 0),
        ledgerBalance: ledgerEntries.reduce((sum, t) => sum + t.amount, 0),
        difference: bankTxns.reduce((sum, t) => sum + t.amount, 0) - 
                   ledgerEntries.reduce((sum, t) => sum + t.amount, 0)
      };

      return {
        matched,
        unmatchedBank: Array.from(unmatchedBank),
        unmatchedLedger: Array.from(unmatchedLedger),
        suggestedMatches: suggestedMatches.sort((a, b) => b.confidence - a.confidence),
        summary
      };
    }
  });

  // ==========================================
  // JOURNAL ENTRY NODE
  // ==========================================
  registry.register({
    type: 'journal_entry',
    name: 'Journal Entry',
    description: 'Create and validate journal entries',
    category: 'financial',
    configSchema: {
      type: 'object',
      properties: {
        validateBalance: { type: 'boolean', title: 'Validate Debit = Credit', default: true },
        autoNumber: { type: 'boolean', title: 'Auto-generate entry number', default: true },
        postingDate: { type: 'string', title: 'Posting Date' },
        description: { type: 'string', title: 'Entry Description' }
      }
    },
    inputsSchema: [
      { name: 'lines', type: 'array', required: true, description: 'Journal entry lines' }
    ],
    outputsSchema: [
      { name: 'entry', type: 'object', description: 'Created journal entry' },
      { name: 'valid', type: 'boolean', description: 'Validation result' }
    ],
    execute: async (inputs, config, context) => {
      const lines = inputs.lines as JournalLine[];
      
      // Calculate totals
      const totalDebit = lines.filter(l => l.type === 'debit').reduce((sum, l) => sum + l.amount, 0);
      const totalCredit = lines.filter(l => l.type === 'credit').reduce((sum, l) => sum + l.amount, 0);
      
      // Validate balance
      if (config.validateBalance && Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Journal entry unbalanced: Debit ${totalDebit} != Credit ${totalCredit}`);
      }

      // Generate entry number
      const entryNumber = config.autoNumber 
        ? `JE-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
        : undefined;

      const entry = {
        id: entryNumber,
        date: config.postingDate || new Date().toISOString().split('T')[0],
        description: config.description,
        lines: lines.map((l, i) => ({
          ...l,
          lineNumber: i + 1
        })),
        totalDebit,
        totalCredit,
        status: 'draft',
        createdAt: new Date().toISOString(),
        createdBy: context.variables.userId
      };

      return {
        entry,
        valid: true,
        summary: {
          lineCount: lines.length,
          totalDebit,
          totalCredit,
          balanced: Math.abs(totalDebit - totalCredit) < 0.01
        }
      };
    }
  });

  // ==========================================
  // TAX CALCULATION NODE
  // ==========================================
  registry.register({
    type: 'tax_calculate',
    name: 'Tax Calculator',
    description: 'Calculate taxes (GST, TDS, Income Tax)',
    category: 'financial',
    configSchema: {
      type: 'object',
      properties: {
        taxType: { 
          type: 'string', 
          title: 'Tax Type', 
          enum: ['gst', 'tds', 'income_tax', 'professional_tax', 'custom'],
          default: 'gst'
        },
        gstType: { 
          type: 'string', 
          title: 'GST Type', 
          enum: ['igst', 'cgst_sgst', 'utgst'],
          default: 'cgst_sgst'
        },
        tdsSection: { type: 'string', title: 'TDS Section' },
        assessmentYear: { type: 'string', title: 'Assessment Year' },
        regime: { type: 'string', title: 'Tax Regime', enum: ['old', 'new'], default: 'new' }
      }
    },
    inputsSchema: [
      { name: 'amount', type: 'number', required: true },
      { name: 'hsnCode', type: 'string', required: false },
      { name: 'taxableIncome', type: 'number', required: false }
    ],
    outputsSchema: [
      { name: 'taxAmount', type: 'number' },
      { name: 'breakdown', type: 'object' },
      { name: 'effectiveRate', type: 'number' }
    ],
    execute: async (inputs, config) => {
      const amount = inputs.amount as number;
      const taxType = config.taxType as string;

      switch (taxType) {
        case 'gst':
          return calculateGST(amount, inputs.hsnCode as string, config.gstType as string);
        
        case 'tds':
          return calculateTDS(amount, config.tdsSection as string);
        
        case 'income_tax':
          return calculateIncomeTax(
            inputs.taxableIncome as number,
            config.assessmentYear as string,
            config.regime as string
          );
        
        default:
          throw new Error(`Unknown tax type: ${taxType}`);
      }
    }
  });

  // ==========================================
  // GST RETURN FILING NODE
  // ==========================================
  registry.register({
    type: 'gst_return',
    name: 'GST Return',
    description: 'Prepare and validate GST returns',
    category: 'financial',
    configSchema: {
      type: 'object',
      properties: {
        returnType: { 
          type: 'string', 
          title: 'Return Type', 
          enum: ['GSTR-1', 'GSTR-3B', 'GSTR-9', 'GSTR-9C'],
          default: 'GSTR-3B'
        },
        period: { type: 'string', title: 'Return Period (MMYYYY)' },
        gstin: { type: 'string', title: 'GSTIN' },
        validateWithGSTP: { type: 'boolean', title: 'Validate with GSTP', default: true }
      }
    },
    inputsSchema: [
      { name: 'salesData', type: 'array', required: true },
      { name: 'purchaseData', type: 'array', required: true },
      { name: 'adjustments', type: 'object', required: false }
    ],
    outputsSchema: [
      { name: 'return', type: 'object' },
      { name: 'summary', type: 'object' },
      { name: 'validationErrors', type: 'array' }
    ],
    execute: async (inputs, config) => {
      const sales = inputs.salesData as any[];
      const purchases = inputs.purchaseData as any[];
      
      // Calculate output tax
      const outputTax = sales.reduce((sum, s) => sum + (s.igst || 0) + (s.cgst || 0) + (s.sgst || 0), 0);
      
      // Calculate input tax credit
      const inputTax = purchases.reduce((sum, p) => sum + (p.igst || 0) + (p.cgst || 0) + (p.sgst || 0), 0);
      
      // Net liability
      const netLiability = outputTax - inputTax;

      const gstReturn = {
        gstin: config.gstin,
        period: config.period,
        returnType: config.returnType,
        taxableSupplies: {
          b2b: sales.filter(s => s.type === 'b2b'),
          b2c: sales.filter(s => s.type === 'b2c'),
          exports: sales.filter(s => s.type === 'export')
        },
        outputTax: {
          igst: sales.reduce((sum, s) => sum + (s.igst || 0), 0),
          cgst: sales.reduce((sum, s) => sum + (s.cgst || 0), 0),
          sgst: sales.reduce((sum, s) => sum + (s.sgst || 0), 0),
          cess: sales.reduce((sum, s) => sum + (s.cess || 0), 0)
        },
        inputTaxCredit: {
          igst: purchases.reduce((sum, p) => sum + (p.igst || 0), 0),
          cgst: purchases.reduce((sum, p) => sum + (p.cgst || 0), 0),
          sgst: purchases.reduce((sum, p) => sum + (p.sgst || 0), 0),
          cess: purchases.reduce((sum, p) => sum + (p.cess || 0), 0)
        },
        netLiability: {
          igst: Math.max(0, sales.reduce((sum, s) => sum + (s.igst || 0), 0) - purchases.reduce((sum, p) => sum + (p.igst || 0), 0)),
          cgst: Math.max(0, sales.reduce((sum, s) => sum + (s.cgst || 0), 0) - purchases.reduce((sum, p) => sum + (p.cgst || 0), 0)),
          sgst: Math.max(0, sales.reduce((sum, s) => sum + (s.sgst || 0), 0) - purchases.reduce((sum, p) => sum + (p.sgst || 0), 0))
        }
      };

      return {
        return: gstReturn,
        summary: {
          totalSales: sales.reduce((sum, s) => sum + s.amount, 0),
          totalPurchases: purchases.reduce((sum, p) => sum + p.amount, 0),
          outputTax,
          inputTax,
          netLiability
        },
        validationErrors: validateGSTReturn(gstReturn)
      };
    }
  });

  // ==========================================
  // FINANCIAL RATIO ANALYSIS NODE
  // ==========================================
  registry.register({
    type: 'financial_ratio',
    name: 'Financial Ratios',
    description: 'Calculate financial ratios and analysis',
    category: 'financial',
    configSchema: {
      type: 'object',
      properties: {
        ratioCategories: {
          type: 'array',
          title: 'Ratio Categories',
          items: { type: 'string', title: 'Category' },
          default: ['liquidity', 'profitability', 'efficiency', 'leverage']
        },
        benchmarks: { type: 'object', title: 'Industry Benchmarks' }
      }
    },
    inputsSchema: [
      { name: 'balanceSheet', type: 'object', required: true },
      { name: 'incomeStatement', type: 'object', required: true }
    ],
    outputsSchema: [
      { name: 'ratios', type: 'object' },
      { name: 'analysis', type: 'object' },
      { name: 'trends', type: 'array' }
    ],
    execute: async (inputs, config) => {
      const bs = inputs.balanceSheet as any;
      const is = inputs.incomeStatement as any;

      const ratios: Record<string, number> = {};

      // Liquidity Ratios
      ratios.currentRatio = bs.currentAssets / bs.currentLiabilities;
      ratios.quickRatio = (bs.currentAssets - bs.inventory) / bs.currentLiabilities;
      ratios.cashRatio = bs.cash / bs.currentLiabilities;

      // Profitability Ratios
      ratios.grossProfitMargin = (is.grossProfit / is.revenue) * 100;
      ratios.netProfitMargin = (is.netIncome / is.revenue) * 100;
      ratios.returnOnAssets = (is.netIncome / bs.totalAssets) * 100;
      ratios.returnOnEquity = (is.netIncome / bs.shareholdersEquity) * 100;

      // Efficiency Ratios
      ratios.assetTurnover = is.revenue / bs.totalAssets;
      ratios.inventoryTurnover = is.costOfGoodsSold / bs.inventory;
      ratios.receivablesTurnover = is.revenue / bs.accountsReceivable;
      ratios.daysSalesOutstanding = 365 / ratios.receivablesTurnover;

      // Leverage Ratios
      ratios.debtToEquity = bs.totalDebt / bs.shareholdersEquity;
      ratios.debtToAssets = bs.totalDebt / bs.totalAssets;
      ratios.interestCoverage = is.operatingIncome / is.interestExpense;

      // Analysis
      const analysis = {
        liquidity: analyzeLiquidity(ratios),
        profitability: analyzeProfitability(ratios),
        efficiency: analyzeEfficiency(ratios),
        leverage: analyzeLeverage(ratios)
      };

      return { ratios, analysis, trends: [] };
    }
  });

  logger.info('Registered financial nodes');
}

// Helper types
interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  reference?: string;
}

interface Match {
  bank: Transaction;
  ledger: Transaction;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'manual';
}

interface SuggestedMatch extends Match {
  reason: string;
}

interface JournalLine {
  accountCode: string;
  accountName: string;
  type: 'debit' | 'credit';
  amount: number;
  description?: string;
}

// Helper functions
function isExactMatch(bank: Transaction, ledger: Transaction, config: any): boolean {
  const amountMatch = Math.abs(bank.amount - ledger.amount) <= config.amountTolerance;
  const dateMatch = Math.abs(new Date(bank.date).getTime() - new Date(ledger.date).getTime()) 
                    <= config.dateTolerance * 24 * 60 * 60 * 1000;
  return amountMatch && dateMatch;
}

function calculateSimilarity(bank: Transaction, ledger: Transaction, config: any): number {
  let score = 0;
  
  // Amount similarity (0-50)
  const amountDiff = Math.abs(bank.amount - ledger.amount) / Math.max(bank.amount, ledger.amount);
  score += Math.max(0, 50 - amountDiff * 100);
  
  // Date similarity (0-30)
  const daysDiff = Math.abs(new Date(bank.date).getTime() - new Date(ledger.date).getTime()) / (24 * 60 * 60 * 1000);
  score += Math.max(0, 30 - daysDiff * 5);
  
  // Description similarity (0-20)
  const descMatch = bank.description.toLowerCase().includes(ledger.description.toLowerCase().split(' ')[0]) ? 20 : 0;
  score += descMatch;
  
  return score;
}

function getMatchReason(bank: Transaction, ledger: Transaction): string {
  const reasons = [];
  if (Math.abs(bank.amount - ledger.amount) < 1) reasons.push('Amount matches');
  if (bank.reference === ledger.reference) reasons.push('Reference matches');
  return reasons.join(', ') || 'Partial match based on AI analysis';
}

function validateArithmetic(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (data.lineItems && Array.isArray(data.lineItems)) {
    const calculatedSubtotal = data.lineItems.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.unitPrice), 0);
    
    if (Math.abs(calculatedSubtotal - data.subtotal) > 0.01) {
      errors.push(`Subtotal mismatch: calculated ${calculatedSubtotal}, found ${data.subtotal}`);
    }
  }
  
  const calculatedTotal = (data.subtotal || 0) + (data.tax || 0) - (data.discount || 0);
  if (Math.abs(calculatedTotal - data.total) > 0.01) {
    errors.push(`Total mismatch: calculated ${calculatedTotal}, found ${data.total}`);
  }
  
  return { valid: errors.length === 0, errors };
}

function validateDates(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (data.date && data.dueDate) {
    const invoiceDate = new Date(data.date);
    const dueDate = new Date(data.dueDate);
    
    if (dueDate < invoiceDate) {
      errors.push('Due date is before invoice date');
    }
  }
  
  return { valid: errors.length === 0, errors };
}

async function validateGSTIN(gstin: string): Promise<{ valid: boolean; details?: any }> {
  // GSTIN format: 2 digits state code + 10 char PAN + 1 entity code + 1 check digit
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!gstinRegex.test(gstin)) {
    return { valid: false };
  }
  
  // TODO: Call GST API for verification
  return { valid: true, details: { format: 'valid' } };
}

function calculateGST(amount: number, hsnCode: string | undefined, gstType: string): any {
  // Default rates - would come from HSN master
  const rate = 18; // Default 18%
  const taxAmount = amount * (rate / 100);
  
  if (gstType === 'igst') {
    return {
      taxAmount,
      breakdown: { igst: taxAmount },
      effectiveRate: rate
    };
  } else {
    return {
      taxAmount,
      breakdown: { 
        cgst: taxAmount / 2, 
        sgst: taxAmount / 2 
      },
      effectiveRate: rate
    };
  }
}

function calculateTDS(amount: number, section: string | undefined): any {
  // TDS rates by section
  const rates: Record<string, number> = {
    '194C': 1, // Contractors (Individual)
    '194J': 10, // Professional fees
    '194I': 10, // Rent
    '194H': 5, // Commission
    '194A': 10, // Interest
  };
  
  const rate = rates[section || '194J'] || 10;
  const tdsAmount = amount * (rate / 100);
  
  return {
    taxAmount: tdsAmount,
    breakdown: { tds: tdsAmount, section },
    effectiveRate: rate
  };
}

function calculateIncomeTax(income: number, ay: string, regime: string): any {
  // New tax regime slabs (FY 2024-25)
  const newSlabs = [
    { limit: 300000, rate: 0 },
    { limit: 700000, rate: 5 },
    { limit: 1000000, rate: 10 },
    { limit: 1200000, rate: 15 },
    { limit: 1500000, rate: 20 },
    { limit: Infinity, rate: 30 }
  ];
  
  let tax = 0;
  let remaining = income;
  let prevLimit = 0;
  
  for (const slab of newSlabs) {
    const taxableInSlab = Math.min(remaining, slab.limit - prevLimit);
    if (taxableInSlab > 0) {
      tax += taxableInSlab * (slab.rate / 100);
      remaining -= taxableInSlab;
    }
    prevLimit = slab.limit;
    if (remaining <= 0) break;
  }
  
  // Rebate u/s 87A
  const rebate = income <= 700000 ? Math.min(tax, 25000) : 0;
  
  // Health & Education Cess
  const cess = (tax - rebate) * 0.04;
  
  return {
    taxAmount: tax - rebate + cess,
    breakdown: {
      basicTax: tax,
      rebate,
      cess,
      netTax: tax - rebate + cess
    },
    effectiveRate: ((tax - rebate + cess) / income) * 100
  };
}

function validateGSTReturn(gstReturn: any): string[] {
  const errors: string[] = [];
  
  // Validate GSTIN format
  if (!gstReturn.gstin || gstReturn.gstin.length !== 15) {
    errors.push('Invalid GSTIN format');
  }
  
  // Validate period
  if (!gstReturn.period || !/^\d{6}$/.test(gstReturn.period)) {
    errors.push('Invalid return period format');
  }
  
  return errors;
}

function analyzeLiquidity(ratios: Record<string, number>): any {
  const status = ratios.currentRatio >= 2 ? 'healthy' : ratios.currentRatio >= 1 ? 'adequate' : 'concerning';
  return {
    status,
    message: `Current ratio of ${ratios.currentRatio.toFixed(2)} indicates ${status} liquidity`
  };
}

function analyzeProfitability(ratios: Record<string, number>): any {
  const status = ratios.netProfitMargin >= 15 ? 'excellent' : ratios.netProfitMargin >= 5 ? 'good' : 'needs improvement';
  return {
    status,
    message: `Net profit margin of ${ratios.netProfitMargin.toFixed(2)}% is ${status}`
  };
}

function analyzeEfficiency(ratios: Record<string, number>): any {
  return {
    status: ratios.assetTurnover >= 1 ? 'efficient' : 'suboptimal',
    message: `Asset turnover of ${ratios.assetTurnover.toFixed(2)} times`
  };
}

function analyzeLeverage(ratios: Record<string, number>): any {
  const status = ratios.debtToEquity <= 1 ? 'conservative' : ratios.debtToEquity <= 2 ? 'moderate' : 'aggressive';
  return {
    status,
    message: `Debt-to-equity of ${ratios.debtToEquity.toFixed(2)} indicates ${status} leverage`
  };
}
