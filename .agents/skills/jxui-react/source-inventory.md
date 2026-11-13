# JXUI — Component Source Inventory

> **Source (read-only):** `~/workspace/jxui-react-fixed/jxui-react-main/` — the fixed copy of the JXUI repo (upstream: `jacxishipping/jxui-react`). Nothing in the source tree was modified for this inventory.
> **Canonical registry:** `src/data/unifiedCatalog.ts` (`UNIFIED_COMPONENTS_351`, `UNIFIED_CATEGORIES_18`, `UNIFIED_STATS`), built from `src/data/catalog.ts` (System A, 61 showcases) + `src/data/catalog290.ts` (System B, 300 primitives). Every row below comes from that registry; `source_file` was verified against the files on disk. No component was invented.
> **Machine-readable companion:** `components.json` in this same directory — one object per component, same 361 rows, same ordering (registry order: showcases #01–#61, then primitives in `catalog290` order).
> **Date counted:** 2026-11-10. **Library version:** 3.0.0.

## 1. Identity

| Field | Value (source) |
|---|---|
| Package name | `@jacxishippingorg/jx-ui-react` (`package.json`: `name`) |
| Version | **3.0.0** (`package.json`, `JXUI_COMPONENT_VERSION` in `unifiedCatalog.ts`, `JXUI_VERSION` in `src/components/index.ts`) |
| Description | “Next-generation React 19 component library and design system with zero-runtime CSS, tactile spring interactions, and 361 unified components.” (`package.json`) |
| Framework | **React 19** — installed `react`/`react-dom` **19.3.1**; `peerDependencies` allow `react`/`react-dom >=18.0.0`; `@types/react`/`@types/react-dom` ^19.3.0; TypeScript ^7.0.2 (dev) |
| Styling | Tailwind CSS v4 (`tailwindcss` 4.3.3, `@tailwindcss/vite`), zero-runtime CSS, CSS variables (`src/index.css`) |
| Peer dependencies | `lucide-react >=0.400.0` (installed 0.546.0), `motion >=11.0.0` (installed 12.43.0), `react >=18.0.0`, `react-dom >=18.0.0` |
| Runtime dependencies (site) | `@google/genai ^2.4.0`, `@tailwindcss/vite`, `@vitejs/plugin-react`, `dotenv`, `express`, `vite ^8.3.0` — these power the workbench/site, not the shipped library (lib build externals: `react`, `react-dom`, `react/jsx-runtime`, `motion`, `motion/react`, `lucide-react`; see `vite.lib.config.ts`) |
| Entry points | `src/index.ts` → `src/components/index.ts` (barrel) + `src/context/JXThemeContext` + data + utils; lib output `dist-lib/index.mjs` / `index.cjs` / `types/` (`package.json` `main`/`module`/`types`/`exports`) |
| Licence / homepage | MIT; `https://jacxishipping.github.io/jxui-react/` |
| Live demo (claimed) | `https://jxui-react.vercel.app` (per user request; not verified in this read-only inventory — no live-browser check was run) |
| `metadata.json` | Name “JXUI (@jxui/react) — Component Library & Interactive Workbench”; describes reimagining every MUI (Core, Lab, X) component; major capability `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` |

## 2. Claimed totals vs counted totals — VERIFIED

All three headline claims check out exactly against the registry data (counted by importing the data files with `tsx` and by counting files on disk — not by trusting comments).

| Claim (where stated) | Claimed | Counted | Verdict |
|---|---|---|---|
| Total components — `README.md`, `Design.md` §1/§5, `package.json` description, `unifiedCatalog.ts` header, `UNIFIED_STATS.totalComponents` | 361 | **361** (`UNIFIED_COMPONENTS_351.length`) | ✅ matches |
| System A showcases — `README.md`, `UNIFIED_STATS.totalShowcases` | 61 | **61** (`COMPONENT_CATALOG.length`, `catalog.ts`) | ✅ matches |
| System B primitives — `README.md`, `UNIFIED_STATS.totalPrimitives` | 300 | **300** (`COMPONENTS_290.length`, `catalog290.ts`) | ✅ matches |
| Categories | 18 | **18** (`UNIFIED_CATEGORIES_18` / `CATEGORIES_290`) | ✅ matches |
| Per-category totals (README table §“Master Component Suite”) | 24, 24, 30, 32, 18, 22, 17, 17, 22, 21, 18, 15, 20, 16, 16, 17, 12, 20 | identical, in the same order | ✅ matches (see §3) |
| Primitives on disk — `src/components/library/*/*.tsx` (excluding `index.ts` and `categoryNN*.tsx` demo wrappers) | 300 implied | **300 files, 1:1 with the 300 registry primitives, zero extras, zero missing** | ✅ matches |
| Showcase files on disk — `src/components/{inputs,data-display,feedback,navigation,surfaces,layout-utils}/JX*.tsx` | 61 implied | **50 standalone `JX*.tsx` files**; the other 11 registry entries are composites / co-located / demo-only (see §6) | ⚠️ see §6 — registry count is 61, standalone files are 50 |

**Stale-name discrepancies (cosmetic, but real — do not trust the identifier at face value):**

- `UNIFIED_COMPONENTS_351` is **named “351” but contains 361 items** (61 + 300). Its own comment says “Assemble Unified 351 List” while `UNIFIED_STATS` next to it comments `totalComponents: … // 361`. The length, not the name, is correct.
- `src/components/index.ts` comment says “System B: 290 Modular Primitives” and `src/components/library/index.ts` says “290 Individual Components” — both stale; the actual primitive count is 300. `src/index.ts` correctly says 361 (61 + 300).
- `src/data/catalog290.ts` is named “290” but contains 300 entries; its header comment says “Complete 300 Component Registry”. Again, the data is right, the “290” in the filename/identifier is a leftover (the file was formerly the “JX290” library — see `JX290LibraryExplorer.tsx`).
- `README.md` badge says “tests 22/22 passing” and `npm test` is described as 22/22; `package.json` `test` runs `src/utils/jxuiLogic.test.ts` only. Not re-run here (read-only inventory).

## 3. Totals by category

| # | Category | Showcases | Primitives | Total |
|---|---|---|---|---|
| 1 | Category 1: Buttons & Actions | 4 | 20 | **24** |
| 2 | Category 2: Glassmorphism & Surfaces | 4 | 20 | **24** |
| 3 | Category 3: Navigation & Wayfinding | 10 | 20 | **30** |
| 4 | Category 4: Inputs & Forms | 7 | 25 | **32** |
| 5 | Category 5: Toggles & Selection | 3 | 15 | **18** |
| 6 | Category 6: Modals & Overlays | 2 | 20 | **22** |
| 7 | Category 7: Notifications & Feedback | 2 | 15 | **17** |
| 8 | Category 8: Loading & Progress | 2 | 15 | **17** |
| 9 | Category 9: Cards & Content | 2 | 20 | **22** |
| 10 | Category 10: Data Visualization | 1 | 20 | **21** |
| 11 | Category 11: Tables & Data Grids | 3 | 15 | **18** |
| 12 | Category 12: Drag & Drop | 0 | 15 | **15** |
| 13 | Category 13: Layout & Workspace | 5 | 15 | **20** |
| 14 | Category 14: Animation & Motion | 1 | 15 | **16** |
| 15 | Category 15: AI Components | 1 | 15 | **16** |
| 16 | Category 16: Editors & Creative Tools | 2 | 15 | **17** |
| 17 | Category 17: Time & Scheduling | 2 | 10 | **12** |
| 18 | Category 18: Advanced Utilities | 10 | 10 | **20** |
| | **Total** | **61** | **300** | **361** |

Category IDs (as in `CATEGORIES_290` / `categoryId`): 1 `buttons-actions`, 2 `glass-surfaces`, 3 `navigation`, 4 `inputs-forms`, 5 `toggles-selection`, 6 `modals-overlays`, 7 `feedback-notifications`, 8 `loading-progress`, 9 `cards-content`, 10 `data-visualization`, 11 `tables-datagrids`, 12 `drag-drop`, 13 `layout-workspace`, 14 `animation-motion`, 15 `ai-components`, 16 `editors-creative`, 17 `time-scheduling`, 18 `advanced-utilities`.

Note the two groupings in the source: the **18-category unified grouping** above is the current one. The older System A grouping in `catalog.ts` (`CATEGORIES`, 8 groups: Inputs 14, Data Display 10, Feedback 6, Surfaces 4, Navigation 10, Layout & Lab 6, Enterprise X 5, Signature Blocks 6 = 61) is a different, legacy cut of the same 61 showcases — do not add the two groupings together.

## 4. Totals by tier

| Tier | Meaning | Count |
|---|---|---|
| `showcase` (System A) | Full interactive showcase / state machine, MUI-parity, in `catalog.ts` | 61 |
| `primitive` (System B) | Modular building-block component in `catalog290.ts` / `src/components/library/` | 300 |
| `core` (Core · Stable) | Core/Lab maturity tier from `classifyCoreTier()` in `catalog.ts` — MUI-parity task component, named for the job (e.g. `JXButton`, `JXDataGrid`). Prefer in production. | **303** (60 showcase + 243 primitive) |
| `lab` (Lab · Experimental) | Effect-led component, named for the treatment — name contains `glass`, `glow`, `liquid`, `magnetic`, `particle`, `shimmer`, `gradient`, `prism`, `aurora`, `neon`, `holographic`, `iridescent`, `refract` or `spotlight` (case-insensitive). API may still be settling. | **58** (1 showcase + 57 primitive) |

The two tier axes are independent and both are carried on every unified entry: `tier` = which source system (`showcase` | `primitive`); `coreTier` = maturity (`core` | `lab`). `coreTier` is **derived from the API name** by `classifyCoreTier()`, not hand-labelled per component — a MUI-parity component whose demo uses a glass/glow treatment stays Core; only the effect-led variant is Lab. The single Lab showcase is the one showcase whose name contains an effect token (see §6, #56 `JXSpotlightDock`).

By difficulty (derived in `unifiedCatalog.ts:deriveMetadata`, from category/name): beginner 153, intermediate 100, advanced 56, enterprise 52. By maturity (`quality.maturity`): Production Ready 61 (exactly the showcases), Stable 300 (exactly the primitives). Every entry has a `subtitle`, a `jsxSnippet`, tags, frameworks (`React 19`, `Next.js 15`, `Vite`, `Remix`, `Astro`), and a generated doc block — see §7 on what is generated vs real.

## 5. Per-category component tables

Columns: **Name** = exact registry/API name (never renamed — see the JX-10 display-label note in `catalog.ts`: `displayName` strips the `JX` prefix and splits camelCase, e.g. `JXButton` → “Button”; the API name is unchanged). **Description** = the registry `subtitle`. **Tier** = `showcase`/`primitive` · `Core`/`Lab`. **Source file** = verified file on disk, relative to the repo root; see §6 for the entries whose source is not a standalone file.

### Category 1: Buttons & Actions — 24 components (4 showcase, 20 primitive)

| Name | Description | Tier | Source file |
|---|---|---|---|
| `JXButton` | Morphing Tactile Button | showcase · Core | `src/components/inputs/JXButton.tsx` |
| `JXButtonGroup` | Segmented Pill & Split Action Bar | showcase · Core | `src/components/inputs/JXButtonGroup.tsx` |
| `JXFab` | Floating Action Island | showcase · Core | `src/components/inputs/JXFab.tsx` |
| `JXToggleButtonGroup` | Animated Segmented Control | showcase · Core | `src/components/inputs/JXToggleButton.tsx` |
| `MagneticButton` | Cursor magnetic tracking with physics pull | primitive · Lab | `src/components/library/buttons/MagneticButton.tsx` |
| `LiquidButton` | Fluid morphing gel with specular highlights | primitive · Lab | `src/components/library/buttons/LiquidButton.tsx` |
| `MorphButton` | Stable 3-state morphing (idle/load/success) | primitive · Core | `src/components/library/buttons/MorphButton.tsx` |
| `SpringButton` | Tactile spring scale on press | primitive · Core | `src/components/library/buttons/SpringButton.tsx` |
| `RippleButton` | Upgraded coordinate wave ripple | primitive · Core | `src/components/library/buttons/RippleButton.tsx` |
| `GlowButton` | Dynamic luminescent drop glow | primitive · Lab | `src/components/library/buttons/GlowButton.tsx` |
| `GradientButton` | Animated gradient sweep | primitive · Lab | `src/components/library/buttons/GradientButton.tsx` |
| `ShimmerButton` | Continuous metallic sheen ray | primitive · Lab | `src/components/library/buttons/ShimmerButton.tsx` |
| `ParticleButton` | Micro-burst particles on click | primitive · Lab | `src/components/library/buttons/ParticleButton.tsx` |
| `MagneticIconButton` | Circular icon button with magnetic snap | primitive · Lab | `src/components/library/buttons/MagneticIconButton.tsx` |
| `HoldToConfirmButton` | Long-press safeguard progress fill | primitive · Core | `src/components/library/buttons/HoldToConfirmButton.tsx` |
| `SlideToAction` | Swipe slider pill to authorize action | primitive · Core | `src/components/library/buttons/SlideToAction.tsx` |
| `ExpandableButton` | Collapsed icon expanding on hover | primitive · Core | `src/components/library/buttons/ExpandableButton.tsx` |
| `FloatingActionButton` | Elevated action button with spring pop | primitive · Core | `src/components/library/buttons/FloatingActionButton.tsx` |
| `SpeedDial` | Radial / vertical secondary quick actions | primitive · Core | `src/components/library/buttons/SpeedDial.tsx` |
| `SplitButton` | Primary action plus dropdown chevron | primitive · Core | `src/components/library/buttons/SplitButton.tsx` |
| `AnimatedButtonGroup` | Connected segment group with sliding pill | primitive · Core | `src/components/library/buttons/AnimatedButtonGroup.tsx` |
| `CommandButton` | Integrated keyboard shortcut badge | primitive · Core | `src/components/library/buttons/CommandButton.tsx` |
| `GestureButton` | Double-tap and swipe gesture trigger | primitive · Core | `src/components/library/buttons/GestureButton.tsx` |
| `MultiStateButton` | Status cycle through 4 workflow stages | primitive · Core | `src/components/library/buttons/MultiStateButton.tsx` |

### Category 2: Glassmorphism & Surfaces — 24 components (4 showcase, 20 primitive)

| Name | Description | Tier | Source file |
|---|---|---|---|
| `JXAccordion` | Smooth Spring Disclosure | showcase · Core | `src/components/surfaces/JXAccordion.tsx` |
| `JXAppBar` | Floating Glass Navigation Header | showcase · Core | `src/components/surfaces/JXAppBar.tsx` |
| `JXCard` | Bento Surface with Cursor Spotlight Glow | showcase · Core | `src/components/surfaces/JXCard.tsx` |
| `JXPaper` | Semantic Layered Surface Primitive | showcase · Core | `src/components/surfaces/JXPaper.tsx` |
| `LiquidGlass` | Fluid dynamic blurred glass container | primitive · Lab | `src/components/library/glassmorphism/LiquidGlass.tsx` |
| `FrostedGlass` | Deep diffuse blur with rim lighting | primitive · Lab | `src/components/library/glassmorphism/FrostedGlass.tsx` |
| `AdaptiveGlass` | Ambient theme-tinted glass surface | primitive · Lab | `src/components/library/glassmorphism/AdaptiveGlass.tsx` |
| `DynamicGlassPanel` | Adjustable blur and opacity controls | primitive · Lab | `src/components/library/glassmorphism/DynamicGlassPanel.tsx` |
| `GlassCard` | Luminescent card with specular highlights | primitive · Lab | `src/components/library/glassmorphism/GlassCard.tsx` |
| `GlassNavbar` | Floating pill glass header | primitive · Lab | `src/components/library/glassmorphism/GlassNavbar.tsx` |
| `GlassSidebar` | Semi-transparent navigation sidebar | primitive · Lab | `src/components/library/glassmorphism/GlassSidebar.tsx` |
| `GlassModal` | Refractive translucent dialog window | primitive · Lab | `src/components/library/glassmorphism/GlassModal.tsx` |
| `GlassPopover` | Lightweight translucent dropdown | primitive · Lab | `src/components/library/glassmorphism/GlassPopover.tsx` |
| `GlassTooltip` | Micro frosted glass info label | primitive · Lab | `src/components/library/glassmorphism/GlassTooltip.tsx` |
| `GlassDock` | macOS-inspired glass icon shelf | primitive · Lab | `src/components/library/glassmorphism/GlassDock.tsx` |
| `GlassToolbar` | Compact floating glass action strip | primitive · Lab | `src/components/library/glassmorphism/GlassToolbar.tsx` |
| `GlassNotification` | Frosted glass alert banner | primitive · Lab | `src/components/library/glassmorphism/GlassNotification.tsx` |
| `GlassInput` | Glassmorphic input field with translucent fill | primitive · Lab | `src/components/library/glassmorphism/GlassInput.tsx` |
| `GlassButton` | Frosted glass press button | primitive · Lab | `src/components/library/glassmorphism/GlassButton.tsx` |
| `GlassTabs` | Glassmorphic pill segmented tabs | primitive · Lab | `src/components/library/glassmorphism/GlassTabs.tsx` |
| `GlassSheet` | Sliding translucent inspector panel | primitive · Lab | `src/components/library/glassmorphism/GlassSheet.tsx` |
| `GlassCommandMenu` | Command launcher in frosted glass | primitive · Lab | `src/components/library/glassmorphism/GlassCommandMenu.tsx` |
| `GlassFloatingPanel` | Draggable floating performance widget | primitive · Lab | `src/components/library/glassmorphism/GlassFloatingPanel.tsx` |
| `SpatialGlassWorkspace` | 3D multi-layered glass plane container | primitive · Lab | `src/components/library/glassmorphism/SpatialGlassWorkspace.tsx` |

### Category 3: Navigation & Wayfinding — 30 components (10 showcase, 20 primitive)

| Name | Description | Tier | Source file |
|---|---|---|---|
| `JXBottomNavigation` | Floating Mobile Pill Dock | showcase · Core | `src/components/navigation/JXBottomNavigation.tsx` |
| `JXBreadcrumbs` | Collapsible Path Bar & Sibling Switcher | showcase · Core | `src/components/navigation/JXBreadcrumbs.tsx` |
| `JXDrawer` | Floating Inset Sheet & Mini-Rail Sidebar | showcase · Core | `src/components/navigation/JXDrawer.tsx` |
| `JXLink` | Animated Underline & Hover Preview Link | showcase · Core | `src/components/navigation/JXLink.tsx` |
| `JXMenu & JXMenuItem` | Nested Command & Context Menu | showcase · Core | `src/components/navigation/JXMenu.tsx` |
| `JXPagination` | Smart Page Jumper & Summary Bar | showcase · Core | `src/components/navigation/JXPagination.tsx` |
| `JXSpeedDial` | Staggered Quick Action Menu with Always-Visible Labels | showcase · Core | `src/components/navigation/JXSpeedDial.tsx` |
| `JXStepper` | Interactive Progress & Wizard Flow | showcase · Core | `src/components/navigation/JXStepper.tsx` |
| `JXTabs & JXTab` | Sliding Pill & Underline Tabs | showcase · Core | `src/components/navigation/JXTabs.tsx` |
| `JXNavigationRail` | Compact Vertical App Rail (Missing in MUI Core) | showcase · Core | `src/components/navigation/JXNavigationRail.tsx` |
| `MagneticDock` | Proximity-magnified icon dock | primitive · Lab | `src/components/library/navigation/MagneticDock.tsx` |
| `FloatingDock` | Detached floating navigation pill | primitive · Core | `src/components/library/navigation/FloatingDock.tsx` |
| `AdaptiveNavbar` | Responsive desktop/mobile hybrid header | primitive · Core | `src/components/library/navigation/AdaptiveNavbar.tsx` |
| `MorphingNavbar` | Scroll-position dynamic contraction | primitive · Core | `src/components/library/navigation/MorphingNavbar.tsx` |
| `AnimatedSidebar` | Sidebar with icon badges and expand spring | primitive · Core | `src/components/library/navigation/AnimatedSidebar.tsx` |
| `ExpandableSidebar` | Hover-expanding navigation rail | primitive · Core | `src/components/library/navigation/ExpandableSidebar.tsx` |
| `CollapsibleNavigation` | Multi-level tree disclosure | primitive · Core | `src/components/library/navigation/CollapsibleNavigation.tsx` |
| `MegaMenu` | Categorized multi-column dropdown panel | primitive · Core | `src/components/library/navigation/MegaMenu.tsx` |
| `CommandNavigation` | Keyboard-first navigation bar | primitive · Core | `src/components/library/navigation/CommandNavigation.tsx` |
| `BreadcrumbTrail` | Animated path breadcrumbs | primitive · Core | `src/components/library/navigation/BreadcrumbTrail.tsx` |
| `AnimatedTabs` | Sliding pill active indicator | primitive · Core | `src/components/library/navigation/AnimatedTabs.tsx` |
| `SlidingTabs` | Fluid underline indicator | primitive · Core | `src/components/library/navigation/SlidingTabs.tsx` |
| `NavigationRail` | Compact vertical app rail | primitive · Core | `src/components/library/navigation/NavigationRail.tsx` |
| `FloatingTabBar` | Mobile floating bottom tab bar | primitive · Core | `src/components/library/navigation/FloatingTabBar.tsx` |
| `CircularNavigation` | Rotating ring navigation sectors | primitive · Core | `src/components/library/navigation/CircularNavigation.tsx` |
| `RadialMenu` | Pie menu expanding on click | primitive · Core | `src/components/library/navigation/RadialMenu.tsx` |
| `OrbitalMenu` | Satellites orbiting trigger center | primitive · Core | `src/components/library/navigation/OrbitalMenu.tsx` |
| `ContextNavigation` | Entity-sensitive contextual toolbar | primitive · Core | `src/components/library/navigation/ContextNavigation.tsx` |
| `MultiLevelMenu` | Deep nested flyout without accidental close | primitive · Core | `src/components/library/navigation/MultiLevelMenu.tsx` |
| `GestureNavigation` | Swipe left/right back-forward indicator | primitive · Core | `src/components/library/navigation/GestureNavigation.tsx` |

### Category 4: Inputs & Forms — 32 components (7 showcase, 25 primitive)

| Name | Description | Tier | Source file |
|---|---|---|---|
| `JXAutocomplete` | Enhanced Autocomplete & Command Combobox | showcase · Core | `src/components/inputs/JXAutocomplete.tsx` |
| `JXNumberField` | Tactile Stepper & Scrubbable Input | showcase · Core | `src/components/inputs/JXNumberField.tsx` |
| `JXRating` | Expressive Micro-Animated Rating | showcase · Core | `src/components/inputs/JXRating.tsx` |
| `JXSelect` | Rich Popover Select | showcase · Core | `src/components/inputs/JXSelect.tsx` |
| `JXSlider` | Precision Interactive Scrubber | showcase · Core | `src/components/inputs/JXSlider.tsx` |
| `JXTextField` | Contextual Smart Input | showcase · Core | `src/components/inputs/JXTextField.tsx` |
| `JXTransferList` | Dual-Pane Drag & Filter Shuttle | showcase · Core | `src/components/inputs/JXTransferList.tsx` |
| `LiquidInput` | Fluid glowing border on active focus | primitive · Lab | `src/components/library/inputs/LiquidInput.tsx` |
| `FloatingLabelInput` | Zero-notch smooth label transition | primitive · Core | `src/components/library/inputs/FloatingLabelInput.tsx` |
| `AnimatedInput` | Micro-animated icon reactions | primitive · Core | `src/components/library/inputs/AnimatedInput.tsx` |
| `FormGlassInput` | Frosted glass translucent input field | primitive · Lab | `src/components/library/inputs/FormGlassInput.tsx` |
| `MorphingInput` | Expands into multi-line textarea | primitive · Core | `src/components/library/inputs/MorphingInput.tsx` |
| `SearchInput` | Instant clear button and search hint | primitive · Core | `src/components/library/inputs/SearchInput.tsx` |
| `SmartSearch` | Search with instant suggestion chips | primitive · Core | `src/components/library/inputs/SmartSearch.tsx` |
| `CommandInput` | Terminal prompt styled command field | primitive · Core | `src/components/library/inputs/CommandInput.tsx` |
| `AutoComplete` | Fuzzy-matched dropdown filter | primitive · Core | `src/components/library/inputs/AutoComplete.tsx` |
| `MultiSelect` | Removable tag-based multi-option selector | primitive · Core | `src/components/library/inputs/MultiSelect.tsx` |
| `TagInput` | Freeform string tags with Enter key | primitive · Core | `src/components/library/inputs/TagInput.tsx` |
| `TokenInput` | API key / token formatted field | primitive · Core | `src/components/library/inputs/TokenInput.tsx` |
| `OTPInput` | 6-digit one-time code auto-focus | primitive · Core | `src/components/library/inputs/OTPInput.tsx` |
| `PinInput` | Masked secure PIN dots | primitive · Core | `src/components/library/inputs/PinInput.tsx` |
| `PasswordStrength` | Real-time entropy meter and rules | primitive · Core | `src/components/library/inputs/PasswordStrength.tsx` |
| `PasswordReveal` | Eye toggle with security verification | primitive · Core | `src/components/library/inputs/PasswordReveal.tsx` |
| `ColorPicker` | Hex swatch picker with instant pill | primitive · Core | `src/components/library/inputs/ColorPicker.tsx` |
| `GradientPicker` | Dual-stop CSS gradient generator | primitive · Lab | `src/components/library/inputs/GradientPicker.tsx` |
| `RangeSlider` | Single scrubbable slider with percentage | primitive · Core | `src/components/library/inputs/RangeSlider.tsx` |
| `DualRangeSlider` | Min/max two-handle range slider | primitive · Core | `src/components/library/inputs/DualRangeSlider.tsx` |
| `CircularSlider` | Dial knob rotating 0 to 360° | primitive · Core | `src/components/library/inputs/CircularSlider.tsx` |
| `MagneticSlider` | Handle snaps magnetically to tick marks | primitive · Lab | `src/components/library/inputs/MagneticSlider.tsx` |
| `SignaturePad` | Canvas drawing for digital signatures | primitive · Core | `src/components/library/inputs/SignaturePad.tsx` |
| `FormWizard` | Multi-step wizard with validation dots | primitive · Core | `src/components/library/inputs/FormWizard.tsx` |
| `DynamicFormBuilder` | Schema-driven JSON form generator | primitive · Core | `src/components/library/inputs/DynamicFormBuilder.tsx` |

### Category 5: Toggles & Selection — 18 components (3 showcase, 15 primitive)

| Name | Description | Tier | Source file |
|---|---|---|---|
| `JXCheckbox` | Animated SVG Spring Checkbox & Card Mode | showcase · Core | `src/components/inputs/JXCheckbox.tsx` |
| `JXRadioGroup` | Bento Selection Cards & Sliding Pills | showcase · Core | `src/components/inputs/JXRadioGroup.tsx` |
| `JXSwitch` | Tactile Spring Toggle & Setting Row | showcase · Core | `src/components/inputs/JXSwitch.tsx` |
| `LiquidSwitch` | Fluid morphing toggle switch | primitive · Lab | `src/components/library/toggles/LiquidSwitch.tsx` |
| `MorphSwitch` | Thumb morphs between check and cross | primitive · Core | `src/components/library/toggles/MorphSwitch.tsx` |
| `MagneticSwitch` | Magnetic spring snap to on/off state | primitive · Lab | `src/components/library/toggles/MagneticSwitch.tsx` |
| `AnimatedCheckbox` | SVG checkmark draws on select | primitive · Core | `src/components/library/toggles/AnimatedCheckbox.tsx` |
| `GlassCheckbox` | Frosted glass translucent checkbox | primitive · Lab | `src/components/library/toggles/GlassCheckbox.tsx` |
| `CircularCheckbox` | Round radio-style checkbox with dot | primitive · Core | `src/components/library/toggles/CircularCheckbox.tsx` |
| `AnimatedRadio` | Expanding ripple wave on selection | primitive · Core | `src/components/library/toggles/AnimatedRadio.tsx` |
| `SegmentedControl` | Multi-option pill selection bar | primitive · Core | `src/components/library/toggles/SegmentedControl.tsx` |
| `SlidingSegmentedControl` | Gliding active background indicator | primitive · Core | `src/components/library/toggles/SlidingSegmentedControl.tsx` |
| `SelectableCard` | Card with selected border and checkmark | primitive · Core | `src/components/library/toggles/SelectableCard.tsx` |
| `SelectionGrid` | Multi-card selection grid with counter | primitive · Core | `src/components/library/toggles/SelectionGrid.tsx` |
| `MultiStateToggle` | 3-state workflow toggle (Off/Eco/Turbo) | primitive · Core | `src/components/library/toggles/MultiStateToggle.tsx` |
| `TriStateToggle` | True / Indeterminate / False toggle | primitive · Core | `src/components/library/toggles/TriStateToggle.tsx` |
| `GestureSelector` | Swipe left/right to toggle | primitive · Core | `src/components/library/toggles/GestureSelector.tsx` |
| `FloatingSelectionBar` | Bulk action bar on item selection | primitive · Core | `src/components/library/toggles/FloatingSelectionBar.tsx` |

### Category 6: Modals & Overlays — 22 components (2 showcase, 20 primitive)

| Name | Description | Tier | Source file |
|---|---|---|---|
| `JXBackdrop` | Frosted Glass Scrim | showcase · Core | `src/components/feedback/JXBackdrop.tsx` |
| `JXDialog` | Spring Modal & Command Sheet | showcase · Core | `src/components/feedback/JXDialog.tsx` |
| `MorphingModal` | Expands smoothly from trigger element | primitive · Core | `src/components/library/modals/MorphingModal.tsx` |
| `LiquidDialog` | Viscous spring backdrop blur modal | primitive · Lab | `src/components/library/modals/LiquidDialog.tsx` |
| `GlassDialog` | Specular reflections on translucent modal | primitive · Lab | `src/components/library/modals/GlassDialog.tsx` |
| `SpringModal` | Physics bouncy entrance modal | primitive · Core | `src/components/library/modals/SpringModal.tsx` |
| `FullscreenModal` | Complete viewport overlay with escape bar | primitive · Core | `src/components/library/modals/FullscreenModal.tsx` |
| `Drawer` | Edge slide-out right drawer | primitive · Core | `src/components/library/modals/Drawer.tsx` |
| `MagneticDrawer` | Snaps magnetically to 30%, 60%, 100% | primitive · Lab | `src/components/library/modals/MagneticDrawer.tsx` |
| `BottomSheet` | Mobile bottom sheet with grab handle | primitive · Core | `src/components/library/modals/BottomSheet.tsx` |
| `InteractiveBottomSheet` | Drag down to dismiss bottom sheet | primitive · Core | `src/components/library/modals/InteractiveBottomSheet.tsx` |
| `FloatingPanel` | Draggable window-style floating overlay | primitive · Core | `src/components/library/modals/FloatingPanel.tsx` |
| `ResizablePanel` | Corner-resizable overlay panel | primitive · Core | `src/components/library/modals/ResizablePanel.tsx` |
| `SpotlightOverlay` | Dimmed backdrop focusing on single element | primitive · Lab | `src/components/library/modals/SpotlightOverlay.tsx` |
| `ContextMenu` | Desktop right-click contextual list | primitive · Core | `src/components/library/modals/ContextMenu.tsx` |
| `RadialContextMenu` | Circular right-click pie options | primitive · Core | `src/components/library/modals/RadialContextMenu.tsx` |
| `SmartPopover` | Collision-detecting anchor popover | primitive · Core | `src/components/library/modals/SmartPopover.tsx` |
| `InteractiveTooltip` | Tooltip allowing mouse hover & links | primitive · Core | `src/components/library/modals/InteractiveTooltip.tsx` |
| `HoverCard` | Rich preview card on link hover | primitive · Core | `src/components/library/modals/HoverCard.tsx` |
| `CommandPalette` | Cmd+K style keyboard search and launcher | primitive · Core | `src/components/library/modals/CommandPalette.tsx` |
| `SpotlightSearch` | Fullscreen centered spotlight search | primitive · Lab | `src/components/library/modals/SpotlightSearch.tsx` |
| `OverlayStack` | Multi-layer z-index stacked dialog manager | primitive · Core | `src/components/library/modals/OverlayStack.tsx` |

### Category 7: Notifications & Feedback — 17 components (2 showcase, 15 primitive)

| Name | Description | Tier | Source file |
|---|---|---|---|
| `JXAlert` | Actionable Callout Banner | showcase · Core | `src/components/feedback/JXAlert.tsx` |
| `JXSnackbar` | Sonner-Style 3D Stacked Toast System | showcase · Core | `src/components/feedback/JXSnackbar.tsx` |
| `SmartToast` | Countdown timer bar and undo callback | primitive · Core | `src/components/library/feedback/SmartToast.tsx` |
| `NotificationStack` | 3D stacked toasts with hover expansion | primitive · Core | `src/components/library/feedback/NotificationStack.tsx` |
| `NotificationCenter` | Full panel history of system events | primitive · Core | `src/components/library/feedback/NotificationCenter.tsx` |
| `FeedbackGlassNotification` | Frosted glass alert toast banner | primitive · Lab | `src/components/library/feedback/FeedbackGlassNotification.tsx` |
| `AnimatedAlert` | Entrance slide and pulsing status icon | primitive · Core | `src/components/library/feedback/AnimatedAlert.tsx` |
| `InlineAlert` | Compact embedded message strip | primitive · Core | `src/components/library/feedback/InlineAlert.tsx` |
| `SmartBanner` | Dismissible sticky top banner | primitive · Core | `src/components/library/feedback/SmartBanner.tsx` |
| `ProgressToast` | Toast displaying live percentage progress | primitive · Core | `src/components/library/feedback/ProgressToast.tsx` |
| `UndoNotification` | Notification with instant undo action button | primitive · Core | `src/components/library/feedback/UndoNotification.tsx` |
| `LiveActivity` | Dynamic island pill with live state | primitive · Core | `src/components/library/feedback/LiveActivity.tsx` |
| `StatusIndicator` | Colored dot with optional pulsing halo | primitive · Core | `src/components/library/feedback/StatusIndicator.tsx` |
| `PulseIndicator` | Concentric ripple rings around status marker | primitive · Core | `src/components/library/feedback/PulseIndicator.tsx` |
| `ConnectionStatus` | Real-time online/offline indicator | primitive · Core | `src/components/library/feedback/ConnectionStatus.tsx` |
| `SuccessCelebration` | Confetti burst animation overlay | primitive · Core | `src/components/library/feedback/SuccessCelebration.tsx` |
| `ErrorBoundaryFallback` | Resilient error screen with retry CTA | primitive · Core | `src/components/library/feedback/ErrorBoundaryFallback.tsx` |

### Category 8: Loading & Progress — 17 components (2 showcase, 15 primitive)

| Name | Description | Tier | Source file |
|---|---|---|---|
| `JXProgress (Linear & Circular)` | Shimmer Track & Completion Morph | showcase · Core | `src/components/feedback/JXProgress.tsx` |
| `JXSkeleton` | Layout-Aware Shimmer Placeholder | showcase · Core | `src/components/feedback/JXSkeleton.tsx` |
| `LiquidLoader` | Fluid viscous pulsing gel loader | primitive · Lab | `src/components/library/loading/LiquidLoader.tsx` |
| `MorphingLoader` | Geometric shape shifting (circle/square) | primitive · Core | `src/components/library/loading/MorphingLoader.tsx` |
| `OrbitalLoader` | Planetary orbiting dots loader | primitive · Core | `src/components/library/loading/OrbitalLoader.tsx` |
| `ParticleLoader` | Swirling particle vortex | primitive · Lab | `src/components/library/loading/ParticleLoader.tsx` |
| `WaveLoader` | Audio equalizer undulating bars | primitive · Core | `src/components/library/loading/WaveLoader.tsx` |
| `GradientLoader` | Conic gradient spinning ring | primitive · Lab | `src/components/library/loading/GradientLoader.tsx` |
| `SkeletonCard` | Shimmer placeholder matching card shape | primitive · Core | `src/components/library/loading/SkeletonCard.tsx` |
| `SkeletonTable` | Shimmer placeholder for table rows | primitive · Core | `src/components/library/loading/SkeletonTable.tsx` |
| `SkeletonText` | Text line skeletons with varied widths | primitive · Core | `src/components/library/loading/SkeletonText.tsx` |
| `ProgressRing` | SVG circular progress with percentage | primitive · Core | `src/components/library/loading/ProgressRing.tsx` |
| `CircularProgress` | Continuous spinning SVG circle | primitive · Core | `src/components/library/loading/CircularProgress.tsx` |
| `SegmentedProgress` | Multi-bar discrete step progress | primitive · Core | `src/components/library/loading/SegmentedProgress.tsx` |
| `MultiStepProgress` | Numbered milestone step connector | primitive · Core | `src/components/library/loading/MultiStepProgress.tsx` |
| `UploadProgress` | File transfer loader with byte rate counter | primitive · Core | `src/components/library/loading/UploadProgress.tsx` |
| `TaskProgress` | Background task completion badge | primitive · Core | `src/components/library/loading/TaskProgress.tsx` |

### Category 9: Cards & Content — 22 components (2 showcase, 20 primitive)

| Name | Description | Tier | Source file |
|---|---|---|---|
| `JXImageList` | Bento & Lightbox Media Grid | showcase · Core | `src/components/data-display/JXImageList.tsx` |
| `JXPricingMatrix` | Tiered Glassmorphic Pricing Cards & Smooth Price-Toggling Matrix | showcase · Core | `src/components/Category8SignatureBlocks.tsx` |
| `ContentGlassCard` | Frosted luminescent glass surface | primitive · Lab | `src/components/library/cards/ContentGlassCard.tsx` |
| `MagneticCard` | Card tilting toward cursor position | primitive · Lab | `src/components/library/cards/MagneticCard.tsx` |
| `TiltCard` | 3D parallax tilt on mouse move | primitive · Core | `src/components/library/cards/TiltCard.tsx` |
| `HoverLiftCard` | Tactile elevation lift with soft shadow | primitive · Core | `src/components/library/cards/HoverLiftCard.tsx` |
| `ExpandableCard` | Unfolds to reveal details with zero CLS | primitive · Core | `src/components/library/cards/ExpandableCard.tsx` |
| `MorphingCard` | Resizes smoothly into modal view | primitive · Core | `src/components/library/cards/MorphingCard.tsx` |
| `FlipCard` | 180° flip to show back-side security key | primitive · Core | `src/components/library/cards/FlipCard.tsx` |
| `StackedCard` | Cards in stacked deck format | primitive · Core | `src/components/library/cards/StackedCard.tsx` |
| `SwipeableCard` | Tinder-style swipe left/right | primitive · Core | `src/components/library/cards/SwipeableCard.tsx` |
| `InteractiveCard` | Hover states, tags, and quick actions | primitive · Core | `src/components/library/cards/InteractiveCard.tsx` |
| `SpotlightCard` | Radial spotlight gradient following cursor | primitive · Lab | `src/components/library/cards/SpotlightCard.tsx` |
| `SpotlightBorderCard` | Card border glows near cursor | primitive · Lab | `src/components/library/cards/SpotlightBorderCard.tsx` |
| `GradientBorderCard` | Animated conic gradient border | primitive · Lab | `src/components/library/cards/GradientBorderCard.tsx` |
| `ProfileCard` | Avatar, title, status, and social badges | primitive · Core | `src/components/library/cards/ProfileCard.tsx` |
| `ProductCard` | Image, price, discount badge, and cart CTA | primitive · Core | `src/components/library/cards/ProductCard.tsx` |
| `PricingCard` | Monthly/annual pricing tier with checklist | primitive · Core | `src/components/library/cards/PricingCard.tsx` |
| `MetricCard` | Large KPI metric number with delta percent | primitive · Core | `src/components/library/cards/MetricCard.tsx` |
| `ComparisonCard` | Side-by-side benchmark comparison card | primitive · Core | `src/components/library/cards/ComparisonCard.tsx` |
| `FeatureCard` | Icon, title, description, and link | primitive · Core | `src/components/library/cards/FeatureCard.tsx` |
| `BentoGrid` | Asymmetric modern grid container | primitive · Core | `src/components/library/cards/BentoGrid.tsx` |

### Category 10: Data Visualization — 21 components (1 showcase, 20 primitive)

| Name | Description | Tier | Source file |
|---|---|---|---|
| `JXCharts (Line, Bar, Pie & Sparkline)` | Interactive SVG Telemetry with Magnetic Crosshair | showcase · Core | `src/components/Category7EnterpriseX.tsx` |
| `KineticBarChart` | Animated SVG bars with hover tooltips | primitive · Core | `src/components/library/dataviz/KineticBarChart.tsx` |
| `AnimatedLineChart` | Smooth bezier curve with drawing entrance | primitive · Core | `src/components/library/dataviz/AnimatedLineChart.tsx` |
| `LiquidAreaChart` | Fluid gradient area beneath waveform | primitive · Lab | `src/components/library/dataviz/LiquidAreaChart.tsx` |
| `RadialChart` | Concentric comparison progress rings | primitive · Core | `src/components/library/dataviz/RadialChart.tsx` |
| `DonutChart` | Center-cut pie chart with legend | primitive · Core | `src/components/library/dataviz/DonutChart.tsx` |
| `InteractivePieChart` | Slices expanding on hover | primitive · Core | `src/components/library/dataviz/InteractivePieChart.tsx` |
| `RadarChart` | Multi-axis spider polygon diagram | primitive · Core | `src/components/library/dataviz/RadarChart.tsx` |
| `ScatterPlot` | 2D coordinate point clusters | primitive · Core | `src/components/library/dataviz/ScatterPlot.tsx` |
| `BubbleChart` | Sized circular bubbles by third metric | primitive · Core | `src/components/library/dataviz/BubbleChart.tsx` |
| `Heatmap` | Grid of color-intensity activity cells | primitive · Core | `src/components/library/dataviz/Heatmap.tsx` |
| `CalendarHeatmap` | GitHub-style 52-week activity contribution | primitive · Core | `src/components/library/dataviz/CalendarHeatmap.tsx` |
| `Treemap` | Hierarchical nested rectangular tiles | primitive · Core | `src/components/library/dataviz/Treemap.tsx` |
| `SankeyDiagram` | Flow path streams between stages | primitive · Core | `src/components/library/dataviz/SankeyDiagram.tsx` |
| `WaterfallChart` | Stepwise positive/negative variance bars | primitive · Core | `src/components/library/dataviz/WaterfallChart.tsx` |
| `FunnelChart` | Conversion funnel with percentage dropoffs | primitive · Core | `src/components/library/dataviz/FunnelChart.tsx` |
| `LiveTicker` | Real-time streaming metric ticker | primitive · Core | `src/components/library/dataviz/LiveTicker.tsx` |
| `NumberCounter` | Rolling odometer digit animator | primitive · Core | `src/components/library/dataviz/NumberCounter.tsx` |
| `Sparkline` | Micro inline sparkline graph | primitive · Core | `src/components/library/dataviz/Sparkline.tsx` |
| `InteractiveGauge` | Speedometer arc gauge with reading | primitive · Core | `src/components/library/dataviz/InteractiveGauge.tsx` |
| `DataComparisonChart` | Multi-series benchmark comparison bar | primitive · Core | `src/components/library/dataviz/DataComparisonChart.tsx` |

### Category 11: Tables & Data Grids — 18 components (3 showcase, 15 primitive)

| Name | Description | Tier | Source file |
|---|---|---|---|
| `JXTable` | Modern Interactive Data Surface with Bulk Action Bar | showcase · Core | `src/components/data-display/JXTable.tsx` |
| `JXDataGrid` | Next-Gen Enterprise Data Grid (Notion / Linear Hybrid) | showcase · Core | `src/components/Category7EnterpriseX.tsx` |
| `JXTreeView` | VS Code / Notion File & Hierarchy Explorer | showcase · Core | `src/components/Category7EnterpriseX.tsx` |
| `SmartDataTable` | Sortable, filterable table with column toggles | primitive · Core | `src/components/library/datagrids/SmartDataTable.tsx` |
| `VirtualizedTable` | 100k row virtual list container at 60 FPS | primitive · Core | `src/components/library/datagrids/VirtualizedTable.tsx` |
| `ExpandableTable` | Nested row accordion expansion | primitive · Core | `src/components/library/datagrids/ExpandableTable.tsx` |
| `EditableTable` | Inline cell click-to-edit | primitive · Core | `src/components/library/datagrids/EditableTable.tsx` |
| `TreeTable` | Hierarchical directory tree table | primitive · Core | `src/components/library/datagrids/TreeTable.tsx` |
| `PivotTable` | Group by and aggregate summary table | primitive · Core | `src/components/library/datagrids/PivotTable.tsx` |
| `KanbanTable` | Table rows viewable as kanban cards | primitive · Core | `src/components/library/datagrids/KanbanTable.tsx` |
| `InfiniteDataGrid` | Infinite scroll dynamic page loader | primitive · Core | `src/components/library/datagrids/InfiniteDataGrid.tsx` |
| `ColumnResizer` | Draggable vertical column border handle | primitive · Core | `src/components/library/datagrids/ColumnResizer.tsx` |
| `ColumnManager` | Checkbox popover to show/hide columns | primitive · Core | `src/components/library/datagrids/ColumnManager.tsx` |
| `FilterBuilder` | Multi-condition rule builder (AND/OR) | primitive · Core | `src/components/library/datagrids/FilterBuilder.tsx` |
| `AdvancedFilterPanel` | Slide-out drawer with faceted filters | primitive · Core | `src/components/library/datagrids/AdvancedFilterPanel.tsx` |
| `TableToolbar` | Top action strip (Search, Filter, Export) | primitive · Core | `src/components/library/datagrids/TableToolbar.tsx` |
| `RowSelectionToolbar` | Bulk action bar when rows are checked | primitive · Core | `src/components/library/datagrids/RowSelectionToolbar.tsx` |
| `DataExportPanel` | CSV, JSON, Excel exporter modal | primitive · Core | `src/components/library/datagrids/DataExportPanel.tsx` |

### Category 12: Drag & Drop — 15 components (0 showcase, 15 primitive)

| Name | Description | Tier | Source file |
|---|---|---|---|
| `KineticKanban` | Multi-column drag board with spring drop | primitive · Core | `src/components/library/dragdrop/KineticKanban.tsx` |
| `DragGrid` | 2D grid items reordering smoothly | primitive · Core | `src/components/library/dragdrop/DragGrid.tsx` |
| `SortableList` | Vertical list with drag handles and swap | primitive · Core | `src/components/library/dragdrop/SortableList.tsx` |
| `SortableGrid` | Grid with drag-and-drop tile sorting | primitive · Core | `src/components/library/dragdrop/SortableGrid.tsx` |
| `NestedDragList` | Tree list with parent/child drop levels | primitive · Core | `src/components/library/dragdrop/NestedDragList.tsx` |
| `DragTree` | Directory tree with file drag-and-drop | primitive · Core | `src/components/library/dragdrop/DragTree.tsx` |
| `MultiSelectDrag` | Dragging lasso selection of multiple items | primitive · Core | `src/components/library/dragdrop/MultiSelectDrag.tsx` |
| `DragDropUpload` | Drop target zone with upload animation | primitive · Core | `src/components/library/dragdrop/DragDropUpload.tsx` |
| `MagneticDropZone` | Target pulls items magnetically to center | primitive · Lab | `src/components/library/dragdrop/MagneticDropZone.tsx` |
| `FloatingDragPreview` | Ghost preview avatar following cursor | primitive · Core | `src/components/library/dragdrop/FloatingDragPreview.tsx` |
| `ResizableGridItem` | Grid item with drag resize borders | primitive · Core | `src/components/library/dragdrop/ResizableGridItem.tsx` |
| `SnapGrid` | Items snapping to 8px or 16px grid coordinates | primitive · Core | `src/components/library/dragdrop/SnapGrid.tsx` |
| `DragTimeline` | Timeline events scrubbable across dates | primitive · Core | `src/components/library/dragdrop/DragTimeline.tsx` |
| `DragCalendar` | Appointments draggable across time slots | primitive · Core | `src/components/library/dragdrop/DragCalendar.tsx` |
| `MultiContainerDrag` | Dragging cards across discrete containers | primitive · Core | `src/components/library/dragdrop/MultiContainerDrag.tsx` |

### Category 13: Layout & Workspace — 20 components (5 showcase, 15 primitive)

| Name | Description | Tier | Source file |
|---|---|---|---|
| `JXBox & JXContainer` | Token-Aware Layout Primitives | showcase · Core | `src/components/layout-utils/JXBox.tsx` |
| `JXGrid` | Asymmetric Bento & CSS Grid v2 System | showcase · Core | `src/components/layout-utils/JXGrid.tsx` |
| `JXStack` | Flex Stack with Smart Hairline Dividers | showcase · Core | `src/components/layout-utils/JXStack.tsx` |
| `JXMasonry` | Dynamic Reflow Masonry Layout | showcase · Core | `src/components/layout-utils/JXMasonry.tsx` |
| `JXTransitions, JXModal, JXPopper & JXTextareaAutosize` | Spring Physics Primitives & Auto-Growing Composer | showcase · Core | `src/components/layout-utils/JXTextareaAutosize.tsx` |
| `AdaptiveDashboard` | Responsive multi-widget layout | primitive · Core | `src/components/library/layout/AdaptiveDashboard.tsx` |
| `InfiniteCanvas` | Pan and zoom canvas (like Figma/Miro) | primitive · Core | `src/components/library/layout/InfiniteCanvas.tsx` |
| `SpatialWorkspace` | 3D stacked window layers | primitive · Core | `src/components/library/layout/SpatialWorkspace.tsx` |
| `WindowManager` | Desktop OS window controls (min/max/close) | primitive · Core | `src/components/library/layout/WindowManager.tsx` |
| `FloatingWindow` | Draggable window with title bar | primitive · Core | `src/components/library/layout/FloatingWindow.tsx` |
| `DockManager` | macOS-style pinned dock at screen edge | primitive · Core | `src/components/library/layout/DockManager.tsx` |
| `SplitPane` | Divider with drag resizing between panes | primitive · Core | `src/components/library/layout/SplitPane.tsx` |
| `ResizableLayout` | Multi-column adjustable workspace layout | primitive · Core | `src/components/library/layout/ResizableLayout.tsx` |
| `MosaicGrid` | Flexible tile layout like modern dashboards | primitive · Core | `src/components/library/layout/MosaicGrid.tsx` |
| `BentoLayout` | Modern asymmetric bento section organizer | primitive · Core | `src/components/library/layout/BentoLayout.tsx` |
| `ResponsiveGrid` | Breakpoint-aware dynamic grid | primitive · Core | `src/components/library/layout/ResponsiveGrid.tsx` |
| `MasonryLayout` | Pinterest-style waterfall columns | primitive · Core | `src/components/library/layout/MasonryLayout.tsx` |
| `AutoLayout` | Flexbox auto-distributing spacing helper | primitive · Core | `src/components/library/layout/AutoLayout.tsx` |
| `PanelGroup` | Collapsible grouped panels | primitive · Core | `src/components/library/layout/PanelGroup.tsx` |
| `WorkspaceSwitcher` | Multi-workspace tab selector | primitive · Core | `src/components/library/layout/WorkspaceSwitcher.tsx` |

### Category 14: Animation & Motion — 16 components (1 showcase, 15 primitive)

| Name | Description | Tier | Source file |
|---|---|---|---|
| `JXSpotlightDock` | Proximity-Magnified Floating Glass App Dock | showcase · Lab | `src/components/Category8SignatureBlocks.tsx` |
| `SpringTransition` | Wrapper animating enter/exit with spring | primitive · Core | `src/components/library/animation/SpringTransition.tsx` |
| `MorphTransition` | Shape shifting between circle and square | primitive · Core | `src/components/library/animation/MorphTransition.tsx` |
| `SharedElementTransition` | Shared element layoutId transition | primitive · Core | `src/components/library/animation/SharedElementTransition.tsx` |
| `PageTransition` | Full page slide and fade transition | primitive · Core | `src/components/library/animation/PageTransition.tsx` |
| `StaggeredReveal` | Children revealed with incremental delay | primitive · Core | `src/components/library/animation/StaggeredReveal.tsx` |
| `ScrollReveal` | Elements sliding in as viewport scrolls | primitive · Core | `src/components/library/animation/ScrollReveal.tsx` |
| `ParallaxContainer` | Multi-depth parallax scroll container | primitive · Core | `src/components/library/animation/ParallaxContainer.tsx` |
| `MagneticCursor` | Custom cursor attracted to nearby buttons | primitive · Lab | `src/components/library/animation/MagneticCursor.tsx` |
| `CursorFollower` | Smooth lagging trailing glow circle | primitive · Core | `src/components/library/animation/CursorFollower.tsx` |
| `AnimatedGradient` | Continuous shifting mesh gradient | primitive · Lab | `src/components/library/animation/AnimatedGradient.tsx` |
| `LiquidBlob` | Organic morphing SVG blob shape | primitive · Lab | `src/components/library/animation/LiquidBlob.tsx` |
| `ParticleField` | Floating ambient background particles | primitive · Lab | `src/components/library/animation/ParticleField.tsx` |
| `SpotlightEffect` | Cursor-tracking spotlight glow effect | primitive · Lab | `src/components/library/animation/SpotlightEffect.tsx` |
| `HoverDistortion` | Wave distortion on mouse hover | primitive · Core | `src/components/library/animation/HoverDistortion.tsx` |
| `MotionSequence` | Keyframed choreographed animation runner | primitive · Core | `src/components/library/animation/MotionSequence.tsx` |

### Category 15: AI Components — 16 components (1 showcase, 15 primitive)

| Name | Description | Tier | Source file |
|---|---|---|---|
| `JXSecurityVaultCard` | Passkey Biometric Challenge & Hardware Key Manager | showcase · Core | `src/components/Category8SignatureBlocks.tsx` |
| `AIChatPanel` | Conversational message history and input | primitive · Core | `src/components/library/ai/AIChatPanel.tsx` |
| `AIMessage` | Assistant message bubble with thought drawer | primitive · Core | `src/components/library/ai/AIMessage.tsx` |
| `AIComposer` | Input with attachment chips and model picker | primitive · Core | `src/components/library/ai/AIComposer.tsx` |
| `AIThinkingIndicator` | Step-by-step reasoning accordion | primitive · Core | `src/components/library/ai/AIThinkingIndicator.tsx` |
| `AIStreamingText` | Typewriter streaming markdown tokens | primitive · Core | `src/components/library/ai/AIStreamingText.tsx` |
| `AIToolCall` | Card showing tool function and arguments | primitive · Core | `src/components/library/ai/AIToolCall.tsx` |
| `AIToolTrace` | Detailed trace view with execution metrics | primitive · Core | `src/components/library/ai/AIToolTrace.tsx` |
| `AIApprovalCard` | Human-in-the-loop action approval card | primitive · Core | `src/components/library/ai/AIApprovalCard.tsx` |
| `AIReasoningTimeline` | Chronological timeline of thought nodes | primitive · Core | `src/components/library/ai/AIReasoningTimeline.tsx` |
| `AIResponseActions` | Thumbs up/down, retry, copy, branch | primitive · Core | `src/components/library/ai/AIResponseActions.tsx` |
| `AIContextPanel` | Token budget and active context documents | primitive · Core | `src/components/library/ai/AIContextPanel.tsx` |
| `AIModelSelector` | Dropdown to switch LLM models | primitive · Core | `src/components/library/ai/AIModelSelector.tsx` |
| `AIAttachmentPreview` | Image/file preview chip with remove CTA | primitive · Core | `src/components/library/ai/AIAttachmentPreview.tsx` |
| `AICitationCard` | Source link citation popup with excerpt | primitive · Core | `src/components/library/ai/AICitationCard.tsx` |
| `AIWorkflowBuilder` | Visual canvas connecting agent steps | primitive · Core | `src/components/library/ai/AIWorkflowBuilder.tsx` |

### Category 16: Editors & Creative Tools — 17 components (2 showcase, 15 primitive)

| Name | Description | Tier | Source file |
|---|---|---|---|
| `JXRichTextEditor & JXUploadDropzone` | Slash-Command (/) Block Editor & Multi-File Dropzone | showcase · Core | `src/components/Category7EnterpriseX.tsx` |
| `JXInteractiveColorStudio` | Live HSL/OKLCH Tonal Scale & WCAG Contrast Generator | showcase · Core | `src/components/Category8SignatureBlocks.tsx` |
| `RichTextEditor` | WYSIWYG toolbar and contentEditable field | primitive · Core | `src/components/library/editors/RichTextEditor.tsx` |
| `FloatingEditorToolbar` | Floating selection menu (Bold, Italic, Link) | primitive · Core | `src/components/library/editors/FloatingEditorToolbar.tsx` |
| `SlashCommandMenu` | Notion-like / trigger dropdown menu | primitive · Core | `src/components/library/editors/SlashCommandMenu.tsx` |
| `BlockEditor` | Draggable content block editor | primitive · Core | `src/components/library/editors/BlockEditor.tsx` |
| `MarkdownEditor` | Split preview markdown composer | primitive · Core | `src/components/library/editors/MarkdownEditor.tsx` |
| `CodeEditor` | Syntax-highlighted code editing box | primitive · Core | `src/components/library/editors/CodeEditor.tsx` |
| `DiffViewer` | Git-style side-by-side or inline diff (+/-) | primitive · Core | `src/components/library/editors/DiffViewer.tsx` |
| `JsonEditor` | Collapsible tree JSON viewer/editor | primitive · Core | `src/components/library/editors/JsonEditor.tsx` |
| `VisualThemeEditor` | Live color token studio preview | primitive · Core | `src/components/library/editors/VisualThemeEditor.tsx` |
| `GradientEditor` | Interactive color stops gradient creator | primitive · Lab | `src/components/library/editors/GradientEditor.tsx` |
| `LayerPanel` | Graphic design layer tree with eye toggles | primitive · Core | `src/components/library/editors/LayerPanel.tsx` |
| `ColorPaletteBuilder` | Harmonious OKLCH palette generator | primitive · Core | `src/components/library/editors/ColorPaletteBuilder.tsx` |
| `IconPicker` | Searchable grid of Lucide icons | primitive · Core | `src/components/library/editors/IconPicker.tsx` |
| `EmojiPicker` | Categorized emoji search popover | primitive · Core | `src/components/library/editors/EmojiPicker.tsx` |
| `DesignTokenEditor` | Live CSS variables / HSL editor with preview | primitive · Core | `src/components/library/editors/DesignTokenEditor.tsx` |

### Category 17: Time & Scheduling — 12 components (2 showcase, 10 primitive)

| Name | Description | Tier | Source file |
|---|---|---|---|
| `JXTimeline` | Interactive Activity & Audit Feed | showcase · Core | `src/components/layout-utils/JXTimeline.tsx` |
| `JXDatePicker, JXTimePicker & JXDateRangePicker` | Natural Language Parser + Quick Presets Calendar | showcase · Core | `src/components/Category7EnterpriseX.tsx` |
| `SmartCalendar` | Natural language date picker and month grid | primitive · Core | `src/components/library/time/SmartCalendar.tsx` |
| `RangeCalendar` | Double-calendar selection for start/end dates | primitive · Core | `src/components/library/time/RangeCalendar.tsx` |
| `Timeline` | Chronological event line with status markers | primitive · Core | `src/components/library/time/Timeline.tsx` |
| `GanttChart` | Project roadmap with dependency bars | primitive · Core | `src/components/library/time/GanttChart.tsx` |
| `Scheduler` | Day/week calendar time block organizer | primitive · Core | `src/components/library/time/Scheduler.tsx` |
| `TimePicker` | Hour and minute selector with timezone | primitive · Core | `src/components/library/time/TimePicker.tsx` |
| `DateRangePicker` | Popover field with preset quick ranges | primitive · Core | `src/components/library/time/DateRangePicker.tsx` |
| `AvailabilityGrid` | Weekly time slot matrix with drag selection | primitive · Core | `src/components/library/time/AvailabilityGrid.tsx` |
| `EventTimeline` | Activity feed with timestamps and user badges | primitive · Core | `src/components/library/time/EventTimeline.tsx` |
| `CountdownTimer` | Real-time decreasing days, hours, mins, secs | primitive · Core | `src/components/library/time/CountdownTimer.tsx` |

### Category 18: Advanced Utilities — 20 components (10 showcase, 10 primitive)

| Name | Description | Tier | Source file |
|---|---|---|---|
| `JXAvatar & JXAvatarGroup` | Presence & Interactive Stack | showcase · Core | `src/components/data-display/JXAvatar.tsx` |
| `JXBadge` | Contextual Pulse & Odometer Count Pill | showcase · Core | `src/components/data-display/JXBadge.tsx` |
| `JXChip` | Interactive Status & Filter Pill | showcase · Core | `src/components/data-display/JXChip.tsx` |
| `JXDivider` | Gradient & Action Divider | showcase · Core | `src/components/data-display/JXDivider.tsx` |
| `JXIcon & JXSvgIcon` | Duotone & Micro-Animated Icon Wrapper | showcase · Core | `src/components/data-display/JXIcon.tsx` |
| `JXList` | Inset Interactive List & Collapsible Tree | showcase · Core | `src/components/data-display/JXList.tsx` |
| `JXTooltip & JXHtmlTooltip` | Rich Interactive Preview Card | showcase · Core | `src/components/data-display/JXTooltip.tsx` |
| `JXTypography` | Fluid Semantic Type System | showcase · Core | `src/components/data-display/JXTypography.tsx` |
| `JXTrafficSplitter` | Dynamic Color-Coded Canary Deployment Bar & Rollout Orchestrator | showcase · Core | `src/components/Category8SignatureBlocks.tsx` |
| `JXAudioWaveformScrubber` | 48-Bar Frequency Waveform Player & Speed Pill | showcase · Core | `src/components/Category8SignatureBlocks.tsx` |
| `InfiniteScroll` | Intersection sentinel triggering next batch | primitive · Core | `src/components/library/utilities/InfiniteScroll.tsx` |
| `VirtualList` | Windowed list rendering only visible rows | primitive · Core | `src/components/library/utilities/VirtualList.tsx` |
| `ScrollProgress` | Top thin progress bar tracking page scroll | primitive · Core | `src/components/library/utilities/ScrollProgress.tsx` |
| `ScrollToTop` | Floating pill button appearing after scrolling | primitive · Core | `src/components/library/utilities/ScrollToTop.tsx` |
| `ImageLightbox` | Fullscreen zoomable image viewer with backdrop | primitive · Core | `src/components/library/utilities/ImageLightbox.tsx` |
| `ImageComparison` | Before/After slider dragging between 2 images | primitive · Core | `src/components/library/utilities/ImageComparison.tsx` |
| `VideoPlayer` | Custom styled media player with tactile controls | primitive · Core | `src/components/library/utilities/VideoPlayer.tsx` |
| `AudioVisualizer` | Real-time frequency equalizer canvas animation | primitive · Core | `src/components/library/utilities/AudioVisualizer.tsx` |
| `QRCodeGenerator` | Dynamic SVG QR code renderer with logo center | primitive · Core | `src/components/library/utilities/QRCodeGenerator.tsx` |
| `TourGuide` | Interactive step-by-step onboarding spotlight | primitive · Core | `src/components/library/utilities/TourGuide.tsx` |

## 6. Discrepancies, duplicates and aliases — read this before using the count as a file count

### 6.1 Primitives: clean 1:1 match

- All 300 primitives have a standalone file `src/components/library/<folder>/<Name>.tsx`, and all 300 `.tsx` files in `src/components/library/` (excluding `index.ts` files and the 18 `categoryNN*.tsx` demo wrappers) are in the registry. **No primitive is missing a file; no primitive file is unregistered.** Folder map: `buttons-actions→buttons`, `glass-surfaces→glassmorphism`, `navigation→navigation`, `inputs-forms→inputs`, `toggles-selection→toggles`, `modals-overlays→modals`, `feedback-notifications→feedback`, `loading-progress→loading`, `cards-content→cards`, `data-visualization→dataviz`, `tables-datagrids→datagrids`, `drag-drop→dragdrop`, `layout-workspace→layout`, `animation-motion→animation`, `ai-components→ai`, `editors-creative→editors`, `time-scheduling→time`, `advanced-utilities→utilities`. Per-folder file counts (excluding `index.ts`): ai 15, animation 15, buttons 20, cards 20, datagrids 15, dataviz 20, dragdrop 15, editors 15, feedback 15, glassmorphism 20, inputs 25, layout 15, loading 15, modals 20, navigation 20, time 10, toggles 15, utilities 10 = 300.
- No duplicate registry names: 361 unique `name` values, 361 unique `id` values in the unified catalog.
- No duplicate exported component names across the JX + library files (checked by `export const` name).

### 6.2 Showcases: 61 registry entries, 50 standalone files — the 11 differences

| # | Registry name | What it actually is on disk |
|---|---|---|
| 13 | `JXToggleButtonGroup` | Co-located export in `src/components/inputs/JXToggleButton.tsx` (with `JXToggleButton`). No own file. |
| 15 | `JXAvatar & JXAvatarGroup` | One entry for two components, both exported from `src/components/data-display/JXAvatar.tsx`. |
| 19 | `JXIcon & JXSvgIcon` | `JXSvgIcon` is an alias: `export const JXSvgIcon = JXIcon` in `src/components/data-display/JXIcon.tsx`. |
| 23 | `JXTooltip & JXHtmlTooltip` | `JXHtmlTooltip` is an alias of `JXTooltip` in `src/components/data-display/JXTooltip.tsx`. |
| 28 | `JXProgress (Linear & Circular)` | `JXLinearProgress` / `JXCircularProgress` are aliases of `JXProgress` in `src/components/feedback/JXProgress.tsx`. |
| 39 | `JXMenu & JXMenuItem` | Both exported from `src/components/navigation/JXMenu.tsx`. |
| 43 | `JXTabs & JXTab` | Both exported from `src/components/navigation/JXTabs.tsx`. |
| 45 | `JXBox & JXContainer` | Both exported from `src/components/layout-utils/JXBox.tsx`. |
| 50 | `JXTransitions, JXModal, JXPopper & JXTextareaAutosize` | Only `JXTransitions` and `JXTextareaAutosize` exist (both in `src/components/layout-utils/JXTextareaAutosize.tsx`, with `JXPortal`/`JXClickAwayListener`). **No `JXModal` or `JXPopper` export exists anywhere in `src/`.** |
| 51 | `JXDataGrid` | **Demo-only.** No exported component. Inline hand-built `<table>` demo in `src/components/Category7EnterpriseX.tsx`. That file also lists a phantom `src/components/JXDataGrid.tsx (14.6 KB)` in a file list — the file does not exist. (Library equivalents: `SmartDataTable`, `VirtualizedTable`, `EditableTable`, etc. in `library/datagrids/`.) |
| 52 | `JXDatePicker, JXTimePicker & JXDateRangePicker` | **Demo-only.** No exported component; inline natural-language date-parser demo in `Category7EnterpriseX.tsx`. (Library equivalents: `DateRangePicker`, `TimePicker`, `SmartCalendar` in `library/time/`.) |
| 53 | `JXCharts (Line, Bar, Pie & Sparkline)` | **Demo-only.** No exported component; inline demo charts in `Category7EnterpriseX.tsx`. (Library equivalents in `library/dataviz/`.) |
| 54 | `JXTreeView` | **Demo-only.** No exported component; inline demo tree in `Category7EnterpriseX.tsx`. (Library equivalent: `TreeTable` in `library/datagrids/`.) |
| 55 | `JXRichTextEditor & JXUploadDropzone` | **Demo-only.** No exported component; inline demo in `Category7EnterpriseX.tsx`. (Library equivalents: `RichTextEditor` in `library/editors/`, `DragDropUpload` in `library/dragdrop/`.) |
| 56 | `JXSpotlightDock` | Defined as `export const JXSpotlightDock = JXDock` in `src/components/Category8SignatureBlocks.tsx`. **Not in the public barrel** (`src/components/index.ts` does not export `Category8SignatureBlocks`). |
| 57 | `JXPricingMatrix` | Defined in `Category8SignatureBlocks.tsx` (alias `JXPricingBentoMatrix`). **Not in the public barrel.** |
| 58 | `JXTrafficSplitter` | Defined in `Category8SignatureBlocks.tsx` (alias `JXCommandDeployPipeline`). **Not in the public barrel.** |
| 59 | `JXAudioWaveformScrubber` | **Demo-only.** No exported component; only demo state/JSX in `Category8SignatureBlocks.tsx`. |
| 60 | `JXInteractiveColorStudio` | **Demo-only.** No exported component; only demo state/`customJsx` string in `Category8SignatureBlocks.tsx`. |
| 61 | `JXSecurityVaultCard` | **Demo-only.** No exported component; only demo state/JSX in `Category8SignatureBlocks.tsx`. |

Net effect: **361 registry entries = 350 standalone component files** (300 library primitives + 50 `JX*.tsx` files) **+ 3 components defined only inside `Category8SignatureBlocks.tsx` + 8 demo-only showcase entries with no importable component** (#51–#55, #59–#61) **+ composite/alias entries that share a file**. The 8 demo-only entries are real workbench demos, but they are **not importable from `@jacxishippingorg/jx-ui-react`** — a knowledgebase that lists them as installable components without that caveat would be wrong. Likewise `JXSpotlightDock`, `JXPricingMatrix` and `JXTrafficSplitter` exist as code but are not re-exported by the package barrel, so they are not importable via the published entry point either (they are reachable only by deep-importing the workbench file, which is not a supported path).

### 6.3 Extra exports that are NOT registry entries (do not add to the 361)

Co-located sub-components / helpers exported from JX files but not counted as registry components: `JXCardActions`, `JXCardContent`, `JXCardHeader`, `JXCardMedia` (in `JXCard.tsx`), `JXGridItem` (in `JXGrid.tsx`), `JXPortal`, `JXClickAwayListener` (in `JXTextareaAutosize.tsx`), plus the aliases already listed in §6.2. Workbench/tooling exports (not library components): the 8 `CategoryN*.tsx` demo sections, `AppHeader`/`AppSidebar`/`AppWorkbench`, `CommandFinderModal`, `ComponentDocumentation`, `DocumentationCenter`, `DesignTokenExporter`, `GitHubPage`, `InteractiveComponentPreview`, `JX290LibraryExplorer`, `KeyboardShortcutsModal`, `LivePlayground`, `ShowcaseCard`, `AccessibilityAriaSection`, and the theme/utils exports (`JXThemeProvider`, `useJXTheme`, `useLockGeometry`, `tactile`). These are exported from `src/components/index.ts` / `src/index.ts` alongside the components — do not count them as components.

### 6.4 Cross-checks that agree

- `Design.md` §5 reproduces the same 18-category / 361-component catalog in table form (name | tier | description); its per-category counts match the registry. `README.md` “Master Component Suite” table matches too.
- `src/data/catalog.ts` (61) + `src/data/catalog290.ts` (300) = `unifiedCatalog.ts` (361) by construction (`UNIFIED_COMPONENTS_351 = [...COMPONENT_CATALOG.map(…), ...COMPONENTS_290.map(…)]`); the showcase→18-category remap is the explicit `SHOWCASE_CATEGORY_MAP` (61 entries) in `unifiedCatalog.ts`. Category 12 (Drag & Drop) is the only category with 0 showcases — all 15 are primitives.

## 7. Variants / props — what the data actually defines

**Important caveat:** the registry does **not** define per-component props. `unifiedCatalog.ts:deriveMetadata()` generates the *same template* `doc.props` for every component: `variant` (`'solid' | 'glass' | 'subtle' | 'outline' | 'ghost'`, default `'solid'`), `size` (`'xs' | 'sm' | 'md' | 'lg' | 'xl'`, default `'md'`), `disabled` (boolean, default `false`), `className` (string), `version` (`'3.0' | '3.0.0'`, default `'3.0.0'`), plus conditional extras by `interactiveType` — `input` adds `value`/`onChange`/`placeholder`; `switch`/`button` adds `checked`/`onToggle`; `slider` adds `min`/`max`/`value`. The generated `doc.summary`, `accessibilityNotes`, `keyboardShortcuts`, `responsiveBehavior` and `bestPractices` are likewise templated from the name/category, not measured per component. Treat them as documentation scaffolding, not as a verified per-component API.

Real props live in each component file's `*Props` interface. Examples (spot-checked, not exhaustive):

- `MagneticButton` (`library/buttons/MagneticButton.tsx`): `MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>` — `children`, `strength?: number` (default 0.35), `variant?: 'solid' | 'soft' | 'outline' | 'glass'`, `tone?: 'primary' | 'success' | 'warning' | 'danger'`.
- `TiltCard` (`library/cards/TiltCard.tsx`): `TiltCardProps` — `title`, 3D tilt props (see file).
- `JXButton` (`components/inputs/JXButton.tsx`): `JXButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>` — see file for its variant/size tokens.
- Every unified entry also carries a `jsxSnippet` (a short import-and-render example, e.g. `<JXButton variant="glass">…</JXButton>`-style) — stored per component in `components.json` as `jsxSnippet`.

A follow-up pass that extracts the real `*Props` interface per file (361 files) would be needed for a true per-component props reference; it was out of scope for this registry inventory and is flagged here rather than faked from the template.

## 8. Design tokens / theming (summary)

Full token definitions: `src/index.css` (`@theme` + `:root` / `.dark`) and `src/context/JXThemeContext.tsx` (`ACCENT_PALETTES`, `RadiusScale`); prose spec: `Design.md` §2–§4, §6–§7.

| Token group | Values |
|---|---|
| Typography | Sans: `'Plus Jakarta Sans', system-ui, …`; Mono/tabular: `'JetBrains Mono', ui-monospace, …` (`--font-sans`, `--font-mono`); numeric content uses `font-mono tabular-nums` |
| Accents (5, via `useJXTheme()` / `JXThemeProvider`) | Indigo `#4f46e5` (default), Violet `#7c3aed`, Emerald `#059669`, Rose `#e11d48`, Ocean `#0284c7`; each sets `--jx-accent`, `--jx-accent-halo` (`<hex>33`), `--jx-accent-soft` (`<hex>1f`); persisted in `localStorage` (`jxui-theme-accent`) |
| Surfaces — light | Canvas `#F8FAFC`, elevated `#ffffff`, subtle `#F1F5F9` |
| Surfaces — dark | Canvas `#0B0F19`, elevated `#111827`, subtle `#1E293B` |
| Status colours (`@theme`) | Success `#10B981`, warning `#F59E0B`, danger `#EF4444`, info `#0EA5E9`; primary `#4f46e5`, secondary `#712ae2`, tertiary `#004d70` (+ container/fixed variants in `src/index.css`) |
| Radius | `getRadiusClass(tier)` / `RadiusScale`: sharp 0px, sm 8px (`--jx-radius-sm`), md 12px (default), lg 16px, xl 24px; persisted as `jxui-theme-radius`; `getRadiusClass('control' \| 'card' \| 'pill')` |
| Elevation | `.jx-elevation-1/2/3` (controls / floating cards / modals) with specular top highlight `inset 0 1px 0 0 rgba(255,255,255,0.8)` light / `0.06–0.10` dark; see `Design.md` §2.4 and `src/index.css` |
| Motion | Spring `cubic-bezier(0.22, 1, 0.36, 1)` (`--ease-spring`, `.jx-spring`); stiffness 400, damping 25; active press `active:scale-95` (buttons/badges) / `scale-[0.98]` (large cards); shimmer `.jx-shimmer-wave` (1.8s); shake `.jx-animate-shake` (0.38s); Web Audio micro-click 800→320 Hz / success triad C5/E5/G5; haptics `navigator.vibrate([10, 30, 20])` |
| Accessibility targets | WCAG 2.1 AA; touch targets ≥ 44×44px (`min-h-[44px] min-w-[44px] touch-manipulation`); visible focus rings via `--jx-accent-halo`; keyboard contracts (Arrow/Enter/Space/Escape/Tab); zero-shift geometry via `useLockGeometry` (CLS = 0 target) |
| Breakpoints | **Not defined as tokens in the data or CSS.** `Design.md` and `unifiedCatalog.ts` mention responsive behaviour only qualitatively (“breakpointNotes”, `mobile/tablet/desktop` booleans in `ResponsiveSupport`); layout uses Tailwind's default breakpoints (`sm`/`md`/`lg`/`xl` classes in components, e.g. `lg:grid-cols-2`) and no custom breakpoint scale was found in `src/index.css` or `JXThemeContext.tsx`. |
| Spacing | No spacing scale token is defined; spacing is Tailwind utility classes in components. |

## 9. How to use a component

```bash
npm install @jacxishippingorg/jx-ui-react motion lucide-react
# pnpm add @jacxishippingorg/jx-ui-react motion lucide-react
# yarn add @jacxishippingorg/jx-ui-react motion lucide-react
```

```tsx
import { JXThemeProvider, TiltCard, LiquidButton, SignaturePad } from '@jacxishippingorg/jx-ui-react';

export function App() {
  return (
    <JXThemeProvider defaultMode="dark" defaultAccent="indigo">
      <TiltCard title="Specular Depth">
        <p>True 3D perspective pitch and yaw tracking cursor coordinates.</p>
      </TiltCard>
      <LiquidButton onClick={() => console.log('Tactile Press')}>Liquid Viscosity</LiquidButton>
    </JXThemeProvider>
  );
}
```

(`README.md` “Basic Usage”; `JXThemeProvider` props `defaultMode` / `defaultAccent` as shown there. Per-component `jsxSnippet` values in `components.json` follow the same pattern: `import { <Name> } from '@jacxishippingorg/jx-ui-react';` then render `<Name variant="glass" size="md" />` — note that the snippet is generated from the template in `deriveMetadata()` and may not reflect the component's real required props; check the component file's `*Props` interface before copying it verbatim. Workbench: `npm run dev` → `http://localhost:3000`; `npm test` (logic tests), `npm run lint` (`tsc --noEmit`), `npm run build`, `npm run build:lib`.)

## 10. Files consulted

- `package.json` (v3.0.0, `@jacxishippingorg/jx-ui-react`), `metadata.json`, `README.md` (161 lines), `GEMINI.md` (11 lines — repo workflow rules, not component data), `Design.md` (660 lines, incl. §5 catalog tables), `Design/DESIGN.md` (not separately inventoried — `Design.md` is the canonical spec file at repo root).
- `src/data/catalog.ts` (1,072 lines; 61 showcases, 8 legacy categories, `classifyCoreTier` / `toDisplayName`), `src/data/catalog290.ts` (521 lines; 300 primitives, 18 categories), `src/data/unifiedCatalog.ts` (530 lines; 361 unified, `SHOWCASE_CATEGORY_MAP`, `deriveMetadata`, `UNIFIED_STATS`).
- `src/components/index.ts`, `src/index.ts`, `vite.lib.config.ts`, `src/index.css`, `src/context/JXThemeContext.tsx`, `src/components/library/*/index.ts`, `src/components/Category7EnterpriseX.tsx`, `src/components/Category8SignatureBlocks.tsx` (for the §6.2 findings).
- Method: imported the three data files with the repo's own `tsx` runner and counted lengths / cross-checked names against `find src/components -name '*.tsx'`; every `source_file` in `components.json` was checked to exist on disk. No live site visit was made (the Vercel URL in the original request was not opened — this inventory is from local source only, per the task).

## 11. Gaps / open questions for the knowledgebase

1. **Per-component props are not in the registry** — only the generated template (§7). A file-by-file `*Props` extraction is the main missing piece for a usable reference.
2. **8 demo-only showcases (#51–#55, #59–#61) and 3 barrel-excluded showcases (#56–#58)** — decide how the knowledgebase labels them (demo vs importable) so readers do not try to import them.
3. **No breakpoint or spacing tokens** exist in the source — do not invent a scale; record Tailwind defaults only if verified.
4. **Live-site check not done** — `https://jxui-react.vercel.app` was not opened in this pass; the deployed build may lag the fixed local copy (the fixed copy's `FIXES.md` / deployment history lives outside this inventory).
5. **Tests not re-run** — README claims 22/22 logic tests; the fixed-copy log claims 31/31 (per parent context). Neither was re-verified here.
