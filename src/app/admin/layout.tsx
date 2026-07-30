import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { AdminTabs } from "@/components/admin-tabs";

// Gate for everything under /admin — superadmins only. requireSuperadmin()
// redirects non-admins (to /login, /pending or /forbidden as appropriate).
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // These pages manage accounts and roles, which do not exist while auth is
  // off (src/lib/auth-config.ts) — the profiles/app_roles tables come with
  // migration 0003.
  if (!AUTH_ENABLED) redirect("/");

  await requireSuperadmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Administration</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage who can sign in and what each role can access.
        </p>
      </div>
      <AdminTabs />
      {children}
    </div>
  );
}
