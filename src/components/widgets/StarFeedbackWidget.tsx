import type { StarEvaluation } from "../../types";

export function StarFeedbackWidget({
  evaluation,
  onOpenAnalyticsDrawer
}: {
  evaluation: StarEvaluation;
  onOpenAnalyticsDrawer: () => void;
}) {
  return (
    <div className="my-2.5 p-4 rounded-xl border border-kumo-line bg-kumo-base shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-kumo-default block">
            STAR Evaluation Scorecard
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-kumo-subtle mt-0.5">
            <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
              {evaluation.overallScore}/10 Rating
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAnalyticsDrawer}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-kumo-control hover:bg-kumo-control/80 border border-kumo-line/80 text-kumo-default transition-colors"
        >
          View Full Breakdown
        </button>
      </div>

      <div className="space-y-1 text-xs text-kumo-subtle">
        {evaluation.keyStrengths?.[0] && (
          <div className="flex items-start gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400">✓</span>
            <span>Strength: {evaluation.keyStrengths[0]}</span>
          </div>
        )}
        {evaluation.areasForImprovement?.[0] && (
          <div className="flex items-start gap-1.5">
            <span className="text-amber-600 dark:text-amber-400">⚡</span>
            <span>Improvement: {evaluation.areasForImprovement[0]}</span>
          </div>
        )}
      </div>
    </div>
  );
}
