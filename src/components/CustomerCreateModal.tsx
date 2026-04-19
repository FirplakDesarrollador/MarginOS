"use client";

import { useEffect, useState } from "react";
import { X, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type SalesChannel = {
  id: string;
  name: string;
};

type CustomerCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: any) => void;
};

export function CustomerCreateModal({ isOpen, onClose, onSuccess }: CustomerCreateModalProps) {
  const supabase = createClient();
  
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    nit: "",
    contact_name: "",
    email: "",
    default_channel_id: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function fetchChannels() {
      setLoadingChannels(true);
      const { data, error } = await supabase
        .from("sales_channels")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (!error && data && isMounted) {
        setChannels(data);
      }
      if (isMounted) setLoadingChannels(false);
    }
    
    fetchChannels();
    return () => { isMounted = false; };
  }, [isOpen, supabase]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!formData.name.trim()) {
      setError("El nombre de cliente es obligatorio.");
      return;
    }

    setLoading(true);
    
    try {
      const { data, error: insertError } = await supabase
        .from("customers")
        .insert({
          name: formData.name,
          nit: formData.nit || null,
          contact_name: formData.contact_name || null,
          email: formData.email || null,
          default_channel_id: formData.default_channel_id || null,
          notes: formData.notes || null
        })
        .select()
        .single();
        
      if (insertError) throw insertError;
      
      onSuccess(data); // Returns the created row
    } catch (err: any) {
      console.error(err);
      setError("Ocurrió un error creando el cliente. Verifique los datos o intente nuevamente.");
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
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Crear Cliente</h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="create-customer-form" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Nombre de Cliente <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all"
                  placeholder="Ej: Constructora ABC"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">NIT</label>
                <input 
                  type="text" 
                  value={formData.nit}
                  onChange={(e) => setFormData({...formData, nit: e.target.value})}
                  className="w-full border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all"
                  placeholder="Ej: 900.123.456-7"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Nombre de Contacto</label>
                  <input 
                    type="text" 
                    value={formData.contact_name}
                    onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                    className="w-full border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Canal de Venta</label>
                <select 
                  value={formData.default_channel_id}
                  onChange={(e) => setFormData({...formData, default_channel_id: e.target.value})}
                  className="w-full border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all bg-white"
                  disabled={loadingChannels}
                >
                  <option value="">-- Seleccionar canal --</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>{ch.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Notas</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={2}
                  className="w-full border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all resize-none"
                  placeholder="Información adicional del cliente..."
                />
              </div>
            </div>
          </form>
        </div>
        
        <div className="p-4 border-t border-border-subtle bg-slate-50/50 flex justify-end gap-3 text-sm">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border-subtle text-text-primary bg-white rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="create-customer-form"
            disabled={loading}
            className="px-6 py-2 bg-brand-primary text-white font-medium rounded-xl hover:bg-brand-accent transition-colors disabled:opacity-50 inline-flex justify-center items-center"
          >
            {loading ? "Creando..." : "Crear Cliente"}
          </button>
        </div>

      </div>
    </div>
  );
}
