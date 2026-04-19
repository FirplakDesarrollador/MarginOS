"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FolderOpen,
  AlertCircle,
  ChevronRight,
  X,
  FileDown,
  Pencil,
  Trash2,
  Users,
  Building2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { exportSimulationToExcel } from "@/lib/excelExport";
import { useRouter } from "next/navigation";

// =============================================
// TYPES
// =============================================

type Simulation = {
  id: string;
  customer_id: string;
  simulation_type: string;
  project_name: string | null;
  currency: string;
  trm: number | null;
  valid_from: string | null;
  valid_to: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
  customers?: { name: string; nit: string; contact_name: string };
  sales_channels?: { name: string };
};

type CustomerGroup = {
  customerId: string;
  customerName: string;
  customerNit: string;
  channelName: string;
  lastProject: string | null;
  lastUpdated: string;
  simulations: Simulation[];
  countTotal: number;
  countVigente: number;
  countVencido: number;
  countDraft: number;
};

// =============================================
// COMPONENT
// =============================================

export default function ScenariosPage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);

  // Customer detail modal
  const [selectedGroup, setSelectedGroup] = useState<CustomerGroup | null>(null);

  // Action modal (per-simulation, inside detail modal)
  const [actionSim, setActionSim] = useState<Simulation | null>(null);
  const [exporting, setExporting] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  // =============================================
  // DATA FETCH
  // =============================================
  useEffect(() => {
    let isMounted = true;

    async function fetchSimulations() {
      try {
        const { data, error } = await supabase
          .from("simulations")
          .select(
            "*, customers(name, nit, contact_name), sales_channels(name)"
          )
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

  // =============================================
  // GROUP BY CUSTOMER
  // =============================================
  const customerGroups: CustomerGroup[] = useMemo(() => {
    const map = new Map<string, Simulation[]>();

    for (const sim of simulations) {
      const key = sim.customer_id || "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(sim);
    }

    const groups: CustomerGroup[] = [];

    for (const [customerId, sims] of map) {
      // sims are already sorted by created_at desc from query
      const latest = sims[0];
      const latestProject = sims.find((s) => s.project_name)?.project_name || null;

      let countVigente = 0;
      let countVencido = 0;
      let countDraft = 0;

      for (const s of sims) {
        const display = getDisplayStatus(s);
        if (display === "VIGENTE") countVigente++;
        else if (display === "VENCIDO") countVencido++;
        else if (display === "DRAFT") countDraft++;
      }

      // Find latest updated_at or created_at
      let lastUpdated = latest.created_at;
      for (const s of sims) {
        const ts = s.updated_at || s.created_at;
        if (ts > lastUpdated) lastUpdated = ts;
      }

      groups.push({
        customerId,
        customerName: latest.customers?.name || "Sin Cliente",
        customerNit: latest.customers?.nit || "",
        channelName: latest.sales_channels?.name || "Sin Canal",
        lastProject: latestProject,
        lastUpdated,
        simulations: sims,
        countTotal: sims.length,
        countVigente,
        countVencido,
        countDraft,
      });
    }

    // Sort groups by last activity
    groups.sort((a, b) => (b.lastUpdated > a.lastUpdated ? 1 : -1));

    return groups;
  }, [simulations]);

  // =============================================
  // HELPERS
  // =============================================
  function formatDate(isoString: string | null) {
    if (!isoString) return "—";
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
    const base = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold";
    switch (status) {
      case "VIGENTE":
        return (
          <span className={`${base} bg-emerald-50 text-emerald-700 border border-emerald-200`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Vigente
          </span>
        );
      case "VENCIDO":
        return (
          <span className={`${base} bg-red-50 text-red-700 border border-red-200`}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Vencido
          </span>
        );
      case "RENOVADA":
        return (
          <span className={`${base} bg-blue-50 text-blue-700 border border-blue-200`}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Renovada
          </span>
        );
      case "DRAFT":
      default:
        return (
          <span className={`${base} bg-amber-50 text-amber-700 border border-amber-200`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Borrador
          </span>
        );
    }
  }

  function getDisplayStatus(sim: Simulation) {
    if (sim.status === "VIGENTE" && sim.valid_to) {
      const validToDate = new Date(sim.valid_to);
      const now = new Date();
      validToDate.setHours(23, 59, 59, 999);
      if (validToDate < now) return "VENCIDO";
    }
    return sim.status;
  }

  function getTypeLabel(type: string) {
    if (type === "PRICE_LIST") return "Lista de precios";
    if (type === "PROJECT_PROMO") return "Proyecto / Promoción";
    return type;
  }

  // =============================================
  // ACTIONS
  // =============================================
  async function handleDelete(sim: Simulation) {
    if (sim.status !== "DRAFT") {
      alert("Solo puedes eliminar simulaciones en estado Borrador.");
      return;
    }
    if (
      !confirm(
        `¿Estás seguro de que deseas eliminar permanentemente el borrador "${sim.project_name || "Sin título"}"?`
      )
    )
      return;

    try {
      setExporting(true);
      await supabase.from("simulation_lines").delete().eq("simulation_id", sim.id);
      const { error } = await supabase.from("simulations").delete().eq("id", sim.id);
      if (error) throw error;

      setSimulations((prev) => prev.filter((s) => s.id !== sim.id));
      setActionSim(null);

      // Also refresh the selectedGroup to reflect deletion
      if (selectedGroup) {
        const remaining = selectedGroup.simulations.filter((s) => s.id !== sim.id);
        if (remaining.length === 0) {
          setSelectedGroup(null);
        } else {
          setSelectedGroup({
            ...selectedGroup,
            simulations: remaining,
            countTotal: remaining.length,
            countDraft: remaining.filter((r) => r.status === "DRAFT").length,
          });
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error eliminando el borrador.");
    } finally {
      setExporting(false);
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

  // =============================================
  // RENDER
  // =============================================
  return (
    <AppShell title="Escenarios">
      <div className="relative z-10">
        {/* HEADER */}
        <div className="mt-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
              Escenarios
            </h1>
            <p className="mt-2 text-text-muted leading-relaxed max-w-2xl">
              Centro de control comercial por cliente. Selecciona un cliente para
              gestionar sus simulaciones, cotizaciones y trazabilidad de precios.
            </p>
          </div>
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="mt-12 py-24 flex flex-col items-center justify-center border border-border-subtle rounded-2xl bg-white shadow-sm">
            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-text-muted">
              Cargando escenarios...
            </p>
          </div>
        ) : customerGroups.length === 0 ? (
          /* EMPTY STATE */
          <div className="mt-12 border-2 border-dashed border-border-subtle rounded-3xl py-24 px-6 text-center bg-slate-50/50 shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-white border border-border-subtle rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <FolderOpen className="w-8 h-8 text-text-muted/50" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2 tracking-tight">
              No hay escenarios guardados
            </h3>
            <p className="text-sm text-text-muted max-w-sm">
              Cuando guardes simulaciones desde la herramienta de pricing,
              aparecerán aquí agrupadas por cliente.
            </p>
            <Link
              href="/simulator"
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-brand-accent transition-all shadow-sm hover:shadow-brand-primary/20 hover:-translate-y-0.5"
            >
              Crear nueva simulación
            </Link>
          </div>
        ) : (
          /* ============================================= */
          /* MAIN TABLE: ONE ROW PER CUSTOMER              */
          /* ============================================= */
          <div className="mt-10 overflow-x-auto rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-border-subtle">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary whitespace-nowrap">
                    Cliente
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary whitespace-nowrap">
                    Canal
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary min-w-[180px]">
                    Último Proyecto
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary whitespace-nowrap">
                    Última Actividad
                  </th>
                  <th className="px-6 py-4 text-center font-semibold text-text-primary whitespace-nowrap">
                    Simulaciones
                  </th>
                  <th className="px-6 py-4 text-center font-semibold text-text-primary whitespace-nowrap">
                    Vigentes
                  </th>
                  <th className="px-6 py-4 text-center font-semibold text-text-primary whitespace-nowrap">
                    Vencidas
                  </th>
                  <th className="px-6 py-4 text-center font-semibold text-text-primary w-24">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {customerGroups.map((group) => (
                  <tr
                    key={group.customerId}
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedGroup(group)}
                  >
                    {/* CUSTOMER */}
                    <td className="px-6 py-5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4.5 h-4.5 text-brand-primary" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-text-primary truncate">
                            {group.customerName}
                          </span>
                          {group.customerNit && (
                            <span className="text-[11px] text-text-muted mt-0.5">
                              NIT: {group.customerNit}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* CHANNEL */}
                    <td className="px-6 py-5 align-middle">
                      <span className="text-text-muted font-medium">
                        {group.channelName}
                      </span>
                    </td>

                    {/* LAST PROJECT */}
                    <td className="px-6 py-5 align-middle">
                      {group.lastProject ? (
                        <span className="font-medium text-text-primary">
                          {group.lastProject}
                        </span>
                      ) : (
                        <span className="text-text-muted italic flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 opacity-50" />
                          Sin especificar
                        </span>
                      )}
                    </td>

                    {/* LAST ACTIVITY */}
                    <td className="px-6 py-5 text-text-muted whitespace-nowrap align-middle">
                      {formatDateTime(group.lastUpdated)}
                    </td>

                    {/* SIMULATION COUNT */}
                    <td className="px-6 py-5 text-center align-middle">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGroup(group);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-brand-primary/10 hover:text-brand-primary hover:border-brand-primary/30 transition-all"
                      >
                        {group.countTotal}{" "}
                        {group.countTotal === 1
                          ? "simulación"
                          : "simulaciones"}
                      </button>
                    </td>

                    {/* VIGENTES */}
                    <td className="px-6 py-5 text-center align-middle">
                      {group.countVigente > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {group.countVigente}
                        </span>
                      ) : (
                        <span className="text-text-muted text-xs">0</span>
                      )}
                    </td>

                    {/* VENCIDAS */}
                    <td className="px-6 py-5 text-center align-middle">
                      {group.countVencido > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          {group.countVencido}
                        </span>
                      ) : (
                        <span className="text-text-muted text-xs">0</span>
                      )}
                    </td>

                    {/* ACTION */}
                    <td className="px-6 py-5 text-center align-middle">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGroup(group);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-brand-primary hover:text-white hover:bg-brand-primary rounded-lg transition-all border border-brand-primary/20 hover:border-transparent shadow-sm"
                      >
                        Ver
                        <ChevronRight className="w-3.5 h-3.5" />
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
      {/* CUSTOMER SIMULATIONS MODAL                         */}
      {/* ================================================= */}
      {selectedGroup && !actionSim && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6 py-6 lg:px-12">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedGroup(null)}
          />
          <div className="relative w-full max-w-[1280px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-border-subtle flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="px-6 py-5 border-b border-border-subtle bg-slate-50/50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-brand-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-text-primary truncate">
                    Simulaciones de {selectedGroup.customerName}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {selectedGroup.customerNit && `NIT: ${selectedGroup.customerNit} · `}
                    {selectedGroup.channelName} ·{" "}
                    {selectedGroup.simulations.length}{" "}
                    {selectedGroup.simulations.length === 1
                      ? "simulación"
                      : "simulaciones"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGroup(null)}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MODAL TABLE */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-[14%]" />{/* Fecha */}
                  <col className="w-[24%]" />{/* Proyecto */}
                  <col className="w-[16%]" />{/* Tipo */}
                  <col className="w-[8%]" />{/* Moneda */}
                  <col className="w-[18%]" />{/* Vigencia */}
                  <col className="w-[10%]" />{/* Estado */}
                  <col className="w-[10%]" />{/* Acción */}
                </colgroup>
                <thead className="bg-slate-50/60 border-b border-border-subtle sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-text-primary text-xs uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-5 py-3 text-left font-semibold text-text-primary text-xs uppercase tracking-wider">
                      Proyecto / Oportunidad
                    </th>
                    <th className="px-5 py-3 text-left font-semibold text-text-primary text-xs uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-5 py-3 text-center font-semibold text-text-primary text-xs uppercase tracking-wider">
                      Moneda
                    </th>
                    <th className="px-5 py-3 text-left font-semibold text-text-primary text-xs uppercase tracking-wider">
                      Vigencia
                    </th>
                    <th className="px-5 py-3 text-center font-semibold text-text-primary text-xs uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-5 py-3 text-center font-semibold text-text-primary text-xs uppercase tracking-wider">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {selectedGroup.simulations.map((sim) => {
                    const displayStatus = getDisplayStatus(sim);
                    return (
                      <tr
                        key={sim.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-5 py-4 text-text-muted align-middle">
                          {formatDateTime(sim.created_at)}
                        </td>

                        <td className="px-5 py-4 align-middle">
                          {sim.project_name ? (
                            <span className="font-medium text-text-primary">
                              {sim.project_name}
                            </span>
                          ) : (
                            <span className="text-text-muted italic text-xs flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 opacity-50" />
                              Sin especificar
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 align-middle">
                          <span className="text-text-muted text-xs font-medium">
                            {getTypeLabel(sim.simulation_type)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center align-middle">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {sim.currency}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-text-muted align-middle">
                          {sim.valid_from && sim.valid_to ? (
                            <span className="font-medium text-text-primary text-xs">
                              {formatDate(sim.valid_from)}{" "}
                              <span className="text-slate-300 mx-0.5">→</span>{" "}
                              {formatDate(sim.valid_to)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="px-5 py-4 text-center align-middle">
                          {getStatusPill(displayStatus)}
                        </td>

                        <td className="px-5 py-4 text-center align-middle">
                          <button
                            onClick={() => setActionSim(sim)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-brand-primary hover:text-white hover:bg-brand-primary rounded-lg transition-all border border-brand-primary/20 hover:border-transparent shadow-sm"
                          >
                            Acciones
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MODAL FOOTER */}
            <div className="px-6 py-4 border-t border-border-subtle bg-slate-50/50 flex items-center justify-between flex-shrink-0">
              <Link
                href="/simulator"
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-xs font-semibold rounded-xl hover:bg-brand-accent transition-all shadow-sm"
              >
                Nueva simulación
              </Link>
              <button
                onClick={() => setSelectedGroup(null)}
                className="px-4 py-2 text-text-muted hover:text-text-primary text-sm font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* PER-SIMULATION ACTION MODAL                        */}
      {/* ================================================= */}
      {actionSim && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => !exporting && setActionSim(null)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl border border-border-subtle flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-border-subtle bg-slate-50/50">
              <h3 className="text-base font-semibold text-text-primary">
                Acciones del escenario
              </h3>
              <p className="text-xs text-text-muted mt-1 truncate">
                {actionSim.project_name || actionSim.customers?.name || "Sin título"}
              </p>
            </div>
            <div className="p-5 flex flex-col gap-3">
              {/* EDIT */}
              <button
                onClick={() =>
                  router.push(`/simulator?id=${actionSim.id}`)
                }
                disabled={exporting}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-border-subtle rounded-xl hover:border-brand-primary/40 hover:bg-brand-primary/5 text-sm font-medium text-text-primary transition-all disabled:opacity-50"
              >
                <Pencil className="w-4 h-4 text-text-muted" />
                Editar simulación
              </button>

              {/* EXPORT */}
              <button
                onClick={() => handleExport(actionSim)}
                disabled={exporting}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-border-subtle rounded-xl hover:border-brand-primary/40 hover:bg-brand-primary/5 text-sm font-medium text-text-primary transition-all disabled:opacity-50"
              >
                <FileDown className="w-4 h-4 text-text-muted" />
                <span className="flex-1 text-left">Descargar Excel</span>
                {exporting && (
                  <span className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                )}
              </button>

              {/* DELETE DRAFT */}
              {actionSim.status === "DRAFT" && (
                <button
                  onClick={() => handleDelete(actionSim)}
                  disabled={exporting}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-red-200 rounded-xl hover:border-red-400 hover:bg-red-50 text-sm font-medium text-red-600 transition-all disabled:opacity-50 mt-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar Borrador
                </button>
              )}
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
    </AppShell>
  );
}
