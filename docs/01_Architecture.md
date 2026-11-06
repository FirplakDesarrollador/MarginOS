# 01 · Architecture

> Entry/index document. Points to the authoritative detailed sources; it does not duplicate them.

## Stack (as-built)

- **Frontend/Backend:** Next.js (App Router) · React · TypeScript · Tailwind CSS.
- **Data & Auth:** Supabase (PostgreSQL + Supabase Auth), accessed via `@supabase/ssr`.
- **Rendering:** all feature pages are client components that query Supabase directly; the browser
  client runs as the **authenticated** role once a user logs in.
- **Auth gate:** middleware ([`src/proxy.ts`](../src/proxy.ts) → [`src/lib/supabase/middleware.ts`](../src/lib/supabase/middleware.ts))
  redirects every non-`/login` route to login when there is no session.

## Where to read the detail (authoritative)

| Topic | Source |
|---|---|
| Full current-state architecture, module inventory, folder structure, tech debt | [07_Roadmap/MarginOS_Project_Handover.md](07_Roadmap/MarginOS_Project_Handover.md) |
| Authentication architecture, security exposure, role/access matrix | [07_Roadmap/PHASE_0_SECURITY_AND_DATA_LANDSCAPE.md](07_Roadmap/PHASE_0_SECURITY_AND_DATA_LANDSCAPE.md) |
| Database schema (tables, keys, constraints, RLS) | [02_Database.md](02_Database.md) → [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) |
| Protected business logic & calculation flows | [03_Business_Rules.md](03_Business_Rules.md) |
| Target architecture & new commercial domains | [07_Roadmap/COMMERCIAL_INTELLIGENCE_ARCHITECTURE_ASSESSMENT.md](07_Roadmap/COMMERCIAL_INTELLIGENCE_ARCHITECTURE_ASSESSMENT.md) |

## Key architectural facts (confirmed)

- **Shared database.** MarginOS's Supabase `public` schema is shared with ~161 tables from other
  FIRPLAK systems (CRM, service/repair, WhatsApp, inventory, negotiation, fact tables). MarginOS owns
  **12 tables** and references only those. See the Phase 0 landscape doc.
- **Module surface:** Executive KPI Dashboard, Simular Negocio, Escenarios, Clientes, Importar BOM,
  Costos Reales, Productos, Pricing Manager, Listas de Precios, Canales de Venta, Login. Per-module
  detail belongs in [04_Modules/](04_Modules/).
- **No custom API layer today.** Data access is client-side against Supabase; a controlled API/MCP
  layer is a future addition (see [05_API/](05_API/) and [06_AI/](06_AI/)).
