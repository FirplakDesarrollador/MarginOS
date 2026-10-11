# 03 · Business Rules

> Entry/index document for protected commercial logic. The **authoritative** testing/governance
> reference is [TESTING.md](TESTING.md); calculation detail lives in code and in the handover doc.

## Protected business logic (changes require tests + approval)

Per [TESTING.md](TESTING.md), the following is **protected** — do not modify without corresponding
automated tests and sign-off:

- **BOM costing** (MP cost summation) — `src/app/import/page.tsx`, recompute in `src/app/admin/costs/page.tsx`
- **PZ / MAQUILA rule** — `src/lib/bom/pzRule.ts` (**has tests:** `src/lib/bom/pzRule.test.ts`)
- **Margin & contribution** — `src/app/simulator/page.tsx` (`calcularLinea` / `resumen`)
- **Commission** (gross-up, real-revenue) — `src/app/simulator/page.tsx`
- **Pricing** (net/list from margin & discount) — `src/app/pricing-manager/page.tsx` (`calculateRowPrices`)
- **Currency / TRM conversion** — simulator (× TRM) and pricing-manager (÷ TRM)
- **KPI calculations** — `src/app/page.tsx`

## Where the formulas are documented

- **Narrative of every formula** (BOM cost, margin/contribution, TRM, commission, No Aplica, pricing,
  KPIs) with file references: see the "Business Rules" sections of
  [07_Roadmap/MarginOS_Project_Handover.md](07_Roadmap/MarginOS_Project_Handover.md).
- **Testing strategy, protected-logic policy, and contributor rules:** [TESTING.md](TESTING.md).

## Rules for changing protected logic (summary)

1. Modify the **source of truth**, never fork the logic into another module.
2. State current vs proposed behavior and impacted modules.
3. Confirm whether a database migration is required.
4. Do not change an implementation just to make a test pass; if a real defect is found, stop and flag it.
5. Financial-calculation changes require explicit approval and accompanying tests **before merge**.

> Per-module functional documentation (how each screen uses these rules) belongs in
> [04_Modules/](04_Modules/).
