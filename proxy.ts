// Next.js 16 uses `proxy` (the `middleware` convention is deprecated).
// This file refreshes the Supabase session cookie on every request and
// redirects unauthenticated users off protected routes.

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Match everything except Next internals and static assets.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon.svg|icons/).*)",
  ],
};
