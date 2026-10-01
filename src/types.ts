import { z } from "zod";

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

export type Application = {
  id: string;
  company: string;
  role: string;
  status: "saved" | "applied" | "interview" | "offer" | "rejected";
};

export type CareerState = {
  profile: ResumeData;
  userId?: string;
  applications: Application[];
  jobs: {
    workflowId: string;
    kind: string;
    status: "running" | "done" | "error";
  }[];
};

export type ResumeReviewParams = { resumeText: string; targetRole?: string };
export type JobSearchParams = { query: string; location?: string };
