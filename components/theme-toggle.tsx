"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type Theme = "light" | "dark" | "system";
const KEY = "canvus:theme";

export function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : "system";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("theme-light", "theme-dark");
  if (theme === "light") root.classList.add("theme-light");
  else if (theme === "dark") root.classList.add("theme-dark");
}

/** Inline script to run before paint — prevents a theme flash. */
export const THEME_BOOT_SCRIPT = `try{var v=localStorage.getItem('${KEY}');if(v==='light'){document.documentElement.classList.add('theme-light')}else if(v==='dark'){document.documentElement.classList.add('theme-dark')}}catch(_){}`;

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>("system");

  React.useEffect(() => {
    const current = readStoredTheme();
    setTheme(current);
    applyTheme(current);
  }, []);

  const set = (t: Theme) => {
    setTheme(t);
    if (t === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
    applyTheme(t);
  };

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5"
      role="radiogroup"
      aria-label="Theme"
    >
      {(
        [
          { v: "light", icon: Sun, label: "Light" },
          { v: "system", icon: Monitor, label: "System" },
          { v: "dark", icon: Moon, label: "Dark" },
        ] as const
      ).map(({ v, icon: Icon, label }) => (
        <button
          key={v}
          role="radio"
          aria-checked={theme === v}
          title={label}
          onClick={() => set(v)}
          className={cn(
            "press grid h-7 w-7 place-items-center rounded-full transition-colors",
            theme === v
              ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
              : "text-[var(--color-fg-mute)] hover:text-[var(--color-fg)]",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
