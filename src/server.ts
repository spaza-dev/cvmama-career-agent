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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export class ChatAgent extends AIChatAgent<AppEnv, CareerState> {
  initialState: CareerState = { profile: {}, applications: [], jobs: [] };

  async onChatMessage(onFinish?: Parameters<typeof streamText>[0]["onFinish"]) {
    const workersai = createWorkersAI({ binding: this.env.AI });
    const result = streamText({
      model: workersai("@cf/openai/gpt-oss-20b"),
      system: getSystemPrompt(this.state.profile),
      messages: await convertToModelMessages(this.messages),
      tools: { ...createTools(this), ...this.mcp.getAITools() },
      stopWhen: stepCountIs(8),
      maxOutputTokens: 4096,
      onFinish
    });
    return result.toUIMessageStreamResponse();
  }

  // Called from the UI's MCP panel
  @callable() async addServer(name: string, url: string) {
    await this.addMcpServer(name, url);
  }
  @callable() async removeServer(id: string) {
    await this.removeMcpServer(id);
  }

  // Sync profile to D1 helper
  async syncProfileToDb(profile: ResumeData) {
    if (this.state.userId && this.env.DB) {
      try {
        await ensureDbTables(this.env.DB);
        await this.env.DB.prepare(
          `INSERT INTO user_profiles (user_id, resume_json, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(user_id) DO UPDATE SET
             resume_json = excluded.resume_json,
             updated_at = CURRENT_TIMESTAMP`
        )
          .bind(this.state.userId, JSON.stringify(profile))
          .run();
      } catch (err) {
        console.error("Failed to sync profile to D1:", err);
      }
    }
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
            profile
          });
          return { success: true, profile };
        }
      } catch (err) {
        console.error(
          "Error hydrating profile from D1 in setSessionUser:",
          err
        );
      }
    }
    return { success: true, profile: this.state.profile };
  }

  // Update profile in state and D1
  @callable()
  async setProfile(profile: ResumeData, userId?: string) {
    const uid = userId || this.state.userId;
    this.setState({
      ...this.state,
      userId: uid,
      profile
    });

    if (uid && this.env.DB) {
      try {
        await ensureDbTables(this.env.DB);
        await this.env.DB.prepare(
          `INSERT INTO user_profiles (user_id, resume_json, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(user_id) DO UPDATE SET
             resume_json = excluded.resume_json,
             updated_at = CURRENT_TIMESTAMP`
        )
          .bind(uid, JSON.stringify(profile))
          .run();
      } catch (err) {
        console.error("Error saving profile in setProfile:", err);
      }
    }
    return { success: true, profile: this.state.profile };
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

export default {
  async fetch(request: Request, env: AppEnv) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders, status: 204 });
    }

    const url = new URL(request.url);

    // Endpoint: Parse resume raw text into structured JSON Resume
    if (url.pathname === "/api/parse-resume" && request.method === "POST") {
      try {
        const { rawText } = (await request.json()) as { rawText: string };
        if (!rawText || !rawText.trim()) {
          return new Response(
            JSON.stringify({ error: "No resume text provided" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            }
          );
        }

        const prompt = `You are a resume parsing specialist. Parse the following resume text and format it STRICTLY into a JSON object matching this exact JSON Resume schema:
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
    "name": "Skill Category (e.g. Web Development, Cloud, Data Science)",
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
1. Extract ALL information present in the resume accurately.
2. Return ONLY the JSON object. Do not include markdown codeblocks (\`\`\`json), conversational explanations, or extra commentary.
3. If a section has no information in the resume, omit it or use an empty array.

Resume text to parse:
${rawText.slice(0, 15000)}
`;

        const aiResponse = (await env.AI.run(
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

        const parsedJson = JSON.parse(rawOutput);
        return new Response(
          JSON.stringify({ success: true, resume: parsedJson }),
          {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Resume parsing error:", error);
        return new Response(
          JSON.stringify({ error: errorMessage || "Failed to parse resume" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }
    }

    // Endpoint: Get user profile from D1
    if (url.pathname === "/api/profile" && request.method === "GET") {
      const userId = url.searchParams.get("userId");
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId query parameter required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }

      if (!env.DB) {
        return new Response(
          JSON.stringify({ profile: null, warning: "D1 database not bound" }),
          {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }

      try {
        await ensureDbTables(env.DB);
        const row = await env.DB.prepare(
          "SELECT resume_json, updated_at FROM user_profiles WHERE user_id = ?"
        )
          .bind(userId)
          .first<{ resume_json: string; updated_at: string }>();

        if (row && row.resume_json) {
          return new Response(
            JSON.stringify({
              profile: JSON.parse(row.resume_json),
              updatedAt: row.updated_at
            }),
            {
              headers: { "Content-Type": "application/json", ...corsHeaders }
            }
          );
        }
        return new Response(JSON.stringify({ profile: null }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // Endpoint: Upsert user profile to D1
    if (url.pathname === "/api/profile" && request.method === "POST") {
      try {
        const { userId, profile, rawText } = (await request.json()) as {
          userId: string;
          profile: ResumeData;
          rawText?: string;
        };

        if (!userId || !profile) {
          return new Response(
            JSON.stringify({ error: "userId and profile are required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            }
          );
        }

        if (!env.DB) {
          return new Response(
            JSON.stringify({ error: "D1 database not bound" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            }
          );
        }

        await ensureDbTables(env.DB);
        await env.DB.prepare(
          `INSERT INTO user_profiles (user_id, resume_json, raw_text, updated_at)
           VALUES (?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(user_id) DO UPDATE SET
             resume_json = excluded.resume_json,
             raw_text = excluded.raw_text,
             updated_at = CURRENT_TIMESTAMP`
        )
          .bind(userId, JSON.stringify(profile), rawText || null)
          .run();

        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    return (
      (await routeAgentRequest(request, env)) ??
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<AppEnv>;
