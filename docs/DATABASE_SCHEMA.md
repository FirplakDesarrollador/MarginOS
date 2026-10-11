# MarginOS — Database Schema (AUTHORITATIVE Baseline)

> **Updated:** 2026-07-26 · **READ-ONLY.** No database, migration, or app code was modified.
> **Source of truth:** the 12 read-only introspection exports in
> [`supabase/introspection/`](../supabase/introspection/) (columns, PKs, FKs, unique/check
> constraints, indexes, triggers, functions, views, RLS policies, role grants), run from the
> Supabase SQL Editor. This replaces the earlier code-inferred placeholder.
> **Companion DDL:** [`supabase/schema.sql`](../supabase/schema.sql).

---

## 0. Headline: this is a SHARED multi-application database

The introspection revealed the Supabase `public` schema holds **173 tables**. **MarginOS owns only
12 of them.** The other ~161 belong to unrelated FIRPLAK systems in the *same schema*, including a
large CRM (`CRM_*` — accounts, contacts, opportunities, quotes, commissions, price lists), a
service/repair domain, WhatsApp messaging, inventory, KPI/fact tables, negotiation tables
(`Neg_base`, `Neg_historial_precios`, `Neg_productos`), and several `*_Backup_*`, `prueba*`,
`clase_esteban` scratch tables. There is also a separate `product_costs` table (with a real FK to
`products`) and legacy `Productos` / `Clientes` / `CRM_ListaDePrecios`.

**Implication:** MarginOS is a tenant inside a crowded shared schema. This materially affects the
Commercial Intelligence roadmap (naming collisions, migration blast radius, security isolation, and
possible reuse of existing CRM/negotiation structures). See §12 and §13.

---

## 1. Confirmed Tables (MarginOS · 12) + RLS status

All 12 have **RLS enabled** (`rls_enabled=true`, `rls_forced=false`).

| Table | Kind | RLS enabled | Nature |
|---|---|---|---|
| `customers` | table | ✅ | current-state master |
| `products` | table | ✅ | current-state master |
| `sales_channels` | table | ✅ | current-state master |
| `price_lists` | table | ✅ | base pricing (DB-forced single row per product+channel) |
| `simulations` | table | ✅ | lifecycle + append |
| `simulation_lines` | table | ✅ | append snapshot |
| `simulation_versions` | table | ✅ | append lineage |
| `bom_imports` | table | ✅ | append |
| `bom_products` | table | ✅ | append snapshot |
| `bom_components` | table | ✅ | append |
| `component_costs` | table | ✅ | current-state (keyed by codigo) |
| `Usuarios_MarginOS` | table | ✅ | users (properly scoped) |

---

## 2. Columns, Data Types, Defaults, Nullability

*(uuid PK default `uuid_generate_v4()` unless noted; `timestamptz` = timestamp with time zone.)*

### `customers`
| column | type | null | default |
|---|---|---|---|
| id | uuid | NO | uuid_generate_v4() |
| name | text | NO | — |
| nit | text | YES | — |
| contact_name | text | YES | — |
| email | text | YES | — |
| default_channel_id | uuid | YES | — |
| notes | text | YES | — |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

### `products`
`id` uuid NO `uuid_generate_v4()` · `sap_code` text NO · `description` text NO · `category` text YES ·
`uom` text YES · `is_active` boolean NO `true` · `created_at` timestamptz NO `now()` ·
`updated_at` timestamptz NO `now()` · `target_margin_pct` numeric YES

### `sales_channels`
`id` uuid NO `uuid_generate_v4()` · `name` text NO · `default_currency` text NO `'COP'` ·
`min_margin_pct` numeric YES · `is_active` boolean NO `true` · `created_at` timestamptz NO `now()` ·
`updated_at` timestamptz NO `now()`

### `price_lists`
`id` uuid NO `uuid_generate_v4()` · `channel_id` uuid NO · `product_id` uuid NO ·
`currency` text NO `'COP'` · `list_price` numeric NO `0` · `valid_from` date YES · `valid_to` date YES ·
`is_active` boolean NO `true` · `created_at` timestamptz NO `now()` · `updated_at` timestamptz NO `now()` ·
`target_margin_pct` numeric YES · `max_discount_pct` numeric YES · `net_price` numeric YES ·
`applies` boolean YES `true` · `not_applicable_reason` text YES · `conversion_trm` numeric YES

### `simulations`
`id` uuid NO `uuid_generate_v4()` · `customer_id` uuid YES · `channel_id` uuid YES ·
`simulation_type` text NO · `project_name` text YES · `currency` text NO `'COP'` · `trm` numeric YES ·
`valid_from` date YES · `valid_to` date YES · `status` text NO `'DRAFT'` · `source_simulation_id` uuid YES ·
`created_by` uuid YES · `created_at` timestamptz NO `now()` · `updated_at` timestamptz NO `now()` ·
`target_margin_pct` numeric YES `65` · `commission_pct` numeric YES `0` · `commission_amount` numeric YES `0` ·
`real_revenue_after_commission` numeric YES

### `simulation_lines`
`id` uuid NO `uuid_generate_v4()` · `simulation_id` uuid NO · `product_id` uuid YES · `sap_code` text NO ·
`description` text YES · `qty` numeric NO `0` · `list_price` numeric NO `0` · `discount_pct` numeric NO `0` ·
`net_price` numeric NO `0` · `cost_mp` numeric NO `0` · `margin_pct` numeric NO `0` ·
`contribution_value` numeric NO `0` · `previous_price` numeric YES · `increment_pct` numeric YES ·
`created_at` timestamptz NO `now()` · `updated_at` timestamptz NO `now()`

### `simulation_versions`
`id` uuid NO `uuid_generate_v4()` · `original_simulation_id` uuid NO · `renewed_simulation_id` uuid NO ·
`created_at` timestamptz NO `now()`

### `bom_imports`
`id` uuid NO `uuid_generate_v4()` · `file_name` text YES · `source` text YES `'SAP_BOM_IMPORT'` ·
`imported_at` timestamptz NO `now()` · `notes` text YES

### `bom_products`
`id` uuid NO `uuid_generate_v4()` · `bom_import_id` uuid NO · `product_id` uuid YES · `sap_code` text NO ·
`description` text YES · `recalculated_cost_mp` numeric NO `0` · `componentes_count` integer NO `0` ·
`excluidos_pz_count` integer NO `0` · `created_at` timestamptz NO `now()`

### `bom_components`
`id` uuid NO `uuid_generate_v4()` · `bom_product_id` uuid NO · `codigo` text NO · `cantidad` numeric NO ·
`costo_excel_fallback` numeric NO · `nivel` integer NO · `parent_codigo` text YES ·
`created_at` timestamptz NO `now()` · **(no `description` column)**

### `component_costs`
`id` uuid NO `uuid_generate_v4()` · `codigo` text NO · `costo_unitario` numeric NO · `moneda` text NO `'COP'` ·
`description` text YES · `created_at` timestamptz NO `now()` · `updated_at` timestamptz NO `now()`

### `Usuarios_MarginOS`
`id` **bigint** NO (identity/generated; default not captured) · `created_at` timestamptz NO `now()` ·
`uuid` uuid NO · `nombre` text YES · `rol` text YES · `permisos` **json** YES

---

## 3. Primary Keys

`<table>_pkey PRIMARY KEY (id)` for all 12 (for `Usuarios_MarginOS` the PK is `id` bigint).

> ⚠️ **Data-quality caveat.** `03_primary_keys.csv` (from `information_schema.table_constraints`
> `PRIMARY KEY`) returned rows for only **6** tables (`customers`, `bom_imports`, `bom_products`,
> `bom_components`, `component_costs`, `Usuarios_MarginOS`). For the other 6 (`products`,
> `sales_channels`, `price_lists`, `simulations`, `simulation_lines`, `simulation_versions`) the PK
> row was **absent** — yet each has a `<table>_pkey` **unique index** (query 7) **and** is referenced
> by valid inbound FOREIGN KEYs (e.g. `price_lists.product_id → products(id)`,
> `simulation_lines.simulation_id → simulations(id)`), which Postgres only allows against a
> UNIQUE/PK **constraint**. Conclusion: the PK constraints almost certainly **exist**; the 6 missing
> rows look like an **incomplete export** of query 3. **Re-run query 3 (or check `pg_constraint`
> `contype='p'`) to confirm** before relying on it for migrations.

---

## 4. Foreign Keys (all confirmed)

| Constraint | Column → Referenced | On delete |
|---|---|---|
| customers_default_channel_id_fkey | customers.default_channel_id → sales_channels(id) | SET NULL |
| price_lists_channel_id_fkey | price_lists.channel_id → sales_channels(id) | CASCADE |
| price_lists_product_id_fkey | price_lists.product_id → products(id) | CASCADE |
| simulations_customer_id_fkey | simulations.customer_id → customers(id) | SET NULL |
| simulations_channel_id_fkey | simulations.channel_id → sales_channels(id) | SET NULL |
| simulations_source_simulation_id_fkey | simulations.source_simulation_id → simulations(id) | SET NULL |
| simulation_lines_simulation_id_fkey | simulation_lines.simulation_id → simulations(id) | CASCADE |
| simulation_lines_product_id_fkey | simulation_lines.product_id → products(id) | SET NULL |
| simulation_versions_original_simulation_id_fkey | simulation_versions.original_simulation_id → simulations(id) | CASCADE |
| simulation_versions_renewed_simulation_id_fkey | simulation_versions.renewed_simulation_id → simulations(id) | CASCADE |
| bom_products_bom_import_id_fkey | bom_products.bom_import_id → bom_imports(id) | CASCADE |
| bom_products_product_id_fkey | bom_products.product_id → products(id) | SET NULL |
| bom_components_bom_product_id_fkey | bom_components.bom_product_id → bom_products(id) | CASCADE |

**No FK exists for:** `component_costs` (linked to components by `codigo` **string**, not a key);
`bom_products.sap_code` / `bom_components.codigo` / `simulation_lines.sap_code` (code-based joins).

---

## 5. Unique Constraints

| Table | Constraint | Columns |
|---|---|---|
| products | products_sap_code_key | (sap_code) |
| sales_channels | sales_channels_name_key | (name) |
| component_costs | component_costs_codigo_key | (codigo) |
| Usuarios_MarginOS | Usuarios_MarginOS_uuid_key | (uuid) |
| price_lists | **uq_price_lists_product_channel** | **(product_id, channel_id)** ← strict |
| price_lists | uq_price_list_channel_product | (channel_id, product_id, currency, valid_from) |

> ⚠️ **`price_lists` has TWO overlapping unique constraints.** The strict `(product_id, channel_id)`
> means the database **allows only one row per product+channel** — so **`price_lists` cannot hold
> price history at all** (the second, wider `(channel_id, product_id, currency, valid_from)` is
> effectively subsumed). This is the DB confirming that base pricing is single-current-row by design.

---

## 6. Check Constraints

| Table | Constraint | Definition |
|---|---|---|
| simulations | simulations_simulation_type_check | `simulation_type IN ('PRICE_LIST','PROJECT_PROMO')` |
| simulations | simulations_status_check | `status IN ('DRAFT','VIGENTE','VENCIDO','RENOVADA','RECHAZADA')` |

No other MarginOS table has a CHECK constraint. (The app's "COMMISSION" type is stored as
`PRICE_LIST`, so it satisfies the type check.)

---

## 7. Indexes (secondary, beyond PK/unique)

- **customers:** `idx_customers_name(name)`, `idx_customers_nit(nit)`
- **products:** `idx_products_description(description)`, `idx_products_sap_code(sap_code)`
- **price_lists:** `idx_price_lists_channel_id`, `idx_price_lists_product_id`
- **simulations:** `idx_simulations_channel_id`, `idx_simulations_customer_id`, `idx_simulations_status`, `idx_simulations_type`
- **simulation_lines:** `idx_simulation_lines_product_id`, `idx_simulation_lines_sap_code`, `idx_simulation_lines_simulation_id`
- **simulation_versions:** `idx_simulation_versions_original`, `idx_simulation_versions_renewed`
- **bom_products:** `idx_bom_products_import_id`, `idx_bom_products_sap_code`
- **bom_components:** `idx_bom_components_bom_product`, `idx_bom_components_codigo`
- **component_costs:** `idx_component_costs_codigo`
- **bom_imports / simulation_versions:** PK/unique indexes only (no extra secondary indexes on bom_imports)

---

## 8. Triggers

All are `BEFORE UPDATE ... FOR EACH ROW EXECUTE FUNCTION set_updated_at()`:

`trg_customers_updated_at`, `trg_products_updated_at`, `trg_sales_channels_updated_at`,
`trg_price_lists_updated_at`, `trg_simulations_updated_at`, `trg_simulation_lines_updated_at`,
`trg_component_costs_updated_at`.

Append-only tables (`bom_imports`, `bom_products`, `bom_components`, `simulation_versions`) have **no**
`updated_at` trigger (consistent — they have no `updated_at` column).

---

## 9. Functions

- `public.set_updated_at()` — `returns trigger`, `plpgsql`, **security_definer = false**, volatile.
  Body not captured by introspection (query 9 returns signature only). Used by the 7 triggers above.
- The `public` schema contains **142 functions total**; the rest belong to the other systems (CRM,
  etc.) and are out of MarginOS scope.

---

## 10. Views

- The application uses **no database views** (all reads are direct table queries).
- `10_views.csv` lists 1,346 rows, but view definitions span multiple lines, so a line-based scan for
  MarginOS-table references is **not conclusive**; none of the 12 tables are known view dependencies.
  **[UNVERIFIED]** whether any of the ~other-system views reference MarginOS tables. (Low priority —
  future Commercial-Intelligence read models will introduce our own curated views.)

---

## 11. RLS Status & Policies  (⚠️ critical security finding)

**RLS is ENABLED on all 12 tables.** But the policies/grants make 11 of them effectively open:

| Table | Policy | Roles | Cmd | USING | WITH CHECK |
|---|---|---|---|---|---|
| customers, products, sales_channels, price_lists, simulations, simulation_lines, simulation_versions, bom_imports, bom_products, bom_components, component_costs | "Policy with security definer functions" | **{anon, authenticated}** | **ALL** | **`true`** | (null) |
| Usuarios_MarginOS | "Users can view own data" | {authenticated} | SELECT | `auth.uid() = uuid` | (null) |

**Role grants (query 12)** — for **every** one of the 12 tables, both **`anon`** and **`authenticated`**
hold: `SELECT, INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES`.

**Net effective posture:**
- **11 operational tables:** permissive `ALL USING (true)` for `anon` + full table grants ⇒
  **anonymous, unauthenticated clients can READ *and WRITE* (insert/update/delete/truncate) all
  commercial data** — customers, prices, simulations, costs, BOM. The anon key ships in the client
  bundle, so this is exposed to anyone who loads the app.
- **`Usuarios_MarginOS`:** protected in practice — RLS grants only `SELECT` of the caller's own row
  (`auth.uid() = uuid`); no write policy exists, so writes are blocked by RLS despite the grants.
  **This is the correct pattern** and proves the fix is straightforward to apply to the others.

> This upgrades the prior "behavioral" finding to **confirmed**: it is not merely "RLS might be open" —
> the policy is literally `for all to anon using (true)`.

---

## 12. anon / authenticated Grants (summary)

| Role | Tables | Privileges |
|---|---|---|
| `anon` | all 12 | SELECT, INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES |
| `authenticated` | all 12 | SELECT, INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES |

Grants alone are permissive; on the 11 operational tables the permit-all RLS policy leaves them
unmitigated. Only `Usuarios_MarginOS`'s restrictive RLS policy actually constrains access.

---

## 13. Comparison vs COMMERCIAL_INTELLIGENCE_ARCHITECTURE_ASSESSMENT.md

### ✅ Assumptions that were CORRECT
- Table set & roles (12 MarginOS tables; masters / pricing / BOM chain / simulation history).
- All inferred **FKs exist** exactly as predicted (customers→channel, price_lists→product/channel,
  simulations→customer/channel, simulation_lines/versions→simulations, bom chain, etc.).
- `products` is a clean single master; `component_costs` keyed by `codigo` (now: has surrogate `id` too).
- `bom_components` has **no `description`** (debt confirmed).
- `customers` holds **no commercial terms** (only identity + `notes`); missing country/market/Incoterm/etc.
- **No** `customer_products`, **no** `product_assets` — confirmed absent.
- `price_lists` is product×channel and **not** history-capable → the approved **Option B** (separate
  historized commercial layer) is validated. The DB is even stricter than assumed: a `(product_id,
  channel_id)` **unique constraint forbids** history at the DB level.

### ❌ Assumptions that were WRONG / refined
- Assessment said RLS was "[UNCONFIRMED], assumes RLS-filtered." **Reality: RLS enabled but permit-all
  to anon (read+write).** Worse than assumed.
- `customers.created_at` was "[UNCONFIRMED]" → **present** (plus `updated_at`, and `updated_at` triggers
  on 7 tables — none of which the code-only view could see).
- New columns not visible from code: `simulations.source_simulation_id` / `created_by`;
  `simulation_lines.previous_price` / `increment_pct`; `Usuarios_MarginOS.rol` / `permisos`.
- The database is **shared (173 tables)** — the assessment implicitly treated it as MarginOS-only.

### 🔻 Missing constraints (enforced only in app, still absent in DB)
- `price_lists` "one **active** per (product, channel)" and non-overlapping validity — not modeled
  (the unique key already forbids >1 row per pair, but there is no active/validity guard).
- No CHECK on `currency`/`moneda` domains, margins/discounts ranges, or `applies` vs
  `not_applicable_reason` coherence.
- `component_costs` ↔ `products` has **no FK** (code-linkage only).

### 🔁 Application ⇄ Database drift (confirmed defects)
1. **`simulations.reference`** — selected by [`GlobalSearchModal.tsx`](../src/components/GlobalSearchModal.tsx)
   but **does not exist** (verified `42703`). Simulation search likely 400s at runtime.
2. **`simulation_versions.version_type`** — selected by [`customers/page.tsx`](../src/app/customers/page.tsx)
   but **does not exist** (verified `42703`). That lookup likely 400s at runtime.
3. Both are pure read paths; core save/costing flows are unaffected. (Reported only — no code changed.)

---

## 14. Commercial Intelligence Readiness

Can the **current** schema support the planned Commercial Data Model v1 entities?

| Planned entity | Ready? | Basis |
|---|---|---|
| `customer_commercial_terms` | ✅ **Ready to add** | `customers.id` is a stable uuid PK with inbound-FK proof; additive table can reference it. No conflict. |
| `customer_products` | ✅ **Ready to add** | `products.id` uuid PK stable; `products.sap_code` is UNIQUE. Mapping `(customer_id, product_id, customer_sku…)` is purely additive. |
| `commercial_price_lists` (header) | ✅ **Ready to add** | References `customers`/`sales_channels`/`products` — all present with PKs. Must be **separate** from `price_lists` (whose `(product_id, channel_id)` unique constraint forbids history). |
| `commercial_price_list_items` | ✅ **Ready to add** | FK to the header + `products.id`; store `cost_at_creation` snapshot. Additive. |
| `product_assets` | ✅ **Ready to add** | FK to `products.id`; additive. |

**Overall: the core is structurally ready** — stable uuid PKs, real FKs, and clean masters make the
additive commercial layer safe. **But three things must be resolved first (not schema-blocking, yet
gating for a trustworthy commercial platform):**

1. **Security (blocker for "controlled AI access"):** the permit-all anon RLS + full grants must be
   fixed before adding customer-commercial data — otherwise new commercial tables inherit the same open
   read/write exposure. `Usuarios_MarginOS` shows the correct pattern to replicate.
2. **Shared-schema strategy:** decide whether the commercial layer lives in `public` alongside 173
   tables (collision/permissions risk) or in a dedicated schema (e.g. `commercial`). Naming like
   `commercial_price_lists` reduces—but doesn't remove—collision risk (`CRM_ListaDePrecios`,
   `Neg_historial_precios`, `product_costs`, legacy `Clientes`/`Productos` already exist).
3. **Reuse vs. rebuild check:** existing `CRM_*` and `Neg_*` tables may already model customers,
   commercial terms, or price history. Confirm whether MarginOS should integrate with those vs.
   introduce parallel structures (avoid a third customer/price master).

The **temporal/versioning** approach (valid_from/valid_to/status, insert-new-version, no-overwrite,
non-overlap constraint) from the assessment remains the right design — and is *necessary* precisely
because `price_lists` proves the DB currently blocks history on the base table.

---

## 15. Extraction Completeness

**Complete and authoritative** for the 12 tables: columns, types, defaults, nullability, FKs, unique
constraints, check constraints, indexes, triggers, RLS enable-state, RLS policy definitions, and
anon/authenticated grants.

**Caveats:** (a) PK constraint rows missing for 6 tables in query 3 — treat as export gap, re-verify
(§3); (b) `set_updated_at()` body not captured (§9); (c) view→MarginOS dependency not conclusively
scanned (§10); (d) `Usuarios_MarginOS.id` default (identity vs sequence) not captured.

*Nothing was modified in the database or application. Nothing committed.*
