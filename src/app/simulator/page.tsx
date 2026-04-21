"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Trash2, Search, UserPlus, Save, Building2, Calendar, DollarSign, Briefcase, Loader2, Clock } from "lucide-react";
import { ProductPickerModal, type DBProduct } from "@/components/ProductPickerModal";
import { CustomerCreateModal } from "@/components/CustomerCreateModal";
import { CustomerSelectModal, type Customer } from "@/components/CustomerSelectModal";
import { VersionModal, type VersionOption } from "@/components/VersionModal";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useNavigationBlocker } from "@/contexts/NavigationBlockerContext";

type Producto = {
  row_id: string;
  Codigo: string;
  Descripcion: string;
  Costo_Mp: number;
  product_id?: string;
  _hasPriceList?: boolean;
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
  const { isDirty, setIsDirty } = useNavigationBlocker();
  
  const [originalSimulation, setOriginalSimulation] = useState<any>(null);
  const [versionTypeDisplay, setVersionTypeDisplay] = useState<{type: string, originalId: string} | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  
  // ==========================================
  // ESTADOS DE SIMULADOR
  // ==========================================
  const [productos, setProductos] = useState<Producto[]>([]);
  const [inputs, setInputs] = useState<Record<string, Inputs>>({});
  const [margenObjetivo, setMargenObjetivo] = useState<number>(65);
  
  // ==========================================
  // ESTADOS DE METADATA (CABECERA)
  // ==========================================
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [simulationStatus, setSimulationStatus] = useState("DRAFT");
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
  // AUTOSAVE STATES
  // ==========================================
  const [autosavedDraftId, setAutosavedDraftId] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<"IDLE" | "SAVING" | "SAVED" | "ERROR">("IDLE");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDraftResumeModalOpen, setIsDraftResumeModalOpen] = useState(false);
  const [foundDraftId, setFoundDraftId] = useState<string | null>(null);

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
           setSimulationStatus(sim.status || "DRAFT");
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
              const r_id = crypto.randomUUID();
              newProds.push({
                 row_id: r_id,
                 Codigo: l.sap_code,
                 Descripcion: l.description || "",
                 Costo_Mp: l.cost_mp || 0,
                 product_id: l.product_id,
                 _hasPriceList: (l.list_price || 0) > 0
              });
              
              newInputs[r_id] = {
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

    const row_id = crypto.randomUUID();
    const newProduct: Producto = {
      row_id,
      Codigo: dbProduct.sap_code,
      Descripcion: dbProduct.description,
      Costo_Mp: bomData?.recalculated_cost_mp || 0,
      product_id: dbProduct.id,
      _hasPriceList: foundPrice,
    };

    setProductos((prev) => [...prev, newProduct]);
    setIsDirty(true);

    if (foundPrice) {
      setInputs((prev) => ({
        ...prev,
        [row_id]: {
          ...prev[row_id],
          precio: listPrice,
        },
      }));
    }
  }

  function handleRemoveProduct(row_id: string) {
    setProductos((prev) => prev.filter((p) => p.row_id !== row_id));
    const newInputs = { ...inputs };
    delete newInputs[row_id];
    setInputs(newInputs);
    setIsDirty(true);
  }

  function updateInput(row_id: string, field: keyof Inputs, value: number) {
    setInputs((prev) => ({
      ...prev,
      [row_id]: {
        ...prev[row_id],
        [field]: value,
      },
    }));
    setIsDirty(true);
  }

  function calcularLinea(p: Producto) {
    const precioDisplay = Number(inputs[p.row_id]?.precio || 0);
    const descuento = Number(inputs[p.row_id]?.descuento || 0);
    const cantidad = Number(inputs[p.row_id]?.cantidad || 0);

    const ingresoBrutoDisplay = precioDisplay * cantidad;
    const ingresoNetoDisplay = ingresoBrutoDisplay * (1 - descuento / 100);
    
    // Convert to COP if needed
    const isUSD = currency === "USD";
    const trmValue = Number(trm) || 0;
    
    const ingresoNetoCop = isUSD ? ingresoNetoDisplay * trmValue : ingresoNetoDisplay;
    const costoTotalCop = p.Costo_Mp * cantidad;
    const contribucionCop = ingresoNetoCop - costoTotalCop;
    const margen = ingresoNetoCop > 0 ? (contribucionCop / ingresoNetoCop) * 100 : 0;

    return { 
      ingresoBrutoDisplay, 
      ingresoNetoDisplay, 
      ingresoNetoCop,
      costoTotalCop, 
      contribucionCop, 
      margen, 
      precioDisplay, 
      descuento, 
      cantidad 
    };
  }

  const resumen = useMemo(() => {
    let ingresoNetoTotalCop = 0;
    let costoTotalTotalCop = 0;
    let contribucionTotalCop = 0;

    for (const p of productos) {
      const r = calcularLinea(p);
      ingresoNetoTotalCop += r.ingresoNetoCop;
      costoTotalTotalCop += r.costoTotalCop;
      contribucionTotalCop += r.contribucionCop;
    }

    const margenTotal =
      ingresoNetoTotalCop > 0 ? (contribucionTotalCop / ingresoNetoTotalCop) * 100 : 0;

    return { ingresoNetoTotalCop, costoTotalTotalCop, contribucionTotalCop, margenTotal };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos, inputs, currency, trm]);

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
    if (currency === "USD" && (!trm || Number(trm) <= 0)) {
      setSaveError("Debes ingresar una TRM acordada para simular en USD");
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
          list_price: lineVars.precioDisplay,
          discount_pct: lineVars.descuento,
          net_price: lineVars.ingresoNetoDisplay / (lineVars.cantidad || 1) || 0, // precio unitario neto
          cost_mp: p.Costo_Mp,
          margin_pct: lineVars.margen,
          contribution_value: lineVars.contribucionCop
        };
      });

      const { error: linesError } = await supabase
        .from("simulation_lines")
        .insert(linesPayload);

      if (linesError) throw linesError;

      setSaveSuccess(true);
      setIsDirty(false);
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
    if (currency === "USD" && (!trm || Number(trm) <= 0)) {
      setSaveError("Debes ingresar una TRM acordada para simular en USD");
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
        status: "VIGENTE"
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
           
        const precioDisplay = Number(inputs[p.row_id]?.precio || 0);
        const descuento = Number(inputs[p.row_id]?.descuento || 0);
        const cantidad = Number(inputs[p.row_id]?.cantidad || 0);

        const ingresoBrutoDisplay = precioDisplay * cantidad;
        const ingresoNetoDisplay = ingresoBrutoDisplay * (1 - descuento / 100);
        
        const isUSD = currency === "USD";
        const trmValue = Number(trm) || 0;
        const ingresoNetoCop = isUSD ? ingresoNetoDisplay * trmValue : ingresoNetoDisplay;

        const costoTotalCop = mpToUse * cantidad;
        const contribucionCop = ingresoNetoCop - costoTotalCop;
        const margen = ingresoNetoCop > 0 ? (contribucionCop / ingresoNetoCop) * 100 : 0;

        return {
          simulation_id: newSimId,
          product_id: p.product_id || null,
          sap_code: p.Codigo,
          description: p.Descripcion,
          qty: cantidad,
          list_price: precioDisplay,
          discount_pct: descuento,
          net_price: ingresoNetoDisplay / (cantidad || 1) || 0,
          cost_mp: mpToUse,
          margin_pct: margen,
          contribution_value: contribucionCop
        };
      });

      const { error: linesError } = await supabase.from("simulation_lines").insert(linesPayload);
      if (linesError) throw linesError;

      // UPDATE OLD SIM TO RENOVADA
      await supabase.from("simulations").update({ status: 'RENOVADA' }).eq("id", editId);

      // 4. Crear el enlace de versión
      const { error: verError } = await supabase.from("simulation_versions").insert({
        original_simulation_id: editId,
        renewed_simulation_id: newSimId
      });
      if (verError) throw verError;

      setIsVersionModalOpen(false);
      setIsDirty(false);
      // Re-encaminar silensiosamente al nuevo id clonado
      router.push(`/simulator?id=${newSimId}`);

    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || "Ocurrió un error clonando/actualizando la simulación.");
    } finally {
      setIsSaving(false);
    }
  }

  // Clean up isDirty on unmount (e.g. if navigated away programmatically)
  useEffect(() => {
    return () => setIsDirty(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================
  // DRAFT RESUME CHECK (On Mount)
  // ==========================================
  useEffect(() => {
    if (editId) return; // If we are explicitly loading an ID, ignore drafts

    let isMounted = true;
    async function checkDrafts() {
      const { data, error } = await supabase
        .from("simulations")
        .select("id, updated_at")
        .eq("status", "DRAFT")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Only prompt if a draft exists and has content
      if (data && isMounted) {
        // Option text based on dates
        setFoundDraftId(data.id);
        setIsDraftResumeModalOpen(true);
      }
    }
    
    checkDrafts();
    return () => { isMounted = false; };
  }, [editId, supabase]);

  // ==========================================
  // DEBOUNCED AUTOSAVE EFFECT
  // ==========================================
  useEffect(() => {
    // Only autosave if there are actual modifications
    if (!isDirty) return;
    
    // Conditions to trigger an autosave
    if (!customer) return; // Must have customer
    if (productos.length === 0) return; // Must have at least 1 product
    if (currency === "USD" && (!trm || Number(trm) <= 0)) return; // Must have valid TRM

    const timerLabel = setTimeout(async () => {
      setAutosaveStatus("SAVING");
      
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
          updated_at: new Date().toISOString()
        };

        let targetSimId = editId || autosavedDraftId;

        if (targetSimId) {
          // UPDATE Existing
          await supabase.from("simulations").update(headerPayload).eq("id", targetSimId);
          // Delete old lines
          await supabase.from("simulation_lines").delete().eq("simulation_id", targetSimId);
        } else {
          // CREATE New Draft
          const { data, error } = await supabase.from("simulations").insert({ ...headerPayload, status: "DRAFT" }).select().single();
          if (error) throw error;
          targetSimId = data.id;
          setAutosavedDraftId(targetSimId);
          // Overwrite browser URL history slowly behind the scenes? 
          // Not necessary if we rely on autosavedDraftId locally
        }

        // Insert fresh lines
        const linesPayload = productos.map(p => {
          const lineVars = calcularLinea(p);
          return {
            simulation_id: targetSimId,
            product_id: p.product_id || null,
            sap_code: p.Codigo,
            description: p.Descripcion,
            qty: lineVars.cantidad,
            list_price: lineVars.precioDisplay,
            discount_pct: lineVars.descuento,
            net_price: lineVars.ingresoNetoDisplay / (lineVars.cantidad || 1) || 0,
            cost_mp: p.Costo_Mp,
            margin_pct: lineVars.margen,
            contribution_value: lineVars.contribucionCop
          };
        });

        await supabase.from("simulation_lines").insert(linesPayload);

        const now = new Date();
        setLastSavedAt(now);
        setAutosaveStatus("SAVED");
        setIsDirty(false); // Reset dirty flag because changes are persisted
      } catch (err) {
        console.error("Autosave failed", err);
        setAutosaveStatus("ERROR");
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timerLabel);
  }, [
    isDirty, customer, productos, inputs, simulationType, projectName,
    currency, trm, validFrom, validTo, editId, autosavedDraftId, supabase, setIsDirty, simulationStatus
  ]);

  async function handleConfirmar() {
    const targetId = editId || autosavedDraftId;
    if (!targetId || !customer || productos.length === 0 || !validFrom || !validTo) return;
    if (currency === "USD" && (!trm || Number(trm) <= 0)) {
      setSaveError("Debes ingresar una TRM acordada para simular en USD");
      return;
    }
    
    setIsSaving(true);
    setSaveError("");
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
        status: "VIGENTE",
        updated_at: new Date().toISOString()
      };

      await supabase.from("simulations").update(headerPayload).eq("id", targetId);
      await supabase.from("simulation_lines").delete().eq("simulation_id", targetId);

      const linesPayload = productos.map(p => {
        const lineVars = calcularLinea(p);
        return {
          simulation_id: targetId,
          product_id: p.product_id || null,
          sap_code: p.Codigo,
          description: p.Descripcion,
          qty: lineVars.cantidad,
          list_price: lineVars.precioDisplay,
          discount_pct: lineVars.descuento,
          net_price: lineVars.ingresoNetoDisplay / (lineVars.cantidad || 1) || 0,
          cost_mp: p.Costo_Mp,
          margin_pct: lineVars.margen,
          contribution_value: lineVars.contribucionCop
        };
      });

      await supabase.from("simulation_lines").insert(linesPayload);
      
      setSimulationStatus("VIGENTE");
      setIsDirty(false); // Clean state natively
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err.message || "Error al confirmar la simulación.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell title="Simulador Comercial">
      <div className="mx-auto w-full selection:bg-brand-primary selection:text-white pb-32">
      
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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">Simulador de Negocio</h1>
              
              {/* Autosave Indicator */}
              <div className="flex items-center gap-1.5 opacity-60 text-xs font-medium">
                {autosaveStatus === "SAVING" && (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" /><span className="text-brand-primary">Guardando...</span></>
                )}
                {autosaveStatus === "SAVED" && lastSavedAt && (
                  <><Clock className="w-3.5 h-3.5 text-emerald-600" /><span className="text-emerald-700">Guardado a las {lastSavedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></>
                )}
              </div>
            </div>
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
                {formatMoney(resumen.ingresoNetoTotalCop)} <span className="text-xs font-normal text-text-muted">(COP)</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-text-muted mb-1">Costo Total</div>
              <div className="text-lg font-semibold tracking-tight">
                {formatMoney(resumen.costoTotalTotalCop)} <span className="text-xs font-normal text-text-muted">(COP)</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-text-muted mb-1">Contribución</div>
              <div
                className={`text-lg font-semibold tracking-tight inline-flex items-center gap-1 ${
                  resumen.contribucionTotalCop < 0 ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {formatMoney(resumen.contribucionTotalCop)} <span className="text-xs font-normal text-text-muted">(COP)</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-text-muted mb-1">Margen %</div>
              <div
                className={`text-lg font-semibold tracking-tight inline-flex items-center gap-1 ${
                  resumen.margenTotal >= margenObjetivo ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {resumen.margenTotal.toFixed(1)}%
              </div>
              {productos.length > 0 && (
                <div className={`mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1 border ${
                  resumen.margenTotal >= margenObjetivo
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${resumen.margenTotal >= margenObjetivo ? "bg-emerald-500" : "bg-red-500"}`} />
                  {resumen.margenTotal >= margenObjetivo ? "Meta cumplida" : "Por debajo de meta"}
                </div>
              )}
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
            {simulationStatus === "DRAFT" && (
              <button
                onClick={handleConfirmar}
                disabled={!(editId || autosavedDraftId) || !customer || productos.length === 0 || !validFrom || !validTo || isSaving}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-500 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title={(!(editId || autosavedDraftId) || !customer || productos.length === 0 || !validFrom || !validTo) ? "Completa cliente, productos y fechas para activar" : ""}
              >
                Confirmar / Activar
              </button>
            )}
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
              onChange={e => { setProjectName(e.target.value); setIsDirty(true); }}
              className="w-full border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm transition-all"
            />
          </div>

          <div className="col-span-1">
            <label className="block text-sm font-medium text-text-primary mb-1.5">Tipo de negociación</label>
            <select 
              value={simulationType}
              onChange={e => { setSimulationType(e.target.value); setIsDirty(true); }}
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
              onChange={e => { setCurrency(e.target.value); setIsDirty(true); }}
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
                 onChange={e => { setTrm(Number(e.target.value)); setIsDirty(true); }}
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
              onChange={e => { setValidFrom(e.target.value); setIsDirty(true); }}
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
               onChange={e => { setValidTo(e.target.value); setIsDirty(true); }}
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
              onChange={(e) => { setMargenObjetivo(Number(e.target.value)); setIsDirty(true); }}
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
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-border-subtle">
              <tr>
                <th className="px-4 py-4 text-left font-semibold text-text-primary">Código SAP</th>
                <th className="px-4 py-4 text-left font-semibold text-text-primary">Descripción</th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary">
                  Costo Unitario <span className="text-xs text-text-muted font-normal block">(COP)</span>
                </th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary whitespace-nowrap">
                  Precio Lista <span className="text-xs text-text-muted font-normal block">({currency})</span>
                </th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary whitespace-nowrap">% Desc</th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary whitespace-nowrap">
                  Precio Neto <span className="text-xs text-text-muted font-normal block">({currency})</span>
                </th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary">Cantidad</th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary whitespace-nowrap">
                  Ingreso Neto <span className="text-xs text-text-muted font-normal block">({currency})</span>
                </th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary whitespace-nowrap">
                  Costo Total <span className="text-xs text-text-muted font-normal block">(COP)</span>
                </th>
                <th className="px-4 py-4 text-right font-semibold text-text-primary">
                  Contribución <span className="text-xs text-text-muted font-normal block">(COP)</span>
                </th>
                <th className="px-4 py-4 text-center font-semibold text-text-primary whitespace-nowrap">Margen & Δ</th>
                <th className="px-4 py-4 text-center w-12 font-semibold text-text-primary"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border-subtle">
              {productos.map((p) => {
                const r = calcularLinea(p);

                return (
                  <tr key={p.row_id} className="group hover:bg-slate-50/40 transition-colors">
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
                        {formatMoney(r.precioDisplay)}
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
                        value={inputs[p.row_id]?.descuento ?? ""}
                        onChange={(e) =>
                          updateInput(p.row_id, "descuento", Number(e.target.value))
                        }
                        placeholder="0"
                      />
                    </td>

                    <td className="px-4 py-4 text-right align-middle">
                      <div className="font-semibold text-text-primary">
                        {formatMoney(r.precioDisplay * (1 - r.descuento / 100))}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right align-middle">
                      <input
                        type="number"
                        min="0"
                        className="w-24 border border-border-subtle rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-sm bg-white shadow-sm"
                        value={inputs[p.row_id]?.cantidad ?? ""}
                        onChange={(e) =>
                          updateInput(p.row_id, "cantidad", Number(e.target.value))
                        }
                        placeholder="0"
                      />
                    </td>

                    <td className="px-4 py-4 text-right font-semibold text-text-primary align-middle">
                      {formatMoney(r.ingresoNetoDisplay)}
                    </td>

                    <td className="px-4 py-4 text-right text-text-muted align-middle">
                      {formatMoney(r.costoTotalCop)}
                    </td>

                    <td
                      className={`px-4 py-4 text-right font-medium align-middle ${
                        r.contribucionCop < 0 ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {formatMoney(r.contribucionCop)}
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
                         onClick={() => handleRemoveProduct(p.row_id)}
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
          setIsDirty(true);
          setIsCustomerCreateOpen(false);
        }}
      />

      <CustomerSelectModal
        isOpen={isCustomerSelectOpen}
        onClose={() => setIsCustomerSelectOpen(false)}
        onSelect={(selectedCustomer: Customer) => {
          setCustomer(selectedCustomer);
          setIsDirty(true);
          setIsCustomerSelectOpen(false);
        }}
      />
      
      <VersionModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        onConfirm={handleSaveNuevaVersion}
        isSaving={isSaving}
      />

      {/* ========================================== */}
      {/* MODAL DE BORRADOR ENCONTRADO               */}
      {/* ========================================== */}
      {isDraftResumeModalOpen && foundDraftId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-border-subtle overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 pt-6 pb-4 border-b border-border-subtle">
              <h2 className="text-base font-semibold text-text-primary leading-tight">
                Borrador encontrado
              </h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-text-muted leading-relaxed">
                Encontramos una simulación en borrador guardada automáticamente. ¿Deseas continuar editándola?
              </p>
            </div>
            <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => {
                  setIsDraftResumeModalOpen(false);
                  setFoundDraftId(null);
                }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-white border border-border-subtle hover:bg-slate-50 transition-all"
              >
                Empezar nueva simulación
              </button>
              <button
                onClick={() => {
                  setIsDraftResumeModalOpen(false);
                  router.push(`/simulator?id=${foundDraftId}`);
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-primary hover:bg-brand-accent transition-all shadow-sm"
              >
                Continuar borrador
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </AppShell>
  );
}

export default function SimulatorPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-text-muted">Iniciando simulador...</div>}>
       <SimulatorContent />
    </Suspense>
  );
}