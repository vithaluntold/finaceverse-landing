// ============================================
// ACCUTE ORCHESTRATOR - Module Declarations
// Type declarations for third-party modules
// ============================================

declare module 'pino' {
  interface LoggerOptions {
    name?: string;
    level?: string;
    transport?: {
      target: string;
      options?: Record<string, unknown>;
    };
  }
  
  interface Logger {
    info: (obj: unknown, msg?: string) => void;
    error: (obj: unknown, msg?: string) => void;
    warn: (obj: unknown, msg?: string) => void;
    debug: (obj: unknown, msg?: string) => void;
    fatal: (obj: unknown, msg?: string) => void;
    trace: (obj: unknown, msg?: string) => void;
    child: (bindings: Record<string, unknown>) => Logger;
  }
  
  function pino(options?: LoggerOptions | string): Logger;
  function pino(options: LoggerOptions, stream: unknown): Logger;
  
  export = pino;
}

declare module 'uuid' {
  export function v4(): string;
  export function v1(): string;
  export function v5(name: string, namespace: string): string;
}

declare module 'pg' {
  export interface PoolConfig {
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  }
  
  export interface QueryResult {
    rows: unknown[];
    rowCount: number;
    command: string;
    fields: unknown[];
  }
  
  export class Pool {
    constructor(config?: PoolConfig);
    query(text: string, values?: unknown[]): Promise<QueryResult>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }
  
  export interface PoolClient {
    query(text: string, values?: unknown[]): Promise<QueryResult>;
    release(err?: Error | boolean): void;
  }
}

declare module 'compression' {
  import { RequestHandler } from 'express';
  function compression(options?: Record<string, unknown>): RequestHandler;
  export = compression;
}

declare module 'pino-http' {
  import { RequestHandler } from 'express';
  function pinoHttp(options?: Record<string, unknown>): RequestHandler;
  export = pinoHttp;
}

declare module 'cron' {
  export class CronJob {
    constructor(
      cronTime: string,
      onTick: () => void,
      onComplete?: (() => void) | null,
      start?: boolean,
      timezone?: string
    );
    start(): void;
    stop(): void;
  }
}

declare module 'bullmq' {
  export interface QueueOptions {
    connection: unknown;
    defaultJobOptions?: Record<string, unknown>;
  }
  
  export interface JobOptions {
    priority?: number;
    attempts?: number;
    backoff?: { type: string; delay: number };
    removeOnComplete?: boolean | number;
    delay?: number;
    jobId?: string;
  }
  
  export class Queue {
    constructor(name: string, options?: QueueOptions);
    add(name: string, data: unknown, options?: JobOptions): Promise<Job>;
    close(): Promise<void>;
    getJob(jobId: string): Promise<Job | null>;
    getWaitingCount(): Promise<number>;
    getActiveCount(): Promise<number>;
    getCompletedCount(): Promise<number>;
    getFailedCount(): Promise<number>;
    getDelayedCount(): Promise<number>;
  }
  
  export class Worker {
    constructor(
      name: string, 
      processor: (job: Job) => Promise<unknown>,
      options?: { connection: unknown; concurrency?: number }
    );
    on(event: 'completed', callback: (job: Job) => void): void;
    on(event: 'failed', callback: (job: Job | undefined, error: Error) => void): void;
    on(event: 'active', callback: (job: Job) => void): void;
    on(event: string, callback: (...args: unknown[]) => void): void;
    close(): Promise<void>;
  }
  
  export interface Job {
    id: string;
    name: string;
    data: Record<string, unknown>;
    attemptsMade: number;
    failedReason?: string;
    remove(): Promise<void>;
  }
}

declare module 'ioredis' {
  export interface RedisOptions {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  }
  
  class Redis {
    constructor(url?: string | RedisOptions);
    subscribe(channel: string): Promise<void>;
    publish(channel: string, message: string): Promise<number>;
    on(event: 'message', callback: (channel: string, message: string) => void): void;
    on(event: string, callback: (...args: unknown[]) => void): void;
    quit(): Promise<void>;
    duplicate(): Redis;
  }
  
  export default Redis;
}
