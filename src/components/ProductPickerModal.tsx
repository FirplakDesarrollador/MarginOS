"use client";

import { useEffect, useState } from "react";
import { Search, X, PackagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type DBProduct = {
  id: string;
  sap_code: string;
  description: string;
  category: string;
  uom: string;
};

type ProductPickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: DBProduct) => void;
  existingSapCodes: string[];
};

export function ProductPickerModal({ isOpen, onClose, onSelect, existingSapCodes }: ProductPickerModalProps) {
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) return;
    
    let isMounted = true;
    const fetchProducts = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          sap_code,
          description,
          category,
          uom
        `)
        .eq("is_active", true)
        .order("description", { ascending: true })
        .limit(100);

      if (!error && data && isMounted) {
        const processed = data.map((item: any) => {
          return {
            id: item.id,
            sap_code: item.sap_code,
            description: item.description,
            category: item.category || "",
            uom: item.uom || "UN",
          } as DBProduct;
        });
        setProducts(processed);
      }
      if (isMounted) setLoading(false);
    };

    fetchProducts();
    
    return () => {
      isMounted = false;
    };
  }, [isOpen, supabase]);

  if (!isOpen) return null;

  const filteredProducts = products.filter(
    (p) =>
      p.sap_code.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal / Dialog */}
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-xl border border-border-subtle flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Agregar Producto</h2>
              <p className="text-sm text-text-muted">Selecciona un producto del maestro para añadirlo a la simulación.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border-subtle">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              type="text" 
              placeholder="Buscar por código SAP o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-text-muted">
              <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium">Consultando catálogo...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-text-muted">
              <PackagePlus className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-text-primary">No se encontraron productos</p>
              <p className="text-sm mt-1">Intenta con otros términos de búsqueda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((p) => {
                return (
                  <div 
                    key={p.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-border-subtle bg-white hover:border-brand-primary/30 hover:shadow-sm transition-all gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                          SAP: {p.sap_code}
                        </span>
                        {p.category && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-border-subtle text-slate-600">
                            {p.category}
                          </span>
                        )}
                        <span className="text-xs text-text-muted">
                          {p.uom}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-text-primary truncate">
                        {p.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                      <button
                        onClick={() => onSelect(p)}
                        className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all bg-white border border-border-subtle text-text-primary hover:bg-slate-50 hover:border-brand-primary"
                      >
                        Agregar Línea
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
