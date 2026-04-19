"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Calculator, FileSpreadsheet, Package, Tag, Store, 
  AlertTriangle, History, AlertCircle, Activity, ChevronRight, Plus, Factory
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);

  // KPIs
  const [simulationsMonth, setSimulationsMonth] = useState(0);
  const [activeSims, setActiveSims] = useState(0);
  const [expiredSims, setExpiredSims] = useState(0);
  const [lastBomDate, setLastBomDate] = useState<string | null>(null);
  const [productsNoPrice, setProductsNoPrice] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [activeChannels, setActiveChannels] = useState(0);
  const [costsLoaded, setCostsLoaded] = useState(0);
  
  // Lists
  const [recentSims, setRecentSims] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      setLoading(true);
      
      try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const [
          { data: simsData },
          { count: prodCount },
          { data: priceListsData },
          { data: bomData },
          { count: channelCount },
          { count: costCount }
        ] = await Promise.all([
          supabase.from("simulations").select("id, status, created_at, project_name, simulation_type, customers(name)").order("created_at", { ascending: false }),
          supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("price_lists").select("product_id").eq("is_active", true),
          supabase.from("bom_imports").select("imported_at, file_name").order("imported_at", { ascending: false }).limit(1),
          supabase.from("sales_channels").select("id", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("component_costs").select("id", { count: "exact", head: true })
        ]);

        if (!isMounted) return;

        // Process Simulations
        const allSims = simsData || [];
        setRecentSims(allSims.slice(0, 7)); // top 7
        
        let monthCount = 0;
        let activeCount = 0;
        let expCount = 0;
        
        allSims.forEach(s => {
          if (s.created_at >= firstDayOfMonth) monthCount++;
          if (s.status === "VIGENTE") activeCount++;
          if (s.status === "VENCIDO") expCount++;
        });

        setSimulationsMonth(monthCount);
        setActiveSims(activeCount);
        setExpiredSims(expCount);

        // Process Products vs Prices
        const tProducts = prodCount || 0;
        setTotalProducts(tProducts);
        
        const uniquePricedProducts = new Set((priceListsData || []).map(pl => pl.product_id));
        setProductsNoPrice(Math.max(0, tProducts - uniquePricedProducts.size));

        // System Health
        setActiveChannels(channelCount || 0);
        setCostsLoaded(costCount || 0);

        if (bomData && bomData.length > 0) {
           setLastBomDate(bomData[0].imported_at);
        }

        // Activity Log
        const logs: any[] = [];
        allSims.slice(0, 5).forEach(s => {
            const customerName = s.customers && Array.isArray(s.customers) ? s.customers[0]?.name : (s.customers as any)?.name;
            logs.push({
               type: "SIMULATION",
               text: `Simulación creada: ${s.project_name || customerName || "Cotización Comercial"}`,
               date: s.created_at
            });
        });
        if (bomData && bomData[0]) {
            logs.push({
               type: "BOM",
               text: `BOM SAP Importado: ${bomData[0].file_name}`,
               date: bomData[0].imported_at
            });
        }
        
        // Sort logs desc
        logs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentLogs(logs.slice(0, 6));

      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();

    return () => { isMounted = false; };
  }, [supabase]);

  function timeAgo(isoString: string) {
    const d = new Date(isoString);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    
    if (diff < 60) return "Hace momentos";
    if (diff < 3600) return `Hace ${Math.floor(diff/60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff/3600)} hrs`;
    return format(d, "dd MMM", { locale: es });
  }

  function getStatusStyle(status: string) {
    if (status === "VIGENTE") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "VENCIDO") return "bg-red-50 text-red-700 border-red-200";
    if (status === "RENOVADA") return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  }

  return (
    <AppShell title="Centro de Control">
      <div className="w-full space-y-6">
        
        {/* TOP ROW: KPI STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
           {loading ? (
              Array.from({length: 6}).map((_, i) => (
                 <div key={i} className="h-[104px] bg-slate-100 animate-pulse rounded-2xl border border-border-subtle" />
              ))
           ) : (
              <>
                <div className="bg-white rounded-2xl p-5 flex flex-col justify-center border border-border-subtle shadow-[var(--shadow-sm)]">
                   <div className="text-[11px] font-bold text-text-muted mb-1.5 uppercase tracking-wide">Simuladas (Mes)</div>
                   <div className="text-3xl font-bold tracking-tight text-text-primary">{simulationsMonth}</div>
                </div>
                <div className="bg-white rounded-2xl p-5 flex flex-col justify-center border border-border-subtle shadow-[var(--shadow-sm)]">
                   <div className="text-[11px] font-bold text-text-muted mb-1.5 uppercase tracking-wide">Vigentes</div>
                   <div className="text-3xl font-bold tracking-tight text-emerald-600">{activeSims}</div>
                </div>
                <div className="bg-white rounded-2xl p-5 flex flex-col justify-center border border-border-subtle shadow-[var(--shadow-sm)]">
                   <div className="text-[11px] font-bold text-text-muted mb-1.5 uppercase tracking-wide">Vencidas</div>
                   <div className="text-3xl font-bold tracking-tight text-red-600">{expiredSims}</div>
                </div>
                <div className={`rounded-2xl p-5 flex flex-col justify-center border shadow-[var(--shadow-sm)] ${productsNoPrice > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-border-subtle"}`}>
                   <div className={`text-[11px] font-bold mb-1.5 uppercase tracking-wide ${productsNoPrice > 0 ? "text-amber-800" : "text-text-muted"}`}>Sin Precio Reglado</div>
                   <div className={`text-3xl font-bold tracking-tight flex items-center gap-2 ${productsNoPrice > 0 ? "text-amber-700" : "text-text-primary"}`}>
                      {productsNoPrice} 
                      {productsNoPrice > 0 && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
                   </div>
                </div>
                <div className={`col-span-2 rounded-2xl p-5 flex flex-col justify-center border shadow-[var(--shadow-sm)] ${!lastBomDate ? "bg-amber-50 border-amber-200" : "bg-white border-border-subtle"}`}>
                   <div className="text-[11px] font-bold text-text-muted mb-1.5 uppercase tracking-wide">Último Estándar (BOM)</div>
                   <div className="text-lg font-bold text-text-primary tracking-tight truncate">
                      {lastBomDate ? format(new Date(lastBomDate), "PPPp", { locale: es }) : "No se ha cargado BOM"}
                   </div>
                </div>
              </>
           )}
        </div>

        {/* MIDDLE SECTION: MAIN GRID AND RIGHT COLUMN */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           
           {/* LEFT COLUMN: Acciones y Simulaciones (Spans 2 cols) */}
           <div className="lg:col-span-2 space-y-6">
              
              {/* Acciones Rápidas */}
              <div className="bg-white rounded-[1.25rem] border border-border-subtle shadow-[var(--shadow-sm)] p-6">
                 <h2 className="text-xs font-bold tracking-widest text-text-muted uppercase mb-5">Operaciones Frecuentes</h2>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button onClick={() => router.push("/simulator")} className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 hover:bg-brand-primary/[0.05] border border-border-subtle hover:border-brand-primary/30 transition-all group shadow-sm hover:shadow-md">
                       <Plus className="w-6 h-6 text-brand-primary mb-2 group-hover:scale-110 transition-transform" />
                       <span className="text-sm font-semibold text-text-primary tracking-tight">Nueva Sim.</span>
                    </button>
                    <button onClick={() => router.push("/price-lists")} className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-border-subtle hover:border-slate-300 transition-all group shadow-sm hover:shadow-md">
                       <Tag className="w-6 h-6 text-slate-500 group-hover:text-slate-800 mb-2 transition-colors" />
                       <span className="text-sm font-semibold text-text-primary tracking-tight">Precios Base</span>
                    </button>
                    <button onClick={() => router.push("/products")} className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-border-subtle hover:border-slate-300 transition-all group shadow-sm hover:shadow-md">
                       <Package className="w-6 h-6 text-slate-500 group-hover:text-slate-800 mb-2 transition-colors" />
                       <span className="text-sm font-semibold text-text-primary tracking-tight">Prod. Maestro</span>
                    </button>
                    <button onClick={() => router.push("/import")} className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-border-subtle hover:border-slate-300 transition-all group shadow-sm hover:shadow-md">
                       <FileSpreadsheet className="w-6 h-6 text-slate-500 group-hover:text-slate-800 mb-2 transition-colors" />
                       <span className="text-sm font-semibold text-text-primary tracking-tight">Cargar BOM</span>
                    </button>
                 </div>
              </div>

              {/* Simulaciones Recientes */}
              <div className="bg-white rounded-[1.25rem] border border-border-subtle shadow-[var(--shadow-sm)] flex flex-col overflow-hidden">
                 <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-xs font-bold tracking-widest text-text-muted uppercase flex items-center gap-2">
                       <History className="w-4 h-4 text-slate-400" /> Histórico Reciente
                    </h2>
                    <Link href="/scenarios" className="text-xs font-semibold text-brand-primary hover:text-brand-accent flex items-center gap-1 transition-colors">
                       Revisar todo <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                 </div>
                 
                 <div className="overflow-x-auto min-h-[350px]">
                    <table className="w-full text-sm">
                       <thead className="bg-white border-b border-border-subtle text-left">
                          <tr>
                             <th className="px-6 py-4 font-semibold text-text-muted text-[11px] uppercase tracking-wider">Cliente/Negocio</th>
                             <th className="px-6 py-4 font-semibold text-text-muted text-[11px] uppercase tracking-wider">Categoría</th>
                             <th className="px-6 py-4 font-semibold text-text-muted text-[11px] uppercase tracking-wider text-center">F. Creación</th>
                             <th className="px-6 py-4 font-semibold text-text-muted text-[11px] uppercase tracking-wider">Estado</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-border-subtle">
                          {loading ? (
                             <tr><td colSpan={4} className="px-6 py-12 text-center text-text-muted text-sm">Cargando simulaciones...</td></tr>
                          ) : recentSims.length === 0 ? (
                             <tr><td colSpan={4} className="px-6 py-12 text-center text-text-muted text-sm border-dashed">El pipeline está vacío hoy.</td></tr>
                          ) : (
                             recentSims.map(sim => {
                                const customerName = sim.customers && Array.isArray(sim.customers) ? sim.customers[0]?.name : (sim.customers as any)?.name;
                                return (
                                <tr key={sim.id} onClick={() => router.push(`/simulator?id=${sim.id}`)} className="hover:bg-slate-50/80 cursor-pointer transition-colors group">
                                   <td className="px-6 py-4">
                                      <div className="font-semibold text-text-primary group-hover:text-brand-primary transition-colors">{customerName || "No vinculado"}</div>
                                      <div className="text-[12px] text-text-muted">{sim.project_name || "—"}</div>
                                   </td>
                                   <td className="px-6 py-4">
                                      <span className="flex items-center text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded w-max">
                                         {sim.simulation_type === "PRICE_LIST" ? "Lista Estándar" : "Promo Especial"}
                                      </span>
                                   </td>
                                   <td className="px-6 py-4 text-center">
                                      <span className="text-xs text-slate-500 font-medium">{timeAgo(sim.created_at)}</span>
                                   </td>
                                   <td className="px-6 py-4">
                                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border rounded ${getStatusStyle(sim.status)}`}>
                                         {sim.status}
                                      </span>
                                   </td>
                                </tr>
                                );
                             })
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>

           {/* RIGHT COLUMN: Estado de salud & Log */}
           <div className="space-y-6">
              
              {/* Alertas Críticas */}
              {(productsNoPrice > 0 || expiredSims > 0) && (
                 <div className="bg-[#fff9f9] rounded-[1.25rem] border border-red-100 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                       <AlertCircle className="w-32 h-32 text-red-600" />
                    </div>
                    <h2 className="text-xs font-bold tracking-widest text-red-700 uppercase mb-4 relative z-10">Focos de Riesgo</h2>
                    <ul className="space-y-3 relative z-10">
                       {productsNoPrice > 0 && (
                          <li className="flex items-start gap-3 text-[13px] text-red-800 bg-white border border-red-50 p-3.5 rounded-xl shadow-sm">
                             <span className="font-extrabold text-red-600 text-base leading-none">{productsNoPrice}</span>
                             <span className="font-medium leading-snug">Productos activos en SAP no tienen una base tarifaria asociada (Error de Margen 100%).</span>
                          </li>
                       )}
                       {expiredSims > 0 && (
                          <li className="flex items-start gap-3 text-[13px] text-red-800 bg-white border border-red-50 p-3.5 rounded-xl shadow-sm">
                             <span className="font-extrabold text-red-600 text-base leading-none">{expiredSims}</span>
                             <span className="font-medium leading-snug">Simulaciones vencidas. Posible riesgo comercial o fuga de valor.</span>
                          </li>
                       )}
                    </ul>
                 </div>
              )}

              {/* Data Health / Integrity */}
              <div className="bg-white rounded-[1.25rem] border border-border-subtle shadow-[var(--shadow-sm)] p-6">
                 <h2 className="text-xs font-bold tracking-widest text-text-muted uppercase mb-5 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" /> Salud de Datos
                 </h2>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between text-[13px] border-b border-slate-50 pb-3">
                       <span className="text-slate-500 font-medium">Bases SAP Activas</span>
                       <span className="font-bold text-text-primary">{loading ? "..." : totalProducts} <span className="text-slate-400 font-normal">Refs</span></span>
                    </div>
                    <div className="flex items-center justify-between text-[13px] border-b border-slate-50 pb-3">
                       <span className="text-slate-500 font-medium">Costos MP Inyectados</span>
                       <span className="font-bold text-text-primary">{loading ? "..." : costsLoaded} <span className="text-slate-400 font-normal">Mat. Primas</span></span>
                    </div>
                    <div className="flex items-center justify-between text-[13px] pb-1">
                       <span className="text-slate-500 font-medium">Canales Activos</span>
                       <span className="font-bold text-text-primary">{loading ? "..." : activeChannels} <span className="text-slate-400 font-normal">Segmentos</span></span>
                    </div>
                    
                    <div className="w-full bg-slate-100 h-2 rounded-full mt-5 overflow-hidden">
                       <div 
                         className={`h-full transition-all duration-1000 ${productsNoPrice > 0 ? "bg-amber-400" : "bg-emerald-500"}`}
                         style={{ width: `${totalProducts > 0 ? Math.max(5, ((totalProducts - productsNoPrice) / totalProducts) * 100) : 0}%` }}
                       />
                    </div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex justify-between mt-2">
                       <span>Cobertura Precio Base</span>
                       <span>{totalProducts > 0 ? Math.round(((totalProducts - productsNoPrice) / totalProducts) * 100) : 0}%</span>
                    </div>
                 </div>
              </div>

              {/* Activity Log */}
              <div className="bg-white rounded-[1.25rem] border border-border-subtle shadow-[var(--shadow-sm)] flex flex-col min-h-[300px]">
                 <div className="px-6 py-5 border-b border-border-subtle bg-slate-50/50">
                    <h2 className="text-xs font-bold tracking-widest text-text-muted uppercase">Bitácora Global</h2>
                 </div>
                 <div className="p-6 flex-1">
                    {loading ? (
                       <p className="text-sm text-text-muted text-center py-6">Recopilando logs...</p>
                    ) : recentLogs.length === 0 ? (
                       <p className="text-sm text-text-muted text-center py-6">El sistema no registra movimientos esta semana.</p>
                    ) : (
                       <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                          {recentLogs.map((log, i) => (
                             <div key={i} className="relative flex items-start gap-4">
                                <div className="z-10 mt-0.5 flex items-center justify-center">
                                   {log.type === "BOM" ? (
                                      <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-500 shadow-sm flex items-center justify-center shrink-0">
                                          <Factory className="w-3 h-3" />
                                      </div>
                                   ) : (
                                      <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-500 shadow-sm flex items-center justify-center shrink-0">
                                          <Calculator className="w-3 h-3" />
                                      </div>
                                   )}
                                </div>
                                <div className="flex-1 bg-white">
                                   <p className="text-[13px] font-medium text-text-primary leading-relaxed break-words pr-2">
                                     {log.text}
                                   </p>
                                   <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                                     {timeAgo(log.date)}
                                   </p>
                                </div>
                             </div>
                          ))}
                       </div>
                    )}
                 </div>
              </div>

           </div>
        </div>

      </div>
    </AppShell>
  );
}