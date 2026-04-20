import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Command,
  FileText,
  Fingerprint,
  Image as ImageIcon,
  Keyboard,
  Link as LinkIcon,
  Paperclip,
  Pin,
  Undo2,
  Waypoints,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Canvus — the cloud clipboard for every device",
  description:
    "Drop text, links, images, and files on any device — they land everywhere else, instantly. Private by default. PWA-ready.",
};

export default function LandingPage() {
  return (
    <div className="relative z-10 min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[10px] focus:bg-[var(--color-accent)] focus:px-3 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-[var(--color-accent-ink)]"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <Showcase />
        <Features />
        <FlowDiagram />
        <KeyboardSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

/* ----------------------------------------------------------------
   Nav
   ---------------------------------------------------------------- */

function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="absolute inset-x-0 top-0 h-full bg-[color-mix(in_oklch,var(--color-bg)_72%,transparent)] backdrop-blur-lg backdrop-saturate-150 border-b border-[color-mix(in_oklch,var(--color-border)_60%,transparent)]" />
      <nav className="relative mx-auto flex h-14 max-w-[1240px] items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <LogoMark />
          <span className="text-[15px] font-semibold tracking-tight text-[var(--color-fg)]">
            Canvus
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          <a
            href="#showcase"
            className="link-grow text-[13px] text-[var(--color-fg-mute)] hover:text-[var(--color-fg)] transition-colors"
          >
            Showcase
          </a>
          <a
            href="#features"
            className="link-grow text-[13px] text-[var(--color-fg-mute)] hover:text-[var(--color-fg)] transition-colors"
          >
            Features
          </a>
          <a
            href="#shortcuts"
            className="link-grow text-[13px] text-[var(--color-fg-mute)] hover:text-[var(--color-fg)] transition-colors"
          >
            Shortcuts
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="press hidden h-9 items-center rounded-[10px] px-3 text-[13px] text-[var(--color-fg-mute)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)] sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="press inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[var(--color-accent)] px-3.5 text-[13px] font-medium text-[var(--color-accent-ink)] shadow-[0_6px_22px_-10px_var(--color-accent-glow)] hover:brightness-105"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

function LogoMark() {
  return (
    <span
      aria-hidden
      className="relative inline-flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--color-accent)] text-[var(--color-accent-ink)] shadow-[0_4px_18px_-8px_var(--color-accent-glow)]"
    >
      <span className="absolute inset-[3px] rounded-[5px] border border-[color-mix(in_oklch,var(--color-accent-ink)_35%,transparent)]" />
      <span className="relative mono text-[11px] font-bold">C</span>
    </span>
  );
}

/* ----------------------------------------------------------------
   Hero
   ---------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="aurora" />
      <div aria-hidden className="pointer-events-none absolute inset-0 gridlines opacity-70" />

      <div className="relative mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-14 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-28 lg:pt-24">
        {/* LEFT — copy */}
        <div className="relative">
          <div className="reveal reveal-1 inline-flex items-center gap-2 rounded-full border border-[var(--color-border-mute)] bg-[color-mix(in_oklch,var(--color-bg-elev)_70%,transparent)] px-3 py-1.5 backdrop-blur-md">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-[var(--color-accent)] animate-pulse-dot" />
              <span className="absolute inset-0 rounded-full bg-[var(--color-accent)]" />
            </span>
            <span className="mono text-[10.5px] uppercase tracking-[0.2em] text-[var(--color-fg-mute)]">
              Realtime · private · cross-device
            </span>
          </div>

          <h1 className="reveal reveal-2 mt-6 text-[48px] font-semibold leading-[0.98] tracking-[-0.02em] text-[var(--color-fg)] sm:text-[64px] md:text-[76px] lg:text-[84px]">
            A clipboard
            <br />
            that{" "}
            <span className="squiggle">
              follows
              <svg
                aria-hidden
                viewBox="0 0 220 16"
                preserveAspectRatio="none"
              >
                <path d="M2 10 Q 22 -2, 42 8 T 82 8 T 122 8 T 162 8 T 218 8" />
              </svg>
            </span>{" "}
            you.
          </h1>

          <p className="reveal reveal-3 mt-6 max-w-[560px] text-[17px] leading-[1.55] text-[var(--color-fg-mute)] sm:text-[18px]">
            Drop{" "}
            <span className="rotator w-[9ch] align-baseline">
              <span style={{ animationDelay: "0s" }}>a link</span>
              <span style={{ animationDelay: "2.3s" }}>a photo</span>
              <span style={{ animationDelay: "4.6s" }}>a snippet</span>
              <span style={{ animationDelay: "6.9s" }}>a file</span>
            </span>{" "}
            on your phone — it lands on your laptop instantly. And vice versa.
            Built for the fifty-times-a-day moment that kills your flow.
          </p>

          <div className="reveal reveal-4 mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="press group inline-flex h-12 items-center gap-2 rounded-[14px] bg-[var(--color-accent)] px-5 text-[14px] font-semibold text-[var(--color-accent-ink)] shadow-[0_10px_40px_-12px_var(--color-accent-glow)] hover:brightness-105"
            >
              Start dropping
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="press inline-flex h-12 items-center gap-2 rounded-[14px] border border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-bg-elev)_60%,transparent)] px-5 text-[14px] font-medium text-[var(--color-fg)] backdrop-blur-md hover:bg-[var(--color-surface)]"
            >
              I have an account
            </Link>
          </div>

          <ul className="reveal reveal-5 mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-[var(--color-fg-dim)]">
            {[
              "No card. Free forever tier.",
              "End-to-end RLS on Supabase.",
              "Installs as a PWA.",
            ].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT — device composition */}
        <div className="relative min-h-[420px] sm:min-h-[480px] lg:min-h-[580px]">
          <span className="sr-only">
            Example Canvus feed showing drops from a phone landing on a laptop
            in real time: a Figma link, a reminder to rotate AWS keys, and a
            whiteboard photo.
          </span>
          <DeviceComposition />
        </div>
      </div>

      {/* Marquee of drop types */}
      <div className="relative border-y border-[var(--color-border-mute)] bg-[color-mix(in_oklch,var(--color-bg-elev)_40%,transparent)] backdrop-blur-md">
        <div className="marquee-mask py-5">
          <div className="marquee-track gap-10">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span
                key={`${item}-${i}`}
                className="mono flex shrink-0 items-center gap-2 text-[11.5px] uppercase tracking-[0.22em] text-[var(--color-fg-dim)]"
              >
                <span className="h-1 w-1 rounded-full bg-[var(--color-accent)]" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const marqueeItems = [
  "copy on phone",
  "paste on laptop",
  "share to Canvus",
  "drag & drop files",
  "link previews",
  "image paste",
  "pin the important",
  "undo-anything",
  "keyboard first",
  "installable PWA",
];

/* ----------------------------------------------------------------
   Hero device composition — layered tiles & device frames (pure CSS)
   ---------------------------------------------------------------- */

function DeviceComposition() {
  return (
    <div className="relative h-full w-full">
      {/* Glow behind the laptop */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent)] opacity-20 blur-[90px]"
      />

      {/* Laptop (back) */}
      <div className="reveal reveal-3 absolute inset-x-0 bottom-6 mx-auto w-[92%] max-w-[520px]">
        <div className="relative rounded-[22px] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-2 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.55)]">
          {/* Screen */}
          <div className="overflow-hidden rounded-[16px] border border-[var(--color-border-mute)] bg-[var(--color-bg)]">
            {/* Fake app header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border-mute)] px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--color-border)]" />
                <span className="h-2 w-2 rounded-full bg-[var(--color-border)]" />
                <span className="h-2 w-2 rounded-full bg-[var(--color-border)]" />
              </div>
              <div className="mono text-[9.5px] uppercase tracking-[0.2em] text-[var(--color-fg-dim)]">
                canvus / feed
              </div>
              <div className="flex items-center gap-1 rounded-full border border-[var(--color-border-mute)] px-1.5 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse-dot" />
                <span className="mono text-[8.5px] uppercase tracking-[0.18em] text-[var(--color-fg-mute)]">
                  live
                </span>
              </div>
            </div>
            {/* Fake bento grid inside laptop */}
            <div className="grid grid-cols-3 gap-2 p-2.5">
              <MiniTile tone="accent" icon={<LinkIcon className="h-3 w-3" />}>
                figma.com/file/…
              </MiniTile>
              <MiniTile icon={<FileText className="h-3 w-3" />}>
                “add retry on flaky…”
              </MiniTile>
              <MiniTile tone="image" tall />
              <MiniTile icon={<Paperclip className="h-3 w-3" />}>
                contract_v3.pdf
              </MiniTile>
              <MiniTile tone="accent" icon={<Pin className="h-3 w-3" />}>
                OTP 492-108
              </MiniTile>
              <MiniTile icon={<LinkIcon className="h-3 w-3" />}>
                vercel.com/blog
              </MiniTile>
            </div>
          </div>
          {/* Hinge */}
          <div className="mx-auto mt-2 h-1.5 w-[85%] rounded-full bg-[var(--color-border)]" />
        </div>
      </div>

      {/* Phone (front) */}
      <div className="reveal reveal-2 absolute right-0 top-4 w-[180px] sm:w-[210px] lg:right-[-16px] lg:w-[230px]">
        <div className="relative rounded-[34px] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-1.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
          <div className="overflow-hidden rounded-[28px] border border-[var(--color-border-mute)] bg-[var(--color-bg)]">
            {/* Phone "notch" */}
            <div className="mx-auto mt-1.5 h-[18px] w-[58%] rounded-full bg-[var(--color-border)]/60" />
            <div className="space-y-1.5 p-2.5 pt-3">
              <MiniTile tone="accent" icon={<Zap className="h-3 w-3" />}>
                Dropped from iPhone
              </MiniTile>
              <MiniTile icon={<LinkIcon className="h-3 w-3" />}>
                github.com/anthropics…
              </MiniTile>
              <MiniTile tone="image" />
              <div className="mt-2 rounded-[10px] border border-dashed border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10 p-2 text-center">
                <span className="mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  drop here
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating drop tiles — only render on lg+ where they don't collide */}
      <FloatingTile
        className="absolute left-0 top-8 drift w-[180px] hidden lg:block"
        style={{ ["--tilt" as unknown as string]: "-4deg" }}
        icon={<LinkIcon className="h-3.5 w-3.5" />}
        label="LINK"
        title="figma.com/file/design-review"
        sub="canvus · 2s ago"
      />
      <FloatingTile
        className="absolute left-8 top-56 drift-slow w-[210px] hidden lg:block"
        style={{ ["--tilt" as unknown as string]: "3deg" }}
        icon={<FileText className="h-3.5 w-3.5" />}
        label="TEXT"
        title="Reminder: rotate AWS keys"
        sub="from MacBook · just now"
        tone="accent"
      />
    </div>
  );
}

function MiniTile({
  children,
  icon,
  tone,
  tall,
}: {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "accent" | "image";
  tall?: boolean;
}) {
  if (tone === "image") {
    return (
      <div
        className={`relative overflow-hidden rounded-[10px] border border-[var(--color-border-mute)] bg-gradient-to-br from-[var(--color-accent-dim)] via-[var(--color-surface-2)] to-[var(--color-surface)] ${
          tall ? "row-span-2 aspect-auto" : "aspect-[4/3]"
        }`}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(120% 80% at 20% 20%, color-mix(in oklch, var(--color-accent) 20%, transparent), transparent 60%)",
          }}
        />
        <ImageIcon className="absolute bottom-1.5 right-1.5 h-3 w-3 text-[var(--color-fg-dim)]" />
      </div>
    );
  }
  return (
    <div
      className={`rounded-[10px] border border-[var(--color-border-mute)] p-2 text-[9.5px] leading-tight ${
        tone === "accent"
          ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
          : "bg-[var(--color-surface)] text-[var(--color-fg-mute)]"
      }`}
    >
      <div className="mb-1 flex items-center gap-1">
        {icon}
        <span className="mono uppercase tracking-[0.18em] text-[8.5px] opacity-70">
          {tone === "accent" ? "pinned" : "drop"}
        </span>
      </div>
      <div className="truncate">{children}</div>
    </div>
  );
}

function FloatingTile({
  className,
  style,
  icon,
  label,
  title,
  sub,
  tone,
}: {
  className?: string;
  style?: React.CSSProperties;
  icon: React.ReactNode;
  label: string;
  title: string;
  sub: string;
  tone?: "accent";
}) {
  return (
    <div
      className={className}
      style={style}
      aria-hidden
    >
      <div
        className={`rounded-[14px] border p-3 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-xl ${
          tone === "accent"
            ? "border-[color-mix(in_oklch,var(--color-accent)_40%,transparent)] bg-[color-mix(in_oklch,var(--color-accent)_16%,var(--color-bg-elev))]"
            : "border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-bg-elev)_82%,transparent)]"
        }`}
      >
        <div className="mb-2 flex items-center justify-between">
          <span
            className={`mono inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] ${
              tone === "accent"
                ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                : "bg-[var(--color-surface)] text-[var(--color-fg-mute)]"
            }`}
          >
            {icon}
            {label}
          </span>
          <Pin className="h-3 w-3 text-[var(--color-fg-dim)]" />
        </div>
        <div className="text-[12.5px] font-medium text-[var(--color-fg)] leading-snug">
          {title}
        </div>
        <div className="mono mt-1.5 text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-fg-dim)]">
          {sub}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
   Showcase — bento of "things you can drop"
   ---------------------------------------------------------------- */

function Showcase() {
  return (
    <section id="showcase" className="relative">
      <div className="mx-auto max-w-[1240px] px-5 py-24 sm:px-8 sm:py-32">
        <SectionHeading
          eyebrow="01 · Showcase"
          title={
            <>
              If it fits on a<br />
              clipboard, it fits here.
            </>
          }
          sub="Four types. No folders. A feed that pins what matters and gets out of your way."
        />

        <div className="mt-16 grid grid-cols-12 gap-4">
          {/* Big text tile */}
          <div className="col-span-12 md:col-span-7 lg:col-span-6">
            <ShowcaseTile
              label="TEXT"
              icon={<FileText className="h-3.5 w-3.5" />}
              title="Copy on one device. Paste on any other."
              className="aspect-[4/3] md:aspect-[16/11]"
            >
              <div className="space-y-2 text-[var(--color-fg-mute)]">
                <div className="rounded-[10px] bg-[var(--color-surface)] p-3 text-[13px]">
                  <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-dim)]">
                    From MacBook · 4s ago
                  </span>
                  <p className="mt-1.5 text-[var(--color-fg)]">
                    ssh -J bastion@jump ec2-32-10-14-210
                  </p>
                </div>
                <div className="rounded-[10px] border border-dashed border-[var(--color-border)] p-3">
                  <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)]">
                    → landing on iPhone
                  </span>
                </div>
              </div>
            </ShowcaseTile>
          </div>

          {/* Link tile */}
          <div className="col-span-12 md:col-span-5 lg:col-span-6">
            <ShowcaseTile
              label="LINK"
              icon={<LinkIcon className="h-3.5 w-3.5" />}
              title="Auto link previews — safely fetched."
              className="aspect-[4/3] md:aspect-[16/11]"
            >
              <div className="overflow-hidden rounded-[12px] border border-[var(--color-border-mute)] bg-[var(--color-surface)]">
                <div
                  className="relative aspect-[16/9] overflow-hidden bg-[var(--color-surface-2)]"
                >
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(90% 120% at 15% 20%, color-mix(in oklch, var(--color-accent) 30%, transparent), transparent 65%), radial-gradient(80% 90% at 85% 90%, color-mix(in oklch, var(--color-accent) 12%, transparent), transparent 60%)",
                    }}
                  />
                  <div className="absolute bottom-2 left-3 mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg)]/80">
                    anthropic.com
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-[13px] font-medium text-[var(--color-fg)]">
                    Introducing Claude Opus 4.7
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-[12px] text-[var(--color-fg-mute)]">
                    Our most capable model, now with a 1M context window.
                  </div>
                </div>
              </div>
            </ShowcaseTile>
          </div>

          {/* Image tile */}
          <div className="col-span-12 md:col-span-4">
            <ShowcaseTile
              label="IMAGE"
              icon={<ImageIcon className="h-3.5 w-3.5" />}
              title="Whiteboard snaps. Design crops. Paste-ready."
              className="aspect-[5/4]"
            >
              <div className="relative h-full overflow-hidden rounded-[12px] border border-[var(--color-border-mute)] bg-[var(--color-surface-2)]">
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(70% 80% at 30% 20%, color-mix(in oklch, var(--color-accent) 28%, transparent), transparent 60%), radial-gradient(80% 80% at 80% 80%, color-mix(in oklch, var(--color-accent) 14%, transparent), transparent 60%)",
                  }}
                />
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-[0.12]"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, var(--color-fg) 1px, transparent 1px), linear-gradient(to bottom, var(--color-fg) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-[8px] bg-[color-mix(in_oklch,var(--color-bg)_60%,transparent)] px-2 py-1 backdrop-blur-md">
                  <span className="mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-fg-mute)]">
                    whiteboard_0420.png
                  </span>
                  <span className="mono text-[9.5px] tnum text-[var(--color-fg-dim)]">
                    2.1 MB
                  </span>
                </div>
              </div>
            </ShowcaseTile>
          </div>

          {/* File tile */}
          <div className="col-span-12 md:col-span-4">
            <ShowcaseTile
              label="FILE"
              icon={<Paperclip className="h-3.5 w-3.5" />}
              title="Up to 50 MB. Private signed URLs."
              className="aspect-[5/4]"
            >
              <div className="space-y-2">
                {[
                  { ext: "pdf", name: "contract_v3.pdf", size: "412 KB" },
                  { ext: "zip", name: "brand_kit.zip", size: "12.4 MB" },
                  { ext: "csv", name: "analytics_q1.csv", size: "88 KB" },
                ].map((f) => (
                  <div
                    key={f.name}
                    className="flex items-center gap-3 rounded-[10px] border border-[var(--color-border-mute)] bg-[var(--color-surface)] px-3 py-2"
                  >
                    <span className="mono flex h-7 w-10 items-center justify-center rounded-[6px] bg-[var(--color-accent-dim)] text-[9.5px] font-semibold uppercase text-[var(--color-accent)]">
                      {f.ext}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] text-[var(--color-fg)]">
                        {f.name}
                      </div>
                      <div className="mono text-[9.5px] tnum text-[var(--color-fg-dim)]">
                        {f.size}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ShowcaseTile>
          </div>

          {/* Realtime stat tile */}
          <div className="col-span-12 md:col-span-4">
            <ShowcaseTile
              label="SYNC"
              icon={<Zap className="h-3.5 w-3.5" />}
              title="Under a second from drop to land."
              className="aspect-[5/4]"
              accent
            >
              <div className="flex h-full flex-col justify-between">
                <div className="text-[76px] font-semibold leading-none tracking-[-0.04em] text-[var(--color-accent)]">
                  &lt;1s
                </div>
                <div className="space-y-1">
                  <div className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-dim)]">
                    Postgres realtime · no polling
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse-dot" />
                    <span className="mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
                      channel open
                    </span>
                  </div>
                </div>
              </div>
            </ShowcaseTile>
          </div>
        </div>
      </div>
    </section>
  );
}

function ShowcaseTile({
  label,
  icon,
  title,
  children,
  className,
  accent,
}: {
  label: string;
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <article
      className={`tile group relative flex h-full flex-col overflow-hidden rounded-[20px] border p-5 ${
        accent
          ? "border-[color-mix(in_oklch,var(--color-accent)_30%,transparent)] bg-[color-mix(in_oklch,var(--color-accent)_6%,var(--color-bg-elev))]"
          : "border-[var(--color-border-mute)] bg-[var(--color-bg-elev)]"
      } ${className ?? ""}`}
    >
      <header className="mb-4 flex items-center justify-between">
        <span
          className={`mono inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9.5px] uppercase tracking-[0.22em] ${
            accent
              ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
              : "bg-[var(--color-surface)] text-[var(--color-fg-mute)]"
          }`}
        >
          {icon}
          {label}
        </span>
        <ArrowUpRight className="h-4 w-4 text-[var(--color-fg-dim)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </header>
      <h3 className="mb-4 text-[18px] font-semibold tracking-tight text-[var(--color-fg)]">
        {title}
      </h3>
      <div className="flex-1">{children}</div>
    </article>
  );
}

/* ----------------------------------------------------------------
   Features grid
   ---------------------------------------------------------------- */

function Features() {
  const features = [
    {
      icon: Zap,
      title: "Realtime, not refresh.",
      body: "Postgres change events over a per-user channel push new drops to every tab you have open. No polling, no service-worker trickery.",
    },
    {
      icon: Fingerprint,
      title: "Private by construction.",
      body: "Row-level security on every row and every file. Nobody — not even other users — can read your drops. RLS is the auth, not a wrapper around it.",
    },
    {
      icon: Waypoints,
      title: "Share target, natively.",
      body: "On Android, Canvus shows up in the system share sheet. Pick it from any app and the drop is created before your thumb leaves the screen.",
    },
    {
      icon: Keyboard,
      title: "A keyboard-first feed.",
      body: "N to compose, ⌘V to drop your clipboard, C to copy, P to pin, D to delete. The interface is keyboard-first and mouse-tolerant.",
    },
    {
      icon: Undo2,
      title: "Undo is the default.",
      body: "Delete shows a 5-second undo toast. If you close the tab mid-undo, a beacon commits the delete — nothing is ever silently dropped.",
    },
    {
      icon: Command,
      title: "Installable PWA.",
      body: "Pin Canvus to your dock or home screen. Add drops while offline — they retry when the connection comes back. Feels like a native app because it basically is one.",
    },
  ];
  return (
    <section id="features" className="relative border-y border-[var(--color-border-mute)] bg-[color-mix(in_oklch,var(--color-bg-elev)_34%,var(--color-bg))]">
      <div className="mx-auto max-w-[1240px] px-5 py-24 sm:px-8 sm:py-32">
        <SectionHeading
          eyebrow="02 · What you get"
          title={
            <>
              Every detail, designed
              <br />
              for the <span className="text-[var(--color-accent)]">hand-off</span>.
            </>
          }
          sub="Phone → laptop → tablet → back. Canvus is the one tab that keeps up with you."
        />
        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
}: {
  feature: { icon: React.ComponentType<{ className?: string }>; title: string; body: string };
  index: number;
}) {
  const Icon = feature.icon;
  return (
    <article className="tile group relative flex flex-col rounded-[20px] border border-[var(--color-border-mute)] bg-[var(--color-bg-elev)] p-6">
      <div className="mb-5 flex items-center justify-between">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--color-accent-dim)] text-[var(--color-accent)]">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-dim)] tnum">
          0{index + 1}
        </span>
      </div>
      <h3 className="mb-2 text-[19px] font-semibold tracking-tight text-[var(--color-fg)]">
        {feature.title}
      </h3>
      <p className="text-[14.5px] leading-[1.55] text-[var(--color-fg-mute)]">
        {feature.body}
      </p>
    </article>
  );
}

/* ----------------------------------------------------------------
   Flow diagram — the cross-device picture
   ---------------------------------------------------------------- */

function FlowDiagram() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 gridlines opacity-40" />
      <div className="relative mx-auto max-w-[1240px] px-5 py-24 sm:px-8 sm:py-32">
        <SectionHeading
          eyebrow="03 · Under the hood"
          title={
            <>
              Drop once. Land{" "}
              <span className="text-[var(--color-accent)]">everywhere</span>.
            </>
          }
          sub="One socket per user. One insert. N tabs — every one of them updates before the keystroke fades."
          align="center"
        />

        <div className="relative mt-20">
          {/* Connector SVG — desktop only, keeps aspect stable */}
          <svg
            aria-hidden
            className="absolute inset-0 hidden h-full w-full md:block"
            viewBox="0 0 1000 320"
            fill="none"
          >
            <defs>
              <linearGradient id="flow-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="oklch(0.86 0.21 128)" stopOpacity="0.08" />
                <stop offset="50%" stopColor="oklch(0.86 0.21 128)" stopOpacity="0.85" />
                <stop offset="100%" stopColor="oklch(0.86 0.21 128)" stopOpacity="0.08" />
              </linearGradient>
            </defs>
            <path
              d="M 140 160 C 320 60, 500 60, 500 160 S 680 260, 860 160"
              stroke="url(#flow-grad)"
              strokeWidth="1.4"
              strokeDasharray="4 7"
            />
          </svg>

          <div className="relative grid grid-cols-1 items-center gap-10 md:grid-cols-3">
            <FlowNode
              tag="Source"
              title="Your phone"
              sub="copy · screenshot · share sheet"
              icon="phone"
            />
            <FlowNode
              tag="Canvus"
              title="canvus_drops"
              sub="insert · RLS · realtime"
              icon="hub"
              center
            />
            <FlowNode
              tag="Destination"
              title="Your laptop"
              sub="under a second · every tab"
              icon="laptop"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowNode({
  tag,
  title,
  sub,
  icon,
  center,
}: {
  tag: string;
  title: string;
  sub: string;
  icon: "phone" | "hub" | "laptop";
  center?: boolean;
}) {
  return (
    <div
      className={`relative mx-auto flex w-full max-w-[320px] flex-col items-center rounded-[20px] border p-6 text-center backdrop-blur-md ${
        center
          ? "border-[color-mix(in_oklch,var(--color-accent)_40%,transparent)] bg-[color-mix(in_oklch,var(--color-accent)_10%,var(--color-bg-elev))] shadow-[0_30px_80px_-30px_var(--color-accent-glow)]"
          : "border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-bg-elev)_70%,transparent)]"
      }`}
    >
      <span
        className={`mono mb-4 rounded-full px-2.5 py-1 text-[9.5px] uppercase tracking-[0.22em] ${
          center
            ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
            : "bg-[var(--color-surface)] text-[var(--color-fg-mute)]"
        }`}
      >
        {tag}
      </span>
      <FlowIcon kind={icon} />
      <h3 className="mt-5 text-[20px] font-semibold tracking-tight text-[var(--color-fg)]">
        {title}
      </h3>
      <p className="mono mt-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--color-fg-dim)]">
        {sub}
      </p>
    </div>
  );
}

function FlowIcon({ kind }: { kind: "phone" | "hub" | "laptop" }) {
  if (kind === "phone") {
    return (
      <div className="flex h-24 w-16 items-end justify-center rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5">
        <div className="h-full w-full rounded-[10px] bg-gradient-to-b from-[var(--color-accent-dim)] to-transparent" />
      </div>
    );
  }
  if (kind === "laptop") {
    return (
      <div className="flex w-32 flex-col items-center">
        <div className="h-20 w-full rounded-t-[10px] border border-b-0 border-[var(--color-border)] bg-[var(--color-surface)] p-1.5">
          <div className="h-full w-full rounded-[6px] bg-gradient-to-b from-[var(--color-accent-dim)] to-transparent" />
        </div>
        <div className="h-1.5 w-[110%] rounded-b-[6px] bg-[var(--color-border)]" />
      </div>
    );
  }
  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-[var(--color-accent)]/30 animate-pulse-dot" />
      <div className="absolute inset-2 rounded-full border border-[var(--color-accent)]/50" />
      <div className="absolute inset-4 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-ink)]" />
      <Zap className="relative h-7 w-7 text-[var(--color-accent-ink)]" />
    </div>
  );
}

/* ----------------------------------------------------------------
   Keyboard shortcuts section
   ---------------------------------------------------------------- */

function KeyboardSection() {
  const shortcuts = [
    { keys: ["N"], label: "Open the composer" },
    { keys: ["⌘", "V"], label: "Drop clipboard contents" },
    { keys: ["⌘", "↵"], label: "Save the drop" },
    { keys: ["C"], label: "Copy the focused tile" },
    { keys: ["P"], label: "Pin / unpin" },
    { keys: ["D"], label: "Delete (with 5s undo)" },
    { keys: ["Esc"], label: "Close composer" },
    { keys: ["Tab"], label: "Move focus through tiles" },
  ];
  return (
    <section id="shortcuts" className="relative border-y border-[var(--color-border-mute)] bg-[color-mix(in_oklch,var(--color-bg-elev)_34%,var(--color-bg))]">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-12 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="mono inline-flex items-center gap-2 rounded-full border border-[var(--color-border-mute)] bg-[var(--color-surface)] px-3 py-1.5 text-[10.5px] uppercase tracking-[0.2em] text-[var(--color-fg-dim)]">
            <Keyboard className="h-3.5 w-3.5 text-[var(--color-accent)]" />
            04 · Shortcuts
          </div>
          <h2 className="mt-5 text-[40px] font-semibold leading-[1.02] tracking-[-0.02em] text-[var(--color-fg)] sm:text-[52px]">
            Fastest when you<br />
            never touch the mouse.
          </h2>
          <p className="mt-5 max-w-[460px] text-[15.5px] leading-[1.55] text-[var(--color-fg-mute)]">
            Every action is one keystroke away. Compose, copy, pin, delete —
            without leaving home row.
          </p>
          <Link
            href="/signup"
            className="press mt-8 inline-flex h-11 items-center gap-2 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-4 text-[13.5px] font-medium text-[var(--color-fg)] hover:bg-[var(--color-surface)]"
          >
            Try it with your own hands
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[28px] bg-[var(--color-accent)] opacity-[0.08] blur-2xl" />
          <div className="relative overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-bg-elev)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)]">
            {/* Fake terminal header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border-mute)] px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.72_0.20_28)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.82_0.16_88)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" />
              </div>
              <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-dim)]">
                ~/canvus — keybindings.md
              </span>
              <span className="w-10" />
            </div>
            <ul className="divide-y divide-[var(--color-border-mute)]">
              {shortcuts.map((s) => (
                <li
                  key={s.label}
                  className="flex items-center justify-between px-5 py-3.5"
                >
                  <span className="text-[13.5px] text-[var(--color-fg-mute)]">
                    {s.label}
                  </span>
                  <span className="flex items-center gap-1">
                    {s.keys.map((k, i) => (
                      <span key={i} className="kbd">
                        {k}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------
   Final CTA
   ---------------------------------------------------------------- */

function FinalCTA() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent)] opacity-[0.10] blur-[80px]" />
      </div>
      <div className="relative mx-auto max-w-[1240px] px-5 py-28 text-center sm:px-8 sm:py-36">
        <div className="mono inline-flex items-center gap-2 rounded-full border border-[var(--color-border-mute)] bg-[var(--color-surface)] px-3 py-1.5 text-[10.5px] uppercase tracking-[0.22em] text-[var(--color-fg-mute)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse-dot" />
          One account. Every device.
        </div>
        <h2 className="mt-6 text-[52px] font-semibold leading-[0.98] tracking-[-0.025em] text-[var(--color-fg)] sm:text-[72px] md:text-[88px]">
          Start dropping.
          <br />
          <span className="relative inline-block text-[var(--color-accent)]">
            Stop switching.
          </span>
        </h2>
        <p className="mx-auto mt-6 max-w-[560px] text-[16px] text-[var(--color-fg-mute)] sm:text-[17px]">
          Free forever for personal use. Sign up with an email — you're in your
          first drop thirty seconds from now.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="press group inline-flex h-14 items-center gap-2 rounded-[16px] bg-[var(--color-accent)] px-7 text-[15px] font-semibold text-[var(--color-accent-ink)] shadow-[0_18px_60px_-16px_var(--color-accent-glow)] hover:brightness-105"
          >
            Create an account
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/login"
            className="press inline-flex h-14 items-center gap-2 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-7 text-[15px] font-medium text-[var(--color-fg)] hover:bg-[var(--color-surface)]"
          >
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------
   Footer
   ---------------------------------------------------------------- */

function Footer() {
  return (
    <footer className="relative border-t border-[var(--color-border-mute)]">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-[14px] font-semibold tracking-tight text-[var(--color-fg)]">
            Canvus
          </span>
          <span className="mono text-[10.5px] uppercase tracking-[0.2em] text-[var(--color-fg-dim)]">
            · cloud clipboard
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-[var(--color-fg-mute)]">
          <Link href="/login" className="link-grow hover:text-[var(--color-fg)]">
            Sign in
          </Link>
          <Link href="/signup" className="link-grow hover:text-[var(--color-fg)]">
            Sign up
          </Link>
          <a href="#features" className="link-grow hover:text-[var(--color-fg)]">
            Features
          </a>
          <a href="#shortcuts" className="link-grow hover:text-[var(--color-fg)]">
            Shortcuts
          </a>
        </nav>
        <div className="mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--color-fg-dim)]">
          © 2026 Canvus
        </div>
      </div>
    </footer>
  );
}

/* ----------------------------------------------------------------
   Shared section heading
   ---------------------------------------------------------------- */

function SectionHeading({
  eyebrow,
  title,
  sub,
  align = "left",
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={`max-w-[720px] ${
        align === "center" ? "mx-auto text-center" : ""
      }`}
    >
      <div
        className={`mono inline-flex items-center gap-2 rounded-full border border-[var(--color-border-mute)] bg-[var(--color-surface)] px-3 py-1.5 text-[10.5px] uppercase tracking-[0.22em] text-[var(--color-fg-mute)]`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
        {eyebrow}
      </div>
      <h2 className="mt-5 text-[40px] font-semibold leading-[1.02] tracking-[-0.02em] text-[var(--color-fg)] sm:text-[56px]">
        {title}
      </h2>
      <p className="mt-5 text-[15.5px] leading-[1.55] text-[var(--color-fg-mute)] sm:text-[16.5px]">
        {sub}
      </p>
    </div>
  );
}
