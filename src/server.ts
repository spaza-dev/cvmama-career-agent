import { routeAgentRequest, callable } from "agents";
import { AIChatAgent } from "@cloudflare/ai-chat";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse
} from "ai";
import { createTools } from "./tools";
import { getSystemPrompt } from "./prompts";
import { getChatModel, parseResumeWithAI } from "./ai/dispatcher";
import type { CareerState, ResumeData } from "./types";

export interface AppEnv extends Env {
  DB?: D1Database;
  AI: Ai;
  WORKERS_AI_CHAT_MODEL?: string;
  WORKERS_AI_PARSER_MODEL?: string;
  CF_AIG_GATEWAY_NAME?: string;
}

// Workflows must be exported from the worker entry
export { ResumeReviewWorkflow } from "./workflows/resumeReview";
export { JobSearchWorkflow } from "./workflows/jobSearch";

async function ensureDbTables(db: D1Database) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY,
      resume_json TEXT NOT NULL,
      raw_text TEXT,
      preferences_json TEXT DEFAULT '{}',
      goals_json TEXT DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export class ChatAgent extends AIChatAgent<AppEnv, CareerState> {
  initialState: CareerState = {
    profile: {},
    applications: [],
    jobs: [],
    isOnboarded: false,
    pendingProfile: null
  };

  async onChatMessage(onFinish?: Parameters<typeof streamText>[0]["onFinish"]) {
    const isOnboarded = Boolean(
      this.state.isOnboarded ||
      (this.state.profile?.basics?.name &&
        (this.state.profile.work?.length ||
         this.state.profile.skills?.length ||
         this.state.profile.education?.length))
    );

    const system = getSystemPrompt(this.state.profile, isOnboarded);
    const messages = await convertToModelMessages(this.messages);
    const tools = { ...createTools(this), ...this.mcp.getAITools() };
    const chatModelName =
      this.env.WORKERS_AI_CHAT_MODEL || "@cf/openai/gpt-oss-20b";

    try {
      const model = getChatModel(this.env);
      const result = streamText({
        model,
        system,
        messages,
        tools,
        stopWhen: stepCountIs(8),
        maxOutputTokens: 4096,
        onFinish
      });
      return result.toUIMessageStreamResponse({
        onError: (err) => {
          const detail = err instanceof Error ? err.message : String(err);
          console.error(
            `[ChatAgent] Workers AI stream error (${chatModelName}):`,
            err
          );
          return `Cloudflare Workers AI Error: ${detail}`;
        }
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[ChatAgent] Workers AI model failed to start (${chatModelName}):`,
        err
      );
      const errorStream = createUIMessageStream({
        execute: ({ writer }) => {
          writer.write({
            type: "text",
            text: `⚠️ **Cloudflare Workers AI Error**\n\nUnable to generate response using model \`${chatModelName}\`.\n\n**Details**: ${message}\n\nPlease verify that Cloudflare Workers AI is available and try again.`
          });
        }
      });
      return createUIMessageStreamResponse({ stream: errorStream });
    }
  }

  // Core LLM-powered resume parsing logic strictly via Workers AI binding
  async parseResumeTextWithLLM(rawText: string): Promise<ResumeData> {
    return await parseResumeWithAI(this.env, rawText);
  }

  // Callable method: parse extracted resume text via Agent LLM
  @callable()
  async parseResume(rawText: string) {
    try {
      const resume = await this.parseResumeTextWithLLM(rawText);
      return { success: true, resume };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Agent parseResume error:", err);
      return { success: false, error: message || "Failed to parse resume text" };
    }
  }

  // Called from the UI's MCP panel
  @callable() async addServer(name: string, url: string) {
    await this.addMcpServer(name, url);
  }
  @callable() async removeServer(id: string) {
    await this.removeMcpServer(id);
  }

  // Sync profile to D1 helper
  async syncProfileToDb(profile: ResumeData, rawText?: string) {
    const uid = this.state.userId || this.name;
    if (uid && this.env.DB) {
      try {
        await ensureDbTables(this.env.DB);
        await this.env.DB.prepare(
          `INSERT INTO user_profiles (user_id, resume_json, raw_text, preferences_json, goals_json, updated_at)
           VALUES (?, ?, ?, '{}', '{}', CURRENT_TIMESTAMP)
           ON CONFLICT(user_id) DO UPDATE SET
             resume_json = excluded.resume_json,
             raw_text = COALESCE(excluded.raw_text, user_profiles.raw_text),
             updated_at = CURRENT_TIMESTAMP`
        )
          .bind(uid, JSON.stringify(profile), rawText || null)
          .run();
      } catch (err) {
        console.error("Failed to sync profile to D1:", err);
      }
    }
  }

  // Callable method: Get user profile from D1 via Agent
  @callable()
  async getProfile(userId?: string) {
    const uid = userId || this.state.userId || this.name;
    if (!uid) return { success: false, error: "userId required", profile: null };

    if (this.env.DB) {
      try {
        await ensureDbTables(this.env.DB);
        const row = await this.env.DB.prepare(
          "SELECT resume_json, updated_at FROM user_profiles WHERE user_id = ?"
        )
          .bind(uid)
          .first<{ resume_json: string; updated_at: string }>();

        if (row && row.resume_json) {
          const profile = JSON.parse(row.resume_json) as ResumeData;
          return { success: true, profile, updatedAt: row.updated_at };
        }
      } catch (err) {
        console.error("Agent getProfile error:", err);
      }
    }
    return { success: true, profile: null };
  }

  // Hydrate user session from D1
  @callable()
  async setSessionUser(userId: string) {
    if (!userId) return { success: false };
    this.setState({ ...this.state, userId });

    if (this.env.DB) {
      try {
        await ensureDbTables(this.env.DB);
        const row = await this.env.DB.prepare(
          "SELECT resume_json FROM user_profiles WHERE user_id = ?"
        )
          .bind(userId)
          .first<{ resume_json: string }>();

        if (row && row.resume_json) {
          const profile = JSON.parse(row.resume_json) as ResumeData;
          this.setState({
            ...this.state,
            userId,
            profile,
            isOnboarded: true
          });
          return { success: true, profile, isOnboarded: true };
        }
      } catch (err) {
        console.error(
          "Error hydrating profile from D1 in setSessionUser:",
          err
        );
      }
    }
    return { success: true, profile: this.state.profile, isOnboarded: this.state.isOnboarded };
  }

  // Hydrate profile in Agent memory without broadcasting a "saved" notification
  @callable()
  async hydrateProfile(profile: ResumeData, userId?: string) {
    const uid = userId || this.state.userId;
    const isOnboarded = Boolean(
      profile && profile.basics?.name &&
      (profile.work?.length || profile.skills?.length || profile.education?.length || profile.basics?.summary)
    );

    this.setState({
      ...this.state,
      userId: uid,
      profile,
      isOnboarded,
      pendingProfile: null
    });

    return { success: true, profile: this.state.profile, isOnboarded };
  }

  // Update profile in state and D1
  @callable()
  async setProfile(profile: ResumeData, userId?: string, rawText?: string) {
    const uid = userId || this.state.userId;
    const isOnboarded = Boolean(
      profile && profile.basics?.name &&
      (profile.work?.length || profile.skills?.length || profile.education?.length || profile.basics?.summary)
    );

    this.setState({
      ...this.state,
      userId: uid,
      profile,
      isOnboarded,
      pendingProfile: null
    });

    if (uid && this.env.DB) {
      await this.syncProfileToDb(profile, rawText);
    }

    this.broadcast(
      JSON.stringify({
        type: "master-data-saved",
        profile,
        isOnboarded
      })
    );

    return { success: true, profile: this.state.profile, isOnboarded };
  }

  // Callable confirmation of master data
  @callable()
  async confirmMasterData(profile: ResumeData, rawText?: string) {
    return await this.setProfile(profile, this.state.userId, rawText);
  }

  // Methods the workflows call back into via RPC (must be public)
  async saveResumeReview(workflowId: string, _review: unknown) {
    this.setState({
      ...this.state,
      jobs: this.state.jobs.map((j) =>
        j.workflowId === workflowId ? { ...j, status: "done" } : j
      )
    });
  }

  // Fires when a workflow finishes
  async onWorkflowComplete(
    workflowName: string,
    _instanceId: string,
    _result?: unknown
  ) {
    this.broadcast(
      JSON.stringify({
        type: "scheduled-task", // reuses the UI's toast handler
        description: `${workflowName} finished`
      })
    );
  }
}

export default {
  async fetch(request: Request, env: AppEnv) {
    return (
      (await routeAgentRequest(request, env)) ??
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<AppEnv>;
