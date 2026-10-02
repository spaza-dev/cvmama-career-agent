import type { CareerRoadmap } from "../../types";

export function CareerRoadmapDrawer({
  roadmap,
  isOpen,
  onClose
}: {
  roadmap: CareerRoadmap | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !roadmap) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-kumo-base h-full shadow-2xl flex flex-col border-l border-kumo-line animate-in slide-in-from-right duration-300">
        <div className="p-4 border-b border-kumo-line flex items-center justify-between bg-kumo-elevated">
          <div>
            <h3 className="text-sm font-semibold text-kumo-default">
              Career Roadmap: {roadmap.targetRole}
            </h3>
            <p className="text-xs text-kumo-subtle mt-0.5">
              {roadmap.timeframe} · {roadmap.currentMatchPercentage}% Readiness Benchmark
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

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Milestone Timeline */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-kumo-subtle mb-3">
              Quarterly Milestones
            </h4>
            <div className="space-y-3">
              {roadmap.keyMilestones.map((m, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-kumo-line bg-kumo-base shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-kumo-control border border-kumo-line text-kumo-default font-medium">
                      {m.quarter}
                    </span>
                    <span className="text-xs font-semibold text-kumo-default">{m.title}</span>
                  </div>
                  <p className="text-xs text-kumo-subtle leading-relaxed">{m.description}</p>
                  <ul className="text-xs text-kumo-subtle space-y-0.5 pl-4 list-disc pt-1">
                    {m.deliverables.map((d, dIdx) => (
                      <li key={dIdx}>{d}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Skill Gap Assessment */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-kumo-subtle mb-3">
              Identified Skill Gaps
            </h4>
            <div className="space-y-2">
              {roadmap.skillGaps.map((gap, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-kumo-line bg-kumo-control/30 text-xs space-y-1">
                  <div className="flex items-center justify-between font-medium text-kumo-default">
                    <span>{gap.skill}</span>
                    <span className="font-mono text-[11px] text-kumo-subtle">
                      {gap.currentLevel} ➔ {gap.targetLevel}
                    </span>
                  </div>
                  <p className="text-kumo-subtle">{gap.suggestedAction}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Course Discoveries */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-kumo-subtle mb-3">
              Recommended Courses & Certifications
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {roadmap.courses.map((course) => (
                <a
                  key={course.id}
                  href={course.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-xl border border-kumo-line bg-kumo-base hover:border-kumo-line/80 transition-colors text-xs space-y-0.5 block"
                >
                  <div className="font-semibold text-kumo-default flex items-center justify-between">
                    <span>{course.title}</span>
                    <span className="text-[11px] font-mono text-kumo-subtle">↗</span>
                  </div>
                  <div className="text-kumo-subtle text-[11px]">
                    {course.provider} · {course.estimatedDuration || "Self-Paced"}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
