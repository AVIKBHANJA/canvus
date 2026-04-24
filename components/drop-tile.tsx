"use client";

import * as React from "react";
import {
  Copy,
  Download,
  ExternalLink,
  File as FileIcon,
  FolderInput,
  Image as ImageIcon,
  Link as LinkIcon,
  Pin,
  PinOff,
  Trash2,
  Type as TypeIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn, formatBytes, relativeTime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Collection, Drop } from "@/lib/types";
import { looksLikeMarkdown } from "@/lib/markdown-detect";
import { MarkdownBody } from "./markdown-body";
import { MoveToMenu } from "./move-to-menu";

const TYPE_ICON = {
  TEXT: TypeIcon,
  LINK: LinkIcon,
  IMAGE: ImageIcon,
  FILE: FileIcon,
} as const;

const TYPE_TONE = {
  TEXT: "default",
  LINK: "link",
  IMAGE: "image",
  FILE: "file",
} as const;

/** `http(s):`-only guard. Blocks `javascript:`, `data:`, `file:`, etc. */
function isSafeHttpUrl(s: string | null | undefined): s is string {
  if (!s) return false;
  return s.startsWith("http://") || s.startsWith("https://");
}

function isInputLike(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Returns a signed URL for a file in `canvus-files`. Cached per path
 * for the lifetime of the tab. Signed URLs expire in 1 hour; we refresh
 * on demand (next call gets a fresh one).
 */
const urlCache = new Map<string, { url: string; exp: number }>();

export async function getSignedUrl(path: string): Promise<string | null> {
  const cached = urlCache.get(path);
  if (cached && cached.exp > Date.now() + 60_000) return cached.url;

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("canvus-files")
    .createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  urlCache.set(path, {
    url: data.signedUrl,
    exp: Date.now() + 3600 * 1000,
  });
  return data.signedUrl;
}

/** Invalidate the cached signed URL for a given path. */
export function invalidateSignedUrl(path: string): void {
  urlCache.delete(path);
}

function DropTileImpl({
  drop,
  collections,
  onDelete,
  onPin,
  onSelectTag,
  onMoveToCollection,
  onSelectCollection,
  isNew,
}: {
  drop: Drop;
  collections: Collection[];
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onSelectTag: (tag: string) => void;
  onMoveToCollection: (id: string, collectionId: string | null) => void;
  onSelectCollection: (id: string) => void;
  isNew?: boolean;
}) {
  const Icon = TYPE_ICON[drop.type];
  const tone = TYPE_TONE[drop.type];
  const articleRef = React.useRef<HTMLElement>(null);
  const [focused, setFocused] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [flash, setFlash] = React.useState(false);
  const [moveMenuOpen, setMoveMenuOpen] = React.useState(false);

  const active = focused || hovered;
  const collection = React.useMemo(
    () => collections.find((c) => c.id === drop.collectionId) ?? null,
    [collections, drop.collectionId],
  );

  const triggerFlash = React.useCallback(() => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 320);
  }, []);

  const copy = React.useCallback(async () => {
    const text =
      drop.type === "LINK"
        ? (drop.url ?? drop.content ?? "")
        : (drop.content ?? drop.fileName ?? "");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      triggerFlash();
      toast("Copied to clipboard");
    } catch {
      toast("Couldn't access clipboard");
    }
  }, [drop, triggerFlash]);

  const download = React.useCallback(async () => {
    if (!drop.filePath) return;
    const signed = await getSignedUrl(drop.filePath);
    if (!signed) {
      toast("Couldn't fetch file");
      return;
    }
    const a = document.createElement("a");
    a.href = signed;
    a.download = drop.fileName ?? "download";
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
    triggerFlash();
  }, [drop, triggerFlash]);

  const open = React.useCallback(() => {
    if (isSafeHttpUrl(drop.url))
      window.open(drop.url, "_blank", "noopener,noreferrer");
  }, [drop]);

  const delSelf = React.useCallback(() => {
    onDelete(drop.id);
  }, [drop.id, onDelete]);

  const togglePin = React.useCallback(() => {
    onPin(drop.id, !drop.pinned);
  }, [drop.id, drop.pinned, onPin]);

  // Keyboard shortcuts while the tile is focused (or still hovered as a
  // fallback, guarded against typing in inputs).
  React.useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (isInputLike(e.target)) return;
      if (window.getSelection()?.toString()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "c") {
        e.preventDefault();
        copy();
      } else if (e.key === "d") {
        e.preventDefault();
        delSelf();
      } else if (e.key === "p") {
        e.preventDefault();
        togglePin();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, copy, delSelf, togglePin]);

  return (
    <article
      ref={articleRef}
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={(e) => {
        // Fire when the tile itself or one of its children gains focus.
        if (articleRef.current?.contains(e.target)) setFocused(true);
      }}
      onBlur={(e) => {
        // Blur only when focus leaves the tile entirely.
        if (!articleRef.current?.contains(e.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
      className={cn(
        "tile card relative overflow-hidden p-4 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2",
        isNew && "animate-drop-in",
        flash && "ring-accent",
        drop.pinned &&
          "border-[color-mix(in_oklch,var(--color-accent)_30%,var(--color-border))]",
      )}
      aria-label={`${drop.type.toLowerCase()} drop`}
    >
      {/* Header row */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn(
              "grid h-6 w-6 place-items-center rounded-md",
              drop.type === "TEXT" &&
                "bg-[var(--color-surface)] text-[var(--color-fg-mute)]",
              drop.type === "LINK" &&
                "bg-[color-mix(in_oklch,var(--color-link)_18%,transparent)] text-[var(--color-link)]",
              drop.type === "IMAGE" &&
                "bg-[color-mix(in_oklch,var(--color-image)_18%,transparent)] text-[var(--color-image)]",
              drop.type === "FILE" &&
                "bg-[color-mix(in_oklch,var(--color-file)_18%,transparent)] text-[var(--color-file)]",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <Badge tone={tone}>{drop.type.toLowerCase()}</Badge>
          {drop.pinned && (
            <Badge tone="accent">
              <Pin className="h-2.5 w-2.5" /> pinned
            </Badge>
          )}
        </div>

        <div
          className={cn(
            "flex items-center gap-1 transition-opacity duration-200",
            active ? "opacity-100" : "opacity-0 sm:opacity-40",
          )}
        >
          {(drop.type === "TEXT" || drop.type === "LINK") && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Copy"
              onClick={copy}
              title="Copy (c)"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          {drop.type === "LINK" && isSafeHttpUrl(drop.url) && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open link"
              onClick={open}
              title="Open link"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
          {(drop.type === "IMAGE" || drop.type === "FILE") && drop.filePath && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Download"
              onClick={download}
              title="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Move to collection"
              onClick={() => setMoveMenuOpen((v) => !v)}
              title="Move to collection"
            >
              <FolderInput className="h-3.5 w-3.5" />
            </Button>
            {moveMenuOpen && (
              <MoveToMenu
                collections={collections}
                currentId={drop.collectionId}
                onPick={(id) => onMoveToCollection(drop.id, id)}
                onClose={() => setMoveMenuOpen(false)}
              />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={drop.pinned ? "Unpin" : "Pin"}
            onClick={togglePin}
            title={drop.pinned ? "Unpin (p)" : "Pin (p)"}
          >
            {drop.pinned ? (
              <PinOff className="h-3.5 w-3.5" />
            ) : (
              <Pin className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="danger"
            size="icon"
            aria-label="Delete"
            onClick={delSelf}
            title="Delete (d)"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="mt-3">
        {drop.type === "TEXT" && (
          <TextBody text={drop.content ?? ""} onCopy={copy} />
        )}
        {drop.type === "LINK" && <LinkBody drop={drop} onOpen={open} />}
        {drop.type === "IMAGE" && <ImageBody drop={drop} />}
        {drop.type === "FILE" && <FileBody drop={drop} onDownload={download} />}
      </div>

      {/* Footer */}
      <footer className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        {collection && (
          <button
            onClick={() => onSelectCollection(collection.id)}
            className="press mono inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-mute)] bg-[var(--color-surface)] px-2 py-0.5 text-[12px] text-[var(--color-fg-mute)] hover:border-[var(--color-accent)] hover:text-[var(--color-fg)]"
          >
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ background: `var(--canvus-color-${collection.color})` }}
            />
            {collection.name}
          </button>
        )}
        {drop.tags.map((t) => (
          <button
            key={t}
            onClick={() => onSelectTag(t)}
            className="press mono rounded-full border border-[var(--color-border-mute)] bg-transparent px-2 py-0.5 text-[12px] text-[var(--color-fg-mute)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            #{t}
          </button>
        ))}
        <div className="mono tnum ml-auto flex items-center gap-1.5 text-[12px] text-[var(--color-fg-mute)]">
          {drop.deviceName && <span>from {drop.deviceName}</span>}
          {drop.deviceName && <span aria-hidden>·</span>}
          <time
            dateTime={drop.createdAt}
            title={new Date(drop.createdAt).toLocaleString()}
          >
            {relativeTime(drop.createdAt)}
          </time>
        </div>
      </footer>
    </article>
  );
}

/**
 * Memoize DropTile so that realtime updates to unrelated rows don't trigger
 * needless re-renders across the feed. Parent treats drops immutably, so
 * referential equality is correct.
 */
export const DropTile = React.memo(DropTileImpl, (prev, next) => {
  return (
    prev.drop === next.drop &&
    prev.collections === next.collections &&
    prev.isNew === next.isNew &&
    prev.onDelete === next.onDelete &&
    prev.onPin === next.onPin &&
    prev.onSelectTag === next.onSelectTag &&
    prev.onMoveToCollection === next.onMoveToCollection &&
    prev.onSelectCollection === next.onSelectCollection
  );
});
DropTile.displayName = "DropTile";

function TextBody({ text, onCopy }: { text: string; onCopy: () => void }) {
  const markdown = React.useMemo(() => looksLikeMarkdown(text), [text]);
  const [rendered, setRendered] = React.useState(markdown);
  const isCode =
    !markdown &&
    text.length < 2000 &&
    /[{}();=<>]/.test(text) &&
    text.includes("\n");
  const preview = text.length > 3000 ? text.slice(0, 3000) + "…" : text;

  // Filter copy-on-click when the user clicks a link, button, or code inside
  // the rendered markdown — they're interacting with content, not copying.
  const handleClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement | null;
    if (
      t &&
      (t.closest("a") ||
        t.closest("button") ||
        t.closest("code") ||
        t.closest("pre"))
    ) {
      return;
    }
    onCopy();
  };

  return (
    <div
      className={cn(
        "group/text relative rounded-[10px] border border-[var(--color-border-mute)] bg-[color-mix(in_oklch,var(--color-bg)_60%,var(--color-surface))] p-3",
      )}
    >
      {markdown && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-0 overflow-hidden rounded-full border border-[var(--color-border-mute)] bg-[var(--color-bg)] p-0.5 opacity-0 transition-opacity group-hover/text:opacity-100 focus-within:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRendered(true);
            }}
            className={cn(
              "mono rounded-full px-2 py-0.5 text-[10.5px] uppercase tracking-[0.14em]",
              rendered
                ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                : "text-[var(--color-fg-mute)] hover:text-[var(--color-fg)]",
            )}
          >
            md
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRendered(false);
            }}
            className={cn(
              "mono rounded-full px-2 py-0.5 text-[10.5px] uppercase tracking-[0.14em]",
              !rendered
                ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                : "text-[var(--color-fg-mute)] hover:text-[var(--color-fg)]",
            )}
          >
            raw
          </button>
        </div>
      )}
      {markdown && rendered ? (
        <div onClick={handleClick} className="cursor-copy">
          <MarkdownBody text={preview} />
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={onCopy}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onCopy();
            }
          }}
          className={cn(
            "cursor-copy whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--color-fg)]",
            isCode && "mono text-xs",
          )}
        >
          {preview}
        </div>
      )}
    </div>
  );
}

function LinkBody({ drop, onOpen }: { drop: Drop; onOpen: () => void }) {
  const host = (() => {
    try {
      return drop.url ? new URL(drop.url).host.replace(/^www\./, "") : "";
    } catch {
      return "";
    }
  })();
  const safeImage = isSafeHttpUrl(drop.ogImage) ? drop.ogImage : null;
  return (
    <button
      onClick={onOpen}
      className="press group block w-full overflow-hidden rounded-[10px] border border-[var(--color-border-mute)] bg-[color-mix(in_oklch,var(--color-bg)_60%,var(--color-surface))] text-left"
    >
      {safeImage && (
        <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-[var(--color-surface-2)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={safeImage}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      <div className="p-3">
        <div className="mono mb-1 text-[12px] uppercase tracking-[0.14em] text-[var(--color-link)]">
          {host}
        </div>
        {drop.ogTitle && (
          <div className="line-clamp-2 text-sm font-medium leading-snug text-[var(--color-fg)]">
            {drop.ogTitle}
          </div>
        )}
        {drop.ogDesc && (
          <div className="mt-1 line-clamp-2 text-xs text-[var(--color-fg-mute)]">
            {drop.ogDesc}
          </div>
        )}
        {!drop.ogTitle && !drop.ogDesc && drop.url && (
          <div className="mono break-all text-xs text-[var(--color-fg-mute)]">
            {drop.url}
          </div>
        )}
      </div>
    </button>
  );
}

function ImageBody({ drop }: { drop: Drop }) {
  const [src, setSrc] = React.useState<string | null>(
    isSafeHttpUrl(drop.thumbnail) ? drop.thumbnail : null,
  );
  const [error, setError] = React.useState(false);
  const retriedRef = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    if (!src && drop.filePath) {
      getSignedUrl(drop.filePath).then((u) => {
        if (!cancelled) {
          if (u) setSrc(u);
          else setError(true);
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [src, drop.filePath]);

  // If the signed URL was rejected (403 / expired), invalidate the cache
  // and try once more. After that, surface the "unavailable" state.
  const handleError = React.useCallback(() => {
    if (retriedRef.current || !drop.filePath) {
      setError(true);
      return;
    }
    retriedRef.current = true;
    invalidateSignedUrl(drop.filePath);
    setSrc(null);
    getSignedUrl(drop.filePath).then((u) => {
      if (u) setSrc(u);
      else setError(true);
    });
  }, [drop.filePath]);

  if (!drop.filePath) return null;
  const linkHref = isSafeHttpUrl(src) ? src : undefined;
  return (
    <a
      href={linkHref ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        if (!linkHref) e.preventDefault();
      }}
      className="press block overflow-hidden rounded-[10px] border border-[var(--color-border-mute)] bg-[var(--color-surface-2)]"
    >
      <div className="relative w-full">
        {src ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt={drop.fileName ?? "image drop"}
            loading="lazy"
            onError={handleError}
            className="block h-auto w-full"
          />
        ) : (
          <div className="aspect-[4/3] w-full shimmer" aria-hidden />
        )}
        {error && (
          <div className="mono absolute inset-0 grid place-items-center bg-[color-mix(in_oklch,var(--color-bg)_60%,transparent)] text-[12px] uppercase tracking-[0.14em] text-[var(--color-fg-mute)]">
            image unavailable
          </div>
        )}
      </div>
      {drop.fileName && (
        <div className="mono flex items-center justify-between gap-2 border-t border-[var(--color-border-mute)] px-3 py-2 text-[12px] text-[var(--color-fg-mute)]">
          <span className="truncate">{drop.fileName}</span>
          <span className="tnum shrink-0">{formatBytes(drop.fileSize)}</span>
        </div>
      )}
    </a>
  );
}

function FileBody({
  drop,
  onDownload,
}: {
  drop: Drop;
  onDownload: () => void;
}) {
  const ext = (drop.fileName?.split(".").pop() ?? "file").slice(0, 5);
  return (
    <button
      onClick={onDownload}
      className="press flex w-full items-center gap-3 rounded-[10px] border border-[var(--color-border-mute)] bg-[color-mix(in_oklch,var(--color-bg)_60%,var(--color-surface))] p-3 text-left"
    >
      <span
        aria-hidden
        className="mono grid h-12 w-12 shrink-0 place-items-center rounded-md border border-[color-mix(in_oklch,var(--color-file)_30%,transparent)] bg-[color-mix(in_oklch,var(--color-file)_14%,transparent)] text-[10px] uppercase tracking-wider text-[var(--color-file)]"
      >
        {ext}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-[var(--color-fg)]">
          {drop.fileName}
        </div>
        <div className="mono tnum mt-0.5 flex items-center gap-2 text-[12px] text-[var(--color-fg-mute)]">
          <span>{drop.fileMime ?? "file"}</span>
          <span>·</span>
          <span>{formatBytes(drop.fileSize)}</span>
        </div>
      </div>
      <Download className="h-4 w-4 text-[var(--color-fg-mute)]" />
    </button>
  );
}
