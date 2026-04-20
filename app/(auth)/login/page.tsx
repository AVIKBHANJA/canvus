import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign in · Canvus" };

export default async function LoginPage() {
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
          Welcome back.
        </h1>
        <p className="mt-2 text-sm text-[var(--color-fg-mute)]">
          Sign in to your cloud clipboard.
        </p>
      </header>

      <AuthForm mode="login" />

      <p className="mt-6 text-xs text-[var(--color-fg-dim)]">
        No account?{" "}
        <Link
          href="/signup"
          className="text-[var(--color-accent)] underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </section>
  );
}
