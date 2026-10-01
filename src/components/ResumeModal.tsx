import React, { useState } from "react";
import type { ResumeData } from "../types";
import { extractResumeText } from "../utils/documentExtractor";
import { Button, Surface, Badge, Text } from "@cloudflare/kumo";
import {
  FileTextIcon,
  UploadSimpleIcon,
  CheckCircleIcon,
  XCircleIcon,
  BriefcaseIcon,
  GraduationCapIcon,
  SparkleIcon,
  CodeIcon,
  CloudCheckIcon,
  HardDriveIcon,
  MapPinIcon,
  EnvelopeSimpleIcon,
  PhoneIcon,
  LinkSimpleIcon,
  CopyIcon,
  CheckIcon,
  XIcon
} from "@phosphor-icons/react";
import { useAppUser } from "../auth";

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile?: ResumeData;
  onSaveProfile: (profile: ResumeData, rawText?: string) => Promise<void>;
}

export function ResumeModal({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile
}: ResumeModalProps) {
  const user = useAppUser();
  const [parsingStep, setParsingStep] = useState<
    "idle" | "extracting" | "structuring" | "ready" | "error"
  >("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [extractedRawText, setExtractedRawText] = useState("");
  const [parsedData, setParsedData] = useState<ResumeData | null>(
    currentProfile || null
  );
  const [activeTab, setActiveTab] = useState<"visual" | "json" | "upload">(
    currentProfile && Object.keys(currentProfile).length > 0
      ? "visual"
      : "upload"
  );
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    try {
      setParsingStep("extracting");
      setStatusMessage(`Extracting text from ${file.name} in browser...`);

      const text = await extractResumeText(file);
      setExtractedRawText(text);

      if (!text || text.length < 30) {
        throw new Error(
          "Could not extract meaningful text from this document. Please ensure it is not scanned/image-only."
        );
      }

      setParsingStep("structuring");
      setStatusMessage("Structuring into JSON Resume format using AI...");

      const res = await fetch("/api/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: text })
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `Server returned ${res.status}`);
      }

      const data = (await res.json()) as { resume?: ResumeData };
      if (!data.resume) {
        throw new Error("Invalid response format received from parser.");
      }

      setParsedData(data.resume);
      setParsingStep("ready");
      setStatusMessage("Resume parsed successfully!");
      setActiveTab("visual");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Resume extraction failed:", err);
      setParsingStep("error");
      setStatusMessage(message || "Failed to process resume.");
    }
  };

  const handleSave = async () => {
    if (!parsedData) return;
    setIsSaving(true);
    try {
      await onSaveProfile(parsedData, extractedRawText);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to save profile:", err);
      alert(message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const copyJson = () => {
    if (!parsedData) return;
    navigator.clipboard.writeText(JSON.stringify(parsedData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const basics = parsedData?.basics;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <Surface className="relative w-full max-w-4xl rounded-2xl border border-kumo-line bg-kumo-base shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-kumo-line px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-kumo-brand/10 text-kumo-brand">
              <FileTextIcon size={22} weight="bold" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-kumo-default">
                Resume & Profile Onboarding
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Text size="xs" variant="secondary">
                  JSON Resume Schema Standard
                </Text>
                {user.isSignedIn ? (
                  <Badge
                    variant="secondary"
                    className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                  >
                    <CloudCheckIcon size={12} className="mr-0.5 inline" /> D1
                    Cloud Persistence
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/40"
                  >
                    <HardDriveIcon size={12} className="mr-0.5 inline" />{" "}
                    LocalStorage Persistence
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {parsedData && (
              <div className="flex rounded-lg border border-kumo-line p-0.5 bg-kumo-control text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("visual")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    activeTab === "visual"
                      ? "bg-kumo-base text-kumo-default shadow-xs"
                      : "text-kumo-subtle hover:text-kumo-default"
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("json")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                    activeTab === "json"
                      ? "bg-kumo-base text-kumo-default shadow-xs"
                      : "text-kumo-subtle hover:text-kumo-default"
                  }`}
                >
                  <CodeIcon size={13} />
                  JSON
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("upload")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                    activeTab === "upload"
                      ? "bg-kumo-base text-kumo-default shadow-xs"
                      : "text-kumo-subtle hover:text-kumo-default"
                  }`}
                >
                  <UploadSimpleIcon size={13} />
                  Re-upload
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-kumo-subtle hover:bg-kumo-control hover:text-kumo-default transition-colors"
              aria-label="Close dialog"
            >
              <XIcon size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* UPLOAD VIEW */}
          {(activeTab === "upload" || !parsedData) && (
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <h3 className="text-lg font-semibold text-kumo-default">
                  Upload Your Resume
                </h3>
                <p className="text-sm text-kumo-subtle">
                  Upload your resume in <strong>PDF</strong> or{" "}
                  <strong>DOCX</strong> format. We extract the text directly in
                  your browser and structure it strictly into the standard{" "}
                  <strong>JSON Resume</strong> schema.
                </p>
              </div>

              {/* Dropzone */}
              <label htmlFor="resume-file-input" aria-label="Upload resume file (.pdf, .docx, .txt)" className="relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-kumo-line hover:border-kumo-brand rounded-2xl bg-kumo-control/40 hover:bg-kumo-control cursor-pointer transition-colors group">
                <input
                  id="resume-file-input"
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={
                    parsingStep === "extracting" ||
                    parsingStep === "structuring"
                  }
                />
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-kumo-brand/10 text-kumo-brand group-hover:scale-105 transition-transform">
                    <UploadSimpleIcon size={30} weight="bold" />
                  </div>
                  <div>
                    <span className="font-semibold text-kumo-default group-hover:text-kumo-brand transition-colors">
                      Click to upload
                    </span>{" "}
                    <span className="text-kumo-subtle">or drag and drop</span>
                  </div>
                  <Text size="xs" variant="secondary">
                    Supports PDF, DOCX (Word), or TXT (Max 15MB)
                  </Text>
                </div>
              </label>

              {/* Progress & Status */}
              {(parsingStep === "extracting" ||
                parsingStep === "structuring") && (
                <div className="rounded-xl border border-kumo-line bg-kumo-control p-4 flex items-center gap-3">
                  <div className="animate-spin h-5 w-5 border-2 border-kumo-brand border-t-transparent rounded-full" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-kumo-default">
                      {statusMessage}
                    </p>
                    <p className="text-xs text-kumo-subtle">
                      {parsingStep === "extracting"
                        ? "Running in-browser parser..."
                        : "Calling Cloudflare Workers AI with JSON Resume schema..."}
                    </p>
                  </div>
                </div>
              )}

              {parsingStep === "error" && (
                <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 flex items-center gap-3 text-red-700 dark:text-red-300">
                  <XCircleIcon size={20} className="shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold">Extraction Failed</p>
                    <p>{statusMessage}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VISUAL OVERVIEW VIEW */}
          {activeTab === "visual" && parsedData && (
            <div className="space-y-6">
              {/* Basics Card */}
              <div className="rounded-xl border border-kumo-line bg-kumo-control/30 p-5 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-kumo-default">
                      {basics?.name || "Professional"}
                    </h3>
                    <p className="text-sm font-medium text-kumo-brand">
                      {basics?.label || "Career Candidate"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-kumo-subtle">
                    {basics?.email && (
                      <span className="flex items-center gap-1 bg-kumo-base px-2.5 py-1 rounded-md border border-kumo-line">
                        <EnvelopeSimpleIcon size={14} />
                        {basics.email}
                      </span>
                    )}
                    {basics?.phone && (
                      <span className="flex items-center gap-1 bg-kumo-base px-2.5 py-1 rounded-md border border-kumo-line">
                        <PhoneIcon size={14} />
                        {basics.phone}
                      </span>
                    )}
                    {basics?.location?.city && (
                      <span className="flex items-center gap-1 bg-kumo-base px-2.5 py-1 rounded-md border border-kumo-line">
                        <MapPinIcon size={14} />
                        {basics.location.city}
                        {basics.location.region
                          ? `, ${basics.location.region}`
                          : ""}
                      </span>
                    )}
                  </div>
                </div>

                {basics?.summary && (
                  <p className="text-xs leading-relaxed text-kumo-subtle border-t border-kumo-line/60 pt-3">
                    {basics.summary}
                  </p>
                )}

                {basics?.profiles && basics.profiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {basics.profiles.map((p, idx) => (
                      <a
                        key={idx}
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-kumo-brand hover:underline"
                      >
                        <LinkSimpleIcon size={12} />
                        {p.network}: {p.username || p.url}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Work Experience */}
              {parsedData.work && parsedData.work.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-kumo-default">
                    <BriefcaseIcon size={18} className="text-kumo-brand" />
                    <span>Work Experience ({parsedData.work.length})</span>
                  </div>
                  <div className="space-y-3">
                    {parsedData.work.map((w, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-kumo-line bg-kumo-base p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-kumo-default">
                              {w.position || "Position"}
                            </h4>
                            <p className="text-xs text-kumo-subtle">
                              {w.name || "Company"}
                            </p>
                          </div>
                          {(w.startDate || w.endDate) && (
                            <Badge variant="secondary" className="text-[11px]">
                              {w.startDate || ""} – {w.endDate || "Present"}
                            </Badge>
                          )}
                        </div>

                        {w.summary && (
                          <p className="text-xs text-kumo-subtle">
                            {w.summary}
                          </p>
                        )}

                        {w.highlights && w.highlights.length > 0 && (
                          <ul className="list-disc list-inside space-y-1 text-xs text-kumo-subtle">
                            {w.highlights.map((h, hIdx) => (
                              <li key={hIdx}>{h}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {parsedData.skills && parsedData.skills.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-kumo-default">
                    <SparkleIcon size={18} className="text-amber-500" />
                    <span>Skills</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {parsedData.skills.map((s, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-kumo-line bg-kumo-base p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-kumo-default">
                            {s.name}
                          </span>
                          {s.level && (
                            <Badge variant="secondary" className="text-[10px]">
                              {s.level}
                            </Badge>
                          )}
                        </div>
                        {s.keywords && (
                          <div className="flex flex-wrap gap-1.5">
                            {s.keywords.map((kw, kwIdx) => (
                              <span
                                key={kwIdx}
                                className="px-2 py-0.5 rounded-md text-[11px] bg-kumo-control text-kumo-default border border-kumo-line"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {parsedData.education && parsedData.education.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-kumo-default">
                    <GraduationCapIcon size={18} className="text-emerald-500" />
                    <span>Education</span>
                  </div>
                  <div className="space-y-2">
                    {parsedData.education.map((edu, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-kumo-line bg-kumo-base p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-semibold text-kumo-default">
                            {edu.studyType} {edu.area ? `in ${edu.area}` : ""}
                          </p>
                          <p className="text-xs text-kumo-subtle">
                            {edu.institution}
                          </p>
                        </div>
                        {(edu.startDate || edu.endDate) && (
                          <Badge variant="secondary" className="text-[11px]">
                            {edu.startDate || ""} – {edu.endDate || ""}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {parsedData.projects && parsedData.projects.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-kumo-default">
                    <CodeIcon size={18} className="text-indigo-500" />
                    <span>Projects</span>
                  </div>
                  <div className="space-y-2">
                    {parsedData.projects.map((proj, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-kumo-line bg-kumo-base p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-kumo-default">
                            {proj.name}
                          </span>
                          {proj.url && (
                            <a
                              href={proj.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-kumo-brand hover:underline"
                            >
                              Visit Project &rarr;
                            </a>
                          )}
                        </div>
                        {proj.description && (
                          <p className="text-xs text-kumo-subtle">
                            {proj.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RAW JSON VIEW */}
          {activeTab === "json" && parsedData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Text size="xs" variant="secondary">
                  Full JSON conforming to standard JSON Resume schema:
                </Text>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={
                    copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />
                  }
                  onClick={copyJson}
                >
                  {copied ? "Copied" : "Copy JSON"}
                </Button>
              </div>
              <pre className="rounded-xl border border-kumo-line bg-kumo-control p-4 text-xs font-mono text-kumo-default overflow-auto max-h-[55vh] whitespace-pre">
                {JSON.stringify(parsedData, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-kumo-line px-6 py-4 bg-kumo-base">
          <div className="flex items-center gap-2">
            {user.isSignedIn ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CloudCheckIcon size={16} />
                Saving to Cloudflare D1 ({user.fullName || user.email})
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <HardDriveIcon size={16} />
                Saving to Browser LocalStorage (Sign in with Clerk to sync
                across devices)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            {parsedData && (
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
                icon={isSaving ? undefined : <CheckCircleIcon size={16} />}
              >
                {isSaving ? "Saving..." : "Apply & Save Profile"}
              </Button>
            )}
          </div>
        </div>
      </Surface>
    </div>
  );
}
