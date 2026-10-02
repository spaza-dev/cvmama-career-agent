import { generateCareerRoadmap } from "../tools/career";
import type { ResumeData } from "../types";

export async function runCareerRoadmapWorkflow(
  profile: ResumeData,
  targetRole?: string,
  envAi?: any
) {
  const roadmap = await generateCareerRoadmap(profile, targetRole, envAi);
  return {
    success: true,
    roadmap
  };
}
