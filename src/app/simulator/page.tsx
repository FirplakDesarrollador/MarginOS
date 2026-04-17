"use client";

import { useEffect, useMemo, useState } from "react";

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

  useEffect(() => {
    const stored = localStorage.getItem("marginos:last_bom_import");
    if (!stored) return;

    const parsed = JSON.parse(stored);
    setProductos(parsed.productos || []);
  }, []);

  const formatMoney = useMemo(() => {
    return (value: number) =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
  }, []);

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
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Simulador de Negocio</h1>
          <p className="text-slate-600">
            Ingresa precio lista, descuento (%) y cantidad por producto. El sistema calcula
            ingresos, costos, contribución y margen.
          </p>
        </div>

        {/* ✅ Resumen general */}
        <div className="w-full md:w-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-slate-500">Ingreso Neto Total</div>
              <div className="text-lg font-semibold">
                {formatMoney(resumen.ingresoNetoTotal)}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Costo Total</div>
              <div className="text-lg font-semibold">
                {formatMoney(resumen.costoTotalTotal)}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Contribución</div>
              <div
                className={`text-lg font-semibold ${
                  resumen.contribucionTotal < 0 ? "text-red-600" : "text-green-700"
                }`}
              >
                {formatMoney(resumen.contribucionTotal)}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Margen %</div>
              <div
                className={`text-lg font-semibold ${
                  resumen.margenTotal < 0 ? "text-red-600" : "text-green-700"
                }`}
              >
                {resumen.margenTotal.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {productos.length === 0 && (
        <p className="mt-8 text-slate-600">
          No hay productos cargados. Ve primero a <b>/import</b>, sube el BOM y presiona Guardar.
        </p>
      )}

      {productos.length > 0 && (
        <div className="mt-8 overflow-x-auto border rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Descripción</th>
                <th className="px-3 py-2 text-right">Costo Unitario</th>
                <th className="px-3 py-2 text-right">Precio Lista</th>
                <th className="px-3 py-2 text-right">% Desc</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
                <th className="px-3 py-2 text-right">Ingreso Neto</th>
                <th className="px-3 py-2 text-right">Costo Total</th>
                <th className="px-3 py-2 text-right">Contribución</th>
                <th className="px-3 py-2 text-right">Margen %</th>
              </tr>
            </thead>

            <tbody>
              {productos.map((p) => {
                const r = calcularLinea(p);

                return (
                  <tr key={p.Codigo} className="border-t">
                    <td className="px-3 py-2 font-medium">{p.Codigo}</td>
                    <td className="px-3 py-2">{p.Descripcion}</td>

                    <td className="px-3 py-2 text-right">
                      {formatMoney(p.Costo_Mp)}
                    </td>

                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        inputMode="decimal"
                        className="w-28 border rounded px-2 py-1 text-right"
                        value={inputs[p.Codigo]?.precio ?? ""}
                        onChange={(e) =>
                          updateInput(p.Codigo, "precio", Number(e.target.value))
                        }
                        placeholder="0"
                      />
                    </td>

                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        inputMode="decimal"
                        className="w-20 border rounded px-2 py-1 text-right"
                        value={inputs[p.Codigo]?.descuento ?? ""}
                        onChange={(e) =>
                          updateInput(p.Codigo, "descuento", Number(e.target.value))
                        }
                        placeholder="0"
                      />
                    </td>

                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        inputMode="numeric"
                        className="w-20 border rounded px-2 py-1 text-right"
                        value={inputs[p.Codigo]?.cantidad ?? ""}
                        onChange={(e) =>
                          updateInput(p.Codigo, "cantidad", Number(e.target.value))
                        }
                        placeholder="0"
                      />
                    </td>

                    <td className="px-3 py-2 text-right">
                      {formatMoney(r.ingresoNeto)}
                    </td>

                    <td className="px-3 py-2 text-right">
                      {formatMoney(r.costoTotal)}
                    </td>

                    <td
                      className={`px-3 py-2 text-right ${
                        r.contribucion < 0 ? "text-red-600" : "text-green-700"
                      }`}
                    >
                      {formatMoney(r.contribucion)}
                    </td>

                    <td
                      className={`px-3 py-2 text-right ${
                        r.margen < 0 ? "text-red-600" : "text-green-700"
                      }`}
                    >
                      {Number.isFinite(r.margen) ? r.margen.toFixed(1) : "0.0"}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}