import { tool } from "ai";
import { z } from "zod";
import { parseResumeText, evaluateCareerMasterData, updateMasterProfile } from "./masterData";
import { sourceJobListings, calculateJobMatchScore } from "./sourcing";
import { generateTailoredPackage, createApplicationRecord } from "./application";
import { generateCareerRoadmap } from "./career";
import { generateInterviewQuestions, evaluateStarResponse } from "./interview";
import { ResumeSchema } from "../types";

export * from "./masterData";
export * from "./sourcing";
export * from "./application";
export * from "./career";
export * from "./interview";
export * from "./documentGenerator";
export * from "./mcp";

export function createTools(agent?: any) {
  return {
    parseResumeText: tool({
      description: "Extracts structured JSON Resume schema from uploaded or pasted resume text.",
      parameters: z.object({
        rawText: z.string().describe("The raw text of the resume document.")
      }),
      execute: async ({ rawText }) => {
        return await parseResumeText(rawText, agent?.env?.AI);
      }
    }),

    saveProfile: tool({
      description: "Persists confirmed Master Career Data profile.",
      parameters: z.object({
        profile: ResumeSchema.describe("The confirmed JSON Resume profile object.")
      }),
      execute: async ({ profile }) => {
        if (agent && typeof agent.setProfile === "function") {
          return await agent.setProfile(profile);
        }
        return { success: true, profile };
      }
    }),

    sourceJobListings: tool({
      description: "Searches for matching job postings across career pages and job boards.",
      parameters: z.object({
        query: z.string().describe("Target role title or skill query"),
        location: z.string().optional().describe("City or Remote location constraint")
      }),
      execute: async ({ query, location }) => {
        return await sourceJobListings(query, location, agent?.state?.profile, agent?.env?.AI);
      }
    }),

    generateTailoredPackage: tool({
      description: "Generates an ATS-tailored resume and cover letter package for a target position.",
      parameters: z.object({
        jobTitle: z.string(),
        companyName: z.string(),
        jobDescription: z.string()
      }),
      execute: async ({ jobTitle, companyName, jobDescription }) => {
        const dummyJob = {
          id: `job-${Date.now()}`,
          title: jobTitle,
          company: companyName,
          location: "San Francisco, CA",
          url: "https://example.com/job",
          description: jobDescription
        };
        const profile = agent?.state?.profile || { basics: { name: "Applicant" } };
        return await generateTailoredPackage(profile, dummyJob, "modern", agent?.env?.AI);
      }
    }),

    generateCareerRoadmap: tool({
      description: "Builds a quarterly career milestone roadmap and skill gap assessment.",
      parameters: z.object({
        targetRole: z.string().optional().describe("Aspirational target role title")
      }),
      execute: async ({ targetRole }) => {
        const profile = agent?.state?.profile || { basics: { name: "Candidate" } };
        return await generateCareerRoadmap(profile, targetRole, agent?.env?.AI);
      }
    }),

    generateInterviewQuestions: tool({
      description: "Generates role-tailored technical and behavioral mock interview questions.",
      parameters: z.object({
        jobTitle: z.string(),
        companyName: z.string()
      }),
      execute: async ({ jobTitle, companyName }) => {
        return await generateInterviewQuestions(jobTitle, companyName, agent?.env?.AI);
      }
    }),

    evaluateStarResponse: tool({
      description: "Evaluates candidate answer against STAR framework rubric.",
      parameters: z.object({
        question: z.string(),
        userAnswerText: z.string()
      }),
      execute: async ({ question, userAnswerText }) => {
        return await evaluateStarResponse(question, userAnswerText, agent?.env?.AI);
      }
    })
  };
}
