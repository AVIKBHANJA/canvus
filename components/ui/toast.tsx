"use client";

import * as React from "react";

type Toast = {
  id: number;
  text: string;
  action?: { label: string; onClick: () => void };
};

const listeners = new Set<(t: Toast[]) => void>();
let items: Toast[] = [];
let nextId = 1;

function push(t: Toast, ttl = 2400) {
  items = [...items, t];
  listeners.forEach((l) => l(items));
  window.setTimeout(() => {
    items = items.filter((x) => x.id !== t.id);
    listeners.forEach((l) => l(items));
  }, ttl);
}

export function toast(text: string) {
  push({ id: nextId++, text });
}

/**
 * A toast that offers an undo button for N ms, then commits.
 * - `onUndo` fires if the user clicks "Undo" before the toast expires.
 * - `onCommit` always fires on expiry; implementers should no-op if undone.
 */
export function UndoToast({
  text,
  onUndo,
  onCommit,
  ttlMs = 5000,
}: {
  text: string;
  onUndo: () => void;
  onCommit: () => void | Promise<void>;
  ttlMs?: number;
}) {
  let undone = false;
  const id = nextId++;
  const t: Toast = {
    id,
    text,
    action: {
      label: "Undo",
      onClick: () => {
        if (undone) return;
        undone = true;
        items = items.filter((x) => x.id !== id);
        listeners.forEach((l) => l(items));
        onUndo();
      },
    },
  };
  push(t, ttlMs);
  window.setTimeout(() => {
    if (!undone) onCommit();
  }, ttlMs);
}

export function Toaster() {
  const [list, setList] = React.useState<Toast[]>(items);
  React.useEffect(() => {
    const fn = (t: Toast[]) => setList([...t]);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return (
    <div
      className="pointer-events-none fixed bottom-4 left-1/2 z-[90] flex -translate-x-1/2 flex-col items-center gap-2"
      aria-live="polite"
    >
      {list.map((t) => (
        <div
          key={t.id}
          className="glass animate-fade-up pointer-events-auto flex items-center gap-3 rounded-full px-4 py-2 text-xs text-[var(--color-fg)] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)]"
        >
          <span>{t.text}</span>
          {t.action && (
            <button
              onClick={t.action.onClick}
              className="press mono rounded-full border border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_14%,transparent)] px-2 py-0.5 text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-ink)]"
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
