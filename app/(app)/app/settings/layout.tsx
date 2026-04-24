import Link from "next/link";
import { ChevronRight, Laptop } from "lucide-react";

type NavItem = {
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  soon?: boolean;
};

const NAV: NavItem[] = [
  { href: "/app/settings/devices", label: "Devices", icon: Laptop },
];

const SOON: NavItem[] = [
  { label: "Account", icon: Laptop, soon: true },
  { label: "Billing", icon: Laptop, soon: true },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
      <nav
        aria-label="Breadcrumb"
        className="mono mb-6 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--color-fg-dim)]"
      >
        <Link href="/app" className="hover:text-[var(--color-fg)]">
          canvus
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[var(--color-fg-mute)]">settings</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[180px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="mono mb-2 px-2 text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-fg-dim)]">
            sections
          </div>
          <ul className="flex flex-col gap-0.5">
            {NAV.map((n) => (
              <li key={n.label}>
                <Link
                  href={n.href!}
                  className="relative flex items-center gap-2 rounded-[10px] px-3 py-2 text-xs text-[var(--color-fg-mute)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
                  />
                  {n.label}
                </Link>
              </li>
            ))}
            {SOON.map((n) => (
              <li key={n.label}>
                <div className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-xs text-[var(--color-fg-dim)]">
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-[var(--color-border)]"
                  />
                  <span className="flex-1">{n.label}</span>
                  <span className="mono rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.12em]">
                    soon
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
