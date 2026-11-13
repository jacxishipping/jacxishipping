---
name: deep-ui-ux-investigator
description: >-
  Deep, multi-viewport UI/UX, visual design, accessibility (WCAG 2.2 AA), and
  interactive component investigator tailored for Google Antigravity. Drives
  Antigravity's built-in `browser` subagent (`invoke_subagent` / `send_message`)
  or Browserbase + Stagehand cloud sessions across PC/desktop, iPad/tablet, and
  mobile viewports, maps live DOM issues directly to workspace source files
  (`file:///...#L10-L20`), and generates both a rich `ui-ux-audit-report.md` and
  an executable `agent-fix-prompt.md`. Use whenever the user asks for a deep
  UI/UX audit, design analysis, multi-viewport check (desktop, tablet, mobile),
  full-site component scan, or wants a report plus a fix prompt for a website or
  web app.
---

# Deep UI/UX Investigator (Antigravity Native Edition)

An end-to-end website intelligence, design-system reverse-engineering, source-code mapping, and multi-viewport QA skill built specifically for **Google Antigravity**. It combines live browser actuation across 7 desktop, tablet, and mobile viewports with workspace source-code cross-referencing to produce two comprehensive deliverables:
1. **`ui-ux-audit-report.md`** — Full multi-viewport audit report with scorecard, coverage matrix, screenshot carousels, Mermaid flowcharts, and source-linked issue register.
2. **`agent-fix-prompt.md`** — Copy-paste-ready (or immediately executable) engineering remediation plan ordered from `P0` to `P3`.

---

## When to Use

- The user provides a URL (or a local dev server like `http://localhost:3000`) and asks for a deep UI/UX, design, responsive, or usability audit.
- The user wants every page, tab, modal, drawer, dropdown, and form scanned across **PC (Desktop)**, **iPad (Tablet)**, and **Mobile** viewports.
- The user asks for both a full audit report file and an agent prompt file to fix all detected issues.
- The user wants to audit an authenticated web app or dashboard behind a sign-in wall.
- The user wants to detect horizontal overflow, undersized touch targets, WCAG 2.2 AA contrast/accessibility barriers, design token drift, or generic AI/template design patterns.

---

## Antigravity Execution Engines (Choose Best Fit)

Antigravity supports two browser execution paths for this skill:

### 1. Primary Path: Antigravity Built-in `browser` Subagent (`invoke_subagent`)
- Delegate live browser navigation, viewport resizing, interactive clicking, and JS probe execution to the `browser` subagent via `invoke_subagent`:
  - `TypeName: "browser"`
  - `Model: "flash"` (default for `browser` subagent unless the user requests another model)
  - `Role: "Multi-Viewport UI/UX Auditor"`
- **Batching in Few Steps:** Instruct the `browser` subagent to run the **Unified Mega-Probe** in [dom-audit-probes.md](./references/dom-audit-probes.md) across viewports and batch-test tabs/accordions/modals in single script steps rather than one tool call per click.
- **Interactive Pause & Resume (`send_message`):** If the `browser` subagent pauses at a login wall, 2FA prompt, or payment gate, ask the user in chat and resume the **same** subagent tab using `send_message` with its `conversationId` (never spawn a duplicate browser subagent for the same flow, and never kill an idle browser subagent).
- **Host Verification (`BROWSER_HOST_FACTS`):** Always verify visited origins, blocked origins, and screenshot paths against the host's `BROWSER_HOST_FACTS` system message before citing them as verified evidence.
- **Staging Reference Mockups:** If comparing the live UI against local design mockups or reference screenshots, copy them first into `<Artifact Directory Path>/browser_sandbox/references/<filename>` and pass that full path to the `browser` subagent.

### 2. Cloud Path: Browserbase + Stagehand v4 (When Requested or for Cloud Replay)
- If `BROWSERBASE_API_KEY` is configured and the user wants a shareable **Browserbase Live View & Session Replay** (`https://www.browserbase.com/sessions/<full-session-id>`), run the multi-viewport probes via Stagehand v4 (`browserbase.launch({ apiKey })`, `page.setViewportSize(w, h)`, `page.evaluate(...)`, `stagehand.observe()`, `stagehand.act()`) and include the full session replay link in the audit report.

### 3. Workspace Source-Code Mapping (When Auditing the Current Repo)
- Whenever the target URL belongs to the active workspace (e.g., Next.js / React app in the repo), map every discovered DOM selector, route, and design token discrepancy back to the exact workspace source file and line range (`[Component.tsx](file:///absolute/path/to/Component.tsx#L15-L42)`).

---

## Multi-Viewport Test Matrix

Test every core page and interactive state across all three viewport tiers:

| Tier | Viewports (`width x height`) | Key Checks |
| :--- | :--- | :--- |
| **PC / Desktop** | `1440x900` (primary), `1920x1080` (ultrawide), `1366x768` (laptop) | Max-width container alignment, multi-column grid balance, hover/focus states, table density, ultrawide stretching |
| **iPad / Tablet** | `768x1024` (portrait), `1024x768` (landscape) | Sidebar-to-drawer transition, 2-column card wrapping, touch target spacing, table horizontal scroll containers |
| **Mobile** | `375x812` (compact iOS/Android), `430x932` (large mobile) | `scrollWidth <= innerWidth` (zero horizontal overflow), touch targets `>= 44x44px` (`>= 24x24px` WCAG min), input `font-size >= 16px` (no iOS zoom), sticky header `<= 15%` viewport height, mobile drawer/bottom-sheet traps |

---

## Handling Local Dev Servers & Authenticated Web Apps

### Local Dev Server Auto-Start
- If the user asks to audit the current repo locally and no server is running yet, start the dev server in the background using `run_command` (`IsDaemon: true`, `WaitMsBeforeAsync: 5000`), then immediately delegate opening `http://localhost:<PORT>` to the `browser` subagent (`invoke_subagent`). Do **not** scrape or probe `localhost` with `curl` instead of the browser.

### Sign-In & Auth Walls (`/login`, `/signin`, `/auth`)
1. **Audit the Login Screen First:** Before logging in, run the full Desktop + Mobile probe on the sign-in screen itself (input labels, `font-size >= 16px`, contrast, password visibility toggle, error states, OAuth alignment, keyboard tab order).
2. **Choose the Appropriate Auth Path:**
   - **Test / Demo Credentials:** If the user explicitly provides test credentials (or a local dev seed account exists in the repo and the user approves using it), have the `browser` subagent sign in and wait for post-login navigation. Never echo or write credentials into report or prompt files.
   - **Manual Takeover / 2FA / OAuth:** Never ask the user to paste personal passwords or OTPs in chat. When the `browser` subagent pauses for user login in the browser pane, ask the user to complete sign-in and reply, then call `send_message` with the existing `conversationId` to continue crawling authenticated routes.
3. **Authenticated Crawl Safety & Anti-Bot Rules:**
   - Never click `Log Out`, `Sign Out`, `Delete Account`, `Revoke Token`, or destructive/live billing submit buttons during automated traversal.
   - Never solve, click through, or bypass CAPTCHAs, Cloudflare Turnstile, reCAPTCHA, or anti-bot challenges. If gated by one, stop and report the block to the user.

---

## 6-Phase Investigation Workflow

Follow these 6 phases in order. Read [dom-audit-probes.md](./references/dom-audit-probes.md) for the exact JavaScript probes (or load [run-dom-probes.js](./scripts/run-dom-probes.js)) and [deliverable-templates.md](./references/deliverable-templates.md) before generating Phase 6 files.

### Phase 1: Launch & Full-Site Reconnaissance
1. If auditing a workspace project, quickly inspect the router structure (`src/app/`, `pages/`, navigation components, and theme/token files like `tailwind.config.ts` or `src/lib/design-tokens.ts`) so you know every expected route and design token.
2. Invoke the `browser` subagent (`invoke_subagent`, `TypeName: "browser"`, `Model: "flash"`) with a clear prompt and completion condition to open the target URL at `1440x900`, wait for full DOM/font/stylesheet hydration, capture console/network errors, and run **Probe 1 (Page & Internal Link Discovery)** from [dom-audit-probes.md](./references/dom-audit-probes.md).
3. Build a complete **Page Inventory** (`URL`, `Route Type`, `Auth Scope: Public | Authenticated`, `Source File` if workspace repo, `Status`).

### Phase 2: Exhaustive Page, Tab & Component Traversal (Desktop)
For each route in the Page Inventory, instruct the `browser` subagent to:
1. Navigate to the route, scroll top-to-bottom to trigger lazy-loaded sections, and check for console/runtime errors, failed network requests (`status >= 400`), and broken images (`naturalWidth === 0`) or 0x0 SVGs/canvases.
2. Run **Probe 2 (Interactive Elements & Tabs Discovery)** and systematically click every:
   - Tab (`[role="tab"]`, `.tab`, `[data-state]`)
   - Accordion / collapsible (`[aria-expanded]`, `<details>`)
   - Dropdown / select / filter pill / segmented control
   - Modal / dialog / drawer trigger (verifying focus trap and `Escape` / close button dismissal)
3. Test form states safely (empty required field blur/validation, input focus rings, label click binding) without submitting destructive or external data.
4. Run **Probe 4 (Design System Token Extraction)** and **Probe 5 (WCAG 2.2 AA Contrast, Semantics & Media Health)**.
5. Record every component's status as `WORKING`, `PARTIALLY WORKING`, `BROKEN`, `NOT TESTED`, or `BLOCKED`.

### Phase 3: Multi-Viewport Responsive Scan (iPad & Mobile)
Instruct the `browser` subagent to iterate through **`768x1024`**, **`1024x768`**, **`375x812`**, and **`430x932`** across core pages and active tab states, running **Probe 3 (Responsive Overflow, Stacking & Touch Target Probe)** at each size:
- Detect horizontal overflow (`document.documentElement.scrollWidth > window.innerWidth`) and log the exact offending CSS selectors and bounding boxes.
- Detect clipped text (`scrollWidth > clientWidth` with `overflow: hidden` and no ellipsis), overlapping fixed/sticky elements, and off-screen interactive controls.
- Flag undersized touch targets (`< 44x44px` best practice, `< 24x24px` WCAG 2.2 AA `2.5.8 Target Size Minimum`).
- Flag form inputs with computed `font-size < 16px` on mobile (triggers forced iOS Safari viewport zoom).
- Flag sticky headers + bottom bars consuming `> 20%` of mobile viewport height.
- Test mobile hamburger navigation drawers (open, verify scroll lock & link visibility, close).

### Phase 4: Design System, Copywriting, Source Code & AI-Pattern Synthesis
Synthesize the collected DOM telemetry, screenshots, and workspace source files across five lenses:
1. **Design System Reverse Engineering & Token Drift:** Compare live computed tokens (`topTextColors`, `topBackgroundColors`, `topFontFamilies`, `topFontSizes`, `topBorderRadii`, `boxShadows`, `spacing`) against the project's intended design system (e.g., CSS variables, Tailwind theme, MUI theme). Flag arbitrary magic numbers and inconsistent button/card/input variants.
2. **WCAG 2.2 AA Accessibility & Keyboard UX:** Consolidate real computed luminance contrast failures (`< 4.5:1` normal text, `< 3.0:1` large text/UI components), missing `:focus-visible` indicators, missing `alt` attributes, unlabeled form controls, heading hierarchy skips (`h1 -> h3`), and missing ARIA states (`aria-expanded`, `aria-selected`, `aria-modal`).
3. **Copywriting & Microcopy Audit:** Evaluate headlines, CTAs, empty states, loading skeletons, table headers, and error messages for clarity, domain precision, and actionability. Flag generic filler buzzwords (*seamless, cutting-edge, elevate, unleash, next-gen*).
4. **AI-Like / Generic Template Indicator Score (`0-100%`):** Score observable layout and styling heuristics (`0-5` each): overused purple/indigo hero glow gradients, repetitive 3-column icon-in-circle cards, unmotivated glassmorphism, uniform AI-generated stock copy, and lack of domain-specific data density. Frame strictly as visual/UX heuristics, never proof of authorship.
5. **Workspace Source-Code Mapping (if repo available):** Pinpoint the exact `.tsx` / `.jsx` / `.css` files and line numbers responsible for each UI bug.

### Phase 5: Consolidate Prioritized Issue Register (`P0` – `P3`)
Assign every verified finding a unique ID (`UI-001`, `UI-002`, ...) and severity:
- **`P0` (Critical):** Broken primary user flow, dead navigation/tabs, auth deadlock, overlapping/unclickable CTA, severe mobile horizontal overflow or drawer trap, critical WCAG blocker.
- **`P1` (High):** Minor horizontal overflow on tablet/mobile, text contrast `< 4.5:1`, touch targets `< 24x24px`, broken responsive grid wrapping, missing form labels/validation feedback, mobile input `font-size < 16px`.
- **`P2` (Medium):** Design token drift (hardcoded hexes/spacing), touch targets `24px-43px`, heading level skips, suboptimal empty/loading states, weak microcopy.
- **`P3` (Low):** Cosmetic alignment polish, micro-typography rhythm, subtle hover/focus transition refinement.

### Phase 6: Generate Dual Deliverable Files + Antigravity Artifacts
Generate **two separate markdown files** using the templates in [deliverable-templates.md](./references/deliverable-templates.md):
1. **`ui-ux-audit-report.md`** — Save in the workspace (or user-requested path) **and** in the Antigravity Artifact Directory (`<appDataDir>\brain\<conversation-id>\ui-ux-audit-report.md` with `ArtifactMetadata: { UserFacing: true, RequestFeedback: false }`).
   - Use Antigravity formatting features:
     - GitHub-style alerts (`> [!IMPORTANT]`, `> [!WARNING]`, `> [!TIP]`) — never placed consecutively.
     - Mermaid diagrams (`flowchart LR` for user-flow friction points or `xychart-beta` for the executive scorecard).
     - ````carousel blocks with `<!-- slide -->` comments for Desktop vs. Tablet vs. Mobile screenshots (copy any `BROWSER_HOST_FACTS`-verified screenshots into `<appDataDir>\brain\<conversation-id>\` first before embedding with `![caption](/absolute/path)`).
     - Clickable `[filename.tsx](file:///absolute/path/to/filename.tsx#L10-L25)` links for every workspace source file referenced.
2. **`agent-fix-prompt.md`** — Save in the workspace (or user-requested path) **and** in the Antigravity Artifact Directory (`<appDataDir>\brain\<conversation-id>\agent-fix-prompt.md` with `ArtifactMetadata: { UserFacing: true, RequestFeedback: true }`).
   - Self-contained, ordered remediation plan (`Batch 1: P0` -> `Batch 2: P1` -> `Batch 3: P2` -> `Batch 4: P3`) with exact selectors, source file links, before/after code diffs, CSS token definitions, and automated verification checks.

After creating the artifacts, **do not re-summarize the entire report in chat** — point the user to the two artifacts, highlight the top 3 `P0`/`P1` takeaways, and ask if they want you to execute `agent-fix-prompt.md` immediately!

---

## Gotchas & Guardrails

- **Never invent URLs, selectors, screenshots, or CSS values:** Every selector, RGB/hex value, contrast ratio, and console error must come from actual browser probe execution, and every cited screenshot or visited URL must match `BROWSER_HOST_FACTS`.
- **Never probe localhost with `curl` to bypass the browser:** Always use the `browser` subagent (or Browserbase session) to inspect live rendered DOM/CSS.
- **Never log or store secrets:** Never write passwords, session tokens, cookies, or API keys into `ui-ux-audit-report.md` or `agent-fix-prompt.md`.
- **Mark untestable states honestly:** If a route requires permissions or credentials not provided, record it as `BLOCKED (Auth Required)` rather than guessing its layout.
