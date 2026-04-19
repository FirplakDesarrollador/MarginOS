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
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary flex items-center gap-3">
              <Settings className="w-8 h-8 text-brand-primary" />
              Costos Reales
            </h1>
            <p className="mt-2 text-text-muted leading-relaxed max-w-2xl">
              Gestión maestra de costos unitarios reales. Las simulaciones priorizarán estos valores sobre los cargados desde BOM.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRecalculateBom}
              disabled={isRecalculating}
              className="inline-flex items-center gap-2 px-5 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-all shadow-sm shadow-slate-900/20 hover:-translate-y-0.5 disabled:opacity-50"
            >
              {isRecalculating ? (
                 <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                 <RefreshCw className="w-4 h-4" />
              )}
              Recalcular Costos BOM
            </button>

            <div className="w-px h-6 bg-border-subtle mx-2" /> {/* Divider */}

            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border-subtle bg-white text-text-primary text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-text-muted" />
              Plantilla
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border-subtle bg-white text-text-primary text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4 text-text-muted" />
              Cargar Masivo
            </button>
            <button
              onClick={() => {
                setEditingCost(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-brand-accent transition-all shadow-sm shadow-brand-primary/20 hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              Crear Manual
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 bg-white p-4 border border-border-subtle rounded-2xl shadow-sm">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar por código o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all bg-slate-50/50"
            />
          </div>
          <div className="w-full sm:w-auto text-sm text-[color:var(--muted)]">
            Total en sistema: <strong className="text-[color:var(--text)]">{costs.length}</strong>
          </div>
        </div>

        {/* Table Area */}
        {loading ? (
          <div className="mt-6 py-24 flex flex-col items-center justify-center border border-border-subtle rounded-2xl bg-white shadow-sm">
             <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
             <p className="text-sm font-medium text-text-muted">Cargando maestro de costos...</p>
          </div>
        ) : filteredCosts.length === 0 ? (
          <div className="mt-6 border-2 border-dashed border-border-subtle rounded-3xl py-24 px-6 text-center bg-slate-50/50 shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-white border border-border-subtle rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <Settings className="w-8 h-8 text-text-muted/50" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2 tracking-tight">
              {searchQuery ? "No se encontraron componentes" : "Maestro de costos vacío"}
            </h3>
            <p className="text-sm text-text-muted max-w-sm mb-6">
              {searchQuery 
                ? "Prueba buscar utilizando otros términos." 
                : "Aún no hay configuraciones de costo. Haz una carga masiva o agrege el primero manualmente."}
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-border-subtle">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary w-48">Código Componente</th>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary">Descripción</th>
                  <th className="px-6 py-4 text-right font-semibold text-text-primary w-40">Costo Base</th>
                  <th className="px-6 py-4 text-center font-semibold text-text-primary w-24">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredCosts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-text-primary align-middle font-mono">
                      {c.codigo}
                    </td>
                    <td className="px-6 py-4 align-middle text-text-muted">
                      {c.description || <span className="italic opacity-60">Sin descripción</span>}
                    </td>
                    <td className="px-6 py-4 text-right align-middle">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-text-primary">
                          {formatMoney(c.costo_unitario, c.moneda)}
                        </span>
                        <span className="text-[10px] text-text-muted font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mt-1">
                          {c.moneda}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center align-middle">
                      <button
                        onClick={() => {
                          setEditingCost(c);
                          setIsCreateModalOpen(true);
                        }}
                        className="p-2 text-brand-primary hover:text-white hover:bg-brand-primary rounded-lg transition-colors border border-brand-primary/20 hover:border-transparent opacity-0 group-hover:opacity-100 shadow-sm"
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
        )}
      </div>

      <CostModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingCost(null);
        }}
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
