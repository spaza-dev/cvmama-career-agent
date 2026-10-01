const SESSION_STORAGE_KEY = "cv_session_id";

export function generateSessionId(): string {
  const randomPart = Math.random().toString(36).substring(2, 10);
  const timePart = Date.now().toString(36);
  return `session_${randomPart}${timePart}`;
}

export function getOrCreateGuestSessionId(): string {
  if (typeof window === "undefined") return "session_default";

  // 1. Check URL search param first (?session=...)
  const params = new URLSearchParams(window.location.search);
  const urlSession = params.get("session");
  if (urlSession && urlSession.trim()) {
    const cleanUrlSession = urlSession.trim();
    localStorage.setItem(SESSION_STORAGE_KEY, cleanUrlSession);
    return cleanUrlSession;
  }

  // 2. Check localStorage
  const stored = localStorage.getItem(SESSION_STORAGE_KEY);
  if (stored && stored.trim()) {
    return stored.trim();
  }

  // 3. Generate fresh session ID
  const fresh = generateSessionId();
  localStorage.setItem(SESSION_STORAGE_KEY, fresh);
  return fresh;
}

export function createNewGuestSession(): string {
  const fresh = generateSessionId();
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_STORAGE_KEY, fresh);
    const url = new URL(window.location.href);
    if (url.searchParams.has("session")) {
      url.searchParams.delete("session");
      window.history.replaceState({}, "", url.toString());
    }
  }
  return fresh;
}

export function getSessionShareUrl(sessionId: string): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.set("session", sessionId);
  return url.toString();
}
