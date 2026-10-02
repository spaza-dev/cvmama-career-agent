export function ApplicationAutomationWidget({
  company,
  role,
  step,
  onOpenHandoffDrawer
}: {
  company: string;
  role: string;
  step: string;
  onOpenHandoffDrawer: () => void;
}) {
  return (
    <div className="my-2.5 p-4 rounded-xl border border-kumo-line bg-kumo-base shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-kumo-default block">
            Stagehand Application Automation: {role} at {company}
          </span>
          <span className="text-[11px] text-kumo-subtle block mt-0.5 font-mono">
            Status: {step}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenHandoffDrawer}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-kumo-default text-kumo-base hover:opacity-90 transition-opacity"
        >
          Sign Off & Submit
        </button>
      </div>

      <div className="w-full bg-kumo-control/60 rounded-full h-1.5 overflow-hidden">
        <div className="bg-kumo-default h-full rounded-full w-3/4 animate-pulse" />
      </div>
    </div>
  );
}
