"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card">
      <div className="p-6">
        <div className="overline">{label}</div>
        <div className="kpi tabular mt-2">{value}</div>
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
      <div className="h-full surface-card transition-all duration-200 group-hover:shadow-[var(--shadow-md)] group-hover:-translate-y-0.5">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="surface-card flex h-10 w-10 items-center justify-center rounded-2xl"
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
              className="inline-flex items-center rounded-full px-3 py-1"
              style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)" }}
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