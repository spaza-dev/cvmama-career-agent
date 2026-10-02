import { Suspense, useCallback, useState, useEffect, useRef } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { getToolName, isToolUIPart, type UIMessage } from "ai";
import type { MCPServersState } from "agents";
import type { ChatAgent } from "./server";
import {
  Badge,
  Button,
  Surface,
  Switch,
  Text
} from "@cloudflare/kumo";
import { useKumoToastManager } from "@cloudflare/kumo/components/toast";
import {
  MoonIcon,
  SunIcon,
  CheckCircleIcon,
  XCircleIcon,
  BrainIcon,
  BugIcon,
  PlugsConnectedIcon,
  PlusIcon,
  SignInIcon,
  TrashIcon,
  WrenchIcon,
  UploadSimpleIcon,
  IdentificationCardIcon,
  ShareNetworkIcon,
  PlusCircleIcon,
  ListIcon,
  XIcon
} from "@phosphor-icons/react";
import { useAppUser, AuthNavControls } from "./auth";
import { ResumeDrawer } from "./components/ResumeDrawer";
import { Logo } from "./components/Logo";
import { PWAInstallBanner } from "./components/PWAInstallBanner";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { extractResumeText } from "./utils/documentExtractor";
import { type ResumeData, type JobListing, type TailoredPackage, type CareerRoadmap, type InterviewQuestion, type StarEvaluation, isProfileOnboarded } from "./types";
import {
  getOrCreateGuestSessionId,
  createNewGuestSession,
  getSessionShareUrl
} from "./utils/session";

// Import Widgets
import { ResumeOnboardingWidget } from "./components/widgets/ResumeOnboardingWidget";
import { TailoredPackageWidget } from "./components/widgets/TailoredPackageWidget";
import { JobMatchCardWidget } from "./components/widgets/JobMatchCardWidget";
import { ApplicationAutomationWidget } from "./components/widgets/ApplicationAutomationWidget";
import { RoadmapSummaryWidget } from "./components/widgets/RoadmapSummaryWidget";
import { MockInterviewQuestionWidget } from "./components/widgets/MockInterviewQuestionWidget";
import { StarFeedbackWidget } from "./components/widgets/StarFeedbackWidget";

// Import Drawers
import { TailoredDocumentPreviewDrawer } from "./components/drawers/TailoredDocumentPreviewDrawer";
import { ApplicationHandoffDrawer } from "./components/drawers/ApplicationHandoffDrawer";
import { CareerRoadmapDrawer } from "./components/drawers/CareerRoadmapDrawer";
import { InterviewStudioDrawer } from "./components/drawers/InterviewStudioDrawer";
import { JobDetailsDrawer } from "./components/drawers/JobDetailsDrawer";

interface Attachment {
  id: string;
  file: File;
  preview: string;
  mediaType: string;
}

function createAttachment(file: File): Attachment {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    preview: URL.createObjectURL(file),
    mediaType: file.type || "application/octet-stream"
  };
}

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ThemeToggle() {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute("data-mode") === "dark"
  );

  const toggle = useCallback(() => {
    const next = !dark;
    setDark(next);
    const mode = next ? "dark" : "light";
    document.documentElement.setAttribute("data-mode", mode);
    document.documentElement.style.colorScheme = mode;
    localStorage.setItem("theme", mode);
  }, [dark]);

  return (
    <Button
      variant="secondary"
      shape="square"
      icon={dark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
      onClick={toggle}
      aria-label="Toggle theme"
    />
  );
}

function ToolIO({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null) return null;
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (!text) return null;
  return (
    <div className="mt-1">
      <Text size="xs" variant="secondary" bold>
        {label}
      </Text>
      <pre className="mt-0.5 font-mono text-xs text-kumo-subtle whitespace-pre-wrap overflow-auto max-h-64">
        {text}
      </pre>
    </div>
  );
}

function ToolPartView({
  part,
  addToolApprovalResponse,
  onOpenDrawer,
  onConfirmMasterData,
  onOpenPreviewDrawer,
  onOpenHandoffDrawer,
  onOpenRoadmapDrawer,
  onOpenStudioDrawer,
  onOpenJobDetailsDrawer,
  onApplyJob
}: {
  part: UIMessage["parts"][number];
  addToolApprovalResponse: (response: { id: string; approved: boolean }) => void;
  onOpenDrawer?: () => void;
  onConfirmMasterData?: (profile: ResumeData) => void;
  onOpenPreviewDrawer?: (pkg: TailoredPackage) => void;
  onOpenHandoffDrawer?: (job: JobListing) => void;
  onOpenRoadmapDrawer?: (roadmap: CareerRoadmap) => void;
  onOpenStudioDrawer?: (question: InterviewQuestion) => void;
  onOpenJobDetailsDrawer?: (job: JobListing) => void;
  onApplyJob?: (job: JobListing) => void;
}) {
  if (!isToolUIPart(part)) return null;

  const toolName = getToolName(part);

  if (part.state === "approval-requested") {
    const approvalId = part.approval?.id;
    return (
      <div className="my-2 p-3.5 rounded-xl border border-kumo-line bg-kumo-base shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainIcon size={15} className="text-kumo-subtle" />
            <Text size="xs" bold>
              Tool Approval: {toolName}
            </Text>
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={<CheckCircleIcon size={14} />}
              onClick={() => {
                if (approvalId) {
                  addToolApprovalResponse({ id: approvalId, approved: true });
                }
              }}
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<XCircleIcon size={14} />}
              onClick={() => {
                if (approvalId) {
                  addToolApprovalResponse({ id: approvalId, approved: false });
                }
              }}
            >
              Deny
            </Button>
          </div>
        </div>
        <ToolIO label="Parameters" value={part.input} />
      </div>
    );
  }

  if (part.state === "output-available") {
    const outputObj =
      typeof part.output === "object" && part.output !== null
        ? (part.output as Record<string, unknown>)
        : null;

    // 1. Resume Parsing
    if (toolName === "parseResume" || toolName === "parseResumeText") {
      const resumeData = (outputObj?.resume as ResumeData) || (outputObj?.profile as ResumeData);
      if (resumeData && onConfirmMasterData && onOpenDrawer) {
        return (
          <ResumeOnboardingWidget
            resume={resumeData}
            onConfirm={() => onConfirmMasterData(resumeData)}
            onInspectDrawer={onOpenDrawer}
          />
        );
      }
    }

    // 2. Job Sourcing & Matching
    if (toolName === "sourceJobListings" || toolName === "runJobSearchWorkflow") {
      const jobs = (outputObj?.jobs as JobListing[]) || [];
      if (jobs.length > 0 && onApplyJob && onOpenJobDetailsDrawer) {
        return (
          <JobMatchCardWidget
            jobs={jobs}
            onApplyJob={onApplyJob}
            onOpenDetailsDrawer={onOpenJobDetailsDrawer}
          />
        );
      }
    }

    // 3. Tailored Package Generation
    if (toolName === "generateTailoredPackage" || toolName === "runApplicationAutomationWorkflow") {
      const pkg = (outputObj?.package as TailoredPackage) || (outputObj as unknown as TailoredPackage);
      if (pkg?.jobTitle && onOpenPreviewDrawer) {
        return (
          <TailoredPackageWidget
            pkg={pkg}
            onOpenPreviewDrawer={() => onOpenPreviewDrawer(pkg)}
          />
        );
      }
    }

    // 4. Career Roadmap
    if (toolName === "generateCareerRoadmap" || toolName === "runCareerRoadmapWorkflow") {
      const roadmap = (outputObj?.roadmap as CareerRoadmap) || (outputObj as unknown as CareerRoadmap);
      if (roadmap?.targetRole && onOpenRoadmapDrawer) {
        return (
          <RoadmapSummaryWidget
            roadmap={roadmap}
            onOpenRoadmapDrawer={() => onOpenRoadmapDrawer(roadmap)}
          />
        );
      }
    }

    // 5. Interview Questions & Evaluation
    if (toolName === "generateInterviewQuestions") {
      const questions = (outputObj as unknown as InterviewQuestion[]) || (outputObj?.questions as InterviewQuestion[]) || [];
      if (questions.length > 0 && onOpenStudioDrawer) {
        return (
          <MockInterviewQuestionWidget
            question={questions[0]}
            onSubmitAnswer={() => {}}
            onOpenStudioDrawer={() => onOpenStudioDrawer(questions[0])}
          />
        );
      }
    }

    if (toolName === "evaluateStarResponse") {
      const evaluation = outputObj as unknown as StarEvaluation;
      if (evaluation?.overallScore) {
        return (
          <StarFeedbackWidget
            evaluation={evaluation}
            onOpenAnalyticsDrawer={() => {}}
          />
        );
      }
    }

    return (
      <div className="my-2">
        <Surface className="p-3.5 rounded-xl text-xs border border-kumo-line bg-kumo-base shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-kumo-default">
              <CheckCircleIcon size={15} className="text-kumo-subtle" />
              <Text size="xs" bold>{toolName}</Text>
            </div>
          </div>
          <ToolIO label="Result" value={part.output} />
        </Surface>
      </div>
    );
  }

  if (part.state === "input-available") {
    return (
      <div className="my-1">
        <Surface className="p-2.5 rounded-xl text-xs border border-kumo-line bg-kumo-base shadow-xs">
          <div className="flex items-center gap-1.5 text-kumo-subtle">
            <BrainIcon size={14} className="animate-spin text-kumo-subtle" />
            <Text size="xs">Running {toolName}...</Text>
          </div>
        </Surface>
      </div>
    );
  }

  return null;
}

const LOCAL_STORAGE_KEY = "career_coach_resume_profile";

function Chat() {
  const user = useAppUser();
  const isDev = Boolean(import.meta.env.DEV);
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [resumeProfile, setResumeProfile] = useState<ResumeData | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Drawer States
  const [isResumeDrawerOpen, setIsResumeDrawerOpen] = useState(false);
  const [activeTailoredPackage, setActiveTailoredPackage] = useState<TailoredPackage | null>(null);
  const [isTailoredDrawerOpen, setIsTailoredDrawerOpen] = useState(false);
  const [activeJobForHandoff, setActiveJobForHandoff] = useState<JobListing | null>(null);
  const [isHandoffDrawerOpen, setIsHandoffDrawerOpen] = useState(false);
  const [activeRoadmap, setActiveRoadmap] = useState<CareerRoadmap | null>(null);
  const [isRoadmapDrawerOpen, setIsRoadmapDrawerOpen] = useState(false);
  const [activeInterviewQuestion, setActiveInterviewQuestion] = useState<InterviewQuestion | null>(null);
  const [isInterviewStudioOpen, setIsInterviewStudioOpen] = useState(false);
  const [activeJobDetails, setActiveJobDetails] = useState<JobListing | null>(null);
  const [isJobDetailsDrawerOpen, setIsJobDetailsDrawerOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasSyncedSessionRef = useRef<string | null>(null);
  const lastNotifiedProfileRef = useRef<string>(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });
  const toasts = useKumoToastManager();

  const [mcpState, setMcpState] = useState<MCPServersState>({
    prompts: [],
    resources: [],
    servers: {},
    tools: []
  });
  const [showMcpPanel, setShowMcpPanel] = useState(false);
  const [mcpName, setMcpName] = useState("");
  const [mcpUrl, setMcpUrl] = useState("");
  const [isAddingServer, setIsAddingServer] = useState(false);
  const mcpPanelRef = useRef<HTMLDivElement>(null);

  const [guestSessionId, setGuestSessionId] = useState<string>(() => getOrCreateGuestSessionId());
  const agentName = user.isSignedIn && user.userId ? `user_${user.userId}` : guestSessionId;

  const handleCopySyncLink = useCallback(() => {
    const shareUrl = getSessionShareUrl(agentName);
    navigator.clipboard.writeText(shareUrl).then(() => {
      toasts.add({ title: "Session Sync Link Copied", description: shareUrl });
    });
  }, [agentName, toasts]);

  const handleCreateNewSession = useCallback(() => {
    const freshId = createNewGuestSession();
    setGuestSessionId(freshId);
    hasSyncedSessionRef.current = null;
    toasts.add({ title: "New Session Created", description: "Switched to fresh agent instance." });
  }, [toasts]);

  const agent = useAgent<ChatAgent>({
    agent: "ChatAgent",
    name: agentName,
    onOpen: useCallback(() => setConnected(true), []),
    onClose: useCallback(() => setConnected(false), []),
    onError: useCallback((error: Event) => console.error("WebSocket error:", error), []),
    onMcpUpdate: useCallback((state: MCPServersState) => setMcpState(state), []),
    onStateUpdate: useCallback((state: CareerState) => {
      if (state?.profile && isProfileOnboarded(state.profile)) {
        setResumeProfile(state.profile);
        if (!user.isSignedIn) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state.profile));
        }
      }
    }, [user.isSignedIn]),
    onMessage: useCallback((message: MessageEvent) => {
      try {
        const data = JSON.parse(String(message.data)) as { type?: string; description?: string; profile?: ResumeData };
        if (data?.type === "master-data-saved" && data.profile) {
          const profileKey = JSON.stringify(data.profile);
          setResumeProfile(data.profile);
          if (!user.isSignedIn) {
            localStorage.setItem(LOCAL_STORAGE_KEY, profileKey);
          }
          if (lastNotifiedProfileRef.current !== profileKey) {
            lastNotifiedProfileRef.current = profileKey;
            toasts.add({ title: "Master Data Saved", description: "Active across all services." });
          }
        }
      } catch {}
    }, [toasts, user.isSignedIn])
  });

  const isOnboarded = Boolean(
    isProfileOnboarded(resumeProfile) || (agent.state?.isOnboarded && isProfileOnboarded(agent.state?.profile))
  );

  const handleSaveProfile = useCallback(
    async (profile: ResumeData, rawText?: string) => {
      const profileKey = JSON.stringify(profile);
      lastNotifiedProfileRef.current = profileKey;
      setResumeProfile(profile);

      if (user.isSignedIn && user.userId) {
        await agent.stub.setProfile(profile, user.userId, rawText);
        toasts.add({ title: "Profile Saved to D1", description: "Persisted across devices." });
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, profileKey);
        await agent.stub.setProfile(profile);
        toasts.add({ title: "Profile Saved Locally", description: "Saved in browser storage." });
      }
    },
    [user.isSignedIn, user.userId, agent, toasts]
  );

  const { messages, sendMessage, clearHistory, addToolApprovalResponse, status } = useAgentChat({
    agent,
    experimental_throttle: 100,
    onError: (err) => {
      toasts.add({ title: "Notice", description: String(err) });
    }
  });

  const isStreaming = status === "streaming" || status === "submitted";

  const handleResumeFileUpload = useCallback(
    async (file: File) => {
      try {
        toasts.add({ title: "Reading Resume", description: file.name });
        const text = await extractResumeText(file);
        if (!text || text.length < 30) {
          toasts.add({ title: "Extraction Failed", description: "Could not read text." });
          return;
        }

        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: `I uploaded my resume: **${file.name}**.\n\nPlease parse my career details into JSON Resume format, present a structured summary, and ask for my confirmation before persisting my Master Career Data.\n\n--- RESUME CONTENT ---\n${text}`
            }
          ]
        });
      } catch (err) {
        console.error("Resume file extract error:", err);
      }
    },
    [sendMessage, toasts]
  );

  const handleConfirmMasterData = useCallback(
    async (profileToConfirm: ResumeData) => {
      try {
        await handleSaveProfile(profileToConfirm);
        sendMessage({
          role: "user",
          parts: [{ type: "text", text: "Confirmed: Persist my Master Career Data and unlock all services." }]
        });
      } catch (err) {
        console.error("Confirm master data error:", err);
      }
    },
    [handleSaveProfile, sendMessage]
  );

  const handleApplyJob = useCallback((job: JobListing) => {
    setActiveJobForHandoff(job);
    setIsHandoffDrawerOpen(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    sendMessage({ role: "user", parts: [{ type: "text", text }] });
  }, [input, isStreaming, sendMessage]);

  return (
    <div className="flex flex-col h-[100dvh] bg-kumo-elevated relative overflow-hidden">
      {/* Sticky Header Bar */}
      <header className="sticky top-0 z-30 bg-kumo-base/95 backdrop-blur-md border-b border-kumo-line shrink-0 px-4 py-3 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <span className="h-4 w-px bg-kumo-line" />
            <span className="text-xs text-kumo-default font-semibold tracking-tight">
              CVMama Career Agent
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<IdentificationCardIcon size={15} />}
              onClick={() => setIsResumeDrawerOpen(true)}
            >
              Master Data
            </Button>
            <ThemeToggle />
            <Button variant="secondary" icon={<TrashIcon size={15} />} onClick={clearHistory}>
              Clear
            </Button>
          </div>

          <div className="flex sm:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded-xl p-2 text-kumo-default hover:bg-kumo-control border border-kumo-line/60"
            >
              {isMobileMenuOpen ? <XIcon size={20} /> : <ListIcon size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <PWAInstallBanner />

          {messages.length === 0 && (
            <div className="rounded-2xl border border-kumo-line bg-kumo-base p-6 shadow-xs text-center space-y-4">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-kumo-control border border-kumo-line text-kumo-default">
                <IdentificationCardIcon size={22} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-kumo-default">
                  Welcome to CVMama Career Agent
                </h2>
                <p className="text-xs text-kumo-subtle mt-1 max-w-md mx-auto leading-relaxed">
                  Upload your resume (.pdf, .docx, .txt) to establish your Career Master Data and unlock tailored job matching, Stagehand application submission, and interview coaching.
                </p>
              </div>

              <div className="pt-2">
                <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-xl bg-kumo-default text-kumo-base hover:opacity-90 cursor-pointer transition-opacity">
                  <UploadSimpleIcon size={15} />
                  <span>Upload Resume Document</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleResumeFileUpload(e.target.files[0]);
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-kumo-default text-kumo-base shadow-2xs"
                    : "bg-kumo-base border border-kumo-line text-kumo-default shadow-2xs"
                }`}
              >
                {m.parts.map((part, pIdx) => {
                  if (part.type === "text") return <span key={pIdx}>{part.text}</span>;
                  return (
                    <ToolPartView
                      key={pIdx}
                      part={part}
                      addToolApprovalResponse={addToolApprovalResponse}
                      onOpenDrawer={() => setIsResumeDrawerOpen(true)}
                      onConfirmMasterData={handleConfirmMasterData}
                      onOpenPreviewDrawer={(pkg) => {
                        setActiveTailoredPackage(pkg);
                        setIsTailoredDrawerOpen(true);
                      }}
                      onOpenHandoffDrawer={(job) => {
                        setActiveJobForHandoff(job);
                        setIsHandoffDrawerOpen(true);
                      }}
                      onOpenRoadmapDrawer={(roadmap) => {
                        setActiveRoadmap(roadmap);
                        setIsRoadmapDrawerOpen(true);
                      }}
                      onOpenStudioDrawer={(q) => {
                        setActiveInterviewQuestion(q);
                        setIsInterviewStudioOpen(true);
                      }}
                      onOpenJobDetailsDrawer={(job) => {
                        setActiveJobDetails(job);
                        setIsJobDetailsDrawerOpen(true);
                      }}
                      onApplyJob={handleApplyJob}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 z-30 bg-kumo-base/95 backdrop-blur-md border-t border-kumo-line p-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Ask CVMama to search jobs, tailor resume, or start mock interview..."
            className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-kumo-line bg-kumo-base text-kumo-default placeholder:text-kumo-inactive focus:outline-none focus:ring-1 focus:ring-kumo-ring"
          />
          <Button variant="primary" size="sm" onClick={send} disabled={!input.trim() || isStreaming}>
            Send
          </Button>
        </div>
      </div>

      {/* Dynamic Slide-Over Drawers */}
      <ResumeDrawer
        isOpen={isResumeDrawerOpen}
        onClose={() => setIsResumeDrawerOpen(false)}
        resumeData={resumeProfile}
        onSaveProfile={handleSaveProfile}
      />

      <TailoredDocumentPreviewDrawer
        pkg={activeTailoredPackage}
        isOpen={isTailoredDrawerOpen}
        onClose={() => setIsTailoredDrawerOpen(false)}
      />

      <ApplicationHandoffDrawer
        job={activeJobForHandoff}
        isOpen={isHandoffDrawerOpen}
        onClose={() => setIsHandoffDrawerOpen(false)}
        onConfirmSubmit={() => {
          setIsHandoffDrawerOpen(false);
          toasts.add({ title: "Application Submitted", description: "Record saved in application tracker." });
        }}
      />

      <CareerRoadmapDrawer
        roadmap={activeRoadmap}
        isOpen={isRoadmapDrawerOpen}
        onClose={() => setIsRoadmapDrawerOpen(false)}
      />

      <InterviewStudioDrawer
        question={activeInterviewQuestion}
        isOpen={isInterviewStudioOpen}
        onClose={() => setIsInterviewStudioOpen(false)}
        onSubmitEvaluation={(ans) => {
          sendMessage({ role: "user", parts: [{ type: "text", text: `Evaluate my mock interview response:\n\nQuestion: "${activeInterviewQuestion?.question}"\n\nAnswer: "${ans}"` }] });
        }}
      />

      <JobDetailsDrawer
        job={activeJobDetails}
        isOpen={isJobDetailsDrawerOpen}
        onClose={() => setIsJobDetailsDrawerOpen(false)}
        onApply={handleApplyJob}
      />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-kumo-subtle">Loading CVMama Workspace...</div>}>
      <Chat />
    </Suspense>
  );
}
