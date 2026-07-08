import { addAssessor, deleteAssessor } from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { QueryError, SetupNotice, envReady } from "@/components/setup-notice";
import { createClient } from "@/lib/supabase/server";
import { ASSESSOR_ROLES, type Assessor, type AssessorRole } from "@/lib/types";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<AssessorRole, string> = {
  INTERNAL: "Internal Assessors",
  EXTERNAL: "External Assessors",
  MODERATOR: "Moderators",
};

export default async function AssessorsPage() {
  if (!envReady()) return <SetupNotice />;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("apel_assessors")
    .select("*")
    .order("name");
  if (error) return <QueryError message={error.message} />;

  const assessors = (data ?? []) as Assessor[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Assessors &amp; Moderators
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          These lists appear as selection options in each learner&apos;s
          Assessor Details section.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {ASSESSOR_ROLES.map((role) => {
          const list = assessors.filter((a) => a.role === role);
          return (
            <section
              key={role}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">
                {ROLE_LABELS[role]}{" "}
                <span className="font-normal text-gray-400">
                  ({list.length})
                </span>
              </h2>

              <form action={addAssessor} className="mb-4 flex gap-2">
                <input type="hidden" name="role" value={role} />
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Full name"
                  className="w-full flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Add
                </button>
              </form>

              {list.length === 0 ? (
                <p className="text-sm text-gray-400">None added yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {list.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between py-2"
                    >
                      <span className="text-sm text-gray-800">{a.name}</span>
                      <form action={deleteAssessor.bind(null, a.id)}>
                        <ConfirmButton
                          message={`Remove ${a.name}?`}
                          className="text-xs text-gray-400 hover:text-red-600"
                        >
                          Remove
                        </ConfirmButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
