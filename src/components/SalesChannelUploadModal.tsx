import { useState, useRef, useEffect } from "react";
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, ChevronRight, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

type ValidationResult = {
  isValid: boolean;
  reason?: string;
  parsedName?: string;
  parsedCurrency?: string;
  parsedMinMargin?: number | null;
  parsedIsActive?: boolean;
};

type RowState = {
  rawRow: any;
  rowIndex: number;
  validation: ValidationResult;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function SalesChannelUploadModal({ isOpen, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [rows, setRows] = useState<RowState[]>([]);
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // On open, load all existing channels to check duplicates efficiently
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setRows([]);
      fetchExistingChannels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function fetchExistingChannels() {
    try {
      const { data, error } = await supabase.from("sales_channels").select("name");
      if (error) throw error;
      const names = new Set<string>();
      data?.forEach(d => names.add(d.name.toLowerCase().trim()));
      setExistingNames(names);
    } catch (err) {
      console.error("Error pre-loading existing channels:", err);
    }
  }

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      processFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/)) {
      alert("Por favor sube un archivo Excel (.xlsx, .xls) o CSV.");
      return;
    }
    
    setFile(selectedFile);
    setIsProcessing(true);
    setRows([]);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      
      const processedRows: RowState[] = [];
      const usedNamesInFile = new Set<string>();

      jsonData.forEach((row: any, index: number) => {
        const nameRaw = String(row["name"] ?? "").trim();
        const currencyRaw = String(row["default_currency"] ?? "").trim().toUpperCase();
        const minMarginRaw = String(row["min_margin_pct"] ?? "").trim();
        const isActiveRaw = String(row["is_active"] ?? "").trim().toLowerCase();

        let isValid = true;
        let reason = "";

        let parsedMinMargin: number | null = null;
        let parsedIsActive = true;

        if (!nameRaw) {
          isValid = false;
          reason = "Nombre vacío";
        } else if (currencyRaw !== "COP" && currencyRaw !== "USD") {
          isValid = false;
          reason = "Moneda inválida (Use COP o USD)";
        } else if (existingNames.has(nameRaw.toLowerCase())) {
          isValid = false;
          reason = "Canal ya existe en BD";
        } else if (usedNamesInFile.has(nameRaw.toLowerCase())) {
          isValid = false;
          reason = "Canal duplicado en el mismo archivo";
        } else {
          // Check conditionals
          if (minMarginRaw) {
             const m = Number(minMarginRaw);
             if (isNaN(m)) {
                isValid = false;
                reason = "Margen inválido";
             } else {
                parsedMinMargin = m;
             }
          }

          if (isActiveRaw) {
            if (isActiveRaw === "false" || isActiveRaw === "0" || isActiveRaw === "no") {
               parsedIsActive = false;
            } else if (isActiveRaw !== "true" && isActiveRaw !== "1" && isActiveRaw !== "si" && isActiveRaw !== "yes") {
               isValid = false;
               reason = "Valor booleano is_active inválido";
            }
          }
        }

        if (isValid) {
           usedNamesInFile.add(nameRaw.toLowerCase());
        }

        processedRows.push({
          rawRow: row,
          rowIndex: index + 2, // Accounting for zero-index and header row
          validation: {
            isValid,
            reason,
            parsedName: nameRaw,
            parsedCurrency: currencyRaw,
            parsedMinMargin,
            parsedIsActive
          }
        });
      });

      setRows(processedRows);
    } catch (err) {
      console.error(err);
      alert("Error procesando el archivo. Asegúrate de que tenga el formato correcto.");
    } finally {
      setIsProcessing(false);
    }
  };

  const validRows = rows.filter(r => r.validation.isValid);
  const invalidRows = rows.filter(r => !r.validation.isValid);

  const handleSave = async () => {
    if (validRows.length === 0) return;
    setIsSaving(true);
    
    try {
      const payload = validRows.map(r => ({
        name: r.validation.parsedName!,
        default_currency: r.validation.parsedCurrency!,
        min_margin_pct: r.validation.parsedMinMargin,
        is_active: r.validation.parsedIsActive!
      }));

      const { error } = await supabase.from("sales_channels").insert(payload);
      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Ocurrió un error guardando: " + (err.message || "Desconocido"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => !isSaving && onClose()} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-border-subtle flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 rounded-lg">
              <Upload className="w-5 h-5 text-brand-primary" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Cargar Canales Masivos</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-slate-200/50 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {!file && (
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border-subtle rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-brand-primary/30 transition-colors cursor-pointer cursor"
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
              />
              <FileSpreadsheet className="w-12 h-12 text-brand-primary/50 mb-4" />
              <h3 className="text-base font-semibold text-text-primary mb-1">
                Sube tu plantilla de Canales
              </h3>
              <p className="text-sm text-text-muted">
                Arrastra y suelta tu archivo Excel o CSV, o haz clic para explorar.
              </p>
            </div>
          )}

          {isProcessing && (
            <div className="py-12 flex flex-col items-center justify-center">
               <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
               <p className="text-sm font-medium text-text-muted">Procesando filas...</p>
            </div>
          )}

          {file && !isProcessing && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 border border-border-subtle rounded-xl flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-text-primary">{rows.length}</span>
                  <span className="text-xs font-medium text-text-muted mt-1">Total Filas</span>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-emerald-600">{validRows.length}</span>
                  <span className="text-xs font-medium text-emerald-700 mt-1">Listas para subir</span>
                </div>
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-red-600">{invalidRows.length}</span>
                  <span className="text-xs font-medium text-red-700 mt-1">Con errores</span>
                </div>
              </div>

              {/* Invalid Rows List */}
              {invalidRows.length > 0 && (
                <div className="border border-red-100 bg-white rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-red-50/50 border-b border-red-100 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-semibold text-red-700">Filas omitidas ({invalidRows.length})</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-border-subtle">
                    {invalidRows.map((r, i) => (
                      <div key={i} className="px-4 py-3 flex items-start gap-3">
                        <div className="min-w-16">
                           <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                             Fila {r.rowIndex}
                           </span>
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-sm font-medium text-text-primary truncate">
                             {r.validation.parsedName || "(Nombre no definido)"}
                           </p>
                           <p className="text-xs font-medium text-red-500 mt-0.5">
                             Rechazado: {r.validation.reason}
                           </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Ready feedback */}
              {validRows.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-800">Todo listo para importar</h4>
                    <p className="text-xs text-emerald-600 mt-1">
                      Se insertarán {validRows.length} canales nuevos en la base de datos de manera irreversible.
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle bg-slate-50/50 flex items-center justify-between">
          <button
             onClick={() => setFile(null)}
             disabled={!file || isSaving}
             className="text-sm font-medium text-slate-500 hover:text-text-primary disabled:opacity-0 transition-colors"
          >
            Subir otro archivo
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 bg-white border border-border-subtle text-text-primary text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !file || validRows.length === 0}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-brand-accent transition-all shadow-sm disabled:opacity-50"
            >
              {isSaving ? <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : "Importar Filas Validas"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
