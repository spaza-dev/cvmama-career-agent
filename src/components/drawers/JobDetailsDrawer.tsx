import type { JobListing } from "../../types";

export function JobDetailsDrawer({
  job,
  isOpen,
  onClose,
  onApply
}: {
  job: JobListing | null;
  isOpen: boolean;
  onClose: () => void;
  onApply: (job: JobListing) => void;
}) {
  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-kumo-base h-full shadow-2xl flex flex-col border-l border-kumo-line animate-in slide-in-from-right duration-300">
        <div className="p-4 border-b border-kumo-line flex items-center justify-between bg-kumo-elevated">
          <div>
            <h3 className="text-sm font-semibold text-kumo-default">
              {job.title}
            </h3>
            <p className="text-xs text-kumo-subtle mt-0.5">
              {job.company} · {job.location}
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

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex items-center justify-between p-3 rounded-xl border border-kumo-line bg-kumo-control/30 text-xs">
            <div>
              <span className="text-kumo-subtle block">Salary Range</span>
              <span className="font-semibold text-kumo-default font-mono tabular-nums">{job.salaryRange || "Competitive Market Rate"}</span>
            </div>
            {job.matchScore && (
              <span className="font-mono tabular-nums font-semibold px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                {job.matchScore}% Match Rate
              </span>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-kumo-subtle mb-2">
              Full Job Description
            </h4>
            <p className="text-xs text-kumo-default leading-relaxed whitespace-pre-wrap">
              {job.description}
            </p>
          </div>

          {job.matchingKeywords && job.matchingKeywords.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-kumo-subtle mb-2">
                Matching Qualifications
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {job.matchingKeywords.map((kw, idx) => (
                  <span key={idx} className="text-xs px-2 py-0.5 rounded bg-kumo-control border border-kumo-line text-kumo-default">
                    ✓ {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-kumo-line bg-kumo-elevated flex justify-end">
          <button
            type="button"
            onClick={() => {
              onApply(job);
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-kumo-default text-kumo-base hover:opacity-90 transition-opacity"
          >
            Apply via Stagehand
          </button>
        </div>
      </div>
    </div>
  );
}
