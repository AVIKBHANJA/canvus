"use client";

import * as React from "react";
import { FilePlus, PanelLeft, Search, Sparkles, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast, UndoToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  fromRow,
  type Collection,
  type Drop,
  type DropRow,
} from "@/lib/types";
import { DropTile } from "./drop-tile";
import { DropComposer, type Stage } from "./drop-composer";
import { CollectionsRail, type FeedFilter } from "./collections-rail";
import { CommandPalette } from "./command-palette";
import { RegisterCurrentDevice } from "./register-current-device";

export function Feed({
  userId,
  initialDrops,
  initialCollections,
  prefill,
}: {
  userId: string;
  initialDrops: Drop[];
  initialCollections: Collection[];
  prefill?: { text?: string; url?: string };
}) {
  const [drops, setDrops] = React.useState<Drop[]>(initialDrops);
  const [collections, setCollections] = React.useState<Collection[]>(
    initialCollections,
  );
  const [newIds, setNewIds] = React.useState<Set<string>>(new Set());
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<FeedFilter>({ kind: "all" });
  const [tagFilter, setTagFilter] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(initialDrops.length >= 50);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [railOpen, setRailOpen] = React.useState(false);

  /** Parent-owned "stage" the composer watches. Bump `seq` to open it. */
  const [stage, setStage] = React.useState<Stage>({ seq: 0 });
  const stageFile = React.useCallback((file: File) => {
    setStage((prev) => ({ seq: prev.seq + 1, file }));
  }, []);
  const openComposer = React.useCallback(() => {
    setStage((prev) => ({ seq: prev.seq + 1 }));
  }, []);

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

  // Realtime — drops
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
          const drop = fromRow(payload.new as DropRow);
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
          const drop = fromRow(payload.new as DropRow);
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
      supabase.realtime.setAuth(session?.access_token ?? null);
    });

    return () => {
      supabase.removeChannel(channel);
      authSub.unsubscribe();
    };
  }, [userId, markNew]);

  // Refresh collections on mount (in case SSR data was stale) — realtime is in the rail.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/collections");
        if (!res.ok) return;
        const { collections: fresh } = (await res.json()) as {
          collections: Collection[];
        };
        if (!cancelled) setCollections(fresh);
      } catch {
        /* no-op */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleMoveToCollection = React.useCallback(
    async (id: string, collectionId: string | null) => {
      const snapshot = drops;
      setDrops((prev) =>
        prev.map((d) => (d.id === id ? { ...d, collectionId } : d)),
      );
      const res = await fetch(`/api/drops/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ collection_id: collectionId }),
      });
      if (!res.ok) {
        toast("Couldn't move drop");
        setDrops(snapshot);
      }
    },
    [drops],
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

  const visible = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return drops.filter((d) => {
      if (filter.kind === "pinned" && !d.pinned) return false;
      if (filter.kind === "type" && d.type !== filter.type) return false;
      if (filter.kind === "collection" && d.collectionId !== filter.id)
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

  const activeFilterLabel = React.useMemo(() => {
    if (filter.kind === "collection") {
      const c = collections.find((x) => x.id === filter.id);
      return c ? `in ${c.name}` : null;
    }
    if (filter.kind === "type") return filter.type.toLowerCase();
    if (filter.kind === "pinned") return "pinned";
    return null;
  }, [filter, collections]);

  return (
    <>
      <RegisterCurrentDevice />
      <div className="flex min-h-[calc(100dvh-57px)]">
        <div className="hidden lg:block">
          <div className="sticky top-[57px] h-[calc(100dvh-57px)]">
            <CollectionsRail
              userId={userId}
              drops={drops}
              filter={filter}
              onFilter={(f) => setFilter(f)}
              collections={collections}
              onCollectionsChange={setCollections}
            />
          </div>
        </div>
        {railOpen && (
          <div
            className="fixed inset-0 z-40 bg-[color-mix(in_oklch,var(--color-bg)_55%,black)] backdrop-blur-sm lg:hidden"
            onClick={() => setRailOpen(false)}
          >
            <div
              className="absolute inset-y-0 left-0 h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <CollectionsRail
                userId={userId}
                drops={drops}
                filter={filter}
                onFilter={(f) => {
                  setFilter(f);
                  setRailOpen(false);
                }}
                collections={collections}
                onCollectionsChange={setCollections}
                onClose={() => setRailOpen(false)}
              />
            </div>
          </div>
        )}

        <section className="min-w-0 flex-1 px-4 pb-36 pt-6 sm:px-6 sm:pt-10">
          <div className="mx-auto w-full max-w-[1400px]">
            <div className="mb-6 flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={() => setRailOpen(true)}
                  aria-label="Open filters"
                  className="press inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-[var(--color-border)] text-[var(--color-fg-mute)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] lg:hidden"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-fg-dim)]"
                    aria-hidden
                  />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search drops…"
                    className="h-11 pl-9 pr-20"
                    aria-label="Search drops"
                  />
                  <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 sm:flex">
                    <kbd className="mono rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10.5px] text-[var(--color-fg-dim)]">
                      ⌘K
                    </kbd>
                  </div>
                  {q && (
                    <button
                      aria-label="Clear search"
                      onClick={() => setQ("")}
                      className="press absolute right-10 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[var(--color-fg-mute)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)] sm:right-12"
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

              <PickFileButton onFile={stageFile} />

              <div className="flex flex-wrap items-center gap-2">
                {activeFilterLabel && (
                  <span className="mono inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklch,var(--color-accent)_40%,var(--color-border))] bg-[color-mix(in_oklch,var(--color-accent)_10%,transparent)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--color-fg)]">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
                    />
                    {activeFilterLabel}
                    <button
                      onClick={() => setFilter({ kind: "all" })}
                      className="press -mr-1 ml-0.5 rounded-full p-0.5 text-[var(--color-fg-dim)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
                      aria-label="Clear filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
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
                      collections={collections}
                      onDelete={handleDelete}
                      onPin={handlePin}
                      onSelectTag={setTagFilter}
                      onMoveToCollection={handleMoveToCollection}
                      onSelectCollection={(id) =>
                        setFilter({ kind: "collection", id })
                      }
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

            <DropComposer
              onCreated={handleCreated}
              prefill={prefill}
              stage={stage}
              collections={collections}
              defaultCollectionId={
                filter.kind === "collection" ? filter.id : null
              }
            />
          </div>
        </section>
      </div>

      <CommandPalette
        collections={collections}
        onCollectionFilter={(id) =>
          setFilter(id ? { kind: "collection", id } : { kind: "all" })
        }
        onNewDrop={openComposer}
      />
    </>
  );
}

function prettyType(t: Drop["type"]): string {
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

