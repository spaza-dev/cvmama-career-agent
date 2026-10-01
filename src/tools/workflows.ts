import { tool } from "ai";
import { z } from "zod";
import type { ChatAgent } from "../server";

export const workflowTools = (agent: ChatAgent) => ({
  startResumeReview: tool({
    description: "Run a deep, multi-step resume review in the background.",
    inputSchema: z.object({
      resumeText: z.string(),
      targetRole: z.string().optional()
    }),
    execute: async (params) => {
      const workflowId = await agent.runWorkflow("RESUME_WORKFLOW", params);
      agent.setState({
        ...agent.state,
        jobs: [
          ...agent.state.jobs,
          { workflowId, kind: "resume-review", status: "running" }
        ]
      });
      return { workflowId, status: "started" };
    }
  }),

  startJobSearch: tool({
    description: "Search for matching jobs in the background.",
    inputSchema: z.object({
      query: z.string(),
      location: z.string().optional()
    }),
    execute: async (params) => {
      const workflowId = await agent.runWorkflow("JOB_SEARCH_WORKFLOW", params);
      agent.setState({
        ...agent.state,
        jobs: [
          ...agent.state.jobs,
          { workflowId, kind: "job-search", status: "running" }
        ]
      });
      return { workflowId, status: "started" };
    }
  })
});
