import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase email-confirmation callback.
 * Supabase redirects the user here with `?code=...` after they click the
 * link in the confirmation email. We exchange the code for a session cookie,
 * then bounce them to the feed (or an optional `next` path — validated to
 * prevent open-redirects).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/";

  // Only allow same-site absolute paths. Reject protocol-relative (`//...`)
  // and fully-qualified URLs to prevent open-redirects.
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
