"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Menu, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSidebar } from "@/contexts/SidebarContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTableDensity } from "@/contexts/TableDensityContext";
import { Sun, Moon, Monitor, Columns2, LayoutList, AlignJustify } from "lucide-react";
import { GlobalSearchModal } from "./GlobalSearchModal";

export function Topbar({ title, subtitle }: { title?: string; subtitle?: string }) {
  const [userName, setUserName] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState<string>("U");
  const router = useRouter();
  const supabase = createClient();
  const { toggleMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { density, setDensity } = useTableDensity();
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [densityMenuOpen, setDensityMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (theme === "system") {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    } else {
      setIsDark(theme === "dark");
    }
  }, [theme]);

  const logoSrc = isDark ? "/brand/firplak-logo-dark.png" : "/brand/firplak-logo-light.png";

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("Usuarios_MarginOS")
            .select("nombre")
            .eq("uuid", user.id)
            .single();

          let name = user.email ?? null;
          if (data && data.nombre) {
            name = data.nombre;
          }
          setUserName(name);
          if (name) {
            const parts = name.split(" ");
            setUserInitials(parts.slice(0, 2).map(p => p[0]).join("").toUpperCase() || "U");
          }
        }
      } catch (err: any) {
        // Supabase auth lock race condition — another concurrent request took the lock; ignore silently
        if (err?.name === "AbortError" || err?.message?.includes("Lock was released")) return;
        console.error("Topbar fetchUser error:", err);
      }
    };
    fetchUser();
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header 
      className="sticky top-0 z-50 w-full h-14 flex items-center gap-3.5 px-6 transition-colors duration-200"
      style={{
        background: "var(--glass-tint)",
        WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturation))",
        backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturation))",
        borderBottom: "0.5px solid var(--border-hair)",
      }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={toggleMobile}
        className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} />
      </button>

      {/* Mobile logo — shown when there's no desktop sidebar */}
      <div className="flex md:hidden items-center">
        <Link href="/">
          <Image
            src={logoSrc}
            alt="FIRPLAK"
            width={120}
            height={36}
            className="max-h-9 max-w-[120px] object-contain"
            priority
          />
        </Link>
      </div>

      {/* Page title & subtitle */}
      <div className="flex-col min-w-0 hidden md:flex">
        <div className="flex items-baseline gap-3">
          {title ? (
            <span className="font-medium text-base text-[color:var(--fg-primary)] tracking-[-0.012em] leading-tight">
              {title}
            </span>
          ) : null}
          {subtitle && (
            <span className="font-mono font-medium text-[11px] leading-none text-text-muted">{subtitle}</span>
          )}
        </div>
      </div>

      <div className="flex-1" />

      {/* Command-K search (Triggers Modal) */}
      <button
        onClick={() => setIsSearchOpen(true)}
        className="hidden md:inline-flex items-center gap-2.5 h-9 px-3 min-w-[280px] bg-[color:var(--bg-elevated)] rounded-full text-[color:var(--fg-muted)] font-sans font-normal text-[13px] leading-none cursor-pointer hover:[border-color:var(--blue-green)] transition-colors [border:0.5px_solid_var(--border-hair)]"
      >
        <Search className="w-3.5 h-3.5" strokeWidth={1.75} />
        <span className="flex-1 text-left">Buscar simulación, cliente, SAP…</span>
        <span className="inline-flex gap-1">
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-[5px] bg-[rgba(116,144,148,0.10)] font-mono font-medium text-[10px] leading-none text-[color:var(--fg-muted)] [border:0.5px_solid_var(--border-hair)]">⌘</span>
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-[5px] bg-[rgba(116,144,148,0.10)] font-mono font-medium text-[10px] leading-none text-[color:var(--fg-muted)] [border:0.5px_solid_var(--border-hair)]">K</span>
        </span>
      </button>

      <div className="w-px h-6 bg-[color:var(--border-hair)] hidden md:block" />

      {/* Density Switcher */}
      <div className="relative hidden md:block">
        <button
          onClick={() => setDensityMenuOpen(!densityMenuOpen)}
          className="w-9 h-9 rounded-full bg-[color:var(--bg-elevated)] text-[color:var(--fg-muted)] cursor-pointer inline-flex items-center justify-center hover:bg-[color:var(--bg-hover)] hover:text-[color:var(--fg-primary)] transition-colors [border:0.5px_solid_var(--border-hair)]"
          title="Densidad de Tablas"
        >
          {density === "compact" ? <AlignJustify className="w-3.5 h-3.5" strokeWidth={1.75} /> : density === "normal" ? <LayoutList className="w-3.5 h-3.5" strokeWidth={1.75} /> : <Columns2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
        </button>
        
        {densityMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setDensityMenuOpen(false)}></div>
            <div className="absolute right-0 mt-2 w-36 bg-surface-card border border-border-subtle rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] py-1 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => { setDensity("compact"); setDensityMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${density === "compact" ? "bg-surface-hover text-brand-primary font-medium" : "text-text-primary hover:bg-surface-hover"}`}
              >
                <AlignJustify className="h-4 w-4" strokeWidth={1.75} /> Compacto
              </button>
              <button
                onClick={() => { setDensity("normal"); setDensityMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${density === "normal" ? "bg-surface-hover text-brand-primary font-medium" : "text-text-primary hover:bg-surface-hover"}`}
              >
                <LayoutList className="h-4 w-4" strokeWidth={1.75} /> Normal
              </button>
              <button
                onClick={() => { setDensity("comodo"); setDensityMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${density === "comodo" ? "bg-surface-hover text-brand-primary font-medium" : "text-text-primary hover:bg-surface-hover"}`}
              >
                <Columns2 className="h-4 w-4" strokeWidth={1.75} /> Cómodo
              </button>
            </div>
          </>
        )}
      </div>

      {/* Theme Switcher */}
      <div className="relative">
        <button
          onClick={() => setThemeMenuOpen(!themeMenuOpen)}
          className="w-9 h-9 rounded-full bg-[color:var(--bg-elevated)] text-[color:var(--fg-muted)] cursor-pointer inline-flex items-center justify-center hover:bg-[color:var(--bg-hover)] hover:text-[color:var(--fg-primary)] transition-colors [border:0.5px_solid_var(--border-hair)]"
          title={`Tema: ${theme}`}
        >
          {theme === "light" ? <Sun className="w-3.5 h-3.5" strokeWidth={1.75} /> : theme === "dark" ? <Moon className="w-3.5 h-3.5" strokeWidth={1.75} /> : <Monitor className="w-3.5 h-3.5" strokeWidth={1.75} />}
        </button>
        
        {themeMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setThemeMenuOpen(false)}></div>
            <div className="absolute right-0 mt-2 w-36 bg-surface-card border border-border-subtle rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] py-1 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => { setTheme("light"); setThemeMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${theme === "light" ? "bg-surface-hover text-brand-primary font-medium" : "text-text-primary hover:bg-surface-hover"}`}
              >
                <Sun className="h-4 w-4" strokeWidth={1.75} /> Claro
              </button>
              <button
                onClick={() => { setTheme("dark"); setThemeMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${theme === "dark" ? "bg-surface-hover text-brand-primary font-medium" : "text-text-primary hover:bg-surface-hover"}`}
              >
                <Moon className="h-4 w-4" strokeWidth={1.75} /> Oscuro
              </button>
              <button
                onClick={() => { setTheme("system"); setThemeMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${theme === "system" ? "bg-surface-hover text-brand-primary font-medium" : "text-text-primary hover:bg-surface-hover"}`}
              >
                <Monitor className="h-4 w-4" strokeWidth={1.75} /> Automático
              </button>
            </div>
          </>
        )}
      </div>

      {/* User chip */}
      <div 
        className="hidden sm:inline-flex items-center gap-2 p-[4px_14px_4px_4px] bg-[color:var(--bg-elevated)] rounded-full hover:shadow-[var(--shadow-md)] transition-shadow cursor-pointer relative group [border:0.5px_solid_var(--border-hair)]"
      >
        <span className="w-7 h-7 rounded-full bg-[color:var(--navy)] text-[color:var(--bone)] inline-flex items-center justify-center font-sans font-medium text-[11px] leading-none">
          {userInitials}
        </span>
        <span className="font-sans font-semibold text-[12px] leading-[1.2] text-text-primary truncate max-w-[150px]">
          {userName || "..."}
        </span>
        
        {/* Simple hover dropdown for logout */}
        <div className="absolute top-full right-0 mt-2 w-36 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999]">
          <div className="bg-surface-card border border-border-subtle rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] p-1 overflow-hidden">
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.75} /> Salir
            </button>
          </div>
        </div>
      </div>
      
      {/* Logout button visible on mobile */}
      <button
        onClick={handleLogout}
        className="sm:hidden inline-flex items-center justify-center p-2 rounded-lg text-text-muted hover:bg-surface-hover hover:text-red-600 transition-colors"
        title="Cerrar sesión"
      >
        <LogOut className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}
