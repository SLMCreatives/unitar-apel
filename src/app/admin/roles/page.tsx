import { createRole, deleteRole, updateRole } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { QueryError, SetupNotice, envReady } from "@/components/setup-notice";
import { createClient } from "@/lib/supabase/server";
import { SECTIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Roles — UNITAR APEL.Q Tracker" };

type RoleRow = {
  id: number;
  key: string;
  label: string;
  sections: string[];
  is_system: boolean;
};

function SectionCheckboxes({ selected }: { selected: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {SECTIONS.map((s) => (
        <label key={s.key} className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="sections"
            value={s.key}
            defaultChecked={selected.includes(s.key)}
            className="h-4 w-4 rounded border-gray-300"
          />
          {s.label}
        </label>
      ))}
    </div>
  );
}

export default async function RolesPage() {
  if (!envReady()) return <SetupNotice />;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_roles")
    .select("id, key, label, sections, is_system")
    .order("label");
  if (error) return <QueryError message={error.message} />;
  const roles = (data ?? []) as RoleRow[];

  return (
    <div className="space-y-6">
      {/* Create a new role */}
      <form
        action={createRole}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      >
        <h2 className="text-base font-semibold text-gray-900">Add a role</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Role name *
            </label>
            <input
              type="text"
              name="label"
              required
              placeholder="e.g. Coordinator"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Key (optional)
            </label>
            <input
              type="text"
              name="key"
              placeholder="auto from name"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-gray-600">
            Sections this role can access
          </p>
          <SectionCheckboxes selected={[]} />
        </div>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Add role
        </button>
      </form>

      {/* Existing roles */}
      <div className="space-y-3">
        {roles.length === 0 && (
          <p className="text-sm text-gray-400">No roles yet. Add one above.</p>
        )}
        {roles.map((role) => (
          <div
            key={role.id}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <form action={updateRole.bind(null, role.id)} className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-[14rem] flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Role name
                  </label>
                  <input
                    type="text"
                    name="label"
                    required
                    defaultValue={role.label}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    key: <span className="font-mono">{role.key}</span>
                  </p>
                </div>
                <button
                  type="submit"
                  className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                >
                  Save
                </button>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-gray-600">
                  Sections this role can access
                </p>
                <SectionCheckboxes selected={role.sections} />
              </div>
            </form>

            <form action={deleteRole.bind(null, role.id)} className="mt-3 border-t border-gray-100 pt-3">
              <ConfirmButton
                message={`Delete the "${role.label}" role? Users with this role will lose section access until reassigned.`}
                className="text-xs text-gray-400 hover:text-red-600"
              >
                Delete role
              </ConfirmButton>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
