import type { JobListing } from "../../types";

export function JobMatchCardWidget({
  jobs,
  onApplyJob,
  onOpenDetailsDrawer
}: {
  jobs: JobListing[];
  onApplyJob: (job: JobListing) => void;
  onOpenDetailsDrawer: (job: JobListing) => void;
}) {
  return (
    <div className="my-2.5 space-y-2">
      <div className="text-xs font-semibold text-kumo-default px-1">
        Discovered Matches ({jobs.length})
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="p-3.5 rounded-xl border border-kumo-line bg-kumo-base shadow-2xs hover:border-kumo-line/80 transition-colors space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-kumo-default block">
                  {job.title}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-kumo-subtle mt-0.5">
                  <span>{job.company}</span>
                  <span aria-hidden="true">·</span>
                  <span>{job.location}</span>
                  {job.salaryRange && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{job.salaryRange}</span>
                    </>
                  )}
                </div>
              </div>

              {job.matchScore && (
                <span className="text-xs font-mono tabular-nums font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 shrink-0">
                  {job.matchScore}% Match
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-kumo-line/40 text-xs">
              <button
                type="button"
                onClick={() => onOpenDetailsDrawer(job)}
                className="text-kumo-subtle hover:text-kumo-default underline text-[11px] transition-colors"
              >
                Full Description & Insights
              </button>

              <button
                type="button"
                onClick={() => onApplyJob(job)}
                className="px-3 py-1 text-xs font-medium rounded-lg bg-kumo-default text-kumo-base hover:opacity-90 transition-opacity"
              >
                Apply via Stagehand
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
