import { useState } from "react";
import type { TailoredPackage } from "../../types";
import { renderResumeHtml, generateDocxDocument, type TemplateStyle } from "../../tools/documentGenerator";

export function TailoredDocumentPreviewDrawer({
  pkg,
  isOpen,
  onClose
}: {
  pkg: TailoredPackage | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [style, setStyle] = useState<TemplateStyle>("modern");
  const [activeTab, setActiveTab] = useState<"resume" | "cover_letter">("resume");
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !pkg) return null;

  const htmlContent = renderResumeHtml(pkg.tailoredResume, style, activeTab === "cover_letter" ? pkg.coverLetterText : undefined);

  const handleDownloadDocx = async () => {
    setIsDownloading(true);
    try {
      const docxBytes = await generateDocxDocument(pkg.tailoredResume, pkg.coverLetterText);
      const blob = new Blob([docxBytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pkg.companyName}_Tailored_Resume.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate DOCX:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintPdf = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-kumo-base h-full shadow-2xl flex flex-col border-l border-kumo-line animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-4 border-b border-kumo-line flex items-center justify-between bg-kumo-elevated">
          <div>
            <h3 className="text-sm font-semibold text-kumo-default">
              Tailored Package: {pkg.jobTitle}
            </h3>
            <div className="flex items-center gap-2 text-xs text-kumo-subtle mt-0.5">
              <span>{pkg.companyName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                {pkg.atsMatchScore}% ATS Score
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-kumo-subtle hover:bg-kumo-control hover:text-kumo-default transition-colors text-xs"
          >
            ✕ Close
          </button>
        </div>

        {/* Drawer Controls Bar */}
        <div className="p-3 border-b border-kumo-line/60 bg-kumo-control/30 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 bg-kumo-control p-1 rounded-lg border border-kumo-line/80">
            <button
              type="button"
              onClick={() => setActiveTab("resume")}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === "resume" ? "bg-kumo-base text-kumo-default font-medium shadow-2xs" : "text-kumo-subtle hover:text-kumo-default"
              }`}
            >
              Resume
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cover_letter")}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === "cover_letter" ? "bg-kumo-base text-kumo-default font-medium shadow-2xs" : "text-kumo-subtle hover:text-kumo-default"
              }`}
            >
              Cover Letter
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as TemplateStyle)}
              className="px-2.5 py-1 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default focus:outline-none"
            >
              <option value="modern">Modern Style</option>
              <option value="executive">Executive Style</option>
              <option value="technical">Technical Style</option>
              <option value="minimalist">Minimalist Style</option>
            </select>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-kumo-control hover:bg-kumo-control/80 border border-kumo-line text-kumo-default transition-colors"
            >
              PDF Print
            </button>

            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={isDownloading}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-kumo-default text-kumo-base hover:opacity-90 transition-opacity"
            >
              {isDownloading ? "..." : "Export DOCX"}
            </button>
          </div>
        </div>

        {/* Live Document Preview Iframe */}
        <div className="flex-1 bg-zinc-100 dark:bg-zinc-950 p-4 overflow-hidden">
          <iframe
            title="Resume Document Preview"
            srcDoc={htmlContent}
            className="w-full h-full rounded-lg border border-kumo-line bg-white shadow-sm"
          />
        </div>
      </div>
    </div>
  );
}
