import Link from "next/link";

export const metadata = { title: "Not found · Canvus" };

export default function NotFound() {
  return (
    <section className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div
        aria-hidden
        className="mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-fg-dim)]"
      >
        404 · off the canvas
      </div>
      <h1 className="max-w-xl text-[52px] leading-[0.98] tracking-tight text-[var(--color-fg)] sm:text-[72px]">
        Nothing dropped{" "}
        <span className="text-[var(--color-accent)]">here</span>.
      </h1>
      <p className="max-w-md text-sm text-[var(--color-fg-mute)]">
        The page you&apos;re looking for doesn&apos;t exist — but your clipboard
        is still a tap away.
      </p>
      <Link
        href="/"
        className="press mono inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[var(--color-accent-ink)]"
      >
        ← back to feed
      </Link>
    </section>
  );
}
