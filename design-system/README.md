# MarginOS Design System

**FIRPLAK · Strategic Pricing & Margin Intelligence**
Version 2 · Premium Enterprise refresh (Liquid Glass · Linear · Stripe inspired)

> A next-generation pricing, simulation, and executive analytics platform for FIRPLAK's commercial teams. MarginOS gives pricing managers and executives a unified cockpit for margin control, scenario simulation, price-list governance, and commercial visibility.

---

## What FIRPLAK does

FIRPLAK ("inspirando hogares" — *inspiring homes*) is a Colombian home-products manufacturer. MarginOS is the company's internal commercial operating system: it sits between SAP cost data, sales channels, and customer commercial agreements, replacing spreadsheet-driven pricing with a controlled, simulated, margin-aware workflow.

Primary surface: **MarginOS web app** — Next.js 16 + React 19 + Tailwind v4 + Supabase. Spanish UI (es-CO), executive role.

### Core modules
| Module | Path | What it does |
|---|---|---|
| Executive KPI Dashboard | `/` | Consolidated margin, pipeline, coverage & alerts |
| Business Simulator | `/simulator` | Scenario pricing with target margin enforcement |
| Scenarios | `/scenarios` | Saved simulation versions & lifecycle |
| Pricing Manager | `/pricing-manager` | Channel × Product price matrix |
| Price Lists | `/price-lists` | Tariff base by channel and currency |
| Products | `/products` | SAP product catalog (active/inactive) |
| Sales Channels | `/sales-channels` | Channel taxonomy & policies |
| Customers (CRM) | `/customers` | Commercial counterparties + simulation history |
| BOM Import | `/import` | Cost upload pipeline (Excel/SAP) |
| Real Costs | `/admin/costs` | Cost master administration |

### Vocabulary (carry into copy)
- **Simulación** — a priced quote / scenario (states: `DRAFT`, `VIGENTE`, `RECHAZADA`, `RENOVADA`, `VENCIDO`)
- **Margen Ponderado** — weighted contribution margin %
- **Contribución** — gross contribution, COP
- **TRM** — peso/USD conversion rate (per simulation)
- **BOM** — Bill of Materials (cost source)
- **Canal de Venta** — sales channel (Retail, Distribuidor, Constructora, etc.)
- **Cobertura Comercial** — pricing completeness (% of active products × channels priced)

---

## Sources consulted

- **Codebase:** `MarginOS/` (Next.js, mounted via File System Access API)
  - Tailwind theme: `MarginOS/tailwind.config.ts`
  - Global tokens: `MarginOS/src/app/globals.css`, `MarginOS/src/styles/tokens.css`
  - Shell: `MarginOS/src/components/{AppShell,Sidebar,Topbar}.tsx`
  - Existing guide: `MarginOS/designinspo/STYLY_GUIDE.md`, `designinspo/design.md`
  - Reference dashboard: `MarginOS/src/app/page.tsx`
- **Brand assets (uploaded):**
  - `LOGO FIRPLAK 2025.pdf`
  - `Logo-Firplak-Eslogan-Positivo-Esp.png` · navy wordmark + slogan
  - `Logo-Firplak-Eslogan-Negativo-Esp.png` · white wordmark
  - `firplak-mark-{navy,white}.png` · A-mark only

---

## What v2 (this system) changes

The v1 codebase is a clean Tailwind-on-Poppins MVP. The brief asks for an upgrade: **Apple Liquid Glass + Linear + Stripe / Mercury / Ramp** sensibility, dark-first executive cockpit, premium tables, squircle cards, frosted chrome.

**Kept:** brand navy (`#254153`), Lucide icon set, Spanish copy, module structure, business logic.
**Refined:** type system, color tokens, shadow + radius scale, glass surfaces, dark mode, table density, KPI rhythm.
**Added:** semantic margin colors, glass tokens, executive type scale (`.kpi`, `.kpi-lg`), Geist Mono for numerics.

### Font note (substitution)
- The codebase loads **Poppins**. v2 ships **Inter** + **Geist Mono** as the new house pair (Inter for UI density; Geist Mono for tabular numerics — critical for a pricing app).
- **Why:** Poppins is geometric and very rounded; it reads marketing-y at the small sizes a B2B dashboard lives at, and its numbers are not true tabular. Inter has industry-standard tabular figures, opentype stylistic sets (alternate `1`, slashed `0`, single-storey `a`) that match Linear/Vercel/Stripe, and far better dense-table legibility.
- Both are loaded via Google Fonts. **No font files need to be supplied** — but if FIRPLAK requires Poppins on the brand for compliance reasons, flag it and we'll swap `--font-sans` back.

---

## Content fundamentals

**Language:** Spanish (Colombia). All UI strings, button labels, table headers in Spanish. Mixed-language acceptable for technical terms (BOM, KPI, Dashboard) when no clean Spanish equivalent exists.

**Tone:** *executive, calm, precise.* MarginOS is used by pricing managers and C-level to make money decisions. It is not playful, not chatty, not "fun." It is a Bloomberg terminal that an executive trusts.

- **Voice**: third-person institutional ("Visibilidad consolidada de la operación comercial"), not "you/your"
- **No emoji.** Ever. (Codebase is emoji-free; we keep it that way.)
- **No exclamation marks** in UI. Errors and successes use period-terminated sentences.
- **Casing:** Title Case for page titles ("Executive Dashboard", "Pricing Manager"). Sentence case for body. ALL CAPS reserved for `.overline` labels and status pills (`VIGENTE`, `RECHAZADA`).
- **Numerals:** Always tabular, always `es-CO` locale. Currency `$1.234.567` (COP) or `USD 12,345.67`. Percentages with one decimal (`64.3%`).
- **CTAs are verbs**, short: "Simular", "Guardar", "Aprobar", "Exportar". Never "Click here", never "Submit".
- **Empty states** are factual: "No hay datos suficientes." — never apologetic, never illustrated with cute drawings.

### Microcopy examples (from the codebase, keep this voice)
> "Visibilidad consolidada de la operación comercial y rentabilidad."
> "Simulaciones activas por debajo del margen objetivo del negocio."
> "Última Carga Costos BOM"
> "Productos activos en SAP sin base tarifaria configurada."

---

## Visual foundations

### Color
- **Brand navy `#254153`** is the institutional anchor — used for the primary button, active nav, KPI emphasis. Never on huge fills (no navy hero banners); used as ink, accent border, brand mark.
- **Accent blue `#749094`** is the *action* color: links, hover transitions on the primary button, focus rings (softened to ~45% alpha).
- **Neutrals are warm-cool slate**, not pure gray. A pricing app reads dozens of numbers per row — we use slate (cool, technical) over warm beige to feel financial.
- **Semantic margin colors** are a first-class concept: green when margin ≥ 60%, amber 40–60%, red < 40%. Pulled into `--margin-strong/ok/weak` tokens for re-use.
- **Light theme** is the production default. **Dark theme** is graphite-on-obsidian (Linear/Arc school), not navy — switching to dark navy reads naive. Brand identity is carried by the logo and accent, not the canvas.

### Type
- **Inter** for UI body and display. `feature-settings: cv11 ss01 ss03 cv02` (single-storey `a`, slashed zero, alternate `1`) — matches Linear/Vercel.
- **Geist Mono** for any numeric column, KPI value, code, SAP code, simulation number.
- Display weights: `600` for headings, `700` for KPIs. Body `400`. **No 300 weight in production** — it disintegrates on Windows ClearType.
- Tracking is tight (`-0.024em` on h2/h3) for executive density.

### Backgrounds
- **No photography.** The product is data; photo backgrounds dilute it.
- **No illustrations.** Empty states are typographic + a single Lucide glyph.
- **No gradients on canvas** — the canvas stays flat (`--bg-base`). Subtle radial gradients allowed *only* on login chrome and the dashboard hero header.
- **One exception:** decorative blurred brand-tinted "auras" behind the login card (already in the codebase). Keep them, soften them.

### Animation
- `ease-out` cubic-bezier(0.22, 1, 0.36, 1) is the house curve. Used on hover, modal entrance, sidebar collapse.
- `ease-spring` reserved for KPI count-ups and pill insertions; never on layout shifts.
- **No bouncy modal entrances.** Modal scale from 0.97 → 1, opacity 0 → 1, 200ms.
- **No infinite ambient animations.** Loading spinners are 800ms linear rotations, single instance, never decorative.
- Sidebar collapse: 200ms ease-out on `width` + `min-width` only. The text fade is `opacity` only, not transform.

### Hover & press
- **Hover** lifts via `box-shadow` step (sm → md), and may shift `-translate-y-0.5` (≤ 2px) on cards. Never larger.
- **Hover never changes hue** on neutral surfaces — it's a luminance step (`--bg-hover` lighter, dark theme also slightly lighter).
- **Press**: 95% scale or `--bg-active`. We don't darken/lighten by more than ~6% — keeps it Apple-precise.
- **Active nav item**: 8% tinted bg of brand (`bg-brand-primary/[0.08]`) + brand-colored icon. Never a thick left bar.

### Borders & shadows
- **Borders** are alpha (`rgba(15, 22, 36, 0.10)`), never solid hex on neutral surfaces. This survives both themes.
- **Shadows** are layered (ambient + key), short blur, low spread. We never have a shadow larger than `--shadow-xl`. Dark mode shadows are `0 0 0 1px rgba(white,0.03)` outlines + heavy bottom drop — elevation by *contour*, not blur.
- **Inset highlight** (`--shadow-inset`) is applied to glass surfaces to give them a 1px top highlight (the Liquid Glass detail).

### Transparency & blur
- **Glass is rationed.** Used on: top nav, modal scrim+sheet, command-K palette, popovers > 200px, the side-rail filter shelf. **Not** on every card — only on chrome that overlays content.
- Standard blur: `20px` + `saturate(180%)`. Strong: `32px` + saturate, for modal sheets.

### Corner radii (squircle scale)
| Token | Use |
|---|---|
| `--radius-xs` 6px  | inline pills, table cell chips |
| `--radius-sm` 10px | inputs, small buttons |
| `--radius-md` 14px | buttons, segmented controls |
| `--radius-lg` 18px | cards (default) |
| `--radius-xl` 22px | modals, hero cards |
| `--radius-2xl` 28px | login card, KPI hero |
| `--radius-pill`    | status badges, user chip |

Cards are **squircle**, never `border-radius: 9999px` on rectangles. Buttons are pill (`999px`) by default — matches existing Stripe/Mercury direction.

### Cards anatomy
A canonical MarginOS card is:
- `background: var(--bg-elevated)` + `border: 1px solid var(--border-default)` + `box-shadow: var(--shadow-sm)`
- `border-radius: var(--radius-lg)` (18px)
- Padding `var(--space-6)` (24px) for body, header gets `var(--space-5)` + bottom divider
- Hover: shadow → `--shadow-md`, no border color change.

### Layout rules
- Sticky topbar (`64px`), sticky sidebar (`240px` open, `64px` collapsed).
- Main content max-width `1600px`, auto-centered, fluid padding `px-4 sm:px-6 md:px-8 xl:px-10 2xl:px-14`.
- **Filter bars** are sticky inside their section, with a tinted glass background — `--glass-tint` + blur — so the underlying canvas is faintly visible.
- Tables span full container width. Numeric columns are `text-align: right` and `font-variant-numeric: tabular-nums`. Always.

### Iconography
See [ICONOGRAPHY](#iconography) below.

---

## Iconography

- **Lucide React** (`lucide-react@^0.564`). Single source of truth. Stroke width consistently `1.5` (cards/hero), `2` (default UI), `1.75` (sidebar nav).
- Sized in `px` not `em`: `h-4 w-4` (16px) for inline, `h-[18px] w-[18px]` for nav, `h-5 w-5` (20px) for headers, `h-6 w-6` (24px) for hero icon tiles.
- Color: icons inherit `--fg-muted` by default; active or hovered states promote to `--fg-primary` or `--brand-accent`.
- **No emoji.** **No Unicode pictographs.** The only Unicode "symbol" used is `→` (right arrow) in microcopy like "Gestionar Listas de Precios →".
- **No SVG illustrations.** When a screen needs an empty-state visual, use a single 32px Lucide glyph centered above the message.
- **Loading**: `Loader2` from Lucide with `animate-spin`, **not** custom spinners.

For external use, Lucide is available via CDN:
`<script src="https://unpkg.com/lucide@latest"></script>` then `lucide.createIcons()`.

---

## Index — what's in this folder

```
.
├── README.md                    ← you are here
├── SKILL.md                     ← Claude / Agent-skill entrypoint
├── colors_and_type.css          ← all design tokens (light + dark)
├── assets/                      ← logos and brand marks
│   ├── firplak-wordmark-navy.png
│   ├── firplak-wordmark-white.png
│   ├── firplak-mark-navy.png
│   ├── firplak-mark-white.png
│   └── firplak-logo-original.png
├── preview/                     ← Design System tab cards
│   ├── colors-*.html            ←   palette swatches
│   ├── type-*.html              ←   typography specimens
│   ├── spacing-*.html           ←   spacing/radius/shadow tokens
│   ├── components-*.html        ←   buttons / inputs / badges / cards
│   └── brand-*.html             ←   logo lockups
└── ui_kits/
    └── marginos/                ← MarginOS web app UI kit
        ├── README.md
        ├── index.html           ← interactive demo (Executive Dashboard view)
        ├── tokens.css           ← consumes ../../colors_and_type.css
        └── components/          ← JSX components
            ├── Sidebar.jsx
            ├── Topbar.jsx
            ├── KpiCard.jsx
            ├── DataTable.jsx
            ├── Button.jsx
            ├── Badge.jsx
            ├── Card.jsx
            ├── FilterBar.jsx
            ├── ChartCard.jsx
            └── AlertPanel.jsx
```

---

## Quick start (for a designer or agent picking this up)

1. Import the tokens: `<link rel="stylesheet" href="colors_and_type.css">`
2. Wrap your root with `class="dark"` or `data-theme="dark"` to flip themes.
3. Use semantic element styles (`<h1>`, `<p>`, `.kpi`, `.overline`, `.mono`) — no need for utility classes for type.
4. For surfaces use `.surface-card` or `.surface-glass`.
5. For components, lift JSX from `ui_kits/marginos/components/` and re-use.
6. Spanish copy. Tabular numerics. Lucide icons. No emoji.
