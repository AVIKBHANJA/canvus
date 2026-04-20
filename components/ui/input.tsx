"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-dim)] outline-none transition-colors",
        "focus:border-[var(--color-accent)] focus:bg-[var(--color-bg-elev)]",
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[120px] w-full resize-y rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-dim)] outline-none transition-colors",
        "focus:border-[var(--color-accent)] focus:bg-[var(--color-bg-elev)]",
        className,
      )}
      {...props}
    />
  );
});
