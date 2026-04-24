"use client";

import * as React from "react";
import {
  ChevronRight,
  Folder,
  Layers,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";
import {
  collectionFromRow,
  COLLECTION_COLORS,
  type Collection,
  type CollectionColor,
  type CollectionRow,
  type Drop,
  type DropType,
} from "@/lib/types";

export type FeedFilter =
  | { kind: "all" }
  | { kind: "pinned" }
  | { kind: "type"; type: DropType }
  | { kind: "collection"; id: string };

const TYPE_FILTERS: { label: string; type: DropType }[] = [
  { label: "Text", type: "TEXT" },
  { label: "Links", type: "LINK" },
  { label: "Images", type: "IMAGE" },
  { label: "Files", type: "FILE" },
];

function Dot({ color, size = 8 }: { color: CollectionColor; size?: number }) {
  return (
    <span
      aria-hidden
      className="shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: `var(--canvus-color-${color})`,
        boxShadow: `0 0 0 2px color-mix(in oklch, var(--canvus-color-${color}) 22%, transparent)`,
      }}
    />
  );
}

export function CollectionsRail({
  userId,
  drops,
  filter,
  onFilter,
  collections,
  onCollectionsChange,
  onClose,
}: {
  userId: string;
  drops: Drop[];
  filter: FeedFilter;
  onFilter: (f: FeedFilter) => void;
  collections: Collection[];
  onCollectionsChange: (cs: Collection[]) => void;
  onClose?: () => void;
}) {
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newColor, setNewColor] = React.useState<CollectionColor>("chartreuse");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [menuFor, setMenuFor] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);

  const counts = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const d of drops) {
      if (d.collectionId) m.set(d.collectionId, (m.get(d.collectionId) ?? 0) + 1);
    }
    return m;
  }, [drops]);

  const pinnedCount = React.useMemo(
    () => drops.filter((d) => d.pinned).length,
    [drops],
  );

  // Realtime — subscribe ONCE per userId. Handlers read latest state via refs
  // so we don't have to re-subscribe when collections change (which would
  // trigger "add callbacks after subscribe()" on the Supabase channel).
  const collectionsRef = React.useRef(collections);
  const onChangeRef = React.useRef(onCollectionsChange);
  React.useEffect(() => {
    collectionsRef.current = collections;
    onChangeRef.current = onCollectionsChange;
  });

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`collections:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "canvus_collections",
          filter: `user_id=eq.${userId}`,
        },
        (p) => {
          const c = collectionFromRow(p.new as CollectionRow);
          onChangeRef.current(
            dedupe([c, ...collectionsRef.current]).sort(sortCollections),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "canvus_collections",
          filter: `user_id=eq.${userId}`,
        },
        (p) => {
          const c = collectionFromRow(p.new as CollectionRow);
          onChangeRef.current(
            collectionsRef.current
              .map((x) => (x.id === c.id ? c : x))
              .sort(sortCollections),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "canvus_collections",
          filter: `user_id=eq.${userId}`,
        },
        (p) => {
          const old = p.old as { id?: string };
          if (!old?.id) return;
          onChangeRef.current(
            collectionsRef.current.filter((x) => x.id !== old.id),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function createCollection() {
    const name = newName.trim();
    if (!name) return;
    const optimistic: Collection = {
      id: `temp-${crypto.randomUUID()}`,
      userId,
      name,
      color: newColor,
      icon: null,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onCollectionsChange([...collections, optimistic].sort(sortCollections));
    setNewName("");
    setCreating(false);
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, color: newColor }),
    });
    if (!res.ok) {
      toast("Couldn't create collection");
      onCollectionsChange(collections.filter((c) => c.id !== optimistic.id));
      return;
    }
    const { collection } = (await res.json()) as { collection: Collection };
    onCollectionsChange(
      collections
        .filter((c) => c.id !== optimistic.id)
        .concat(collection)
        .sort(sortCollections),
    );
  }

  async function renameCollection(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const prev = collections;
    onCollectionsChange(
      collections.map((c) => (c.id === id ? { ...c, name: trimmed } : c)),
    );
    setEditingId(null);
    const res = await fetch(`/api/collections/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) {
      toast("Couldn't rename");
      onCollectionsChange(prev);
    }
  }

  async function recolor(id: string, color: CollectionColor) {
    const prev = collections;
    onCollectionsChange(
      collections.map((c) => (c.id === id ? { ...c, color } : c)),
    );
    const res = await fetch(`/api/collections/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ color }),
    });
    if (!res.ok) {
      toast("Couldn't update color");
      onCollectionsChange(prev);
    }
  }

  async function deleteCollection(id: string) {
    const prev = collections;
    onCollectionsChange(collections.filter((c) => c.id !== id));
    setConfirmDelete(null);
    setMenuFor(null);
    if (filter.kind === "collection" && filter.id === id) {
      onFilter({ kind: "all" });
    }
    const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast("Couldn't delete");
      onCollectionsChange(prev);
    }
  }

  const isActive = (f: FeedFilter) => feedFilterKey(filter) === feedFilterKey(f);

  return (
    <aside
      className="canvus-rail flex h-full w-[240px] shrink-0 flex-col border-r border-[var(--color-border-mute)] bg-[color-mix(in_oklch,var(--color-bg)_76%,var(--color-bg-elev))]"
      aria-label="Collections"
    >
      {onClose && (
        <div className="flex items-center justify-between border-b border-[var(--color-border-mute)] px-4 py-3 lg:hidden">
          <span className="mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-fg-dim)]">
            filters
          </span>
          <button
            onClick={onClose}
            className="press rounded-full p-1 text-[var(--color-fg-mute)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
            aria-label="Close filters"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-1 px-2">
          <div className="mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-fg-dim)]">
            views
          </div>
        </div>
        <RailItem
          active={isActive({ kind: "all" })}
          onClick={() => onFilter({ kind: "all" })}
          icon={<Layers className="h-3.5 w-3.5" />}
          label="All drops"
          count={drops.length}
        />
        <RailItem
          active={isActive({ kind: "pinned" })}
          onClick={() => onFilter({ kind: "pinned" })}
          icon={<Pin className="h-3.5 w-3.5" />}
          label="Pinned"
          count={pinnedCount}
        />
        {TYPE_FILTERS.map((t) => {
          const c = drops.filter((d) => d.type === t.type).length;
          return (
            <RailItem
              key={t.type}
              active={isActive({ kind: "type", type: t.type })}
              onClick={() => onFilter({ kind: "type", type: t.type })}
              icon={<TypeDot type={t.type} />}
              label={t.label}
              count={c}
            />
          );
        })}

        <div className="mt-5 mb-1 flex items-center justify-between px-2">
          <div className="mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-fg-dim)]">
            collections
          </div>
          <button
            onClick={() => {
              setCreating((v) => !v);
              setNewName("");
            }}
            className="press rounded-full p-1 text-[var(--color-fg-mute)] hover:bg-[var(--color-surface)] hover:text-[var(--color-accent)]"
            aria-label="New collection"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {creating && (
          <div className="mb-2 rounded-[10px] border border-[var(--color-border-mute)] bg-[var(--color-surface)] p-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createCollection();
                if (e.key === "Escape") setCreating(false);
              }}
              placeholder="Collection name"
              className="w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-xs text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]"
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {COLLECTION_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    aria-label={`Color ${c}`}
                    className={cn(
                      "grid h-5 w-5 place-items-center rounded-full transition-transform",
                      newColor === c &&
                        "scale-110 ring-2 ring-offset-2 ring-offset-[var(--color-surface)] ring-[var(--color-accent)]",
                    )}
                  >
                    <Dot color={c} size={10} />
                  </button>
                ))}
              </div>
              <button
                onClick={createCollection}
                className="press mono rounded-full border border-[var(--color-accent)] bg-[var(--color-accent)] px-2 py-0.5 text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-accent-ink)]"
              >
                create
              </button>
            </div>
          </div>
        )}

        {collections.map((c) => {
          const active = isActive({ kind: "collection", id: c.id });
          const editing = editingId === c.id;
          const menuOpen = menuFor === c.id;
          return (
            <div key={c.id} className="relative group/rail">
              {editing ? (
                <div className="mb-1 flex items-center gap-2 rounded-[10px] border border-[var(--color-border-mute)] bg-[var(--color-surface)] px-2 py-1">
                  <Dot color={c.color} />
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => renameCollection(c.id, editingName)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        renameCollection(c.id, editingName);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 bg-transparent text-xs text-[var(--color-fg)] outline-none"
                  />
                </div>
              ) : (
                <div
                  className={cn(
                    "relative flex w-full items-center gap-2 rounded-[10px] pr-1 text-left text-xs",
                    active
                      ? "bg-[color-mix(in_oklch,var(--color-accent)_10%,var(--color-surface))] text-[var(--color-fg)]"
                      : "text-[var(--color-fg-mute)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]",
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[var(--color-accent)]"
                    />
                  )}
                  <button
                    onClick={() => onFilter({ kind: "collection", id: c.id })}
                    className="press flex min-w-0 flex-1 items-center gap-2 rounded-[10px] px-2 py-1.5"
                  >
                    <Dot color={c.color} />
                    <span className="flex-1 truncate text-left">{c.name}</span>
                    <span className="mono tnum text-[10.5px] text-[var(--color-fg-dim)]">
                      {counts.get(c.id) ?? 0}
                    </span>
                  </button>
                  <button
                    onClick={() => setMenuFor(menuOpen ? null : c.id)}
                    aria-label="More"
                    className="press rounded-[6px] p-1 text-[var(--color-fg-dim)] opacity-0 transition-opacity group-hover/rail:opacity-100 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {menuOpen && (
                <div
                  className="glass absolute right-0 top-full z-30 mt-1 w-[200px] rounded-[10px] border border-[var(--color-border)] p-1.5 shadow-[0_18px_60px_-20px_rgba(0,0,0,0.5)]"
                  onMouseLeave={() => setMenuFor(null)}
                >
                  <button
                    onClick={() => {
                      setEditingId(c.id);
                      setEditingName(c.name);
                      setMenuFor(null);
                    }}
                    className="press flex w-full items-center gap-2 rounded-[6px] px-2 py-1 text-left text-xs text-[var(--color-fg-mute)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
                  >
                    <Pencil className="h-3 w-3" />
                    Rename
                  </button>
                  <div className="mt-1 rounded-[6px] bg-[var(--color-surface)] p-1.5">
                    <div className="mono mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-dim)]">
                      color
                    </div>
                    <div className="flex items-center justify-between">
                      {COLLECTION_COLORS.map((col) => (
                        <button
                          key={col}
                          onClick={() => recolor(c.id, col)}
                          aria-label={`Set color ${col}`}
                          className={cn(
                            "grid h-5 w-5 place-items-center rounded-full",
                            c.color === col &&
                              "ring-2 ring-offset-2 ring-offset-[var(--color-surface)] ring-[var(--color-accent)]",
                          )}
                        >
                          <Dot color={col} size={10} />
                        </button>
                      ))}
                    </div>
                  </div>
                  {confirmDelete === c.id ? (
                    <div className="mt-1 rounded-[6px] bg-[color-mix(in_oklch,var(--color-danger)_10%,transparent)] p-1.5">
                      <div className="mono mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-danger)]">
                        delete?
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => deleteCollection(c.id)}
                          className="press mono flex-1 rounded-[6px] border border-[var(--color-danger)] px-2 py-1 text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-bg)]"
                        >
                          confirm
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="press mono flex-1 rounded-[6px] border border-[var(--color-border)] px-2 py-1 text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-mute)]"
                        >
                          cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(c.id)}
                      className="press mt-1 flex w-full items-center gap-2 rounded-[6px] px-2 py-1 text-left text-xs text-[var(--color-fg-mute)] hover:bg-[color-mix(in_oklch,var(--color-danger)_12%,transparent)] hover:text-[var(--color-danger)]"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {collections.length === 0 && !creating && (
          <button
            onClick={() => setCreating(true)}
            className="mt-2 flex w-full items-center gap-2 rounded-[10px] border border-dashed border-[var(--color-border)] px-3 py-3 text-xs text-[var(--color-fg-mute)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            <Folder className="h-3.5 w-3.5" />
            Create your first collection
            <ChevronRight className="ml-auto h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </aside>
  );
}

function RailItem({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "press relative flex w-full items-center gap-2 rounded-[10px] px-2 py-1.5 text-left text-xs",
        active
          ? "bg-[color-mix(in_oklch,var(--color-accent)_10%,var(--color-surface))] text-[var(--color-fg)]"
          : "text-[var(--color-fg-mute)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[var(--color-accent)]"
        />
      )}
      <span className="grid h-5 w-5 place-items-center text-[var(--color-fg-dim)]">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      <span className="mono tnum text-[10.5px] text-[var(--color-fg-dim)]">
        {count}
      </span>
    </button>
  );
}

function TypeDot({ type }: { type: DropType }) {
  const map: Record<DropType, string> = {
    TEXT: "var(--color-fg-mute)",
    LINK: "var(--color-link)",
    IMAGE: "var(--color-image)",
    FILE: "var(--color-file)",
  };
  return (
    <span
      aria-hidden
      className="h-2 w-2 rounded-full"
      style={{ background: map[type] }}
    />
  );
}

export function feedFilterKey(f: FeedFilter): string {
  if (f.kind === "collection") return `collection:${f.id}`;
  if (f.kind === "type") return `type:${f.type}`;
  return f.kind;
}

function sortCollections(a: Collection, b: Collection): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return b.createdAt.localeCompare(a.createdAt);
}

function dedupe(cs: Collection[]): Collection[] {
  const seen = new Set<string>();
  return cs.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}
