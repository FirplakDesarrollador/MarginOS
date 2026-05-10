"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeDollarSign,
  Search,
  Package,
  AlertCircle,
  Save,
  Clock,
  CheckCircle2,
  Filter,
  XCircle,
  Ban,
  Undo2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { DBProduct } from "@/components/ProductPickerModal";

type SalesChannel = {
  id: string;
  name: string;
  default_currency: string;
};

type PricingRowState = {
  channel_id: string;
  channel_name: string;
  currency: string;
  target_margin_pct: number;
  max_discount_pct: number;
  net_price: number;
  list_price: number;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
  is_annual: boolean;
  applies: boolean;
  not_applicable_reason: string;
  existing_id?: string;
};

type ProductDashboardStatus = {
  product: DBProduct;
  status: "PENDIENTE" | "CONFIGURADO";
  hasNoAplica: boolean;
  pendingCount: number;
  configuredCount: number;
  noAplicaCount: number;
};

export default function PricingManagerPage() {
  const supabase = createClient();

  // Dashboard state
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [dashboardData, setDashboardData] = useState<ProductDashboardStatus[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  
  // Dashboard Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "PENDIENTES" | "CONFIGURADOS" | "NO_APLICA">("TODOS");

  // Workspace state
  const [selectedProduct, setSelectedProduct] = useState<DBProduct | null>(null);
  const [bomCost, setBomCost] = useState<number | null>(null);
  const [bomDate, setBomDate] = useState<string | null>(null);

  const [pricingState, setPricingState] = useState<Record<string, PricingRowState>>({});
  
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initial Data Fetch
  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchDashboardData() {
    setDashboardLoading(true);
    try {
      // Fetch Active Channels
      const { data: chData } = await supabase
        .from("sales_channels")
        .select("id, name, default_currency")
        .eq("is_active", true)
        .order("name", { ascending: true });
      
      const activeChannels = chData || [];
      setChannels(activeChannels);

      // Fetch Active Products
      const { data: pData } = await supabase
        .from("products")
        .select("id, sap_code, description, category, uom, target_margin_pct")
        .eq("is_active", true)
        .order("sap_code", { ascending: true });
      
      const activeProducts = (pData || []) as DBProduct[];
      setProducts(activeProducts);

      // Fetch all Price Lists
      const { data: plData } = await supabase
        .from("price_lists")
        .select("product_id, channel_id, applies, list_price");

      const priceLists = plData || [];

      // Calculate Statuses
      const newDashboardData: ProductDashboardStatus[] = activeProducts.map(prod => {
        let pendingCount = 0;
        let configuredCount = 0;
        let noAplicaCount = 0;

        activeChannels.forEach(ch => {
          const pl = priceLists.find(p => p.product_id === prod.id && p.channel_id === ch.id);
          if (!pl) {
            pendingCount++;
          } else if (pl.applies === false) {
            noAplicaCount++;
          } else {
            configuredCount++;
          }
        });

        return {
          product: prod,
          status: pendingCount > 0 ? "PENDIENTE" : "CONFIGURADO",
          hasNoAplica: noAplicaCount > 0,
          pendingCount,
          configuredCount,
          noAplicaCount
        };
      });

      setDashboardData(newDashboardData);

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setDashboardLoading(false);
    }
  }

  // Handle product selection for the workspace
  async function handleSelectProduct(product: DBProduct) {
    setSelectedProduct(product);
    setIsLoadingProduct(true);
    setSaveError(null);
    setSaveSuccess(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      // 1. Fetch latest BOM Cost
      const { data: bomData } = await supabase
        .from("bom_products")
        .select("recalculated_cost_mp, created_at")
        .eq("sap_code", product.sap_code)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const cost = bomData?.recalculated_cost_mp || null;
      setBomCost(cost);
      setBomDate(bomData?.created_at || null);

      // 2. Fetch existing price lists for this product
      const { data: existingPrices } = await supabase
        .from("price_lists")
        .select("id, channel_id, target_margin_pct, max_discount_pct, net_price, list_price, valid_from, valid_to, is_active, applies, not_applicable_reason")
        .eq("product_id", product.id);

      // 3. Initialize pricing state for all channels
      const newPricingState: Record<string, PricingRowState> = {};
      const currentYear = new Date().getFullYear();
      const defaultValidFrom = `${currentYear}-01-01`;
      const defaultValidTo = `${currentYear}-12-31`;

      channels.forEach(channel => {
        const existing = existingPrices?.find(p => p.channel_id === channel.id);
        
        let validFrom = defaultValidFrom;
        let validTo = defaultValidTo;
        let isAnnual = true;

        if (existing && existing.valid_from && existing.valid_to) {
           validFrom = existing.valid_from.split("T")[0];
           validTo = existing.valid_to.split("T")[0];
           isAnnual = validFrom === defaultValidFrom && validTo === defaultValidTo;
        }

        newPricingState[channel.id] = {
          channel_id: channel.id,
          channel_name: channel.name,
          currency: channel.default_currency || "COP",
          target_margin_pct: existing?.target_margin_pct ?? (product.target_margin_pct || 65),
          max_discount_pct: existing?.max_discount_pct ?? 0,
          net_price: existing?.net_price ?? 0,
          list_price: existing?.list_price ?? 0,
          valid_from: validFrom,
          valid_to: validTo,
          is_active: existing ? existing.is_active : true,
          is_annual: isAnnual,
          applies: existing?.applies ?? true,
          not_applicable_reason: existing?.not_applicable_reason ?? "",
          existing_id: existing?.id,
        };

        // Recalculate immediately if cost exists but prices don't and it applies
        if (cost && !existing) {
           const margin = newPricingState[channel.id].target_margin_pct;
           const discount = newPricingState[channel.id].max_discount_pct;
           if (margin > 0 && margin < 100) {
              const net = cost / (1 - margin / 100);
              newPricingState[channel.id].net_price = net;
              newPricingState[channel.id].list_price = discount < 100 ? net / (1 - discount / 100) : 0;
           }
        }
      });

      setPricingState(newPricingState);

    } catch (err) {
      console.error("Error fetching product details:", err);
    } finally {
      setIsLoadingProduct(false);
    }
  }

  // Handle inputs changes
  function updatePricingRow(channelId: string, field: keyof PricingRowState, value: any) {
    setPricingState(prev => {
      const row = { ...prev[channelId], [field]: value };

      // Handle 'No aplica' toggle specifically
      if (field === "applies" && !value) {
         // Reset calculated fields if setting to no aplica
         row.list_price = 0;
         row.net_price = 0;
         row.is_active = false;
      } else if (field === "applies" && value) {
         // Re-calculate if turning 'applies' back on
         if (bomCost) {
           const margin = row.target_margin_pct;
           const discount = row.max_discount_pct;
           if (margin >= 0 && margin < 100) {
              row.net_price = bomCost / (1 - margin / 100);
           } else {
              row.net_price = 0;
           }
           if (discount >= 0 && discount < 100) {
              row.list_price = row.net_price / (1 - discount / 100);
           } else {
              row.list_price = 0;
           }
         }
         row.not_applicable_reason = "";
      }

      // Handle annual validity toggle
      if (field === "is_annual" && value) {
         const currentYear = new Date().getFullYear();
         row.valid_from = `${currentYear}-01-01`;
         row.valid_to = `${currentYear}-12-31`;
      }

      // If dates are changed manually, uncheck "annual" if it doesn't match
      if (field === "valid_from" || field === "valid_to") {
        const currentYear = new Date().getFullYear();
        if (row.valid_from !== `${currentYear}-01-01` || row.valid_to !== `${currentYear}-12-31`) {
           row.is_annual = false;
        } else {
           row.is_annual = true;
        }
      }

      // Recalculate prices if margin or discount changes (and it applies)
      if ((field === "target_margin_pct" || field === "max_discount_pct") && row.applies) {
        if (bomCost) {
           const margin = row.target_margin_pct;
           const discount = row.max_discount_pct;
           if (margin >= 0 && margin < 100) {
              row.net_price = bomCost / (1 - margin / 100);
           } else {
              row.net_price = 0;
           }
           
           if (discount >= 0 && discount < 100) {
              row.list_price = row.net_price / (1 - discount / 100);
           } else {
              row.list_price = 0;
           }
        }
      }

      return { ...prev, [channelId]: row };
    });
  }

  // Save all configured prices
  async function handleSave() {
    if (!selectedProduct) return;
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);

    try {
      const upsertPayload = Object.values(pricingState).map(row => {
        if (!row.applies) {
           // Payload for NO APLICA
           return {
             ...(row.existing_id ? { id: row.existing_id } : {}),
             channel_id: row.channel_id,
             product_id: selectedProduct.id,
             currency: row.currency,
             list_price: 0,
             target_margin_pct: null,
             max_discount_pct: null,
             net_price: null,
             valid_from: row.valid_from || null,
             valid_to: row.valid_to || null,
             is_active: false,
             applies: false,
             not_applicable_reason: row.not_applicable_reason || null,
           };
        } else {
           // Payload for STANDARD PRICING
           return {
             ...(row.existing_id ? { id: row.existing_id } : {}),
             channel_id: row.channel_id,
             product_id: selectedProduct.id,
             currency: row.currency,
             list_price: row.list_price,
             target_margin_pct: row.target_margin_pct,
             max_discount_pct: row.max_discount_pct,
             net_price: row.net_price,
             valid_from: row.valid_from || null,
             valid_to: row.valid_to || null,
             is_active: row.is_active,
             applies: true,
             not_applicable_reason: null,
           };
        }
      });

      const { error } = await supabase
        .from("price_lists")
        .upsert(upsertPayload, { onConflict: "id" });

      if (error) throw error;
      
      // Refresh to grab new existing_ids and update dashboard status
      await fetchDashboardData();
      await handleSelectProduct(selectedProduct);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);

    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || "Error al guardar las listas de precios.");
    } finally {
      setIsSaving(false);
    }
  }

  // Formatting helpers
  const formatMoney = (value: number, currency: string) => {
    return new Intl.NumberFormat("en-US", { 
      minimumFractionDigits: currency === "USD" ? 2 : 0, 
      maximumFractionDigits: currency === "USD" ? 2 : 0 
    }).format(value || 0);
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return "—";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
  };

  // Filter Dashboard Data
  const filteredDashboard = dashboardData.filter(item => {
    // 1. Text Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.product.sap_code.toLowerCase().includes(q) && 
          !item.product.description.toLowerCase().includes(q)) {
        return false;
      }
    }
    
    // 2. Status Filter
    if (statusFilter === "PENDIENTES" && item.status !== "PENDIENTE") return false;
    if (statusFilter === "CONFIGURADOS" && item.status !== "CONFIGURADO") return false;
    if (statusFilter === "NO_APLICA" && !item.hasNoAplica) return false;

    return true;
  });

  return (
    <AppShell title="Pricing Manager">
      <div className="mx-auto w-full max-w-[1600px] selection:bg-brand-primary selection:text-white pb-32">
        
        {/* HEADER */}
        <div className="mt-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors mb-4">
              <ArrowLeft className="h-4 w-4" /> Volver al inicio
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary flex items-center gap-3">
              <BadgeDollarSign className="w-8 h-8 text-brand-primary" />
              Pricing Manager
            </h1>
            <p className="mt-2 text-text-muted leading-relaxed max-w-2xl">
              Define y calcula los precios de venta por canal utilizando el costo de materia prima (BOM), el margen objetivo y el descuento comercial máximo.
            </p>
          </div>
          {selectedProduct && (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => { setSelectedProduct(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 px-6 py-2.5 bg-surface-card border border-border-subtle text-text-primary text-sm font-medium rounded-xl hover:bg-surface-hover shadow-sm transition-colors"
              >
                Volver al panel
              </button>
            </div>
          )}
        </div>

        {/* WORKSPACE VIEW (If a product is selected) */}
        {selectedProduct ? (
           <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             {saveError && (
               <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                 {saveError}
               </div>
             )}
             {saveSuccess && (
               <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                 <CheckCircle2 className="w-5 h-5" /> Precios guardados exitosamente.
               </div>
             )}
             
             {isLoadingProduct ? (
                <div className="py-24 flex flex-col items-center justify-center border border-border-subtle rounded-2xl bg-surface-card shadow-sm">
                  <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm font-medium text-text-muted">Cargando producto y costos...</p>
                </div>
             ) : (
                <>
                  {/* PRODUCT HEADER CARD */}
                  <div className="bg-surface-card border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex gap-4 items-start">
                      <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-brand-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-surface-hover border border-border-subtle text-text-primary">
                            SAP: {selectedProduct.sap_code}
                          </span>
                          {selectedProduct.category && (
                            <span className="text-xs font-medium text-text-muted">
                              {selectedProduct.category}
                            </span>
                          )}
                          <span className="text-xs font-medium text-text-muted border-l border-border-subtle pl-3">
                            {selectedProduct.uom}
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-text-primary tracking-tight">
                          {selectedProduct.description}
                        </h2>
                      </div>
                    </div>

                    <div className="flex flex-col lg:items-end justify-center min-w-[200px] p-4 lg:p-0 bg-surface-hover/50 lg:bg-transparent rounded-xl border border-border-subtle lg:border-transparent">
                      <span className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Costo MP (BOM)</span>
                      {bomCost !== null ? (
                        <>
                           <span className="text-2xl font-bold text-text-primary">
                              ${formatMoney(bomCost, "COP")}
                           </span>
                           <span className="text-xs text-text-muted flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" /> Actualizado: {formatDate(bomDate)}
                           </span>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 mt-1">
                           <AlertCircle className="w-4 h-4" />
                           <span className="text-xs font-semibold">Costo BOM no disponible</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PRICING TABLE */}
                  <div className="bg-surface-card border border-border-subtle rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-border-subtle bg-surface-hover/50 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Tarifas por Canal de Venta</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-surface-hover/80 border-b border-border-subtle">
                          <tr>
                            <th className="px-6 py-4 text-left font-semibold text-text-primary">Canal de Venta</th>
                            <th className="px-4 py-4 text-center font-semibold text-text-primary">Moneda</th>
                            <th className="px-4 py-4 text-center font-semibold text-text-primary w-32">Margen Obj. %</th>
                            <th className="px-4 py-4 text-right font-semibold text-text-primary min-w-[140px]">Precio Neto</th>
                            <th className="px-4 py-4 text-center font-semibold text-text-primary w-32">Desc. Máx. %</th>
                            <th className="px-4 py-4 text-right font-semibold text-text-primary min-w-[140px]">Precio Lista</th>
                            <th className="px-4 py-4 text-left font-semibold text-text-primary min-w-[180px]">Vigencia</th>
                            <th className="px-4 py-4 text-center font-semibold text-text-primary">Activo</th>
                            <th className="px-6 py-4 text-center font-semibold text-text-primary w-28">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                          {Object.values(pricingState).map((row) => (
                            <tr key={row.channel_id} className={`hover:bg-surface-hover/30 transition-colors ${!row.applies ? "bg-slate-50/50 dark:bg-slate-900/20" : ""}`}>
                              <td className="px-6 py-4 align-middle">
                                <span className={`font-semibold block mb-0.5 ${!row.applies ? "text-text-muted" : "text-text-primary"}`}>{row.channel_name}</span>
                                <div className="flex gap-2 items-center mt-1">
                                  {row.existing_id && row.applies && (
                                     <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">Precio existente</span>
                                  )}
                                  {!row.applies && (
                                     <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                       <Ban className="w-2.5 h-2.5" /> No Aplica
                                     </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center align-middle">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-surface-hover border border-border-subtle ${!row.applies ? "text-text-muted opacity-50" : "text-text-primary"}`}>
                                  {row.currency}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center align-middle">
                                <input 
                                  type="number" 
                                  step="0.01"
                                  value={row.target_margin_pct || ""}
                                  onChange={e => updatePricingRow(row.channel_id, "target_margin_pct", Number(e.target.value))}
                                  disabled={!row.applies}
                                  className="w-full text-center px-3 py-1.5 border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all bg-surface-card disabled:opacity-50 disabled:bg-surface-hover"
                                />
                              </td>
                              <td className={`px-4 py-4 text-right align-middle font-medium ${!row.applies ? "text-text-muted opacity-50" : "text-text-primary"}`}>
                                {bomCost && row.applies ? `$${formatMoney(row.net_price, row.currency)}` : "—"}
                              </td>
                              <td className="px-4 py-4 text-center align-middle">
                                <input 
                                  type="number" 
                                  step="0.01"
                                  value={row.max_discount_pct || ""}
                                  onChange={e => updatePricingRow(row.channel_id, "max_discount_pct", Number(e.target.value))}
                                  disabled={!row.applies}
                                  className="w-full text-center px-3 py-1.5 border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all bg-surface-card disabled:opacity-50 disabled:bg-surface-hover"
                                />
                              </td>
                              <td className={`px-4 py-4 text-right align-middle font-bold ${!row.applies ? "text-text-muted opacity-50" : "text-text-primary"}`}>
                                 {bomCost && row.applies ? `$${formatMoney(row.list_price, row.currency)}` : "—"}
                              </td>
                              <td className="px-4 py-4 align-middle">
                                {!row.applies ? (
                                   <select
                                     value={row.not_applicable_reason || ""}
                                     onChange={(e) => updatePricingRow(row.channel_id, "not_applicable_reason", e.target.value)}
                                     className="w-full px-2 py-1.5 text-xs border border-border-subtle rounded-md bg-surface-card text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/30"
                                   >
                                     <option value="">Razón (Opcional)</option>
                                     <option value="Producto exclusivo de cliente">Producto exclusivo de cliente</option>
                                     <option value="No disponible para este canal">No disponible para este canal</option>
                                     <option value="Otro">Otro</option>
                                   </select>
                                ) : (
                                   <div className="flex flex-col gap-2">
                                     <div className="flex items-center gap-2">
                                       <label className="flex items-center gap-1.5 cursor-pointer">
                                         <input 
                                           type="checkbox" 
                                           checked={row.is_annual}
                                           onChange={e => updatePricingRow(row.channel_id, "is_annual", e.target.checked)}
                                           className="w-3.5 h-3.5 text-brand-primary rounded border-border-subtle focus:ring-brand-primary"
                                         />
                                         <span className="text-xs font-medium text-text-muted">Anual</span>
                                       </label>
                                     </div>
                                     <div className="flex items-center gap-2">
                                       <input 
                                         type="date"
                                         value={row.valid_from}
                                         onChange={e => updatePricingRow(row.channel_id, "valid_from", e.target.value)}
                                         className="w-full max-w-[120px] px-2 py-1 text-xs border border-border-subtle rounded-md focus:outline-none focus:ring-1 focus:ring-brand-primary/30"
                                       />
                                       <span className="text-text-muted text-xs">→</span>
                                       <input 
                                         type="date"
                                         value={row.valid_to}
                                         onChange={e => updatePricingRow(row.channel_id, "valid_to", e.target.value)}
                                         className="w-full max-w-[120px] px-2 py-1 text-xs border border-border-subtle rounded-md focus:outline-none focus:ring-1 focus:ring-brand-primary/30"
                                       />
                                     </div>
                                   </div>
                                )}
                              </td>
                              <td className="px-4 py-4 text-center align-middle">
                                {row.applies ? (
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      className="sr-only peer" 
                                      checked={row.is_active}
                                      onChange={e => updatePricingRow(row.channel_id, "is_active", e.target.checked)}
                                    />
                                    <div className="w-9 h-5 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border-subtle after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary shadow-inner"></div>
                                  </label>
                                ) : (
                                  <span className="text-text-muted opacity-50">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center align-middle">
                                {row.applies ? (
                                   <button 
                                     onClick={() => updatePricingRow(row.channel_id, "applies", false)}
                                     className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-card border border-border-subtle text-text-muted hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                                     title="Marcar como No Aplica"
                                   >
                                     <XCircle className="w-3.5 h-3.5" /> No aplica
                                   </button>
                                ) : (
                                   <button 
                                     onClick={() => updatePricingRow(row.channel_id, "applies", true)}
                                     className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-primary/10 border border-brand-primary/20 text-brand-primary hover:bg-brand-primary/20 transition-colors"
                                     title="Reactivar y Aplicar Precio"
                                   >
                                     <Undo2 className="w-3.5 h-3.5" /> Aplicar
                                   </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-6 py-4 border-t border-border-subtle bg-surface-hover/50 flex justify-end">
                       <button
                         onClick={handleSave}
                         disabled={isSaving || !bomCost}
                         className="inline-flex items-center justify-center gap-2 px-8 py-2.5 btn-primary text-sm font-medium rounded-xl hover:-translate-y-0.5 shadow-sm disabled:opacity-50 disabled:hover:translate-y-0"
                       >
                         {isSaving ? (
                           <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...
                           </>
                         ) : (
                           <>
                              <Save className="w-4 h-4" /> Guardar Precios
                           </>
                         )}
                       </button>
                    </div>
                  </div>
                </>
             )}
           </div>
        ) : (
          /* DASHBOARD VIEW */
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-surface-card border border-border-subtle rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4">
               {/* Search */}
               <div className="relative flex-1">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                 <input 
                    type="text" 
                    placeholder="Buscar producto por Código SAP o Descripción..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-surface-hover border border-border-subtle rounded-xl text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all"
                 />
               </div>
               
               {/* Filters */}
               <div className="flex items-center bg-surface-hover p-1 rounded-xl border border-border-subtle">
                 {(["TODOS", "PENDIENTES", "CONFIGURADOS", "NO_APLICA"] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        statusFilter === status 
                          ? "bg-surface-card text-brand-primary shadow-sm border border-border-subtle" 
                          : "text-text-muted hover:text-text-primary border border-transparent"
                      }`}
                    >
                      {status === "NO_APLICA" ? "No Aplica" : status.charAt(0) + status.slice(1).toLowerCase()}
                    </button>
                 ))}
               </div>
             </div>

             {dashboardLoading ? (
               <div className="mt-6 py-24 flex flex-col items-center justify-center border border-border-subtle rounded-2xl bg-surface-card shadow-sm">
                 <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
                 <p className="text-sm font-medium text-text-muted">Analizando cobertura de precios...</p>
               </div>
             ) : (
               <div className="mt-6 overflow-x-auto rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-surface-card shadow-sm">
                 <table className="w-full text-sm">
                   <thead className="bg-surface-hover/80 border-b border-border-subtle">
                     <tr>
                       <th className="px-6 py-4 text-left font-semibold text-text-primary">Código SAP</th>
                       <th className="px-6 py-4 text-left font-semibold text-text-primary">Descripción</th>
                       <th className="px-6 py-4 text-center font-semibold text-text-primary">Estado Pricing</th>
                       <th className="px-6 py-4 text-center font-semibold text-text-primary">Canales Pendientes</th>
                       <th className="px-6 py-4 text-center font-semibold text-text-primary">Canales Config.</th>
                       <th className="px-6 py-4 text-center font-semibold text-text-primary w-24">Acción</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-border-subtle">
                     {filteredDashboard.length === 0 ? (
                       <tr>
                         <td colSpan={6} className="py-12 text-center text-text-muted text-sm">
                            No se encontraron productos que coincidan con los filtros.
                         </td>
                       </tr>
                     ) : (
                       filteredDashboard.map((row) => (
                         <tr 
                           key={row.product.id} 
                           onClick={() => handleSelectProduct(row.product)}
                           className="hover:bg-surface-hover/50 transition-colors cursor-pointer group"
                         >
                           <td className="px-6 py-4 align-middle whitespace-nowrap">
                             <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-surface-hover text-text-primary tracking-tight">
                               {row.product.sap_code}
                             </span>
                           </td>
                           <td className="px-6 py-4 align-middle">
                             <div className="text-text-primary font-medium">
                               {row.product.description}
                             </div>
                           </td>
                           <td className="px-6 py-4 align-middle text-center">
                             <div className="flex items-center justify-center gap-1.5 flex-wrap">
                               {row.status === "CONFIGURADO" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" /> Configurado
                                  </span>
                               ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <AlertCircle className="w-3 h-3" /> Pendiente
                                  </span>
                               )}
                               {row.hasNoAplica && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                                    <Ban className="w-3 h-3" /> C/ Excepciones
                                  </span>
                               )}
                             </div>
                           </td>
                           <td className="px-6 py-4 align-middle text-center font-semibold text-amber-600">
                             {row.pendingCount > 0 ? row.pendingCount : "—"}
                           </td>
                           <td className="px-6 py-4 align-middle text-center text-text-muted">
                             {row.configuredCount + row.noAplicaCount} / {channels.length}
                           </td>
                           <td className="px-6 py-4 text-center align-middle">
                             <button 
                               onClick={(e) => { e.stopPropagation(); handleSelectProduct(row.product); }}
                               className="btn-table-action px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                                Preciar
                             </button>
                           </td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
