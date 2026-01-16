// ============================================
// ACCUTE ORCHESTRATOR - Main Entry Point
// The workflow engine that beats n8n to dust
// ============================================

import pino from 'pino';
import { WorkflowEngine } from './engine/workflow-engine';
import { WorkflowScheduler } from './api/scheduler';
import { WorkflowRepository } from './storage/workflow-repository';
import { APIServer } from './api/server';
import { NodeRegistry } from './engine/node-registry';
import { registerFinancialNodes } from './nodes/financial-nodes';
import { registerERPNodes } from './nodes/erp-nodes';
import { registerAINodes } from './nodes/ai-nodes';

const logger = pino({
  name: 'accute-orchestrator',
  level: process.env.LOG_LEVEL || 'info'
});

async function main(): Promise<void> {
  logger.info('Starting Accute Orchestrator...');

  try {
    // Initialize components
    const repository = new WorkflowRepository();
    await repository.initialize();
    logger.info('Database initialized');

    const engine = new WorkflowEngine({
      maxConcurrentExecutions: Number(process.env.MAX_CONCURRENT_EXECUTIONS) || 100,
      defaultTimeout: Number(process.env.DEFAULT_TIMEOUT) || 300000,
      enableAIVerification: process.env.ENABLE_AI_VERIFICATION !== 'false',
      auditLevel: (process.env.AUDIT_LEVEL as any) || 'detailed'
    });

    // Register custom nodes
    const registry = new NodeRegistry();
    registerFinancialNodes(registry);
    registerERPNodes(registry);
    registerAINodes(registry);
    logger.info('Custom nodes registered');

    const scheduler = new WorkflowScheduler(engine, repository);
    await scheduler.initialize();
    logger.info('Scheduler initialized');

    const server = new APIServer(engine, scheduler, repository);
    const port = Number(process.env.PORT) || 3000;
    server.start(port);

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info({ signal }, 'Received shutdown signal');
      
      await scheduler.shutdown();
      await repository.close();
      
      logger.info('Shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Log startup info
    logger.info({
      port,
      nodeEnv: process.env.NODE_ENV,
      aiVerification: process.env.ENABLE_AI_VERIFICATION !== 'false',
      auditLevel: process.env.AUDIT_LEVEL || 'detailed'
    }, 'Accute Orchestrator started successfully');

  } catch (error) {
    logger.fatal({ error }, 'Failed to start Accute Orchestrator');
    process.exit(1);
  }
}

main();
