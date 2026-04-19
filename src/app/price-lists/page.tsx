"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft, Tag, Plus, FolderOpen, Download, UploadCloud,
  ChevronRight, X, Store, Package, Calendar, AlertCircle,
  Search, Pencil
} from "lucide-react";
import * as XLSX from "xlsx";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { PriceListModal } from "@/components/PriceListModal";
import { PriceListUploadModal } from "@/components/PriceListUploadModal";

// =============================================
// TYPES
// =============================================

type PriceListRow = {
  id: string;
  channel_id: string;
  currency: string;
  list_price: number;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  created_at: string;
  sales_channels: { name: string; default_currency: string; is_active: boolean };
  products: { sap_code: string; description: string };
};

type ChannelGroup = {
  channelId: string;
  channelName: string;
  defaultCurrency: string;
  isActive: boolean;
  productCount: number;
  activeCount: number;
  lastUpdated: string;
  prices: PriceListRow[];
};

// =============================================
// COMPONENT
// =============================================

export default function PriceListsPage() {
  const [data, setData] = useState<PriceListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Channel detail modal
  const [selectedChannel, setSelectedChannel] = useState<ChannelGroup | null>(null);
  const [channelSearch, setChannelSearch] = useState("");

  // Edit price row
  const [editingRow, setEditingRow] = useState<PriceListRow | null>(null);
  const [editForm, setEditForm] = useState({ list_price: "", currency: "COP", valid_from: "", valid_to: "", is_active: true });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const supabase = createClient();

  async function fetchPriceLists() {
    setLoading(true);
    try {
      const { data: dbData, error } = await supabase
        .from("price_lists")
        .select(`
          id, channel_id, currency, list_price, valid_from, valid_to, is_active, created_at,
          sales_channels (name, default_currency, is_active),
          products (sap_code, description)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (dbData) setData(dbData as any as PriceListRow[]);
    } catch (err) {
      console.error("Error fetching price lists:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPriceLists(); }, [supabase]);

  // =============================================
  // GROUP BY CHANNEL
  // =============================================
  const channelGroups: ChannelGroup[] = useMemo(() => {
    const map = new Map<string, PriceListRow[]>();
    for (const row of data) {
      const key = row.channel_id || "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }

    const groups: ChannelGroup[] = [];
    for (const [channelId, prices] of map) {
      const latest = prices[0];
      const activeCount = prices.filter(p => p.is_active).length;
      let lastUpdated = prices[0]?.created_at || "";
      for (const p of prices) {
        if (p.created_at > lastUpdated) lastUpdated = p.created_at;
      }

      groups.push({
        channelId,
        channelName: latest.sales_channels?.name || "Sin Canal",
        defaultCurrency: latest.sales_channels?.default_currency || "COP",
        isActive: latest.sales_channels?.is_active ?? true,
        productCount: prices.length,
        activeCount,
        lastUpdated,
        prices,
      });
    }

    groups.sort((a, b) => a.channelName.localeCompare(b.channelName));
    return groups;
  }, [data]);

  // =============================================
  // HELPERS
  // =============================================
  function formatMoney(value: number) {
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
  }

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
    return `${day}/${month}/${year}`;
  }

  function downloadTemplate() {
    const wsData = [
      ["channel_name", "sap_code", "currency", "list_price", "valid_from", "valid_to", "is_active"],
      ["Canal Constructor", "43003001", "COP", 250000, "2026-01-01", "2026-12-31", "true"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Carga_Masiva_Precios");
    XLSX.writeFile(wb, "Plantilla_Carga_Precios.xlsx");
  }

  // =============================================
  // CHANNEL DETAIL: FILTERED PRICES
  // =============================================
  const filteredChannelPrices = useMemo(() => {
    if (!selectedChannel) return [];
    if (!channelSearch) return selectedChannel.prices;
    const q = channelSearch.toLowerCase();
    return selectedChannel.prices.filter(p =>
      (p.products?.description || "").toLowerCase().includes(q) ||
      (p.products?.sap_code || "").toLowerCase().includes(q)
    );
  }, [selectedChannel, channelSearch]);

  // =============================================
  // EDIT PRICE ROW
  // =============================================
  function openEditRow(row: PriceListRow) {
    setEditingRow(row);
    setEditForm({
      list_price: String(row.list_price),
      currency: row.currency,
      valid_from: row.valid_from ? row.valid_from.split("T")[0] : "",
      valid_to: row.valid_to ? row.valid_to.split("T")[0] : "",
      is_active: row.is_active,
    });
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRow) return;
    setEditError(null);
    if (!editForm.list_price) { setEditError("El precio es obligatorio."); return; }

    setEditLoading(true);
    try {
      const { error } = await supabase
        .from("price_lists")
        .update({
          list_price: Number(editForm.list_price),
          currency: editForm.currency,
          valid_from: editForm.valid_from || null,
          valid_to: editForm.valid_to || null,
          is_active: editForm.is_active,
        })
        .eq("id", editingRow.id);

      if (error) throw error;

      setEditingRow(null);
      fetchPriceLists();
    } catch (err: any) {
      setEditError(err.message || "Error actualizando el precio.");
    } finally {
      setEditLoading(false);
    }
  }

  // =============================================
  // RENDER
  // =============================================
  return (
    <AppShell title="Listas de Precios">
      <div className="relative z-10">
        {/* HEADER */}
        <div className="mt-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors mb-4">
              <ArrowLeft className="h-4 w-4" /> Volver al inicio
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary flex items-center gap-3">
              <Tag className="w-8 h-8 text-brand-primary" />
              Listas de Precios
            </h1>
            <p className="mt-2 text-text-muted leading-relaxed max-w-2xl">
              Administra las tarifas de la compañía organizadas por canal de venta.
              Selecciona un canal para ver y gestionar sus productos y precios.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button onClick={downloadTemplate}
              className="inline-flex flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2 bg-white text-text-primary border border-border-subtle text-sm font-medium rounded-xl hover:bg-slate-50 transition-all shadow-sm">
              <Download className="w-4 h-4" /> Plantilla
            </button>
            <button onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2 bg-white text-brand-primary border border-brand-primary/20 text-sm font-medium rounded-xl hover:bg-brand-primary/5 hover:border-brand-primary/40 transition-all shadow-sm">
              <UploadCloud className="w-4 h-4" /> Carga Masiva
            </button>
            <button onClick={() => setIsModalOpen(true)}
              className="inline-flex flex-1 md:flex-none items-center justify-center gap-2 px-6 py-2 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-brand-accent transition-all shadow-sm shadow-brand-primary/20 hover:-translate-y-0.5">
              <Plus className="w-4 h-4" /> Nueva Lista
            </button>
          </div>
        </div>

        {/* MAIN TABLE: CHANNEL-FIRST */}
        {loading ? (
          <div className="mt-12 py-24 flex flex-col items-center justify-center border border-border-subtle rounded-2xl bg-white shadow-sm">
            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-text-muted">Cargando tarifas...</p>
          </div>
        ) : channelGroups.length === 0 ? (
          <div className="mt-12 border-2 border-dashed border-border-subtle rounded-3xl py-24 px-6 text-center bg-slate-50/50 shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-white border border-border-subtle rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <FolderOpen className="w-8 h-8 text-text-muted/50" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2 tracking-tight">
              Aún no hay listas de precios
            </h3>
            <p className="text-sm text-text-muted max-w-sm">
              Crea tu primera lista estableciendo un precio base atado a un canal de venta.
            </p>
            <button onClick={() => setIsModalOpen(true)}
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-brand-primary/10 text-brand-primary text-sm font-medium rounded-xl hover:bg-brand-primary/20 transition-all shadow-sm">
              Comenzar a crear
            </button>
          </div>
        ) : (
          <div className="mt-10 overflow-x-auto rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-border-subtle">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary">Canal de Venta</th>
                  <th className="px-6 py-4 text-center font-semibold text-text-primary">Moneda</th>
                  <th className="px-6 py-4 text-center font-semibold text-text-primary">Productos</th>
                  <th className="px-6 py-4 text-center font-semibold text-text-primary">Activos</th>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary">Última Actualización</th>
                  <th className="px-6 py-4 text-center font-semibold text-text-primary">Estado</th>
                  <th className="px-6 py-4 text-center font-semibold text-text-primary w-24">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {channelGroups.map((group) => (
                  <tr key={group.channelId} className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                    onClick={() => setSelectedChannel(group)}>
                    <td className="px-6 py-5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                          <Store className="w-4 h-4 text-brand-primary" />
                        </div>
                        <span className="font-semibold text-text-primary">{group.channelName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center align-middle">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {group.defaultCurrency}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center align-middle">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedChannel(group); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-brand-primary/10 hover:text-brand-primary hover:border-brand-primary/30 transition-all">
                        {group.productCount} {group.productCount === 1 ? "producto" : "productos"}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-center align-middle">
                      {group.activeCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {group.activeCount}
                        </span>
                      ) : (
                        <span className="text-text-muted text-xs">0</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-text-muted align-middle">
                      {formatDateTime(group.lastUpdated)}
                    </td>
                    <td className="px-6 py-5 text-center align-middle">
                      {group.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">Activo</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Inactivo</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center align-middle">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedChannel(group); }}
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
      {/* CHANNEL DETAIL MODAL                               */}
      {/* ================================================= */}
      {selectedChannel && !editingRow && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6 py-6 lg:px-12">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => { setSelectedChannel(null); setChannelSearch(""); }} />
          <div className="relative w-full max-w-[1280px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-border-subtle flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* HEADER */}
            <div className="px-6 py-5 border-b border-border-subtle bg-slate-50/50 flex items-center justify-between flex-shrink-0 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                  <Store className="w-5 h-5 text-brand-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-text-primary truncate">
                    {selectedChannel.channelName}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {selectedChannel.defaultCurrency} · {selectedChannel.productCount} {selectedChannel.productCount === 1 ? "producto" : "productos"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={channelSearch}
                    onChange={(e) => setChannelSearch(e.target.value)}
                    placeholder="Buscar producto o SAP..."
                    className="pl-9 pr-4 py-2 border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all w-64"
                  />
                </div>
                <button onClick={() => { setSelectedChannel(null); setChannelSearch(""); }} className="p-2 text-text-muted hover:text-text-primary hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[11%]" />
                  <col className="w-[13%]" />
                  <col className="w-[7%]" />
                  <col className="w-[20%]" />
                  <col className="w-[11%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead className="bg-slate-50/60 border-b border-border-subtle sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-text-primary text-xs uppercase tracking-wider">Producto</th>
                    <th className="px-5 py-3 text-left font-semibold text-text-primary text-xs uppercase tracking-wider">Código SAP</th>
                    <th className="px-5 py-3 text-right font-semibold text-text-primary text-xs uppercase tracking-wider">Precio</th>
                    <th className="px-5 py-3 text-center font-semibold text-text-primary text-xs uppercase tracking-wider">Moneda</th>
                    <th className="px-5 py-3 text-left font-semibold text-text-primary text-xs uppercase tracking-wider">Vigencia</th>
                    <th className="px-5 py-3 text-center font-semibold text-text-primary text-xs uppercase tracking-wider">Estado</th>
                    <th className="px-5 py-3 text-center font-semibold text-text-primary text-xs uppercase tracking-wider">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredChannelPrices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-text-muted text-sm">
                        No se encontraron productos con "{channelSearch}"
                      </td>
                    </tr>
                  ) : filteredChannelPrices.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 align-middle">
                        <div className="flex items-center gap-2.5">
                          <Package className="w-4 h-4 text-text-muted/40 flex-shrink-0" />
                          <span className="font-medium text-text-primary truncate">{row.products?.description || "—"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                          {row.products?.sap_code || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right align-middle">
                        <span className="font-bold text-text-primary">{formatMoney(row.list_price)}</span>
                      </td>
                      <td className="px-5 py-4 text-center align-middle">
                        <span className="text-xs text-text-muted font-medium">{row.currency}</span>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <div className="flex items-center gap-1.5 text-text-muted text-xs">
                          <Calendar className="w-3.5 h-3.5 opacity-60" />
                          {row.valid_from && row.valid_to ? (
                            <span className="font-medium text-text-primary">
                              {formatDate(row.valid_from)} <span className="text-slate-300 mx-0.5">→</span> {formatDate(row.valid_to)}
                            </span>
                          ) : (
                            <span className="italic opacity-70">Ilimitada</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center align-middle">
                        {row.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Inactivo</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center align-middle">
                        <button onClick={() => openEditRow(row)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-brand-primary hover:text-white hover:bg-brand-primary rounded-lg transition-all border border-brand-primary/20 hover:border-transparent shadow-sm">
                          <Pencil className="w-3 h-3" /> Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* FOOTER */}
            <div className="px-6 py-4 border-t border-border-subtle bg-slate-50/50 flex items-center justify-between flex-shrink-0">
              <button onClick={() => { setSelectedChannel(null); setChannelSearch(""); setIsModalOpen(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-xs font-semibold rounded-xl hover:bg-brand-accent transition-all shadow-sm">
                <Plus className="w-3.5 h-3.5" /> Agregar Producto
              </button>
              <button onClick={() => { setSelectedChannel(null); setChannelSearch(""); }} className="px-4 py-2 text-text-muted hover:text-text-primary text-sm font-medium transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* EDIT PRICE ROW MODAL                                */}
      {/* ================================================= */}
      {editingRow && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditingRow(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-border-subtle flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text-primary">Editar Precio</h2>
                  <p className="text-xs text-text-muted mt-0.5 truncate max-w-[250px]">
                    {editingRow.products?.sap_code} — {editingRow.products?.description}
                  </p>
                </div>
              </div>
              <button onClick={() => setEditingRow(null)} className="p-2 text-text-muted hover:text-text-primary hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <form id="edit-price-form" onSubmit={handleEditSubmit} className="space-y-4">
                {editError && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">{editError}</div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Precio <span className="text-red-500">*</span></label>
                    <input type="number" step="any" value={editForm.list_price} onChange={(e) => setEditForm({...editForm, list_price: e.target.value})}
                      className="w-full border border-border-subtle rounded-xl px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                      placeholder="0.00" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Moneda</label>
                    <select value={editForm.currency} onChange={(e) => setEditForm({...editForm, currency: e.target.value})}
                      className="w-full border border-border-subtle bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all">
                      <option value="COP">COP</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Vigencia Inicio</label>
                    <input type="date" value={editForm.valid_from} onChange={(e) => setEditForm({...editForm, valid_from: e.target.value})}
                      className="w-full border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Vigencia Fin</label>
                    <input type="date" value={editForm.valid_to} onChange={(e) => setEditForm({...editForm, valid_to: e.target.value})}
                      className="w-full border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all" />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                    className="w-4 h-4 text-brand-primary rounded border-border-subtle focus:ring-brand-primary" />
                  <span className="text-sm font-medium text-text-primary">Precio Activo</span>
                </label>
              </form>
            </div>
            <div className="p-4 border-t border-border-subtle bg-slate-50/50 flex justify-end gap-3 text-sm">
              <button type="button" onClick={() => setEditingRow(null)}
                className="px-4 py-2 border border-border-subtle text-text-primary bg-white rounded-xl hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" form="edit-price-form" disabled={editLoading}
                className="px-6 py-2 bg-brand-primary text-white font-medium rounded-xl hover:bg-brand-accent transition-colors disabled:opacity-50">
                {editLoading ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PriceListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => { setIsModalOpen(false); fetchPriceLists(); }}
      />
      <PriceListUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => { setIsUploadModalOpen(false); fetchPriceLists(); }}
      />
    </AppShell>
  );
}
