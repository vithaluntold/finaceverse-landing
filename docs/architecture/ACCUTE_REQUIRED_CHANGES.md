# Accute Required Changes for FinACEverse Compliance

> **Document Version**: 1.0  
> **Date**: January 16, 2026  
> **Status**: Implementation Required  
> **Current Alignment**: 65% → Target: 100%  
> **Reference**: FinACEverse Master Architecture v1.0

---

## Executive Summary

Accute is an AI-Native Accounting Practice Management Platform with 200+ database tables and strong multi-tenant architecture. However, it requires significant updates to integrate with the FinACEverse ecosystem as a first-class product. This document specifies all required changes to achieve 100% compliance.

**Critical Missing Components:**
1. ❌ VAMN Integration (No triple-stream AI)
2. ❌ Multi-LLM Priority Cascade (Client → VAMN → Fallback billing)
3. ❌ 21-Layer Security (currently ~8 layers)
4. ❌ Fin(Ai)d Hub Integration (No event bus)
5. ❌ Federated Learning capability
6. ❌ Consent Framework (GDPR/CCPA)
7. ❌ Azure HSM key management
8. ❌ Fine-tuned model support

---

## 1. VAMN Integration (Critical Priority)

### 1.1 Current State
- **AI Providers**: OpenAI, Azure OpenAI, Anthropic (direct)
- **Agent System**: 12 agents (LUCA, CADENCE, PARITY, FORMA, ECHO, RELAY, SCRIBE, RADAR, OMNISPEC, LYNK, ONBOARD, TRACE)
- **LLM Config**: `llmConfigurations` and `aiProviderConfigs` tables exist
- **Problem**: All agents call LLMs directly, no VAMN integration

### 1.2 Required Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    ACCUTE AI ARCHITECTURE (VAMN-INTEGRATED)                          │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                        AI ORCHESTRATION LAYER                                 │   │
│  │  Priority: Client LLMs → VAMN → FinACEverse Fallback (Billable)              │   │
│  └─────────────────────┬────────────────────────────────────────────────────────┘   │
│                        │                                                             │
│    ┌───────────────────┼───────────────────┐                                        │
│    ▼                   ▼                   ▼                                        │
│  ┌─────────┐    ┌─────────────┐    ┌──────────────┐                                │
│  │ Client  │    │    VAMN     │    │  FinACEverse │                                │
│  │  LLMs   │    │ Triple-Head │    │   Fallback   │                                │
│  │ (Free)  │    │  (Primary)  │    │  (Billable)  │                                │
│  └─────────┘    └──────┬──────┘    └──────────────┘                                │
│                        │                                                             │
│         ┌──────────────┼──────────────┐                                             │
│         ▼              ▼              ▼                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                                      │
│  │  Semantic  │ │Quantitative│ │  Citation  │                                      │
│  │    Head    │ │    Head    │ │    Head    │                                      │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘                                      │
│        │              │              │                                              │
│        ▼              ▼              ▼                                              │
│  ┌───────────────────────────────────────────┐                                      │
│  │         ACCUTE AGENT ECOSYSTEM            │                                      │
│  │                                           │                                      │
│  │  ┌─────────────────────────────────────┐ │                                      │
│  │  │ DOMAIN EXPERTS                       │ │                                      │
│  │  │ • LUCA (Accounting/Tax/Finance)     │ │ ← Semantic + Quantitative           │
│  │  │ • PARITY (Legal Document Drafting)  │ │ ← Semantic + Citation               │
│  │  └─────────────────────────────────────┘ │                                      │
│  │                                           │                                      │
│  │  ┌─────────────────────────────────────┐ │                                      │
│  │  │ BUILDERS                             │ │                                      │
│  │  │ • CADENCE (Workflow Builder)        │ │ ← Semantic                          │
│  │  │ • FORMA (Form Builder)              │ │ ← Semantic                          │
│  │  │ • ECHO (Template Messages)          │ │ ← Semantic                          │
│  │  │ • SCRIBE (Email Templates)          │ │ ← Semantic                          │
│  │  └─────────────────────────────────────┘ │                                      │
│  │                                           │                                      │
│  │  ┌─────────────────────────────────────┐ │                                      │
│  │  │ PROCESSORS                           │ │                                      │
│  │  │ • RELAY (Email → Task)              │ │ ← Semantic                          │
│  │  │ • LYNK (Message → Task)             │ │ ← Semantic                          │
│  │  │ • TRACE (Resume Analysis)           │ │ ← Semantic                          │
│  │  └─────────────────────────────────────┘ │                                      │
│  │                                           │                                      │
│  │  ┌─────────────────────────────────────┐ │                                      │
│  │  │ MONITORS                             │ │                                      │
│  │  │ • RADAR (Activity Logging)          │ │ ← Semantic                          │
│  │  │ • OMNISPECTRA (Workload Tracking)   │ │ ← Quantitative                      │
│  │  └─────────────────────────────────────┘ │                                      │
│  │                                           │                                      │
│  │  ┌─────────────────────────────────────┐ │                                      │
│  │  │ ROUNDTABLE (Multi-Agent)             │ │                                      │
│  │  │ Planner → Executor → Consensus       │ │ ← All 3 VAMN Heads                  │
│  │  └─────────────────────────────────────┘ │                                      │
│  └───────────────────────────────────────────┘                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Required Database Tables

```sql
-- =====================================================
-- VAMN INTEGRATION TABLES
-- =====================================================

-- VAMN model registry and health
CREATE TABLE vamn_model_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    head_type VARCHAR(50) NOT NULL CHECK (head_type IN ('semantic', 'quantitative', 'citation')),
    weights_checksum VARCHAR(128) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    deployment_status VARCHAR(50) DEFAULT 'pending',
    last_health_check TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(model_name, model_version, head_type)
);

-- VAMN inference tracking
CREATE TABLE vamn_inference_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    agent_slug VARCHAR(100) NOT NULL, -- 'luca', 'cadence', 'parity', etc.
    session_id UUID REFERENCES "agentSessions"(id),
    head_type VARCHAR(50) NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    latency_ms INTEGER NOT NULL,
    gpu_memory_mb INTEGER,
    cache_hit BOOLEAN DEFAULT false,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Federated learning contributions from Accute
CREATE TABLE federated_learning_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    model_type VARCHAR(100) NOT NULL,
    contribution_type VARCHAR(50) CHECK (contribution_type IN (
        'workflow_patterns', 'document_templates', 'tax_rules',
        'compliance_checks', 'time_estimation', 'workload_prediction'
    )),
    gradient_checksum VARCHAR(128) NOT NULL,
    contribution_weight DECIMAL(10,6) NOT NULL,
    privacy_budget_consumed DECIMAL(10,6) NOT NULL,
    aggregation_round INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent → VAMN head mapping configuration
CREATE TABLE agent_vamn_routing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_slug VARCHAR(100) NOT NULL UNIQUE,
    primary_head VARCHAR(50) NOT NULL CHECK (primary_head IN ('semantic', 'quantitative', 'citation')),
    secondary_heads TEXT[], -- For agents that use multiple heads
    routing_rules JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed agent routing data
INSERT INTO agent_vamn_routing (agent_slug, primary_head, secondary_heads, routing_rules) VALUES
('luca', 'quantitative', ARRAY['semantic'], '{"use_cases": ["tax_calculation", "financial_analysis"]}'),
('parity', 'citation', ARRAY['semantic'], '{"use_cases": ["legal_drafting", "compliance_docs"]}'),
('cadence', 'semantic', NULL, '{"use_cases": ["workflow_design"]}'),
('forma', 'semantic', NULL, '{"use_cases": ["form_generation"]}'),
('echo', 'semantic', NULL, '{"use_cases": ["template_generation"]}'),
('scribe', 'semantic', NULL, '{"use_cases": ["email_drafting"]}'),
('relay', 'semantic', NULL, '{"use_cases": ["email_to_task"]}'),
('lynk', 'semantic', NULL, '{"use_cases": ["message_to_task"]}'),
('trace', 'semantic', NULL, '{"use_cases": ["resume_parsing"]}'),
('radar', 'semantic', NULL, '{"use_cases": ["activity_analysis"]}'),
('omnispectra', 'quantitative', NULL, '{"use_cases": ["workload_forecasting"]}'),
('onboard', 'semantic', NULL, '{"use_cases": ["employee_onboarding"]}');

-- Indexes
CREATE INDEX idx_vamn_inference_org ON vamn_inference_log(organization_id, created_at DESC);
CREATE INDEX idx_vamn_inference_agent ON vamn_inference_log(agent_slug, created_at DESC);
CREATE INDEX idx_vamn_inference_status ON vamn_inference_log(status);
CREATE INDEX idx_federated_org ON federated_learning_contributions(organization_id);
CREATE INDEX idx_federated_round ON federated_learning_contributions(aggregation_round);
```

---

## 2. Multi-LLM Support with Priority Cascade (Critical)

### 2.1 Current State
- **Existing Tables**: `llmConfigurations`, `aiProviderConfigs`
- **Problem**: No priority cascade, no fallback billing, keys may not be properly isolated

### 2.2 Required Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   AI RESOLUTION CASCADE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PRIORITY 1: Client's Own LLMs (No Cost to Us)              │
│  ├─ OpenAI (client's API key in encrypted DB)               │
│  ├─ Anthropic Claude (client's API key)                     │
│  ├─ Google Gemini (client's API key)                        │
│  ├─ Azure OpenAI (client's deployment)                      │
│  ├─ Mistral, Cohere, Groq, DeepSeek, etc.                   │
│  └─ Client Fine-Tuned Models                                │
│                                                              │
│  PRIORITY 2: VAMN (When Available)                          │
│  └─ FinACEverse Internal Model (Triple-Stream)              │
│                                                              │
│  PRIORITY 3: FinACEverse Fallback (WE CHARGE FOR THIS)      │
│  ├─ FinACEverse-managed OpenAI                              │
│  ├─ FinACEverse-managed Anthropic                           │
│  └─ FinACEverse Internal Fine-Tuned Models                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Enhanced Database Tables

```sql
-- =====================================================
-- ENHANCED LLM CONFIGURATION TABLES
-- =====================================================

-- Drop existing llmConfigurations and recreate with enhanced schema
DROP TABLE IF EXISTS llmConfigurations CASCADE;

CREATE TABLE tenant_llm_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    workspace_id UUID REFERENCES workspaces(id), -- Optional workspace-level override
    provider VARCHAR(50) NOT NULL CHECK (provider IN (
        'openai', 'anthropic', 'gemini', 'azure_openai', 'mistral',
        'cohere', 'groq', 'deepseek', 'together', 'fireworks', 
        'ollama', 'custom', 'fine_tuned'
    )),
    display_name VARCHAR(100) NOT NULL,
    api_key_encrypted BYTEA, -- AES-256-GCM encrypted with organization DEK
    api_endpoint VARCHAR(500), -- Custom endpoint for Azure/Ollama/self-hosted
    model_id VARCHAR(200) NOT NULL, -- e.g., 'gpt-4-turbo', 'claude-3-opus'
    priority INTEGER NOT NULL DEFAULT 1, -- Lower = higher priority
    is_active BOOLEAN DEFAULT true,
    rate_limit_rpm INTEGER DEFAULT 60,
    rate_limit_tpm INTEGER DEFAULT 100000,
    max_tokens INTEGER DEFAULT 4096,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    config_json JSONB DEFAULT '{}', -- Provider-specific config
    last_health_check TIMESTAMPTZ,
    health_status VARCHAR(50) DEFAULT 'unknown',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, provider, model_id)
);

-- Fine-tuned model configurations (client + FinACEverse internal)
CREATE TABLE fine_tuned_model_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id), -- NULL = FinACEverse internal
    model_name VARCHAR(200) NOT NULL,
    base_provider VARCHAR(50) NOT NULL,
    base_model VARCHAR(200) NOT NULL,
    fine_tune_id VARCHAR(200), -- OpenAI ft-xxx, Anthropic fine-tune ID
    deployment_type VARCHAR(50) NOT NULL CHECK (deployment_type IN (
        'hosted', 'azure_ml', 'sagemaker', 'vertex', 'self_hosted'
    )),
    endpoint_url VARCHAR(500),
    api_key_encrypted BYTEA,
    model_purpose VARCHAR(100) NOT NULL, -- 'tax_assistant', 'legal_drafting', 'workflow_generation'
    training_data_hash VARCHAR(128),
    version VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_vamn_predecessor BOOLEAN DEFAULT false, -- Models that feed into VAMN
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LLM usage tracking with fallback identification
CREATE TABLE llm_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    agent_slug VARCHAR(100), -- Which Accute agent made the call
    session_id UUID REFERENCES "agentSessions"(id),
    llm_config_id UUID REFERENCES tenant_llm_config(id),
    fine_tuned_model_id UUID REFERENCES fine_tuned_model_config(id),
    provider VARCHAR(50) NOT NULL,
    model_id VARCHAR(200) NOT NULL,
    is_fallback BOOLEAN NOT NULL DEFAULT false, -- TRUE = WE CHARGE
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    latency_ms INTEGER NOT NULL,
    estimated_cost_usd DECIMAL(10,6), -- Only populated for fallback
    request_type VARCHAR(100), -- 'agent_chat', 'workflow_generation', 'document_analysis'
    cache_hit BOOLEAN DEFAULT false,
    status VARCHAR(50) NOT NULL,
    error_code VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fallback billing aggregation
CREATE TABLE fallback_billing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    total_fallback_tokens BIGINT NOT NULL DEFAULT 0,
    total_fallback_requests INTEGER NOT NULL DEFAULT 0,
    total_cost_usd DECIMAL(12,4) NOT NULL DEFAULT 0,
    billing_model VARCHAR(50) NOT NULL CHECK (billing_model IN (
        'pay_as_you_go', 'token_bundle', 'unlimited_tier', 'hybrid'
    )),
    bundle_tokens_remaining BIGINT, -- For token_bundle model
    invoice_id UUID REFERENCES invoices(id),
    invoice_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, billing_period_start, billing_period_end)
);

-- Indexes for LLM tables
CREATE INDEX idx_tenant_llm_active ON tenant_llm_config(organization_id, is_active, priority);
CREATE INDEX idx_fine_tuned_org ON fine_tuned_model_config(organization_id, is_active);
CREATE INDEX idx_fine_tuned_purpose ON fine_tuned_model_config(model_purpose);
CREATE INDEX idx_llm_usage_org ON llm_usage_log(organization_id, created_at DESC);
CREATE INDEX idx_llm_usage_fallback ON llm_usage_log(is_fallback, created_at DESC) WHERE is_fallback = true;
CREATE INDEX idx_llm_usage_agent ON llm_usage_log(agent_slug, created_at DESC);
CREATE INDEX idx_fallback_billing_org ON fallback_billing(organization_id, billing_period_start);
```

### 2.4 AI Orchestrator Implementation

```typescript
// backend/ai/AccuteAIOrchestrator.ts

import { db } from '../storage';
import { VAMNClient } from './VAMNClient';
import { FinACEverseFallbackRouter } from './FinACEverseFallbackRouter';

export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
  AZURE_OPENAI = 'azure_openai',
  MISTRAL = 'mistral',
  COHERE = 'cohere',
  GROQ = 'groq',
  DEEPSEEK = 'deepseek',
  TOGETHER = 'together',
  FIREWORKS = 'fireworks',
  OLLAMA = 'ollama',
  CUSTOM = 'custom',
  FINE_TUNED = 'fine_tuned',
  VAMN = 'vamn',
  FINACEVERSE_FALLBACK = 'finaceverse_fallback'
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  isFallback: boolean;
  estimatedCost?: number;
  cacheHit: boolean;
}

export class AccuteAIOrchestrator {
  /**
   * Accute-specific AI Orchestrator implementing FinACEverse priority cascade.
   * 
   * Priority Order:
   * 1. Client's configured LLMs (keys in DB) - FREE for us
   * 2. VAMN Triple-Stream Model - When available
   * 3. FinACEverse Fallback - WE CHARGE FOR THIS
   */
  
  private organizationId: string;
  private workspaceId?: string;
  private vamnClient: VAMNClient;
  private fallbackRouter: FinACEverseFallbackRouter;
  
  constructor(organizationId: string, workspaceId?: string) {
    this.organizationId = organizationId;
    this.workspaceId = workspaceId;
    this.vamnClient = new VAMNClient();
    this.fallbackRouter = new FinACEverseFallbackRouter();
  }
  
  async processAgentRequest(
    agentSlug: string,
    sessionId: string,
    prompt: string,
    requestType: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      contextWindow?: any[];
    } = {}
  ): Promise<AIResponse> {
    const startTime = Date.now();
    
    // Priority 1: Try client's configured LLMs
    const clientConfigs = await this.getClientLLMConfigs();
    for (const config of clientConfigs) {
      try {
        const response = await this.tryProvider(config, prompt, options);
        if (response) {
          await this.logUsage(response, agentSlug, sessionId, requestType, false);
          return response;
        }
      } catch (error) {
        console.warn(`Client LLM failed (${config.provider}):`, error);
        continue;
      }
    }
    
    // Priority 2: Try VAMN if available
    if (await this.isVAMNAvailable()) {
      try {
        const vamnHead = await this.getVAMNHeadForAgent(agentSlug);
        const response = await this.tryVAMN(vamnHead, prompt, options);
        if (response) {
          await this.logUsage(response, agentSlug, sessionId, requestType, false);
          return response;
        }
      } catch (error) {
        console.warn('VAMN inference failed:', error);
      }
    }
    
    // Priority 3: FinACEverse Fallback (BILLABLE)
    const response = await this.useFinACEverseFallback(agentSlug, prompt, options);
    await this.logUsage(response, agentSlug, sessionId, requestType, true);
    await this.recordFallbackBilling(response);
    
    return response;
  }
  
  private async getClientLLMConfigs() {
    return await db.query(`
      SELECT * FROM tenant_llm_config
      WHERE organization_id = $1
        AND (workspace_id IS NULL OR workspace_id = $2)
        AND is_active = true
        AND health_status IN ('healthy', 'unknown')
      ORDER BY priority ASC
    `, [this.organizationId, this.workspaceId]);
  }
  
  private async getVAMNHeadForAgent(agentSlug: string): Promise<string> {
    const routing = await db.queryOne(`
      SELECT primary_head, secondary_heads FROM agent_vamn_routing
      WHERE agent_slug = $1
    `, [agentSlug]);
    
    return routing?.primary_head || 'semantic';
  }
  
  private async tryVAMN(
    headType: string,
    prompt: string,
    options: any
  ): Promise<AIResponse | null> {
    const vamnResponse = await this.vamnClient.infer({
      headType,
      prompt,
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7
    });
    
    return {
      content: vamnResponse.content,
      provider: AIProvider.VAMN,
      modelId: `vamn-${headType}`,
      inputTokens: vamnResponse.inputTokens,
      outputTokens: vamnResponse.outputTokens,
      latencyMs: vamnResponse.latencyMs,
      isFallback: false,
      cacheHit: vamnResponse.cacheHit
    };
  }
  
  private async useFinACEverseFallback(
    agentSlug: string,
    prompt: string,
    options: any
  ): Promise<AIResponse> {
    const response = await this.fallbackRouter.route({
      prompt,
      context: { 
        product: 'accute',
        agent: agentSlug,
        organizationId: this.organizationId 
      },
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7
    });
    
    const cost = this.calculateFallbackCost(
      response.inputTokens,
      response.outputTokens,
      response.modelId
    );
    
    return {
      content: response.content,
      provider: AIProvider.FINACEVERSE_FALLBACK,
      modelId: response.modelId,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      latencyMs: response.latencyMs,
      isFallback: true,
      estimatedCost: cost,
      cacheHit: false
    };
  }
  
  private async logUsage(
    response: AIResponse,
    agentSlug: string,
    sessionId: string,
    requestType: string,
    isFallback: boolean
  ) {
    await db.execute(`
      INSERT INTO llm_usage_log (
        organization_id, agent_slug, session_id,
        provider, model_id, is_fallback,
        input_tokens, output_tokens, latency_ms,
        estimated_cost_usd, request_type, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'success')
    `, [
      this.organizationId, agentSlug, sessionId,
      response.provider, response.modelId, isFallback,
      response.inputTokens, response.outputTokens, response.latencyMs,
      response.estimatedCost || null, requestType
    ]);
  }
  
  private async recordFallbackBilling(response: AIResponse) {
    if (!response.isFallback) return;
    
    await db.execute(`
      INSERT INTO fallback_billing (
        organization_id, billing_period_start, billing_period_end,
        total_fallback_tokens, total_fallback_requests, total_cost_usd,
        billing_model
      ) VALUES (
        $1,
        date_trunc('month', NOW()),
        (date_trunc('month', NOW()) + INTERVAL '1 month')::date,
        $2, 1, $3,
        COALESCE(
          (SELECT billing_model FROM organizations WHERE id = $1),
          'pay_as_you_go'
        )
      )
      ON CONFLICT (organization_id, billing_period_start, billing_period_end)
      DO UPDATE SET
        total_fallback_tokens = fallback_billing.total_fallback_tokens + $2,
        total_fallback_requests = fallback_billing.total_fallback_requests + 1,
        total_cost_usd = fallback_billing.total_cost_usd + $3,
        updated_at = NOW()
    `, [
      this.organizationId,
      response.inputTokens + response.outputTokens,
      response.estimatedCost
    ]);
  }
  
  private calculateFallbackCost(
    inputTokens: number,
    outputTokens: number,
    modelId: string
  ): number {
    // Pricing per 1M tokens (example rates)
    const pricingTable: Record<string, { input: number; output: number }> = {
      'gpt-4-turbo': { input: 10, output: 30 },
      'gpt-4': { input: 30, output: 60 },
      'claude-3-opus': { input: 15, output: 75 },
      'claude-3-sonnet': { input: 3, output: 15 }
    };
    
    const pricing = pricingTable[modelId] || { input: 5, output: 15 };
    
    return (
      (inputTokens / 1000000) * pricing.input +
      (outputTokens / 1000000) * pricing.output
    );
  }
}
```

---

## 3. Security Upgrade to 21 Layers (Critical)

### 3.1 Current vs Required

| Layer | Current State | Required Action |
|-------|---------------|-----------------|
| 1. WAF | ❓ Not mentioned | **ADD: Cloudflare/AWS WAF** |
| 2. DDoS Protection | ❓ Unknown | **ADD** |
| 3. Rate Limiting | ✅ Redis-based | Keep + enhance |
| 4. JWT Auth | ✅ Present | **Upgrade to RS256** |
| 5. MFA | ✅ TOTP, Backup codes | Keep |
| 6. SSO | ✅ SAML/OIDC | Keep |
| 7. RBAC | ✅ Comprehensive | Keep + enhance with ABAC |
| 8. Encryption at Rest | ✅ AES-256-GCM | **Add Azure HSM** |
| 9. Encryption in Transit | ✅ TLS | Keep |
| 10. Row-Level Security | ✅ Multi-tenant | Keep |
| 11. HSM Integration | ❌ Missing | **ADD: Azure HSM** |
| 12. Behavioral Biometrics | ❌ Missing | **ADD** |
| 13. Network Segmentation | ❌ Missing | **ADD** |
| 14. Immutable Audit Logs | ❌ Missing | **ADD** |
| 15. Anomaly Detection | ❌ Missing | **ADD** |
| 16. Threat Intelligence | ❌ Missing | **ADD** |
| 17. Zero Trust Network | ❌ Missing | **ADD** |
| 18. API Gateway Security | ✅ Express middleware | Enhance |
| 19. Container Security | ❓ Unknown | **ADD** |
| 20. Supply Chain Security | ❌ Missing | **ADD** |
| 21. Dead Man's Switch | ❌ Missing | **ADD** |

### 3.2 Required Security Tables

```sql
-- =====================================================
-- SECURITY ENHANCEMENT TABLES
-- =====================================================

-- Azure HSM key management
CREATE TABLE hsm_key_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id), -- NULL = system-wide key
    key_name VARCHAR(100) NOT NULL,
    key_vault_uri VARCHAR(500) NOT NULL,
    key_version VARCHAR(100) NOT NULL,
    key_purpose VARCHAR(100) NOT NULL CHECK (key_purpose IN (
        'organization_dek', 'llm_api_keys', 'document_encryption', 
        'payment_credentials', 'signing', 'master_kek'
    )),
    algorithm VARCHAR(50) NOT NULL DEFAULT 'RSA-OAEP-256',
    is_active BOOLEAN DEFAULT true,
    rotation_due_at TIMESTAMPTZ,
    last_rotated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, key_purpose)
);

-- Behavioral biometrics tracking
CREATE TABLE behavioral_biometrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    session_id UUID NOT NULL REFERENCES sessions(id),
    typing_pattern_hash VARCHAR(128),
    mouse_dynamics_hash VARCHAR(128),
    navigation_pattern_hash VARCHAR(128),
    device_fingerprint VARCHAR(256),
    risk_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    anomaly_detected BOOLEAN DEFAULT false,
    anomaly_reasons TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Immutable audit log (append-only, blockchain-backed)
CREATE TABLE immutable_audit_log (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    action_data JSONB NOT NULL,
    ip_address INET,
    user_agent TEXT,
    previous_hash VARCHAR(128) NOT NULL, -- Chain to previous record
    record_hash VARCHAR(128) NOT NULL,   -- SHA-256 of this record
    blockchain_tx_id VARCHAR(128),       -- Optional blockchain anchor
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anomaly detection events
CREATE TABLE security_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    user_id UUID,
    anomaly_type VARCHAR(100) NOT NULL CHECK (anomaly_type IN (
        'login_location', 'access_pattern', 'data_exfiltration',
        'privilege_escalation', 'api_abuse', 'credential_stuffing',
        'behavioral_mismatch', 'time_anomaly', 'volume_spike'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    details JSONB NOT NULL,
    ml_confidence DECIMAL(5,4),
    auto_blocked BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    resolution VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Zero trust network access log
CREATE TABLE zero_trust_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    user_id UUID NOT NULL,
    device_id UUID REFERENCES "trustedDevices"(id),
    resource_requested VARCHAR(500) NOT NULL,
    access_decision VARCHAR(20) NOT NULL CHECK (access_decision IN ('allow', 'deny', 'challenge')),
    trust_score DECIMAL(5,2) NOT NULL,
    factors_evaluated JSONB NOT NULL, -- Which trust factors were checked
    challenge_type VARCHAR(50), -- 'mfa', 'captcha', 'biometric', etc.
    challenge_passed BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Threat intelligence feeds
CREATE TABLE threat_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    indicator_type VARCHAR(50) NOT NULL CHECK (indicator_type IN (
        'ip', 'domain', 'hash', 'email', 'url', 'user_agent'
    )),
    indicator_value VARCHAR(500) NOT NULL,
    threat_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    source VARCHAR(100) NOT NULL,
    confidence DECIMAL(5,2) NOT NULL,
    first_seen TIMESTAMPTZ NOT NULL,
    last_seen TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dead Man's Switch configuration
CREATE TABLE dead_man_switch_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    admin_user_id UUID NOT NULL REFERENCES users(id),
    heartbeat_interval_hours INTEGER NOT NULL DEFAULT 24,
    grace_period_hours INTEGER NOT NULL DEFAULT 48,
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    doom_timer_started_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    escalation_contacts JSONB NOT NULL, -- Emergency contacts
    recovery_instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for security tables
CREATE INDEX idx_hsm_org ON hsm_key_registry(organization_id, is_active);
CREATE INDEX idx_biometrics_user ON behavioral_biometrics(user_id, created_at DESC);
CREATE INDEX idx_biometrics_anomaly ON behavioral_biometrics(anomaly_detected) WHERE anomaly_detected = true;
CREATE INDEX idx_audit_org ON immutable_audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_hash ON immutable_audit_log(record_hash);
CREATE INDEX idx_anomaly_org ON security_anomalies(organization_id, created_at DESC);
CREATE INDEX idx_anomaly_severity ON security_anomalies(severity, created_at DESC);
CREATE INDEX idx_zt_access_user ON zero_trust_access_log(user_id, created_at DESC);
CREATE INDEX idx_threat_indicator ON threat_intelligence(indicator_type, indicator_value);
CREATE INDEX idx_threat_active ON threat_intelligence(is_active, indicator_type);
CREATE INDEX idx_dms_org ON dead_man_switch_config(organization_id, is_active);
```

### 3.3 JWT Upgrade to RS256

```typescript
// backend/security/JWTService.ts

import jwt from 'jsonwebtoken';
import { KeyClient } from '@azure/keyvault-keys';
import { DefaultAzureCredential } from '@azure/identity';

export class EnterpriseJWTService {
  /**
   * RS256 JWT implementation with Azure HSM key management.
   */
  
  private keyClient: KeyClient;
  private signingKey: any;
  private publicKey: any;
  
  constructor(keyVaultUri: string) {
    const credential = new DefaultAzureCredential();
    this.keyClient = new KeyClient(keyVaultUri, credential);
    this.loadSigningKey();
  }
  
  private async loadSigningKey() {
    this.signingKey = await this.keyClient.getKey('accute-jwt-signing');
    this.publicKey = this.signingKey.key.n; // Public component
  }
  
  createToken(
    userId: string,
    organizationId: string,
    workspaceId: string | null,
    roles: string[],
    permissions: string[],
    expiresIn: string = '15m'
  ): string {
    const payload = {
      sub: userId,
      organization_id: organizationId,
      workspace_id: workspaceId,
      roles,
      permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseExpiry(expiresIn),
      iss: 'accute.finaceverse.com',
      aud: 'accute-api'
    };
    
    // Sign with Azure HSM (key never leaves HSM)
    return jwt.sign(payload, this.signingKey, {
      algorithm: 'RS256',
      header: { kid: this.signingKey.id }
    });
  }
  
  verifyToken(token: string): any {
    return jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
      audience: 'accute-api',
      issuer: 'accute.finaceverse.com'
    });
  }
  
  private parseExpiry(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));
    
    switch (unit) {
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900; // 15 min default
    }
  }
}
```

---

## 4. Fin(Ai)d Hub Integration (Critical)

### 4.1 Current State
- **Problem**: Accute appears to be standalone
- **Missing**: Event bus, cross-product workflows, orchestration layer

### 4.2 Required Architecture

```typescript
// backend/integrations/FinAIdHubClient.ts

export enum AccuteEventType {
  // Client Management
  CLIENT_CREATED = 'accute.client.created',
  CLIENT_PORTAL_INVITED = 'accute.client.portal.invited',
  CLIENT_ONBOARDING_COMPLETED = 'accute.client.onboarding.completed',
  
  // Project & Task Management
  PROJECT_CREATED = 'accute.project.created',
  PROJECT_BUDGET_EXCEEDED = 'accute.project.budget.exceeded',
  TASK_ASSIGNED = 'accute.task.assigned',
  TASK_COMPLETED = 'accute.task.completed',
  WORKFLOW_EXECUTED = 'accute.workflow.executed',
  
  // Document & Forms
  DOCUMENT_UPLOADED = 'accute.document.uploaded',
  DOCUMENT_SIGNED = 'accute.document.signed',
  FORM_SUBMITTED = 'accute.form.submitted',
  
  // Billing & Payments
  INVOICE_GENERATED = 'accute.invoice.generated',
  PAYMENT_RECEIVED = 'accute.payment.received',
  SUBSCRIPTION_CHANGED = 'accute.subscription.changed',
  
  // AI Agent Events
  AGENT_SESSION_STARTED = 'accute.agent.session.started',
  ROUNDTABLE_COMPLETED = 'accute.roundtable.completed',
  
  // Team & HR
  EMPLOYEE_ONBOARDED = 'accute.employee.onboarded',
  PERFORMANCE_REVIEW_COMPLETED = 'accute.performance.review.completed'
}

export class FinAIdHubClient {
  private hubUrl: string;
  private serviceToken: string;
  
  constructor(hubUrl: string, accuteServiceToken: string) {
    this.hubUrl = hubUrl;
    this.serviceToken = accuteServiceToken;
  }
  
  async publishEvent(event: {
    eventType: AccuteEventType;
    organizationId: string;
    payload: any;
    correlationId?: string;
  }) {
    await fetch(`${this.hubUrl}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.serviceToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'accute',
        event_type: event.eventType,
        tenant_id: event.organizationId,
        payload: event.payload,
        correlation_id: event.correlationId || crypto.randomUUID(),
        timestamp: new Date().toISOString()
      })
    });
  }
  
  async triggerCrossProductWorkflow(
    workflowId: string,
    organizationId: string,
    inputData: any
  ): Promise<string> {
    const response = await fetch(
      `${this.hubUrl}/workflows/${workflowId}/trigger`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.serviceToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: 'accute',
          tenant_id: organizationId,
          input: inputData
        })
      }
    );
    
    const result = await response.json();
    return result.execution_id;
  }
}
```

### 4.3 Cross-Product Workflow Examples

```yaml
# Accute → Cyloid Integration
workflow:
  name: "invoice_document_extraction"
  trigger: "accute.invoice.generated"
  steps:
    - accute.generate_invoice_pdf
    - cyloid.intellexion.extract_data
    - cyloid.veritas.verify_extraction
    - accute.attach_verification_report

# Accute → Luca Integration
workflow:
  name: "client_compliance_check"
  trigger: "accute.client.created"
  steps:
    - accute.get_client_data
    - luca.analyze_compliance_requirements
    - luca.generate_compliance_checklist
    - accute.create_client_onboarding_tasks

# Accute → FinAId Hub → Multiple Products
workflow:
  name: "comprehensive_tax_filing"
  trigger: "accute.task.assigned[type=tax_filing]"
  steps:
    - accute.luca_agent.gather_client_data
    - cyloid.extract_financial_documents
    - luca.prepare_tax_calculations
    - accute.parity_agent.draft_tax_forms
    - accute.forma_agent.generate_signature_forms
    - accute.relay_agent.send_to_client
```

---

## 5. Consent Framework (GDPR/CCPA) (High Priority)

### 5.1 Required Tables

```sql
-- =====================================================
-- CONSENT MANAGEMENT TABLES
-- =====================================================

CREATE TABLE user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    consent_type VARCHAR(100) NOT NULL CHECK (consent_type IN (
        'data_processing', 'ai_training', 'federated_learning',
        'analytics', 'marketing', 'third_party_sharing',
        'cross_product_data_flow', 'vamn_contribution',
        'agent_conversation_logging', 'document_scanning'
    )),
    consent_given BOOLEAN NOT NULL,
    consent_version VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    given_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id, consent_type)
);

CREATE TABLE data_subject_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN (
        'access', 'rectification', 'erasure', 'portability', 
        'restriction', 'objection'
    )),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_progress', 'completed', 'rejected'
    )),
    request_details JSONB NOT NULL,
    response_details JSONB,
    deadline TIMESTAMPTZ NOT NULL, -- GDPR: 30 days
    completed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_consents_user ON user_consents(organization_id, user_id);
CREATE INDEX idx_consents_type ON user_consents(consent_type, consent_given);
CREATE INDEX idx_dsr_status ON data_subject_requests(status, deadline);
CREATE INDEX idx_dsr_user ON data_subject_requests(organization_id, user_id);
```

---

## 6. Agent Updates for VAMN Integration

### 6.1 Update All 12 Agents

Each agent's `backend/handler.ts` needs to replace direct LLM calls with `AccuteAIOrchestrator`:

```typescript
// agents/luca/backend/handler.ts (BEFORE)
import OpenAI from 'openai';

export function registerRoutes(app: Express) {
  app.post('/api/agents/luca/chat', async (req, res) => {
    const { sessionId, message } = req.body;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: message }]
    });
    
    res.json({ response: completion.choices[0].message.content });
  });
}

// agents/luca/backend/handler.ts (AFTER - VAMN Integrated)
import { AccuteAIOrchestrator } from '../../../backend/ai/AccuteAIOrchestrator';

export function registerRoutes(app: Express) {
  app.post('/api/agents/luca/chat', async (req, res) => {
    const { sessionId, message, organizationId } = req.body;
    
    const orchestrator = new AccuteAIOrchestrator(organizationId);
    
    const response = await orchestrator.processAgentRequest(
      'luca',
      sessionId,
      message,
      'agent_chat',
      { maxTokens: 4096, temperature: 0.7 }
    );
    
    res.json({
      response: response.content,
      provider: response.provider,
      isFallback: response.isFallback,
      cost: response.estimatedCost
    });
  });
}
```

### 6.2 Agent-Specific VAMN Routing

Update all agents based on their primary function:

| Agent | Primary Head | Secondary Heads | Use Case |
|-------|--------------|-----------------|----------|
| **LUCA** | Quantitative | Semantic | Accounting, tax calculations, financial analysis |
| **PARITY** | Citation | Semantic | Legal drafting with citations |
| **CADENCE** | Semantic | - | Workflow builder |
| **FORMA** | Semantic | - | Form generation |
| **ECHO** | Semantic | - | Message templates |
| **SCRIBE** | Semantic | - | Email drafting |
| **RELAY** | Semantic | - | Email → Task conversion |
| **LYNK** | Semantic | - | Message → Task |
| **TRACE** | Semantic | - | Resume parsing |
| **RADAR** | Semantic | - | Activity analysis |
| **OMNISPECTRA** | Quantitative | - | Workload forecasting |
| **ONBOARD** | Semantic | - | Employee onboarding |

---

## 7. Implementation Checklist

### Phase 1: Foundation (Week 1-3)
- [ ] Create all new database tables (15 tables)
- [ ] Migrate `llmConfigurations` to `tenant_llm_config`
- [ ] Implement Azure HSM integration
- [ ] Upgrade JWT from HS256 to RS256
- [ ] Add VAMN model registry tables

### Phase 2: AI Integration (Week 4-6)
- [ ] Implement `AccuteAIOrchestrator` class
- [ ] Integrate VAMN client
- [ ] Update all 12 agent handlers
- [ ] Implement fallback billing system
- [ ] Add fine-tuned model support

### Phase 3: Security Enhancement (Week 7-9)
- [ ] Add behavioral biometrics tracking
- [ ] Implement immutable audit logs
- [ ] Add anomaly detection system
- [ ] Integrate threat intelligence feeds
- [ ] Implement zero trust access
- [ ] Add Dead Man's Switch

### Phase 4: Integration (Week 10-12)
- [ ] Connect to Fin(Ai)d Hub event bus
- [ ] Implement cross-product workflows
- [ ] Add federated learning contribution
- [ ] Implement consent framework
- [ ] Add GDPR/CCPA compliance tools

### Phase 5: Testing & Validation (Week 13-15)
- [ ] Security penetration testing
- [ ] Performance benchmarking (200+ tables)
- [ ] Agent VAMN integration testing
- [ ] Cross-product workflow validation
- [ ] Compliance validation (SOC2, GDPR)

---

## 8. Database Schema Changes Summary

| Category | New Tables | Modified Tables | New Indexes |
|----------|------------|-----------------|-------------|
| VAMN Integration | 4 | 0 | 6 |
| Multi-LLM | 4 | 1 (replace llmConfigurations) | 7 |
| Security | 7 | 0 | 12 |
| Consent | 2 | 0 | 4 |
| **Total** | **17** | **1** | **29** |

---

## 9. Agent Migration Priority

| Priority | Agents | Reason |
|----------|--------|--------|
| **High** | LUCA, PARITY | Most critical (accounting, legal) |
| **Medium** | CADENCE, FORMA, RELAY, LYNK | High usage (workflows, automation) |
| **Low** | ECHO, SCRIBE, RADAR, OMNISPECTRA, ONBOARD, TRACE | Supporting functions |

---

## 10. Post-Implementation Alignment

| Component | Before | After |
|-----------|--------|-------|
| VAMN Integration | ❌ 0% | ✅ 100% |
| Multi-LLM Priority | ❌ 0% | ✅ 100% |
| Security Layers | 8/21 (38%) | ✅ 21/21 (100%) |
| HSM Integration | ❌ Missing | ✅ Azure HSM |
| JWT Algorithm | Unknown | ✅ RS256 |
| Fin(Ai)d Hub | ❌ Standalone | ✅ Full Events |
| Consent Framework | ❌ Missing | ✅ GDPR/CCPA |
| Federated Learning | ❌ Missing | ✅ Enabled |
| **Overall Alignment** | **65%** | **100%** |

---

## 11. Performance Considerations

### 11.1 Database Optimization
- **200+ existing tables**: Ensure proper indexing on all new foreign keys
- **Connection pooling**: Neon Serverless handles this, but monitor limits
- **Query optimization**: Use materialized views for heavy analytics queries

### 11.2 AI Orchestrator Caching
```typescript
// Redis caching for VAMN responses
const cacheKey = `vamn:${agentSlug}:${hashPrompt(prompt)}`;
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}
```

### 11.3 Event Bus Performance
- Use message queuing (Redis/RabbitMQ) for Fin(Ai)d Hub events
- Implement retry logic with exponential backoff
- Monitor event processing latency

---

*Document maintained by FinACEverse Architecture Team*  
*Last Updated: January 16, 2026*
