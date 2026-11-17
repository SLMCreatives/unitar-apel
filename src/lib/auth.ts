import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { envReady } from "@/components/setup-notice";
import { SECTIONS, SECTION_KEYS, type SectionKey } from "@/lib/permissions";
import { AUTH_ENABLED, SESSION_COOKIE } from "@/lib/auth-config";
import { sha256 } from "@/lib/session";

export type AccountStatus = "pending" | "active" | "disabled";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  status: AccountStatus;
  isSuperadmin: boolean;
  roleId: number | null;
  roleKey: string | null;
  roleLabel: string | null;
  // Sections this user may use. Superadmins implicitly get all of them.
  sections: SectionKey[];
};

type SessionRow = {
  user: {
    id: string;
    email: string;
    full_name: string | null;
    status: AccountStatus;
    is_superadmin: boolean;
    role_id: number | null;
    role: { key: string; label: string; sections: string[] } | null;
  } | null;
};

// Stand-in user returned while auth is switched off (src/lib/auth-config.ts).
// It holds every section so all guards below pass and the full nav renders,
// without any call site needing to know auth is disabled.
const BYPASS_USER: CurrentUser = {
  id: "00000000-0000-0000-0000-000000000000",
  email: null,
  fullName: null,
  status: "active",
  isSuperadmin: true,
  roleId: null,
  roleKey: null,
  roleLabel: null,
  sections: [...SECTION_KEYS],
};

// Resolves the signed-in user for the current request: hashes the session
// cookie, finds an unexpired apel_sessions row for it, and loads that account
// and its role in the same query. A missing, unknown or expired token means
// signed out. Status and role are read fresh on every request, so disabling a
// user or changing their role takes effect on their next page load. Memoized
// per request with React cache so repeated guard calls in one render hit
// Supabase once.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!AUTH_ENABLED) return BYPASS_USER;

  // Read the cookie before anything else: it marks every page that checks
  // the session as per-request. If the env check came first, a build without
  // SUPABASE_SECRET_KEY would prerender guarded pages as static redirects.
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !envReady()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("apel_sessions")
    .select(
      "user:apel_users(id, email, full_name, status, is_superadmin, role_id, role:app_roles(key, label, sections))"
    )
    .eq("token_hash", sha256(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle<SessionRow>();

  // A failed lookup is treated as signed out rather than thrown, so a database
  // hiccup lands on /login instead of an error page — never on access.
  if (error) {
    console.error("[auth] session lookup failed:", error.message);
    return null;
  }
  const user = data?.user;
  if (!user) return null;

  const grantedSections = user.is_superadmin
    ? [...SECTION_KEYS]
    : (user.role?.sections ?? []).filter((s): s is SectionKey =>
        (SECTION_KEYS as string[]).includes(s)
      );

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    status: user.status,
    isSuperadmin: user.is_superadmin,
    roleId: user.role_id,
    roleKey: user.role?.key ?? null,
    roleLabel: user.role?.label ?? null,
    sections: grantedSections,
  };
});

// Where an active user should land after signing in: the dashboard if they
// have it, otherwise the first section their role grants, otherwise the "no
// access" page (an active account with no sections assigned yet).
export function landingPath(sections: readonly string[], isSuperadmin: boolean): string {
  if (isSuperadmin) return SECTIONS[0].href;
  const first = SECTIONS.find((s) => sections.includes(s.key));
  return first?.href ?? "/forbidden";
}

// The page a signed-out visitor was heading to (the proxy passes it to /login
// as ?next=), accepted only as a same-site path so it can't be used to send
// people to another website after they sign in.
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }
  if (value === "/login" || value.startsWith("/login?")) return null;
  return value;
}

export function hasSection(user: CurrentUser, section: SectionKey): boolean {
  return user.isSuperadmin || user.sections.includes(section);
}

// --- Guards -----------------------------------------------------------------
// Each returns the user on success and redirects otherwise, so callers can do
// `const user = await requireActiveUser()` and trust the result.
// While AUTH_ENABLED is false these all pass: getCurrentUser hands back
// BYPASS_USER, which is active, superadmin and holds every section.

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireActiveUser(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.status !== "active") redirect("/pending");
  return user;
}

export async function requireSuperadmin(): Promise<CurrentUser> {
  const user = await requireActiveUser();
  if (!user.isSuperadmin) redirect("/forbidden");
  return user;
}

export async function requirePermission(
  section: SectionKey
): Promise<CurrentUser> {
  const user = await requireActiveUser();
  if (!hasSection(user, section)) redirect("/forbidden");
  return user;
}
