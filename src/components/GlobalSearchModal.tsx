"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, FileText, Users, Tag, Package, Box, ArrowRight, Loader2, Command } from "lucide-react";

export type SearchResult = {
  id: string;
  category: "Clientes" | "Simulaciones" | "Productos" | "Listas de precios" | "Costos / BOM";
  title: string;
  description: string;
  typeBadge?: string;
  url: string;
};

export function GlobalSearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    
    if (query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setSelectedIndex(0);

    const timer = setTimeout(async () => {
      const q = query.trim();
      const newResults: SearchResult[] = [];
      
      try {
        // Parallel queries
        const [
          { data: custs },
          { data: sims },
          { data: prods },
          { data: boms },
          { data: chans } // for price lists
        ] = await Promise.all([
          supabase.from("customers").select("id, name, nit").or(`name.ilike.%${q}%,nit.ilike.%${q}%`).limit(5),
          supabase.from("simulations").select("id, reference, project_name, status, created_at").or(`reference.ilike.%${q}%,project_name.ilike.%${q}%`).limit(5),
          supabase.from("products").select("id, sap_code, description").or(`sap_code.ilike.%${q}%,description.ilike.%${q}%`).limit(5),
          supabase.from("bom_products").select("id, sap_code, description, recalculated_cost_mp").or(`sap_code.ilike.%${q}%,description.ilike.%${q}%`).limit(5),
          supabase.from("sales_channels").select("id, name").ilike("name", `%${q}%`).limit(5)
        ]);

        if (custs) {
          custs.forEach(c => newResults.push({
            id: `cust-${c.id}`,
            category: "Clientes",
            title: c.name,
            description: `NIT: ${c.nit || "N/A"}`,
            url: `/customers`
          }));
        }

        if (sims) {
          sims.forEach(s => newResults.push({
            id: `sim-${s.id}`,
            category: "Simulaciones",
            title: s.reference || s.project_name || "Simulación sin nombre",
            description: `Proyecto: ${s.project_name || "N/A"} · ${new Date(s.created_at).toLocaleDateString()}`,
            typeBadge: s.status,
            url: `/simulator?id=${s.id}`
          }));
        }

        if (prods) {
          prods.forEach(p => newResults.push({
            id: `prod-${p.id}`,
            category: "Productos",
            title: p.sap_code,
            description: p.description || "Sin descripción",
            url: `/products?search=${encodeURIComponent(p.sap_code)}`
          }));
        }

        if (boms) {
          boms.forEach(b => newResults.push({
            id: `bom-${b.id}`,
            category: "Costos / BOM",
            title: b.sap_code,
            description: b.description || "Sin descripción",
            typeBadge: b.recalculated_cost_mp ? "Costo MP" : undefined,
            url: `/import` // or /admin/costs
          }));
        }

        // Price lists query
        const prodIds = prods?.map(p => p.id) || [];
        const chanIds = chans?.map(c => c.id) || [];
        
        let plOrFilter = `currency.ilike.%${q}%`;
        if (prodIds.length > 0) plOrFilter += `,product_id.in.(${prodIds.map(id => `"${id}"`).join(",")})`;
        if (chanIds.length > 0) plOrFilter += `,channel_id.in.(${chanIds.map(id => `"${id}"`).join(",")})`;

        const { data: priceLists } = await supabase
          .from("price_lists")
          .select(`
            id, currency, channel_id, product_id,
            product:products(sap_code, description),
            channel:sales_channels(name)
          `)
          .or(plOrFilter)
          .limit(5);

        if (priceLists) {
          priceLists.forEach((pl: any) => {
            const prodCode = pl.product?.sap_code || "Producto desconocido";
            const chanName = pl.channel?.name || "Canal desconocido";
            newResults.push({
              id: `pl-${pl.id}`,
              category: "Listas de precios",
              title: `${chanName} · ${pl.currency || "N/A"}`,
              description: `Producto: ${prodCode} - ${pl.product?.description || ""}`,
              url: `/price-lists?channel=${pl.channel_id}`
            });
          });
        }

        setResults(newResults);
      } catch (err) {
        console.error("Search error", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen, supabase]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter" && results.length > 0 && selectedIndex >= 0) {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          router.push(selected.url);
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, router, onClose]);

  // Group results
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach(r => {
      if (!groups[r.category]) groups[r.category] = [];
      groups[r.category].push(r);
    });
    return groups;
  }, [results]);

  const getIcon = (category: string) => {
    switch (category) {
      case "Clientes": return <Users className="w-4 h-4 text-blue-500" />;
      case "Simulaciones": return <FileText className="w-4 h-4 text-emerald-500" />;
      case "Productos": return <Package className="w-4 h-4 text-amber-500" />;
      case "Listas de precios": return <Tag className="w-4 h-4 text-purple-500" />;
      case "Costos / BOM": return <Box className="w-4 h-4 text-slate-500" />;
      default: return <Search className="w-4 h-4 text-text-muted" />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[100] bg-[rgba(10,13,20,0.4)] backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-0 top-[10%] md:top-[15%] mx-auto z-[101] w-[90%] max-w-2xl modal-panel rounded-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Search Input */}
        <div className="relative flex items-center px-4 border-b border-border-subtle shrink-0">
          <Search className="w-5 h-5 text-text-muted shrink-0" strokeWidth={2} />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-none py-4 px-3 text-[15px] font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-0"
            placeholder="Buscar simulación, cliente, SAP..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isLoading && <Loader2 className="w-5 h-5 text-brand-primary animate-spin shrink-0" />}
          <div className="hidden sm:flex items-center gap-1 shrink-0 ml-3">
            <span className="text-[10px] font-mono font-bold text-text-muted bg-surface-hover px-1.5 py-0.5 rounded border border-border-subtle">ESC</span>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
          {query.trim().length < 2 ? (
            <div className="px-4 py-12 flex flex-col items-center justify-center text-center">
              <Command className="w-8 h-8 text-text-muted/50 mb-3" />
              <p className="text-sm font-medium text-text-primary mb-1">Búsqueda Global</p>
              <p className="text-xs text-text-muted">Escribe al menos 2 caracteres para buscar en toda la plataforma.</p>
            </div>
          ) : results.length === 0 && !isLoading ? (
            <div className="px-4 py-10 text-center text-text-muted text-sm font-medium">
              No se encontraron resultados para "{query}"
            </div>
          ) : (
            <div className="space-y-4 pb-2">
              {Object.entries(groupedResults).map(([category, items]) => (
                <div key={category}>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    {category}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const index = results.findIndex(r => r.id === item.id);
                      const isSelected = index === selectedIndex;
                      
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${isSelected ? "bg-brand-primary/10 border-brand-primary/20" : "hover:bg-surface-hover"} border border-transparent`}
                          onClick={() => {
                            router.push(item.url);
                            onClose();
                          }}
                          onMouseEnter={() => setSelectedIndex(index)}
                        >
                          <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center shrink-0 border border-border-subtle">
                            {getIcon(item.category)}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[13px] font-semibold truncate ${isSelected ? "text-brand-primary" : "text-text-primary"}`}>
                                {item.title}
                              </span>
                              {item.typeBadge && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-surface-background rounded-md text-text-muted border border-border-subtle shrink-0">
                                  {item.typeBadge}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-text-muted truncate mt-0.5">
                              {item.description}
                            </span>
                          </div>
                          {isSelected && (
                            <ArrowRight className="w-4 h-4 text-brand-primary shrink-0 opacity-50" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-surface-hover/50 border-t border-border-subtle px-4 py-2 flex items-center justify-between shrink-0">
          <div className="text-[10px] font-medium text-text-muted">
            {results.length} resultado{results.length !== 1 && 's'}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-text-muted">
            <span className="flex items-center gap-1"><span className="font-mono bg-surface-card border border-border-subtle px-1 rounded shadow-sm leading-tight text-text-primary">↑↓</span> navegar</span>
            <span className="flex items-center gap-1"><span className="font-mono bg-surface-card border border-border-subtle px-1 rounded shadow-sm leading-tight text-text-primary">↵</span> seleccionar</span>
          </div>
        </div>
      </div>
    </>
  );
}
