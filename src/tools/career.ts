import { tool } from "ai";
import { z } from "zod";
import type { ChatAgent } from "../server";
import { ResumeSchema } from "../types";

export const careerTools = (agent: ChatAgent) => ({
  saveProfile: tool({
    description:
      "Save or update the user's career profile (supports full JSON Resume format: basics, work, education, skills, projects, etc.).",
    inputSchema: ResumeSchema,
    execute: async (updates) => {
      const mergedProfile = {
        ...agent.state.profile,
        ...updates,
        basics: {
          ...agent.state.profile?.basics,
          ...updates.basics
        }
      };

      agent.setState({
        ...agent.state,
        profile: mergedProfile
      });

      // Persist to D1 if user is authenticated and DB is available
      await agent.syncProfileToDb(mergedProfile);

      return { saved: true, profile: agent.state.profile };
    }
  }),

  trackApplication: tool({
    description: "Add a job application to the tracker.",
    inputSchema: z.object({
      company: z.string(),
      role: z.string(),
      status: z
        .enum(["saved", "applied", "interview", "offer", "rejected"])
        .default("saved")
    }),
    execute: async ({ company, role, status }) => {
      const application = { id: crypto.randomUUID(), company, role, status };
      agent.setState({
        ...agent.state,
        applications: [...agent.state.applications, application]
      });
      return application;
    }
  }),

  updateApplicationStatus: tool({
    description: "Change the status of a tracked application.",
    inputSchema: z.object({
      id: z.string(),
      status: z.enum(["saved", "applied", "interview", "offer", "rejected"])
    }),
    execute: async ({ id, status }) => {
      agent.setState({
        ...agent.state,
        applications: agent.state.applications.map((a) =>
          a.id === id ? { ...a, status } : a
        )
      });
      return { id, status };
    }
  }),

  listApplications: tool({
    description: "List all tracked applications.",
    inputSchema: z.object({}),
    execute: async () => agent.state.applications
  }),

  // No execute: the browser answers this via onToolCall in app.tsx
  getUserTimezone: tool({
    description: "Get the user's timezone and local time from their browser.",
    inputSchema: z.object({})
  })
});
