"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Plus, Upload, Download, Store } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { SalesChannelModal, type DBChannel } from "@/components/SalesChannelModal";
import { SalesChannelUploadModal } from "@/components/SalesChannelUploadModal";
import * as XLSX from "xlsx";
import { useTableDensity } from "@/contexts/TableDensityContext";

export default function SalesChannelsPage() {
  const [channels, setChannels] = useState<DBChannel[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<DBChannel | null>(null);
  const { getTableClasses } = useTableDensity();
  const tableStyles = getTableClasses();

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
    <AppShell title="Canales de Venta">
      <div className="relative z-10">

        {/* Page Header */}
        <div className="mt-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 caption mb-4 hover:opacity-80 transition-opacity">
              <ArrowLeft className="h-4 w-4" /> Volver al inicio
            </Link>
            <h1 className="flex items-center gap-3">
              <Store className="w-8 h-8" style={{ color: "var(--blue-green)" }} />
              Canales de Venta
            </h1>
            <p className="lead mt-2">
              Gestión maestra de canales comerciales. Define divisas, y políticas de margen para parametrizar simulaciones de negocio.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleDownloadTemplate} className="btn btn--secondary">
              <Download className="w-4 h-4" /> Descargar Plantilla
            </button>
            <button onClick={() => setIsUploadModalOpen(true)} className="btn btn--secondary">
              <Upload className="w-4 h-4" /> Cargar Canales
            </button>
            <button
              onClick={() => { setEditingChannel(null); setIsCreateModalOpen(true); }}
              className="btn btn--primary"
            >
              <Plus className="w-4 h-4" /> Nuevo Canal
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="surface-card mt-8 p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--fg-muted)" }} />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ paddingLeft: 36 }}
            />
          </div>
          <div className="w-full sm:w-52">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="select"
            >
              <option value="ALL">Todos los canales</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </select>
          </div>
        </div>

        {/* Table Area */}
        {loading ? (
          <div className="surface-card mt-8 py-24 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 rounded-full animate-spin mb-4"
              style={{ borderColor: "var(--navy)", borderTopColor: "transparent" }} />
            <p className="caption">Cargando canales...</p>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="mt-8 py-24 px-6 text-center flex flex-col items-center justify-center"
            style={{ border: "0.5px dashed var(--blue-green)", borderRadius: "var(--radius-xl)" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "var(--info-soft)", color: "var(--blue-green)" }}>
              <Store className="w-8 h-8" />
            </div>
            <h3 className="mb-2">
              {searchQuery ? "No se encontraron canales" : "Sin canales de venta"}
            </h3>
            <p className="caption max-w-sm">
              {searchQuery
                ? "No hay resultados que coincidan con tu búsqueda actual."
                : "Agrega tu primer canal de venta o descarga la plantilla para cargas masivas."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => { setEditingChannel(null); setIsCreateModalOpen(true); }}
                className="btn btn--secondary mt-6"
              >
                Agregar mi primer canal
              </button>
            )}
          </div>
        ) : (
          <div className="surface-card mt-8 overflow-hidden">
            <div className="overflow-x-auto">
              <table className={`w-full ${tableStyles.tableWrapper}`}>
                <thead style={{ background: "var(--bg-hover)", borderBottom: "0.5px solid var(--border-hair)" }}>
                  <tr>
                    <th className={`overline text-left ${tableStyles.th}`}>Nombre del canal</th>
                    <th className={`overline text-left ${tableStyles.th}`}>Moneda por defecto</th>
                    <th className={`overline text-right ${tableStyles.th}`}>Margen mínimo %</th>
                    <th className={`overline text-center ${tableStyles.th}`}>Estado</th>
                    <th className={`overline text-center w-24 ${tableStyles.th}`}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChannels.map((c) => (
                    <tr key={c.id} className="[border-bottom:0.5px_solid_var(--border-hair)] hover:bg-[color:var(--bg-hover)] transition-colors group">
                      <td className={`font-medium align-middle ${tableStyles.td}`} style={{ color: "var(--fg-primary)" }}>
                        {c.name}
                      </td>
                      <td className={`align-middle ${tableStyles.td}`}>
                        <span className={`pill ${tableStyles.badge}`}>{c.default_currency}</span>
                      </td>
                      <td className={`text-right font-medium align-middle ${tableStyles.td}`} style={{ color: "var(--fg-primary)" }}>
                        {c.min_margin_pct !== null && c.min_margin_pct !== undefined ? (
                          `${c.min_margin_pct}%`
                        ) : (
                          <span style={{ color: "var(--fg-muted)", fontStyle: "italic", fontSize: "0.75rem" }}>No definido</span>
                        )}
                      </td>
                      <td className={`text-center align-middle ${tableStyles.td}`}>
                        {c.is_active ? (
                          <span className={`pill pill--success ${tableStyles.badge}`}>Activo</span>
                        ) : (
                          <span className={`pill ${tableStyles.badge}`}>Inactivo</span>
                        )}
                      </td>
                      <td className={`text-center align-middle ${tableStyles.td}`}>
                        <button
                          onClick={() => { setEditingChannel(c); setIsCreateModalOpen(true); }}
                          className={`btn btn--ghost ${tableStyles.button}`}
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
          </div>
        )}
      </div>

      <SalesChannelModal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); setEditingChannel(null); }}
        onSuccess={fetchChannels}
        editChannel={editingChannel}
      />

      <SalesChannelUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={fetchChannels}
      />
    </AppShell>
  );
}
