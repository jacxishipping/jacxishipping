# Coding Agent Fix Plan: JACXI Shipping Dashboard

> [!TIP]
> Execute Batches 1–4 in order against `http://localhost:3000/dashboard`. Do not store credentials in commits. Prefer existing CSS variables in [`src/app/globals.css`](file:///c:/Users/Administrator/jacxishipping/src/app/globals.css).

You are a Senior Frontend Design Engineer and Accessibility Specialist. Fix the verified UI, UX, responsive, design system, and WCAG 2.2 AA issues from the live multi-viewport audit of the JACXI dashboard.

## Strict Engineering Constraints

1. **Preserve Existing Functionality:** Do not break RBAC nav, auth, API contracts, or business logic.
2. **Design Token Consistency:** Prefer `--accent-gold-text`, `--text-primary`, semantic `--success*` / `--warning*` / `--error*` over hardcoded hex.
3. **Responsive Safety:** Zero page-level horizontal overflow (`document.documentElement.scrollWidth <= window.innerWidth`) at `1440x900`, `768x1024`, `375x812`.
4. **WCAG 2.2 AA:** Normal text ≥4.5:1; large text/UI ≥3.0:1; touch targets ≥24×24 (prefer 44×44 on mobile); form inputs ≥16px on mobile; visible focus; labeled controls.

## Standardized Design Tokens to Enforce

```css
:root {
  /* Use existing tokens; introduce only if contrast requires it */
  --accent-gold: #D4AF37;           /* decorative / fills only */
  --accent-gold-text: #6B5C17;      /* bump from #8D7A1F to clear 4.5:1 on white */
  --accent-gold-text-on-tint: #5C4F14;
  --link-on-panel: var(--text-primary); /* links: primary text + gold underline/icon */
}
```

## Ordered Implementation Tasks

### Batch 1: P1 Critical Accessibility & Auth

- **[UI-001]** Gold text/link contrast — [invoices/page.tsx](file:///c:/Users/Administrator/jacxishipping/src/app/dashboard/invoices/page.tsx#L444-L454), [ShipmentRow.tsx](file:///c:/Users/Administrator/jacxishipping/src/components/dashboard/ShipmentRow.tsx#L222-L256), [InvoiceQuickPeek.tsx](file:///c:/Users/Administrator/jacxishipping/src/components/dashboard/InvoiceQuickPeek.tsx#L209-L228), [DashboardOperationsChart.tsx](file:///c:/Users/Administrator/jacxishipping/src/components/dashboard/DashboardOperationsChart.tsx#L164-L216)
  - **Observed:** `--accent-gold` / `--accent-gold-text` on white ≈ **2.01–4.25:1**.
  - **Required:** Darken `--accent-gold-text` for light theme; for table links use `color: var(--text-primary)` + gold underline/icon, not gold fill text.
  - **Verification:** Mega-probe `lowContrast` no longer includes container IDs / money amounts / chart tab labels.

- **[UI-002]** Workbench metric contrast — [DashboardTodayWork.tsx](file:///c:/Users/Administrator/jacxishipping/src/components/dashboard/DashboardTodayWork.tsx) (and related KPI chips on home)
  - **Observed:** `53` / `449` / `38` fail AA on `#F9FAFB`.
  - **Required:** Place numbers on tinted chips (`--error-light` / `--warning-light`) with `--error-dark` / `--warning-dark` text, or use primary text + colored left border.
  - **Verification:** Contrast ≥4.5:1 for those values.

- **[UI-003][UI-004]** Touch targets — list checkboxes + chart range pills
  - **Observed:** Checkboxes **16×16**; `7D/14D/30D` height **21–23px**.
  - **Required:** Wrap checkboxes in ≥24×24 (prefer 44 on mobile) hit areas; increase range button `min-h`/`min-w` to ≥32px.
  - **Verification:** Probe `below24Count` for those controls is 0.

- **[UI-005][UI-006][UI-013]** Auth + search labeling
  - Sign-in: raise input `font-size` to ≥16px; promote “Sign In” to `h1`.
  - Shipments/Invoices search: add `aria-label` or visible label (not placeholder-only).
  - **Verification:** Sign-in probe `iosZoomInputsCount === 0`; list pages `unlabeledCount === 0`; sign-in `h1Count === 1`.

### Batch 2: P1 Responsive Chrome

- **[UI-007]** Tablet breakpoint — [layout.tsx](file:///c:/Users/Administrator/jacxishipping/src/app/dashboard/layout.tsx), [Sidebar.tsx](file:///c:/Users/Administrator/jacxishipping/src/components/dashboard/Sidebar.tsx#L286-L339), [BottomNavigation.tsx](file:///c:/Users/Administrator/jacxishipping/src/components/mobile/BottomNavigation.tsx#L50-L51)
  - **Observed:** At `768x1024`, desktop sidebar hidden and bottom nav shown (`lg` = 1024).
  - **Required:** Either show a compact rail from `md` (768+) or keep mobile nav but declutter header; document the chosen breakpoint strategy.
  - **Verification:** At 768, primary nav remains usable without hunting; no overflow.

- **[UI-008]** Mobile header declutter — [Header.tsx](file:///c:/Users/Administrator/jacxishipping/src/components/dashboard/Header.tsx#L210-L295)
  - **Observed:** Hamburger + logo + search + add + export + theme + bell + settings + avatar on 375.
  - **Required:** Below `md`, keep Search + Account (+ Notifications); move Export / Theme / Shortcuts into overflow or account menu.
  - **Verification:** Header actions fit without colliding with logo at 375.

### Batch 3: P2 Consistency & Discoverability

- **[UI-009]** Shipments status pills scroll affordance — shipments filter row
  - Keep horizontal scroll; add `overflow-x-auto`, `scrollbar-gutter`, and optional right-edge fade so clipped pills are obvious.
  - **Verification:** At 375, page `scrollWidth <= innerWidth`; pills scrollable.

- **[UI-010]** Profile route alignment — Sidebar “My Profile” vs Header profile
  - Pick one canonical route (`/dashboard/profile` or `/dashboard/settings`) and update both labels/links.

- **[UI-011]** Token drift — replace hardcoded `#D4AF37` / `#96791F` avatar gradients and semantic hexes in dashboard components with CSS variables.

- **[UI-012]** Optional: add Finance to bottom nav or badge the Menu item when overdue invoices &gt; 0 (badges already exist via `/api/nav-badges`).

### Batch 4: P3 Polish

- **[UI-014]** Ensure dashboard shell uses `--font-inter` / Urbanist as computed font, not only `system-ui`.
- **[UI-015]** Tighten empty chart copy on home Movement Trends to a single actionable sentence.

## Post-Fix Verification Checklist

1. `npm run lint` (or project equivalent) — no new errors in touched files.
2. Re-run Unified Mega-Probe at `1440x900`, `768x1024`, `375x812` on `/dashboard`, `/dashboard/shipments`, `/dashboard/invoices`, `/auth/signin`:
   - `hasHorizontalOverflow === false`
   - No gold-on-white text under 4.5:1 for body/link text
   - Checkbox / range controls ≥24×24
   - Auth inputs ≥16px; search fields labeled
3. Manual: open mobile drawer from header and bottom Menu; close via X and overlay; confirm focus returns.
4. Spot-check light + dark themes for gold text token on both backgrounds.

## Out of Scope (unless requested)

- Full crawl of all 53 dashboard routes’ deep CRUD forms
- Dark-mode exclusive redesign
- Replacing JXUI / DataTable architecture wholesale
