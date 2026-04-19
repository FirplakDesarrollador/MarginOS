"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, UploadCloud, Save, FileSpreadsheet, Package, Clock, FolderOpen
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";

// =============================================
// TYPES
// =============================================

type RowSAP = {
  Codigo?: any;
  Descripcion?: any;
  UnidadMedida?: any;
  Nivel?: any;
  Cantidad?: any;
  Costo_Unitario?: any;
  Costo_Mp?: any;
};

type BOMComponentType = {
  codigo: string;
  cantidad: number;
  costo_excel_fallback: number;
  nivel: number;
  parent_codigo: string | null;
};

type ProductoNivel1 = {
  Codigo: string;
  Descripcion: string;
  Costo_Mp: number;
  componentes_count: number;
  excluidos_PZ_count: number;
  usaron_costo_real: number;
  usaron_costo_excel: number;
  component_list: BOMComponentType[];
};

type BOMImport = {
  id: string;
  file_name: string;
  source: string;
  imported_at: string;
  notes: string | null;
};

type BOMProduct = {
  id: string;
  sap_code: string;
  description: string;
  recalculated_cost_mp: number;
  componentes_count: number;
  excluidos_pz_count: number;
  created_at: string;
};

// =============================================
// HELPERS
// =============================================

function normalizeText(v: any) {
  return String(v ?? "").trim();
}

function isHeaderRow(r: any) {
  const c = normalizeText(r?.Codigo).toLowerCase();
  const d = normalizeText(r?.Descripcion).toLowerCase();
  const n = normalizeText(r?.Nivel).toLowerCase();
  return c === "codigo" && d === "descripcion" && (n === "nivel" || n.length > 0);
}

function parseNumberSmart(v: any): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  let s = String(v).trim();
  if (!s) return 0;
  s = s.replace(/\s/g, "");

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    s = s.replace(/,/g, "");
  }

  const num = Number(s);
  return Number.isFinite(num) ? num : 0;
}

// =============================================
// COMPONENT
// =============================================

export default function ImportBOMPage() {
  const router = useRouter();
  const supabase = createClient();

  // Upload state
  const [preview, setPreview] = useState<any[]>([]);
  const [productos, setProductos] = useState<ProductoNivel1[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // History + cost list state
  const [bomImports, setBomImports] = useState<BOMImport[]>([]);
  const [bomProducts, setBomProducts] = useState<BOMProduct[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const canSave = productos.length > 0 && !loading;

  const formatMoney = useMemo(() => {
    return (value: number) =>
      new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
  }, []);

  // =============================================
  // FETCH HISTORY + CURRENT COSTS
  // =============================================
  useEffect(() => {
    let isMounted = true;
    async function fetchHistory() {
      setLoadingHistory(true);
      const [importsRes, productsRes] = await Promise.all([
        supabase.from("bom_imports").select("*").order("imported_at", { ascending: false }),
        supabase.from("bom_products").select("id, sap_code, description, recalculated_cost_mp, componentes_count, excluidos_pz_count, created_at").order("sap_code"),
      ]);
      if (isMounted) {
        if (importsRes.data) setBomImports(importsRes.data);
        if (productsRes.data) setBomProducts(productsRes.data);
        setLoadingHistory(false);
      }
    }
    fetchHistory();
    return () => { isMounted = false; };
  }, [supabase]);

  // =============================================
  // FILE UPLOAD HANDLER (preserved from original)
  // =============================================
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSavedMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rowsRaw: RowSAP[] = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];
      setPreview(rowsRaw);

      const rows: RowSAP[] = rowsRaw.filter((r) => !isHeaderRow(r));

      const uniqueComponentCodes = Array.from(new Set(rows.map(r => normalizeText(r.Codigo)).filter(c => c && !c.toUpperCase().startsWith("PZ"))));
      const costMap = new Map<string, number>();

      for (let i = 0; i < uniqueComponentCodes.length; i += 200) {
        const chunk = uniqueComponentCodes.slice(i, i + 200);
        const { data: costsData, error } = await supabase
          .from("component_costs")
          .select("codigo, costo_unitario")
          .in("codigo", chunk);
        if (costsData && !error) {
          costsData.forEach(d => costMap.set(d.codigo, Number(d.costo_unitario)));
        }
      }

      const productosOut: ProductoNivel1[] = [];
      let currentProduct: { codigo: string; desc: string } | null = null;
      let compSum = 0;
      let compCount = 0;
      let pzExcluded = 0;
      let realCostCount = 0;
      let excelCostCount = 0;
      let componentList: BOMComponentType[] = [];
      let parentStack: { nivel: number; codigo: string }[] = [];

      function flushProduct() {
        if (!currentProduct) return;
        productosOut.push({
          Codigo: currentProduct.codigo,
          Descripcion: currentProduct.desc,
          Costo_Mp: compSum,
          componentes_count: compCount,
          excluidos_PZ_count: pzExcluded,
          usaron_costo_real: realCostCount,
          usaron_costo_excel: excelCostCount,
          component_list: componentList,
        });
        currentProduct = null;
        compSum = 0; compCount = 0; pzExcluded = 0;
        realCostCount = 0; excelCostCount = 0;
        componentList = []; parentStack = [];
      }

      for (const r of rows) {
        const codigo = normalizeText(r.Codigo);
        const desc = normalizeText(r.Descripcion);
        const nivel = parseNumberSmart(r.Nivel);
        const cantidad = parseNumberSmart(r.Cantidad);
        const costoUnit = parseNumberSmart(r.Costo_Unitario);

        if (nivel === 1 && codigo) {
          flushProduct();
          currentProduct = { codigo, desc };
          continue;
        }

        if (currentProduct && codigo) {
          if (!Number.isFinite(nivel) || nivel <= 1) continue;

          while (parentStack.length > 0 && parentStack[parentStack.length - 1].nivel >= nivel) {
            parentStack.pop();
          }
          const parent_codigo = parentStack.length > 0 ? parentStack[parentStack.length - 1].codigo : currentProduct.codigo;
          parentStack.push({ nivel, codigo });

          componentList.push({ codigo, cantidad, costo_excel_fallback: costoUnit, nivel, parent_codigo });

          if (codigo.toUpperCase().startsWith("PZ")) { pzExcluded += 1; continue; }

          let effectiveCost = costoUnit || 0;
          if (costMap.has(codigo)) { effectiveCost = costMap.get(codigo)!; realCostCount += 1; }
          else { excelCostCount += 1; }

          const costoMpComponente = (cantidad || 0) * effectiveCost;
          compSum += costoMpComponente;
          compCount += 1;
        }
      }

      flushProduct();

      if (!productosOut.length) {
        const fallback = rows
          .filter((r: any) => parseNumberSmart(r.Nivel) === 1)
          .map((r: any) => ({
            Codigo: normalizeText(r.Codigo),
            Descripcion: normalizeText(r.Descripcion),
            Costo_Mp: parseNumberSmart(r.Costo_Mp) || 0,
            componentes_count: 0, excluidos_PZ_count: 0,
            usaron_costo_real: 0, usaron_costo_excel: 0,
            component_list: [],
          }))
          .filter((p) => p.Codigo.length > 0);

        setProductos(fallback);
        if (!fallback.length) {
          setError("No detecté productos. Verifica que el Excel tenga columnas: Codigo, Descripcion, Nivel, Cantidad, Costo_Unitario.");
        }
      } else {
        setProductos(productosOut);
      }
    } catch (err) {
      setError("Error leyendo el archivo. Verifica que sea un Excel válido (.xlsx).");
      setPreview([]); setProductos([]); setFileName(null);
    }

    setLoading(false);
  }

  // =============================================
  // SAVE HANDLER — WITH DEDUPLICATION
  // =============================================
  async function handleSave() {
    setError(null);
    setSavedMsg(null);
    if (!productos.length) { setError("No hay productos para guardar. Sube un Excel primero."); return; }

    setLoading(true);
    try {
      // 1. Create import record
      const { data: bImport, error: importError } = await supabase
        .from("bom_imports")
        .insert({ file_name: fileName || "Archivo sin nombre", source: "SAP_BOM_IMPORT", imported_at: new Date().toISOString() })
        .select().single();
      if (importError) throw importError;

      // 2. Ensure all products exist in products table
      const sapCodes = productos.map((p) => p.Codigo);
      const uniqueSapCodes = Array.from(new Set(sapCodes));
      const sapMap = new Map<string, string>();
      const step = 200;

      for (let i = 0; i < uniqueSapCodes.length; i += step) {
        const chunkCodes = uniqueSapCodes.slice(i, i + step);
        const { data: dbProducts, error: dbErr } = await supabase.from("products").select("id, sap_code").in("sap_code", chunkCodes);
        if (!dbErr && dbProducts) { for (const dp of dbProducts) { sapMap.set(dp.sap_code, dp.id); } }
      }

      const missingProducts = productos.filter(p => !sapMap.has(p.Codigo));
      const missingPayloadMap = new Map<string, any>();
      for (const p of missingProducts) {
        if (!missingPayloadMap.has(p.Codigo)) {
          missingPayloadMap.set(p.Codigo, { sap_code: p.Codigo, description: p.Descripcion, is_active: true });
        }
      }
      const missingPayload = Array.from(missingPayloadMap.values());

      if (missingPayload.length > 0) {
        for (let i = 0; i < missingPayload.length; i += step) {
          const chunk = missingPayload.slice(i, i + step);
          const { data: newProducts, error: insErr } = await supabase.from("products").insert(chunk).select("id, sap_code");
          if (insErr) throw new Error("Fallo al crear productos faltantes en el maestro.");
          if (newProducts) { for (const np of newProducts) { sapMap.set(np.sap_code, np.id); } }
        }
      }

      // 3. Fetch latest existing BOM product records for deduplication
      const { data: existingBom } = await supabase
        .from("bom_products")
        .select("id, product_id, sap_code, recalculated_cost_mp, componentes_count, excluidos_pz_count")
        .order("created_at", { ascending: false });

      // Build map: sap_code -> latest existing record
      const existingBomMap = new Map<string, any>();
      if (existingBom) {
        for (const eb of existingBom) {
          if (!existingBomMap.has(eb.sap_code)) {
            existingBomMap.set(eb.sap_code, eb);
          }
        }
      }

      // 4. Fetch existing components for comparison
      const existingBomIds = Array.from(existingBomMap.values()).map(b => b.id);
      const existingComponentsMap = new Map<string, string>(); // bom_product_id -> component fingerprint
      
      if (existingBomIds.length > 0) {
        for (let i = 0; i < existingBomIds.length; i += step) {
          const chunk = existingBomIds.slice(i, i + step);
          const { data: comps } = await supabase
            .from("bom_components")
            .select("bom_product_id, codigo, cantidad, costo_excel_fallback")
            .in("bom_product_id", chunk)
            .order("codigo");

          if (comps) {
            // Group by bom_product_id and create fingerprint
            const byProd = new Map<string, any[]>();
            for (const c of comps) {
              if (!byProd.has(c.bom_product_id)) byProd.set(c.bom_product_id, []);
              byProd.get(c.bom_product_id)!.push(c);
            }
            for (const [pid, compList] of byProd) {
              const fingerprint = compList
                .sort((a: any, b: any) => a.codigo.localeCompare(b.codigo))
                .map((c: any) => `${c.codigo}:${c.cantidad}`)
                .join("|");
              existingComponentsMap.set(pid, fingerprint);
            }
          }
        }
      }

      // 5. Classify each product: skip / update / new
      const bomData = productos.map((p) => ({
        bom_import_id: bImport.id,
        product_id: sapMap.get(p.Codigo) || null,
        sap_code: p.Codigo,
        description: p.Descripcion,
        recalculated_cost_mp: p.Costo_Mp,
        componentes_count: p.componentes_count,
        excluidos_pz_count: p.excluidos_PZ_count,
        component_list: p.component_list,
      }));

      const toInsert: typeof bomData = [];
      const toSkip: string[] = [];
      const toUpdateImportRef: string[] = []; // existing bom_product IDs to tag with new import

      for (const bd of bomData) {
        const existing = existingBomMap.get(bd.sap_code);
        if (existing) {
          // Compare cost
          const costMatch = Math.abs(Number(existing.recalculated_cost_mp) - bd.recalculated_cost_mp) < 0.01;
          
          // Compare component structure fingerprint
          const newFingerprint = bd.component_list
            .sort((a, b) => a.codigo.localeCompare(b.codigo))
            .map(c => `${c.codigo}:${c.cantidad}`)
            .join("|");
          const existingFingerprint = existingComponentsMap.get(existing.id) || "";
          const structureMatch = newFingerprint === existingFingerprint;

          if (costMatch && structureMatch) {
            // Same cost, same structure → skip insert, just tag import
            toSkip.push(bd.sap_code);
            toUpdateImportRef.push(existing.id);
          } else {
            // Different → allow new snapshot
            toInsert.push(bd);
          }
        } else {
          // No existing record → insert
          toInsert.push(bd);
        }
      }

      // 6. Update existing records to reference the new import (so they appear in history)
      if (toUpdateImportRef.length > 0) {
        for (let i = 0; i < toUpdateImportRef.length; i += step) {
          const chunk = toUpdateImportRef.slice(i, i + step);
          await supabase
            .from("bom_products")
            .update({ bom_import_id: bImport.id })
            .in("id", chunk);
        }
      }

      // 7. Insert only changed/new products
      const chunkSize = 500;
      let insertedProducts: any[] = [];
      
      if (toInsert.length > 0) {
        for (let i = 0; i < toInsert.length; i += chunkSize) {
          const chunk = toInsert.slice(i, i + chunkSize);
          const cleanChunk = chunk.map(({ component_list, ...rest }) => rest);
          const { data: inserted, error: insErr } = await supabase.from("bom_products").insert(cleanChunk).select("id, sap_code");
          if (insErr) throw insErr;
          if (inserted) insertedProducts = insertedProducts.concat(inserted);
        }

        // 8. Insert components for new records only
        const componentsPayload: any[] = [];
        for (const bd of toInsert) {
          const bomProd = insertedProducts.find(ip => ip.sap_code === bd.sap_code);
          if (bomProd && bd.component_list && bd.component_list.length > 0) {
            for (const c of bd.component_list) {
              componentsPayload.push({
                bom_product_id: bomProd.id,
                codigo: c.codigo, cantidad: c.cantidad,
                costo_excel_fallback: c.costo_excel_fallback,
                nivel: c.nivel, parent_codigo: c.parent_codigo
              });
            }
          }
        }

        if (componentsPayload.length > 0) {
          for (let i = 0; i < componentsPayload.length; i += chunkSize) {
            const chunk = componentsPayload.slice(i, i + chunkSize);
            const { error: compErr } = await supabase.from("bom_components").insert(chunk);
            if (compErr) throw compErr;
          }
        }
      }

      // 9. Summary message
      const parts: string[] = [];
      if (toInsert.length > 0) parts.push(`${toInsert.length} producto(s) actualizado(s) con nuevo costo`);
      if (toSkip.length > 0) parts.push(`${toSkip.length} sin cambios (costo reutilizado)`);
      setSavedMsg(`Guardado correctamente. ${parts.join(" · ")}`);
      
      // Refresh history
      const [importsRes, productsRes] = await Promise.all([
        supabase.from("bom_imports").select("*").order("imported_at", { ascending: false }),
        supabase.from("bom_products").select("id, sap_code, description, recalculated_cost_mp, componentes_count, excluidos_pz_count, created_at").order("sap_code"),
      ]);
      if (importsRes.data) setBomImports(importsRes.data);
      if (productsRes.data) setBomProducts(productsRes.data);

      // Reset upload area
      setProductos([]);
      setPreview([]);
      setFileName(null);
      setTimeout(() => setSavedMsg(null), 5000);
    } catch (e: any) {
      console.error(e);
      setError(`Error al guardar en base de datos: ${e?.message ?? "Error desconocido"}`);
    } finally {
      setLoading(false);
    }
  }

  function formatDateShort(isoString: string) {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${mins}`;
  }

  // =============================================
  // RENDER
  // =============================================
  return (
    <AppShell title="Importar BOM">
      <div className="relative z-10 w-full">
        <div className="w-full">
          {/* HEADER */}
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-3xl">
              <Link href="/" className="inline-flex items-center gap-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--text)]">
                <ArrowLeft className="h-4 w-4" /> Volver
              </Link>
              <h1 className="mt-5 text-3xl md:text-4xl font-semibold tracking-tight">
                Importar BOM (SAP)
              </h1>
              <p className="mt-2 text-[color:var(--muted)] leading-relaxed">
                Centro de control BOM. Sube archivos de SAP, consulta histórico de cargas y revisa los costos recalculados por producto.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleSave} disabled={!canSave}
                className="rounded-2xl px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-sm)] transition disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[var(--shadow-md)]"
                style={{ background: "var(--primary)" }}>
                <span className="inline-flex items-center gap-2">
                  <Save className="h-4 w-4" /> Guardar
                </span>
              </button>
            </div>
          </div>

          {/* UPLOAD CARD */}
          <div className="mt-8 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[var(--shadow-sm)]">
            <div className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-white shadow-[var(--shadow-sm)]">
                  <UploadCloud className="h-5 w-5 opacity-80" />
                </div>
                <div>
                  <div className="text-base font-semibold">Archivo Excel (SAP Export)</div>
                  <div className="text-sm text-[color:var(--muted)]">
                    Formato esperado: Codigo, Descripcion, Nivel, Cantidad, Costo_Unitario
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <label htmlFor="file-upload"
                  className="inline-flex cursor-pointer items-center rounded-2xl px-5 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition"
                  style={{ background: "var(--primary)" }}>
                  Seleccionar archivo
                </label>
                <input id="file-upload" type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
                <div className="text-sm text-[color:var(--muted)]">
                  {fileName ? (
                    <>Archivo: <span className="font-medium text-[color:var(--text)]">{fileName}</span></>
                  ) : (
                    <span>Ningún archivo seleccionado</span>
                  )}
                </div>
              </div>

              <p className="mt-4 text-xs text-[color:var(--muted)] leading-relaxed">
                Nota: Guardamos productos (Nivel 1) con su Costo_Mp recalculado (MP). El costo total del negocio se calculará en la simulación con cantidades.
              </p>

              {loading && <p className="mt-4 text-sm" style={{ color: "var(--primary)" }}>Procesando archivo…</p>}
              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
              {savedMsg && <p className="mt-4 text-sm text-green-700">{savedMsg}</p>}
            </div>
          </div>

          {/* DETECTED PRODUCTS FROM UPLOAD */}
          {productos.length > 0 && (
            <div className="mt-10">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-lg font-semibold">
                  Productos detectados (Nivel 1): {productos.length}
                </h3>
                <p className="text-sm text-[color:var(--muted)]">
                  MP recalculado = Σ (Cantidad × Costo_Unitario) de componentes, excluyendo PZ.
                </p>
              </div>
              <div className="mt-4 overflow-x-auto rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[var(--shadow-sm)]">
                <table className="w-full text-sm">
                  <thead className="bg-white/60">
                    <tr className="border-b border-[color:var(--border)]">
                      <th className="px-4 py-3 text-left font-semibold">Código</th>
                      <th className="px-4 py-3 text-left font-semibold">Descripción</th>
                      <th className="px-4 py-3 text-right font-semibold">Costo MP</th>
                      <th className="px-4 py-3 text-right font-semibold">Componentes</th>
                      <th className="px-4 py-3 text-right font-semibold">Excl. PZ</th>
                      <th className="px-4 py-3 text-right font-semibold">C. Real</th>
                      <th className="px-4 py-3 text-right font-semibold">C. Excel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos.slice(0, 50).map((p, i) => (
                      <tr key={i} className="border-t border-[color:var(--border)]">
                        <td className="px-4 py-3 font-medium">{p.Codigo}</td>
                        <td className="px-4 py-3 text-[color:var(--muted)]">{p.Descripcion}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatMoney(p.Costo_Mp)}</td>
                        <td className="px-4 py-3 text-right text-[color:var(--muted)]">{p.componentes_count || "—"}</td>
                        <td className="px-4 py-3 text-right text-[color:var(--muted)]">{p.excluidos_PZ_count || "—"}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-medium">{p.usaron_costo_real || 0}</td>
                        <td className="px-4 py-3 text-right text-slate-400 font-medium">{p.usaron_costo_excel || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-[color:var(--muted)]">Mostrando los primeros 50.</p>
            </div>
          )}

          {/* ============================================================ */}
          {/* SECTION: BOM FILE HISTORY                                     */}
          {/* ============================================================ */}
          <div className="mt-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-brand-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text-primary tracking-tight">Histórico de archivos BOM</h2>
                <p className="text-sm text-text-muted">Registro de todas las cargas de BOM realizadas desde SAP.</p>
              </div>
            </div>

            {loadingHistory ? (
              <div className="py-12 flex flex-col items-center justify-center border border-border-subtle rounded-2xl bg-white shadow-sm">
                <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-text-muted">Cargando histórico...</p>
              </div>
            ) : bomImports.length === 0 ? (
              <div className="border-2 border-dashed border-border-subtle rounded-2xl py-16 text-center bg-slate-50/50">
                <FolderOpen className="w-8 h-8 text-text-muted/40 mx-auto mb-3" />
                <p className="text-sm text-text-muted">No hay importaciones registradas aún.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 border-b border-border-subtle">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold text-text-primary">Archivo</th>
                      <th className="px-6 py-4 text-left font-semibold text-text-primary">Fuente</th>
                      <th className="px-6 py-4 text-left font-semibold text-text-primary">Fecha de Importación</th>
                      <th className="px-6 py-4 text-left font-semibold text-text-primary">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {bomImports.map((bi) => (
                      <tr key={bi.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 align-middle">
                          <div className="flex items-center gap-2.5">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <span className="font-medium text-text-primary">{bi.file_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-middle">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {bi.source}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-middle text-text-muted">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 opacity-50" />
                            {formatDateShort(bi.imported_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-middle text-text-muted text-xs italic">
                          {bi.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* SECTION: CURRENT BOM PRODUCT COSTS                            */}
          {/* ============================================================ */}
          <div className="mt-16 mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-brand-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text-primary tracking-tight">Productos y costos BOM actuales</h2>
                <p className="text-sm text-text-muted">Últimos costos MP recalculados por producto a partir de los BOM importados.</p>
              </div>
            </div>

            {loadingHistory ? (
              <div className="py-12 flex flex-col items-center justify-center border border-border-subtle rounded-2xl bg-white shadow-sm">
                <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-text-muted">Cargando costos...</p>
              </div>
            ) : bomProducts.length === 0 ? (
              <div className="border-2 border-dashed border-border-subtle rounded-2xl py-16 text-center bg-slate-50/50">
                <Package className="w-8 h-8 text-text-muted/40 mx-auto mb-3" />
                <p className="text-sm text-text-muted">No hay productos BOM procesados aún.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 border-b border-border-subtle">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold text-text-primary">Código SAP</th>
                      <th className="px-6 py-4 text-left font-semibold text-text-primary">Descripción</th>
                      <th className="px-6 py-4 text-right font-semibold text-text-primary">Costo MP Recalculado</th>
                      <th className="px-6 py-4 text-right font-semibold text-text-primary">Componentes</th>
                      <th className="px-6 py-4 text-right font-semibold text-text-primary">Excl. PZ</th>
                      <th className="px-6 py-4 text-left font-semibold text-text-primary">Última Actualización</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {bomProducts.map((bp) => (
                      <tr key={bp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 align-middle">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 tracking-tight">
                            {bp.sap_code}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-middle font-medium text-text-primary">
                          {bp.description}
                        </td>
                        <td className="px-6 py-4 text-right align-middle">
                          <span className="font-bold text-text-primary text-[15px]">
                            {formatMoney(Number(bp.recalculated_cost_mp))}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right align-middle text-text-muted">
                          {bp.componentes_count || "—"}
                        </td>
                        <td className="px-6 py-4 text-right align-middle text-text-muted">
                          {bp.excluidos_pz_count || "—"}
                        </td>
                        <td className="px-6 py-4 align-middle text-text-muted text-xs">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 opacity-50" />
                            {formatDateShort(bp.created_at)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </AppShell>
  );
}