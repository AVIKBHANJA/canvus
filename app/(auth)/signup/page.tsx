import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Create account · Canvus" };

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/app");

  return (
    <section className="w-full max-w-[380px] animate-fade-up">
      <header className="mb-8">
        <Link
          href="/"
          className="mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-fg-dim)] hover:text-[var(--color-fg-mute)]"
        >
          ← canvus
        </Link>
        <h1 className="mt-6 text-[40px] leading-[1.02] tracking-tight text-[var(--color-fg)]">
          A clipboard that{" "}
          <span className="text-[var(--color-accent)]">follows</span> you.
        </h1>
        <p className="mt-2 text-sm text-[var(--color-fg-mute)]">
          Drop on your phone, land on your laptop. And vice versa.
        </p>
      </header>

      <AuthForm mode="signup" />

      <p className="mt-6 text-xs text-[var(--color-fg-dim)]">
        Already have one?{" "}
        <Link
          href="/login"
          className="text-[var(--color-accent)] underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </section>
  );
}
