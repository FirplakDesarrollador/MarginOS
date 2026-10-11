# MarginOS — Phase 0: Security & Shared-Data Landscape (READ-ONLY)

> **Updated:** 2026-07-26 · No database, RLS, migration, or application code was modified. No commit.
> **Evidence base:** authoritative introspection in [`supabase/introspection/`](../../supabase/introspection/),
> the reconstructed [`supabase/schema.sql`](../../supabase/schema.sql), and source inspection of the app's
> auth architecture.
> **Label key:** **[CONFIRMED]** = proven from code/introspection · **[INFERENCE]** = reasoned from
> evidence, not proven · **[RECOMMENDATION]** = proposed action, not executed ·
> **[REQUIRES BUSINESS CONTEXT]** = needs a human/PO decision.

---

## 1. Executive Summary

Two structural realities gate the Commercial Intelligence roadmap and must be handled **before** any
new schema is designed:

- **Security:** **[CONFIRMED]** All 11 operational MarginOS tables allow **anonymous read *and write***
  (`RLS FOR ALL TO anon USING (true)` + full anon grants). However — **[CONFIRMED]** the application
  itself **authenticates every user** (Supabase Auth) and runs all data queries as the **`authenticated`**
  role behind a middleware gate. **The app does not depend on anonymous table access.** Therefore
  removing anon access is **low-risk** and is the single highest-value security fix.
- **Shared data:** **[CONFIRMED]** The `public` schema holds **173 tables** across multiple FIRPLAK
  systems. A mature **CRM/commercial suite already exists** in the same database — customer master
  (`CRM_Cuentas`), product master (`CRM_Productos`), a multi-channel price list (`CRM_ListaDePrecios`),
  FX rates (`CRM_ExchangeRates`), quoting (`CRM_Cotizaciones`/`Items`), sales orders with Incoterms &
  logistics (`CRM_Pedidos`), a SAP integration queue (`CRM_SapIntegrationQueue`), and a sales-history
  fact table (`sales_fact`). Much of the CI roadmap **may already be partially modeled** there.
  **[REQUIRES BUSINESS CONTEXT]** whether MarginOS should reuse, integrate with, or stay separate from
  these — this decision should precede Commercial Data Model v1.

Plus two low-impact **app↔DB drift defects** (`simulations.reference`, `simulation_versions.version_type`)
and a **PK re-verification** query (§10).

---

## 2. Current Authentication Architecture  **[CONFIRMED]**

| Aspect | Finding | Evidence |
|---|---|---|
| Auth method | Email+password via Supabase Auth `signInWithPassword` | [`login/actions.ts`](../../src/app/login/actions.ts) |
| Signup | `signUp` is **wired into the login UI** (toggle) | [`login/actions.ts`](../../src/app/login/actions.ts), [`login/page.tsx`](../../src/app/login/page.tsx) |
| Session | Cookie-based SSR session (`@supabase/ssr`) | [`client.ts`](../../src/lib/supabase/client.ts), [`server.ts`](../../src/lib/supabase/server.ts) |
| Route protection | Middleware redirects **all** non-`/login`,`/auth` routes to `/login` when no user | [`middleware.ts`](../../src/lib/supabase/middleware.ts), [`proxy.ts`](../../src/proxy.ts) |
| Client role at runtime | Browser client sends the logged-in JWT ⇒ queries execute as **`authenticated`** | `createBrowserClient` + cookies |
| Anon usage | Only pre-login: the login/signup **Auth** calls. **No operational table is queried by anon.** | middleware gate + `.from()` audit |

**Answer to "does the app rely on anon access?": [CONFIRMED] No.** Every operational read/write happens
after login, as `authenticated`. The permit-all-to-anon policy is an *exposure surface via the raw REST
API + the public anon key*, not an app dependency.

**Authorization primitive available:** **[CONFIRMED]** `Usuarios_MarginOS` has `rol` (text) and
`permisos` (json), plus a correct RLS policy (`auth.uid() = uuid`, authenticated, SELECT-own). **[INFERENCE]**
`rol`/`permisos` can support role-based authorization later, but **[CONFIRMED]** they are **not currently
used** in any RLS policy or app authorization check.

**Signup risk:** **[INFERENCE]** If Supabase public sign-ups are enabled, any visitor can self-register →
become `authenticated` → and (under today's permissive `authenticated` policies) gain full read/write.
So "restrict to authenticated" is necessary but **not sufficient** on its own. **[REQUIRES BUSINESS CONTEXT]**
whether open signup is intended.

---

## 3. MarginOS Security Exposure  **[CONFIRMED]**

- RLS **enabled** on all 12 tables, but 11 operational tables carry one policy:
  `"Policy with security definer functions"` → `FOR ALL TO {anon, authenticated} USING (true)`.
- `anon` **and** `authenticated` hold `SELECT/INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES` on all 12.
- **Net effect:** anyone with the (publicly-shipped) anon key can read, modify, **delete, or TRUNCATE**
  customers, prices, costs, simulations, and BOM data directly via the REST API — no login required.
- **`Usuarios_MarginOS`** is the exception and the **template to copy**: RLS restricts to the caller's own
  row; writes are blocked (no write policy).
- **[INFERENCE]** The same permissive pattern likely affects other systems in the shared DB (many
  `CRM_*` tables are `rls_enabled=true` but their policies were not audited here) — a **project-wide**
  concern beyond MarginOS.

---

## 4. Proposed Role / Access Matrix  **[RECOMMENDATION]**

Per-table target access classification. "Server-only" = should be writable only via a service-role/back-end
path (not directly from the browser), a **future** posture (the app currently writes from the browser).

| Table | Current (CONFIRMED) | App flows (read / write) | Target access (RECOMMENDATION) |
|---|---|---|---|
| `customers` | anon+auth ALL | R: Customers, Simulator, Dashboard, GlobalSearch, Customer modals · W: Customers page, CustomerCreateModal | **authenticated** (Phase 2: writes → admin/sales role) |
| `products` | anon+auth ALL | R: Products, PricingMgr, Simulator, Import, PriceList modals, GlobalSearch · W: ProductModal, ProductUpload, Import | **authenticated** read; **role-restricted** write (product admin) |
| `sales_channels` | anon+auth ALL | R: many · W: SalesChannel modal/upload | **authenticated** read; **role-restricted** write (admin) |
| `price_lists` | anon+auth ALL | R: Simulator, PricingMgr, PriceLists, Dashboard, GlobalSearch · W: PricingMgr, PriceList modals | **authenticated** read; **role-restricted** write (pricing role) |
| `simulations` | anon+auth ALL | R: Simulator, Scenarios, Customers, Dashboard, GlobalSearch · W: Simulator, Scenarios | **authenticated**; Phase 2: **owner/role** (via `created_by`) |
| `simulation_lines` | anon+auth ALL | R: Simulator, Scenarios, Customers, Dashboard · W: Simulator, Scenarios | **authenticated**; Phase 2: scoped by parent sim |
| `simulation_versions` | anon+auth ALL | R: Simulator, Scenarios, Customers · W: Simulator | **authenticated** |
| `bom_imports` | anon+auth ALL | R: Import, Dashboard · W: Import | **authenticated** read; **role-restricted** write (BOM admin) |
| `bom_products` | anon+auth ALL | R: Import, PricingMgr, Simulator, Costs, Recalc, GlobalSearch · W: Import | **authenticated** read; **role-restricted** write |
| `bom_components` | anon+auth ALL | R: Costs, Import · W: Import | **authenticated** read; **role-restricted** write |
| `component_costs` | anon+auth ALL | R: Costs, Import · W: CostModal, CostUpload | **authenticated** read; **role-restricted** write (cost admin) |
| `Usuarios_MarginOS` | **own-row (OK)** | R: Topbar (own) · W: none in app | **keep**; add admin-managed writes if needed |

**[REQUIRES BUSINESS CONTEXT]** the definition of roles (e.g. `admin`, `pricing`, `sales`, `viewer`) and
which flows each may perform — needed for the Phase-2 role scoping and to wire `Usuarios_MarginOS.rol`.

---

## 5. RLS Hardening Strategy  **[RECOMMENDATION]** (no SQL generated)

Per the required 10-point structure, applied as a **two-phase** design. (1)–(2) covered in §3–§4.

**Phase 1 — Remove anonymous access (low risk, do first).** For each of the 11 operational tables:
3. **Access level:** `authenticated` (no anon).
4. **SELECT policy:** allow `authenticated`, `USING (true)` (unchanged behavior for logged-in users).
5. **INSERT policy:** allow `authenticated`, `WITH CHECK (true)`.
6. **UPDATE policy:** allow `authenticated`, `USING (true) WITH CHECK (true)`.
7. **DELETE policy:** allow `authenticated`, `USING (true)`.
8. **Grants:** **revoke all from `anon`**; keep `authenticated` (defense-in-depth alongside RLS).
9. **Risk of breaking the app:** **[CONFIRMED] Low** — the app runs as `authenticated`; only login/signup
   use anon and they don't touch these tables. Residual risk: any external anon integration we don't know
   about **[REQUIRES BUSINESS CONTEXT]** (none found in this repo).
10. **`Usuarios_MarginOS`:** already correct — leave SELECT-own; optionally add role-guarded write policies.

**Phase 2 — Least privilege (needs roles; higher effort).**
- Split read vs write: reads stay `authenticated`; **writes** move to role-restricted (via
  `Usuarios_MarginOS.rol` / a JWT claim / a `security definer` check) for masters, pricing, costs, BOM.
- Scope `simulations`/`simulation_lines` by **owner** (`created_by = auth.uid()`) or team, if desired.
- Consider **server-only writes** (service-role via a thin API) for sensitive mutations (costs, prices),
  removing direct browser writes entirely.
- Revisit **open signup** (§2) — restrict registration or gate new users to a `viewer` role by default.

**Recommended migration ORDER (Phase 1):**
1. **[RECOMMENDATION]** Confirm signup policy & whether any external anon consumer exists (§2). 
2. Re-verify PKs (§10) — unrelated but cheap, do alongside.
3. Apply Phase-1 policy+grant change to the **append/BOM tables first** (`bom_imports`, `bom_products`,
   `bom_components`, `simulation_versions`) — lowest UI churn — then **masters** (`products`,
   `sales_channels`, `customers`), then **pricing/simulation** (`price_lists`, `simulations`,
   `simulation_lines`, `component_costs`). Smoke-test the app after each group.
4. Leave `Usuarios_MarginOS` as-is.
5. Defer Phase 2 until roles are defined.

> **[RECOMMENDATION]** Because the DB is shared, coordinate the RLS change with whoever owns the other
> systems, and scope the migration strictly to the 12 MarginOS tables.

---

## 6. Shared Supabase Landscape  **[CONFIRMED]**

- `public` schema: **173 tables**. MarginOS owns **12**; the app references **only** those 12 (+ its own
  `Usuarios_MarginOS`). **[CONFIRMED]** MarginOS is isolated at the code level.
- The remainder span: a large **CRM** (`CRM_*`, ~45 tables), service/repair (`Servicios*`, `Repuestos*`,
  `Defectos`, `queja*`), **WhatsApp** (`whatsapp_*`, `chat_history`), **inventory** (`inventario_*`,
  `movimientos_inventario`), **KPI/fact** (`sales_fact`, `orders_fact`, `deliveries_fact`, `budget_fact`),
  **procurement/negotiation** (`Neg_*`), furniture/kitchen catalogs (`furniture*`, `kitchen*`), plus many
  `*_Backup_*`, `prueba*`, `clase_esteban` scratch/legacy tables.
- **[INFERENCE]** Ownership by system is suggested by consistent frameworks (e.g. `CRM_*` all share
  `_sync_metadata`, `created_by/updated_by`, `is_deleted`), but **[REQUIRES BUSINESS CONTEXT]** — do not
  assume ownership from names.

---

## 7. Existing CRM / Product / Pricing Assets  **[CONFIRMED columns]**

Columns are real (from `02_columns.csv`). Relationships are **[INFERENCE]** unless a FK was exported.

| Table | Cols | Purpose (INFERENCE) | Key columns (CONFIRMED) | MarginOS uses? |
|---|---|---|---|---|
| `CRM_Cuentas` | 27 | CRM **customer/account master** | nit, nombre, direccion, ciudad, email, `canal_id`, `pais_id`, `es_premium`, `owner_user_id`, `comentarios`, `ignorar_limites_descuento`, audit + `_sync_metadata`, `is_deleted` | **No [CONFIRMED]** |
| `CRM_Contactos` | 13 | Contacts per account | `account_id`, nombre, cargo, email, es_principal | No |
| `CRM_Clientes_Premium` | 12 | Premium tier of accounts | `cuenta_id`, nivel_premium, canal_id, owner_user_id | No |
| `CRM_Productos` | 15 | CRM **product master** | `sku`, nombre, `precio_base`, `moneda_id`, `planta`, `familia`, is_active, audit, `_sync_metadata` | No |
| `CRM_ListaDePrecios` | 18 | **Commercial price list by article** | `numero_articulo`, `lista_base_cop`, `distribuidor_pvp_iva`, `pvp_sin_iva`, `lista_base_exportaciones`, `lista_base_obras`, `precio_feria`, `descuentos_volumen`(jsonb), planta, familia, audit | No |
| `CRM_Currencies` | 11 | Currency master | code, name, symbol, is_base | No |
| `CRM_ExchangeRates` | 12 | **FX rates** (TRM) | `base_code`, `quote_code`, `rate`, `rate_date`, source | No |
| `CRM_Cotizaciones` | 19 | **Quotations** | opportunity_id, numero_cotizacion, total_amount, currency_id, status, `sap_doc_entry`/`num` | No |
| `CRM_CotizacionItems` | 15 | Quote line items | `cotizacion_id`, `producto_id`, cantidad, precio_unitario, `discount_pct`, `max_discount_pct`, final_unit_price, subtotal | No |
| `CRM_Pedidos` | 70 | **Sales orders + commercial terms** | Incoterm, Puerto embarque/destino, Términos de pago, Vía/transporte, Flete, Seguro, cliente_final, nit, contactos, entrega_en_obra, cotizacion_id | No |
| `CRM_SapIntegrationQueue` | 16 | **SAP integration queue** | entity_type, entity_id, payload(jsonb), status, `sap_doc_entry`/`num`, processed_at | No |
| `sales_fact` | 41 | **Sales-history fact/warehouse** | document_date, sellers, zone, customer_code/name, product_family, item_code, quantity, sale_price, discount_percent, net_price, unit_cost, gross_profit, gross_margin, customer_segment | No |
| `product_costs` | 7 | **Effective-dated product cost** — **FK to MarginOS `products`** | `product_id → products(id)` [CONFIRMED FK], `cost_mp`, `source`, `effective_date` | **No** (unused, but coupled) |
| `Neg_historial_precios` | 15 | **Supplier** price-change history (procurement) | product_id(int8), precio_anterior/nuevo, ahorro_generado, supplier_*, porcentaje_base/negociado | No |
| `Neg_base` / `Neg_productos` | 8 / 12 | Supplier negotiation base data | Codigo_provedor, Precio, supplier_* | No |
| `Clientes` | 6 | Legacy/simple customer table (int8 id) | tipo_de_cliente(enum), nit, nombre, creado_por | No |
| `Productos` | 15 | **Furniture/kitchen** product catalog (int8 id) | sku, grupo, codigo_barras, `color_mueble`, `diseno_mueble`, `medida_*` | No |
| `productos_base` | 5 | Base furniture catalog | sku_base, descripcion, grupo | No |
| `precioszonas` | 5 | Logistics zone tariffs | Zona, Departamento, Ciudad, Tarifa | No |

---

## 8. Reuse vs Integration Assessment

Classification per the required scheme. Ownership is **[INFERENCE]**; final calls **[REQUIRES BUSINESS CONTEXT]**.

| Table | Overlap with CI roadmap | Classification | Rationale |
|---|---|---|---|
| `CRM_Cuentas` | customers + customer commercial terms | **D — Requires business context** (lean B: integration/source) | Far richer customer master (channel, country, owner, premium, SAP-synced). Likely the org's real account master → MarginOS should probably **integrate/source**, not duplicate. |
| `CRM_ListaDePrecios` | commercial price lists / channels | **D** (lean B) | Already has distribuidor/exportaciones/obras/feria prices + volume discounts by article. Strong conceptual overlap with `commercial_price_lists`. |
| `CRM_ExchangeRates` + `CRM_Currencies` | currency/TRM conversion | **B — Integration/source candidate** | A proper FX-rate source beats MarginOS's per-row `trm`/`conversion_trm`. Could feed TRM. |
| `CRM_Cotizaciones` / `CRM_CotizacionItems` | simulations/quoting | **D** | Real quoting w/ discounts + SAP doc linkage; overlaps "negotiation/quote". Relationship to MarginOS simulations needs a business decision. |
| `CRM_Pedidos` | customer commercial terms (Incoterm, ports, payment, freight) | **B/D** | The exact terms the CI roadmap wants already exist (as order-level free-text `EXTRA_*`). Source of truth for terms? |
| `CRM_SapIntegrationQueue` | future SAP sync | **B — Integration/source candidate** | Existing SAP sync mechanism MarginOS could reuse rather than invent. |
| `sales_fact` | sales history / KPIs | **B** | Ready sales-history warehouse (margins, costs, segments) — strong for KPI/analytics. |
| `product_costs` | cost history (component/MP) | **A/D — Strong reuse candidate, needs context** | uuid, **FK'd to MarginOS `products`**, `effective_date` = historized MP cost. May already be the intended cost-history table. Confirm owner/status. |
| `Neg_historial_precios` / `Neg_*` | historical prices (buy-side) | **C — External** | Supplier/procurement negotiation, not customer pricing. Useful **pattern** reference only. |
| `Clientes` | customers | **E — Likely legacy** (evidence: int8 id, only 6 cols, superseded by `CRM_Cuentas`) — **verify** | Simple older table; not used by MarginOS. |
| `Productos` / `productos_base` | products | **C — External** | Furniture/kitchen catalog (color_mueble, medidas) — a different product domain than FIRPLAK SAP `products`. |
| `precioszonas` | logistics | **C — External** | Zone shipping tariffs. |

**Risk of duplication (headline):** **[INFERENCE/HIGH]** Building MarginOS-native `customer_commercial_terms`,
`commercial_price_lists`, and a customer master risks creating a **third** customer/pricing source of truth
alongside `CRM_Cuentas`/`CRM_ListaDePrecios` (and legacy `Clientes`). This must be resolved with the CRM
owners before Commercial Data Model v1.

---

## 9. Application ↔ Database Drift  **[CONFIRMED defects]**

### Defect 1 — `simulations.reference`
- **[CONFIRMED]** [`GlobalSearchModal.tsx`](../../src/components/GlobalSearchModal.tsx) selects `reference`
  and filters `.or("reference.ilike…")`; the column **does not exist** (Postgres `42703`).
- **User impact:** **[INFERENCE]** the simulations branch of global search errors (400) → simulations
  don't appear in search results (or the search errors), likely silently.
- **Repair options:** (a) **app change** — remove `reference` from the select + `.or` (use `project_name`
  only); (b) **db change** — add a `reference` column (human-facing quote/reference number).
- **Recommendation:** **[RECOMMENDATION]** **App change** now (safe, no schema/RLS risk, nothing writes
  `reference`). Only add a column later **if** the CI design introduces a real quote/reference number
  (note `CRM_Cotizaciones.numero_cotizacion` already models this concept).

### Defect 2 — `simulation_versions.version_type`
- **[CONFIRMED]** [`customers/page.tsx`](../../src/app/customers/page.tsx) selects
  `version_type, original_simulation_id, created_at`; `version_type` **does not exist** (`42703`).
- **User impact:** **[INFERENCE]** that query 400s → the customer-detail version info (CLONE vs
  COST_UPDATE badge) fails to load.
- **Repair options:** (a) **app change** — stop selecting `version_type`; (b) **db change** — add
  `version_type` if version typing is a real requirement (VersionModal has CLONE/COST_UPDATE concepts,
  but `simulation_versions` only stores original/renewed links).
- **Recommendation:** **[RECOMMENDATION]** **App change** now. If version typing matters, add the column
  in a deliberate, separate migration (out of scope here).

> Both are **read-only** defects; core save/costing flows are unaffected. **Not implemented** (per scope).

---

## 10. PK Re-verification Query  **[RECOMMENDATION — run read-only]**

`03_primary_keys.csv` (via `information_schema`) returned PKs for only 6 of 12 tables. Run this
**authoritative** query against `pg_constraint` (read-only) in the Supabase SQL Editor and export as
`03b_primary_keys_pg_constraint.csv`:

```sql
-- Authoritative PK columns per MarginOS table (READ ONLY; pg_constraint contype='p')
select
  rel.relname            as table_name,
  con.conname            as pk_constraint,
  att.attname            as pk_column,
  k.ord                  as column_order
from pg_constraint con
join pg_class      rel on rel.oid = con.conrelid
join pg_namespace  nsp on nsp.oid = rel.relnamespace
join lateral unnest(con.conkey) with ordinality as k(attnum, ord) on true
join pg_attribute  att on att.attrelid = con.conrelid and att.attnum = k.attnum
where con.contype = 'p'
  and nsp.nspname = 'public'
  and rel.relname in (
    'customers','products','sales_channels','price_lists','simulations',
    'simulation_lines','simulation_versions','bom_imports','bom_products',
    'bom_components','component_costs','Usuarios_MarginOS'
  )
order by table_name, column_order;
```

Companion — **which of the 12 lack a PK constraint** (expect: none):

```sql
select t.tbl as table_name, (con.conname is not null) as has_pk_constraint, con.conname as pk_constraint
from (values
  ('customers'),('products'),('sales_channels'),('price_lists'),('simulations'),
  ('simulation_lines'),('simulation_versions'),('bom_imports'),('bom_products'),
  ('bom_components'),('component_costs'),('Usuarios_MarginOS')
) as t(tbl)
left join pg_class     rel on rel.relname = t.tbl
left join pg_namespace nsp on nsp.oid = rel.relnamespace and nsp.nspname = 'public'
left join pg_constraint con on con.conrelid = rel.oid and con.contype = 'p'
order by has_pk_constraint, table_name;
```

> **[RECOMMENDATION]** Until this returns a PK row for all 12, do **not** assert the PKs in the final
> baseline; `supabase/schema.sql` currently notes the 6 as "verify."

---

## 11. Architecture Decisions Required  **[REQUIRES BUSINESS CONTEXT]**

1. **Anon lockdown approval:** approve Phase-1 RLS/grant hardening (remove anon) on the 11 operational
   tables. (App-safe per §2.)
2. **Signup policy:** should public signup remain enabled? Default role for new users?
3. **Roles model:** define roles (admin/pricing/sales/viewer…) and map to write permissions to enable
   Phase-2 and to wire `Usuarios_MarginOS.rol`/`permisos`.
4. **CRM reconciliation (biggest):** for customers, product master, price lists, FX, terms, and sales
   history — does MarginOS **reuse / integrate with / stay separate from** `CRM_Cuentas`,
   `CRM_ListaDePrecios`, `CRM_ExchangeRates`, `CRM_Pedidos`, `sales_fact`? Who owns them?
5. **`product_costs` ownership/status:** is this the intended historized product-cost table (it's already
   FK'd to MarginOS `products`)? Reuse for cost history, or leave external?
6. **Schema placement:** new commercial entities in shared `public` or a dedicated `commercial` schema?
7. **SAP path:** reuse `CRM_SapIntegrationQueue` vs a MarginOS-specific mechanism?
8. **Drift repairs:** approve the two app-side fixes (§9) as a small cleanup.

---

## 12. Recommended Next Steps  **[RECOMMENDATION]**

1. **Run the PK verification query** (§10); update `supabase/schema.sql` PK notes accordingly.
2. **Decide CRM reconciliation (§11.4)** — this is the gating decision for Commercial Data Model v1;
   convene MarginOS + CRM owners. Until resolved, do **not** design new customer/pricing tables.
3. **Approve & schedule Phase-1 RLS hardening** (remove anon) — independent of the CI model, high value,
   low risk; coordinate across shared-DB owners.
4. **Confirm signup posture** and, if needed, gate new users.
5. **Queue the two drift fixes** (§9) as a minor app cleanup (separate task).
6. Only **after** 2–3, proceed to a **Commercial Data Model v1** design that explicitly states
   reuse/integration boundaries with the CRM suite.

*No database, RLS, migration, or application code was modified. Nothing was committed.*
