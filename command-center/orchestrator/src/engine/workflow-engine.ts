// ============================================
// ACCUTE ORCHESTRATOR - Workflow Engine
// The brain that executes workflows with AI verification
// ============================================

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import {
  Workflow,
  WorkflowExecution,
  WorkflowNode,
  NodeExecution,
  ExecutionStatus,
  ExecutionContext,
  AuditEntry,
  Checkpoint
} from '../types/workflow';
import { NodeRegistry } from './node-registry';
import { ExpressionEvaluator } from './expression-evaluator';
import { AIVerifier } from './ai-verifier';
import { AuditLogger } from './audit-logger';

const logger = pino({ name: 'workflow-engine' });

export interface EngineConfig {
  maxConcurrentExecutions: number;
  defaultTimeout: number;
  checkpointInterval: number;
  enableAIVerification: boolean;
  auditLevel: 'minimal' | 'standard' | 'detailed' | 'forensic';
}

export class WorkflowEngine extends EventEmitter {
  private nodeRegistry: NodeRegistry;
  private expressionEvaluator: ExpressionEvaluator;
  private aiVerifier: AIVerifier;
  private auditLogger: AuditLogger;
  private activeExecutions: Map<string, WorkflowExecution>;
  private config: EngineConfig;

  constructor(config: Partial<EngineConfig> = {}) {
    super();
    this.config = {
      maxConcurrentExecutions: 100,
      defaultTimeout: 300000, // 5 minutes
      checkpointInterval: 10000, // 10 seconds
      enableAIVerification: true,
      auditLevel: 'detailed',
      ...config
    };

    this.nodeRegistry = new NodeRegistry();
    this.expressionEvaluator = new ExpressionEvaluator();
    this.aiVerifier = new AIVerifier();
    this.auditLogger = new AuditLogger();
    this.activeExecutions = new Map();
  }

  /**
   * Execute a workflow
   */
  async execute(
    workflow: Workflow,
    triggerData: unknown,
    options: ExecutionOptions = {}
  ): Promise<WorkflowExecution> {
    const executionId = uuidv4();
    
    // Create execution record
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      tenantId: workflow.tenantId,
      status: 'running',
      startedAt: new Date(),
      triggeredBy: options.triggeredBy || 'system',
      triggerData,
      nodeExecutions: [],
      variables: { ...workflow.variables },
      auditTrail: [],
      checkpoints: []
    };

    this.activeExecutions.set(executionId, execution);
    
    // Emit start event
    this.emit('execution:start', { executionId, workflowId: workflow.id });
    
    // Audit log
    await this.auditLogger.log({
      executionId,
      event: 'execution_started',
      workflowId: workflow.id,
      tenantId: workflow.tenantId,
      data: { triggerData }
    });

    try {
      // Build execution graph
      const graph = this.buildExecutionGraph(workflow);
      
      // Create execution context
      const context: ExecutionContext = {
        executionId,
        workflowId: workflow.id,
        tenantId: workflow.tenantId,
        variables: execution.variables,
        credentials: await this.loadCredentials(workflow.credentials || []),
        nodeOutputs: new Map(),
        startTime: Date.now()
      };

      // Execute nodes in topological order
      const result = await this.executeGraph(graph, context, execution);
      
      // Complete execution
      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.duration = Date.now() - execution.startedAt.getTime();
      execution.output = result;

      // Final audit
      await this.auditLogger.log({
        executionId,
        event: 'execution_completed',
        workflowId: workflow.id,
        tenantId: workflow.tenantId,
        data: { duration: execution.duration, nodeCount: execution.nodeExecutions.length }
      });

      this.emit('execution:complete', { executionId, result });
      
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.duration = Date.now() - execution.startedAt.getTime();
      execution.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        nodeId: (error as any).nodeId,
        code: (error as any).code || 'EXECUTION_ERROR',
        recoverable: (error as any).recoverable ?? false
      };

      await this.auditLogger.log({
        executionId,
        event: 'execution_failed',
        workflowId: workflow.id,
        tenantId: workflow.tenantId,
        data: { error: execution.error }
      });

      this.emit('execution:error', { executionId, error: execution.error });
    } finally {
      this.activeExecutions.delete(executionId);
    }

    return execution;
  }

  /**
   * Build execution graph from workflow
   */
  private buildExecutionGraph(workflow: Workflow): ExecutionGraph {
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, string[]>();

    // Add all nodes
    for (const node of workflow.nodes) {
      nodes.set(node.id, {
        node,
        dependencies: [],
        dependents: []
      });
    }

    // Build edges
    for (const edge of workflow.edges) {
      const sourceNode = nodes.get(edge.source);
      const targetNode = nodes.get(edge.target);
      
      if (sourceNode && targetNode) {
        sourceNode.dependents.push(edge.target);
        targetNode.dependencies.push(edge.source);
      }
    }

    // Find start nodes (no dependencies)
    const startNodes = Array.from(nodes.values())
      .filter(n => n.dependencies.length === 0)
      .map(n => n.node.id);

    return { nodes, startNodes };
  }

  /**
   * Execute the graph
   */
  private async executeGraph(
    graph: ExecutionGraph,
    context: ExecutionContext,
    execution: WorkflowExecution
  ): Promise<unknown> {
    const completed = new Set<string>();
    const pending = new Set<string>(graph.startNodes);
    const results = new Map<string, unknown>();

    while (pending.size > 0) {
      // Get nodes that are ready to execute
      const ready = Array.from(pending).filter(nodeId => {
        const node = graph.nodes.get(nodeId)!;
        return node.dependencies.every(dep => completed.has(dep));
      });

      if (ready.length === 0) {
        throw new Error('Circular dependency detected in workflow');
      }

      // Execute ready nodes in parallel
      const executions = ready.map(async nodeId => {
        pending.delete(nodeId);
        
        const graphNode = graph.nodes.get(nodeId)!;
        const node = graphNode.node;

        // Check condition
        if (node.condition) {
          const shouldExecute = await this.expressionEvaluator.evaluate(
            node.condition,
            context
          );
          if (!shouldExecute) {
            logger.info({ nodeId, condition: node.condition }, 'Node skipped due to condition');
            completed.add(nodeId);
            return;
          }
        }

        // Execute node
        const nodeExecution = await this.executeNode(node, context, execution);
        execution.nodeExecutions.push(nodeExecution);
        
        // Store result
        results.set(nodeId, nodeExecution.output);
        context.nodeOutputs.set(nodeId, nodeExecution.output);
        
        // Mark completed
        completed.add(nodeId);
        
        // Add dependents to pending
        for (const dependent of graphNode.dependents) {
          if (!completed.has(dependent) && !pending.has(dependent)) {
            pending.add(dependent);
          }
        }
      });

      await Promise.all(executions);
    }

    // Return final node output
    const endNodes = Array.from(graph.nodes.values())
      .filter(n => n.dependents.length === 0);
    
    if (endNodes.length === 1) {
      return results.get(endNodes[0].node.id);
    }
    
    return Object.fromEntries(
      endNodes.map(n => [n.node.id, results.get(n.node.id)])
    );
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    node: WorkflowNode,
    context: ExecutionContext,
    execution: WorkflowExecution
  ): Promise<NodeExecution> {
    const nodeExecution: NodeExecution = {
      id: uuidv4(),
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      status: 'running',
      startedAt: new Date(),
      attempts: 1,
      retryCount: 0,
      input: null
    };

    const startTime = Date.now();

    try {
      // Get node handler
      const handler = this.nodeRegistry.get(node.type);
      if (!handler) {
        throw new Error(`Unknown node type: ${node.type}`);
      }

      // Prepare inputs
      const inputs = await this.resolveInputs(node, context);

      // Audit input (if not sensitive)
      if (node.auditLevel !== 'none') {
        await this.auditLogger.log({
          executionId: context.executionId,
          event: 'node_started',
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.type,
          data: node.auditLevel === 'forensic' ? { inputs } : undefined
        });
      }

      // Execute with timeout
      const timeout = node.timeout || this.config.defaultTimeout;
      const output = await this.withTimeout(
        handler.execute(inputs, node.config, context),
        timeout
      );

      // AI Verification (if enabled)
      if (this.config.enableAIVerification && node.aiVerification) {
        const verification = await this.aiVerifier.verify(
          node,
          inputs,
          output,
          node.aiVerification
        );
        
        if (!verification.passed) {
          throw new AIVerificationError(
            `AI verification failed: ${verification.reason}`,
            node.id,
            verification
          );
        }
        
        nodeExecution.aiVerification = verification;
      }

      // Success
      nodeExecution.status = 'completed';
      nodeExecution.output = output;
      nodeExecution.completedAt = new Date();
      nodeExecution.duration = Date.now() - startTime;

      // Audit output
      if (node.auditLevel !== 'none') {
        await this.auditLogger.log({
          executionId: context.executionId,
          event: 'node_completed',
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.type,
          duration: nodeExecution.duration,
          data: node.auditLevel === 'forensic' ? { output } : undefined
        });
      }

      this.emit('node:complete', {
        executionId: context.executionId,
        nodeId: node.id,
        duration: nodeExecution.duration
      });

    } catch (error) {
      // Handle retry
      const retryPolicy = node.retryPolicy || { maxRetries: 0, initialDelay: 1000, backoffMultiplier: 2, maxDelay: 30000 };
      const attempts = nodeExecution.attempts ?? 1;
      
      if (attempts <= retryPolicy.maxRetries) {
        const delay = Math.min(
          retryPolicy.initialDelay * Math.pow(retryPolicy.backoffMultiplier, attempts - 1),
          retryPolicy.maxDelay
        );
        
        logger.warn({ nodeId: node.id, attempt: attempts, delay }, 'Retrying node');
        await this.sleep(delay);
        nodeExecution.attempts = attempts + 1;
        return this.executeNode(node, context, execution);
      }

      // Final failure
      nodeExecution.status = 'failed';
      nodeExecution.completedAt = new Date();
      nodeExecution.duration = Date.now() - startTime;
      nodeExecution.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any).code || 'NODE_ERROR',
        stack: error instanceof Error ? error.stack : undefined,
        recoverable: false
      };

      await this.auditLogger.log({
        executionId: context.executionId,
        event: 'node_failed',
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        data: { error: nodeExecution.error }
      });

      this.emit('node:error', {
        executionId: context.executionId,
        nodeId: node.id,
        error: nodeExecution.error
      });

      throw error;
    }

    return nodeExecution;
  }

  /**
   * Resolve node inputs from context
   */
  private async resolveInputs(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const inputs: Record<string, unknown> = {};

    for (const input of node.inputs) {
      if (input.source) {
        // Parse source (nodeId.outputName)
        const [nodeId, outputName] = input.source.split('.');
        const nodeOutput = context.nodeOutputs.get(nodeId);
        
        if (nodeOutput && typeof nodeOutput === 'object') {
          inputs[input.name] = (nodeOutput as Record<string, unknown>)[outputName];
        } else {
          inputs[input.name] = nodeOutput;
        }
      } else if (input.required) {
        throw new Error(`Required input '${input.name}' not connected for node ${node.id}`);
      }
    }

    return inputs;
  }

  /**
   * Load credentials from Vault
   */
  private async loadCredentials(credentialIds: string[]): Promise<Record<string, unknown>> {
    // TODO: Integrate with Vault
    return {};
  }

  /**
   * Execute with timeout
   */
  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
      )
    ]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): WorkflowExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Cancel an execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return false;

    execution.status = 'cancelled';
    execution.completedAt = new Date();
    
    await this.auditLogger.log({
      executionId,
      event: 'execution_cancelled',
      workflowId: execution.workflowId,
      tenantId: execution.tenantId
    });

    this.emit('execution:cancelled', { executionId });
    return true;
  }
}

// Types
interface ExecutionOptions {
  triggeredBy?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

interface ExecutionGraph {
  nodes: Map<string, GraphNode>;
  startNodes: string[];
}

interface GraphNode {
  node: WorkflowNode;
  dependencies: string[];
  dependents: string[];
}

class AIVerificationError extends Error {
  constructor(
    message: string,
    public nodeId: string,
    public verification: any
  ) {
    super(message);
    this.name = 'AIVerificationError';
  }
}
