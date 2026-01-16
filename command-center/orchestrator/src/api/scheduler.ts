// ============================================
// ACCUTE ORCHESTRATOR - Workflow Scheduler
// Cron-based and event-driven scheduling
// ============================================

import pino from 'pino';
import { CronJob } from 'cron';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { Workflow, TriggerNode } from '../types/workflow';
import { WorkflowEngine } from '../engine/workflow-engine';
import { WorkflowRepository } from '../storage/workflow-repository';

const logger = pino({ name: 'scheduler' });

export class WorkflowScheduler {
  private engine: WorkflowEngine;
  private repository: WorkflowRepository;
  private redis: Redis;
  private cronJobs: Map<string, CronJob>;
  private queue: Queue;
  private worker: Worker;

  constructor(
    engine: WorkflowEngine,
    repository: WorkflowRepository,
    redisUrl?: string
  ) {
    this.engine = engine;
    this.repository = repository;
    this.cronJobs = new Map();
    
    // Initialize Redis
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Initialize BullMQ
    this.queue = new Queue('workflow-executions', {
      connection: this.redis
    });

    this.worker = new Worker('workflow-executions', this.processJob.bind(this), {
      connection: this.redis,
      concurrency: Number(process.env.WORKER_CONCURRENCY) || 10
    });

    this.setupWorkerEvents();
  }

  private setupWorkerEvents(): void {
    this.worker.on('completed', (job: Job) => {
      logger.info({ jobId: job.id, workflowId: job.data.workflowId }, 'Job completed');
    });

    this.worker.on('failed', (job: Job | undefined, error: Error) => {
      logger.error({ jobId: job?.id, error }, 'Job failed');
    });

    this.worker.on('active', (job: Job) => {
      logger.debug({ jobId: job.id }, 'Job started');
    });
  }

  /**
   * Process a queued job
   */
  private async processJob(job: Job): Promise<void> {
    const jobData = job.data as { workflowId: string; triggerData: unknown; triggeredBy: string };
    const { workflowId, triggerData, triggeredBy } = jobData;

    const workflow = await this.repository.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status !== 'active') {
      logger.warn({ workflowId }, 'Workflow is not active, skipping execution');
      return;
    }

    const execution = await this.engine.execute(workflow, triggerData, { triggeredBy });
    await this.repository.saveExecution(execution);

    if (execution.status === 'failed') {
      throw new Error(execution.error?.message || 'Execution failed');
    }
  }

  /**
   * Register triggers for a workflow
   */
  async registerTriggers(workflow: Workflow): Promise<void> {
    if (!workflow.triggers) return;

    for (const trigger of workflow.triggers) {
      if (trigger.enabled === false) continue;

      switch (trigger.type) {
        case 'schedule':
          await this.registerCronTrigger(workflow, trigger);
          break;
        case 'event':
          await this.registerEventTrigger(workflow, trigger);
          break;
        case 'webhook':
          // Webhooks are handled by API server
          logger.info({ workflowId: workflow.id, triggerId: trigger.id }, 'Webhook trigger registered');
          break;
      }
    }
  }

  /**
   * Register a cron trigger
   */
  private async registerCronTrigger(workflow: Workflow, trigger: TriggerNode): Promise<void> {
    const { cron, timezone } = trigger.config;
    
    if (!cron) {
      logger.warn({ triggerId: trigger.id }, 'Cron trigger missing cron expression');
      return;
    }

    const jobKey = `${workflow.id}:${trigger.id}`;
    
    // Remove existing job
    if (this.cronJobs.has(jobKey)) {
      this.cronJobs.get(jobKey)!.stop();
    }

    // Create new job
    const cronJob = new CronJob(
      cron,
      async () => {
        logger.info({ workflowId: workflow.id, triggerId: trigger.id }, 'Cron trigger fired');
        
        await this.queue.add('workflow-execution', {
          workflowId: workflow.id,
          triggerData: {
            triggerId: trigger.id,
            triggerType: 'schedule',
            scheduledAt: new Date().toISOString()
          },
          triggeredBy: 'scheduler'
        }, {
          priority: this.getPriority(trigger.config.priority),
          attempts: trigger.config.maxRetries || 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        });
      },
      null,
      true,
      timezone || 'Asia/Kolkata'
    );

    this.cronJobs.set(jobKey, cronJob);
    logger.info({ workflowId: workflow.id, triggerId: trigger.id, cron }, 'Cron trigger registered');
  }

  /**
   * Register an event trigger
   */
  private async registerEventTrigger(workflow: Workflow, trigger: TriggerNode): Promise<void> {
    const { eventType, filters } = trigger.config;
    
    // Subscribe to Redis pub/sub for events
    const subscriber = this.redis.duplicate();
    
    await subscriber.subscribe(`events:${workflow.tenantId}:${eventType}`);
    
    subscriber.on('message', async (channel: string, message: string) => {
      try {
        const event = JSON.parse(message);
        
        // Apply filters
        if (filters && !this.matchFilters(event, filters)) {
          return;
        }

        logger.info({ workflowId: workflow.id, triggerId: trigger.id, eventType }, 'Event trigger fired');
        
        await this.queue.add('workflow-execution', {
          workflowId: workflow.id,
          triggerData: {
            triggerId: trigger.id,
            triggerType: 'event',
            event
          },
          triggeredBy: 'event'
        });
      } catch (error) {
        logger.error({ error, channel }, 'Event trigger error');
      }
    });

    logger.info({ workflowId: workflow.id, triggerId: trigger.id, eventType }, 'Event trigger registered');
  }

  /**
   * Unregister triggers for a workflow
   */
  async unregisterTriggers(workflowId: string): Promise<void> {
    // Stop all cron jobs for this workflow
    for (const [key, job] of this.cronJobs.entries()) {
      if (key.startsWith(`${workflowId}:`)) {
        job.stop();
        this.cronJobs.delete(key);
      }
    }

    logger.info({ workflowId }, 'Triggers unregistered');
  }

  /**
   * Schedule a one-time execution
   */
  async scheduleExecution(
    workflowId: string,
    triggerData: unknown,
    options: ScheduleOptions = {}
  ): Promise<string> {
    const job = await this.queue.add('workflow-execution', {
      workflowId,
      triggerData,
      triggeredBy: options.triggeredBy || 'scheduled'
    }, {
      delay: options.delay,
      priority: this.getPriority(options.priority),
      attempts: options.maxRetries || 3
    });

    logger.info({ jobId: job.id, workflowId, delay: options.delay }, 'Execution scheduled');
    return job.id || '';
  }

  /**
   * Cancel a scheduled execution
   */
  async cancelScheduledExecution(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) return false;
    
    await job.remove();
    return true;
  }

  /**
   * Emit an event
   */
  async emitEvent(tenantId: string, eventType: string, data: unknown): Promise<void> {
    await this.redis.publish(
      `events:${tenantId}:${eventType}`,
      JSON.stringify(data)
    );
    logger.debug({ tenantId, eventType }, 'Event emitted');
  }

  /**
   * Initialize scheduled workflows
   */
  async initialize(): Promise<void> {
    logger.info('Initializing scheduler...');

    // Load all active workflows and register their triggers
    const activeWorkflows = await this.repository.listWorkflows({
      status: 'active',
      limit: 1000
    });

    for (const workflow of activeWorkflows.data) {
      try {
        await this.registerTriggers(workflow);
      } catch (error) {
        logger.error({ error, workflowId: workflow.id }, 'Failed to register triggers');
      }
    }

    logger.info({ count: activeWorkflows.data.length }, 'Scheduler initialized');
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      cronJobs: this.cronJobs.size
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down scheduler...');

    // Stop all cron jobs
    for (const job of this.cronJobs.values()) {
      job.stop();
    }
    this.cronJobs.clear();

    // Close worker and queue
    await this.worker.close();
    await this.queue.close();
    await this.redis.quit();

    logger.info('Scheduler shutdown complete');
  }

  private getPriority(priority?: string): number {
    switch (priority) {
      case 'critical': return 1;
      case 'high': return 2;
      case 'normal': return 3;
      case 'low': return 4;
      default: return 3;
    }
  }

  private matchFilters(event: any, filters: any): boolean {
    for (const [key, value] of Object.entries(filters)) {
      if (event[key] !== value) {
        return false;
      }
    }
    return true;
  }
}

interface ScheduleOptions {
  delay?: number;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  maxRetries?: number;
  triggeredBy?: string;
  jobId?: string;
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  cronJobs: number;
}
