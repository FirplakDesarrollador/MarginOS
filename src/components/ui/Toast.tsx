"use client";

import { Check, AlertCircle } from "lucide-react";

interface ToastProps {
  message: string | null;
  type?: "success" | "error";
}

export function Toast({ message, type = "success" }: ToastProps) {
  if (!message) return null;

  const isError = type === "error";

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "12px 22px",
        background: isError ? "var(--danger)" : "var(--navy)",
        color: "var(--bone)",
        borderRadius: 100,
        boxShadow: "var(--shadow-lg)",
        fontSize: 14,
        fontWeight: 500,
        zIndex: 9999,
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {isError
        ? <AlertCircle size={16} strokeWidth={1.75} />
        : <Check size={16} strokeWidth={1.75} />
      }
      {message}
    </div>
  );
}
