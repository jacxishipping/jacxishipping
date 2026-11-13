---
name: ui-ux-enhancer
description: >-
  Use this skill when the user asks to enhance, polish, modernize, or elevate the
  UI/UX, visual hierarchy, responsive ergonomics, micro-interactions, or WCAG 2.2 AA
  craft of JACXI Shipping pages and components.
---

# UI/UX Enhancer (`jacxi-shipping`)

A systematic workflow for elevating visual craft, scannability, micro-interactions, responsive ergonomics, and accessibility without breaking existing functionality or design tokens.

## Reference Materials (Progressive Disclosure)

- Read [JACXI Design Tokens & Primitives](./references/jacxi-design-tokens.md) for the exact CSS variables, contrast rules, and `src/components/design-system/*` components.
- Always check [TEAM_DESIGN_SYSTEM_RULES.txt](../../../TEAM_DESIGN_SYSTEM_RULES.txt) and [globals.css](../../../src/app/globals.css) before introducing new colors or surface styles.

---

## Step 1: Audit Target Scope & Reuse Design-System Primitives

1. Inspect the target page/component and identify ad-hoc markup that should use existing primitives in `src/components/design-system/`:
   - Layout & Headers: `PageHeader`, `Breadcrumbs`, `DashboardSurface`, `DashboardPanel`, `DashboardGrid`
   - Data & Status: `StatsCard`, `StatusBadge`, `Table`, `MobileCard`, `MilestoneStepper`
   - Actions & Overlays: `Button`, `ActionButton`, `Modal`, `Drawer`, `Tooltip`, `Toast`
   - Feedback & Forms: `FormField`, `Select`, `EmptyState`, `LoadingState`, `PageSkeletons`, `Skeleton`
2. Never duplicate card/badge/button styles if a design-system primitive already provides them.

## Step 2: Elevate Visual Hierarchy & Light-Theme Craft

1. **Surface Discipline:** Use `var(--background)` (`#F9FAFB`) for page canvas, `var(--panel)` (`#FFFFFF`) for elevated cards, and `1px solid var(--border)` (`#E5E7EB`) with subtle elevation (`0 1px 3px rgba(15, 23, 42, 0.04)`, hover `0 8px 24px rgba(15, 23, 42, 0.08)`).
2. **Eliminate Dark-Mode Artifacts:** Remove leftover `rgba(0,0,0,0.8)` shadows, `mix-blend-difference`, `bg-[#F9FAFB]/[0.03]`, or dark-on-dark icon containers.
3. **Gold Contrast Rule (WCAG 2.2 AA):**
   - Use `var(--accent-gold)` (`#D4AF37`) for icons, borders, progress bars, and solid gold CTA backgrounds (with `#000000` or `#111827` text).
   - Use `var(--accent-gold-text)` (`#8D7A1F`, `4.54:1` contrast) for any small gold text, links, counts, or percentages rendered on `#FFFFFF` or `#F9FAFB`.
4. **Data Scannability:** Apply `tabular-nums` (`font-variant-numeric: tabular-nums`) to KPIs, currency amounts, counts, percentages, and table numeric columns so digits align cleanly.

## Step 3: Responsive & Touch-Target Ergonomics

1. **Zero Horizontal Overflow:** Ensure `scrollWidth <= innerWidth` across Desktop (`1440x900`), Tablet (`768x1024`), and Mobile (`375x812`). Always wrap dense tables in `overflow-x-auto` or switch to `MobileCard` on `xs`/`sm`.
2. **Touch Targets:**
   - Primary mobile buttons/CTAs and header triggers: `>= 44x44px` (`min-h-[44px]`).
   - Secondary links, chips, and inline controls: `>= 24x24px` (WCAG 2.2 SC 2.5.8 minimum; prefer `32px+` on mobile).
3. **iOS Input Safety:** Keep mobile form controls at `>= 16px` font-size so iOS Safari does not auto-zoom on focus.

## Step 4: Micro-Interactions, States & Accessibility

1. **Interactive Polish:** Add crisp `transition-all duration-200`, subtle hover lift (`-translate-y-0.5` or border highlight), and clear `:focus-visible` rings (`rgba(var(--accent-gold-rgb), 0.35)`).
2. **Complete UI States:** Ensure loading states use skeletons (`PageSkeletons` / `Skeleton`), empty results render actionable `EmptyState`s, and async actions surface feedback via `Toast`.
3. **Semantics & ARIA:**
   - Every icon-only button must have an explicit `aria-label` (and `aria-expanded` for toggles/drawers).
   - Maintain strict heading hierarchy (`h1 -> h2 -> h3`) with zero skipped levels.

## Step 5: Verify Changes

1. Run `npx tsc --noEmit` and `npm run lint` to confirm zero TypeScript or ESLint errors.
2. Verify live in the `browser` subagent at `1440x900`, `768x1024`, and `375x812` (using `waitUntil: 'domcontentloaded'` on authenticated `/dashboard/*` routes due to the `/api/notifications/stream` SSE connection), confirming:
   - `hasHorizontalOverflow === false`
   - `0` unlabeled icon buttons
   - `0` interactive targets `< 24px` (`>= 44px` for primary mobile actions)
   - Clean visual polish in screenshots.
