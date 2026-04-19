"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, RefreshCw, FolderOpen, AlertCircle } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard-ui";
import { createClient } from "@/lib/supabase/client";
import { exportSimulationToExcel } from "@/lib/excelExport";
import { useRouter } from "next/navigation";

type Simulation = {
  id: string;
  simulation_type: string;
  project_name: string | null;
  currency: string;
  trm: number | null;
  valid_from: string | null;
  valid_to: string | null;
  status: string;
  created_at: string;
  customers?: { name: string; nit: string; contact_name: string };
  sales_channels?: { name: string };
};

export default function ScenariosPage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Action Modal State
  const [actionSim, setActionSim] = useState<Simulation | null>(null);
  const [exporting, setExporting] = useState(false);
  const router = useRouter();

  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;
    
    async function fetchSimulations() {
      try {
        const { data, error } = await supabase
          .from("simulations")
          .select("*, customers(name, nit, contact_name), sales_channels(name)")
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        if (isMounted && data) {
          setSimulations(data);
        }
      } catch (err) {
        console.error("Error fetching scenarios:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchSimulations();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  function formatDate(isoString: string | null) {
    if (!isoString) return "—";
    // Si viene de base de datos como YYYY-MM-DD
    const [year, month, day] = isoString.split("T")[0].split("-");
    if (!year || !month || !day) return "—";
    return `${day}/${month}/${year}`;
  }

  function formatDateTime(isoString: string) {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    
    return `${day}/${month}/${year} ${hours}:${mins}`;
  }

  function getStatusPill(status: string) {
    switch (status) {
      case "VIGENTE":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            Vigente
          </span>
        );
      case "VENCIDO":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
            Vencido
          </span>
        );
      case "RENOVADA":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            Renovada
          </span>
        );
      case "DRAFT":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Draft / Borrador
          </span>
        );
    }
  }

  function getTypeLabel(type: string) {
    if (type === "PRICE_LIST") return "Lista de precios";
    if (type === "PROJECT_PROMO") return "Proyecto / Promoción";
    return type;
  }

  function handleRenovar(id: string) {
    // Placeholder function for renewal logic
    console.log("Renovando simulación:", id);
    alert(`Regla de renovación iniciada para el ID:\n${id}\n\n(Lógica a implementar más adelante)`);
  }

  async function handleExport(sim: Simulation) {
    setExporting(true);
    try {
      const { data: lines, error } = await supabase
        .from("simulation_lines")
        .select("*")
        .eq("simulation_id", sim.id);
        
      if (error) throw error;
      if (!lines || lines.length === 0) {
         alert("Esta simulación no tiene líneas guardadas para exportar.");
         return;
      }

      // Fetch version tracing if exists
      const { data: versionData } = await supabase
        .from("simulation_versions")
        .select("version_type, original_simulation_id, created_at")
        .eq("renewed_simulation_id", sim.id)
        .maybeSingle();

      await exportSimulationToExcel(sim, lines, versionData);
    } catch (err) {
       console.error(err);
       alert("Error exportando excel.");
    } finally {
       setExporting(false);
       setActionSim(null);
    }
  }

  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)] pb-24">
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-8">
        <DashboardHeader />

        <div className="mt-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Escenarios</h1>
            <p className="mt-2 text-text-muted leading-relaxed max-w-2xl">
              Historial de simulaciones. Revisa, edita o renueva condiciones comerciales previas y 
              mantén trazabilidad de cada precio entregado al cliente.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-12 py-24 flex flex-col items-center justify-center border border-border-subtle rounded-2xl bg-white shadow-sm">
            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-text-muted">Cargando escenarios...</p>
          </div>
        ) : simulations.length === 0 ? (
          <div className="mt-12 border-2 border-dashed border-border-subtle rounded-3xl py-24 px-6 text-center bg-slate-50/50 shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-white border border-border-subtle rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <FolderOpen className="w-8 h-8 text-text-muted/50" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2 tracking-tight">
              No hay escenarios guardados
            </h3>
            <p className="text-sm text-text-muted max-w-sm">
              Cuando guardes simulaciones desde la herramienta de pricing, aparecerán aquí estructuradas automáticamente.
            </p>
            <Link
              href="/simulator"
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-brand-accent transition-all shadow-sm hover:shadow-brand-primary/20 hover:-translate-y-0.5"
            >
              Crear nueva simulación
            </Link>
          </div>
        ) : (
          <div className="mt-10 overflow-x-auto rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-border-subtle">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary whitespace-nowrap">Fecha Creación</th>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary whitespace-nowrap">Cliente / Canal</th>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary min-w-[200px]">Proyecto / Oportunidad</th>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary">Moneda</th>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary whitespace-nowrap">Vigencia</th>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary">Estado</th>
                  <th className="px-6 py-4 text-center font-semibold text-text-primary w-24">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {simulations.map((sim) => (
                  <tr key={sim.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5 text-text-muted whitespace-nowrap align-middle">
                      {formatDateTime(sim.created_at)}
                    </td>
                    
                    <td className="px-6 py-5 font-medium text-text-primary align-middle">
                      <div className="flex flex-col">
                         <span className="font-semibold">{sim.customers?.name || "Sin Cliente"}</span>
                         <span className="text-[11px] text-text-muted mt-0.5">{sim.sales_channels?.name || "Sin Canal"} • {getTypeLabel(sim.simulation_type)}</span>
                      </div>
                    </td>

                    <td className="px-6 py-5 align-middle">
                      {sim.project_name ? (
                        <span className="font-semibold text-text-primary">
                          {sim.project_name}
                        </span>
                      ) : (
                        <span className="text-text-muted italic flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 opacity-50" />
                          Sin especificar
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-5 align-middle">
                      <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {sim.currency}
                      </div>
                    </td>

                    <td className="px-6 py-5 text-text-muted whitespace-nowrap align-middle">
                      {sim.valid_from && sim.valid_to ? (
                        <span className="font-medium text-text-primary">
                          {formatDate(sim.valid_from)} <span className="text-slate-300 mx-1">→</span> {formatDate(sim.valid_to)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-6 py-5 align-middle">
                      {getStatusPill(sim.status)}
                    </td>

                    <td className="px-6 py-5 text-center align-middle">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setActionSim(sim)}
                          className="p-2 text-brand-primary hover:text-white hover:bg-brand-primary rounded-lg transition-colors border border-brand-primary/20 hover:border-transparent shadow-sm"
                          title="Acciones"
                        >
                          Elegir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {actionSim && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => !exporting && setActionSim(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl border border-border-subtle flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-border-subtle bg-slate-50/50">
              <h3 className="text-lg font-semibold text-text-primary">Acciones del escenario</h3>
              <p className="text-xs text-text-muted mt-1 truncate">{actionSim.project_name || actionSim.customers?.name}</p>
            </div>
            <div className="p-5 flex flex-col gap-3">
               <button
                 onClick={() => router.push(`/simulator?id=${actionSim.id}`)}
                 disabled={exporting}
                 className="w-full text-left px-4 py-3 bg-white border border-border-subtle rounded-xl hover:border-brand-primary/40 hover:bg-brand-primary/5 text-sm font-medium text-text-primary transition-all disabled:opacity-50"
               >
                 Editar simulación
               </button>
               <button
                 onClick={() => handleExport(actionSim)}
                 disabled={exporting}
                 className="w-full flex items-center justify-between px-4 py-3 bg-white border border-border-subtle rounded-xl hover:border-brand-primary/40 hover:bg-brand-primary/5 text-sm font-medium text-text-primary transition-all disabled:opacity-50"
               >
                 <span>Descargar Excel</span>
                 {exporting && <span className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />}
               </button>
            </div>
            <div className="px-5 py-3 border-t border-border-subtle bg-slate-50/50">
               <button
                 onClick={() => setActionSim(null)}
                 disabled={exporting}
                 className="w-full text-center px-4 py-2 bg-transparent text-text-muted hover:text-text-primary text-sm font-medium transition-colors disabled:opacity-50"
               >
                 Cancelar
               </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
