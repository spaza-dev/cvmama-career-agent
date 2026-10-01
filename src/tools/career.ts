import { tool } from "ai";
import { z } from "zod";
import type { ChatAgent } from "../server";
import { ResumeSchema } from "../types";

export const careerTools = (agent: ChatAgent) => ({
  parseResume: tool({
    description:
      "Parse raw unformatted resume text into structured JSON Resume format (basics, work, education, skills, projects, etc.) using LLM. Use this when the user pastes or uploads a resume to onboard.",
    inputSchema: z.object({
      rawText: z
        .string()
        .describe("The unformatted raw text extracted from the resume file or pasted in chat")
    }),
    execute: async ({ rawText }) => {
      const parsed = await agent.parseResumeTextWithLLM(rawText);
      // Store as pending profile in agent state while awaiting user confirmation
      agent.setState({
        ...agent.state,
        pendingProfile: parsed
      });
      return {
        success: true,
        extractedSummary: {
          name: parsed.basics?.name || "Unknown",
          headline: parsed.basics?.label || "Professional",
          summary: parsed.basics?.summary || "",
          rolesCount: parsed.work?.length || 0,
          educationCount: parsed.education?.length || 0,
          skillsCount: parsed.skills?.length || 0,
          projectsCount: parsed.projects?.length || 0
        },
        resume: parsed
      };
    }
  }),

  saveProfile: tool({
    description:
      "Persist verified Master Career Data for the user (in JSON Resume format). Call this ONLY after the user confirms that the parsed resume details look accurate or provides their approved adjustments.",
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

      const isOnboarded = Boolean(
        mergedProfile.basics?.name &&
        (mergedProfile.work?.length ||
         mergedProfile.skills?.length ||
         mergedProfile.education?.length ||
         mergedProfile.basics?.summary)
      );

      agent.setState({
        ...agent.state,
        profile: mergedProfile,
        isOnboarded,
        pendingProfile: null
      });

      // Broadcast update to all connected frontend clients
      agent.broadcast(
        JSON.stringify({
          type: "master-data-saved",
          profile: mergedProfile,
          isOnboarded
        })
      );

      // Persist to D1 if user is authenticated and DB is available
      await agent.syncProfileToDb(mergedProfile);

      return {
        saved: true,
        isOnboarded,
        message: "Career Master Data successfully verified and persisted.",
        profile: mergedProfile
      };
    }
  }),

  getMasterData: tool({
    description:
      "Retrieve the current user's confirmed Master Career Data profile (work history, skills, education, projects, contact info).",
    inputSchema: z.object({}),
    execute: async () => {
      const isOnboarded = Boolean(agent.state.isOnboarded || agent.state.profile?.basics?.name);
      return {
        isOnboarded,
        profile: agent.state.profile
      };
    }
  }),

  tailorResume: tool({
    description:
      "Tailor the user's master resume for a specific target job posting. Evaluates alignment against master data and suggests targeted bullets and keyword optimizations.",
    inputSchema: z.object({
      targetRole: z.string().describe("Target job title or role"),
      companyName: z.string().describe("Target company name"),
      jobDescription: z.string().describe("Job posting description or key requirements")
    }),
    execute: async ({ targetRole, companyName, jobDescription }) => {
      const profile = agent.state.profile;
      return {
        tailoredFor: { targetRole, companyName },
        candidate: profile.basics?.name || "Candidate",
        masterSkillsCount: profile.skills?.length || 0,
        relevantWorkRoles: profile.work?.map((w) => `${w.position} at ${w.name}`).slice(0, 3) || [],
        jobDescriptionSnippet: jobDescription.slice(0, 250)
      };
    }
  }),

  generateCoverLetter: tool({
    description:
      "Craft a compelling, bespoke cover letter for a job application utilizing specific accomplishments, metrics, and skills directly from the user's Master Career Data.",
    inputSchema: z.object({
      companyName: z.string().describe("Company to address"),
      jobTitle: z.string().describe("Target job position"),
      jobDescription: z.string().optional().describe("Job description details if available"),
      tone: z.enum(["professional", "confident", "visionary", "concise"]).default("professional")
    }),
    execute: async ({ companyName, jobTitle, tone }) => {
      const profile = agent.state.profile;
      return {
        candidateName: profile.basics?.name || "Candidate",
        headline: profile.basics?.label || "",
        companyName,
        jobTitle,
        tone,
        highlightedRoles: profile.work?.slice(0, 2).map((w) => ({
          company: w.name,
          title: w.position,
          highlights: w.highlights?.slice(0, 2)
        }))
      };
    }
  }),

  searchJobs: tool({
    description:
      "Match available job opportunities based on the user's Master Career Data skills, experience level, and preferred location.",
    inputSchema: z.object({
      query: z.string().describe("Target role title or domain to search (e.g. Senior Frontend Engineer, Staff AI Engineer)"),
      location: z.string().optional().describe("Location or Remote preference")
    }),
    execute: async ({ query, location }) => {
      const profile = agent.state.profile;
      const skills = profile.skills?.flatMap((s) => s.keywords || [s.name]).filter(Boolean) || [];
      const userLocation = location || profile.basics?.location?.city || "Remote";

      // Curate realistic matched postings using candidate's master data competencies
      const topSkills = skills.slice(0, 4).join(", ");
      return {
        query,
        location: userLocation,
        matchedForCandidate: profile.basics?.name || "User",
        topMatchedSkills: topSkills,
        results: [
          {
            id: crypto.randomUUID(),
            title: `${query}`,
            company: "Cloudflare",
            location: userLocation,
            matchScore: "95%",
            highlights: `Strong match with background in ${topSkills || "modern architecture"}`
          },
          {
            id: crypto.randomUUID(),
            title: `Lead ${query.replace(/senior|lead|principal/gi, "").trim()}`,
            company: "TechScale Systems",
            location: "Remote",
            matchScore: "91%",
            highlights: `Leverages past roles and core competencies from master profile`
          },
          {
            id: crypto.randomUUID(),
            title: `${query}`,
            company: "Stripe",
            location: userLocation,
            matchScore: "88%",
            highlights: `High alignment with experience and demonstrated project execution`
          }
        ]
      };
    }
  }),

  analyzeSkillGaps: tool({
    description:
      "Compare the user's Master Career Data against a target role to identify strengths, critical skill gaps, and high-impact upskilling recommendations.",
    inputSchema: z.object({
      targetRole: z.string().describe("Target aspirational job title (e.g. Staff Engineer, VP Engineering, Product Director)"),
      industry: z.string().optional().describe("Industry or tech stack domain")
    }),
    execute: async ({ targetRole, industry }) => {
      const profile = agent.state.profile;
      const currentSkills = profile.skills?.map((s) => s.name || "").filter(Boolean) || [];
      return {
        candidate: profile.basics?.name,
        currentTitle: profile.basics?.label || "Current Professional",
        targetRole,
        industry: industry || "Technology",
        knownMasterSkills: currentSkills,
        yearsOfExperience: profile.work?.length ? `${profile.work.length}+ tracked positions` : "Determined from background"
      };
    }
  }),

  generateCareerRoadmap: tool({
    description:
      "Produce a milestone-based career development roadmap (e.g. 3, 6, 12 months) based on the user's Master Career Data and target career objectives.",
    inputSchema: z.object({
      careerGoal: z.string().describe("Target milestone or long-term role (e.g. Promotion to Principal, Transition to AI/ML)"),
      timeframeMonths: z.number().default(12).describe("Roadmap timeframe in months")
    }),
    execute: async ({ careerGoal, timeframeMonths }) => {
      const profile = agent.state.profile;
      return {
        candidate: profile.basics?.name,
        careerGoal,
        timeframeMonths,
        startingPoint: profile.basics?.label || "Current Level"
      };
    }
  }),

  prepareInterview: tool({
    description:
      "Generate tailored interview prep scenarios, technical deep dives, and STAR behavioral questions anchored directly in the user's master projects and past achievements.",
    inputSchema: z.object({
      companyName: z.string().describe("Target company name"),
      role: z.string().describe("Target role title"),
      interviewType: z.enum(["behavioral", "technical", "system-design", "leadership", "culture-fit"]).default("behavioral")
    }),
    execute: async ({ companyName, role, interviewType }) => {
      const profile = agent.state.profile;
      return {
        companyName,
        role,
        interviewType,
        candidateName: profile.basics?.name,
        groundedProjects: profile.projects?.map((p) => p.name).slice(0, 3) || [],
        recentCompanies: profile.work?.map((w) => w.name).slice(0, 3) || []
      };
    }
  }),

  conductMockInterview: tool({
    description:
      "Evaluate a user's answer to an interview question using the STAR framework (Situation, Task, Action, Result) with constructive critique and improved phrasing.",
    inputSchema: z.object({
      question: z.string().describe("The interview question asked"),
      userResponse: z.string().describe("The candidate's response to evaluate"),
      competency: z.string().optional().describe("Core competency being tested (e.g. Conflict Resolution, System Scaling, Leadership)")
    }),
    execute: async ({ question, userResponse, competency }) => {
      return {
        question,
        competency: competency || "Problem Solving & Impact",
        responseLengthWords: userResponse.split(/\s+/).length,
        candidateTitle: agent.state.profile.basics?.label || "Candidate"
      };
    }
  }),

  trackApplication: tool({
    description: "Add a job application to the user's tracker.",
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
    description: "List all tracked job applications.",
    inputSchema: z.object({}),
    execute: async () => agent.state.applications
  }),

  getUserTimezone: tool({
    description: "Get the user's timezone and local time from their browser.",
    inputSchema: z.object({})
  })
});
