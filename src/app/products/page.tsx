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

  // Filters & Search
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
    
    ws["!cols"] = [
      { wch: 15 },
      { wch: 35 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 18 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Carga_Masiva_Productos");
    XLSX.writeFile(wb, "Plantilla_Productos.xlsx");
  }

  const filteredData = data.filter(p => {
    // Search Check
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      const codeMatch = p.sap_code?.toLowerCase().includes(term);
      const descMatch = p.description?.toLowerCase().includes(term);
      if (!codeMatch && !descMatch) return false;
    }
    
    // Status Check
    if (statusFilter === "ACTIVE" && !p.is_active) return false;
    if (statusFilter === "INACTIVE" && p.is_active) return false;

    return true;
  });

  return (
    <AppShell title="Productos">
      <div className="relative z-10">

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
              <Package className="w-8 h-8 text-brand-primary" />
              Maestro de Productos
            </h1>
            <p className="mt-2 text-text-muted leading-relaxed max-w-2xl">
              Catálogo central u orgánico de referencias (SAP). El resto de módulos tarifarios y logísticos se alimentarán exclusivamente de las referencias mapeadas en esta tabla.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full xl:w-auto">
             <button
              onClick={downloadTemplate}
              className="inline-flex flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2 bg-surface-card text-text-primary border border-border-subtle text-sm font-medium rounded-xl hover:bg-surface-hover transition-all shadow-sm"
            >
              <Download className="w-4 h-4" /> Descargar Plantilla
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2 bg-surface-card text-brand-primary border border-brand-primary/20 text-sm font-medium rounded-xl hover:bg-brand-primary/5 hover:border-brand-primary/40 transition-all shadow-sm"
            >
              <UploadCloud className="w-4 h-4" /> Cargar Productos
            </button>
            <button
              onClick={() => {
                setSelectedProduct(null);
                setIsModalOpen(true);
              }}
              className="inline-flex flex-1 md:flex-none items-center justify-center gap-2 px-6 py-2 btn-primary text-sm font-medium rounded-xl hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" /> Nuevo Producto
            </button>
          </div>
        </div>

        {/* Buscador y Filtros */}
        <div className="mt-8 bg-surface-card border border-border-subtle rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
             <input 
                type="text" 
                placeholder="Buscar por Código SAP o Descripción..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-hover border border-border-subtle rounded-xl text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all"
             />
           </div>
           
           <div className="w-full md:w-64">
             <select 
               value={statusFilter}
               onChange={e => setStatusFilter(e.target.value as any)}
               className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-all"
             >
               <option value="ALL">Mostrar Todos (Activos e Inactivos)</option>
               <option value="ACTIVE">Solo Activos</option>
               <option value="INACTIVE">Solo Inactivos</option>
             </select>
           </div>
        </div>

        {loading ? (
          <div className="mt-8 py-24 flex flex-col items-center justify-center border border-border-subtle rounded-3xl bg-surface-card shadow-sm">
            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-text-muted">Cargando catálogo maestro...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="mt-8 border-2 border-dashed border-border-subtle rounded-3xl py-24 px-6 text-center bg-surface-hover/50 shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-surface-card border border-border-subtle rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <FolderOpen className="w-8 h-8 text-text-muted/50" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2 tracking-tight">
              Aún no hay productos listados
            </h3>
            <p className="text-sm text-text-muted max-w-sm">
              Importa una sábana de Excel con el maestro SAP o crea productos individuales.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-surface-card shadow-sm">
            <table className={`w-full ${tableStyles.tableWrapper}`}>
              <thead className="bg-surface-hover/80 border-b border-border-subtle">
                <tr>
                  <th className={`text-left font-semibold text-text-primary ${tableStyles.th}`}>Código SAP</th>
                  <th className={`text-left font-semibold text-text-primary ${tableStyles.th}`}>Descripción</th>
                  <th className={`text-left font-semibold text-text-primary ${tableStyles.th}`}>Categoría</th>
                  <th className={`text-center font-semibold text-text-primary ${tableStyles.th}`}>Unidad</th>
                  <th className={`text-center font-semibold text-text-primary ${tableStyles.th}`}>Margen Obj.</th>
                  <th className={`text-center font-semibold text-text-primary w-24 ${tableStyles.th}`}>Estado</th>
                  <th className={`text-center font-semibold text-text-primary w-24 ${tableStyles.th}`}>Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-hover/50 transition-colors group">
                    <td className={`align-middle whitespace-nowrap ${tableStyles.td}`}>
                      <span className={`inline-flex items-center rounded-md font-semibold bg-surface-hover text-text-primary tracking-tight ${tableStyles.badge}`}>
                        {row.sap_code}
                      </span>
                    </td>
                    
                    <td className={`align-middle ${tableStyles.td}`}>
                      <div className="text-text-primary font-medium min-w-[200px]">
                        {row.description}
                      </div>
                    </td>

                    <td className={`align-middle text-text-muted ${tableStyles.td}`}>
                        {row.category || "—"}
                    </td>

                    <td className={`align-middle text-center text-text-muted ${tableStyles.td}`}>
                        {row.uom || "—"}
                    </td>

                    <td className={`align-middle text-center font-medium text-text-primary ${tableStyles.td}`}>
                        {row.target_margin_pct != null ? `${row.target_margin_pct}%` : "—"}
                    </td>

                    <td className={`text-center align-middle whitespace-nowrap ${tableStyles.td}`}>
                       {row.is_active ? (
                         <span className={`inline-flex items-center rounded-lg font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 ${tableStyles.badge}`}>
                           Activo
                         </span>
                       ) : (
                         <span className={`inline-flex items-center rounded-lg font-semibold bg-surface-hover text-text-muted border border-border-subtle ${tableStyles.badge}`}>
                           Inactivo
                         </span>
                       )}
                    </td>

                    <td className={`text-center align-middle ${tableStyles.td}`}>
                      <button 
                        onClick={() => {
                          setSelectedProduct(row);
                          setIsModalOpen(true);
                        }}
                        className={`text-brand-primary hover:text-brand-accent font-medium border border-transparent hover:border-brand-primary/20 hover:bg-brand-primary/5 rounded transition-colors ${tableStyles.button}`}
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

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchProducts(); 
        }}
        product={selectedProduct}
      />

      <ProductUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          fetchProducts();
        }}
      />
    </AppShell>
  );
}
