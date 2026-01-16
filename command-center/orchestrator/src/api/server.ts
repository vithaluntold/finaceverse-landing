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
import {
  requireAuth,
  requireSuperAdmin,
  requireAdmin,
  requireOperator,
  enforceTenantIsolation,
  auditLogger,
  getAuditLog as getAuthAuditLog,
  AuthenticatedRequest
} from '../middleware/auth';
import {
  login,
  logout,
  refreshSession,
  createUser,
  listUsers,
  updateUserPassword,
  deactivateUser,
  invalidateAllUserSessions,
  getUserSessions
} from '../services/auth-service';

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

    // Audit logging for all authenticated requests
    this.app.use(auditLogger);
  }

  private setupRoutes(): void {
    const router = express.Router();

    // Health check (public - no auth required)
    router.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        activeExecutions: this.engine.getActiveExecutions().length
      });
    });

    // ==========================================
    // AUTHENTICATION ROUTES (PUBLIC)
    // ==========================================

    // Login
    router.post('/auth/login', this.asyncHandler(async (req: Request, res) => {
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
    }));

    // Refresh token
    router.post('/auth/refresh', this.asyncHandler(async (req: Request, res) => {
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
    }));

    // Logout (requires auth)
    router.post('/auth/logout', requireAuth({ minimumRole: 'viewer' }), (req: AuthenticatedRequest, res) => {
      const sessionId = (req as AuthenticatedRequest & { superadminSession?: string }).superadminSession;
      if (sessionId) {
        logout(sessionId);
      }
      res.json({ message: 'Logged out successfully' });
    });

    // ==========================================
    // USER MANAGEMENT (SuperAdmin only)
    // ==========================================

    // List users
    router.get('/auth/users', requireSuperAdmin, (req: AuthenticatedRequest, res) => {
      const users = listUsers();
      res.json({ users, total: users.length });
    });

    // Create user
    router.post('/auth/users', requireSuperAdmin, this.asyncHandler(async (req: AuthenticatedRequest, res) => {
      const { username, email, password, role, tenantId, permissions } = req.body;
      
      if (!username || !email || !password || !role) {
        res.status(400).json({ error: 'Username, email, password, and role required' });
        return;
      }

      try {
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
    }));

    // Update user password
    router.put('/auth/users/:username/password', requireSuperAdmin, this.asyncHandler(async (req: AuthenticatedRequest, res) => {
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
    }));

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

    // ==========================================
    // AUTHENTICATION MIDDLEWARE
    // All routes below require authentication
    // ==========================================
    
    router.use(requireAuth({ minimumRole: 'operator' }));
    router.use(enforceTenantIsolation);

    // ==========================================
    // WORKFLOW MANAGEMENT
    // ==========================================

    // List workflows (operator+)
    router.get('/workflows', this.asyncHandler(async (req: AuthenticatedRequest, res) => {
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant context required' });
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

    // Get workflow (operator+)
    router.get('/workflows/:id', this.asyncHandler(async (req: AuthenticatedRequest, res) => {
      const workflow = await this.repository.getWorkflow(req.params.id);
      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }
      
      // Enforce tenant isolation (superadmins can see all)
      if (!req.isSuperAdmin && workflow.tenantId !== req.tenantId) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }
      
      res.json(workflow);
    }));

    // Create workflow (admin+ required)
    router.post('/workflows', requireAdmin, this.asyncHandler(async (req: AuthenticatedRequest, res) => {
      const data = CreateWorkflowSchema.parse(req.body);
      
      // Enforce tenant from auth context (superadmins can create for any tenant)
      const tenantId = req.isSuperAdmin ? (data.tenantId || req.tenantId) : req.tenantId;
      
      const workflow: Workflow = {
        id: uuidv4(),
        ...data,
        tenantId: tenantId!,
        category: data.category as WorkflowCategory | undefined,
        compliance: data.compliance as ComplianceRequirement[] | undefined,
        settings: data.settings as WorkflowSettings | undefined,
        version: 1,
        status: 'draft',
        credentials: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: req.userId || 'system'
      };

      await this.repository.createWorkflow(workflow);
      
      logger.info({ workflowId: workflow.id, name: workflow.name, userId: req.userId }, 'Workflow created');
      res.status(201).json(workflow);
    }));

    // Update workflow (admin+ required)
    router.put('/workflows/:id', requireAdmin, this.asyncHandler(async (req: AuthenticatedRequest, res) => {
      const existing = await this.repository.getWorkflow(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }
      
      // Enforce tenant isolation
      if (!req.isSuperAdmin && existing.tenantId !== req.tenantId) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }

      const data = CreateWorkflowSchema.partial().parse(req.body);
      
      const updated: Workflow = {
        ...existing,
        ...data,
        tenantId: existing.tenantId, // Cannot change tenant
        category: (data.category || existing.category) as WorkflowCategory | undefined,
        compliance: (data.compliance || existing.compliance) as ComplianceRequirement[] | undefined,
        settings: (data.settings || existing.settings) as WorkflowSettings | undefined,
        version: existing.version + 1,
        updatedAt: new Date()
      };

      await this.repository.updateWorkflow(updated);
      
      logger.info({ workflowId: updated.id, version: updated.version, userId: req.userId }, 'Workflow updated');
      res.json(updated);
    }));

    // Delete workflow (admin+ required)
    router.delete('/workflows/:id', requireAdmin, this.asyncHandler(async (req: AuthenticatedRequest, res) => {
      const existing = await this.repository.getWorkflow(req.params.id);
      if (existing && !req.isSuperAdmin && existing.tenantId !== req.tenantId) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }
      
      await this.repository.deleteWorkflow(req.params.id);
      logger.info({ workflowId: req.params.id, userId: req.userId }, 'Workflow deleted');
      res.status(204).send();
    }));

    // Activate/deactivate workflow (admin+ required)
    router.post('/workflows/:id/activate', requireAdmin, this.asyncHandler(async (req: AuthenticatedRequest, res) => {
      const workflow = await this.repository.getWorkflow(req.params.id);
      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }
      
      // Enforce tenant isolation
      if (!req.isSuperAdmin && workflow.tenantId !== req.tenantId) {
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

      logger.info({ workflowId: workflow.id, userId: req.userId }, 'Workflow activated');
      res.json({ status: 'active' });
    }));

    router.post('/workflows/:id/deactivate', requireAdmin, this.asyncHandler(async (req: AuthenticatedRequest, res) => {
      const workflow = await this.repository.getWorkflow(req.params.id);
      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }
      
      // Enforce tenant isolation
      if (!req.isSuperAdmin && workflow.tenantId !== req.tenantId) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }

      workflow.status = 'inactive';
      workflow.updatedAt = new Date();
      await this.repository.updateWorkflow(workflow);

      // Unregister triggers
      await this.scheduler.unregisterTriggers(workflow.id);

      logger.info({ workflowId: workflow.id, userId: req.userId }, 'Workflow deactivated');
      res.json({ status: 'inactive' });
    }));

    // ==========================================
    // WORKFLOW EXECUTION
    // ==========================================

    // Execute workflow (operator+)
    router.post('/workflows/:id/execute', this.asyncHandler(async (req: AuthenticatedRequest, res) => {
      const workflow = await this.repository.getWorkflow(req.params.id);
      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }
      
      // Enforce tenant isolation
      if (!req.isSuperAdmin && workflow.tenantId !== req.tenantId) {
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
        { triggeredBy: req.userId || 'api' }
      );

      // Save execution
      await this.repository.saveExecution(execution);

      logger.info({ executionId: execution.id, workflowId: workflow.id, userId: req.userId }, 'Workflow executed');
      res.status(202).json({
        executionId: execution.id,
        status: execution.status,
        startedAt: execution.startedAt
      });
    }));

    // Execute workflow synchronously (wait for result) (operator+)
    router.post('/workflows/:id/execute-sync', this.asyncHandler(async (req: AuthenticatedRequest, res) => {
      const workflow = await this.repository.getWorkflow(req.params.id);
      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }
      
      // Enforce tenant isolation
      if (!req.isSuperAdmin && workflow.tenantId !== req.tenantId) {
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
        { triggeredBy: req.userId || 'api' }
      );

      await this.repository.saveExecution(execution);

      logger.info({ executionId: execution.id, workflowId: workflow.id, userId: req.userId }, 'Workflow executed (sync)');
      res.json(execution);
    }));

    // Get execution (operator+)
    router.get('/executions/:id', this.asyncHandler(async (req: AuthenticatedRequest, res) => {
      const execution = await this.repository.getExecution(req.params.id);
      if (!execution) {
        res.status(404).json({ error: 'Execution not found' });
        return;
      }
      
      // Tenant check would need execution to have tenantId - skip for now
      res.json(execution);
    }));

    // List executions (operator+)
    router.get('/workflows/:id/executions', this.asyncHandler(async (req: AuthenticatedRequest, res) => {
      const { page = 1, limit = 20, status } = req.query;
      const executions = await this.repository.listExecutions({
        workflowId: req.params.id,
        page: Number(page),
        limit: Number(limit),
        status: status as string
      });
      res.json(executions);
    }));

    // Cancel execution (admin+ required)
    router.post('/executions/:id/cancel', requireAdmin, this.asyncHandler(async (req: AuthenticatedRequest, res) => {
      const success = await this.engine.cancelExecution(req.params.id);
      if (!success) {
        res.status(404).json({ error: 'Execution not found or already completed' });
        return;
      }
      logger.info({ executionId: req.params.id, userId: req.userId }, 'Execution cancelled');
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

    // Workflow audit log (operator+)
    router.get('/audit', this.asyncHandler(async (req: AuthenticatedRequest, res) => {
      const tenantId = req.tenantId;
      const { workflowId, executionId, startDate, endDate, limit = 100 } = req.query;

      const entries = await this.repository.queryAuditLog({
        tenantId: req.isSuperAdmin ? undefined : tenantId, // SuperAdmin can see all
        workflowId: workflowId as string,
        executionId: executionId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: Number(limit)
      });

      res.json(entries);
    }));

    // Authentication audit log (superadmin only)
    router.get('/audit/auth', requireSuperAdmin, this.asyncHandler(async (req: AuthenticatedRequest, res) => {
      const { userId, tenantId, action, limit = 100 } = req.query;
      
      const entries = getAuthAuditLog({
        userId: userId as string,
        tenantId: tenantId as string,
        action: action as string,
        limit: Number(limit)
      });

      res.json({ entries, total: entries.length });
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
