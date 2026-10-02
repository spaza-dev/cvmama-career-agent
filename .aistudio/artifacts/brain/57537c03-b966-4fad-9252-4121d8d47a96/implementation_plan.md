# Modular Autonomous Career Intelligence Platform Architecture (Cloudflare Workers AI, AI Gateway & Browser Run)

An end-to-end modular architecture and implementation plan for **CVMama**, an autonomous, proactive AI Career Agent built on **Cloudflare Workers AI (`env.AI`), Cloudflare AI Gateway, and Cloudflare Browser Run (`env.BROWSER` with Stagehand & Puppeteer)**. Features templated PDF/DOCX resume generation, automated application execution, clean in-stream chat widgets, and dynamic slide-over drawers—**100% preserving the existing single-panel UI layout**.

---

## User Review & Technology Stack Constraints

> [!IMPORTANT]
> **Strict Technology Stack Specifications**:
> 1. **UI Layout Constraint**: Single-panel chat interface (no dual-pane). In-stream chat widgets provide high-level summaries, while dynamic slide-over drawers provide deep inspection, editing, and live previews.
> 2. **AI Infrastructure**: 100% Cloudflare Workers AI (`env.AI`) and Cloudflare AI Gateway via bindings and headers (`cf-aig-gateway-id`). No direct third-party AI SDKs.
> 3. **Document Rendering (PDF & DOCX)**: Templated HTML resume and cover letter rendering converted to high-fidelity PDF via **Cloudflare Browser Run (`@cloudflare/puppeteer` / `/pdf` endpoint)** and styled DOCX files via structured document synthesis (`docx` / `mammoth`).
> 4. **Browser Automation Engine**: **Stagehand (`@browserbasehq/stagehand`) on Cloudflare Browser Run (`env.BROWSER`)** for resilient, AI-driven job sourcing, career page scraping, and automated form filling with human handoff sign-off.

---

## 1. Cloudflare Browser Run & Stagehand Integration Architecture

### Browser Run Engine (`src/tools/browserRun.ts`)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        SERVER & WORKERS AGENT CORE (server.ts)                         │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                    ChatAgent Orchestrator (Durable Object)                     │   │
│   │             Workers AI + Cloudflare AI Gateway ("cvmama-gateway")             │   │
│   └───────────────────────────────────────┬────────────────────────────────────────┘   │
│                                           │                                            │
│                       ┌───────────────────▼───────────────────┐                        │
│                       │    Cloudflare Browser Run Engine     │                        │
│                       │          (env.BROWSER Binding)        │                        │
│                       └───────────────────┬───────────────────┘                        │
│                                           │                                            │
│         ┌─────────────────────────────────┴─────────────────────────────────┐          │
│         │                                                                   │          │
┌─────────▼─────────────────────────────┐         ┌───────────────────────────▼─────────┐│
│ Stagehand AI Automation Engine        │         │ HTML-to-PDF Rendering Engine        ││
│ (@browserbasehq/stagehand v2.5.x)     │         │ (@cloudflare/puppeteer)             ││
│ · stagehand.act() - Fill Forms        │         │ · page.setContent(htmlTemplate)     ││
│ · stagehand.extract() - Scrape Jobs   │         │ · page.pdf({ format: 'A4' })        ││
│ · stagehand.observe() - Detect Fields │         │ · Styled DOCX Document Synthesis    ││
└─────────┬─────────────────────────────┘         └───────────┬─────────────────────────┘│
          │                                                   │                          │
          └─────────────────────────────────┬─────────────────┘                          │
                                            │                                            │
                         ┌──────────────────▼──────────────────┐                         │
                         │ Dynamic Drawers & User Handoff UI   │                         │
                         │ (Live Portal Preview & Sign-Off)    │                         │
                         └─────────────────────────────────────┘                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Catalog of Inline Chat Widgets & Dynamic Drawers

All user interactions strictly preserve the existing single-panel Kumo layout:

### A. Resume & Cover Letter Module (Templated PDF & DOCX)
- **Inline Widget**: `ResumeOnboardingWidget` (Parse confirmation card with extracted metrics)
- **Inline Widget**: `TailoredPackageWidget` (ATS alignment score, key edits summary, PDF/DOCX download triggers)
- **Dynamic Drawer**: `ResumeMasterDataDrawer` (Full JSON Resume schema editor & section tabs)
- **Dynamic Drawer**: `TailoredDocumentPreviewDrawer` (HTML template picker, side-by-side ATS resume & cover letter PDF viewer, DOCX export, and diff editor)

### B. Job Search, Sourcing & Application Module (Stagehand Automation)
- **Inline Widget**: `JobMatchCardWidget` (Compact match card with `tabular-nums` match score)
- **Inline Widget**: `ApplicationAutomationWidget` (Live Stagehand automation step progress tracker)
- **Dynamic Drawer**: `JobDetailsDrawer` (Full job description, required skills, and salary benchmarks)
- **Dynamic Drawer**: `ApplicationHandoffDrawer` (Live browser portal preview frame, pre-filled form fields, CAPTCHA/MFA prompt, and human sign-off button)

### C. Career Development Module
- **Inline Widget**: `RoadmapSummaryWidget` (Timeline summary card with 3 core milestone phases)
- **Inline Widget**: `SkillGapAlertWidget` (Missing skills alert card with 1-click course search)
- **Dynamic Drawer**: `CareerRoadmapDrawer` (Interactive milestone chart & skill gap radar)
- **Dynamic Drawer**: `CourseDiscoveryDrawer` (Curated certifications, courses, and mentor discoveries)

### D. Interview Preparation Module
- **Inline Widget**: `MockInterviewQuestionWidget` (Question card with voice recorder)
- **Inline Widget**: `StarFeedbackWidget` (STAR framework rating scorecard)
- **Dynamic Drawer**: `InterviewStudioDrawer` (Webcam preview, audio monitor, & transcript log)
- **Dynamic Drawer**: `InterviewAnalyticsDrawer` (STAR breakdown & verbatim feedback)

---

## 3. Complete Tool Inventory & Model / Engine Mapping

| Tool Name | Category & Purpose | Underlying Engine / Service | Gateway / Routing Config |
| :--- | :--- | :--- | :--- |
| **Agent Orchestrator** | Intent analysis & workflow routing | Workers AI `@cf/meta/llama-3.3-70b-instruct` | `cf-aig-gateway-id: cvmama-gateway` |
| `parseResumeText` | Parses PDF/DOCX to JSON Resume | Workers AI `@cf/meta/llama-3.3-70b-instruct` | `cf-aig-gateway-id: cvmama-gateway` |
| `renderResumeHtml` | Generates HTML resume from templates | Internal Template Engine (Modern, Tech, Exec) | Local Synthesis |
| `generatePdfWithBrowserRun` | Converts HTML templates to PDF | Cloudflare Browser Run (`@cloudflare/puppeteer`) | `env.BROWSER` Binding |
| `generateDocxDocument` | Synthesizes styled `.docx` files | Structured DOCX Writer (`docx` library) | Local Synthesis |
| `sourceJobListings` | Searches & aggregates job postings | Workers AI `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b` | `cf-aig-gateway-id: cvmama-gateway` |
| `calculateJobMatchScore` | Vector embeddings & match scoring | Workers AI `@cf/baai/bge-large-en-v1.5` | Direct `env.AI` Binding |
| `generateTailoredResume` | ATS keyword resume tailoring | Workers AI `@cf/qwen/qwen2.5-coder-32b-instruct` | `cf-aig-gateway-id: cvmama-gateway` |
| `generateCoverLetter` | Hiring team cover letters | Workers AI `@cf/meta/llama-3.3-70b-instruct` | `cf-aig-gateway-id: cvmama-gateway` |
| `automateApplicationWithStagehand` | Automated form filling on career portals | Stagehand (`@browserbasehq/stagehand`) | `env.BROWSER` + Workers AI |
| `requestHumanHandoff` | Pauses automation at sign-off / CAPTCHA | Application Handoff Drawer State | User Handoff Event |
| `analyzeSkillGaps` | Skill gap benchmark calculations | Workers AI `@cf/meta/llama-3.3-70b-instruct` | `cf-aig-gateway-id: cvmama-gateway` |
| `generateCareerRoadmap` | Milestone & roadmap synthesis | Workers AI `@cf/meta/llama-3.3-70b-instruct` | `cf-aig-gateway-id: cvmama-gateway` |
| `generateInterviewQuestions` | Company-tailored interview questions | Workers AI `@cf/meta/llama-3.3-70b-instruct` | `cf-aig-gateway-id: cvmama-gateway` |
| `evaluateStarResponse` | STAR response rubric scoring | Workers AI `@cf/meta/llama-3.3-70b-instruct` | `cf-aig-gateway-id: cvmama-gateway` |

---

## 4. Step-by-Step Implementation Strategy

1. **Phase 1: Cloudflare Browser Run, Workers AI Dispatcher & Dependencies**
   - Install required packages: `@cloudflare/puppeteer`, `@browserbasehq/stagehand`, `docx`.
   - Configure `wrangler.jsonc` with `browser` binding (`"browser": { "binding": "MY_BROWSER" }`).
   - Implement `src/ai/dispatcher.ts` for Workers AI and AI Gateway REST routing (`cf-aig-gateway-id`).

2. **Phase 2: Templated Document Synthesis & Stagehand Tools**
   - Create `src/tools/documentGenerator.ts`: HTML resume templates, Puppeteer PDF rendering via `env.BROWSER`, and `docx` synthesis.
   - Create `src/tools/stagehandAutomation.ts`: Stagehand AI browser actions for portal navigation and automated form filling.
   - Implement modular tool registry in `src/tools/` (`masterData.ts`, `sourcing.ts`, `application.ts`, `career.ts`, `interview.ts`, `mcp/`).

3. **Phase 3: Clean In-Stream Chat Widgets**
   - Build lightweight, professional widgets in `src/components/widgets/`:
     - `ResumeOnboardingWidget.tsx` & `TailoredPackageWidget.tsx`
     - `JobMatchCardWidget.tsx` & `ApplicationAutomationWidget.tsx`
     - `RoadmapSummaryWidget.tsx` & `SkillGapAlertWidget.tsx`
     - `MockInterviewQuestionWidget.tsx` & `StarFeedbackWidget.tsx`
   - Mount widgets directly into `ToolPartView` inside `src/app.tsx`.

4. **Phase 4: Dynamic Slide-Over Drawers System**
   - Build `TailoredDocumentPreviewDrawer.tsx` with PDF/DOCX template preview and download options.
   - Build `ApplicationHandoffDrawer.tsx` for live Stagehand automation preview and user sign-off.
   - Enhance `ResumeDrawer.tsx`, `CareerRoadmapDrawer.tsx`, `CourseDiscoveryDrawer.tsx`, `InterviewStudioDrawer.tsx`, and `InterviewAnalyticsDrawer.tsx`.

5. **Phase 5: Proactive Background Engine & Build Validation**
   - Configure Cloudflare Alarm / Scheduled Timers in `src/server.ts` for background job monitoring.
   - Run `lint_applet` and `compile_applet` to verify pristine compilation.
