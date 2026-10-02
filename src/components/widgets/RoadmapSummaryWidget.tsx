import type { CareerRoadmap } from "../../types";

export function RoadmapSummaryWidget({
  roadmap,
  onOpenRoadmapDrawer
}: {
  roadmap: CareerRoadmap;
  onOpenRoadmapDrawer: () => void;
}) {
  return (
    <div className="my-2.5 p-4 rounded-xl border border-kumo-line bg-kumo-base shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-kumo-default block">
            Career Roadmap: {roadmap.targetRole}
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-kumo-subtle mt-0.5">
            <span>{roadmap.timeframe}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{roadmap.currentMatchPercentage}% Current Readiness</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenRoadmapDrawer}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-kumo-control hover:bg-kumo-control/80 border border-kumo-line/80 text-kumo-default transition-colors"
        >
          View Full Roadmap
        </button>
      </div>

      <div className="space-y-1.5 pt-1 border-t border-kumo-line/50">
        {roadmap.keyMilestones.slice(0, 2).map((m, idx) => (
          <div key={idx} className="flex items-start gap-2 text-xs">
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-kumo-control border border-kumo-line text-kumo-default shrink-0">
              {m.quarter}
            </span>
            <span className="text-kumo-subtle truncate">{m.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
