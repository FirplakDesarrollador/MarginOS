"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft, Users, Search, Plus, Pencil, X, UserPlus, Building2, Mail,
  ChevronRight, FileText, Calculator, Clock, AlertCircle, ExternalLink,
  Trash2, FileDown, CheckCircle
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { exportSimulationToExcel } from "@/lib/excelExport";
import { useTableDensity } from "@/contexts/TableDensityContext";

// =============================================
// TYPES
// =============================================

type Simulation = {
  id: string;
  customer_id: string;
  status: string;
  project_name: string | null;
  simulation_type: string;
  currency: string;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
  updated_at: string | null;
  simulation_number?: string | null;
};

type Customer = {
  id: string;
  name: string;
  nit: string | null;
  contact_name: string | null;
  email: string | null;
  default_channel_id: string | null;
  notes: string | null;
  created_at: string;
  sales_channels?: { name: string } | null;
};

type SalesChannel = { id: string; name: string };

type CustomerEnriched = Customer & {
  simCount: number;
  lastSimDate: string | null;
  lastSimStatus: string | null;
  simulations: Simulation[];
};

// =============================================
// COMPONENT
// =============================================

export default function CustomersPage() {
  const supabase = createClient();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const { getTableClasses } = useTableDensity();
  const tableStyles = getTableClasses();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: "", nit: "", contact_name: "", email: "", default_channel_id: "", notes: ""
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [simFetchError, setSimFetchError] = useState<any>(null);

  // Detail modal
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerEnriched | null>(null);

  // Actions modal
  const [actionSim, setActionSim] = useState<Simulation | null>(null);
  const [exporting, setExporting] = useState(false);

  // =============================================
  // DATA FETCH
  // =============================================
  async function fetchAll() {
    setLoading(true);
    const [custRes, simRes, chRes] = await Promise.all([
      supabase.from("customers").select("*, sales_channels(name)").order("name"),
      supabase.from("simulations").select("*").order("created_at", { ascending: false }),
      supabase.from("sales_channels").select("id, name").eq("is_active", true).order("name"),
    ]);
    if (custRes.data) setCustomers(custRes.data);
    if (simRes.data) {
      setSimulations(simRes.data);
    } else if (simRes.error) {
      setSimFetchError(simRes.error);
    }
    if (chRes.data) setChannels(chRes.data);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [supabase]);

  // =============================================
  // ENRICHED CUSTOMERS
  // =============================================
  const enriched: CustomerEnriched[] = useMemo(() => {
    const simMap = new Map<string, Simulation[]>();
    for (const s of simulations) {
      if (!simMap.has(s.customer_id)) simMap.set(s.customer_id, []);
      simMap.get(s.customer_id)!.push(s);
    }

    return customers.map(c => {
      const sims = simMap.get(c.id) || [];
      const latest = sims.length > 0 ? sims[0] : null; // already sorted desc
      return {
        ...c,
        simCount: sims.length,
        lastSimDate: latest?.created_at || null,
        lastSimStatus: latest ? getDisplayStatus(latest) : null,
        simulations: sims,
      };
    });
  }, [customers, simulations]);

  useEffect(() => {
    if (enriched.length > 0) {
      console.log("DEBUG - first enriched customer simCount:", enriched[0].simCount);
    }
  }, [enriched]);

  // =============================================
  // FILTERED
  // =============================================
  const filtered = useMemo(() => {
    let result = enriched;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.nit && c.nit.toLowerCase().includes(q))
      );
    }
    if (filterChannel) {
      result = result.filter(c => c.default_channel_id === filterChannel);
    }
    if (filterStatus) {
      if (filterStatus === "SIN_SIMULACIONES") {
        result = result.filter(c => c.simCount === 0);
      } else {
        result = result.filter(c => c.lastSimStatus === filterStatus);
      }
    }
    return result;
  }, [enriched, searchQuery, filterChannel, filterStatus]);

  // =============================================
  // HELPERS
  // =============================================
  function getDisplayStatus(sim: Simulation): string {
    if (sim.status === "VIGENTE" && sim.valid_to) {
      const d = new Date(sim.valid_to);
      d.setHours(23, 59, 59, 999);
      if (d < new Date()) return "VENCIDO";
    }
    return sim.status;
  }

  function getStatusPill(status: string | null) {
    switch (status) {
      case "VIGENTE":
        return <span className={`pill pill--success ${tableStyles.badge}`}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--success)" }} /> Vigente
        </span>;
      case "VENCIDO":
        return <span className={`pill pill--danger ${tableStyles.badge}`}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--danger)" }} /> Vencido
        </span>;
      case "RENOVADA":
        return <span className={`pill pill--brand ${tableStyles.badge}`}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--blue-green)" }} /> Renovada
        </span>;
      case "RECHAZADA":
        return <span className={`pill ${tableStyles.badge}`}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--fg-muted)" }} /> Rechazada
        </span>;
      case "DRAFT":
        return <span className={`pill pill--warn ${tableStyles.badge}`}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--warning)" }} /> Borrador
        </span>;
      default:
        return <span className={`pill ${tableStyles.badge}`}>Sin simulaciones</span>;
    }
  }

  function formatDateTime(isoString: string | null) {
    if (!isoString) return "—";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${mins}`;
  }

  function formatDate(isoString: string | null) {
    if (!isoString) return "—";
    const [year, month, day] = isoString.split("T")[0].split("-");
    if (!year || !month || !day) return "—";
    return `${day}/${month}/${year}`;
  }

  function getTypeLabel(type: string) {
    if (type === "PRICE_LIST") return "Lista de precios";
    if (type === "PROJECT_PROMO") return "Proyecto / Promoción";
    return type;
  }

  // =============================================
  // FORM HANDLERS
  // =============================================
  function openCreate() {
    setEditingCustomer(null);
    setFormData({ name: "", nit: "", contact_name: "", email: "", default_channel_id: "", notes: "" });
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEdit(c: Customer) {
    setEditingCustomer(c);
    setFormData({
      name: c.name || "", nit: c.nit || "",
      contact_name: c.contact_name || "", email: c.email || "",
      default_channel_id: c.default_channel_id || "", notes: c.notes || "",
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!formData.name.trim()) { setFormError("El nombre es obligatorio."); return; }

    setFormLoading(true);
    try {
      const payload = {
        name: formData.name,
        nit: formData.nit || null,
        contact_name: formData.contact_name || null,
        email: formData.email || null,
        default_channel_id: formData.default_channel_id || null,
        notes: formData.notes || null,
      };

      if (editingCustomer) {
        const { error } = await supabase.from("customers").update(payload).eq("id", editingCustomer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customers").insert(payload);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchAll();
    } catch (err: any) {
      setFormError(err.message || "Error guardando cliente.");
    } finally {
      setFormLoading(false);
    }
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

  async function handleStatusChange(sim: Simulation, newStatus: string) {
    try {
      setExporting(true);
      const { error } = await supabase.from("simulations").update({ status: newStatus }).eq("id", sim.id);
      if (error) throw error;

      setSimulations(prev => prev.map(s => s.id === sim.id ? { ...s, status: newStatus } : s));

      // update selectedCustomer so UI updates immediately
      if (selectedCustomer) {
        setSelectedCustomer(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            simulations: prev.simulations.map(s => s.id === sim.id ? { ...s, status: newStatus } : s)
          };
        });
      }

      setActionSim(null);
    } catch (e) {
      alert("Error actualizando estado.");
    } finally {
      setExporting(false);
    }
  }

  // =============================================
  // RENDER
  // =============================================
  return (
    <AppShell title="Clientes">
      <div className="relative z-10">

        {simFetchError && (
          <div className="mt-8 p-4 rounded-xl font-mono text-xs"
            style={{ background: "var(--danger-soft)", border: "0.5px solid rgba(178,58,58,0.30)", color: "var(--danger)" }}>
            <h4 className="font-bold mb-2">Error Fetching Simulations:</h4>
            <pre>{JSON.stringify(simFetchError, null, 2)}</pre>
          </div>
        )}

        {/* HEADER */}
        <div className="mt-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 caption mb-4 hover:opacity-80 transition-opacity">
              <ArrowLeft className="h-4 w-4" /> Volver al inicio
            </Link>
            <h1 className="flex items-center gap-3">
              <Users className="w-8 h-8" style={{ color: "var(--blue-green)" }} />
              Clientes
            </h1>
            <p className="lead mt-2">
              Vista comercial de clientes. Gestiona contactos, revisa actividad de simulaciones y accede rápidamente al historial comercial de cada cuenta.
            </p>
          </div>
          <button onClick={openCreate} className="btn btn--primary">
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </button>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="surface-card mt-8 p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--fg-muted)" }} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o NIT..."
              className="input" style={{ paddingLeft: 38 }} />
          </div>
          <select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)} className="select sm:w-52">
            <option value="">Todos los canales</option>
            {channels.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="select sm:w-52">
            <option value="">Todos los estados</option>
            <option value="VIGENTE">Vigente</option>
            <option value="VENCIDO">Vencido</option>
            <option value="DRAFT">Borrador</option>
            <option value="RENOVADA">Renovada</option>
            <option value="SIN_SIMULACIONES">Sin simulaciones</option>
          </select>
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="surface-card mt-8 py-24 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 rounded-full animate-spin mb-4"
              style={{ borderColor: "var(--navy)", borderTopColor: "transparent" }} />
            <p className="caption">Cargando clientes...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 py-24 px-6 text-center flex flex-col items-center justify-center"
            style={{ border: "0.5px dashed var(--blue-green)", borderRadius: "var(--radius-xl)" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "var(--info-soft)", color: "var(--blue-green)" }}>
              <Users className="w-8 h-8" />
            </div>
            <h3 className="mb-2">
              {searchQuery || filterChannel || filterStatus ? "Sin resultados" : "No hay clientes registrados"}
            </h3>
            <p className="caption max-w-sm">
              {searchQuery || filterChannel || filterStatus
                ? "Intenta con otros filtros de búsqueda."
                : "Crea tu primer cliente para comenzar a simular negociaciones."}
            </p>
          </div>
        ) : (
          <div className="surface-card mt-8 overflow-hidden">
            <div className="overflow-x-auto">
              <table className={`w-full ${tableStyles.tableWrapper}`}>
                <thead style={{ background: "var(--bg-hover)", borderBottom: "0.5px solid var(--border-hair)" }}>
                  <tr>
                    <th className={`overline text-left ${tableStyles.th}`}>Cliente</th>
                    <th className={`overline text-left ${tableStyles.th}`}>NIT</th>
                    <th className={`overline text-left ${tableStyles.th}`}>Contacto</th>
                    <th className={`overline text-left ${tableStyles.th}`}>Canal</th>
                    <th className={`overline text-center ${tableStyles.th}`}>Simulaciones</th>
                    <th className={`overline text-left ${tableStyles.th}`}>Última Simulación</th>
                    <th className={`overline text-center ${tableStyles.th}`}>Estado Comercial</th>
                    <th className={`overline text-center w-24 ${tableStyles.th}`}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}
                      className="[border-bottom:0.5px_solid_var(--border-hair)] hover:bg-[color:var(--bg-hover)] transition-colors cursor-pointer group"
                      onClick={() => setSelectedCustomer(c)}>
                      {/* NAME */}
                      <td className={`align-middle ${tableStyles.td}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: "var(--info-soft)", color: "var(--blue-green)" }}>
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold truncate" style={{ color: "var(--fg-primary)" }}>{c.name}</span>
                            {c.email && (
                              <span className="text-[11px] mt-0.5 flex items-center gap-1 truncate" style={{ color: "var(--fg-muted)" }}>
                                <Mail className="w-3 h-3 opacity-40" /> {c.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* NIT */}
                      <td className={`align-middle font-medium whitespace-nowrap ${tableStyles.td}`} style={{ color: "var(--fg-muted)" }}>
                        {c.nit || "—"}
                      </td>
                      {/* CONTACT */}
                      <td className={`align-middle ${tableStyles.td}`} style={{ color: "var(--fg-muted)" }}>
                        {c.contact_name || "—"}
                      </td>
                      {/* CHANNEL */}
                      <td className={`align-middle ${tableStyles.td}`}>
                        {c.sales_channels?.name ? (
                          <span className={`pill ${tableStyles.badge}`}>{c.sales_channels.name}</span>
                        ) : (
                          <span className="text-xs italic" style={{ color: "var(--fg-muted)" }}>Sin canal</span>
                        )}
                      </td>
                      {/* SIM COUNT */}
                      <td className={`text-center align-middle ${tableStyles.td}`}>
                        {c.simCount > 0 ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); }}
                            className={`pill hover:opacity-80 transition-opacity ${tableStyles.badge}`}>
                            {c.simCount} sim.
                          </button>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--fg-muted)" }}>0</span>
                        )}
                      </td>
                      {/* LAST SIM DATE */}
                      <td className={`align-middle whitespace-nowrap ${tableStyles.td}`} style={{ color: "var(--fg-muted)" }}>
                        {c.lastSimDate ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Clock className="w-3.5 h-3.5 opacity-50" />
                            <span className="font-medium" style={{ color: "var(--fg-primary)" }}>{formatDateTime(c.lastSimDate)}</span>
                          </div>
                        ) : "—"}
                      </td>
                      {/* STATUS */}
                      <td className={`text-center align-middle ${tableStyles.td}`}>
                        {getStatusPill(c.lastSimStatus)}
                      </td>
                      {/* ACTION */}
                      <td className={`text-center align-middle ${tableStyles.td}`}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); }}
                          className={`btn btn--ghost ${tableStyles.button}`}>
                          Ver <ChevronRight className="w-3.5 h-3.5" />
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

      {/* ================================================= */}
      {/* CUSTOMER DETAIL MODAL                               */}
      {/* ================================================= */}
      {selectedCustomer && !isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6 py-6 lg:px-12">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)} />
          <div className="relative w-full max-w-[1280px] max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            style={{ background: "var(--bg-card)", borderRadius: "var(--radius-xl)", boxShadow: "0 8px 32px -8px rgba(37,65,83,0.18)", border: "0.5px solid rgba(37,65,83,0.12)" }}>

            {/* HEADER */}
            <div className="px-6 py-5 flex items-start justify-between flex-shrink-0"
              style={{ borderBottom: "0.5px solid var(--border-hair)", background: "var(--bg-hover)" }}>
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "var(--info-soft)", color: "var(--blue-green)" }}>
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-semibold truncate" style={{ color: "var(--fg-primary)" }}>{selectedCustomer.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs" style={{ color: "var(--fg-muted)" }}>
                    {selectedCustomer.nit && <span className="font-medium">NIT: {selectedCustomer.nit}</span>}
                    {selectedCustomer.sales_channels?.name && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full" style={{ background: "var(--fg-muted)", opacity: 0.4 }} />
                        {selectedCustomer.sales_channels.name}
                      </span>
                    )}
                    {selectedCustomer.contact_name && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full" style={{ background: "var(--fg-muted)", opacity: 0.4 }} />
                        {selectedCustomer.contact_name}
                      </span>
                    )}
                    {selectedCustomer.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3 opacity-50" /> {selectedCustomer.email}
                      </span>
                    )}
                  </div>
                  {selectedCustomer.notes && (
                    <p className="mt-2 text-xs italic rounded-lg px-3 py-1.5 max-w-xl"
                      style={{ color: "var(--fg-muted)", background: "var(--bg-hover)" }}>
                      {selectedCustomer.notes}
                    </p>
                  )}
                </div>

                {/* KPI PILLS */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-center px-4 py-2 rounded-xl"
                    style={{ background: "var(--bg-card)", border: "0.5px solid var(--border-hair)" }}>
                    <div className="text-lg font-bold" style={{ color: "var(--fg-primary)" }}>{selectedCustomer.simCount}</div>
                    <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--fg-muted)" }}>Simulaciones</div>
                  </div>
                  <div className="text-center px-3 py-2">
                    {getStatusPill(selectedCustomer.lastSimStatus)}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="btn btn--ghost p-2 ml-3">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SIMULATION LIST */}
            <div className="overflow-y-auto flex-1">
              {selectedCustomer.simulations.length === 0 ? (
                <div className="py-20 text-center">
                  <FileText className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--fg-muted)", opacity: 0.3 }} />
                  <p className="text-sm font-medium" style={{ color: "var(--fg-muted)" }}>Este cliente no tiene simulaciones aún.</p>
                  <p className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>Crea una nueva simulación para comenzar.</p>
                </div>
              ) : (
                <table className={`w-full table-fixed ${tableStyles.tableWrapper}`}>
                  <colgroup>
                    <col className="w-[14%]" />
                    <col className="w-[24%]" />
                    <col className="w-[14%]" />
                    <col className="w-[8%]" />
                    <col className="w-[18%]" />
                    <col className="w-[12%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <thead className="sticky top-0 z-10"
                    style={{ background: "var(--bg-hover)", borderBottom: "0.5px solid var(--border-hair)" }}>
                    <tr>
                      <th className={`overline text-left ${tableStyles.th}`}>Fecha</th>
                      <th className={`overline text-left ${tableStyles.th}`}>Proyecto / Oportunidad</th>
                      <th className={`overline text-left ${tableStyles.th}`}>Tipo</th>
                      <th className={`overline text-center ${tableStyles.th}`}>Moneda</th>
                      <th className={`overline text-left ${tableStyles.th}`}>Vigencia</th>
                      <th className={`overline text-center ${tableStyles.th}`}>Estado</th>
                      <th className={`overline text-center ${tableStyles.th}`}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCustomer.simulations.map((sim) => {
                      const displayStatus = getDisplayStatus(sim);
                      return (
                        <tr key={sim.id} className="[border-bottom:0.5px_solid_var(--border-hair)] hover:bg-[color:var(--bg-hover)] transition-colors">
                          <td className={`align-middle ${tableStyles.td}`} style={{ color: "var(--fg-muted)" }}>{formatDateTime(sim.created_at)}</td>
                          <td className={`align-middle ${tableStyles.td}`}>
                            <div className="flex flex-col gap-0.5">
                              {sim.simulation_number && (
                                <span className="text-[10px] font-semibold" style={{ color: "var(--fg-muted)" }}>
                                  {sim.simulation_number}
                                </span>
                              )}
                              {sim.project_name ? (
                                <span className="font-medium" style={{ color: "var(--fg-primary)" }}>{sim.project_name}</span>
                              ) : (
                                <span className="text-xs flex items-center gap-1" style={{ color: "var(--fg-muted)", fontStyle: "italic" }}>
                                  <AlertCircle className="w-3 h-3 opacity-50" /> Sin especificar
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={`align-middle ${tableStyles.td}`}>
                            <span className="font-medium" style={{ color: "var(--fg-muted)" }}>{getTypeLabel(sim.simulation_type)}</span>
                          </td>
                          <td className={`text-center align-middle ${tableStyles.td}`}>
                            <span className={`pill ${tableStyles.badge}`}>{sim.currency}</span>
                          </td>
                          <td className={`align-middle ${tableStyles.td}`}>
                            {sim.valid_from && sim.valid_to ? (
                              <span className="font-medium text-xs" style={{ color: "var(--fg-primary)" }}>
                                {formatDate(sim.valid_from)} <span style={{ color: "var(--fg-muted)", margin: "0 2px" }}>→</span> {formatDate(sim.valid_to)}
                              </span>
                            ) : "—"}
                          </td>
                          <td className={`text-center align-middle ${tableStyles.td}`}>{getStatusPill(displayStatus)}</td>
                          <td className={`text-center align-middle ${tableStyles.td}`}>
                            <button onClick={() => setActionSim(sim)} className={`btn btn--ghost ${tableStyles.button}`}>
                              Acciones
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* FOOTER */}
            <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
              style={{ borderTop: "0.5px solid var(--border-hair)", background: "var(--bg-hover)" }}>
              <div className="flex items-center gap-3">
                <button onClick={() => { setSelectedCustomer(null); openEdit(selectedCustomer); }}
                  className="btn btn--secondary">
                  <Pencil className="w-3.5 h-3.5" /> Editar Cliente
                </button>
                <Link href="/simulator" className="btn btn--primary">
                  <Calculator className="w-3.5 h-3.5" /> Nueva Simulación
                </Link>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="btn btn--ghost">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* ACTION MODAL                                      */}
      {/* ================================================= */}
      {actionSim && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => !exporting && setActionSim(null)}
          />
          <div className="relative w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            style={{ background: "var(--bg-card)", borderRadius: "var(--radius-xl)", boxShadow: "0 8px 32px -8px rgba(37,65,83,0.18)", border: "0.5px solid rgba(37,65,83,0.12)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "0.5px solid var(--border-hair)", background: "var(--bg-hover)" }}>
              <h3 className="text-base font-semibold" style={{ color: "var(--fg-primary)" }}>
                Acciones del escenario
              </h3>
              <p className="text-xs mt-1 truncate" style={{ color: "var(--fg-muted)" }}>
                {actionSim.project_name || "Sin título"}
              </p>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <button
                onClick={() => router.push(`/simulator?id=${actionSim.id}`)}
                disabled={exporting}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50 hover:opacity-80"
                style={{ background: "var(--bg-card)", border: "0.5px solid var(--border-hair)", color: "var(--fg-primary)" }}
              >
                <Pencil className="w-4 h-4" style={{ color: "var(--fg-muted)" }} />
                Editar / Ver simulación
              </button>

              <button
                onClick={() => handleExport(actionSim)}
                disabled={exporting}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50 hover:opacity-80"
                style={{ background: "var(--bg-card)", border: "0.5px solid var(--border-hair)", color: "var(--fg-primary)" }}
              >
                <FileDown className="w-4 h-4" style={{ color: "var(--fg-muted)" }} />
                <span className="flex-1 text-left">Descargar Excel</span>
                {exporting && (
                  <span className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: "var(--navy)", borderTopColor: "transparent" }} />
                )}
              </button>

              {actionSim.status === "DRAFT" && (
                <button
                  onClick={() => handleStatusChange(actionSim, "VIGENTE")}
                  disabled={exporting}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50 mt-1"
                  style={{ background: "var(--success-soft)", border: "0.5px solid rgba(46,125,91,0.30)", color: "var(--success)" }}
                >
                  <CheckCircle className="w-4 h-4" />
                  Activar / Confirmar
                </button>
              )}

              {(actionSim.status === "DRAFT" || actionSim.status === "VIGENTE") && (
                <button
                  onClick={() => handleStatusChange(actionSim, "RECHAZADA")}
                  disabled={exporting}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50 mt-1"
                  style={{ background: "var(--danger-soft)", border: "0.5px solid rgba(178,58,58,0.30)", color: "var(--danger)" }}
                >
                  <X className="w-4 h-4" />
                  Rechazar Simulación
                </button>
              )}
            </div>
            <div className="px-5 py-3" style={{ borderTop: "0.5px solid var(--border-hair)", background: "var(--bg-hover)" }}>
              <button
                onClick={() => setActionSim(null)}
                disabled={exporting}
                className="w-full text-center px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 btn btn--ghost"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* CREATE / EDIT MODAL                                 */}
      {/* ================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            style={{ background: "var(--bg-card)", borderRadius: "var(--radius-xl)", boxShadow: "0 8px 32px -8px rgba(37,65,83,0.18)", border: "0.5px solid rgba(37,65,83,0.12)" }}>
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "0.5px solid var(--border-hair)", background: "var(--bg-hover)" }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl"
                  style={{ background: "var(--info-soft)", color: "var(--blue-green)" }}>
                  <UserPlus className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--fg-primary)" }}>
                  {editingCustomer ? "Editar Cliente" : "Crear Cliente"}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="btn btn--ghost p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 text-sm rounded-xl"
                    style={{ background: "var(--danger-soft)", border: "0.5px solid rgba(178,58,58,0.30)", color: "var(--danger)" }}>
                    {formError}
                  </div>
                )}
                <div>
                  <label className="field-label block mb-1.5">Nombre de Cliente <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input type="text" value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input" placeholder="Ej: Constructora ABC" required />
                </div>
                <div>
                  <label className="field-label block mb-1.5">NIT</label>
                  <input type="text" value={formData.nit}
                    onChange={(e) => setFormData({...formData, nit: e.target.value})}
                    className="input" placeholder="Ej: 900.123.456-7" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label block mb-1.5">Nombre de Contacto</label>
                    <input type="text" value={formData.contact_name}
                      onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                      className="input" />
                  </div>
                  <div>
                    <label className="field-label block mb-1.5">Email</label>
                    <input type="email" value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="input" />
                  </div>
                </div>
                <div>
                  <label className="field-label block mb-1.5">Canal de Venta</label>
                  <select value={formData.default_channel_id}
                    onChange={(e) => setFormData({...formData, default_channel_id: e.target.value})}
                    className="select">
                    <option value="">-- Seleccionar canal --</option>
                    {channels.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label block mb-1.5">Notas</label>
                  <textarea value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2}
                    className="input resize-none"
                    placeholder="Información adicional del cliente..." />
                </div>
              </form>
            </div>

            <div className="p-4 flex justify-end gap-3"
              style={{ borderTop: "0.5px solid var(--border-hair)", background: "var(--bg-hover)" }}>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn--secondary">
                Cancelar
              </button>
              <button type="submit" form="customer-form" disabled={formLoading} className="btn btn--primary disabled:opacity-50">
                {formLoading ? "Guardando..." : editingCustomer ? "Guardar Cambios" : "Crear Cliente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
