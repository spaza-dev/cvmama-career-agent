import { AgentWorkflow } from "agents/workflows";
import type { AgentWorkflowEvent, AgentWorkflowStep } from "agents/workflows";
import type { ChatAgent } from "../server";
import type { JobSearchParams } from "../types";

export class JobSearchWorkflow extends AgentWorkflow<
  ChatAgent,
  JobSearchParams
> {
  async run(
    event: AgentWorkflowEvent<JobSearchParams>,
    step: AgentWorkflowStep
  ) {
    const { query, location } = event.payload;

    await this.reportProgress({
      step: "search",
      status: "running",
      percent: 0.3
    });

    // Placeholder: swap in a real job-board API or MCP tool here
    const results = await step.do(
      "search",
      { retries: { limit: 3, delay: "5 seconds", backoff: "exponential" } },
      async () => [
        {
          title: `${query} (sample)`,
          company: "Example Co",
          location: location ?? "Remote"
        }
      ]
    );

    await step.reportComplete(results);
    return results;
  }
}
