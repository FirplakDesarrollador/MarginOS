"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Tag, Plus, FolderOpen, Calendar, Download, UploadCloud } from "lucide-react";
import * as XLSX from "xlsx";
import { DashboardHeader } from "@/components/dashboard-ui";
import { createClient } from "@/lib/supabase/client";
import { PriceListModal } from "@/components/PriceListModal";
import { PriceListUploadModal } from "@/components/PriceListUploadModal";

type PriceListRow = {
  id: string;
  currency: string;
  list_price: number;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  sales_channels: { name: string };
  products: { sap_code: string; description: string };
};

export default function PriceListsPage() {
  const [data, setData] = useState<PriceListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const supabase = createClient();

  async function fetchPriceLists() {
    setLoading(true);
    try {
      const { data: dbData, error } = await supabase
        .from("price_lists")
        .select(`
          id,
          currency,
          list_price,
          valid_from,
          valid_to,
          is_active,
          sales_channels (name),
          products (sap_code, description)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (dbData) {
        setData(dbData as any as PriceListRow[]);
      }
    } catch (err) {
      console.error("Error fetching price lists:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPriceLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  function formatMoney(value: number) {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }

  function formatDate(isoString: string | null) {
    if (!isoString) return "—";
    const [year, month, day] = isoString.split("T")[0].split("-");
    if (!year || !month || !day) return "—";
    return `${day}/${month}/${year}`;
  }

  function downloadTemplate() {
    const wsData = [
      ["channel_name", "sap_code", "currency", "list_price", "valid_from", "valid_to", "is_active"],
      ["Canal Constructor", "43003001", "COP", 250000, "2026-01-01", "2026-12-31", "true"]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Auto-size columns slightly
    ws["!cols"] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Carga_Masiva_Precios");
    XLSX.writeFile(wb, "Plantilla_Carga_Precios.xlsx");
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
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary flex items-center gap-3">
              <Tag className="w-8 h-8 text-brand-primary" />
              Listas de Precios
            </h1>
            <p className="mt-2 text-text-muted leading-relaxed max-w-2xl">
              Administra todas las bases tarifarias orgánicas de la compañía. Controla dinámicamente
              a quién (Canal) y qué vendes (Producto) vinculando fechas de validación.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
             <button
              onClick={downloadTemplate}
              className="inline-flex flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2 bg-white text-text-primary border border-border-subtle text-sm font-medium rounded-xl hover:bg-slate-50 transition-all shadow-sm"
            >
              <Download className="w-4 h-4" /> Descargar Plantilla
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2 bg-white text-brand-primary border border-brand-primary/20 text-sm font-medium rounded-xl hover:bg-brand-primary/5 hover:border-brand-primary/40 transition-all shadow-sm"
            >
              <UploadCloud className="w-4 h-4" /> Cargar Masivamente
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex flex-1 md:flex-none items-center justify-center gap-2 px-6 py-2 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-brand-accent transition-all shadow-sm shadow-brand-primary/20 hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" /> Nueva Lista Simple
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-12 py-24 flex flex-col items-center justify-center border border-border-subtle rounded-3xl bg-white shadow-sm">
            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-text-muted">Cargando tarifas vigentes...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="mt-12 border-2 border-dashed border-border-subtle rounded-3xl py-24 px-6 text-center bg-slate-50/50 shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-white border border-border-subtle rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <FolderOpen className="w-8 h-8 text-text-muted/50" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2 tracking-tight">
              Aún no hay listas de precios activas
            </h3>
            <p className="text-sm text-text-muted max-w-sm">
              Crea tu primera lista estableciendo un precio base atado a un canal de venta.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-brand-primary/10 text-brand-primary text-sm font-medium rounded-xl hover:bg-brand-primary/20 transition-all shadow-sm"
            >
              Comenzar a crear
            </button>
          </div>
        ) : (
          <div className="mt-10 overflow-x-auto rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-border-subtle">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary whitespace-nowrap">Canal de Venta</th>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary">Producto</th>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary">Código SAP</th>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary">Precio Fijo</th>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary whitespace-nowrap">Vigencia temporal</th>
                  <th className="px-6 py-4 text-center font-semibold text-text-primary w-32">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5 align-middle">
                       <span className="font-semibold text-text-primary tracking-tight">
                          {row.sales_channels?.name || "—"}
                       </span>
                    </td>
                    
                    <td className="px-6 py-5 align-middle">
                      <div className="text-text-primary min-w-[200px] font-medium">
                        {row.products?.description || "—"}
                      </div>
                    </td>

                    <td className="px-6 py-5 align-middle">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 tracking-tight">
                        {row.products?.sap_code || "—"}
                      </span>
                    </td>

                    <td className="px-6 py-5 align-middle whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-text-primary text-[15px]">{formatMoney(row.list_price)}</span>
                        <span className="text-xs text-text-muted font-medium">{row.currency}</span>
                      </div>
                    </td>

                    <td className="px-6 py-5 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-2 text-text-muted">
                        <Calendar className="w-4 h-4 opacity-70" />
                        {row.valid_from && row.valid_to ? (
                          <span className="font-medium text-[13px]">
                            {formatDate(row.valid_from)} <span className="text-slate-300 mx-1">→</span> {formatDate(row.valid_to)}
                          </span>
                        ) : (
                          <span className="font-medium italic opacity-70">Ilimitada</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-5 text-center align-middle">
                       {row.is_active ? (
                         <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                           Activo
                         </span>
                       ) : (
                         <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                           Inactivo
                         </span>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PriceListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchPriceLists(); 
        }}
      />
      
      <PriceListUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          fetchPriceLists();
        }}
      />
    </main>
  );
}
