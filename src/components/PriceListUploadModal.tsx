"use client";

import { useState, useRef } from "react";
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Save } from "lucide-react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

type PriceListUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type UploadedRow = {
  internal_id: number;
  channel_name: string;
  sap_code: string;
  currency: string;
  list_price: number;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  
  // Validation flags & Resolved DB IDs
  isValid: boolean;
  resolved_channel_id?: string;
  resolved_product_id?: string;
  error_reason?: string;
};

export function PriceListUploadModal({ isOpen, onClose, onSuccess }: PriceListUploadModalProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<UploadedRow[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadError(null);
    setFileName(file.name);
    setAnalyzing(true);
    setRows([]);
    
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      await processAndValidateData(jsonData);

    } catch (err: any) {
      console.error(err);
      setUploadError("El archivo está corrupto o no tiene un formato válido XLSX/CSV.");
    } finally {
      setAnalyzing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function normalizeText(v: any) {
    return String(v || "").trim();
  }

  function parseDateSafe(v: any): string | null {
    if (!v) return null;
    if (v instanceof Date) {
      if (isNaN(v.getTime())) return null;
      return v.toISOString().split("T")[0]; // YYYY-MM-DD
    }
    const str = normalizeText(v);
    if (!str) return null;
    // Assuming YYYY-MM-DD format as preferred
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
    return null;
  }

  async function processAndValidateData(rawData: any[]) {
    // 1. First pass: Structure normalisation & basic presence validation
    let mapped: UploadedRow[] = rawData.map((r, i) => {
      const channel_name = normalizeText(r.channel_name || r.Canal || r.canal);
      const sap_code = normalizeText(r.sap_code || r.SAP || r.sap);
      let currency = normalizeText(r.currency || r.moneda || r.Moneda).toUpperCase();
      let list_price = Number(r.list_price || r.precio || r.Precio || 0);
      const valid_from = parseDateSafe(r.valid_from || r.inicio || r.Inicio);
      const valid_to = parseDateSafe(r.valid_to || r.fin || r.Fin);
      
      let is_active = true;
      if (r.is_active !== undefined) {
        const truthyStr = String(r.is_active).toLowerCase().trim();
        is_active = truthyStr === 'true' || truthyStr === '1' || truthyStr === 'si' || truthyStr === 'sí';
      }

      if (!currency) currency = "COP";

      let isValid = true;
      let error_reason = "";

      if (!channel_name) { isValid = false; error_reason += "Canal vacío. "; }
      if (!sap_code) { isValid = false; error_reason += "SAP vacío. "; }
      if (list_price <= 0 || isNaN(list_price)) { isValid = false; error_reason += "Precio inválido. "; }
      if (currency !== "COP" && currency !== "USD") { isValid = false; error_reason += "Moneda inválida (Use COP/USD). "; }

      return {
        internal_id: i,
        channel_name,
        sap_code,
        currency,
        list_price,
        valid_from,
        valid_to,
        is_active,
        isValid,
        error_reason: error_reason.trim()
      };
    });

    if (mapped.length === 0) {
      setUploadError("El archivo parece estar vacío o le faltan las cabeceras obligatorias requeridas.");
      return;
    }

    // 2. In-file Duplication detection
    const sigMap = new Map<string, number>();
    for (const row of mapped) {
      if (!row.isValid) continue;
      // REGRA DE NEGOCIO: Un producto NO debe tener más de una lista de precios en el mismo canal (ignorar fechas/moneda)
      const signature = `${row.channel_name}-${row.sap_code}`.toLowerCase();
      
      if (sigMap.has(signature)) {
        row.isValid = false;
        row.error_reason += " Producto duplicado para el mismo canal en el archivo.";
      } else {
        sigMap.set(signature, row.internal_id);
      }
    }

    // Extract unique lookup keys
    const uniqueChannels = Array.from(new Set(mapped.filter(r => r.channel_name).map(r => r.channel_name)));
    const uniqueSapCodes = Array.from(new Set(mapped.filter(r => r.sap_code).map(r => r.sap_code)));

    // 3. Resolve DB Lookups
    const [channelRes, productRes] = await Promise.all([
      supabase.from("sales_channels").select("id, name").in("name", uniqueChannels),
      supabase.from("products").select("id, sap_code").in("sap_code", uniqueSapCodes)
    ]);

    const channelDict = new Map<string, string>();
    if (channelRes.data) {
      for (const ch of channelRes.data) {
        channelDict.set(ch.name.toLowerCase(), ch.id);
      }
    }

    const productDict = new Map<string, string>();
    if (productRes.data) {
      for (const p of productRes.data) {
        productDict.set(p.sap_code.toLowerCase(), p.id);
      }
    }

    // Map resolutions & Mark missing FK
    const validRowsForDbCheck: UploadedRow[] = [];

    for (const row of mapped) {
      if (!row.isValid) continue;
      
      const cid = channelDict.get(row.channel_name.toLowerCase());
      const pid = productDict.get(row.sap_code.toLowerCase());

      if (!cid) {
        row.isValid = false;
        row.error_reason += (row.error_reason ? " " : "") + "Canal no existe en Base de Datos.";
      } else {
        row.resolved_channel_id = cid;
      }

      if (!pid) {
        row.isValid = false;
        row.error_reason += (row.error_reason ? " " : "") + "Producto (SAP) no existe en Base de Datos.";
      } else {
        row.resolved_product_id = pid;
      }

      if (row.isValid) {
        validRowsForDbCheck.push(row);
      }
    }

    // 4. DB Duplication Validation 
    // We fetch existing price lists for the combinations we care about
    if (validRowsForDbCheck.length > 0) {
      const pIds = Array.from(new Set(validRowsForDbCheck.map(r => r.resolved_product_id)));
      
      const { data: existingPrices } = await supabase
        .from("price_lists")
        .select("id, channel_id, product_id")
        .in("product_id", pIds);

      if (existingPrices && existingPrices.length > 0) {
        const existingSigMap = new Set<string>();
        for (const ep of existingPrices) {
          const sig = `${ep.channel_id}-${ep.product_id}`;
          existingSigMap.add(sig);
        }

        for (const row of mapped) {
          if (!row.isValid) continue;
          const sig = `${row.resolved_channel_id}-${row.resolved_product_id}`;
          if (existingSigMap.has(sig)) {
             row.isValid = false;
             row.error_reason += (row.error_reason ? " " : "") + "Producto duplicado para el mismo canal en Base de Datos.";
          }
        }
      }
    }

    setRows(mapped);
  }

  async function handleFinalSave() {
    const validLinesToUpload = rows.filter(r => r.isValid);
    if (validLinesToUpload.length === 0) return;

    setLoading(true);

    try {
      const payload = validLinesToUpload.map(r => ({
        channel_id: r.resolved_channel_id,
        product_id: r.resolved_product_id,
        currency: r.currency,
        list_price: r.list_price,
        valid_from: r.valid_from,
        valid_to: r.valid_to,
        is_active: r.is_active
      }));

      const { error } = await supabase.from("price_lists").insert(payload);
      if (error) throw error;
      
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setUploadError("Error durante la transacción de guardado.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setRows([]);
    setFileName(null);
    setUploadError(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const validCount = rows.filter(r => r.isValid).length;
  const invalidRows = rows.filter(r => !r.isValid);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-border-subtle flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">Carga Masiva de Listas</h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
           
           {!fileName && (
              <div className="border-2 border-dashed border-border-subtle rounded-3xl p-12 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="w-16 h-16 bg-white border border-border-subtle rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <FileSpreadsheet className="w-8 h-8 text-brand-primary" />
                  </div>
                  <h3 className="text-base font-medium text-text-primary mb-2">Selecciona o arrastra el archivo de carga</h3>
                  <p className="text-sm text-text-muted mb-6">Únicamente archivos .xlsx o .csv generados basados en el formato de plantilla.</p>
                  
                  <input
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="excel-upload"
                    ref={fileInputRef}
                  />
                  <label
                    htmlFor="excel-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-6 py-2.5 border border-border-subtle bg-white text-text-primary text-sm font-medium rounded-xl hover:text-brand-primary hover:border-brand-primary/30 transition-all shadow-sm"
                  >
                     Buscar Documento
                  </label>
              </div>
           )}

           {analyzing && (
              <div className="py-12 flex flex-col items-center justify-center rounded-2xl bg-slate-50/50 border border-border-subtle">
                <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium text-text-primary">Parseando matrices y resolviendo cruces...</p>
              </div>
           )}

           {uploadError && (
             <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-medium flex items-center gap-3">
               <AlertCircle className="w-5 h-5" />
               {uploadError}
             </div>
           )}

           {!analyzing && fileName && rows.length > 0 && (
             <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 border border-border-subtle rounded-xl p-4 shadow-sm text-center">
                    <div className="text-xs font-semibold text-text-muted tracking-wide uppercase mb-1">Total Analizado</div>
                    <div className="text-2xl font-bold text-slate-700">{rows.length}</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm text-center">
                    <div className="text-xs font-semibold text-emerald-600/80 tracking-wide uppercase mb-1">Filas Válidas Aceptadas</div>
                    <div className="text-2xl font-bold text-emerald-700">{validCount}</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm text-center">
                    <div className="text-xs font-semibold text-red-600/80 tracking-wide uppercase mb-1">Filas Descartadas (Duplicados/Inválidas)</div>
                    <div className="text-2xl font-bold text-red-700">{invalidRows.length}</div>
                  </div>
                </div>

                {invalidRows.length > 0 && (
                  <div className="rounded-xl border border-border-subtle bg-white shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-border-subtle bg-slate-50">
                       <h3 className="text-sm font-semibold text-text-primary">Registro de Auditoría: Descartes ({invalidRows.length})</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="min-w-full text-xs">
                         <thead className="bg-white sticky top-0 border-b border-border-subtle z-10 shadow-sm">
                           <tr>
                             <th className="px-4 py-2 font-semibold text-left text-text-primary bg-white">Canal / Producto</th>
                             <th className="px-4 py-2 font-semibold text-left text-text-primary bg-white">Importe</th>
                             <th className="px-4 py-2 font-semibold text-left text-text-primary bg-white">Vigencia</th>
                             <th className="px-4 py-2 font-semibold text-left text-text-primary bg-white">Anomalía Detectada</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-border-subtle">
                           {invalidRows.map((r) => (
                             <tr key={`error-${r.internal_id}`} className="hover:bg-red-50/50">
                               <td className="px-4 py-2 text-text-muted">
                                 <span className="font-medium text-slate-700">{r.channel_name || "N/A"}</span><br/>
                                 <span className="text-[10px]">{r.sap_code || "N/A"}</span>
                               </td>
                               <td className="px-4 py-2 text-text-muted">{r.list_price} {r.currency}</td>
                               <td className="px-4 py-2 text-text-muted">
                                 {r.valid_from ? `${r.valid_from}` : "Ilimitado"}
                               </td>
                               <td className="px-4 py-2 align-middle">
                                 <div className="text-red-700 font-medium tracking-tight">
                                   {r.error_reason}
                                 </div>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                      </table>
                    </div>
                  </div>
                )}
             </div>
           )}

        </div>
        
        <div className="p-4 border-t border-border-subtle bg-slate-50/50 flex justify-between gap-3 mt-auto">
          {(!analyzing && fileName) ? (
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="px-4 py-2 border border-border-subtle text-text-primary text-sm font-medium bg-white rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
              >
                Volver a subir
              </button>
          ) : <div/>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-text-muted text-sm font-medium bg-transparent rounded-xl hover:text-text-primary transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleFinalSave}
              disabled={loading || validCount === 0}
              className="px-6 py-2 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-brand-accent transition-colors disabled:opacity-50 inline-flex justify-center items-center gap-2 shadow-sm shadow-brand-primary/20"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  Volcando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Ejecutar Ingesta Masiva ({validCount})
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
