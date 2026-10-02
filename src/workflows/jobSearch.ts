import { sourceJobListings, calculateJobMatchScore } from "../tools/sourcing";
import type { ResumeData, JobListing } from "../types";

export class JobSearchWorkflow {
  async run(query: string, location?: string, profile?: ResumeData, envAi?: any) {
    return await runJobSearchWorkflow(query, location, profile, envAi);
  }
}

export async function runJobSearchWorkflow(
  query: string,
  location?: string,
  profile?: ResumeData,
  envAi?: any
) {
  const sourcingResult = await sourceJobListings(query, location, profile, envAi);

  if (profile && sourcingResult.jobs.length > 0) {
    const scoredJobs: JobListing[] = [];
    for (const job of sourcingResult.jobs) {
      const match = await calculateJobMatchScore(profile, job, envAi);
      scoredJobs.push({
        ...job,
        matchScore: match.score,
        matchingKeywords: match.matchedKeywords,
        missingQualifications: match.missingKeywords
      });
    }
    // Sort descending by match score
    scoredJobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    return { success: true, jobs: scoredJobs, count: scoredJobs.length };
  }

  return sourcingResult;
}
