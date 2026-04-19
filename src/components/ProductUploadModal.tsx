"use client";

import { useState, useRef } from "react";
import { X, UploadCloud, FileSpreadsheet, AlertCircle, Save } from "lucide-react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

type ProductUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type UploadedProductRow = {
  internal_id: number;
  sap_code: string;
  description: string;
  category: string;
  uom: string;
  is_active: boolean;
  
  isValid: boolean;
  error_reason?: string;
};

export function ProductUploadModal({ isOpen, onClose, onSuccess }: ProductUploadModalProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<UploadedProductRow[]>([]);
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
      const workbook = XLSX.read(buffer, { type: "array" });
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

  async function processAndValidateData(rawData: any[]) {
    // 1. Parsing superficial
    let mapped: UploadedProductRow[] = rawData.map((r, i) => {
      const sap_code = normalizeText(r.sap_code || r.SAP || r.Codigo);
      const description = normalizeText(r.description || r.Descripcion || r.Desc);
      const category = normalizeText(r.category || r.Categoria);
      const uom = normalizeText(r.uom || r.Unidad || r.medida);
      
      let is_active = true;
      if (r.is_active !== undefined || r.Activo !== undefined) {
        const truthyStr = String(r.is_active ?? r.Activo).toLowerCase().trim();
        is_active = truthyStr === 'true' || truthyStr === '1' || truthyStr === 'si' || truthyStr === 'sí';
      }

      let isValid = true;
      let error_reason = "";

      if (!sap_code) { isValid = false; error_reason += "Código SAP vacío. "; }
      if (!description) { isValid = false; error_reason += "Descripción vacía. "; }

      return {
        internal_id: i,
        sap_code,
        description,
        category,
        uom,
        is_active,
        isValid,
        error_reason: error_reason.trim()
      };
    });

    if (mapped.length === 0) {
      setUploadError("El archivo parece estar vacío o le faltan las cabeceras obligatorias requeridas (sap_code, description).");
      return;
    }

    // 2. Control Duplicidad In-File
    const sapMap = new Map<string, number>();
    for (const row of mapped) {
      if (!row.isValid) continue;
      const signature = row.sap_code.toLowerCase();
      
      if (sapMap.has(signature)) {
        row.isValid = false;
        row.error_reason += " Código SAP duplicado en el archivo excel.";
      } else {
        sapMap.set(signature, row.internal_id);
      }
    }

    // 3. Extracción de códigos para validación con BD Mestra
    const validSapCodes = Array.from(new Set(mapped.filter(r => r.isValid).map(r => r.sap_code)));
    
    if (validSapCodes.length > 0) {
       const { data: existingDbProducts } = await supabase
         .from("products")
         .select("sap_code")
         .in("sap_code", validSapCodes);

       if (existingDbProducts && existingDbProducts.length > 0) {
         const existingSet = new Set(existingDbProducts.map(d => d.sap_code.toLowerCase()));
         for (const row of mapped) {
           if (!row.isValid) continue;
           if (existingSet.has(row.sap_code.toLowerCase())) {
             row.isValid = false;
             row.error_reason += (row.error_reason ? " " : "") + "Código SAP ya existe registrado en la Base de Datos.";
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
        sap_code: r.sap_code,
        description: r.description,
        category: r.category || null,
        uom: r.uom || null,
        is_active: r.is_active
      }));

      const { error } = await supabase.from("products").insert(payload);
      if (error) throw error;
      
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setUploadError("Error durante la transacción hacia la tabla maestra.");
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
              <h2 className="text-lg font-semibold text-text-primary">Carga Masiva de Productos Master</h2>
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
                  <h3 className="text-base font-medium text-text-primary mb-2">Sube tu Matriz de Catálogo Maestros</h3>
                  <p className="text-sm text-text-muted mb-6">Únicamente archivos .xlsx generados basados en el formato de plantilla.</p>
                  
                  <input
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="product-upload"
                    ref={fileInputRef}
                  />
                  <label
                    htmlFor="product-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-6 py-2.5 border border-border-subtle bg-white text-text-primary text-sm font-medium rounded-xl hover:text-brand-primary hover:border-brand-primary/30 transition-all shadow-sm"
                  >
                     Seleccionar Documento
                  </label>
              </div>
           )}

           {analyzing && (
              <div className="py-12 flex flex-col items-center justify-center rounded-2xl bg-slate-50/50 border border-border-subtle">
                <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium text-text-primary">Analizando códigos SAP e integridad...</p>
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
                    <div className="text-xs font-semibold text-text-muted tracking-wide uppercase mb-1">Items Extraídos</div>
                    <div className="text-2xl font-bold text-slate-700">{rows.length}</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm text-center">
                    <div className="text-xs font-semibold text-emerald-600/80 tracking-wide uppercase mb-1">Sanos / Autorizados a BD</div>
                    <div className="text-2xl font-bold text-emerald-700">{validCount}</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm text-center">
                    <div className="text-xs font-semibold text-red-600/80 tracking-wide uppercase mb-1">Rechazados por Integridad</div>
                    <div className="text-2xl font-bold text-red-700">{invalidRows.length}</div>
                  </div>
                </div>

                {invalidRows.length > 0 && (
                  <div className="rounded-xl border border-border-subtle bg-white shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-border-subtle bg-slate-50">
                       <h3 className="text-sm font-semibold text-text-primary">Auditoría: Motivos de Rechazo ({invalidRows.length})</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="min-w-full text-xs">
                         <thead className="bg-white sticky top-0 border-b border-border-subtle z-10 shadow-sm">
                           <tr>
                             <th className="px-4 py-2 font-semibold text-left text-text-primary bg-white">Código SAP</th>
                             <th className="px-4 py-2 font-semibold text-left text-text-primary bg-white">Descripción Ingestada</th>
                             <th className="px-4 py-2 font-semibold text-left text-text-primary bg-white">Anomalía Reportada</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-border-subtle">
                           {invalidRows.map((r) => (
                             <tr key={`error-${r.internal_id}`} className="hover:bg-red-50/50">
                               <td className="px-4 py-2 text-text-muted font-mono">{r.sap_code || "N/A"}</td>
                               <td className="px-4 py-2 text-text-muted max-w-[200px] truncate">{r.description || "N/A"}</td>
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
                Cargar otro formato
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
                  Escribiendo en Servidor...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Ingestar a BD ({validCount})
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
