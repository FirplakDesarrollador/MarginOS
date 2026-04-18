"use client";

import { useEffect, useState } from "react";
import { X, Package, Check, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ProductRow = {
  id?: string;
  sap_code: string;
  description: string;
  category: string | null;
  uom: string | null;
  is_active: boolean;
};

type ProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: ProductRow | null; // If passed, we are in Edit Mode
};

export function ProductModal({ isOpen, onClose, onSuccess, product }: ProductModalProps) {
  const supabase = createClient();
  
  const [formData, setFormData] = useState<ProductRow>({
    sap_code: "",
    description: "",
    category: "",
    uom: "",
    is_active: true
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!product;

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setFormData({
            sap_code: product.sap_code,
            description: product.description,
            category: product.category || "",
            uom: product.uom || "",
            is_active: product.is_active
        });
      } else {
        setFormData({
            sap_code: "",
            description: "",
            category: "",
            uom: "",
            is_active: true
        });
      }
      setError(null);
    }
  }, [isOpen, product]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const sapCodeClean = formData.sap_code.trim();
    const descClean = formData.description.trim();

    if (!sapCodeClean || !descClean) {
      setError("Código SAP y Descripción son campos obligatorios.");
      return;
    }

    setLoading(true);
    
    try {
      // Manual Uniqueness validation against DB
      const query = supabase
         .from("products")
         .select("id")
         .eq("sap_code", sapCodeClean);

      if (isEditMode && product?.id) {
          query.neq("id", product.id); // Ignore self if editing
      }
      
      const { data: dbCheck } = await query;
      
      if (dbCheck && dbCheck.length > 0) {
          setError("Ya existe un producto con este código SAP.");
          setLoading(false);
          return;
      }

      // Upsert/Insert logic
      const payload = {
        sap_code: sapCodeClean,
        description: descClean,
        category: formData.category?.trim() || null,
        uom: formData.uom?.trim() || null,
        is_active: formData.is_active
      };

      if (isEditMode && product?.id) {
        const { error: updateError } = await supabase
          .from("products")
          .update(payload)
          .eq("id", product.id);
          
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("products")
          .insert(payload);
          
        if (insertError) throw insertError;
      }
      
      onSuccess(); 
    } catch (err: any) {
      console.error(err);
      setError("Ocurrió un error guardando el producto. Contacta al administrador.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-border-subtle flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {isEditMode ? "Editar Ficha de Producto" : "Nuevo Producto Maestro"}
              </h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-visible p-6">
          <form id="product-form" onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <span className="flex-1">{error}</span>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Código SAP <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.sap_code}
                  onChange={(e) => setFormData({...formData, sap_code: e.target.value})}
                  className="w-full border border-border-subtle rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all bg-white"
                  placeholder="Ej: 43003001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Descripción <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-border-subtle rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all bg-white"
                  placeholder="Ej: Pintura Acrílica Galón"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Categoría</label>
                  <input 
                    type="text" 
                    value={formData.category || ""}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full border border-border-subtle rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all bg-white"
                    placeholder="Ej: Pinturas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Unidad de Medida</label>
                  <input 
                    type="text" 
                    value={formData.uom || ""}
                    onChange={(e) => setFormData({...formData, uom: e.target.value})}
                    className="w-full border border-border-subtle rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all bg-white"
                    placeholder="Ej: GAL, UND, MT"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="w-4 h-4 text-brand-primary rounded border-border-subtle focus:ring-brand-primary"
                />
                <span className="text-sm font-medium text-text-primary">Producto Activo</span>
              </label>

            </div>
          </form>
        </div>
        
        <div className="p-4 border-t border-border-subtle bg-slate-50/50 flex justify-end gap-3 text-sm mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border-subtle text-text-primary bg-white rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={loading}
            className="px-6 py-2 bg-brand-primary text-white font-medium rounded-xl hover:bg-brand-accent transition-colors disabled:opacity-50 inline-flex justify-center items-center shadow-sm shadow-brand-primary/20"
          >
            {loading ? "Guardando..." : "Guardar Producto"}
          </button>
        </div>

      </div>
    </div>
  );
}
