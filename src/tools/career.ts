import { runWorkersAiTask } from "../ai/dispatcher";
import { DEFAULT_AI_CONFIGS } from "../ai/models";
import type { CareerRoadmap, ResumeData } from "../types";

/**
 * Generates a structured Career Roadmap and Skill Gap analysis.
 */
export async function generateCareerRoadmap(
  profile: ResumeData,
  targetRole?: string,
  envAi?: any
): Promise<CareerRoadmap> {
  const desiredRole = targetRole || profile.basics?.label || "Staff AI & Systems Engineer";

  const prompt = `Generate a structured career roadmap and skill gap assessment for a candidate aiming to become a ${desiredRole}.
Current candidate profile summary: ${profile.basics?.summary || "Software Engineer"}
Current skills: ${profile.skills?.map(s => s.name).join(", ") || "TypeScript, React, Node.js"}`;

  const systemInstruction = "Return valid JSON matching a CareerRoadmap structure.";

  try {
    const aiResult = await runWorkersAiTask<Partial<CareerRoadmap>>({
      prompt,
      systemInstruction,
      config: DEFAULT_AI_CONFIGS.roadmapGen,
      envAi
    });

    if (aiResult && aiResult.keyMilestones) {
      return {
        id: `roadmap-${Date.now()}`,
        targetRole: desiredRole,
        timeframe: aiResult.timeframe || "6-12 Months",
        currentMatchPercentage: aiResult.currentMatchPercentage || 78,
        keyMilestones: aiResult.keyMilestones,
        skillGaps: aiResult.skillGaps || [],
        courses: aiResult.courses || [],
        recommendedContacts: aiResult.recommendedContacts || []
      };
    }
  } catch (err) {
    console.error("Roadmap generation error:", err);
  }

  // Resilient default roadmap
  return {
    id: `roadmap-${Date.now()}`,
    targetRole: desiredRole,
    timeframe: "6-12 Months",
    currentMatchPercentage: 82,
    keyMilestones: [
      {
        quarter: "Q1",
        title: "Edge Systems & Workers AI Mastery",
        description: "Deepen expertise in serverless architectures, Cloudflare Durable Objects, and AI Gateway routing.",
        deliverables: ["Deploy 2 multi-tenant agent applications", "Complete Cloudflare Workers AI certification badge"]
      },
      {
        quarter: "Q2",
        title: "Distributed Agent Systems & Stagehand Automation",
        description: "Architect resilient multi-agent automation workflows and browser execution frameworks.",
        deliverables: ["Implement automated browser application pipeline", "Publish open-source agent plugin"]
      },
      {
        quarter: "Q3",
        title: "Technical Leadership & System Design",
        description: "Lead end-to-end architecture reviews and mentor junior engineers on high-concurrency design.",
        deliverables: ["Conduct 5 technical architecture reviews", "Deliver company-wide tech talk on Agentic AI"]
      }
    ],
    skillGaps: [
      {
        skill: "Distributed Consensus & State Engines",
        importance: "high",
        currentLevel: "Intermediate",
        targetLevel: "Advanced",
        suggestedAction: "Build a state-authoritative multiplayer canvas using Durable Objects."
      },
      {
        skill: "Stagehand AI Web Automation",
        importance: "medium",
        currentLevel: "Beginner",
        targetLevel: "Proficient",
        suggestedAction: "Complete Browser Run Stagehand automation labs."
      }
    ],
    courses: [
      {
        id: "course-1",
        title: "Distributed Systems & Cloudflare Workers AI",
        provider: "Cloudflare Developer Academy",
        skill: "Workers AI",
        rating: 4.9,
        url: "https://developers.cloudflare.com/workers-ai/",
        estimatedDuration: "12 Hours"
      },
      {
        id: "course-2",
        title: "Agentic AI Architecture & Browser Automation",
        provider: "Coursera / DeepLearning.AI",
        skill: "Stagehand Automation",
        rating: 4.8,
        url: "https://coursera.org",
        estimatedDuration: "20 Hours"
      }
    ],
    recommendedContacts: [
      {
        id: "contact-1",
        name: "Sarah Jenkins",
        role: "Head of AI Talent Acquisition",
        company: "Acme Cloud AI",
        connectionType: "Recruiter"
      },
      {
        id: "contact-2",
        name: "David Chen",
        role: "Principal Systems Architect",
        company: "Apex Scale Systems",
        connectionType: "Mentor"
      }
    ]
  };
}
