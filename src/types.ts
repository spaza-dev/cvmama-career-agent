import { z } from "zod";

// ── 1. Resume & Career Master Data Schemas ─────────────────────────────────────

export const ResumeLocationSchema = z.object({
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  countryCode: z.string().optional(),
  region: z.string().optional()
});

export const ResumeProfileSchema = z.object({
  network: z.string().optional(),
  username: z.string().optional(),
  url: z.string().optional()
});

export const ResumeBasicsSchema = z.object({
  name: z.string().optional(),
  label: z.string().optional(),
  image: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  url: z.string().optional(),
  summary: z.string().optional(),
  location: ResumeLocationSchema.optional(),
  profiles: z.array(ResumeProfileSchema).optional()
});

export const ResumeWorkSchema = z.object({
  name: z.string().optional(),
  position: z.string().optional(),
  url: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  summary: z.string().optional(),
  highlights: z.array(z.string()).optional()
});

export const ResumeVolunteerSchema = z.object({
  organization: z.string().optional(),
  position: z.string().optional(),
  url: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  summary: z.string().optional(),
  highlights: z.array(z.string()).optional()
});

export const ResumeEducationSchema = z.object({
  institution: z.string().optional(),
  url: z.string().optional(),
  area: z.string().optional(),
  studyType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  score: z.string().optional(),
  courses: z.array(z.string()).optional()
});

export const ResumeAwardSchema = z.object({
  title: z.string().optional(),
  date: z.string().optional(),
  awarder: z.string().optional(),
  summary: z.string().optional()
});

export const ResumeCertificateSchema = z.object({
  name: z.string().optional(),
  date: z.string().optional(),
  issuer: z.string().optional(),
  url: z.string().optional()
});

export const ResumePublicationSchema = z.object({
  name: z.string().optional(),
  publisher: z.string().optional(),
  releaseDate: z.string().optional(),
  url: z.string().optional(),
  summary: z.string().optional()
});

export const ResumeSkillSchema = z.object({
  name: z.string().optional(),
  level: z.string().optional(),
  keywords: z.array(z.string()).optional()
});

export const ResumeLanguageSchema = z.object({
  language: z.string().optional(),
  fluency: z.string().optional()
});

export const ResumeInterestSchema = z.object({
  name: z.string().optional(),
  keywords: z.array(z.string()).optional()
});

export const ResumeReferenceSchema = z.object({
  name: z.string().optional(),
  reference: z.string().optional()
});

export const ResumeProjectSchema = z.object({
  name: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  url: z.string().optional()
});

export const ResumeSchema = z.object({
  basics: ResumeBasicsSchema.optional(),
  work: z.array(ResumeWorkSchema).optional(),
  volunteer: z.array(ResumeVolunteerSchema).optional(),
  education: z.array(ResumeEducationSchema).optional(),
  awards: z.array(ResumeAwardSchema).optional(),
  certificates: z.array(ResumeCertificateSchema).optional(),
  publications: z.array(ResumePublicationSchema).optional(),
  skills: z.array(ResumeSkillSchema).optional(),
  languages: z.array(ResumeLanguageSchema).optional(),
  interests: z.array(ResumeInterestSchema).optional(),
  references: z.array(ResumeReferenceSchema).optional(),
  projects: z.array(ResumeProjectSchema).optional()
});

export type ResumeData = z.infer<typeof ResumeSchema>;
export type ResumeBasics = z.infer<typeof ResumeBasicsSchema>;
export type ResumeWork = z.infer<typeof ResumeWorkSchema>;
export type ResumeEducation = z.infer<typeof ResumeEducationSchema>;
export type ResumeSkill = z.infer<typeof ResumeSkillSchema>;
export type ResumeProject = z.infer<typeof ResumeProjectSchema>;

export function isProfileOnboarded(profile?: ResumeData | null): boolean {
  if (!profile) return false;
  const name = profile.basics?.name?.trim();
  if (!name) return false;
  const hasWork = (profile.work?.length ?? 0) > 0;
  const hasEducation = (profile.education?.length ?? 0) > 0;
  const hasSkills = (profile.skills?.length ?? 0) > 0;
  const hasSummary = Boolean(profile.basics?.summary?.trim());
  return Boolean(hasWork || hasEducation || hasSkills || hasSummary);
}

// ── 2. Cloudflare AI Gateway & Workers AI Config Schemas ─────────────────────

export interface ToolAIConfig {
  gatewayId?: string;
  accountId?: string;
  modelName: string;
  temperature?: number;
  maxTokens?: number;
}

export interface DefaultAIConfigurations {
  orchestrator: ToolAIConfig;
  resumeParser: ToolAIConfig;
  jobSearch: ToolAIConfig;
  tailorPackage: ToolAIConfig;
  roadmapGen: ToolAIConfig;
  interviewCoach: ToolAIConfig;
}

// ── 3. Job Sourcing & Application Schemas ──────────────────────────────────────

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  type?: string; // Full-time, Remote, Hybrid, etc.
  salaryRange?: string;
  url: string;
  description: string;
  postedDate?: string;
  matchScore?: number; // 0 - 100
  matchingKeywords?: string[];
  missingQualifications?: string[];
}

export interface TailoredPackage {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  atsMatchScore: number;
  tailoredResume: ResumeData;
  coverLetterText: string;
  templateStyle: "modern" | "executive" | "technical" | "minimalist";
  keyEditsSummary: string[];
}

export interface ApplicationRecord {
  id: string;
  jobId: string;
  company: string;
  role: string;
  appliedDate: string;
  status: "saved" | "tailored" | "applying" | "applied" | "interview" | "offer" | "rejected";
  portalType?: "greenhouse" | "lever" | "workday" | "linkedin" | "generic";
  portalUrl?: string;
  notes?: string;
}

// ── 4. Career Roadmap & Skill Gap Schemas ──────────────────────────────────────

export interface SkillGapItem {
  skill: string;
  importance: "high" | "medium" | "low";
  currentLevel: string;
  targetLevel: string;
  suggestedAction: string;
}

export interface CourseDiscovery {
  id: string;
  title: string;
  provider: string; // e.g., Coursera, Udemy, edX
  skill: string;
  rating?: number;
  url: string;
  estimatedDuration?: string;
}

export interface NetworkContact {
  id: string;
  name: string;
  role: string;
  company: string;
  connectionType: "Recruiter" | "Mentor" | "Peer" | "Alumni";
  profileUrl?: string;
}

export interface CareerRoadmap {
  id: string;
  targetRole: string;
  timeframe: string; // e.g. "6-12 Months"
  currentMatchPercentage: number;
  keyMilestones: {
    quarter: string;
    title: string;
    description: string;
    deliverables: string[];
  }[];
  skillGaps: SkillGapItem[];
  courses: CourseDiscovery[];
  recommendedContacts: NetworkContact[];
}

// ── 5. Multimodal Interview Preparation Schemas ────────────────────────────────

export interface InterviewQuestion {
  id: string;
  question: string;
  category: "behavioral" | "technical" | "situational" | "system-design";
  companyContext?: string;
  hints?: string[];
}

export interface StarEvaluation {
  overallScore: number; // 0 - 10
  situationFeedback: string;
  taskFeedback: string;
  actionFeedback: string;
  resultFeedback: string;
  keyStrengths: string[];
  areasForImprovement: string[];
  suggestedRevision: string;
}

export interface MockSession {
  id: string;
  jobTitle: string;
  companyName: string;
  questions: InterviewQuestion[];
  currentQuestionIndex: number;
  userResponses: {
    questionId: string;
    userAudioUrl?: string;
    userText?: string;
    evaluation?: StarEvaluation;
  }[];
  status: "in_progress" | "completed";
}

// ── 6. Agent State Schema ──────────────────────────────────────────────────────

export type Application = ApplicationRecord;

export type CareerState = {
  profile: ResumeData;
  pendingProfile?: ResumeData | null;
  isOnboarded?: boolean;
  userId?: string;
  applications: ApplicationRecord[];
  savedJobs: JobListing[];
  activeRoadmap?: CareerRoadmap | null;
  activeInterviewSession?: MockSession | null;
  jobs: {
    workflowId: string;
    kind: string;
    status: "running" | "done" | "error";
  }[];
};

export type ResumeReviewParams = { resumeText: string; targetRole?: string };
export type JobSearchParams = { query: string; location?: string };
