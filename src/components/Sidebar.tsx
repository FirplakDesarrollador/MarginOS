"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Calculator, FileSpreadsheet, Settings, PieChart, Tag, Package, Store, LayoutDashboard, Users } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const navGroups = [
    {
      title: "Operación Comercial",
      items: [
        { icon: LayoutDashboard, title: "Inicio", href: "/" },
        { icon: Calculator, title: "Simular Negocio", href: "/simulator" },
        { icon: PieChart, title: "Escenarios", href: "/scenarios" },
        { icon: Users, title: "Clientes", href: "/customers" },
      ]
    },
    {
      title: "Maestros",
      items: [
        { icon: FileSpreadsheet, title: "Importar BOM", href: "/import" },
        { icon: Settings, title: "Costos Reales", href: "/admin/costs" },
        { icon: Package, title: "Productos", href: "/products" },
        { icon: Tag, title: "Listas de Precios", href: "/price-lists" },
        { icon: Store, title: "Canales de Venta", href: "/sales-channels" }
      ]
    }
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-[#f8fafc] border-r border-border-subtle flex flex-col h-screen sticky top-0 hidden md:flex z-40 relative">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <Image 
            src="/brand/firplak-logo.png" 
            alt="FIRPLAK" 
            width={120} 
            height={32} 
            className="h-8 w-auto mix-blend-multiply" 
            priority 
          />
        </div>
        <div className="mt-2 text-xs font-semibold tracking-tight text-text-primary px-1 opacity-70">
          MarginOS <span className="font-normal opacity-70 ml-1">v1.0</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 pb-6 space-y-6 scrollbar-thin mt-2">
        {navGroups.map((group, i) => (
          <div key={i}>
            <div className="mb-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-text-muted opacity-80">
              {group.title}
            </div>
            <div className="space-y-1">
              {group.items.map((item, j) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={j}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-brand-primary/[0.08] text-brand-primary"
                        : "text-text-muted hover:bg-slate-100 hover:text-text-primary hover:translate-x-0.5"
                    }`}
                  >
                    <item.icon className={`h-[18px] w-[18px] ${isActive ? "text-brand-primary" : "text-slate-400"}`} />
                    {item.title}
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
