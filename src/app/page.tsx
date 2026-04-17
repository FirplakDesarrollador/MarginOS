"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Calculator, FileSpreadsheet, Settings, PieChart, Plus } from "lucide-react";
import { DashboardHeader, StatCard, ActionCard } from "@/components/dashboard-ui";

type ProductoNivel1 = {
  Codigo: string;
  Descripcion: string;
  Costo_Mp: number;
};

type BomPayload = {
  source: string;
  fileName: string | null;
  savedAt: string; // ISO
  productos: ProductoNivel1[];
};

type TrmPayload = {
  trm: number;
  currency: "USD" | "COP";
  savedAt: string; // ISO
};

type ScenarioPayload = {
  id: string;
  name?: string;
  createdAt: string; // ISO
};

export default function Home() {
  const actions = [
    {
      icon: Calculator,
      title: "Simular Negocio",
      description: "Motor de precios multi-producto y análisis de márgenes en tiempo real.",
      href: "/simulator",
    },
    {
      icon: FileSpreadsheet,
      title: "Importar BOM",
      description: "Carga masiva de estructuras de costos desde Excel (SAP Export).",
      href: "/import",
    },
    {
      icon: Settings,
      title: "Costos Reales",
      description: "Gestión maestra de costos MP y overrides manuales.",
      href: "/admin/costs",
    },
    {
      icon: PieChart,
      title: "Escenarios",
      description: "Histórico de simulaciones y comparativa de versiones.",
      href: "/scenarios",
    },
  ];

  const [bomLabel, setBomLabel] = useState<string>("—");
  const [trmLabel, setTrmLabel] = useState<string>("—");
  const [scenariosThisMonth, setScenariosThisMonth] = useState<string>("—");

  const formatMoney = useMemo(() => {
    return (value: number) =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
  }, []);

  useEffect(() => {
    // 1) BOM
    try {
      const stored = localStorage.getItem("marginos:last_bom_import");
      if (stored) {
        const parsed: BomPayload = JSON.parse(stored);
        const date = parsed.savedAt ? new Date(parsed.savedAt) : null;
        const dateStr = date
          ? date.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "2-digit" })
          : "";
        const name = parsed.fileName ? parsed.fileName : "BOM cargado";
        setBomLabel(dateStr ? `${name} · ${dateStr}` : name);
      } else {
        setBomLabel("—");
      }
    } catch {
      setBomLabel("—");
    }

    // 2) TRM (lo usaremos cuando guardes TRM; por ahora queda —)
    try {
      const stored = localStorage.getItem("marginos:last_trm");
      if (stored) {
        const parsed: TrmPayload = JSON.parse(stored);
        const trm = Number(parsed.trm || 0);
        setTrmLabel(trm > 0 ? formatMoney(trm) : "—");
      } else {
        setTrmLabel("—");
      }
    } catch {
      setTrmLabel("—");
    }

    // 3) Escenarios del mes (si luego guardamos escenarios en localStorage)
    try {
      const stored = localStorage.getItem("marginos:scenarios");
      if (stored) {
        const list: ScenarioPayload[] = JSON.parse(stored);
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const count = Array.isArray(list)
          ? list.filter((s) => {
              const d = new Date(s.createdAt);
              return d >= start && d <= now;
            }).length
          : 0;

        setScenariosThisMonth(String(count));
      } else {
        setScenariosThisMonth("—");
      }
    } catch {
      setScenariosThisMonth("—");
    }
  }, [formatMoney]);

  return (
    <main className="min-h-screen bg-surface-bg selection:bg-brand-primary selection:text-white pb-20">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-brand-accent/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-brand-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-8">
        <DashboardHeader />

        <div className="space-y-12">
          {/* Hero / Welcome Section */}
          <div className="space-y-6 max-w-4xl">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-brand-primary">
                Simulador de Precios y Margen
              </h1>
              <p className="text-xl text-text-muted font-normal leading-relaxed text-balance">
                Evalúa negocios multi-producto con análisis de margen bruto sobre costo de materia prima (MP).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/simulator"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white bg-brand-primary rounded-2xl hover:bg-brand-accent transition-all duration-300 shadow-lg shadow-brand-primary/20 hover:shadow-brand-accent/40 hover:-translate-y-0.5 gap-2"
              >
                <Plus className="w-5 h-5" />
                Simular Negocio
              </Link>

              <Link
                href="/import"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-text-primary bg-white border border-border-subtle rounded-2xl hover:bg-slate-50 transition-all duration-200 hover:border-brand-accent/30"
              >
                <FileSpreadsheet className="w-5 h-5 mr-2 text-text-muted" />
                Importar BOM (SAP)
              </Link>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Escenarios creados (mes)" value={scenariosThisMonth} />
            <StatCard label="Último BOM cargado" value={bomLabel} />
            <StatCard label="TRM Reciente" value={trmLabel} />
          </div>

          {/* Shortcuts Grid */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Accesos Directos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {actions.map((action, index) => (
                <ActionCard key={index} {...action} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}