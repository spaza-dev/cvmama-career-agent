import { createWorkersAI } from "workers-ai-provider";
import type { LanguageModel } from "ai";
import type { AppEnv } from "../server";
import type { ResumeData } from "../types";

/**
 * Returns the Cloudflare AI Gateway options for the AI binding.
 * Defaults to gateway id "default" for automatic account-level observability,
 * request logging, token tracking, caching, and rate limiting in Cloudflare dashboard.
 */
export function getGatewayOptions(env: AppEnv): { id: string } {
  const gatewayName = env.CF_AIG_GATEWAY_NAME?.trim() || "default";
  return { id: gatewayName };
}

/**
 * Creates the Cloudflare Workers AI model via the edge AI binding with AI Gateway enabled.
 * No external API keys or third-party HTTP endpoints required.
 */
export function getChatModel(
  env: AppEnv,
  overrideModel?: string
): LanguageModel {
  if (!env.AI) {
    throw new Error(
      "Cloudflare AI binding (env.AI) is not available. Please verify the 'ai' binding in wrangler.jsonc."
    );
  }
  const gateway = getGatewayOptions(env);
  const workersai = createWorkersAI({
    binding: env.AI,
    gateway
  });
  const modelName =
    overrideModel || env.WORKERS_AI_CHAT_MODEL || "@cf/openai/gpt-oss-20b";
  return workersai(modelName);
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
  try {
    return JSON.parse(cleaned) as ResumeData;
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to parse valid JSON from Workers AI output: ${reason}. Output preview: ${cleaned.slice(0, 150)}`
    );
  }
}

/**
 * Parses resume text using Cloudflare Workers AI and AI Gateway via binding.
 * Throws explicit, descriptive errors upon failure.
 */
export async function parseResumeWithAI(
  env: AppEnv,
  rawText: string
): Promise<ResumeData> {
  if (!rawText || !rawText.trim()) {
    throw new Error("No resume text provided for parsing.");
  }
  if (!env.AI) {
    throw new Error(
      "Cloudflare AI binding (env.AI) is not available. Check wrangler.jsonc."
    );
  }

  const model =
    env.WORKERS_AI_PARSER_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  const prompt = RESUME_PARSER_PROMPT(rawText);
  const gateway = getGatewayOptions(env);

  try {
    const aiResponse = (await env.AI.run(
      model,
      {
        prompt,
        max_tokens: 3500
      },
      {
        gateway
      }
    )) as { response?: string } | string;

    const rawOutput =
      typeof aiResponse === "string"
        ? aiResponse
        : aiResponse.response || JSON.stringify(aiResponse);

    if (!rawOutput || !rawOutput.trim()) {
      throw new Error("Model returned an empty response.");
    }

    return extractJsonObject(rawOutput);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[AI Parser Error] Model: ${model}, Gateway: ${gateway.id}:`, err);
    throw new Error(
      `Workers AI resume parser error (${model}): ${message}`
    );
  }
}

/**
 * Executes a text inference operation for workflows using Cloudflare Workers AI with AI Gateway.
 */
export async function runWorkflowInference(
  env: AppEnv,
  prompt: string
): Promise<unknown> {
  if (!env.AI) {
    throw new Error("Cloudflare AI binding (env.AI) is not available.");
  }
  const model =
    env.WORKERS_AI_PARSER_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  const gateway = getGatewayOptions(env);

  try {
    return await env.AI.run(
      model,
      { prompt, max_tokens: 3500 },
      { gateway }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Workflow AI Error] Model: ${model}:`, err);
    throw new Error(
      `Workers AI workflow inference failed (${model}): ${message}`
    );
  }
}
