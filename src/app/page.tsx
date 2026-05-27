"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { format, subDays, startOfWeek, startOfMonth, startOfYear, parseISO, isAfter, isBefore } from "date-fns";
import { es } from "date-fns/locale";
import { 
  BarChart3, Calendar, DollarSign, Target, AlertTriangle, Download, 
  Printer, Activity, Filter, Layers, PieChart as PieChartIcon, 
  TrendingUp, Users, AlertCircle, CheckCircle2, Factory, XCircle
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";

// Recharts components
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b'];
const STATUS_COLORS: Record<string, string> = {
  "VIGENTE": "#10b981",
  "DRAFT": "#64748b",
  "RECHAZADA": "#ef4444",
  "RENOVADA": "#3b82f6",
  "VENCIDO": "#f59e0b"
};

export default function ExecutiveDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  // Raw Data
  const [simulations, setSimulations] = useState<any[]>([]);
  const [simulationLines, setSimulationLines] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [lastBomDate, setLastBomDate] = useState<string | null>(null);

  // Global Filters
  const [datePreset, setDatePreset] = useState("AÑO"); // HOY, SEMANA, MES, AÑO, YTD, CUSTOM
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterChannel, setFilterChannel] = useState("ALL");
  const [filterCustomer, setFilterCustomer] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterCurrency, setFilterCurrency] = useState("ALL");

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [
          { data: sims },
          { data: lines },
          { data: prods },
          { data: custs },
          { data: chans },
          { data: pLists },
          { data: bom }
        ] = await Promise.all([
          supabase.from("simulations").select("*").order("created_at", { ascending: false }),
          supabase.from("simulation_lines").select("*"),
          supabase.from("products").select("id, sap_code, description, is_active"),
          supabase.from("customers").select("id, name"),
          supabase.from("sales_channels").select("id, name"),
          supabase.from("price_lists").select("id, product_id, channel_id, is_active, applies"),
          supabase.from("bom_imports").select("imported_at").order("imported_at", { ascending: false }).limit(1)
        ]);

        if (!isMounted) return;

        setSimulations(sims || []);
        setSimulationLines(lines || []);
        setProducts(prods || []);
        setCustomers(custs || []);
        setChannels(chans || []);
        setPriceLists(pLists || []);
        if (bom && bom[0]) setLastBomDate(bom[0].imported_at);

        // Set initial dates for "AÑO"
        handleDatePreset("AÑO");

      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  function handleDatePreset(preset: string) {
    setDatePreset(preset);
    const now = new Date();
    let from = "";
    let to = format(now, "yyyy-MM-dd");

    if (preset === "HOY") {
       from = format(now, "yyyy-MM-dd");
    } else if (preset === "SEMANA") {
       from = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    } else if (preset === "MES") {
       from = format(startOfMonth(now), "yyyy-MM-dd");
    } else if (preset === "AÑO" || preset === "YTD") {
       from = format(startOfYear(now), "yyyy-MM-dd");
    }

    if (preset !== "CUSTOM") {
       setDateFrom(from);
       setDateTo(to);
    }
  }

  // Memoized Filtered Data
  const filteredSimulations = useMemo(() => {
    return simulations.filter(sim => {
      // Date filter
      if (dateFrom && dateTo) {
         const sDate = parseISO(sim.created_at.split("T")[0]);
         const dFrom = parseISO(dateFrom);
         const dTo = parseISO(dateTo);
         if (isBefore(sDate, dFrom) || isAfter(sDate, dTo)) return false;
      }
      if (filterChannel !== "ALL" && sim.channel_id !== filterChannel) return false;
      if (filterCustomer !== "ALL" && sim.customer_id !== filterCustomer) return false;
      if (filterStatus !== "ALL" && sim.status !== filterStatus) return false;
      if (filterCurrency !== "ALL" && sim.currency !== filterCurrency) return false;
      return true;
    });
  }, [simulations, dateFrom, dateTo, filterChannel, filterCustomer, filterStatus, filterCurrency]);

  const filteredLines = useMemo(() => {
    const simIds = new Set(filteredSimulations.map(s => s.id));
    return simulationLines.filter(l => simIds.has(l.simulation_id));
  }, [simulationLines, filteredSimulations]);

  // Section 1: Executive KPIs
  const execKPIs = useMemo(() => {
    let active = 0;
    let rejected = 0;
    let netValueCOP = 0;
    let totalContributionCOP = 0;

    filteredSimulations.forEach(sim => {
       if (sim.status === "VIGENTE") active++;
       if (sim.status === "RECHAZADA") rejected++;
    });

    // To calculate normalized COP value, we need the lines and sim TRM
    filteredLines.forEach(line => {
       const sim = filteredSimulations.find(s => s.id === line.simulation_id);
       if (sim) {
          const isUSD = sim.currency === "USD";
          const trm = sim.trm || 1;
          const lineRevenue = (line.net_price || 0) * (line.qty || 0);
          const lineRevenueCOP = isUSD ? lineRevenue * trm : lineRevenue;
          
          netValueCOP += lineRevenueCOP;
          totalContributionCOP += line.contribution_value || 0; // already in COP
       }
    });

    const weightedMargin = netValueCOP > 0 ? (totalContributionCOP / netValueCOP) * 100 : 0;

    return {
       totalSims: filteredSimulations.length,
       active,
       rejected,
       netValueCOP,
       totalContributionCOP,
       weightedMargin
    };
  }, [filteredSimulations, filteredLines]);

  // Pricing Manager & Coverage KPIs
  const pricingKPIs = useMemo(() => {
    const activeProducts = products.filter(p => p.is_active);
    const activeChannels = channels;
    let configured = 0;
    let pending = 0;
    let noAplica = 0;
    let totalPotentialPrices = activeProducts.length * activeChannels.length;
    let actualPricedOrNoAplica = 0;

    activeProducts.forEach(prod => {
       let prodPending = 0;
       let prodNoAplica = 0;
       
       activeChannels.forEach(ch => {
          const pl = priceLists.find(p => p.product_id === prod.id && p.channel_id === ch.id);
          if (!pl) {
             prodPending++;
          } else if (pl.applies === false) {
             prodNoAplica++;
             actualPricedOrNoAplica++;
          } else if (pl.is_active) {
             actualPricedOrNoAplica++;
          } else {
             prodPending++;
          }
       });

       if (prodPending > 0) pending++;
       else if (prodNoAplica > 0) noAplica++; // Has no aplica but 0 pending -> config/noaplica
       else configured++;
    });

    const coveragePct = totalPotentialPrices > 0 ? (actualPricedOrNoAplica / totalPotentialPrices) * 100 : 0;

    return {
       pendingProducts: pending,
       configuredProducts: configured + noAplica,
       noAplicaProducts: noAplica,
       coveragePct
    };
  }, [products, channels, priceLists]);

  // Section 2: Charts Data
  const chartsData = useMemo(() => {
    // 1. Sim by Status
    const statusMap: Record<string, number> = {};
    filteredSimulations.forEach(s => {
       statusMap[s.status] = (statusMap[s.status] || 0) + 1;
    });
    const pieStatus = Object.keys(statusMap).map(k => ({ name: k, value: statusMap[k] }));

    // 2. Sim by Channel
    const channelMap: Record<string, number> = {};
    filteredSimulations.forEach(s => {
       const chName = channels.find(c => c.id === s.channel_id)?.name || "Sin Canal";
       channelMap[chName] = (channelMap[chName] || 0) + 1;
    });
    const barChannel = Object.keys(channelMap).map(k => ({ name: k, cantidad: channelMap[k] }));

    // 3. Margin by Channel
    const chRevCop: Record<string, number> = {};
    const chContCop: Record<string, number> = {};
    filteredLines.forEach(l => {
       const sim = filteredSimulations.find(s => s.id === l.simulation_id);
       if (sim) {
          const chName = channels.find(c => c.id === sim.channel_id)?.name || "Sin Canal";
          const isUSD = sim.currency === "USD";
          const trm = sim.trm || 1;
          const revCop = (l.net_price || 0) * (l.qty || 0) * (isUSD ? trm : 1);
          chRevCop[chName] = (chRevCop[chName] || 0) + revCop;
          chContCop[chName] = (chContCop[chName] || 0) + (l.contribution_value || 0);
       }
    });
    const marginChannel = Object.keys(chRevCop).map(k => ({
       name: k,
       margen: chRevCop[k] > 0 ? (chContCop[k] / chRevCop[k]) * 100 : 0
    })).sort((a,b) => b.margen - a.margen);

    // 4. Value by Month
    const monthMap: Record<string, number> = {};
    filteredSimulations.forEach(s => {
       const monthStr = format(parseISO(s.created_at), "MMM yyyy", { locale: es });
       const simRevCop = filteredLines.filter(l => l.simulation_id === s.id).reduce((acc, l) => {
          const isUSD = s.currency === "USD";
          const trm = s.trm || 1;
          return acc + ((l.net_price || 0) * (l.qty || 0) * (isUSD ? trm : 1));
       }, 0);
       monthMap[monthStr] = (monthMap[monthStr] || 0) + simRevCop;
    });
    // Create chronological array (simple approach: sort by Date object)
    const lineMonth = Object.keys(monthMap).map(k => ({
       name: k, 
       valor: monthMap[k],
       _date: new Date(k)
    })).sort((a,b) => a._date.getTime() - b._date.getTime());

    return { pieStatus, barChannel, marginChannel, lineMonth };
  }, [filteredSimulations, filteredLines, channels]);

  // Section 5: Customer Analytics
  const customerAnalytics = useMemo(() => {
    const custMap: Record<string, { count: number, valueCOP: number, rejected: number, lastDate: string }> = {};
    
    filteredSimulations.forEach(s => {
       if (!s.customer_id) return;
       const simRevCop = filteredLines.filter(l => l.simulation_id === s.id).reduce((acc, l) => {
          const isUSD = s.currency === "USD";
          const trm = s.trm || 1;
          return acc + ((l.net_price || 0) * (l.qty || 0) * (isUSD ? trm : 1));
       }, 0);
       
       if (!custMap[s.customer_id]) custMap[s.customer_id] = { count: 0, valueCOP: 0, rejected: 0, lastDate: s.created_at };
       
       custMap[s.customer_id].count++;
       custMap[s.customer_id].valueCOP += simRevCop;
       if (s.status === "RECHAZADA") custMap[s.customer_id].rejected++;
       if (s.created_at > custMap[s.customer_id].lastDate) custMap[s.customer_id].lastDate = s.created_at;
    });

    const custArray = Object.keys(custMap).map(k => {
       const cName = customers.find(c => c.id === k)?.name || "Desconocido";
       return { name: cName, ...custMap[k] };
    });

    return {
       topByValue: [...custArray].sort((a,b) => b.valueCOP - a.valueCOP).slice(0, 5),
       topByCount: [...custArray].sort((a,b) => b.count - a.count).slice(0, 5),
    };
  }, [filteredSimulations, filteredLines, customers]);

  // Section 4: Profitability Alerts
  const alerts = useMemo(() => {
    const lowMarginSims = filteredSimulations.filter(s => {
       const simLines = filteredLines.filter(l => l.simulation_id === s.id);
       let rev = 0; let cont = 0;
       simLines.forEach(l => {
          const isUSD = s.currency === "USD";
          const trm = s.trm || 1;
          rev += ((l.net_price || 0) * (l.qty || 0) * (isUSD ? trm : 1));
          cont += (l.contribution_value || 0);
       });
       const margin = rev > 0 ? (cont / rev) * 100 : 0;
       return s.target_margin_pct && margin < s.target_margin_pct;
    });

    const highDiscountSims = filteredLines.filter(l => (l.discount_pct || 0) > 40).map(l => l.simulation_id);
    const uniqueHighDiscountSims = new Set(highDiscountSims);

    return {
       lowMarginSims: lowMarginSims.length,
       highDiscountSims: uniqueHighDiscountSims.size
    };
  }, [filteredSimulations, filteredLines]);

  // Format Helpers
  const formatCOP = (val: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);
  const formatPct = (val: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(val) + "%";
  const formatShortCOP = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}k`;
    return `$${val.toFixed(0)}`;
  };

  const formatTooltipCOP = (value: unknown) => {
    const numericValue =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value)
          : 0;
  
    return formatCOP(Number.isFinite(numericValue) ? numericValue : 0);
  };

  const formatTooltipPct = (value: unknown) => {
    const numericValue =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value)
          : 0;
  
    return formatPct(Number.isFinite(numericValue) ? numericValue : 0);
  };

  // EXPORTS
  const handlePrint = () => {
    window.print();
  };

  return (
    <AppShell title="Executive KPI Dashboard">
      <div className="w-full pb-32 print:pb-0">
        
        {/* HEADER & GLOBAL FILTERS */}
        <div className="sticky top-0 z-40 bg-[color:var(--bg-base)]/80 backdrop-blur-md pt-6 pb-4 mb-8 print:static print:bg-transparent" style={{ borderBottom: "0.5px solid var(--border-hair)" }}>
           <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
             <div>
               <div className="overline" style={{ marginBottom: 6 }}>Cockpit Ejecutivo</div>
               <h1 style={{ marginBottom: 4 }}>Executive Dashboard</h1>
               <p className="lead" style={{ maxWidth: 560 }}>Visibilidad consolidada de la operación comercial y rentabilidad.</p>
             </div>

             {/* Action Buttons */}
             <div className="flex gap-3 print:hidden">
                <button onClick={handlePrint} className="btn btn--secondary">
                   <Printer className="w-4 h-4" strokeWidth={1.75} /> PDF Report
                </button>
                {/* Excel Export omitted for brevity, logic follows print pattern */}
                <button className="btn btn--primary">
                   <Download className="w-4 h-4" strokeWidth={1.75} /> Export Data
                </button>
             </div>
           </div>

           {/* Filter Bar */}
           <div className="mt-6 flex flex-wrap items-center gap-3 bg-surface-card p-2 rounded-2xl border border-border-subtle shadow-sm print:hidden">
              <div className="flex items-center bg-surface-hover rounded-xl p-1 border border-border-subtle">
                 {["HOY", "SEMANA", "MES", "AÑO", "YTD", "CUSTOM"].map(p => (
                   <button 
                     key={p} 
                     onClick={() => handleDatePreset(p)}
                     className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${datePreset === p ? 'bg-surface-card text-brand-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                   >
                     {p}
                   </button>
                 ))}
              </div>
              
              {datePreset === "CUSTOM" && (
                 <div className="flex items-center gap-2 text-xs">
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-surface-hover border border-border-subtle rounded-lg px-2 py-1.5 focus:outline-none" />
                    <span>-</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-surface-hover border border-border-subtle rounded-lg px-2 py-1.5 focus:outline-none" />
                 </div>
              )}

              <div className="h-6 w-px bg-border-subtle mx-1 hidden sm:block"></div>

              <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} className="bg-surface-hover border border-border-subtle rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none min-w-[140px]">
                <option value="ALL">Canal: Todos</option>
                {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-surface-hover border border-border-subtle rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none min-w-[140px]">
                <option value="ALL">Estado: Todos</option>
                <option value="VIGENTE">Vigentes</option>
                <option value="RECHAZADA">Rechazadas</option>
                <option value="DRAFT">Drafts</option>
              </select>
           </div>
        </div>

        {/* LOADING STATE */}
        {loading ? (
           <div className="py-24 flex flex-col items-center justify-center">
             <div className="w-8 h-8 border-2 rounded-full animate-spin mb-4" style={{ borderColor: "var(--navy)", borderTopColor: "transparent" }} />
             <p className="text-sm font-medium text-text-muted">Procesando KPIs y agregando datos...</p>
           </div>
        ) : (
        <div className="space-y-8">
           
           {/* SECTION 1: EXECUTIVE KPI CARDS */}
           <section>
              <div className="section-title mb-4">Resumen Ejecutivo</div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Simulaciones */}
                <div className="surface-card p-5 flex flex-col justify-center relative overflow-hidden group">
                   <div className="overline" style={{ marginBottom: 6 }}>Total Simulaciones</div>
                   <div className="kpi tabular">{execKPIs.totalSims}</div>
                   <div className="caption mt-3 flex gap-3">
                      <span style={{ color: "var(--success)" }}>{execKPIs.active} Vigentes</span>
                      <span style={{ color: "var(--danger)" }}>{execKPIs.rejected} Rechazadas</span>
                   </div>
                </div>

                {/* 2. Valor Neto */}
                <div className="surface-card p-5 flex flex-col justify-center">
                   <div className="overline" style={{ marginBottom: 6 }}>Valor Neto Simulado (COP)</div>
                   <div className="kpi tabular truncate" style={{ color: "var(--fg-primary)" }} title={formatCOP(execKPIs.netValueCOP)}>
                      {formatShortCOP(execKPIs.netValueCOP)}
                   </div>
                </div>

                {/* 3. Contribucion */}
                <div className="surface-card p-5 flex flex-col justify-center">
                   <div className="overline" style={{ marginBottom: 6 }}>Contribución Total (COP)</div>
                   <div className="kpi tabular truncate" style={{ color: "var(--navy)" }} title={formatCOP(execKPIs.totalContributionCOP)}>
                      {formatShortCOP(execKPIs.totalContributionCOP)}
                   </div>
                </div>

                {/* 4. Margen Ponderado */}
                <div className="surface-card p-5 flex flex-col justify-center">
                   <div className="overline" style={{ marginBottom: 6 }}>Margen Ponderado</div>
                   <div className="kpi tabular" style={{ color: execKPIs.weightedMargin >= 60 ? 'var(--margin-strong)' : execKPIs.weightedMargin >= 40 ? 'var(--margin-ok)' : 'var(--margin-weak)' }}>
                      {formatPct(execKPIs.weightedMargin)}
                   </div>
                </div>
              </div>
           </section>

           <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              
              {/* MAIN CONTENT: CHARTS (Spans 2 columns) */}
              <div className="xl:col-span-2 space-y-8">
                 
                 {/* SECTION 2: COMMERCIAL ANALYTICS */}
                 <section>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       
                       {/* Valor Simulado por Mes */}
                       <div className="surface-card p-6 col-span-1 md:col-span-2">
                          <h3 style={{ marginBottom: 24 }}>Valor Simulado por Mes (COP)</h3>
                          <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartsData.lineMonth} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <Line type="monotone" dataKey="valor" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                <CartesianGrid stroke="#e2e8f0" strokeDasharray="5 5" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={formatShortCOP} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={60} />
                                <RechartsTooltip formatter={(value) => formatTooltipCOP(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                       </div>

                       {/* Status Pie */}
                       <div className="surface-card p-6">
                          <h3 style={{ marginBottom: 16 }}>Estado del Pipeline</h3>
                          <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={chartsData.pieStatus} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                  {chartsData.pieStatus.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                       </div>

                       {/* Margen por canal */}
                       <div className="surface-card p-6">
                          <h3 style={{ marginBottom: 16 }}>Margen Promedio por Canal</h3>
                          <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartsData.marginChannel} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={90} />
                                <RechartsTooltip formatter={(value) => formatTooltipPct(value)} cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="margen" radius={[0, 4, 4, 0]}>
                                  {chartsData.marginChannel.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                       </div>

                    </div>
                 </section>

                 {/* SECTION 5: CUSTOMER ANALYTICS */}
                 <section>
                    <div className="surface-card overflow-hidden">
                       <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "0.5px solid var(--border-hair)" }}>
                          <h3>Top Clientes por Valor Simulado</h3>
                       </div>
                       <table className="w-full text-sm">
                          <thead className="text-left" style={{ borderBottom: "0.5px solid var(--border-hair)" }}>
                             <tr>
                                <th className="overline px-6 py-3">Cliente</th>
                                <th className="overline px-6 py-3 text-center">Simulaciones</th>
                                <th className="overline px-6 py-3 text-right">Valor Neto (COP)</th>
                                <th className="overline px-6 py-3 text-center">Rechazos</th>
                             </tr>
                          </thead>
                          <tbody>
                             {customerAnalytics.topByValue.map((c, i) => (
                                <tr key={i} className="[border-bottom:0.5px_solid_var(--border-hair)] hover:bg-[color:var(--bg-hover)] transition-colors">
                                   <td className="px-6 py-3.5 font-medium" style={{ color: "var(--fg-primary)" }}>{c.name}</td>
                                   <td className="caption px-6 py-3.5 text-center">{c.count}</td>
                                   <td className="mono tabular px-6 py-3.5 text-right" style={{ color: "var(--navy)" }}>{formatCOP(c.valueCOP)}</td>
                                   <td className="px-6 py-3.5 text-center">
                                      {c.rejected > 0 ? (
                                         <span className="pill pill--danger">{c.rejected}</span>
                                      ) : <span style={{ color: "var(--fg-muted)" }}>—</span>}
                                   </td>
                                </tr>
                             ))}
                             {customerAnalytics.topByValue.length === 0 && (
                                <tr><td colSpan={4} className="py-8 text-center text-text-muted text-sm">No hay datos suficientes</td></tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                 </section>

              </div>

              {/* RIGHT COLUMN: PRICING & ALERTS */}
              <div className="space-y-8">
                 
                 {/* SECTION 4: PROFITABILITY ALERTS */}
                 <section>
                    <div className="surface-card overflow-hidden">
                       <div className="px-6 py-5 flex items-center" style={{ borderBottom: "0.5px solid var(--border-hair)" }}>
                          <h3>Alertas Críticas</h3>
                       </div>
                       <div>
                          <div className="px-6 py-4 flex items-start gap-3" style={{ borderBottom: "0.5px solid var(--border-hair)" }}>
                             <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                                <AlertTriangle className="w-4 h-4" strokeWidth={1.75} />
                             </div>
                             <div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-primary)" }}>
                                   {alerts.lowMarginSims} simulaciones bajo margen objetivo
                                </div>
                                <div className="caption">Simulaciones activas por debajo del margen objetivo del negocio.</div>
                             </div>
                          </div>
                          <div className="px-6 py-4 flex items-start gap-3" style={{ borderBottom: pricingKPIs.pendingProducts > 0 ? "0.5px solid var(--border-hair)" : undefined }}>
                             <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                                <Activity className="w-4 h-4" strokeWidth={1.75} />
                             </div>
                             <div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-primary)" }}>
                                   {alerts.highDiscountSims} simulaciones con descuento &gt;40%
                                </div>
                                <div className="caption">Simulaciones contienen descuentos comerciales mayores al 40%.</div>
                             </div>
                          </div>
                          {pricingKPIs.pendingProducts > 0 && (
                             <div className="px-6 py-4 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
                                   <AlertCircle className="w-4 h-4" strokeWidth={1.75} />
                                </div>
                                <div>
                                   <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-primary)" }}>
                                      {pricingKPIs.pendingProducts} productos sin base tarifaria
                                   </div>
                                   <div className="caption">Productos activos en SAP sin base tarifaria configurada.</div>
                                </div>
                             </div>
                          )}
                       </div>
                    </div>
                 </section>

                 {/* SECTION 3: PRICING MANAGER KPIs */}
                 <section>
                    <div className="surface-card overflow-hidden">
                       <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "0.5px solid var(--border-hair)" }}>
                          <h3>Cobertura Comercial</h3>
                       </div>
                       <div className="p-6">
                          <div className="w-full bg-surface-hover h-3 rounded-full overflow-hidden mb-3">
                             <div
                               className="h-full transition-all duration-1000"
                               style={{ width: `${pricingKPIs.coveragePct}%`, background: "var(--success)" }}
                             />
                          </div>
                          <div className="flex justify-between items-center mb-6">
                             <span className="overline">Completitud del pricing</span>
                             <span className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>{formatPct(pricingKPIs.coveragePct)}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                             <div className="rounded-xl p-4 [border:0.5px_solid_var(--border-hair)] flex flex-col items-center text-center" style={{ background: "var(--bg-hover)" }}>
                                <span className="overline mb-1">Configurados</span>
                                <span className="text-xl font-medium flex items-center gap-1.5" style={{ color: "var(--fg-primary)" }}><CheckCircle2 className="w-4 h-4" strokeWidth={1.75} style={{ color: "var(--success)" }}/>{pricingKPIs.configuredProducts}</span>
                             </div>
                             <div className="rounded-xl p-4 [border:0.5px_solid_var(--border-hair)] flex flex-col items-center text-center" style={{ background: "var(--bg-hover)" }}>
                                <span className="overline mb-1">Pendientes</span>
                                <span className="text-xl font-medium flex items-center gap-1.5" style={{ color: "var(--warning)" }}><AlertCircle className="w-4 h-4" strokeWidth={1.75}/>{pricingKPIs.pendingProducts}</span>
                             </div>
                             <div className="rounded-xl p-4 [border:0.5px_solid_var(--border-hair)] flex flex-col items-center text-center col-span-2" style={{ background: "var(--bg-hover)" }}>
                                <span className="overline mb-1">Con Excepciones (No Aplica)</span>
                                <span className="text-xl font-medium flex items-center gap-1.5" style={{ color: "var(--fg-muted)" }}><XCircle className="w-4 h-4" strokeWidth={1.75}/>{pricingKPIs.noAplicaProducts}</span>
                             </div>
                          </div>

                          <div className="mt-5 text-center">
                             <Link href="/pricing-manager" className="text-xs font-semibold transition-colors" style={{ color: "var(--navy)" }}>
                                Gestionar Listas de Precios →
                             </Link>
                          </div>
                       </div>
                    </div>
                 </section>

                 {/* Last BOM Info */}
                 <section>
                    <div className="surface-card p-5 flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--info-soft)", color: "var(--blue-green)" }}>
                          <Factory className="w-5 h-5" strokeWidth={1.75} />
                       </div>
                       <div>
                          <div className="overline" style={{ marginBottom: 2 }}>Última Carga Costos BOM</div>
                          <div className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>
                             {lastBomDate ? format(parseISO(lastBomDate), "PPP p", { locale: es }) : "No disponible"}
                          </div>
                       </div>
                    </div>
                 </section>

              </div>
           </div>
        </div>
        )}
      </div>

      <style jsx global>{`
        /* Print layout adjustments */
        @media print {
           body { background: white !important; }
           .AppShell_Content { padding: 0 !important; }
           * { box-shadow: none !important; color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </AppShell>
  );
}