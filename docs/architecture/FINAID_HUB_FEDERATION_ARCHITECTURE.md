# Fin(Ai)d Hub - Federation Architecture

## Overview

Fin(Ai)d Hub operates in two modes:
- **Standalone Mode**: Independent product with its own auth, billing, and LLM providers
- **Federated Mode**: Integrated with FinACEverse ecosystem (SSO, VAMN, unified billing)

The core business logic remains identical. Only infrastructure adapters change based on mode.

---

## Table of Contents

1. [Architecture Diagram](#1-architecture-diagram)
2. [Configuration](#2-configuration)
3. [Database Schema Changes](#3-database-schema-changes)
4. [Service Layer Adapters](#4-service-layer-adapters)
5. [VAMN Integration](#5-vamn-integration)
6. [Event Bus](#6-event-bus)
7. [API Contracts](#7-api-contracts)
8. [Data Sovereignty](#8-data-sovereignty)
9. [Implementation Checklist](#9-implementation-checklist)

---

## 1. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FIN(AI)D HUB                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    CORE (Always Present)                         │   │
│   │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────────┐│   │
│   │  │  Agent    │ │ Workflow  │ │   UDI     │ │   Fin(Ai)d        ││   │
│   │  │  Factory  │ │  Studio   │ │(Document) │ │   Marketplace     ││   │
│   │  └───────────┘ └───────────┘ └───────────┘ └───────────────────┘│   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    ADAPTER LAYER                                 │   │
│   │  ┌───────────────────────────────────────────────────────────┐  │   │
│   │  │  IAuthService │ ILLMService │ IBillingService │ IEventBus │  │   │
│   │  └───────────────────────────────────────────────────────────┘  │   │
│   └───────────────────────────┬─────────────────────────────────────┘   │
│                               │                                          │
│              ┌────────────────┴────────────────┐                        │
│              ▼                                 ▼                        │
│   ┌─────────────────────┐         ┌─────────────────────────────────┐  │
│   │   STANDALONE MODE   │         │      FEDERATED MODE             │  │
│   ├─────────────────────┤         ├─────────────────────────────────┤  │
│   │ LocalAuthService    │         │ FinACEverseAuthService (SSO)    │  │
│   │ UniversalLLMService │         │ VAMNPrimaryLLMService           │  │
│   │ LocalBillingService │         │ FinACEverseBillingService       │  │
│   │ LocalEventBus       │         │ FederatedEventBus               │  │
│   └─────────────────────┘         └─────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ (When Federated)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FINACEVERSE CORE                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │   SSO    │ │  VAMN    │ │ Billing  │ │  Event   │ │  User    │      │
│  │ Service  │ │  API     │ │ Service  │ │   Bus    │ │Directory │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Configuration

### 2.1 Environment Variables

```bash
# .env.standalone
FINACEVERSE_MODE=standalone

# .env.federated
FINACEVERSE_MODE=federated
FINACEVERSE_SSO_URL=https://auth.finaceverse.io
FINACEVERSE_CLIENT_ID=finaid-hub
FINACEVERSE_CLIENT_SECRET=your-secret
VAMN_API_URL=https://vamn.finaceverse.io/v1
VAMN_API_KEY=your-vamn-key
FINACEVERSE_BILLING_URL=https://billing.finaceverse.io
FINACEVERSE_EVENT_BUS_URL=redis://events.finaceverse.io:6379
```

### 2.2 Federation Config File

**File: `src/config/federation.ts`**

```typescript
export type FederationMode = 'standalone' | 'federated';

export interface FederationConfig {
  mode: FederationMode;
  standalone: {
    auth: 'local';
    llm: 'universal';
    billing: 'local';
    userDirectory: 'local';
    eventBus: 'local';
  };
  federated: {
    auth: 'finaceverse-sso';
    llm: 'vamn-primary';
    billing: 'finaceverse';
    userDirectory: 'finaceverse';
    eventBus: 'finaceverse';
    endpoints: {
      sso: string;
      vamn: string;
      billing: string;
      events: string;
    };
  };
}

export const FEDERATION_CONFIG: FederationConfig = {
  mode: (process.env.FINACEVERSE_MODE as FederationMode) || 'standalone',
  
  standalone: {
    auth: 'local',
    llm: 'universal',
    billing: 'local',
    userDirectory: 'local',
    eventBus: 'local',
  },
  
  federated: {
    auth: 'finaceverse-sso',
    llm: 'vamn-primary',
    billing: 'finaceverse',
    userDirectory: 'finaceverse',
    eventBus: 'finaceverse',
    endpoints: {
      sso: process.env.FINACEVERSE_SSO_URL || '',
      vamn: process.env.VAMN_API_URL || '',
      billing: process.env.FINACEVERSE_BILLING_URL || '',
      events: process.env.FINACEVERSE_EVENT_BUS_URL || '',
    },
  },
};

export function isFederated(): boolean {
  return FEDERATION_CONFIG.mode === 'federated';
}
```

---

## 3. Database Schema Changes

### 3.1 Migration: Add Federation Columns

**File: `migrations/010_federation_support.sql`**

```sql
-- ============================================================================
-- MIGRATION: Federation Support for FinACEverse Integration
-- ============================================================================

-- 1. Add federation columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS finaceverse_user_id UUID NULL,
ADD COLUMN IF NOT EXISTS federation_source TEXT DEFAULT 'local' 
    CHECK (federation_source IN ('local', 'finaceverse'));

CREATE INDEX IF NOT EXISTS idx_users_finaceverse_id 
ON users(finaceverse_user_id) WHERE finaceverse_user_id IS NOT NULL;

-- 2. Add VAMN as LLM provider
INSERT INTO llm_providers (id, name, display_name, is_active)
VALUES (gen_random_uuid(), 'vamn', 'VAMN (FinACEverse)', true)
ON CONFLICT (name) DO NOTHING;

-- 3. Add priority column to LLM configurations
ALTER TABLE llm_configurations 
ADD COLUMN IF NOT EXISTS priority INT DEFAULT 100,
ADD COLUMN IF NOT EXISTS is_federation_only BOOLEAN DEFAULT false;

-- 4. Create federation sync tracking table
CREATE TABLE IF NOT EXISTS federation_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'license', 'agent_run', 'workflow')),
    local_id UUID NOT NULL,
    finaceverse_id UUID NULL,
    sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict', 'error')),
    sync_direction TEXT DEFAULT 'outbound' CHECK (sync_direction IN ('inbound', 'outbound', 'bidirectional')),
    last_synced_at TIMESTAMP NULL,
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_federation_sync_entity 
ON federation_sync(entity_type, local_id);

CREATE INDEX IF NOT EXISTS idx_federation_sync_status 
ON federation_sync(sync_status) WHERE sync_status != 'synced';

-- 5. Create federation events log (for audit)
CREATE TABLE IF NOT EXISTS federation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    source_module TEXT DEFAULT 'finaid-hub',
    target_module TEXT NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'failed')),
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_federation_events_status 
ON federation_events(status, created_at);

-- 6. Add federation metadata to agent_runs
ALTER TABLE agent_runs
ADD COLUMN IF NOT EXISTS federation_request_id UUID NULL,
ADD COLUMN IF NOT EXISTS caller_module TEXT NULL;

-- 7. Add federation metadata to licenses
ALTER TABLE licenses
ADD COLUMN IF NOT EXISTS finaceverse_subscription_id UUID NULL,
ADD COLUMN IF NOT EXISTS is_federated BOOLEAN DEFAULT false;
```

### 3.2 Rollback Migration

**File: `migrations/010_federation_support_rollback.sql`**

```sql
-- Rollback federation support
ALTER TABLE users DROP COLUMN IF EXISTS finaceverse_user_id;
ALTER TABLE users DROP COLUMN IF EXISTS federation_source;
ALTER TABLE llm_configurations DROP COLUMN IF EXISTS priority;
ALTER TABLE llm_configurations DROP COLUMN IF EXISTS is_federation_only;
ALTER TABLE agent_runs DROP COLUMN IF EXISTS federation_request_id;
ALTER TABLE agent_runs DROP COLUMN IF EXISTS caller_module;
ALTER TABLE licenses DROP COLUMN IF EXISTS finaceverse_subscription_id;
ALTER TABLE licenses DROP COLUMN IF EXISTS is_federated;
DROP TABLE IF EXISTS federation_sync;
DROP TABLE IF EXISTS federation_events;
DELETE FROM llm_providers WHERE name = 'vamn';
```

---

## 4. Service Layer Adapters

### 4.1 Interface Definitions

**File: `src/interfaces/IAuthService.ts`**

```typescript
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'super_admin' | 'admin' | 'accounting_firm_owner' | 'accountant';
  firmId?: string;
  finaceverseUserId?: string;
  federationSource: 'local' | 'finaceverse';
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  token?: string;
  refreshToken?: string;
  error?: string;
}

export interface IAuthService {
  login(email: string, password: string): Promise<AuthResult>;
  validateToken(token: string): Promise<AuthUser | null>;
  refreshToken(refreshToken: string): Promise<AuthResult>;
  logout(token: string): Promise<void>;
  register(userData: Partial<AuthUser>, password: string): Promise<AuthResult>;
}
```

**File: `src/interfaces/ILLMService.ts`**

```typescript
export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tenantId: string;
  financialContext?: {
    hasNumbers: boolean;
    requiresCitation: boolean;
    regulatoryDomain?: 'GAAP' | 'IFRS' | 'IRC' | 'other';
  };
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  citations?: string[];
  numericalOutputs?: Array<{
    value: number;
    confidence: number;
    unit?: string;
  }>;
}

export interface ILLMService {
  complete(request: LLMRequest): Promise<LLMResponse>;
  streamComplete(request: LLMRequest): AsyncGenerator<string>;
  getAvailableModels(): Promise<string[]>;
  isAvailable(): Promise<boolean>;
}
```

**File: `src/interfaces/IEventBus.ts`**

```typescript
export interface FinACEverseEvent {
  id: string;
  source: 'finaid-hub' | 'luca' | 'cyloid' | 'accute' | 'finory' | 'epiq' | 'sumbuddy';
  type: string;
  payload: Record<string, any>;
  tenantId: string;
  userId?: string;
  timestamp: Date;
  correlationId?: string;
}

export type EventHandler = (event: FinACEverseEvent) => Promise<void>;

export interface IEventBus {
  publish(event: Omit<FinACEverseEvent, 'id' | 'timestamp'>): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): Promise<void>;
  unsubscribe(eventType: string, handler: EventHandler): Promise<void>;
}
```

### 4.2 Service Factories

**File: `src/services/factories/AuthServiceFactory.ts`**

```typescript
import { IAuthService } from '../../interfaces/IAuthService';
import { LocalAuthService } from '../auth/LocalAuthService';
import { FinACEverseAuthService } from '../auth/FinACEverseAuthService';
import { FEDERATION_CONFIG, isFederated } from '../../config/federation';

let authServiceInstance: IAuthService | null = null;

export function getAuthService(): IAuthService {
  if (authServiceInstance) {
    return authServiceInstance;
  }

  if (isFederated()) {
    authServiceInstance = new FinACEverseAuthService({
      ssoEndpoint: FEDERATION_CONFIG.federated.endpoints.sso,
      clientId: process.env.FINACEVERSE_CLIENT_ID!,
      clientSecret: process.env.FINACEVERSE_CLIENT_SECRET!,
    });
  } else {
    authServiceInstance = new LocalAuthService();
  }

  return authServiceInstance;
}

export function resetAuthService(): void {
  authServiceInstance = null;
}
```

**File: `src/services/factories/LLMServiceFactory.ts`**

```typescript
import { ILLMService } from '../../interfaces/ILLMService';
import { UniversalLLMService } from '../llm/UniversalLLMService';
import { VAMNPrimaryLLMService } from '../llm/VAMNPrimaryLLMService';
import { FEDERATION_CONFIG, isFederated } from '../../config/federation';

let llmServiceInstance: ILLMService | null = null;

export function getLLMService(): ILLMService {
  if (llmServiceInstance) {
    return llmServiceInstance;
  }

  if (isFederated()) {
    llmServiceInstance = new VAMNPrimaryLLMService({
      vamnEndpoint: FEDERATION_CONFIG.federated.endpoints.vamn,
      vamnApiKey: process.env.VAMN_API_KEY!,
      fallbackProviders: ['openai', 'anthropic'],
    });
  } else {
    llmServiceInstance = new UniversalLLMService();
  }

  return llmServiceInstance;
}

export function resetLLMService(): void {
  llmServiceInstance = null;
}
```

**File: `src/services/factories/EventBusFactory.ts`**

```typescript
import { IEventBus } from '../../interfaces/IEventBus';
import { LocalEventBus } from '../events/LocalEventBus';
import { FederatedEventBus } from '../events/FederatedEventBus';
import { FEDERATION_CONFIG, isFederated } from '../../config/federation';

let eventBusInstance: IEventBus | null = null;

export function getEventBus(): IEventBus {
  if (eventBusInstance) {
    return eventBusInstance;
  }

  if (isFederated()) {
    eventBusInstance = new FederatedEventBus({
      redisUrl: FEDERATION_CONFIG.federated.endpoints.events,
      sourceModule: 'finaid-hub',
    });
  } else {
    eventBusInstance = new LocalEventBus();
  }

  return eventBusInstance;
}

export function resetEventBus(): void {
  eventBusInstance = null;
}
```

### 4.3 Local Implementations

**File: `src/services/auth/LocalAuthService.ts`**

```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { IAuthService, AuthUser, AuthResult } from '../../interfaces/IAuthService';
import { db } from '../../db';

export class LocalAuthService implements IAuthService {
  private jwtSecret = process.env.JWT_SECRET!;
  private jwtExpiry = process.env.JWT_EXPIRY || '24h';

  async login(email: string, password: string): Promise<AuthResult> {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1 AND status = $2',
      [email.toLowerCase(), 'active']
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Invalid credentials' };
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return { success: false, error: 'Invalid credentials' };
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, userType: user.user_type },
      this.jwtSecret,
      { expiresIn: this.jwtExpiry }
    );

    return {
      success: true,
      user: this.mapToAuthUser(user),
      token,
    };
  }

  async validateToken(token: string): Promise<AuthUser | null> {
    try {
      // Check if token is blacklisted
      const blacklisted = await db.query(
        'SELECT id FROM blacklisted_tokens WHERE token = $1',
        [token]
      );
      if (blacklisted.rows.length > 0) return null;

      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string };
      
      const result = await db.query(
        'SELECT * FROM users WHERE id = $1 AND status = $2',
        [decoded.userId, 'active']
      );

      if (result.rows.length === 0) return null;
      return this.mapToAuthUser(result.rows[0]);
    } catch {
      return null;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResult> {
    // Implement refresh token logic
    throw new Error('Not implemented');
  }

  async logout(token: string): Promise<void> {
    const decoded = jwt.decode(token) as { exp: number } | null;
    if (!decoded) return;

    await db.query(
      'INSERT INTO blacklisted_tokens (token, blacklisted_at, expires_at) VALUES ($1, NOW(), $2)',
      [token, new Date(decoded.exp * 1000)]
    );
  }

  async register(userData: Partial<AuthUser>, password: string): Promise<AuthResult> {
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const result = await db.query(
      `INSERT INTO users (first_name, last_name, email, password, user_type, status, federation_source)
       VALUES ($1, $2, $3, $4, $5, 'active', 'local')
       RETURNING *`,
      [userData.firstName, userData.lastName, userData.email?.toLowerCase(), hashedPassword, userData.userType || 'accountant']
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, email: user.email, userType: user.user_type },
      this.jwtSecret,
      { expiresIn: this.jwtExpiry }
    );

    return {
      success: true,
      user: this.mapToAuthUser(user),
      token,
    };
  }

  private mapToAuthUser(row: any): AuthUser {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      userType: row.user_type,
      firmId: row.firm_id,
      finaceverseUserId: row.finaceverse_user_id,
      federationSource: row.federation_source || 'local',
    };
  }
}
```

**File: `src/services/events/LocalEventBus.ts`**

```typescript
import { IEventBus, FinACEverseEvent, EventHandler } from '../../interfaces/IEventBus';
import { v4 as uuidv4 } from 'uuid';

export class LocalEventBus implements IEventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  async publish(eventData: Omit<FinACEverseEvent, 'id' | 'timestamp'>): Promise<void> {
    const event: FinACEverseEvent = {
      ...eventData,
      id: uuidv4(),
      timestamp: new Date(),
    };

    // Handle wildcards and specific events
    const handlersToCall = [
      ...(this.handlers.get(event.type) || []),
      ...(this.handlers.get('*') || []),
    ];

    await Promise.all(handlersToCall.map(handler => handler(event)));
  }

  async subscribe(eventType: string, handler: EventHandler): Promise<void> {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  async unsubscribe(eventType: string, handler: EventHandler): Promise<void> {
    this.handlers.get(eventType)?.delete(handler);
  }
}
```

### 4.4 Federated Implementations

**File: `src/services/auth/FinACEverseAuthService.ts`**

```typescript
import { IAuthService, AuthUser, AuthResult } from '../../interfaces/IAuthService';
import { db } from '../../db';

interface FinACEverseAuthConfig {
  ssoEndpoint: string;
  clientId: string;
  clientSecret: string;
}

export class FinACEverseAuthService implements IAuthService {
  private config: FinACEverseAuthConfig;

  constructor(config: FinACEverseAuthConfig) {
    this.config = config;
  }

  async login(email: string, password: string): Promise<AuthResult> {
    // Redirect to FinACEverse SSO - this method typically not used in federated mode
    // Instead, use validateToken with SSO token
    const response = await fetch(`${this.config.ssoEndpoint}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': this.config.clientId,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      return { success: false, error: 'Authentication failed' };
    }

    const data = await response.json();
    
    // Sync user to local database
    const user = await this.syncUserFromFinACEverse(data.user);

    return {
      success: true,
      user,
      token: data.token,
      refreshToken: data.refreshToken,
    };
  }

  async validateToken(token: string): Promise<AuthUser | null> {
    try {
      const response = await fetch(`${this.config.ssoEndpoint}/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Client-ID': this.config.clientId,
        },
      });

      if (!response.ok) return null;

      const data = await response.json();
      
      // Sync user to local database if needed
      return await this.syncUserFromFinACEverse(data.user);
    } catch {
      return null;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResult> {
    const response = await fetch(`${this.config.ssoEndpoint}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': this.config.clientId,
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return { success: false, error: 'Token refresh failed' };
    }

    const data = await response.json();
    return {
      success: true,
      token: data.token,
      refreshToken: data.refreshToken,
    };
  }

  async logout(token: string): Promise<void> {
    await fetch(`${this.config.ssoEndpoint}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Client-ID': this.config.clientId,
      },
    });
  }

  async register(userData: Partial<AuthUser>, password: string): Promise<AuthResult> {
    // Registration handled by FinACEverse central
    const response = await fetch(`${this.config.ssoEndpoint}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': this.config.clientId,
      },
      body: JSON.stringify({ ...userData, password }),
    });

    if (!response.ok) {
      return { success: false, error: 'Registration failed' };
    }

    const data = await response.json();
    const user = await this.syncUserFromFinACEverse(data.user);

    return {
      success: true,
      user,
      token: data.token,
    };
  }

  private async syncUserFromFinACEverse(finaceverseUser: any): Promise<AuthUser> {
    // Upsert user to local database with federation link
    const result = await db.query(
      `INSERT INTO users (
        id, first_name, last_name, email, user_type, status, 
        finaceverse_user_id, federation_source
      ) VALUES (
        COALESCE((SELECT id FROM users WHERE finaceverse_user_id = $1), gen_random_uuid()),
        $2, $3, $4, $5, 'active', $1, 'finaceverse'
      )
      ON CONFLICT (email) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        user_type = EXCLUDED.user_type,
        finaceverse_user_id = EXCLUDED.finaceverse_user_id,
        federation_source = 'finaceverse',
        updated_at = NOW()
      RETURNING *`,
      [
        finaceverseUser.id,
        finaceverseUser.firstName,
        finaceverseUser.lastName,
        finaceverseUser.email,
        finaceverseUser.userType || 'accountant',
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      userType: row.user_type,
      firmId: row.firm_id,
      finaceverseUserId: row.finaceverse_user_id,
      federationSource: 'finaceverse',
    };
  }
}
```

---

## 5. VAMN Integration

**File: `src/services/llm/VAMNPrimaryLLMService.ts`**

```typescript
import { ILLMService, LLMRequest, LLMResponse } from '../../interfaces/ILLMService';
import { UniversalLLMService } from './UniversalLLMService';

interface VAMNConfig {
  vamnEndpoint: string;
  vamnApiKey: string;
  fallbackProviders: string[];
}

type VAMNStream = 'semantic' | 'quantitative' | 'citation' | 'auto';

export class VAMNPrimaryLLMService implements ILLMService {
  private config: VAMNConfig;
  private fallbackService: UniversalLLMService;

  constructor(config: VAMNConfig) {
    this.config = config;
    this.fallbackService = new UniversalLLMService();
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    try {
      return await this.callVAMN(request);
    } catch (error) {
      console.warn('VAMN unavailable, falling back to universal LLM:', error);
      return this.fallbackService.complete(request);
    }
  }

  async *streamComplete(request: LLMRequest): AsyncGenerator<string> {
    try {
      const response = await fetch(`${this.config.vamnEndpoint}/complete/stream`, {
        method: 'POST',
        headers: this.getHeaders(request),
        body: JSON.stringify(this.buildVAMNPayload(request)),
      });

      if (!response.ok) {
        throw new Error(`VAMN stream failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield decoder.decode(value, { stream: true });
      }
    } catch (error) {
      console.warn('VAMN stream unavailable, falling back:', error);
      yield* this.fallbackService.streamComplete(request);
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return ['vamn-7b', 'vamn-7b-fast', ...await this.fallbackService.getAvailableModels()];
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.vamnEndpoint}/health`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.config.vamnApiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async callVAMN(request: LLMRequest): Promise<LLMResponse> {
    const response = await fetch(`${this.config.vamnEndpoint}/complete`, {
      method: 'POST',
      headers: this.getHeaders(request),
      body: JSON.stringify(this.buildVAMNPayload(request)),
    });

    if (!response.ok) {
      throw new Error(`VAMN request failed: ${response.status}`);
    }

    const data = await response.json();
    return this.parseVAMNResponse(data);
  }

  private getHeaders(request: LLMRequest): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.vamnApiKey}`,
      'X-VAMN-Stream': this.selectStream(request),
      'X-Tenant-ID': request.tenantId,
    };
  }

  private selectStream(request: LLMRequest): VAMNStream {
    if (request.financialContext?.hasNumbers) return 'quantitative';
    if (request.financialContext?.requiresCitation) return 'citation';
    return 'auto';
  }

  private buildVAMNPayload(request: LLMRequest): object {
    return {
      prompt: request.prompt,
      systemPrompt: request.systemPrompt,
      temperature: request.temperature ?? 0.7,
      maxTokens: request.maxTokens ?? 4096,
      financialContext: request.financialContext,
    };
  }

  private parseVAMNResponse(data: any): LLMResponse {
    return {
      content: data.content,
      model: 'vamn-7b',
      provider: 'vamn',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      citations: data.citations,
      numericalOutputs: data.numerical_outputs,
    };
  }
}
```

---

## 6. Event Bus

**File: `src/services/events/FederatedEventBus.ts`**

```typescript
import Redis from 'ioredis';
import { IEventBus, FinACEverseEvent, EventHandler } from '../../interfaces/IEventBus';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db';

interface FederatedEventBusConfig {
  redisUrl: string;
  sourceModule: string;
}

export class FederatedEventBus implements IEventBus {
  private publisher: Redis;
  private subscriber: Redis;
  private config: FederatedEventBusConfig;
  private localHandlers: Map<string, Set<EventHandler>> = new Map();

  constructor(config: FederatedEventBusConfig) {
    this.config = config;
    this.publisher = new Redis(config.redisUrl);
    this.subscriber = new Redis(config.redisUrl);
    this.setupSubscriber();
  }

  private setupSubscriber(): void {
    this.subscriber.on('message', async (channel, message) => {
      try {
        const event: FinACEverseEvent = JSON.parse(message);
        await this.handleIncomingEvent(event);
      } catch (error) {
        console.error('Failed to handle federated event:', error);
      }
    });
  }

  async publish(eventData: Omit<FinACEverseEvent, 'id' | 'timestamp'>): Promise<void> {
    const event: FinACEverseEvent = {
      ...eventData,
      id: uuidv4(),
      source: this.config.sourceModule as any,
      timestamp: new Date(),
    };

    // 1. Handle locally first
    await this.handleLocally(event);

    // 2. Log to database for audit
    await this.logEvent(event);

    // 3. Publish to federated bus
    await this.publisher.publish('finaceverse:events', JSON.stringify(event));
    await this.publisher.publish(`finaceverse:${event.type}`, JSON.stringify(event));
  }

  async subscribe(eventType: string, handler: EventHandler): Promise<void> {
    // Local subscription
    if (!this.localHandlers.has(eventType)) {
      this.localHandlers.set(eventType, new Set());
    }
    this.localHandlers.get(eventType)!.add(handler);

    // Subscribe to Redis channel
    await this.subscriber.subscribe(`finaceverse:${eventType}`);
  }

  async unsubscribe(eventType: string, handler: EventHandler): Promise<void> {
    this.localHandlers.get(eventType)?.delete(handler);
    
    if (this.localHandlers.get(eventType)?.size === 0) {
      await this.subscriber.unsubscribe(`finaceverse:${eventType}`);
    }
  }

  private async handleLocally(event: FinACEverseEvent): Promise<void> {
    const handlers = [
      ...(this.localHandlers.get(event.type) || []),
      ...(this.localHandlers.get('*') || []),
    ];

    await Promise.all(handlers.map(handler => handler(event)));
  }

  private async handleIncomingEvent(event: FinACEverseEvent): Promise<void> {
    // Don't process our own events
    if (event.source === this.config.sourceModule) return;

    await this.handleLocally(event);
  }

  private async logEvent(event: FinACEverseEvent): Promise<void> {
    await db.query(
      `INSERT INTO federation_events (id, event_type, source_module, payload, status, created_at)
       VALUES ($1, $2, $3, $4, 'sent', NOW())`,
      [event.id, event.type, event.source, JSON.stringify(event.payload)]
    );
  }

  async disconnect(): Promise<void> {
    await this.publisher.quit();
    await this.subscriber.quit();
  }
}
```

### 6.1 Standard Event Types

```typescript
// src/events/eventTypes.ts

export const EVENT_TYPES = {
  // Agent Events
  AGENT_EXECUTION_STARTED: 'agent.execution.started',
  AGENT_EXECUTION_COMPLETED: 'agent.execution.completed',
  AGENT_EXECUTION_FAILED: 'agent.execution.failed',

  // Workflow Events
  WORKFLOW_CREATED: 'workflow.created',
  WORKFLOW_EXECUTION_STARTED: 'workflow.execution.started',
  WORKFLOW_EXECUTION_COMPLETED: 'workflow.execution.completed',

  // Document Events
  DOCUMENT_PROCESSED: 'document.processed',
  DOCUMENT_VALIDATED: 'document.validated',

  // License Events
  LICENSE_ACTIVATED: 'license.activated',
  LICENSE_EXPIRED: 'license.expired',

  // Cross-Module Requests
  REQUEST_LUCA_AGENT: 'request.luca.agent',
  REQUEST_CYLOID_PROCESS: 'request.cyloid.process',
  REQUEST_VAMN_COMPLETE: 'request.vamn.complete',
} as const;
```

---

## 7. API Contracts

### 7.1 Federation API (Exposed by Fin(Ai)d Hub)

**File: `src/routes/federationRoutes.ts`**

```typescript
import { Router } from 'express';
import { FEDERATION_CONFIG, isFederated } from '../config/federation';

const router = Router();

// Only enable in federated mode
if (!isFederated()) {
  router.all('*', (req, res) => {
    res.status(404).json({ error: 'Federation endpoints not available in standalone mode' });
  });
} else {
  // Health check for federation status
  router.get('/health', async (req, res) => {
    res.json({
      module: 'finaid-hub',
      status: 'healthy',
      mode: FEDERATION_CONFIG.mode,
      version: process.env.npm_package_version,
      timestamp: new Date().toISOString(),
    });
  });

  // List available agents
  router.get('/agents', async (req, res) => {
    const agents = await db.query(
      'SELECT id, name, description, category, status FROM finaid_profiles WHERE status = $1',
      ['active']
    );
    res.json({ agents: agents.rows });
  });

  // Execute agent (called by other modules)
  router.post('/execute', async (req, res) => {
    const { agentId, clientContext, inputData, callerModule, correlationId } = req.body;

    const run = await agentService.execute({
      agentId,
      clientContext,
      inputData,
      callerModule,
      federationRequestId: correlationId,
    });

    res.json({
      runId: run.id,
      status: run.status,
      correlationId,
    });
  });

  // Get execution status
  router.get('/executions/:runId', async (req, res) => {
    const run = await db.query(
      'SELECT * FROM agent_runs WHERE id = $1',
      [req.params.runId]
    );

    if (run.rows.length === 0) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json(run.rows[0]);
  });
}

export default router;
```

### 7.2 OpenAPI Specification

```yaml
# openapi/federation.yaml
openapi: 3.0.0
info:
  title: Fin(Ai)d Hub Federation API
  version: 1.0.0
  description: API for FinACEverse ecosystem integration

paths:
  /api/v1/federation/health:
    get:
      summary: Health check for federation status
      responses:
        '200':
          description: Module health status
          content:
            application/json:
              schema:
                type: object
                properties:
                  module:
                    type: string
                    example: finaid-hub
                  status:
                    type: string
                    enum: [healthy, degraded, unhealthy]
                  mode:
                    type: string
                    enum: [standalone, federated]

  /api/v1/federation/agents:
    get:
      summary: List available agents in this module
      responses:
        '200':
          description: List of agents
          content:
            application/json:
              schema:
                type: object
                properties:
                  agents:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                          format: uuid
                        name:
                          type: string
                        description:
                          type: string
                        category:
                          type: string

  /api/v1/federation/execute:
    post:
      summary: Execute an agent
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - agentId
                - inputData
              properties:
                agentId:
                  type: string
                  format: uuid
                clientContext:
                  type: object
                inputData:
                  type: object
                callerModule:
                  type: string
                  enum: [luca, cyloid, accute, finory, epiq, sumbuddy]
                correlationId:
                  type: string
                  format: uuid
      responses:
        '200':
          description: Execution started
          content:
            application/json:
              schema:
                type: object
                properties:
                  runId:
                    type: string
                    format: uuid
                  status:
                    type: string
                    enum: [pending, running, completed, failed]
                  correlationId:
                    type: string
```

---

## 8. Data Sovereignty

| Data Type | Standalone Mode | Federated Mode |
|-----------|-----------------|----------------|
| **Users** | Local PostgreSQL only | Sync from FinACEverse (source of truth: Central) |
| **Agent Definitions** | Local `finaid_profiles` | Local + pull from Luca marketplace |
| **Agent Runs** | Local `agent_runs` | Local (summary events sent to central) |
| **Client Data** | Local only | **Local only (never leaves module)** |
| **Documents** | Local `/uploads` | **Local only** |
| **Vector Embeddings** | Local Qdrant | Local Qdrant |
| **LLM Configs** | Local (any provider) | VAMN primary + local fallbacks |
| **Billing** | Local Stripe/Cashfree | FinACEverse unified billing |
| **Audit Logs** | Local | Local + summary to central |

### 8.1 Data That NEVER Leaves the Module

```typescript
// src/config/dataSovereignty.ts

export const LOCAL_ONLY_TABLES = [
  'clients',              // Client PII
  'client_companies',     // Company data
  'agent_runs',           // Execution data (only summary events shared)
  'vector_data',          // Embeddings of client documents
  // File storage: /uploads/*
];

export const SYNC_TO_FINACEVERSE = [
  'users',                // With finaceverse_user_id link
  'licenses',             // Subscription status
  'finaid_profiles',      // Agent definitions (for marketplace)
  // Events: Summary metrics only
];
```

---

## 9. Implementation Checklist

### Phase 1: Foundation (Week 1-2)

- [ ] Create `src/config/federation.ts`
- [ ] Add environment variables to `.env.example`
- [ ] Run migration `010_federation_support.sql`
- [ ] Create interface files in `src/interfaces/`
- [ ] Create service factories

### Phase 2: Local Services (Week 2-3)

- [ ] Implement `LocalAuthService`
- [ ] Implement `LocalEventBus`
- [ ] Update existing `UniversalLLMService` to implement `ILLMService`
- [ ] Create tests for local services

### Phase 3: Federated Services (Week 3-4)

- [ ] Implement `FinACEverseAuthService`
- [ ] Implement `VAMNPrimaryLLMService`
- [ ] Implement `FederatedEventBus`
- [ ] Create tests for federated services

### Phase 4: API & Routes (Week 4-5)

- [ ] Create `src/routes/federationRoutes.ts`
- [ ] Update middleware to use service factories
- [ ] Add federation health endpoint
- [ ] Create OpenAPI documentation

### Phase 5: Integration Testing (Week 5-6)

- [ ] Test standalone mode (no FinACEverse connection)
- [ ] Test federated mode with mock FinACEverse
- [ ] Test mode switching
- [ ] Test fallback behavior (VAMN unavailable)
- [ ] Test event bus communication

### Phase 6: Documentation & Deployment (Week 6)

- [ ] Update README with federation setup
- [ ] Create deployment guide for both modes
- [ ] Document environment variables
- [ ] Create runbook for mode switching

---

## Quick Reference

### Switch Modes

```bash
# Standalone (default)
export FINACEVERSE_MODE=standalone
npm start

# Federated
export FINACEVERSE_MODE=federated
export FINACEVERSE_SSO_URL=https://auth.finaceverse.io
export VAMN_API_URL=https://vamn.finaceverse.io/v1
npm start
```

### Test Federation Health

```bash
# Standalone
curl http://localhost:3000/api/v1/federation/health
# Returns: 404 (not available)

# Federated
curl http://localhost:3000/api/v1/federation/health
# Returns: { "module": "finaid-hub", "status": "healthy", "mode": "federated" }
```

---

## Questions?

Contact the FinACEverse architecture team or refer to:
- [FinACEverse Integration Guide](#)
- [VAMN API Documentation](#)
- [Event Bus Specification](#)
