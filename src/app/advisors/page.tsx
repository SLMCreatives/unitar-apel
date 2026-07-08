import Link from "next/link";
import { addAdvisor, deleteAdvisor, updateAdvisor } from "@/app/actions";
import { StatusBadge } from "@/components/badges";
import { ConfirmButton } from "@/components/confirm-button";
import { QueryError, SetupNotice, envReady } from "@/components/setup-notice";
import { createClient } from "@/lib/supabase/server";
import { ADVISOR_PAYMENT_MODES, type Advisor } from "@/lib/types";

export const dynamic = "force-dynamic";

type AssignedLearner = {
  id: number;
  name: string;
  learner_status: string | null;
  sponsor: string | null;
  advisor: string | null;
  advisor_appointment_date: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdvisorsPage() {
  if (!envReady()) return <SetupNotice />;

  const supabase = await createClient();
  const [advisorsRes, learnersRes] = await Promise.all([
    supabase.from("apel_advisors").select("*").order("advisor_name"),
    supabase
      .from("apel")
      .select(
        "id, name, learner_status, sponsor, advisor, advisor_appointment_date"
      )
      .not("advisor", "is", null),
  ]);

  if (advisorsRes.error)
    return <QueryError message={advisorsRes.error.message} />;
  if (learnersRes.error)
    return <QueryError message={learnersRes.error.message} />;

  const advisors = (advisorsRes.data ?? []) as Advisor[];
  const learners = (learnersRes.data ?? []) as AssignedLearner[];

  // apel.advisor stores the advisor's name, so group by name.
  const byAdvisorName = new Map<string, AssignedLearner[]>();
  for (const l of learners) {
    if (!l.advisor) continue;
    const list = byAdvisorName.get(l.advisor) ?? [];
    list.push(l);
    byAdvisorName.set(l.advisor, list);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">
        Advisors{" "}
        <span className="text-sm font-normal text-gray-500">
          ({advisors.length})
        </span>
      </h1>

      <form
        action={addAdvisor}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-white p-4"
      >
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Advisor name
          </label>
          <input
            type="text"
            name="advisor_name"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Payment mode
          </label>
          <select
            name="advisor_payment_mode"
            defaultValue=""
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">— Not set —</option>
            {ADVISOR_PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Remark
          </label>
          <input
            type="text"
            name="advisor_remark"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Add advisor
        </button>
      </form>

      {advisors.length === 0 && (
        <p className="text-sm text-gray-400">
          No advisors yet. Add one above — advisors appear as options when
          assigning learners.
        </p>
      )}

      <div className="space-y-4">
        {advisors.map((advisor) => {
          const assigned = byAdvisorName.get(advisor.advisor_name) ?? [];
          return (
            <section
              key={advisor.id}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {advisor.advisor_name}
                  </h2>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>
                      Learners assigned:{" "}
                      <span className="font-semibold text-gray-800">
                        {assigned.length}
                      </span>
                    </span>
                    <span>
                      Payment mode:{" "}
                      <span className="font-medium text-gray-700">
                        {advisor.advisor_payment_mode ?? "—"}
                      </span>
                    </span>
                    {advisor.advisor_remark && (
                      <span>Remark: {advisor.advisor_remark}</span>
                    )}
                  </div>
                </div>
                <form action={deleteAdvisor.bind(null, advisor.id)}>
                  <ConfirmButton
                    message={`Delete advisor ${advisor.advisor_name}?`}
                    className="text-xs text-gray-400 hover:text-red-600"
                  >
                    Delete
                  </ConfirmButton>
                </form>
              </div>

              {assigned.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="py-1.5 pr-4">Learner</th>
                        <th className="py-1.5 pr-4">Status</th>
                        <th className="py-1.5 pr-4">Sponsor</th>
                        <th className="py-1.5 pr-4">Appointment date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {assigned.map((l) => (
                        <tr key={l.id}>
                          <td className="py-2 pr-4">
                            <Link
                              href={`/learners/${l.id}`}
                              className="font-medium text-blue-700 hover:underline"
                            >
                              {l.name}
                            </Link>
                          </td>
                          <td className="py-2 pr-4">
                            <StatusBadge value={l.learner_status} />
                          </td>
                          <td className="py-2 pr-4 text-gray-600">
                            {l.sponsor ?? "—"}
                          </td>
                          <td className="py-2 pr-4 text-gray-600">
                            {formatDate(l.advisor_appointment_date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-blue-600 hover:underline">
                  Edit advisor
                </summary>
                <form
                  action={updateAdvisor.bind(null, advisor.id)}
                  className="mt-3 flex flex-wrap items-end gap-2"
                >
                  <div className="min-w-[12rem] flex-1">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Name
                    </label>
                    <input
                      type="text"
                      name="advisor_name"
                      required
                      defaultValue={advisor.advisor_name}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Payment mode
                    </label>
                    <select
                      name="advisor_payment_mode"
                      defaultValue={advisor.advisor_payment_mode ?? ""}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">— Not set —</option>
                      {ADVISOR_PAYMENT_MODES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-[12rem] flex-1">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Remark
                    </label>
                    <input
                      type="text"
                      name="advisor_remark"
                      defaultValue={advisor.advisor_remark ?? ""}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                  >
                    Save
                  </button>
                </form>
              </details>
            </section>
          );
        })}
      </div>
    </div>
  );
}
