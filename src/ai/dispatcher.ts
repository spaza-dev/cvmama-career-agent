import { createWorkersAI } from "workers-ai-provider";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type LanguageModel } from "ai";
import type { AppEnv } from "../server";
import type { ResumeData } from "../types";

/**
 * Builds the Cloudflare AI Gateway base URL for a given provider.
 * Endpoint format: https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayName}/{provider}
 */
export function getGatewayBaseUrl(
  accountId?: string,
  gatewayName?: string,
  provider = "google-ai-studio"
): string | null {
  if (!accountId || !gatewayName) return null;
  return `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayName}/${provider}`;
}

/**
 * Resolves the configured external Gateway model using Vercel AI SDK.
 * Never connects directly to Google AI Studio or external APIs; all traffic
 * is routed through the user's Cloudflare AI Gateway endpoint.
 */
export function createGatewayModel(env: AppEnv): LanguageModel | null {
  const accountId = env.CF_AIG_ACCOUNT_ID;
  const gatewayName = env.CF_AIG_GATEWAY_NAME;
  const provider = env.GATEWAY_PROVIDER || "google-ai-studio";
  const modelName = env.GATEWAY_MODEL || "gemini-3.8-flash";

  const baseUrl = getGatewayBaseUrl(accountId, gatewayName, provider);
  if (!baseUrl) {
    console.warn(
      "[AI Dispatcher] Cloudflare AI Gateway account ID or gateway name is missing. Check CF_AIG_ACCOUNT_ID and CF_AIG_GATEWAY_NAME."
    );
    return null;
  }

  if (provider === "google-ai-studio" || provider === "gemini") {
    const apiKey =
      env.GEMINI_API_KEY ||
      (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : "") ||
      "";
    const google = createGoogleGenerativeAI({
      baseURL: `${baseUrl}/v1beta`,
      apiKey
    });
    return google(modelName);
  }

  if (provider === "openai") {
    const apiKey =
      env.OPENAI_API_KEY ||
      (typeof process !== "undefined" ? process.env?.OPENAI_API_KEY : "") ||
      "";
    const openai = createOpenAI({
      baseURL: `${baseUrl}/v1`,
      apiKey
    });
    return openai(modelName);
  }

  // Generic OpenAI-compatible Gateway fallback for other providers (Anthropic/Groq/Mistral via Gateway)
  const apiKey =
    env.OPENAI_API_KEY ||
    env.GEMINI_API_KEY ||
    (typeof process !== "undefined" ? process.env?.OPENAI_API_KEY : "") ||
    "";
  const custom = createOpenAI({
    baseURL: `${baseUrl}/v1`,
    apiKey
  });
  return custom(modelName);
}

/**
 * Creates the local Cloudflare Workers AI model via edge binding.
 */
export function createWorkersAiModel(
  env: AppEnv,
  overrideModel?: string
): LanguageModel {
  const workersai = createWorkersAI({ binding: env.AI });
  const modelName =
    overrideModel || env.WORKERS_AI_CHAT_MODEL || "@cf/openai/gpt-oss-20b";
  return workersai(modelName);
}

/**
 * Returns primary and fallback models based on `DEFAULT_AI_PROVIDER`.
 * Supports bidirectional failover:
 * - If DEFAULT_AI_PROVIDER === "workers-ai": Workers AI is primary, Gateway AI is fallback.
 * - If DEFAULT_AI_PROVIDER === "gateway": Gateway AI is primary, Workers AI is fallback.
 */
export function getChatModels(env: AppEnv): {
  primaryModel: LanguageModel;
  fallbackModel: LanguageModel | null;
  primaryProviderName: string;
  fallbackProviderName: string;
} {
  const defaultProvider = env.DEFAULT_AI_PROVIDER || "workers-ai";
  const failoverEnabled =
    env.AI_FAILOVER_ENABLED === undefined ||
    env.AI_FAILOVER_ENABLED === true ||
    env.AI_FAILOVER_ENABLED === "true";

  const workersAiChatModel = createWorkersAiModel(env);
  const gatewayModel = createGatewayModel(env);

  if (defaultProvider === "gateway") {
    if (gatewayModel) {
      return {
        primaryModel: gatewayModel,
        fallbackModel: failoverEnabled ? workersAiChatModel : null,
        primaryProviderName: `Cloudflare AI Gateway (${env.GATEWAY_PROVIDER || "google-ai-studio"}/${env.GATEWAY_MODEL || "gemini-3.8-flash"})`,
        fallbackProviderName: `Cloudflare Workers AI (${env.WORKERS_AI_CHAT_MODEL || "@cf/openai/gpt-oss-20b"})`
      };
    }
    // If gateway configuration is invalid, gracefully use Workers AI as primary
    console.warn(
      "[AI Dispatcher] Gateway AI requested as default, but credentials or gateway config not ready. Falling back to Workers AI."
    );
    return {
      primaryModel: workersAiChatModel,
      fallbackModel: null,
      primaryProviderName: `Cloudflare Workers AI (${env.WORKERS_AI_CHAT_MODEL || "@cf/openai/gpt-oss-20b"}) [Automatic Fallback]`,
      fallbackProviderName: "None"
    };
  }

  // Default: workers-ai
  return {
    primaryModel: workersAiChatModel,
    fallbackModel: failoverEnabled && gatewayModel ? gatewayModel : null,
    primaryProviderName: `Cloudflare Workers AI (${env.WORKERS_AI_CHAT_MODEL || "@cf/openai/gpt-oss-20b"})`,
    fallbackProviderName: gatewayModel
      ? `Cloudflare AI Gateway (${env.GATEWAY_PROVIDER || "google-ai-studio"}/${env.GATEWAY_MODEL || "gemini-3.8-flash"})`
      : "None"
  };
}

/**
 * Standard prompt for extracting unformatted resume text into strict JSON Resume.
 */
export const RESUME_PARSER_PROMPT = (rawText: string) => `
You are a professional resume parsing specialist. Parse the following resume text and format it STRICTLY into a valid JSON object conforming to this exact JSON Resume schema:
{
  "basics": {
    "name": "Full Name",
    "label": "Professional Title / Headline",
    "image": "",
    "email": "Email Address",
    "phone": "Phone Number",
    "url": "Website or Portfolio URL",
    "summary": "Professional Summary",
    "location": {
      "address": "Street address if available",
      "postalCode": "Postal code",
      "city": "City",
      "countryCode": "Country code or country",
      "region": "State / Region"
    },
    "profiles": [{
      "network": "e.g. LinkedIn, GitHub, Twitter",
      "username": "Username or handle",
      "url": "Full profile URL"
    }]
  },
  "work": [{
    "name": "Company Name",
    "position": "Job Title",
    "url": "Company URL",
    "startDate": "YYYY-MM-DD or YYYY",
    "endDate": "YYYY-MM-DD or Present",
    "summary": "Overview of responsibilities",
    "highlights": ["Key achievement 1", "Key achievement 2"]
  }],
  "volunteer": [{
    "organization": "Organization",
    "position": "Role",
    "url": "",
    "startDate": "",
    "endDate": "",
    "summary": "",
    "highlights": []
  }],
  "education": [{
    "institution": "University / College",
    "url": "",
    "area": "Field of study",
    "studyType": "Degree type",
    "startDate": "Start date",
    "endDate": "End date or Graduation year",
    "score": "GPA or honors",
    "courses": ["Course 1"]
  }],
  "awards": [{
    "title": "Award title",
    "date": "Date received",
    "awarder": "Organization",
    "summary": "Summary"
  }],
  "certificates": [{
    "name": "Certificate name",
    "date": "Date issued",
    "issuer": "Issuing organization",
    "url": "Verification URL"
  }],
  "publications": [{
    "name": "Title",
    "publisher": "Publisher",
    "releaseDate": "Date",
    "url": "Link",
    "summary": "Summary"
  }],
  "skills": [{
    "name": "Skill Category (e.g. Frontend Development, Cloud Architecture)",
    "level": "Proficiency level",
    "keywords": ["Skill 1", "Skill 2"]
  }],
  "languages": [{
    "language": "Language name",
    "fluency": "Fluency level"
  }],
  "interests": [{
    "name": "Interest area",
    "keywords": ["Keyword 1"]
  }],
  "references": [{
    "name": "Reference name",
    "reference": "Reference details"
  }],
  "projects": [{
    "name": "Project Name",
    "startDate": "Start date",
    "endDate": "End date",
    "description": "Project overview",
    "highlights": ["Key result or metric"],
    "url": "Project URL"
  }]
}

Instructions:
1. Extract ALL information present in the resume accurately and completely.
2. Return ONLY the raw JSON object. Do NOT wrap in markdown codeblocks (\`\`\`json), and do not include extra explanations.
3. If a section has no information, provide an empty array [] or omit it.

Resume text to parse:
${rawText.slice(0, 24000)}
`;

/**
 * Cleans markdown code fences and extracts the valid JSON object substring.
 */
export function extractJsonObject(rawOutput: string): ResumeData {
  let cleaned = rawOutput.replace(/```(?:json)?/gi, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned) as ResumeData;
}

/**
 * Parses resume text using Cloudflare Workers AI edge model.
 */
async function parseWithWorkersAi(
  env: AppEnv,
  rawText: string
): Promise<ResumeData> {
  const model =
    env.WORKERS_AI_PARSER_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  const prompt = RESUME_PARSER_PROMPT(rawText);

  const aiResponse = (await env.AI.run(model, {
    prompt,
    max_tokens: 3500
  })) as { response?: string } | string;

  const rawOutput =
    typeof aiResponse === "string"
      ? aiResponse
      : aiResponse.response || JSON.stringify(aiResponse);

  return extractJsonObject(rawOutput);
}

/**
 * Parses resume text using Cloudflare AI Gateway.
 * Routes through the AI Gateway endpoint to Google AI Studio or other gateway providers.
 */
async function parseWithGateway(
  env: AppEnv,
  rawText: string
): Promise<ResumeData> {
  const gatewayModel = createGatewayModel(env);
  if (!gatewayModel) {
    throw new Error(
      "Cloudflare AI Gateway is not configured (missing CF_AIG_ACCOUNT_ID or CF_AIG_GATEWAY_NAME)"
    );
  }

  const prompt = RESUME_PARSER_PROMPT(rawText);
  const result = await generateText({
    model: gatewayModel,
    prompt,
    maxTokens: 4096
  });

  return extractJsonObject(result.text);
}

/**
 * Resume parser with bidirectional failover:
 * - When DEFAULT_AI_PROVIDER="workers-ai": Attempts Workers AI first; fails over to Gateway AI on error.
 * - When DEFAULT_AI_PROVIDER="gateway": Attempts Gateway AI first; fails over to Workers AI on error.
 */
export async function parseResumeWithFailover(
  env: AppEnv,
  rawText: string
): Promise<ResumeData> {
  if (!rawText || !rawText.trim()) {
    throw new Error("No resume text provided");
  }

  const defaultProvider = env.DEFAULT_AI_PROVIDER || "workers-ai";
  const failoverEnabled =
    env.AI_FAILOVER_ENABLED === undefined ||
    env.AI_FAILOVER_ENABLED === true ||
    env.AI_FAILOVER_ENABLED === "true";

  if (defaultProvider === "gateway") {
    try {
      return await parseWithGateway(env, rawText);
    } catch (gatewayErr) {
      console.warn(
        "[AI Dispatcher] Gateway resume parsing encountered error:",
        gatewayErr
      );
      if (failoverEnabled) {
        console.info(
          "[AI Dispatcher] Failing over resume parsing to Cloudflare Workers AI..."
        );
        return await parseWithWorkersAi(env, rawText);
      }
      throw gatewayErr;
    }
  }

  // Default: workers-ai
  try {
    return await parseWithWorkersAi(env, rawText);
  } catch (workersErr) {
    console.warn(
      "[AI Dispatcher] Workers AI resume parsing encountered error:",
      workersErr
    );
    if (failoverEnabled && env.CF_AIG_ACCOUNT_ID && env.CF_AIG_GATEWAY_NAME) {
      console.info(
        "[AI Dispatcher] Failing over resume parsing to Cloudflare AI Gateway..."
      );
      return await parseWithGateway(env, rawText);
    }
    throw workersErr;
  }
}

/**
 * Executes a text inference operation for workflows with bidirectional fallback.
 */
export async function runWorkflowInference(
  env: AppEnv,
  prompt: string
): Promise<unknown> {
  const defaultProvider = env.DEFAULT_AI_PROVIDER || "workers-ai";
  const failoverEnabled =
    env.AI_FAILOVER_ENABLED === undefined ||
    env.AI_FAILOVER_ENABLED === true ||
    env.AI_FAILOVER_ENABLED === "true";

  const runWithWorkersAi = async () => {
    const model =
      env.WORKERS_AI_PARSER_MODEL ||
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
    return await env.AI.run(model, { prompt, max_tokens: 3500 });
  };

  const runWithGateway = async () => {
    const gatewayModel = createGatewayModel(env);
    if (!gatewayModel) {
      throw new Error("Cloudflare AI Gateway is not configured");
    }
    const result = await generateText({
      model: gatewayModel,
      prompt,
      maxTokens: 4096
    });
    return { response: result.text };
  };

  if (defaultProvider === "gateway") {
    try {
      return await runWithGateway();
    } catch (err) {
      console.warn("[AI Dispatcher] Workflow Gateway inference error:", err);
      if (failoverEnabled) {
        console.info("[AI Dispatcher] Failing over workflow to Workers AI...");
        return await runWithWorkersAi();
      }
      throw err;
    }
  }

  // Default: workers-ai
  try {
    return await runWithWorkersAi();
  } catch (err) {
    console.warn("[AI Dispatcher] Workflow Workers AI inference error:", err);
    if (failoverEnabled && env.CF_AIG_ACCOUNT_ID && env.CF_AIG_GATEWAY_NAME) {
      console.info("[AI Dispatcher] Failing over workflow to AI Gateway...");
      return await runWithGateway();
    }
    throw err;
  }
}
