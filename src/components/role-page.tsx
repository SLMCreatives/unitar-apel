import Link from "next/link";
import {
  addAdvisor,
  addAssessor,
  addAssignment,
  deleteAdvisor,
  deleteAssessor,
  updateAdvisor,
  updateAssessor,
} from "@/app/actions";
import { AssignmentCard } from "@/components/assignment-card";
import { ConfirmButton } from "@/components/confirm-button";
import { DateInput, SelectInput, TextInput } from "@/components/form-fields";
import { QueryError, SetupNotice, envReady } from "@/components/setup-notice";
import { ROLE_CONFIG } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import {
  ADVISOR_PAYMENT_MODES,
  APPOINTMENT_LETTER_STATUSES,
  ASSIGNMENT_STAGES,
  CLAIM_STATUSES,
  type Advisor,
  type ApelDocument,
  type Assessor,
  type AssignmentWithLearner,
  type PersonnelRole,
} from "@/lib/types";

type Person = {
  id: number;
  name: string;
  remark?: string | null;
};

export type RolePageSearchParams = Promise<{
  q?: string;
  stage?: string;
  claim?: string;
  letter?: string;
}>;

// Shared listing page for all four personnel roles. Role-specific behaviour
// (claim fields, which table the selection list lives in) comes from
// ROLE_CONFIG rather than separate page implementations.
export async function RolePage({
  role,
  searchParams,
}: {
  role: PersonnelRole;
  searchParams: RolePageSearchParams;
}) {
  if (!envReady()) return <SetupNotice />;

  const config = ROLE_CONFIG[role];
  const { q, stage, claim, letter } = await searchParams;

  const supabase = await createClient();
  const isAdvisor = config.assessorRole === null;

  const [personnelRes, assignmentsRes, learnersRes] = await Promise.all([
    isAdvisor
      ? supabase.from("apel_advisors").select("*").order("advisor_name")
      : supabase
          .from("apel_assessors")
          .select("*")
          .eq("role", config.assessorRole)
          .order("name"),
    supabase
      .from("apel_assignments")
      .select("*, learner:apel(id, name, learner_status, sponsor)")
      .eq("role", role)
      .order("created_at", { ascending: false }),
    supabase.from("apel").select("id, name").order("name"),
  ]);

  if (personnelRes.error)
    return <QueryError message={personnelRes.error.message} />;
  if (assignmentsRes.error)
    return <QueryError message={assignmentsRes.error.message} />;

  const personnel: Person[] = isAdvisor
    ? (personnelRes.data as Advisor[]).map((a) => ({
        id: a.id,
        name: a.advisor_name,
        remark: a.advisor_remark,
      }))
    : (personnelRes.data as Assessor[]).map((a) => ({
        id: a.id,
        name: a.name,
      }));

  const assignments = (assignmentsRes.data ?? []) as AssignmentWithLearner[];
  const learnerOptions = (learnersRes.data ?? []) as { id: number; name: string }[];

  const documentsRes =
    assignments.length > 0
      ? await supabase
          .from("apel_documents")
          .select("*")
          .in(
            "assignment_id",
            assignments.map((a) => a.id)
          )
          .order("created_at", { ascending: false })
      : { data: [] as ApelDocument[] };
  const documents = (documentsRes.data ?? []) as ApelDocument[];
  const docsByAssignment = new Map<number, ApelDocument[]>();
  for (const doc of documents) {
    if (doc.assignment_id === null) continue;
    const list = docsByAssignment.get(doc.assignment_id) ?? [];
    list.push(doc);
    docsByAssignment.set(doc.assignment_id, list);
  }

  // Filters run in memory — the data set is small (one unit's records).
  const query = q?.trim().toLowerCase();
  const hasAssignmentFilter = Boolean(stage || claim || letter);
  const matchesFilters = (a: AssignmentWithLearner) =>
    (!stage || a.stage === stage) &&
    (!claim || a.claim_status === claim) &&
    (!letter || a.appointment_letter_status === letter);

  const byPersonnelName = new Map<string, AssignmentWithLearner[]>();
  for (const a of assignments) {
    const list = byPersonnelName.get(a.personnel_name) ?? [];
    list.push(a);
    byPersonnelName.set(a.personnel_name, list);
  }

  const visibleAssignments = (name: string) => {
    const all = (byPersonnelName.get(name) ?? []).filter(matchesFilters);
    if (!query || name.toLowerCase().includes(query)) return all;
    return all.filter((a) =>
      a.learner?.name?.toLowerCase().includes(query)
    );
  };

  const isPersonVisible = (name: string) => {
    const visible = visibleAssignments(name);
    if (visible.length > 0) return true;
    if (hasAssignmentFilter) return false;
    return !query || name.toLowerCase().includes(query);
  };

  const visiblePersonnel = personnel.filter((p) => isPersonVisible(p.name));

  // Assignments whose personnel name is not in the selection list (e.g. the
  // person was removed) — still shown so no record is ever hidden.
  const knownNames = new Set(personnel.map((p) => p.name));
  const orphanNames = [...byPersonnelName.keys()]
    .filter((name) => !knownNames.has(name) && isPersonVisible(name))
    .sort();

  const hasActiveFilters = Boolean(query || hasAssignmentFilter);

  const addAssignmentForm = (personnelName: string) => (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs font-medium text-blue-600 hover:underline">
        + Add assignment
      </summary>
      <form
        action={addAssignment}
        className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="personnel_name" value={personnelName} />
        <SelectInput
          label="Learner"
          name="learner_id"
          options={learnerOptions.map((l) => ({
            value: String(l.id),
            label: l.name,
          }))}
          emptyLabel="— Select learner —"
        />
        <SelectInput label="Stage" name="stage" options={ASSIGNMENT_STAGES} />
        <DateInput label="Appointment Date" name="appointment_date" />
        <SelectInput
          label="Appointment Letter Status"
          name="appointment_letter_status"
          options={APPOINTMENT_LETTER_STATUSES}
          defaultValue="PENDING"
        />
        {config.claimEnabled && (
          <SelectInput
            label="Payment Mode"
            name="payment_mode"
            options={ADVISOR_PAYMENT_MODES}
          />
        )}
        {config.claimEnabled && (
          <SelectInput
            label="Claim Status"
            name="claim_status"
            options={CLAIM_STATUSES}
          />
        )}
        <TextInput label="Remarks" name="remarks" />
        <div className="flex items-end">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Add assignment
          </button>
        </div>
      </form>
    </details>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {config.plural}{" "}
          <span className="text-sm font-normal text-gray-500">
            ({personnel.length})
          </span>
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {config.plural} appear as options in each learner&apos;s Assessor
          Details section. Assignments track the stage
          {config.claimEnabled ? ", claim" : ""} and appointment-letter status
          per learner.
        </p>
      </div>

      {/* Add personnel */}
      <form
        action={isAdvisor ? addAdvisor : addAssessor}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-white p-4"
      >
        {!isAdvisor && (
          <input type="hidden" name="role" value={config.assessorRole ?? ""} />
        )}
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            {config.label} name
          </label>
          <input
            type="text"
            name={isAdvisor ? "advisor_name" : "name"}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        {isAdvisor && (
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
        )}
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Add {config.label.toLowerCase()}
        </button>
      </form>

      {/* Search & filters */}
      <form className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-white p-3">
        <div className="min-w-[14rem] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Search
          </label>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder={`${config.label} or learner name…`}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Stage
          </label>
          <select
            name="stage"
            defaultValue={stage ?? ""}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {ASSIGNMENT_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {config.claimEnabled && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Claim status
            </label>
            <select
              name="claim"
              defaultValue={claim ?? ""}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {CLAIM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Appointment letter
          </label>
          <select
            name="letter"
            defaultValue={letter ?? ""}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {APPOINTMENT_LETTER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Filter
        </button>
        {hasActiveFilters && (
          <Link
            href={config.route}
            className="px-2 py-2 text-sm text-gray-500 hover:text-gray-800"
          >
            Clear
          </Link>
        )}
      </form>

      {personnel.length === 0 && (
        <p className="text-sm text-gray-400">
          No {config.plural.toLowerCase()} yet. Add one above — they appear as
          options when assigning learners.
        </p>
      )}
      {personnel.length > 0 && visiblePersonnel.length === 0 && orphanNames.length === 0 && (
        <p className="text-sm text-gray-400">
          Nothing matches the current search or filters.
        </p>
      )}

      <div className="space-y-4">
        {visiblePersonnel.map((person) => {
          const assigned = visibleAssignments(person.name);
          return (
            <section
              key={person.id}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {person.name}
                  </h2>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>
                      Learners assigned:{" "}
                      <span className="font-semibold text-gray-800">
                        {(byPersonnelName.get(person.name) ?? []).length}
                      </span>
                    </span>
                    {person.remark && <span>Remark: {person.remark}</span>}
                  </div>
                </div>
                <form
                  action={(isAdvisor ? deleteAdvisor : deleteAssessor).bind(
                    null,
                    person.id
                  )}
                >
                  <ConfirmButton
                    message={`Delete ${config.label.toLowerCase()} ${person.name}?`}
                    className="text-xs text-gray-400 hover:text-red-600"
                  >
                    Delete
                  </ConfirmButton>
                </form>
              </div>

              {assigned.length > 0 && (
                <div className="mt-3 space-y-3">
                  {assigned.map((a) => (
                    <AssignmentCard
                      key={a.id}
                      assignment={a}
                      config={config}
                      documents={docsByAssignment.get(a.id) ?? []}
                    />
                  ))}
                </div>
              )}

              {addAssignmentForm(person.name)}

              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-blue-600 hover:underline">
                  Edit {config.label.toLowerCase()}
                </summary>
                {isAdvisor ? (
                  <form
                    action={updateAdvisor.bind(null, person.id)}
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
                        defaultValue={person.name}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="min-w-[12rem] flex-1">
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Remark
                      </label>
                      <input
                        type="text"
                        name="advisor_remark"
                        defaultValue={person.remark ?? ""}
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
                ) : (
                  <form
                    action={updateAssessor.bind(null, person.id)}
                    className="mt-3 flex flex-wrap items-end gap-2"
                  >
                    <div className="min-w-[12rem] flex-1">
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        defaultValue={person.name}
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
                )}
              </details>
            </section>
          );
        })}

        {orphanNames.map((name) => {
          const assigned = visibleAssignments(name);
          if (assigned.length === 0) return null;
          return (
            <section
              key={`orphan-${name}`}
              className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-base font-semibold text-gray-900">{name}</h2>
              <p className="mt-1 text-xs text-amber-700">
                Has assignments but is not in the {config.plural.toLowerCase()}{" "}
                list — add them above to manage them normally.
              </p>
              <div className="mt-3 space-y-3">
                {assigned.map((a) => (
                  <AssignmentCard
                    key={a.id}
                    assignment={a}
                    config={config}
                    documents={docsByAssignment.get(a.id) ?? []}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
