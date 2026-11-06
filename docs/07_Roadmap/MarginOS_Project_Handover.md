# MarginOS — Project Handover

> **Generated:** 2026-07-26 · Read-only analysis, no application code modified.
> **Scope:** This document describes only what is present in the repository. Anything that
> could not be confirmed from the code is explicitly labeled **[UNCONFIRMED]**.
> Sections distinguish **Implemented** (in code today), **Pending** (not done), and
> **Recommendation** (proposal, not done).

---

## 1. Executive Summary

MarginOS is a commercial pricing / margin-simulation web application for FIRPLAK. It lets
users import Bills of Materials (BOM) from SAP, maintain real component costs, manage sales
channels and price lists, simulate negotiations (with margin, contribution, discount, USD/TRM
and commission handling), configure per-channel target pricing, and view an executive KPI
dashboard.

- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth).
- **Data access:** All pages are client components (`"use client"`) that query Supabase directly through the browser client. No custom REST/API route layer was found besides the login server action and the session-refresh proxy.
- **Build status:** `npm run build` **passes** — 16 routes, all statically prerendered (verified in this analysis).
- **Tests:** **No project-level test files exist.** `package.json` only defines `lint: eslint` (no `test` script). Protected financial formulas therefore have **zero automated coverage**.
- **Branch:** `luis` (up to date with `origin/luis`).
- **Last commit:** `6b6dc59`.
- **Working tree:** clean except the untracked local `.claude/` directory (tooling config, not part of the app).

**Version note / inconsistency:** `package.json` declares `"version": "1.1.2"`, while the sidebar UI hard-codes `MarginOS v2.0` ([src/components/Sidebar.tsx](../../src/components/Sidebar.tsx), brand block). These two version strings do not agree — see §16.

---

## 2. Current Architecture

**Implemented**

- **Framework:** Next.js `16.1.6` with the App Router; Turbopack build ([package.json](../../package.json)).
- **Runtime libs:** React `19.2.3`, `@supabase/ssr ^0.10.2`, `@supabase/supabase-js ^2.103.3`, `xlsx ^0.18.5`, `exceljs` (used by the Excel export), Tailwind `^4.1.18`, TypeScript `^5.9.3`.
- **Rendering model:** Every page under `src/app/**` is a client component and fetches data on the client via the Supabase browser client. The build output marks all routes as `○ (Static)` prerenders with a `ƒ Proxy (Middleware)`.
- **Auth / session:**
  - Login UI at [src/app/login/page.tsx](../../src/app/login/page.tsx) with a server action [src/app/login/actions.ts](../../src/app/login/actions.ts).
  - Session refresh via [src/proxy.ts](../../src/proxy.ts) → `updateSession` in [src/lib/supabase/middleware.ts](../../src/lib/supabase/middleware.ts).
  - User display names are read from the `Usuarios_MarginOS` table ([src/components/Topbar.tsx](../../src/components/Topbar.tsx)).
- **Supabase clients:**
  - Browser: [src/lib/supabase/client.ts](../../src/lib/supabase/client.ts) (`createBrowserClient`) — used by **all** feature pages.
  - Server: [src/lib/supabase/server.ts](../../src/lib/supabase/server.ts).
  - Middleware: [src/lib/supabase/middleware.ts](../../src/lib/supabase/middleware.ts).
  - **Legacy / dead:** [src/lib/supabase.ts](../../src/lib/supabase.ts) (`createClient` from `@supabase/supabase-js`) is **not imported anywhere** in `src` (confirmed via grep). See §15.
- **Global providers** ([src/app/layout.tsx](../../src/app/layout.tsx)): `ThemeProvider` → `TableDensityProvider` → `NavigationBlockerProvider`.

**[UNCONFIRMED]**
- Whether Supabase Row-Level Security (RLS) is enabled and which policies apply — the code uses the anon key and assumes RLS-filtered results, but RLS cannot be verified from this repo.
- Environment variables are referenced as `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`; their runtime values are not in the repo.

---

## 3. Full `src` Project Structure

```
src/
├── app/
│   ├── admin/costs/page.tsx        # "Costos Reales" — real component costs + Recalcular Costos BOM
│   ├── customers/page.tsx          # Clientes
│   ├── globals.css                 # imports tailwind + tokens.css + design-system.css
│   ├── import/page.tsx             # Importar BOM (SAP) — upload + parse + save + history
│   ├── layout.tsx                  # Root layout + providers + fonts
│   ├── login/
│   │   ├── actions.ts              # Login server action
│   │   └── page.tsx                # Login screen
│   ├── page.module.css
│   ├── page.tsx                    # Executive KPI Dashboard ("/")
│   ├── price-lists/page.tsx        # Listas de Precios
│   ├── pricing-manager/page.tsx    # Pricing Manager (per-channel target pricing)
│   ├── products/page.tsx           # Productos (SAP master)
│   ├── sales-channels/page.tsx     # Canales de Venta
│   ├── scenarios/page.tsx          # Escenarios (saved simulations)
│   └── simulator/page.tsx          # Simular Negocio (core simulation engine)
├── components/
│   ├── AppShell.tsx                # Shell wrapper (sidebar + topbar)
│   ├── CostModal.tsx / CostUploadModal.tsx
│   ├── CustomerCreateModal.tsx / CustomerSelectModal.tsx
│   ├── GlobalSearchModal.tsx
│   ├── PriceListModal.tsx / PriceListUploadModal.tsx
│   ├── ProductModal.tsx / ProductPickerModal.tsx / ProductUploadModal.tsx
│   ├── RecalculateImpactModal.tsx  # Impact preview for BOM cost recalculation
│   ├── SalesChannelModal.tsx / SalesChannelUploadModal.tsx
│   ├── Sidebar.tsx / Topbar.tsx
│   ├── VersionModal.tsx            # Create new simulation version (CLONE / COST_UPDATE)
│   ├── dashboard-ui.tsx / home-ui.tsx
│   └── ui/ (Button.tsx, Card.tsx, Input.tsx, Toast.tsx)
├── contexts/
│   ├── NavigationBlockerContext.tsx  # Unsaved-changes guard dialog
│   ├── SidebarContext.tsx
│   ├── TableDensityContext.tsx       # compact | normal | comodo
│   └── ThemeContext.tsx              # light | dark | system
├── lib/
│   ├── bom/pzRule.ts               # Shared PZ / MAQUILA exclusion rule
│   ├── excelExport.ts              # exceljs simulation export
│   ├── supabase.ts                 # LEGACY, unused (dead code)
│   └── supabase/{client,server,middleware}.ts
├── proxy.ts                        # Next middleware → Supabase session refresh
├── styles/
│   ├── design-system.css           # component classes, form primitives, surfaces, modals
│   └── tokens.css                  # design tokens (colors, type scale, spacing, dark mode)
└── types/index.ts                  # Shared TS types (see §12 — appears partly stale)
```

---

## 4. Main Modules and Their Current Status

| Module | Route / File | Status | Notes |
|---|---|---|---|
| Executive KPI Dashboard | `/` · [page.tsx](../../src/app/page.tsx) | Implemented; builds | Aggregates simulations/lines into KPIs & charts |
| Simular Negocio (Simulator) | `/simulator` · [page.tsx](../../src/app/simulator/page.tsx) | Implemented; builds | Core margin/contribution/TRM/commission engine |
| Escenarios | `/scenarios` · [page.tsx](../../src/app/scenarios/page.tsx) | Implemented; builds | Lists saved simulations; error logging fixed in `6b6dc59` |
| Clientes | `/customers` · [page.tsx](../../src/app/customers/page.tsx) | Implemented; builds | Filter bar reworked (single-row layout) |
| Importar BOM (SAP) | `/import` · [page.tsx](../../src/app/import/page.tsx) | Implemented; builds | Excel parse, MP cost calc, dedup save, history |
| Costos Reales | `/admin/costs` · [page.tsx](../../src/app/admin/costs/page.tsx) | Implemented; builds | Real component costs + "Recalcular Costos BOM" |
| Productos | `/products` · [page.tsx](../../src/app/products/page.tsx) | Implemented; builds | SAP master |
| Pricing Manager | `/pricing-manager` · [page.tsx](../../src/app/pricing-manager/page.tsx) | Implemented; builds | Per-channel target pricing + No Aplica |
| Listas de Precios | `/price-lists` · [page.tsx](../../src/app/price-lists/page.tsx) | Implemented; builds | Price list management |
| Canales de Venta | `/sales-channels` · [page.tsx](../../src/app/sales-channels/page.tsx) | Implemented; builds | Channel master |
| Login | `/login` · [page.tsx](../../src/app/login/page.tsx) | Implemented; builds | Supabase auth |

> **"Builds" = compiles and statically prerenders.** Runtime/functional correctness against a live
> Supabase instance was **not** exercised in this analysis (no DB connection). **[UNCONFIRMED]** at runtime.

---

## 5. Actual Business Rules Found in the Code

All rules below are quoted/derived from the referenced source. Formula variable names are kept
as in the code (Spanish).

### Summary of protected rules and where they live

| Rule | Source of truth | Also referenced in |
|---|---|---|
| PZ / MAQUILA exclusion | [src/lib/bom/pzRule.ts](../../src/lib/bom/pzRule.ts) (shared) | import, admin/costs |
| BOM MP cost summation | [import/page.tsx](../../src/app/import/page.tsx) | **duplicated** in [admin/costs/page.tsx](../../src/app/admin/costs/page.tsx) |
| Margin / contribution | [simulator/page.tsx](../../src/app/simulator/page.tsx) `calcularLinea` | dashboard reads stored values |
| USD / TRM conversion | simulator + pricing-manager | dashboard normalizes lines |
| Commission gross-up | [simulator/page.tsx](../../src/app/simulator/page.tsx) | — |
| No Aplica | [pricing-manager/page.tsx](../../src/app/pricing-manager/page.tsx) | — |
| Target pricing (net/list) | [pricing-manager/page.tsx](../../src/app/pricing-manager/page.tsx) `calculateRowPrices` | — |
| KPI aggregation | [page.tsx](../../src/app/page.tsx) | — |

---

## 6. BOM Costing Logic (incl. PZ and MAQUILA rule)

### 6.1 PZ / MAQUILA exclusion rule — [src/lib/bom/pzRule.ts](../../src/lib/bom/pzRule.ts)

**Implemented.** Single shared module (added in commit `769ad51`):

- `isPzExcludedFromCost(codigo, descripcion)`:
  1. If `codigo` does **not** start with `PZ` → **never excluded** by this rule.
  2. If it starts with `PZ` → **excluded by default**.
  3. **Exception:** starts with `PZ` **AND** description contains `MAQUILA`
     (case-insensitive **and** accent-insensitive via `normalize("NFD")` + diacritic strip) → **included**.
- `descriptionHasMaquila(descripcion)` implements the accent/case-insensitive match.

Business rationale (from the file header): PZ codes are usually production/service/cost concepts
(e.g. `PZCO01-0002-000-0000 "CIF POR MINUTO"`) and must not count as raw material; the exception
covers SPA/Hidromasajes outsourced maquila parts (e.g. `PZCO01-0020-000-0000 "MAQUILA ESCALERA…"`).

**Applied in:**
- [import/page.tsx](../../src/app/import/page.tsx): (a) the real-cost lookup filter, and (b) the MP cost summation loop (`if (isPzExcludedFromCost(codigo, desc)) { pzExcluded += 1; continue; }`).
- [admin/costs/page.tsx](../../src/app/admin/costs/page.tsx): the "Recalcular Costos BOM" loop.

### 6.2 MP cost summation

**Implemented.** Formula (per included component), from [import/page.tsx](../../src/app/import/page.tsx):

```
effectiveCost   = real cost from component_costs (if present) else costo_excel_fallback
costoMpComponente = cantidad × effectiveCost
Costo_Mp (product) = Σ costoMpComponente   over non-excluded components
```

The importer walks BOM rows (level-based `parentStack`), stores **all** components (including PZ) in
`bom_components`, but only **sums** non-excluded ones into `recalculated_cost_mp`. Level-1 rows are
treated as products; deeper rows are components.

The recalc path ([admin/costs/page.tsx](../../src/app/admin/costs/page.tsx)) recomputes the same
`Σ(cantidad × effectiveCost)` from stored `bom_components`, applying real costs from `component_costs`.

**Known limitation (see §15/§16):** `bom_components` has **no description column** (the insert writes only
`codigo, cantidad, costo_excel_fallback, nivel, parent_codigo`). During recalculation the description
needed for the MAQUILA test is resolved from `component_costs` (`descMap`). A MAQUILA part **not** present
in `component_costs` cannot be identified at recalc time and would fall back to the default *exclude*,
diverging from the import-time cost. This is documented in-code as a comment in `admin/costs/page.tsx`.

---

## 7. Margin and Contribution Formulas

**Implemented** — [simulator/page.tsx](../../src/app/simulator/page.tsx), `calcularLinea` (per line):

```
ingresoBrutoBase   = precioDisplay × cantidad
ingresoNetoBase    = ingresoBrutoBase × (1 − descuento/100)

isCommission       = simulationType === "COMMISSION" && commissionPct > 0
ingresoNetoDisplay = isCommission ? ingresoNetoBase / (1 − commissionPct/100) : ingresoNetoBase

ingresoNetoCop     = isUSD ? ingresoNetoDisplay × trm : ingresoNetoDisplay
commissionValueCop = isCommission ? ingresoNetoCop × (commissionPct/100) : 0
realRevenueCop     = ingresoNetoCop − commissionValueCop

costoTotalCop      = Costo_Mp × cantidad
contribucionCop    = realRevenueCop − costoTotalCop
margen             = realRevenueCop > 0 ? (contribucionCop / realRevenueCop) × 100 : 0
```

**Totals** (`resumen` useMemo): line values summed; overall
`margenTotal = realRevenueTotalCop > 0 ? (contribucionTotalCop / realRevenueTotalCop) × 100 : 0`.

Key business decision encoded here: **margin and contribution are computed on _real revenue_
(after commission is stripped out)**, not on the inflated customer-facing price. Default target
margin `margenObjetivo = 65` ([simulator/page.tsx](../../src/app/simulator/page.tsx)).

**KPI dashboard** ([page.tsx](../../src/app/page.tsx), `execKPIs`) recomputes a **weighted margin** from
stored line values: `weightedMargin = totalContributionCOP / netValueCOP × 100`, where
`netValueCOP = Σ (line.net_price × line.qty)` (USD lines × sim TRM) and `contribution_value` is read as
already-COP.

---

## 8. Currency and TRM Conversion Logic

**Implemented.**

- **Simulator:** `trm` is entered per simulation. USD → COP is a **multiply** (`ingresoNetoCop = ingresoNetoDisplay × trm`). Saving in USD requires a TRM > 0 (validation blocks otherwise). ([simulator/page.tsx](../../src/app/simulator/page.tsx))
- **Pricing Manager:** prices are computed in COP first, then USD channels convert **COP → USD by dividing** by `conversion_trm`; if no TRM is set for an active USD channel, the price returns `0` and saving is blocked. ([pricing-manager/page.tsx](../../src/app/pricing-manager/page.tsx), `calculateRowPrices` + save guard)
- **Dashboard:** normalizes each line to COP using `sim.trm || 1` before aggregation. ([page.tsx](../../src/app/page.tsx))
- **Currency values:** `COP | USD` (types) and per-row `currency` fields drive the branches.

---

## 9. No Aplica Logic

**Implemented** — [pricing-manager/page.tsx](../../src/app/pricing-manager/page.tsx):

- Each pricing row carries `applies: boolean` and `not_applicable_reason: string`.
- When `applies` is toggled **off**: `list_price` and `net_price` are reset to `0`; on save the payload sets `target_margin_pct: null` and `max_discount_pct` cleared (base "no aplica" payload).
- When toggled **on**: `not_applicable_reason` is cleared and prices are recomputed via `calculateRowPrices`.
- `not_applicable_reason` options in the UI: `"Producto exclusivo de cliente"`, `"No disponible para este canal"`, `"Otro"` (plus an empty "Razón (Opcional)").
- Rows where `applies === false` are also recognized when loading existing price-list state.

---

## 10. Pricing Rules

**Implemented** — [pricing-manager/page.tsx](../../src/app/pricing-manager/page.tsx), `calculateRowPrices`:

```
if (!bomCost || !row.applies) → { net_price: 0, list_price: 0 }

netCop  = (0 ≤ margin  < 100) ? bomCost / (1 − margin/100)   : 0
listCop = (0 ≤ discount < 100) ? netCop  / (1 − discount/100) : 0

if currency === "USD":
    if trm > 0 → { net_price: netCop/trm, list_price: listCop/trm }
    else       → { net_price: 0, list_price: 0 }
else            → { net_price: netCop, list_price: listCop }
```

- `bomCost` = the product's `recalculated_cost_mp` (latest BOM record).
- Defaults on new rows: `target_margin_pct` falls back to the product's `target_margin_pct` or `65`; `max_discount_pct` defaults `0`.
- Prices auto-recompute when `target_margin_pct`, `max_discount_pct`, `applies`, or the TRM change.

---

## 11. Supabase Tables Referenced in the Code

Enumerated from all `.from("…")` calls in `src` (no `.rpc(...)` calls exist):

| Table | Seen in (examples) | Apparent purpose |
|---|---|---|
| `Usuarios_MarginOS` | Topbar | User display names |
| `products` | products, import, pricing-manager | SAP product master |
| `component_costs` | admin/costs, import | Real component unit costs (`codigo, costo_unitario, moneda, description`) |
| `bom_imports` | import | BOM import records / history |
| `bom_products` | import, admin/costs, pricing-manager | Per-product BOM snapshot incl. `recalculated_cost_mp`, `excluidos_pz_count` |
| `bom_components` | import, admin/costs | Component rows (`codigo, cantidad, costo_excel_fallback, nivel, parent_codigo`) — **no description column** |
| `sales_channels` | sales-channels, pricing-manager, dashboard | Channel master |
| `customers` | customers, simulator, dashboard | Customer master |
| `price_lists` | price-lists, pricing-manager | Per-channel/product prices, `applies`, `conversion_trm`, validity |
| `simulations` | simulator, scenarios, dashboard | Simulation headers (currency, trm, commission_pct, status, …) |
| `simulation_lines` | simulator, dashboard | Simulation line items (net_price, qty, contribution_value, margin_pct, …) |
| `simulation_versions` | simulator / VersionModal | Simulation versioning (CLONE / COST_UPDATE) |

> Column lists above are drawn from the `.select(...)`/insert payloads in code and are **representative,
> not exhaustive**. The authoritative schema lives in Supabase and is **[UNCONFIRMED]** here.

---

## 12. Shared Utilities, Constants and Types

**Implemented**

- **[src/lib/bom/pzRule.ts](../../src/lib/bom/pzRule.ts)** — the only shared *business-rule* module. Consumed by `import` and `admin/costs`.
- **[src/lib/excelExport.ts](../../src/lib/excelExport.ts)** — `exportSimulationToExcel(sim, lines, versionData?)` using `exceljs`; FIRPLAK-branded workbook.
- **[src/lib/supabase/*](../../src/lib/supabase/)** — SSR browser/server/middleware clients (the ones actually used).
- **Contexts:** `ThemeContext` (`light|dark|system`), `TableDensityContext` (`compact|normal|comodo`, persisted to `localStorage` under `marginos:table_density`), `SidebarContext`, `NavigationBlockerContext` (unsaved-changes guard).
- **Design tokens:** [src/styles/tokens.css](../../src/styles/tokens.css) and [src/styles/design-system.css](../../src/styles/design-system.css) (surfaces, form primitives, `.modal-panel`, `.pill`, density-scoped field sizing, dark mode).

**[UNCONFIRMED] / likely stale — [src/types/index.ts](../../src/types/index.ts)**
- Defines `Currency`, `Channel = 'Constructora' | 'Distribuidor' | 'Retail'`, `Product`, `Component`, `LineItem`, `Scenario`, etc. However, the feature pages define their **own inline interfaces** and use Spanish DB status values (`VIGENTE`, `RECHAZADA`, `DRAFT`, …) and dynamic channels from `sales_channels`. The `Channel` string-literal union in `types/index.ts` does **not** match the data-driven channels used at runtime. **Treat `types/index.ts` as partially legacy/aspirational; verify before relying on it.**

---

## 13. Recent Development History (last 20 commits)

```
6b6dc59  fix: Supabase auth lock, scenarios error, Clientes filter bar, Simulador density modes
769ad51  feat: include PZ MAQUILA components in BOM MP cost
0ed9bb4  fix: Costos Reales — fixed CÓDIGO width, DESCRIPCIÓN fills remaining space
352728f  fix: Costos Reales — CÓDIGO nowrap + COSTO BASE deduplicated currency
1cdea49  fix: Costos Reales — CÓDIGO font and COSTO BASE inline layout
b5ce2c7  fix: price-lists modal PRODUCTO column — allow text to wrap
4e278db  redesign: fine detail polish pass — 5 module fixes
c768fe6  redesign: fine detail polish — 8 precise visual fixes
7d418e4  redesign: fix modal/overlay backgrounds — white panels, navy-tinted inputs
14d2275  redesign: LiquidGlass Option A — white canvas, navy-tinted glass, dark sidebar
21d2f6d  redesign: fix Pricing Manager visual issues, toast notification, secondary pages v3 tokens
5aad2f0  redesign: apply v3 design tokens to all 6 secondary pages
d98a777  redesign: add LoginScreen + update version to v2.0
4536202  redesign: apply FIRPLAK MarginOS premium LiquidGlass visual system
a69d163  Apply v3 Bone-over-Navy visual redesign to shell and dashboard components
2936ef6  Add v3 design system tokens (Claude Design, Apple-inspired refresh)
e94e09c  Corrección botones DarkMode
e048f99  Icono de la app
de9011f  New Design en Comission V1.1.1
b6baeb3  PriceListModal V2
```

**Reading of the history:** the last ~15 commits are dominated by a **visual redesign** (v3 "Bone over Navy" / LiquidGlass design system) plus targeted UI fixes. The one substantive **business-logic** change in this window is `769ad51` (PZ/MAQUILA BOM costing). `6b6dc59` bundled two bug fixes (auth-lock race, scenarios error logging) with two design fixes.

---

## 14. Current Branch and Application Version

- **Branch:** `luis` — in sync with `origin/luis` (nothing ahead/behind at analysis time).
- **Last commit:** `6b6dc59`.
- **`package.json` version:** `1.1.2` (`name: "pricing-app"`).
- **UI-declared version:** `MarginOS v2.0` (sidebar brand block).
- **Inconsistency:** these version strings disagree — see §16.

---

## 15. Pending Work and Technical Debt

**Pending (identified, not implemented)**

1. **Consolidate the duplicated MP-cost summation.** The `Σ(cantidad × effectiveCost)` formula is hand-written in **both** [import/page.tsx](../../src/app/import/page.tsx) and [admin/costs/page.tsx](../../src/app/admin/costs/page.tsx). Only the *exclusion predicate* is shared (`pzRule.ts`). The two copies currently agree but can drift. *(A pure-refactor consolidation into a shared `computeBomMpCost(...)` was proposed but deliberately not done pending approval, per the business-logic protection policy.)*
2. **Recalc MAQUILA description gap.** `bom_components` stores no description, so "Recalcular Costos BOM" resolves MAQUILA descriptions from `component_costs` only. A MAQUILA part with **no** `component_costs` row is excluded on recalc, diverging from the import-time cost. A full fix requires **a schema migration** (add `description` to `bom_components`) — **not done** and previously deferred.

**Technical debt (present in code)**

3. **Dead legacy client:** [src/lib/supabase.ts](../../src/lib/supabase.ts) is unused (no importers) and duplicates client creation — candidate for removal.
4. **No automated tests.** No unit/integration tests exist for the protected formulas (`pzRule`, `calcularLinea`, `calculateRowPrices`, KPI aggregation). Only `lint` is wired.
5. **Possibly stale shared types:** [src/types/index.ts](../../src/types/index.ts) does not match the runtime data model (see §12); pages rely on local inline interfaces instead.
6. **Version string mismatch:** `package.json 1.1.2` vs UI `v2.0`.
7. **`eslint-disable react-hooks/exhaustive-deps`** on the simulator `resumen` useMemo — intentional but worth noting (dependency correctness is manual there).

---

## 16. Architectural Risks and Recommendations

> All items below are **Recommendations** (not performed in this analysis).

1. **Protected formulas have no test coverage (highest risk).** Add unit tests for `isPzExcludedFromCost`/`descriptionHasMaquila`, simulator `calcularLinea`/`resumen`, pricing `calculateRowPrices`, and dashboard KPI aggregation, then wire a `test` script into CI. These encode revenue-affecting math.
2. **Single source of truth for BOM MP cost.** Extract the summation into one shared core function used by both import and recalc (§15 item 1). Keeps the two paths from silently diverging.
3. **Close the recalc description gap deliberately.** Either (a) persist `description` on `bom_components` (needs a migration) so recalc is fully correct, or (b) formally accept import-time cost as authoritative and document that recalc is best-effort for maquila-without-cost-row. Decision needs product/finance sign-off because it affects material cost.
4. **Client-side-only data access + anon key.** All business reads/writes happen in the browser against Supabase; correctness/security depends entirely on RLS, which is **[UNCONFIRMED]** here. Recommend verifying RLS policies exist for every table in §11 and considering server actions/route handlers for sensitive writes (BOM cost recalculation, price saves).
5. **Remove dead code and reconcile versions.** Delete `src/lib/supabase.ts`; align `package.json` version with the UI (or drive the UI label from `package.json`).
6. **Reconcile or delete `types/index.ts`.** Generate types from the Supabase schema (e.g. `supabase gen types`) and replace ad-hoc inline interfaces, so the type layer reflects reality.
7. **Formula duplication audit.** Beyond BOM, confirm that margin/contribution logic isn't re-derived inconsistently between the simulator (authoritative) and the dashboard (which recomputes a weighted margin from stored line values). They currently use different-but-compatible aggregations; document which is canonical.

---

## Handoff Checklist (for the receiving agent)

- **Objective:** Maintain/extend MarginOS commercial pricing & margin-simulation app.
- **Work completed (recent):** BOM PZ/MAQUILA costing rule (`769ad51`); auth-lock + scenarios-error fixes and Clientes/Simulador UI fixes (`6b6dc59`); extensive v3 visual redesign.
- **Files central to business logic:** `src/lib/bom/pzRule.ts`, `src/app/simulator/page.tsx`, `src/app/pricing-manager/page.tsx`, `src/app/import/page.tsx`, `src/app/admin/costs/page.tsx`, `src/app/page.tsx`.
- **Business rules involved:** PZ/MAQUILA exclusion, MP cost summation, margin/contribution, TRM/USD, commission gross-up, No Aplica, target pricing, KPI aggregation.
- **Decisions made:** margin/contribution computed on real (post-commission) revenue; PZ excluded unless description contains MAQUILA; recalc resolves descriptions from `component_costs`.
- **Pending work / known issues:** see §15 (MP-cost duplication, recalc description gap, dead client, no tests, stale types, version mismatch).
- **Last commit hash:** `6b6dc59`.
- **Current branch:** `luis` (synced with `origin/luis`).
- **Validation performed:** `git status` (clean but for untracked `.claude/`), `npm run build` (**pass**, 16 routes), test discovery (**no project tests**).
- **Before continuing:** `git fetch origin && git pull` on `luis` to ensure the latest remote state.
