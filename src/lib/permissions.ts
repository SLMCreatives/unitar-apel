// App access sections. A user's access role (see app_roles / profiles in
// supabase/migrations/0003) grants a subset of these keys, and that decides
// both which nav links show (src/app/layout.tsx) and which routes/actions the
// user may reach (guards in src/lib/auth.ts). This is the single source of
// truth — add a section here and wire its `href`/guard to extend the app.
//
// Note: this is a different concept from the personnel ROLE_CONFIG in
// src/lib/roles.ts (advisor/assessor/moderator). These are *app access*
// sections; those are *learner personnel* roles.

export const SECTIONS = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "learners", label: "Learners", href: "/" },
  { key: "advisors", label: "Advisors", href: "/advisors" },
  { key: "assessors", label: "Assessors & Moderators", href: "/internal-assessors" },
  { key: "reports", label: "Reports", href: "/reports" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];

export const SECTION_KEYS = SECTIONS.map((s) => s.key) as SectionKey[];

export function sectionLabel(key: string): string {
  return SECTIONS.find((s) => s.key === key)?.label ?? key;
}

export function isSectionKey(value: string): value is SectionKey {
  return (SECTION_KEYS as string[]).includes(value);
}
