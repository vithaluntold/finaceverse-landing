// Type declarations for external modules without @types packages
declare module 'jsonwebtoken' {
  export interface JwtPayload {
    [key: string]: unknown;
  }

  export class TokenExpiredError extends Error {
    expiredAt: Date;
  }

  export class JsonWebTokenError extends Error {}

  export class NotBeforeError extends Error {
    date: Date;
  }

  export function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: string | Buffer,
    options?: object
  ): string;

  export function verify(
    token: string,
    secretOrPublicKey: string | Buffer,
    options?: object
  ): JwtPayload | string;

  export function decode(
    token: string,
    options?: object
  ): JwtPayload | string | null;
}

declare module 'pino' {
  interface LogFn {
    (msg: string): void;
    (obj: object, msg?: string): void;
  }

  interface Logger {
    info: LogFn;
    warn: LogFn;
    error: LogFn;
    debug: LogFn;
    trace: LogFn;
    fatal: LogFn;
    child: (bindings: object) => Logger;
  }

  interface PinoOptions {
    name?: string;
    level?: string;
    [key: string]: unknown;
  }

  function pino(options?: PinoOptions): Logger;
  export = pino;
}

declare module 'pino-http' {
  import { IncomingMessage, ServerResponse } from 'http';
  
  interface Options {
    logger?: unknown;
    [key: string]: unknown;
  }
  
  function pinoHttp(options?: Options): (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void
  ) => void;
  
  export = pinoHttp;
}

declare module 'compression' {
  import { RequestHandler } from 'express';
  function compression(options?: object): RequestHandler;
  export = compression;
}

declare module 'bcryptjs' {
  export function hash(data: string, saltOrRounds: string | number): Promise<string>;
  export function hashSync(data: string, saltOrRounds: string | number): string;
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function compareSync(data: string, encrypted: string): boolean;
  export function genSalt(rounds?: number): Promise<string>;
  export function genSaltSync(rounds?: number): string;
}
