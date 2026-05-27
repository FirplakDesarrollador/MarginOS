# MarginOS · UI Kit

High-fidelity recreation of the MarginOS web app — interactive click-thru built directly off the Next.js codebase in `MarginOS/`. This kit is the **visual reference** for the v2 refresh: every component reads from the design tokens in `../../colors_and_type.css`.

## Open
- `index.html` — the demo app. Sidebar nav cycles through the core modules (Dashboard, Simulator, Customers, Pricing Manager). Top-right toggle flips light/dark.

## Files

```
.
├── README.md
├── index.html              ← entrypoint
├── tokens.css              ← imports ../../colors_and_type.css + shell styles
├── app.jsx                 ← React root, theme, route state
└── components/
    ├── Icons.jsx           ← inlined Lucide subset (stroke 1.75, no CDN)
    ├── Primitives.jsx      ← Button, Badge, Card, Field, Input, Segmented
    ├── Sidebar.jsx         ← collapsible nav with brand mark
    ├── Topbar.jsx          ← sticky glass header, theme switcher, ⌘K search
    ├── DataTable.jsx       ← enterprise table, tabular numerics, density-aware
    ├── Charts.jsx          ← hand-rolled SVG line / donut / horizontal-bar
    ├── Dashboard.jsx       ← KpiCard, FilterBar, ChartCard, CoverageCard, AlertPanel
    └── Pages.jsx           ← ExecutiveDashboard, Simulator, CustomersPage, PricingManager
```

## What's covered

| Screen | Status |
|---|---|
| Executive Dashboard | Full layout — KPIs, line chart (monthly revenue), donut (pipeline), horizontal bars (margin by channel), alerts panel, coverage card, BOM freshness, top customers table. |
| Simulator | Header strip (customer, project, currency, TRM, target margin), product lines table with margin coloring, scenario totals. |
| Customers | List with filters, NIT + channel badges, status pills. |
| Pricing Manager | Product × channel matrix with `NO APLICA` / `PENDIENTE` cells. |
| Scenarios / Products / Price Lists / Channels / Import / Costs | Placeholder screens — not in scope for this pass. |

## What's intentionally lossy

This is a **cosmetic recreation**, not production code:
- No Supabase — sample data is inlined in `Pages.jsx`.
- No persistence — clicking nav just swaps the in-memory route.
- No real form validation — inputs are dressed up but don't submit.
- Charts are bespoke SVG (not Recharts) for zero runtime dependency.
- Icons are inlined SVG (`Icons.jsx`) — Lucide-shaped, but no `lucide-react` runtime.

## How to extend

1. **Add a screen:** add a function to `Pages.jsx`, then route it from `app.jsx` and `Sidebar.jsx`.
2. **New component:** add to `components/`, export to `window` at the bottom, and reference it in `index.html` script order.
3. **Brand palette:** all colors come from CSS variables in `colors_and_type.css`. Never hardcode brand hex in components.

## House rules (carry into production)

- **Spanish copy, es-CO locale, tabular numerics.**
- **Squircle radii** — never `9999px` on rectangles (only on pills/badges).
- **Glass is for chrome only** — topbar, modals, popovers. Cards stay solid.
- **Lucide icons only**, stroke `1.75` in this kit (1.5 in marketing surfaces).
- **No emoji, no Unicode pictographs.**
