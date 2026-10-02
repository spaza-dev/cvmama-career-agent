import { parseResumeText, evaluateCareerMasterData } from "../tools/masterData";
import type { ResumeData } from "../types";

export async function runMasterDataOnboardingWorkflow(rawResumeText: string, envAi?: any) {
  const parseResult = await parseResumeText(rawResumeText, envAi);
  if (!parseResult.success || !parseResult.resume) {
    return { success: false, error: parseResult.error || "Failed to parse resume text." };
  }

  const evaluation = await evaluateCareerMasterData(parseResult.resume, envAi);

  return {
    success: true,
    resume: parseResult.resume,
    evaluation
  };
}
