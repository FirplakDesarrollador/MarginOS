# Reglas Básicas del Sistema de Simulación de Precios

## 1. Financial Accuracy Above All
- **Never assume missing financial data silently.**
- If inputs (cost, TRM, commission, etc.) are missing:
  - Use predefined defaults from Settings OR
  - Flag clearly as “Missing Input” and show impact.
- **All calculations must be deterministic and reproducible.**
- No hidden logic or black-box formulas.

## 2. Full Auditability
- Every financial output must allow a “View Breakdown” option including:
  - Exact formula used
  - Input values
  - Applied defaults
  - Currency normalization
  - Rounding logic
  - Step-by-step cost buildup
- No calculation may exist without traceability.

## 3. UX/UI Principles (Modern & Minimalist)
- Fintech-style clean interface.
- Maximum clarity, minimal visual noise.
- One primary objective per screen.
- KPI cards for key financial outputs.
- Spreadsheet-style editable grid for multi-product deals.
- **Default layout:** Inputs (Left) | Results (Right).
- **Margin compliance states:**
  - 🟢 Green = Above target
  - 🟡 Yellow = Near policy threshold
  - 🔴 Red = Below policy

## 4. Core Functional Principles
### A. BOM-Based Costing (Mandatory)
- Product costs calculated from SAP-exported BOM data.
- Finished product unit cost = sum(qty_component × component_unit_cost).
- If component cost is missing: Mark as “Incomplete” and flag clearly.

### B. Multi-SKU Deal Evaluation
- Per simulated business:
  - Margin per SKU
  - Contribution per SKU
  - Weighted total margin
  - Highlight low-margin lines

## 5. Scenario Management
- Every simulation must be saved as a Scenario.
- Attributes: Date, User, Channel, Currency, TRM, Version.
- Allow duplication and comparison.

## 6. Settings-Driven Logic
- All repeatable assumptions live in Settings (Currency, TRM, Margin policies, Rounding).
- No hardcoded business assumptions.

## 7. Clear Data Model Separation
- Separate: Product, BOM Components, Product Cost, Price List, Business Header, Business Lines, Scenario, Policy Rules.

## 8. Performance & Interaction
- Real-time calculation.
- Editable grid with keyboard support.
- Autosave.
- Immediate recalculation on changes.

## 9. Roles & Permissions (Internal Use)
- Admin (settings/policies), Sales (simulate), Pricing Manager (override).

## 10. Default Technology Stack
- **Framework:** Next.js (App Router)
- **UI Icons:** Lucide React
- **Data:** JSON by default (unless DB explicitly requested).
- **Architecture:** Future API integration ready.

## 11. Internal Base Prompt Constraint
- Default to Next.js App Router.
- Use Lucide React.
- Prioritize JSON over complex databases.
