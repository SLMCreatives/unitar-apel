import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { getCurrentUser, hasSection } from "@/lib/auth";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { SECTIONS } from "@/lib/permissions";

// Auth-aware application header. Renders only the sections the signed-in user
// may access; adds Admin for superadmins; shows the account + sign-out when
// signed in. This is display only — every route still enforces its own guard
// (src/lib/auth.ts), so hiding a link is never the sole protection.
export async function AppHeader() {
  const user = await getCurrentUser();
  const active = user?.status === "active";

  const navSections = active
    ? SECTIONS.filter((s) => hasSection(user, s.key))
    : [];
  const canExport = active && hasSection(user, "reports");
  const landing = navSections[0]?.href ?? (user ? "/pending" : "/login");

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-3 sm:px-6">
        <Link href={landing} className="text-base font-bold text-blue-900">
          UNITAR <span className="text-blue-600">APEL.Q</span> Tracker
        </Link>

        {navSections.length > 0 && (
          <nav className="flex flex-wrap gap-1">
            {navSections.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                {link.label}
              </Link>
            ))}
            {/* Admin only manages accounts/roles, so it is pointless while
                auth is off (src/lib/auth-config.ts). */}
            {AUTH_ENABLED && user?.isSuperadmin && (
              <Link
                href="/admin/users"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                Admin
              </Link>
            )}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3">
          {canExport && (
            <a
              href="/api/export"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              Export to Excel
            </a>
          )}

          {!AUTH_ENABLED ? null : user ? (
            <>
              <span className="hidden text-sm text-gray-500 sm:inline">
                {user.fullName || user.email}
                {user.isSuperadmin && (
                  <span className="ml-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                    superadmin
                  </span>
                )}
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
