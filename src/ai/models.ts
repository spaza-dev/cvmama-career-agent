import type { ToolAIConfig } from "../types";

// Standard Workers AI Models
export const WORKERS_AI_MODELS = {
  ORCHESTRATOR: "@cf/meta/llama-3.3-70b-instruct",
  RESUME_PARSER: "@cf/meta/llama-3.3-70b-instruct",
  JOB_SOURCING: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
  VECTOR_EMBEDDING: "@cf/baai/bge-large-en-v1.5",
  TAILOR_RESUME: "@cf/qwen/qwen2.5-coder-32b-instruct",
  COVER_LETTER: "@cf/meta/llama-3.3-70b-instruct",
  ROADMAP_GEN: "@cf/meta/llama-3.3-70b-instruct",
  INTERVIEW_COACH: "@cf/meta/llama-3.3-70b-instruct",
  SPEECH_TRANSCRIBE: "@cf/openai/whisper-large-v3-turbo"
};

export const DEFAULT_AI_CONFIGS: Record<string, ToolAIConfig> = {
  orchestrator: {
    gatewayId: "cvmama-gateway",
    modelName: WORKERS_AI_MODELS.ORCHESTRATOR,
    temperature: 0.7
  },
  resumeParser: {
    gatewayId: "cvmama-gateway",
    modelName: WORKERS_AI_MODELS.RESUME_PARSER,
    temperature: 0.1
  },
  jobSourcing: {
    gatewayId: "cvmama-gateway",
    modelName: WORKERS_AI_MODELS.JOB_SOURCING,
    temperature: 0.3
  },
  tailorPackage: {
    gatewayId: "cvmama-gateway",
    modelName: WORKERS_AI_MODELS.TAILOR_RESUME,
    temperature: 0.4
  },
  roadmapGen: {
    gatewayId: "cvmama-gateway",
    modelName: WORKERS_AI_MODELS.ROADMAP_GEN,
    temperature: 0.5
  },
  interviewCoach: {
    gatewayId: "cvmama-gateway",
    modelName: WORKERS_AI_MODELS.INTERVIEW_COACH,
    temperature: 0.6
  }
};
