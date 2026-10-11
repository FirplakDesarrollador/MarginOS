# MarginOS Documentation

This folder is the long-term documentation source for MarginOS. It is organized as a set of numbered
**entry documents** (`00`–`03`), topic **folders** (`04`–`08`), and their **authoritative detailed
references**.

> ## 🔴 CRITICAL UNRESOLVED SECURITY RISK — anonymous Supabase access
>
> **CONFIRMED:** all 11 operational MarginOS tables currently allow **anonymous read *and write***
> (an `RLS FOR ALL TO anon USING (true)` policy plus full `anon` table grants including
> `DELETE`/`TRUNCATE`). Anyone holding the client-shipped anon key can read, modify, or delete
> commercial data (customers, prices, costs, simulations, BOM) directly via the REST API — no login
> required. The application does **not** depend on this (it runs as `authenticated`), so the fix is
> low-risk but **not yet applied**.
>
> **Full analysis, role/access matrix, and the proposed hardening plan:**
> [07_Roadmap/PHASE_0_SECURITY_AND_DATA_LANDSCAPE.md](07_Roadmap/PHASE_0_SECURITY_AND_DATA_LANDSCAPE.md).
>
> This risk must be remediated **before** any AI/API exposure layer is built. (RLS/permissions are
> **not** modified by this documentation task.)

## Document hierarchy

```
docs/
├── README.md                                  ← you are here (index + reading order)
├── 00_Project_Vision.md                       ← why MarginOS exists; where it's going
├── 01_Architecture.md                         ← stack & architecture (index → detail)
├── 02_Database.md                             ← data-layer index → DATABASE_SCHEMA.md
├── 03_Business_Rules.md                       ← protected commercial logic index → TESTING.md
│
├── DATABASE_SCHEMA.md                          ← AUTHORITATIVE database baseline (detail for 02)
├── TESTING.md                                  ← AUTHORITATIVE testing/protected-logic policy (detail for 03)
│
├── 04_Modules/           (per-module functional docs — scaffold)
├── 05_API/               (future controlled API layer — scaffold)
├── 06_AI/                (future controlled AI/MCP layer — scaffold)
├── 07_Roadmap/           (assessments, phase plans, project status)
│   ├── MarginOS_Project_Handover.md
│   ├── COMMERCIAL_INTELLIGENCE_ARCHITECTURE_ASSESSMENT.md
│   └── PHASE_0_SECURITY_AND_DATA_LANDSCAPE.md
├── 08_Release_Notes/     (per-release notes — scaffold)
│
├── governance/           (pre-existing; team/process rules)
└── roles/                (pre-existing; role definitions)
```

> **Placement note.** `DATABASE_SCHEMA.md` and `TESTING.md` are the detailed companions of the
> `02_Database.md` and `03_Business_Rules.md` entry files and are intentionally kept at the top level
> beside them (the `04`–`08` folder set has no dedicated Database/Testing category). Move them into a
> folder later if a matching category is introduced. Companion DDL/evidence lives outside `docs/` in
> [`supabase/schema.sql`](../supabase/schema.sql) and [`supabase/introspection/`](../supabase/introspection/).

## Purpose of each document

| Document | Purpose |
|---|---|
| `00_Project_Vision.md` | The vision and guiding principles. Intent only (not status). |
| `01_Architecture.md` | Stack, auth gate, module surface; index into the detailed sources. |
| `02_Database.md` | Data-layer index; snapshot + links to the authoritative schema baseline. |
| `03_Business_Rules.md` | The protected-logic list, change rules, and where formulas are documented. |
| `DATABASE_SCHEMA.md` | **Authoritative** current DB schema for the 12 MarginOS tables (from real introspection). |
| `TESTING.md` | **Authoritative** testing strategy and protected-financial-logic policy. |
| `07_Roadmap/MarginOS_Project_Handover.md` | Current-state overview: modules, business-rule narrative, tech debt (point-in-time snapshot). |
| `07_Roadmap/COMMERCIAL_INTELLIGENCE_ARCHITECTURE_ASSESSMENT.md` | Target model & proposed new commercial domains (**proposal, not implemented**). |
| `07_Roadmap/PHASE_0_SECURITY_AND_DATA_LANDSCAPE.md` | Confirmed security posture, shared-schema landscape, role/access matrix, PK re-verification, drift. |
| `04_Modules/`, `05_API/`, `06_AI/`, `08_Release_Notes/` | Scaffold folders for content to be written. |
| `governance/`, `roles/` | Pre-existing team/process and role material. |

## Which documents are authoritative

**Authoritative (evidence-based, current):**
- `DATABASE_SCHEMA.md` + [`supabase/schema.sql`](../supabase/schema.sql) + [`supabase/introspection/`](../supabase/introspection/) — the database of record, built from real introspection. *(Caveat: 6 tables' PK constraints need the re-verification query in the Phase 0 doc before being asserted.)*
- `07_Roadmap/PHASE_0_SECURITY_AND_DATA_LANDSCAPE.md` — findings labeled **CONFIRMED** are authoritative; items labeled INFERENCE / REQUIRES BUSINESS CONTEXT are not.
- `TESTING.md` — the current, in-force testing/protected-logic policy.

**Point-in-time snapshot (accurate when written, may age):**
- `07_Roadmap/MarginOS_Project_Handover.md`.

**Advisory / forward-looking (NOT implemented; require approval):**
- `07_Roadmap/COMMERCIAL_INTELLIGENCE_ARCHITECTURE_ASSESSMENT.md` and all Roadmap proposals.
- The `00`–`03` entry files are **indexes/summaries**; when they disagree with an authoritative
  detailed doc, the detailed doc wins.

## Recommended reading order (new-engineer onboarding)

1. **`README.md`** (this file) — the map.
2. **`00_Project_Vision.md`** — what and why.
3. **`07_Roadmap/MarginOS_Project_Handover.md`** — the fastest complete picture of the current system.
4. **`01_Architecture.md`** — stack, auth, module surface.
5. **`02_Database.md` → `DATABASE_SCHEMA.md`** (and skim [`supabase/schema.sql`](../supabase/schema.sql)) — the data model.
6. **`03_Business_Rules.md` → `TESTING.md`** — the protected commercial logic and how it's guarded.
7. **`07_Roadmap/PHASE_0_SECURITY_AND_DATA_LANDSCAPE.md`** — security posture and the shared-database landscape (important context before touching data).
8. **`07_Roadmap/COMMERCIAL_INTELLIGENCE_ARCHITECTURE_ASSESSMENT.md`** — where the platform is heading.
9. **`governance/` and `roles/`** — team/process and role context.

Then, when contributing: follow the change rules in `03_Business_Rules.md` / `TESTING.md`, and add
module docs under `04_Modules/` as you learn each area.
