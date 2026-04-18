"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle, Search, X, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type ImpactResult = {
  bom_product_id: string;
  sap_code: string;
  description: string;
  old_cost: number;
  new_cost: number;
  delta_value: number;
  delta_pct: number;
  status: "DECREASE" | "INCREASE" | "UNCHANGED";
  affected_components: { codigo: string; diff: number }[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  impacts: ImpactResult[];
};

export function RecalculateImpactModal({ isOpen, onClose, onConfirm, impacts }: Props) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const totalAnalyzed = impacts.length;
  const changedImpacts = impacts.filter(i => i.status !== "UNCHANGED");
  const affectedCount = changedImpacts.length;
  const unchangedCount = totalAnalyzed - affectedCount;
  const increasedCount = impacts.filter(i => i.status === "INCREASE").length;
  const decreasedCount = impacts.filter(i => i.status === "DECREASE").length;

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(value);

  const formatPct = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  const filteredImpacts = changedImpacts.filter(i => 
     i.sap_code.toLowerCase().includes(searchQuery.toLowerCase()) || 
     i.description.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => Math.abs(b.delta_pct) - Math.abs(a.delta_pct)); // Sort by largest impact

  async function handleConfirm() {
    setIsUpdating(true);
    const supabase = createClient();
    try {
      const toUpdate = changedImpacts;
      
      for (const item of toUpdate) {
         // Validate numeric payload as requested
         if (isNaN(item.new_cost) || item.new_cost === undefined || item.new_cost === null) {
            console.error("[BOM UPDATE ERROR] payload inyectado no es seguro:", item);
            throw new Error(`Costo numérico inválido (NaN) para SAP ${item.sap_code}`);
         }
         
         const payload = { recalculated_cost_mp: item.new_cost };
         
         console.log(`[BOM UPDATE INIT] product_id: ${item.bom_product_id} | old: ${item.old_cost} | new: ${item.new_cost}`, payload);

         // Precisely target individual row
         const { data, error } = await supabase
            .from("bom_products")
            .update(payload)
            .eq("id", item.bom_product_id)
            .select("id");

         if (error) {
            console.error("[BOM UPDATE ERROR] Error detallado de Supabase:", {
               message: error.message,
               code: error.code,
               details: error.details,
               hint: error.hint
            });
            throw error;
         }
         
         console.log(`[BOM UPDATE SUCCESS] DB Response:`, data);
      }

      onConfirm();
    } catch (err: any) {
      console.error("Excepción completa atrapada en handleConfirm:", err);
      alert(`Ocurrió un error al guardar los recálculos.\nDetalle: ${err?.message || "Revisa la consola para más detalles técnicos."}`);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={() => !isUpdating && onClose()}
      />
      
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-xl border border-border-subtle flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center">
               <Activity className="w-5 h-5 text-brand-primary" />
            </div>
            <div>
               <h2 className="text-xl font-semibold text-text-primary">Impacto de Actualización de Costos</h2>
               <p className="text-sm text-text-muted">Análisis de Nivel 1 tras modificar componentes en Costos Reales</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-slate-200/50 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
           
           {/* KPI Row */}
           <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 rounded-xl border border-border-subtle bg-white shadow-sm flex flex-col">
                 <span className="text-xs font-medium text-text-muted mb-1">Total Analizados</span>
                 <span className="text-2xl font-bold text-text-primary">{totalAnalyzed}</span>
              </div>
              <div className="p-4 rounded-xl border border-border-subtle bg-white shadow-sm flex flex-col">
                 <span className="text-xs font-medium text-text-muted mb-1">Sin Cambio</span>
                 <span className="text-2xl font-bold text-slate-500">{unchangedCount}</span>
              </div>
              <div className="p-4 rounded-xl border border-border-subtle bg-slate-50 shadow-sm flex flex-col">
                 <span className="text-xs font-medium text-text-muted mb-1">Afectados</span>
                 <span className="text-2xl font-bold text-brand-primary">{affectedCount}</span>
              </div>
              <div className="p-4 rounded-xl border border-red-100 bg-red-50/50 shadow-sm flex flex-col">
                 <span className="text-xs font-medium text-red-700 mb-1">Costo Sube</span>
                 <span className="text-2xl font-bold text-red-600">{increasedCount}</span>
              </div>
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 shadow-sm flex flex-col">
                 <span className="text-xs font-medium text-emerald-700 mb-1">Costo Baja</span>
                 <span className="text-2xl font-bold text-emerald-600">{decreasedCount}</span>
              </div>
           </div>

           {affectedCount === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-border-subtle rounded-2xl bg-slate-50/50">
                 <CheckCircle className="w-12 h-12 text-emerald-500 mb-4" />
                 <h3 className="text-lg font-semibold text-text-primary mb-1">Sin Alteraciones Estructurales</h3>
                 <p className="text-sm text-text-muted max-w-sm">Los costos reales modificados actualmente no impactan a ningún producto ensamblado base en public.bom_products.</p>
              </div>
           ) : (
             <div className="flex flex-col flex-1 min-h-0 border border-border-subtle rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-50 border-b border-border-subtle relative flex items-center justify-between">
                   <h3 className="text-sm font-semibold text-text-primary">Detalle de Impacto (Productos Afectados)</h3>
                   <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input 
                         type="text" 
                         placeholder="Buscar SAP o nombre..."
                         value={searchQuery}
                         onChange={e => setSearchQuery(e.target.value)}
                         className="pl-8 pr-3 py-1.5 text-sm border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary/30 w-64 bg-white"
                      />
                   </div>
                </div>
                
                <div className="overflow-x-auto flex-1 h-[400px]">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-white sticky top-0 shadow-sm z-10">
                       <tr className="border-b border-border-subtle text-xs uppercase tracking-wide text-text-muted">
                         <th className="px-4 py-3 font-semibold w-32">Código SAP</th>
                         <th className="px-4 py-3 font-semibold">Producto Nivel 1</th>
                         <th className="px-4 py-3 font-semibold text-right">Costo Anterior</th>
                         <th className="px-4 py-3 font-semibold text-center w-8"></th>
                         <th className="px-4 py-3 font-semibold text-right">Costo Nuevo</th>
                         <th className="px-4 py-3 font-semibold text-right">Δ Valor</th>
                         <th className="px-4 py-3 font-semibold text-right">Δ %</th>
                         <th className="px-4 py-3 font-semibold text-center">Estado</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-border-subtle">
                       {filteredImpacts.map(item => (
                         <tr key={item.bom_product_id} className="hover:bg-slate-50/50 bg-white group">
                           <td className="px-4 py-3 font-mono font-semibold text-text-primary">{item.sap_code}</td>
                           <td className="px-4 py-3 text-text-muted">
                              <div className="truncate max-w-[200px]" title={item.description}>{item.description}</div>
                              {item.affected_components.length > 0 && (
                                 <div className="flex gap-1 mt-1 flex-wrap">
                                    {item.affected_components.slice(0, 3).map(c => (
                                       <span key={c.codigo} className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-600 font-mono">
                                          {c.codigo}
                                       </span>
                                    ))}
                                    {item.affected_components.length > 3 && (
                                       <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-600 font-mono">
                                          +{item.affected_components.length - 3}
                                       </span>
                                    )}
                                 </div>
                              )}
                           </td>
                           <td className="px-4 py-3 text-right font-medium text-slate-500">{formatMoney(item.old_cost)}</td>
                           <td className="px-0 py-3 text-center"><ArrowRight className="w-3 h-3 text-slate-300 mx-auto" /></td>
                           <td className="px-4 py-3 text-right font-semibold text-text-primary">{formatMoney(item.new_cost)}</td>
                           <td className="px-4 py-3 text-right">
                              <span className={`font-medium ${item.delta_value > 0 ? "text-red-600" : "text-emerald-600"}`}>
                                 {item.delta_value > 0 ? "+" : ""}{formatMoney(item.delta_value)}
                              </span>
                           </td>
                           <td className="px-4 py-3 text-right">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-bold ${item.delta_value > 0 ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
                                 {item.delta_value > 0 ? "+" : ""}{formatPct(item.delta_pct)}
                              </span>
                           </td>
                           <td className="px-4 py-3 text-center">
                              {item.status === "INCREASE" ? (
                                 <span className="flex items-center justify-center gap-1 text-xs font-semibold text-red-600"><AlertTriangle className="w-3.5 h-3.5"/> Margen en Riesgo</span>
                              ) : (
                                 <span className="flex items-center justify-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle className="w-3.5 h-3.5"/> Favorable</span>
                              )}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
             </div>
           )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between border-t border-border-subtle bg-slate-50/50">
          <div className="text-xs text-text-muted flex items-center gap-2">
             <AlertTriangle className="w-4 h-4 text-amber-500" />
             Las simulaciones históricas (versiones base) no serán alteradas.
          </div>
          <div className="flex items-center gap-3">
             <button
               type="button"
               onClick={onClose}
               disabled={isUpdating}
               className="px-5 py-2.5 bg-white border border-border-subtle text-text-primary text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
             >
               Cancelar Recálculo
             </button>
             {affectedCount > 0 && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-brand-accent transition-all shadow-sm shadow-brand-primary/20 hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {isUpdating ? "Aplicando..." : "Confirmar Actualización"}
                </button>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
