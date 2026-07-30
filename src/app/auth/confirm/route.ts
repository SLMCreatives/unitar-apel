import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Landing point for the links in confirmation / password-recovery emails.
// Establishes a session from the email token, then forwards to `next`.
// Supports both Supabase email link styles:
//   - token_hash + type  → verifyOtp (works cross-device; recommended, needs
//     the email template pointed here — see the note in the PR/setup steps)
//   - code               → PKCE exchange (works out of the box, same device)
// Uses redirect() from next/navigation so the session cookies written by the
// Supabase server client are flushed onto the redirect response.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  // Only allow same-origin relative redirects (no open redirect via `next`).
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  redirect(ok ? next : "/login?error=link");
}
