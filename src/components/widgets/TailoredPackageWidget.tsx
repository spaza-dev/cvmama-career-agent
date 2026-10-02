import type { TailoredPackage } from "../../types";

export function TailoredPackageWidget({
  pkg,
  onOpenPreviewDrawer
}: {
  pkg: TailoredPackage;
  onOpenPreviewDrawer: () => void;
}) {
  return (
    <div className="my-2.5 p-4 rounded-xl border border-kumo-line bg-kumo-base shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-kumo-default block">
            Tailored Package: {pkg.jobTitle}
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-kumo-subtle mt-0.5">
            <span>{pkg.companyName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
              {pkg.atsMatchScore}% ATS Alignment
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenPreviewDrawer}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-kumo-default text-kumo-base hover:opacity-90 transition-opacity"
        >
          Preview PDF & DOCX
        </button>
      </div>

      <div className="space-y-1 text-xs text-kumo-subtle pt-1">
        {pkg.keyEditsSummary.slice(0, 2).map((edit, idx) => (
          <div key={idx} className="flex items-start gap-1.5">
            <span className="text-kumo-default">✓</span>
            <span>{edit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
