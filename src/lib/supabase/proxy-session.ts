import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session for an incoming request and reports the
// current user. This is the standard @supabase/ssr middleware pattern (called
// from src/proxy.ts): it rebuilds the auth cookies onto the response so tokens
// stay fresh across Server Components, which cannot set cookies themselves.
// NextResponse.next() takes `{ request: { headers } }` — passing the NextRequest
// itself silently produces a response that makes every route 404.
const passThrough = (request: NextRequest) =>
  NextResponse.next({ request: { headers: request.headers } });

export async function updateSession(request: NextRequest) {
  let supabaseResponse = passThrough(request);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Not configured yet — let the request through so the setup notice shows.
  if (!url || !anon) return { supabaseResponse, user: null };

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = passThrough(request);
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Do not run code between createServerClient and getUser() — it refreshes
  // the session and any gap risks logging users out at random.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
