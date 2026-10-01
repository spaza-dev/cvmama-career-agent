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
  PoweredByCloudflare,
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
  ChatCircleDotsIcon,
  CircleIcon,
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
} from "@phosphor-icons/react";
import { useAppUser, AuthNavControls } from "./auth";
import { ResumeDrawer } from "./components/ResumeDrawer";
import type { ResumeData } from "./types";

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
  addToolApprovalResponse
}: {
  part: UIMessage["parts"][number];
  addToolApprovalResponse: (response: {
    id: string;
    approved: boolean;
  }) => void;
}) {
  if (!isToolUIPart(part)) return null;

  const toolName = getToolName(part);

  if (part.state === "approval-requested") {
    const approvalId = part.approval?.id;
    return (
      <div className="my-2 p-3 rounded-lg border border-kumo-line bg-kumo-control">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainIcon size={16} className="text-kumo-brand" />
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
    return (
      <div className="my-1">
        <Surface className="p-2 rounded-lg text-xs border border-kumo-line">
          <div className="flex items-center gap-1.5 text-kumo-subtle mb-1">
            <CheckCircleIcon size={14} className="text-kumo-brand" />
            <Text size="xs" bold>
              {toolName}
            </Text>
          </div>
          <ToolIO label="Result" value={part.output} />
        </Surface>
      </div>
    );
  }

  if (part.state === "input-available") {
    return (
      <div className="my-1">
        <Surface className="p-2 rounded-lg text-xs border border-kumo-line">
          <div className="flex items-center gap-1.5 text-kumo-subtle">
            <BrainIcon size={14} className="animate-spin text-kumo-brand" />
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
  const [isResumeDrawerOpen, setIsResumeDrawerOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    onMessage: useCallback(
      (message: MessageEvent) => {
        try {
          const data = JSON.parse(String(message.data)) as {
            type?: string;
            description?: string;
          };
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
      [toasts]
    )
  });

  // Sync profile & session with Agent via Agent RPC (no direct API calls)
  useEffect(() => {
    if (!connected) return;

    async function syncUserSession() {
      if (user.isSignedIn && user.userId) {
        try {
          // 1. Check if user already has a saved profile in D1 via Agent RPC
          const res = await agent.stub.setSessionUser(user.userId);
          if (res?.profile && Object.keys(res.profile).length > 0) {
            setResumeProfile(res.profile);
            return;
          }

          // 2. If no profile in D1 yet, but user had a local profile before signing in, migrate via Agent!
          const localSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (localSaved) {
            const localProfile = JSON.parse(localSaved);
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
        // Guest mode: load profile from localStorage into Agent in-memory state
        const localSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localSaved) {
          try {
            const localProfile = JSON.parse(localSaved);
            await agent.stub.setProfile(localProfile);
          } catch (err) {
            console.error("Failed to hydrate Agent with local profile:", err);
          }
        }
      }
    }

    syncUserSession();
  }, [connected, user.isSignedIn, user.userId, agent, toasts]);

  // Agent-driven resume parsing handler
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
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
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
        // If user dropped a resume document, open Resume Modal directly!
        if (
          name.endsWith(".pdf") ||
          name.endsWith(".docx") ||
          file.type.includes("pdf") ||
          file.type.includes("wordprocessing")
        ) {
          setIsResumeDrawerOpen(true);
          return;
        }
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-kumo-elevated/80 backdrop-blur-sm border-2 border-dashed border-kumo-brand rounded-xl m-2 pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-kumo-brand">
            <UploadSimpleIcon size={40} />
            <Text variant="heading3" as="span">
              Drop resume (.pdf, .docx) or images here
            </Text>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-5 py-4 bg-kumo-base border-b border-kumo-line">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-kumo-default flex items-center gap-2">
              <BriefcaseIcon size={20} weight="bold" className="text-kumo-brand" />
              <span>Career Coach AI</span>
            </h1>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              <ChatCircleDotsIcon size={12} weight="bold" className="mr-1 text-kumo-brand" />
              Coach
            </Badge>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Resume Profile Onboarding Button */}
            <Button
              variant={resumeProfile?.basics?.name ? "secondary" : "primary"}
              size="sm"
              icon={<IdentificationCardIcon size={16} />}
              onClick={() => setIsResumeDrawerOpen(true)}
              className="gap-1.5"
            >
              {resumeProfile?.basics?.name ? (
                <span className="truncate max-w-[120px] sm:max-w-[170px]">
                  {resumeProfile.basics.name}
                </span>
              ) : (
                <span>Upload Resume</span>
              )}
            </Button>

            {/* Clerk Auth / Guest persistence controls */}
            <AuthNavControls />

            <div className="hidden md:flex items-center gap-1.5">
              <CircleIcon
                size={8}
                weight="fill"
                className={connected ? "text-kumo-success" : "text-kumo-danger"}
              />
              <Text size="xs" variant="secondary">
                {connected ? "Connected" : "Disconnected"}
              </Text>
            </div>

            <div className="hidden lg:flex items-center gap-1.5">
              <BugIcon size={14} className="text-kumo-inactive" />
              <Switch
                checked={showDebug}
                onCheckedChange={setShowDebug}
                size="sm"
                aria-label="Toggle debug mode"
              />
            </div>

            <ThemeToggle />

            <div className="relative" ref={mcpPanelRef}>
              <Button
                variant="secondary"
                icon={<PlugsConnectedIcon size={16} />}
                onClick={() => setShowMcpPanel(!showMcpPanel)}
              >
                MCP
                {mcpToolCount > 0 && (
                  <Badge variant="primary" className="ml-1.5">
                    <WrenchIcon size={10} className="mr-0.5" />
                    {mcpToolCount}
                  </Badge>
                )}
              </Button>

              {/* MCP Dropdown Panel */}
              {showMcpPanel && (
                <div className="absolute right-0 top-full mt-2 w-96 z-50">
                  <Surface className="rounded-xl ring ring-kumo-line shadow-lg p-4 space-y-4">
                    {/* Panel Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PlugsConnectedIcon
                          size={16}
                          className="text-kumo-accent"
                        />
                        <Text size="sm" bold>
                          MCP Servers
                        </Text>
                        {serverEntries.length > 0 && (
                          <Badge variant="secondary">
                            {serverEntries.length}
                          </Badge>
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
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder:text-kumo-inactive focus:outline-none focus:ring-1 focus:ring-kumo-accent"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={mcpUrl}
                          onChange={(e) => setMcpUrl(e.target.value)}
                          aria-label="MCP server URL"
                          placeholder="https://mcp.example.com"
                          className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder:text-kumo-inactive focus:outline-none focus:ring-1 focus:ring-kumo-accent font-mono"
                        />
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          icon={<PlusIcon size={14} />}
                          disabled={
                            isAddingServer || !mcpName.trim() || !mcpUrl.trim()
                          }
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
                            className="flex items-start justify-between p-2.5 rounded-lg border border-kumo-line"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-kumo-default truncate">
                                  {server.name}
                                </span>
                                <Badge
                                  variant={
                                    server.state === "ready"
                                      ? "primary"
                                      : server.state === "failed"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {server.state}
                                </Badge>
                              </div>
                              <span className="text-xs font-mono text-kumo-subtle truncate block mt-0.5">
                                {server.server_url}
                              </span>
                              {server.state === "failed" && server.error && (
                                <span className="text-xs text-red-500 block mt-0.5">
                                  {server.error}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              {server.state === "authenticating" &&
                                server.auth_url && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    icon={<SignInIcon size={12} />}
                                    onClick={() =>
                                      window.open(
                                        server.auth_url as string,
                                        "oauth",
                                        "width=600,height=800"
                                      )
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

                    {/* Tool Summary */}
                    {mcpToolCount > 0 && (
                      <div className="pt-2 border-t border-kumo-line">
                        <div className="flex items-center gap-2">
                          <WrenchIcon size={14} className="text-kumo-subtle" />
                          <span className="text-xs text-kumo-subtle">
                            {mcpToolCount} tool
                            {mcpToolCount !== 1 ? "s" : ""} available from MCP
                            servers
                          </span>
                        </div>
                      </div>
                    )}
                  </Surface>
                </div>
              )}
            </div>
            <Button
              variant="secondary"
              icon={<TrashIcon size={16} />}
              onClick={clearHistory}
            >
              Clear
            </Button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
          {messages.length === 0 && (
            <div className="space-y-4 py-4">
              {!resumeProfile || !resumeProfile.basics?.name ? (
                <div className="rounded-2xl border border-kumo-brand/30 bg-kumo-brand/5 p-6 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-kumo-brand/10 text-kumo-brand">
                    <FileTextIcon size={28} weight="bold" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h3 className="text-base font-semibold text-kumo-default">
                      Onboard Your Resume Profile
                    </h3>
                    <p className="text-xs text-kumo-subtle leading-relaxed">
                      Upload your resume in <strong>PDF</strong>,{" "}
                      <strong>DOCX</strong>, or <strong>TXT</strong> format. Extraction runs client-side, followed by Cloudflare Agent LLM structuring with interactive confirmation.
                    </p>
                  </div>
                  <div className="pt-1 flex flex-wrap justify-center gap-2">
                    <Button
                      variant="primary"
                      icon={<UploadSimpleIcon size={16} />}
                      onClick={() => setIsResumeDrawerOpen(true)}
                    >
                      Upload Resume (.pdf, .docx)
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-kumo-line bg-kumo-control/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-kumo-brand/10 text-kumo-brand">
                      <IdentificationCardIcon size={22} weight="bold" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-kumo-default">
                        {resumeProfile.basics.name}
                        {resumeProfile.basics.label
                          ? ` • ${resumeProfile.basics.label}`
                          : ""}
                      </h4>
                      <p className="text-xs text-kumo-subtle">
                        {resumeProfile.work?.length
                          ? `${resumeProfile.work.length} roles`
                          : "Profile loaded"}
                        {resumeProfile.skills?.length
                          ? ` • ${resumeProfile.skills.length} skills`
                          : ""}
                        {" • "}
                        {user.isSignedIn
                          ? "Persisted in Cloudflare D1"
                          : "Persisted in LocalStorage"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<FileTextIcon size={14} />}
                    onClick={() => setIsResumeDrawerOpen(true)}
                  >
                    View / Edit Resume
                  </Button>
                </div>
              )}

              <Empty
                icon={<ChatCircleDotsIcon size={32} />}
                title="How can I help with your career today?"
                contents={
                  <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                    {[
                      "Review my resume and suggest high-impact improvements",
                      "Find senior engineering roles matching my skills",
                      "Help me prepare for behavioral interview questions",
                      "Track a job application for Cloudflare"
                    ].map((prompt) => (
                      <Button
                        key={prompt}
                        variant="outline"
                        size="sm"
                        disabled={isStreaming}
                        onClick={() => {
                          sendMessage({
                            role: "user",
                            parts: [{ type: "text", text: prompt }]
                          });
                        }}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                }
              />
            </div>
          )}

          {messages.map((message: UIMessage, index: number) => {
            const isUser = message.role === "user";
            const isLastAssistant =
              message.role === "assistant" && index === messages.length - 1;

            return (
              <div key={message.id} className="space-y-2">
                {showDebug && (
                  <pre className="text-[11px] text-kumo-subtle bg-kumo-control rounded-lg p-3 overflow-auto max-h-64">
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
                      />
                    );
                  }

                  if (part.type === "reasoning") {
                    if (!part.text.trim()) return null;
                    return (
                      <details
                        key={key}
                        className="text-xs text-kumo-subtle bg-kumo-control rounded-lg p-3 space-y-1"
                      >
                        <summary className="cursor-pointer font-medium flex items-center gap-1.5 text-kumo-default">
                          <BrainIcon size={14} className="text-kumo-brand" />
                          Reasoning
                        </summary>
                        <p className="mt-1 whitespace-pre-wrap font-mono text-[11px]">
                          {part.text}
                        </p>
                      </details>
                    );
                  }

                  if (part.type === "text") {
                    return (
                      <div
                        key={key}
                        className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            isUser
                              ? "bg-kumo-brand text-kumo-inverse shadow-xs"
                              : "bg-kumo-base border border-kumo-line text-kumo-default shadow-xs"
                          }`}
                        >
                          <Streamdown
                            plugins={{ code }}
                            className="kumo-markdown text-sm break-words overflow-hidden"
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
                    <div className="flex gap-3 justify-start">
                      <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-kumo-base border border-kumo-line text-kumo-subtle text-sm flex items-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-kumo-brand border-t-transparent rounded-full" />
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

      {/* Input Area */}
      <div className="border-t border-kumo-line bg-kumo-base">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="max-w-3xl mx-auto px-5 py-4"
        >
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
                    className="h-16 w-16 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="absolute top-0.5 right-0.5 rounded-full bg-kumo-contrast/80 text-kumo-inverse p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remove ${att.file.name}`}
                  >
                    <XIcon size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3 rounded-xl border border-kumo-line bg-kumo-base p-3 shadow-sm focus-within:ring-2 focus-within:ring-kumo-ring focus-within:border-transparent transition-shadow">
            <Button
              type="button"
              variant="ghost"
              shape="square"
              aria-label="Upload Resume"
              title="Upload / View Resume (.pdf, .docx, .txt)"
              icon={<FileTextIcon size={18} />}
              onClick={() => setIsResumeDrawerOpen(true)}
              className="mb-0.5 text-kumo-brand"
            />
            <Button
              type="button"
              variant="ghost"
              shape="square"
              aria-label="Attach images"
              icon={<PaperclipIcon size={18} />}
              onClick={() => fileInputRef.current?.click()}
              disabled={!connected || isStreaming}
              className="mb-0.5"
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
                  : "Ask your Career Coach about your resume, roles, or interview prep..."
              }
              disabled={!connected || isStreaming}
              rows={1}
              className="flex-1 ring-0! focus:ring-0! shadow-none! bg-transparent! outline-none! resize-none max-h-40"
            />
            {isStreaming ? (
              <Button
                type="button"
                variant="secondary"
                shape="square"
                aria-label="Stop generation"
                icon={<StopIcon size={18} />}
                onClick={stop}
                className="mb-0.5"
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
                icon={<PaperPlaneRightIcon size={18} />}
                className="mb-0.5"
              />
            )}
          </div>
        </form>
        <div className="flex justify-center pb-3">
          <PoweredByCloudflare href="https://developers.cloudflare.com/agents/" />
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
