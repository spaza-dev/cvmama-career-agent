import type { ResumeData } from "../../types";

export function ResumeOnboardingWidget({
  resume,
  onConfirm,
  onInspectDrawer
}: {
  resume: ResumeData;
  onConfirm: () => void;
  onInspectDrawer: () => void;
}) {
  const basics = resume.basics || {};
  const workCount = resume.work?.length || 0;
  const skillCount = resume.skills?.length || 0;
  const eduCount = resume.education?.length || 0;

  return (
    <div className="my-2.5 p-4 rounded-xl border border-kumo-line bg-kumo-base shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-kumo-default block">
            {basics.name || "Candidate Profile Extracted"}
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-kumo-subtle mt-0.5">
            <span>{basics.label || "Professional"}</span>
            <span aria-hidden="true">·</span>
            <span>{workCount} Role{workCount !== 1 ? "s" : ""}</span>
            <span aria-hidden="true">·</span>
            <span>{skillCount} Skill{skillCount !== 1 ? "s" : ""}</span>
            <span aria-hidden="true">·</span>
            <span>{eduCount} Education</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onInspectDrawer}
          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-kumo-control hover:bg-kumo-control/80 border border-kumo-line/80 text-kumo-default transition-colors"
        >
          Inspect in Drawer
        </button>
      </div>

      <div className="pt-2 border-t border-kumo-line/60 flex items-center justify-between gap-3">
        <span className="text-[11px] text-kumo-subtle">
          Lock as single source of truth for tailored applications & coaching:
        </span>
        <button
          type="button"
          onClick={onConfirm}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-kumo-default text-kumo-base hover:opacity-90 transition-opacity shrink-0"
        >
          Confirm Master Data
        </button>
      </div>
    </div>
  );
}
