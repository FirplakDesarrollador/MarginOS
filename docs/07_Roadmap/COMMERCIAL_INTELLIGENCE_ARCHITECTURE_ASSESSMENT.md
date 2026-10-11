# MarginOS — Commercial Intelligence Platform: Architecture Assessment

> **Type:** READ-ONLY architecture assessment. No code, schema, or migration was created or modified.
> **Method:** Every table/column claim below is **observed in application code** (Supabase
> `.from().select()/.insert()/.update()/.upsert()`). **There are no `.sql`, schema, or migration
> files in the repository** — the Supabase schema is not version-controlled here — so column lists
> are *evidence from code*, not an authoritative DDL. Anything not confirmable from code is marked
> **[UNCONFIRMED]**.
> **Labels used:** *Implemented* = present in code today · *Recommendation* = proposal, not built ·
> *Open decision* = needs Product Owner input.

---

## 1. Executive Summary

MarginOS today is a **product-and-channel pricing + simulation** system backed by Supabase. Its data
model is organized around three current-state masters (`products`, `customers`, `sales_channels`),
a product×channel **base price table** (`price_lists`), a **BOM costing chain**
(`bom_imports → bom_products → bom_components` + `component_costs`), and an **append-style simulation
history** (`simulations`, `simulation_lines`, `simulation_versions`).

The vision — evolving MarginOS into FIRPLAK's **commercial source of truth** queried by AI through a
controlled layer — is **achievable by extension, not rebuild**. The existing masters are clean anchors.
The main structural gaps are all in the **commercial dimension**:

- `customers` holds only identity/contact data — **no commercial terms** (country, market, Incoterm, payment terms, etc.).
- There is **no customer-specific product coding** anywhere.
- `price_lists` is **product×channel, current-state, and effectively overwritten on edit** — it has **no customer/market/Incoterm dimension and does not preserve price history** despite having validity columns.
- There is **no product-assets** concept.

**Headline recommendation:** Add a **new commercial layer** (customer commercial terms, customer product
mapping, a header/item commercial price-list model, product assets) *alongside* the existing tables, keep
the current pricing/costing/simulation paths untouched, and expose everything to AI later through
**read-model endpoints/views**, never raw tables. This preserves all nine critical functions while
unlocking the commercial-intelligence roadmap.

---

## 2. Current Data Model

> Columns below are **observed in code** (file:line references given). Types are inferred from usage.
> Primary keys are assumed `id uuid` unless a different key is evidenced. FK targets are inferred from
> join columns and usage, **not** from confirmed constraints.

### 2.1 `customers` — customer master (current-state)
- **Columns (observed):** `id`, `name`, `nit`, `contact_name`, `email`, `default_channel_id`, `notes`.
  ([customers/page.tsx:34-43](../../src/app/customers/page.tsx), [CustomerCreateModal.tsx:74-81](../../src/components/CustomerCreateModal.tsx))
- **FKs (inferred):** `default_channel_id → sales_channels.id`.
- **Read by:** Customers, Simulator (customer select), Global Search, Dashboard. **Written by:** Customers page, CustomerCreateModal.
- **State:** current-state (update-in-place). **No commercial-terms fields.**
- **Disposition:** **Reuse + Extend** (do not overload; move commercial terms to a related table — §3).

### 2.2 `products` — FIRPLAK product master (current-state)
- **Columns (observed):** `id`, `sap_code`, `description`, `category`, `uom`, `is_active`, `target_margin_pct`.
  ([products/page.tsx:15-20,43](../../src/app/products/page.tsx), [ProductModal.tsx:101-108](../../src/components/ProductModal.tsx))
- **Read by:** Products, Pricing Manager, Simulator, Import (upsert of missing), Price Lists modals, Global Search. **Written by:** ProductModal, ProductUploadModal, Import (auto-create missing).
- **State:** current-state. **Disposition:** **Reuse (single master) + light Extend** (§Task 2 in §5).

### 2.3 `sales_channels` — channel master (current-state)
- **Columns (observed):** `id`, `name`, `default_currency`, `min_margin_pct`, `is_active`.
  ([SalesChannelModal.tsx:15-20](../../src/components/SalesChannelModal.tsx))
- **Read by:** Customers, Pricing Manager, Price Lists, Sales Channels, Global Search, Dashboard. **Written by:** SalesChannelModal, SalesChannelUploadModal.
- **State:** current-state. **Disposition:** **Reuse, leave untouched.**

### 2.4 `price_lists` — product×channel base pricing (see §6 for deep dive)
- **Columns (observed):** `id`, `product_id`, `channel_id`, `currency`, `list_price`, `net_price`,
  `target_margin_pct`, `max_discount_pct`, `valid_from`, `valid_to`, `is_active`, `applies`,
  `not_applicable_reason`, `conversion_trm`, `created_at`.
  ([pricing-manager/page.tsx:230-233,363-391](../../src/app/pricing-manager/page.tsx), [PriceListModal.tsx:139-147](../../src/components/PriceListModal.tsx), [simulator/page.tsx:245-256](../../src/app/simulator/page.tsx))
- **FKs (inferred):** `product_id → products.id`, `channel_id → sales_channels.id`.
- **Read by:** Simulator (latest active by `created_at`), Pricing Manager, Price Lists, Dashboard (coverage), Global Search. **Written by:** Pricing Manager (upsert by `id`), PriceListModal/UploadModal (insert).
- **State:** **current-state in practice** (Pricing Manager updates in place → prior values lost). **Disposition:** **Reuse & leave untouched for base pricing; do NOT repurpose** (§6).

### 2.5 `simulations` — simulation headers (append + status lifecycle)
- **Columns (observed):** `id`, `customer_id`, `channel_id`, `simulation_type`, `project_name`,
  `currency`, `trm`, `valid_from`, `valid_to`, `status`, `target_margin_pct`, `commission_pct`,
  `commission_amount`, `real_revenue_after_commission`, `reference`, `created_at`.
  ([simulator/page.tsx:414-427](../../src/app/simulator/page.tsx), [scenarios/page.tsx:29-39](../../src/app/scenarios/page.tsx), [GlobalSearchModal.tsx:63](../../src/components/GlobalSearchModal.tsx))
- **FKs (inferred):** `customer_id → customers.id`, `channel_id → sales_channels.id`.
- **State:** historical/lifecycle (`status`: DRAFT/VIGENTE/RECHAZADA/RENOVADA…). **Disposition:** **Reuse, leave untouched.**

### 2.6 `simulation_lines` — simulation line items (append)
- **Columns (observed):** `simulation_id`, `product_id` (nullable), `sap_code`, `description`, `qty`,
  `list_price`, `discount_pct`, `net_price`, `cost_mp`, `margin_pct`, `contribution_value`.
  ([simulator/page.tsx:462-473](../../src/app/simulator/page.tsx))
- **FKs (inferred):** `simulation_id → simulations.id`, `product_id → products.id`.
- **State:** historical snapshot (stores `cost_mp`, computed margin/contribution at save time). **Disposition:** **Reuse, leave untouched.**

### 2.7 `simulation_versions` — simulation lineage (append)
- **Columns (observed):** `original_simulation_id`, `renewed_simulation_id`, `version_type`, `created_at`.
  ([simulator/page.tsx:608-611](../../src/app/simulator/page.tsx), [customers/page.tsx:302](../../src/app/customers/page.tsx))
- **State:** historical lineage (CLONE / COST_UPDATE / renewal). **Disposition:** **Reuse; a useful precedent for the historical strategy (§7).**

### 2.8 `bom_imports` — BOM upload records (append)
- **Columns (observed):** `id`, `file_name`, `source`, `imported_at`.
  ([import/page.tsx:314](../../src/app/import/page.tsx))
- **State:** append/history. **Disposition:** **Reuse, leave untouched.**

### 2.9 `bom_products` — per-import product BOM snapshot (append, dedup)
- **Columns (observed):** `id`, `bom_import_id`, `product_id` (nullable), `sap_code`, `description`,
  `recalculated_cost_mp`, `componentes_count`, `excluidos_pz_count`, `created_at`.
  ([import/page.tsx:397-404](../../src/app/import/page.tsx), [pricing-manager/page.tsx:217](../../src/app/pricing-manager/page.tsx))
- **FKs (inferred):** `bom_import_id → bom_imports.id`, `product_id → products.id`.
- **State:** **historical snapshots** (latest picked by `created_at`; dedup by cost+structure fingerprint). **Disposition:** **Reuse, leave untouched.**

### 2.10 `bom_components` — BOM component rows per snapshot (append)
- **Columns (observed):** `bom_product_id`, `codigo`, `cantidad`, `costo_excel_fallback`, `nivel`, `parent_codigo`.
  ([import/page.tsx:470-473](../../src/app/import/page.tsx), [admin/costs/page.tsx:67-70](../../src/app/admin/costs/page.tsx))
- **FK (inferred):** `bom_product_id → bom_products.id`.
- **Known gap:** **no `description` column** — recalculation resolves descriptions from `component_costs` ([admin/costs/page.tsx:83-94](../../src/app/admin/costs/page.tsx)). **Disposition:** **Reuse; candidate to Extend (add `description`) — see §11.**

### 2.11 `component_costs` — real component unit costs (current-state, keyed by code)
- **Columns (observed):** `codigo` (**unique** — upsert `onConflict:"codigo"`), `costo_unitario`, `moneda`, `description`, `created_at`.
  ([CostModal.tsx:70-74](../../src/components/CostModal.tsx), [CostUploadModal.tsx:77](../../src/components/CostUploadModal.tsx), [admin/costs/page.tsx:86](../../src/app/admin/costs/page.tsx))
- **Note:** keyed by **`codigo` string**, not a `products.id` FK. **State:** current-state (upsert overwrites). **Disposition:** **Reuse; candidate for cost history (§7) and SAP sync (§8).**

### 2.12 `Usuarios_MarginOS` — app users
- **Columns (observed):** `uuid` (→ `auth.users`), `nombre`. ([Topbar.tsx:56-60](../../src/components/Topbar.tsx))
- **Disposition:** **Reuse, leave untouched** (identity, out of commercial scope).

### 2.13 Current-state vs historical summary

| Table | Data nature | Overwrite risk |
|---|---|---|
| `customers`, `products`, `sales_channels` | current-state masters | update-in-place (expected) |
| `component_costs` | current-state (by `codigo`) | **upsert overwrites — no cost history** |
| `price_lists` | *intended* validity, *actually* current-state | **Pricing Manager update-in-place overwrites price history** |
| `bom_imports`, `bom_products`, `bom_components` | append/history | new rows per import (safe) |
| `simulations`, `simulation_lines`, `simulation_versions` | append/history + lifecycle | safe |

---

## 3. Existing Tables We Should Reuse

Reuse **as-is** (no change needed for the roadmap):
- `sales_channels`, `simulations`, `simulation_lines`, `simulation_versions`, `bom_imports`,
  `bom_products`, `Usuarios_MarginOS`.
- `price_lists` — **reuse for its current purpose only** (product×channel base pricing feeding the
  Simulator's default list price). Do **not** bend it to carry customer/market/history (§6).

These are the stable anchors the new commercial layer should reference by FK (`products.id`,
`customers.id`, `sales_channels.id`).

---

## 4. Existing Tables We Should Extend

| Table | Proposed extension | Rationale | Risk |
|---|---|---|---|
| `products` | small, universal attributes only (e.g. `brand`/`line`, `status` if needed) | single master must stay authoritative; avoid a 2nd product master | Low |
| `customers` | **do not widen** — attach a related `customer_commercial_terms` table instead | terms are temporal & multi-valued; columns would force current-state only | Low (additive) |
| `component_costs` | optional `product_id` link and/or cost-history table | enables SAP sync + cost-at-price-time (§7/§8) | Low–Med |
| `bom_components` | add `description` column (already flagged debt) | closes the MAQUILA-recalc gap (§11) | Low (additive) |

**Principle:** extend by **adding related tables**, not by widening masters into current-state-only wide rows.

---

## 5. New Business Domains Required

Grounded in the gaps above. Names are **conceptual**; final schema is an Open Decision (§14).

### Task 2 — Products (enrich safely, keep one master)
- **Exists on `products`:** identity (`sap_code`), `description`, `category`, `uom`, `is_active`, `target_margin_pct`.
- **Depends on `products.id`:** `price_lists`, `simulation_lines`, `bom_products`, and Pricing Manager/Simulator/Import flows. Enriching is **safe if additive** (new nullable columns / new related tables); **renaming or removing existing columns is High risk**.
- **Keep on `products`:** SAP identity + universal, single-valued, current-state attributes (category, uom, active, base target margin).
- **Move to related tables:** customer-specific codes → `customer_products` (Task 4); marketing/media → `product_assets`; competitor data → a future `competitor_*` domain. **We do NOT create a second product master.**

### Task 3 — Customers (identity vs commercial terms)
- **Exists on `customers`:** `name`, `nit`, `contact_name`, `email`, `default_channel_id`, `notes`.
- **Relationship to `sales_channels`:** single `default_channel_id` (one default channel per customer).
- **Relationship to `simulations`:** `simulations.customer_id → customers.id` (one-to-many).
- **Commercial info stored directly today:** effectively **none** beyond `default_channel_id` + free-text `notes`.
- **Classification of the requested commercial terms:**

| Term | Today | Where it should live |
|---|---|---|
| country | **Missing** | `customer_commercial_terms` |
| market | **Missing** | `customer_commercial_terms` |
| channel | Partial (`customers.default_channel_id`) | terms row may override per period |
| currency | **Missing** on customer (exists on simulation/price row) | `customer_commercial_terms` |
| usual Incoterm | **Missing** | `customer_commercial_terms` |
| destination / port | **Missing** | `customer_commercial_terms` |
| payment terms | **Missing** | `customer_commercial_terms` |
| discounts | **Missing** (per-price only) | `customer_commercial_terms` |
| commissions | **Missing** on customer (exists per simulation) | `customer_commercial_terms` |
| agreed lead time | **Missing** | `customer_commercial_terms` |
| logistics conditions | **Missing** | `customer_commercial_terms` |
| exclusivity | **Missing** | `customer_commercial_terms` |
| commercial observations | Partial (`notes`, non-temporal) | `customer_commercial_terms` (temporal) |
| other customer-specific terms | **Missing** | `customer_commercial_terms` (extensible) |

- **Keep on `customers`:** stable identity (name, nit, contacts, default channel).
- **Move/introduce:** all temporal commercial conditions into a historized `customer_commercial_terms` (§7).

### Task 4 — Customer products (customer-specific coding)
- **Search result: nothing like this exists.** `products` has only FIRPLAK `sap_code`; `simulation_lines`
  copies FIRPLAK `sap_code`/`description`; no table maps a customer's own SKU to a FIRPLAK product.
- **Requirement:** one `products.id` ↔ many customer codes (Customer A `10058273`, Customer B `SKU-8821`).
- **Recommendation:** a new `customer_products` mapping — `(customer_id, product_id, customer_sku, customer_description, …)`, **never** a customer code column on `products` (would break the single-master rule and 1:N).

### Product assets
- **Nothing exists** (no image/asset table; the stale `image_url` in `src/types/index.ts` is **not** on the live `products` table). New `product_assets` (image, datasheet, render, etc.) keyed by `product_id`.

### Competitor intelligence / AI access
- Future domains — not modeled today; see §8/§9.

---

## 6. Pricing Architecture Assessment (critical)

### 6.1 What `price_lists` means **today** (Implemented)
- **Granularity:** one row per **`(product_id, channel_id)`** (+ `currency`). **No customer, market/country, or Incoterm dimension.**
- **Uniqueness:** enforced **in application code only** — PriceListModal blocks a duplicate `(product, channel)` ([PriceListModal.tsx:125-137](../../src/components/PriceListModal.tsx)); Pricing Manager loads/updates one row per channel for a product. A DB unique constraint is **[UNCONFIRMED]** (no schema file).
- **Relationship to products / channels:** `product_id → products.id`, `channel_id → sales_channels.id`.
- **How Pricing Manager writes it:** computes `net`/`list` from `target_margin_pct`, `max_discount_pct`, BOM cost and (for USD) `conversion_trm`; then **`upsert(..., { onConflict: "id" })` — update-in-place** ([pricing-manager/page.tsx:401-406](../../src/app/pricing-manager/page.tsx)). **Prior values are overwritten.**
- **How Simular Negocio reads it:** selects `list_price` for `(product_id, customer.default_channel_id, is_active=true)`, `order by created_at desc limit 1` ([simulator/page.tsx:245-256](../../src/app/simulator/page.tsx)) — i.e. **latest active row wins**.
- **Historical behavior:** the reader implies history (created_at ordering), but the **writer overwrites**, so **history is not actually preserved** for Pricing-Manager edits.
- **Validity behavior:** `valid_from`/`valid_to` are stored but **not used to filter** the Simulator read (only `is_active` + newest `created_at`).
- **Currency/TRM behavior:** row-level `currency`; USD rows store `conversion_trm`; USD net/list = COP ÷ TRM.
- **No Aplica behavior:** `applies=false` ⇒ `net_price/list_price` nulled/zeroed, `not_applicable_reason` set, excluded from active pricing; feeds Dashboard coverage.

### 6.2 New requirement
Commercial price lists varying by **customer, market/country, currency, Incoterm, validity period,
commercial conditions**, plus **full price history**. These dimensions are **orthogonal** to the current
product×channel base table.

### 6.3 Options & tradeoffs

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A. Extend `price_lists`** | add customer/market/Incoterm/version columns | one table | **High regression risk** — every reader/writer (Simulator, Pricing Manager, Price Lists, Dashboard, Global Search) assumes product×channel current-state; changing grain/uniqueness breaks the "latest active" read and the dedup logic. Sparse columns, muddled semantics. |
| **B. Separate header/item model** — `commercial_price_lists` (header: customer/market/currency/Incoterm/validity/status) + `commercial_price_list_items` (per product: price, discount, cost-at-creation) | **Recommended** | clean separation; base pricing untouched; native history via header versions; matches the requested dimensions; safe additive rollout | more tables; needs a resolution rule for "which price applies" (base vs commercial) in Simulator later |
| **C. Other** (e.g. generic temporal `prices` with a `scope` discriminator) | single polymorphic price table | flexible | weak typing, harder constraints/history guarantees, higher query complexity |

### 6.4 Recommendation
**Option B.** Keep `price_lists` as the **base product×channel list** (unchanged; still feeds the
Simulator default). Introduce a **commercial price-list layer** (`commercial_price_lists` +
`commercial_price_list_items`) for customer/market/Incoterm/validity/history. Later, define an explicit
**price-resolution order** (customer-commercial → channel-base) as a deliberate, tested change to the
Simulator — **out of scope here**.

---

## 7. Historical / Temporal Data Strategy

**Entities that need temporal history (Recommendation):** customer commercial terms, customer product
coding (mapping changes), commercial price lists, prices (items), and **the cost referenced at price
creation** (snapshot cost so a historical price is auditable).

**Precedent in the codebase:** `bom_products` already versions by append + `created_at` + fingerprint
dedup, and `simulation_versions` records lineage — reuse these patterns rather than inventing a new one.

**Recommended approach (no SQL yet):**
- **Effectivity columns:** `valid_from` (required), `valid_to` (nullable = open-ended), plus a `status`
  (e.g. `DRAFT | ACTIVE | SUPERSEDED | EXPIRED`).
- **Current vs historical:** treat "current" as *the ACTIVE row whose `[valid_from, valid_to)` contains
  today*, resolved at read time — not a mutable `is_current` flag that can drift.
- **Avoid destructive overwrites:** edits **insert a new version** and close the previous one
  (`valid_to` = new `valid_from`); never update-in-place for historized entities. (This is the exact
  behavior `price_lists` lacks today.)
- **Prevent conflicting active records:** enforce **no overlapping active periods** per business key
  (e.g. per `(customer_id, product_id, currency, incoterm)`), via a DB exclusion/partial-unique
  constraint — **Open decision** on exact grain (§14).
- **Cost-at-creation:** store the resolved MP cost on the price *item* at creation for auditability
  (immutable snapshot), independent of later `component_costs`/BOM changes.

**Note on `component_costs`:** today it is upsert-overwrite (no cost history). If historical price
auditability is required, add a cost-history/snapshot mechanism — **Open decision**.

---

## 8. SAP Integration Readiness (Recommendation, not implemented)

| Entity | Natural SAP role | Recommended source-of-truth |
|---|---|---|
| `products` (SAP `sap_code`) | product master | **SAP → MarginOS** eventually (SAP master, MarginOS mirror + commercial enrichment) |
| `component_costs` | component/material costs | **SAP → MarginOS** eventually (costs originate in SAP) |
| customer master (`customers`) | account master | Likely **SAP/CRM → MarginOS**, but commercial *terms* stay MarginOS-owned |
| `customer_products` (SKU mapping) | customer material mapping | Could sync from SAP customer-material info records; **MarginOS source until SAP mapping exists** |
| sales / history (`simulations*`) | quotations/negotiations | **MarginOS source-of-truth** (commercial intelligence lives here) |
| BOM (`bom_*`) | bill of materials | **SAP → MarginOS** (BOM originates in SAP; already imported via Excel) |

**Guidance:** MarginOS should remain source-of-truth for **commercial** artifacts (terms, commercial
price lists, simulations, customer SKU intent) and treat **masters/costs/BOM** as **SAP-owned** once a
sync exists — designing new tables with a stable external-key column (e.g. `sap_*`) now avoids a painful
migration later. **This is architecture guidance, not current behavior.**

---

## 9. Future AI Access Architecture (Recommendation, no AI implemented)

**Principle:** ChatGPT/MCP must **never** touch raw Supabase tables. Expose **curated, read-only models**
with row-level authorization, so internal schema can evolve without breaking AI consumers.

**Recommended read models / endpoints (views or API/MCP resources):**
- `customer_profile` — identity + default channel + active terms summary.
- `active_commercial_terms` — the currently-effective `customer_commercial_terms` row(s).
- `customer_coded_products` — join of `customer_products` ↔ `products` (customer SKU ↔ FIRPLAK SKU).
- `current_price_list` — resolved effective prices for a customer/market/date.
- `historical_prices` — versioned price history for a product/customer.
- `product_commercial_profile` — product + category + base margin + assets summary.
- `product_assets` — media/datasheets for a product.

**Controls (Recommendation):** read-only role, RLS on the underlying tables, per-endpoint field
whitelisting, no write paths, and auditing of AI queries. **Do not grant unrestricted table access.**

---

## 10. Compatibility Impact Matrix

Impact of introducing each **new/extended** domain on existing modules. *(New additive tables that
nothing currently reads are inherently low-impact; High appears only where a shared table's grain or a
read path would change.)*

| Proposed domain / change | Import BOM | Costos Reales | Pricing Manager | Price Lists | Simular Negocio | Customers | Scenarios | KPI Dashboard | Global Search |
|---|---|---|---|---|---|---|---|---|---|
| `customer_commercial_terms` (new) | None | None | None | None | **Low** (could inform defaults later) | **Medium** (new UI on customer) | None | **Low** (future segmentation) | **Low** (searchable) |
| `customer_products` (new) | None | None | None | **Low** | **Low** (show customer SKU) | **Low** | None | None | **Medium** (search by customer SKU) |
| `product_assets` (new) | None | None | None | None | **Low** | None | None | None | **Low** |
| `commercial_price_lists` + items (new, Option B) | None | None | **Low–Medium** (may add commercial view) | **Medium** (new list type UI) | **Medium–High** (price-resolution order becomes a deliberate change) | **Low** | None | **Low** | **Low** |
| Extend `products` (additive columns) | **Low** | None | **Low** | **Low** | **Low** | None | None | **Low** | **Low** |
| Extend `bom_components.description` (additive) | **Low** (populate on insert) | **Medium** (closes MAQUILA recalc gap) | None | None | None | None | None | None | None |
| `component_costs` history/snapshot | **Low** | **Medium** (write path change) | **Low** (cost-at-price) | None | **Low** | None | None | **Low** | None |
| **Repurpose `price_lists`** (Option A — *not recommended*) | None | None | **High** | **High** | **High** | **Low** | None | **Medium** | **Medium** |

**Why the highs:** any change to `price_lists` grain/semantics hits the Simulator's "latest active
`(product, channel)`" read, Pricing Manager's upsert/dedup, Price Lists CRUD, and Dashboard coverage
simultaneously — hence Option A is High across the pricing path, and Option B keeps that path at
Low–Medium by leaving `price_lists` intact.

---

## 11. Risks / Technical Debt

1. **No version-controlled schema.** The Supabase DDL is not in the repo; all schema knowledge is
   reverse-engineered from code. **Recommend committing schema (e.g. `supabase db pull`) before designing migrations.** **[UNCONFIRMED]** constraints/indexes/RLS.
2. **`price_lists` overwrites history.** Pricing Manager update-in-place destroys prior prices though
   validity columns exist — directly at odds with the "full price history" requirement (§6).
3. **`bom_components` lacks `description`.** Forces the MAQUILA recalc to resolve descriptions from
   `component_costs`; a maquila part without a cost row can be mis-excluded on recalc ([admin/costs/page.tsx:83-94](../../src/app/admin/costs/page.tsx)).
4. **`component_costs` keyed by `codigo` string, not `products.id`.** Cost↔product linkage is by code
   convention; complicates SAP sync and referential integrity.
5. **No `customer_products` and no `product_assets`** — two roadmap domains are entirely absent.
6. **Client-side writes with anon key.** All commercial writes happen in the browser; correctness/security
   depends on RLS, which is **[UNCONFIRMED]**. Adding an AI-facing layer raises the stakes.
7. **Uniqueness enforced in app code** (e.g. `(product, channel)` in `price_lists`) rather than confirmed
   DB constraints — risk of drift/duplicate rows.
8. **Stale `src/types/index.ts`** (e.g. `Channel` enum, `image_url`) doesn't match live tables — do not
   use it as the schema reference.

---

## 12. Recommended Target Model (conceptual, not DDL)

Keep the existing core; add a commercial layer that references it:

```
                 ┌─────────────┐        ┌────────────────┐
                 │  products   │        │ sales_channels │
                 └──────┬──────┘        └──────┬─────────┘
        ┌───────────────┼───────────────┐      │
        │               │               │      │
 ┌──────▼──────┐ ┌──────▼───────┐ ┌─────▼──────▼──┐        ┌───────────────┐
 │customer_    │ │ product_     │ │  price_lists  │  (base │  customers    │
 │products     │ │ assets       │ │ product×chan) │  keep) └──────┬────────┘
 └──────┬──────┘ └──────────────┘ └───────────────┘               │
        │  (customer SKU ↔ FIRPLAK)                                │
        │                                                          │
 ┌──────▼───────────────────────────────────────────────┐  ┌──────▼───────────────────┐
 │ commercial_price_lists (header: customer/market/      │  │ customer_commercial_terms │
 │ currency/incoterm/validity/status)                    │  │ (temporal terms, history) │
 │   └─ commercial_price_list_items (product, price,     │  └───────────────────────────┘
 │      discount, cost_at_creation)                      │
 └───────────────────────────────────────────────────────┘

 Existing untouched history chain:
   bom_imports → bom_products → bom_components ; component_costs
   simulations → simulation_lines ; simulation_versions

 AI/MCP layer (read-only VIEWS/endpoints) sits ON TOP — never raw tables.
```

- **Reuse untouched:** `sales_channels`, `simulations*`, `bom_*`, `price_lists` (base), `Usuarios_MarginOS`.
- **Extend (additive):** `products` (light), `bom_components` (+description), `component_costs` (cost history/link).
- **New:** `customer_commercial_terms`, `customer_products`, `commercial_price_lists`, `commercial_price_list_items`, `product_assets`; later `competitor_*`.
- **All temporal entities** follow the §7 effectivity/versioning pattern.

---

## 13. Recommended Implementation Phases (Recommendation)

- **Phase 0 — Schema baseline (prereq):** commit the real Supabase schema to the repo; document
  constraints/RLS. *(Unblocks safe migration design.)*
- **Phase 1 — Customer commercial terms:** add `customer_commercial_terms` (historized) + read model
  `active_commercial_terms`. Low blast radius; high business value.
- **Phase 2 — Customer products:** add `customer_products` mapping + Global Search by customer SKU.
- **Phase 3 — Product assets:** add `product_assets`.
- **Phase 4 — Commercial price lists (Option B):** header/item model with history; **no** change to the
  Simulator read yet (base pricing continues to drive simulation).
- **Phase 5 — Price resolution:** deliberately introduce commercial→base resolution in the Simulator, as
  a protected-logic change **with tests** (per `docs/TESTING.md`).
- **Phase 6 — SAP-readiness & AI read layer:** add external-key columns; build read-only views/MCP
  endpoints with RLS.
- **Cross-cutting debt (schedule anytime):** add `bom_components.description`; decide `component_costs`
  history.

---

## 14. Open Decisions Requiring Product Owner Approval

1. **Pricing architecture:** confirm **Option B** (separate commercial price-list header/item) vs A/C.
2. **Price uniqueness grain:** what business key must have **no overlapping active periods**? e.g.
   `(customer_id, product_id, currency, incoterm)` — or include market/channel?
3. **Base vs commercial precedence:** when both a base `price_lists` price and a commercial price exist,
   which wins in Simular Negocio, and from which date? (Drives Phase 5.)
4. **Customer terms grain:** are terms **per customer**, or per `(customer, market/country)` or
   `(customer, channel)`? Determines the `customer_commercial_terms` key.
5. **Cost history:** must historical prices retain the **cost at creation**, and does `component_costs`
   need full history (vs just snapshot-on-item)?
6. **SAP source-of-truth boundary:** confirm which entities SAP will own (products, costs, customer
   master, SKU mapping) and the sync direction/cadence.
7. **AI exposure scope:** which read models are in the first release, and what row-level authorization
   (per user/customer/region) applies?
8. **Schema governance:** approve committing the Supabase schema to the repo (Phase 0) before any
   migration work.
9. **`customer_products` semantics:** can one customer have **multiple** codes for one FIRPLAK product
   (and vice-versa)? Determines uniqueness on the mapping.
10. **Assets storage:** DB rows referencing Supabase Storage/URLs vs external DAM for `product_assets`.

---

*End of assessment. No code, schema, or migration was created or modified. This document is a
recommendation for review, not an implementation.*
