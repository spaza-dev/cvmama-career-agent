# Bidirectional Multi-Model Architecture via Cloudflare AI Gateway (Backend Only)

A flexible, environment-configurable backend AI architecture for CVMama that supports either **Cloudflare Workers AI** or **Cloudflare AI Gateway** as the default provider, with seamless automatic fallback in both directions (Workers AI ➔ Gateway AI or Gateway AI ➔ Workers AI), zero UI changes, and model-agnostic versatility.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The plan incorporates your exact fallback and configuration requirements:

- **Configurable Default via Env**: The default provider is set via `DEFAULT_AI_PROVIDER` (either `workers-ai` or `gateway`).
- **Bidirectional Automatic Fallback**:
  - **Scenario A (Workers AI is Default)**: If Workers AI is default and encounters an error, rate-limit, or quota threshold, it automatically falls back to the configured AI Gateway provider (e.g., Google Gemini `gemini-3.8-flash` or another configured model).
  - **Scenario B (Gateway AI is Default)**: If Gateway AI is default and encounters an error or rate-limit, it automatically falls back to Cloudflare Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast` or `@cf/openai/gpt-oss-20b`).
- **Strictly Route Through Cloudflare AI Gateway**: All external model inference flows exclusively through your Cloudflare AI Gateway endpoint (`gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/{provider}`). No direct connections to external provider endpoints.
- **Provider & Model Agnostic**: Any Gateway-supported provider can be configured (starting with Google Gemini, with full compatibility for OpenAI, Anthropic, Mistral, Groq, etc.).
- **Zero UI Changes**: Purely backend architecture; no frontend or client code is touched.
- **Comprehensive Coverage**: Applied across the Agent Orchestrator (`onChatMessage`), Resume Parser (`parseResumeTextWithLLM`), and Background Workflows (`ResumeReviewWorkflow`).

---

## 1. Codebase Model Audit & Inventory

Every location in the codebase utilizing AI models or bindings, updated with the bidirectional fallback strategy:

| Location | Current Implementation & Model | Current Role & Function | Bidirectional Fallback Plan |
| :--- | :--- | :--- | :--- |
| **`src/server.ts` (Lines 49–57)** | `streamText({ model: workersai("@cf/openai/gpt-oss-20b"), ... })` | **Agent Orchestrator**: Powers the interactive chat, multi-step tool execution (`careerTools`, MCP tools), and WebSocket message streaming. | Uses the default provider (`workers-ai` or `gateway`). If default fails during stream initialization or execution, automatically switches to the alternative provider. |
| **`src/server.ts` (Lines 173–179)** | `this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", { prompt, max_tokens: 3500 })` | **Resume Parser**: Extracts unformatted resume text into a strict JSON Resume object conforming to schema. | Attempts extraction with the default provider. If parsing fails, invalid JSON is returned, or the model throws, it executes failover extraction via the secondary provider. |
| **`src/workflows/resumeReview.ts` (Lines 29–33)** | `this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", { prompt: ... })` | **Deep Resume Review Workflow**: Step-based background analysis evaluating resume sections against target job roles. | Workflow step executes via the bidirectional dispatcher, ensuring automated retries and provider failover before step exhaustion. |
| **`src/workflows/jobSearch.ts` (Lines 23–33)** | Mock placeholder array (`// Placeholder: swap in a real job-board API...`) | **Job Search Workflow**: Background workflow step for finding relevant positions. | Can optionally utilize the unified dispatcher for semantic job matching or remain a mock placeholder. |
| **`wrangler.jsonc` (Lines 13–15)** | `"ai": { "binding": "AI" }` | **Workers AI Binding**: Native Cloudflare edge GPU model binding (`env.AI`). | Used directly when `DEFAULT_AI_PROVIDER="workers-ai"` or as the failover engine when Gateway is primary. |

---

## 2. Technical Architecture: Bidirectional Dispatcher

### Fallback Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 Cloudflare Worker Backend (ChatAgent & Workflows)           │
│                                                                             │
│   - onChatMessage()           [Agent Orchestrator]                          │
│   - parseResumeTextWithLLM()  [Structured Resume Parser]                    │
│   - ResumeReviewWorkflow      [Background Career Audit]                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                    Unified Bidirectional Dispatcher
                   Checks env.DEFAULT_AI_PROVIDER
                                       │
         ┌─────────────────────────────┴─────────────────────────────┐
         ▼                                                           ▼
┌───────────────────────────────┐           ┌──────────────────────────────────────────────┐
│     DEFAULT: workers-ai       │           │              DEFAULT: gateway                │
│                               │           │                                              │
│ 1. Attempt Cloudflare Edge    │           │ 1. Attempt Cloudflare AI Gateway             │
│    (env.AI / workers-ai)      │           │    (e.g., Google Gemini gemini-3.8-flash)    │
│                               │           │                                              │
│ 2. If Error / Rate-Limit      │           │ 2. If Error / Rate-Limit                     │
│    FAILOVER ──► Gateway AI    │           │    FAILOVER ──► Workers AI                   │
│    (via AI Gateway endpoint)  │           │    (env.AI / Llama 3.3 or GPT-OSS-20B)       │
└───────────────────────────────┘           └──────────────────────────────────────────────┘
```

### Provider Mechanics

1. **When `DEFAULT_AI_PROVIDER="workers-ai"`**:
   - Primary: Uses `env.AI` (e.g. `@cf/openai/gpt-oss-20b` for chat, `@cf/meta/llama-3.3-70b-instruct-fp8-fast` for parsing).
   - Failover: If `env.AI` throws an error or fails, the dispatcher invokes the Gateway client (`https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/{provider}`) with your configured model (e.g., Gemini `gemini-3.8-flash`).
2. **When `DEFAULT_AI_PROVIDER="gateway"`**:
   - Primary: Routes inference through Cloudflare AI Gateway to your configured external model (Gemini, OpenAI, Anthropic, etc.).
   - Failover: If the Gateway request times out, returns 429/5xx, or fails, the dispatcher seamlessly fails over to `env.AI`.

---

## 3. Environment Configuration Specification

We expose clean, explicit configuration variables in `wrangler.jsonc` (under `vars`) and `env.d.ts`:

```bash
# -------------------------------------------------------------
# AI Provider Orchestration
# -------------------------------------------------------------
# Options: "workers-ai" | "gateway" (determines which is tried first)
DEFAULT_AI_PROVIDER="workers-ai"

# Enable automatic failover to the alternative provider on error
AI_FAILOVER_ENABLED="true"

# -------------------------------------------------------------
# Workers AI Settings (Local Edge GPU)
# -------------------------------------------------------------
WORKERS_AI_CHAT_MODEL="@cf/openai/gpt-oss-20b"
WORKERS_AI_PARSER_MODEL="@cf/meta/llama-3.3-70b-instruct-fp8-fast"

# -------------------------------------------------------------
# Cloudflare AI Gateway Settings (External Models)
# -------------------------------------------------------------
CF_AIG_ACCOUNT_ID="your_cloudflare_account_id"
CF_AIG_GATEWAY_NAME="your_gateway_name"

# Gateway Provider Path (e.g. "google-ai-studio", "openai", "anthropic")
GATEWAY_PROVIDER="google-ai-studio"

# Gateway Model (e.g. "gemini-3.8-flash", "gpt-4o", "claude-3-7-sonnet")
GATEWAY_MODEL="gemini-3.8-flash"

# Provider API Keys (sent only to your Cloudflare AI Gateway)
GEMINI_API_KEY="your_gemini_api_key"
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
```

---

## 4. Implementation Steps

1. **AI Dispatcher & Gateway Module (`src/ai/dispatcher.ts`)**:
   - Helper to build Cloudflare AI Gateway endpoints: `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayName}/${provider}`.
   - `getOrchestratorModel(env)`: Creates primary and failover language models compatible with Vercel AI SDK's `streamText`.
   - `executeWithFailover(env, operation)`: Generic wrapper that tries the default provider first, logs any warning, and executes the fallback provider on failure.
   - `parseResumeStructured(env, text)`: Strict JSON resume parser with bidirectional fallback.
   - `runWorkflowInference(env, prompt)`: Step execution helper for `ResumeReviewWorkflow`.

2. **Update `src/server.ts`**:
   - Update `onChatMessage` to use `getOrchestratorModel(this.env)` with failover handling.
   - Update `parseResumeTextWithLLM` to call `parseResumeStructured(this.env, rawText)`.
   - Update `AppEnv` interface in `src/server.ts` and `env.d.ts` to include the configuration variables.

3. **Update Workflows (`src/workflows/resumeReview.ts`)**:
   - Update `ResumeReviewWorkflow.run` to call `runWorkflowInference(this.env, prompt)`.

4. **Update Configuration & Documentation**:
   - Update `wrangler.jsonc` with default `vars`.
   - Update `.env.example` with clear comments explaining the `DEFAULT_AI_PROVIDER` and fallback mechanics.
   - Document how to test both `workers-ai` and `gateway` modes in `README.md`.

5. **Strict Guardrail Confirmation**:
   - Zero modifications to frontend components or UI files.
   - Zero direct connections to Google AI Studio (strictly through Cloudflare AI Gateway).
