"use client";

import { useEffect, useState } from "react";
import { X, Search, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type SalesChannel = {
  id: string;
  name: string;
};

type DBProduct = {
  id: string;
  sap_code: string;
  description: string;
};

type PriceListModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function PriceListModal({ isOpen, onClose, onSuccess }: PriceListModalProps) {
  const supabase = createClient();
  
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  
  const [productSearch, setProductSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [formData, setFormData] = useState({
    channel_id: "",
    product_id: "",
    currency: "COP",
    list_price: "",
    valid_from: "",
    valid_to: "",
    is_active: true
  });
  
  const [selectedProductName, setSelectedProductName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function fetchInitial() {
      setLoadingInitial(true);
      
      const { data: cData } = await supabase
        .from("sales_channels")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (cData && isMounted) setChannels(cData);

      const { data: pData } = await supabase
        .from("products")
        .select("id, sap_code, description")
        .eq("is_active", true);

      if (pData && isMounted) setProducts(pData);
      
      if (isMounted) setLoadingInitial(false);
    }
    
    fetchInitial();

    return () => {
      isMounted = false;
      // Reset state on close
      setFormData({
        channel_id: "",
        product_id: "",
        currency: "COP",
        list_price: "",
        valid_from: "",
        valid_to: "",
        is_active: true
      });
      setSelectedProductName("");
      setProductSearch("");
      setError(null);
    };
  }, [isOpen, supabase]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.channel_id || !formData.product_id || !formData.list_price) {
      setError("Canal de venta, Producto y Precio son campos obligatorios.");
      return;
    }

    setLoading(true);
    
    try {
      // Validar duplicado por producto y canal
      const { data: duplicateCheck, error: dupErr } = await supabase
        .from("price_lists")
        .select("id")
        .eq("channel_id", formData.channel_id)
        .eq("product_id", formData.product_id)
        .limit(1);

      if (dupErr) throw dupErr;

      if (duplicateCheck && duplicateCheck.length > 0) {
        setError("Ya existe una lista de precios para este producto en este canal.");
        setLoading(false);
        return;
      }

      const payload = {
        channel_id: formData.channel_id,
        product_id: formData.product_id,
        currency: formData.currency,
        list_price: Number(formData.list_price),
        valid_from: formData.valid_from || null,
        valid_to: formData.valid_to || null,
        is_active: formData.is_active
      };

      const { error: insertError } = await supabase
        .from("price_lists")
        .insert(payload);
        
      if (insertError) throw insertError;
      
      onSuccess(); 
    } catch (err: any) {
      console.error(err);
      setError("Ocurrió un error guardando el precio. Verifica la base de datos.");
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = products.filter(p => {
    const term = productSearch.toLowerCase();
    return p.sap_code.toLowerCase().includes(term) || p.description.toLowerCase().includes(term);
  }).slice(0, 50); // limit for perf

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
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Nueva Lista de Precio</h2>
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
          <form id="create-price-form" onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Canal de Venta <span className="text-red-500">*</span></label>
                <select 
                  value={formData.channel_id}
                  onChange={(e) => setFormData({...formData, channel_id: e.target.value})}
                  className="w-full border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all bg-white"
                  disabled={loadingInitial}
                  required
                >
                  <option value="">-- Seleccionar canal --</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>{ch.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-text-primary mb-1">Producto <span className="text-red-500">*</span></label>
                
                {selectedProductName ? (
                  <div className="flex items-center justify-between w-full border border-brand-primary/30 bg-brand-primary/5 rounded-xl px-3 py-2">
                    <span className="text-sm font-medium text-brand-primary truncate pr-4">
                      {selectedProductName}
                    </span>
                    <button 
                      type="button"
                      onClick={() => {
                        setSelectedProductName("");
                        setFormData({...formData, product_id: ""});
                        setProductSearch("");
                      }}
                      className="text-text-muted hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input 
                      type="text" 
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="w-full pl-9 pr-4 py-2 border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all"
                      placeholder="Buscar por código SAP o descripción..."
                    />
                    
                    {isDropdownOpen && productSearch.length > 0 && (
                      <div className="absolute z-10 mx-auto w-full mt-1 bg-white border border-border-subtle rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {filteredProducts.length === 0 ? (
                          <div className="p-3 text-sm text-text-muted text-center">No se encontraron productos</div>
                        ) : (
                          filteredProducts.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setFormData({...formData, product_id: p.id});
                                setSelectedProductName(`[${p.sap_code}] ${p.description}`);
                                setIsDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-border-subtle last:border-0"
                            >
                              <span className="font-semibold text-text-primary mr-2 block">{p.sap_code}</span>
                              <span className="text-text-muted truncate block">{p.description}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Moneda</label>
                  <select 
                    value={formData.currency}
                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                    className="w-full border border-border-subtle bg-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all"
                  >
                    <option value="COP">COP (Pesos)</option>
                    <option value="USD">USD (Dólares)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Precio Fijo <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    step="any"
                    value={formData.list_price}
                    onChange={(e) => setFormData({...formData, list_price: e.target.value})}
                    className="w-full border border-border-subtle rounded-xl px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Fecha Inicio</label>
                  <input 
                    type="date" 
                    value={formData.valid_from}
                    onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
                    className="w-full border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm text-text-muted transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Fecha Fin</label>
                  <input 
                    type="date" 
                    value={formData.valid_to}
                    onChange={(e) => setFormData({...formData, valid_to: e.target.value})}
                    className="w-full border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm text-text-muted transition-all"
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
                <span className="text-sm font-medium text-text-primary">Precio Activo (Vigente)</span>
              </label>

            </div>
          </form>
        </div>
        
        <div className="p-4 border-t border-border-subtle bg-slate-50/50 flex justify-end gap-3 text-sm mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border-subtle text-text-primary bg-white rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="create-price-form"
            disabled={loading}
            className="px-6 py-2 bg-brand-primary text-white font-medium rounded-xl hover:bg-brand-accent transition-colors disabled:opacity-50 inline-flex justify-center items-center"
          >
            {loading ? "Guardando..." : "Guardar Tarifa"}
          </button>
        </div>

      </div>
    </div>
  );
}
