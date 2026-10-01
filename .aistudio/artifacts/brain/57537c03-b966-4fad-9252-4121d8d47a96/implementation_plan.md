# Multi-User Session Isolation & Architectural Strategy for 10,000+ Public Users

Comprehensive analysis, code review, and architectural blueprint to transition the AI Career Agent from a shared single-instance model to isolated, auto-scaled Cloudflare Durable Object instances per user session with real-time multi-device synchronization.

## User Review & Critical Decisions

> [!IMPORTANT]
> The current system uses `useAgent({ agent: "ChatAgent" })` without specifying an instance `name`. Consequently, Cloudflare routes every single public visitor to the same default Durable Object instance (`idFromName("ChatAgent")`), broadcasting chat messages and overwriting career profile data across all visitors.

- **Session Isolation Strategy**: Generate an isolated, unique session identifier (`sessionId`) for anonymous guests, and use `user_${userId}` for signed-in Clerk users as the Durable Object instance `name`.
- **Multi-Device / Multi-Tab Synchronization**: Any browser or tab using the same `sessionId` or user account connects to the exact same dedicated DO instance, providing live WebSocket state sync and shared D1 persistence.
- **Session Switching & Shareable URLs**: Provide a clean header control displaying the active session ID with a copy-link feature (`?session=...`) so users can easily sync their session across different browsers or devices.

---

## 1. Overview & Core Concept

### Problem Analysis
1. **Single Room Contention**: Currently, `useAgent({ agent: "ChatAgent" })` omits the `name` parameter. Cloudflare Agents SDK defaults `name` to `"ChatAgent"`, causing all connections to map to a single global Durable Object instance (`idFromName("ChatAgent")`).
2. **Data Leakage & State Mutation**: When User A parses a resume or chats, `this.broadcast(...)` transmits the state change to all connected WebSocket clients globally.
3. **Scalability Limits**: A single Durable Object instance cannot scale to 10,000+ concurrent active public users due to per-instance CPU and WebSocket limits.

### The Solution
1. **Actor-Model Scale**: Cloudflare Durable Objects are lightweight edge actors that scale seamlessly to millions of distinct instances. By passing a dynamic `name` parameter to `useAgent({ agent: "ChatAgent", name: sessionOrUserId })`, each user automatically gets a dedicated, isolated Durable Object instance.
2. **Persistent Identity Bridge**:
   - **Guest Session**: Auto-generated UUID stored in `localStorage` (`cv_session_id`) or read from URL query param (`?session=...`).
   - **Authenticated Session**: Derived from Clerk user ID (`user_${user.userId}`).
3. **Cross-Tab & Cross-Device Sync**: Multiple tabs or devices with the same `sessionId` or user account connect to the identical DO actor, syncing chat history and Career Master Data in real time without interfering with other users.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **First-Time Guest Entry**:
   - User visits the app in Browser 1. An isolated session key (`session_a1b2c3d4...`) is instantiated.
   - `useAgent` connects directly to dedicated DO actor `session_a1b2c3d4...`.
   - The user sees an empty, private chat history and clean onboarding screen.
2. **Multi-Browser Sync (Guest)**:
   - User clicks "Share / Copy Link" in the header to copy `https://.../?session=session_a1b2c3d4...`.
   - User opens the link in Browser 2.
   - Browser 2 connects to the SAME DO actor `session_a1b2c3d4...`.
   - Actions in Browser 1 immediately reflect in Browser 2 via WebSocket broadcast.
3. **Authenticated User Sync**:
   - User signs in with Clerk on Browser 1. The DO instance name seamlessly switches to `user_usr_12345`.
   - User signs in on Browser 2 or phone. Both devices connect to DO actor `user_usr_12345`.
   - D1 profile state and chat state are fully synchronized across all authenticated devices.

### Header UI Enhancements
- **Session Status Control**: Quiet, unboxed session indicator in the header bar showing active mode (`Guest: session_a1b2...` or `Cloud: user_usr_...`).
- **Session Actions**: Compact dropdown menu allowing users to copy session share link, start a fresh isolated session, or manage signed-in cloud sync.
- **Visual Polish**: Retains minimal visual footprint according to design discipline (no garish badges, smooth transitions, dark/light mode optical balance).

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Session Key Generation & Resolution Order
- **Chosen Approach**: Resolve session name in priority order:
  1. Signed-in Clerk User ID (`user_${user.userId}`)
  2. URL Query Parameter (`?session=${urlSessionId}`)
  3. Existing `localStorage` session ID (`cv_session_id`)
  4. Auto-generated crypto UUID (`session_${crypto.randomUUID()}`)
- **Why**: Ensures zero friction for anonymous visitors while supporting explicit cross-browser sharing and automatic account-level sync.

### Decision 2: Durable Object State & D1 Persistence
- **Chosen Approach**: Store active chat messages and in-memory career state inside the dedicated Durable Object's SQLite storage (`this.ctx.storage`), while syncing long-term profile data to D1 `user_profiles` table.
- **Why**: Provides instantaneous WebSocket responses from the DO's local memory while safeguarding master data in global D1 SQL storage.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BROWSER CLIENTS                                   │
│                                                                             │
│  Browser A (Guest Session 1)        Browser B (Guest Session 2)              │
│  [ useAgent(name: "session_abc") ]  [ useAgent(name: "session_xyz") ]       │
│               │                                   │                         │
│  Browser A2 (Same Session 1)                      │                         │
│  [ useAgent(name: "session_abc") ]                │                         │
└───────────────┼───────────────────────────────────┼─────────────────────────┘
                │ WebSockets / RPC                  │ WebSockets / RPC
                ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CLOUDFLARE WORKER ROUTER                              │
│                    routeAgentRequest(request, env)                          │
└───────────────┬───────────────────────────────────┬─────────────────────────┘
                │ idFromName("session_abc")         │ idFromName("session_xyz")
                ▼                                   ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│     DURABLE OBJECT INSTANCE     │   │     DURABLE OBJECT INSTANCE     │
│   ChatAgent ("session_abc")     │   │   ChatAgent ("session_xyz")     │
│  • Private State (this.state)   │   │  • Private State (this.state)   │
│  • Private History              │   │  • Private History              │
│  • Broadcasts ONLY to session   │   │  • Broadcasts ONLY to session   │
└───────────────┬─────────────────┘   └───────────────┬─────────────────┘
                │                                     │
                └──────────────────┬──────────────────┘
                                   │ SQL Queries
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          D1 DATABASE (GLOBAL)                               │
│  Table: user_profiles (user_id PRIMARY KEY, resume_json, updated_at)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component & State Mapping

1. **`src/app.tsx`**:
   - Introduce `useSessionManager()` hook to derive `sessionKey` (from Clerk, URL query param, or `localStorage`).
   - Pass `name: sessionKey` to `useAgent<ChatAgent>({ agent: "ChatAgent", name: sessionKey, ... })`.
   - Update `AuthNavControls` to display active session information and offer "New Session" or "Copy Sync Link" controls.
2. **`src/server.ts`**:
   - `ChatAgent` extends `AIChatAgent<AppEnv, CareerState>`.
   - `this.state` and `this.messages` are automatically scoped per DO instance.
   - `this.broadcast(...)` will now transmit updates *only* to WebSockets connected to that specific DO actor instance.
   - Ensure `syncProfileToDb` binds `this.state.userId || sessionKey` into `user_profiles` table in D1.
