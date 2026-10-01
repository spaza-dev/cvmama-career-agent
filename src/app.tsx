import { Suspense, useCallback, useState, useEffect, useRef } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { getToolName, isToolUIPart, type UIMessage } from "ai";
import type { MCPServersState } from "agents";
import type { ChatAgent } from "./server";
import {
  Badge,
  Button,
  Empty,
  InputArea,
  Surface,
  Switch,
  Text
} from "@cloudflare/kumo";
import { Toasty, useKumoToastManager } from "@cloudflare/kumo/components/toast";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import {
  PaperPlaneRightIcon,
  StopIcon,
  TrashIcon,
  MoonIcon,
  SunIcon,
  CheckCircleIcon,
  XCircleIcon,
  BrainIcon,
  BugIcon,
  PlugsConnectedIcon,
  PlusIcon,
  SignInIcon,
  XIcon,
  WrenchIcon,
  PaperclipIcon,
  FileTextIcon,
  IdentificationCardIcon,
  UploadSimpleIcon,
  BriefcaseIcon,
  ClipboardTextIcon
} from "@phosphor-icons/react";
import { useAppUser, AuthNavControls } from "./auth";
import { ResumeDrawer } from "./components/ResumeDrawer";
import { Logo } from "./components/Logo";
import { extractResumeText } from "./utils/documentExtractor";
import { type ResumeData, isProfileOnboarded } from "./types";

// ── Attachment helpers ────────────────────────────────────────────────────────

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

// ── Small components ──────────────────────────────────────────────────────────

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

// ── Tool rendering ────────────────────────────────────────────────────────────

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
  onConfirmMasterData
}: {
  part: UIMessage["parts"][number];
  addToolApprovalResponse: (response: {
    id: string;
    approved: boolean;
  }) => void;
  onOpenDrawer?: () => void;
  onConfirmMasterData?: (profile: ResumeData) => void;
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
    const isParse = toolName === "parseResume";
    const isSave = toolName === "saveProfile";
    const outputObj =
      typeof part.output === "object" && part.output !== null
        ? (part.output as Record<string, unknown>)
        : null;
    const resumeData =
      (outputObj?.resume as ResumeData) ||
      (outputObj?.profile as ResumeData) ||
      null;

    return (
      <div className="my-2">
        <Surface className="p-3.5 rounded-xl text-xs border border-kumo-line bg-kumo-base shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-kumo-default">
              <CheckCircleIcon size={15} className="text-kumo-subtle" />
              <Text size="xs" bold>
                {isParse
                  ? "Resume Parsed · Ready for Confirmation"
                  : isSave
                    ? "Career Master Data Persisted"
                    : toolName}
              </Text>
            </div>
            {isParse && onOpenDrawer && (
              <Button
                variant="secondary"
                size="sm"
                icon={<IdentificationCardIcon size={13} className="text-kumo-subtle" />}
                onClick={onOpenDrawer}
              >
                Inspect in Drawer
              </Button>
            )}
          </div>

          {isParse && resumeData?.basics?.name ? (
            <div className="rounded-lg bg-kumo-control/40 border border-kumo-line/60 p-3 text-xs space-y-2">
              <div>
                <div className="font-semibold text-kumo-default">
                  {resumeData.basics.name}
                  {resumeData.basics.label ? ` · ${resumeData.basics.label}` : ""}
                </div>
                <div className="text-kumo-subtle text-[11px] mt-0.5">
                  {resumeData.work?.length ? `${resumeData.work.length} roles` : "Roles detected"}
                  {resumeData.skills?.length ? ` · ${resumeData.skills.length} skills` : ""}
                  {resumeData.education?.length ? ` · ${resumeData.education.length} education` : ""}
                </div>
              </div>

              {onConfirmMasterData && (
                <div className="pt-2 flex items-center justify-between border-t border-kumo-line/60">
                  <span className="text-[11px] text-kumo-subtle">
                    Confirm to lock into your career intelligence suite:
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<CheckCircleIcon size={14} />}
                    onClick={() => onConfirmMasterData(resumeData)}
                  >
                    Confirm Master Data
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <ToolIO label="Result" value={part.output} />
          )}
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
          <ToolIO label="Input" value={part.input} />
        </Surface>
      </div>
    );
  }

  return null;
}

// ── Main chat ─────────────────────────────────────────────────────────────────

const LOCAL_STORAGE_KEY = "career_coach_resume_profile";

function Chat() {
  const user = useAppUser();
  const isDev = Boolean(import.meta.env.DEV);
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [resumeProfile, setResumeProfile] = useState<ResumeData | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [onboardingTab, setOnboardingTab] = useState<"upload" | "paste">("upload");
  const [pastedResumeText, setPastedResumeText] = useState("");
  const [isResumeDrawerOpen, setIsResumeDrawerOpen] = useState(false);
  const [isExtractingResume, setIsExtractingResume] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);
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

  const agent = useAgent<ChatAgent>({
    agent: "ChatAgent",
    onOpen: useCallback(() => setConnected(true), []),
    onClose: useCallback(() => setConnected(false), []),
    onError: useCallback(
      (error: Event) => console.error("WebSocket error:", error),
      []
    ),
    onMcpUpdate: useCallback((state: MCPServersState) => {
      setMcpState(state);
    }, []),
    onStateUpdate: useCallback(
      (state: CareerState) => {
        if (state?.profile && isProfileOnboarded(state.profile)) {
          setResumeProfile(state.profile);
          if (!user.isSignedIn) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state.profile));
          }
        }
      },
      [user.isSignedIn]
    ),
    onMessage: useCallback(
      (message: MessageEvent) => {
        try {
          const data = JSON.parse(String(message.data)) as {
            type?: string;
            description?: string;
            profile?: ResumeData;
            isOnboarded?: boolean;
          };
          if (data?.type === "master-data-saved" && data.profile) {
            const profileKey = JSON.stringify(data.profile);
            setResumeProfile(data.profile);
            if (!user.isSignedIn) {
              localStorage.setItem(LOCAL_STORAGE_KEY, profileKey);
            }
            // Only toast if this is a newly saved profile and hasn't been toasted yet
            if (lastNotifiedProfileRef.current !== profileKey) {
              lastNotifiedProfileRef.current = profileKey;
              toasts.add({
                title: "Master Data Saved",
                description: "Your verified Career Master Data is active across all career services."
              });
            }
          }
          if (data?.type === "scheduled-task" && data.description) {
            toasts.add({
              title: "Scheduled task completed",
              description: data.description,
              timeout: 0
            });
          }
        } catch {
          // Not JSON or not our event
        }
      },
      [toasts, user.isSignedIn]
    )
  });

  const isOnboarded = Boolean(
    isProfileOnboarded(resumeProfile) ||
    (agent.state?.isOnboarded && isProfileOnboarded(agent.state?.profile))
  );

  // Sync profile & session with Agent once upon connection / user change
  useEffect(() => {
    if (!connected) return;

    const sessionKey = user.isSignedIn && user.userId ? user.userId : "guest";
    if (hasSyncedSessionRef.current === sessionKey) return;
    hasSyncedSessionRef.current = sessionKey;

    async function syncUserSession() {
      if (user.isSignedIn && user.userId) {
        try {
          // 1. Check if user already has a saved profile in D1 via Agent RPC
          const res = await agent.stub.setSessionUser(user.userId);
          if (res?.profile && Object.keys(res.profile).length > 0) {
            lastNotifiedProfileRef.current = JSON.stringify(res.profile);
            setResumeProfile(res.profile);
            return;
          }

          // 2. If no profile in D1 yet, but user had a local profile before signing in, migrate via Agent!
          const localSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (localSaved) {
            const localProfile = JSON.parse(localSaved);
            lastNotifiedProfileRef.current = JSON.stringify(localProfile);
            await agent.stub.setProfile(localProfile, user.userId);
            setResumeProfile(localProfile);
            toasts.add({
              title: "Profile Synced",
              description:
                "Your local resume profile has been uploaded to Cloudflare D1."
            });
            return;
          }
        } catch (err) {
          console.error("Failed to sync user session with Agent:", err);
        }
      } else {
        // Guest mode: load profile from localStorage into Agent state silently without toast broadcast
        const localSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localSaved) {
          try {
            const localProfile = JSON.parse(localSaved);
            lastNotifiedProfileRef.current = JSON.stringify(localProfile);
            await agent.stub.hydrateProfile(localProfile);
          } catch (err) {
            console.error("Failed to hydrate Agent with local profile:", err);
          }
        }
      }
    }

    syncUserSession();
  }, [connected, user.isSignedIn, user.userId, agent.stub, toasts]);

  // Agent-driven resume parsing handler for the visual drawer
  const handleParseWithAgent = useCallback(
    async (rawText: string): Promise<ResumeData> => {
      const res = await agent.stub.parseResume(rawText);
      if (!res || !res.success || !res.resume) {
        throw new Error(res?.error || "Agent LLM parsing failed.");
      }
      return res.resume;
    },
    [agent]
  );

  // Profile save handler (Agent persists to D1 or LocalStorage depending on auth)
  const handleSaveProfile = useCallback(
    async (profile: ResumeData, rawText?: string) => {
      const profileKey = JSON.stringify(profile);
      lastNotifiedProfileRef.current = profileKey;
      setResumeProfile(profile);

      if (user.isSignedIn && user.userId) {
        // Persist to D1 via Agent RPC
        const res = await agent.stub.setProfile(profile, user.userId, rawText);
        if (!res?.success) {
          throw new Error("Agent failed to save profile to D1");
        }
        toasts.add({
          title: "Profile Saved to D1",
          description:
            "Your resume profile is saved and will persist across all sessions."
        });
      } else {
        // Persist to LocalStorage & Agent in-memory state
        localStorage.setItem(LOCAL_STORAGE_KEY, profileKey);
        await agent.stub.setProfile(profile);
        toasts.add({
          title: "Profile Saved Locally",
          description:
            "Saved to browser localStorage. Sign in anytime to sync to D1 across devices."
        });
      }
    },
    [user.isSignedIn, user.userId, agent, toasts]
  );

  // Close MCP panel when clicking outside
  useEffect(() => {
    if (!showMcpPanel) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        mcpPanelRef.current &&
        !mcpPanelRef.current.contains(e.target as Node)
      ) {
        setShowMcpPanel(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMcpPanel]);

  const handleAddServer = async () => {
    if (!mcpName.trim() || !mcpUrl.trim()) return;
    setIsAddingServer(true);
    try {
      await agent.stub.addServer(mcpName.trim(), mcpUrl.trim());
      setMcpName("");
      setMcpUrl("");
    } catch (e) {
      console.error("Failed to add MCP server:", e);
    } finally {
      setIsAddingServer(false);
    }
  };

  const handleRemoveServer = async (serverId: string) => {
    try {
      await agent.stub.removeServer(serverId);
    } catch (e) {
      console.error("Failed to remove MCP server:", e);
    }
  };

  const serverEntries = Object.entries(mcpState.servers);
  const mcpToolCount = mcpState.tools.length;

  const {
    messages,
    sendMessage,
    clearHistory,
    addToolApprovalResponse,
    stop,
    status
  } = useAgentChat({
    agent,
    experimental_throttle: 100,
    onToolCall: async ({ toolCall, addToolOutput }) => {
      if (toolCall.toolName === "getUserTimezone") {
        addToolOutput({
          toolCallId: toolCall.toolCallId,
          output: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            localTime: new Date().toLocaleTimeString()
          }
        });
      }
    }
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // Client-side extraction & chat dispatch
  const handleResumeFileUpload = useCallback(
    async (file: File) => {
      try {
        setIsExtractingResume(true);
        toasts.add({
          title: "Extracting Resume",
          description: `Reading text from ${file.name} in browser...`
        });
        const text = await extractResumeText(file);
        if (!text || text.length < 30) {
          toasts.add({
            title: "Extraction Failed",
            description:
              "Could not extract readable text from this file. Please ensure it is not scanned/empty."
          });
          return;
        }

        // Send directly to the chat with clear instructions for the agent to parse, present summary, and request confirmation before persisting
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: `I have uploaded my resume: **${file.name}**.\n\nPlease parse my career details into the JSON Resume format, present a structured summary of what you extracted, and ask for my confirmation before persisting my Master Career Data.\n\n--- RESUME CONTENT ---\n${text}`
            }
          ]
        });
      } catch (err) {
        console.error("Failed to extract resume text:", err);
        toasts.add({
          title: "Extraction Error",
          description: "Could not read the uploaded resume document. Try pasting the text instead."
        });
      } finally {
        setIsExtractingResume(false);
      }
    },
    [sendMessage, toasts]
  );

  const handlePastedResumeSubmit = useCallback(() => {
    const text = pastedResumeText.trim();
    if (!text || text.length < 30) {
      toasts.add({
        title: "Content Too Short",
        description:
          "Please paste your complete resume text including work experience, education, and skills."
      });
      return;
    }

    sendMessage({
      role: "user",
      parts: [
        {
          type: "text",
          text: `I am submitting my resume text for Career Master Data onboarding:\n\n--- RESUME TEXT ---\n${text}\n\nPlease parse my career details into standard JSON Resume format, present a structured summary, and ask for my confirmation before persisting my master data.`
        }
      ]
    });
    setPastedResumeText("");
  }, [pastedResumeText, sendMessage, toasts]);

  const handleConfirmMasterData = useCallback(
    async (profileToConfirm: ResumeData) => {
      try {
        await handleSaveProfile(profileToConfirm);
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Confirmed: The extracted details look accurate. Please persist my Master Career Data and unlock all career services."
            }
          ]
        });
      } catch (err) {
        console.error("Failed to confirm master data:", err);
      }
    },
    [handleSaveProfile, sendMessage]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Re-focus the input after streaming ends
  useEffect(() => {
    if (!isStreaming && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isStreaming]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setAttachments((prev) => [...prev, ...images.map(createAttachment)]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att) URL.revokeObjectURL(att.preview);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        const name = file.name.toLowerCase();
        // If user dropped a resume document, extract & send to chat!
        if (
          name.endsWith(".pdf") ||
          name.endsWith(".docx") ||
          name.endsWith(".txt") ||
          file.type.includes("pdf") ||
          file.type.includes("wordprocessing")
        ) {
          handleResumeFileUpload(file);
          return;
        }
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles, handleResumeFileUpload]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        addFiles(files);
      }
    },
    [addFiles]
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || isStreaming) return;
    setInput("");

    const parts: Array<
      | { type: "text"; text: string }
      | { type: "file"; mediaType: string; url: string }
    > = [];
    if (text) parts.push({ type: "text", text });

    for (const att of attachments) {
      const dataUri = await fileToDataUri(att.file);
      parts.push({ type: "file", mediaType: att.mediaType, url: dataUri });
    }

    for (const att of attachments) URL.revokeObjectURL(att.preview);
    setAttachments([]);

    sendMessage({ role: "user", parts });
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [input, attachments, isStreaming, sendMessage]);

  return (
    <div
      className="flex flex-col h-screen bg-kumo-elevated relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-kumo-base/90 backdrop-blur-sm border-2 border-dashed border-kumo-line rounded-2xl m-3 pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-kumo-default">
            <UploadSimpleIcon size={36} className="text-kumo-subtle" />
            <Text variant="heading3" as="span">
              Drop resume (.pdf, .docx, .txt) or images here
            </Text>
          </div>
        </div>
      )}

      {/* Top Header App Bar */}
      <header className="px-3 sm:px-5 py-2.5 sm:py-3 bg-kumo-base border-b border-kumo-line shrink-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Logo size="sm" className="sm:hidden" />
            <Logo size="md" className="hidden sm:inline-flex" />
            <span className="hidden sm:inline-block h-4 w-px bg-kumo-line" />
            <span className="hidden md:inline-block text-xs text-kumo-subtle font-medium">
              Career Agent
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Auth / Storage state */}
            <AuthNavControls />

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-kumo-control/50 border border-kumo-line/60">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  connected
                    ? "bg-[#4898AD] dark:bg-[#60B2C7]"
                    : "bg-zinc-300 dark:bg-zinc-700 animate-pulse"
                }`}
              />
              <span className="text-[11px] text-kumo-subtle font-medium">
                {connected ? "Agent Online" : "Connecting..."}
              </span>
            </div>

            {/* Developer debug & MCP tools - shown ONLY on desktop in dev mode */}
            {isDev && (
              <>
                <div className="hidden lg:flex items-center gap-1.5 pl-1">
                  <BugIcon size={14} className="text-kumo-subtle" />
                  <Switch
                    checked={showDebug}
                    onCheckedChange={setShowDebug}
                    size="sm"
                    aria-label="Toggle debug mode"
                  />
                </div>

                <div className="relative hidden sm:block" ref={mcpPanelRef}>
                  <Button
                    variant="secondary"
                    icon={<PlugsConnectedIcon size={15} className="text-kumo-subtle" />}
                    onClick={() => setShowMcpPanel(!showMcpPanel)}
                  >
                    MCP
                    {mcpToolCount > 0 && (
                      <span className="ml-1 text-[11px] font-mono text-kumo-subtle">
                        ({mcpToolCount})
                      </span>
                    )}
                  </Button>

                  {/* MCP Dropdown Panel */}
                  {showMcpPanel && (
                    <div className="absolute right-0 top-full mt-2 w-96 z-50">
                      <Surface className="rounded-xl border border-kumo-line shadow-xl p-4 space-y-4 bg-kumo-base">
                        {/* Panel Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <PlugsConnectedIcon size={15} className="text-kumo-subtle" />
                            <Text size="sm" bold>
                              MCP Servers (Dev)
                            </Text>
                            {serverEntries.length > 0 && (
                              <Badge variant="secondary">{serverEntries.length}</Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            shape="square"
                            aria-label="Close MCP panel"
                            icon={<XIcon size={14} />}
                            onClick={() => setShowMcpPanel(false)}
                          />
                        </div>

                        {/* Add Server Form */}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleAddServer();
                          }}
                          className="space-y-2"
                        >
                          <input
                            type="text"
                            value={mcpName}
                            onChange={(e) => setMcpName(e.target.value)}
                            aria-label="MCP server name"
                            placeholder="Server name"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder:text-kumo-inactive focus:outline-none focus:ring-1 focus:ring-kumo-ring"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={mcpUrl}
                              onChange={(e) => setMcpUrl(e.target.value)}
                              aria-label="MCP server URL"
                              placeholder="https://mcp.example.com"
                              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder:text-kumo-inactive focus:outline-none focus:ring-1 focus:ring-kumo-ring font-mono"
                            />
                            <Button
                              type="submit"
                              variant="primary"
                              size="sm"
                              icon={<PlusIcon size={14} />}
                              disabled={isAddingServer || !mcpName.trim() || !mcpUrl.trim()}
                            >
                              {isAddingServer ? "..." : "Add"}
                            </Button>
                          </div>
                        </form>

                        {/* Server List */}
                        {serverEntries.length > 0 && (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {serverEntries.map(([id, server]) => (
                              <div
                                key={id}
                                className="flex items-start justify-between p-2.5 rounded-lg border border-kumo-line bg-kumo-control/30"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-kumo-default truncate">
                                      {server.name}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-kumo-control border border-kumo-line text-kumo-subtle">
                                      {server.state}
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-mono text-kumo-subtle truncate block mt-0.5">
                                    {server.server_url}
                                  </span>
                                  {server.state === "failed" && server.error && (
                                    <span className="text-[11px] text-kumo-subtle block mt-0.5">
                                      {server.error}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  {server.state === "authenticating" && server.auth_url && (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      icon={<SignInIcon size={12} />}
                                      onClick={() =>
                                        window.open(server.auth_url as string, "oauth", "width=600,height=800")
                                      }
                                    >
                                      Auth
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    shape="square"
                                    aria-label="Remove server"
                                    icon={<TrashIcon size={12} />}
                                    onClick={() => handleRemoveServer(id)}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {mcpToolCount > 0 && (
                          <div className="pt-2 border-t border-kumo-line">
                            <div className="flex items-center gap-2">
                              <WrenchIcon size={13} className="text-kumo-subtle" />
                              <span className="text-xs text-kumo-subtle">
                                {mcpToolCount} tool{mcpToolCount !== 1 ? "s" : ""} available
                              </span>
                            </div>
                          </div>
                        )}
                      </Surface>
                    </div>
                  )}
                </div>
              </>
            )}

            <ThemeToggle />

            <Button
              variant="secondary"
              icon={<TrashIcon size={15} className="text-kumo-subtle" />}
              onClick={clearHistory}
            >
              <span className="hidden sm:inline">Clear</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-3 sm:px-5 py-4 sm:py-6 space-y-4 sm:space-y-5">
          {messages.length === 0 && (
            <div className="space-y-4 py-2 sm:py-4">
              {!isOnboarded ? (
                /* ONBOARDING CARD ONLY - NO "How can I help" card when not onboarded */
                <div className="rounded-2xl border border-kumo-line bg-kumo-base p-4 sm:p-7 shadow-xs space-y-5 sm:space-y-6">
                  <div className="text-center max-w-lg mx-auto space-y-2">
                    <div className="mx-auto flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-kumo-control border border-kumo-line/80 text-kumo-default shadow-2xs">
                      <IdentificationCardIcon size={22} />
                    </div>
                    <h2 className="text-base sm:text-lg font-semibold text-kumo-default tracking-tight">
                      Career Master Data Onboarding
                    </h2>
                    <p className="text-xs text-kumo-subtle leading-relaxed">
                      Your Career Master Data is the single source of truth for intelligent role matching, tailored applications, STAR mock interviews, and career progression roadmaps.
                    </p>
                  </div>

                  {/* Mode tabs: Segmented Control */}
                  <div className="flex justify-center">
                    <div className="inline-flex p-1 rounded-xl bg-kumo-control border border-kumo-line/70 gap-1 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setOnboardingTab("upload")}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-all min-h-[40px] active:scale-[0.98] ${
                          onboardingTab === "upload"
                            ? "bg-kumo-base text-kumo-default shadow-xs"
                            : "text-kumo-subtle hover:text-kumo-default"
                        }`}
                      >
                        <UploadSimpleIcon size={14} className="text-kumo-subtle" />
                        <span>Upload File</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOnboardingTab("paste")}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-all min-h-[40px] active:scale-[0.98] ${
                          onboardingTab === "paste"
                            ? "bg-kumo-base text-kumo-default shadow-xs"
                            : "text-kumo-subtle hover:text-kumo-default"
                        }`}
                      >
                        <ClipboardTextIcon size={14} className="text-kumo-subtle" />
                        <span>Paste Text</span>
                      </button>
                    </div>
                  </div>

                  {/* Tab contents */}
                  {onboardingTab === "upload" ? (
                    <div className="p-5 sm:p-6 rounded-2xl border border-dashed border-kumo-line bg-kumo-control/20 text-center space-y-3.5">
                      <p className="text-xs text-kumo-subtle max-w-md mx-auto leading-relaxed">
                        Upload your resume in <strong>PDF</strong>, <strong>DOCX</strong>, or <strong>TXT</strong> format. The Agent parses details and prompts you for confirmation before persisting.
                      </p>
                      <Button
                        variant="primary"
                        icon={<UploadSimpleIcon size={15} />}
                        disabled={isExtractingResume}
                        onClick={() => resumeFileInputRef.current?.click()}
                        className="w-full sm:w-auto min-h-[44px] text-xs sm:text-sm active:scale-[0.98]"
                      >
                        {isExtractingResume ? "Reading Document..." : "Choose Resume (.pdf, .docx, .txt)"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        value={pastedResumeText}
                        onChange={(e) => setPastedResumeText(e.target.value)}
                        placeholder="Paste your resume content here (e.g. contact details, experience, education, skills, projects)..."
                        rows={6}
                        className="w-full p-3.5 text-sm sm:text-xs rounded-xl border border-kumo-line bg-kumo-control/20 text-kumo-default placeholder:text-kumo-inactive focus:outline-none focus:ring-1 focus:ring-kumo-ring resize-y font-mono"
                      />
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                        <span className="text-[11px] text-kumo-subtle font-mono">
                          {pastedResumeText.trim().length} characters
                        </span>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<PaperPlaneRightIcon size={14} />}
                          disabled={!pastedResumeText.trim() || isStreaming}
                          onClick={handlePastedResumeSubmit}
                          className="min-h-[44px] sm:min-h-[36px] active:scale-[0.98]"
                        >
                          Parse & Onboard with Agent
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Subtle 4-step progress indicator */}
                  <div className="pt-2 border-t border-kumo-line/60">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="p-2 sm:p-2.5 rounded-xl bg-kumo-control/40 border border-kumo-line/50">
                        <div className="text-[10px] uppercase font-semibold text-kumo-default tracking-wider">Step 1</div>
                        <div className="text-xs text-kumo-subtle font-medium mt-0.5">Upload or Paste</div>
                      </div>
                      <div className="p-2 sm:p-2.5 rounded-xl bg-kumo-control/40 border border-kumo-line/50">
                        <div className="text-[10px] uppercase font-semibold text-kumo-subtle tracking-wider">Step 2</div>
                        <div className="text-xs text-kumo-subtle font-medium mt-0.5">Agent Parses</div>
                      </div>
                      <div className="p-2 sm:p-2.5 rounded-xl bg-kumo-control/40 border border-kumo-line/50">
                        <div className="text-[10px] uppercase font-semibold text-kumo-subtle tracking-wider">Step 3</div>
                        <div className="text-xs text-kumo-subtle font-medium mt-0.5">Confirm Details</div>
                      </div>
                      <div className="p-2 sm:p-2.5 rounded-xl bg-kumo-control/40 border border-kumo-line/50">
                        <div className="text-[10px] uppercase font-semibold text-kumo-subtle tracking-wider">Step 4</div>
                        <div className="text-xs text-kumo-subtle font-medium mt-0.5">Career Suite Active</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ONBOARDED: SHOW MASTER DATA BAR & "HOW CAN I HELP" CARD */
                <>
                  <div className="rounded-2xl border border-kumo-line bg-kumo-base p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-kumo-control border border-kumo-line/80 text-kumo-default">
                        <IdentificationCardIcon size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-kumo-default truncate">
                          {resumeProfile?.basics?.name || "Career Master Data Profile"}
                          {resumeProfile?.basics?.label ? ` · ${resumeProfile.basics.label}` : ""}
                        </h3>
                        <p className="text-xs text-kumo-subtle mt-0.5 truncate">
                          {resumeProfile?.work?.length ? `${resumeProfile.work.length} roles` : "Profile loaded"}
                          {resumeProfile?.skills?.length ? ` · ${resumeProfile.skills.length} skills` : ""}
                          {resumeProfile?.education?.length ? ` · ${resumeProfile.education.length} education` : ""}
                          {" · "}
                          {user.isSignedIn ? "D1 Cloud Database" : "Local Storage"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<FileTextIcon size={14} className="text-kumo-subtle" />}
                        onClick={() => setIsResumeDrawerOpen(true)}
                        className="flex-1 sm:flex-initial min-h-[40px] sm:min-h-[32px] active:scale-[0.98]"
                      >
                        View / Edit Master Data
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<UploadSimpleIcon size={14} className="text-kumo-subtle" />}
                        disabled={isExtractingResume}
                        onClick={() => resumeFileInputRef.current?.click()}
                        className="min-h-[40px] sm:min-h-[32px] active:scale-[0.98]"
                      >
                        Update
                      </Button>
                    </div>
                  </div>

                  <Empty
                    icon={<BriefcaseIcon size={28} className="text-kumo-subtle" />}
                    title="How can I help with your career today?"
                    contents={
                      <div className="space-y-3.5 max-w-xl mx-auto">
                        <p className="text-xs text-kumo-subtle text-center">
                          Your verified Career Master Data is active. Pick a service or type any career question below:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            "Find senior roles matching my master profile & skills",
                            "Tailor my resume & write a cover letter for a job",
                            "Conduct a mock interview on my experience using STAR",
                            "Analyze my skill gaps & create a promotion roadmap"
                          ].map((prompt) => (
                            <button
                              key={prompt}
                              type="button"
                              disabled={isStreaming}
                              onClick={() => {
                                sendMessage({
                                  role: "user",
                                  parts: [{ type: "text", text: prompt }]
                                });
                              }}
                              className="text-left py-3 px-3.5 text-xs font-medium rounded-xl border border-kumo-line bg-kumo-base hover:bg-kumo-control text-kumo-default min-h-[44px] active:scale-[0.98] transition-all flex items-center gap-2 shadow-2xs"
                            >
                              <BriefcaseIcon size={15} className="shrink-0 text-kumo-subtle" />
                              <span className="line-clamp-2">{prompt}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    }
                  />
                </>
              )}
            </div>
          )}

          {messages.map((message: UIMessage, index: number) => {
            const isUser = message.role === "user";
            const isLastAssistant =
              message.role === "assistant" && index === messages.length - 1;

            return (
              <div key={message.id} className="space-y-2">
                {isDev && showDebug && (
                  <pre className="text-[11px] font-mono text-kumo-subtle bg-kumo-control p-3 rounded-lg overflow-auto max-h-64 border border-kumo-line/60">
                    {JSON.stringify(message, null, 2)}
                  </pre>
                )}
                {/* Render parts in chronological (array) order */}
                {message.parts.map((part, i) => {
                  const key = `${message.id}-${i}`;

                  if (isToolUIPart(part)) {
                    return (
                      <ToolPartView
                        key={key}
                        part={part}
                        addToolApprovalResponse={addToolApprovalResponse}
                        onOpenDrawer={() => setIsResumeDrawerOpen(true)}
                        onConfirmMasterData={handleConfirmMasterData}
                      />
                    );
                  }

                  if (part.type === "reasoning") {
                    if (!part.text.trim()) return null;
                    return (
                      <details
                        key={key}
                        className="text-xs text-kumo-subtle bg-kumo-control/60 border border-kumo-line/60 rounded-xl p-3.5 space-y-1.5"
                      >
                        <summary className="cursor-pointer font-medium flex items-center gap-1.5 text-kumo-default">
                          <BrainIcon size={14} className="text-kumo-subtle" />
                          <span>Reasoning Process</span>
                        </summary>
                        <p className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-kumo-subtle leading-relaxed">
                          {part.text}
                        </p>
                      </details>
                    );
                  }

                  if (part.type === "text") {
                    return (
                      <div
                        key={key}
                        className={`flex gap-2 sm:gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[90%] sm:max-w-[82%] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm leading-relaxed ${
                            isUser
                              ? "bg-kumo-brand text-kumo-inverse shadow-xs"
                              : "bg-kumo-base border border-kumo-line text-kumo-default shadow-xs"
                          }`}
                        >
                          <Streamdown
                            plugins={{ code }}
                            className="kumo-markdown text-xs sm:text-sm break-words overflow-hidden"
                          >
                            {part.text}
                          </Streamdown>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}

                {/* Loading indicator when assistant has no parts yet */}
                {isLastAssistant &&
                  isStreaming &&
                  message.parts.length === 0 && (
                    <div className="flex gap-2 sm:gap-3 justify-start">
                      <div className="max-w-[90%] sm:max-w-[82%] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 bg-kumo-base border border-kumo-line text-kumo-subtle text-xs sm:text-sm flex items-center gap-2.5">
                        <div className="animate-spin h-3.5 w-3.5 border-2 border-kumo-default border-t-transparent rounded-full" />
                        <span>Thinking...</span>
                      </div>
                    </div>
                  )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Quick Suggestions Row on Mobile (when onboarded) */}
      {isOnboarded && messages.length > 0 && (
        <div className="bg-kumo-base/80 backdrop-blur-sm border-t border-kumo-line/60 px-3 py-2 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 min-w-max">
            {[
              "Matching roles",
              "Tailor resume & cover letter",
              "STAR Mock interview",
              "Skill gap & promotion roadmap"
            ].map((quickPrompt) => (
              <button
                key={quickPrompt}
                type="button"
                disabled={isStreaming}
                onClick={() => {
                  sendMessage({
                    role: "user",
                    parts: [{ type: "text", text: quickPrompt }]
                  });
                }}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-kumo-control/80 border border-kumo-line/80 text-kumo-default hover:bg-kumo-control active:scale-95 transition-all whitespace-nowrap"
              >
                {quickPrompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fixed Bottom Input Composer */}
      <div className="border-t border-kumo-line bg-kumo-base shrink-0 pb-safe">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="max-w-3xl mx-auto px-3 sm:px-5 py-2.5 sm:py-3.5"
        >
          {/* Hidden resume file input for chat extraction */}
          <input
            ref={resumeFileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            aria-label="Upload resume document for chat onboarding"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleResumeFileUpload(e.target.files[0]);
              }
              e.target.value = "";
            }}
          />

          {/* Hidden image attachments input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            aria-label="Upload image attachments"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {attachments.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="relative group rounded-lg border border-kumo-line bg-kumo-control overflow-hidden"
                >
                  <img
                    src={att.preview}
                    alt={att.file.name}
                    className="h-14 w-14 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="absolute top-0.5 right-0.5 rounded-full bg-kumo-contrast/80 text-kumo-inverse p-1 active:scale-90 transition-opacity"
                    aria-label={`Remove ${att.file.name}`}
                  >
                    <XIcon size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-1.5 sm:gap-2.5 rounded-2xl border border-kumo-line bg-kumo-base p-2 sm:p-2.5 shadow-xs focus-within:ring-1 focus-within:ring-kumo-ring focus-within:border-transparent transition-all">
            <Button
              type="button"
              variant="ghost"
              shape="square"
              aria-label="Upload Resume"
              title="Upload Resume (.pdf, .docx, .txt) to chat"
              icon={<FileTextIcon size={18} className="text-kumo-subtle" />}
              onClick={() => resumeFileInputRef.current?.click()}
              disabled={!connected || isStreaming || isExtractingResume}
              className="mb-0.5 min-h-[40px] min-w-[40px] sm:min-h-[36px] sm:min-w-[36px] active:scale-95 flex items-center justify-center"
            />
            <Button
              type="button"
              variant="ghost"
              shape="square"
              aria-label="Attach images"
              icon={<PaperclipIcon size={18} className="text-kumo-subtle" />}
              onClick={() => fileInputRef.current?.click()}
              disabled={!connected || isStreaming}
              className="mb-0.5 min-h-[40px] min-w-[40px] sm:min-h-[36px] sm:min-w-[36px] active:scale-95 flex items-center justify-center"
            />
            <InputArea
              ref={textareaRef}
              value={input}
              onValueChange={setInput}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
              onPaste={handlePaste}
              placeholder={
                attachments.length > 0
                  ? "Add a message or send images..."
                  : !isOnboarded
                    ? "Upload resume (.pdf/.docx) or paste text above to onboard..."
                    : "Ask about jobs, applications, mock interviews, or roadmaps..."
              }
              disabled={!connected || isStreaming}
              rows={1}
              className="flex-1 ring-0! focus:ring-0! shadow-none! bg-transparent! outline-none! resize-none max-h-36 text-sm sm:text-sm"
            />
            {isStreaming ? (
              <Button
                type="button"
                variant="secondary"
                shape="square"
                aria-label="Stop generation"
                icon={<StopIcon size={16} />}
                onClick={stop}
                className="mb-0.5 min-h-[40px] min-w-[40px] sm:min-h-[36px] sm:min-w-[36px] active:scale-95 flex items-center justify-center"
              />
            ) : (
              <Button
                type="submit"
                variant="primary"
                shape="square"
                aria-label="Send message"
                disabled={
                  (!input.trim() && attachments.length === 0) || !connected
                }
                icon={<PaperPlaneRightIcon size={16} />}
                className="mb-0.5 min-h-[40px] min-w-[40px] sm:min-h-[36px] sm:min-w-[36px] active:scale-95 flex items-center justify-center"
              />
            )}
          </div>
        </form>
        <div className="flex justify-center pb-2 text-[11px] text-kumo-subtle font-medium">
          <span>© 2026 CV Mama · Career Agent</span>
        </div>
      </div>

      <ResumeDrawer
        isOpen={isResumeDrawerOpen}
        onClose={() => setIsResumeDrawerOpen(false)}
        currentProfile={resumeProfile || undefined}
        onSaveProfile={handleSaveProfile}
        onParseWithAgent={handleParseWithAgent}
      />
    </div>
  );
}

export default function App() {
  return (
    <Toasty>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen text-kumo-inactive">
            Loading...
          </div>
        }
      >
        <Chat />
      </Suspense>
    </Toasty>
  );
}
