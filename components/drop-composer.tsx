"use client";

import * as React from "react";
import {
  File as FileIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Type as TypeIcon,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { cn, isUrl } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Drop, DropType } from "@/lib/types";

type Tab = "text" | "link" | "image" | "file";

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB — matches Supabase bucket limit

/** Same allow-list as the DB CHECK constraint. */
const ALLOWED_MIMES = new Set<string>([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/zip",
  "application/json",
  "application/x-zip-compressed",
]);

const TAG_RE = /^[\w\- ]{1,32}$/;

/** Normalize browser/OS MIME quirks + fall back to extension mapping. */
function normalizeMime(file: File): string {
  const raw = (file.type || "").toLowerCase();
  // Some browsers/OSes report "image/jpg" — canonicalize to jpeg.
  if (raw === "image/jpg") return "image/jpeg";
  if (raw && raw !== "application/octet-stream") return raw;

  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    avif: "image/avif",
    heic: "image/heic",
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    csv: "text/csv",
    zip: "application/zip",
    json: "application/json",
  };
  return map[ext] ?? "";
}

/** Returns true when the current event target shouldn't trigger global shortcuts. */
function isInputLike(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  const role = target.getAttribute("role");
  if (role === "textbox" || role === "combobox") return true;
  return false;
}

export type Stage = {
  /** Monotonic counter — bump to re-trigger opening even with identical payload. */
  seq: number;
  file?: File;
  text?: string;
  url?: string;
};

export function DropComposer({
  onCreated,
  prefill,
  stage,
}: {
  onCreated: (d: Drop) => void;
  prefill?: { text?: string; url?: string; file?: File };
  stage?: Stage;
}) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<Tab>("text");
  const [text, setText] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [tags, setTags] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const textRef = React.useRef<HTMLTextAreaElement>(null);
  const fabRef = React.useRef<HTMLButtonElement>(null);

  // Remember the FAB so we can restore focus when the dialog closes.
  const closeDialog = React.useCallback(() => {
    setOpen(false);
    window.setTimeout(() => fabRef.current?.focus(), 0);
  }, []);

  // Apply prefill from /share route
  React.useEffect(() => {
    if (!prefill) return;
    if (prefill.file) {
      setFile(prefill.file);
      setTab(prefill.file.type.startsWith("image/") ? "image" : "file");
      setOpen(true);
    } else if (prefill.url) {
      setUrl(prefill.url);
      setTab("link");
      setOpen(true);
    } else if (prefill.text) {
      const t = prefill.text;
      if (isUrl(t.trim())) {
        setUrl(t.trim());
        setTab("link");
      } else {
        setText(t);
        setTab("text");
      }
      setOpen(true);
    }
  }, [prefill]);

  // Global paste: cmd/ctrl+v anywhere opens composer with pasted content.
  // Also: paste of an image while composer is open + image/file tab is active
  // picks up the pasted image.
  React.useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const dt = e.clipboardData;
      if (!dt) return;

      const items = Array.from(dt.items);
      const imgItem = items.find((i) => i.kind === "file" && i.type.startsWith("image/"));

      // Inside a real text input: let the browser handle text paste, but
      // still intercept image paste (text inputs can't consume images anyway).
      if (isInputLike(e.target) && !imgItem) return;

      if (imgItem) {
        const f = imgItem.getAsFile();
        if (f) {
          e.preventDefault();
          setFile(f);
          setTab("image");
          setOpen(true);
          toast("Image pasted — click Drop it to save");
          return;
        }
      }

      // Don't hijack pastes while the composer is open (user might be typing).
      if (open) return;

      const pasted = dt.getData("text/plain");
      if (!pasted || !pasted.trim()) return;
      e.preventDefault();
      if (isUrl(pasted.trim())) {
        setUrl(pasted.trim());
        setTab("link");
      } else {
        setText(pasted);
        setTab("text");
      }
      setOpen(true);
      toast(isUrl(pasted.trim()) ? "Link pasted" : "Text pasted");
    };
    // Listen on both — some browsers fire on document only when nothing is focused.
    document.addEventListener("paste", onPaste);
    window.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("paste", onPaste);
      window.removeEventListener("paste", onPaste);
    };
  }, [open]);

  // Global keyboard: "n" opens composer. Escape is handled by the focus trap.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open) return;
      if (isInputLike(e.target)) return;
      if (window.getSelection()?.toString()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Autofocus textarea when opened to text tab
  React.useEffect(() => {
    if (open && tab === "text") {
      window.setTimeout(() => textRef.current?.focus(), 50);
    }
  }, [open, tab]);

  // Global Escape handler while dialog is open.
  React.useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDialog();
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, closeDialog]);

  // Global drag-drop: works whether the composer is open or closed.
  // Dropping a file anywhere on the page opens the composer with that file.
  // We preventDefault on every dragover so the browser doesn't navigate-to-file
  // when the drop lands outside an explicit drop-zone child.
  React.useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => {
      const t = e.dataTransfer?.types;
      if (!t) return false;
      // Cross-browser: "Files" on Chromium/Firefox, "application/x-moz-file" on FF, sometimes empty on dragenter in Safari
      for (let i = 0; i < t.length; i++) {
        const v = (t as unknown as { [i: number]: string })[i];
        if (v === "Files" || v === "application/x-moz-file") return true;
      }
      return false;
    };
    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth += 1;
      setDragging(true);
    };
    const onDragOver = (e: DragEvent) => {
      // Always prevent default so the page becomes a valid drop target; browsers
      // otherwise open the file and navigate away.
      if (e.dataTransfer?.types?.length) e.preventDefault();
      if (!hasFiles(e)) return;
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      setDragging(true);
    };
    const onDragLeave = (e: DragEvent) => {
      depth = Math.max(0, depth - 1);
      if (depth === 0 || e.relatedTarget == null) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const f = files[0];
      setFile(f);
      setTab(f.type.startsWith("image/") ? "image" : "file");
      setOpen(true);
    };
    // Listen to both window and document — some browser configurations only
    // deliver drag events to one or the other.
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  // Parent-driven staging: when `stage.seq` bumps, open the composer with the
  // provided payload. This is the reliable path for the empty-state drop zone
  // and the "Pick a file" button (no custom-event race).
  const lastSeqRef = React.useRef<number>(0);
  React.useEffect(() => {
    if (!stage) return;
    if (stage.seq === lastSeqRef.current) return;
    lastSeqRef.current = stage.seq;
    if (stage.file) {
      setFile(stage.file);
      setTab(stage.file.type.startsWith("image/") ? "image" : "file");
    } else if (stage.url) {
      setUrl(stage.url);
      setTab("link");
    } else if (stage.text) {
      setText(stage.text);
      setTab("text");
    }
    setOpen(true);
  }, [stage]);

  function reset() {
    setText("");
    setUrl("");
    setFile(null);
    setTags("");
  }

  function parseTags(): string[] {
    return tags
      .split(",")
      .map((s) => s.trim().replace(/^#/, ""))
      .filter(Boolean)
      .filter((t) => TAG_RE.test(t))
      .slice(0, 12);
  }

  async function submit() {
    if (busy) return;
    const parsedTags = parseTags();

    try {
      setBusy(true);

      if (tab === "text" || tab === "link") {
        // Server route writes + fetches OG.
        if (tab === "text" && !text.trim()) {
          toast("Type something first");
          return;
        }
        if (tab === "link" && (!url.trim() || !isUrl(url.trim()))) {
          toast("Enter a valid URL");
          return;
        }

        const body =
          tab === "text"
            ? { type: "TEXT", content: text, tags: parsedTags }
            : { type: "LINK", url: url.trim(), tags: parsedTags };

        const res = await fetch("/api/drops", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          toast(j.error || "Couldn't create drop");
          return;
        }
        const { drop } = (await res.json()) as { drop: Drop };
        onCreated(drop);
      } else {
        // IMAGE / FILE — upload to Supabase Storage from the browser, then
        // create the row via POST /api/drops so zod + DB constraints are
        // enforced.
        if (!file) {
          toast("Pick a file first");
          return;
        }
        if (file.size > MAX_FILE_BYTES) {
          toast("File exceeds 50 MB");
          return;
        }
        const mime = normalizeMime(file);
        if (!mime || !ALLOWED_MIMES.has(mime)) {
          toast(
            `That file type isn't allowed (${file.type || "unknown"} · .${
              file.name.split(".").pop() || "?"
            })`,
          );
          return;
        }

        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          toast("You're signed out");
          return;
        }

        const rawExt =
          file.name.split(".").pop()?.toLowerCase() || extFromMime(mime);
        const ext = rawExt.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
        const id = crypto.randomUUID();
        const path = `${user.id}/${id}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("canvus-files")
          .upload(path, file, {
            contentType: mime,
            upsert: false,
            cacheControl: "3600",
          });
        if (upErr) {
          toast("Upload failed");
          console.error("[upload]", upErr);
          return;
        }

        // Create a short-lived signed URL so the feed can show the image
        // immediately without waiting for the tile to request one.
        let thumbnail: string | null = null;
        if (mime.startsWith("image/")) {
          const { data: signed } = await supabase.storage
            .from("canvus-files")
            .createSignedUrl(path, 3600);
          thumbnail = signed?.signedUrl ?? null;
        }

        const dropType: DropType = mime.startsWith("image/") ? "IMAGE" : "FILE";

        const res = await fetch("/api/drops", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type: dropType,
            file_path: path,
            file_name: file.name,
            file_mime: mime,
            file_size: file.size,
            thumbnail,
            tags: parsedTags,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          toast(j.error || "Couldn't save drop");
          // Best-effort cleanup of the orphaned file.
          await supabase.storage.from("canvus-files").remove([path]);
          return;
        }
        const { drop } = (await res.json()) as { drop: Drop };
        onCreated(drop);
      }

      reset();
      closeDialog();
      toast("Drop saved");
    } catch (e) {
      console.error(e);
      toast("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Global drag overlay — shown whenever files are being dragged over the window */}
      {dragging && !open && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-[color-mix(in_oklch,var(--color-accent)_10%,transparent)] backdrop-blur-[2px]"
        >
          <div className="mono rounded-2xl border-2 border-dashed border-[var(--color-accent)] bg-[var(--color-bg)] px-6 py-4 text-sm uppercase tracking-[0.14em] text-[var(--color-accent)]">
            Drop to add
          </div>
        </div>
      )}

      {/* Floating trigger */}
      <button
        ref={fabRef}
        onClick={() => setOpen(true)}
        className="press glass fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full border border-[var(--color-border)] px-5 py-3 text-sm font-medium text-[var(--color-fg)] shadow-[0_18px_60px_-20px_rgba(0,0,0,0.5)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] sm:bottom-8 sm:left-auto sm:right-8 sm:translate-x-0"
        aria-label="New drop (press N)"
      >
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
          >
            <Plus className="h-3 w-3" strokeWidth={3} />
          </span>
          <span>New drop</span>
          <kbd className="mono ml-1 hidden rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-fg-mute)] sm:inline">
            ⌘V
          </kbd>
        </span>
      </button>

      {/* Dialog */}
      {open && (
        <div
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              closeDialog();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Create a drop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          >
            <button
              aria-label="Close"
              onClick={closeDialog}
              className="absolute inset-0 animate-fade-up bg-[color-mix(in_oklch,var(--color-bg)_55%,black)] backdrop-blur-md"
            />
            <div
              className={cn(
                "card relative w-full max-w-[620px] overflow-hidden animate-fade-up",
                dragging &&
                  "ring-2 ring-offset-0 ring-[var(--color-accent)] border-transparent",
              )}
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border-mute)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="mono text-[12px] uppercase tracking-[0.18em] text-[var(--color-fg-mute)]">
                    New drop
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close"
                  onClick={closeDialog}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1 border-b border-[var(--color-border-mute)] px-2 py-2">
                <TabButton
                  active={tab === "text"}
                  onClick={() => setTab("text")}
                  icon={<TypeIcon className="h-3.5 w-3.5" />}
                  label="Text"
                />
                <TabButton
                  active={tab === "link"}
                  onClick={() => setTab("link")}
                  icon={<LinkIcon className="h-3.5 w-3.5" />}
                  label="Link"
                />
                <TabButton
                  active={tab === "image"}
                  onClick={() => setTab("image")}
                  icon={<ImageIcon className="h-3.5 w-3.5" />}
                  label="Image"
                />
                <TabButton
                  active={tab === "file"}
                  onClick={() => setTab("file")}
                  icon={<FileIcon className="h-3.5 w-3.5" />}
                  label="File"
                />
                <div className="mono ml-auto hidden pr-2 text-[12px] uppercase tracking-[0.14em] text-[var(--color-fg-mute)] sm:block">
                  paste · drop · type
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {tab === "text" && (
                  <Textarea
                    ref={textRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Drop any text — a quote, a thought, a snippet…"
                    className="min-h-[180px]"
                  />
                )}

                {tab === "link" && (
                  <div className="space-y-3">
                    <Input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://…"
                      autoFocus
                    />
                    <p className="mono text-[12px] text-[var(--color-fg-mute)]">
                      We&apos;ll fetch the title, description, and preview image.
                    </p>
                  </div>
                )}

                {(tab === "image" || tab === "file") && (
                  <FilePicker
                    file={file}
                    onFile={setFile}
                    accept={tab === "image" ? "image/*" : undefined}
                  />
                )}

                <div className="mt-4">
                  <label
                    htmlFor="tags"
                    className="mono text-[12px] uppercase tracking-[0.14em] text-[var(--color-fg-mute)]"
                  >
                    Tags · comma separated
                  </label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="inspo, research, clients"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border-mute)] bg-[color-mix(in_oklch,var(--color-bg)_40%,var(--color-bg-elev))] px-4 py-3">
                <div className="mono text-[12px] text-[var(--color-fg-mute)]">
                  <kbd className="rounded border border-[var(--color-border)] px-1 py-0.5">
                    Esc
                  </kbd>{" "}
                  to close ·{" "}
                  <kbd className="rounded border border-[var(--color-border)] px-1 py-0.5">
                    ⌘↵
                  </kbd>{" "}
                  to save
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={closeDialog}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="accent"
                    size="md"
                    onClick={submit}
                    disabled={busy}
                    onKeyDownCapture={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
                    }}
                  >
                    {busy ? "Saving…" : "Drop it"}
                  </Button>
                </div>
              </div>

              {dragging && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[color-mix(in_oklch,var(--color-accent)_8%,transparent)]">
                  <div className="mono rounded-full border border-[var(--color-accent)] bg-[var(--color-bg)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[var(--color-accent)]">
                    Release to drop
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/heic": "heic",
    "application/pdf": "pdf",
    "text/plain": "txt",
    "text/markdown": "md",
    "text/csv": "csv",
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
    "application/json": "json",
  };
  return map[mime] ?? "bin";
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "press inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-medium",
        active
          ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
          : "text-[var(--color-fg-mute)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]",
      )}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  );
}

function FilePicker({
  file,
  onFile,
  accept,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  accept?: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => ref.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") ref.current?.click();
        }}
        className="grid cursor-pointer place-items-center rounded-[14px] border border-dashed border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-bg)_60%,var(--color-surface))] px-6 py-10 text-center hover:border-[var(--color-accent)] hover:bg-[var(--color-surface)]"
      >
        {file ? (
          <div className="flex flex-col items-center gap-1">
            <div className="text-sm font-medium text-[var(--color-fg)]">
              {file.name}
            </div>
            <div className="mono tnum text-[12px] text-[var(--color-fg-mute)]">
              {(file.size / 1024).toFixed(1)} KB · {file.type || "unknown"}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFile(null);
              }}
              className="press mono mt-2 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[12px] text-[var(--color-fg-mute)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-[var(--color-fg-mute)]">
            <Upload className="h-5 w-5" />
            <div className="text-sm">Click, drop, or paste a file</div>
            <div className="mono text-[12px] uppercase tracking-[0.14em] text-[var(--color-fg-mute)]">
              up to 50 MB
            </div>
          </div>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        className="sr-only"
        accept={accept}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
