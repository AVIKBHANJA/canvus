"use client";

import * as React from "react";
import { Command } from "cmdk";
import {
  ArrowRight,
  File as FileIcon,
  FolderOpen,
  Image as ImageIcon,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  Type as TypeIcon,
  Link as LinkIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { sanitizeHeadline } from "@/lib/sanitize-headline";
import { createClient } from "@/lib/supabase/client";
import type { Collection, Drop, DropType } from "@/lib/types";

const ICONS: Record<DropType, React.ComponentType<{ className?: string }>> = {
  TEXT: TypeIcon,
  LINK: LinkIcon,
  IMAGE: ImageIcon,
  FILE: FileIcon,
};

type CommandPaletteProps = {
  collections: Collection[];
  onCollectionFilter: (id: string | null) => void;
  onNewDrop: () => void;
};

export function CommandPalette({
  collections,
  onCollectionFilter,
  onNewDrop,
}: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<Drop[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Global open trigger: Cmd+K / Ctrl+K / `/` (when not typing in an input).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK =
        (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "/" && !open) {
        const t = e.target as HTMLElement | null;
        const isInput =
          t &&
          (t.tagName === "INPUT" ||
            t.tagName === "TEXTAREA" ||
            t.isContentEditable);
        if (!isInput) {
          e.preventDefault();
          setOpen(true);
        }
      }
    };
    const onCustom = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("canvus:open-palette", onCustom);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("canvus:open-palette", onCustom);
    };
  }, [open]);

  // Debounced search
  React.useEffect(() => {
    if (!open) return;
    const needle = q.trim();
    if (!needle) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(needle)}&limit=20`,
        );
        if (!res.ok) return;
        const { drops } = (await res.json()) as { drops: Drop[] };
        setResults(drops);
      } finally {
        setLoading(false);
      }
    }, 140);
    return () => window.clearTimeout(t);
  }, [q, open]);

  const close = React.useCallback(() => {
    setOpen(false);
    setQ("");
    setResults([]);
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (!open) return null;

  const showResults = q.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        aria-hidden
        className="animate-fade-up absolute inset-0 bg-[color-mix(in_oklch,var(--color-bg)_62%,black)] backdrop-blur-md"
      />
      <Command
        label="Command palette"
        className="animate-fade-up relative z-10 w-full max-w-[620px] overflow-hidden rounded-[18px] border border-[var(--color-border)] bg-[var(--color-bg-elev)] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.6)]"
        shouldFilter={!showResults}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
      >
        <div className="flex items-center gap-2 border-b border-[var(--color-border-mute)] px-4 py-3">
          <Search className="h-4 w-4 text-[var(--color-fg-dim)]" />
          <Command.Input
            autoFocus
            value={q}
            onValueChange={setQ}
            placeholder="Search drops, jump to actions…"
            className="flex-1 bg-transparent text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-dim)] outline-none"
          />
          {loading && (
            <span className="mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-fg-dim)]">
              searching
            </span>
          )}
          <kbd className="mono rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10.5px] text-[var(--color-fg-mute)]">
            esc
          </kbd>
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-8 text-center text-xs text-[var(--color-fg-dim)]">
            {showResults
              ? loading
                ? "Searching…"
                : "No matches"
              : "Start typing to search"}
          </Command.Empty>

          {!showResults && (
            <>
              <GroupLabel>Actions</GroupLabel>
              <Command.Group>
                <PaletteItem
                  onSelect={() => {
                    close();
                    onNewDrop();
                  }}
                  icon={<Plus className="h-3.5 w-3.5" />}
                  label="New drop"
                  shortcut="N"
                />
                <PaletteItem
                  onSelect={() => {
                    close();
                    router.push("/app/settings/devices");
                  }}
                  icon={<Settings className="h-3.5 w-3.5" />}
                  label="Settings · Devices"
                />
                <PaletteItem
                  onSelect={() => {
                    close();
                    toast("Theme toggle coming soon");
                  }}
                  icon={<Moon className="h-3.5 w-3.5" />}
                  label="Toggle theme"
                />
                <PaletteItem
                  onSelect={() => {
                    close();
                    signOut();
                  }}
                  icon={<LogOut className="h-3.5 w-3.5" />}
                  label="Sign out"
                />
              </Command.Group>

              {collections.length > 0 && (
                <>
                  <GroupLabel>Collections</GroupLabel>
                  <Command.Group>
                    <PaletteItem
                      onSelect={() => {
                        close();
                        onCollectionFilter(null);
                      }}
                      icon={<FolderOpen className="h-3.5 w-3.5" />}
                      label="All drops"
                    />
                    {collections.map((c) => (
                      <PaletteItem
                        key={c.id}
                        value={`collection ${c.name}`}
                        onSelect={() => {
                          close();
                          onCollectionFilter(c.id);
                        }}
                        icon={
                          <span
                            aria-hidden
                            className="h-2 w-2 rounded-full"
                            style={{
                              background: `var(--canvus-color-${c.color})`,
                            }}
                          />
                        }
                        label={c.name}
                      />
                    ))}
                  </Command.Group>
                </>
              )}
            </>
          )}

          {showResults && results.length > 0 && (
            <>
              <GroupLabel>Drops</GroupLabel>
              <Command.Group>
                {results.map((d) => {
                  const Icon = ICONS[d.type];
                  const primary =
                    d.ogTitle ??
                    (d.type === "LINK" ? d.url : null) ??
                    d.fileName ??
                    d.content ??
                    "Drop";
                  return (
                    <PaletteItem
                      key={d.id}
                      value={`drop ${d.id} ${primary}`}
                      onSelect={() => {
                        close();
                        if (d.type === "LINK" && d.url) {
                          window.open(d.url, "_blank", "noopener,noreferrer");
                          return;
                        }
                        if (d.type === "TEXT" && d.content) {
                          navigator.clipboard.writeText(d.content).catch(() => {});
                          toast("Text copied");
                        }
                      }}
                      icon={<Icon className="h-3.5 w-3.5" />}
                      label={
                        d.headline ? (
                          <span
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHeadline(d.headline),
                            }}
                            className="canvus-headline"
                          />
                        ) : (
                          <span className="truncate">{primary}</span>
                        )
                      }
                      trailing={
                        <ArrowRight className="h-3 w-3 text-[var(--color-fg-dim)]" />
                      }
                    />
                  );
                })}
              </Command.Group>
            </>
          )}
        </Command.List>

        <div className="flex items-center justify-between border-t border-[var(--color-border-mute)] bg-[color-mix(in_oklch,var(--color-bg)_40%,var(--color-bg-elev))] px-4 py-2">
          <div className="mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-fg-dim)]">
            canvus · palette
          </div>
          <div className="mono flex items-center gap-3 text-[10.5px] text-[var(--color-fg-dim)]">
            <span>
              <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5">
                ↑↓
              </kbd>{" "}
              move
            </span>
            <span>
              <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5">
                ↵
              </kbd>{" "}
              select
            </span>
          </div>
        </div>
      </Command>
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mono px-3 py-1.5 text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-fg-dim)]">
      {children}
    </div>
  );
}

function PaletteItem({
  onSelect,
  icon,
  label,
  shortcut,
  trailing,
  value,
}: {
  onSelect: () => void;
  icon: React.ReactNode;
  label: React.ReactNode;
  shortcut?: string;
  trailing?: React.ReactNode;
  value?: string;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm text-[var(--color-fg-mute)] aria-selected:bg-[color-mix(in_oklch,var(--color-accent)_10%,var(--color-surface))] aria-selected:text-[var(--color-fg)] aria-selected:shadow-[inset_2px_0_0_var(--color-accent)]"
    >
      <span className="grid h-5 w-5 place-items-center text-[var(--color-fg-dim)]">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {shortcut && (
        <kbd className="mono rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10.5px] text-[var(--color-fg-mute)]">
          {shortcut}
        </kbd>
      )}
      {trailing}
    </Command.Item>
  );
}
