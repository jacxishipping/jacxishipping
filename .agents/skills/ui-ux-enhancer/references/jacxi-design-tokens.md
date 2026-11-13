# JACXI Design Tokens & Component Primitives Reference

## Core Light-Theme Palette (`src/app/globals.css`)

| Token | Value | Usage |
| :--- | :--- | :--- |
| `--background` | `#F9FAFB` | App & dashboard page background |
| `--panel` | `#FFFFFF` | Card, modal, drawer, and table surfaces |
| `--border` | `#E5E7EB` | Hairline 1px card and divider borders |
| `--text-primary` | `#1C1C1E` | Headings, primary values, strong labels |
| `--text-secondary` | `#5F6368` | Descriptions, metadata, secondary labels |
| `--accent-gold` | `#D4AF37` | Icons, borders, progress fills, solid button backgrounds |
| `--accent-gold-text` | `#8D7A1F` | Small gold text, links, and numeric badges on light surfaces (`4.54:1` AA) |
| `--accent-gold-rgb` | `212, 175, 55` | Tinted pill backgrounds (`rgba(var(--accent-gold-rgb), 0.12)`) and focus rings |

## Design System Primitives (`src/components/design-system/`)

- `Button.tsx` / `ActionButton.tsx` — Standard pill/rounded actions with consistent height & loading states
- `PageHeader.tsx` & `Breadcrumbs.tsx` — Consistent `h1` title, subtitle, breadcrumb trail, and right-aligned CTA slot
- `StatsCard.tsx` — KPI metric cards with icon badge, trend indicator, and compact/full value formatting
- `StatusBadge.tsx` — Semantic status pills (`On Hand`, `In Transit`, `Customs Hold`, `Paid`, `Overdue`)
- `Table.tsx` & `MobileCard.tsx` — Responsive data presentation (desktop table -> mobile card layout)
- `EmptyState.tsx`, `LoadingState.tsx`, `Skeleton.tsx`, `PageSkeletons.tsx` — Standard feedback states
- `Modal.tsx`, `Drawer.tsx`, `Toast.tsx`, `Tooltip.tsx` — Accessible overlays and notifications
