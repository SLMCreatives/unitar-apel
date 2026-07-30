import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-session";
import { AUTH_ENABLED } from "@/lib/auth-config";

// Next.js 16 renamed Middleware to Proxy (see node_modules/next/dist/docs).
// This runs on every matched request: it refreshes the Supabase session and
// does an optimistic redirect for logged-out users. It is NOT the security
// boundary — real authorization lives in src/lib/auth.ts guards (called by
// pages, server actions and route handlers) and in Supabase RLS.

// Routes reachable while signed out. "/auth" covers the email-link confirm
// route handler, which must run before any login redirect.
const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/pending",
  "/forbidden",
  "/forgot-password",
  "/reset-password",
  "/auth",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function proxy(request: NextRequest) {
  // Auth switched off (src/lib/auth-config.ts): no session to refresh and
  // nothing to redirect — every request passes straight through.
  if (!AUTH_ENABLED) return NextResponse.next();

  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Logged out and heading somewhere protected → send to login.
  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirectResponse = NextResponse.redirect(url);
    // Preserve any refreshed auth cookies on the redirect.
    supabaseResponse.cookies.getAll().forEach((c) =>
      redirectResponse.cookies.set(c)
    );
    return redirectResponse;
  }

  // Logged in but sitting on an auth entry page → send to the dashboard.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) =>
      redirectResponse.cookies.set(c)
    );
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  // Run on everything except Next internals and static asset files. Auth still
  // needs to run on /api routes (they carry the session), so they are matched.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
