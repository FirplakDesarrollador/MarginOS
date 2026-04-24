"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSidebar } from "@/contexts/SidebarContext";

export function Topbar({ title }: { title?: string }) {
  const [userName, setUserName] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const { toggleMobile } = useSidebar();

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
    <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-border-subtle h-16 flex items-center px-4 md:px-6 shadow-sm gap-3">
      {/* Mobile hamburger */}
      <button
        onClick={toggleMobile}
        className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
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
        <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-border-subtle bg-slate-50 px-3 py-1.5 text-xs font-semibold shadow-sm text-text-primary hover:bg-slate-100 transition duration-200">
          {userName || "..."}
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white text-slate-600 px-3 py-1.5 text-xs font-semibold hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition duration-200 shadow-sm cursor-pointer"
          title="Cerrar sesión"
        >
          <LogOut className="h-[14px] w-[14px]" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
