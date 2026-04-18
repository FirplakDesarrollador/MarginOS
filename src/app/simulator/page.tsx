"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Trash2, Search, UserPlus, Save, Building2, Calendar, DollarSign, Briefcase } from "lucide-react";
import { ProductPickerModal, type DBProduct } from "@/components/ProductPickerModal";
import { CustomerCreateModal } from "@/components/CustomerCreateModal";
import { CustomerSelectModal, type Customer } from "@/components/CustomerSelectModal";
import { VersionModal, type VersionOption } from "@/components/VersionModal";
import { createClient } from "@/lib/supabase/client";

type Producto = {
  Codigo: string;
  Descripcion: string;
  Costo_Mp: number;
  product_id?: string;
};

type Inputs = {
  precio?: number;
  descuento?: number; // %
  cantidad?: number;
};

function SimulatorContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("id");
  
  const [originalSimulation, setOriginalSimulation] = useState<any>(null);
  const [versionTypeDisplay, setVersionTypeDisplay] = useState<{type: string, originalId: string} | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  
  // ==========================================
  // ESTADOS DE SIMULADOR
  // ==========================================
  const [productos, setProductos] = useState<Producto[]>([]);
  const [inputs, setInputs] = useState<Record<string, Inputs>>({});
  const [margenObjetivo, setMargenObjetivo] = useState<number>(55);
  
  // ==========================================
  // ESTADOS DE METADATA (CABECERA)
  // ==========================================
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [projectName, setProjectName] = useState("");
  const [simulationType, setSimulationType] = useState("PRICE_LIST");
  const [currency, setCurrency] = useState("COP");
  const [trm, setTrm] = useState<number | "">("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  
  // ==========================================
  // ESTADOS DE MODALES Y GUARDADO
  // ==========================================
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCustomerSelectOpen, setIsCustomerSelectOpen] = useState(false);
  const [isCustomerCreateOpen, setIsCustomerCreateOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ==========================================
  // EFECTO P/ EDICION (CARGA METADATA E INPUTS)
  // ==========================================
  useEffect(() => {
    if (!editId) return;
    let isMounted = true;

    async function fetchEditData() {
      setIsLoadingEdit(true);
      try {
        const { data: sim, error: simErr } = await supabase
          .from("simulations")
          .select("*, customers(*)")
          .eq("id", editId)
          .single();

        if (simErr) throw simErr;
        
        const { data: lines, error: linesErr } = await supabase
          .from("simulation_lines")
          .select("*")
          .eq("simulation_id", editId);

        if (linesErr) throw linesErr;

        if (isMounted && sim && lines) {
           setOriginalSimulation(sim);
           setCustomer(sim.customers); // Req metadata
           setProjectName(sim.project_name || "");
           setSimulationType(sim.simulation_type || "PRICE_LIST");
           setCurrency(sim.currency || "COP");
           setTrm(sim.trm || "");
           setValidFrom(sim.valid_from ? sim.valid_from.split("T")[0] : "");
           setValidTo(sim.valid_to ? sim.valid_to.split("T")[0] : "");
           
           // Fetch if it is a version of something
           const { data: ver } = await supabase
             .from("simulation_versions")
             .select("original_simulation_id")
             .eq("renewed_simulation_id", editId)
             .maybeSingle();

           if (ver) {
             // temporal mock type since column doesn't exist yet
             setVersionTypeDisplay({ type: "UNKNOWN", originalId: ver.original_simulation_id });
           }

           // Restructure products into states
           const newProds: Producto[] = [];
           const newInputs: Record<string, Inputs> = {};
           
           for (const l of lines) {
              newProds.push({
                 Codigo: l.sap_code,
                 Descripcion: l.description || "",
                 Costo_Mp: l.cost_mp || 0,
                 product_id: l.product_id
              });
              
              newInputs[l.sap_code] = {
                 precio: l.list_price || 0,
                 descuento: l.discount_pct || 0,
                 cantidad: l.qty || 1
              };
           }
           
           setProductos(newProds);
           setInputs(newInputs);
        }
      } catch (err) {
        console.error("Error cargando simulación:", err);
      } finally {
        if (isMounted) setIsLoadingEdit(false);
      }
    }
    
    fetchEditData();
    return () => { isMounted = false; };
  }, [editId, supabase]);

  const formatMoney = useMemo(() => {
    return (value: number) =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
  }, []);

  async function handleAddProduct(dbProduct: DBProduct) {
    if (productos.some((p) => p.Codigo === dbProduct.sap_code)) {
      return;
    }

    setIsProductModalOpen(false);
    
    const { data: bomData } = await supabase
      .from("bom_products")
      .select("recalculated_cost_mp")
      .eq("sap_code", dbProduct.sap_code)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let listPrice = 0;
    let foundPrice = false;

    if (customer?.default_channel_id) {
      const { data: priceData } = await supabase
        .from("price_lists")
        .select("list_price")
        .eq("product_id", dbProduct.id)
        .eq("channel_id", customer.default_channel_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (priceData) {
        listPrice = priceData.list_price || 0;
        foundPrice = true;
      }
    }

    const newProduct: Producto & { _hasPriceList?: boolean } = {
      Codigo: dbProduct.sap_code,
      Descripcion: dbProduct.description,
      Costo_Mp: bomData?.recalculated_cost_mp || 0,
      product_id: dbProduct.id,
      _hasPriceList: foundPrice,
    };

    setProductos((prev) => {
      if (prev.some((p) => p.Codigo === newProduct.Codigo)) return prev;
      return [...prev, newProduct];
    });

    if (foundPrice) {
      setInputs((prev) => ({
        ...prev,
        [newProduct.Codigo]: {
          ...prev[newProduct.Codigo],
          precio: listPrice,
        },
      }));
    }
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

    return { ingresoBruto, ingresoNeto, costoTotal, contribucion, margen, precio, descuento, cantidad };
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

  // ==========================================
  // FUNCION PRINCIPAL: GUARDAR SIMULACION
  // ==========================================
  async function handleSaveSimulation(overwrite = false) {
    setSaveError("");
    setSaveSuccess(false);

    // Validaciones
    if (!customer) {
      setSaveError("Debes seleccionar o crear un cliente antes de guardar.");
      return;
    }
    if (productos.length === 0) {
      setSaveError("La simulación debe tener al menos un producto.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Insert header
      const headerPayload = {
        customer_id: customer.id,
        channel_id: customer.default_channel_id || null,
        simulation_type: simulationType,
        project_name: projectName || null,
        currency,
        trm: currency === "USD" ? Number(trm) : null,
        valid_from: validFrom || null,
        valid_to: validTo || null,
        status: "DRAFT"
      };

      let finalSimId;

      if (overwrite && editId) {
        // OVERWRITE MODE
        const { data: updatedSimulationData, error: updateError } = await supabase
          .from("simulations")
          .update(headerPayload)
          .eq("id", editId)
          .select()
          .single();
        if (updateError) throw updateError;
        finalSimId = updatedSimulationData.id;
        
        // BORRAR LÍNEAS VIEJAS PARA REMPLAZARLAS (Full rebuild)
        const { error: delError } = await supabase.from("simulation_lines").delete().eq("simulation_id", finalSimId);
        if (delError) throw delError;

      } else {
        // INSERT MODE (Should ideally only be triggered if !editId now)
        const { data: insertedSimulationData, error: insertError } = await supabase
          .from("simulations")
          .insert(headerPayload)
          .select()
          .single();
        if (insertError) throw insertError;
        finalSimId = insertedSimulationData.id;
      }

      // 2. Insert lines
      const linesPayload = productos.map(p => {
        const lineVars = calcularLinea(p);
        
        return {
          simulation_id: finalSimId,
          product_id: p.product_id || null, // Assuming product_id from DB
          sap_code: p.Codigo,
          description: p.Descripcion,
          qty: lineVars.cantidad,
          list_price: lineVars.precio,
          discount_pct: lineVars.descuento,
          net_price: lineVars.ingresoNeto / (lineVars.cantidad || 1) || 0, // precio unitario neto
          cost_mp: p.Costo_Mp,
          margin_pct: lineVars.margen,
          contribution_value: lineVars.contribucion
        };
      });

      const { error: linesError } = await supabase
        .from("simulation_lines")
        .insert(linesPayload);

      if (linesError) throw linesError;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000); // clear success msg after a while
      
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || "Ocurrió un error guardando la simulación.");
    } finally {
      setIsSaving(false);
      // We no longer push for normal save, unless we want to exit mode.
      // But overwriting stays in edit mode.
    }
  }

  // ==========================================
  // LOGICA BIFURCADA: GUARDAR COMO NUEVO (VERSIONS)
  // ==========================================
  async function handleSaveNuevaVersion(option: VersionOption) {
    if (!editId || !option || !customer) return;
    setSaveError("");
    setSaveSuccess(false);

    if (productos.length === 0) {
      setSaveError("La simulación debe tener al menos un producto.");
      return;
    }

    setIsSaving(true);
    try {
      const headerPayload = {
        customer_id: customer.id,
        channel_id: customer.default_channel_id || null,
        simulation_type: simulationType,
        project_name: projectName || null,
        currency,
        trm: currency === "USD" ? Number(trm) : null,
        valid_from: validFrom || null,
        valid_to: validTo || null,
        status: "DRAFT"
      };

      // 1. Crear nuevo header simulación
      const { data: simData, error: simError } = await supabase
        .from("simulations")
        .insert(headerPayload)
        .select()
        .single();
      if (simError) throw simError;

      const newSimId = simData.id;

      // 2. Obtener BOM Costs Actuales si es UPDATE, si no conservar lo que está en state
      let updatedProductsCostMp: Record<string, number> = {};
      
      if (option === "COST_UPDATE") {
         const { data: bomData, error: bomError } = await supabase
           .from("bom_products")
           .select("sap_code, recalculated_cost_mp")
           .order("created_at", { ascending: false });
           
         if (bomError) throw bomError;

         // Mapear costo más reciente por sap_code
         bomData?.forEach(b => {
           if (!updatedProductsCostMp[b.sap_code]) {
              updatedProductsCostMp[b.sap_code] = b.recalculated_cost_mp;
           }
         });
      }

      // 3. Crear líneas re-calculadas
      const linesPayload = productos.map(p => {
        // En cloning, usamos lo actual de la UI (reflejando exacto como estaba o si lo editó la UI).
        // En UPDATE, forzamos recálculo sobre nuevo cost_mp.
        const mpToUse = option === "COST_UPDATE" 
           ? (updatedProductsCostMp[p.Codigo] !== undefined ? updatedProductsCostMp[p.Codigo] : p.Costo_Mp)
           : p.Costo_Mp;
           
        const precio = Number(inputs[p.Codigo]?.precio || 0);
        const descuento = Number(inputs[p.Codigo]?.descuento || 0);
        const cantidad = Number(inputs[p.Codigo]?.cantidad || 0);

        const ingresoNeto = (precio * cantidad) * (1 - descuento / 100);
        const costoTotal = mpToUse * cantidad;
        const contribucion = ingresoNeto - costoTotal;
        const margen = ingresoNeto > 0 ? (contribucion / ingresoNeto) * 100 : 0;

        return {
          simulation_id: newSimId,
          product_id: p.product_id || null,
          sap_code: p.Codigo,
          description: p.Descripcion,
          qty: cantidad,
          list_price: precio,
          discount_pct: descuento,
          net_price: ingresoNeto / (cantidad || 1) || 0,
          cost_mp: mpToUse,
          margin_pct: margen,
          contribution_value: contribucion
        };
      });

      const { error: linesError } = await supabase.from("simulation_lines").insert(linesPayload);
      if (linesError) throw linesError;

      // 4. Crear el enlace de versión
      const { error: verError } = await supabase.from("simulation_versions").insert({
        original_simulation_id: editId,
        renewed_simulation_id: newSimId
      });
      if (verError) throw verError;

      setIsVersionModalOpen(false);
      // Re-encaminar silensiosamente al nuevo id clonado
      router.push(`/simulator?id=${newSimId}`);

    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || "Ocurrió un error clonando/actualizando la simulación.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-full px-4 md:px-6 py-10 selection:bg-brand-primary selection:text-white pb-32">
      
      {/* ========================================== */}
      {/* ALERTAS DE GUARDADO */}
      {saveError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          {saveError}
        </div>
      )}
      {saveSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          Simulación guardada exitosamente en el historial de Escenarios.
        </div>
      )}

      {/* ========================================== */}
      {/* ENCABEZADO Y RESUMEN KPls */}
      {/* ========================================== */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Simulador de Negocio</h1>
            <p className="text-sm text-text-muted mt-1 leading-relaxed max-w-xl">
              Crea o edita la negociación. Ajusta el proyecto, tipo de moneda y aplica cantidades para proyectar márgenes sobre costos SAP reales.
            </p>
            {versionTypeDisplay && (
               <div className="mt-2 text-xs font-medium px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 border border-amber-200 bg-amber-50 text-amber-700 shadow-sm">
                 <span className={`w-1.5 h-1.5 rounded-full ${versionTypeDisplay.type === 'COST_UPDATE' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                 {versionTypeDisplay.type === 'COST_UPDATE' 
                    ? "Versión trazada: Actualizada con costos vigentes" 
                    : "Versión trazada: Clonada desde histórico"}
               </div>
            )}
          </div>

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

      {/* ========================================== */}
      {/* CABECERA DE METADATOS CLlENTE / PROYECTO */}
      {/* ========================================== */}
      <div className="mt-8 rounded-2xl border border-border-subtle bg-white overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-border-subtle bg-slate-50/80 px-6 py-4 gap-4">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-primary" />
            Datos del Cliente y Proyecto
          </h2>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => setIsCustomerSelectOpen(true)}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 border border-border-subtle bg-white text-text-primary text-sm font-medium rounded-xl hover:bg-slate-50 hover:border-brand-primary/30 transition-all shadow-sm"
            >
              <Search className="w-4 h-4" /> Buscar Cliente
            </button>
            <button 
              onClick={() => setIsCustomerCreateOpen(true)}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary text-sm font-medium rounded-xl hover:bg-brand-primary/20 transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Crear Cliente
            </button>
          </div>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Fila 1 - Cliente */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2 bg-slate-50/50 rounded-xl p-4 border border-border-subtle">
            <span className="block text-xs font-semibold tracking-wider text-text-muted uppercase mb-3">Cliente Seleccionado</span>
            {customer ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-lg font-semibold text-text-primary leading-tight">{customer.name}</span>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
                  {customer.nit && <span className="flex items-center gap-1.5">NIT: {customer.nit}</span>}
                  {customer.contact_name && <span className="flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5"/> {customer.contact_name}</span>}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[72px] text-text-muted/60 text-sm">
                Ningún cliente seleccionado
              </div>
            )}
          </div>

          <div className="col-span-1">
            <label className="block text-sm font-medium text-text-primary mb-1.5 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-text-muted"/> Proyecto / Oportunidad
            </label>
            <input 
              type="text" 
              placeholder="Ej: Licitación Hotel"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              className="w-full border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all"
            />
          </div>

          <div className="col-span-1">
            <label className="block text-sm font-medium text-text-primary mb-1.5">Tipo de negociación</label>
            <select 
              value={simulationType}
              onChange={e => setSimulationType(e.target.value)}
              className="w-full border border-border-subtle bg-white rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all"
            >
              <option value="PRICE_LIST">Lista de precios</option>
              <option value="PROJECT_PROMO">Proyecto / Promoción</option>
            </select>
          </div>

          {/* Fila 2 - Configuración Monetaria y Fechas */}
          <div className="col-span-1">
            <label className="block text-sm font-medium text-text-primary mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-text-muted"/> Moneda
            </label>
            <select 
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full border border-border-subtle bg-white rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all"
            >
              <option value="COP">COP (Pesos)</option>
              <option value="USD">USD (Dólares)</option>
            </select>
          </div>

          {currency === "USD" && (
            <div className="col-span-1 animate-in fade-in slide-in-from-left-4 duration-300">
               <label className="block text-sm font-medium text-text-primary mb-1.5">TRM Acordada</label>
               <input 
                 type="number" 
                 placeholder="Ej: 3950.50"
                 value={trm}
                 onChange={e => setTrm(Number(e.target.value))}
                 className="w-full border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all text-right"
               />
            </div>
          )}

          <div className="col-span-1">
            <label className="block text-sm font-medium text-text-primary mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-text-muted"/> Fecha Inicio Validez
            </label>
            <input 
              type="date" 
              value={validFrom}
              onChange={e => setValidFrom(e.target.value)}
              className="w-full border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all text-text-muted"
            />
          </div>

          <div className="col-span-1">
             <label className="block text-sm font-medium text-text-primary mb-1.5 flex items-center gap-1.5">
               <Calendar className="w-4 h-4 text-text-muted"/> Fecha Vencimiento
             </label>
             <input 
               type="date" 
               value={validTo}
               onChange={e => setValidTo(e.target.value)}
               className="w-full border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all text-text-muted"
             />
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* CUERPO CENTRAL DE PRODUCTOS */}
      {/* ========================================== */}
      <div className="mt-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-text-primary">Detalle de Simulación</h2>
          <div className="flex items-center gap-2 bg-slate-50 border border-border-subtle rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-sm font-medium text-text-muted">Margen Objetivo (%):</span>
            <input 
              type="number"
              value={margenObjetivo}
              onChange={(e) => setMargenObjetivo(Number(e.target.value))}
              className="w-16 bg-white border border-border-subtle rounded-md px-2 py-1 text-sm font-semibold text-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary text-center"
            />
          </div>
        </div>
        <div className="flex gap-3">
          {(!customer || !customer.default_channel_id) ? (
            <div className="flex-1 md:flex-none inline-flex items-center px-4 py-2 bg-amber-50 text-amber-700 text-sm font-medium rounded-xl border border-amber-200 shadow-sm">
              Selecciona un cliente para obtener precios
            </div>
          ) : (
            <button
              onClick={() => setIsProductModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-border-subtle bg-white text-text-primary text-sm font-medium rounded-xl hover:bg-slate-50 transition-all shadow-sm flex-1 md:flex-none"
            >
              <Plus className="w-4 h-4" />
              Agregar Producto
            </button>
          )}
          
          {editId ? (
            <>
               <button
                 onClick={() => handleSaveSimulation(true)}
                 disabled={isSaving}
                 className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-brand-accent transition-all shadow-sm hover:shadow-brand-primary/20 hover:-translate-y-0.5 disabled:opacity-50 flex-1 md:flex-none"
               >
                 {isSaving ? <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                 Sobreescribir
               </button>
               <button
                 onClick={() => setIsVersionModalOpen(true)}
                 disabled={isSaving}
                 className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-all shadow-sm disabled:opacity-50 flex-1 md:flex-none"
               >
                 Guardar como Nueva
               </button>
            </>
          ) : (
            <button
              onClick={() => handleSaveSimulation(false)}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-primary text-white text-sm font-medium rounded-xl hover:bg-brand-accent transition-all shadow-sm hover:shadow-brand-primary/20 hover:-translate-y-0.5 disabled:opacity-50 flex-1 md:flex-none"
            >
              {isSaving ? (
                <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Guardar Simulación
            </button>
          )}
        </div>
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
          {(!customer || !customer.default_channel_id) ? (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium rounded-xl shadow-sm">
              Busca o crea un cliente primero
            </div>
          ) : (
            <button
              onClick={() => setIsProductModalOpen(true)}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 border border-border-subtle bg-white text-text-primary text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              Agregar mi primer producto
            </button>
          )}
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
                <th className="px-4 py-4 text-right font-semibold text-text-primary whitespace-nowrap">Precio Neto</th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary">Cantidad</th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary whitespace-nowrap">Ingreso Neto</th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary whitespace-nowrap">Costo Total</th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary">Contribución</th>
                <th className="px-4 py-4 text-center font-semibold text-text-primary whitespace-nowrap">Margen & Δ</th>
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
                      <div className="font-semibold text-text-primary mb-1">
                        {formatMoney(r.precio)}
                      </div>
                      {p._hasPriceList === false && (
                        <div className="mt-1.5 text-[10px] font-semibold text-amber-600 tracking-tight leading-none bg-amber-50 inline-block px-1.5 py-0.5 rounded border border-amber-100">
                          Sin precio base
                        </div>
                      )}
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
                      <div className="font-semibold text-text-primary">
                        {formatMoney(r.precio * (1 - r.descuento / 100))}
                      </div>
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

                    <td className="px-4 py-4 text-right font-semibold text-text-primary align-middle">
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

                    <td className="px-4 py-4 align-middle">
                      {(() => {
                        const m = Number.isFinite(r.margen) ? r.margen : 0;
                        const d = m - margenObjetivo;
                        
                        let badgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
                        if (d <= -5) {
                          badgeBg = "bg-red-50 text-red-700 border-red-200";
                        } else if (d < 0) {
                          badgeBg = "bg-amber-50 text-amber-700 border-amber-200";
                        }

                        return (
                          <div className="flex flex-col items-center justify-center gap-1.5 min-w-[70px]">
                            <span className="font-bold text-text-primary">
                              {m.toFixed(1)}%
                            </span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded shadow-sm border ${badgeBg}`}>
                              {d > 0 ? "+" : ""}{d.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })()}
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

      {/* ========================================== */}
      {/* MODALES ENCAPSULADOS */}
      {/* ========================================== */}

      <ProductPickerModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSelect={handleAddProduct}
        existingSapCodes={productos.map(p => p.Codigo)}
      />

      <CustomerCreateModal
        isOpen={isCustomerCreateOpen}
        onClose={() => setIsCustomerCreateOpen(false)}
        onSuccess={(newCustomer: Customer) => {
          setCustomer(newCustomer);
          setIsCustomerCreateOpen(false);
        }}
      />

      <CustomerSelectModal
        isOpen={isCustomerSelectOpen}
        onClose={() => setIsCustomerSelectOpen(false)}
        onSelect={(selectedCustomer: Customer) => {
          setCustomer(selectedCustomer);
          setIsCustomerSelectOpen(false);
        }}
      />
      
      <VersionModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        onConfirm={handleSaveNuevaVersion}
        isSaving={isSaving}
      />

    </main>
  );
}

export default function SimulatorPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-text-muted">Iniciando simulador...</div>}>
       <SimulatorContent />
    </Suspense>
  );
}