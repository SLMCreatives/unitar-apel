import { updateUser } from "@/app/admin/actions";
import { QueryError, SetupNotice, envReady } from "@/components/setup-notice";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users — UNITAR APEL.Q Tracker" };

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  status: "pending" | "active" | "disabled";
  is_superadmin: boolean;
  role_id: number | null;
  created_at: string;
};

type RoleRow = { id: number; label: string };

const STATUS_STYLES: Record<ProfileRow["status"], string> = {
  active: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  disabled: "bg-gray-200 text-gray-600",
};

export default async function UsersPage() {
  if (!envReady()) return <SetupNotice />;

  const me = await getCurrentUser();
  const supabase = await createClient();
  const [profilesRes, rolesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, status, is_superadmin, role_id, created_at")
      .order("created_at", { ascending: true }),
    supabase.from("app_roles").select("id, label").order("label"),
  ]);

  if (profilesRes.error)
    return <QueryError message={profilesRes.error.message} />;

  const users = (profilesRes.data ?? []) as ProfileRow[];
  const roles = (rolesRes.data ?? []) as RoleRow[];
  const pendingCount = users.filter((u) => u.status === "pending").length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          Accounts{" "}
          <span className="text-sm font-normal text-gray-500">
            ({users.length})
          </span>
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          New signups start as <span className="font-medium">pending</span> with
          no access. Set a user to <span className="font-medium">active</span>{" "}
          and assign a role to let them in.
          {pendingCount > 0 && (
            <span className="ml-1 font-medium text-amber-700">
              {pendingCount} awaiting approval.
            </span>
          )}
        </p>
      </div>

      <div className="space-y-3">
        {users.map((u) => {
          const isMe = u.id === me?.id;
          return (
            <form
              key={u.id}
              action={updateUser.bind(null, u.id)}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">
                    {u.full_name || u.email || "—"}
                    {isMe && (
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        (you)
                      </span>
                    )}
                  </p>
                  {u.full_name && u.email && (
                    <p className="text-xs text-gray-500">{u.email}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[u.status]}`}
                >
                  {u.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={u.status}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Role
                  </label>
                  <select
                    name="role_id"
                    defaultValue={u.role_id ?? ""}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">— No role —</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      name="is_superadmin"
                      defaultChecked={u.is_superadmin}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Superadmin
                  </label>
                  <button
                    type="submit"
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">
        Superadmins have access to every section and to this admin area.
        Removing a user completely (from authentication) is done in the Supabase
        dashboard — here you can disable their access.
      </p>
    </div>
  );
}
