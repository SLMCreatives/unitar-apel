import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SESSION_COOKIE } from "@/lib/auth-config";

// Server-side sessions for the email-code login (no Supabase Auth — see
// supabase/migrations/0009_custom_auth.sql).
//
// The browser holds a random 256-bit token in an httpOnly cookie. Only its
// sha256 hash is stored in apel_sessions, so a leaked database row can't be
// replayed as a cookie. Signing out deletes the row, which ends the session
// immediately — there is no signed token that stays valid until it expires.

export const SESSION_DAYS = 7;

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// Starts a session for `userId` and sets the cookie. Server Functions / Route
// Handlers only — cookies cannot be set while a Server Component renders.
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const supabase = await createClient();
  const { error } = await supabase.from("apel_sessions").insert({
    token_hash: sha256(token),
    user_id: userId,
    expires_at: expires.toISOString(),
  });
  if (error) throw new Error(`Could not start a session: ${error.message}`);

  // Housekeeping: drop this user's expired sessions so the table stays small.
  await supabase
    .from("apel_sessions")
    .delete()
    .eq("user_id", userId)
    .lt("expires_at", new Date().toISOString());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

// Ends the current session (if any) and clears the cookie. Server Functions /
// Route Handlers only.
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const supabase = await createClient();
    await supabase.from("apel_sessions").delete().eq("token_hash", sha256(token));
  }
  cookieStore.delete(SESSION_COOKIE);
}
