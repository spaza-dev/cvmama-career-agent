import { AgentWorkflow } from "agents/workflows";
import type { AgentWorkflowEvent, AgentWorkflowStep } from "agents/workflows";
import type { ChatAgent, AppEnv } from "../server";
import type { ResumeReviewParams } from "../types";
import { runWorkflowInference } from "../ai/dispatcher";

export class ResumeReviewWorkflow extends AgentWorkflow<
  ChatAgent,
  ResumeReviewParams
> {
  async run(
    event: AgentWorkflowEvent<ResumeReviewParams>,
    step: AgentWorkflowStep
  ) {
    const { resumeText, targetRole } = event.payload;

    const sections = await step.do("parse-sections", async () =>
      splitSections(resumeText)
    );

    await this.reportProgress({
      step: "analyze",
      status: "running",
      percent: 0.4
    });

    const review = await step.do(
      "analyze",
      { retries: { limit: 3, delay: "10 seconds", backoff: "exponential" } },
      async () =>
        runWorkflowInference(
          (this.agent?.env || this.env) as AppEnv,
          `Review these resume sections for a ${targetRole ?? "general"} role:\n${JSON.stringify(sections)}`
        )
    );

    await step.do("save", async () => {
      await this.agent.saveResumeReview(event.instanceId, review); // RPC into the agent
    });

    await step.reportComplete(review); // triggers onWorkflowComplete on the agent
    return review;
  }
}

const splitSections = (t: string) => t.split(/\n{2,}/);
