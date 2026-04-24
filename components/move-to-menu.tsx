"use client";

import * as React from "react";
import { FolderPlus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Collection } from "@/lib/types";

/** Colored dot matching a collection color token. */
function Dot({ color }: { color: Collection["color"] }) {
  return (
    <span
      aria-hidden
      className="h-2 w-2 rounded-full"
      style={{ background: `var(--canvus-color-${color})` }}
    />
  );
}

export function MoveToMenu({
  collections,
  currentId,
  onPick,
  onClose,
}: {
  collections: Collection[];
  currentId: string | null;
  onPick: (id: string | null) => void;
  onClose: () => void;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={rootRef}
      role="menu"
      className="glass animate-fade-up absolute right-0 top-full z-30 mt-1 min-w-[200px] overflow-hidden rounded-[12px] border border-[var(--color-border)] p-1 shadow-[0_18px_60px_-20px_rgba(0,0,0,0.5)]"
    >
      <div className="mono px-2 py-1.5 text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-fg-dim)]">
        Move to
      </div>
      <button
        onClick={() => {
          onPick(null);
          onClose();
        }}
        className={cn(
          "press flex w-full items-center justify-between gap-2 rounded-[8px] px-2 py-1.5 text-left text-xs text-[var(--color-fg)] hover:bg-[var(--color-surface)]",
        )}
        role="menuitem"
      >
        <span className="flex items-center gap-2">
          <FolderPlus className="h-3.5 w-3.5 text-[var(--color-fg-mute)]" />
          None
        </span>
        {currentId == null && <Check className="h-3.5 w-3.5 text-[var(--color-accent)]" />}
      </button>
      {collections.length > 0 && (
        <div className="my-1 h-px bg-[var(--color-border-mute)]" />
      )}
      {collections.map((c) => (
        <button
          key={c.id}
          onClick={() => {
            onPick(c.id);
            onClose();
          }}
          className="press flex w-full items-center justify-between gap-2 rounded-[8px] px-2 py-1.5 text-left text-xs text-[var(--color-fg)] hover:bg-[var(--color-surface)]"
          role="menuitem"
        >
          <span className="flex items-center gap-2 truncate">
            <Dot color={c.color} />
            <span className="truncate">{c.name}</span>
          </span>
          {currentId === c.id && (
            <Check className="h-3.5 w-3.5 text-[var(--color-accent)]" />
          )}
        </button>
      ))}
    </div>
  );
}
