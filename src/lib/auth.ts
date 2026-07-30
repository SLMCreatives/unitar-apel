// Server-only by construction: every function here reads request cookies
// (via createClient → next/headers) and/or calls redirect(), so importing it
// from a Client Component would fail at build time.
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { envReady } from "@/components/setup-notice";
import { SECTION_KEYS, type SectionKey } from "@/lib/permissions";
import { AUTH_ENABLED } from "@/lib/auth-config";

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

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  status: AccountStatus;
  is_superadmin: boolean;
  role_id: number | null;
  role: { key: string; label: string; sections: string[] } | null;
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

// Resolves the signed-in user for the current request. Uses supabase.auth
// .getUser(), which validates the JWT against Supabase Auth (not just decoding
// the cookie), then loads the profile + role. Memoized per request with
// React cache so repeated guard calls in one render hit Supabase once.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!AUTH_ENABLED) return BYPASS_USER;
  if (!envReady()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, status, is_superadmin, role_id, role:app_roles(key, label, sections)")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  // No profile row yet (trigger not run / race): treat as a pending account
  // so the user is never silently granted access.
  const status: AccountStatus = data?.status ?? "pending";
  const isSuperadmin = data?.is_superadmin ?? false;

  const grantedSections = isSuperadmin
    ? [...SECTION_KEYS]
    : ((data?.role?.sections ?? []).filter((s): s is SectionKey =>
        (SECTION_KEYS as string[]).includes(s)
      ));

  return {
    id: user.id,
    email: data?.email ?? user.email ?? null,
    fullName: data?.full_name ?? null,
    status,
    isSuperadmin,
    roleId: data?.role_id ?? null,
    roleKey: data?.role?.key ?? null,
    roleLabel: data?.role?.label ?? null,
    sections: grantedSections,
  };
});

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
