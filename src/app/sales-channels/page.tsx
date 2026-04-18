"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Plus, Filter, Upload, Download, Store } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard-ui";
import { createClient } from "@/lib/supabase/client";
import { SalesChannelModal, type DBChannel } from "@/components/SalesChannelModal";
import { SalesChannelUploadModal } from "@/components/SalesChannelUploadModal";
import * as XLSX from "xlsx";

export default function SalesChannelsPage() {
  const [channels, setChannels] = useState<DBChannel[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<DBChannel | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchChannels() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sales_channels")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setChannels(data || []);
    } catch (err) {
      console.error("Error fetching channels:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleDownloadTemplate = () => {
    const ws_data = [
      ["name", "default_currency", "min_margin_pct", "is_active"],
      ["Distribuidor Nacional", "COP", 25, true],
      ["Exportación LATAM", "USD", 18.5, true],
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Canales");
    XLSX.writeFile(wb, "Plantilla_Carga_Canales.xlsx");
  };

  const filteredChannels = channels.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = 
       statusFilter === "ALL" ? true :
       statusFilter === "ACTIVE" ? c.is_active === true : 
       c.is_active === false;

    return matchSearch && matchStatus;
  });

  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)] pb-24">
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-8">
        <DashboardHeader />

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
              <Store className="w-8 h-8 text-brand-primary" />
              Canales de Venta
            </h1>
            <p className="mt-2 text-text-muted leading-relaxed max-w-2xl">
              Gestión maestra de canales comerciales. Define divisas, y políticas de margen para parametrizar simulaciones de negocio.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border-subtle bg-white text-text-primary text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-text-muted" />
              Descargar Plantilla
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border-subtle bg-white text-text-primary text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4 text-text-muted" />
              Cargar Canales
            </button>
            <button
              onClick={() => {
                setEditingChannel(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-brand-accent transition-all shadow-sm shadow-brand-primary/20 hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              Nuevo Canal
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 bg-white p-4 border border-border-subtle rounded-2xl shadow-sm">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all bg-slate-50/50"
            />
          </div>
          
          <div className="w-full sm:w-auto flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-muted hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full sm:w-40 px-3 py-2 border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all bg-slate-50/50 text-text-primary font-medium"
            >
              <option value="ALL">Todos los canales</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </select>
          </div>
        </div>

        {/* Table Area */}
        {loading ? (
          <div className="mt-6 py-24 flex flex-col items-center justify-center border border-border-subtle rounded-2xl bg-white shadow-sm">
             <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
             <p className="text-sm font-medium text-text-muted">Cargando canales...</p>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="mt-6 border-2 border-dashed border-border-subtle rounded-3xl py-24 px-6 text-center bg-slate-50/50 shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-white border border-border-subtle rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <Store className="w-8 h-8 text-text-muted/50" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2 tracking-tight">
              {searchQuery ? "No se encontraron canales" : "Sin canales de venta"}
            </h3>
            <p className="text-sm text-text-muted max-w-sm mb-6">
              {searchQuery 
                ? "No hay resultados que coincidan con tu búsqueda actual." 
                : "Agrega tu primer canal de venta o descarga la plantilla para cargas masivas."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => {
                  setEditingChannel(null);
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-border-subtle bg-white text-text-primary text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
              >
                Agregar mi primer canal
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-border-subtle">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary">Nombre del canal</th>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary">Moneda por defecto</th>
                  <th className="px-6 py-4 text-right font-semibold text-text-primary">Margen mínimo %</th>
                  <th className="px-6 py-4 text-center font-semibold text-text-primary">Estado</th>
                  <th className="px-6 py-4 text-center font-semibold text-text-primary w-24">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredChannels.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5 font-medium text-text-primary align-middle">
                      {c.name}
                    </td>
                    <td className="px-6 py-5 align-middle">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {c.default_currency}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right font-medium align-middle">
                      {c.min_margin_pct !== null && c.min_margin_pct !== undefined ? (
                         <span className="text-text-primary">{c.min_margin_pct}%</span>
                      ) : (
                         <span className="text-text-muted italic text-xs">No definido</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center align-middle">
                      {c.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                           Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                           <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                           Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center align-middle">
                      <button
                        onClick={() => {
                          setEditingChannel(c);
                          setIsCreateModalOpen(true);
                        }}
                        className="p-2 text-brand-primary hover:text-white hover:bg-brand-primary rounded-lg transition-colors border border-brand-primary/20 hover:border-transparent opacity-0 group-hover:opacity-100 shadow-sm"
                        title="Editar Canal"
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

      <SalesChannelModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingChannel(null);
        }}
        onSuccess={fetchChannels}
        editChannel={editingChannel}
      />

      <SalesChannelUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={fetchChannels}
      />

    </main>
  );
}
