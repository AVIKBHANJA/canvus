"use client";

import * as React from "react";
import { FilePlus, Search, Sparkles, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast, UndoToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  fromRow,
  type Drop,
  type DropRow,
  type DropType,
} from "@/lib/types";
import { DropTile } from "./drop-tile";
import { DropComposer, type Stage } from "./drop-composer";

type Filter = "ALL" | DropType | "PINNED";
const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "ALL" },
  { label: "Text", value: "TEXT" },
  { label: "Links", value: "LINK" },
  { label: "Images", value: "IMAGE" },
  { label: "Files", value: "FILE" },
  { label: "Pinned", value: "PINNED" },
];

export function Feed({
  userId,
  initialDrops,
  prefill,
}: {
  userId: string;
  initialDrops: Drop[];
  prefill?: { text?: string; url?: string };
}) {
  const [drops, setDrops] = React.useState<Drop[]>(initialDrops);
  const [newIds, setNewIds] = React.useState<Set<string>>(new Set());
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("ALL");
  const [tagFilter, setTagFilter] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(
    initialDrops.length >= 50,
  );
  const [loadingMore, setLoadingMore] = React.useState(false);

  /** Parent-owned "stage" the composer watches. Bump `seq` to open it. */
  const [stage, setStage] = React.useState<Stage>({ seq: 0 });
  const stageFile = React.useCallback((file: File) => {
    setStage((prev) => ({ seq: prev.seq + 1, file }));
  }, []);

  /** Pending-delete bookkeeping so a sendBeacon commit can fire when the tab
   *  is hidden before the undo window elapses. */
  const pendingDeletesRef = React.useRef<Set<string>>(new Set());

  const markNew = React.useCallback((id: string) => {
    setNewIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setNewIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }, 1200);
  }, []);

  // Supabase Realtime subscription: INSERT / UPDATE / DELETE on canvus_drops.
  // Also refreshes the realtime auth token on auth state changes so the
  // channel doesn't silently stop receiving events when the JWT rotates.
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`drops:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "canvus_drops",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as DropRow;
          const drop = fromRow(row);
          setDrops((prev) => {
            if (prev.some((d) => d.id === drop.id)) return prev;
            return [drop, ...prev];
          });
          markNew(drop.id);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "canvus_drops",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as DropRow;
          const drop = fromRow(row);
          setDrops((prev) =>
            prev.map((d) => (d.id === drop.id ? drop : d)),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "canvus_drops",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const oldRow = payload.old as { id?: string };
          if (!oldRow?.id) return;
          setDrops((prev) => prev.filter((d) => d.id !== oldRow.id));
        },
      )
      .subscribe();

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Keep the realtime socket's JWT in sync with the current session.
      supabase.realtime.setAuth(session?.access_token ?? null);
    });

    return () => {
      supabase.removeChannel(channel);
      authSub.unsubscribe();
    };
  }, [userId, markNew]);

  // If the tab becomes hidden while deletes are pending, flush them via
  // sendBeacon so the server commits the DELETE even if the tab is closed.
  React.useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "hidden") return;
      if (pendingDeletesRef.current.size === 0) return;
      for (const id of pendingDeletesRef.current) {
        const payload = JSON.stringify({ _commitDelete: true });
        const blob = new Blob([payload], { type: "application/json" });
        try {
          navigator.sendBeacon(`/api/drops/${id}`, blob);
        } catch {
          /* no-op */
        }
      }
      pendingDeletesRef.current.clear();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () =>
      document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const handleCreated = React.useCallback(
    (d: Drop) => {
      setDrops((prev) => {
        if (prev.some((x) => x.id === d.id)) return prev;
        return [d, ...prev];
      });
      markNew(d.id);
    },
    [markNew],
  );

  const handleDelete = React.useCallback(
    async (id: string) => {
      const snapshot = drops;
      const target = drops.find((d) => d.id === id);
      if (!target) return;

      // Optimistic removal, with undo toast.
      setDrops((prev) => prev.filter((d) => d.id !== id));
      pendingDeletesRef.current.add(id);

      let undone = false;
      UndoToast({
        text:
          target.type === "TEXT"
            ? "Text drop deleted"
            : `${prettyType(target.type)} deleted`,
        onUndo: () => {
          undone = true;
          pendingDeletesRef.current.delete(id);
          setDrops(snapshot);
          toast("Restored");
        },
        onCommit: async () => {
          if (undone) return;
          pendingDeletesRef.current.delete(id);
          const res = await fetch(`/api/drops/${id}`, { method: "DELETE" });
          if (!res.ok) {
            toast("Couldn't delete drop");
            setDrops(snapshot);
          }
        },
      });
    },
    [drops],
  );

  const handlePin = React.useCallback(
    async (id: string, pinned: boolean) => {
      setDrops((prev) =>
        prev.map((d) => (d.id === id ? { ...d, pinned } : d)),
      );
      const res = await fetch(`/api/drops/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pinned }),
      });
      if (!res.ok) toast("Couldn't update pin");
    },
    [],
  );

  const loadOlder = React.useCallback(async () => {
    if (loadingMore || !hasMore || drops.length === 0) return;
    const last = drops[drops.length - 1];
    const params = new URLSearchParams({
      before_pinned: last.pinned ? "1" : "0",
      before_created: last.createdAt,
      before_id: last.id,
      limit: "50",
    });
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/drops?${params.toString()}`);
      if (!res.ok) {
        toast("Couldn't load more drops");
        return;
      }
      const { drops: older } = (await res.json()) as { drops: Drop[] };
      if (!older.length) {
        setHasMore(false);
        return;
      }
      setDrops((prev) => {
        const seen = new Set(prev.map((d) => d.id));
        const merged = [...prev];
        for (const d of older) {
          if (!seen.has(d.id)) merged.push(d);
        }
        return merged;
      });
      if (older.length < 50) setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [drops, hasMore, loadingMore]);

  // Client-side filter/search. Server returns all user's drops.
  const visible = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return drops.filter((d) => {
      if (filter === "PINNED" && !d.pinned) return false;
      if (filter !== "ALL" && filter !== "PINNED" && d.type !== filter)
        return false;
      if (tagFilter && !d.tags.includes(tagFilter)) return false;
      if (!needle) return true;
      const hay = [
        d.content,
        d.url,
        d.ogTitle,
        d.ogDesc,
        d.fileName,
        ...d.tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [drops, q, filter, tagFilter]);

  const ordered = React.useMemo(() => {
    return [...visible].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }, [visible]);

  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 pb-36 pt-6 sm:px-6 sm:pt-10">
      <div className="mb-6 flex flex-col gap-4">
        {/* Search + counter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-fg-dim)]"
              aria-hidden
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search drops…"
              className="h-11 pl-9"
              aria-label="Search drops"
            />
            {q && (
              <button
                aria-label="Clear search"
                onClick={() => setQ("")}
                className="press absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[var(--color-fg-mute)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="mono flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[var(--color-fg-mute)] tnum">
            <span>
              {ordered.length} / {drops.length} drops
            </span>
          </div>
        </div>

        {/* Quick-pick file button — reliable alternative to drag-drop */}
        <PickFileButton onFile={stageFile} />

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "press rounded-full border px-3 py-1 text-xs tracking-tight",
                filter === f.value
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg-mute)] hover:text-[var(--color-fg)]",
              )}
              aria-pressed={filter === f.value}
            >
              {f.label}
            </button>
          ))}
          {tagFilter && (
            <button
              onClick={() => setTagFilter(null)}
              className="press mono inline-flex items-center gap-1 rounded-full border border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_14%,transparent)] px-3 py-1 text-[12px] text-[var(--color-accent)]"
            >
              #{tagFilter}
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {ordered.length === 0 ? (
        <EmptyState hasDrops={drops.length > 0} onFile={stageFile} />
      ) : (
        <>
          <div className="bento">
            {ordered.map((d) => (
              <DropTile
                key={d.id}
                drop={d}
                onDelete={handleDelete}
                onPin={handlePin}
                onSelectTag={setTagFilter}
                isNew={newIds.has(d.id)}
              />
            ))}
          </div>
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="secondary"
                size="md"
                onClick={loadOlder}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading…" : "Load older"}
              </Button>
            </div>
          )}
        </>
      )}

      <DropComposer onCreated={handleCreated} prefill={prefill} stage={stage} />
    </section>
  );
}

function prettyType(t: DropType): string {
  switch (t) {
    case "TEXT":
      return "Text";
    case "LINK":
      return "Link";
    case "IMAGE":
      return "Image";
    case "FILE":
      return "File";
  }
}

function EmptyState({
  hasDrops,
  onFile,
}: {
  hasDrops: boolean;
  onFile: (file: File) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [isTouch, setIsTouch] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setIsTouch(window.matchMedia("(hover: none)").matches);
    } catch {
      /* noop */
    }
  }, []);

  if (hasDrops) {
    return (
      <div className="rounded-[20px] border border-dashed border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-bg)_60%,var(--color-surface))] p-12 text-center">
        <p className="text-sm text-[var(--color-fg-mute)]">
          No drops match this filter.
        </p>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Drop a file here or click to pick one"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        const f = e.dataTransfer.files?.[0];
        if (!f) return;
        e.preventDefault();
        setDragOver(false);
        onFile(f);
      }}
      className={cn(
        "animate-fade-up cursor-pointer rounded-[24px] border border-dashed bg-[color-mix(in_oklch,var(--color-bg)_60%,var(--color-surface))] px-6 py-16 text-center transition sm:py-24",
        dragOver
          ? "border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_8%,var(--color-surface))]"
          : "border-[var(--color-border)] hover:border-[var(--color-accent)]",
      )}
    >
      <div
        aria-hidden
        className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
      >
        <Sparkles className="h-5 w-5" />
      </div>
      <h2 className="mt-5 text-2xl tracking-tight text-[var(--color-fg)]">
        Your canvas is empty.
      </h2>
      {isTouch ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-fg-mute)]">
          Tap anywhere here to pick a file from your phone — or use the{" "}
          <span className="mono rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-accent-ink)]">
            + New drop
          </span>{" "}
          button for text or links.
        </p>
      ) : (
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-fg-mute)]">
          Drag a file here,{" "}
          <span className="font-medium text-[var(--color-fg)]">click anywhere on this zone</span>{" "}
          to pick one, paste with{" "}
          <kbd className="mono rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-0.5 text-[11px]">
            ⌘V
          </kbd>
          , or press{" "}
          <kbd className="mono rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-0.5 text-[11px]">
            N
          </kbd>
          {" "}for text & links.
        </p>
      )}
      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-accent-ink)]">
        <Upload className="h-3.5 w-3.5" />
        Pick a file
      </div>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function PickFileButton({ onFile }: { onFile: (file: File) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="press inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-fg-mute)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      >
        <FilePlus className="h-3.5 w-3.5" />
        Pick a file
      </button>
      <span className="mono hidden text-[11px] uppercase tracking-[0.14em] text-[var(--color-fg-mute)] sm:inline">
        or drag files onto this page · ⌘V to paste
      </span>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
