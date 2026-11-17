"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { envReady } from "@/components/setup-notice";
import { ALLOWED_EMAIL_DOMAINS } from "@/lib/auth-config";
import { landingPath, safeNextPath } from "@/lib/auth";
import { sendLoginCode } from "@/lib/email";
import { createSession, destroySession, sha256 } from "@/lib/session";

// Email one-time-code sign-in (no passwords, no Supabase Auth — see
// supabase/migrations/0009_custom_auth.sql).
//
//   1. requestCode: the user enters their email; we email a 6-digit code.
//   2. verifyCode:  they enter the code; on a match we create (if new) their
//      apel_users row as *pending*, start a session and redirect.
//
// Both steps go through the one `signIn` action so the two-step form can use a
// single useActionState; the submit button's `intent` picks the step.

export type LoginState =
  | { step: "email"; email?: string; error?: string }
  | {
      step: "code";
      email: string;
      isNew: boolean;
      fullName?: string;
      error?: string;
      notice?: string;
    };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_MINUTES = 10;
const MAX_CODES_PER_HOUR = 5;
const MAX_ATTEMPTS_MESSAGE =
  "Too many incorrect attempts. Request a new code below.";
const GENERIC_ERROR = "Something went wrong. Please try again.";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  status: "pending" | "active" | "disabled";
  is_superadmin: boolean;
  role: { sections: string[] } | null;
};

const USER_COLUMNS =
  "id, email, full_name, status, is_superadmin, role:app_roles(sections)";

function domainAllowed(email: string): boolean {
  const domain = email.slice(email.lastIndexOf("@") + 1);
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

function allowedDomainsText(): string {
  return ALLOWED_EMAIL_DOMAINS.map((d) => `@${d}`).join(" or ");
}

// The email is part of the hash so equal codes for different people never
// share a hash.
function codeHash(email: string, code: string): string {
  return sha256(`${email}:${code}`);
}

async function findUser(
  supabase: Supabase,
  email: string
): Promise<{ user: UserRow | null; failed: boolean }> {
  const { data, error } = await supabase
    .from("apel_users")
    .select(USER_COLUMNS)
    .eq("email", email)
    .maybeSingle<UserRow>();
  if (error) console.error("[auth] user lookup failed:", error.message);
  return { user: data ?? null, failed: Boolean(error) };
}

export async function signIn(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  if (!envReady()) {
    return { step: "email", error: "The tracker is not configured yet." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  // Enter in the code field submits without a button value — treat that as
  // "verify" on the code step and "request" on the email step.
  const intent = String(
    formData.get("intent") ?? (formData.has("code") ? "verify" : "request")
  );

  if (intent === "change-email") return { step: "email", email };
  if (intent === "verify") return verifyCode(email, formData);
  return requestCode(email, formData, intent === "resend");
}

// --- Step 1: email a code ----------------------------------------------------

async function requestCode(
  email: string,
  formData: FormData,
  resend: boolean
): Promise<LoginState> {
  // A failed resend stays on the code step; a failed first request stays on
  // the email step.
  const isNewHint = formData.get("is_new") === "1";
  const fail = (error: string): LoginState =>
    resend
      ? { step: "code", email, isNew: isNewHint, error }
      : { step: "email", email, error };

  if (!EMAIL_RE.test(email)) {
    return { step: "email", email, error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const { user, failed } = await findUser(supabase, email);
  if (failed) return fail(GENERIC_ERROR);

  if (!user && !domainAllowed(email)) {
    return {
      step: "email",
      email,
      error: `Sign in with your ${allowedDomainsText()} email address.`,
    };
  }
  if (user?.status === "disabled") {
    return {
      step: "email",
      email,
      error: "This account has been disabled. Contact a tracker administrator.",
    };
  }

  // Throttle per email, so the form can't be used to flood someone's inbox.
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countErr } = await supabase
    .from("apel_login_codes")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", hourAgo);
  if (countErr) {
    console.error("[auth] code count failed:", countErr.message);
    return fail(GENERIC_ERROR);
  }
  if ((count ?? 0) >= MAX_CODES_PER_HOUR) {
    return fail(
      "Too many codes have been requested for this email. Please wait an hour and try again."
    );
  }

  // Only the newest code may be used: retire any earlier live ones, and clear
  // out rows older than a day (they no longer count toward the limit).
  const now = new Date();
  await supabase
    .from("apel_login_codes")
    .update({ consumed_at: now.toISOString() })
    .eq("email", email)
    .is("consumed_at", null);
  await supabase
    .from("apel_login_codes")
    .delete()
    .eq("email", email)
    .lt("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const { error: insertErr } = await supabase.from("apel_login_codes").insert({
    email,
    code_hash: codeHash(email, code),
    expires_at: new Date(now.getTime() + CODE_MINUTES * 60 * 1000).toISOString(),
  });
  if (insertErr) {
    console.error("[auth] code insert failed:", insertErr.message);
    return fail(GENERIC_ERROR);
  }

  const sent = await sendLoginCode(email, code, CODE_MINUTES);
  if (!sent.ok) return fail(sent.error);

  return {
    step: "code",
    email,
    isNew: !user,
    notice: resend ? "We've emailed you a new code." : undefined,
  };
}

// --- Step 2: check the code and sign in --------------------------------------

async function verifyCode(
  email: string,
  formData: FormData
): Promise<LoginState> {
  const isNew = formData.get("is_new") === "1";
  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 120);
  const code = String(formData.get("code") ?? "").replace(/\s+/g, "");
  const retry = (error: string): LoginState => ({
    step: "code",
    email,
    isNew,
    fullName,
    error,
  });

  if (!EMAIL_RE.test(email)) {
    return { step: "email", error: "Enter a valid email address." };
  }
  if (!/^\d{6}$/.test(code)) return retry("Enter the 6-digit code from the email.");

  const supabase = await createClient();
  const { data: result, error: rpcErr } = await supabase.rpc(
    "apel_consume_login_code",
    { p_email: email, p_code_hash: codeHash(email, code) }
  );
  if (rpcErr) {
    console.error("[auth] code check failed:", rpcErr.message);
    return retry(GENERIC_ERROR);
  }
  if (result === "invalid") {
    return retry("That code isn't right. Check the email and try again.");
  }
  if (result === "locked") return retry(MAX_ATTEMPTS_MESSAGE);
  if (result !== "ok") {
    return retry("That code has expired or was replaced. Request a new code below.");
  }

  // The code proves the person controls this inbox. Find or create the account.
  let { user, failed } = await findUser(supabase, email);
  if (failed) return retry(GENERIC_ERROR);

  if (!user) {
    // Re-checked here as well as in step 1, so a hand-crafted request can't
    // skip it.
    if (!domainAllowed(email)) {
      return {
        step: "email",
        email,
        error: `Sign in with your ${allowedDomainsText()} email address.`,
      };
    }
    const { error: createErr } = await supabase
      .from("apel_users")
      .insert({ email, full_name: fullName || null });
    // 23505 = someone created the same account a moment ago; just load it.
    if (createErr && createErr.code !== "23505") {
      console.error("[auth] account create failed:", createErr.message);
      return retry(GENERIC_ERROR);
    }
    ({ user, failed } = await findUser(supabase, email));
    if (failed || !user) return retry(GENERIC_ERROR);
  }

  if (user.status === "disabled") {
    return {
      step: "email",
      email,
      error: "This account has been disabled. Contact a tracker administrator.",
    };
  }

  try {
    await supabase
      .from("apel_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id);
    await createSession(user.id);
  } catch (err) {
    console.error("[auth] could not start session:", err);
    return retry(GENERIC_ERROR);
  }

  // redirect() throws, so it stays outside the try above.
  if (user.status !== "active") redirect("/pending");
  redirect(
    safeNextPath(formData.get("next")) ??
      landingPath(user.role?.sections ?? [], user.is_superadmin)
  );
}

// --- Sign out ----------------------------------------------------------------

export async function logout() {
  await destroySession();
  redirect("/login");
}
