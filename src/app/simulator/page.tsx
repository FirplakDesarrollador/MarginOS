"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ProductPickerModal, type DBProduct } from "@/components/ProductPickerModal";
import { createClient } from "@/lib/supabase/client";

type Producto = {
  Codigo: string;
  Descripcion: string;
  Costo_Mp: number;
};

type Inputs = {
  precio?: number;
  descuento?: number; // %
  cantidad?: number;
};

export default function SimulatorPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [inputs, setInputs] = useState<Record<string, Inputs>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = createClient();

  const formatMoney = useMemo(() => {
    return (value: number) =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
  }, []);

  async function handleAddProduct(dbProduct: DBProduct) {
    if (productos.some((p) => p.Codigo === dbProduct.sap_code)) {
      return;
    }

    setIsModalOpen(false); // Close immediately for better UX responsiveness
    
    // Fetch latest BOM cost
    const { data: bomData } = await supabase
      .from("bom_products")
      .select("recalculated_cost_mp")
      .eq("sap_code", dbProduct.sap_code)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const newProduct: Producto = {
      Codigo: dbProduct.sap_code,
      Descripcion: dbProduct.description,
      Costo_Mp: bomData?.recalculated_cost_mp || 0,
    };

    setProductos((prev) => {
      // Re-verify no duplication during async network call
      if (prev.some((p) => p.Codigo === newProduct.Codigo)) return prev;
      return [...prev, newProduct];
    });
  }

  function handleRemoveProduct(codigo: string) {
    setProductos((prev) => prev.filter((p) => p.Codigo !== codigo));
    const newInputs = { ...inputs };
    delete newInputs[codigo];
    setInputs(newInputs);
  }

  function updateInput(codigo: string, field: keyof Inputs, value: number) {
    setInputs((prev) => ({
      ...prev,
      [codigo]: {
        ...prev[codigo],
        [field]: value,
      },
    }));
  }

  function calcularLinea(p: Producto) {
    const precio = Number(inputs[p.Codigo]?.precio || 0);
    const descuento = Number(inputs[p.Codigo]?.descuento || 0);
    const cantidad = Number(inputs[p.Codigo]?.cantidad || 0);

    const ingresoBruto = precio * cantidad;
    const ingresoNeto = ingresoBruto * (1 - descuento / 100);
    const costoTotal = p.Costo_Mp * cantidad;
    const contribucion = ingresoNeto - costoTotal;
    const margen = ingresoNeto > 0 ? (contribucion / ingresoNeto) * 100 : 0;

    return { ingresoBruto, ingresoNeto, costoTotal, contribucion, margen };
  }

  const resumen = useMemo(() => {
    let ingresoNetoTotal = 0;
    let costoTotalTotal = 0;
    let contribucionTotal = 0;

    for (const p of productos) {
      const r = calcularLinea(p);
      ingresoNetoTotal += r.ingresoNeto;
      costoTotalTotal += r.costoTotal;
      contribucionTotal += r.contribucion;
    }

    const margenTotal =
      ingresoNetoTotal > 0 ? (contribucionTotal / ingresoNetoTotal) * 100 : 0;

    return { ingresoNetoTotal, costoTotalTotal, contribucionTotal, margenTotal };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos, inputs]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 selection:bg-brand-primary selection:text-white pb-20">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold mb-2 text-brand-primary">Simulador de Negocio</h1>
          <p className="text-text-muted">
            Agrega productos, ingresa precio lista, descuento (%) y cantidad. El sistema calcula
            ingresos, costos, contribución y margen con tu última BOM subida.
          </p>
        </div>

        {/* ✅ Resumen general */}
        <div className="w-full md:w-auto rounded-2xl border border-border-subtle bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-2">
            <div>
              <div className="text-xs font-medium text-text-muted mb-1">Ingreso Neto Total</div>
              <div className="text-lg font-semibold tracking-tight">
                {formatMoney(resumen.ingresoNetoTotal)}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-text-muted mb-1">Costo Total</div>
              <div className="text-lg font-semibold tracking-tight">
                {formatMoney(resumen.costoTotalTotal)}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-text-muted mb-1">Contribución</div>
              <div
                className={`text-lg font-semibold tracking-tight inline-flex items-center gap-1 ${
                  resumen.contribucionTotal < 0 ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {formatMoney(resumen.contribucionTotal)}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-text-muted mb-1">Margen %</div>
              <div
                className={`text-lg font-semibold tracking-tight inline-flex items-center gap-1 ${
                  resumen.margenTotal < 0 ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {resumen.margenTotal.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Detalle de Simulación</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-brand-accent transition-all shadow-sm hover:shadow-brand-primary/20 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          Agregar Producto
        </button>
      </div>

      {productos.length === 0 && (
        <div className="mt-6 border-2 border-dashed border-border-subtle rounded-2xl p-12 text-center bg-slate-50/50">
          <div className="w-16 h-16 bg-white border border-border-subtle rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Plus className="w-8 h-8 text-text-muted/50" />
          </div>
          <h3 className="text-base font-medium text-text-primary mb-1">Simulación Vacía</h3>
          <p className="text-sm text-text-muted">
            Aún no hay productos en la tabla. Agrega productos para comenzar la simulación.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 border border-border-subtle bg-white text-text-primary text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            Agregar mi primer producto
          </button>
        </div>
      )}

      {productos.length > 0 && (
        <div className="mt-6 overflow-x-auto border border-border-subtle rounded-2xl shadow-sm bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-border-subtle">
              <tr>
                <th className="px-4 py-4 text-left font-semibold text-text-primary">Código SAP</th>
                <th className="px-4 py-4 text-left font-semibold text-text-primary">Descripción</th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary">Costo Unitario</th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary whitespace-nowrap">Precio Lista</th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary whitespace-nowrap">% Desc</th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary">Cantidad</th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary whitespace-nowrap">Ingreso Neto</th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary whitespace-nowrap">Costo Total</th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary">Contribución</th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary whitespace-nowrap">Margen %</th>
                <th className="px-4 py-4 text-center w-12 font-semibold text-text-primary"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border-subtle">
              {productos.map((p) => {
                const r = calcularLinea(p);

                return (
                  <tr key={p.Codigo} className="group hover:bg-slate-50/40 transition-colors">
                    <td className="px-4 py-4 font-medium text-text-primary align-middle">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-800 tracking-tight">
                        {p.Codigo}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <div className="font-medium text-text-primary min-w-[250px] max-w-[320px] whitespace-normal line-clamp-2 md:line-clamp-3 leading-snug" title={p.Descripcion}>
                        {p.Descripcion}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right align-middle">
                      {p.Costo_Mp > 0 ? (
                        <span className="text-text-muted font-medium">{formatMoney(p.Costo_Mp)}</span>
                      ) : (
                        <div className="inline-flex items-center px-2 py-1 rounded bg-orange-50 text-orange-600 border border-orange-100" title="Sin costo de BOM reportado">
                          <span className="font-semibold text-xs tracking-tight">Falta Costo ($0)</span>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4 text-right align-middle">
                      <input
                        type="number"
                        min="0"
                        className="w-28 border border-border-subtle rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-sm bg-white shadow-sm"
                        value={inputs[p.Codigo]?.precio ?? ""}
                        onChange={(e) =>
                          updateInput(p.Codigo, "precio", Number(e.target.value))
                        }
                        placeholder="0"
                      />
                    </td>

                    <td className="px-4 py-4 text-right align-middle">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="w-20 border border-border-subtle rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-sm bg-white shadow-sm"
                        value={inputs[p.Codigo]?.descuento ?? ""}
                        onChange={(e) =>
                          updateInput(p.Codigo, "descuento", Number(e.target.value))
                        }
                        placeholder="0"
                      />
                    </td>

                    <td className="px-4 py-4 text-right align-middle">
                      <input
                        type="number"
                        min="0"
                        className="w-24 border border-border-subtle rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-sm bg-white shadow-sm"
                        value={inputs[p.Codigo]?.cantidad ?? ""}
                        onChange={(e) =>
                          updateInput(p.Codigo, "cantidad", Number(e.target.value))
                        }
                        placeholder="0"
                      />
                    </td>

                    <td className="px-4 py-4 text-right font-medium text-text-primary align-middle">
                      {formatMoney(r.ingresoNeto)}
                    </td>

                    <td className="px-4 py-4 text-right text-text-muted align-middle">
                      {formatMoney(r.costoTotal)}
                    </td>

                    <td
                      className={`px-4 py-4 text-right font-medium align-middle ${
                        r.contribucion < 0 ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {formatMoney(r.contribucion)}
                    </td>

                    <td
                      className={`px-4 py-4 text-right font-semibold align-middle bg-clip-padding ${
                        r.margen < 0 ? "text-red-600 bg-red-50/50" : "text-emerald-600 bg-emerald-50/50"
                      }`}
                    >
                      {Number.isFinite(r.margen) ? r.margen.toFixed(1) : "0.0"}%
                    </td>

                    <td className="px-4 py-4 text-center align-middle">
                       <button
                         onClick={() => handleRemoveProduct(p.Codigo)}
                         className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                         title="Eliminar fila"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Picker Modal */}
      <ProductPickerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleAddProduct}
        existingSapCodes={productos.map(p => p.Codigo)}
      />
    </main>
  );
}