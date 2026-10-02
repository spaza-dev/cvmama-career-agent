# Revised Implementation Plan: Strict Workers AI & AI Gateway via Binding

## Objectives
1. **Strictly Cloudflare Workers AI via Binding**: Connect Workers AI and AI Gateway solely through the native `AI` binding (`env.AI`). No external HTTP calls, no third-party SDKs (`@ai-sdk/google`, `@ai-sdk/openai`), and no external API keys required.
2. **Remove All Failovers**: Completely strip out secondary models, retry failover loops, and provider-switching logic. Keep the pipeline simple, clean, and direct.
3. **Explicit User-Facing Error Reporting**: When a model, stream, or parsing operation fails or is unavailable, immediately inform the user with a clear, descriptive in-UI error message instead of silently hanging or failing without explanation.

## Architecture

### 1. Configuration Cleanup (`wrangler.jsonc` & `.env.example`)
- Remove obsolete external gateway vars:
  - Remove `DEFAULT_AI_PROVIDER`
  - Remove `AI_FAILOVER_ENABLED`
  - Remove `GATEWAY_PROVIDER`
  - Remove `GATEWAY_MODEL`
  - Remove `CF_AIG_ACCOUNT_ID`
  - Remove `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
- Retain only the essentials for the `AI` binding:
  ```jsonc
  "ai": {
    "binding": "AI"
  },
  "vars": {
    "WORKERS_AI_CHAT_MODEL": "@cf/openai/gpt-oss-20b",
    "WORKERS_AI_PARSER_MODEL": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    "CF_AIG_GATEWAY_NAME": "default"
  }
  ```

### 2. Streamlined AI Client (`src/ai/dispatcher.ts`)
- Replace the complex failover dispatcher with a straightforward, unified client:
  - **`getChatModel(env)`**:
    ```ts
    const gatewayId = env.CF_AIG_GATEWAY_NAME?.trim() || "default";
    const workersai = createWorkersAI({
      binding: env.AI,
      gateway: { id: gatewayId }
    });
    return workersai(env.WORKERS_AI_CHAT_MODEL || "@cf/openai/gpt-oss-20b");
    ```
  - **`parseResume(env, rawText)`**:
    Calls `env.AI.run(parserModel, { prompt, max_tokens: 3500 }, { gateway: { id: gatewayId } })`.
    Extracts the JSON structure. If Workers AI fails or returns invalid output, throws a descriptive error detailing the exact issue.
  - **`runWorkflowInference(env, prompt)`**:
    Directly runs `env.AI.run(parserModel, { prompt }, { gateway: { id: gatewayId } })`.

### 3. Transparent Error Handling in Chat Agent (`src/server.ts`)
- In `ChatAgent.onChatMessage`:
  - Run `streamText` directly with the configured Workers AI model.
  - Configure `toUIMessageStreamResponse`:
    - Catch initialization errors and stream-abort errors.
    - Transform errors into structured UI error responses or fallback messages explaining:
      `⚠️ Cloudflare Workers AI Error: [Error Details]. Please try again in a moment.`
- In `ChatAgent.parseResume`:
  - Return `{ success: false, error: err.message }` with specific details on failure.

### 4. User-Facing Error Presentation in Frontend (`src/app.tsx`)
- In `useAgentChat`:
  - Add `onError` listener to trigger toast notifications with exact error text.
- In chat message render pipeline:
  - Add explicit visual handling for message parts of type `error` with a styled warning card, detailing the model error and showing an action button to retry.
- In resume onboarding & drawer parsing:
  - Surface detailed error banners if Workers AI parsing fails so the user knows whether the document had unreadable text, or if the model hit a capacity limit.

## Verification
1. Run `oxlint src/` to verify zero errors or warnings.
2. Verify `npm run check` and TypeScript types.
3. Test that normal prompts stream smoothly through `env.AI` with AI Gateway logging.
4. Test that any model outage or syntax issue outputs an immediate, informative error message to the user rather than failing silently.
