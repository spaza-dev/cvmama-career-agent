// tools/index.ts
import type { ChatAgent } from "../server";
import { careerTools } from "./career";
import { workflowTools } from "./workflows";

export const createTools = (agent: ChatAgent) => ({
  ...careerTools(agent),
  ...workflowTools(agent)
});
