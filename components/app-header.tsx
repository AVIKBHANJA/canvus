"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function AppHeader({
  email,
  name,
}: {
  email: string;
  name: string | null;
}) {
  const router = useRouter();
  const [online, setOnline] = React.useState(true);

  React.useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border-mute)] bg-[color-mix(in_oklch,var(--color-bg)_82%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="relative h-7 w-7 overflow-hidden rounded-[8px] bg-[var(--color-accent)]"
          >
            <span className="absolute inset-0 grid place-items-center text-[15px] font-bold text-[var(--color-accent-ink)]">
              ⌘
            </span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-medium tracking-tight text-[var(--color-fg)]">
              Canvus
            </span>
            <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-fg-dim)]">
              cloud clipboard
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span
            className="mono hidden items-center gap-1.5 rounded-full border border-[var(--color-border-mute)] bg-[var(--color-surface)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-dim)] sm:inline-flex"
            title={online ? "Live sync active" : "Offline — reconnecting"}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                online
                  ? "bg-[var(--color-accent)] animate-pulse-dot"
                  : "bg-[var(--color-danger)]"
              }`}
            />
            {online ? "live" : "offline"}
          </span>
          <span
            className="hidden max-w-[180px] truncate text-xs text-[var(--color-fg-mute)] sm:inline"
            title={email}
          >
            {name ?? email}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
