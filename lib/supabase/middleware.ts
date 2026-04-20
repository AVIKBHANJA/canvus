import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresher for Next.js proxy (formerly middleware).
 * - Refreshes the Supabase session cookie on every request
 * - `/` is the public landing page
 * - `/app/*` is gated behind a signed-in user
 * - Authed users on `/`, `/login`, or `/signup` are bounced to `/app`
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(all: { name: string; value: string; options: CookieOptions }[]) {
          all.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          all.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isProtected = pathname === "/app" || pathname.startsWith("/app/");
  const isAuthEntry =
    pathname === "/login" ||
    pathname === "/signup";

  if (user && (pathname === "/" || isAuthEntry)) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  if (!user && isProtected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
