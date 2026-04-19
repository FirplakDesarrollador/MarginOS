"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft, Users, Search, Plus, Pencil, X, UserPlus, Building2, Mail,
  ChevronRight, FileText, Calculator, Clock, AlertCircle, ExternalLink
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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

  // Detail modal
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerEnriched | null>(null);

  // =============================================
  // DATA FETCH
  // =============================================
  async function fetchAll() {
    setLoading(true);
    const [custRes, simRes, chRes] = await Promise.all([
      supabase.from("customers").select("*, sales_channels(name)").order("name"),
      supabase.from("simulations").select("id, customer_id, status, project_name, simulation_type, currency, valid_from, valid_to, created_at, updated_at").order("created_at", { ascending: false }),
      supabase.from("sales_channels").select("id, name").eq("is_active", true).order("name"),
    ]);
    if (custRes.data) setCustomers(custRes.data);
    if (simRes.data) setSimulations(simRes.data);
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
    const base = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold";
    switch (status) {
      case "VIGENTE":
        return <span className={`${base} bg-emerald-50 text-emerald-700 border border-emerald-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Vigente
        </span>;
      case "VENCIDO":
        return <span className={`${base} bg-red-50 text-red-700 border border-red-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Vencido
        </span>;
      case "RENOVADA":
        return <span className={`${base} bg-blue-50 text-blue-700 border border-blue-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Renovada
        </span>;
      case "DRAFT":
        return <span className={`${base} bg-amber-50 text-amber-700 border border-amber-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Borrador
        </span>;
      default:
        return <span className={`${base} bg-slate-50 text-slate-500 border border-slate-200`}>Sin simulaciones</span>;
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

  // =============================================
  // RENDER
  // =============================================
  return (
    <AppShell title="Clientes">
      <div className="relative z-10">
        {/* HEADER */}
        <div className="mt-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors mb-4">
              <ArrowLeft className="h-4 w-4" /> Volver al inicio
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary flex items-center gap-3">
              <Users className="w-8 h-8 text-brand-primary" />
              Clientes
            </h1>
            <p className="mt-2 text-text-muted leading-relaxed max-w-2xl">
              Vista comercial de clientes. Gestiona contactos, revisa actividad de simulaciones y accede rápidamente al historial comercial de cada cuenta.
            </p>
          </div>
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-brand-accent transition-all shadow-sm hover:-translate-y-0.5">
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </button>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o NIT..."
              className="w-full pl-10 pr-4 py-2.5 border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all" />
          </div>
          <select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)}
            className="border border-border-subtle rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all min-w-[180px]">
            <option value="">Todos los canales</option>
            {channels.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-border-subtle rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all min-w-[180px]">
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
          <div className="mt-12 py-24 flex flex-col items-center justify-center border border-border-subtle rounded-2xl bg-white shadow-sm">
            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-text-muted">Cargando clientes...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-12 border-2 border-dashed border-border-subtle rounded-3xl py-24 px-6 text-center bg-slate-50/50 shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-white border border-border-subtle rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <Users className="w-8 h-8 text-text-muted/50" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              {searchQuery || filterChannel || filterStatus ? "Sin resultados" : "No hay clientes registrados"}
            </h3>
            <p className="text-sm text-text-muted max-w-sm">
              {searchQuery || filterChannel || filterStatus
                ? "Intenta con otros filtros de búsqueda."
                : "Crea tu primer cliente para comenzar a simular negociaciones."}
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-border-subtle">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold text-text-primary">Cliente</th>
                  <th className="px-5 py-4 text-left font-semibold text-text-primary">NIT</th>
                  <th className="px-5 py-4 text-left font-semibold text-text-primary">Contacto</th>
                  <th className="px-5 py-4 text-left font-semibold text-text-primary">Canal</th>
                  <th className="px-5 py-4 text-center font-semibold text-text-primary">Simulaciones</th>
                  <th className="px-5 py-4 text-left font-semibold text-text-primary">Última Simulación</th>
                  <th className="px-5 py-4 text-center font-semibold text-text-primary">Estado Comercial</th>
                  <th className="px-5 py-4 text-center font-semibold text-text-primary w-24">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                    onClick={() => setSelectedCustomer(c)}>
                    {/* NAME */}
                    <td className="px-5 py-5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-brand-primary" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-text-primary truncate">{c.name}</span>
                          {c.email && (
                            <span className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 opacity-40" /> {c.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* NIT */}
                    <td className="px-5 py-5 align-middle text-text-muted font-medium whitespace-nowrap">
                      {c.nit || "—"}
                    </td>
                    {/* CONTACT */}
                    <td className="px-5 py-5 align-middle text-text-muted">
                      {c.contact_name || "—"}
                    </td>
                    {/* CHANNEL */}
                    <td className="px-5 py-5 align-middle">
                      {c.sales_channels?.name ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {c.sales_channels.name}
                        </span>
                      ) : (
                        <span className="text-text-muted text-xs italic">Sin canal</span>
                      )}
                    </td>
                    {/* SIM COUNT */}
                    <td className="px-5 py-5 text-center align-middle">
                      {c.simCount > 0 ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-brand-primary/10 hover:text-brand-primary hover:border-brand-primary/30 transition-all">
                          {c.simCount} {c.simCount === 1 ? "sim." : "sim."}
                        </button>
                      ) : (
                        <span className="text-text-muted text-xs">0</span>
                      )}
                    </td>
                    {/* LAST SIM DATE */}
                    <td className="px-5 py-5 align-middle text-text-muted whitespace-nowrap">
                      {c.lastSimDate ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Clock className="w-3.5 h-3.5 opacity-50" />
                          <span className="font-medium text-text-primary">{formatDateTime(c.lastSimDate)}</span>
                        </div>
                      ) : "—"}
                    </td>
                    {/* STATUS */}
                    <td className="px-5 py-5 text-center align-middle">
                      {getStatusPill(c.lastSimStatus)}
                    </td>
                    {/* ACTION */}
                    <td className="px-5 py-5 text-center align-middle">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); }}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-brand-primary hover:text-white hover:bg-brand-primary rounded-lg transition-all border border-brand-primary/20 hover:border-transparent shadow-sm">
                        Ver <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================= */}
      {/* CUSTOMER DETAIL MODAL                               */}
      {/* ================================================= */}
      {selectedCustomer && !isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6 py-6 lg:px-12">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)} />
          <div className="relative w-full max-w-[1280px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-border-subtle flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            {/* HEADER */}
            <div className="px-6 py-5 border-b border-border-subtle bg-slate-50/50 flex items-start justify-between flex-shrink-0">
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Building2 className="w-6 h-6 text-brand-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-semibold text-text-primary truncate">{selectedCustomer.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-text-muted">
                    {selectedCustomer.nit && <span className="font-medium">NIT: {selectedCustomer.nit}</span>}
                    {selectedCustomer.sales_channels?.name && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-text-muted/40" />
                        {selectedCustomer.sales_channels.name}
                      </span>
                    )}
                    {selectedCustomer.contact_name && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-text-muted/40" />
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
                    <p className="mt-2 text-xs text-text-muted italic bg-slate-100 rounded-lg px-3 py-1.5 max-w-xl">
                      {selectedCustomer.notes}
                    </p>
                  )}
                </div>

                {/* KPI PILLS */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-center px-4 py-2 bg-white border border-border-subtle rounded-xl shadow-sm">
                    <div className="text-lg font-bold text-text-primary">{selectedCustomer.simCount}</div>
                    <div className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Simulaciones</div>
                  </div>
                  <div className="text-center px-3 py-2">
                    {getStatusPill(selectedCustomer.lastSimStatus)}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-2 text-text-muted hover:text-text-primary hover:bg-slate-100 rounded-xl transition-colors ml-3">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SIMULATION LIST */}
            <div className="overflow-y-auto flex-1">
              {selectedCustomer.simulations.length === 0 ? (
                <div className="py-20 text-center">
                  <FileText className="w-10 h-10 text-text-muted/30 mx-auto mb-4" />
                  <p className="text-sm text-text-muted font-medium">Este cliente no tiene simulaciones aún.</p>
                  <p className="text-xs text-text-muted mt-1">Crea una nueva simulación para comenzar.</p>
                </div>
              ) : (
                <table className="w-full text-sm table-fixed">
                  <colgroup>
                    <col className="w-[14%]" />
                    <col className="w-[24%]" />
                    <col className="w-[14%]" />
                    <col className="w-[8%]" />
                    <col className="w-[18%]" />
                    <col className="w-[12%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <thead className="bg-slate-50/60 border-b border-border-subtle sticky top-0 z-10">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold text-text-primary text-xs uppercase tracking-wider">Fecha</th>
                      <th className="px-5 py-3 text-left font-semibold text-text-primary text-xs uppercase tracking-wider">Proyecto / Oportunidad</th>
                      <th className="px-5 py-3 text-left font-semibold text-text-primary text-xs uppercase tracking-wider">Tipo</th>
                      <th className="px-5 py-3 text-center font-semibold text-text-primary text-xs uppercase tracking-wider">Moneda</th>
                      <th className="px-5 py-3 text-left font-semibold text-text-primary text-xs uppercase tracking-wider">Vigencia</th>
                      <th className="px-5 py-3 text-center font-semibold text-text-primary text-xs uppercase tracking-wider">Estado</th>
                      <th className="px-5 py-3 text-center font-semibold text-text-primary text-xs uppercase tracking-wider">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {selectedCustomer.simulations.map((sim) => {
                      const displayStatus = getDisplayStatus(sim);
                      return (
                        <tr key={sim.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4 text-text-muted align-middle">{formatDateTime(sim.created_at)}</td>
                          <td className="px-5 py-4 align-middle">
                            {sim.project_name ? (
                              <span className="font-medium text-text-primary">{sim.project_name}</span>
                            ) : (
                              <span className="text-text-muted italic text-xs flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 opacity-50" /> Sin especificar
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 align-middle">
                            <span className="text-text-muted text-xs font-medium">{getTypeLabel(sim.simulation_type)}</span>
                          </td>
                          <td className="px-5 py-4 text-center align-middle">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{sim.currency}</span>
                          </td>
                          <td className="px-5 py-4 align-middle">
                            {sim.valid_from && sim.valid_to ? (
                              <span className="font-medium text-text-primary text-xs">
                                {formatDate(sim.valid_from)} <span className="text-slate-300 mx-0.5">→</span> {formatDate(sim.valid_to)}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-5 py-4 text-center align-middle">{getStatusPill(displayStatus)}</td>
                          <td className="px-5 py-4 text-center align-middle">
                            <button
                              onClick={() => router.push(`/simulator?id=${sim.id}`)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-brand-primary hover:text-white hover:bg-brand-primary rounded-lg transition-all border border-brand-primary/20 hover:border-transparent shadow-sm">
                              <Pencil className="w-3 h-3" /> Editar
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
            <div className="px-6 py-4 border-t border-border-subtle bg-slate-50/50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => { setSelectedCustomer(null); openEdit(selectedCustomer); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-text-primary border border-border-subtle text-xs font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                  <Pencil className="w-3.5 h-3.5" /> Editar Cliente
                </button>
                <Link href="/simulator"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-xs font-semibold rounded-xl hover:bg-brand-accent transition-all shadow-sm">
                  <Calculator className="w-3.5 h-3.5" /> Nueva Simulación
                </Link>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="px-4 py-2 text-text-muted hover:text-text-primary text-sm font-medium transition-colors">
                Cerrar
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
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-border-subtle flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-text-primary">
                  {editingCustomer ? "Editar Cliente" : "Crear Cliente"}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-text-muted hover:text-text-primary hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">{formError}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Nombre de Cliente <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all"
                    placeholder="Ej: Constructora ABC" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">NIT</label>
                  <input type="text" value={formData.nit} onChange={(e) => setFormData({...formData, nit: e.target.value})}
                    className="w-full border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all"
                    placeholder="Ej: 900.123.456-7" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Nombre de Contacto</label>
                    <input type="text" value={formData.contact_name} onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                      className="w-full border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Canal de Venta</label>
                  <select value={formData.default_channel_id} onChange={(e) => setFormData({...formData, default_channel_id: e.target.value})}
                    className="w-full border border-border-subtle rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all">
                    <option value="">-- Seleccionar canal --</option>
                    {channels.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Notas</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2}
                    className="w-full border border-border-subtle rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    placeholder="Información adicional del cliente..." />
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-border-subtle bg-slate-50/50 flex justify-end gap-3 text-sm">
              <button type="button" onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-border-subtle text-text-primary bg-white rounded-xl hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" form="customer-form" disabled={formLoading}
                className="px-6 py-2 bg-brand-primary text-white font-medium rounded-xl hover:bg-brand-accent transition-colors disabled:opacity-50">
                {formLoading ? "Guardando..." : editingCustomer ? "Guardar Cambios" : "Crear Cliente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
