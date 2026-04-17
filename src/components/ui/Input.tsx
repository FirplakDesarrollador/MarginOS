import React from "react";

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-11 w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-white px-4 text-sm text-[color:var(--text)] placeholder:text-[color:var(--muted)] shadow-[var(--shadow-sm)]
      focus:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--focus-ring)] ${className}`}
      {...props}
    />
  );
}