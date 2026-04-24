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
  LayoutDashboard,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";

const navGroups = [
  {
    title: "Operación Comercial",
    items: [
      { icon: LayoutDashboard, title: "Inicio", href: "/" },
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
      { icon: Tag, title: "Listas de Precios", href: "/price-lists" },
      { icon: Store, title: "Canales de Venta", href: "/sales-channels" },
    ],
  },
];

// ─── Desktop sidebar ───────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, isHovered, isExpanded, setIsCollapsed, setIsHovered } =
    useSidebar();

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: isExpanded ? "15rem" : "4rem",
        minWidth: isExpanded ? "15rem" : "4rem",
      }}
      className={[
        // base
        "hidden md:flex flex-col h-screen sticky top-0 z-40",
        "bg-[#f8fafc] border-r border-border-subtle",
        "overflow-hidden transition-[width,min-width] duration-200 ease-in-out",
        "shadow-[1px_0_6px_-2px_rgba(0,0,0,0.07)]",
      ].join(" ")}
    >
      {/* ── Logo / brand ── */}
      <div className="flex items-center justify-between px-3 py-5 shrink-0">
        <div
          className={[
            "flex items-center gap-3 overflow-hidden",
            "transition-opacity duration-150",
            isExpanded ? "opacity-100" : "opacity-0 pointer-events-none w-0",
          ].join(" ")}
        >
          <Image
            src="/brand/firplak-logo.png"
            alt="FIRPLAK"
            width={110}
            height={28}
            className="h-7 w-auto mix-blend-multiply shrink-0"
            priority
          />
        </div>

        {/* Icon-only logo when collapsed */}
        {!isExpanded && (
          <div className="w-full flex justify-center">
            <Image
              src="/brand/firplak-logo.png"
              alt="FIRPLAK"
              width={28}
              height={28}
              className="h-7 w-7 object-contain mix-blend-multiply"
              priority
            />
          </div>
        )}

        {/* Collapse toggle — only visible when expanded (pinned or hovered) */}
        {isExpanded && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Version badge */}
      <div
        className={[
          "px-3 pb-3 shrink-0 transition-opacity duration-150",
          isExpanded ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <span className="text-[10px] font-semibold tracking-tight text-text-muted opacity-70 px-1">
          MarginOS <span className="font-normal opacity-70 ml-1">v1.0</span>
        </span>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-2 pb-6 space-y-5 mt-1 scrollbar-thin">
        {navGroups.map((group, i) => (
          <div key={i}>
            {/* Group label — hidden when collapsed */}
            <div
              className={[
                "mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-text-muted opacity-70 transition-opacity duration-150 whitespace-nowrap overflow-hidden",
                isExpanded ? "opacity-70" : "opacity-0",
              ].join(" ")}
            >
              {group.title}
            </div>

            <div className="space-y-0.5">
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
                      "flex items-center gap-3 px-2 py-2.5 text-sm font-medium rounded-xl transition-all duration-150",
                      isExpanded ? "" : "justify-center",
                      isActive
                        ? "bg-brand-primary/[0.08] text-brand-primary"
                        : "text-text-muted hover:bg-slate-100 hover:text-text-primary",
                    ].join(" ")}
                  >
                    <item.icon
                      className={[
                        "shrink-0",
                        isActive ? "text-brand-primary" : "text-slate-400",
                        isExpanded ? "h-[18px] w-[18px]" : "h-5 w-5",
                      ].join(" ")}
                    />
                    <span
                      className={[
                        "truncate transition-all duration-150 whitespace-nowrap overflow-hidden",
                        isExpanded
                          ? "opacity-100 max-w-[160px]"
                          : "opacity-0 max-w-0 pointer-events-none",
                      ].join(" ")}
                    >
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

// ─── Mobile drawer sidebar ─────────────────────────────────────────────────────
export function MobileSidebar() {
  const pathname = usePathname();
  const { isMobileOpen, closeMobile } = useSidebar();

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          "md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-200",
          isMobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={closeMobile}
      />

      {/* Drawer panel */}
      <aside
        className={[
          "md:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col",
          "bg-[#f8fafc] border-r border-border-subtle shadow-xl",
          "transition-transform duration-200 ease-in-out",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border-subtle">
          <Image
            src="/brand/firplak-logo.png"
            alt="FIRPLAK"
            width={110}
            height={28}
            className="h-7 w-auto mix-blend-multiply"
            priority
          />
          <button
            onClick={closeMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map((group, i) => (
            <div key={i}>
              <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-text-muted opacity-70">
                {group.title}
              </div>
              <div className="space-y-0.5">
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
                        "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-150",
                        isActive
                          ? "bg-brand-primary/[0.08] text-brand-primary"
                          : "text-text-muted hover:bg-slate-100 hover:text-text-primary",
                      ].join(" ")}
                    >
                      <item.icon
                        className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-brand-primary" : "text-slate-400"}`}
                      />
                      {item.title}
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
