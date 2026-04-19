import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type DBCost = {
  id: string;
  codigo: string;
  costo_unitario: number;
  moneda: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editCost?: DBCost | null;
};

export function CostModal({ isOpen, onClose, onSuccess, editCost }: Props) {
  const [codigo, setCodigo] = useState("");
  const [description, setDescription] = useState("");
  const [costoUnitario, setCostoUnitario] = useState<number | "">("");
  const [moneda, setMoneda] = useState("COP");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editCost) {
        setCodigo(editCost.codigo);
        setDescription(editCost.description || "");
        setCostoUnitario(editCost.costo_unitario);
        setMoneda(editCost.moneda);
      } else {
        setCodigo("");
        setDescription("");
        setCostoUnitario("");
        setMoneda("COP");
      }
      setError(null);
    }
  }, [isOpen, editCost]);

  if (!isOpen) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const formattedCodigo = codigo.trim().toUpperCase();
    if (!formattedCodigo) {
      setError("El código es obligatorio.");
      return;
    }

    if (costoUnitario === "" || Number(costoUnitario) < 0) {
      setError("El costo unitario debe ser un valor numérico válido.");
      return;
    }

    setIsSaving(true);
    const supabase = createClient();

    try {
      const payload = {
        codigo: formattedCodigo,
        description: description.trim() || null,
        costo_unitario: Number(costoUnitario),
        moneda,
      };

      if (editCost) {
        const { error: updErr } = await supabase
          .from("component_costs")
          .update(payload)
          .eq("id", editCost.id);

        if (updErr) {
          if (updErr.code === "23505") { // unique violation
            throw new Error(`El código '${formattedCodigo}' ya existe en otro registro.`);
          }
          throw updErr;
        }
      } else {
        const { error: insErr } = await supabase
          .from("component_costs")
          .insert(payload);

        if (insErr) {
          if (insErr.code === "23505") { // unique violation
            throw new Error(`El código '${formattedCodigo}' ya se encuentra registrado.`);
          }
          throw insErr;
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error guardando costo:", err);
      setError(err.message || "Ocurrió un error al guardar el registro.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={() => !isSaving && onClose()}
      />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-border-subtle flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-slate-50/50">
          <h2 className="text-lg font-semibold text-text-primary">
            {editCost ? "Editar Costo" : "Nuevo Costo"}
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
        <form onSubmit={handleSave} className="flex flex-col">
          <div className="p-6 space-y-4">
            
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-2">
                <span className="font-semibold px-1">•</span>{error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Código del Componente <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej: AB-123456"
                className="w-full px-3 py-2 border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all"
                disabled={isSaving || !!editCost} // Si está en edición no dejamos cambiar el código para no corromper links reales a SAP
              />
              {!!editCost && (
                 <p className="text-xs text-text-muted mt-1">El código no puede modificarse en modo edición.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Descripción (Opcional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Tornillo Zincado 2x4"
                className="w-full px-3 py-2 border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all"
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Moneda <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={moneda}
                  onChange={(e) => setMoneda(e.target.value)}
                  className="w-full px-3 py-2 border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all"
                  disabled={isSaving}
                >
                  <option value="COP">COP (Pesos)</option>
                  <option value="USD">USD (Dólares)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Costo Unitario <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={costoUnitario}
                  onChange={(e) => setCostoUnitario(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all"
                  disabled={isSaving}
                />
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex justify-end gap-3 border-t border-border-subtle bg-slate-50/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2 bg-white border border-border-subtle text-text-primary text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-brand-accent transition-all shadow-sm shadow-brand-primary/20 hover:-translate-y-0.5 disabled:opacity-50"
            >
              {isSaving ? (
                <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editCost ? "Guardar Cambios" : "Guardar Costo"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
