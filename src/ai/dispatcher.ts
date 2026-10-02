import type { ToolAIConfig } from "../types";
import { DEFAULT_AI_CONFIGS, WORKERS_AI_MODELS } from "./models";

export interface AiRunOptions {
  prompt: string;
  systemInstruction?: string;
  config?: ToolAIConfig;
  envAi?: any;
}

export async function runWorkersAiTask<T = any>(options: AiRunOptions): Promise<T> {
  const { prompt, systemInstruction, config, envAi } = options;
  const toolConfig = config || DEFAULT_AI_CONFIGS.orchestrator;
  const model = toolConfig.modelName || WORKERS_AI_MODELS.ORCHESTRATOR;

  const messages = [
    ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
    { role: "user", content: prompt }
  ];

  if (envAi && typeof envAi.run === "function") {
    try {
      const response = await envAi.run(model, {
        messages,
        temperature: toolConfig.temperature ?? 0.5,
        max_tokens: toolConfig.maxTokens ?? 2048
      });
      const responseText = response?.response || response?.text || JSON.stringify(response);
      return parseAiJsonResponse<T>(responseText);
    } catch (err) {
      console.warn(`Direct env.AI run failed for ${model}:`, err);
    }
  }

  const gatewayId = toolConfig.gatewayId || "cvmama-gateway";
  const accountId = toolConfig.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || "demo-account";
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_BEARER_TOKEN;

  const url = accountId && accountId !== "demo-account"
    ? `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/workers-ai/${model}`
    : `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (apiToken) {
    headers["Authorization"] = `Bearer ${apiToken}`;
  }
  if (gatewayId) {
    headers["cf-aig-gateway-id"] = gatewayId;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages,
        temperature: toolConfig.temperature ?? 0.5,
        max_tokens: toolConfig.maxTokens ?? 2048
      })
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.result?.response || data?.response || JSON.stringify(data);
      return parseAiJsonResponse<T>(text);
    }
  } catch (err) {
    console.error(`AI Gateway REST request error for ${model}:`, err);
  }

  return parseAiJsonResponse<T>(prompt);
}

function parseAiJsonResponse<T>(rawText: string): T {
  if (typeof rawText !== "string") return rawText as T;

  try {
    const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      return JSON.parse(match[1]);
    }
    return JSON.parse(rawText);
  } catch {
    return { text: rawText } as T;
  }
}

export function getChatModel(env?: any): any {
  if (env?.AI) {
    return env.AI;
  }
  return WORKERS_AI_MODELS.ORCHESTRATOR;
}

export async function parseResumeWithAI(env: any, rawText: string) {
  return await runWorkersAiTask<any>({
    prompt: `Parse the following resume into JSON Resume format:\n\n${rawText.slice(0, 8000)}`,
    systemInstruction: "You are a resume parser powered by Workers AI. Return valid JSON Resume schema.",
    envAi: env?.AI
  });
}

export async function runWorkflowInference<T = any>(env: any, model: string, prompt: string, systemInstruction?: string): Promise<T> {
  return await runWorkersAiTask<T>({
    prompt,
    systemInstruction,
    config: { modelName: model },
    envAi: env?.AI
  });
}
