// ============================================
// ACCUTE ORCHESTRATOR - API Server
// RESTful API for workflow management
// ============================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { WorkflowEngine } from '../engine/workflow-engine';
import { WorkflowScheduler } from './scheduler';
import { WorkflowRepository } from '../storage/workflow-repository';
import { Workflow, WorkflowExecution, TriggerNode, WorkflowSettings, WorkflowCategory, ComplianceRequirement } from '../types/workflow';
import { NodeHandler } from '../engine/node-registry';

const logger = pino({ name: 'api-server' });

// Validation schemas
const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  tenantId: z.string(),
  nodes: z.array(z.any()),
  edges: z.array(z.object({
    id: z.string().optional(),
    source: z.string(),
    target: z.string(),
    sourceOutput: z.string().optional(),
    targetInput: z.string().optional()
  })),
  triggers: z.array(z.any()).optional(),
  trigger: z.any().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  compliance: z.array(z.string()).optional(),
  variables: z.record(z.any()).optional(),
  settings: z.object({
    timeout: z.number().optional(),
    retryPolicy: z.any().optional(),
    notifications: z.any().optional()
  }).optional()
});

const ExecuteWorkflowSchema = z.object({
  triggerData: z.any().optional(),
  variables: z.record(z.any()).optional(),
  dryRun: z.boolean().optional()
});

export class APIServer {
  private app: express.Application;
  private engine: WorkflowEngine;
  private scheduler: WorkflowScheduler;
  private repository: WorkflowRepository;

  constructor(
    engine: WorkflowEngine,
    scheduler: WorkflowScheduler,
    repository: WorkflowRepository
  ) {
    this.engine = engine;
    this.scheduler = scheduler;
    this.repository = repository;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.CORS_ORIGINS?.split(',') || '*',
      credentials: true
    }));
    
    // Parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Compression
    this.app.use(compression());
    
    // Logging
    this.app.use(pinoHttp({
      logger,
      genReqId: () => uuidv4()
    }));

    // Request ID
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
      res.setHeader('X-Request-ID', req.headers['x-request-id'] as string);
      next();
    });
  }

  private setupRoutes(): void {
    const router = express.Router();

    // Health check
    router.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        activeExecutions: this.engine.getActiveExecutions().length
      });
    });

    // ==========================================
    // WORKFLOW MANAGEMENT
    // ==========================================

    // List workflows
    router.get('/workflows', this.asyncHandler(async (req, res) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'X-Tenant-ID header required' });
        return;
      }

      const { page = 1, limit = 20, status, search } = req.query;
      const workflows = await this.repository.listWorkflows({
        tenantId,
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        search: search as string
      });

      res.json(workflows);
    }));

    // Get workflow
    router.get('/workflows/:id', this.asyncHandler(async (req, res) => {
      const workflow = await this.repository.getWorkflow(req.params.id);
      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }
      res.json(workflow);
    }));

    // Create workflow
    router.post('/workflows', this.asyncHandler(async (req, res) => {
      const data = CreateWorkflowSchema.parse(req.body);
      
      const workflow: Workflow = {
        id: uuidv4(),
        ...data,
        category: data.category as WorkflowCategory | undefined,
        compliance: data.compliance as ComplianceRequirement[] | undefined,
        settings: data.settings as WorkflowSettings | undefined,
        version: 1,
        status: 'draft',
        credentials: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: req.headers['x-user-id'] as string || 'system'
      };

      await this.repository.createWorkflow(workflow);
      
      logger.info({ workflowId: workflow.id, name: workflow.name }, 'Workflow created');
      res.status(201).json(workflow);
    }));

    // Update workflow
    router.put('/workflows/:id', this.asyncHandler(async (req, res) => {
      const existing = await this.repository.getWorkflow(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }

      const data = CreateWorkflowSchema.partial().parse(req.body);
      
      const updated: Workflow = {
        ...existing,
        ...data,
        category: (data.category || existing.category) as WorkflowCategory | undefined,
        compliance: (data.compliance || existing.compliance) as ComplianceRequirement[] | undefined,
        settings: (data.settings || existing.settings) as WorkflowSettings | undefined,
        version: existing.version + 1,
        updatedAt: new Date()
      };

      await this.repository.updateWorkflow(updated);
      
      logger.info({ workflowId: updated.id, version: updated.version }, 'Workflow updated');
      res.json(updated);
    }));

    // Delete workflow
    router.delete('/workflows/:id', this.asyncHandler(async (req, res) => {
      await this.repository.deleteWorkflow(req.params.id);
      res.status(204).send();
    }));

    // Activate/deactivate workflow
    router.post('/workflows/:id/activate', this.asyncHandler(async (req, res) => {
      const workflow = await this.repository.getWorkflow(req.params.id);
      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }

      workflow.status = 'active';
      workflow.updatedAt = new Date();
      await this.repository.updateWorkflow(workflow);

      // Register triggers
      if (workflow.triggers) {
        await this.scheduler.registerTriggers(workflow);
      }

      res.json({ status: 'active' });
    }));

    router.post('/workflows/:id/deactivate', this.asyncHandler(async (req, res) => {
      const workflow = await this.repository.getWorkflow(req.params.id);
      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }

      workflow.status = 'inactive';
      workflow.updatedAt = new Date();
      await this.repository.updateWorkflow(workflow);

      // Unregister triggers
      await this.scheduler.unregisterTriggers(workflow.id);

      res.json({ status: 'inactive' });
    }));

    // ==========================================
    // WORKFLOW EXECUTION
    // ==========================================

    // Execute workflow
    router.post('/workflows/:id/execute', this.asyncHandler(async (req, res) => {
      const workflow = await this.repository.getWorkflow(req.params.id);
      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }

      const data = ExecuteWorkflowSchema.parse(req.body);

      // Merge variables
      if (data.variables) {
        workflow.variables = { ...workflow.variables, ...data.variables };
      }

      // Execute
      const execution = await this.engine.execute(
        workflow,
        data.triggerData || {},
        { triggeredBy: req.headers['x-user-id'] as string || 'api' }
      );

      // Save execution
      await this.repository.saveExecution(execution);

      res.status(202).json({
        executionId: execution.id,
        status: execution.status,
        startedAt: execution.startedAt
      });
    }));

    // Execute workflow synchronously (wait for result)
    router.post('/workflows/:id/execute-sync', this.asyncHandler(async (req, res) => {
      const workflow = await this.repository.getWorkflow(req.params.id);
      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }

      const data = ExecuteWorkflowSchema.parse(req.body);

      if (data.variables) {
        workflow.variables = { ...workflow.variables, ...data.variables };
      }

      const execution = await this.engine.execute(
        workflow,
        data.triggerData || {},
        { triggeredBy: req.headers['x-user-id'] as string || 'api' }
      );

      await this.repository.saveExecution(execution);

      res.json(execution);
    }));

    // Get execution
    router.get('/executions/:id', this.asyncHandler(async (req, res) => {
      const execution = await this.repository.getExecution(req.params.id);
      if (!execution) {
        res.status(404).json({ error: 'Execution not found' });
        return;
      }
      res.json(execution);
    }));

    // List executions
    router.get('/workflows/:id/executions', this.asyncHandler(async (req, res) => {
      const { page = 1, limit = 20, status } = req.query;
      const executions = await this.repository.listExecutions({
        workflowId: req.params.id,
        page: Number(page),
        limit: Number(limit),
        status: status as string
      });
      res.json(executions);
    }));

    // Cancel execution
    router.post('/executions/:id/cancel', this.asyncHandler(async (req, res) => {
      const success = await this.engine.cancelExecution(req.params.id);
      if (!success) {
        res.status(404).json({ error: 'Execution not found or already completed' });
        return;
      }
      res.json({ status: 'cancelled' });
    }));

    // ==========================================
    // WEBHOOKS
    // ==========================================

    // Webhook trigger endpoint
    router.all('/webhooks/:workflowId/:triggerId', this.asyncHandler(async (req, res) => {
      const { workflowId, triggerId } = req.params;
      
      const workflow = await this.repository.getWorkflow(workflowId);
      if (!workflow || workflow.status !== 'active') {
        res.status(404).json({ error: 'Workflow not found or inactive' });
        return;
      }

      // Find trigger
      const trigger = workflow.triggers?.find((t: TriggerNode) => t.id === triggerId);
      if (!trigger || trigger.type !== 'webhook') {
        res.status(404).json({ error: 'Trigger not found' });
        return;
      }

      // Validate method
      if (trigger.config.method && req.method !== trigger.config.method) {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // Execute workflow
      const triggerData = {
        method: req.method,
        headers: req.headers,
        query: req.query,
        body: req.body,
        params: req.params
      };

      const execution = await this.engine.execute(
        workflow,
        triggerData,
        { triggeredBy: 'webhook' }
      );

      await this.repository.saveExecution(execution);

      // Response mode
      if (trigger.config.waitForCompletion) {
        res.json(execution);
      } else {
        res.status(202).json({ executionId: execution.id });
      }
    }));

    // ==========================================
    // NODE CATALOG
    // ==========================================

    router.get('/nodes', (req, res) => {
      const { NodeRegistry } = require('../engine/node-registry');
      const registry = new NodeRegistry();
      
      const nodes = registry.getAll().map((n: NodeHandler) => ({
        type: n.type,
        name: n.name,
        description: n.description,
        category: n.category,
        configSchema: n.configSchema,
        inputsSchema: n.inputsSchema,
        outputsSchema: n.outputsSchema
      }));

      res.json({
        nodes,
        categories: ['trigger', 'financial', 'ai', 'erp', 'communication', 'data', 'control', 'integration']
      });
    });

    // ==========================================
    // AUDIT LOG
    // ==========================================

    router.get('/audit', this.asyncHandler(async (req, res) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { workflowId, executionId, startDate, endDate, limit = 100 } = req.query;

      const entries = await this.repository.queryAuditLog({
        tenantId,
        workflowId: workflowId as string,
        executionId: executionId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: Number(limit)
      });

      res.json(entries);
    }));

    // Mount router
    this.app.use('/api/v1', router);
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    this.app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
      logger.error({ err, path: req.path }, 'Request error');

      if (err.name === 'ZodError') {
        res.status(400).json({
          error: 'Validation error',
          details: (err as unknown as { errors: unknown[] }).errors
        });
        return;
      }

      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });
  }

  private asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  start(port: number = 3000): void {
    this.app.listen(port, () => {
      logger.info({ port }, 'Accute Orchestrator API server started');
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}
