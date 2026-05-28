"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Plus, Upload, Download, Settings } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { CostModal, type DBCost } from "@/components/CostModal";
import { CostUploadModal } from "@/components/CostUploadModal";
import { RecalculateImpactModal, type ImpactResult } from "@/components/RecalculateImpactModal";
import * as XLSX from "xlsx";
import { RefreshCw } from "lucide-react";
import { useTableDensity } from "@/contexts/TableDensityContext";

export default function RealCostsPage() {
  const [costs, setCosts] = useState<DBCost[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<DBCost | null>(null);

  const [isRecalculateModalOpen, setIsRecalculateModalOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [impacts, setImpacts] = useState<ImpactResult[]>([]);
  const { getTableClasses } = useTableDensity();
  const tableStyles = getTableClasses();

  const supabase = createClient();

  useEffect(() => {
    fetchCosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchCosts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("component_costs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCosts(data || []);
    } catch (err) {
      console.error("Error fetching costs:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecalculateBom() {
    setIsRecalculating(true);
    try {
      // 1. Fetch bom_products and their components
      const { data: bomData, error: bomErr } = await supabase
        .from("bom_products")
        .select(`
           id,
           sap_code,
           description,
           recalculated_cost_mp,
           bom_components (
              codigo,
              cantidad,
              costo_excel_fallback
           )
        `);

      if (bomErr) throw bomErr;
      if (!bomData || bomData.length === 0) {
        alert("No hay productos BOM procesados en la base de datos.");
        setIsRecalculating(false);
        return;
      }

      // 2. Fetch all real component costs into a lookup map
      const { data: realCostsData, error: costsErr } = await supabase
        .from("component_costs")
        .select("codigo, costo_unitario");

      if (costsErr) throw costsErr;

      const costMap = new Map<string, number>();
      (realCostsData || []).forEach(c => costMap.set(c.codigo, Number(c.costo_unitario)));

      // 3. Process recalculation
      const newImpacts: ImpactResult[] = [];

      for (const product of bomData) {
        const oldCost = Number(product.recalculated_cost_mp || 0);
        let newCost = 0;
        const affected: {codigo: string; diff: number}[] = [];

        if (product.bom_components && Array.isArray(product.bom_components)) {
          for (const comp of product.bom_components) {
            // Ignore PZ components exactly like BOM importer
            if (comp.codigo.toUpperCase().startsWith("PZ")) {
              continue;
            }

            const expectedReal = costMap.get(comp.codigo);
            const effectiveCost = expectedReal !== undefined ? expectedReal : Number(comp.costo_excel_fallback);

            newCost += (Number(comp.cantidad) * effectiveCost);

            // Add to affected if it was different
            const originalCost = Number(comp.costo_excel_fallback);
            if (expectedReal !== undefined && Math.abs(expectedReal - originalCost) > 0.01) {
              affected.push({ codigo: comp.codigo, diff: expectedReal - originalCost });
            }
          }
        } else {
          // If no components exist, cost remains the same.
          newCost = oldCost;
        }

        const deltaVal = newCost - oldCost;
        // Precision threshold for FP exactness (avoid 0.0000000001 diffs showing as changed)
        if (Math.abs(deltaVal) < 0.01) {
          newImpacts.push({
            bom_product_id: product.id,
            sap_code: product.sap_code,
            description: product.description,
            old_cost: oldCost,
            new_cost: newCost,
            delta_value: 0,
            delta_pct: 0,
            status: "UNCHANGED",
            affected_components: []
          });
        } else {
          newImpacts.push({
            bom_product_id: product.id,
            sap_code: product.sap_code,
            description: product.description,
            old_cost: oldCost,
            new_cost: newCost,
            delta_value: deltaVal,
            delta_pct: oldCost > 0 ? (deltaVal / oldCost) : 0,
            status: deltaVal > 0 ? "INCREASE" : "DECREASE",
            affected_components: affected
          });
        }
      }

      setImpacts(newImpacts);
      setIsRecalculateModalOpen(true);

    } catch (err) {
      console.error("Error running recalculation engine", err);
      alert("Ocurrió un error al procesar el recálculo.");
    } finally {
      setIsRecalculating(false);
    }
  }

  const handleDownloadTemplate = () => {
    const ws_data = [
      ["codigo", "costo_unitario", "moneda", "description"],
      ["AB-10020", 450.50, "COP", "Bisagra Acero"],
      ["PT-50992", 1.25, "USD", "Perfil Titanio"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Costos");
    XLSX.writeFile(wb, "Plantilla_Carga_Costos.xlsx");
  };

  const formatMoney = useMemo(() => {
    return (value: number, currency: string) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency === "USD" ? "USD" : "COP",
        minimumFractionDigits: currency === "USD" ? 2 : 0,
        maximumFractionDigits: 2,
      }).format(value);
  }, []);

  const filteredCosts = costs.filter(c => {
    const searchLower = searchQuery.toLowerCase();
    const matchCode = c.codigo.toLowerCase().includes(searchLower);
    const matchDesc = (c.description || "").toLowerCase().includes(searchLower);
    return matchCode || matchDesc;
  });

  return (
    <AppShell title="Costos Reales">
      <div className="relative z-10">

        {/* Page Header */}
        <div className="mt-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 caption mb-4 hover:opacity-80 transition-opacity">
              <ArrowLeft className="h-4 w-4" /> Volver al inicio
            </Link>
            <h1 className="flex items-center gap-3">
              <Settings className="w-8 h-8" style={{ color: "var(--blue-green)" }} />
              Costos Reales
            </h1>
            <p className="lead mt-2">
              Gestión maestra de costos unitarios reales. Las simulaciones priorizarán estos valores sobre los cargados desde BOM.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRecalculateBom}
              disabled={isRecalculating}
              className="btn btn--primary disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRecalculating ? "animate-spin" : ""}`} />
              Recalcular Costos BOM
            </button>

            <div className="w-px h-6" style={{ background: "var(--border-hair)" }} />

            <button onClick={handleDownloadTemplate} className="btn btn--secondary">
              <Download className="w-4 h-4" /> Plantilla
            </button>
            <button onClick={() => setIsUploadModalOpen(true)} className="btn btn--secondary">
              <Upload className="w-4 h-4" /> Cargar Masivo
            </button>
            <button
              onClick={() => { setEditingCost(null); setIsCreateModalOpen(true); }}
              className="btn btn--primary"
            >
              <Plus className="w-4 h-4" /> Crear Manual
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="surface-card mt-8 p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--fg-muted)" }} />
            <input
              type="text"
              placeholder="Buscar por código o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ paddingLeft: 36 }}
            />
          </div>
          <div className="w-full sm:w-auto text-sm" style={{ color: "var(--fg-muted)" }}>
            Total en sistema: <strong style={{ color: "var(--fg-primary)" }}>{costs.length}</strong>
          </div>
        </div>

        {/* Table Area */}
        {loading ? (
          <div className="surface-card mt-8 py-24 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 rounded-full animate-spin mb-4"
              style={{ borderColor: "var(--navy)", borderTopColor: "transparent" }} />
            <p className="caption">Cargando maestro de costos...</p>
          </div>
        ) : filteredCosts.length === 0 ? (
          <div className="mt-8 py-24 px-6 text-center flex flex-col items-center justify-center"
            style={{ border: "0.5px dashed var(--blue-green)", borderRadius: "var(--radius-xl)" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "var(--info-soft)", color: "var(--blue-green)" }}>
              <Settings className="w-8 h-8" />
            </div>
            <h3 className="mb-2">
              {searchQuery ? "No se encontraron componentes" : "Maestro de costos vacío"}
            </h3>
            <p className="caption max-w-sm">
              {searchQuery
                ? "Prueba buscar utilizando otros términos."
                : "Aún no hay configuraciones de costo. Haz una carga masiva o agrega el primero manualmente."}
            </p>
          </div>
        ) : (
          <div className="surface-card mt-8 overflow-hidden">
            <div className="overflow-x-auto">
              <table className={`w-full ${tableStyles.tableWrapper}`}>
                <thead style={{ background: "var(--bg-hover)", borderBottom: "0.5px solid var(--border-hair)" }}>
                  <tr>
                    <th className={`overline text-left w-44 ${tableStyles.th}`}>Código Componente</th>
                    <th className={`overline text-left max-w-[280px] ${tableStyles.th}`}>Descripción</th>
                    <th className={`overline text-right min-w-[140px] ${tableStyles.th}`}>Costo Base</th>
                    <th className={`overline text-center min-w-[80px] ${tableStyles.th}`}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCosts.map((c) => (
                    <tr key={c.id} className="[border-bottom:0.5px_solid_var(--border-hair)] hover:bg-[color:var(--bg-hover)] transition-colors group">
                      <td className={`align-middle font-mono font-semibold ${tableStyles.td}`} style={{ color: "var(--fg-primary)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                        {c.codigo}
                      </td>
                      <td className={`align-middle max-w-[280px] ${tableStyles.td}`} style={{ color: "var(--fg-primary)" }}>
                        {c.description || <span style={{ fontStyle: "italic", opacity: 0.5, color: "var(--fg-muted)" }}>Sin descripción</span>}
                      </td>
                      <td className={`text-right align-middle ${tableStyles.td}`}>
                        <div className="flex flex-col items-end">
                          <span className="font-semibold" style={{ color: "var(--fg-primary)" }}>
                            {formatMoney(c.costo_unitario, c.moneda)}
                          </span>
                          <span className={`pill mt-1 ${tableStyles.badge}`} style={{ background: "var(--info-soft)", color: "var(--blue-green)", borderColor: "rgba(116,144,148,0.30)" }}>{c.moneda}</span>
                        </div>
                      </td>
                      <td className={`text-center align-middle ${tableStyles.td}`}>
                        <button
                          onClick={() => { setEditingCost(c); setIsCreateModalOpen(true); }}
                          className={`btn btn--ghost ${tableStyles.button}`}
                          title="Editar Costo"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <CostModal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); setEditingCost(null); }}
        onSuccess={fetchCosts}
        editCost={editingCost}
      />

      <CostUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={fetchCosts}
      />

      <RecalculateImpactModal
        isOpen={isRecalculateModalOpen}
        onClose={() => setIsRecalculateModalOpen(false)}
        onConfirm={() => {
          setIsRecalculateModalOpen(false);
          // Podríamos lanzar notificación o refrescar pero public.bom_products no se expone aquí directamete
          alert("BOM re-sincronizado exitosamente.");
        }}
        impacts={impacts}
      />
    </AppShell>
  );
}
