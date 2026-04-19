import { useState } from "react";
import { UploadCloud, X, CheckCircle, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function CostUploadModal({ isOpen, onClose, onSuccess }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ errors: string[]; successCount: number } | null>(null);

  if (!isOpen) return null;

  function closeModal() {
    if (!isProcessing) {
      setResult(null);
      onClose();
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setResult(null);
    const supabase = createClient();

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws) as any[];

      let successCount = 0;
      const errors: string[] = [];

      // Validar y normalizar carga masiva (Bulk Upsert behavior via batch loop since we might have duplicates)
      // For thousands of rows, upsert is ideal natively in PostgREST, but for simple loop let's chunk
      
      const payload: any[] = [];
      
      rows.forEach((row, index) => {
        const codigo = row.codigo?.toString().trim().toUpperCase();
        if (!codigo) {
           errors.push(`Fila ${index + 2}: Sin código`);
           return;
        }

        let costo = parseFloat(row.costo_unitario);
        if (isNaN(costo) || costo < 0) {
           errors.push(`Fila ${index + 2}: Costo inválido para ${codigo}`);
           return;
        }
        
        let moneda = row.moneda?.toString().trim().toUpperCase() || "COP";
        if (moneda !== "COP" && moneda !== "USD") {
           moneda = "COP";
        }

        payload.push({
           codigo,
           description: row.description?.toString().trim() || null,
           costo_unitario: costo,
           moneda
        });
      });

      // Execute upsert logic
      if (payload.length > 0) {
         const { error: upsertErr } = await supabase
           .from("component_costs")
           .upsert(payload, { onConflict: "codigo" });

         if (upsertErr) {
            throw upsertErr;
         }
         successCount = payload.length;
      } else if (errors.length === 0) {
         errors.push("No se encontró data válida en el archivo.");
      }

      setResult({ errors, successCount });
      if (successCount > 0) {
         onSuccess();
      }

    } catch (err: any) {
      console.error(err);
      setResult({
        successCount: 0,
        errors: [err.message || "Error procesando el archivo"],
      });
    } finally {
      setIsProcessing(false);
      // Reset input element
      e.target.value = "";
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={closeModal}
      />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-border-subtle flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-slate-50/50">
          <h2 className="text-lg font-semibold text-text-primary">
            Cargar Costos de Componentes
          </h2>
          <button
            onClick={closeModal}
            disabled={isProcessing}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-slate-200/50 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!result && !isProcessing && (
             <div className="flex flex-col items-center justify-center border-2 border-dashed border-border-subtle rounded-2xl p-8 bg-slate-50/50 hover:bg-slate-50 transition-colors">
               <div className="w-12 h-12 bg-white border border-border-subtle rounded-xl flex items-center justify-center mb-4 shadow-sm">
                 <UploadCloud className="w-6 h-6 text-brand-primary" />
               </div>
               
               <h3 className="text-sm font-semibold text-text-primary mb-1 text-center">
                 Selecciona un archivo Excel
               </h3>
               <p className="text-xs text-text-muted text-center mb-6 max-w-[250px]">
                 Formato esperado con columnas: codigo, costo_unitario, moneda, description
               </p>

               <label className="inline-flex cursor-pointer items-center justify-center px-6 py-2.5 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-brand-accent transition-all shadow-sm shadow-brand-primary/20 hover:-translate-y-0.5">
                 Explorar Archivo
                 <input
                   type="file"
                   accept=".xlsx,.xls"
                   onChange={handleFileUpload}
                   className="hidden"
                 />
               </label>
             </div>
          )}

          {isProcessing && (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-text-primary">Validando y guardando datos...</p>
              <p className="text-xs text-text-muted mt-1">Esto puede tardar unos segundos</p>
            </div>
          )}

          {result && !isProcessing && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-emerald-800">Carga Aprobada</h4>
                  <p className="text-sm text-emerald-700 mt-0.5">
                    Se procesaron o actualizaron correctamente <strong>{result.successCount}</strong> registros.
                  </p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="w-full">
                    <h4 className="text-sm font-semibold text-amber-800">Alertas durante la carga</h4>
                    <ul className="mt-2 space-y-1 text-xs text-amber-700 max-h-32 overflow-y-auto w-full pr-2">
                      {result.errors.map((e, idx) => (
                        <li key={idx} className="flex gap-1.5"><span className="opacity-50">•</span> {e}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {result && !isProcessing && (
           <div className="px-6 py-4 flex justify-end gap-3 border-t border-border-subtle bg-slate-50/50">
             <button
               onClick={closeModal}
               className="px-5 py-2.5 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-brand-accent transition-all shadow-sm"
             >
               Finalizar
             </button>
           </div>
        )}

      </div>
    </div>
  );
}
