"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSidebar } from "@/contexts/SidebarContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, Monitor } from "lucide-react";

export function Topbar({ title }: { title?: string }) {
  const [userName, setUserName] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const { toggleMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("Usuarios_MarginOS")
          .select("nombre")
          .eq("uuid", user.id)
          .single();

        if (data && data.nombre) {
          setUserName(data.nombre);
        } else {
          setUserName(user.email ?? null);
        }
      }
    };
    fetchUser();
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-surface-bg/80 backdrop-blur-md border-b border-border-subtle h-16 flex items-center px-4 md:px-6 shadow-sm gap-3 transition-colors duration-200">
      {/* Mobile hamburger */}
      <button
        onClick={toggleMobile}
        className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile logo — shown when there's no desktop sidebar */}
      <div className="flex md:hidden items-center">
        <Link href="/">
          <Image
            src="/brand/firplak-logo.png"
            alt="FIRPLAK"
            width={100}
            height={25}
            className="h-6 w-auto mix-blend-multiply"
            priority
          />
        </Link>
      </div>

      {/* Page title */}
      <div className="flex-1 flex items-center">
        {title ? (
          <h1 className="text-[17px] font-semibold tracking-tight text-text-primary hidden md:block border-l-2 border-brand-primary pl-3 ml-2">
            {title}
          </h1>
        ) : null}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Theme Switcher */}
        <div className="relative">
          <button
            onClick={() => setThemeMenuOpen(!themeMenuOpen)}
            className="inline-flex items-center justify-center p-2 rounded-full border border-border-subtle bg-surface-card text-text-muted hover:text-text-primary hover:bg-surface-hover transition duration-200 shadow-sm"
            title="Cambiar tema"
          >
            {theme === "light" ? <Sun className="h-[14px] w-[14px]" /> : theme === "dark" ? <Moon className="h-[14px] w-[14px]" /> : <Monitor className="h-[14px] w-[14px]" />}
          </button>
          
          {themeMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setThemeMenuOpen(false)}></div>
              <div className="absolute right-0 mt-2 w-36 bg-surface-card border border-border-subtle rounded-xl shadow-md py-1 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => { setTheme("light"); setThemeMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${theme === "light" ? "bg-surface-hover text-brand-primary font-medium" : "text-text-primary hover:bg-surface-hover"}`}
                >
                  <Sun className="h-4 w-4" /> Claro
                </button>
                <button
                  onClick={() => { setTheme("dark"); setThemeMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${theme === "dark" ? "bg-surface-hover text-brand-primary font-medium" : "text-text-primary hover:bg-surface-hover"}`}
                >
                  <Moon className="h-4 w-4" /> Oscuro
                </button>
                <button
                  onClick={() => { setTheme("system"); setThemeMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${theme === "system" ? "bg-surface-hover text-brand-primary font-medium" : "text-text-primary hover:bg-surface-hover"}`}
                >
                  <Monitor className="h-4 w-4" /> Automático
                </button>
              </div>
            </>
          )}
        </div>

        <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-hover px-3 py-1.5 text-xs font-semibold shadow-sm text-text-primary transition duration-200">
          {userName || "..."}
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border-subtle bg-surface-card text-text-muted px-3 py-1.5 text-xs font-semibold hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition duration-200 shadow-sm cursor-pointer"
          title="Cerrar sesión"
        >
          <LogOut className="h-[14px] w-[14px]" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
