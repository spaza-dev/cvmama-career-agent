# Sticky Mobile Header Fix & Progressive Web App (PWA) Integration Plan

Fix the mobile header visibility with a sticky top bar and expandable menu drawer, and turn CV Mama into an installable Progressive Web App (PWA) featuring a floating install banner, offline caching, and iOS install instructions.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed by the user in Phase 1:

- **PWA Install Button Placement**: Floating banner at the top of the chat area.
- **Service Worker Caching Strategy**: Auto-update with offline caching of app UI and static assets (`vite-plugin-pwa`).
- **Mobile Header Structure**: Sticky top bar with logo/logoname and an expandable mobile menu drawer for navigation and controls.

---

## 1. Overview & Core Concept

CV Mama will be enhanced with full PWA compliance, allowing users to install the career agent directly onto their iOS or Android home screen or desktop OS as a native-like standalone application. The mobile header will be redesigned as a sticky top navigation bar with a clean brand title and an expandable mobile drawer containing auth status, theme toggle, clear history, and developer tools.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Sticky Mobile Top Header & Expandable Drawer**:
   - As users scroll through long chat conversations, the top app bar remains pinned (`sticky top-0 z-30 backdrop-blur-md`).
   - Shows the CV Mama brand wordmark and logo on the left.
   - On small screens (`< 640px`), an expandable hamburger menu button (`ListIcon`) toggles a smooth mobile drawer containing Theme Toggle, Auth Status, Clear Chat, and Debug/MCP controls.

2. **Floating PWA Install Banner**:
   - When opened in a browser (Chromium/Android/Desktop) that supports PWA installation, a floating banner appears at the top of the chat feed with a prominent **"Install App"** CTA button.
   - For iOS Safari users, tapping "Install on iOS" presents an interactive modal guide detailing the 2-step Safari "Add to Home Screen" process.
   - Once installed or running in `standalone` mode, the banner automatically suppresses itself.

3. **Offline & Connectivity Support**:
   - Service worker caches the application bundle and static assets for instant offline load.
   - When network connectivity is lost, a quiet offline indicator banner informs the user that cached data is being displayed.

---

## 3. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CV Mama PWA Architecture                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                     Sticky Top Header                          │   │
│   │   [CV Mama Logo + Name]               [Hamburger Menu Button]  │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │ Toggles                            │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                 Expandable Mobile Menu Drawer                  │   │
│   │   • Auth / Cloud Sync Status    • Theme Toggle (Light/Dark)    │   │
│   │   • Clear Chat History          • Developer Tools (in dev mode) │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                 Floating PWA Install Banner                    │   │
│   │   "Install CV Mama on your home screen for quick access"       │   │
│   │   [Install App] / [iOS Guide]                    [Dismiss]     │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      Main Chat View                            │   │
│   │   • Master Data Onboarding / Profile Summary                   │   │
│   │   • Agent Streamdown Messages & Reasoning Processes            │   │
│   │   • Quick Action Suggestions                                   │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │           VitePWA Service Worker (Auto-Update Caching)          │   │
│   │   • Pre-caches App Shell, Fonts, Icons, and CSS                │   │
│   │   • Serves Web App Manifest (`/manifest.webmanifest`)          │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Proposed Changes & Implementation Steps

### Phase 1: PWA Package & Config (`vite-plugin-pwa`)
- Install `vite-plugin-pwa` as a dev dependency.
- Configure `vite.config.ts` to include `VitePWA` plugin:
  - `registerType: 'autoUpdate'`
  - `devOptions: { enabled: true }`
  - Web App Manifest definition (`name: "CV Mama Career Agent"`, `short_name: "CVMama"`, `start_url: "/"`, `display: "standalone"`, `theme_color: "#4898AD"`, `background_color: "#0d0e11"`).
- Update `env.d.ts` / `tsconfig.json` to include `"vite-plugin-pwa/client"` types.

### Phase 2: PWA Icons & Assets
- Generate compliant PNG icons in `public/`:
  - `pwa-192x192.png`
  - `pwa-512x512.png`
  - `apple-touch-icon.png` (180x180)
  - `pwa-maskable-512x512.png`
- Update `index.html` head tags to link `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` and manifest links.

### Phase 3: PWA Hooks & Components
- Create `src/hooks/usePWAInstall.ts`:
  - Captures `beforeinstallprompt` event.
  - Detects standalone mode and iOS Safari device.
  - Returns `install()`, `isInstallable`, `isInstalled`, and `isIOS`.
- Create `src/components/PWAInstallBanner.tsx`:
  - Floating dismissible banner positioned at the top of the chat area.
  - Step-by-step modal popup for iOS users.
- Create `src/hooks/useOnlineStatus.ts` and `src/components/OfflineIndicator.tsx`.

### Phase 4: Mobile Header Redesign & Expandable Drawer
- In `src/app.tsx`:
  - Convert `<header>` into a sticky top bar (`sticky top-0 z-30`).
  - Add brand logo + "CV Mama Career Agent" wordmark.
  - Add mobile hamburger button trigger for `<640px>` screens.
  - Build expandable mobile drawer menu displaying:
    - Auth & Cloud Sync Status controls (`AuthNavControls`).
    - Agent Online / Connection status badge.
    - Theme Toggle button (`SunIcon` / `MoonIcon`).
    - Clear Chat History button.
    - Dev Tools (MCP & Debug switch when in dev mode).
  - Mount `PWAInstallBanner` floating at the top of the chat view.

---

## 5. Verification & Testing Checklist

- [ ] **Mobile Header Verification**: Verify header is sticky, visible on mobile viewports, and expandable menu opens and closes cleanly.
- [ ] **PWA Manifest Verification**: Verify Web App Manifest serves with correct `id`, `start_url`, `theme_color`, and icon definitions.
- [ ] **Install Prompt Verification**: Verify floating install banner appears, triggers native install prompt on supported browsers, and shows iOS instructions on Safari.
- [ ] **Service Worker Verification**: Verify service worker registers and precaches static assets for offline availability.
- [ ] **Build & Lint Verification**: Run `compile_applet` and `lint_applet` to confirm zero compilation or linter errors.
