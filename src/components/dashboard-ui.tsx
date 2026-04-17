"use client";

import Link from "next/link";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function DashboardHeader() {
  const [userName, setUserName] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Obtenemos el nombre de la tabla Usuarios_MarginOS usando el uuid
        const { data, error } = await supabase
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
    <header className="sticky top-0 z-20 -mx-6 md:-mx-8 mb-10 border-b border-[color:var(--border)] bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/firplak-logo.png"
            alt="FIRPLAK"
            width={150}
            height={40}
            className="h-9 w-auto"
            priority
          />

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-[color:var(--text)]">
              MarginOS
            </span>
            <span className="inline-flex items-center rounded-full border border-[color:var(--border)] bg-white px-2 py-0.5 text-xs text-[color:var(--muted)]">
              v1.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-white px-3 py-1.5 text-sm shadow-[var(--shadow-sm)]">
            <span className="text-[color:var(--text)] font-medium">{userName || "Cargando..."}</span>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 text-red-600 px-3 py-1.5 text-sm hover:bg-red-100 hover:text-red-700 transition duration-200 shadow-[var(--shadow-sm)] cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[var(--shadow-sm)]">
      <div className="p-6">
        <div className="text-sm text-[color:var(--muted)]">{label}</div>
        <div className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--text)]">
          {value}
        </div>
      </div>
    </div>
  );
}

type Action = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
};

export function ActionCard({ icon: Icon, title, description, href }: Action) {
  return (
    <Link href={href} className="group block">
      <div className="h-full rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[var(--shadow-sm)] transition-all duration-200 group-hover:shadow-[var(--shadow-md)] group-hover:-translate-y-0.5">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-white shadow-[var(--shadow-sm)]"
                aria-hidden="true"
              >
                <Icon className="h-5 w-5 text-[color:var(--text)] opacity-80" />
              </div>

              <div className="text-base font-semibold tracking-tight text-[color:var(--text)]">
                {title}
              </div>
            </div>

            <span className="text-xs text-[color:var(--muted)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              Abrir →
            </span>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">
            {description}
          </p>

          <div className="mt-5 h-px w-full bg-[color:var(--border)] opacity-60" />

          <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-white"
              style={{ background: "var(--primary)" }}
            >
              Ir
            </span>
            <span className="text-[color:var(--muted)]">a {href}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}