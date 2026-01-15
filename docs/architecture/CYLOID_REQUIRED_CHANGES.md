# Cyloid Required Changes for FinACEverse Compliance

> **Document Version**: 1.0  
> **Date**: January 14, 2026  
> **Status**: Implementation Required  
> **Current Alignment**: 70% → Target: 100%  
> **Reference**: FinACEverse Master Architecture v1.0

---

## Executive Summary

Cyloid is a GPU-accelerated Financial Intelligence Platform that requires updates to fully integrate with the FinACEverse ecosystem. This document specifies all required changes to achieve 100% compliance with FinACEverse Master Architecture standards.

---

## 1. VAMN Integration (Critical)

### 1.1 Current State
- Standalone models: LayoutLMv3, All-MiniLM-L6, Cross-Encoder
- No VAMN connection
- No federated learning capability

### 1.2 Required Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CYLOID AI ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              AI REQUEST ORCHESTRATOR                       │   │
│  │  Priority: Client LLMs → VAMN → FinACEverse Fallback      │   │
│  └─────────────────────┬────────────────────────────────────┘   │
│                        │                                         │
│    ┌───────────────────┼───────────────────┐                    │
│    ▼                   ▼                   ▼                    │
│  ┌─────────┐    ┌─────────────┐    ┌──────────────┐            │
│  │ Client  │    │    VAMN     │    │  FinACEverse │            │
│  │  LLMs   │    │ Triple-Head │    │   Fallback   │            │
│  │ (Free)  │    │  (Primary)  │    │  (Billable)  │            │
│  └─────────┘    └──────┬──────┘    └──────────────┘            │
│                        │                                         │
│         ┌──────────────┼──────────────┐                         │
│         ▼              ▼              ▼                         │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                  │
│  │  Semantic  │ │Quantitative│ │  Citation  │                  │
│  │    Head    │ │    Head    │ │    Head    │                  │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘                  │
│        │              │              │                          │
│        ▼              ▼              ▼                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                  │
│  │LayoutLMv3 │ │  FinBERT   │ │  MiniLM    │                  │
│  │ (OCR/Doc) │ │ (Numbers)  │ │ (Sources)  │                  │
│  └────────────┘ └────────────┘ └────────────┘                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           SPECIALIZED ADAPTERS (Cyloid-Specific)          │   │
│  │  • Intellexion Adapter (Document Intelligence)            │   │
│  │  • Synapse Adapter (Search & RAG)                         │   │
│  │  • Veritas Adapter (Evaluation & Verification)            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Required Database Tables

```sql
-- =====================================================
-- VAMN INTEGRATION TABLES
-- =====================================================

-- Tracks VAMN model versions and availability
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

-- VAMN inference requests and metrics
CREATE TABLE vamn_inference_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    request_id UUID NOT NULL,
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

-- Federated learning contributions
CREATE TABLE federated_learning_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    model_type VARCHAR(100) NOT NULL,
    gradient_checksum VARCHAR(128) NOT NULL,
    contribution_weight DECIMAL(10,6) NOT NULL,
    privacy_budget_consumed DECIMAL(10,6) NOT NULL,
    aggregation_round INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for VAMN tables
CREATE INDEX idx_vamn_inference_tenant ON vamn_inference_log(tenant_id);
CREATE INDEX idx_vamn_inference_created ON vamn_inference_log(created_at DESC);
CREATE INDEX idx_vamn_inference_status ON vamn_inference_log(status);
CREATE INDEX idx_federated_tenant ON federated_learning_contributions(tenant_id);
CREATE INDEX idx_federated_round ON federated_learning_contributions(aggregation_round);
```

---

## 2. Multi-LLM Support (Critical)

### 2.1 AI Resolution Priority

```
┌─────────────────────────────────────────────────────────────┐
│                   AI RESOLUTION CASCADE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PRIORITY 1: Client's Own LLMs (No Cost to Us)              │
│  ├─ OpenAI (client's API key)                               │
│  ├─ Anthropic Claude (client's API key)                     │
│  ├─ Google Gemini (client's API key)                        │
│  ├─ Azure OpenAI (client's deployment)                      │
│  ├─ Mistral (client's API key)                              │
│  ├─ Cohere (client's API key)                               │
│  ├─ Groq (client's API key)                                 │
│  ├─ DeepSeek (client's API key)                             │
│  ├─ Together AI (client's API key)                          │
│  ├─ Fireworks AI (client's API key)                         │
│  ├─ Ollama (client's self-hosted)                           │
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

### 2.2 Required Database Tables

```sql
-- =====================================================
-- MULTI-LLM CONFIGURATION TABLES
-- =====================================================

-- Tenant LLM configuration (keys stored encrypted in DB, NOT env vars)
CREATE TABLE tenant_llm_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    provider VARCHAR(50) NOT NULL CHECK (provider IN (
        'openai', 'anthropic', 'gemini', 'azure_openai', 'mistral',
        'cohere', 'groq', 'deepseek', 'together', 'fireworks', 
        'ollama', 'custom', 'fine_tuned'
    )),
    display_name VARCHAR(100) NOT NULL,
    api_key_encrypted BYTEA, -- AES-256-GCM encrypted, NULL for Ollama
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
    UNIQUE(tenant_id, provider, model_id)
);

-- Fine-tuned model configurations
CREATE TABLE fine_tuned_model_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id), -- NULL = FinACEverse internal
    model_name VARCHAR(200) NOT NULL,
    base_provider VARCHAR(50) NOT NULL,
    base_model VARCHAR(200) NOT NULL,
    fine_tune_id VARCHAR(200), -- OpenAI ft-xxx, Anthropic fine-tune ID
    deployment_type VARCHAR(50) NOT NULL CHECK (deployment_type IN (
        'hosted', 'azure_ml', 'sagemaker', 'vertex', 'self_hosted'
    )),
    endpoint_url VARCHAR(500),
    api_key_encrypted BYTEA,
    model_purpose VARCHAR(100) NOT NULL, -- 'document_extraction', 'financial_analysis', etc.
    training_data_hash VARCHAR(128),
    version VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_vamn_predecessor BOOLEAN DEFAULT false, -- Pre-VAMN models that feed into VAMN
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LLM usage tracking for billing
CREATE TABLE llm_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    request_id UUID NOT NULL,
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
    request_type VARCHAR(100), -- 'document_analysis', 'search', 'evaluation'
    cyloid_module VARCHAR(50), -- 'intellexion', 'synapse', 'veritas'
    cache_hit BOOLEAN DEFAULT false,
    status VARCHAR(50) NOT NULL,
    error_code VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fallback billing aggregation
CREATE TABLE fallback_billing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    total_fallback_tokens BIGINT NOT NULL DEFAULT 0,
    total_fallback_requests INTEGER NOT NULL DEFAULT 0,
    total_cost_usd DECIMAL(12,4) NOT NULL DEFAULT 0,
    billing_model VARCHAR(50) NOT NULL CHECK (billing_model IN (
        'pay_as_you_go', 'token_bundle', 'unlimited_tier', 'hybrid'
    )),
    bundle_tokens_remaining BIGINT, -- For token_bundle model
    invoice_id VARCHAR(100),
    invoice_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, billing_period_start, billing_period_end)
);

-- Indexes for LLM tables
CREATE INDEX idx_tenant_llm_active ON tenant_llm_config(tenant_id, is_active, priority);
CREATE INDEX idx_fine_tuned_tenant ON fine_tuned_model_config(tenant_id, is_active);
CREATE INDEX idx_fine_tuned_purpose ON fine_tuned_model_config(model_purpose);
CREATE INDEX idx_llm_usage_tenant ON llm_usage_log(tenant_id, created_at DESC);
CREATE INDEX idx_llm_usage_fallback ON llm_usage_log(is_fallback, created_at DESC) WHERE is_fallback = true;
CREATE INDEX idx_llm_usage_module ON llm_usage_log(cyloid_module, created_at DESC);
CREATE INDEX idx_fallback_billing_tenant ON fallback_billing(tenant_id, billing_period_start);
```

### 2.3 AI Orchestrator Implementation

```python
# backend/ai/orchestrator.py

from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum
import asyncio

class AIProvider(Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"
    AZURE_OPENAI = "azure_openai"
    MISTRAL = "mistral"
    COHERE = "cohere"
    GROQ = "groq"
    DEEPSEEK = "deepseek"
    TOGETHER = "together"
    FIREWORKS = "fireworks"
    OLLAMA = "ollama"
    CUSTOM = "custom"
    FINE_TUNED = "fine_tuned"
    VAMN = "vamn"
    FINACEVERSE_FALLBACK = "finaceverse_fallback"

@dataclass
class AIResponse:
    content: str
    provider: AIProvider
    model_id: str
    input_tokens: int
    output_tokens: int
    latency_ms: int
    is_fallback: bool
    estimated_cost: Optional[float] = None
    cache_hit: bool = False

class CyloidAIOrchestrator:
    """
    Cyloid-specific AI Orchestrator implementing FinACEverse priority cascade.
    
    Priority Order:
    1. Client's configured LLMs (keys in DB) - FREE for us
    2. VAMN Triple-Stream Model - When available
    3. FinACEverse Fallback - WE CHARGE FOR THIS
    """
    
    def __init__(self, tenant_id: str, db_session):
        self.tenant_id = tenant_id
        self.db = db_session
        self.adapters: Dict[AIProvider, 'LLMAdapter'] = {}
        self._load_tenant_config()
    
    async def _load_tenant_config(self):
        """Load tenant's LLM configurations from database."""
        configs = await self.db.fetch_all("""
            SELECT * FROM tenant_llm_config 
            WHERE tenant_id = $1 AND is_active = true
            ORDER BY priority ASC
        """, self.tenant_id)
        
        for config in configs:
            adapter = await self._create_adapter(config)
            if adapter:
                self.adapters[AIProvider(config['provider'])] = adapter
    
    async def process_request(
        self,
        prompt: str,
        module: str,  # 'intellexion', 'synapse', 'veritas'
        request_type: str,
        max_tokens: int = 4096,
        temperature: float = 0.7
    ) -> AIResponse:
        """
        Process AI request with priority cascade.
        """
        # Priority 1: Try client's configured LLMs
        client_configs = await self._get_client_llm_configs()
        for config in client_configs:
            try:
                response = await self._try_provider(
                    config, prompt, max_tokens, temperature
                )
                if response:
                    await self._log_usage(response, module, request_type, is_fallback=False)
                    return response
            except Exception as e:
                await self._log_provider_failure(config, e)
                continue
        
        # Priority 2: Try VAMN if available
        if await self._is_vamn_available():
            try:
                response = await self._try_vamn(prompt, module, max_tokens, temperature)
                if response:
                    await self._log_usage(response, module, request_type, is_fallback=False)
                    return response
            except Exception as e:
                await self._log_vamn_failure(e)
        
        # Priority 3: FinACEverse Fallback (BILLABLE)
        response = await self._use_finaceverse_fallback(prompt, module, max_tokens, temperature)
        await self._log_usage(response, module, request_type, is_fallback=True)
        await self._record_billing(response)
        return response
    
    async def _try_vamn(
        self, 
        prompt: str, 
        module: str,
        max_tokens: int, 
        temperature: float
    ) -> Optional[AIResponse]:
        """
        Route to appropriate VAMN head based on Cyloid module.
        """
        head_mapping = {
            'intellexion': 'semantic',      # Document understanding
            'synapse': 'semantic',          # Search & RAG
            'veritas': 'citation'           # Verification needs citations
        }
        
        head_type = head_mapping.get(module, 'semantic')
        
        # Call VAMN service
        vamn_response = await self.vamn_client.infer(
            prompt=prompt,
            head_type=head_type,
            max_tokens=max_tokens,
            temperature=temperature
        )
        
        return AIResponse(
            content=vamn_response.content,
            provider=AIProvider.VAMN,
            model_id=f"vamn-{head_type}",
            input_tokens=vamn_response.input_tokens,
            output_tokens=vamn_response.output_tokens,
            latency_ms=vamn_response.latency_ms,
            is_fallback=False,
            cache_hit=vamn_response.cache_hit
        )
    
    async def _use_finaceverse_fallback(
        self,
        prompt: str,
        module: str,
        max_tokens: int,
        temperature: float
    ) -> AIResponse:
        """
        Use FinACEverse-managed fallback. THIS IS BILLABLE.
        """
        fallback_router = FinACEverseFallbackRouter()
        
        response = await fallback_router.route(
            prompt=prompt,
            context={'module': module, 'product': 'cyloid'},
            max_tokens=max_tokens,
            temperature=temperature
        )
        
        # Calculate cost for billing
        cost = self._calculate_fallback_cost(
            response.input_tokens,
            response.output_tokens,
            response.model_id
        )
        
        return AIResponse(
            content=response.content,
            provider=AIProvider.FINACEVERSE_FALLBACK,
            model_id=response.model_id,
            input_tokens=response.input_tokens,
            output_tokens=response.output_tokens,
            latency_ms=response.latency_ms,
            is_fallback=True,
            estimated_cost=cost
        )
    
    async def _record_billing(self, response: AIResponse):
        """Record billable fallback usage."""
        await self.db.execute("""
            INSERT INTO fallback_billing (
                tenant_id, billing_period_start, billing_period_end,
                total_fallback_tokens, total_fallback_requests, total_cost_usd,
                billing_model
            ) VALUES ($1, date_trunc('month', NOW()), 
                     (date_trunc('month', NOW()) + INTERVAL '1 month')::date,
                     $2, 1, $3, 
                     COALESCE((SELECT billing_model FROM tenants WHERE id = $1), 'pay_as_you_go'))
            ON CONFLICT (tenant_id, billing_period_start, billing_period_end)
            DO UPDATE SET
                total_fallback_tokens = fallback_billing.total_fallback_tokens + $2,
                total_fallback_requests = fallback_billing.total_fallback_requests + 1,
                total_cost_usd = fallback_billing.total_cost_usd + $3,
                updated_at = NOW()
        """, self.tenant_id, response.input_tokens + response.output_tokens, response.estimated_cost)
```

---

## 3. Security Upgrade to 21 Layers (Critical)

### 3.1 Current vs Required

| Layer | Current State | Required Action |
|-------|---------------|-----------------|
| 1. WAF | ✅ Cloudflare | Keep |
| 2. DDoS Protection | ✅ Cloudflare | Keep |
| 3. Rate Limiting | ✅ Redis | Keep |
| 4. JWT Auth | ❌ HS256 | **Upgrade to RS256** |
| 5. RBAC | ✅ Present | Enhance with attribute-based |
| 6. Encryption at Rest | ✅ AES-256 | **Add Azure HSM integration** |
| 7. Encryption in Transit | ✅ TLS 1.3 | Keep |
| 8. Honeypots | ✅ Active | Keep |
| 9. Decoys | ✅ Canary records | Keep |
| 10. Dead Man's Switch | ✅ Present | Keep |
| 11. Shamir Secrets | ✅ Present | Keep |
| 12. HSM Integration | ❌ Missing | **ADD: Azure HSM** |
| 13. Behavioral Biometrics | ❌ Missing | **ADD** |
| 14. Network Segmentation | ❌ Missing | **ADD** |
| 15. Immutable Audit Logs | ❌ Missing | **ADD** |
| 16. Anomaly Detection | ❌ Missing | **ADD** |
| 17. Threat Intelligence | ❌ Missing | **ADD** |
| 18. Zero Trust Network | ❌ Missing | **ADD** |
| 19. API Gateway Security | ✅ FastAPI | Enhance |
| 20. Container Security | ❌ Missing | **ADD** |
| 21. Supply Chain Security | ❌ Missing | **ADD** |

### 3.2 Required Database Tables

```sql
-- =====================================================
-- SECURITY ENHANCEMENT TABLES
-- =====================================================

-- Azure HSM key management
CREATE TABLE hsm_key_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id), -- NULL = system-wide key
    key_name VARCHAR(100) NOT NULL,
    key_vault_uri VARCHAR(500) NOT NULL,
    key_version VARCHAR(100) NOT NULL,
    key_purpose VARCHAR(100) NOT NULL CHECK (key_purpose IN (
        'tenant_data', 'llm_api_keys', 'document_encryption', 
        'backup_encryption', 'signing', 'master'
    )),
    algorithm VARCHAR(50) NOT NULL DEFAULT 'RSA-OAEP-256',
    is_active BOOLEAN DEFAULT true,
    rotation_due_at TIMESTAMPTZ,
    last_rotated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, key_purpose)
);

-- Behavioral biometrics tracking
CREATE TABLE behavioral_biometrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    session_id UUID NOT NULL,
    typing_pattern_hash VARCHAR(128),
    mouse_dynamics_hash VARCHAR(128),
    navigation_pattern_hash VARCHAR(128),
    device_fingerprint VARCHAR(256),
    risk_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    anomaly_detected BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Immutable audit log (append-only, blockchain-backed)
CREATE TABLE immutable_audit_log (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
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
    tenant_id UUID NOT NULL,
    user_id UUID,
    anomaly_type VARCHAR(100) NOT NULL CHECK (anomaly_type IN (
        'login_location', 'access_pattern', 'data_exfiltration',
        'privilege_escalation', 'api_abuse', 'credential_stuffing',
        'behavioral_mismatch', 'time_anomaly'
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
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    device_id UUID,
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

-- Indexes for security tables
CREATE INDEX idx_hsm_tenant ON hsm_key_registry(tenant_id, is_active);
CREATE INDEX idx_biometrics_user ON behavioral_biometrics(user_id, created_at DESC);
CREATE INDEX idx_biometrics_anomaly ON behavioral_biometrics(anomaly_detected) WHERE anomaly_detected = true;
CREATE INDEX idx_audit_tenant ON immutable_audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_hash ON immutable_audit_log(record_hash);
CREATE INDEX idx_anomaly_tenant ON security_anomalies(tenant_id, created_at DESC);
CREATE INDEX idx_anomaly_severity ON security_anomalies(severity, created_at DESC);
CREATE INDEX idx_zt_access_user ON zero_trust_access_log(user_id, created_at DESC);
CREATE INDEX idx_threat_indicator ON threat_intelligence(indicator_type, indicator_value);
CREATE INDEX idx_threat_active ON threat_intelligence(is_active, indicator_type);
```

### 3.3 JWT Upgrade: HS256 → RS256

```python
# backend/security/jwt_service.py

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
import jwt
from datetime import datetime, timedelta
from azure.keyvault.keys import KeyClient
from azure.identity import DefaultAzureCredential

class EnterpriseJWTService:
    """
    RS256 JWT implementation with Azure HSM key management.
    """
    
    def __init__(self, hsm_key_vault_uri: str):
        self.credential = DefaultAzureCredential()
        self.key_client = KeyClient(vault_url=hsm_key_vault_uri, credential=self.credential)
        self._load_signing_key()
    
    def _load_signing_key(self):
        """Load RSA signing key from Azure HSM."""
        self.signing_key = self.key_client.get_key("cyloid-jwt-signing")
        # For local verification, we use the public key
        self.public_key = self.signing_key.key.n  # Public component
    
    def create_token(
        self,
        user_id: str,
        tenant_id: str,
        roles: list,
        permissions: list,
        expires_in: timedelta = timedelta(hours=1)
    ) -> str:
        """Create RS256 signed JWT token."""
        payload = {
            "sub": user_id,
            "tenant_id": tenant_id,
            "roles": roles,
            "permissions": permissions,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + expires_in,
            "iss": "cyloid.finaceverse.com",
            "aud": "cyloid-api"
        }
        
        # Sign with Azure HSM (key never leaves HSM)
        return jwt.encode(
            payload,
            self.signing_key,
            algorithm="RS256",
            headers={"kid": self.signing_key.id}
        )
    
    def verify_token(self, token: str) -> dict:
        """Verify RS256 signed JWT token."""
        return jwt.decode(
            token,
            self.public_key,
            algorithms=["RS256"],
            audience="cyloid-api",
            issuer="cyloid.finaceverse.com"
        )
```

---

## 4. Multi-Tenant Architecture

### 4.1 Tenant Isolation Strategy

```sql
-- =====================================================
-- TENANT ISOLATION TABLES
-- =====================================================

-- Enhanced tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    domain VARCHAR(200),
    
    -- Isolation configuration
    isolation_level VARCHAR(50) NOT NULL DEFAULT 'row' CHECK (
        isolation_level IN ('row', 'schema', 'database')
    ),
    schema_name VARCHAR(100), -- For schema-per-tenant
    
    -- Subscription & Billing
    subscription_tier VARCHAR(50) NOT NULL DEFAULT 'starter' CHECK (
        subscription_tier IN ('starter', 'professional', 'enterprise', 'unlimited')
    ),
    billing_model VARCHAR(50) NOT NULL DEFAULT 'pay_as_you_go',
    
    -- Security
    encryption_key_id UUID REFERENCES hsm_key_registry(id),
    data_residency VARCHAR(50) DEFAULT 'us-east',
    compliance_requirements JSONB DEFAULT '[]', -- ['SOC2', 'HIPAA', 'GDPR']
    
    -- Limits
    max_users INTEGER DEFAULT 10,
    max_documents INTEGER DEFAULT 10000,
    max_storage_gb INTEGER DEFAULT 50,
    max_api_calls_per_month INTEGER DEFAULT 100000,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row-level security policies
ALTER TABLE financial_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_documents ON financial_documents
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_invoices ON financial_invoices
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_lines ON financial_lines
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

### 4.2 Tenant Context Middleware

```python
# backend/middleware/tenant_context.py

from fastapi import Request, HTTPException
from functools import wraps

class TenantContextMiddleware:
    """
    Sets PostgreSQL session variable for row-level security.
    """
    
    async def __call__(self, request: Request, call_next):
        tenant_id = self._extract_tenant_id(request)
        
        if not tenant_id:
            raise HTTPException(status_code=401, detail="Tenant context required")
        
        # Set PostgreSQL session variable for RLS
        async with request.state.db.acquire() as conn:
            await conn.execute(f"SET app.current_tenant = '{tenant_id}'")
        
        request.state.tenant_id = tenant_id
        response = await call_next(request)
        return response
    
    def _extract_tenant_id(self, request: Request) -> str:
        # From JWT token
        if hasattr(request.state, 'user'):
            return request.state.user.get('tenant_id')
        
        # From subdomain
        host = request.headers.get('host', '')
        if '.cyloid.finaceverse.com' in host:
            return host.split('.')[0]
        
        # From header
        return request.headers.get('X-Tenant-ID')
```

---

## 5. Fin(Ai)d Hub Integration

### 5.1 Event Bus Connection

```python
# backend/integrations/finaid_hub.py

from dataclasses import dataclass
from enum import Enum
import asyncio
from typing import Optional

class FinAIdEventType(Enum):
    DOCUMENT_PROCESSED = "cyloid.document.processed"
    INVOICE_EXTRACTED = "cyloid.invoice.extracted"
    SEARCH_COMPLETED = "cyloid.search.completed"
    VERIFICATION_DONE = "cyloid.verification.done"
    ANOMALY_DETECTED = "cyloid.anomaly.detected"

@dataclass
class FinAIdEvent:
    event_type: FinAIdEventType
    tenant_id: str
    payload: dict
    correlation_id: str
    timestamp: str

class FinAIdHubClient:
    """
    Client for connecting Cyloid to Fin(Ai)d Hub orchestration.
    """
    
    def __init__(self, hub_url: str, cyloid_service_token: str):
        self.hub_url = hub_url
        self.service_token = cyloid_service_token
        self.event_queue = asyncio.Queue()
    
    async def publish_event(self, event: FinAIdEvent):
        """Publish event to Fin(Ai)d Hub event bus."""
        async with aiohttp.ClientSession() as session:
            await session.post(
                f"{self.hub_url}/events",
                json={
                    "source": "cyloid",
                    "event_type": event.event_type.value,
                    "tenant_id": event.tenant_id,
                    "payload": event.payload,
                    "correlation_id": event.correlation_id,
                    "timestamp": event.timestamp
                },
                headers={"Authorization": f"Bearer {self.service_token}"}
            )
    
    async def subscribe_to_events(self, event_types: list):
        """Subscribe to events from other FinACEverse products."""
        # Connect to event bus WebSocket
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(
                f"{self.hub_url}/events/subscribe",
                headers={"Authorization": f"Bearer {self.service_token}"}
            ) as ws:
                await ws.send_json({"subscribe": event_types})
                async for msg in ws:
                    event = FinAIdEvent(**msg.json())
                    await self.event_queue.put(event)
    
    async def trigger_workflow(
        self,
        workflow_id: str,
        tenant_id: str,
        input_data: dict
    ) -> str:
        """Trigger a cross-product workflow in Fin(Ai)d Hub."""
        async with aiohttp.ClientSession() as session:
            response = await session.post(
                f"{self.hub_url}/workflows/{workflow_id}/trigger",
                json={
                    "source": "cyloid",
                    "tenant_id": tenant_id,
                    "input": input_data
                },
                headers={"Authorization": f"Bearer {self.service_token}"}
            )
            result = await response.json()
            return result["execution_id"]
```

### 5.2 Cross-Product Workflow Examples

```yaml
# Cyloid → Accute Integration
workflow:
  name: "invoice_to_journal_entry"
  trigger: "cyloid.invoice.extracted"
  steps:
    - cyloid.extract_invoice
    - cyloid.verify_amounts
    - accute.create_journal_entry
    - accute.post_to_ledger

# Cyloid → Luca Integration  
workflow:
  name: "document_compliance_check"
  trigger: "cyloid.document.processed"
  steps:
    - cyloid.extract_document
    - luca.analyze_compliance
    - luca.generate_report
    - cyloid.store_compliance_result
```

---

## 6. Consent Framework (GDPR/CCPA)

### 6.1 Required Tables

```sql
-- =====================================================
-- CONSENT MANAGEMENT TABLES
-- =====================================================

CREATE TABLE user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    consent_type VARCHAR(100) NOT NULL CHECK (consent_type IN (
        'data_processing', 'ai_training', 'federated_learning',
        'analytics', 'marketing', 'third_party_sharing',
        'cross_product_data_flow', 'vamn_contribution'
    )),
    consent_given BOOLEAN NOT NULL,
    consent_version VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    given_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id, consent_type)
);

CREATE TABLE data_subject_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
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

CREATE INDEX idx_consents_user ON user_consents(tenant_id, user_id);
CREATE INDEX idx_consents_type ON user_consents(consent_type, consent_given);
CREATE INDEX idx_dsr_status ON data_subject_requests(status, deadline);
```

---

## 7. Updated Module Architecture

### 7.1 Intellexion (Document Intelligence) Updates

```python
# backend/modules/intellexion/service.py

class IntellexionService:
    """
    Document Intelligence Engine - Updated for FinACEverse compliance.
    """
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.ai_orchestrator = CyloidAIOrchestrator(tenant_id)
        self.layout_adapter = LayoutLMv3Adapter()  # Specialized for OCR
    
    async def process_document(self, document: bytes, doc_type: str) -> dict:
        """
        Process document using VAMN-integrated pipeline.
        """
        # Step 1: OCR with LayoutLMv3 adapter
        ocr_result = await self.layout_adapter.extract_text(document)
        
        # Step 2: Semantic understanding via AI Orchestrator (VAMN priority)
        understanding = await self.ai_orchestrator.process_request(
            prompt=self._build_understanding_prompt(ocr_result, doc_type),
            module='intellexion',
            request_type='document_understanding'
        )
        
        # Step 3: Structured extraction
        extracted_data = await self._extract_structured_data(
            ocr_result, understanding.content, doc_type
        )
        
        # Step 4: Publish to Fin(Ai)d Hub
        await self.finaid_hub.publish_event(FinAIdEvent(
            event_type=FinAIdEventType.DOCUMENT_PROCESSED,
            tenant_id=self.tenant_id,
            payload=extracted_data,
            correlation_id=str(uuid.uuid4()),
            timestamp=datetime.utcnow().isoformat()
        ))
        
        return extracted_data
```

### 7.2 Synapse (Search & RAG) Updates

```python
# backend/modules/synapse/service.py

class SynapseService:
    """
    Search & RAG Engine - Updated for FinACEverse compliance.
    """
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.ai_orchestrator = CyloidAIOrchestrator(tenant_id)
        self.vector_store = ChromaDBClient(tenant_id)
    
    async def search(self, query: str, filters: dict = None) -> list:
        """
        Semantic search using VAMN-integrated embeddings.
        """
        # Get embeddings from VAMN semantic head
        embedding = await self.ai_orchestrator.get_embedding(
            text=query,
            head='semantic'
        )
        
        # Search vector store with tenant isolation
        results = await self.vector_store.search(
            embedding=embedding,
            filters={**filters, 'tenant_id': self.tenant_id},
            top_k=10
        )
        
        return results
    
    async def rag_query(self, query: str, context_docs: list) -> str:
        """
        RAG query using AI Orchestrator with priority cascade.
        """
        context = "\n\n".join([doc.content for doc in context_docs])
        
        response = await self.ai_orchestrator.process_request(
            prompt=f"""Based on the following context, answer the question.

Context:
{context}

Question: {query}

Answer:""",
            module='synapse',
            request_type='rag_query'
        )
        
        return response.content
```

### 7.3 Veritas (Evaluation) Updates

```python
# backend/modules/veritas/service.py

class VeritasService:
    """
    Evaluation & Verification Engine - Updated for FinACEverse compliance.
    """
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.ai_orchestrator = CyloidAIOrchestrator(tenant_id)
    
    async def verify_extraction(
        self, 
        extracted_data: dict, 
        source_document: bytes
    ) -> dict:
        """
        Verify extracted data using VAMN citation head.
        """
        response = await self.ai_orchestrator.process_request(
            prompt=self._build_verification_prompt(extracted_data, source_document),
            module='veritas',
            request_type='verification'
        )
        
        verification_result = {
            'is_valid': self._parse_validity(response.content),
            'confidence': self._parse_confidence(response.content),
            'citations': self._extract_citations(response.content),
            'discrepancies': self._find_discrepancies(response.content)
        }
        
        # Publish verification event
        await self.finaid_hub.publish_event(FinAIdEvent(
            event_type=FinAIdEventType.VERIFICATION_DONE,
            tenant_id=self.tenant_id,
            payload=verification_result,
            correlation_id=str(uuid.uuid4()),
            timestamp=datetime.utcnow().isoformat()
        ))
        
        return verification_result
```

---

## 8. Implementation Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Create all new database tables (17 tables)
- [ ] Implement Azure HSM integration
- [ ] Upgrade JWT from HS256 to RS256
- [ ] Add tenant isolation with RLS

### Phase 2: AI Integration (Week 3-4)
- [ ] Implement CyloidAIOrchestrator
- [ ] Add multi-LLM support (13 providers)
- [ ] Integrate VAMN triple-stream model
- [ ] Implement fallback billing system

### Phase 3: Security Enhancement (Week 5-6)
- [ ] Add behavioral biometrics
- [ ] Implement immutable audit logs
- [ ] Add anomaly detection
- [ ] Integrate threat intelligence feeds
- [ ] Implement zero trust access

### Phase 4: Integration (Week 7-8)
- [ ] Connect to Fin(Ai)d Hub event bus
- [ ] Implement cross-product workflows
- [ ] Add federated learning contribution
- [ ] Implement consent framework

### Phase 5: Testing & Validation (Week 9-10)
- [ ] Security penetration testing
- [ ] Performance benchmarking
- [ ] Compliance validation (SOC2, GDPR)
- [ ] Integration testing with other products

---

## 9. Index Summary

| Category | Tables | Indexes |
|----------|--------|---------|
| VAMN Integration | 3 | 5 |
| Multi-LLM | 4 | 6 |
| Security | 6 | 10 |
| Tenant Isolation | 1 + RLS policies | 2 |
| Consent | 2 | 3 |
| **Total** | **17** | **26** |

---

## 10. Post-Implementation Alignment

| Component | Before | After |
|-----------|--------|-------|
| VAMN Integration | ❌ 0% | ✅ 100% |
| Multi-LLM Support | ❌ 0% | ✅ 100% |
| Security Layers | 5/21 (24%) | ✅ 21/21 (100%) |
| HSM Integration | ❌ Missing | ✅ Azure HSM |
| JWT Algorithm | HS256 | ✅ RS256 |
| Tenant Isolation | Partial | ✅ Full RLS |
| Fin(Ai)d Hub | Basic | ✅ Full Events |
| Consent Framework | ❌ Missing | ✅ GDPR/CCPA |
| **Overall Alignment** | **70%** | **100%** |

---

*Document maintained by FinACEverse Architecture Team*
*Last Updated: January 14, 2026*
