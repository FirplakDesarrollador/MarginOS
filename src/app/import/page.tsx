"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UploadCloud, Save } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard-ui";
import { createClient } from "@/lib/supabase/client";

type RowSAP = {
  Codigo?: any;
  Descripcion?: any;
  UnidadMedida?: any;
  Nivel?: any;
  Cantidad?: any;
  Costo_Unitario?: any;
  Costo_Mp?: any;
};

type ProductoNivel1 = {
  Codigo: string;
  Descripcion: string;
  Costo_Mp: number; // recalculado según reglas
  componentes_count: number;
  excluidos_PZ_count: number;
};

function normalizeText(v: any) {
  return String(v ?? "").trim();
}

function isHeaderRow(r: any) {
  const c = normalizeText(r?.Codigo).toLowerCase();
  const d = normalizeText(r?.Descripcion).toLowerCase();
  const n = normalizeText(r?.Nivel).toLowerCase();
  // En SAP a veces repite fila de títulos dentro del archivo
  return c === "codigo" && d === "descripcion" && (n === "nivel" || n.length > 0);
}

function parseNumberSmart(v: any): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  let s = String(v).trim();
  if (!s) return 0;

  // Quita espacios
  s = s.replace(/\s/g, "");

  // Caso típico:
  // - "96,909.89" (miles con coma, decimales con punto) -> ok
  // - "3,650" (miles con coma) -> ok
  // - "96.909,89" (formato europeo) -> convertir a 96909.89
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // decide cuál es decimal mirando el último separador
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      // decimal = coma, miles = punto
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // decimal = punto, miles = coma
      s = s.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    // "3,650" -> miles con coma
    s = s.replace(/,/g, "");
  } else {
    // solo punto o nada -> normal
  }

  const num = Number(s);
  return Number.isFinite(num) ? num : 0;
}

export default function ImportBOMPage() {
  const router = useRouter();

  const [preview, setPreview] = useState<any[]>([]);
  const [productos, setProductos] = useState<ProductoNivel1[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const canSave = productos.length > 0 && !loading;

  const formatMoney = useMemo(() => {
    return (value: number) =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
  }, []);

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

      // IMPORTANT: defval para no perder columnas vacías
      const rowsRaw: RowSAP[] = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];

      setPreview(rowsRaw);

      // --- 1) Normaliza y detecta bloques por "fila de títulos" ---
      const rows: RowSAP[] = rowsRaw.filter((r) => !isHeaderRow(r));

      // --- 2) Recorre en orden y arma productos por bloque ---
      const productosOut: ProductoNivel1[] = [];

      let currentProduct: { codigo: string; desc: string } | null = null;
      let compSum = 0;
      let compCount = 0;
      let pzExcluded = 0;

      function flushProduct() {
        if (!currentProduct) return;
        productosOut.push({
          Codigo: currentProduct.codigo,
          Descripcion: currentProduct.desc,
          Costo_Mp: compSum, // ✅ REGLA: MP recalculado por suma de componentes (excluye PZ)
          componentes_count: compCount,
          excluidos_PZ_count: pzExcluded,
        });
        currentProduct = null;
        compSum = 0;
        compCount = 0;
        pzExcluded = 0;
      }

      for (const r of rows) {
        const codigo = normalizeText(r.Codigo);
        const desc = normalizeText(r.Descripcion);
        const nivel = parseNumberSmart(r.Nivel);
        const cantidad = parseNumberSmart(r.Cantidad);
        const costoUnit = parseNumberSmart(r.Costo_Unitario);

        // Si encuentro un Nivel 1, empieza un nuevo producto
        if (nivel === 1 && codigo) {
          // guarda el anterior
          flushProduct();

          currentProduct = { codigo, desc };

          continue;
        }

        // Componentes del producto actual
        if (currentProduct && codigo) {
          // omite filas sin nivel válido
          if (!Number.isFinite(nivel) || nivel <= 1) continue;

          // ✅ REGLA 1: omitir suma de Costo_Mp de códigos que inician con "PZ"
          if (codigo.toUpperCase().startsWith("PZ")) {
            pzExcluded += 1;
            continue;
          }

          // ✅ Recalcular costo_mp del componente: Cantidad * Costo_Unitario
          const costoMpComponente = (cantidad || 0) * (costoUnit || 0);

          compSum += costoMpComponente;
          compCount += 1;
        }
      }

      // flush último
      flushProduct();

      // Fallback: si no detectó por bloques, usa Nivel=1 como venías haciendo
      if (!productosOut.length) {
        const fallback = rows
          .filter((r: any) => parseNumberSmart(r.Nivel) === 1)
          .map((r: any) => ({
            Codigo: normalizeText(r.Codigo),
            Descripcion: normalizeText(r.Descripcion),
            Costo_Mp: parseNumberSmart(r.Costo_Mp) || 0,
            componentes_count: 0,
            excluidos_PZ_count: 0,
          }))
          .filter((p) => p.Codigo.length > 0);

        setProductos(fallback);

        if (!fallback.length) {
          setError(
            "No detecté productos. Verifica que el Excel tenga columnas: Codigo, Descripcion, Nivel, Cantidad, Costo_Unitario."
          );
        }
      } else {
        setProductos(productosOut);
      }
    } catch (err) {
      setError("Error leyendo el archivo. Verifica que sea un Excel válido (.xlsx).");
      setPreview([]);
      setProductos([]);
      setFileName(null);
    }

    setLoading(false);
  }

  async function handleSave() {
    setError(null);
    setSavedMsg(null);

    if (!productos.length) {
      setError("No hay productos para guardar. Sube un Excel primero.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      
      const { data: bImport, error: importError } = await supabase
        .from("bom_imports")
        .insert({
          file_name: fileName || "Archivo sin nombre",
          source: "SAP_BOM_IMPORT",
          imported_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (importError) throw importError;

      const sapCodes = productos.map((p) => p.Codigo);

      // Usar limitados chunks si existen demasiados
      const sapMap = new Map<string, string>();
      const step = 200;
      for (let i = 0; i < sapCodes.length; i += step) {
        const chunkCodes = sapCodes.slice(i, i + step);
        const { data: dbProducts, error: dbErr } = await supabase
          .from("products")
          .select("id, sap_code")
          .in("sap_code", chunkCodes);

        if (!dbErr && dbProducts) {
          for (const dp of dbProducts) {
            sapMap.set(dp.sap_code, dp.id);
          }
        }
      }

      const bomData = productos.map((p) => ({
        bom_import_id: bImport.id,
        product_id: sapMap.get(p.Codigo) || null,
        sap_code: p.Codigo,
        description: p.Descripcion,
        recalculated_cost_mp: p.Costo_Mp,
        componentes_count: p.componentes_count,
        excluidos_pz_count: p.excluidos_PZ_count,
      }));

      const chunkSize = 500;
      for (let i = 0; i < bomData.length; i += chunkSize) {
        const chunk = bomData.slice(i, i + chunkSize);
        const { error: insErr } = await supabase.from("bom_products").insert(chunk);
        if (insErr) throw insErr;
      }

      setSavedMsg("Guardado correctamente en base de datos. Regresando...");
      setTimeout(() => router.back(), 1500);

    } catch (e: any) {
      console.error(e);
      setError(`Error al guardar en base de datos: ${e?.message ?? "Error desconocido"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)] pb-24">
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-8">
        <DashboardHeader />

        <div className="max-w-6xl">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-3xl">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--text)]"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>

              <h1 className="mt-5 text-3xl md:text-4xl font-semibold tracking-tight">
                Importar BOM (SAP)
              </h1>

              <p className="mt-2 text-[color:var(--muted)] leading-relaxed">
                Sube el Excel exportado de SAP. Esta pantalla detecta productos por bloques,
                recalcula MP por componentes, y excluye códigos que inician con <b>PZ</b>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--text)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition"
              >
                Volver
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="rounded-2xl px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-sm)] transition disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[var(--shadow-md)]"
                style={{ background: "var(--primary)" }}
              >
                <span className="inline-flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Guardar
                </span>
              </button>
            </div>
          </div>

          {/* Upload Card */}
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
                <label
                  htmlFor="file-upload"
                  className="inline-flex cursor-pointer items-center rounded-2xl px-5 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition"
                  style={{ background: "var(--primary)" }}
                >
                  Seleccionar archivo
                </label>

                <input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="text-sm text-[color:var(--muted)]">
                  {fileName ? (
                    <>
                      Archivo: <span className="font-medium text-[color:var(--text)]">{fileName}</span>
                    </>
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

          {/* Products Table */}
          {productos.length > 0 && (
            <div className="mt-10">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-lg font-semibold">
                  Productos detectados (Nivel 1): {productos.length}
                </h3>
                <p className="text-sm text-[color:var(--muted)]">
                  MP recalculado = Σ (Cantidad * Costo_Unitario) de componentes, excluyendo PZ.
                </p>
              </div>

              <div className="mt-4 overflow-x-auto rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[var(--shadow-sm)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/60">
                    <tr className="border-b border-[color:var(--border)]">
                      <th className="px-4 py-3 text-left font-semibold">Código</th>
                      <th className="px-4 py-3 text-left font-semibold">Descripción</th>
                      <th className="px-4 py-3 text-right font-semibold">Costo MP</th>
                      <th className="px-4 py-3 text-right font-semibold">Componentes</th>
                      <th className="px-4 py-3 text-right font-semibold">Excl. PZ</th>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-2 text-xs text-[color:var(--muted)]">Mostrando los primeros 50.</p>
            </div>
          )}

          {/* RAW Preview */}
          {preview.length > 0 && (
            <div className="mt-12">
              <h3 className="text-lg font-semibold mb-3">Preview RAW (primeras 5 filas)</h3>

              <div className="space-y-3">
                {preview.slice(0, 5).map((row, i) => (
                  <pre
                    key={i}
                    className="rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-white p-4 text-xs overflow-x-auto shadow-[var(--shadow-sm)]"
                  >
                    {JSON.stringify(row, null, 2)}
                  </pre>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}