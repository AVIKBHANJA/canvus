"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = (() => {
    const n = searchParams.get("next");
    // Only allow internal paths to prevent open-redirect.
    return n && n.startsWith("/") && !n.startsWith("//") ? n : "/";
  })();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setNotice(null);
    setLoading(true);

    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}/callback`
                : undefined,
          },
        });
        if (error) throw new Error(error.message);

        // If confirmations are enabled (default), `session` will be null and
        // the user must click the email link. If they're disabled, we have
        // a session already and can redirect straight to the feed.
        if (!data.session) {
          setNotice(
            "Check your email for a confirmation link. We'll sign you in once you confirm.",
          );
          toast("Check your email to confirm");
          return;
        }
        toast("Welcome to Canvus");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw new Error(error.message);
        toast("Signed in");
      }

      router.replace(nextPath);
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-fg-dim)]"
        >
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-fg-dim)]"
        >
          Password
        </label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {err && (
        <p
          role="alert"
          className="rounded-[10px] border border-[color-mix(in_oklch,var(--color-danger)_32%,transparent)] bg-[color-mix(in_oklch,var(--color-danger)_10%,transparent)] px-3 py-2 text-xs text-[var(--color-danger)]"
        >
          {err}
        </p>
      )}

      {notice && (
        <p
          role="status"
          className="rounded-[10px] border border-[color-mix(in_oklch,var(--color-accent)_32%,transparent)] bg-[color-mix(in_oklch,var(--color-accent)_10%,transparent)] px-3 py-2 text-xs text-[var(--color-accent)]"
        >
          {notice}
        </p>
      )}

      <Button
        type="submit"
        variant="accent"
        size="lg"
        className="w-full"
        disabled={loading}
      >
        {loading
          ? "Working…"
          : mode === "signup"
            ? "Create account"
            : "Sign in"}
      </Button>

      {mode === "signup" && (
        <p className="mono text-[10.5px] text-[var(--color-fg-dim)]">
          By creating an account you agree that your drops are stored in
          Supabase under row-level security — only you can read them.
        </p>
      )}
    </form>
  );
}
