# Finory - AI-Powered ERP Platform

**Complete Overview of Capabilities, Architecture & Data Schema**

---

## 🎯 What is Finory?

**Finory** is an **AI-powered Enterprise Resource Planning (ERP) platform** with a unique **multi-agent collaboration architecture**. It enables organizations to both **build custom ERP modules** using AI and **operate those modules** in production.

---

## 🏗️ Core Capabilities

### Two Operating Modes

| Mode | Purpose | Users |
|------|---------|-------|
| **Build Mode** | Create/configure ERP modules using AI | System Admins, Developers |
| **ERP Mode** | Day-to-day business operations | Business Users |

---

### Key Subsystems

#### 🔧 Module Forge (AI-Powered Module Builder)
- Describe business requirements in natural language
- AI agents collaborate to design and build complete ERP modules
- Generates: data structures, workflows, approval chains, UI components
- **6-phase roundtable orchestration**: Coordinator → Builder → Analyst → SME → Reviewer → Strategy

#### 🧠 Intelligence Forge (AI Agent Management)
- Create and manage AI agents for different purposes
- **Builder Agents**: Build the ERP system itself
- **Assistant Agents**: Help users with day-to-day tasks
- Configurable personalities, prompts, and capabilities

#### ⚙️ LLM Configuration
- **Providers**: OpenAI, Anthropic, Google, Azure, Custom
- **Models**: GPT-4o, GPT-5, Claude, etc.
- **Agent Configurations**: Temperature, tokens, prompts per role

#### 📦 Dynamic Modules
- Purchase Orders, Invoices, Expense Management, etc.
- Custom fields, workflows, and business rules
- Multi-tenant isolation

---

### Patent-Protected Features

| Feature | Description |
|---------|-------------|
| **Zero-Fallback Protocol** | Never creates silent fallbacks—always prompts users for decisions |
| **Information Firewall** | Filters proprietary data (schemas, API keys, algorithms) from LLM outputs |
| **Multi-Agent Roundtable** | Specialized agents collaborate with role-based expertise |

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (React + Vite)                    │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────────┐  │
│  │ Dashboard │  │ Module Forge │  │ Intelligence Forge        │  │
│  │ (ERP)     │  │ (Build)      │  │ (Agent Config)            │  │
│  └──────────┘  └──────────────┘  └───────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │ REST API + SSE
┌─────────────────────────────▼───────────────────────────────────┐
│                      Backend (Express + TypeScript)             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Multi-Agent Orchestrator                   │ │
│  │  ┌───────────┐ ┌─────────┐ ┌───────────┐ ┌───────────────┐ │ │
│  │  │Coordinator│→│ Builder │→│ Analyst   │→│ SME/Reviewer  │ │ │
│  │  └───────────┘ └─────────┘ └───────────┘ └───────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────────┐   │
│  │ Zero-Fallback  │ │ Information    │ │ Checkpoint Manager │   │
│  │ Enforcer       │ │ Firewall       │ │ (File Changes)     │   │
│  └────────────────┘ └────────────────┘ └────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ Drizzle ORM
┌─────────────────────────────▼───────────────────────────────────┐
│                      PostgreSQL Database                        │
└─────────────────────────────────────────────────────────────────┘
```

---

### Component Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      LLM Configuration                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Providers   │→ │   Models     │→ │  Agent Configs       │   │
│  │  (OpenAI)    │  │  (GPT-5)     │  │  (Builder, Analyst)  │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└────────────────┬────────────────────────────┬───────────────────┘
                 │                            │
                 ↓                            ↓
      ┌──────────────────────┐    ┌────────────────────────┐
      │  Intelligence Forge  │    │     Module Forge       │
      │                      │    │                        │
      │  Create AI Agents    │    │  Build ERP Modules     │
      │  ├─ Builder agents   │←───│  Uses builder agents   │
      │  └─ Assistant agents │    │  to generate modules   │
      └──────────┬───────────┘    └───────────┬────────────┘
                 │                            │
                 │                            ↓
                 │                ┌────────────────────────┐
                 │                │       Modules          │
                 │                │                        │
                 │                │  Finished ERP modules  │
                 │                │  ├─ Purchase Orders    │
                 │                │  └─ Invoices           │
                 │                └───────────┬────────────┘
                 │                            │
                 └────────────────────────────┘
                                  ↓
                      ┌────────────────────────┐
                      │      ERP Mode          │
                      │                        │
                      │  Business users work   │
                      │  with:                 │
                      │  ├─ Modules            │
                      │  └─ Assistant Agents   │
                      └────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite 5, Tailwind CSS, shadcn/ui, TanStack Query |
| **Backend** | Express.js (TypeScript), Node.js 20+ |
| **Database** | PostgreSQL 15+ with Drizzle ORM |
| **AI** | OpenAI GPT-4/GPT-5, Anthropic Claude |
| **Real-time** | Server-Sent Events (SSE) |
| **Routing** | Wouter |

---

## 📊 Database Schema

### Core Multi-Tenant System

| Table | Purpose |
|-------|---------|
| `tenants` | Organizations using the platform |
| `users` | User accounts with system roles (superadmin, tenant_user) |
| `memberships` | User-tenant relationships with roles (admin, user, viewer) |
| `orgs` | Sub-organizations within tenants |

### Module System

| Table | Purpose |
|-------|---------|
| `modules` | Dynamic ERP module definitions (key, name, status, config) |
| `module_fields` | Custom fields per module (type, label, required, formula) |
| `field_types` | Universal field type inventory (text, number, money, date, etc.) |
| `documents` | Generic document storage (invoices, POs, etc.) |
| `document_lines` | Line items within documents |
| `workflows` | State machine definitions (states, transitions, conditions) |
| `tax_rules` | Jurisdiction-aware tax rates (GST, VAT, Sales Tax, etc.) |

### AI/LLM Configuration

| Table | Purpose |
|-------|---------|
| `llm_providers` | AI provider configs (OpenAI, Anthropic, Google, Azure, Custom) |
| `llm_models` | Specific AI models with capabilities (vision, function calling) |
| `agent_configurations` | Temperature, prompts, max tokens per agent role |
| `agent_profiles` | AI agent personalities (builder, automation, sme) |
| `agent_assignments` | Links profiles to configurations per tenant |
| `agent_model_recommendations` | Superadmin recommended models per role |

### Module Forge / Code Generation

| Table | Purpose |
|-------|---------|
| `requirement_documents` | Iterative requirements (personas, processes, documents, business rules, security rules) |
| `approval_checkpoints` | Process/document/security approval gates |
| `process_flows` | ReactFlow-compatible workflow diagrams (nodes, edges, state machines) |
| `generated_modules` | AI-generated backend/frontend/test code |
| `pipeline_builder_sessions` | 8-step pipeline building workflow state |

### Multi-Agent Collaboration

| Table | Purpose |
|-------|---------|
| `copilot_sessions` | Conversation sessions with AI |
| `copilot_messages` | Chat message history with tool calls |
| `collaboration_threads` | Agent-to-agent discussion threads |
| `agent_messages` | Messages between agents with intent and visibility |
| `agent_actions` | Track all agent actions with performance metrics |
| `file_change_batches` | Undo/redo file modifications |
| `file_changes` | Individual file changes within batches |
| `checkpoints` | Session state snapshots |
| `checkpoint_artifacts` | Files/data associated with checkpoints |

### Living Documentation System

| Table | Purpose |
|-------|---------|
| `sop_templates` | Standard operating procedures with validation rules |
| `code_annotations` | Line-by-line code documentation in plain English |
| `library_registry` | External library documentation with methods |
| `endpoint_specs` | API endpoint specifications (method, path, schemas) |
| `method_registry` | Method/function documentation with call hierarchy |
| `field_registry` | Field naming conventions and validation rules |
| `naming_audit` | Naming convention conformance tracking |
| `quality_scores` | Real-time SOP conformance scoring per file |

### Component Library (Drag & Drop)

| Table | Purpose |
|-------|---------|
| `workflow_components` | Reusable workflow building blocks |
| `document_blueprints` | Document structure templates |
| `approval_checkpoint_blueprints` | Approval step templates |
| `business_rules` | Formulas, conditions, routing rules |
| `integration_adapters` | Third-party system integrations |
| `requirement_templates` | Pre-built module templates (P2P, O2C, etc.) |
| `document_templates` | Pre-built document schemas |

### Pipeline Builder (ReactFlow)

| Table | Purpose |
|-------|---------|
| `workflow_pipelines` | Composed pipelines with viewport state |
| `pipeline_nodes` | Nodes in pipelines (start, workflow_step, document, approval, decision, end) |
| `pipeline_edges` | Connections between nodes with conditions |
| `template_component_links` | Links templates to components |
| `pipeline_relationships` | Inter-pipeline relationships |

### Enterprise Security

| Table | Purpose |
|-------|---------|
| `sso_providers` | SAML/OAuth/OIDC configurations |
| `mfa_configurations` | TOTP, SMS, Email, WebAuthn settings |
| `webauthn_credentials` | FIDO2/Passkey credentials |
| `user_sessions` | Enhanced session management with risk scoring |
| `security_audit_logs` | Tamper-proof action logs with hash chains |
| `password_history` | Prevent password reuse |
| `password_policies` | Per-tenant password requirements |
| `ip_access_rules` | IP whitelist/blacklist |
| `api_keys` | Rate-limited API access with rotation |
| `secrets` | Encrypted third-party API keys |

### Compliance (GDPR)

| Table | Purpose |
|-------|---------|
| `user_consents` | Consent tracking (terms, privacy, marketing) |
| `data_access_requests` | Export/deletion/rectification requests |

### Multi-Agent Security

| Table | Purpose |
|-------|---------|
| `security_incidents` | Anti-jailbreak detections |
| `checkpoint_validations` | Validation framework results |
| `error_decisions` | Zero-Fallback user decisions |
| `session_archives` | Historical sessions for AI learning |

---

## 📋 Enums

### System Enums

| Enum | Values |
|------|--------|
| `system_role` | superadmin, tenant_user |
| `user_role` | admin, user, viewer |
| `module_status` | draft, active, archived |
| `agent_scope` | global, tenant |
| `document_status` | draft, submitted, approved, rejected, posted |

### Field & Data Types

| Enum | Values |
|------|--------|
| `field_type` | text, textarea, number, integer, boolean, date, datetime, money, select, multiselect, reference, formula, tax_code, country, state, email, phone, url, uuid |
| `tax_type` | GST, VAT, SALES_TAX, EXCISE, TDS, WITHHOLDING |
| `jurisdiction` | IN, US, EU, UK, CA, AU |

### AI Configuration

| Enum | Values |
|------|--------|
| `llm_provider_type` | openai, anthropic, google, azure, perpetuity, mistral, custom |
| `agent_type` | builder, automation, sme |
| `multi_agent_role` | coordinator, documentation, architecture_compliance, state_sync, builder, analyst, reviewer, security, schema_guardian, registry, qa, information_filter, anti_jailbreak, file_lock_manager, performance_monitor, impact_analysis, deployment_pipeline, requirements_coordinator, living_documentation, code_reviewer, quality_assurance_advanced |

### Module Forge

| Enum | Values |
|------|--------|
| `requirement_status` | gathering, review, approved, generating, generated |
| `checkpoint_status` | pending, approved, rejected |
| `checkpoint_type` | process_design, documents, security, final |
| `generated_module_status` | draft, testing, published, archived |

### Pipeline Builder

| Enum | Values |
|------|--------|
| `component_type` | workflow_step, document, approval, business_rule, integration, conditional_branch |
| `node_type` | start, workflow_step, document, approval, decision, integration, end |
| `pipeline_status` | draft, active, testing, archived |

### Security

| Enum | Values |
|------|--------|
| `sso_provider_type` | saml, oauth2, oidc |
| `mfa_type` | totp, sms, email, webauthn |
| `audit_action` | login, logout, login_failed, mfa_enabled, mfa_disabled, password_changed, user_created, data_modified, etc. |
| `audit_severity` | info, warning, error, critical |
| `session_status` | active, expired, terminated, suspicious |
| `security_incident_type` | prompt_extraction, role_manipulation, authority_spoofing, destructive_commands, sql_injection, ip_leakage, jailbreak_attempt, other |
| `security_incident_severity` | low, medium, high, critical |

### Documentation

| Enum | Values |
|------|--------|
| `sop_category` | endpoint, naming, method, field, best_practice, architecture, security, testing |
| `naming_convention` | camelCase, PascalCase, snake_case, SCREAMING_SNAKE_CASE, kebab-case |
| `entity_type` | variable, function, method, class, interface, type, endpoint, field, parameter, file, module |
| `http_method` | GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD |

---

## 🔄 Key Workflows

### Module Building Flow

```
User Request 
    ↓
AI Requirements Engine (asks questions, builds req doc)
    ↓
Process Design (visual workflow)
    ↓
Document Blueprint (fields, validations)
    ↓
Security Design (permissions, roles)
    ↓
Code Generation (backend, frontend, tests)
    ↓
Security Validation (scan for vulnerabilities)
    ↓
Publishing (module available in ERP Mode)
```

### Multi-Agent Collaboration Flow

```
User Message
    ↓
Coordinator (understands request, delegates)
    ↓
Specialized Agents (Builder, Analyst, SME, Reviewer)
    ↓
Zero-Fallback Checks (prompt user if ambiguous)
    ↓
Information Firewall (redact proprietary data)
    ↓
Response to User
```

### Pipeline Builder 8-Step Process

1. **Pipeline Visualization** - Design workflow with nodes/edges
2. **Branches & Permissions** - Define approval checkpoints and roles
3. **Document Chain** - Sequence documents in the workflow
4. **Document Design** - Configure fields and validations
5. **Data Integration** - Map to database tables
6. **Live Preview** - Test documents and notifications
7. **Test Results** - Run quality and security tests
8. **Deployment** - Publish to production

---

## 🛡️ Security Features

### Authentication & Authorization
- **Multi-Factor Authentication** (TOTP, SMS, WebAuthn/Passkeys)
- **SSO/SAML** for enterprise identity management
- **Role-Based Access Control** (RBAC)
- **Tenant Isolation** - All queries filtered by `tenantId`

### Data Protection
- **Tamper-Proof Audit Logs** with hash chains
- **Password Policies** per tenant (complexity, history, expiry)
- **Encrypted Secrets Storage** (AES-256)
- **GDPR Compliance** (consent tracking, data access requests)

### AI Security
- **Anti-Jailbreak Guard** for AI prompts
- **Information Firewall** - Prevents IP leakage
- **Zero-Fallback Protocol** - No silent failures

### Network Security
- **IP Whitelisting/Blacklisting**
- **API Rate Limiting** with automatic rotation
- **Session Risk Scoring** with anomaly detection

---

## 🎯 Key Differentiators

### vs Traditional ERP (SAP, Oracle, NetSuite)
- **AI-First**: Build modules with natural language, not code
- **Multi-Agent**: 20+ specialized agents collaborate
- **Rapid Deployment**: Days not months
- **Modern Stack**: React, TypeScript, PostgreSQL

### vs Low-Code Platforms (Salesforce, Zoho)
- **True AI Generation**: Not just drag-and-drop
- **Patent-Protected**: Zero-Fallback, Information Firewall
- **Financial Focus**: Tax rules, compliance built-in
- **Self-Documenting**: Living documentation system

---

## 📈 Target Markets

| Segment | Use Case |
|---------|----------|
| **SMB** | Custom ERP without enterprise pricing |
| **Mid-Market** | Replace legacy systems with AI-powered modules |
| **Enterprise** | Build department-specific modules rapidly |
| **System Integrators** | White-label ERP building platform |

---

## 🔗 Integration with FinACEverse

Finory serves as the **ERP backbone** for the FinACEverse ecosystem:

| Integration | Purpose |
|-------------|---------|
| **VAMN** | Provides verified calculations for ERP modules |
| **Cyloid** | Document intelligence feeds into ERP workflows |
| **Luca AI** | Tax intelligence for ERP tax modules |
| **Accute** | Practice management integrates with ERP client data |
| **Fin(Ai)d Hub** | Agents from Hub can operate on Finory data |
| **EPI-Q** | Process mining analyzes Finory workflows |
| **SumBuddy** | Marketplace for Finory module templates |
