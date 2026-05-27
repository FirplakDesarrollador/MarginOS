"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Calculator,
  FileSpreadsheet,
  Settings,
  PieChart,
  Tag,
  Package,
  Store,
  BarChart3,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  BadgeDollarSign,
} from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useEffect, useState } from "react";

const navGroups = [
  {
    title: "Operación Comercial",
    items: [
      { icon: BarChart3, title: "Executive KPI Dashboard", href: "/" },
      { icon: Calculator, title: "Simular Negocio", href: "/simulator" },
      { icon: PieChart, title: "Escenarios", href: "/scenarios" },
      { icon: Users, title: "Clientes", href: "/customers" },
    ],
  },
  {
    title: "Maestros",
    items: [
      { icon: FileSpreadsheet, title: "Importar BOM", href: "/import" },
      { icon: Settings, title: "Costos Reales", href: "/admin/costs" },
      { icon: Package, title: "Productos", href: "/products" },
      { icon: BadgeDollarSign, title: "Pricing Manager", href: "/pricing-manager" },
      { icon: Tag, title: "Listas de Precios", href: "/price-lists" },
      { icon: Store, title: "Canales de Venta", href: "/sales-channels" },
    ],
  },
];

// ─── Desktop sidebar ───────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, isHovered, isExpanded, setIsCollapsed, setIsHovered } = useSidebar();
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (theme === "system") {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    } else {
      setIsDark(theme === "dark");
    }
  }, [theme]);

  const logoSrc = isDark ? "/brand/firplak-logo-dark.png" : "/brand/firplak-logo-light.png";

  const width = isExpanded ? 240 : 64;

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width,
        minWidth: width,
      }}
      className={[
        "hidden md:flex flex-col h-screen sticky top-0 z-40",
        "bg-surface-card border-r border-border-subtle shrink-0",
        "overflow-hidden transition-[width,min-width] duration-200 ease-out",
      ].join(" ")}
    >
      {/* Brand */}
      <div 
        className={[
          "flex items-center h-16 border-b border-border-subtle shrink-0",
          isExpanded ? "justify-between px-4" : "justify-center px-0"
        ].join(" ")}
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5 overflow-hidden transition-all duration-200">
            {isExpanded ? (
              <Image src={logoSrc} alt="FIRPLAK" width={120} height={36} className="max-h-9 max-w-[120px] object-contain" priority />
            ) : (
              <Image src={logoSrc} alt="FIRPLAK" width={28} height={28} className="max-h-7 max-w-7 object-contain" priority />
            )}
          </div>
          {isExpanded && (
            <div className="text-[10px] text-text-muted mt-1 opacity-60 font-medium pl-1">
              MarginOS v1.1.1
            </div>
          )}
        </div>
        
        {isExpanded && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-7 h-7 rounded-lg border border-transparent bg-transparent text-text-muted inline-flex items-center justify-center cursor-pointer hover:bg-surface-hover hover:text-text-primary transition-colors"
            aria-label="Colapsar"
          >
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav 
        className={[
          "flex-1 overflow-y-auto flex flex-col gap-4 scrollbar-thin",
          isExpanded ? "p-[14px_12px]" : "p-[12px_8px]"
        ].join(" ")}
      >
        {navGroups.map((group, i) => (
          <div key={i}>
            {isExpanded && (
              <div className="px-2.5 pb-1.5 pt-1 font-sans font-semibold text-[10px] leading-none tracking-[0.14em] uppercase text-text-muted opacity-70">
                {group.title}
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item, j) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={j}
                    href={item.href}
                    title={!isExpanded ? item.title : undefined}
                    className={[
                      "flex items-center gap-3 rounded-[11px] cursor-pointer border border-transparent w-full transition-all duration-200 ease-out text-left",
                      isExpanded ? "justify-start py-2 px-2.5" : "justify-center py-2.5 px-0",
                      isActive
                        ? "bg-[rgba(37,65,83,0.08)] text-brand-primary font-semibold"
                        : "bg-transparent text-text-muted font-medium hover:bg-surface-hover hover:text-text-primary",
                    ].join(" ")}
                  >
                    <item.icon
                      className={[
                        "shrink-0",
                        isExpanded ? "w-[16px] h-[16px]" : "w-[18px] h-[18px]",
                      ].join(" ")}
                      strokeWidth={isActive ? 2 : 1.75}
                    />
                    {isExpanded && (
                      <span className="truncate whitespace-nowrap text-[13px] leading-[1.2] tracking-[-0.004em]">
                        {item.title}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse-toggle when collapsed */}
      {!isExpanded && (
        <div className="border-t border-border-subtle p-2 flex justify-center">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-8 h-8 rounded-[9px] border border-[rgba(15,22,36,0.10)] bg-surface-card text-text-muted inline-flex items-center justify-center cursor-pointer hover:bg-surface-hover hover:text-text-primary transition-colors"
            aria-label="Expandir"
          >
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      )}
    </aside>
  );
}

// ─── Mobile drawer sidebar ─────────────────────────────────────────────────────
export function MobileSidebar() {
  const pathname = usePathname();
  const { isMobileOpen, closeMobile } = useSidebar();
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (theme === "system") {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    } else {
      setIsDark(theme === "dark");
    }
  }, [theme]);

  const logoSrc = isDark ? "/brand/firplak-logo-dark.png" : "/brand/firplak-logo-light.png";

  return (
    <>
      <div
        className={[
          "md:hidden fixed inset-0 z-40 bg-[rgba(10,13,20,0.5)] backdrop-blur-sm transition-opacity duration-200",
          isMobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={closeMobile}
      />

      <aside
        className={[
          "md:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col",
          "bg-surface-card border-r border-border-subtle shadow-xl",
          "transition-transform duration-200 ease-out",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Image src={logoSrc} alt="FIRPLAK" width={120} height={36} className="max-h-9 max-w-[120px] object-contain" priority />
          </div>
          <button
            onClick={closeMobile}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-[14px_12px] flex flex-col gap-4">
          {navGroups.map((group, i) => (
            <div key={i}>
              <div className="px-2.5 pb-1.5 pt-1 font-sans font-semibold text-[10px] leading-none tracking-[0.14em] uppercase text-text-muted opacity-70">
                {group.title}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item, j) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname?.startsWith(item.href));
                  return (
                    <Link
                      key={j}
                      href={item.href}
                      onClick={closeMobile}
                      className={[
                        "flex items-center gap-3 justify-start py-2 px-2.5 rounded-[11px] transition-all duration-200 ease-out",
                        isActive
                          ? "bg-[rgba(37,65,83,0.08)] text-brand-primary font-semibold"
                          : "bg-transparent text-text-muted font-medium hover:bg-surface-hover hover:text-text-primary",
                      ].join(" ")}
                    >
                      <item.icon
                        className="w-[16px] h-[16px] shrink-0"
                        strokeWidth={isActive ? 2 : 1.75}
                      />
                      <span className="text-[13px] leading-[1.2] tracking-[-0.004em]">{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
