// ============================================
// ACCUTE ORCHESTRATOR - Node Registry
// Manages all available node types and handlers
// ============================================

import pino from 'pino';
import { NodeType, ExecutionContext } from '../types/workflow';

const logger = pino({ name: 'node-registry' });

export interface NodeHandler {
  type: NodeType;
  name: string;
  description: string;
  category: 'trigger' | 'financial' | 'ai' | 'erp' | 'communication' | 'data' | 'control' | 'integration';
  
  // Schema for node configuration
  configSchema: NodeSchema;
  
  // Schema for inputs
  inputsSchema: NodeInputSchema[];
  
  // Schema for outputs
  outputsSchema: NodeOutputSchema[];
  
  // Execute the node
  execute: (
    inputs: Record<string, unknown>,
    config: Record<string, unknown>,
    context: ExecutionContext
  ) => Promise<unknown>;
  
  // Validate configuration
  validate?: (config: Record<string, unknown>) => ValidationResult;
  
  // Test connection (for integration nodes)
  testConnection?: (config: Record<string, unknown>) => Promise<boolean>;
}

export interface NodeSchema {
  type: 'object';
  properties: Record<string, PropertySchema>;
  required?: string[];
}

export interface PropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  title: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  items?: PropertySchema;
  properties?: Record<string, PropertySchema>;
}

export interface NodeInputSchema {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface NodeOutputSchema {
  name: string;
  type: string;
  description?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export class NodeRegistry {
  private handlers: Map<NodeType, NodeHandler> = new Map();

  constructor() {
    this.registerBuiltInNodes();
  }

  /**
   * Register a node handler
   */
  register(handler: NodeHandler): void {
    if (this.handlers.has(handler.type)) {
      logger.warn({ type: handler.type }, 'Overwriting existing node handler');
    }
    this.handlers.set(handler.type, handler);
    logger.info({ type: handler.type, name: handler.name }, 'Registered node handler');
  }

  /**
   * Get a node handler
   */
  get(type: NodeType): NodeHandler | undefined {
    return this.handlers.get(type);
  }

  /**
   * Get all registered handlers
   */
  getAll(): NodeHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Get handlers by category
   */
  getByCategory(category: NodeHandler['category']): NodeHandler[] {
    return Array.from(this.handlers.values())
      .filter(h => h.category === category);
  }

  /**
   * Register all built-in nodes
   */
  private registerBuiltInNodes(): void {
    // ==========================================
    // CONTROL FLOW NODES
    // ==========================================
    
    this.register({
      type: 'condition',
      name: 'Condition',
      description: 'Branch workflow based on condition',
      category: 'control',
      configSchema: {
        type: 'object',
        properties: {
          expression: { type: 'string', title: 'Condition Expression' },
          mode: { type: 'string', title: 'Mode', enum: ['if-else', 'switch'] }
        },
        required: ['expression']
      },
      inputsSchema: [{ name: 'data', type: 'any', required: true }],
      outputsSchema: [
        { name: 'true', type: 'any', description: 'Output when condition is true' },
        { name: 'false', type: 'any', description: 'Output when condition is false' }
      ],
      execute: async (inputs, config) => {
        // Condition evaluation happens at graph level
        return inputs.data;
      }
    });

    this.register({
      type: 'loop',
      name: 'Loop',
      description: 'Iterate over array items',
      category: 'control',
      configSchema: {
        type: 'object',
        properties: {
          mode: { type: 'string', title: 'Mode', enum: ['foreach', 'while', 'for'] },
          batchSize: { type: 'number', title: 'Batch Size', default: 1 }
        }
      },
      inputsSchema: [{ name: 'items', type: 'array', required: true }],
      outputsSchema: [{ name: 'results', type: 'array' }],
      execute: async (inputs) => {
        // Loop execution handled by engine
        return { items: inputs.items, index: 0 };
      }
    });

    this.register({
      type: 'merge',
      name: 'Merge',
      description: 'Merge multiple inputs',
      category: 'control',
      configSchema: {
        type: 'object',
        properties: {
          mode: { type: 'string', title: 'Mode', enum: ['concat', 'merge', 'zip'] }
        }
      },
      inputsSchema: [
        { name: 'input1', type: 'any', required: true },
        { name: 'input2', type: 'any', required: true }
      ],
      outputsSchema: [{ name: 'merged', type: 'any' }],
      execute: async (inputs, config) => {
        const mode = config.mode || 'merge';
        if (mode === 'concat' && Array.isArray(inputs.input1) && Array.isArray(inputs.input2)) {
          return [...inputs.input1, ...inputs.input2];
        }
        return { ...inputs.input1 as object, ...inputs.input2 as object };
      }
    });

    this.register({
      type: 'delay',
      name: 'Delay',
      description: 'Wait for specified duration',
      category: 'control',
      configSchema: {
        type: 'object',
        properties: {
          duration: { type: 'number', title: 'Duration (ms)', default: 1000 }
        },
        required: ['duration']
      },
      inputsSchema: [{ name: 'data', type: 'any', required: false }],
      outputsSchema: [{ name: 'data', type: 'any' }],
      execute: async (inputs, config) => {
        await new Promise(resolve => setTimeout(resolve, config.duration as number));
        return inputs.data;
      }
    });

    // ==========================================
    // DATA TRANSFORMATION NODES
    // ==========================================

    this.register({
      type: 'transform',
      name: 'Transform',
      description: 'Transform data using expression',
      category: 'data',
      configSchema: {
        type: 'object',
        properties: {
          expression: { type: 'string', title: 'Transform Expression' },
          language: { type: 'string', title: 'Language', enum: ['javascript', 'jsonata', 'jmespath'] }
        },
        required: ['expression']
      },
      inputsSchema: [{ name: 'data', type: 'any', required: true }],
      outputsSchema: [{ name: 'result', type: 'any' }],
      execute: async (inputs, config) => {
        // Use expression evaluator
        const expr = config.expression as string;
        // Simple transform - replace $data with input
        try {
          const fn = new Function('$data', `return ${expr}`);
          return fn(inputs.data);
        } catch (e) {
          throw new Error(`Transform expression error: ${e}`);
        }
      }
    });

    this.register({
      type: 'filter',
      name: 'Filter',
      description: 'Filter array items',
      category: 'data',
      configSchema: {
        type: 'object',
        properties: {
          condition: { type: 'string', title: 'Filter Condition' }
        },
        required: ['condition']
      },
      inputsSchema: [{ name: 'items', type: 'array', required: true }],
      outputsSchema: [{ name: 'filtered', type: 'array' }],
      execute: async (inputs, config) => {
        const items = inputs.items as any[];
        const condition = config.condition as string;
        try {
          const fn = new Function('$item', '$index', `return ${condition}`);
          return items.filter((item, index) => fn(item, index));
        } catch (e) {
          throw new Error(`Filter condition error: ${e}`);
        }
      }
    });

    this.register({
      type: 'aggregate',
      name: 'Aggregate',
      description: 'Aggregate array data',
      category: 'data',
      configSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string', title: 'Operation', enum: ['sum', 'avg', 'min', 'max', 'count', 'group'] },
          field: { type: 'string', title: 'Field' }
        },
        required: ['operation']
      },
      inputsSchema: [{ name: 'items', type: 'array', required: true }],
      outputsSchema: [{ name: 'result', type: 'any' }],
      execute: async (inputs, config) => {
        const items = inputs.items as any[];
        const field = config.field as string;
        const op = config.operation as string;
        
        const values = field ? items.map(i => i[field]) : items;
        const nums = values.map(Number).filter(n => !isNaN(n));
        
        switch (op) {
          case 'sum': return nums.reduce((a, b) => a + b, 0);
          case 'avg': return nums.reduce((a, b) => a + b, 0) / nums.length;
          case 'min': return Math.min(...nums);
          case 'max': return Math.max(...nums);
          case 'count': return items.length;
          default: return items;
        }
      }
    });

    this.register({
      type: 'set_variable',
      name: 'Set Variable',
      description: 'Set workflow variable',
      category: 'data',
      configSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Variable Name' },
          value: { type: 'string', title: 'Value Expression' }
        },
        required: ['name']
      },
      inputsSchema: [{ name: 'data', type: 'any', required: false }],
      outputsSchema: [{ name: 'data', type: 'any' }],
      execute: async (inputs, config, context) => {
        const name = config.name as string;
        const value = config.value || inputs.data;
        context.variables[name] = value;
        return inputs.data;
      }
    });

    // ==========================================
    // HTTP NODES
    // ==========================================

    this.register({
      type: 'http_request',
      name: 'HTTP Request',
      description: 'Make HTTP request',
      category: 'integration',
      configSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', title: 'URL' },
          method: { type: 'string', title: 'Method', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
          headers: { type: 'object', title: 'Headers' },
          timeout: { type: 'number', title: 'Timeout (ms)', default: 30000 }
        },
        required: ['url', 'method']
      },
      inputsSchema: [{ name: 'body', type: 'object', required: false }],
      outputsSchema: [
        { name: 'data', type: 'any' },
        { name: 'status', type: 'number' },
        { name: 'headers', type: 'object' }
      ],
      execute: async (inputs, config) => {
        const response = await fetch(config.url as string, {
          method: config.method as string,
          headers: {
            'Content-Type': 'application/json',
            ...(config.headers as Record<string, string>)
          },
          body: inputs.body ? JSON.stringify(inputs.body) : undefined
        });
        
        return {
          data: await response.json().catch(() => response.text()),
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        };
      }
    });

    // ==========================================
    // HUMAN APPROVAL NODES
    // ==========================================

    this.register({
      type: 'human_approval',
      name: 'Human Approval',
      description: 'Wait for human approval before continuing',
      category: 'control',
      configSchema: {
        type: 'object',
        properties: {
          approvers: { type: 'array', title: 'Approvers', items: { type: 'string', title: 'Approver' } },
          requiredCount: { type: 'number', title: 'Required Approvals', default: 1 },
          timeout: { type: 'number', title: 'Timeout (hours)', default: 24 },
          message: { type: 'string', title: 'Approval Message' }
        },
        required: ['approvers']
      },
      inputsSchema: [{ name: 'data', type: 'any', required: true }],
      outputsSchema: [
        { name: 'approved', type: 'boolean' },
        { name: 'approver', type: 'string' },
        { name: 'comments', type: 'string' }
      ],
      execute: async (inputs, config, context) => {
        // This creates a pending approval and pauses execution
        // Real implementation would persist and resume
        return {
          pending: true,
          approvalId: context.executionId,
          data: inputs.data,
          message: config.message
        };
      }
    });

    this.register({
      type: 'notify',
      name: 'Notification',
      description: 'Send notification',
      category: 'communication',
      configSchema: {
        type: 'object',
        properties: {
          channel: { type: 'string', title: 'Channel', enum: ['email', 'slack', 'whatsapp', 'sms', 'push'] },
          recipient: { type: 'string', title: 'Recipient' },
          template: { type: 'string', title: 'Template ID' },
          subject: { type: 'string', title: 'Subject' },
          message: { type: 'string', title: 'Message' }
        },
        required: ['channel', 'recipient']
      },
      inputsSchema: [{ name: 'data', type: 'object', required: false }],
      outputsSchema: [{ name: 'messageId', type: 'string' }],
      execute: async (inputs, config) => {
        // Integration with notification service
        logger.info({ channel: config.channel, recipient: config.recipient }, 'Sending notification');
        return { messageId: `msg_${Date.now()}`, sent: true };
      }
    });

    logger.info({ count: this.handlers.size }, 'Registered built-in nodes');
  }
}
