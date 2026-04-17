import React from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition " +
  "focus:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--focus-ring)] " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-[color:var(--primary)] text-[color:var(--primary-foreground)] shadow-[var(--shadow-sm)] hover:opacity-95",
  secondary:
    "bg-white text-[color:var(--text)] border border-[color:var(--border)] shadow-[var(--shadow-sm)] hover:bg-gray-50",
  ghost: "bg-transparent text-[color:var(--text)] hover:bg-gray-100",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}