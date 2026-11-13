---
name: jxui-react
description: >-
  Use this skill when building or enhancing React/Next.js UI with
  @jacxishippingorg/jx-ui-react (v3.0.0), including JXUI showcases (JXButton,
  JXTextField, JXDataGrid) and modular primitives (LiquidButton, TiltCard,
  SmartDataTable), with exact prop lookup in jxui-knowledgebase.md and
  components.json.
---

# JXUI React Component Library

Use JXUI (`@jacxishippingorg/jx-ui-react`, v3.0.0) to build React + TypeScript interfaces. It rebuilds the Material UI Core, Lab and X component set with tactile spring interactions, specular glassmorphism, and stable component geometry across state changes. The full reference is `jxui-knowledgebase.md` in this skill folder: 361 components, grouped by 18 categories, each with purpose, the MUI flaw it fixes, when to use it, key props or API, a copyable JSX example, keyboard and ARIA notes, and its source file.

## Start fast

- Install the package with its peer dependencies:
  ```bash
  npm install @jacxishippingorg/jx-ui-react motion lucide-react
  ```
- Styling is Tailwind CSS v4 + native CSS variables (zero-runtime CSS). Licence: MIT.
- Wrap the app in `JXThemeProvider` so components inherit the accent palette, radius scale, dark mode and the built-in toast queue, then import from the package root:
  ```tsx
  import { JXThemeProvider, JXButton, TiltCard } from '@jacxishippingorg/jx-ui-react';

  export function App() {
    return (
      <JXThemeProvider defaultMode="dark">
        <JXButton variant="contained" color="primary" spring morphSuccess lockWidth>
          Deploy Production Build
        </JXButton>
        <TiltCard title="Specular Depth" subtitle="True 3D perspective pitch and yaw tracking cursor coordinates." />
      </JXThemeProvider>
    );
  }
  ```
- `JXThemeProvider` takes `children`, optional `defaultMode` (`'light'` | `'dark'`) and optional `storageKey`. Change accent, radius and compare mode at runtime through `useJXTheme()` — they are not provider props. Accents: `indigo` | `violet` | `emerald` | `rose` | `ocean`.
- Repo commands: `npm run dev` (interactive workbench), `npm test` (logic unit tests), `npm run test:e2e` (Playwright), `npm run lint` (strict `tsc --noEmit`), `npm run build` (production bundle), `npm run build:lib` (publishable library + type declarations).

## The 361 components

- **System A — 61 interactive showcases.** MUI-parity components, `JX`-prefixed (`JXButton`, `JXTextField`, `JXDataGrid`), in `src/components/` grouped by role: `inputs/`, `data-display/`, `feedback/`, `surfaces/`, `navigation/`, `layout-utils/`. Each is a full state machine with a documented keyboard contract and an explicit diff against the MUI behaviour it replaces.
- **System B — 300 modular primitives.** No `JX` prefix (`LiquidButton`, `TiltCard`, `SmartDataTable`), in `src/components/library/`, one folder per category. Effect-led building blocks: 3D tilt, magnetic cursor pull, rotary and slider physics, glass surfaces, spring transitions.
- **Tiers:** 303 Core — Stable, 58 Lab — Experimental (glass, glow, liquid and magnetic effects). Among the 61 showcases, 60 are Core; only `JXSpotlightDock` is Lab.
- **Difficulty:** 153 beginner, 100 intermediate, 56 advanced, 52 enterprise.

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

## Look a component up before using it

- Search `jxui-knowledgebase.md` by API name first — never guess a component name or a prop. The API name never changes; the display name is the API name with the `JX` prefix stripped and camel case split (`JXButton` displays as "Button"). Search and docs use the display name; code always uses the API name.
- Use `components.json` in this folder as the machine-readable index when you need to filter by category, tier or difficulty, or to find a component's source file. It has one object per component (361 total) with `name`, `displayName`, `category`, `tier`, `coreTier`, `description`, `source_file`, `jsxSnippet` and `difficulty`.
- Read the full entry in the knowledgebase for the props, the JSX example and the accessibility notes. Do not rely on the registry props alone — they are templated; the real props live in the per-file `*Props` interfaces.
- Check the entry's source file before importing a helper name from a JSX example. A few showcase examples name helper components that live inside the showcase file (for example a rich option renderer inside the autocomplete example).

## Props reality — check the type before wiring data

- **Typed props (119 entries).** The component declares a `…Props` type. The entry lists the real fields from that type — use those.
- **No props (231 entries).** Declared as `React.FC` with no props. A self-contained piece with internal state and demo data: drop it in as-is (`<DonutChart />`), or copy its source file and wire your own data and callbacks in. Do not invent props for it.
- **Composite entries (11 entries).** Demonstrated inside the workbench and category showcase files rather than exported as one standalone component (for example `JXDataGrid`, `JXSecurityVaultCard`). Their entries list the props the JXUI catalog documents for them, and say so.

## Do not use what is not exported

- 8 showcases are demo-only with no importable component: #51–#55 and #59–#61. Do not import them.
- 3 more (#56–#58) are not re-exported by the package barrel (`src/index.ts`). Do not import them from the package root.
- #50 claims `JXModal` / `JXPopper`, which have no export. Do not use those names.
- Before using any component in a build, confirm it is exported by the barrel and that its source file exists. If an import fails, open the showcase's source file — the helper or the real component lives there.

## Before building a website with JXUI

- Clarify two things first, before building: blank shell versus full version (with assistant, knowledgebase, branding or Component Explorer), and single-file HTML artifact versus a fresh React project. Do not add an assistant, branding or a knowledgebase the user did not ask for, and do not switch framework after the fact.
- Build with real JXUI components, `motion` and `lucide-react`, on one shared data store where the app needs one. Verify with `npm run build` and `npm test` before calling it done.

## Known gaps and version notes

- The live workbench at https://jxui-react.vercel.app is behind the fixed source this knowledgebase is based on (6 November 2026). Its token exporter still declares WCAG 2.1 AA; the fixed source targets WCAG 2.2 AA, adds the spacing scale to the export, raises demo text to a 12px floor, and adds Core/Lab tier labels. None of those fixes has been deployed — the prepared push is blocked on GitHub App write access to the repository.
- Some source comments still say 351 components or 290 primitives. The executed catalog is authoritative: `UNIFIED_COMPONENTS_351` actually contains 361 entries — 61 from `COMPONENT_CATALOG` and 300 from `COMPONENTS_290`.
- Accessibility is a target, not a result. Keyboard contracts and ARIA roles in each entry are the documented intent from the catalog. Screen-reader behaviour and the Vercel deployment's rewrite ordering were not verified live, so test both in your own build before claiming conformance.

## Sources

- Live workbench: https://jxui-react.vercel.app
- Repository: https://github.com/jacxishipping/jxui-react
- Package: `@jacxishippingorg/jx-ui-react` v3.0.0 (MIT)
- Component data: `src/data/unifiedCatalog.ts`, `src/data/catalog.ts`, `src/data/catalog290.ts` in the JXUI source
- Design foundations: `Design.md` and `src/index.css` in the JXUI source
- Knowledgebase in this folder: `jxui-knowledgebase.md` (5,641 lines, all 361 components verified present); index: `components.json`
