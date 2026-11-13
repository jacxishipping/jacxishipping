# JXUI Knowledgebase — All 361 Components

JXUI (`@jacxishippingorg/jx-ui-react`, version 3.0.0) is a React and TypeScript component library and interactive design-system workbench. It rebuilds the Material UI (MUI) Core, Lab and X component set with tactile spring interactions, specular glassmorphism, and stable component geometry across state changes — buttons, inputs and cards keep their intended dimensions where the component supports it, instead of resizing when a spinner or label swaps in.

This knowledgebase covers the whole library: what it is, how to install and theme it, and a reference entry for every one of its 361 components, grouped by its 18 categories. It is grounded in the live workbench at https://jxui-react.vercel.app and in the JXUI v3.0.0 source (the fixed source tree from 6 November 2026, which is ahead of the live deployment — see Known gaps at the end).

## JXUI at a glance

| Fact | Value |
| :--- | ---: |
| Package | `@jacxishippingorg/jx-ui-react` |
| Version | 3.0.0 |
| Total components | 361 |
| System A — interactive showcases | 61 |
| System B — modular primitives | 300 |
| Categories | 18 |
| Core (Stable) components | 303 |
| Lab (Experimental) components | 58 |
| Difficulty split | 153 beginner, 100 intermediate, 56 advanced, 52 enterprise |
| Peer dependencies | react, react-dom, motion, lucide-react |
| Styling | Tailwind CSS v4 + native CSS variables (zero-runtime CSS) |
| Licence | MIT |

## The 18 categories

| # | Category | Total | Showcases | Primitives |
| ---: | :--- | ---: | ---: | ---: |
| 1 | Buttons & Actions | 24 | 4 | 20 |
| 2 | Glassmorphism & Surfaces | 24 | 4 | 20 |
| 3 | Navigation & Wayfinding | 30 | 10 | 20 |
| 4 | Inputs & Forms | 32 | 7 | 25 |
| 5 | Toggles & Selection | 18 | 3 | 15 |
| 6 | Modals & Overlays | 22 | 2 | 20 |
| 7 | Notifications & Feedback | 17 | 2 | 15 |
| 8 | Loading & Progress | 17 | 2 | 15 |
| 9 | Cards & Content | 22 | 2 | 20 |
| 10 | Data Visualization | 21 | 1 | 20 |
| 11 | Tables & Data Grids | 18 | 3 | 15 |
| 12 | Drag & Drop | 15 | 0 | 15 |
| 13 | Layout & Workspace | 20 | 5 | 15 |
| 14 | Animation & Motion | 16 | 1 | 15 |
| 15 | AI Components | 16 | 1 | 15 |
| 16 | Editors & Creative Tools | 17 | 2 | 15 |
| 17 | Time & Scheduling | 12 | 2 | 10 |
| 18 | Advanced Utilities | 20 | 10 | 10 |


## How to read this knowledgebase

Every component entry in the reference gives the same six things: its category and type, its purpose, the Material UI flaw it is designed to fix, when to use it, its key props or API, and a copyable JSX example from the JXUI catalog, plus its keyboard and ARIA notes and its source file where it has one.

One distinction matters before you rely on a props list, because JXUI's components are not all built the same way:

- **Typed props (119 entries).** The component declares a `…Props` type. The entry lists the real fields from that type, and the source file.
- **No props (231 entries).** The component is declared as `React.FC` with no props at all. It is a self-contained piece with internal state and demo data: drop it in as-is, or copy its source file and wire your own data and callbacks in. Its JSX example is a bare tag such as `<DonutChart />` for exactly this reason.
- **Composite entries (11 entries).** A few entries, such as `JXDataGrid` and `JXSecurityVaultCard`, are demonstrated inside the workbench and category showcase files rather than exported as one standalone component. Their entries list the props the JXUI catalog documents for them, and say so.

Two labels appear on every entry. **Showcase** versus **Primitive** says which system the component came from. **Core — Stable** versus **Lab — Experimental** is the maturity tier: Core components are the stable, Material UI-parity task components, and Lab components are the experimental, effect-led ones (glass, glow, liquid and magnetic effects). Across the library there are 303 Core and 58 Lab components; among the 61 showcases, 60 are Core and only `JXSpotlightDock` is Lab.

## Getting started

Install the package together with its peer dependencies:

```bash
npm install @jacxishippingorg/jx-ui-react motion lucide-react
# pnpm add @jacxishippingorg/jx-ui-react motion lucide-react
# yarn add @jacxishippingorg/jx-ui-react motion lucide-react
# bun add @jacxishippingorg/jx-ui-react motion lucide-react
```

Wrap the application in `JXThemeProvider` so components inherit the accent palette, radius scale, dark mode and the built-in toast queue, then import components from the package root:

```tsx
import React from 'react';
import { JXThemeProvider, JXButton, TiltCard } from '@jacxishippingorg/jx-ui-react';

export function App() {
  return (
    <JXThemeProvider defaultMode="dark">
      <div className="p-8 space-y-6">
        <TiltCard
          title="Specular Depth"
          subtitle="True 3D perspective pitch and yaw tracking cursor coordinates."
        />
        <JXButton variant="contained" color="primary" spring morphSuccess lockWidth>
          Deploy Production Build
        </JXButton>
      </div>
    </JXThemeProvider>
  );
}
```

`JXThemeProvider` takes `children`, an optional `defaultMode` (`'light'` or `'dark'`, used when no saved preference exists) and an optional `storageKey` for the persisted mode. The accent, radius scale and compare mode are changed at runtime through `useJXTheme()` and are persisted to local storage by the provider — they are not provider props.

Development commands from the repository: `npm run dev` starts the interactive workbench, `npm test` runs the logic unit tests, `npm run test:e2e` runs the Playwright browser tests, `npm run lint` is strict TypeScript checking (`tsc --noEmit`), and `npm run build` builds the production bundle. `npm run build:lib` builds the publishable library and its type declarations.

## Architecture and naming

JXUI is two systems unified in one catalog, one theme and one package entry point (`src/index.ts` re-exports everything).

**System A — 61 interactive showcases.** These are the Material UI-parity components, named with a `JX` prefix (`JXButton`, `JXTextField`, `JXDataGrid`). They live in `src/components/` grouped by role: `inputs/`, `data-display/`, `feedback/`, `surfaces/`, `navigation/` and `layout-utils/`. Each showcase is a full state machine with live telemetry in the workbench, a documented keyboard contract and an explicit diff against the Material UI behaviour it replaces.

**System B — 300 modular primitives.** These are named without the prefix (`LiquidButton`, `TiltCard`, `SmartDataTable`) and live in `src/components/library/`, one folder per category (`buttons/`, `glassmorphism/`, `navigation/`, `inputs/`, `toggles/`, `modals/`, `feedback/`, `loading/`, `cards/`, `dataviz/`, `datagrids/`, `dragdrop/`, `layout/`, `animation/`, `ai/`, `editors/`, `time/`, `utilities/`). They are the effect-led building blocks: 3D tilt, magnetic cursor pull, rotary and slider physics, glass surfaces and spring transitions.

**Naming convention.** A component's exported API name never changes. Its display name is the API name with the `JX` prefix stripped and camel case split — `JXButton` displays as "Button", `JXToggleButtonGroup` as "Toggle Button Group". Search and documentation use the display name; code always uses the API name.

**Workbench tooling is part of the package too.** The barrel also exports the documentation and workbench components the live site itself is built from: `ComponentDocumentation`, `DocumentationCenter`, `InteractiveComponentPreview`, `CommandFinderModal`, `DesignTokenExporter`, `AccessibilityAriaSection`, `JX290LibraryExplorer`, `GitHubPage`, and the shell pieces `AppHeader`, `AppSidebar` and `AppWorkbench`.

## Theming, tokens and design foundations

### The theme provider and `useJXTheme()`

`JXThemeProvider` (`src/context/JXThemeContext.tsx`) owns mode, accent, radius, compare mode and toasts. `useJXTheme()` returns:

| Member | Type or values | What it does |
| :--- | :--- | :--- |
| `mode` / `setMode` / `toggleMode` | `'light'` \| `'dark'` | Colour mode; sets the `dark` class, `data-theme` and `color-scheme` on the document root |
| `accent` / `setAccent` | `'indigo'` \| `'violet'` \| `'emerald'` \| `'rose'` \| `'ocean'` | Active accent palette |
| `palette` | `AccentPalette` | Tailwind class bundle for the accent: `bg`, `bgHover`, `text`, `border`, `softBg`, `ring`, `gradient`, plus `name` and `hex` |
| `radiusScale` / `setRadiusScale` | `'sharp'` \| `'sm'` \| `'md'` \| `'lg'` \| `'xl'` | Global corner-radius scale |
| `getRadiusClass(tier)` | tier: `'control'` \| `'card'` \| `'pill'` | Radius utility class for that tier at the active scale |
| `compareMode` / `setCompareMode` | `'jxui'` \| `'split'` | Workbench comparison view against Material UI |
| `pushToast` / `dismissToast` / `clearToasts` / `triggerPromiseToast` | `ToastItem[]` state | The built-in toast queue; a toast has `title`, optional `description`, a `variant` of `default`, `success`, `warning`, `error` or `loading`, and an optional `undoAction` |

Mode, accent, radius and compare mode persist to local storage (mode under `jxui-theme-mode` by default).

### Accent palettes

| Palette | Primary hex | Gradient |
| :--- | :--- | :--- |
| Indigo | `#4f46e5` | indigo-600 to violet-600 |
| Violet | `#7c3aed` | violet-600 to fuchsia-600 |
| Emerald | `#059669` | emerald-600 to teal-600 |
| Rose | `#e11d48` | rose-600 to orange-500 |
| Ocean | `#0284c7` | sky-600 to cyan-500 |

Each palette also generates an 11-stop tonal scale (50–950). For Indigo: 50 `#eef2ff`, 100 `#e0e7ff`, 200 `#c7d2fe`, 300 `#a5b4fc`, 400 `#818cf8`, 500 `#6366f1`, 600 `#4f46e5`, 700 `#4338ca`, 800 `#3730a3`, 900 `#312e81`, 950 `#1e1b4b`. The accent drives the CSS variables `--jx-accent`, `--jx-accent-soft` and the focus halo `--jx-accent-halo`.

### Surfaces, elevation, radius and typography

Light surfaces: canvas `#F8FAFC`, elevated card `#FFFFFF`, subtle shelf `#F1F5F9`, translucent glass `rgba(255, 255, 255, 0.82)`, hairline border `rgba(15, 23, 42, 0.07)`. Text: primary `#0F172A`, secondary `#475569`, muted `#64748B`. Dark mode follows a three-tier hierarchy instead of arbitrary greys: canvas `#0B0F19`, elevated `#111827`, subtle `#1E293B`.

Elevation is three utility classes, each combining a soft drop shadow with a top specular highlight (`inset 0 1px 0 0 rgba(255, 255, 255, 0.80)` in light mode, `0.06`–`0.10` opacity in dark mode): `.jx-elevation-1` for controls and secondary surfaces, `.jx-elevation-2` for floating cards and dropdowns, `.jx-elevation-3` for modals and overlays.

Radius presets: `none` 0px, `sm` 8px, `md` 12px, `lg` 16px, `xl` 24px, `full` 9999px. At the large scale the exported tokens are control radius 12px, card radius 16px and pill radius 9999px.

Typography: sans is `'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif`; mono is `'JetBrains Mono', monospace`; heading tracking is tight at `-0.015em`. Numeric counters, metrics, ratings and timestamps use `font-mono tabular-nums` so digits never reflow. Body and demo text has a 12px floor (`text-xs`) in the fixed source — the 9–11px text sizes in the live deployment were removed as a copyable pattern.

Spacing is a 4px-based scale added to the token export in the fixed source: 0, 4, 8, 12, 16, 24, 32, 48 and 64px, exported as a `spacing` group in JSON and as `--jx-spacing-*` variables in CSS.

There are two colour systems and only one source of truth. The JXUI tokens are authoritative and are the only set the exporter writes. The Material-style colour scheme in the CSS layer (`src/index.css`, Tailwind v4 `@theme`) is a compatibility layer that maps Material-style roles — `primary`, `secondary`, `tertiary`, surface containers, `on-surface`, `outline`, and the status colours success `#10B981`, warning `#F59E0B`, danger `#EF4444`, info `#0EA5E9` — onto JXUI values. Where the two disagree, the JXUI token wins.

### Motion and tactile feedback

Motion tokens: spring easing `cubic-bezier(0.22, 1, 0.36, 1)`, press scale `0.98`, backdrop blur `16px`. The design spec's spring constants are stiffness 400 and damping 25, with active press compression of `scale 0.98` on large surfaces and `active:scale-95` on small controls. Magnetic and dock components pull toward the cursor with a cosine-bell falloff over a proximity threshold, and several controls use pointer capture so a drag continues outside the element's bounds.

The tactile engine (`tactile`, from `src/utils/tactileAudio.ts`) is a zero-dependency Web Audio synthesizer with haptics: `playClick()` is a sine sweep from 800Hz to 320Hz over 40ms, `playSuccess()` is a three-note triad (C5 523Hz, E5 659Hz, G5 784Hz, staggered by 60ms), and supported mobile devices get `navigator.vibrate([10, 30, 20])`.

### Design token exporter

The workbench's token exporter generates a downloadable bundle synchronised with the active theme, in two formats: W3C Design Tokens JSON (`$schema: https://tr.designtokens.org/format/`, with `$value` and `$type` per token) and CSS custom properties. The file name encodes the theme, for example `jxui-tokens-indigo-light-lg.json`. The JSON groups are `color` (accent name, primary, hover, focus halo and the 11-stop scale; surface; text), `geometry` (radius), `elevation`, `motion` and `typography`. The logic lives in `generateDesignTokensJSON()` and `generateDesignTokensCSS()` in `src/utils/jxuiLogic.ts`, driven by a `DesignTokenExportConfig` of mode, accent and radius scale.

## Hooks and utilities

| Export | Source | What it does |
| :--- | :--- | :--- |
| `useJXTheme()` | `src/context/JXThemeContext.tsx` | Mode, accent, palette, radius, compare mode and toasts — see Theming above |
| `useLockGeometry(options)` | `src/utils/useLockGeometry.ts` | Locks an element's bounding geometry across state changes so a loading or success state cannot shift the layout; returns the ref and locked dimensions |
| `tactile` | `src/utils/tactileAudio.ts` | Synthesized click and success sounds plus haptic vibration |
| `calculatePasswordEntropy(password)` | `src/utils/jxuiLogic.ts` | Password entropy estimate and strength result, used by the password components |
| `getRatingSentiment(value)` | `src/utils/jxuiLogic.ts` | Text sentiment label for a rating value |
| `parseNaturalLanguageDate(input)` | `src/utils/jxuiLogic.ts` | Parses natural-language dates for the smart calendar and scheduling components |
| `fuzzyScore(text, query)` | `src/utils/jxuiLogic.ts` | Fuzzy match score used for highlighted autocomplete and search results |
| `exportRowsToCSV(rows)` | `src/utils/jxuiLogic.ts` | Serialises grid rows to CSV for the data-grid export panels |
| `computeDockIconKinematics(...)` | `src/utils/jxuiLogic.ts` | Proximity scale and offset maths for dock and magnetic components |
| `calculateTierPricing(...)` | `src/utils/jxuiLogic.ts` | Tiered pricing maths behind the pricing matrix and cards |
| `computeTrafficSplitState(weight)` | `src/utils/jxuiLogic.ts` | Canary rollout state for the traffic splitter |
| `generateDesignTokensJSON/CSS(config)` | `src/utils/jxuiLogic.ts` | The token exporter output described above |
| `getComponentAccessibilitySpec(spec)` / `evaluateAccessibilityAudit(...)` | `src/utils/jxuiLogic.ts` | Per-component accessibility spec and audit summary used by the accessibility checklist |
| Collections helpers | `src/utils/jxuiCollections.ts` | Favourites and custom component collections, persisted under `jxui_collections_v2`, with JSON export and import; three default collections ship: Enterprise Dashboard Kit, High-Converting Forms & Auth, and Tactile Landing Page Bento |
| Recently viewed helpers | `src/utils/jxuiLogic.ts` | Records up to 8 recently viewed components under `jxui-recently-viewed` |

## Accessibility, keyboard and responsive rules

WCAG 2.2 AA is JXUI's design target. It is a target, not a certification: every component entry in this reference repeats the standing instruction to run contrast and assistive-technology checks before claiming conformance for a given use.

The library-wide rules are: a 44px minimum touch target on mobile (`min-h-[44px] min-w-[44px] touch-manipulation`); a visible focus ring drawn from `--jx-accent-halo`; semantic ARIA live regions for asynchronous feedback; keyboard contracts documented per component — the recurring ones are Tab to move focus, Space and Enter to activate, Escape to close an overlay, and the arrow keys to move inside composite widgets such as sliders, tabs, menus, radio groups and grids. Overlays are expected to trap focus while open and return it on close. Skeletons match the destination component's border radius and height so content does not jump when it arrives.

Responsive behaviour is documented per component in the catalog as designed for mobile, tablet and desktop. In the workbench shell, the sidebar collapses to a focus-trapped drawer below the `lg` breakpoint, and the filter toolbar, theme studio and playground stack or wrap on small screens, with a 375px mobile stage in the playground.

## The live workbench

The site at https://jxui-react.vercel.app is the library's own workbench, built from the same source. Its main views are the **workbench** (component catalog with live previews, split comparison against Material UI, per-component documentation and copyable JSX), **docs** (`?view=docs`, the documentation centre), the **GitHub page** (`?view=github-page`), the **live playground** (props editor, live stage at fluid, 375px mobile, tablet and desktop widths, and a TSX code exporter) and the **design token exporter**. A command finder (Cmd+K) searches all 361 components by name, subtitle and tags; favourites and collections are stored locally. The view, active category and section are reflected in the URL so a category can be linked directly.

## Choosing a component

| You need to… | Start with |
| :--- | :--- |
| Trigger an action | `JXButton`, then the Category 1 variants — `HoldToConfirmButton` for a destructive action, `SlideToAction` for an authorisation, `SplitButton` for an action with options |
| Build a form | `JXTextField`, `JXSelect`, `JXAutocomplete`, `JXCheckbox`, `JXRadioGroup`, `JXSwitch`, `JXSlider` (Category 4 and 5 showcases) |
| Capture a code, signature or colour | `OTPInput` or `PinInput`, `SignaturePad`, `ColorPicker` (Category 4) |
| Show a person, status or count | `JXAvatar`, `JXBadge`, `JXChip`, `StatusIndicator` (Categories 7 and 18) |
| Confirm or interrupt | `JXDialog`, `CommandPalette`, `Drawer`, `BottomSheet` (Category 6) |
| Report an outcome | `JXAlert`, `JXSnackbar`, `SmartToast`, `UndoNotification` (Category 7), or the provider's `pushToast` |
| Fill a loading gap | `JXSkeleton`, `SkeletonCard`, `SkeletonTable`, `JXProgress` (Category 8) |
| Present one record or metric | `MetricCard`, `TiltCard`, `PricingCard`, `ProfileCard`, `ProductCard` (Category 9) |
| Chart data | `Sparkline` for inline, `AnimatedLineChart`, `DonutChart`, `RadarChart`, `SankeyDiagram`, `Treemap` for full charts (Category 10) |
| Work with many rows | `JXDataGrid`, `SmartDataTable`, `VirtualizedTable`, `TreeTable`, `PivotTable` (Category 11) |
| Let users rearrange things | `SortableList`, `KineticKanban`, `DragDropUpload`, `SnapGrid` (Category 12) |
| Structure a workspace | `SplitPane`, `PanelGroup`, `WindowManager`, `DockManager`, `InfiniteCanvas` (Category 13) |
| Build an AI surface | `AIChatPanel`, `AIComposer`, `AIStreamingText`, `AIToolCall`, `AIApprovalCard`, `AICitationCard` (Category 15) |
| Edit content | `RichTextEditor`, `CodeEditor`, `JsonEditor`, `MarkdownEditor`, `BlockEditor` (Category 16) |
| Pick or plan time | `DateRangePicker`, `SmartCalendar`, `Scheduler`, `GanttChart`, `CountdownTimer` (Category 17) |

## Component reference

The 361 entries below are grouped by category, with showcases first and primitives after, in alphabetical order within each group. Import any of them by its API name from `@jacxishippingorg/jx-ui-react`, inside a `JXThemeProvider`.

### 1. Buttons & Actions — 24 components

Magnetic attraction, liquid gel morphing, zero-shift states, spring physics, and hold-to-confirm safeguards. This category has 4 showcase(s) and 20 primitive(s). Reach for it for a primary, secondary or destructive action a user triggers directly.

**In this category:** `JXButton`, `JXButtonGroup`, `JXFab`, `JXToggleButtonGroup`, `AnimatedButtonGroup`, `CommandButton`, `ExpandableButton`, `FloatingActionButton`, `GestureButton`, `GlowButton`, `GradientButton`, `HoldToConfirmButton`, `LiquidButton`, `MagneticButton`, `MagneticIconButton`, `MorphButton`, `MultiStateButton`, `ParticleButton`, `RippleButton`, `ShimmerButton`, `SlideToAction`, `SpeedDial`, `SplitButton`, `SpringButton`

#### `JXButton` — Morphing Tactile Button

- **Category / type:** 1. Buttons & Actions · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Morphing Tactile Button. Title Case typography, top specular highlight, press compression (scale 0.98), and 3-state inline morphing (idle -> loading -> success/error) with locked width.
- **What it fixes vs Material UI:** ALL-CAPS text, dated ink ripple, layout shift when showing a loading spinner.
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need morphing tactile button.
- **Key props / API:** `JXButtonProps` — `variant?: 'contained' | 'soft' | 'outlined' | 'text' | 'glass'`; `size?: 'sm' | 'md' | 'lg'`; `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral'`; `loading?: boolean`; `morphState?: JXButtonMorphState`; `morphSuccess?: boolean`; `loadingLabel?: string`; `successLabel?: string`; `errorLabel?: string`; `lockWidth?: boolean`; `spring?: boolean`; `halo?: boolean`; `startIcon?: React.ReactNode`; `endIcon?: React.ReactNode` — plus 1 more in `JXButtonProps`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/inputs/JXButton.tsx`

```tsx
<JXButton
  variant="contained"
  color="primary"
  spring
  morphSuccess
  lockWidth
  onClick={async () => await deployRelease()}
>
  Deploy Production Build
</JXButton>
```

#### `JXButtonGroup` — Segmented Pill & Split Action Bar

- **Category / type:** 1. Buttons & Actions · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Segmented Pill & Split Action Bar. Smooth floating sliding background pill indicator for active state, unified focus halo, and split-button dropdown support.
- **What it fixes vs Material UI:** Harsh 1px divider lines that overlap awkwardly on focus.
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need segmented pill & split action bar.
- **Key props / API:** `JXButtonGroupProps` — `items: JXButtonGroupItem[]`; `activeId?: string`; `defaultActiveId?: string`; `onChange?: (id: string) => void; variant?: 'segmented' | 'outlined' | 'contained'; size?: 'sm' | 'md' | 'lg'; splitActionLabel?: string; onSplitPrimaryClick?: (activeId: string) => void; splitMenuItems?: JXSplitActionItem[]; disabled?: boolean; ariaLabel?: string; className?: string;`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/inputs/JXButtonGroup.tsx`

```tsx
<JXButtonGroup variant="segmented" activeId={view} onChange={setView}>
  <JXButton id="board">Kanban Board</JXButton>
  <JXButton id="timeline">Gantt Timeline</JXButton>
  <JXButton id="metrics">Velocity Metrics</JXButton>
</JXButtonGroup>
```

#### `JXFab` — Floating Action Island

- **Category / type:** 1. Buttons & Actions · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Floating Action Island. Dynamic scroll-aware morphing (collapses from extended pill with label into compact icon circle on scroll down), glassmorphic backdrop, and notification badge.
- **What it fixes vs Material UI:** Static circular button that covers mobile content.
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need floating action island.
- **Key props / API:** `JXFabProps` — `label?: string`; `icon?: React.ReactNode`; `extended?: boolean`; `autoCollapseOnScroll?: boolean`; `glass?: boolean`; `badgeCount?: number`; `size?: 'sm' | 'md' | 'lg'`; `position?: 'inline' | 'bottom-right' | 'bottom-center'`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/inputs/JXFab.tsx`

```tsx
<JXFab
  extended={!isScrolledDown}
  glass
  badgeCount={3}
  icon={<PlusIcon />}
  label="Create Issue"
/>
```

#### `JXToggleButtonGroup` — Animated Segmented Control

- **Category / type:** 1. Buttons & Actions · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Animated Segmented Control. Inset recessed track (#F1F5F9) with an elevated white floating pill (elevation-1) that glides smoothly between active options.
- **What it fixes vs Material UI:** Flat boxy buttons with harsh borders.
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need animated segmented control.
- **Key props / API:** `JXToggleButtonGroupProps` — `options?: JXToggleOption[]`; `value?: string`; `defaultValue?: string`; `exclusive?: boolean`; `onChange?: (val: string) => void; ariaLabel?: string; disabled?: boolean; helperText?: string; className?: string;`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/inputs/JXToggleButton.tsx`

```tsx
<JXToggleButtonGroup value={interval} exclusive onChange={setInterval}>
  <JXToggleButton value="24h">24 Hours</JXToggleButton>
  <JXToggleButton value="7d">7 Days</JXToggleButton>
  <JXToggleButton value="30d">30 Days</JXToggleButton>
</JXToggleButtonGroup>
```

#### `AnimatedButtonGroup` — Connected segment group with sliding pill

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Connected segment group with sliding pill. Gliding active indicator
- **What it fixes vs Material UI:** Discrete jarring tab clicks
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need connected segment group with sliding pill.
- **Key props / API:** `AnimatedButtonGroupProps` — `options?: string[]`; `value?: string`; `onChange?: (val: string) => void;`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/AnimatedButtonGroup.tsx`

```tsx
<AnimatedButtonGroup />
```

#### `CommandButton` — Integrated keyboard shortcut badge

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Integrated keyboard shortcut badge. Embedded ⌘K badge
- **What it fixes vs Material UI:** No shortcut affordance
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need integrated keyboard shortcut badge.
- **Key props / API:** `CommandButtonProps` — `label?: string`; `shortcut?: string`; `variant?: 'solid' | 'soft' | 'outline' | 'glass'`; `tone?: 'primary' | 'success' | 'warning' | 'danger'`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/CommandButton.tsx`

```tsx
<CommandButton />
```

#### `ExpandableButton` — Collapsed icon expanding on hover

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Collapsed icon expanding on hover. Zero-shift fluid expansion
- **What it fixes vs Material UI:** Fixed text taking layout room
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need collapsed icon expanding on hover.
- **Key props / API:** `ExpandableButtonProps` — `icon?: React.ComponentType<{ className?: string }>`; `label?: string`; `onClick?: () => void; variant?: 'solid' | 'soft' | 'outline' | 'glass'; tone?: 'primary' | 'success' | 'warning' | 'danger';`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/ExpandableButton.tsx`

```tsx
<ExpandableButton />
```

#### `FloatingActionButton` — Elevated action button with spring pop

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Elevated action button with spring pop. Tactile luminescence floating pill
- **What it fixes vs Material UI:** Rigid material elevation
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need elevated action button with spring pop.
- **Key props / API:** `FloatingActionButtonProps` — `icon?: React.ComponentType<{ className?: string }> | React.ReactNode`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/FloatingActionButton.tsx`

```tsx
<FloatingActionButton />
```

#### `GestureButton` — Double-tap and swipe gesture trigger

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Double-tap and swipe gesture trigger. Multi-touch gesture support
- **What it fixes vs Material UI:** Mouse-only assumption
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need double-tap and swipe gesture trigger.
- **Key props / API:** `GestureButtonProps` — `onSwipeRight?: () => void; label?: string;`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/GestureButton.tsx`

```tsx
<GestureButton />
```

#### `GlowButton` — Dynamic luminescent drop glow

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Lab — Experimental · Difficulty: beginner · v3.0.0
- **Purpose:** Dynamic luminescent drop glow. Palette-reactive glow
- **What it fixes vs Material UI:** Static box shadow
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need dynamic luminescent drop glow.
- **Key props / API:** `GlowButtonProps` — `children?: React.ReactNode`; `variant?: 'solid' | 'soft' | 'outline' | 'glass'`; `tone?: 'primary' | 'success' | 'warning' | 'danger'`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/GlowButton.tsx`

```tsx
<GlowButton />
```

#### `GradientButton` — Animated gradient sweep

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Lab — Experimental · Difficulty: beginner · v3.0.0
- **Purpose:** Animated gradient sweep. Hardware smooth gradient
- **What it fixes vs Material UI:** CSS filter lag
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need animated gradient sweep.
- **Key props / API:** `GradientButtonProps` — `children?: React.ReactNode`; `variant?: 'solid' | 'soft' | 'outline' | 'glass'`; `tone?: 'primary' | 'success' | 'warning' | 'danger'`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/GradientButton.tsx`

```tsx
<GradientButton />
```

#### `HoldToConfirmButton` — Long-press safeguard progress fill

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Long-press safeguard progress fill. 1.5s press confirmation
- **What it fixes vs Material UI:** Accidental one-click destruction
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need long-press safeguard progress fill.
- **Key props / API:** `HoldToConfirmButtonProps` — `label?: string`; `onConfirm?: () => void; holdDurationMs?: number; variant?: 'solid' | 'soft' | 'outline' | 'glass'; tone?: 'primary' | 'success' | 'warning' | 'danger';`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/HoldToConfirmButton.tsx`

```tsx
<HoldToConfirmButton />
```

#### `LiquidButton` — Fluid morphing gel with specular highlights

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Lab — Experimental · Difficulty: beginner · v3.0.0
- **Purpose:** Fluid morphing gel with specular highlights. Liquid specular sheen
- **What it fixes vs Material UI:** Flat solid color fill
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need fluid morphing gel with specular highlights.
- **Key props / API:** `LiquidButtonProps` — `children?: React.ReactNode`; `variant?: 'solid' | 'soft' | 'outline' | 'glass'`; `tone?: 'primary' | 'success' | 'warning' | 'danger'`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/LiquidButton.tsx`

```tsx
<LiquidButton />
```

#### `MagneticButton` — Cursor magnetic tracking with physics pull

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Lab — Experimental · Difficulty: beginner · v3.0.0
- **Purpose:** Cursor magnetic tracking with physics pull. Elastic cursor gravitation
- **What it fixes vs Material UI:** Rigid static bounding box
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need cursor magnetic tracking with physics pull.
- **Key props / API:** `MagneticButtonProps` — `children?: React.ReactNode`; `strength?: number`; `variant?: 'solid' | 'soft' | 'outline' | 'glass'`; `tone?: 'primary' | 'success' | 'warning' | 'danger'`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/MagneticButton.tsx`

```tsx
<MagneticButton />
```

#### `MagneticIconButton` — Circular icon button with magnetic snap

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Lab — Experimental · Difficulty: beginner · v3.0.0
- **Purpose:** Circular icon button with magnetic snap. Tactile magnetic attraction
- **What it fixes vs Material UI:** Standard icon button
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need circular icon button with magnetic snap.
- **Key props / API:** `MagneticIconButtonProps` — `icon?: React.ComponentType<{ className?: string }>`; `variant?: 'solid' | 'soft' | 'outline' | 'glass'`; `tone?: 'primary' | 'success' | 'warning' | 'danger'`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/MagneticIconButton.tsx`

```tsx
<MagneticIconButton />
```

#### `MorphButton` — Stable 3-state morphing (idle/load/success)

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Stable 3-state morphing (idle/load/success). Preserves dimensions during supported state changes
- **What it fixes vs Material UI:** Layout jumps on spinner entrance
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need stable 3-state morphing (idle/load/success).
- **Key props / API:** `MorphButtonProps` — `status?: 'idle' | 'loading' | 'success' | 'error'`; `variant?: 'solid' | 'soft' | 'outline' | 'glass'`; `tone?: 'primary' | 'success' | 'warning' | 'danger'`; `idleText?: string`; `loadingText?: string`; `successText?: string`; `errorText?: string`; `onTrigger?: () => void;`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/MorphButton.tsx`

```tsx
<MorphButton />
```

#### `MultiStateButton` — Status cycle through 4 workflow stages

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Status cycle through 4 workflow stages. One-click tactile cycle
- **What it fixes vs Material UI:** Separate modal dropdown
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need status cycle through 4 workflow stages.
- **Key props / API:** `MultiStateButtonProps` — `states?: string[]`; `activeState?: string`; `onCycle?: (nextState: string) => void;`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/MultiStateButton.tsx`

```tsx
<MultiStateButton />
```

#### `ParticleButton` — Micro-burst particles on click

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Lab — Experimental · Difficulty: beginner · v3.0.0
- **Purpose:** Micro-burst particles on click. Celebratory particle burst
- **What it fixes vs Material UI:** Static click
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need micro-burst particles on click.
- **Key props / API:** `ParticleButtonProps` — `children?: React.ReactNode`; `variant?: 'solid' | 'soft' | 'outline' | 'glass'`; `tone?: 'primary' | 'success' | 'warning' | 'danger'`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/ParticleButton.tsx`

```tsx
<ParticleButton />
```

#### `RippleButton` — Upgraded coordinate wave ripple

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Upgraded coordinate wave ripple. GPU-accelerated wave
- **What it fixes vs Material UI:** Heavy DOM ripple nodes
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need upgraded coordinate wave ripple.
- **Key props / API:** `RippleButtonProps` — `children?: React.ReactNode`; `variant?: 'solid' | 'soft' | 'outline' | 'glass'`; `tone?: 'primary' | 'success' | 'warning' | 'danger'`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/RippleButton.tsx`

```tsx
<RippleButton />
```

#### `ShimmerButton` — Continuous metallic sheen ray

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Lab — Experimental · Difficulty: beginner · v3.0.0
- **Purpose:** Continuous metallic sheen ray. Ray shimmer transition
- **What it fixes vs Material UI:** Plain border
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need continuous metallic sheen ray.
- **Key props / API:** `ShimmerButtonProps` — `children?: React.ReactNode`; `variant?: 'solid' | 'soft' | 'outline' | 'glass'`; `tone?: 'primary' | 'success' | 'warning' | 'danger'`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/ShimmerButton.tsx`

```tsx
<ShimmerButton />
```

#### `SlideToAction` — Swipe slider pill to authorize action

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Swipe slider pill to authorize action. Smooth drag authorization
- **What it fixes vs Material UI:** Requires modal confirmation
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need swipe slider pill to authorize action.
- **Key props / API:** `SlideToActionProps` — `onComplete?: () => void; label?: string; completedText?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/SlideToAction.tsx`

```tsx
<SlideToAction />
```

#### `SpeedDial` — Radial / vertical secondary quick actions

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Radial / vertical secondary quick actions. Clean animated action stack
- **What it fixes vs Material UI:** Z-index collision issues
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need radial / vertical secondary quick actions.
- **Key props / API:** `SpeedDialProps` — `actions?: SpeedDialAction[]`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/SpeedDial.tsx`

```tsx
<SpeedDial />
```

#### `SplitButton` — Primary action plus dropdown chevron

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Primary action plus dropdown chevron. Unified tactile split pill
- **What it fixes vs Material UI:** Awkward disconnected border
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need primary action plus dropdown chevron.
- **Key props / API:** `SplitButtonProps` — `label?: string`; `options?: string[]`; `onPrimaryClick?: () => void; onSelectOption?: (opt: string) => void; variant?: 'solid' | 'soft' | 'outline' | 'glass'; tone?: 'primary' | 'success' | 'warning' | 'danger';`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/SplitButton.tsx`

```tsx
<SplitButton />
```

#### `SpringButton` — Tactile spring scale on press

- **Category / type:** 1. Buttons & Actions · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Tactile spring scale on press. Cubic bezier spring release
- **What it fixes vs Material UI:** Abrupt linear transitions
- **When to use:** Use it for a primary, secondary or destructive action a user triggers directly — specifically when you need tactile spring scale on press.
- **Key props / API:** `SpringButtonProps` — `children?: React.ReactNode`; `variant?: 'solid' | 'soft' | 'outline' | 'glass'`; `tone?: 'primary' | 'success' | 'warning' | 'danger'`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/buttons/SpringButton.tsx`

```tsx
<SpringButton />
```

### 2. Glassmorphism & Surfaces — 24 components

Specular reflections, multi-layer diffuse blurs, adaptive theme tinting, and spatial translucent workspaces. This category has 4 showcase(s) and 20 primitive(s). Reach for it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel.

**In this category:** `JXAccordion`, `JXAppBar`, `JXCard`, `JXPaper`, `AdaptiveGlass`, `DynamicGlassPanel`, `FrostedGlass`, `GlassButton`, `GlassCard`, `GlassCommandMenu`, `GlassDock`, `GlassFloatingPanel`, `GlassInput`, `GlassModal`, `GlassNavbar`, `GlassNotification`, `GlassPopover`, `GlassSheet`, `GlassSidebar`, `GlassTabs`, `GlassToolbar`, `GlassTooltip`, `LiquidGlass`, `SpatialGlassWorkspace`

#### `JXAccordion` — Smooth Spring Disclosure

- **Category / type:** 2. Glassmorphism & Surfaces · Showcase (System A) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Smooth Spring Disclosure. Separated rounded bento cards or unified soft container, physics height animation, custom + / × morph icon, and subtitle metadata in header.
- **What it fixes vs Material UI:** Sharp borders, jumping margins when expanded, clunky chevron rotation.
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need smooth spring disclosure.
- **Key props / API:** `JXAccordionProps` — `items?: JXAccordionItemData[]`; `defaultOpenIds?: string[]`; `defaultOpenId?: string | null`; `variant?: JXAccordionVariant`; `iconMode?: JXAccordionIconMorph`; `allowMultiple?: boolean`; `onExpandChange?: (openIds: string[]) => void; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/surfaces/JXAccordion.tsx`

```tsx
<JXAccordion variant="bento" iconMode="plus-cross" items={faqItems} />
```

#### `JXAppBar` — Floating Glass Navigation Header

- **Category / type:** 2. Glassmorphism & Surfaces · Showcase (System A) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Floating Glass Navigation Header. Supports sticky frosted glass (backdrop-blur-md bg-white/75) or floating pill island mode (top-4 mx-auto rounded-2xl) with integrated ⌘K trigger.
- **What it fixes vs Material UI:** Solid colored block glued to the top of the screen.
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need floating glass navigation header.
- **Key props / API:** `JXAppBarProps` — `title?: string`; `islandMode?: boolean`; `defaultIslandMode?: boolean`; `onIslandModeChange?: (island: boolean) => void; showModeToggle?: boolean; commandShortcut?: string; onCommandClick?: () => void; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/surfaces/JXAppBar.tsx`

```tsx
<JXAppBar mode="floating-island" glass commandShortcut="⌘K" />
```

#### `JXCard` — Bento Surface with Cursor Spotlight Glow

- **Category / type:** 2. Glassmorphism & Surfaces · Showcase (System A) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Bento Surface with Cursor Spotlight Glow. Bento-ready surface with subtle specular border, cursor-tracking radial spotlight glow on hover, interactive lift, and clean header/footer dividers.
- **What it fixes vs Material UI:** Basic white box with dated shadow.
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need bento surface with cursor spotlight glow.
- **Key props / API:** `JXCardProps` — `title?: string`; `kicker?: string`; `description?: string`; `spotlight?: boolean`; `hoverLift?: boolean`; `children?: React.ReactNode`; `className?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/surfaces/JXCard.tsx`

```tsx
<JXCard spotlight hoverLift elevation={2}>
  <JXCardHeader title="Edge Inference Engine" subheader="Sub-15ms global p99" />
  <JXCardContent>...</JXCardContent>
</JXCard>
```

#### `JXPaper` — Semantic Layered Surface Primitive

- **Category / type:** 2. Glassmorphism & Surfaces · Showcase (System A) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Semantic Layered Surface Primitive. Semantic surface hierarchy (surface="base" | "raised" | "overlay" | "glass" | "sunken"), specular inner highlights, and dark-mode luminance parity.
- **What it fixes vs Material UI:** Relies on 24 legacy Material shadow levels.
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need semantic layered surface primitive.
- **Key props / API:** `JXPaperProps` — `surface?: JXSurfaceTier`; `defaultSurface?: JXSurfaceTier`; `onSurfaceChange?: (surface: JXSurfaceTier) => void; showTierSwitcher?: boolean; children?: React.ReactNode; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/surfaces/JXPaper.tsx`

```tsx
<JXPaper surface="glass" specularBorder padding="lg">
  Translucent Frosted Surface
</JXPaper>
```

#### `AdaptiveGlass` — Ambient theme-tinted glass surface

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Ambient theme-tinted glass surface. Palette-reactive glass
- **What it fixes vs Material UI:** Hardcoded color tokens
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need ambient theme-tinted glass surface.
- **Key props / API:** `AdaptiveGlassProps` — `children?: React.ReactNode`; `className?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/AdaptiveGlass.tsx`

```tsx
<AdaptiveGlass />
```

#### `DynamicGlassPanel` — Adjustable blur and opacity controls

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Adjustable blur and opacity controls. Real-time slider blur tuning
- **What it fixes vs Material UI:** Fixed CSS styling
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need adjustable blur and opacity controls.
- **Key props / API:** `DynamicGlassPanelProps` — `title?: string`; `children?: React.ReactNode`; `className?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/DynamicGlassPanel.tsx`

```tsx
<DynamicGlassPanel />
```

#### `FrostedGlass` — Deep diffuse blur with rim lighting

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Deep diffuse blur with rim lighting. Specular border luminescence
- **What it fixes vs Material UI:** Flat gray background
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need deep diffuse blur with rim lighting.
- **Key props / API:** `FrostedGlassProps` — `children?: React.ReactNode`; `className?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/FrostedGlass.tsx`

```tsx
<FrostedGlass />
```

#### `GlassButton` — Frosted glass press button

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Frosted glass press button. Specular border press
- **What it fixes vs Material UI:** Material flat button
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need frosted glass press button.
- **Key props / API:** `GlassButtonProps` — `children?: React.ReactNode`.
- **Accessibility:** Keyboard: Space / Enter: Activate button action; Tab: Move focus to next control · ARIA roles to verify: button. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/GlassButton.tsx`

```tsx
<GlassButton />
```

#### `GlassCard` — Luminescent card with specular highlights

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Luminescent card with specular highlights. Translucent depth layering
- **What it fixes vs Material UI:** Heavy shadow borders
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need luminescent card with specular highlights.
- **Key props / API:** `GlassCardProps` — `title?: string`; `subtitle?: string`; `children?: React.ReactNode`; `className?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/GlassCard.tsx`

```tsx
<GlassCard />
```

#### `GlassCommandMenu` — Command launcher in frosted glass

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Command launcher in frosted glass. Spatial launcher interface
- **What it fixes vs Material UI:** Solid white dialog
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need command launcher in frosted glass.
- **Key props / API:** `GlassCommandMenuProps` — `placeholder?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/GlassCommandMenu.tsx`

```tsx
<GlassCommandMenu />
```

#### `GlassDock` — macOS-inspired glass icon shelf

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: advanced · v3.0.0
- **Purpose:** macOS-inspired glass icon shelf. Proximity floating dock
- **What it fixes vs Material UI:** Bottom toolbar
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need macos-inspired glass icon shelf.
- **Key props / API:** `GlassDockProps` — `icons?: React.ComponentType<{ className?: string }>[]`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/GlassDock.tsx`

```tsx
<GlassDock />
```

#### `GlassFloatingPanel` — Draggable floating performance widget

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Draggable floating performance widget. Detached glass widget
- **What it fixes vs Material UI:** Fixed footer banner
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need draggable floating performance widget.
- **Key props / API:** `GlassFloatingPanelProps` — `title?: string`; `children?: React.ReactNode`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/GlassFloatingPanel.tsx`

```tsx
<GlassFloatingPanel />
```

#### `GlassInput` — Glassmorphic input field with translucent fill

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Glassmorphic input field with translucent fill. Frosted text container
- **What it fixes vs Material UI:** Solid white input box
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need glassmorphic input field with translucent fill.
- **Key props / API:** `GlassInputProps` — `label?: string`; `children?: React.ReactNode`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/GlassInput.tsx`

```tsx
<GlassInput />
```

#### `GlassModal` — Refractive translucent dialog window

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Refractive translucent dialog window. Diffuse ambient backdrop
- **What it fixes vs Material UI:** Harsh black overlay
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need refractive translucent dialog window.
- **Key props / API:** `GlassModalProps` — `open?: boolean`; `onClose?: () => void; title?: string; children?: React.ReactNode;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/GlassModal.tsx`

```tsx
<GlassModal />
```

#### `GlassNavbar` — Floating pill glass header

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Floating pill glass header. Frosted floating island
- **What it fixes vs Material UI:** Sticky opaque top bar
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need floating pill glass header.
- **Key props / API:** `GlassNavbarProps` — `brand?: string`; `links?: string[]`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/GlassNavbar.tsx`

```tsx
<GlassNavbar />
```

#### `GlassNotification` — Frosted glass alert banner

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Frosted glass alert banner. Translucent notification card
- **What it fixes vs Material UI:** Opaque alert card
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need frosted glass alert banner.
- **Key props / API:** `GlassNotificationProps` — `title?: string`; `message?: string`; `onDismiss?: () => void;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/GlassNotification.tsx`

```tsx
<GlassNotification />
```

#### `GlassPopover` — Lightweight translucent dropdown

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Lightweight translucent dropdown. Floating glass surface
- **What it fixes vs Material UI:** Sharp white popover box
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need lightweight translucent dropdown.
- **Key props / API:** `GlassPopoverProps` — `triggerLabel?: string`; `content?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/GlassPopover.tsx`

```tsx
<GlassPopover />
```

#### `GlassSheet` — Sliding translucent inspector panel

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Sliding translucent inspector panel. Glass property drawer
- **What it fixes vs Material UI:** Opaque right sidebar
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need sliding translucent inspector panel.
- **Key props / API:** `GlassSheetProps` — `open?: boolean`; `onClose?: () => void; title?: string; children?: React.ReactNode;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/GlassSheet.tsx`

```tsx
<GlassSheet />
```

#### `GlassSidebar` — Semi-transparent navigation sidebar

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Semi-transparent navigation sidebar. Backdrop blur visibility
- **What it fixes vs Material UI:** Solid blocking drawer
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need semi-transparent navigation sidebar.
- **Key props / API:** `GlassSidebarProps` — `items?: string[]`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/GlassSidebar.tsx`

```tsx
<GlassSidebar />
```

#### `GlassTabs` — Glassmorphic pill segmented tabs

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Glassmorphic pill segmented tabs. Backdrop blur pill tabs
- **What it fixes vs Material UI:** Underline tab bar
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need glassmorphic pill segmented tabs.
- **Key props / API:** `GlassTabsProps` — `tabs?: string[]`; `activeTab?: string`; `onChange?: (tab: string) => void;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: tab, tablist, tabpanel. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/GlassTabs.tsx`

```tsx
<GlassTabs />
```

#### `GlassToolbar` — Compact floating glass action strip

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Compact floating glass action strip. Minimalist glass buttons
- **What it fixes vs Material UI:** Heavy action row
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need compact floating glass action strip.
- **Key props / API:** `GlassToolbarProps` — `children?: React.ReactNode`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/GlassToolbar.tsx`

```tsx
<GlassToolbar />
```

#### `GlassTooltip` — Micro frosted glass info label

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Micro frosted glass info label. Subtle translucent pill
- **What it fixes vs Material UI:** Heavy dark tooltip badge
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need micro frosted glass info label.
- **Key props / API:** `GlassTooltipProps` — `text: string`; `children: React.ReactNode`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/GlassTooltip.tsx`

```tsx
<GlassTooltip />
```

#### `LiquidGlass` — Fluid dynamic blurred glass container

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Fluid dynamic blurred glass container. Refractive backdrop blur
- **What it fixes vs Material UI:** Opaque card surface
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need fluid dynamic blurred glass container.
- **Key props / API:** `LiquidGlassProps` — `children?: React.ReactNode`; `className?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/LiquidGlass.tsx`

```tsx
<LiquidGlass />
```

#### `SpatialGlassWorkspace` — 3D multi-layered glass plane container

- **Category / type:** 2. Glassmorphism & Surfaces · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** 3D multi-layered glass plane container. Multi-plane spatial depth
- **What it fixes vs Material UI:** Flat 2D grid
- **When to use:** Use it when a surface itself should carry the glass, blur and specular-depth treatment, rather than a plain card or panel — specifically when you need 3d multi-layered glass plane container.
- **Key props / API:** `SpatialGlassWorkspaceProps` — `children?: React.ReactNode`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/glassmorphism/SpatialGlassWorkspace.tsx`

```tsx
<SpatialGlassWorkspace />
```

### 3. Navigation & Wayfinding — 30 components

Proximity docks, adaptive responsive navbars, radial satellite kinematics, and collapsible breadcrumbs. This category has 10 showcase(s) and 20 primitive(s). Reach for it for moving between views, sections or steps, or for showing the user where they are.

**In this category:** `JXBottomNavigation`, `JXBreadcrumbs`, `JXDrawer`, `JXLink`, `JXMenu & JXMenuItem`, `JXNavigationRail`, `JXPagination`, `JXSpeedDial`, `JXStepper`, `JXTabs & JXTab`, `AdaptiveNavbar`, `AnimatedSidebar`, `AnimatedTabs`, `BreadcrumbTrail`, `CircularNavigation`, `CollapsibleNavigation`, `CommandNavigation`, `ContextNavigation`, `ExpandableSidebar`, `FloatingDock`, `FloatingTabBar`, `GestureNavigation`, `MagneticDock`, `MegaMenu`, `MorphingNavbar`, `MultiLevelMenu`, `NavigationRail`, `OrbitalMenu`, `RadialMenu`, `SlidingTabs`

#### `JXBottomNavigation` — Floating Mobile Pill Dock

- **Category / type:** 3. Navigation & Wayfinding · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Floating Mobile Pill Dock. Floating frosted pill dock with sliding active background indicator, spring icon bounce, and tactile visual feedback.
- **What it fixes vs Material UI:** Full-width flat bottom bar with jumping label text.
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need floating mobile pill dock.
- **Key props / API:** `JXBottomNavigationProps` — `items?: JXBottomNavItem[]`; `value?: string`; `defaultValue?: string`; `onChange?: (id: string) => void; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/navigation/JXBottomNavigation.tsx`

```tsx
<JXBottomNavigation floatingDock value={tab} onChange={setTab} items={dockItems} />
```

#### `JXBreadcrumbs` — Collapsible Path Bar & Sibling Switcher

- **Category / type:** 3. Navigation & Wayfinding · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Collapsible Path Bar & Sibling Switcher. Interactive middle-item ellipsis dropdown menu (click ... to view hidden parent folders), folder icons, and sibling switcher on current crumb.
- **What it fixes vs Material UI:** Static text links that wrap awkwardly on narrow screens.
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need collapsible path bar & sibling switcher.
- **Key props / API:** `JXBreadcrumbsProps` — `rootLabel?: string`; `hiddenSegments?: string[]`; `siblingOptions?: string[]`; `defaultSibling?: string`; `onSiblingChange?: (val: string) => void; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/navigation/JXBreadcrumbs.tsx`

```tsx
<JXBreadcrumbs
  maxItems={3}
  items={pathHierarchy}
  siblingOptions={['Production', 'Staging', 'Preview']}
/>
```

#### `JXDrawer` — Floating Inset Sheet & Mini-Rail Sidebar

- **Category / type:** 3. Navigation & Wayfinding · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Floating Inset Sheet & Mini-Rail Sidebar. Supports Floating Inset Sheet mode (12px margin from viewport edges with rounded-2xl corners) and Mini-Rail Collapsible Sidebar with tooltip fallback.
- **What it fixes vs Material UI:** Sharp-edged panel that slams into the viewport edge.
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need floating inset sheet & mini-rail sidebar.
- **Key props / API:** `JXDrawerProps` — `collapsed?: boolean`; `defaultCollapsed?: boolean`; `onCollapsedChange?: (collapsed: boolean) => void; title?: string; items?: { code: string`; `label: string }[]; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/navigation/JXDrawer.tsx`

```tsx
<JXDrawer variant="floating-inset" collapsibleRail open={open} onClose={close} />
```

#### `JXLink` — Animated Underline & Hover Preview Link

- **Category / type:** 3. Navigation & Wayfinding · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Animated Underline & Hover Preview Link. Smooth left-to-right animated underline bar, automatic external-link arrow icon (↗), and optional hover preview card.
- **What it fixes vs Material UI:** Basic anchor tag with browser underline.
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need animated underline & hover preview link.
- **Key props / API:** `JXLinkProps` — `external?: boolean`; `helperText?: string`; `previewTitle?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/navigation/JXLink.tsx`

```tsx
<JXLink href="https://mui.com" external previewCard={{ title: 'Architecture Spec', readTime: '3m' }}>
  Read RFC-042 Specification
</JXLink>
```

#### `JXMenu & JXMenuItem` — Nested Command & Context Menu

- **Category / type:** 3. Navigation & Wayfinding · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Nested Command & Context Menu. Compact high-density rounded menu items, right-aligned <kbd> shortcut badges, destructive red item hover styling, and nested sub-menus.
- **What it fixes vs Material UI:** Large padding, slow transitions, no keyboard shortcut styling.
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need nested command & context menu.
- **Key props / API:** `JXMenuProps` — `children?: React.ReactNode`; `className?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/navigation/JXMenu.tsx`

```tsx
<JXMenu density="compact">
  <JXMenuItem icon={<CopyIcon />} shortcut="⌘C">Duplicate Component</JXMenuItem>
  <JXMenuItem destructive icon={<TrashIcon />} shortcut="⌘⌫">Delete Instance</JXMenuItem>
</JXMenu>
```

#### `JXNavigationRail` — Compact Vertical App Rail (Missing in MUI Core)

- **Category / type:** 3. Navigation & Wayfinding · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Compact Vertical App Rail (Missing in MUI Core). First-class vertical icon rail for desktop/tablet apps with active pill indicator, avatar footer, and expandable secondary panel.
- **What it fixes vs Material UI:** Listed as "❌ No support" in standard Material UI.
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need compact vertical app rail (missing in mui core).
- **Key props / API:** `JXNavigationRailProps` — `items?: JXNavigationRailItem[]`; `value?: string`; `defaultValue?: string`; `onChange?: (id: string) => void; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/navigation/JXNavigationRail.tsx`

```tsx
<JXNavigationRail
  activeId={section}
  onChange={setSection}
  expandableSecondaryPanel
  items={railItems}
/>
```

#### `JXPagination` — Smart Page Jumper & Summary Bar

- **Category / type:** 3. Navigation & Wayfinding · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Smart Page Jumper & Summary Bar. Sliding active page indicator, integrated "Rows per page" selector, "Go to page #" quick input, and "Showing X–Y of Z" summary counter.
- **What it fixes vs Material UI:** Just a row of numbered circles/squares.
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need smart page jumper & summary bar.
- **Key props / API:** `JXPaginationProps` — `totalItems?: number`; `page?: number`; `defaultPage?: number`; `rowsPerPage?: number`; `defaultRowsPerPage?: number`; `rowsPerPageOptions?: number[]`; `onPageChange?: (page: number) => void; onRowsPerPageChange?: (rowsPerPage: number) => void; showFirstLastButtons?: boolean; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/navigation/JXPagination.tsx`

```tsx
<JXPagination
  count={12}
  page={page}
  rowsPerPage={25}
  totalItems={294}
  showQuickJumper
/>
```

#### `JXSpeedDial` — Staggered Quick Action Menu with Always-Visible Labels

- **Category / type:** 3. Navigation & Wayfinding · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Staggered Quick Action Menu with Always-Visible Labels. Always-visible frosted glass labels next to each staggered action button, backdrop blur overlay when open, and smooth spring stagger.
- **What it fixes vs Material UI:** Unlabeled mini-circles that require hovering each one to see what it does.
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need staggered quick action menu with always-visible labels.
- **Key props / API:** `JXSpeedDialProps` — `actions?: JXSpeedDialAction[]`; `defaultOpen?: boolean`; `open?: boolean`; `onOpenChange?: (open: boolean) => void; onActionSelect?: (action: JXSpeedDialAction) => void; ariaLabel?: string; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/navigation/JXSpeedDial.tsx`

```tsx
<JXSpeedDial alwaysShowLabels glassLabels actions={quickActions} />
```

#### `JXStepper` — Interactive Progress & Wizard Flow

- **Category / type:** 3. Navigation & Wayfinding · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Interactive Progress & Wizard Flow. Animated fill connector bars, clickable completed steps, error/warning badges, and a compact circular progress header mode for mobile screens.
- **What it fixes vs Material UI:** Rigid circles and thin lines that break on mobile.
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need interactive progress & wizard flow.
- **Key props / API:** `JXStepperProps` — `steps?: JXStepItem[]`; `activeStep?: number`; `defaultActiveStep?: number`; `onStepChange?: (stepIndex: number) => void; nonLinear?: boolean; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/navigation/JXStepper.tsx`

```tsx
<JXStepper activeStep={step} clickableSteps mobileCompactRing steps={wizardSteps} />
```

#### `JXTabs & JXTab` — Sliding Pill & Underline Tabs

- **Category / type:** 3. Navigation & Wayfinding · Showcase (System A) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Sliding Pill & Underline Tabs. Supports both a smooth sliding bottom indicator bar AND a soft pill background indicator, counter badges inside tabs, and natural Title Case.
- **What it fixes vs Material UI:** Rigid bottom bar and ALL-CAPS tab labels.
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need sliding pill & underline tabs.
- **Key props / API:** `JXTabsProps` — `tabs?: JXTabItem[]`; `value?: string`; `defaultValue?: string`; `onChange?: (value: string) => void; indicatorVariant?: 'pill' | 'underline'; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: tab, tablist, tabpanel. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/navigation/JXTabs.tsx`

```tsx
<JXTabs indicatorMode="pill" value={activeTab} onChange={setActiveTab}>
  <JXTab label="Overview" count={4} />
  <JXTab label="Deployments" count={18} />
  <JXTab label="Security Audit" />
</JXTabs>
```

#### `AdaptiveNavbar` — Responsive desktop/mobile hybrid header

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Responsive desktop/mobile hybrid header. Unified fluid navbar
- **What it fixes vs Material UI:** Separate mobile menu code
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need responsive desktop/mobile hybrid header.
- **Key props / API:** `AdaptiveNavbarProps` — `brand?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/AdaptiveNavbar.tsx`

```tsx
<AdaptiveNavbar />
```

#### `AnimatedSidebar` — Sidebar with icon badges and expand spring

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Sidebar with icon badges and expand spring. Fluid width animation
- **What it fixes vs Material UI:** Rigid drawer
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need sidebar with icon badges and expand spring.
- **Key props / API:** `AnimatedSidebarProps` — `collapsed?: boolean`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/AnimatedSidebar.tsx`

```tsx
<AnimatedSidebar />
```

#### `AnimatedTabs` — Sliding pill active indicator

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Sliding pill active indicator. Smooth gliding active pill
- **What it fixes vs Material UI:** Jumpy border line
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need sliding pill active indicator.
- **Key props / API:** `AnimatedTabsProps` — `tabs?: (string | JXTabItem)[]`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: tab, tablist, tabpanel. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/AnimatedTabs.tsx`

```tsx
<AnimatedTabs />
```

#### `BreadcrumbTrail` — Animated path breadcrumbs

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Animated path breadcrumbs. Overflow-collapsed trail
- **What it fixes vs Material UI:** Plain text / links
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need animated path breadcrumbs.
- **Key props / API:** `BreadcrumbTrailProps` — `crumbs?: string[]`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/BreadcrumbTrail.tsx`

```tsx
<BreadcrumbTrail />
```

#### `CircularNavigation` — Rotating ring navigation sectors

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Rotating ring navigation sectors. Radial 360° wayfinding
- **What it fixes vs Material UI:** Horizontal only
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need rotating ring navigation sectors.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/CircularNavigation.tsx`

```tsx
<CircularNavigation />
```

#### `CollapsibleNavigation` — Multi-level tree disclosure

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Multi-level tree disclosure. Smooth height interpolation
- **What it fixes vs Material UI:** Accordion clipping
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need multi-level tree disclosure.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/CollapsibleNavigation.tsx`

```tsx
<CollapsibleNavigation />
```

#### `CommandNavigation` — Keyboard-first navigation bar

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Keyboard-first navigation bar. Integrated ⌘P affordance
- **What it fixes vs Material UI:** Mouse-only nav
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need keyboard-first navigation bar.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/CommandNavigation.tsx`

```tsx
<CommandNavigation />
```

#### `ContextNavigation` — Entity-sensitive contextual toolbar

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Entity-sensitive contextual toolbar. Appears only on selection
- **What it fixes vs Material UI:** Always visible dead buttons
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need entity-sensitive contextual toolbar.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/ContextNavigation.tsx`

```tsx
<ContextNavigation />
```

#### `ExpandableSidebar` — Hover-expanding navigation rail

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Hover-expanding navigation rail. Effortless hover reveal
- **What it fixes vs Material UI:** Click-only expansion
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need hover-expanding navigation rail.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/ExpandableSidebar.tsx`

```tsx
<ExpandableSidebar />
```

#### `FloatingDock` — Detached floating navigation pill

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Detached floating navigation pill. Bottom-anchored island
- **What it fixes vs Material UI:** Sticky header
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need detached floating navigation pill.
- **Key props / API:** `FloatingDockProps` — `onSearch?: () => void;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/FloatingDock.tsx`

```tsx
<FloatingDock />
```

#### `FloatingTabBar` — Mobile floating bottom tab bar

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Mobile floating bottom tab bar. Floating glass capsule
- **What it fixes vs Material UI:** Full-bleed opaque footer
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need mobile floating bottom tab bar.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: tab, tablist, tabpanel. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/FloatingTabBar.tsx`

```tsx
<FloatingTabBar />
```

#### `GestureNavigation` — Swipe left/right back-forward indicator

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Swipe left/right back-forward indicator. Touch-first wayfinding
- **What it fixes vs Material UI:** Button-only navigation
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need swipe left/right back-forward indicator.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/GestureNavigation.tsx`

```tsx
<GestureNavigation />
```

#### `MagneticDock` — Proximity-magnified icon dock

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Lab — Experimental · Difficulty: advanced · v3.0.0
- **Purpose:** Proximity-magnified icon dock. Cosine-bell cursor magnification
- **What it fixes vs Material UI:** Static tab bar
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need proximity-magnified icon dock.
- **Key props / API:** `MagneticDockProps` — `items?: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[]`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/MagneticDock.tsx`

```tsx
<MagneticDock />
```

#### `MegaMenu` — Categorized multi-column dropdown panel

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Categorized multi-column dropdown panel. Rich categorized showcase
- **What it fixes vs Material UI:** Basic select list
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need categorized multi-column dropdown panel.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/MegaMenu.tsx`

```tsx
<MegaMenu />
```

#### `MorphingNavbar` — Scroll-position dynamic contraction

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Scroll-position dynamic contraction. Zero-shift smooth shrink
- **What it fixes vs Material UI:** Fixed height navbar
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need scroll-position dynamic contraction.
- **Key props / API:** `MorphingNavbarProps` — `compact?: boolean`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/MorphingNavbar.tsx`

```tsx
<MorphingNavbar />
```

#### `MultiLevelMenu` — Deep nested flyout without accidental close

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Deep nested flyout without accidental close. Direction-aware hover triangle
- **What it fixes vs Material UI:** Diagonal mouse exit closes menu
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need deep nested flyout without accidental close.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/MultiLevelMenu.tsx`

```tsx
<MultiLevelMenu />
```

#### `NavigationRail` — Compact vertical app rail

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Compact vertical app rail. Minimalist 56px footprint
- **What it fixes vs Material UI:** Takes 240px screen width
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need compact vertical app rail.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/NavigationRail.tsx`

```tsx
<NavigationRail />
```

#### `OrbitalMenu` — Satellites orbiting trigger center

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Satellites orbiting trigger center. Orbital physics layout
- **What it fixes vs Material UI:** Linear menu
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need satellites orbiting trigger center.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/OrbitalMenu.tsx`

```tsx
<OrbitalMenu />
```

#### `RadialMenu` — Pie menu expanding on click

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Pie menu expanding on click. Circular ergonomic reach
- **What it fixes vs Material UI:** Dropdown list
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need pie menu expanding on click.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/RadialMenu.tsx`

```tsx
<RadialMenu />
```

#### `SlidingTabs` — Fluid underline indicator

- **Category / type:** 3. Navigation & Wayfinding · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Fluid underline indicator. Hardware-accelerated sliding bar
- **What it fixes vs Material UI:** Delayed CSS animation
- **When to use:** Use it for moving between views, sections or steps, or for showing the user where they are — specifically when you need fluid underline indicator.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: tab, tablist, tabpanel. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/navigation/SlidingTabs.tsx`

```tsx
<SlidingTabs />
```

### 4. Inputs & Forms — 32 components

Zero-notch floating labels, OTP auto-advance, entropy meters, dual range sliders, and signature pads. This category has 7 showcase(s) and 25 primitive(s). Reach for it when the user must enter, search for or select data in a form.

**In this category:** `JXAutocomplete`, `JXNumberField`, `JXRating`, `JXSelect`, `JXSlider`, `JXTextField`, `JXTransferList`, `AnimatedInput`, `AutoComplete`, `CircularSlider`, `ColorPicker`, `CommandInput`, `DualRangeSlider`, `DynamicFormBuilder`, `FloatingLabelInput`, `FormGlassInput`, `FormWizard`, `GradientPicker`, `LiquidInput`, `MagneticSlider`, `MorphingInput`, `MultiSelect`, `OTPInput`, `PasswordReveal`, `PasswordStrength`, `PinInput`, `RangeSlider`, `SearchInput`, `SignaturePad`, `SmartSearch`, `TagInput`, `TokenInput`

#### `JXAutocomplete` — Enhanced Autocomplete & Command Combobox

- **Category / type:** 4. Inputs & Forms · Showcase (System A) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Enhanced Autocomplete & Command Combobox. Spotlight Command Palette UX (Cmd+K), fuzzy match highlighting, sticky frosted group headers, multi-select pills with Backspace delete.
- **What it fixes vs Material UI:** Clunky dropdown list, plain text options, jarring notched outline.
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need enhanced autocomplete & command combobox.
- **Key props / API:** `JXAutocompleteProps` — `options: JXAutocompleteOption[]`; `value?: string | string[]`; `defaultValue?: string | string[]`; `multiple?: boolean`; `onChange?: (newValue: string | string[]) => void; label?: string; placeholder?: string; helperText?: string; error?: boolean; errorMessage?: string; loading?: boolean; disabled?: boolean; fuzzyHighlight?: boolean; shortcut?: string; size?: 'sm' | 'md' | 'lg'; glass?: boolean; halo?: boolean; clearable?: boolean; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/inputs/JXAutocomplete.tsx`

```tsx
<JXAutocomplete
  label="Assign Reviewers & Channels"
  shortcut="⌘K"
  multiple
  fuzzyHighlight
  groupBy={(opt) => opt.department}
  options={teamMembers}
  renderOption={(opt) => <JXRichOption avatar={opt.avatar} meta={opt.role} />}
/>
```

#### `JXNumberField` — Tactile Stepper & Scrubbable Input

- **Category / type:** 4. Inputs & Forms · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Tactile Stepper & Scrubbable Input. Integrated -/+ tactile buttons with hold acceleration, tabular numerals, unit prefix/suffix ($/%/kg), and horizontal drag-to-scrub on label.
- **What it fixes vs Material UI:** Relies on tiny browser spin buttons or basic Base UI composition.
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need tactile stepper & scrubbable input.
- **Key props / API:** `JXNumberFieldProps` — `value?: number`; `defaultValue?: number`; `onChange?: (val: number) => void; min?: number; max?: number; step?: number; label?: string; unit?: string; unitOptions?: string[]; onUnitChange?: (unit: string) => void; scrubbableLabel?: boolean; holdAcceleration?: boolean; disabled?: boolean; size?: 'sm' | 'md' | 'lg'; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/inputs/JXNumberField.tsx`

```tsx
<JXNumberField
  label="Max Memory Allocation"
  value={memoryGb}
  onChange={setMemoryGb}
  min={1}
  max={128}
  unit="GB"
  scrubbableLabel
/>
```

#### `JXRating` — Expressive Micro-Animated Rating

- **Category / type:** 4. Inputs & Forms · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Expressive Micro-Animated Rating. Sequential wave-scale animation on hover, half-star precision, dynamic sentiment tooltip badge ("Needs Work" to "Exceptional"), and icon presets.
- **What it fixes vs Material UI:** Static stars with abrupt hover fills.
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need expressive micro-animated rating.
- **Key props / API:** `JXRatingProps` — `value?: number`; `defaultValue?: number`; `onChange?: (val: number) => void; max?: number; precision?: 0.5 | 1; preset?: JXRatingPreset; onPresetChange?: (preset: JXRatingPreset) => void; showPresetSwitcher?: boolean; showSentimentBadge?: boolean; readOnly?: boolean; disabled?: boolean; size?: 'sm' | 'md' | 'lg'; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/inputs/JXRating.tsx`

```tsx
<JXRating
  value={4.5}
  precision={0.5}
  showSentimentBadge
  preset="star"
  onChange={setRating}
/>
```

#### `JXSelect` — Rich Popover Select

- **Category / type:** 4. Inputs & Forms · Showcase (System A) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Rich Popover Select. Anchored floating popover with spring entry, inline search filter, status dots/avatars inside options, and animated checkmark indicator.
- **What it fixes vs Material UI:** Native-looking menu overlay that covers the trigger and lacks search.
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need rich popover select.
- **Key props / API:** `JXSelectProps` — `options: JXSelectOption[]`; `value?: string`; `defaultValue?: string`; `onChange?: (val: string) => void; label?: string; placeholder?: string; searchable?: boolean; searchThreshold?: number; disabled?: boolean; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/inputs/JXSelect.tsx`

```tsx
<JXSelect
  label="Deployment Region"
  searchable
  value={region}
  onChange={setRegion}
  options={regionsWithLatency}
/>
```

#### `JXSlider` — Precision Interactive Scrubber

- **Category / type:** 4. Inputs & Forms · Showcase (System A) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Precision Interactive Scrubber. Thick rounded track with gradient fill, magnetic tick marks, live floating glass value pill with formatted units, and range histogram preview.
- **What it fixes vs Material UI:** Tiny thumb, basic tooltip, hard-to-read step marks.
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need precision interactive scrubber.
- **Key props / API:** `JXSliderProps` — `value?: number`; `defaultValue?: number`; `onChange?: (val: number) => void; min?: number; max?: number; step?: number; label?: string; unit?: string; showHistogram?: boolean; histogramData?: number[]; magneticMarks?: JXSliderMark[]; disabled?: boolean; className?: string;`.
- **Accessibility:** Keyboard: Arrow Left/Down: Decrease value; Arrow Right/Up: Increase value; Home/End: Jump to min/max · ARIA roles to verify: slider. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/inputs/JXSlider.tsx`

```tsx
<JXSlider
  label="Target Latency Threshold"
  value={latencyMs}
  onChange={setLatencyMs}
  min={10}
  max={500}
  unit="ms"
  showHistogram
  magneticMarks={[50, 100, 250, 400]}
/>
```

#### `JXTextField` — Contextual Smart Input

- **Category / type:** 4. Inputs & Forms · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Contextual Smart Input. Clean stacked or inner floating label (zero border notch), 3px focus halo, clear button, password visibility + real-time entropy bar, character ring, and copy action.
- **What it fixes vs Material UI:** Floating label cuts a physical notch through the top border; abrupt red error jump.
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need contextual smart input.
- **Key props / API:** `JXTextFieldProps` — `value?: string`; `defaultValue?: string`; `onChange?: (val: string) => void; label?: string; helperText?: string; error?: boolean; errorMessage?: string; clearable?: boolean; copyable?: boolean; showEntropyMeter?: boolean; showCharacterCounter?: boolean; size?: 'sm' | 'md' | 'lg'; startIcon?: React.ReactNode; endIcon?: React.ReactNode;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/inputs/JXTextField.tsx`

```tsx
<JXTextField
  label="Production Signing Secret"
  type="password"
  showEntropyMeter
  clearable
  copyable
  maxLength={64}
/>
```

#### `JXTransferList` — Dual-Pane Drag & Filter Shuttle

- **Category / type:** 4. Inputs & Forms · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Dual-Pane Drag & Filter Shuttle. Instant search filtering in both panes, one-click transfer on double-click, Move All action bar, and selected count badges.
- **What it fixes vs Material UI:** Clunky dual-checkbox boxes requiring multiple clicks to move items.
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need dual-pane drag & filter shuttle.
- **Key props / API:** `JXTransferListProps` — `leftItems?: string[]`; `rightItems?: string[]`; `defaultLeftItems?: string[]`; `defaultRightItems?: string[]`; `onChange?: (left: string[], right: string[]) => void; leftTitle?: string; rightTitle?: string; searchable?: boolean; disabled?: boolean; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/inputs/JXTransferList.tsx`

```tsx
<JXTransferList
  leftTitle="Available Scopes"
  rightTitle="Granted Token Scopes"
  searchable
  doubleClickTransfer
  items={oauthScopes}
/>
```

#### `AnimatedInput` — Micro-animated icon reactions

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Micro-animated icon reactions. Focus scale and color reaction
- **What it fixes vs Material UI:** Static icon adornment
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need micro-animated icon reactions.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/AnimatedInput.tsx`

```tsx
<AnimatedInput />
```

#### `AutoComplete` — Fuzzy-matched dropdown filter

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Fuzzy-matched dropdown filter. High-speed fuzzy ranker
- **What it fixes vs Material UI:** Complex verbose boilerplate
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need fuzzy-matched dropdown filter.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/AutoComplete.tsx`

```tsx
<AutoComplete />
```

#### `CircularSlider` — Dial knob rotating 0 to 360°

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Dial knob rotating 0 to 360°. Radial knob ergonomics
- **What it fixes vs Material UI:** Horizontal only
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need dial knob rotating 0 to 360°.
- **Key props / API:** `CircularSliderProps` — `size?: number`; `minAngle?: number`; `maxAngle?: number`; `defaultValue?: number`; `onChange?: (degrees: number) => void;`.
- **Accessibility:** Keyboard: Arrow Left/Down: Decrease value; Arrow Right/Up: Increase value; Home/End: Jump to min/max · ARIA roles to verify: slider. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/CircularSlider.tsx`

```tsx
<CircularSlider />
```

#### `ColorPicker` — Hex swatch picker with instant pill

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Hex swatch picker with instant pill. Curated token picker
- **What it fixes vs Material UI:** Browser native raw picker
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need hex swatch picker with instant pill.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/ColorPicker.tsx`

```tsx
<ColorPicker />
```

#### `CommandInput` — Terminal prompt styled command field

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Terminal prompt styled command field. Hacker-grade dark prompt
- **What it fixes vs Material UI:** Standard text field
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need terminal prompt styled command field.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/CommandInput.tsx`

```tsx
<CommandInput />
```

#### `DualRangeSlider` — Min/max two-handle range slider

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Min/max two-handle range slider. Collision-free dual handles
- **What it fixes vs Material UI:** Handles collide and stick
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need min/max two-handle range slider.
- **Key props / API:** `DualRangeSliderProps` — `min?: number`; `max?: number`; `step?: number`; `defaultMin?: number`; `defaultMax?: number`; `onChange?: (values: { min: number; max: number }) => void;`.
- **Accessibility:** Keyboard: Arrow Left/Down: Decrease value; Arrow Right/Up: Increase value; Home/End: Jump to min/max · ARIA roles to verify: slider. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/DualRangeSlider.tsx`

```tsx
<DualRangeSlider />
```

#### `DynamicFormBuilder` — Schema-driven JSON form generator

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Schema-driven JSON form generator. Instant JSON form engine
- **What it fixes vs Material UI:** Manual JSX per field
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need schema-driven json form generator.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/DynamicFormBuilder.tsx`

```tsx
<DynamicFormBuilder />
```

#### `FloatingLabelInput` — Zero-notch smooth label transition

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Zero-notch smooth label transition. Inset zero-shift label float
- **What it fixes vs Material UI:** Text clipping label border
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need zero-notch smooth label transition.
- **Key props / API:** Composite showcase entry — it is demonstrated inside the workbench showcase files rather than exported as one standalone component. Props documented in the JXUI catalog for it: `variant: 'solid' | 'glass' | 'subtle' | 'outline' | 'ghost'`; `size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'`; `disabled: boolean`; `className: string`; `version: '3.0' | '3.0.0'`; `value: string`; `onChange: (val: string) => void`; `placeholder: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.

```tsx
<FloatingLabelInput />
```

#### `FormGlassInput` — Frosted glass translucent input field

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Lab — Experimental · Difficulty: beginner · v3.0.0
- **Purpose:** Frosted glass translucent input field. Frosted text container
- **What it fixes vs Material UI:** Solid white input box
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need frosted glass translucent input field.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/FormGlassInput.tsx`

```tsx
<FormGlassInput />
```

#### `FormWizard` — Multi-step wizard with validation dots

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Multi-step wizard with validation dots. Zero-shift progress transition
- **What it fixes vs Material UI:** Clunky stepper
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need multi-step wizard with validation dots.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/FormWizard.tsx`

```tsx
<FormWizard />
```

#### `GradientPicker` — Dual-stop CSS gradient generator

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Lab — Experimental · Difficulty: beginner · v3.0.0
- **Purpose:** Dual-stop CSS gradient generator. Real-time gradient preview
- **What it fixes vs Material UI:** Unsupported
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need dual-stop css gradient generator.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/GradientPicker.tsx`

```tsx
<GradientPicker />
```

#### `LiquidInput` — Fluid glowing border on active focus

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Lab — Experimental · Difficulty: beginner · v3.0.0
- **Purpose:** Fluid glowing border on active focus. Smooth liquid glow underline
- **What it fixes vs Material UI:** Notched outline cutout
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need fluid glowing border on active focus.
- **Key props / API:** `LiquidInputProps` — `children?: React.ReactNode`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/LiquidInput.tsx`

```tsx
<LiquidInput />
```

#### `MagneticSlider` — Handle snaps magnetically to tick marks

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Handle snaps magnetically to tick marks. Smooth snap physics
- **What it fixes vs Material UI:** Discrete steps feel choppy
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need handle snaps magnetically to tick marks.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Arrow Left/Down: Decrease value; Arrow Right/Up: Increase value; Home/End: Jump to min/max · ARIA roles to verify: slider. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/MagneticSlider.tsx`

```tsx
<MagneticSlider />
```

#### `MorphingInput` — Expands into multi-line textarea

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Expands into multi-line textarea. Smooth height morphing
- **What it fixes vs Material UI:** Separate inputs required
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need expands into multi-line textarea.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/MorphingInput.tsx`

```tsx
<MorphingInput />
```

#### `MultiSelect` — Removable tag-based multi-option selector

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Removable tag-based multi-option selector. Flowing tag wraps
- **What it fixes vs Material UI:** Clipped chips inside box
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need removable tag-based multi-option selector.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/MultiSelect.tsx`

```tsx
<MultiSelect />
```

#### `OTPInput` — 6-digit one-time code auto-focus

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** 6-digit one-time code auto-focus. Auto-advance digit boxes
- **What it fixes vs Material UI:** Manual input splitting
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need 6-digit one-time code auto-focus.
- **Key props / API:** `OTPInputProps` — `length?: number`; `onComplete?: (code: string) => void; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/OTPInput.tsx`

```tsx
<OTPInput />
```

#### `PasswordReveal` — Eye toggle with security verification

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Eye toggle with security verification. Tactile reveal with icon
- **What it fixes vs Material UI:** Plain toggle button
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need eye toggle with security verification.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/PasswordReveal.tsx`

```tsx
<PasswordReveal />
```

#### `PasswordStrength` — Real-time entropy meter and rules

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Real-time entropy meter and rules. Color-coded entropy bar
- **What it fixes vs Material UI:** No security feedback
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need real-time entropy meter and rules.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/PasswordStrength.tsx`

```tsx
<PasswordStrength />
```

#### `PinInput` — Masked secure PIN dots

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Masked secure PIN dots. Individual visual pin dots
- **What it fixes vs Material UI:** Plain password field
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need masked secure pin dots.
- **Key props / API:** `PinInputProps` — `length?: number`; `onComplete?: (pin: string) => void; mask?: boolean;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/PinInput.tsx`

```tsx
<PinInput />
```

#### `RangeSlider` — Single scrubbable slider with percentage

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Single scrubbable slider with percentage. Tactile scrub with tooltip
- **What it fixes vs Material UI:** Thumb offset misalignment
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need single scrubbable slider with percentage.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Arrow Left/Down: Decrease value; Arrow Right/Up: Increase value; Home/End: Jump to min/max · ARIA roles to verify: slider. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/RangeSlider.tsx`

```tsx
<RangeSlider />
```

#### `SearchInput` — Instant clear button and search hint

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Instant clear button and search hint. Debounced search field
- **What it fixes vs Material UI:** Basic input with startAdornment
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need instant clear button and search hint.
- **Key props / API:** Composite showcase entry — it is demonstrated inside the workbench showcase files rather than exported as one standalone component. Props documented in the JXUI catalog for it: `variant: 'solid' | 'glass' | 'subtle' | 'outline' | 'ghost'`; `size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'`; `disabled: boolean`; `className: string`; `version: '3.0' | '3.0.0'`; `value: string`; `onChange: (val: string) => void`; `placeholder: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.

```tsx
<SearchInput />
```

#### `SignaturePad` — Canvas drawing for digital signatures

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Canvas drawing for digital signatures. Smooth vector path capture
- **What it fixes vs Material UI:** External library needed
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need canvas drawing for digital signatures.
- **Key props / API:** `SignaturePadProps` — `onSave?: (dataUrl: string) => void; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/SignaturePad.tsx`

```tsx
<SignaturePad />
```

#### `SmartSearch` — Search with instant suggestion chips

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Search with instant suggestion chips. Categorized quick tags
- **What it fixes vs Material UI:** Plain dropdown
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need search with instant suggestion chips.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/SmartSearch.tsx`

```tsx
<SmartSearch />
```

#### `TagInput` — Freeform string tags with Enter key

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Freeform string tags with Enter key. Native keyboard tag input
- **What it fixes vs Material UI:** Required external library
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need freeform string tags with enter key.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/TagInput.tsx`

```tsx
<TagInput />
```

#### `TokenInput` — API key / token formatted field

- **Category / type:** 4. Inputs & Forms · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** API key / token formatted field. Monospace token badge
- **What it fixes vs Material UI:** Plain text string
- **When to use:** Use it when the user must enter, search for or select data in a form — specifically when you need api key / token formatted field.
- **Key props / API:** `TokenInputProps` — `initialToken?: string`; `onRegenerate?: () => void;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/inputs/TokenInput.tsx`

```tsx
<TokenInput />
```

### 5. Toggles & Selection — 18 components

Fluid morphing switches, animated drawing checkmarks, sliding segment pills, and selectable card surfaces. This category has 3 showcase(s) and 15 primitive(s). Reach for it when the user chooses between options, states or modes without submitting a form.

**In this category:** `JXCheckbox`, `JXRadioGroup`, `JXSwitch`, `AnimatedCheckbox`, `AnimatedRadio`, `CircularCheckbox`, `FloatingSelectionBar`, `GestureSelector`, `GlassCheckbox`, `LiquidSwitch`, `MagneticSwitch`, `MorphSwitch`, `MultiStateToggle`, `SegmentedControl`, `SelectableCard`, `SelectionGrid`, `SlidingSegmentedControl`, `TriStateToggle`

#### `JXCheckbox` — Animated SVG Spring Checkbox & Card Mode

- **Category / type:** 5. Toggles & Selection · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Animated SVG Spring Checkbox & Card Mode. Custom SVG stroke-dashoffset draw animation with spring bounce, indeterminate morph, and variant="card" selection cards.
- **What it fixes vs Material UI:** Small hit target, rigid SVG tick, plain label alignment.
- **When to use:** Use it when the user chooses between options, states or modes without submitting a form — specifically when you need animated svg spring checkbox & card mode.
- **Key props / API:** `JXCheckboxProps` — `checked?: boolean`; `defaultChecked?: boolean`; `indeterminate?: boolean`; `onChange?: (checked: boolean) => void; variant?: 'default' | 'card'; size?: 'sm' | 'md' | 'lg'; title?: string; label?: string; description?: string; badge?: string; disabled?: boolean; spring?: boolean; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/inputs/JXCheckbox.tsx`

```tsx
<JXCheckbox
  variant="card"
  checked={enabled}
  onChange={setEnabled}
  title="Edge Caching & Smart Routing"
  description="Replicate static assets across 310 global PoPs"
  badge="Included"
/>
```

#### `JXRadioGroup` — Bento Selection Cards & Sliding Pills

- **Category / type:** 5. Toggles & Selection · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Bento Selection Cards & Sliding Pills. Supports spring radio dots, Linear-style sliding segmented pills, and rich Bento Radio Cards with icons, pricing right-alignment, and active ring highlights.
- **What it fixes vs Material UI:** Dated circular radio dots stacked vertically.
- **When to use:** Use it when the user chooses between options, states or modes without submitting a form — specifically when you need bento selection cards & sliding pills.
- **Key props / API:** `JXRadioGroupProps` — `options: JXRadioOption[]`; `value?: string`; `defaultValue?: string`; `onChange?: (val: string) => void; variant?: 'bento-cards' | 'segmented-pill' | 'dots'; label?: string; ariaLabel?: string; disabled?: boolean; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/inputs/JXRadioGroup.tsx`

```tsx
<JXRadioGroup variant="bento-cards" value={plan} onChange={setPlan}>
  <JXRadioCard value="pro" title="Pro Cluster" price="$49/mo" meta="16 vCPU · 64 GB RAM" />
  <JXRadioCard value="enterprise" title="Dedicated Metal" price="$199/mo" meta="64 vCPU · 256 GB RAM" />
</JXRadioGroup>
```

#### `JXSwitch` — Tactile Spring Toggle & Setting Row

- **Category / type:** 5. Toggles & Selection · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Tactile Spring Toggle & Setting Row. Enclosed pill track with fluid thumb stretch on press, embedded on/off micro-icons inside track, and card mode settings row.
- **What it fixes vs Material UI:** Ugly thumb overhang track design from older Material specs.
- **When to use:** Use it when the user chooses between options, states or modes without submitting a form — specifically when you need tactile spring toggle & setting row.
- **Key props / API:** `JXSwitchProps` — `checked?: boolean`; `defaultChecked?: boolean`; `onChange?: (checked: boolean) => void; label?: string; helperText?: string; cardMode?: boolean; trackIcons?: boolean; size?: 'sm' | 'md' | 'lg'; disabled?: boolean; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/inputs/JXSwitch.tsx`

```tsx
<JXSwitch
  cardMode
  trackIcons
  checked={zeroDowntime}
  onChange={setZeroDowntime}
  label="Zero-Downtime Blue/Green Swaps"
  helperText="Automatically verify health probes before shifting traffic"
/>
```

#### `AnimatedCheckbox` — SVG checkmark draws on select

- **Category / type:** 5. Toggles & Selection · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** SVG checkmark draws on select. Path draw animation
- **What it fixes vs Material UI:** Instant raster jump
- **When to use:** Use it when the user chooses between options, states or modes without submitting a form — specifically when you need svg checkmark draws on select.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/toggles/AnimatedCheckbox.tsx`

```tsx
<AnimatedCheckbox />
```

#### `AnimatedRadio` — Expanding ripple wave on selection

- **Category / type:** 5. Toggles & Selection · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Expanding ripple wave on selection. Scale-in tactile dot
- **What it fixes vs Material UI:** Static inner circle
- **When to use:** Use it when the user chooses between options, states or modes without submitting a form — specifically when you need expanding ripple wave on selection.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/toggles/AnimatedRadio.tsx`

```tsx
<AnimatedRadio />
```

#### `CircularCheckbox` — Round radio-style checkbox with dot

- **Category / type:** 5. Toggles & Selection · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Round radio-style checkbox with dot. Distinct multi-select ring
- **What it fixes vs Material UI:** Confused with radio buttons
- **When to use:** Use it when the user chooses between options, states or modes without submitting a form — specifically when you need round radio-style checkbox with dot.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/toggles/CircularCheckbox.tsx`

```tsx
<CircularCheckbox />
```

#### `FloatingSelectionBar` — Bulk action bar on item selection

- **Category / type:** 5. Toggles & Selection · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Bulk action bar on item selection. Floats only when items picked
- **What it fixes vs Material UI:** Takes permanent header space
- **When to use:** Use it when the user chooses between options, states or modes without submitting a form — specifically when you need bulk action bar on item selection.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/toggles/FloatingSelectionBar.tsx`

```tsx
<FloatingSelectionBar />
```

#### `GestureSelector` — Swipe left/right to toggle

- **Category / type:** 5. Toggles & Selection · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Swipe left/right to toggle. Touch swipe detection
- **What it fixes vs Material UI:** Click only
- **When to use:** Use it when the user chooses between options, states or modes without submitting a form — specifically when you need swipe left/right to toggle.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/toggles/GestureSelector.tsx`

```tsx
<GestureSelector />
```

#### `GlassCheckbox` — Frosted glass translucent checkbox

- **Category / type:** 5. Toggles & Selection · Primitive (System B) · Lab — Experimental · Difficulty: beginner · v3.0.0
- **Purpose:** Frosted glass translucent checkbox. Luminescent glass fill
- **What it fixes vs Material UI:** Solid material checkbox
- **When to use:** Use it when the user chooses between options, states or modes without submitting a form — specifically when you need frosted glass translucent checkbox.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/toggles/GlassCheckbox.tsx`

```tsx
<GlassCheckbox />
```

#### `LiquidSwitch` — Fluid morphing toggle switch

- **Category / type:** 5. Toggles & Selection · Primitive (System B) · Lab — Experimental · Difficulty: beginner · v3.0.0
- **Purpose:** Fluid morphing toggle switch. Liquid gel thumb slide
- **What it fixes vs Material UI:** Mechanical jumpy switch
- **When to use:** Use it when the user chooses between options, states or modes without submitting a form — specifically when you need fluid morphing toggle switch.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/toggles/LiquidSwitch.tsx`

```tsx
<LiquidSwitch />
```

#### `MagneticSwitch` — Magnetic spring snap to on/off state

- **Category / type:** 5. Toggles & Selection · Primitive (System B) · Lab — Experimental · Difficulty: beginner · v3.0.0
- **Purpose:** Magnetic spring snap to on/off state. Spring snap damping
- **What it fixes vs Material UI:** Linear thumb transition
- **When to use:** Use it when the user chooses between options, states or modes without submitting a form — specifically when you need magnetic spring snap to on/off state.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/toggles/MagneticSwitch.tsx`

```tsx
<MagneticSwitch />
```

#### `MorphSwitch` — Thumb morphs between check and cross

- **Category / type:** 5. Toggles & Selection · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Thumb morphs between check and cross. Visual icon state morph
- **What it fixes vs Material UI:** Plain circle thumb
- **When to use:** Use it when the user chooses between options, states or modes without submitting a form — specifically when you need thumb morphs between check and cross.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/toggles/MorphSwitch.tsx`

```tsx
<MorphSwitch />
```

#### `MultiStateToggle` — 3-state workflow toggle (Off/Eco/Turbo)

- **Category / type:** 5. Toggles & Selection · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** 3-state workflow toggle (Off/Eco/Turbo). Multi-state cycle
- **What it fixes vs Material UI:** Binary only
- **When to use:** Use it when the user chooses between options, states or modes without submitting a form — specifically when you need 3-state workflow toggle (off/eco/turbo).
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/toggles/MultiStateToggle.tsx`

```tsx
<MultiStateToggle />
```

#### `SegmentedControl` — Multi-option pill selection bar

- **Category / type:** 5. Toggles & Selection · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Multi-option pill selection bar. Unified sliding pill
- **What it fixes vs Material UI:** Separate button group
- **When to use:** Use it when the user chooses between options, states or modes without submitting a form — specifically when you need multi-option pill selection bar.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/toggles/SegmentedControl.tsx`

```tsx
<SegmentedControl />
```

#### `SelectableCard` — Card with selected border and checkmark

- **Category / type:** 5. Toggles & Selection · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Card with selected border and checkmark. Checked state feedback
- **What it fixes vs Material UI:** Plain clickable card
- **When to use:** Use it when the user chooses between options, states or modes without submitting a form — specifically when you need card with selected border and checkmark.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: tab, tablist, tabpanel. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/toggles/SelectableCard.tsx`

```tsx
<SelectableCard />
```

#### `SelectionGrid` — Multi-card selection grid with counter

- **Category / type:** 5. Toggles & Selection · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Multi-card selection grid with counter. Built-in selection state
- **What it fixes vs Material UI:** Manual array handling
- **When to use:** Use it when the user chooses between options, states or modes without submitting a form — specifically when you need multi-card selection grid with counter.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: grid, row, gridcell. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/toggles/SelectionGrid.tsx`

```tsx
<SelectionGrid />
```

#### `SlidingSegmentedControl` — Gliding active background indicator

- **Category / type:** 5. Toggles & Selection · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Gliding active background indicator. Hardware sliding surface
- **What it fixes vs Material UI:** Abrupt background toggle
- **When to use:** Use it when the user chooses between options, states or modes without submitting a form — specifically when you need gliding active background indicator.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/toggles/SlidingSegmentedControl.tsx`

```tsx
<SlidingSegmentedControl />
```

#### `TriStateToggle` — True / Indeterminate / False toggle

- **Category / type:** 5. Toggles & Selection · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** True / Indeterminate / False toggle. Minus/Check/Empty cycle
- **What it fixes vs Material UI:** Clunky indeterminate icon
- **When to use:** Use it when the user chooses between options, states or modes without submitting a form — specifically when you need true / indeterminate / false toggle.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/toggles/TriStateToggle.tsx`

```tsx
<TriStateToggle />
```

### 6. Modals & Overlays — 22 components

Geometric morphing dialogs, spring physics modals, magnetic snap sheets, and spotlight search palettes. This category has 2 showcase(s) and 20 primitive(s). Reach for it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards.

**In this category:** `JXBackdrop`, `JXDialog`, `BottomSheet`, `CommandPalette`, `ContextMenu`, `Drawer`, `FloatingPanel`, `FullscreenModal`, `GlassDialog`, `HoverCard`, `InteractiveBottomSheet`, `InteractiveTooltip`, `LiquidDialog`, `MagneticDrawer`, `MorphingModal`, `OverlayStack`, `RadialContextMenu`, `ResizablePanel`, `SmartPopover`, `SpotlightOverlay`, `SpotlightSearch`, `SpringModal`

#### `JXBackdrop` — Frosted Glass Scrim

- **Category / type:** 6. Modals & Overlays · Showcase (System A) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Frosted Glass Scrim. Progressive backdrop-filter: blur(8px) with subtle surface tint and smooth spring opacity transition.
- **What it fixes vs Material UI:** Flat rgba(0,0,0,0.5) dark overlay.
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need frosted glass scrim.
- **Key props / API:** `JXBackdropProps` — `open?: boolean`; `defaultOpen?: boolean`; `onOpenChange?: (open: boolean) => void; label?: string; triggerLabel?: string; blur?: 'sm' | 'md' | 'lg'; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/feedback/JXBackdrop.tsx`

```tsx
<JXBackdrop open={isSyncing} blur="md" glassTint="slate">
  <JXCircularProgress label="Synchronizing state..." />
</JXBackdrop>
```

#### `JXDialog` — Spring Modal & Command Sheet

- **Category / type:** 6. Modals & Overlays · Showcase (System A) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Spring Modal & Command Sheet. 24px rounded corners, frosted glass header/footer, bottom-sheet morph on mobile, and destructive confirmation shake protection.
- **What it fixes vs Material UI:** Boxy white rectangle with harsh drop shadow and cramped action footer.
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need spring modal & command sheet.
- **Key props / API:** `JXDialogProps` — `open?: boolean`; `defaultOpen?: boolean`; `onOpenChange?: (open: boolean) => void; title?: string; description?: string; confirmLabel?: string; cancelLabel?: string; destructiveGuard?: boolean; onConfirm?: () => void; triggerLabel?: string; className?: string;`.
- **Accessibility:** Keyboard: Escape: Dismiss modal dialog; Tab / Shift+Tab: Cycle through focus trap inside dialog · ARIA roles to verify: dialog, alertdialog. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/feedback/JXDialog.tsx`

```tsx
<JXDialog
  open={open}
  onClose={handleClose}
  title="Rotate Production API Keys"
  destructiveGuard
  glassFooter
/>
```

#### `BottomSheet` — Mobile bottom sheet with grab handle

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Mobile bottom sheet with grab handle. Thumb-friendly bottom sheet
- **What it fixes vs Material UI:** Desktop modal on mobile
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need mobile bottom sheet with grab handle.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/BottomSheet.tsx`

```tsx
<BottomSheet />
```

#### `CommandPalette` — Cmd+K style keyboard search and launcher

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Cmd+K style keyboard search and launcher. Fuzzy-ranked launcher
- **What it fixes vs Material UI:** Unstyled search input
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need cmd+k style keyboard search and launcher.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/CommandPalette.tsx`

```tsx
<CommandPalette />
```

#### `ContextMenu` — Desktop right-click contextual list

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Desktop right-click contextual list. Sleek custom context actions
- **What it fixes vs Material UI:** Browser raw menu
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need desktop right-click contextual list.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/ContextMenu.tsx`

```tsx
<ContextMenu />
```

#### `Drawer` — Edge slide-out right drawer

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Edge slide-out right drawer. Smooth transform drawer
- **What it fixes vs Material UI:** Stiff side drawer
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need edge slide-out right drawer.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/Drawer.tsx`

```tsx
<Drawer />
```

#### `FloatingPanel` — Draggable window-style floating overlay

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Draggable window-style floating overlay. Detached floating widget
- **What it fixes vs Material UI:** Locked in DOM tree
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need draggable window-style floating overlay.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/FloatingPanel.tsx`

```tsx
<FloatingPanel />
```

#### `FullscreenModal` — Complete viewport overlay with escape bar

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Complete viewport overlay with escape bar. Clean immersive viewport
- **What it fixes vs Material UI:** Clunky page takeover
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need complete viewport overlay with escape bar.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/FullscreenModal.tsx`

```tsx
<FullscreenModal />
```

#### `GlassDialog` — Specular reflections on translucent modal

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Specular reflections on translucent modal. Multi-layer glass reflection
- **What it fixes vs Material UI:** Solid white box
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need specular reflections on translucent modal.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Escape: Dismiss modal dialog; Tab / Shift+Tab: Cycle through focus trap inside dialog · ARIA roles to verify: dialog, alertdialog. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/GlassDialog.tsx`

```tsx
<GlassDialog />
```

#### `HoverCard` — Rich preview card on link hover

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Rich preview card on link hover. Rich media preview card
- **What it fixes vs Material UI:** Plain text tooltip
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need rich preview card on link hover.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/HoverCard.tsx`

```tsx
<HoverCard />
```

#### `InteractiveBottomSheet` — Drag down to dismiss bottom sheet

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Drag down to dismiss bottom sheet. Natural drag-to-dismiss
- **What it fixes vs Material UI:** Must click backdrop
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need drag down to dismiss bottom sheet.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/InteractiveBottomSheet.tsx`

```tsx
<InteractiveBottomSheet />
```

#### `InteractiveTooltip` — Tooltip allowing mouse hover & links

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Tooltip allowing mouse hover & links. Interactive hover corridor
- **What it fixes vs Material UI:** Disappears immediately on hover
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need tooltip allowing mouse hover & links.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/InteractiveTooltip.tsx`

```tsx
<InteractiveTooltip />
```

#### `LiquidDialog` — Viscous spring backdrop blur modal

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Viscous spring backdrop blur modal. Liquid ambient refraction
- **What it fixes vs Material UI:** Heavy dark backdrop
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need viscous spring backdrop blur modal.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Escape: Dismiss modal dialog; Tab / Shift+Tab: Cycle through focus trap inside dialog · ARIA roles to verify: dialog, alertdialog. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/LiquidDialog.tsx`

```tsx
<LiquidDialog />
```

#### `MagneticDrawer` — Snaps magnetically to 30%, 60%, 100%

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Snaps magnetically to 30%, 60%, 100%. 3 magnetic height detents
- **What it fixes vs Material UI:** Binary open/close
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need snaps magnetically to 30%, 60%, 100%.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/MagneticDrawer.tsx`

```tsx
<MagneticDrawer />
```

#### `MorphingModal` — Expands smoothly from trigger element

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Expands smoothly from trigger element. Zero-shift geometric morph
- **What it fixes vs Material UI:** Appears from screen center
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need expands smoothly from trigger element.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/MorphingModal.tsx`

```tsx
<MorphingModal />
```

#### `OverlayStack` — Multi-layer z-index stacked dialog manager

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Multi-layer z-index stacked dialog manager. Deterministic LIFO stack
- **What it fixes vs Material UI:** Z-index conflicts and clipping
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need multi-layer z-index stacked dialog manager.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/OverlayStack.tsx`

```tsx
<OverlayStack />
```

#### `RadialContextMenu` — Circular right-click pie options

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Circular right-click pie options. Ergonomic 360° pie options
- **What it fixes vs Material UI:** Vertical menu only
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need circular right-click pie options.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/RadialContextMenu.tsx`

```tsx
<RadialContextMenu />
```

#### `ResizablePanel` — Corner-resizable overlay panel

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Corner-resizable overlay panel. Draggable corner resize handle
- **What it fixes vs Material UI:** Fixed dimensions
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need corner-resizable overlay panel.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/ResizablePanel.tsx`

```tsx
<ResizablePanel />
```

#### `SmartPopover` — Collision-detecting anchor popover

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Collision-detecting anchor popover. Auto flip & reposition
- **What it fixes vs Material UI:** Overlaps screen boundaries
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need collision-detecting anchor popover.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/SmartPopover.tsx`

```tsx
<SmartPopover />
```

#### `SpotlightOverlay` — Dimmed backdrop focusing on single element

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Dimmed backdrop focusing on single element. Guided spotlight cutout
- **What it fixes vs Material UI:** Blocks entire screen
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need dimmed backdrop focusing on single element.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/SpotlightOverlay.tsx`

```tsx
<SpotlightOverlay />
```

#### `SpotlightSearch` — Fullscreen centered spotlight search

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Fullscreen centered spotlight search. Command center spotlight
- **What it fixes vs Material UI:** Tiny top search bar
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need fullscreen centered spotlight search.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/SpotlightSearch.tsx`

```tsx
<SpotlightSearch />
```

#### `SpringModal` — Physics bouncy entrance modal

- **Category / type:** 6. Modals & Overlays · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Physics bouncy entrance modal. Cubic-bezier spring pop
- **What it fixes vs Material UI:** Linear fade-in
- **When to use:** Use it when content or a decision must sit above the page — a dialog, drawer, sheet, menu or palette — and return focus afterwards — specifically when you need physics bouncy entrance modal.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/modals/SpringModal.tsx`

```tsx
<SpringModal />
```

### 7. Notifications & Feedback — 17 components

3D stacked toast queues with promise morphing, live island activity pills, undo action bars, and celebration bursts. This category has 2 showcase(s) and 15 primitive(s). Reach for it to tell the user something happened — success, failure, progress, connectivity or an undoable change.

**In this category:** `JXAlert`, `JXSnackbar`, `AnimatedAlert`, `ConnectionStatus`, `ErrorBoundaryFallback`, `FeedbackGlassNotification`, `InlineAlert`, `LiveActivity`, `NotificationCenter`, `NotificationStack`, `ProgressToast`, `PulseIndicator`, `SmartBanner`, `SmartToast`, `StatusIndicator`, `SuccessCelebration`, `UndoNotification`

#### `JXAlert` — Actionable Callout Banner

- **Category / type:** 7. Notifications & Feedback · Showcase (System A) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Actionable Callout Banner. Soft tinted surface with subtle border glow, custom duotone status icon badge, collapsible "View technical details" drawer, and inline actions.
- **What it fixes vs Material UI:** Flat colored box with basic icon.
- **When to use:** Use it to tell the user something happened — success, failure, progress, connectivity or an undoable change — specifically when you need actionable callout banner.
- **Key props / API:** `JXAlertProps` — `severity?: JXAlertSeverity`; `title?: string`; `description?: string`; `technicalDetails?: string`; `actionLabel?: string`; `onAction?: () => void; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/feedback/JXAlert.tsx`

```tsx
<JXAlert
  severity="warning"
  title="API Rate Limit Approaching (88%)"
  technicalDetails="X-RateLimit-Remaining: 120 / 1000 · Reset in 42s"
  primaryAction={{ label: 'Upgrade Quota', onClick: upgrade }}
/>
```

#### `JXSnackbar` — Sonner-Style 3D Stacked Toast System

- **Category / type:** 7. Notifications & Feedback · Showcase (System A) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Sonner-Style 3D Stacked Toast System. Multi-toast 3D spatial stack (expands into list on hover), built-in promise() state morphing (Loading -> Success), pause-on-hover, and inline Undo.
- **What it fixes vs Material UI:** Single flat black bar at the bottom corner; no stacking or promise states.
- **When to use:** Use it to tell the user something happened — success, failure, progress, connectivity or an undoable change — specifically when you need sonner-style 3d stacked toast system.
- **Key props / API:** `JXSnackbarProps` — `promiseActionLabel?: string`; `className?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/feedback/JXSnackbar.tsx`

```tsx
const { pushToast, triggerPromiseToast } = useJXSnackbar();
triggerPromiseToast('Database Migration #402');
```

#### `AnimatedAlert` — Entrance slide and pulsing status icon

- **Category / type:** 7. Notifications & Feedback · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Entrance slide and pulsing status icon. Gentle pulse alert
- **What it fixes vs Material UI:** Static color box
- **When to use:** Use it to tell the user something happened — success, failure, progress, connectivity or an undoable change — specifically when you need entrance slide and pulsing status icon.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/feedback/AnimatedAlert.tsx`

```tsx
<AnimatedAlert />
```

#### `ConnectionStatus` — Real-time online/offline indicator

- **Category / type:** 7. Notifications & Feedback · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Real-time online/offline indicator. Immediate websocket badge
- **What it fixes vs Material UI:** Hidden network failures
- **When to use:** Use it to tell the user something happened — success, failure, progress, connectivity or an undoable change — specifically when you need real-time online/offline indicator.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/feedback/ConnectionStatus.tsx`

```tsx
<ConnectionStatus />
```

#### `ErrorBoundaryFallback` — Resilient error screen with retry CTA

- **Category / type:** 7. Notifications & Feedback · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Resilient error screen with retry CTA. Safe graceful fallback
- **What it fixes vs Material UI:** White screen of death
- **When to use:** Use it to tell the user something happened — success, failure, progress, connectivity or an undoable change — specifically when you need resilient error screen with retry cta.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/feedback/ErrorBoundaryFallback.tsx`

```tsx
<ErrorBoundaryFallback />
```

#### `FeedbackGlassNotification` — Frosted glass alert toast banner

- **Category / type:** 7. Notifications & Feedback · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Frosted glass alert toast banner. Luminescent translucent toast
- **What it fixes vs Material UI:** Solid opaque banner
- **When to use:** Use it to tell the user something happened — success, failure, progress, connectivity or an undoable change — specifically when you need frosted glass alert toast banner.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/feedback/FeedbackGlassNotification.tsx`

```tsx
<FeedbackGlassNotification />
```

#### `InlineAlert` — Compact embedded message strip

- **Category / type:** 7. Notifications & Feedback · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Compact embedded message strip. Clean accent-bordered strip
- **What it fixes vs Material UI:** Bulky full-width banner
- **When to use:** Use it to tell the user something happened — success, failure, progress, connectivity or an undoable change — specifically when you need compact embedded message strip.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/feedback/InlineAlert.tsx`

```tsx
<InlineAlert />
```

#### `LiveActivity` — Dynamic island pill with live state

- **Category / type:** 7. Notifications & Feedback · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Dynamic island pill with live state. Island capsule indicator
- **What it fixes vs Material UI:** Unobtrusive status hidden
- **When to use:** Use it to tell the user something happened — success, failure, progress, connectivity or an undoable change — specifically when you need dynamic island pill with live state.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/feedback/LiveActivity.tsx`

```tsx
<LiveActivity />
```

#### `NotificationCenter` — Full panel history of system events

- **Category / type:** 7. Notifications & Feedback · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Full panel history of system events. Searchable audit drawer
- **What it fixes vs Material UI:** No event archive
- **When to use:** Use it to tell the user something happened — success, failure, progress, connectivity or an undoable change — specifically when you need full panel history of system events.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/feedback/NotificationCenter.tsx`

```tsx
<NotificationCenter />
```

#### `NotificationStack` — 3D stacked toasts with hover expansion

- **Category / type:** 7. Notifications & Feedback · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** 3D stacked toasts with hover expansion. 3D card deck with hover expand
- **What it fixes vs Material UI:** Toasts overlap and obscure content
- **When to use:** Use it to tell the user something happened — success, failure, progress, connectivity or an undoable change — specifically when you need 3d stacked toasts with hover expansion.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/feedback/NotificationStack.tsx`

```tsx
<NotificationStack />
```

#### `ProgressToast` — Toast displaying live percentage progress

- **Category / type:** 7. Notifications & Feedback · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Toast displaying live percentage progress. Precise percentage bar
- **What it fixes vs Material UI:** Static loading spinner
- **When to use:** Use it to tell the user something happened — success, failure, progress, connectivity or an undoable change — specifically when you need toast displaying live percentage progress.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/feedback/ProgressToast.tsx`

```tsx
<ProgressToast />
```

#### `PulseIndicator` — Concentric ripple rings around status marker

- **Category / type:** 7. Notifications & Feedback · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Concentric ripple rings around status marker. Active heartbeat pulse
- **What it fixes vs Material UI:** Static circle
- **When to use:** Use it to tell the user something happened — success, failure, progress, connectivity or an undoable change — specifically when you need concentric ripple rings around status marker.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/feedback/PulseIndicator.tsx`

```tsx
<PulseIndicator />
```

#### `SmartBanner` — Dismissible sticky top banner

- **Category / type:** 7. Notifications & Feedback · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Dismissible sticky top banner. Smooth height expansion
- **What it fixes vs Material UI:** Shifts layout downwards
- **When to use:** Use it to tell the user something happened — success, failure, progress, connectivity or an undoable change — specifically when you need dismissible sticky top banner.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/feedback/SmartBanner.tsx`

```tsx
<SmartBanner />
```

#### `SmartToast` — Countdown timer bar and undo callback

- **Category / type:** 7. Notifications & Feedback · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Countdown timer bar and undo callback. Instant undo recovery
- **What it fixes vs Material UI:** Disappears without undo
- **When to use:** Use it to tell the user something happened — success, failure, progress, connectivity or an undoable change — specifically when you need countdown timer bar and undo callback.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/feedback/SmartToast.tsx`

```tsx
<SmartToast />
```

#### `StatusIndicator` — Colored dot with optional pulsing halo

- **Category / type:** 7. Notifications & Feedback · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Colored dot with optional pulsing halo. Visual radar indicator
- **What it fixes vs Material UI:** Text-only label
- **When to use:** Use it to tell the user something happened — success, failure, progress, connectivity or an undoable change — specifically when you need colored dot with optional pulsing halo.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/feedback/StatusIndicator.tsx`

```tsx
<StatusIndicator />
```

#### `SuccessCelebration` — Confetti burst animation overlay

- **Category / type:** 7. Notifications & Feedback · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Confetti burst animation overlay. Celebratory particle burst
- **What it fixes vs Material UI:** Plain green banner
- **When to use:** Use it to tell the user something happened — success, failure, progress, connectivity or an undoable change — specifically when you need confetti burst animation overlay.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/feedback/SuccessCelebration.tsx`

```tsx
<SuccessCelebration />
```

#### `UndoNotification` — Notification with instant undo action button

- **Category / type:** 7. Notifications & Feedback · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Notification with instant undo action button. 5-second undo window
- **What it fixes vs Material UI:** Destructive action permanent
- **When to use:** Use it to tell the user something happened — success, failure, progress, connectivity or an undoable change — specifically when you need notification with instant undo action button.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/feedback/UndoNotification.tsx`

```tsx
<UndoNotification />
```

### 8. Loading & Progress — 17 components

Shape-shifting geometric loaders, orbital kinematics, shimmer skeleton placeholders, and circular progress rings. This category has 2 showcase(s) and 15 primitive(s). Reach for it while content or an action is still loading, so the layout is reserved instead of jumping.

**In this category:** `JXProgress (Linear & Circular)`, `JXSkeleton`, `CircularProgress`, `GradientLoader`, `LiquidLoader`, `MorphingLoader`, `MultiStepProgress`, `OrbitalLoader`, `ParticleLoader`, `ProgressRing`, `SegmentedProgress`, `SkeletonCard`, `SkeletonTable`, `SkeletonText`, `TaskProgress`, `UploadProgress`, `WaveLoader`

#### `JXProgress (Linear & Circular)` — Shimmer Track & Completion Morph

- **Category / type:** 8. Loading & Progress · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Shimmer Track & Completion Morph. Smooth gradient shimmer track, built-in percentage readout and ETA label, stepped progress segments, and morph into a completion badge at 100%.
- **What it fixes vs Material UI:** Dated indeterminate bar animation and zero built-in labels.
- **When to use:** Use it while content or an action is still loading, so the layout is reserved instead of jumping — specifically when you need shimmer track & completion morph.
- **Key props / API:** `JXProgressProps` — `value?: number`; `defaultValue?: number`; `onChange?: (val: number) => void; label?: string; completeLabel?: string; eta?: string; showControls?: boolean; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/feedback/JXProgress.tsx`

```tsx
<JXLinearProgress
  value={progress}
  showValueLabel
  eta="12s remaining"
  morphOnComplete
/>
```

#### `JXSkeleton` — Layout-Aware Shimmer Placeholder

- **Category / type:** 8. Loading & Progress · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Layout-Aware Shimmer Placeholder. Diagonal silky light shimmer wave plus ready-made composite presets (preset="card" | "table-row" | "profile" | "chart").
- **What it fixes vs Material UI:** Basic gray blocks that require manual stacking.
- **When to use:** Use it while content or an action is still loading, so the layout is reserved instead of jumping — specifically when you need layout-aware shimmer placeholder.
- **Key props / API:** `JXSkeletonProps` — `preset?: JXSkeletonPreset`; `defaultPreset?: JXSkeletonPreset`; `onPresetChange?: (preset: JXSkeletonPreset) => void; showPresetSwitcher?: boolean; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/feedback/JXSkeleton.tsx`

```tsx
<JXSkeleton preset="card" shimmer="wave" count={1} />
```

#### `CircularProgress` — Continuous spinning SVG circle

- **Category / type:** 8. Loading & Progress · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Continuous spinning SVG circle. Hardware-accelerated spin
- **What it fixes vs Material UI:** CPU intensive CSS rotate
- **When to use:** Use it while content or an action is still loading, so the layout is reserved instead of jumping — specifically when you need continuous spinning svg circle.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/loading/CircularProgress.tsx`

```tsx
<CircularProgress />
```

#### `GradientLoader` — Conic gradient spinning ring

- **Category / type:** 8. Loading & Progress · Primitive (System B) · Lab — Experimental · Difficulty: beginner · v3.0.0
- **Purpose:** Conic gradient spinning ring. Dual-tone gradient sweep
- **What it fixes vs Material UI:** Single color circle
- **When to use:** Use it while content or an action is still loading, so the layout is reserved instead of jumping — specifically when you need conic gradient spinning ring.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/loading/GradientLoader.tsx`

```tsx
<GradientLoader />
```

#### `LiquidLoader` — Fluid viscous pulsing gel loader

- **Category / type:** 8. Loading & Progress · Primitive (System B) · Lab — Experimental · Difficulty: beginner · v3.0.0
- **Purpose:** Fluid viscous pulsing gel loader. Viscous organic gel pulse
- **What it fixes vs Material UI:** Standard blue spinning wheel
- **When to use:** Use it while content or an action is still loading, so the layout is reserved instead of jumping — specifically when you need fluid viscous pulsing gel loader.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/loading/LiquidLoader.tsx`

```tsx
<LiquidLoader />
```

#### `MorphingLoader` — Geometric shape shifting (circle/square)

- **Category / type:** 8. Loading & Progress · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Geometric shape shifting (circle/square). Geometric shape morph
- **What it fixes vs Material UI:** Repetitive spinner
- **When to use:** Use it while content or an action is still loading, so the layout is reserved instead of jumping — specifically when you need geometric shape shifting (circle/square).
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/loading/MorphingLoader.tsx`

```tsx
<MorphingLoader />
```

#### `MultiStepProgress` — Numbered milestone step connector

- **Category / type:** 8. Loading & Progress · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Numbered milestone step connector. Minimalist connected pills
- **What it fixes vs Material UI:** Clunky stepper
- **When to use:** Use it while content or an action is still loading, so the layout is reserved instead of jumping — specifically when you need numbered milestone step connector.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/loading/MultiStepProgress.tsx`

```tsx
<MultiStepProgress />
```

#### `OrbitalLoader` — Planetary orbiting dots loader

- **Category / type:** 8. Loading & Progress · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Planetary orbiting dots loader. Dual-planet orbit
- **What it fixes vs Material UI:** Basic spinner
- **When to use:** Use it while content or an action is still loading, so the layout is reserved instead of jumping — specifically when you need planetary orbiting dots loader.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/loading/OrbitalLoader.tsx`

```tsx
<OrbitalLoader />
```

#### `ParticleLoader` — Swirling particle vortex

- **Category / type:** 8. Loading & Progress · Primitive (System B) · Lab — Experimental · Difficulty: beginner · v3.0.0
- **Purpose:** Swirling particle vortex. Cascading bounce particles
- **What it fixes vs Material UI:** Static dots
- **When to use:** Use it while content or an action is still loading, so the layout is reserved instead of jumping — specifically when you need swirling particle vortex.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/loading/ParticleLoader.tsx`

```tsx
<ParticleLoader />
```

#### `ProgressRing` — SVG circular progress with percentage

- **Category / type:** 8. Loading & Progress · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** SVG circular progress with percentage. Tabular numeric center
- **What it fixes vs Material UI:** Basic indeterminate ring
- **When to use:** Use it while content or an action is still loading, so the layout is reserved instead of jumping — specifically when you need svg circular progress with percentage.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/loading/ProgressRing.tsx`

```tsx
<ProgressRing />
```

#### `SegmentedProgress` — Multi-bar discrete step progress

- **Category / type:** 8. Loading & Progress · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Multi-bar discrete step progress. Discrete milestone segments
- **What it fixes vs Material UI:** Continuous bar only
- **When to use:** Use it while content or an action is still loading, so the layout is reserved instead of jumping — specifically when you need multi-bar discrete step progress.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/loading/SegmentedProgress.tsx`

```tsx
<SegmentedProgress />
```

#### `SkeletonCard` — Shimmer placeholder matching card shape

- **Category / type:** 8. Loading & Progress · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Shimmer placeholder matching card shape. Exact geometry shimmer wave
- **What it fixes vs Material UI:** Gray rectangle
- **When to use:** Use it while content or an action is still loading, so the layout is reserved instead of jumping — specifically when you need shimmer placeholder matching card shape.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/loading/SkeletonCard.tsx`

```tsx
<SkeletonCard />
```

#### `SkeletonTable` — Shimmer placeholder for table rows

- **Category / type:** 8. Loading & Progress · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Shimmer placeholder for table rows. Tabular row shimmer wave
- **What it fixes vs Material UI:** Disjointed boxes
- **When to use:** Use it while content or an action is still loading, so the layout is reserved instead of jumping — specifically when you need shimmer placeholder for table rows.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: tab, tablist, tabpanel. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/loading/SkeletonTable.tsx`

```tsx
<SkeletonTable />
```

#### `SkeletonText` — Text line skeletons with varied widths

- **Category / type:** 8. Loading & Progress · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Text line skeletons with varied widths. Natural typography rhythm
- **What it fixes vs Material UI:** Uniform artificial lines
- **When to use:** Use it while content or an action is still loading, so the layout is reserved instead of jumping — specifically when you need text line skeletons with varied widths.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/loading/SkeletonText.tsx`

```tsx
<SkeletonText />
```

#### `TaskProgress` — Background task completion badge

- **Category / type:** 8. Loading & Progress · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Background task completion badge. Instant checkmark resolution
- **What it fixes vs Material UI:** Silent completion
- **When to use:** Use it while content or an action is still loading, so the layout is reserved instead of jumping — specifically when you need background task completion badge.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/loading/TaskProgress.tsx`

```tsx
<TaskProgress />
```

#### `UploadProgress` — File transfer loader with byte rate counter

- **Category / type:** 8. Loading & Progress · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** File transfer loader with byte rate counter. Transfer rate & percent
- **What it fixes vs Material UI:** Progress bar with no stats
- **When to use:** Use it while content or an action is still loading, so the layout is reserved instead of jumping — specifically when you need file transfer loader with byte rate counter.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/loading/UploadProgress.tsx`

```tsx
<UploadProgress />
```

#### `WaveLoader` — Audio equalizer undulating bars

- **Category / type:** 8. Loading & Progress · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Audio equalizer undulating bars. Dynamic waveform equalizer
- **What it fixes vs Material UI:** Generic loading bar
- **When to use:** Use it while content or an action is still loading, so the layout is reserved instead of jumping — specifically when you need audio equalizer undulating bars.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/loading/WaveLoader.tsx`

```tsx
<WaveLoader />
```

### 9. Cards & Content — 22 components

3D parallax tilt, cursor spotlight borders, flip cards, tabular metric KPIs, and asymmetric bento layouts. This category has 2 showcase(s) and 20 primitive(s). Reach for it to group one topic, record, product, person or metric into a scannable card.

**In this category:** `JXImageList`, `JXPricingMatrix`, `BentoGrid`, `ComparisonCard`, `ContentGlassCard`, `ExpandableCard`, `FeatureCard`, `FlipCard`, `GradientBorderCard`, `HoverLiftCard`, `InteractiveCard`, `MagneticCard`, `MetricCard`, `MorphingCard`, `PricingCard`, `ProductCard`, `ProfileCard`, `SpotlightBorderCard`, `SpotlightCard`, `StackedCard`, `SwipeableCard`, `TiltCard`

#### `JXImageList` — Bento & Lightbox Media Grid

- **Category / type:** 9. Cards & Content · Showcase (System A) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Bento & Lightbox Media Grid. Smooth blur-up placeholder, subtle zoom-on-hover (scale-105), frosted glass caption pills on hover, and built-in click-to-expand Lightbox modal.
- **What it fixes vs Material UI:** Static grid with harsh dark overlay bars for titles.
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need bento & lightbox media grid.
- **Key props / API:** `JXImageListProps` — `items: JXImageListItemData[]`; `cols?: 2 | 3 | 4`; `lightbox?: boolean`; `className?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/data-display/JXImageList.tsx`

```tsx
<JXImageList
  variant="bento"
  cols={3}
  lightbox
  items={architecturalGallery}
/>
```

#### `JXPricingMatrix` — Tiered Glassmorphic Pricing Cards & Smooth Price-Toggling Matrix

- **Category / type:** 9. Cards & Content · Showcase (System A) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Tiered Glassmorphic Pricing Cards & Smooth Price-Toggling Matrix. Composes tiered glassmorphic hover cards, active-state scale-in spring animations for recommended plans, smooth price-toggling transitions, seat scrubber, and 3-state morphing checkout buttons.
- **What it fixes vs Material UI:** Static pricing cards require custom wiring of sliders, toggles, badges, and checkout spinners.
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need tiered glassmorphic pricing cards & smooth price-toggling matrix.
- **Key props / API:** `JXPricingMatrixProps` — `tiers?: JXPricingTier[]`; `billingCycle?: 'monthly' | 'annual'`; `onBillingCycleChange?: (cycle: 'monthly' | 'annual') => void; annualDiscount?: number; seats?: number; onSeatsChange?: (seats: number) => void; selectedTierId?: string; onSelectTier?: (tierId: string) => void; glassHover?: boolean; onCheckout?: ( tier: JXPricingTier, monthlyTotal: number, billingCycle: 'monthly' | 'annual', seats: number ) => void;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/Category8SignatureBlocks.tsx`

```tsx
<JXPricingMatrix
  billingCycle="annual"
  annualDiscount={0.20}
  seats={25}
  selectedTierId="pro"
  glassHover
  onCheckout={(tier, total) => morphButtonToSuccess(tier, total)}
/>
```

#### `BentoGrid` — Asymmetric modern grid container

- **Category / type:** 9. Cards & Content · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Asymmetric modern grid container. Dynamic bento proportions
- **What it fixes vs Material UI:** Uniform rigid grid
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need asymmetric modern grid container.
- **Key props / API:** Typed with `{ children?: React.ReactNode }` in its source file; the fields are declared there rather than in a separate exported interface this reference could extract.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: grid, row, gridcell. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/BentoGrid.tsx`

```tsx
<BentoGrid />
```

#### `ComparisonCard` — Side-by-side benchmark comparison card

- **Category / type:** 9. Cards & Content · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Side-by-side benchmark comparison card. Instant delta pill comparison
- **What it fixes vs Material UI:** Bulky table
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need side-by-side benchmark comparison card.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/ComparisonCard.tsx`

```tsx
<ComparisonCard />
```

#### `ContentGlassCard` — Frosted luminescent glass surface

- **Category / type:** 9. Cards & Content · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Frosted luminescent glass surface. Refractive translucence
- **What it fixes vs Material UI:** Opaque card
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need frosted luminescent glass surface.
- **Key props / API:** Typed with `{ children?: React.ReactNode }` in its source file; the fields are declared there rather than in a separate exported interface this reference could extract.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/ContentGlassCard.tsx`

```tsx
<ContentGlassCard />
```

#### `ExpandableCard` — Unfolds to reveal details with zero CLS

- **Category / type:** 9. Cards & Content · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Unfolds to reveal details with zero CLS. Smooth height transition
- **What it fixes vs Material UI:** Layout jumps on expand
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need unfolds to reveal details with zero cls.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/ExpandableCard.tsx`

```tsx
<ExpandableCard />
```

#### `FeatureCard` — Icon, title, description, and link

- **Category / type:** 9. Cards & Content · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Icon, title, description, and link. Polished feature showcase
- **What it fixes vs Material UI:** Basic box
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need icon, title, description, and link.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/FeatureCard.tsx`

```tsx
<FeatureCard />
```

#### `FlipCard` — 180° flip to show back-side security key

- **Category / type:** 9. Cards & Content · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** 180° flip to show back-side security key. 3D perspective card flip
- **What it fixes vs Material UI:** Two separate cards
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need 180° flip to show back-side security key.
- **Key props / API:** `FlipCardProps` — `frontTitle?: string`; `frontSubtitle?: string`; `backKey?: string`; `className?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/FlipCard.tsx`

```tsx
<FlipCard />
```

#### `GradientBorderCard` — Animated conic gradient border

- **Category / type:** 9. Cards & Content · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Animated conic gradient border. Fluid gradient aura
- **What it fixes vs Material UI:** Static border
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need animated conic gradient border.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/GradientBorderCard.tsx`

```tsx
<GradientBorderCard />
```

#### `HoverLiftCard` — Tactile elevation lift with soft shadow

- **Category / type:** 9. Cards & Content · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Tactile elevation lift with soft shadow. Spring elevation lift
- **What it fixes vs Material UI:** Abrupt shadow jump
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need tactile elevation lift with soft shadow.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/HoverLiftCard.tsx`

```tsx
<HoverLiftCard />
```

#### `InteractiveCard` — Hover states, tags, and quick actions

- **Category / type:** 9. Cards & Content · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Hover states, tags, and quick actions. Action-rich surface
- **What it fixes vs Material UI:** Static container
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need hover states, tags, and quick actions.
- **Key props / API:** Typed with `InteractiveCardProps` in its source file; the fields are declared there rather than in a separate exported interface this reference could extract.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/InteractiveCard.tsx`

```tsx
<InteractiveCard />
```

#### `MagneticCard` — Card tilting toward cursor position

- **Category / type:** 9. Cards & Content · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Card tilting toward cursor position. Cursor magnetic pull
- **What it fixes vs Material UI:** Static card
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need card tilting toward cursor position.
- **Key props / API:** `MagneticCardProps` — `title?: string`; `subtitle?: string`; `strength?: number`; `className?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/MagneticCard.tsx`

```tsx
<MagneticCard />
```

#### `MetricCard` — Large KPI metric number with delta percent

- **Category / type:** 9. Cards & Content · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Large KPI metric number with delta percent. Tabular-nums telemetry KPI
- **What it fixes vs Material UI:** Unstyled number
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need large kpi metric number with delta percent.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/MetricCard.tsx`

```tsx
<MetricCard />
```

#### `MorphingCard` — Resizes smoothly into modal view

- **Category / type:** 9. Cards & Content · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Resizes smoothly into modal view. Geometric surface expansion
- **What it fixes vs Material UI:** Abrupt modal pop
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need resizes smoothly into modal view.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/MorphingCard.tsx`

```tsx
<MorphingCard />
```

#### `PricingCard` — Monthly/annual pricing tier with checklist

- **Category / type:** 9. Cards & Content · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Monthly/annual pricing tier with checklist. High-converting pricing card
- **What it fixes vs Material UI:** Plain price table
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need monthly/annual pricing tier with checklist.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/PricingCard.tsx`

```tsx
<PricingCard />
```

#### `ProductCard` — Image, price, discount badge, and cart CTA

- **Category / type:** 9. Cards & Content · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Image, price, discount badge, and cart CTA. E-commerce tactile card
- **What it fixes vs Material UI:** Generic card
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need image, price, discount badge, and cart cta.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/ProductCard.tsx`

```tsx
<ProductCard />
```

#### `ProfileCard` — Avatar, title, status, and social badges

- **Category / type:** 9. Cards & Content · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Avatar, title, status, and social badges. Executive identity card
- **What it fixes vs Material UI:** Basic list item
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need avatar, title, status, and social badges.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/ProfileCard.tsx`

```tsx
<ProfileCard />
```

#### `SpotlightBorderCard` — Card border glows near cursor

- **Category / type:** 9. Cards & Content · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Card border glows near cursor. Proximity border glow
- **What it fixes vs Material UI:** Hard border line
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need card border glows near cursor.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/SpotlightBorderCard.tsx`

```tsx
<SpotlightBorderCard />
```

#### `SpotlightCard` — Radial spotlight gradient following cursor

- **Category / type:** 9. Cards & Content · Primitive (System B) · Lab — Experimental · Difficulty: intermediate · v3.0.0
- **Purpose:** Radial spotlight gradient following cursor. Dynamic luminescent spotlight
- **What it fixes vs Material UI:** Plain dark card
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need radial spotlight gradient following cursor.
- **Key props / API:** `SpotlightCardProps` — `title?: string`; `subtitle?: string`; `spotlightColor?: string`; `className?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/SpotlightCard.tsx`

```tsx
<SpotlightCard />
```

#### `StackedCard` — Cards in stacked deck format

- **Category / type:** 9. Cards & Content · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Cards in stacked deck format. Z-index card stack
- **What it fixes vs Material UI:** Horizontal scroll only
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need cards in stacked deck format.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/StackedCard.tsx`

```tsx
<StackedCard />
```

#### `SwipeableCard` — Tinder-style swipe left/right

- **Category / type:** 9. Cards & Content · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Tinder-style swipe left/right. Natural gesture swiping
- **What it fixes vs Material UI:** Button clicks only
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need tinder-style swipe left/right.
- **Key props / API:** `SwipeableCardProps` — `title?: string`; `subtitle?: string`; `onSwipeLeft?: () => void; onSwipeRight?: () => void; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/SwipeableCard.tsx`

```tsx
<SwipeableCard />
```

#### `TiltCard` — 3D parallax tilt on mouse move

- **Category / type:** 9. Cards & Content · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** 3D parallax tilt on mouse move. Real 3D tilt perspective
- **What it fixes vs Material UI:** Flat hover shadow
- **When to use:** Use it to group one topic, record, product, person or metric into a scannable card — specifically when you need 3d parallax tilt on mouse move.
- **Key props / API:** `TiltCardProps` — `title?: string`; `subtitle?: string`; `className?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/cards/TiltCard.tsx`

```tsx
<TiltCard />
```

### 10. Data Visualization — 21 components

Kinetic bar/line charts, liquid gradient waveforms, calendar contribution heatmaps, and live streaming tickers. This category has 1 showcase(s) and 20 primitive(s). Reach for it to show numbers, trends, proportions or distributions visually instead of as raw text.

**In this category:** `JXCharts (Line, Bar, Pie & Sparkline)`, `AnimatedLineChart`, `BubbleChart`, `CalendarHeatmap`, `DataComparisonChart`, `DonutChart`, `FunnelChart`, `Heatmap`, `InteractiveGauge`, `InteractivePieChart`, `KineticBarChart`, `LiquidAreaChart`, `LiveTicker`, `NumberCounter`, `RadarChart`, `RadialChart`, `SankeyDiagram`, `ScatterPlot`, `Sparkline`, `Treemap`, `WaterfallChart`

#### `JXCharts (Line, Bar, Pie & Sparkline)` — Interactive SVG Telemetry with Magnetic Crosshair

- **Category / type:** 10. Data Visualization · Showcase (System A) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Interactive SVG Telemetry with Magnetic Crosshair. SVG charts with smooth gradient area fills, magnetic crosshair scrubbing, floating glassmorphic multi-series tooltips, and interactive legend pills that toggle series visibility.
- **What it fixes vs Material UI:** Basic SVG paths with static tooltips and non-interactive legends.
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need interactive svg telemetry with magnetic crosshair.
- **Key props / API:** Composite showcase entry — it is demonstrated inside the workbench showcase files rather than exported as one standalone component. Props documented in the JXUI catalog for it: `variant: 'solid' | 'glass' | 'subtle' | 'outline' | 'ghost'`; `size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'`; `disabled: boolean`; `className: string`; `version: '3.0' | '3.0.0'`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.

```tsx
<JXCharts
  type="area"
  series={[
    { id: 'jxui', label: 'JXUI Render (ms)', color: '#4f46e5' },
    { id: 'mui', label: 'Legacy MUI (ms)', color: '#94a3b8' }
  ]}
  magneticCrosshair
  interactiveLegend
/>
```

#### `AnimatedLineChart` — Smooth bezier curve with drawing entrance

- **Category / type:** 10. Data Visualization · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Smooth bezier curve with drawing entrance. Bezier spring animation
- **What it fixes vs Material UI:** Jagged polygon line
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need smooth bezier curve with drawing entrance.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/AnimatedLineChart.tsx`

```tsx
<AnimatedLineChart />
```

#### `BubbleChart` — Sized circular bubbles by third metric

- **Category / type:** 10. Data Visualization · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Sized circular bubbles by third metric. Proportional bubble radius
- **What it fixes vs Material UI:** Complex charting library
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need sized circular bubbles by third metric.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/BubbleChart.tsx`

```tsx
<BubbleChart />
```

#### `CalendarHeatmap` — GitHub-style 52-week activity contribution

- **Category / type:** 10. Data Visualization · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** GitHub-style 52-week activity contribution. Native calendar contribution
- **What it fixes vs Material UI:** Third-party dependency
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need github-style 52-week activity contribution.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/CalendarHeatmap.tsx`

```tsx
<CalendarHeatmap />
```

#### `DataComparisonChart` — Multi-series benchmark comparison bar

- **Category / type:** 10. Data Visualization · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Multi-series benchmark comparison bar. Clean proportional bar
- **What it fixes vs Material UI:** Cluttered bars
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need multi-series benchmark comparison bar.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/DataComparisonChart.tsx`

```tsx
<DataComparisonChart />
```

#### `DonutChart` — Center-cut pie chart with legend

- **Category / type:** 10. Data Visualization · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Center-cut pie chart with legend. Centered KPI telemetry donut
- **What it fixes vs Material UI:** Clunky legend alignment
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need center-cut pie chart with legend.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/DonutChart.tsx`

```tsx
<DonutChart />
```

#### `FunnelChart` — Conversion funnel with percentage dropoffs

- **Category / type:** 10. Data Visualization · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Conversion funnel with percentage dropoffs. Visual dropoff stages
- **What it fixes vs Material UI:** Unstyled trapezoids
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need conversion funnel with percentage dropoffs.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/FunnelChart.tsx`

```tsx
<FunnelChart />
```

#### `Heatmap` — Grid of color-intensity activity cells

- **Category / type:** 10. Data Visualization · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Grid of color-intensity activity cells. Intensity color scale
- **What it fixes vs Material UI:** Raw table grid
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need grid of color-intensity activity cells.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/Heatmap.tsx`

```tsx
<Heatmap />
```

#### `InteractiveGauge` — Speedometer arc gauge with reading

- **Category / type:** 10. Data Visualization · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Speedometer arc gauge with reading. 180° speedometer arc
- **What it fixes vs Material UI:** Circular progress only
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need speedometer arc gauge with reading.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/InteractiveGauge.tsx`

```tsx
<InteractiveGauge />
```

#### `InteractivePieChart` — Slices expanding on hover

- **Category / type:** 10. Data Visualization · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Slices expanding on hover. Spring slice expansion
- **What it fixes vs Material UI:** Static SVG slices
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need slices expanding on hover.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/InteractivePieChart.tsx`

```tsx
<InteractivePieChart />
```

#### `KineticBarChart` — Animated SVG bars with hover tooltips

- **Category / type:** 10. Data Visualization · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Animated SVG bars with hover tooltips. Fluid reactive SVG bars
- **What it fixes vs Material UI:** Static chart images
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need animated svg bars with hover tooltips.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/KineticBarChart.tsx`

```tsx
<KineticBarChart />
```

#### `LiquidAreaChart` — Fluid gradient area beneath waveform

- **Category / type:** 10. Data Visualization · Primitive (System B) · Lab — Experimental · Difficulty: advanced · v3.0.0
- **Purpose:** Fluid gradient area beneath waveform. Translucent gradient area
- **What it fixes vs Material UI:** Flat color block
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need fluid gradient area beneath waveform.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/LiquidAreaChart.tsx`

```tsx
<LiquidAreaChart />
```

#### `LiveTicker` — Real-time streaming metric ticker

- **Category / type:** 10. Data Visualization · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Real-time streaming metric ticker. Color-coded live change
- **What it fixes vs Material UI:** Static label
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need real-time streaming metric ticker.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/LiveTicker.tsx`

```tsx
<LiveTicker />
```

#### `NumberCounter` — Rolling odometer digit animator

- **Category / type:** 10. Data Visualization · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Rolling odometer digit animator. Tabular-nums rolling odometer
- **What it fixes vs Material UI:** Instant number jump
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need rolling odometer digit animator.
- **Key props / API:** Typed with `{ value?: number }` in its source file; the fields are declared there rather than in a separate exported interface this reference could extract.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/NumberCounter.tsx`

```tsx
<NumberCounter />
```

#### `RadarChart` — Multi-axis spider polygon diagram

- **Category / type:** 10. Data Visualization · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Multi-axis spider polygon diagram. Spider capability chart
- **What it fixes vs Material UI:** Unsupported natively
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need multi-axis spider polygon diagram.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/RadarChart.tsx`

```tsx
<RadarChart />
```

#### `RadialChart` — Concentric comparison progress rings

- **Category / type:** 10. Data Visualization · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Concentric comparison progress rings. Multi-ring visual benchmark
- **What it fixes vs Material UI:** Single pie slice
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need concentric comparison progress rings.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/RadialChart.tsx`

```tsx
<RadialChart />
```

#### `SankeyDiagram` — Flow path streams between stages

- **Category / type:** 10. Data Visualization · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Flow path streams between stages. Lightweight flow pathways
- **What it fixes vs Material UI:** Complex D3 dependency
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need flow path streams between stages.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/SankeyDiagram.tsx`

```tsx
<SankeyDiagram />
```

#### `ScatterPlot` — 2D coordinate point clusters

- **Category / type:** 10. Data Visualization · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** 2D coordinate point clusters. High-speed SVG points
- **What it fixes vs Material UI:** Slow canvas redraw
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need 2d coordinate point clusters.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/ScatterPlot.tsx`

```tsx
<ScatterPlot />
```

#### `Sparkline` — Micro inline sparkline graph

- **Category / type:** 10. Data Visualization · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Micro inline sparkline graph. Tiny inline SVG sparkline
- **What it fixes vs Material UI:** Takes full chart container
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need micro inline sparkline graph.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/Sparkline.tsx`

```tsx
<Sparkline />
```

#### `Treemap` — Hierarchical nested rectangular tiles

- **Category / type:** 10. Data Visualization · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Hierarchical nested rectangular tiles. Proportional squarified layout
- **What it fixes vs Material UI:** Overlapping labels
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need hierarchical nested rectangular tiles.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/Treemap.tsx`

```tsx
<Treemap />
```

#### `WaterfallChart` — Stepwise positive/negative variance bars

- **Category / type:** 10. Data Visualization · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Stepwise positive/negative variance bars. Color-coded variance steps
- **What it fixes vs Material UI:** Requires manual math
- **When to use:** Use it to show numbers, trends, proportions or distributions visually instead of as raw text — specifically when you need stepwise positive/negative variance bars.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dataviz/WaterfallChart.tsx`

```tsx
<WaterfallChart />
```

### 11. Tables & Data Grids — 18 components

Virtualized 100k-row rendering, tree hierarchies, inline cell editing, faceted filters, and column managers. This category has 3 showcase(s) and 15 primitive(s). Reach for it for row-and-column data that needs sorting, filtering, selection, editing or export.

**In this category:** `JXDataGrid`, `JXTable`, `JXTreeView`, `AdvancedFilterPanel`, `ColumnManager`, `ColumnResizer`, `DataExportPanel`, `EditableTable`, `ExpandableTable`, `FilterBuilder`, `InfiniteDataGrid`, `KanbanTable`, `PivotTable`, `RowSelectionToolbar`, `SmartDataTable`, `TableToolbar`, `TreeTable`, `VirtualizedTable`

#### `JXDataGrid` — Next-Gen Enterprise Data Grid (Notion / Linear Hybrid)

- **Category / type:** 11. Tables & Data Grids · Showcase (System A) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Next-Gen Enterprise Data Grid (Notion / Linear Hybrid). Inline double-click cell editing, column pinning, multi-column filter pills, density toggle (Compact/Comfortable/Spacious), group-by aggregation, and instant CSV/JSON export.
- **What it fixes vs Material UI:** Heavyweight spreadsheet look, complex configuration, jarring cell focus outlines.
- **When to use:** Use it for row-and-column data that needs sorting, filtering, selection, editing or export — specifically when you need next-gen enterprise data grid (notion / linear hybrid).
- **Key props / API:** Composite showcase entry — it is demonstrated inside the workbench showcase files rather than exported as one standalone component. Props documented in the JXUI catalog for it: `variant: 'solid' | 'glass' | 'subtle' | 'outline' | 'ghost'`; `size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'`; `disabled: boolean`; `className: string`; `version: '3.0' | '3.0.0'`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: grid, row, gridcell. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.

```tsx
<JXDataGrid
  rows={enterpriseRows}
  columns={columns}
  inlineEditable
  density="comfortable"
  pinnableColumns
  groupBy="category"
  exportFormats={['csv', 'json']}
/>
```

#### `JXTable` — Modern Interactive Data Surface with Bulk Action Bar

- **Category / type:** 11. Tables & Data Grids · Showcase (System A) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Modern Interactive Data Surface with Bulk Action Bar. Sticky frosted header, subtle row hover, column sort indicators, expandable detail rows, and a floating glassmorphic Bulk Action Bar when rows are selected.
- **What it fixes vs Material UI:** Plain HTML-like table with harsh horizontal rules and clunky pagination.
- **When to use:** Use it for row-and-column data that needs sorting, filtering, selection, editing or export — specifically when you need modern interactive data surface with bulk action bar.
- **Key props / API:** `JXTableProps` — `rows?: JXTableRowData[]`; `defaultSelectedIds?: string[]`; `bulkActionLabel?: string`; `onBulkAction?: (selectedIds: string[]) => void; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: tab, tablist, tabpanel. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/data-display/JXTable.tsx`

```tsx
<JXTable
  stickyHeader
  selectable
  expandableRows
  floatingBulkBar
  columns={deploymentColumns}
  rows={deployments}
/>
```

#### `JXTreeView` — VS Code / Notion File & Hierarchy Explorer

- **Category / type:** 11. Tables & Data Grids · Showcase (System A) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** VS Code / Notion File & Hierarchy Explorer. Vertical indent guide lines, file-type icons, inline rename, drag reordering preview, and instant search filtering that auto-expands matching branches.
- **What it fixes vs Material UI:** Plain nested chevrons without indent guides, search, or inline rename.
- **When to use:** Use it for row-and-column data that needs sorting, filtering, selection, editing or export — specifically when you need vs code / notion file & hierarchy explorer.
- **Key props / API:** Composite showcase entry — it is demonstrated inside the workbench showcase files rather than exported as one standalone component. Props documented in the JXUI catalog for it: `variant: 'solid' | 'glass' | 'subtle' | 'outline' | 'ghost'`; `size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'`; `disabled: boolean`; `className: string`; `version: '3.0' | '3.0.0'`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.

```tsx
<JXTreeView
  data={repoFileTree}
  indentGuides
  searchable
  inlineRename
  defaultExpanded={['src', 'components']}
/>
```

#### `AdvancedFilterPanel` — Slide-out drawer with faceted filters

- **Category / type:** 11. Tables & Data Grids · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Slide-out drawer with faceted filters. Dedicated facet panel
- **What it fixes vs Material UI:** Cluttered filter rows
- **When to use:** Use it for row-and-column data that needs sorting, filtering, selection, editing or export — specifically when you need slide-out drawer with faceted filters.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/datagrids/AdvancedFilterPanel.tsx`

```tsx
<AdvancedFilterPanel />
```

#### `ColumnManager` — Checkbox popover to show/hide columns

- **Category / type:** 11. Tables & Data Grids · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Checkbox popover to show/hide columns. Instant column visibility
- **What it fixes vs Material UI:** Hardcoded columns
- **When to use:** Use it for row-and-column data that needs sorting, filtering, selection, editing or export — specifically when you need checkbox popover to show/hide columns.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/datagrids/ColumnManager.tsx`

```tsx
<ColumnManager />
```

#### `ColumnResizer` — Draggable vertical column border handle

- **Category / type:** 11. Tables & Data Grids · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Draggable vertical column border handle. Fluid column dragging
- **What it fixes vs Material UI:** Fixed column widths
- **When to use:** Use it for row-and-column data that needs sorting, filtering, selection, editing or export — specifically when you need draggable vertical column border handle.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/datagrids/ColumnResizer.tsx`

```tsx
<ColumnResizer />
```

#### `DataExportPanel` — CSV, JSON, Excel exporter modal

- **Category / type:** 11. Tables & Data Grids · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** CSV, JSON, Excel exporter modal. Token-clean export
- **What it fixes vs Material UI:** Raw browser download
- **When to use:** Use it for row-and-column data that needs sorting, filtering, selection, editing or export — specifically when you need csv, json, excel exporter modal.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/datagrids/DataExportPanel.tsx`

```tsx
<DataExportPanel />
```

#### `EditableTable` — Inline cell click-to-edit

- **Category / type:** 11. Tables & Data Grids · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Inline cell click-to-edit. Direct click-to-edit
- **What it fixes vs Material UI:** Complex modal edit forms
- **When to use:** Use it for row-and-column data that needs sorting, filtering, selection, editing or export — specifically when you need inline cell click-to-edit.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: tab, tablist, tabpanel. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/datagrids/EditableTable.tsx`

```tsx
<EditableTable />
```

#### `ExpandableTable` — Nested row accordion expansion

- **Category / type:** 11. Tables & Data Grids · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Nested row accordion expansion. Zero-shift row drawer
- **What it fixes vs Material UI:** Jumpy row expansion
- **When to use:** Use it for row-and-column data that needs sorting, filtering, selection, editing or export — specifically when you need nested row accordion expansion.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: tab, tablist, tabpanel. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/datagrids/ExpandableTable.tsx`

```tsx
<ExpandableTable />
```

#### `FilterBuilder` — Multi-condition rule builder (AND/OR)

- **Category / type:** 11. Tables & Data Grids · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Multi-condition rule builder (AND/OR). Structured SQL-like filter
- **What it fixes vs Material UI:** Single search string
- **When to use:** Use it for row-and-column data that needs sorting, filtering, selection, editing or export — specifically when you need multi-condition rule builder (and/or).
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/datagrids/FilterBuilder.tsx`

```tsx
<FilterBuilder />
```

#### `InfiniteDataGrid` — Infinite scroll dynamic page loader

- **Category / type:** 11. Tables & Data Grids · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Infinite scroll dynamic page loader. Seamless infinite stream
- **What it fixes vs Material UI:** Pagination only
- **When to use:** Use it for row-and-column data that needs sorting, filtering, selection, editing or export — specifically when you need infinite scroll dynamic page loader.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: grid, row, gridcell. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/datagrids/InfiniteDataGrid.tsx`

```tsx
<InfiniteDataGrid />
```

#### `KanbanTable` — Table rows viewable as kanban cards

- **Category / type:** 11. Tables & Data Grids · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Table rows viewable as kanban cards. Dual table/kanban view
- **What it fixes vs Material UI:** Table only view
- **When to use:** Use it for row-and-column data that needs sorting, filtering, selection, editing or export — specifically when you need table rows viewable as kanban cards.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: tab, tablist, tabpanel. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/datagrids/KanbanTable.tsx`

```tsx
<KanbanTable />
```

#### `PivotTable` — Group by and aggregate summary table

- **Category / type:** 11. Tables & Data Grids · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Group by and aggregate summary table. Client-side pivot grouping
- **What it fixes vs Material UI:** Server-side only
- **When to use:** Use it for row-and-column data that needs sorting, filtering, selection, editing or export — specifically when you need group by and aggregate summary table.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: tab, tablist, tabpanel. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/datagrids/PivotTable.tsx`

```tsx
<PivotTable />
```

#### `RowSelectionToolbar` — Bulk action bar when rows are checked

- **Category / type:** 11. Tables & Data Grids · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Bulk action bar when rows are checked. Appears only on selection
- **What it fixes vs Material UI:** Permanent bulk buttons
- **When to use:** Use it for row-and-column data that needs sorting, filtering, selection, editing or export — specifically when you need bulk action bar when rows are checked.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/datagrids/RowSelectionToolbar.tsx`

```tsx
<RowSelectionToolbar />
```

#### `SmartDataTable` — Sortable, filterable table with column toggles

- **Category / type:** 11. Tables & Data Grids · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Sortable, filterable table with column toggles. Zero-shift lightweight table
- **What it fixes vs Material UI:** Heavy DOM weight
- **When to use:** Use it for row-and-column data that needs sorting, filtering, selection, editing or export — specifically when you need sortable, filterable table with column toggles.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: tab, tablist, tabpanel. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/datagrids/SmartDataTable.tsx`

```tsx
<SmartDataTable />
```

#### `TableToolbar` — Top action strip (Search, Filter, Export)

- **Category / type:** 11. Tables & Data Grids · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Top action strip (Search, Filter, Export). Unified compact strip
- **What it fixes vs Material UI:** Scattered action buttons
- **When to use:** Use it for row-and-column data that needs sorting, filtering, selection, editing or export — specifically when you need top action strip (search, filter, export).
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: tab, tablist, tabpanel. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/datagrids/TableToolbar.tsx`

```tsx
<TableToolbar />
```

#### `TreeTable` — Hierarchical directory tree table

- **Category / type:** 11. Tables & Data Grids · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Hierarchical directory tree table. Indent hierarchy with icons
- **What it fixes vs Material UI:** Flattened row hacks
- **When to use:** Use it for row-and-column data that needs sorting, filtering, selection, editing or export — specifically when you need hierarchical directory tree table.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: tab, tablist, tabpanel. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/datagrids/TreeTable.tsx`

```tsx
<TreeTable />
```

#### `VirtualizedTable` — 100k row virtual list container at 60 FPS

- **Category / type:** 11. Tables & Data Grids · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** 100k row virtual list container at 60 FPS. Smooth 60 FPS windowing
- **What it fixes vs Material UI:** Browser freezes on 10k rows
- **When to use:** Use it for row-and-column data that needs sorting, filtering, selection, editing or export — specifically when you need 100k row virtual list container at 60 fps.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: tab, tablist, tabpanel. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/datagrids/VirtualizedTable.tsx`

```tsx
<VirtualizedTable />
```

### 12. Drag & Drop — 15 components

Kinetic kanbans with spring drop physics, sortable list handles, magnetic drop targets, and timeline scrubbing. This category has 0 showcase(s) and 15 primitive(s). Reach for it when the user should reorder, move or upload items by dragging instead of by buttons.

**In this category:** `DragCalendar`, `DragDropUpload`, `DragGrid`, `DragTimeline`, `DragTree`, `FloatingDragPreview`, `KineticKanban`, `MagneticDropZone`, `MultiContainerDrag`, `MultiSelectDrag`, `NestedDragList`, `ResizableGridItem`, `SnapGrid`, `SortableGrid`, `SortableList`

#### `DragCalendar` — Appointments draggable across time slots

- **Category / type:** 12. Drag & Drop · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Appointments draggable across time slots. Direct time slot drag
- **What it fixes vs Material UI:** Modal reschedule form
- **When to use:** Use it when the user should reorder, move or upload items by dragging instead of by buttons — specifically when you need appointments draggable across time slots.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dragdrop/DragCalendar.tsx`

```tsx
<DragCalendar />
```

#### `DragDropUpload` — Drop target zone with upload animation

- **Category / type:** 12. Drag & Drop · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Drop target zone with upload animation. Tactile dashed dropzone
- **What it fixes vs Material UI:** Hidden input file only
- **When to use:** Use it when the user should reorder, move or upload items by dragging instead of by buttons — specifically when you need drop target zone with upload animation.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dragdrop/DragDropUpload.tsx`

```tsx
<DragDropUpload />
```

#### `DragGrid` — 2D grid items reordering smoothly

- **Category / type:** 12. Drag & Drop · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** 2D grid items reordering smoothly. 2D matrix reordering
- **What it fixes vs Material UI:** Linear lists only
- **When to use:** Use it when the user should reorder, move or upload items by dragging instead of by buttons — specifically when you need 2d grid items reordering smoothly.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: grid, row, gridcell. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dragdrop/DragGrid.tsx`

```tsx
<DragGrid />
```

#### `DragTimeline` — Timeline events scrubbable across dates

- **Category / type:** 12. Drag & Drop · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Timeline events scrubbable across dates. Horizontal event dragging
- **What it fixes vs Material UI:** Text date inputs
- **When to use:** Use it when the user should reorder, move or upload items by dragging instead of by buttons — specifically when you need timeline events scrubbable across dates.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dragdrop/DragTimeline.tsx`

```tsx
<DragTimeline />
```

#### `DragTree` — Directory tree with file drag-and-drop

- **Category / type:** 12. Drag & Drop · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Directory tree with file drag-and-drop. Visual drop indicators
- **What it fixes vs Material UI:** Rigid folder tree
- **When to use:** Use it when the user should reorder, move or upload items by dragging instead of by buttons — specifically when you need directory tree with file drag-and-drop.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dragdrop/DragTree.tsx`

```tsx
<DragTree />
```

#### `FloatingDragPreview` — Ghost preview avatar following cursor

- **Category / type:** 12. Drag & Drop · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Ghost preview avatar following cursor. Styled translucent card
- **What it fixes vs Material UI:** Browser raw drag ghost
- **When to use:** Use it when the user should reorder, move or upload items by dragging instead of by buttons — specifically when you need ghost preview avatar following cursor.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dragdrop/FloatingDragPreview.tsx`

```tsx
<FloatingDragPreview />
```

#### `KineticKanban` — Multi-column drag board with spring drop

- **Category / type:** 12. Drag & Drop · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Multi-column drag board with spring drop. Spring drop kinematics
- **What it fixes vs Material UI:** Choppy DOM drags
- **When to use:** Use it when the user should reorder, move or upload items by dragging instead of by buttons — specifically when you need multi-column drag board with spring drop.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dragdrop/KineticKanban.tsx`

```tsx
<KineticKanban />
```

#### `MagneticDropZone` — Target pulls items magnetically to center

- **Category / type:** 12. Drag & Drop · Primitive (System B) · Lab — Experimental · Difficulty: beginner · v3.0.0
- **Purpose:** Target pulls items magnetically to center. Magnetic proximity snap
- **What it fixes vs Material UI:** Strict pixel boundaries
- **When to use:** Use it when the user should reorder, move or upload items by dragging instead of by buttons — specifically when you need target pulls items magnetically to center.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dragdrop/MagneticDropZone.tsx`

```tsx
<MagneticDropZone />
```

#### `MultiContainerDrag` — Dragging cards across discrete containers

- **Category / type:** 12. Drag & Drop · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Dragging cards across discrete containers. Cross-container event bus
- **What it fixes vs Material UI:** Single container limits
- **When to use:** Use it when the user should reorder, move or upload items by dragging instead of by buttons — specifically when you need dragging cards across discrete containers.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dragdrop/MultiContainerDrag.tsx`

```tsx
<MultiContainerDrag />
```

#### `MultiSelectDrag` — Dragging lasso selection of multiple items

- **Category / type:** 12. Drag & Drop · Primitive (System B) · Core — Stable · Difficulty: intermediate · v3.0.0
- **Purpose:** Dragging lasso selection of multiple items. Group ghost avatar
- **What it fixes vs Material UI:** Single item drag only
- **When to use:** Use it when the user should reorder, move or upload items by dragging instead of by buttons — specifically when you need dragging lasso selection of multiple items.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dragdrop/MultiSelectDrag.tsx`

```tsx
<MultiSelectDrag />
```

#### `NestedDragList` — Tree list with parent/child drop levels

- **Category / type:** 12. Drag & Drop · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Tree list with parent/child drop levels. Multi-depth nesting
- **What it fixes vs Material UI:** Flat lists only
- **When to use:** Use it when the user should reorder, move or upload items by dragging instead of by buttons — specifically when you need tree list with parent/child drop levels.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dragdrop/NestedDragList.tsx`

```tsx
<NestedDragList />
```

#### `ResizableGridItem` — Grid item with drag resize borders

- **Category / type:** 12. Drag & Drop · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Grid item with drag resize borders. Customizable tile bounds
- **What it fixes vs Material UI:** Static grid tiles
- **When to use:** Use it when the user should reorder, move or upload items by dragging instead of by buttons — specifically when you need grid item with drag resize borders.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: grid, row, gridcell. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dragdrop/ResizableGridItem.tsx`

```tsx
<ResizableGridItem />
```

#### `SnapGrid` — Items snapping to 8px or 16px grid coordinates

- **Category / type:** 12. Drag & Drop · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Items snapping to 8px or 16px grid coordinates. Strict design grid snap
- **What it fixes vs Material UI:** Freeform pixel chaos
- **When to use:** Use it when the user should reorder, move or upload items by dragging instead of by buttons — specifically when you need items snapping to 8px or 16px grid coordinates.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: grid, row, gridcell. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dragdrop/SnapGrid.tsx`

```tsx
<SnapGrid />
```

#### `SortableGrid` — Grid with drag-and-drop tile sorting

- **Category / type:** 12. Drag & Drop · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Grid with drag-and-drop tile sorting. Plug-and-play sortable grid
- **What it fixes vs Material UI:** Complex drag setup
- **When to use:** Use it when the user should reorder, move or upload items by dragging instead of by buttons — specifically when you need grid with drag-and-drop tile sorting.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: tab, tablist, tabpanel. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dragdrop/SortableGrid.tsx`

```tsx
<SortableGrid />
```

#### `SortableList` — Vertical list with drag handles and swap

- **Category / type:** 12. Drag & Drop · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Vertical list with drag handles and swap. Smooth FLIP animation
- **What it fixes vs Material UI:** Jumping list items
- **When to use:** Use it when the user should reorder, move or upload items by dragging instead of by buttons — specifically when you need vertical list with drag handles and swap.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: tab, tablist, tabpanel. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/dragdrop/SortableList.tsx`

```tsx
<SortableList />
```

### 13. Layout & Workspace — 20 components

Infinite pan-and-zoom canvases, desktop window managers, split draggable panes, and masonry waterfall grids. This category has 5 showcase(s) and 15 primitive(s). Reach for it to structure the page or workspace itself — panes, grids, windows, docks and canvases.

**In this category:** `JXBox & JXContainer`, `JXGrid`, `JXMasonry`, `JXStack`, `JXTransitions, JXModal, JXPopper & JXTextareaAutosize`, `AdaptiveDashboard`, `AutoLayout`, `BentoLayout`, `DockManager`, `FloatingWindow`, `InfiniteCanvas`, `MasonryLayout`, `MosaicGrid`, `PanelGroup`, `ResizableLayout`, `ResponsiveGrid`, `SpatialWorkspace`, `SplitPane`, `WindowManager`, `WorkspaceSwitcher`

#### `JXBox & JXContainer` — Token-Aware Layout Primitives

- **Category / type:** 13. Layout & Workspace · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Token-Aware Layout Primitives. Fluid clamp() padding tokens, semantic surface tokens, and container-query responsive breakpoints out of the box.
- **What it fixes vs Material UI:** Manual sx prop boilerplate for responsive fluid padding and surface tokens.
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need token-aware layout primitives.
- **Key props / API:** `JXBoxProps` — `component?: React.ElementType`; `surface?: JXSurfaceToken`; `radius?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'`; `padding?: 'none' | 'sm' | 'md' | 'lg'`; `border?: boolean`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/layout-utils/JXBox.tsx`

```tsx
<JXContainer maxWidth="xl" fluidPadding surface="raised">
  <JXBox tokenGap="md">...</JXBox>
</JXContainer>
```

#### `JXGrid` — Asymmetric Bento & CSS Grid v2 System

- **Category / type:** 13. Layout & Workspace · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Asymmetric Bento & CSS Grid v2 System. True 12-column CSS Grid + pre-configured asymmetric Bento Grid spans (colSpan, rowSpan) with consistent gap tokens.
- **What it fixes vs Material UI:** Legacy negative-margin flexbox grid quirks and verbose responsive props.
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need asymmetric bento & css grid v2 system.
- **Key props / API:** `JXGridProps` — `columns?: 12 | 6 | 4`; `gap?: 'xs' | 'sm' | 'md' | 'lg'`; `bentoPreset?: boolean`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: grid, row, gridcell. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/layout-utils/JXGrid.tsx`

```tsx
<JXGrid columns={12} gap="md" bento>
  <JXGridItem colSpan={8} rowSpan={2}>Primary Bento Feature</JXGridItem>
  <JXGridItem colSpan={4}>Telemetry Tile</JXGridItem>
</JXGrid>
```

#### `JXMasonry` — Dynamic Reflow Masonry Layout

- **Category / type:** 13. Layout & Workspace · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Dynamic Reflow Masonry Layout. Smooth animated reflow when cards are filtered by category or dynamically added/removed.
- **What it fixes vs Material UI:** Jarring layout jumps when items are filtered or resized.
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need dynamic reflow masonry layout.
- **Key props / API:** `JXMasonryProps` — `items?: JXMasonryItem[]`; `categories?: string[]`; `defaultCategory?: string`; `columns?: 2 | 3`; `onCategoryChange?: (category: string) => void; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/layout-utils/JXMasonry.tsx`

```tsx
<JXMasonry columns={3} gap={16} animatedReflow items={filteredCards} />
```

#### `JXStack` — Flex Stack with Smart Hairline Dividers

- **Category / type:** 13. Layout & Workspace · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Flex Stack with Smart Hairline Dividers. 1-dimensional layout with interactive direction switching, alignment controls, and automatic radial-fade hairline divider insertion.
- **What it fixes vs Material UI:** Manual divider cloning and rigid spacing.
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need flex stack with smart hairline dividers.
- **Key props / API:** `JXStackProps` — `direction?: 'row' | 'col'`; `defaultDirection?: 'row' | 'col'`; `onDirectionChange?: (direction: 'row' | 'col') => void; spacing?: 'xs' | 'sm' | 'md' | 'lg'; divider?: boolean; interactiveControls?: boolean; items?: React.ReactNode[];`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/layout-utils/JXStack.tsx`

```tsx
<JXStack direction="row" spacing="md" smartDividers align="center">
  <MetricItem label="Throughput" value="14.2k req/s" />
  <MetricItem label="Error Rate" value="0.002%" />
</JXStack>
```

#### `JXTransitions, JXModal, JXPopper & JXTextareaAutosize` — Spring Physics Primitives & Auto-Growing Composer

- **Category / type:** 13. Layout & Workspace · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Spring Physics Primitives & Auto-Growing Composer. Unified utility primitives with spring presets (Fade, Scale, SlideUp, BlurIn) and auto-growing textarea with integrated formatting toolbar.
- **What it fixes vs Material UI:** Linear cubic-bezier transitions and bare unstyled textarea primitive.
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need spring physics primitives & auto-growing composer.
- **Key props / API:** `JXTransitionsProps` — `in?: boolean`; `type?: 'fade' | 'scale' | 'slide-up'`; `children: React.ReactNode`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/layout-utils/JXTextareaAutosize.tsx`

```tsx
<JXTransitions preset="blur-in" open={visible}>
  <JXTextareaAutosize minRows={3} toolbarSlot={<MarkdownToolbar />} />
</JXTransitions>
```

#### `AdaptiveDashboard` — Responsive multi-widget layout

- **Category / type:** 13. Layout & Workspace · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Responsive multi-widget layout. Fluid widget arrangements
- **What it fixes vs Material UI:** Rigid CSS grid
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need responsive multi-widget layout.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/layout/AdaptiveDashboard.tsx`

```tsx
<AdaptiveDashboard />
```

#### `AutoLayout` — Flexbox auto-distributing spacing helper

- **Category / type:** 13. Layout & Workspace · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Flexbox auto-distributing spacing helper. Semantic gap distributor
- **What it fixes vs Material UI:** Manual margin utility math
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need flexbox auto-distributing spacing helper.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/layout/AutoLayout.tsx`

```tsx
<AutoLayout />
```

#### `BentoLayout` — Modern asymmetric bento section organizer

- **Category / type:** 13. Layout & Workspace · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Modern asymmetric bento section organizer. Visual hierarchy bento
- **What it fixes vs Material UI:** Equal size cards only
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need modern asymmetric bento section organizer.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/layout/BentoLayout.tsx`

```tsx
<BentoLayout />
```

#### `DockManager` — macOS-style pinned dock at screen edge

- **Category / type:** 13. Layout & Workspace · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** macOS-style pinned dock at screen edge. Edge-pinned smart dock
- **What it fixes vs Material UI:** Fixed bottom bar
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need macos-style pinned dock at screen edge.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/layout/DockManager.tsx`

```tsx
<DockManager />
```

#### `FloatingWindow` — Draggable window with title bar

- **Category / type:** 13. Layout & Workspace · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Draggable window with title bar. Movable window pane
- **What it fixes vs Material UI:** Static layout container
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need draggable window with title bar.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/layout/FloatingWindow.tsx`

```tsx
<FloatingWindow />
```

#### `InfiniteCanvas` — Pan and zoom canvas (like Figma/Miro)

- **Category / type:** 13. Layout & Workspace · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Pan and zoom canvas (like Figma/Miro). Infinite 2D spatial canvas
- **What it fixes vs Material UI:** DOM page scroll only
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need pan and zoom canvas (like figma/miro).
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/layout/InfiniteCanvas.tsx`

```tsx
<InfiniteCanvas />
```

#### `MasonryLayout` — Pinterest-style waterfall columns

- **Category / type:** 13. Layout & Workspace · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Pinterest-style waterfall columns. Optimal column packing
- **What it fixes vs Material UI:** Uneven column gaps
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need pinterest-style waterfall columns.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/layout/MasonryLayout.tsx`

```tsx
<MasonryLayout />
```

#### `MosaicGrid` — Flexible tile layout like modern dashboards

- **Category / type:** 13. Layout & Workspace · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Flexible tile layout like modern dashboards. Asymmetric tile mosaic
- **What it fixes vs Material UI:** Rigid table grid
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need flexible tile layout like modern dashboards.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: grid, row, gridcell. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/layout/MosaicGrid.tsx`

```tsx
<MosaicGrid />
```

#### `PanelGroup` — Collapsible grouped panels

- **Category / type:** 13. Layout & Workspace · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Collapsible grouped panels. Coordinated panel group
- **What it fixes vs Material UI:** Clunky accordion
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need collapsible grouped panels.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/layout/PanelGroup.tsx`

```tsx
<PanelGroup />
```

#### `ResizableLayout` — Multi-column adjustable workspace layout

- **Category / type:** 13. Layout & Workspace · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Multi-column adjustable workspace layout. Responsive column bounds
- **What it fixes vs Material UI:** Fixed column width
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need multi-column adjustable workspace layout.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/layout/ResizableLayout.tsx`

```tsx
<ResizableLayout />
```

#### `ResponsiveGrid` — Breakpoint-aware dynamic grid

- **Category / type:** 13. Layout & Workspace · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Breakpoint-aware dynamic grid. Semantic auto-fit grid
- **What it fixes vs Material UI:** Heavy breakpoint classes
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need breakpoint-aware dynamic grid.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: grid, row, gridcell. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/layout/ResponsiveGrid.tsx`

```tsx
<ResponsiveGrid />
```

#### `SpatialWorkspace` — 3D stacked window layers

- **Category / type:** 13. Layout & Workspace · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** 3D stacked window layers. Z-index spatial depth
- **What it fixes vs Material UI:** Flat 2D screen
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need 3d stacked window layers.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/layout/SpatialWorkspace.tsx`

```tsx
<SpatialWorkspace />
```

#### `SplitPane` — Divider with drag resizing between panes

- **Category / type:** 13. Layout & Workspace · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Divider with drag resizing between panes. Dual draggable divider
- **What it fixes vs Material UI:** Static flex columns
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need divider with drag resizing between panes.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/layout/SplitPane.tsx`

```tsx
<SplitPane />
```

#### `WindowManager` — Desktop OS window controls (min/max/close)

- **Category / type:** 13. Layout & Workspace · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Desktop OS window controls (min/max/close). Virtual window manager
- **What it fixes vs Material UI:** Browser tabs only
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need desktop os window controls (min/max/close).
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/layout/WindowManager.tsx`

```tsx
<WindowManager />
```

#### `WorkspaceSwitcher` — Multi-workspace tab selector

- **Category / type:** 13. Layout & Workspace · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Multi-workspace tab selector. Instant in-memory switch
- **What it fixes vs Material UI:** Page reload navigation
- **When to use:** Use it to structure the page or workspace itself — panes, grids, windows, docks and canvases — specifically when you need multi-workspace tab selector.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/layout/WorkspaceSwitcher.tsx`

```tsx
<WorkspaceSwitcher />
```

### 14. Animation & Motion — 16 components

Spring transitions, organic liquid blobs, magnetic cursor attraction, animated gradients, and particle fields. This category has 1 showcase(s) and 15 primitive(s). Reach for it when motion itself is the point — a transition, reveal, cursor effect or animated background.

**In this category:** `JXSpotlightDock`, `AnimatedGradient`, `CursorFollower`, `HoverDistortion`, `LiquidBlob`, `MagneticCursor`, `MorphTransition`, `MotionSequence`, `PageTransition`, `ParallaxContainer`, `ParticleField`, `ScrollReveal`, `SharedElementTransition`, `SpotlightEffect`, `SpringTransition`, `StaggeredReveal`

#### `JXSpotlightDock` — Proximity-Magnified Floating Glass App Dock

- **Category / type:** 14. Animation & Motion · Showcase (System A) · Lab — Experimental · Difficulty: advanced · v3.0.0
- **Purpose:** Proximity-Magnified Floating Glass App Dock. Composes JXTooltip, JXBadge, and spring physics into a proximity-reactive macOS-style floating glass dock with live running-process dots and instant launcher actions.
- **What it fixes vs Material UI:** Standard toolbars have static 40px icons with zero spatial feedback or proximity physics.
- **When to use:** Use it when motion itself is the point — a transition, reveal, cursor effect or animated background — specifically when you need proximity-magnified floating glass app dock.
- **Key props / API:** Composite showcase entry — it is demonstrated inside the workbench showcase files rather than exported as one standalone component. Props documented in the JXUI catalog for it: `variant: 'solid' | 'glass' | 'subtle' | 'outline' | 'ghost'`; `size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'`; `disabled: boolean`; `className: string`; `version: '3.0' | '3.0.0'`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.

```tsx
<JXSpotlightDock
  magnification={1.45}
  distance={140}
  glass
  items={[
    { id: 'terminal', label: 'Edge Console', shortcut: '⌘T', active: true },
    { id: 'metrics', label: 'Live Telemetry', badge: 3, active: true },
    { id: 'deploy', label: 'Canary Rollout', shortcut: '⌘D' }
  ]}
/>
```

#### `AnimatedGradient` — Continuous shifting mesh gradient

- **Category / type:** 14. Animation & Motion · Primitive (System B) · Lab — Experimental · Difficulty: advanced · v3.0.0
- **Purpose:** Continuous shifting mesh gradient. GPU animated mesh
- **What it fixes vs Material UI:** Static gradient image
- **When to use:** Use it when motion itself is the point — a transition, reveal, cursor effect or animated background — specifically when you need continuous shifting mesh gradient.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/animation/AnimatedGradient.tsx`

```tsx
<AnimatedGradient />
```

#### `CursorFollower` — Smooth lagging trailing glow circle

- **Category / type:** 14. Animation & Motion · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Smooth lagging trailing glow circle. Ambient halo follower
- **What it fixes vs Material UI:** No cursor effects
- **When to use:** Use it when motion itself is the point — a transition, reveal, cursor effect or animated background — specifically when you need smooth lagging trailing glow circle.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/animation/CursorFollower.tsx`

```tsx
<CursorFollower />
```

#### `HoverDistortion` — Wave distortion on mouse hover

- **Category / type:** 14. Animation & Motion · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Wave distortion on mouse hover. Fluid wave displacement
- **What it fixes vs Material UI:** Static hover
- **When to use:** Use it when motion itself is the point — a transition, reveal, cursor effect or animated background — specifically when you need wave distortion on mouse hover.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/animation/HoverDistortion.tsx`

```tsx
<HoverDistortion />
```

#### `LiquidBlob` — Organic morphing SVG blob shape

- **Category / type:** 14. Animation & Motion · Primitive (System B) · Lab — Experimental · Difficulty: advanced · v3.0.0
- **Purpose:** Organic morphing SVG blob shape. Fluid organic blob
- **What it fixes vs Material UI:** Rigid geometry
- **When to use:** Use it when motion itself is the point — a transition, reveal, cursor effect or animated background — specifically when you need organic morphing svg blob shape.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/animation/LiquidBlob.tsx`

```tsx
<LiquidBlob />
```

#### `MagneticCursor` — Custom cursor attracted to nearby buttons

- **Category / type:** 14. Animation & Motion · Primitive (System B) · Lab — Experimental · Difficulty: advanced · v3.0.0
- **Purpose:** Custom cursor attracted to nearby buttons. Magnetic cursor tracking
- **What it fixes vs Material UI:** Raw system arrow
- **When to use:** Use it when motion itself is the point — a transition, reveal, cursor effect or animated background — specifically when you need custom cursor attracted to nearby buttons.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/animation/MagneticCursor.tsx`

```tsx
<MagneticCursor />
```

#### `MorphTransition` — Shape shifting between circle and square

- **Category / type:** 14. Animation & Motion · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Shape shifting between circle and square. Geometric SVG interpolation
- **What it fixes vs Material UI:** Instant replacement
- **When to use:** Use it when motion itself is the point — a transition, reveal, cursor effect or animated background — specifically when you need shape shifting between circle and square.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/animation/MorphTransition.tsx`

```tsx
<MorphTransition />
```

#### `MotionSequence` — Keyframed choreographed animation runner

- **Category / type:** 14. Animation & Motion · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Keyframed choreographed animation runner. Deterministic timeline
- **What it fixes vs Material UI:** Uncoordinated timers
- **When to use:** Use it when motion itself is the point — a transition, reveal, cursor effect or animated background — specifically when you need keyframed choreographed animation runner.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/animation/MotionSequence.tsx`

```tsx
<MotionSequence />
```

#### `PageTransition` — Full page slide and fade transition

- **Category / type:** 14. Animation & Motion · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Full page slide and fade transition. Silky smooth route enter
- **What it fixes vs Material UI:** Harsh white page flash
- **When to use:** Use it when motion itself is the point — a transition, reveal, cursor effect or animated background — specifically when you need full page slide and fade transition.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/animation/PageTransition.tsx`

```tsx
<PageTransition />
```

#### `ParallaxContainer` — Multi-depth parallax scroll container

- **Category / type:** 14. Animation & Motion · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Multi-depth parallax scroll container. Multi-plane parallax depth
- **What it fixes vs Material UI:** Single scroll layer
- **When to use:** Use it when motion itself is the point — a transition, reveal, cursor effect or animated background — specifically when you need multi-depth parallax scroll container.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/animation/ParallaxContainer.tsx`

```tsx
<ParallaxContainer />
```

#### `ParticleField` — Floating ambient background particles

- **Category / type:** 14. Animation & Motion · Primitive (System B) · Lab — Experimental · Difficulty: advanced · v3.0.0
- **Purpose:** Floating ambient background particles. Lightweight CSS particles
- **What it fixes vs Material UI:** Heavy canvas script
- **When to use:** Use it when motion itself is the point — a transition, reveal, cursor effect or animated background — specifically when you need floating ambient background particles.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/animation/ParticleField.tsx`

```tsx
<ParticleField />
```

#### `ScrollReveal` — Elements sliding in as viewport scrolls

- **Category / type:** 14. Animation & Motion · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Elements sliding in as viewport scrolls. Pre-rendered threshold slide
- **What it fixes vs Material UI:** Pop-in after scroll
- **When to use:** Use it when motion itself is the point — a transition, reveal, cursor effect or animated background — specifically when you need elements sliding in as viewport scrolls.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/animation/ScrollReveal.tsx`

```tsx
<ScrollReveal />
```

#### `SharedElementTransition` — Shared element layoutId transition

- **Category / type:** 14. Animation & Motion · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Shared element layoutId transition. Continuity layout transitions
- **What it fixes vs Material UI:** Screen flashing refresh
- **When to use:** Use it when motion itself is the point — a transition, reveal, cursor effect or animated background — specifically when you need shared element layoutid transition.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/animation/SharedElementTransition.tsx`

```tsx
<SharedElementTransition />
```

#### `SpotlightEffect` — Cursor-tracking spotlight glow effect

- **Category / type:** 14. Animation & Motion · Primitive (System B) · Lab — Experimental · Difficulty: advanced · v3.0.0
- **Purpose:** Cursor-tracking spotlight glow effect. Dynamic light beam
- **What it fixes vs Material UI:** Flat background
- **When to use:** Use it when motion itself is the point — a transition, reveal, cursor effect or animated background — specifically when you need cursor-tracking spotlight glow effect.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/animation/SpotlightEffect.tsx`

```tsx
<SpotlightEffect />
```

#### `SpringTransition` — Wrapper animating enter/exit with spring

- **Category / type:** 14. Animation & Motion · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Wrapper animating enter/exit with spring. Cubic bezier spring physics
- **What it fixes vs Material UI:** Linear CSS keyframes
- **When to use:** Use it when motion itself is the point — a transition, reveal, cursor effect or animated background — specifically when you need wrapper animating enter/exit with spring.
- **Key props / API:** Typed with `{ children?: React.ReactNode }` in its source file; the fields are declared there rather than in a separate exported interface this reference could extract.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/animation/SpringTransition.tsx`

```tsx
<SpringTransition />
```

#### `StaggeredReveal` — Children revealed with incremental delay

- **Category / type:** 14. Animation & Motion · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Children revealed with incremental delay. Cascading natural reveal
- **What it fixes vs Material UI:** All items pop at once
- **When to use:** Use it when motion itself is the point — a transition, reveal, cursor effect or animated background — specifically when you need children revealed with incremental delay.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/animation/StaggeredReveal.tsx`

```tsx
<StaggeredReveal />
```

### 15. AI Components — 16 components

Conversational chat panels, step-by-step thinking accordions, tool call trace inspectors, and approval cards. This category has 1 showcase(s) and 15 primitive(s). Reach for it inside an AI or chat surface — messages, composers, reasoning, tool calls, citations and approvals.

**In this category:** `JXSecurityVaultCard`, `AIApprovalCard`, `AIAttachmentPreview`, `AIChatPanel`, `AICitationCard`, `AIComposer`, `AIContextPanel`, `AIMessage`, `AIModelSelector`, `AIReasoningTimeline`, `AIResponseActions`, `AIStreamingText`, `AIThinkingIndicator`, `AIToolCall`, `AIToolTrace`, `AIWorkflowBuilder`

#### `JXSecurityVaultCard` — Passkey Biometric Challenge & Hardware Key Manager

- **Category / type:** 15. AI Components · Showcase (System A) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Passkey Biometric Challenge & Hardware Key Manager. Composes JXCard, JXAccordion (Bento mode), JXSwitch, and an interactive Passkey Touch simulator with animated cryptographic fingerprint verification.
- **What it fixes vs Material UI:** Standard security settings forms lack interactive WebAuthn challenge feedback and audit accordions.
- **When to use:** Use it inside an AI or chat surface — messages, composers, reasoning, tool calls, citations and approvals — specifically when you need passkey biometric challenge & hardware key manager.
- **Key props / API:** Composite showcase entry — it is demonstrated inside the workbench showcase files rather than exported as one standalone component. Props documented in the JXUI catalog for it: `variant: 'solid' | 'glass' | 'subtle' | 'outline' | 'ghost'`; `size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'`; `disabled: boolean`; `className: string`; `version: '3.0' | '3.0.0'`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.

```tsx
<JXSecurityVaultCard
  strictWebAuthn
  registeredKeys={['YubiKey 5C Nano', 'Touch ID Enclave']}
  onVerifyPasskey={() => triggerHardwareChallenge()}
/>
```

#### `AIApprovalCard` — Human-in-the-loop action approval card

- **Category / type:** 15. AI Components · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Human-in-the-loop action approval card. Explicit safety gate
- **What it fixes vs Material UI:** Implicit automated actions
- **When to use:** Use it inside an AI or chat surface — messages, composers, reasoning, tool calls, citations and approvals — specifically when you need human-in-the-loop action approval card.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/ai/AIApprovalCard.tsx`

```tsx
<AIApprovalCard />
```

#### `AIAttachmentPreview` — Image/file preview chip with remove CTA

- **Category / type:** 15. AI Components · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Image/file preview chip with remove CTA. Thumbnail attachment card
- **What it fixes vs Material UI:** Unrendered file name
- **When to use:** Use it inside an AI or chat surface — messages, composers, reasoning, tool calls, citations and approvals — specifically when you need image/file preview chip with remove cta.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/ai/AIAttachmentPreview.tsx`

```tsx
<AIAttachmentPreview />
```

#### `AIChatPanel` — Conversational message history and input

- **Category / type:** 15. AI Components · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Conversational message history and input. AI-first conversation surface
- **What it fixes vs Material UI:** Basic chat list
- **When to use:** Use it inside an AI or chat surface — messages, composers, reasoning, tool calls, citations and approvals — specifically when you need conversational message history and input.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/ai/AIChatPanel.tsx`

```tsx
<AIChatPanel />
```

#### `AICitationCard` — Source link citation popup with excerpt

- **Category / type:** 15. AI Components · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Source link citation popup with excerpt. Rich source card
- **What it fixes vs Material UI:** Plain inline hyperlink
- **When to use:** Use it inside an AI or chat surface — messages, composers, reasoning, tool calls, citations and approvals — specifically when you need source link citation popup with excerpt.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/ai/AICitationCard.tsx`

```tsx
<AICitationCard />
```

#### `AIComposer` — Input with attachment chips and model picker

- **Category / type:** 15. AI Components · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Input with attachment chips and model picker. Multi-modal prompt composer
- **What it fixes vs Material UI:** Basic text field
- **When to use:** Use it inside an AI or chat surface — messages, composers, reasoning, tool calls, citations and approvals — specifically when you need input with attachment chips and model picker.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/ai/AIComposer.tsx`

```tsx
<AIComposer />
```

#### `AIContextPanel` — Token budget and active context documents

- **Category / type:** 15. AI Components · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Token budget and active context documents. Visual token meter
- **What it fixes vs Material UI:** Hidden token limits
- **When to use:** Use it inside an AI or chat surface — messages, composers, reasoning, tool calls, citations and approvals — specifically when you need token budget and active context documents.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/ai/AIContextPanel.tsx`

```tsx
<AIContextPanel />
```

#### `AIMessage` — Assistant message bubble with thought drawer

- **Category / type:** 15. AI Components · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Assistant message bubble with thought drawer. Structured message card
- **What it fixes vs Material UI:** Plain text paragraph
- **When to use:** Use it inside an AI or chat surface — messages, composers, reasoning, tool calls, citations and approvals — specifically when you need assistant message bubble with thought drawer.
- **Key props / API:** Typed with `{ content?: string }` in its source file; the fields are declared there rather than in a separate exported interface this reference could extract.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/ai/AIMessage.tsx`

```tsx
<AIMessage />
```

#### `AIModelSelector` — Dropdown to switch LLM models

- **Category / type:** 15. AI Components · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Dropdown to switch LLM models. Instant multi-model switcher
- **What it fixes vs Material UI:** Hardcoded model endpoint
- **When to use:** Use it inside an AI or chat surface — messages, composers, reasoning, tool calls, citations and approvals — specifically when you need dropdown to switch llm models.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/ai/AIModelSelector.tsx`

```tsx
<AIModelSelector />
```

#### `AIReasoningTimeline` — Chronological timeline of thought nodes

- **Category / type:** 15. AI Components · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Chronological timeline of thought nodes. Structured thought pipeline
- **What it fixes vs Material UI:** Unordered log output
- **When to use:** Use it inside an AI or chat surface — messages, composers, reasoning, tool calls, citations and approvals — specifically when you need chronological timeline of thought nodes.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/ai/AIReasoningTimeline.tsx`

```tsx
<AIReasoningTimeline />
```

#### `AIResponseActions` — Thumbs up/down, retry, copy, branch

- **Category / type:** 15. AI Components · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Thumbs up/down, retry, copy, branch. Complete reaction toolbar
- **What it fixes vs Material UI:** Missing feedback buttons
- **When to use:** Use it inside an AI or chat surface — messages, composers, reasoning, tool calls, citations and approvals — specifically when you need thumbs up/down, retry, copy, branch.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/ai/AIResponseActions.tsx`

```tsx
<AIResponseActions />
```

#### `AIStreamingText` — Typewriter streaming markdown tokens

- **Category / type:** 15. AI Components · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Typewriter streaming markdown tokens. Real-time token cursor
- **What it fixes vs Material UI:** Blocks until fully completed
- **When to use:** Use it inside an AI or chat surface — messages, composers, reasoning, tool calls, citations and approvals — specifically when you need typewriter streaming markdown tokens.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/ai/AIStreamingText.tsx`

```tsx
<AIStreamingText />
```

#### `AIThinkingIndicator` — Step-by-step reasoning accordion

- **Category / type:** 15. AI Components · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Step-by-step reasoning accordion. Transparent reasoning drawer
- **What it fixes vs Material UI:** Spinner without progress
- **When to use:** Use it inside an AI or chat surface — messages, composers, reasoning, tool calls, citations and approvals — specifically when you need step-by-step reasoning accordion.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/ai/AIThinkingIndicator.tsx`

```tsx
<AIThinkingIndicator />
```

#### `AIToolCall` — Card showing tool function and arguments

- **Category / type:** 15. AI Components · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Card showing tool function and arguments. Interactive tool card
- **What it fixes vs Material UI:** Unformatted JSON blob
- **When to use:** Use it inside an AI or chat surface — messages, composers, reasoning, tool calls, citations and approvals — specifically when you need card showing tool function and arguments.
- **Key props / API:** Typed with `{ toolName?: string }` in its source file; the fields are declared there rather than in a separate exported interface this reference could extract.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/ai/AIToolCall.tsx`

```tsx
<AIToolCall />
```

#### `AIToolTrace` — Detailed trace view with execution metrics

- **Category / type:** 15. AI Components · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Detailed trace view with execution metrics. Performance timing trace
- **What it fixes vs Material UI:** Hidden backend logs
- **When to use:** Use it inside an AI or chat surface — messages, composers, reasoning, tool calls, citations and approvals — specifically when you need detailed trace view with execution metrics.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/ai/AIToolTrace.tsx`

```tsx
<AIToolTrace />
```

#### `AIWorkflowBuilder` — Visual canvas connecting agent steps

- **Category / type:** 15. AI Components · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Visual canvas connecting agent steps. Drag-and-drop workflow nodes
- **What it fixes vs Material UI:** Code-only pipelines
- **When to use:** Use it inside an AI or chat surface — messages, composers, reasoning, tool calls, citations and approvals — specifically when you need visual canvas connecting agent steps.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/ai/AIWorkflowBuilder.tsx`

```tsx
<AIWorkflowBuilder />
```

### 16. Editors & Creative Tools — 17 components

WYSIWYG toolbars, Notion-style slash command menus, code syntax highlighters, and visual theme editors. This category has 2 showcase(s) and 15 primitive(s). Reach for it when the user creates or edits content — text, code, JSON, colour, gradients, icons or theme tokens.

**In this category:** `JXInteractiveColorStudio`, `JXRichTextEditor & JXUploadDropzone`, `BlockEditor`, `CodeEditor`, `ColorPaletteBuilder`, `DesignTokenEditor`, `DiffViewer`, `EmojiPicker`, `FloatingEditorToolbar`, `GradientEditor`, `IconPicker`, `JsonEditor`, `LayerPanel`, `MarkdownEditor`, `RichTextEditor`, `SlashCommandMenu`, `VisualThemeEditor`

#### `JXInteractiveColorStudio` — Live HSL/OKLCH Tonal Scale & WCAG Contrast Generator

- **Category / type:** 16. Editors & Creative Tools · Showcase (System A) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Live HSL/OKLCH Tonal Scale & WCAG Contrast Generator. Composes JXSlider, JXCard, and JXChip to generate a 9-stop tonal scale (50–900) in real time with live WCAG contrast ratio badges and one-click CSS variable export.
- **What it fixes vs Material UI:** MUI createTheme palette generation is opaque and provides no real-time WCAG AA/AAA contrast audit.
- **When to use:** Use it when the user creates or edits content — text, code, JSON, colour, gradients, icons or theme tokens — specifically when you need live hsl/oklch tonal scale & wcag contrast generator.
- **Key props / API:** Composite showcase entry — it is demonstrated inside the workbench showcase files rather than exported as one standalone component. Props documented in the JXUI catalog for it: `variant: 'solid' | 'glass' | 'subtle' | 'outline' | 'ghost'`; `size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'`; `disabled: boolean`; `className: string`; `version: '3.0' | '3.0.0'`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.

```tsx
<JXInteractiveColorStudio
  baseHue={242}
  saturation={84}
  auditTargets={['#F8FAFC', '#0B0F19']}
  exportFormat="css-variables"
/>
```

#### `JXRichTextEditor & JXUploadDropzone` — Slash-Command (/) Block Editor & Multi-File Dropzone

- **Category / type:** 16. Editors & Creative Tools · Showcase (System A) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Slash-Command (/) Block Editor & Multi-File Dropzone. Built-in slash-command (/) block editor toolbar + interactive drag-and-drop file uploader with live file-type icons, image thumbnails, and upload progress bars.
- **What it fixes vs Material UI:** Listed on MUI X future roadmap or requires external 3rd-party integration.
- **When to use:** Use it when the user creates or edits content — text, code, JSON, colour, gradients, icons or theme tokens — specifically when you need slash-command (/) block editor & multi-file dropzone.
- **Key props / API:** Composite showcase entry — it is demonstrated inside the workbench showcase files rather than exported as one standalone component. Props documented in the JXUI catalog for it: `variant: 'solid' | 'glass' | 'subtle' | 'outline' | 'ghost'`; `size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'`; `disabled: boolean`; `className: string`; `version: '3.0' | '3.0.0'`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.

```tsx
<JXRichTextEditor slashCommands placeholder="Type '/' for commands..." />
<JXUploadDropzone accept={['.svg', '.png', '.json']} maxFiles={5} />
```

#### `BlockEditor` — Draggable content block editor

- **Category / type:** 16. Editors & Creative Tools · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Draggable content block editor. Modular draggable blocks
- **What it fixes vs Material UI:** Monolithic text blob
- **When to use:** Use it when the user creates or edits content — text, code, JSON, colour, gradients, icons or theme tokens — specifically when you need draggable content block editor.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/editors/BlockEditor.tsx`

```tsx
<BlockEditor />
```

#### `CodeEditor` — Syntax-highlighted code editing box

- **Category / type:** 16. Editors & Creative Tools · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Syntax-highlighted code editing box. Theme-reactive syntax highlighting
- **What it fixes vs Material UI:** Unformatted monospace input
- **When to use:** Use it when the user creates or edits content — text, code, JSON, colour, gradients, icons or theme tokens — specifically when you need syntax-highlighted code editing box.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/editors/CodeEditor.tsx`

```tsx
<CodeEditor />
```

#### `ColorPaletteBuilder` — Harmonious OKLCH palette generator

- **Category / type:** 16. Editors & Creative Tools · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Harmonious OKLCH palette generator. Perceptually uniform color math
- **What it fixes vs Material UI:** Basic hex inputs
- **When to use:** Use it when the user creates or edits content — text, code, JSON, colour, gradients, icons or theme tokens — specifically when you need harmonious oklch palette generator.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/editors/ColorPaletteBuilder.tsx`

```tsx
<ColorPaletteBuilder />
```

#### `DesignTokenEditor` — Live CSS variables / HSL editor with preview

- **Category / type:** 16. Editors & Creative Tools · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Live CSS variables / HSL editor with preview. Dynamic CSS custom property engine
- **What it fixes vs Material UI:** Hardcoded SCSS files
- **When to use:** Use it when the user creates or edits content — text, code, JSON, colour, gradients, icons or theme tokens — specifically when you need live css variables / hsl editor with preview.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/editors/DesignTokenEditor.tsx`

```tsx
<DesignTokenEditor />
```

#### `DiffViewer` — Git-style side-by-side or inline diff (+/-)

- **Category / type:** 16. Editors & Creative Tools · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Git-style side-by-side or inline diff (+/-). Color-coded line additions/removals
- **What it fixes vs Material UI:** Manual string comparison
- **When to use:** Use it when the user creates or edits content — text, code, JSON, colour, gradients, icons or theme tokens — specifically when you need git-style side-by-side or inline diff (+/-).
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/editors/DiffViewer.tsx`

```tsx
<DiffViewer />
```

#### `EmojiPicker` — Categorized emoji search popover

- **Category / type:** 16. Editors & Creative Tools · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Categorized emoji search popover. Cross-platform emoji popover
- **What it fixes vs Material UI:** OS raw picker
- **When to use:** Use it when the user creates or edits content — text, code, JSON, colour, gradients, icons or theme tokens — specifically when you need categorized emoji search popover.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/editors/EmojiPicker.tsx`

```tsx
<EmojiPicker />
```

#### `FloatingEditorToolbar` — Floating selection menu (Bold, Italic, Link)

- **Category / type:** 16. Editors & Creative Tools · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Floating selection menu (Bold, Italic, Link). Contextual floating pill
- **What it fixes vs Material UI:** Fixed top toolbar only
- **When to use:** Use it when the user creates or edits content — text, code, JSON, colour, gradients, icons or theme tokens — specifically when you need floating selection menu (bold, italic, link).
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/editors/FloatingEditorToolbar.tsx`

```tsx
<FloatingEditorToolbar />
```

#### `GradientEditor` — Interactive color stops gradient creator

- **Category / type:** 16. Editors & Creative Tools · Primitive (System B) · Lab — Experimental · Difficulty: enterprise · v3.0.0
- **Purpose:** Interactive color stops gradient creator. Draggable gradient stops
- **What it fixes vs Material UI:** Static CSS background
- **When to use:** Use it when the user creates or edits content — text, code, JSON, colour, gradients, icons or theme tokens — specifically when you need interactive color stops gradient creator.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/editors/GradientEditor.tsx`

```tsx
<GradientEditor />
```

#### `IconPicker` — Searchable grid of Lucide icons

- **Category / type:** 16. Editors & Creative Tools · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Searchable grid of Lucide icons. Instant keyword icon search
- **What it fixes vs Material UI:** Huge static icon bundles
- **When to use:** Use it when the user creates or edits content — text, code, JSON, colour, gradients, icons or theme tokens — specifically when you need searchable grid of lucide icons.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/editors/IconPicker.tsx`

```tsx
<IconPicker />
```

#### `JsonEditor` — Collapsible tree JSON viewer/editor

- **Category / type:** 16. Editors & Creative Tools · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Collapsible tree JSON viewer/editor. Interactive collapsible tree
- **What it fixes vs Material UI:** Raw JSON.stringify display
- **When to use:** Use it when the user creates or edits content — text, code, JSON, colour, gradients, icons or theme tokens — specifically when you need collapsible tree json viewer/editor.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/editors/JsonEditor.tsx`

```tsx
<JsonEditor />
```

#### `LayerPanel` — Graphic design layer tree with eye toggles

- **Category / type:** 16. Editors & Creative Tools · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Graphic design layer tree with eye toggles. Photoshop-style layer stack
- **What it fixes vs Material UI:** Flat component list
- **When to use:** Use it when the user creates or edits content — text, code, JSON, colour, gradients, icons or theme tokens — specifically when you need graphic design layer tree with eye toggles.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/editors/LayerPanel.tsx`

```tsx
<LayerPanel />
```

#### `MarkdownEditor` — Split preview markdown composer

- **Category / type:** 16. Editors & Creative Tools · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Split preview markdown composer. Live side-by-side rendering
- **What it fixes vs Material UI:** Raw markdown string
- **When to use:** Use it when the user creates or edits content — text, code, JSON, colour, gradients, icons or theme tokens — specifically when you need split preview markdown composer.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/editors/MarkdownEditor.tsx`

```tsx
<MarkdownEditor />
```

#### `RichTextEditor` — WYSIWYG toolbar and contentEditable field

- **Category / type:** 16. Editors & Creative Tools · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** WYSIWYG toolbar and contentEditable field. Full formatting suite
- **What it fixes vs Material UI:** Basic text field only
- **When to use:** Use it when the user creates or edits content — text, code, JSON, colour, gradients, icons or theme tokens — specifically when you need wysiwyg toolbar and contenteditable field.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/editors/RichTextEditor.tsx`

```tsx
<RichTextEditor />
```

#### `SlashCommandMenu` — Notion-like / trigger dropdown menu

- **Category / type:** 16. Editors & Creative Tools · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Notion-like / trigger dropdown menu. Inline command launcher
- **What it fixes vs Material UI:** Standard dropdowns only
- **When to use:** Use it when the user creates or edits content — text, code, JSON, colour, gradients, icons or theme tokens — specifically when you need notion-like / trigger dropdown menu.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/editors/SlashCommandMenu.tsx`

```tsx
<SlashCommandMenu />
```

#### `VisualThemeEditor` — Live color token studio preview

- **Category / type:** 16. Editors & Creative Tools · Primitive (System B) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Live color token studio preview. Instant real-time token sliders
- **What it fixes vs Material UI:** Requires code recompilation
- **When to use:** Use it when the user creates or edits content — text, code, JSON, colour, gradients, icons or theme tokens — specifically when you need live color token studio preview.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/editors/VisualThemeEditor.tsx`

```tsx
<VisualThemeEditor />
```

### 17. Time & Scheduling — 12 components

Smart natural language calendars, double-date range pickers, Gantt project roadmaps, and countdown timers. This category has 2 showcase(s) and 10 primitive(s). Reach for it for anything anchored in time — dates, ranges, calendars, timelines, schedules and countdowns.

**In this category:** `JXDatePicker, JXTimePicker & JXDateRangePicker`, `JXTimeline`, `AvailabilityGrid`, `CountdownTimer`, `DateRangePicker`, `EventTimeline`, `GanttChart`, `RangeCalendar`, `Scheduler`, `SmartCalendar`, `Timeline`, `TimePicker`

#### `JXDatePicker, JXTimePicker & JXDateRangePicker` — Natural Language Parser + Quick Presets Calendar

- **Category / type:** 17. Time & Scheduling · Showcase (System A) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Natural Language Parser + Quick Presets Calendar. Dual-month range calendar with hover range bridging, left-hand Quick Presets Sidebar ("Today", "Last 7 Days", "YTD"), and natural language header ("next friday", "in 3 days").
- **What it fixes vs Material UI:** Requires multiple clicks across months; no natural language or preset sidebar.
- **When to use:** Use it for anything anchored in time — dates, ranges, calendars, timelines, schedules and countdowns — specifically when you need natural language parser + quick presets calendar.
- **Key props / API:** Composite showcase entry — it is demonstrated inside the workbench showcase files rather than exported as one standalone component. Props documented in the JXUI catalog for it: `variant: 'solid' | 'glass' | 'subtle' | 'outline' | 'ghost'`; `size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'`; `disabled: boolean`; `className: string`; `version: '3.0' | '3.0.0'`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.

```tsx
<JXDateRangePicker
  naturalLanguageInput
  presets={['today', 'last7Days', 'thisQuarter', 'ytd']}
  value={dateRange}
  onChange={setDateRange}
/>
```

#### `JXTimeline` — Interactive Activity & Audit Feed

- **Category / type:** 17. Time & Scheduling · Showcase (System A) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Interactive Activity & Audit Feed. Rich timeline nodes with avatars, status icons, timestamps, collapsible code diff/comment payloads, and active step connector lines.
- **What it fixes vs Material UI:** Rigid center-split timeline from MUI Lab with zero interactive payloads.
- **When to use:** Use it for anything anchored in time — dates, ranges, calendars, timelines, schedules and countdowns — specifically when you need interactive activity & audit feed.
- **Key props / API:** `JXTimelineProps` — `events?: JXTimelineEvent[]`; `defaultExpandedPayload?: boolean`; `className?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/layout-utils/JXTimeline.tsx`

```tsx
<JXTimeline interactiveDiffs items={auditLogEvents} />
```

#### `AvailabilityGrid` — Weekly time slot matrix with drag selection

- **Category / type:** 17. Time & Scheduling · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Weekly time slot matrix with drag selection. Visual availability matrix
- **What it fixes vs Material UI:** Checkbox rows
- **When to use:** Use it for anything anchored in time — dates, ranges, calendars, timelines, schedules and countdowns — specifically when you need weekly time slot matrix with drag selection.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: grid, row, gridcell. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/time/AvailabilityGrid.tsx`

```tsx
<AvailabilityGrid />
```

#### `CountdownTimer` — Real-time decreasing days, hours, mins, secs

- **Category / type:** 17. Time & Scheduling · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Real-time decreasing days, hours, mins, secs. Animated tabular countdown
- **What it fixes vs Material UI:** Static text timestamp
- **When to use:** Use it for anything anchored in time — dates, ranges, calendars, timelines, schedules and countdowns — specifically when you need real-time decreasing days, hours, mins, secs.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/time/CountdownTimer.tsx`

```tsx
<CountdownTimer />
```

#### `DateRangePicker` — Popover field with preset quick ranges

- **Category / type:** 17. Time & Scheduling · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Popover field with preset quick ranges. Instant preset pills
- **What it fixes vs Material UI:** Must click calendar dates
- **When to use:** Use it for anything anchored in time — dates, ranges, calendars, timelines, schedules and countdowns — specifically when you need popover field with preset quick ranges.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/time/DateRangePicker.tsx`

```tsx
<DateRangePicker />
```

#### `EventTimeline` — Activity feed with timestamps and user badges

- **Category / type:** 17. Time & Scheduling · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Activity feed with timestamps and user badges. Tactile event cards
- **What it fixes vs Material UI:** Raw log list
- **When to use:** Use it for anything anchored in time — dates, ranges, calendars, timelines, schedules and countdowns — specifically when you need activity feed with timestamps and user badges.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/time/EventTimeline.tsx`

```tsx
<EventTimeline />
```

#### `GanttChart` — Project roadmap with dependency bars

- **Category / type:** 17. Time & Scheduling · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Project roadmap with dependency bars. Lightweight Gantt bars
- **What it fixes vs Material UI:** Requires complex enterprise package
- **When to use:** Use it for anything anchored in time — dates, ranges, calendars, timelines, schedules and countdowns — specifically when you need project roadmap with dependency bars.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/time/GanttChart.tsx`

```tsx
<GanttChart />
```

#### `RangeCalendar` — Double-calendar selection for start/end dates

- **Category / type:** 17. Time & Scheduling · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Double-calendar selection for start/end dates. Unified range selection
- **What it fixes vs Material UI:** Two separate inputs
- **When to use:** Use it for anything anchored in time — dates, ranges, calendars, timelines, schedules and countdowns — specifically when you need double-calendar selection for start/end dates.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/time/RangeCalendar.tsx`

```tsx
<RangeCalendar />
```

#### `Scheduler` — Day/week calendar time block organizer

- **Category / type:** 17. Time & Scheduling · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Day/week calendar time block organizer. Interactive time booking
- **What it fixes vs Material UI:** Static calendar grid
- **When to use:** Use it for anything anchored in time — dates, ranges, calendars, timelines, schedules and countdowns — specifically when you need day/week calendar time block organizer.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/time/Scheduler.tsx`

```tsx
<Scheduler />
```

#### `SmartCalendar` — Natural language date picker and month grid

- **Category / type:** 17. Time & Scheduling · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Natural language date picker and month grid. Natural language date parsing
- **What it fixes vs Material UI:** Rigid date picker modal
- **When to use:** Use it for anything anchored in time — dates, ranges, calendars, timelines, schedules and countdowns — specifically when you need natural language date picker and month grid.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/time/SmartCalendar.tsx`

```tsx
<SmartCalendar />
```

#### `Timeline` — Chronological event line with status markers

- **Category / type:** 17. Time & Scheduling · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Chronological event line with status markers. Color-coded milestone path
- **What it fixes vs Material UI:** Basic vertical list
- **When to use:** Use it for anything anchored in time — dates, ranges, calendars, timelines, schedules and countdowns — specifically when you need chronological event line with status markers.
- **Key props / API:** Typed with `TimelineProps` in its source file; the fields are declared there rather than in a separate exported interface this reference could extract.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/time/Timeline.tsx`

```tsx
<Timeline />
```

#### `TimePicker` — Hour and minute selector with timezone

- **Category / type:** 17. Time & Scheduling · Primitive (System B) · Core — Stable · Difficulty: advanced · v3.0.0
- **Purpose:** Hour and minute selector with timezone. Compact monospace pill
- **What it fixes vs Material UI:** Clunky clock dial
- **When to use:** Use it for anything anchored in time — dates, ranges, calendars, timelines, schedules and countdowns — specifically when you need hour and minute selector with timezone.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/time/TimePicker.tsx`

```tsx
<TimePicker />
```

### 18. Advanced Utilities — 20 components

Virtual list viewports, image before/after comparison sliders, audio frequency visualizers, and QR codes. This category has 10 showcase(s) and 10 primitive(s). Reach for it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours.

**In this category:** `JXAudioWaveformScrubber`, `JXAvatar & JXAvatarGroup`, `JXBadge`, `JXChip`, `JXDivider`, `JXIcon & JXSvgIcon`, `JXList`, `JXTooltip & JXHtmlTooltip`, `JXTrafficSplitter`, `JXTypography`, `AudioVisualizer`, `ImageComparison`, `ImageLightbox`, `InfiniteScroll`, `QRCodeGenerator`, `ScrollProgress`, `ScrollToTop`, `TourGuide`, `VideoPlayer`, `VirtualList`

#### `JXAudioWaveformScrubber` — 48-Bar Frequency Waveform Player & Speed Pill

- **Category / type:** 18. Advanced Utilities · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** 48-Bar Frequency Waveform Player & Speed Pill. Interactive 48-bar acoustic frequency scrubber with hover timestamp preview, playback speed pill cycler (1.0x–2.0x), and animated equalizer bars.
- **What it fixes vs Material UI:** MUI Slider only renders a flat 4px line with no acoustic bar visualization or chapter markers.
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need 48-bar frequency waveform player & speed pill.
- **Key props / API:** Composite showcase entry — it is demonstrated inside the workbench showcase files rather than exported as one standalone component. Props documented in the JXUI catalog for it: `variant: 'solid' | 'glass' | 'subtle' | 'outline' | 'ghost'`; `size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'`; `disabled: boolean`; `className: string`; `version: '3.0' | '3.0.0'`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.

```tsx
<JXAudioWaveformScrubber
  title="RFC-042 Design Architecture Review.wav"
  durationSeconds={184}
  playbackRates={[1, 1.25, 1.5, 2]}
  chapters={[{ at: 42, label: 'Spring Physics' }, { at: 118, label: 'Zero-Notch Inputs' }]}
/>
```

#### `JXAvatar & JXAvatarGroup` — Presence & Interactive Stack

- **Category / type:** 18. Advanced Utilities · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Presence & Interactive Stack. Squircle or circle shapes, deterministic pastel gradient fallbacks, live status rings, and hover fan-out with +N overflow popover list.
- **What it fixes vs Material UI:** Basic circle image and static +N overflow circle.
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need presence & interactive stack.
- **Key props / API:** `JXAvatarProps` — `name: string`; `src?: string`; `role?: string`; `status?: JXAvatarStatus`; `shape?: JXAvatarShape`; `size?: 'sm' | 'md' | 'lg'`; `gradientClass?: string`; `className?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/data-display/JXAvatar.tsx`

```tsx
<JXAvatarGroup max={4} shape="squircle" interactiveFanOut>
  <JXAvatar name="Elena Rostova" status="online" />
  <JXAvatar name="Marcus Vance" status="busy" />
  <JXAvatar name="Sora Takahashi" status="away" />
</JXAvatarGroup>
```

#### `JXBadge` — Contextual Pulse & Odometer Count Pill

- **Category / type:** 18. Advanced Utilities · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Contextual Pulse & Odometer Count Pill. Automatic optical corner offset, live radar pulse for notifications, smooth rolling odometer transition when numbers change, and status text.
- **What it fixes vs Material UI:** Static circle that clips awkwardly on rounded corners.
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need contextual pulse & odometer count pill.
- **Key props / API:** `JXBadgeProps` — `count?: number`; `max?: number`; `statusText?: string`; `color?: 'primary' | 'success' | 'warning' | 'error'`; `showZero?: boolean`; `children?: React.ReactNode`; `showInteractiveControls?: boolean`; `onCountChange?: (nextCount: number) => void; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/data-display/JXBadge.tsx`

```tsx
<JXBadge count={unreadCount} odometer pulse color="primary">
  <JXIconButton icon={<BellIcon />} />
</JXBadge>
```

#### `JXChip` — Interactive Status & Filter Pill

- **Category / type:** 18. Advanced Utilities · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Interactive Status & Filter Pill. Soft tinted surface with subtle border and status indicator (Active, Pending, Failed), interactive filter dropdown chevron, and collapse on delete.
- **What it fixes vs Material UI:** Dull gray rounded rectangle with a cramped delete icon.
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need interactive status & filter pill.
- **Key props / API:** `JXChipProps` — `label: string`; `tone?: 'neutral' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky'`; `onDelete?: () => void; onClick?: () => void; filterOptions?: string[]; onFilterSelect?: (opt: string) => void; disabled?: boolean; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/data-display/JXChip.tsx`

```tsx
<JXChip
  label="Status: Healthy"
  status="active"
  filterDropdown
  onDelete={() => removeFilter('status')}
/>
```

#### `JXDivider` — Gradient & Action Divider

- **Category / type:** 18. Advanced Utilities · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Gradient & Action Divider. Supports soft radial fade-out edges, embedded pill labels, or interactive "Expand / Show More" action buttons centered on the line.
- **What it fixes vs Material UI:** Plain 1px gray line.
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need gradient & action divider.
- **Key props / API:** `JXDividerProps` — `variant?: 'radial-fade' | 'solid' | 'dashed'`; `label?: string`; `actionLabel?: string`; `expanded?: boolean`; `onAction?: () => void; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/data-display/JXDivider.tsx`

```tsx
<JXDivider
  variant="radial-fade"
  actionLabel={expanded ? "Collapse Advanced Logs" : "Show 12 More Events"}
  onAction={() => setExpanded(!expanded)}
/>
```

#### `JXIcon & JXSvgIcon` — Duotone & Micro-Animated Icon Wrapper

- **Category / type:** 18. Advanced Utilities · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Duotone & Micro-Animated Icon Wrapper. Built-in soft rounded icon container badges (variant="soft-box"), duotone opacity layers, and hover micro-animations (spin, bounce, wiggle).
- **What it fixes vs Material UI:** Flat single-color SVG wrapper.
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need duotone & micro-animated icon wrapper.
- **Key props / API:** `JXIconProps` — `icon: React.ReactNode`; `label?: string`; `variant?: 'soft-box' | 'circle' | 'plain'`; `size?: 'sm' | 'md' | 'lg'`; `hoverAnimation?: JXIconHoverAnimation`; `onClick?: () => void; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/data-display/JXIcon.tsx`

```tsx
<JXIcon
  variant="soft-box"
  color="indigo"
  hoverAnimation="bounce"
  icon={<SparklesIcon />}
/>
```

#### `JXList` — Inset Interactive List & Collapsible Tree

- **Category / type:** 18. Advanced Utilities · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Inset Interactive List & Collapsible Tree. Inset rounded hover highlights (rounded-xl mx-2), keyboard arrow navigation, reveal-on-hover quick actions (Pin, Archive, Delete), and nested guide lines.
- **What it fixes vs Material UI:** Tall, unstyled rows with full-width gray hover bars.
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need inset interactive list & collapsible tree.
- **Key props / API:** `JXListProps` — `folderTitle?: string`; `items?: JXListNestedItem[]`; `defaultOpen?: boolean`; `defaultPinnedId?: string | null`; `onPinToggle?: (id: string) => void; onArchive?: (id: string) => void; onDelete?: (id: string) => void; className?: string;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/data-display/JXList.tsx`

```tsx
<JXList insetHover quickActions={['pin', 'archive', 'delete']}>
  <JXListItem title="Core Design Tokens" subtitle="Updated 14m ago" nestedItems={tokenFiles} />
</JXList>
```

#### `JXTooltip & JXHtmlTooltip` — Rich Interactive Preview Card

- **Category / type:** 18. Advanced Utilities · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Rich Interactive Preview Card. Directional spring entrance, hotkey badge (⌘K), warm handoff between adjacent tooltips, and a rich variant supporting profile previews and metrics.
- **What it fixes vs Material UI:** Tiny dark gray box with delayed, abrupt fade.
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need rich interactive preview card.
- **Key props / API:** `JXTooltipProps` — `title: string`; `shortcut?: string`; `metrics?: JXTooltipMetric[]`; `triggerLabel?: string`; `children?: React.ReactNode`; `className?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/data-display/JXTooltip.tsx`

```tsx
<JXTooltip
  variant="rich"
  shortcut="⌘I"
  title="Cluster Node us-east-1a"
  metrics={{ cpu: '38%', mem: '12.4 GB', uptime: '99.998%' }}
>
  <JXButton>Inspect Node Telemetry</JXButton>
</JXTooltip>
```

#### `JXTrafficSplitter` — Dynamic Color-Coded Canary Deployment Bar & Rollout Orchestrator

- **Category / type:** 18. Advanced Utilities · Showcase (System A) · Core — Stable · Difficulty: enterprise · v3.0.0
- **Purpose:** Dynamic Color-Coded Canary Deployment Bar & Rollout Orchestrator. Slider-driven canary deployment UI with a multi-segment split bar that dynamically color-codes segments (Slate, Sky, Indigo, Amber, Emerald) to represent live traffic percentages, p99 latency, and RPS.
- **What it fixes vs Material UI:** No composed DevOps pipeline primitive combining steppers, traffic sliders, and rollback guards.
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need dynamic color-coded canary deployment bar & rollout orchestrator.
- **Key props / API:** `JXTrafficSplitterProps` — `stableVersion?: string`; `canaryVersion?: string`; `canaryWeight?: number`; `defaultCanaryWeight?: number`; `onWeightChange?: (weight: number) => void; autoRollbackOnError?: boolean; onAutoRollbackChange?: (enabled: boolean) => void; onPromote?: () => void; onRollback?: () => void;`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/Category8SignatureBlocks.tsx`

```tsx
<JXTrafficSplitter
  stableVersion="v2.4.0"
  canaryVersion="v3.0.0"
  canaryWeight={30}
  autoRollbackOnError
  onPromote={() => promoteCanaryToProduction()}
/>
```

#### `JXTypography` — Fluid Semantic Type System

- **Category / type:** 18. Advanced Utilities · Showcase (System A) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Fluid Semantic Type System. Fluid clamp() sizing, automatic text-wrap: balance for headings, gradient text support, inline copyable code snippets, and maxLines truncation.
- **What it fixes vs Material UI:** Hardcoded px/rem jumps and verbose variant names.
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need fluid semantic type system.
- **Key props / API:** `JXTypographyProps` — `variant?: 'display' | 'h2' | 'h3' | 'body' | 'caption' | 'code'`; `gradient?: boolean`; `balance?: boolean`; `copyableCommand?: string`; `children?: React.ReactNode`; `className?: string`.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/data-display/JXTypography.tsx`

```tsx
<JXTypography variant="display-sm" balance gradient="indigo-violet">
  Precision Ergonomics at Scale
</JXTypography>
```

#### `AudioVisualizer` — Real-time frequency equalizer canvas animation

- **Category / type:** 18. Advanced Utilities · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Real-time frequency equalizer canvas animation. Fluid audio equalizer waves
- **What it fixes vs Material UI:** Native audio element only
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need real-time frequency equalizer canvas animation.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/utilities/AudioVisualizer.tsx`

```tsx
<AudioVisualizer />
```

#### `ImageComparison` — Before/After slider dragging between 2 images

- **Category / type:** 18. Advanced Utilities · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Before/After slider dragging between 2 images. Interactive scrub comparison
- **What it fixes vs Material UI:** Side-by-side images only
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need before/after slider dragging between 2 images.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/utilities/ImageComparison.tsx`

```tsx
<ImageComparison />
```

#### `ImageLightbox` — Fullscreen zoomable image viewer with backdrop

- **Category / type:** 18. Advanced Utilities · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Fullscreen zoomable image viewer with backdrop. Pinch & zoom lightbox
- **What it fixes vs Material UI:** Basic dialog with img tag
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need fullscreen zoomable image viewer with backdrop.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/utilities/ImageLightbox.tsx`

```tsx
<ImageLightbox />
```

#### `InfiniteScroll` — Intersection sentinel triggering next batch

- **Category / type:** 18. Advanced Utilities · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Intersection sentinel triggering next batch. Zero-overhead IntersectionObserver
- **What it fixes vs Material UI:** Manual scroll listeners
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need intersection sentinel triggering next batch.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/utilities/InfiniteScroll.tsx`

```tsx
<InfiniteScroll />
```

#### `QRCodeGenerator` — Dynamic SVG QR code renderer with logo center

- **Category / type:** 18. Advanced Utilities · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Dynamic SVG QR code renderer with logo center. Clean scalable vector QR
- **What it fixes vs Material UI:** Raster image download
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need dynamic svg qr code renderer with logo center.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/utilities/QRCodeGenerator.tsx`

```tsx
<QRCodeGenerator />
```

#### `ScrollProgress` — Top thin progress bar tracking page scroll

- **Category / type:** 18. Advanced Utilities · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Top thin progress bar tracking page scroll. Fixed reading progress strip
- **What it fixes vs Material UI:** No reading progress affordance
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need top thin progress bar tracking page scroll.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/utilities/ScrollProgress.tsx`

```tsx
<ScrollProgress />
```

#### `ScrollToTop` — Floating pill button appearing after scrolling

- **Category / type:** 18. Advanced Utilities · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Floating pill button appearing after scrolling. Smooth spring scroll to top
- **What it fixes vs Material UI:** Manual window.scrollTo code
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need floating pill button appearing after scrolling.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/utilities/ScrollToTop.tsx`

```tsx
<ScrollToTop />
```

#### `TourGuide` — Interactive step-by-step onboarding spotlight

- **Category / type:** 18. Advanced Utilities · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Interactive step-by-step onboarding spotlight. Guided spotlight step tour
- **What it fixes vs Material UI:** Annoying popups
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need interactive step-by-step onboarding spotlight.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/utilities/TourGuide.tsx`

```tsx
<TourGuide />
```

#### `VideoPlayer` — Custom styled media player with tactile controls

- **Category / type:** 18. Advanced Utilities · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Custom styled media player with tactile controls. Luminescent video player
- **What it fixes vs Material UI:** Raw browser video controls
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need custom styled media player with tactile controls.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/utilities/VideoPlayer.tsx`

```tsx
<VideoPlayer />
```

#### `VirtualList` — Windowed list rendering only visible rows

- **Category / type:** 18. Advanced Utilities · Primitive (System B) · Core — Stable · Difficulty: beginner · v3.0.0
- **Purpose:** Windowed list rendering only visible rows. Fixed 10 DOM node memory footprint
- **What it fixes vs Material UI:** Renders 10k DOM elements
- **When to use:** Use it for a specialist helper that does not fit the other categories — media, scrolling, comparison, codes and guided tours — specifically when you need windowed list rendering only visible rows.
- **Key props / API:** No props. It is declared as `React.FC` with no props and keeps its own internal state and demo data, so use it as a self-contained piece or copy its source file and wire your own data in.
- **Accessibility:** Keyboard: Tab: Focus component; Enter: Select / interact · ARIA roles to verify: region, group. WCAG 2.2 AA is the design target — verify contrast and assistive-technology behaviour before claiming conformance.
- **Source:** `src/components/library/utilities/VirtualList.tsx`

```tsx
<VirtualList />
```


## Known gaps and version notes

- **The live site is behind the source this knowledgebase is based on.** The deployment at https://jxui-react.vercel.app still serves the pre-fix build: its token exporter output declares `"wcagCompliance": "WCAG 2.1 AA"`. The fixed source (6 November 2026) replaces that claim with a WCAG 2.2 AA design target and a scope note, adds the spacing scale to the export, raises demo text to a 12px floor, and adds Core/Lab tier labels. None of those fixes has been deployed, because the prepared push is blocked on GitHub App write access to the repository.
- **Stale counts in source comments.** Some file comments still say 351 components or 290 primitives. The executed catalog is authoritative: `UNIFIED_COMPONENTS_351` actually contains 361 entries — 61 from `COMPONENT_CATALOG` and 300 from `COMPONENTS_290`.
- **Most primitives are demonstrations, not data-bound controls.** 231 of the 361 entries accept no props and render internal demo data. Treat them as finished interaction and visual patterns to copy and wire up, not as configurable controls with a data API. The 119 typed entries are the ones with a real props contract.
- **Showcase examples sometimes name helper components.** A few catalog JSX examples reference sub-components inside the showcase file (for example a rich option renderer inside the autocomplete example). If an import for a helper name fails, open the showcase's source file — the helper lives there.
- **Accessibility is a target, not a result.** Keyboard contracts and ARIA roles in each entry are the documented intent from the catalog. Screen-reader behaviour and the Vercel deployment's rewrite ordering were not verified live during the fix pass, so test both in your own build before relying on them.

## Sources

- Live workbench: https://jxui-react.vercel.app
- Repository: https://github.com/jacxishipping/jxui-react
- Package: `@jacxishippingorg/jx-ui-react` v3.0.0 (MIT)
- Component data: `src/data/unifiedCatalog.ts`, `src/data/catalog.ts` and `src/data/catalog290.ts` in the JXUI source, executed to produce the counts and entries in this knowledgebase
- Design foundations: `Design.md` (design system architecture and specifications) and `src/index.css` in the JXUI source
