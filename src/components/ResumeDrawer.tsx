import React, { useState } from "react";
import type { ResumeData, ResumeWork, ResumeEducation, ResumeSkill, ResumeProject } from "../types";
import { extractResumeText } from "../utils/documentExtractor";
import { Button, Surface, Text } from "@cloudflare/kumo";
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
  CopyIcon,
  CheckIcon,
  XIcon,
  CaretRightIcon,
  CaretLeftIcon,
  PlusIcon,
  TrashIcon,
  UserIcon
} from "@phosphor-icons/react";
import { useAppUser } from "../auth";

interface ResumeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile?: ResumeData;
  onSaveProfile: (profile: ResumeData, rawText?: string) => Promise<void>;
  onParseWithAgent: (rawText: string) => Promise<ResumeData>;
}

const WIZARD_STEPS = [
  { id: "basics", title: "Basics", icon: UserIcon },
  { id: "work", title: "Experience", icon: BriefcaseIcon },
  { id: "education", title: "Education", icon: GraduationCapIcon },
  { id: "skills", title: "Skills", icon: SparkleIcon },
  { id: "projects", title: "Projects & Final", icon: CodeIcon },
] as const;

export function ResumeDrawer({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile,
  onParseWithAgent
}: ResumeDrawerProps) {
  const user = useAppUser();
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [formData, setFormData] = useState<ResumeData>(() => currentProfile || {});
  const [parsingStep, setParsingStep] = useState<"idle" | "extracting" | "agent-parsing" | "ready" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [extractedRawText, setExtractedRawText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showJsonView, setShowJsonView] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const [prevProfile, setPrevProfile] = useState<ResumeData | undefined>(currentProfile);
  if (currentProfile !== prevProfile) {
    setPrevProfile(currentProfile);
    if (currentProfile && Object.keys(currentProfile).length > 0) {
      setFormData(currentProfile);
    }
  }

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processDocument(file);
    }
  };

  const processDocument = async (file: File) => {
    try {
      // Step 1: Client-side extraction
      setParsingStep("extracting");
      setStatusMessage(`Extracting text from ${file.name} in browser...`);

      const text = await extractResumeText(file);
      setExtractedRawText(text);

      if (!text || text.length < 30) {
        throw new Error(
          "Could not extract meaningful text from this document. Please ensure it is not scanned/image-only."
        );
      }

      // Step 2: Agent LLM parsing tool via Agent RPC
      setParsingStep("agent-parsing");
      setStatusMessage("Cloudflare Agent LLM parsing text into JSON Resume schema...");

      const parsedResume = await onParseWithAgent(text);
      setFormData(parsedResume);
      setParsingStep("ready");
      setStatusMessage("Resume parsed successfully!");
      setCurrentStepIndex(0); // Start at Basics wizard step
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Resume processing failed:", err);
      setParsingStep("error");
      setStatusMessage(message || "Failed to process resume.");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveProfile(formData, extractedRawText);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to save profile:", err);
      alert(message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper updater for Basics
  const updateBasics = (field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      basics: {
        ...prev.basics,
        [field]: value
      }
    }));
  };

  const updateLocation = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      basics: {
        ...prev.basics,
        location: {
          ...prev.basics?.location,
          [field]: value
        }
      }
    }));
  };

  // Helper for Work
  const updateWorkItem = (index: number, field: keyof ResumeWork, value: unknown) => {
    setFormData((prev) => {
      const workList = [...(prev.work || [])];
      workList[index] = { ...workList[index], [field]: value };
      return { ...prev, work: workList };
    });
  };

  const addWorkItem = () => {
    setFormData((prev) => ({
      ...prev,
      work: [
        ...(prev.work || []),
        { name: "", position: "", startDate: "", endDate: "", summary: "", highlights: [] }
      ]
    }));
  };

  const removeWorkItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      work: (prev.work || []).filter((_, i) => i !== index)
    }));
  };

  // Helper for Education
  const updateEduItem = (index: number, field: keyof ResumeEducation, value: unknown) => {
    setFormData((prev) => {
      const list = [...(prev.education || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, education: list };
    });
  };

  const addEduItem = () => {
    setFormData((prev) => ({
      ...prev,
      education: [
        ...(prev.education || []),
        { institution: "", studyType: "", area: "", startDate: "", endDate: "" }
      ]
    }));
  };

  const removeEduItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      education: (prev.education || []).filter((_, i) => i !== index)
    }));
  };

  // Helper for Skills
  const updateSkillItem = (index: number, field: keyof ResumeSkill, value: unknown) => {
    setFormData((prev) => {
      const list = [...(prev.skills || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, skills: list };
    });
  };

  const addSkillItem = () => {
    setFormData((prev) => ({
      ...prev,
      skills: [
        ...(prev.skills || []),
        { name: "New Skill Group", level: "Proficient", keywords: [] }
      ]
    }));
  };

  const removeSkillItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      skills: (prev.skills || []).filter((_, i) => i !== index)
    }));
  };

  // Helper for Projects
  const updateProjectItem = (index: number, field: keyof ResumeProject, value: unknown) => {
    setFormData((prev) => {
      const list = [...(prev.projects || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, projects: list };
    });
  };

  const addProjectItem = () => {
    setFormData((prev) => ({
      ...prev,
      projects: [
        ...(prev.projects || []),
        { name: "", description: "", url: "", highlights: [] }
      ]
    }));
  };

  const removeProjectItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      projects: (prev.projects || []).filter((_, i) => i !== index)
    }));
  };

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(formData, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-end sm:flex-row animate-in fade-in duration-200">
      <Surface className="relative w-full sm:max-w-3xl lg:max-w-4xl h-[92dvh] sm:h-full border-t sm:border-t-0 sm:border-l border-kumo-line bg-kumo-base shadow-2xl flex flex-col overflow-hidden rounded-t-3xl sm:rounded-none animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
        
        {/* Mobile Drag Handle Bar */}
        <button 
          type="button"
          className="sm:hidden w-12 h-1.5 bg-kumo-line/80 rounded-full mx-auto my-2.5 shrink-0 cursor-grab active:cursor-grabbing border-0 p-0" 
          onClick={onClose}
          aria-label="Drag down to close drawer"
        />

        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-kumo-line px-4 sm:px-6 py-3 sm:py-4 bg-kumo-base shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-kumo-control border border-kumo-line/80 text-kumo-default">
              <FileTextIcon size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-kumo-default tracking-tight">
                Career Master Data Editor
              </h2>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                <Text size="xs" variant="secondary" className="hidden sm:inline">
                  Structured JSON Resume · Single Source of Truth
                </Text>
                {user.isSignedIn ? (
                  <span className="inline-flex items-center text-[10px] text-kumo-subtle font-medium px-1.5 py-0.5 rounded bg-kumo-control border border-kumo-line">
                    <CloudCheckIcon size={11} className="mr-1 text-kumo-subtle" /> D1 Cloud
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10px] text-kumo-subtle font-medium px-1.5 py-0.5 rounded bg-kumo-control border border-kumo-line">
                    <HardDriveIcon size={11} className="mr-1 text-kumo-subtle" /> Local
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={showJsonView ? <FileTextIcon size={14} className="text-kumo-subtle" /> : <CodeIcon size={14} className="text-kumo-subtle" />}
              onClick={() => setShowJsonView(!showJsonView)}
            >
              {showJsonView ? "Form" : "JSON"}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-kumo-subtle hover:bg-kumo-control hover:text-kumo-default transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
              aria-label="Close drawer"
            >
              <XIcon size={18} />
            </button>
          </div>
        </div>

        {/* Wizard Steps Bar */}
        {!showJsonView && (
          <div className="border-b border-kumo-line bg-kumo-control/30 px-3 sm:px-6 py-2 shrink-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 min-w-max">
              {WIZARD_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = currentStepIndex === idx;
                const isPast = currentStepIndex > idx;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setCurrentStepIndex(idx)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all min-h-[38px] active:scale-[0.97] ${
                      isActive
                        ? "bg-kumo-brand text-kumo-inverse shadow-xs"
                        : isPast
                          ? "bg-kumo-base text-kumo-default border border-kumo-line"
                          : "text-kumo-subtle hover:text-kumo-default hover:bg-kumo-control"
                    }`}
                  >
                    <Icon size={14} weight={isActive ? "bold" : "regular"} className={isActive ? "text-kumo-inverse" : "text-kumo-subtle"} />
                    <span>
                      {idx + 1}. {step.title}
                    </span>
                    {isPast && <CheckIcon size={12} className="text-kumo-subtle" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* UPLOAD STRIP (Client Extraction -> Agent LLM Parsing) */}
          <div className="rounded-xl border border-dashed border-kumo-line bg-kumo-control/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-kumo-control border border-kumo-line/80 text-kumo-default">
                <UploadSimpleIcon size={16} className="text-kumo-subtle" />
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-kumo-default">
                  {formData.basics?.name
                    ? `Loaded: ${formData.basics.name} • Re-upload document anytime`
                    : "Upload your resume file (.pdf, .docx, .txt)"}
                </p>
                <p className="text-[11px] text-kumo-subtle">
                  Extracted in-browser & parsed by the Cloudflare Agent.
                </p>
              </div>
            </div>

            <label
              className="shrink-0 cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-kumo-base border border-kumo-line text-kumo-default hover:bg-kumo-control transition-colors"
            >
              <UploadSimpleIcon size={13} className="text-kumo-subtle" />
              <span>{formData.basics?.name ? "Replace Resume" : "Select File"}</span>
              <input
                type="file"
                aria-label="Upload resume file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={handleFileUpload}
                className="hidden"
                disabled={parsingStep === "extracting" || parsingStep === "agent-parsing"}
              />
            </label>
          </div>

          {/* Parsing progress alert */}
          {(parsingStep === "extracting" || parsingStep === "agent-parsing") && (
            <div className="rounded-xl border border-kumo-line bg-kumo-control p-4 flex items-center gap-3">
              <div className="animate-spin h-4 w-4 border-2 border-kumo-default border-t-transparent rounded-full" />
              <div className="flex-1">
                <p className="text-sm font-medium text-kumo-default">{statusMessage}</p>
                <p className="text-xs text-kumo-subtle">
                  {parsingStep === "extracting"
                    ? "Running browser text extractor..."
                    : "Agent calling LLM tool to build JSON Resume schema..."}
                </p>
              </div>
            </div>
          )}

          {parsingStep === "error" && (
            <div className="rounded-xl border border-kumo-line bg-kumo-control p-4 flex items-center gap-3 text-kumo-default">
              <XCircleIcon size={18} className="shrink-0 text-kumo-subtle" />
              <div className="text-xs">
                <p className="font-semibold">Processing Failed</p>
                <p className="text-kumo-subtle">{statusMessage}</p>
              </div>
            </div>
          )}

          {/* JSON VIEW */}
          {showJsonView ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Text size="xs" variant="secondary">
                  Complete JSON conforming to standard JSON Resume schema:
                </Text>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={copiedJson ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                  onClick={copyJson}
                >
                  {copiedJson ? "Copied" : "Copy JSON"}
                </Button>
              </div>
              <pre className="rounded-xl border border-kumo-line bg-kumo-control p-4 text-xs font-mono text-kumo-default overflow-auto max-h-[60vh] whitespace-pre">
                {JSON.stringify(formData, null, 2)}
              </pre>
            </div>
          ) : (
            /* WIZARD FORM STEPS */
            <div className="space-y-6">

              {/* STEP 1: BASICS */}
              {currentStepIndex === 0 && (
                <div className="space-y-4">
                  <div className="border-b border-kumo-line pb-2">
                    <h3 className="text-sm font-semibold text-kumo-default">
                      1. Basic Contact & Personal Information
                    </h3>
                    <p className="text-xs text-kumo-subtle">
                      Confirm your full name, headline, contact details, and career summary.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="block text-xs font-medium text-kumo-default mb-1">
                        Full Name
                      </span>
                      <input
                        type="text"
                        value={formData.basics?.name || ""}
                        onChange={(e) => updateBasics("name", e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-kumo-line bg-kumo-base text-kumo-default focus:outline-none focus:ring-1 focus:ring-kumo-ring"
                      />
                    </label>

                    <label className="block">
                      <span className="block text-xs font-medium text-kumo-default mb-1">
                        Professional Title / Headline
                      </span>
                      <input
                        type="text"
                        value={formData.basics?.label || ""}
                        onChange={(e) => updateBasics("label", e.target.value)}
                        placeholder="e.g. Senior Full-Stack Engineer"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-kumo-line bg-kumo-base text-kumo-default focus:outline-none focus:ring-1 focus:ring-kumo-ring"
                      />
                    </label>

                    <label className="block">
                      <span className="block text-xs font-medium text-kumo-default mb-1">
                        Email Address
                      </span>
                      <input
                        type="email"
                        value={formData.basics?.email || ""}
                        onChange={(e) => updateBasics("email", e.target.value)}
                        placeholder="alex@example.com"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-kumo-line bg-kumo-base text-kumo-default focus:outline-none focus:ring-1 focus:ring-kumo-ring"
                      />
                    </label>

                    <label className="block">
                      <span className="block text-xs font-medium text-kumo-default mb-1">
                        Phone Number
                      </span>
                      <input
                        type="text"
                        value={formData.basics?.phone || ""}
                        onChange={(e) => updateBasics("phone", e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-kumo-line bg-kumo-base text-kumo-default focus:outline-none focus:ring-1 focus:ring-kumo-ring"
                      />
                    </label>

                    <label className="block">
                      <span className="block text-xs font-medium text-kumo-default mb-1">
                        Location (City, State / Region)
                      </span>
                      <input
                        type="text"
                        value={formData.basics?.location?.city || ""}
                        onChange={(e) => updateLocation("city", e.target.value)}
                        placeholder="San Francisco, CA"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-kumo-line bg-kumo-base text-kumo-default focus:outline-none focus:ring-1 focus:ring-kumo-ring"
                      />
                    </label>

                    <label className="block">
                      <span className="block text-xs font-medium text-kumo-default mb-1">
                        Website / Portfolio URL
                      </span>
                      <input
                        type="text"
                        value={formData.basics?.url || ""}
                        onChange={(e) => updateBasics("url", e.target.value)}
                        placeholder="https://alexmorgan.dev"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-kumo-line bg-kumo-base text-kumo-default focus:outline-none focus:ring-1 focus:ring-kumo-ring"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="block text-xs font-medium text-kumo-default mb-1">
                      Professional Summary
                    </span>
                    <textarea
                      rows={4}
                      value={formData.basics?.summary || ""}
                      onChange={(e) => updateBasics("summary", e.target.value)}
                      placeholder="Concise overview of your experience, key strengths, and career objectives..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-kumo-line bg-kumo-base text-kumo-default focus:outline-none focus:ring-1 focus:ring-kumo-ring resize-y"
                    />
                  </label>
                </div>
              )}

              {/* STEP 2: WORK EXPERIENCE */}
              {currentStepIndex === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-kumo-line pb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-kumo-default">
                        2. Work Experience
                      </h3>
                      <p className="text-xs text-kumo-subtle">
                        Positions, companies, dates, and measurable accomplishments.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<PlusIcon size={14} />}
                      onClick={addWorkItem}
                    >
                      Add Role
                    </Button>
                  </div>

                  {(!formData.work || formData.work.length === 0) ? (
                    <div className="text-center py-8 rounded-xl border border-dashed border-kumo-line p-6">
                      <p className="text-xs text-kumo-subtle mb-3">No work experience entries added yet.</p>
                      <Button variant="secondary" size="sm" onClick={addWorkItem} icon={<PlusIcon size={14} />}>
                        Add First Role
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.work.map((work, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-kumo-line bg-kumo-control/20 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-kumo-default">
                              Role #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeWorkItem(idx)}
                              className="text-kumo-subtle hover:text-kumo-default hover:bg-kumo-control p-1 rounded-md transition-colors"
                              aria-label={`Remove role ${idx + 1}`}
                            >
                              <TrashIcon size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="block">
                              <span className="block text-[11px] font-medium text-kumo-default mb-1">
                                Company
                              </span>
                              <input
                                type="text"
                                value={work.name || ""}
                                onChange={(e) => updateWorkItem(idx, "name", e.target.value)}
                                placeholder="Company Name"
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default"
                              />
                            </label>
                            <label className="block">
                              <span className="block text-[11px] font-medium text-kumo-default mb-1">
                                Position / Job Title
                              </span>
                              <input
                                type="text"
                                value={work.position || ""}
                                onChange={(e) => updateWorkItem(idx, "position", e.target.value)}
                                placeholder="Job Title"
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default"
                              />
                            </label>
                            <label className="block">
                              <span className="block text-[11px] font-medium text-kumo-default mb-1">
                                Start Date
                              </span>
                              <input
                                type="text"
                                value={work.startDate || ""}
                                onChange={(e) => updateWorkItem(idx, "startDate", e.target.value)}
                                placeholder="YYYY-MM or YYYY"
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default"
                              />
                            </label>
                            <label className="block">
                              <span className="block text-[11px] font-medium text-kumo-default mb-1">
                                End Date
                              </span>
                              <input
                                type="text"
                                value={work.endDate || ""}
                                onChange={(e) => updateWorkItem(idx, "endDate", e.target.value)}
                                placeholder="Present or YYYY-MM"
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default"
                              />
                            </label>
                          </div>

                          <label className="block">
                            <span className="block text-[11px] font-medium text-kumo-default mb-1">
                              Summary / Responsibilities
                            </span>
                            <textarea
                              rows={2}
                              value={work.summary || ""}
                              onChange={(e) => updateWorkItem(idx, "summary", e.target.value)}
                              placeholder="Overview of this role..."
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default resize-y"
                            />
                          </label>

                          <label className="block">
                            <span className="block text-[11px] font-medium text-kumo-default mb-1">
                              Key Highlights (one per line)
                            </span>
                            <textarea
                              rows={3}
                              value={(work.highlights || []).join("\n")}
                              onChange={(e) =>
                                updateWorkItem(
                                  idx,
                                  "highlights",
                                  e.target.value.split("\n").filter((l) => l.trim().length > 0)
                                )
                              }
                              placeholder="Bullet point 1&#10;Bullet point 2"
                              className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-kumo-line bg-kumo-base text-kumo-default resize-y"
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: EDUCATION & CERTIFICATIONS */}
              {currentStepIndex === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-kumo-line pb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-kumo-default">
                        3. Education & Credentials
                      </h3>
                      <p className="text-xs text-kumo-subtle">
                        Degrees, universities, graduation years, and certifications.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<PlusIcon size={14} />}
                      onClick={addEduItem}
                    >
                      Add Education
                    </Button>
                  </div>

                  {(!formData.education || formData.education.length === 0) ? (
                    <div className="text-center py-8 rounded-xl border border-dashed border-kumo-line p-6">
                      <p className="text-xs text-kumo-subtle mb-3">No education records found.</p>
                      <Button variant="secondary" size="sm" onClick={addEduItem} icon={<PlusIcon size={14} />}>
                        Add Education
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.education.map((edu, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-kumo-line bg-kumo-control/20 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-kumo-default">
                              Institution #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeEduItem(idx)}
                              className="text-kumo-subtle hover:text-kumo-default hover:bg-kumo-control p-1 rounded-md transition-colors"
                              aria-label={`Remove education ${idx + 1}`}
                            >
                              <TrashIcon size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="block">
                              <span className="block text-[11px] font-medium text-kumo-default mb-1">
                                Institution / University
                              </span>
                              <input
                                type="text"
                                value={edu.institution || ""}
                                onChange={(e) => updateEduItem(idx, "institution", e.target.value)}
                                placeholder="e.g. Stanford University"
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default"
                              />
                            </label>
                            <label className="block">
                              <span className="block text-[11px] font-medium text-kumo-default mb-1">
                                Degree / Study Type
                              </span>
                              <input
                                type="text"
                                value={edu.studyType || ""}
                                onChange={(e) => updateEduItem(idx, "studyType", e.target.value)}
                                placeholder="e.g. Bachelor of Science"
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default"
                              />
                            </label>
                            <label className="block">
                              <span className="block text-[11px] font-medium text-kumo-default mb-1">
                                Field of Study / Major
                              </span>
                              <input
                                type="text"
                                value={edu.area || ""}
                                onChange={(e) => updateEduItem(idx, "area", e.target.value)}
                                placeholder="e.g. Computer Science"
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default"
                              />
                            </label>
                            <label className="block">
                              <span className="block text-[11px] font-medium text-kumo-default mb-1">
                                Graduation Year / Date
                              </span>
                              <input
                                type="text"
                                value={edu.endDate || ""}
                                onChange={(e) => updateEduItem(idx, "endDate", e.target.value)}
                                placeholder="e.g. 2022"
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default"
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: SKILLS */}
              {currentStepIndex === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-kumo-line pb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-kumo-default">
                        4. Skills & Competencies
                      </h3>
                      <p className="text-xs text-kumo-subtle">
                        Skill categories and associated keywords/technologies.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<PlusIcon size={14} />}
                      onClick={addSkillItem}
                    >
                      Add Category
                    </Button>
                  </div>

                  {(!formData.skills || formData.skills.length === 0) ? (
                    <div className="text-center py-8 rounded-xl border border-dashed border-kumo-line p-6">
                      <p className="text-xs text-kumo-subtle mb-3">No skills extracted yet.</p>
                      <Button variant="secondary" size="sm" onClick={addSkillItem} icon={<PlusIcon size={14} />}>
                        Add Skill Category
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.skills.map((skill, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-kumo-line bg-kumo-control/20 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-kumo-default">
                              Category #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeSkillItem(idx)}
                              className="text-kumo-subtle hover:text-kumo-default hover:bg-kumo-control p-1 rounded-md transition-colors"
                              aria-label={`Remove skill category ${idx + 1}`}
                            >
                              <TrashIcon size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="block">
                              <span className="block text-[11px] font-medium text-kumo-default mb-1">
                                Category Name
                              </span>
                              <input
                                type="text"
                                value={skill.name || ""}
                                onChange={(e) => updateSkillItem(idx, "name", e.target.value)}
                                placeholder="e.g. Backend Development"
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default"
                              />
                            </label>
                            <label className="block">
                              <span className="block text-[11px] font-medium text-kumo-default mb-1">
                                Proficiency Level
                              </span>
                              <input
                                type="text"
                                value={skill.level || ""}
                                onChange={(e) => updateSkillItem(idx, "level", e.target.value)}
                                placeholder="e.g. Expert, Advanced"
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default"
                              />
                            </label>
                          </div>

                          <label className="block">
                            <span className="block text-[11px] font-medium text-kumo-default mb-1">
                              Keywords / Technologies (comma separated)
                            </span>
                            <input
                              type="text"
                              value={(skill.keywords || []).join(", ")}
                              onChange={(e) =>
                                updateSkillItem(
                                  idx,
                                  "keywords",
                                  e.target.value.split(",").map((k) => k.trim()).filter(Boolean)
                                )
                              }
                              placeholder="e.g. Node.js, TypeScript, Cloudflare Workers, PostgreSQL"
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default"
                            />
                          </label>

                          {skill.keywords && skill.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {skill.keywords.map((kw, kwIdx) => (
                                <span
                                  key={kwIdx}
                                  className="px-2 py-0.5 rounded-md text-[11px] bg-kumo-base text-kumo-default border border-kumo-line"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: PROJECTS & FINAL REVIEW */}
              {currentStepIndex === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-kumo-line pb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-kumo-default">
                        5. Projects & Confirmation
                      </h3>
                      <p className="text-xs text-kumo-subtle">
                        Key projects, URLs, and final profile summary.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<PlusIcon size={14} />}
                      onClick={addProjectItem}
                    >
                      Add Project
                    </Button>
                  </div>

                  {formData.projects && formData.projects.length > 0 && (
                    <div className="space-y-3">
                      {formData.projects.map((proj, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-kumo-line bg-kumo-control/20 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-kumo-default">
                              Project #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeProjectItem(idx)}
                              className="text-kumo-subtle hover:text-kumo-default hover:bg-kumo-control p-1 rounded-md transition-colors"
                              aria-label={`Remove project ${idx + 1}`}
                            >
                              <TrashIcon size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="block">
                              <span className="block text-[11px] font-medium text-kumo-default mb-1">
                                Project Name
                              </span>
                              <input
                                type="text"
                                value={proj.name || ""}
                                onChange={(e) => updateProjectItem(idx, "name", e.target.value)}
                                placeholder="Project Name"
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default"
                              />
                            </label>
                            <label className="block">
                              <span className="block text-[11px] font-medium text-kumo-default mb-1">
                                Project URL
                              </span>
                              <input
                                type="text"
                                value={proj.url || ""}
                                onChange={(e) => updateProjectItem(idx, "url", e.target.value)}
                                placeholder="https://github.com/..."
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default"
                              />
                            </label>
                          </div>

                          <label className="block">
                            <span className="block text-[11px] font-medium text-kumo-default mb-1">
                              Description
                            </span>
                            <textarea
                              rows={2}
                              value={proj.description || ""}
                              onChange={(e) => updateProjectItem(idx, "description", e.target.value)}
                              placeholder="Key features and technical stack used..."
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default resize-y"
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Overview summary card */}
                  <div className="rounded-xl border border-kumo-line bg-kumo-base p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-kumo-default">
                      Summary of Profile to be Saved:
                    </h4>
                    <div className="text-xs text-kumo-subtle space-y-1">
                      <p>
                        <strong>Name:</strong> {formData.basics?.name || "Not provided"}
                      </p>
                      <p>
                        <strong>Title:</strong> {formData.basics?.label || "Not provided"}
                      </p>
                      <p>
                        <strong>Work Roles:</strong> {formData.work?.length || 0} entries
                      </p>
                      <p>
                        <strong>Education:</strong> {formData.education?.length || 0} entries
                      </p>
                      <p>
                        <strong>Skill Categories:</strong> {formData.skills?.length || 0} groups
                      </p>
                      <p>
                        <strong>Target Destination:</strong>{" "}
                        {user.isSignedIn ? "Cloudflare D1 Database" : "Browser LocalStorage & Agent In-Memory"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer / Step Controls */}
        <div className="flex items-center justify-between border-t border-kumo-line px-6 py-4 bg-kumo-base shrink-0">
          <div className="flex items-center gap-2">
            {!showJsonView && currentStepIndex > 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon={<CaretLeftIcon size={14} />}
                onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
              >
                Previous Step
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>

            {!showJsonView && currentStepIndex < WIZARD_STEPS.length - 1 ? (
              <Button
                variant="primary"
                icon={<CaretRightIcon size={14} />}
                onClick={() => setCurrentStepIndex((prev) => Math.min(WIZARD_STEPS.length - 1, prev + 1))}
              >
                Next Step
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
                icon={isSaving ? undefined : <CheckCircleIcon size={16} />}
              >
                {isSaving ? "Saving..." : "Confirm & Save Master Data"}
              </Button>
            )}
          </div>
        </div>
      </Surface>
    </div>
  );
}
