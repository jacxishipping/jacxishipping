---
name: design-index-research-fix
description: >-
  Use this skill when the user asks to index the entire design system/UI across
  a codebase, research UI/UX patterns and accessibility/responsive gaps, and
  systematically fix and enhance the UI/UX end-to-end.
---

# Design Index -> Research -> Fix UI/UX

A three-phase workflow for indexing an application's entire design surface, researching structural/UX/accessibility gaps, and applying high-leverage UI/UX fixes from shared primitives outward.

## Reference Templates (Progressive Disclosure)

- Use [Design Index & Research Matrix Template](./references/design-index-template.md) when documenting Phase 1 and Phase 2 outputs.

---

## Phase 1: Index the Whole Design

1. **Inventory Design Tokens & Rules:**
   - Read theme/token sources (`src/app/globals.css`, `tailwind.config.*`, `TEAM_DESIGN_SYSTEM_RULES.txt`, MUI/theme providers).
   - Record canonical colors, typography, spacing, border radii, shadows, and breakpoints.
2. **Inventory Shared UI Primitives:**
   - List all reusable components in `src/components/design-system/` (buttons, cards, badges, tables, modals, drawers, skeletons, empty states, form controls) and shell components (`Header`, `Footer`, `DashboardSurface`, `Sidebar`).
3. **Inventory All Routes & Views:**
   - Enumerate all pages (`src/app/**/page.tsx`) grouped by auth scope (`Public`, `Portal`, `Dashboard / Operational`, `Auth`).
4. **Detect Pattern Drift:**
   - Flag hardcoded hex colors bypassing CSS variables, leftover dark-mode classes (`bg-gray-900`, `mix-blend-difference`, heavy `rgba(0,0,0,0.8)` shadows), ad-hoc buttons/cards duplicating `design-system/*`, and missing `tabular-nums` on financial/KPI metrics.
   - Save the inventory using the [Design Index Template](./references/design-index-template.md).

---

## Phase 2: Do Deep UI/UX Research

1. **Codebase Pattern Research:**
   - Use targeted searches (or the `research` subagent for broad surveys) to trace where drifted tokens, undersized touch targets, missing `aria-label`s, or heading skips (`h1 -> h3`) occur across routes.
2. **Live Multi-Viewport Inspection:**
   - Run the `browser` subagent (or `deep-ui-ux-investigator` skill) across Desktop (`1440x900`), Tablet (`768x1024`), and Mobile (`375x812`) — using `waitUntil: 'domcontentloaded'` when SSE streams stay open.
   - Collect: `hasHorizontalOverflow`, sticky-bar viewport ratio (`<= 25%`), WCAG 2.2 AA touch targets (`>= 24x24px` minimum, `>= 44x44px` primary mobile), unlabeled SVG buttons, contrast failures (e.g., `#D4AF37` text on white/light surfaces vs. `#8D7A1F` `--accent-gold-text`), and interactive state actuation (tabs, filters, modals, drawers).
3. **Benchmark & Prioritize:**
   - Compare findings against enterprise light-theme ergonomics, WCAG 2.2 AA, and complete state coverage (loading skeletons, empty states, error alerts, toast feedback).
   - Rank issues `P0` (broken/invisible/unusable) -> `P1` (accessibility/touch-target/contrast/navigation) -> `P2` (hierarchy/polish) -> `P3` (micro-copy/spacing), mapped to exact `file:///...#L10-L20` lines.

---

## Phase 3: Fix & Elevate UI/UX

1. **Fix Shared Primitives First (High Leverage):**
   - Update global tokens (`globals.css`) and shared `src/components/design-system/*` components first so improvements propagate across all routes automatically.
2. **Remediate Page & Feature Components:**
   - Apply `P0` -> `P1` -> `P2` fixes in small, clean batches without altering business logic, auth, or API contracts.
   - Enforce:
     - `var(--accent-gold-text)` (`#8D7A1F`, `4.54:1` AA) for small gold text on light surfaces; `var(--accent-gold)` (`#D4AF37`) for icons, borders, and progress fills.
     - `tabular-nums` on KPIs, currency, counts, and percentages.
     - `>= 44x44px` primary mobile touch targets and `>= 24x24px` minimum interactive targets.
     - Explicit `aria-label` on every icon-only button and strict `h1 -> h2 -> h3` heading order.
3. **Verify End-to-End:**
   - Run `npx tsc --noEmit` and `npm run lint` (`exit code 0`).
   - Re-verify modified routes in the `browser` subagent at Desktop, Tablet, and Mobile (`hasHorizontalOverflow === false`, `0` unlabeled buttons, `0` interactive targets `< 24px`).
