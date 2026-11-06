-- =============================================================================
-- MarginOS — Supabase schema baseline (Phase 0, AUTHORITATIVE reconstruction)
-- =============================================================================
--
--  Source: reconstructed from READ-ONLY introspection exports produced by the
--  Supabase SQL Editor on 2026-07-26, stored in supabase/introspection/*.csv
--  (01_tables_rls, 02_columns, 03_primary_keys, 04_foreign_keys,
--   05_unique_constraints, 06_check_constraints, 07_indexes, 08_triggers,
--   09_functions, 10_views, 11_rls_policies, 12_role_grants).
--
--  Scope: this file documents ONLY the 12 MarginOS tables. They live inside a
--  SHARED Postgres `public` schema that currently contains **173 tables** across
--  several unrelated FIRPLAK systems (CRM_*, service/repair, WhatsApp, inventory,
--  negotiation `Neg_*`, etc.). See docs/DATABASE_SCHEMA.md §Shared-Database.
--
--  ⚠️  DO NOT APPLY THIS FILE TO ANY DATABASE.
--      It is a documentation baseline of the CURRENT live state (including
--      insecure RLS policies). It is not a migration and must not be executed
--      against the live project. Types/defaults/constraints/indexes/triggers/
--      RLS/grants below are REAL (from introspection).
--
--  PK caveat: 03_primary_keys.csv returned PRIMARY KEY rows for only 6 of the 12
--  tables, yet every table has a `<table>_pkey` UNIQUE INDEX (07) and inbound
--  FOREIGN KEYs reference products(id)/simulations(id)/customers(id)/
--  sales_channels(id) — which Postgres only permits against a UNIQUE/PK
--  constraint. PRIMARY KEY (id) is therefore written for all 12 below; the 6
--  missing rows are treated as an incomplete export and flagged for re-check.
-- =============================================================================

-- Extension providing uuid_generate_v4() (uuid-ossp). Present in the live DB.
-- create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Shared trigger function (body NOT captured by introspection; signature real:
-- language plpgsql, returns trigger, security_definer=false, volatile).
-- Typical implementation shown for documentation only.
-- -----------------------------------------------------------------------------
-- create or replace function public.set_updated_at() returns trigger as $$
-- begin new.updated_at = now(); return new; end; $$ language plpgsql;

-- =============================================================================
-- TABLES
-- =============================================================================

-- ---- customers -------------------------------------------------------------- current-state master
create table public.customers (
  id                 uuid        not null default uuid_generate_v4(),
  name               text        not null,
  nit                text,
  contact_name       text,
  email              text,
  default_channel_id uuid,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint customers_pkey primary key (id)
);

-- ---- products --------------------------------------------------------------- current-state master (FIRPLAK product master)
create table public.products (
  id                uuid        not null default uuid_generate_v4(),
  sap_code          text        not null,
  description       text        not null,
  category          text,
  uom               text,
  is_active         boolean     not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  target_margin_pct numeric,
  constraint products_pkey primary key (id),
  constraint products_sap_code_key unique (sap_code)
);

-- ---- sales_channels --------------------------------------------------------- current-state master
create table public.sales_channels (
  id               uuid        not null default uuid_generate_v4(),
  name             text        not null,
  default_currency text        not null default 'COP',
  min_margin_pct   numeric,
  is_active        boolean     not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint sales_channels_pkey primary key (id),
  constraint sales_channels_name_key unique (name)
);

-- ---- price_lists ------------------------------------------------------------ product × channel BASE pricing (DB-enforced single row per product+channel)
create table public.price_lists (
  id                    uuid        not null default uuid_generate_v4(),
  channel_id            uuid        not null,
  product_id            uuid        not null,
  currency              text        not null default 'COP',
  list_price            numeric     not null default 0,
  valid_from            date,
  valid_to              date,
  is_active             boolean     not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  target_margin_pct     numeric,
  max_discount_pct      numeric,
  net_price             numeric,
  applies               boolean     default true,
  not_applicable_reason text,
  conversion_trm        numeric,
  constraint price_lists_pkey primary key (id),
  -- NOTE: two OVERLAPPING unique constraints coexist (see docs risks §):
  constraint uq_price_lists_product_channel unique (product_id, channel_id),                       -- strict: 1 row per (product, channel) => NO history possible
  constraint uq_price_list_channel_product  unique (channel_id, product_id, currency, valid_from)  -- wider key (subsumed by the strict one)
);

-- ---- simulations ------------------------------------------------------------ simulation headers (lifecycle + append)
create table public.simulations (
  id                            uuid        not null default uuid_generate_v4(),
  customer_id                   uuid,
  channel_id                    uuid,
  simulation_type               text        not null,
  project_name                  text,
  currency                      text        not null default 'COP',
  trm                           numeric,
  valid_from                    date,
  valid_to                      date,
  status                        text        not null default 'DRAFT',
  source_simulation_id          uuid,
  created_by                    uuid,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  target_margin_pct             numeric     default 65,
  commission_pct                numeric     default 0,
  commission_amount             numeric     default 0,
  real_revenue_after_commission numeric,
  constraint simulations_pkey primary key (id),
  constraint simulations_simulation_type_check
    check (simulation_type = any (array['PRICE_LIST'::text, 'PROJECT_PROMO'::text])),
  constraint simulations_status_check
    check (status = any (array['DRAFT'::text, 'VIGENTE'::text, 'VENCIDO'::text, 'RENOVADA'::text, 'RECHAZADA'::text]))
);
-- NOTE: app uses a "COMMISSION" UI type but stores it as 'PRICE_LIST' (satisfies the CHECK).

-- ---- simulation_lines ------------------------------------------------------- simulation line items (append snapshot)
create table public.simulation_lines (
  id                 uuid        not null default uuid_generate_v4(),
  simulation_id      uuid        not null,
  product_id         uuid,
  sap_code           text        not null,
  description        text,
  qty                numeric     not null default 0,
  list_price         numeric     not null default 0,
  discount_pct       numeric     not null default 0,
  net_price          numeric     not null default 0,
  cost_mp            numeric     not null default 0,
  margin_pct         numeric     not null default 0,
  contribution_value numeric     not null default 0,
  previous_price     numeric,
  increment_pct      numeric,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint simulation_lines_pkey primary key (id)
);

-- ---- simulation_versions ---------------------------------------------------- simulation lineage (append)
create table public.simulation_versions (
  id                     uuid        not null default uuid_generate_v4(),
  original_simulation_id uuid        not null,
  renewed_simulation_id  uuid        not null,
  created_at             timestamptz not null default now(),
  constraint simulation_versions_pkey primary key (id)
);
-- NOTE: application code selects `version_type` here, but NO such column exists (drift — see docs §).

-- ---- bom_imports ------------------------------------------------------------ BOM upload records (append)
create table public.bom_imports (
  id          uuid        not null default uuid_generate_v4(),
  file_name   text,
  source      text        default 'SAP_BOM_IMPORT',
  imported_at timestamptz not null default now(),
  notes       text,
  constraint bom_imports_pkey primary key (id)
);

-- ---- bom_products ----------------------------------------------------------- per-import product BOM snapshot (append)
create table public.bom_products (
  id                   uuid        not null default uuid_generate_v4(),
  bom_import_id        uuid        not null,
  product_id           uuid,
  sap_code             text        not null,
  description          text,
  recalculated_cost_mp numeric     not null default 0,
  componentes_count    integer     not null default 0,
  excluidos_pz_count   integer     not null default 0,
  created_at           timestamptz not null default now(),
  constraint bom_products_pkey primary key (id)
);

-- ---- bom_components --------------------------------------------------------- BOM component rows per snapshot (append)
create table public.bom_components (
  id                   uuid        not null default uuid_generate_v4(),
  bom_product_id       uuid        not null,
  codigo               text        not null,
  cantidad             numeric     not null,
  costo_excel_fallback numeric     not null,
  nivel                integer     not null,
  parent_codigo        text,
  created_at           timestamptz not null default now(),
  constraint bom_components_pkey primary key (id)
);
-- NOTE: NO `description` column (MAQUILA recalc resolves it from component_costs — known debt).

-- ---- component_costs -------------------------------------------------------- real component unit costs (current-state, keyed by codigo)
create table public.component_costs (
  id             uuid        not null default uuid_generate_v4(),
  codigo         text        not null,
  costo_unitario numeric     not null,
  moneda         text        not null default 'COP',
  description    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint component_costs_pkey primary key (id),
  constraint component_costs_codigo_key unique (codigo)
);

-- ---- Usuarios_MarginOS ------------------------------------------------------ app users (properly RLS-scoped)
create table public."Usuarios_MarginOS" (
  id         bigint      not null,   -- likely identity/generated; default not captured
  created_at timestamptz not null default now(),
  uuid       uuid        not null,
  nombre     text,
  rol        text,
  permisos   json,
  constraint "Usuarios_MarginOS_pkey" primary key (id),
  constraint "Usuarios_MarginOS_uuid_key" unique (uuid)
);

-- =============================================================================
-- FOREIGN KEYS (real, from 04_foreign_keys.csv)
-- =============================================================================
alter table public.customers           add constraint customers_default_channel_id_fkey            foreign key (default_channel_id)     references public.sales_channels(id) on delete set null;
alter table public.price_lists         add constraint price_lists_channel_id_fkey                  foreign key (channel_id)             references public.sales_channels(id) on delete cascade;
alter table public.price_lists         add constraint price_lists_product_id_fkey                  foreign key (product_id)             references public.products(id)       on delete cascade;
alter table public.simulations         add constraint simulations_channel_id_fkey                  foreign key (channel_id)             references public.sales_channels(id) on delete set null;
alter table public.simulations         add constraint simulations_customer_id_fkey                 foreign key (customer_id)            references public.customers(id)      on delete set null;
alter table public.simulations         add constraint simulations_source_simulation_id_fkey        foreign key (source_simulation_id)   references public.simulations(id)    on delete set null;
alter table public.simulation_lines    add constraint simulation_lines_product_id_fkey             foreign key (product_id)             references public.products(id)       on delete set null;
alter table public.simulation_lines    add constraint simulation_lines_simulation_id_fkey          foreign key (simulation_id)          references public.simulations(id)    on delete cascade;
alter table public.simulation_versions add constraint simulation_versions_original_simulation_id_fkey foreign key (original_simulation_id) references public.simulations(id)  on delete cascade;
alter table public.simulation_versions add constraint simulation_versions_renewed_simulation_id_fkey  foreign key (renewed_simulation_id)  references public.simulations(id)  on delete cascade;
alter table public.bom_products        add constraint bom_products_bom_import_id_fkey              foreign key (bom_import_id)          references public.bom_imports(id)    on delete cascade;
alter table public.bom_products        add constraint bom_products_product_id_fkey                 foreign key (product_id)             references public.products(id)       on delete set null;
alter table public.bom_components      add constraint bom_components_bom_product_id_fkey            foreign key (bom_product_id)         references public.bom_products(id)   on delete cascade;
-- NOTE: component_costs has NO FK to products (linked by `codigo` string convention only).
-- NOTE: bom_products.sap_code / bom_components.codigo / simulation_lines.sap_code are code-based (no FK).

-- =============================================================================
-- SECONDARY INDEXES (non-constraint, from 07_indexes.csv)
-- =============================================================================
create index idx_customers_name                on public.customers        using btree (name);
create index idx_customers_nit                 on public.customers        using btree (nit);
create index idx_products_description          on public.products         using btree (description);
create index idx_products_sap_code             on public.products         using btree (sap_code);
create index idx_price_lists_channel_id        on public.price_lists      using btree (channel_id);
create index idx_price_lists_product_id        on public.price_lists      using btree (product_id);
create index idx_simulations_channel_id        on public.simulations      using btree (channel_id);
create index idx_simulations_customer_id       on public.simulations      using btree (customer_id);
create index idx_simulations_status            on public.simulations      using btree (status);
create index idx_simulations_type              on public.simulations      using btree (simulation_type);
create index idx_simulation_lines_product_id   on public.simulation_lines using btree (product_id);
create index idx_simulation_lines_sap_code     on public.simulation_lines using btree (sap_code);
create index idx_simulation_lines_simulation_id on public.simulation_lines using btree (simulation_id);
create index idx_simulation_versions_original  on public.simulation_versions using btree (original_simulation_id);
create index idx_simulation_versions_renewed   on public.simulation_versions using btree (renewed_simulation_id);
create index idx_bom_products_import_id        on public.bom_products     using btree (bom_import_id);
create index idx_bom_products_sap_code         on public.bom_products     using btree (sap_code);
create index idx_bom_components_bom_product    on public.bom_components   using btree (bom_product_id);
create index idx_bom_components_codigo         on public.bom_components   using btree (codigo);
create index idx_component_costs_codigo        on public.component_costs  using btree (codigo);

-- =============================================================================
-- TRIGGERS (real, from 08_triggers.csv) — BEFORE UPDATE -> set_updated_at()
-- =============================================================================
create trigger trg_customers_updated_at        before update on public.customers        for each row execute function set_updated_at();
create trigger trg_products_updated_at         before update on public.products         for each row execute function set_updated_at();
create trigger trg_sales_channels_updated_at   before update on public.sales_channels   for each row execute function set_updated_at();
create trigger trg_price_lists_updated_at      before update on public.price_lists      for each row execute function set_updated_at();
create trigger trg_simulations_updated_at      before update on public.simulations      for each row execute function set_updated_at();
create trigger trg_simulation_lines_updated_at before update on public.simulation_lines for each row execute function set_updated_at();
create trigger trg_component_costs_updated_at  before update on public.component_costs  for each row execute function set_updated_at();
-- (append-only tables bom_imports/bom_products/bom_components/simulation_versions have NO updated_at trigger.)

-- =============================================================================
-- ROW LEVEL SECURITY — CURRENT LIVE STATE (⚠️ INSECURE for 11 tables)
-- =============================================================================
-- RLS is ENABLED on all 12 tables. The 11 operational tables share ONE
-- permissive ALL policy granting anon+authenticated unrestricted access.
-- Table GRANTs additionally give anon+authenticated
-- SELECT/INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES on all 12 tables.
-- => anon (unauthenticated) can READ and WRITE all commercial data on the 11.
-- Only Usuarios_MarginOS is actually protected (RLS restricts to own row).
-- This section documents reality; it is NOT a recommendation. Do not apply.

alter table public.customers           enable row level security;
alter table public.products            enable row level security;
alter table public.sales_channels      enable row level security;
alter table public.price_lists         enable row level security;
alter table public.simulations         enable row level security;
alter table public.simulation_lines    enable row level security;
alter table public.simulation_versions enable row level security;
alter table public.bom_imports         enable row level security;
alter table public.bom_products        enable row level security;
alter table public.bom_components      enable row level security;
alter table public.component_costs     enable row level security;
alter table public."Usuarios_MarginOS" enable row level security;

-- Operational tables (x11): permit-all to anon+authenticated (USING true, cmd ALL)
create policy "Policy with security definer functions" on public.customers           as permissive for all to anon, authenticated using (true);
create policy "Policy with security definer functions" on public.products            as permissive for all to anon, authenticated using (true);
create policy "Policy with security definer functions" on public.sales_channels      as permissive for all to anon, authenticated using (true);
create policy "Policy with security definer functions" on public.price_lists         as permissive for all to anon, authenticated using (true);
create policy "Policy with security definer functions" on public.simulations         as permissive for all to anon, authenticated using (true);
create policy "Policy with security definer functions" on public.simulation_lines    as permissive for all to anon, authenticated using (true);
create policy "Policy with security definer functions" on public.simulation_versions as permissive for all to anon, authenticated using (true);
create policy "Policy with security definer functions" on public.bom_imports         as permissive for all to anon, authenticated using (true);
create policy "Policy with security definer functions" on public.bom_products        as permissive for all to anon, authenticated using (true);
create policy "Policy with security definer functions" on public.bom_components      as permissive for all to anon, authenticated using (true);
create policy "Policy with security definer functions" on public.component_costs     as permissive for all to anon, authenticated using (true);

-- Usuarios_MarginOS: correctly scoped (own row, authenticated, SELECT only)
create policy "Users can view own data" on public."Usuarios_MarginOS"
  as permissive for select to authenticated using (auth.uid() = uuid);

-- =============================================================================
-- ROLE GRANTS — CURRENT LIVE STATE (from 12_role_grants.csv)
-- =============================================================================
-- For every table T in the 12: anon and authenticated hold
--   SELECT, INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES.
-- Example (repeat per table):
--   grant select, insert, update, delete, truncate, trigger, references
--     on public.<T> to anon, authenticated;
-- (Documented, not recommended. On the 11 operational tables this combined with
--  the permit-all RLS policy is what enables anonymous read/write.)
-- =============================================================================
-- End of authoritative baseline for the 12 MarginOS tables.
