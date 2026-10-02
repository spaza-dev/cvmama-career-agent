import { useState, useRef, useEffect } from "react";
import type { InterviewQuestion, StarEvaluation } from "../../types";

export function InterviewStudioDrawer({
  question,
  isOpen,
  onClose,
  onSubmitEvaluation
}: {
  question: InterviewQuestion | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitEvaluation: (text: string) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isWebcamActive && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(() => setIsWebcamActive(false));
    }
  }, [isWebcamActive]);

  if (!isOpen || !question) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-kumo-base h-full shadow-2xl flex flex-col border-l border-kumo-line animate-in slide-in-from-right duration-300">
        <div className="p-4 border-b border-kumo-line flex items-center justify-between bg-kumo-elevated">
          <div>
            <h3 className="text-sm font-semibold text-kumo-default">
              Multimodal Interview Studio
            </h3>
            <p className="text-xs text-kumo-subtle mt-0.5">
              {question.category.toUpperCase()} · {question.companyContext || "Target Role"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-kumo-subtle hover:bg-kumo-control hover:text-kumo-default transition-colors text-xs"
          >
            ✕ Close
          </button>
        </div>

        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          <div className="p-4 rounded-xl border border-kumo-line bg-kumo-control/20 space-y-2">
            <span className="text-[10px] font-mono uppercase text-kumo-subtle tracking-wider block">
              Interview Question
            </span>
            <p className="text-sm font-medium text-kumo-default leading-relaxed">
              "{question.question}"
            </p>
          </div>

          {/* Video Preview Frame */}
          <div className="rounded-xl border border-kumo-line bg-zinc-950 aspect-video overflow-hidden relative flex items-center justify-center">
            {isWebcamActive ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
              <div className="text-center space-y-2 p-4">
                <span className="text-2xl block">🎥</span>
                <span className="text-xs text-zinc-400 block">Webcam Simulation Off</span>
                <button
                  type="button"
                  onClick={() => setIsWebcamActive(true)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  Enable Camera & Mic
                </button>
              </div>
            )}
          </div>

          {/* Answer Text / Voice Transcript Area */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-kumo-default block">
              Your Response (STAR Method)
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={5}
              placeholder="Describe the Situation, Task, Action, and Result..."
              className="w-full px-3 py-2.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder:text-kumo-inactive focus:outline-none focus:ring-1 focus:ring-kumo-ring"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={!answer.trim()}
              onClick={() => {
                if (answer.trim()) {
                  onSubmitEvaluation(answer.trim());
                  onClose();
                }
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-kumo-default text-kumo-base hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Evaluate Response
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
