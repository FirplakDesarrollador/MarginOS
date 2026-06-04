// =============================================================
// BOM PZ exclusion rule — shared across import & recalculation
// =============================================================
//
// PZ components are excluded from MP cost except when description contains MAQUILA,
// because SPA outsourced maquila components must be included as material cost.
//
// Business context:
//   - Codes starting with "PZ" are usually production/service/cost concepts
//     (e.g. PZCO01-0002-000-0000 "CIF POR MINUTO") that must NOT count as raw
//     material for gross contribution.
//   - Exception: Hidromasajes / SPA products use outsourced maquila parts whose
//     code also starts with "PZ" but whose description contains "MAQUILA"
//     (e.g. PZCO01-0020-000-0000 "MAQUILA ESCALERA 2 PELDANOS PARA DECK").
//     These DO represent material cost and must be included.

/** Accent-insensitive, case-insensitive check for "MAQUILA" anywhere in the text. */
export function descriptionHasMaquila(descripcion: string | null | undefined): boolean {
  const normalized = String(descripcion ?? "")
    .normalize("NFD")                       // split accented chars into base + diacritic
    .replace(/[\u0300-\u036f]/g, "")        // strip diacritics (accent-insensitive)
    .toUpperCase();
  return normalized.includes("MAQUILA");
}

/**
 * Returns true when a component must be EXCLUDED from MP / raw-material cost.
 *
 * Rule:
 *   1. Code starts with "PZ"  -> excluded by default.
 *   2. Exception: starts with "PZ" AND description contains "MAQUILA" -> included
 *      (i.e. NOT excluded).
 *   3. Non-PZ codes are never excluded by this rule.
 */
export function isPzExcludedFromCost(
  codigo: string | null | undefined,
  descripcion: string | null | undefined
): boolean {
  const code = String(codigo ?? "").toUpperCase();
  if (!code.startsWith("PZ")) return false;        // not a PZ component -> keep
  return !descriptionHasMaquila(descripcion);       // PZ -> exclude unless MAQUILA
}
