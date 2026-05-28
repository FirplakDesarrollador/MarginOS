"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, Plus, FolderOpen, Download, UploadCloud, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { ProductModal } from "@/components/ProductModal";
import { ProductUploadModal } from "@/components/ProductUploadModal";
import { useTableDensity } from "@/contexts/TableDensityContext";

export type ProductRow = {
  id: string;
  sap_code: string;
  description: string;
  category: string | null;
  uom: string | null;
  is_active: boolean;
  target_margin_pct?: number | null;
};

export default function ProductsPage() {
  const [data, setData] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const { getTableClasses } = useTableDensity();
  const tableStyles = getTableClasses();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const supabase = createClient();

  async function fetchProducts() {
    setLoading(true);
    try {
      const { data: dbData, error } = await supabase
        .from("products")
        .select(`id, sap_code, description, category, uom, is_active, target_margin_pct`)
        .order("sap_code", { ascending: true });

      if (error) throw error;
      if (dbData) {
        setData(dbData as ProductRow[]);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  function downloadTemplate() {
    const wsData = [
      ["sap_code", "description", "category", "uom", "is_active", "target_margin_pct"],
      ["1001", "Pintura Acrílica Premium M", "Pinturas", "GAL", "true", 65.0],
      ["2045A", "Rodillo Profesional 9", "Herramientas", "UND", "true", null]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Carga_Masiva_Productos");
    XLSX.writeFile(wb, "Plantilla_Productos.xlsx");
  }

  const filteredData = data.filter(p => {
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      const codeMatch = p.sap_code?.toLowerCase().includes(term);
      const descMatch = p.description?.toLowerCase().includes(term);
      if (!codeMatch && !descMatch) return false;
    }
    if (statusFilter === "ACTIVE" && !p.is_active) return false;
    if (statusFilter === "INACTIVE" && p.is_active) return false;
    return true;
  });

  return (
    <AppShell title="Productos">
      <div className="relative z-10">

        {/* Header */}
        <div className="mt-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 caption mb-4 hover:opacity-80 transition-opacity">
              <ArrowLeft className="h-4 w-4" /> Volver al inicio
            </Link>
            <h1 className="flex items-center gap-3">
              <Package className="w-8 h-8" style={{ color: "var(--blue-green)" }} />
              Maestro de Productos
            </h1>
            <p className="lead mt-2">
              Catálogo central de referencias (SAP). El resto de módulos tarifarios y logísticos se alimentarán exclusivamente de las referencias mapeadas en esta tabla.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full xl:w-auto">
            <button onClick={downloadTemplate} className="btn btn--secondary flex-1 md:flex-none">
              <Download className="w-4 h-4" /> Descargar Plantilla
            </button>
            <button onClick={() => setIsUploadModalOpen(true)} className="btn btn--secondary flex-1 md:flex-none">
              <UploadCloud className="w-4 h-4" /> Cargar Productos
            </button>
            <button
              onClick={() => { setSelectedProduct(null); setIsModalOpen(true); }}
              className="btn btn--primary flex-1 md:flex-none"
            >
              <Plus className="w-4 h-4" /> Nuevo Producto
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="surface-card mt-8 p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--fg-muted)" }} />
            <input
              type="text"
              placeholder="Buscar por Código SAP o Descripción..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input"
              style={{ paddingLeft: 36 }}
            />
          </div>
          <div className="w-full md:w-64">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="select"
            >
              <option value="ALL">Mostrar Todos (Activos e Inactivos)</option>
              <option value="ACTIVE">Solo Activos</option>
              <option value="INACTIVE">Solo Inactivos</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="surface-card mt-8 py-24 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 rounded-full animate-spin mb-4"
              style={{ borderColor: "var(--navy)", borderTopColor: "transparent" }} />
            <p className="caption">Cargando catálogo maestro...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="mt-8 py-24 px-6 text-center flex flex-col items-center justify-center"
            style={{ border: "0.5px dashed var(--blue-green)", borderRadius: "var(--radius-xl)" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "var(--info-soft)", color: "var(--blue-green)" }}>
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="mb-2">Aún no hay productos listados</h3>
            <p className="caption max-w-sm">
              Importa una sábana de Excel con el maestro SAP o crea productos individuales.
            </p>
          </div>
        ) : (
          <div className="surface-card mt-8 overflow-hidden">
            <div className="overflow-x-auto">
              <table className={`w-full ${tableStyles.tableWrapper}`}>
                <thead style={{ background: "var(--bg-hover)", borderBottom: "0.5px solid var(--border-hair)" }}>
                  <tr>
                    <th className={`overline text-left ${tableStyles.th}`}>Código SAP</th>
                    <th className={`overline text-left ${tableStyles.th}`}>Descripción</th>
                    <th className={`overline text-left ${tableStyles.th}`}>Categoría</th>
                    <th className={`overline text-center ${tableStyles.th}`}>Unidad</th>
                    <th className={`overline text-center ${tableStyles.th}`}>Margen Obj.</th>
                    <th className={`overline text-center w-24 ${tableStyles.th}`}>Estado</th>
                    <th className={`overline text-center w-24 ${tableStyles.th}`}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row) => (
                    <tr key={row.id} className="[border-bottom:0.5px_solid_var(--border-hair)] hover:bg-[color:var(--bg-hover)] transition-colors group">
                      <td className={`align-middle whitespace-nowrap ${tableStyles.td}`}>
                        <span className={`pill ${tableStyles.badge}`}>{row.sap_code}</span>
                      </td>
                      <td className={`align-middle ${tableStyles.td}`}>
                        <div className="font-medium" style={{ color: "var(--fg-primary)" }}>{row.description}</div>
                      </td>
                      <td className={`align-middle ${tableStyles.td}`} style={{ color: "var(--fg-muted)" }}>
                        {row.category || "—"}
                      </td>
                      <td className={`align-middle text-center ${tableStyles.td}`} style={{ color: "var(--fg-muted)" }}>
                        {row.uom || "—"}
                      </td>
                      <td className={`align-middle text-center font-medium ${tableStyles.td}`} style={{ color: "var(--fg-primary)" }}>
                        {row.target_margin_pct != null ? `${row.target_margin_pct}%` : "—"}
                      </td>
                      <td className={`text-center align-middle whitespace-nowrap ${tableStyles.td}`}>
                        {row.is_active ? (
                          <span className={`pill pill--success ${tableStyles.badge}`}>Activo</span>
                        ) : (
                          <span className={`pill ${tableStyles.badge}`}>Inactivo</span>
                        )}
                      </td>
                      <td className={`text-center align-middle ${tableStyles.td}`}>
                        <button
                          onClick={() => { setSelectedProduct(row); setIsModalOpen(true); }}
                          className={`btn btn--ghost ${tableStyles.button}`}
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

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => { setIsModalOpen(false); fetchProducts(); }}
        product={selectedProduct}
      />
      <ProductUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => { setIsUploadModalOpen(false); fetchProducts(); }}
      />
    </AppShell>
  );
}
