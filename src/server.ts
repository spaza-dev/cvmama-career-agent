import { routeAgentRequest, callable } from "agents";
import { AIChatAgent } from "@cloudflare/ai-chat";
import { createWorkersAI } from "workers-ai-provider";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { createTools } from "./tools";
import { getSystemPrompt } from "./prompts";
import type { CareerState, ResumeData } from "./types";

export interface AppEnv extends Env {
  DB?: D1Database;
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
    const workersai = createWorkersAI({ binding: this.env.AI });
    const isOnboarded = Boolean(
      this.state.isOnboarded ||
      (this.state.profile?.basics?.name &&
        (this.state.profile.work?.length ||
         this.state.profile.skills?.length ||
         this.state.profile.education?.length))
    );
    const result = streamText({
      model: workersai("@cf/openai/gpt-oss-20b"),
      system: getSystemPrompt(this.state.profile, isOnboarded),
      messages: await convertToModelMessages(this.messages),
      tools: { ...createTools(this), ...this.mcp.getAITools() },
      stopWhen: stepCountIs(8),
      maxOutputTokens: 4096,
      onFinish
    });
    return result.toUIMessageStreamResponse();
  }

  // Core LLM-powered resume parsing logic
  async parseResumeTextWithLLM(rawText: string): Promise<ResumeData> {
    if (!rawText || !rawText.trim()) {
      throw new Error("No resume text provided");
    }

    const prompt = `You are a professional resume parsing specialist. Parse the following resume text and format it STRICTLY into a valid JSON object conforming to this exact JSON Resume schema:
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
${rawText.slice(0, 16000)}
`;

    const aiResponse = (await this.env.AI.run(
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      {
        prompt,
        max_tokens: 3500
      }
    )) as { response?: string } | string;

    let rawOutput =
      typeof aiResponse === "string"
        ? aiResponse
        : aiResponse.response || JSON.stringify(aiResponse);
    rawOutput = rawOutput.replace(/```(?:json)?/gi, "").trim();

    const firstBrace = rawOutput.indexOf("{");
    const lastBrace = rawOutput.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      rawOutput = rawOutput.slice(firstBrace, lastBrace + 1);
    }

    const parsedJson = JSON.parse(rawOutput) as ResumeData;
    return parsedJson;
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
