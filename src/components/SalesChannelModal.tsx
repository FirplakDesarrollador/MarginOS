import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type DBChannel = {
  id: string;
  name: string;
  default_currency: string;
  min_margin_pct: number | null;
  is_active: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editChannel?: DBChannel | null;
};

export function SalesChannelModal({ isOpen, onClose, onSuccess, editChannel }: Props) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("COP");
  const [minMargin, setMinMargin] = useState<number | "">("");
  const [isActive, setIsActive] = useState(true);
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      setError("");
      if (editChannel) {
        setName(editChannel.name);
        setCurrency(editChannel.default_currency);
        setMinMargin(editChannel.min_margin_pct !== null ? editChannel.min_margin_pct : "");
        setIsActive(editChannel.is_active);
      } else {
        // Reset form
        setName("");
        setCurrency("COP");
        setMinMargin("");
        setIsActive(true);
      }
    }
  }, [isOpen, editChannel]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const cleanName = name.trim();
    if (!cleanName) {
      setError("El nombre del canal es requerido.");
      return;
    }

    setIsSaving(true);
    try {
      // Validar duplicado por nombre, excluyendo el ID actual si es edición
      let query = supabase.from("sales_channels").select("id").ilike("name", cleanName);
      if (editChannel) {
        query = query.neq("id", editChannel.id);
      }
      const { data: existing } = await query;
      
      if (existing && existing.length > 0) {
        throw new Error("Ya existe un canal con este nombre.");
      }

      const payload = {
        name: cleanName,
        default_currency: currency,
        min_margin_pct: minMargin === "" ? null : Number(minMargin),
        is_active: isActive,
      };

      if (editChannel) {
        // UPDATE
        const { error: updateErr } = await supabase
          .from("sales_channels")
          .update(payload)
          .eq("id", editChannel.id);
        if (updateErr) throw updateErr;
      } else {
        // INSERT
        const { error: insertErr } = await supabase
          .from("sales_channels")
          .insert(payload);
        if (insertErr) throw insertErr;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocurrió un error guardando el canal.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => !isSaving && onClose()} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-border-subtle flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-slate-50/50">
          <h2 className="text-lg font-semibold text-text-primary">
            {editChannel ? "Editar Canal de Venta" : "Nuevo Canal de Venta"}
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
        <form onSubmit={handleSubmit} className="flex flex-col p-6 gap-4">
          
          {error && (
            <div className="px-4 py-3 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-100 flex items-start">
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">
              Nombre del canal <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              placeholder="Ej. Distribuidores ZS"
              className="w-full px-3 py-2 bg-white border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">
              Moneda por defecto <span className="text-red-500">*</span>
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={isSaving}
              className="w-full px-3 py-2 bg-white border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all disabled:opacity-50"
            >
              <option value="COP">COP</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">
              Margen mínimo (%) <span className="text-text-muted font-normal text-xs ml-1">(Opcional)</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={minMargin}
              onChange={(e) => setMinMargin(e.target.value ? Number(e.target.value) : "")}
              disabled={isSaving}
              placeholder="Ej. 15.5"
              className="w-full px-3 py-2 bg-white border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all disabled:opacity-50"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? 'bg-emerald-500' : 'bg-slate-300'} disabled:opacity-50`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm font-medium text-text-primary">
              {isActive ? "Canal Activo" : "Canal Inactivo"}
            </span>
          </div>

          <div className="mt-4 flex gap-3 pt-4 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-white border border-border-subtle text-text-primary text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-brand-accent transition-all shadow-sm disabled:opacity-50"
            >
              {isSaving ? <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
