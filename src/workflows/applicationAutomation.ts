import { generateTailoredPackage, automateApplicationWithStagehand, createApplicationRecord } from "../tools/application";
import type { JobListing, ResumeData, TemplateStyle } from "../types";

export async function runApplicationAutomationWorkflow(
  job: JobListing,
  profile: ResumeData,
  style: TemplateStyle = "modern",
  envAi?: any,
  envBrowser?: any
) {
  // 1. Tailor resume and cover letter package
  const pkg = await generateTailoredPackage(profile, job, style, envAi);

  // 2. Automate portal submission with Stagehand
  const automation = await automateApplicationWithStagehand(job, pkg, envBrowser);

  // 3. Log application record
  const record = createApplicationRecord(job, "tailored");

  return {
    success: true,
    package: pkg,
    automation,
    record
  };
}
