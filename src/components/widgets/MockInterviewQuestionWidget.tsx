import { useState } from "react";
import type { InterviewQuestion } from "../../types";

export function MockInterviewQuestionWidget({
  question,
  onSubmitAnswer,
  onOpenStudioDrawer
}: {
  question: InterviewQuestion;
  onSubmitAnswer: (text: string) => void;
  onOpenStudioDrawer: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const toggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      // Simulate voice speech-to-text transcript
      setAnswer("In my previous role, I led our edge architecture migration. When a critical deployment failed, I conducted root cause analysis, coordinated team handoffs, and resolved the issue within 2 hours, reducing downtime by 40%.");
    } else {
      setIsRecording(true);
    }
  };

  return (
    <div className="my-2.5 p-4 rounded-xl border border-kumo-line bg-kumo-base shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-kumo-control border border-kumo-line text-kumo-default uppercase">
            {question.category}
          </span>
          {question.companyContext && (
            <span className="text-[11px] text-kumo-subtle">
              Context: {question.companyContext}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenStudioDrawer}
          className="text-xs text-kumo-subtle hover:text-kumo-default underline transition-colors"
        >
          Full Studio Drawer
        </button>
      </div>

      <p className="text-xs font-medium text-kumo-default leading-relaxed">
        "{question.question}"
      </p>

      {question.hints && question.hints.length > 0 && (
        <p className="text-[11px] text-kumo-subtle italic">
          Hint: {question.hints[0]}
        </p>
      )}

      <div className="space-y-2 pt-1">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type or record your response using the STAR method..."
          rows={3}
          className="w-full px-3 py-2 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder:text-kumo-inactive focus:outline-none focus:ring-1 focus:ring-kumo-ring resize-none"
        />

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={toggleRecord}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
              isRecording
                ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-300 dark:border-red-800 animate-pulse"
                : "bg-kumo-control border-kumo-line/80 text-kumo-default hover:bg-kumo-control/80"
            }`}
          >
            <span>{isRecording ? "🔴 Stop Recording" : "🎙️ Voice Record"}</span>
          </button>

          <button
            type="button"
            disabled={!answer.trim()}
            onClick={() => {
              if (answer.trim()) onSubmitAnswer(answer.trim());
            }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-kumo-default text-kumo-base hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            Evaluate Answer
          </button>
        </div>
      </div>
    </div>
  );
}
