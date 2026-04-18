import { Copy, RefreshCw, X } from "lucide-react";
import { useState } from "react";

export type VersionOption = "CLONE" | "COST_UPDATE" | null;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (option: VersionOption) => void;
  isSaving?: boolean;
};

export function VersionModal({ isOpen, onClose, onConfirm, isSaving }: Props) {
  const [selectedOption, setSelectedOption] = useState<VersionOption>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => !isSaving && onClose()} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-border-subtle flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-slate-50/50">
          <h2 className="text-lg font-semibold text-text-primary">
            Crear nueva versión de simulación
          </h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-slate-200/50 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col p-6 gap-4">
          
          <button
            onClick={() => setSelectedOption("CLONE")}
            disabled={isSaving}
            className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
              selectedOption === "CLONE" 
                ? "border-brand-primary bg-brand-primary/5" 
                : "border-border-subtle hover:border-brand-primary/40 hover:bg-slate-50"
            }`}
          >
            <div className={`p-2 rounded-lg shrink-0 ${selectedOption === "CLONE" ? "bg-brand-primary/20 text-brand-primary" : "bg-slate-100 text-slate-500"}`}>
               <Copy className="w-6 h-6" />
            </div>
            <div>
               <h3 className={`font-semibold ${selectedOption === "CLONE" ? "text-brand-primary" : "text-text-primary"}`}>
                 Opción A: Clonar simulación actual
               </h3>
               <p className="text-sm text-text-muted mt-1 leading-relaxed">
                 Mantiene los mismos costos de la simulación original. Útil para cambiar descuentos, cantidades o condiciones comerciales sin alterar la base histórica.
               </p>
            </div>
          </button>

          <button
            onClick={() => setSelectedOption("COST_UPDATE")}
            disabled={isSaving}
            className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
              selectedOption === "COST_UPDATE" 
                ? "border-emerald-500 bg-emerald-50" 
                : "border-border-subtle hover:border-emerald-500/40 hover:bg-slate-50"
            }`}
          >
            <div className={`p-2 rounded-lg shrink-0 ${selectedOption === "COST_UPDATE" ? "bg-emerald-200 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
               <RefreshCw className="w-6 h-6" />
            </div>
            <div>
               <h3 className={`font-semibold ${selectedOption === "COST_UPDATE" ? "text-emerald-700" : "text-text-primary"}`}>
                 Opción B: Actualizar con costos actuales
               </h3>
               <p className="text-sm text-text-muted mt-1 leading-relaxed">
                 Recalcula la simulación usando los costos más recientes disponibles desde BOM / costos reales.
               </p>
            </div>
          </button>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-end gap-3 border-t border-border-subtle bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 bg-white border border-border-subtle text-text-primary text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(selectedOption)}
            disabled={isSaving || !selectedOption}
            className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 text-white text-sm font-medium rounded-xl transition-all shadow-sm disabled:opacity-50 ${
              selectedOption === "COST_UPDATE" 
                ? "bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-600/20" 
                : "bg-brand-primary hover:bg-brand-accent hover:shadow-brand-primary/20"
            }`}
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            ) : "Continuar"}
          </button>
        </div>

      </div>
    </div>
  );
}
