import { describe, it, expect } from "vitest";
import { isPzExcludedFromCost, descriptionHasMaquila } from "./pzRule";

// These tests DOCUMENT the current behavior of the protected BOM PZ/MAQUILA rule.
// They must not drive changes to the implementation unless an actual defect is found.
//
// Rule under test (src/lib/bom/pzRule.ts):
//   - Non-PZ codes are never excluded.
//   - PZ codes are excluded from MP cost by default.
//   - Exception: a PZ code whose description contains "MAQUILA"
//     (case-insensitive AND accent-insensitive) is INCLUDED.
//
// Semantics reminder: isPzExcludedFromCost(...) === true  -> EXCLUDED from cost
//                      isPzExcludedFromCost(...) === false -> INCLUDED in cost

describe("isPzExcludedFromCost", () => {
  it("1. includes a normal non-PZ component", () => {
    // e.g. CMPD06-0005-000-0440 "CANTO PVC 19X2MM RUSTIC SAND"
    expect(
      isPzExcludedFromCost("CMPD06-0005-000-0440", "CANTO PVC 19X2MM RUSTIC SAND")
    ).toBe(false);
  });

  it("2. excludes a PZ component without MAQUILA", () => {
    // e.g. PZCO01-0002-000-0000 "CIF POR MINUTO"
    expect(isPzExcludedFromCost("PZCO01-0002-000-0000", "CIF POR MINUTO")).toBe(true);
  });

  it("3. includes a PZ component whose description contains MAQUILA", () => {
    // e.g. PZCO01-0020-000-0000 "MAQUILA ESCALERA 2 PELDANOS PARA DECK"
    expect(
      isPzExcludedFromCost("PZCO01-0020-000-0000", "MAQUILA ESCALERA 2 PELDANOS PARA DECK")
    ).toBe(false);
  });

  it("4. matches MAQUILA case-insensitively", () => {
    expect(isPzExcludedFromCost("PZCO01-0020-000-0000", "maquila escalera")).toBe(false);
    expect(isPzExcludedFromCost("PZCO01-0020-000-0000", "MaQuIlA escalera")).toBe(false);
  });

  it("4b. matches MAQUILA accent-insensitively (MÁQUILA)", () => {
    // documents the NFD diacritic-stripping behavior
    expect(isPzExcludedFromCost("PZCO01-0020-000-0000", "MÁQUILA ESCALERA")).toBe(false);
  });

  it("4c. matches MAQUILA anywhere in the description, not only at the start", () => {
    expect(
      isPzExcludedFromCost("PZCO01-0020-000-0000", "ESCALERA MAQUILA PARA DECK")
    ).toBe(false);
  });

  it("5. leading/trailing/interior whitespace around MAQUILA does not break the rule", () => {
    expect(
      isPzExcludedFromCost("PZCO01-0020-000-0000", "   MAQUILA ESCALERA   ")
    ).toBe(false);
  });

  it("6. a PZ component with empty description stays excluded", () => {
    expect(isPzExcludedFromCost("PZCO01-0002-000-0000", "")).toBe(true);
  });

  it("6b. a PZ component with null/undefined description stays excluded", () => {
    expect(isPzExcludedFromCost("PZCO01-0002-000-0000", null)).toBe(true);
    expect(isPzExcludedFromCost("PZCO01-0002-000-0000", undefined)).toBe(true);
  });

  it("handles lower-case PZ prefix (code is upper-cased before the prefix test)", () => {
    expect(isPzExcludedFromCost("pzco01-0002-000-0000", "CIF POR MINUTO")).toBe(true);
    expect(isPzExcludedFromCost("pzco01-0020-000-0000", "maquila deck")).toBe(false);
  });

  it("handles null/undefined code as non-PZ (included)", () => {
    expect(isPzExcludedFromCost(null, "anything")).toBe(false);
    expect(isPzExcludedFromCost(undefined, "anything")).toBe(false);
  });

  // ── Documentation of a current-behavior edge (NOT asserted as correct) ──
  // The predicate does NOT trim the code before the "PZ" prefix test. All live
  // callers (import/page.tsx, admin/costs/page.tsx) pass an already-trimmed code
  // (via normalizeText / stored values), so this is a latent robustness gap, not
  // a live defect. This test pins the CURRENT behavior so any future change is
  // intentional and visible.
  it("[current behavior] a code with leading whitespace is treated as non-PZ (included)", () => {
    expect(isPzExcludedFromCost("  PZCO01-0002-000-0000", "CIF POR MINUTO")).toBe(false);
  });
});

describe("descriptionHasMaquila", () => {
  it("returns true for exact, mixed-case and accented MAQUILA", () => {
    expect(descriptionHasMaquila("MAQUILA")).toBe(true);
    expect(descriptionHasMaquila("maquila")).toBe(true);
    expect(descriptionHasMaquila("MÁQUILA")).toBe(true);
    expect(descriptionHasMaquila("proceso de maquila externo")).toBe(true);
  });

  it("returns false for empty, null, undefined, or unrelated text", () => {
    expect(descriptionHasMaquila("")).toBe(false);
    expect(descriptionHasMaquila(null)).toBe(false);
    expect(descriptionHasMaquila(undefined)).toBe(false);
    expect(descriptionHasMaquila("CIF POR MINUTO")).toBe(false);
  });
});
