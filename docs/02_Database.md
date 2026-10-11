# 02 · Database

> Entry/index document for the data layer. The **authoritative** artifacts are linked below.

## Authoritative sources

| Artifact | What it is |
|---|---|
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Human-readable authoritative schema baseline for the 12 MarginOS tables — columns, types, defaults, PKs, FKs, unique/check constraints, indexes, triggers, functions, views, RLS status, RLS policies, and anon/authenticated grants. Derived from real database introspection. |
| [`supabase/schema.sql`](../supabase/schema.sql) | Reconstructed DDL for the 12 MarginOS tables (documentation baseline — **not** a migration; do not apply). |
| [`supabase/introspection/`](../supabase/introspection/) | The raw read-only introspection CSV exports the baseline was built from (source evidence). |

## Snapshot (see DATABASE_SCHEMA.md for the full detail)

- **MarginOS owns 12 tables** inside a **shared 173-table** `public` schema:
  `customers`, `products`, `sales_channels`, `price_lists`, `simulations`, `simulation_lines`,
  `simulation_versions`, `bom_imports`, `bom_products`, `bom_components`, `component_costs`,
  `Usuarios_MarginOS`.
- **Current-state (overwrite):** masters (`customers`, `products`, `sales_channels`),
  `component_costs`, and `price_lists` (a strict `UNIQUE (product_id, channel_id)` means the DB
  **forbids** price history on the base table).
- **Historical (append):** `bom_imports → bom_products → bom_components`, and the simulation chain
  (`simulations`, `simulation_lines`, `simulation_versions`).

## Open items tracked elsewhere

- **Security:** RLS/grants currently permit anonymous read+write on 11 tables — see
  [07_Roadmap/PHASE_0_SECURITY_AND_DATA_LANDSCAPE.md](07_Roadmap/PHASE_0_SECURITY_AND_DATA_LANDSCAPE.md).
- **PK re-verification:** the PK export was incomplete for 6 tables — an authoritative re-check query
  is in the Phase 0 doc (§ PK Re-verification).
- **App↔DB drift:** two phantom columns (`simulations.reference`, `simulation_versions.version_type`)
  — documented in the Phase 0 doc.
- **Shared-schema reconciliation & new commercial entities:** see
  [07_Roadmap/COMMERCIAL_INTELLIGENCE_ARCHITECTURE_ASSESSMENT.md](07_Roadmap/COMMERCIAL_INTELLIGENCE_ARCHITECTURE_ASSESSMENT.md).
