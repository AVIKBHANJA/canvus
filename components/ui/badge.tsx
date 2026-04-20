import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "accent" | "link" | "image" | "file" | "muted";

const toneClass: Record<Tone, string> = {
  default:
    "bg-[var(--color-surface)] text-[var(--color-fg-mute)] border border-[var(--color-border)]",
  accent:
    "bg-[color-mix(in_oklch,var(--color-accent)_18%,transparent)] text-[var(--color-accent)] border border-[color-mix(in_oklch,var(--color-accent)_32%,transparent)]",
  link: "bg-[color-mix(in_oklch,var(--color-link)_14%,transparent)] text-[var(--color-link)] border border-[color-mix(in_oklch,var(--color-link)_28%,transparent)]",
  image:
    "bg-[color-mix(in_oklch,var(--color-image)_14%,transparent)] text-[var(--color-image)] border border-[color-mix(in_oklch,var(--color-image)_28%,transparent)]",
  file: "bg-[color-mix(in_oklch,var(--color-file)_14%,transparent)] text-[var(--color-file)] border border-[color-mix(in_oklch,var(--color-file)_28%,transparent)]",
  muted:
    "bg-transparent text-[var(--color-fg-dim)] border border-[var(--color-border-mute)]",
};

export function Badge({
  tone = "default",
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium tracking-wide uppercase",
        toneClass[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
