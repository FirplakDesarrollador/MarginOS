# 00 · Project Vision

> Entry document. High-level "why". For current status see
> [07_Roadmap/MarginOS_Project_Handover.md](07_Roadmap/MarginOS_Project_Handover.md); for the
> forward direction see [07_Roadmap/COMMERCIAL_INTELLIGENCE_ARCHITECTURE_ASSESSMENT.md](07_Roadmap/COMMERCIAL_INTELLIGENCE_ARCHITECTURE_ASSESSMENT.md).
> This document states **approved business intent only** — it does not design database tables,
> schemas, or migrations.

## What MarginOS is

**MarginOS is FIRPLAK's Negotiation Intelligence and Commercial Memory Platform.**

Its primary purpose is to support the **CEO, CSO, and commercial backoffice** in evaluating,
negotiating, approving, and documenting **profitable commercial agreements**.

MarginOS **complements** SAP, CRM, and BI — it does **not** replace them.

## What MarginOS is today (as-built)

Today the application provides the commercial pricing & simulation foundation of that vision. It lets
commercial teams:

- import Bills of Materials (BOM) from SAP and compute product material cost (MP),
- maintain real component costs ("Costos Reales"),
- manage sales channels and base price lists,
- simulate negotiations with margin, contribution, discount, USD/TRM, and commission handling
  ("Simular Negocio"), and
- review saved scenarios and an executive KPI dashboard.

The system is a Next.js application backed by Supabase (PostgreSQL + Auth). This is an
**evolution, not a rebuild**: all existing critical functionality must remain compatible —
BOM Import, BOM costing, Costos Reales, Pricing Manager, Price Lists, Simular Negocio, Scenarios,
Customers, and the Executive KPI Dashboard.

## The central business entity: Negotiation

The platform is organized around the **Negotiation** as its central business entity. A negotiation
brings together:

- Commercial account and responsible **KAM**
- Customer information and contacts
- Products and technical requirements
- Commercial terms and payment conditions
- Financial simulations
- Multiple commercial proposals and negotiation rounds
- Internal approvals when profitability is below target
- Customer decisions
- Negotiation lifecycle and final outcome
- Permanent commercial history

### Approved negotiation stages

1. **Visit / Meeting**
2. **Proposal Sent**
3. **Negotiation**
4. **Price Agreement**
5. **Closed Won**
6. **Closed Lost**

> Additional **Draft** and **Cancelled** states may be considered during detailed workflow design.

### Negotiation rules

- **Commercial proposals must preserve historical versions** — every proposal version is retained as
  permanent commercial memory.
- **Internal profitability information must never appear in customer-facing proposals** — margins,
  costs, and approval data stay internal.

## Approved data ownership

MarginOS is one system among several. Ownership of each data domain is **approved** as follows:

| System | Owns |
|---|---|
| **SAP** | Products, costs, inventory, actual sales. |
| **CRM** | Customers, contacts, and commercial account management. |
| **MarginOS** | Negotiations, simulations, margins, commercial terms, negotiated pricing, approvals, proposals, and commercial memory. |
| **BI** | Corporate analytics. |
| **Product images / renders** | Ownership/storage **pending decision** between MarginOS and SharePoint. |

> Implication: MarginOS is the **source of truth for the negotiation and commercial-memory domain**,
> and **references** (does not re-master) products/costs/sales from SAP and customers/contacts from
> CRM. Reconciling the shared Supabase `public` schema against these owners is a prerequisite for the
> Commercial Data Model (see the Phase 0 landscape and Commercial Intelligence assessment in
> [07_Roadmap/](07_Roadmap/)).

## Guiding principles

- **Preserve working functionality.** Protected financial logic changes only with tests and approval
  (see [03_Business_Rules.md](03_Business_Rules.md) / [TESTING.md](TESTING.md)).
- **One source of truth per concept.** Honor the data-ownership table above — do not duplicate
  SAP/CRM masters; reconcile with existing FIRPLAK systems first (the Supabase `public` schema is
  shared; see the Phase 0 landscape doc).
- **Security before exposure.** Access must be hardened before any AI/API layer is exposed. There is a
  **critical, unresolved anonymous-access exposure** today — see
  [07_Roadmap/PHASE_0_SECURITY_AND_DATA_LANDSCAPE.md](07_Roadmap/PHASE_0_SECURITY_AND_DATA_LANDSCAPE.md).
- **Complement, don't replace.** MarginOS adds negotiation intelligence and commercial memory on top
  of SAP, CRM, and BI.
- **Evidence-based architecture.** Decisions are grounded in the authoritative schema baseline, not
  assumptions.

> Status of the above (implemented vs pending vs proposed) is tracked in the Roadmap folder. This
> document states intent only. Future AI systems will query MarginOS through a **controlled API/MCP
> layer**, never by storing commercial data themselves or touching raw tables directly.
