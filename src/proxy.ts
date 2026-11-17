import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ENABLED, SESSION_COOKIE } from "@/lib/auth-config";

// Next.js 16 renamed Middleware to Proxy (see node_modules/next/dist/docs).
// This is only an optimistic, cookie-presence check that sends signed-out
// visitors to /login before any page work happens. It is NOT the security
// boundary: it never looks the session up, so a stale or forged cookie gets
// past it. Real checks live in src/lib/auth.ts — every page, Server Action and
// Route Handler calls a guard that validates the session against apel_sessions.
//
// It deliberately never redirects *away* from /login based on the cookie: a
// stale cookie would bounce between /login and the page guards forever. The
// login page does that redirect itself, after a real session lookup.

// Routes reachable without a session cookie. /pending and /forbidden decide
// for themselves (they redirect to /login when there is no valid session).
const PUBLIC_ROUTES = ["/login", "/pending", "/forbidden"];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function proxy(request: NextRequest) {
  // Auth switched off (src/lib/auth-config.ts): everything passes through.
  if (!AUTH_ENABLED) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (isPublic(pathname) || request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  // Only redirect page loads. A Server Action POST from a page whose session
  // has just ended is left to the action's own guard, which redirects to
  // /login in a way the client router understands.
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and static asset files. /api
  // routes are matched too (export, document downloads), so a signed-out
  // download link lands on the login page instead of an error.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
