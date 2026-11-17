import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client using the project's SECRET key (service_role).
//
// APEL does not use Supabase Auth (the project is shared with another app — see
// supabase/migrations/0009_custom_auth.sql), so there is no per-user database
// session to forward. Every query runs as the service role, which bypasses RLS;
// access control is the app's job: the session check and section guards in
// src/lib/auth.ts, called by every page, Server Action and Route Handler.
//
// The secret key must never reach the browser: it has no NEXT_PUBLIC_ prefix,
// and `server-only` above makes importing this module from a Client Component
// a build error.
//
// Async to match the previous cookie-based client, so call sites keep
// `await createClient()`.
export async function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
