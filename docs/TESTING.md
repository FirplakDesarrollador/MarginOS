# MarginOS — Testing Strategy

> Permanent project documentation. This file defines how automated testing works in
> MarginOS and the rules that govern changes to protected financial logic.

---

## 1. Purpose of Automated Testing

MarginOS computes revenue-affecting numbers: material costs, margins, contribution,
commissions, prices and executive KPIs. A silent error in any of these formulas can
produce incorrect commercial decisions.

Automated tests exist to:

- **Pin current behavior** of protected formulas so regressions are caught immediately.
- **Document intent** — a test is an executable specification of what a rule is supposed to do.
- **Make changes safe and visible** — any future change to a protected formula must break or
  update a test, so the change is deliberate rather than accidental.
- **Enable confident refactoring** — shared/core logic can be consolidated later with a safety net.

Tests are not a substitute for review of protected logic; they are the minimum bar that must
accompany it.

---

## 2. Protected Business Logic

The following logic is **protected**. Changes require the process in §5 and must ship with
tests (§7). Source locations are given for each.

| Protected logic | Source of truth | Notes |
|---|---|---|
| **BOM costing** (MP cost summation) | [`src/app/import/page.tsx`](../src/app/import/page.tsx) | `Σ(cantidad × effectiveCost)`; also recomputed in [`src/app/admin/costs/page.tsx`](../src/app/admin/costs/page.tsx) |
| **PZ / MAQUILA rule** | [`src/lib/bom/pzRule.ts`](../src/lib/bom/pzRule.ts) | Shared predicate; **has tests today** (see §4) |
| **Margin calculations** | [`src/app/simulator/page.tsx`](../src/app/simulator/page.tsx) | `calcularLinea` / `resumen` (margin on real, post-commission revenue) |
| **Contribution calculations** | [`src/app/simulator/page.tsx`](../src/app/simulator/page.tsx) | `contribucionCop = realRevenueCop − costoTotalCop` |
| **Commission calculations** | [`src/app/simulator/page.tsx`](../src/app/simulator/page.tsx) | Commission gross-up + real-revenue derivation |
| **Pricing calculations** | [`src/app/pricing-manager/page.tsx`](../src/app/pricing-manager/page.tsx) | `calculateRowPrices` (net/list from margin & discount) |
| **Currency / TRM conversion** | simulator + pricing-manager | USD↔COP; simulator multiplies by TRM, pricing divides by TRM |
| **KPI calculations** | [`src/app/page.tsx`](../src/app/page.tsx) | `execKPIs`, `pricingKPIs`, weighted margin, coverage |

> **Current coverage status:** Only the **PZ / MAQUILA rule** has automated tests at the time of
> writing. The remaining items are protected but **not yet covered** — see §6 and the project
> handover ([`docs/MarginOS_Project_Handover.md`](./MarginOS_Project_Handover.md)) for the
> recommended order of work. Absence of a test today does **not** lower the protection bar: new
> changes to these areas must add tests (§7).

---

## 3. Current Testing Framework — Vitest

- **Framework:** [Vitest](https://vitest.dev) (`vitest@^4.1.10`, dev dependency).
- **Why Vitest:** native ESM + TypeScript support, aligns with the project's `bundler` module
  resolution, and integrates cleanly with Next.js 16 / React 19 with minimal configuration.
- **Config:** [`vitest.config.ts`](../vitest.config.ts)
  - `environment: "node"` — current protected logic is pure TypeScript with no DOM dependency.
  - `include: ["src/**/*.{test,spec}.{ts,tsx}"]` — tests live next to the code they cover.
  - `@` path alias resolves to `./src` (mirrors `tsconfig.json`).
- **Test file convention:** co-locate as `*.test.ts` next to the module
  (e.g. [`src/lib/bom/pzRule.test.ts`](../src/lib/bom/pzRule.test.ts)).
- **DOM/component testing:** not configured yet. If/when UI or hook tests are needed, add
  `jsdom` + a React testing library and a `jsdom` project/environment override at that time.

---

## 4. Current Test Commands

| Command | Purpose |
|---|---|
| `npm run test` | Run Vitest in **watch** mode (local development). |
| `npm run test:run` | Run the full suite **once** and exit (CI / pre-merge / validation). |
| `npm run build` | Production build + TypeScript check (must pass alongside tests). |
| `npm run lint` | ESLint. *See §6 — the baseline currently has pre-existing failures.* |

Existing tests:

- [`src/lib/bom/pzRule.test.ts`](../src/lib/bom/pzRule.test.ts) — documents the PZ / MAQUILA rule:
  non-PZ included; PZ excluded by default; PZ + `MAQUILA` (case- and accent-insensitive) included;
  whitespace tolerance; empty/null description handling; and a pinned edge-case for untrimmed codes.

---

## 5. Rules for Modifying Protected Formulas

Protected formulas (§2) must **not** be changed casually. Before modifying one:

1. **Identify the source of truth.** Change it there; do not fork the logic into another module.
   Where the same rule already exists in more than one place (e.g. BOM MP cost in `import` and
   `admin/costs`), prefer consolidating rather than editing one copy.
2. **State current vs. proposed behavior** in the PR description, and which modules are affected.
3. **Confirm whether a database migration is required** (some rules depend on stored columns).
4. **Do not change an implementation solely to make a test pass.** If a test fails, first decide
   whether the test or the code is wrong.
5. **If you discover an actual defect in protected logic, stop and flag it** for explicit approval
   before changing the formula. Financial-calculation changes require sign-off.
6. **Never implement the same business rule in multiple places** unless explicitly required.

---

## 6. Known Baseline Caveats

- **`npm run lint` currently fails on the branch** due to **pre-existing** issues unrelated to the
  testing infrastructure (e.g. `any` types in `src/lib/excelExport.ts`, stray root-level scripts,
  and `react-hooks` rule violations). Linting cleanup is tracked as separate technical debt; it is
  **not** a gate introduced by this testing setup. Do not let unrelated pre-existing lint errors
  block a well-tested change, but do not add new ones.
- **Most protected logic is not yet covered** (§2). Growing coverage — starting with the simulator
  margin/contribution/commission math, pricing calculations, and KPI aggregation — is the intended
  next step.

---

## 7. Expectations for Future Contributors

- **Any change to protected financial logic (§2) MUST include corresponding automated tests in the
  same change, before merge.** A change to a protected formula without tests should not be approved.
- New tests must **document behavior**, cover the normal case and the meaningful edge cases
  (zero/negative/boundary values, missing data, currency branches, accent/case variance), and be
  co-located with the code.
- Keep tests deterministic and free of network/database access. Protected logic should be pure and
  unit-testable; if it is not, prefer extracting the pure calculation so it can be tested.
- `npm run test:run` and `npm run build` must pass before requesting review.
- When you add coverage for a previously-uncovered protected area, update the status note in §2.
