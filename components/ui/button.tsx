"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClass: Record<Variant, string> = {
  primary:
    "bg-[var(--color-fg)] text-[var(--color-bg)] hover:opacity-90",
  accent:
    "bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-105 shadow-[0_6px_22px_-10px_var(--color-accent-glow)]",
  secondary:
    "bg-[var(--color-surface)] text-[var(--color-fg)] border border-[var(--color-border)] hover:bg-[var(--color-surface-2)]",
  ghost:
    "bg-transparent text-[var(--color-fg-mute)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)]",
  danger:
    "bg-transparent text-[var(--color-fg-mute)] hover:text-[var(--color-danger)] hover:bg-[color-mix(in_oklch,var(--color-danger)_14%,transparent)]",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-[10px]",
  md: "h-10 px-4 text-sm rounded-[12px]",
  lg: "h-12 px-5 text-sm rounded-[14px]",
  icon: "h-11 w-11 md:h-9 md:w-9 rounded-[10px] p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "secondary", size = "md", type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "press inline-flex items-center justify-center gap-2 font-medium tracking-tight disabled:cursor-not-allowed disabled:opacity-50 select-none",
          variantClass[variant],
          sizeClass[size],
          className,
        )}
        {...props}
      />
    );
  },
);
