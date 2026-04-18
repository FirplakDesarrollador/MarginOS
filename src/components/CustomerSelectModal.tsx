"use client";

import { useEffect, useState } from "react";
import { X, Search, ChevronRight, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type Customer = {
  id: string;
  name: string;
  nit: string | null;
  contact_name: string | null;
  email: string | null;
  default_channel_id: string | null;
};

export type SalesChannel = {
  id: string;
  name: string;
};

type CustomerSelectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customer: Customer) => void;
};

export function CustomerSelectModal({ isOpen, onClose, onSelect }: CustomerSelectModalProps) {
  const supabase = createClient();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function fetchData() {
      setLoading(true);
      
      const { data: cData } = await supabase
        .from("sales_channels")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (cData && isMounted) setChannels(cData);

      const { data: custData } = await supabase
        .from("customers")
        .select("id, name, nit, contact_name, email, default_channel_id")
        .order("name", { ascending: true });

      if (custData && isMounted) setCustomers(custData);
      if (isMounted) setLoading(false);
    }
    
    fetchData();
    return () => { isMounted = false; };
  }, [isOpen, supabase]);

  if (!isOpen) return null;

  const filteredCustomers = customers.filter(c => {
    const term = searchQuery.toLowerCase();
    const matchName = c.name.toLowerCase().includes(term);
    const matchNit = c.nit ? c.nit.toLowerCase().includes(term) : false;
    const matchChannel = channelFilter ? c.default_channel_id === channelFilter : true;
    
    return (matchName || matchNit) && matchChannel;
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-xl border border-border-subtle flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Buscar Cliente</h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-border-subtle bg-white flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              type="text" 
              placeholder="Buscar por Nombre o NIT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
            />
          </div>
          <select 
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="border border-border-subtle rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all bg-white sm:w-48"
          >
            <option value="">Todos los canales</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>{ch.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-text-muted">
              <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium">Cargando clientes...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="py-12 text-center text-text-muted">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-text-primary">No se encontraron clientes</p>
              <p className="text-sm mt-1">Intenta con otros términos o crea uno nuevo.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-border-subtle bg-white hover:border-brand-primary/40 hover:shadow-sm transition-all text-left group"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-text-primary group-hover:text-brand-primary transition-colors">
                      {c.name}
                    </span>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
                      {c.nit && <span>NIT: {c.nit}</span>}
                      {c.email && c.nit && <span className="text-slate-300">|</span>}
                      {c.email && <span>{c.email}</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-primary transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
