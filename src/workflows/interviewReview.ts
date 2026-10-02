import { generateInterviewQuestions, evaluateStarResponse } from "../tools/interview";

export async function runInterviewSessionWorkflow(
  jobTitle: string,
  companyName: string,
  envAi?: any
) {
  const questions = await generateInterviewQuestions(jobTitle, companyName, envAi);
  return {
    success: true,
    jobTitle,
    companyName,
    questions
  };
}

export async function runStarEvaluationWorkflow(
  question: string,
  userAnswerText: string,
  envAi?: any
) {
  const evaluation = await evaluateStarResponse(question, userAnswerText, envAi);
  return {
    success: true,
    evaluation
  };
}
