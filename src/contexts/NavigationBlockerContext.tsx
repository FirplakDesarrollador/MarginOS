"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Context interface
// ─────────────────────────────────────────────────────────────────────────────
interface NavigationBlockerCtx {
  isDirty: boolean;
  setIsDirty: (v: boolean) => void;
}

const NavigationBlockerContext = createContext<NavigationBlockerCtx>({
  isDirty: false,
  setIsDirty: () => {},
});

export function useNavigationBlocker() {
  return useContext(NavigationBlockerContext);
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export function NavigationBlockerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);

  // Pending navigation target after user confirms
  const pendingHref = useRef<string | null>(null);
  // Modal visibility
  const [showModal, setShowModal] = useState(false);

  // ── 1. beforeunload (browser refresh / close tab) ──────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = ""; // Required for Chrome
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // ── 2. In-app navigation interception (click on <a> tags) ─────────────────
  useEffect(() => {
    if (!isDirty) return;

    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      // Ignore: external links, # anchors, and missing hrefs
      if (!href || href.startsWith("http") || href.startsWith("#")) return;
      // Ignore: modifier keys (ctrl+click to open new tab should be allowed)
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      pendingHref.current = href;
      setShowModal(true);
    };

    document.addEventListener("click", handleAnchorClick, { capture: true });
    return () => document.removeEventListener("click", handleAnchorClick, { capture: true });
  }, [isDirty]);

  // ── Modal actions ──────────────────────────────────────────────────────────
  const handleStay = useCallback(() => {
    pendingHref.current = null;
    setShowModal(false);
  }, []);

  const handleLeave = useCallback(() => {
    setShowModal(false);
    setIsDirty(false);
    if (pendingHref.current) {
      router.push(pendingHref.current);
      pendingHref.current = null;
    }
  }, [router]);

  return (
    <NavigationBlockerContext.Provider value={{ isDirty, setIsDirty }}>
      {children}

      {/* ── Confirmation Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={handleStay}
          />

          {/* Dialog */}
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-border-subtle overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border-subtle">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text-primary leading-tight">
                    Cambios sin guardar
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">Simulación en curso</p>
                </div>
              </div>
              <button
                onClick={handleStay}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-sm text-text-muted leading-relaxed">
                Tienes cambios sin guardar en esta simulación.{" "}
                <span className="font-medium text-text-primary">
                  Si sales ahora, perderás la información no guardada.
                </span>
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={handleLeave}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-white border border-border-subtle hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
              >
                Salir sin guardar
              </button>
              <button
                onClick={handleStay}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-primary hover:bg-brand-accent transition-all shadow-sm"
              >
                Continuar editando
              </button>
            </div>
          </div>
        </div>
      )}
    </NavigationBlockerContext.Provider>
  );
}
