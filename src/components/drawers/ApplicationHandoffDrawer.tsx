import type { JobListing } from "../../types";

export function ApplicationHandoffDrawer({
  job,
  isOpen,
  onClose,
  onConfirmSubmit
}: {
  job: JobListing | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSubmit: () => void;
}) {
  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-kumo-base h-full shadow-2xl flex flex-col border-l border-kumo-line animate-in slide-in-from-right duration-300">
        <div className="p-4 border-b border-kumo-line flex items-center justify-between bg-kumo-elevated">
          <div>
            <h3 className="text-sm font-semibold text-kumo-default">
              Stagehand Application Handoff: {job.title}
            </h3>
            <p className="text-xs text-kumo-subtle mt-0.5">
              {job.company} · Live Portal Verification
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

        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
          <span>
            Stagehand pre-filled all form fields. Please review and sign off to finalize submission.
          </span>
          <button
            type="button"
            onClick={onConfirmSubmit}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shrink-0 ml-2"
          >
            Sign Off & Submit
          </button>
        </div>

        {/* Embedded Portal Preview Frame */}
        <div className="flex-1 bg-zinc-900 p-2 relative overflow-hidden">
          <iframe
            title="Career Portal Frame"
            src={job.url}
            className="w-full h-full rounded-lg border border-kumo-line/80 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>
    </div>
  );
}
