import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { QueryError, SetupNotice, envReady } from "@/components/setup-notice";
import { latestInstrumentResult } from "@/lib/instruments";
import { AGE_BUCKETS, ageBucket, leadAge } from "@/lib/lead-ageing";
import { ASSESSMENT_STAGES, LEARNER_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

const AVG_DAYS_PER_MONTH = 30.44;

type Row = {
  id: number;
  name: string;
  learner_status: string | null;
  assessment_stage: string | null;
  sponsor: string | null;
  advisor: string | null;
  registration_payment_status: string | null;
  offer_letter_issued_date: string | null;
  // Plus the per-instrument result columns, read via latestInstrumentResult.
  [column: string]: unknown;
};

type NoteRow = {
  id: number;
  learner_id: number;
  body: string;
  follow_up_date: string;
};

function StatTile({
  label,
  value,
  accent = "text-gray-900",
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function BarList({
  title,
  items,
  barClass = "bg-blue-500",
}: {
  title: string;
  items: { label: string; count: number; barClass?: string }[];
  barClass?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">
        {title}
      </h2>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 text-sm">
            <span className="w-36 shrink-0 truncate text-gray-600">
              {item.label}
            </span>
            <div className="h-2.5 flex-1 rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${item.barClass ?? barClass}`}
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-semibold text-gray-800">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  if (!envReady()) return <SetupNotice />;
  await requirePermission("dashboard");

  const supabase = await createClient();
  const [learnersRes, notesRes, ageingRes] = await Promise.all([
    supabase
      .from("apel")
      .select(
        // Spelled out rather than built from ASSESSMENT_INSTRUMENTS because
        // supabase-js types the select from the literal string.
        "id, name, learner_status, assessment_stage, sponsor, advisor, registration_payment_status, offer_letter_issued_date, portfolio_result_status, fvv_result_status, challenge_test_result_status, capstone_result_status"
      ),
    supabase
      .from("apel_notes")
      .select("id, learner_id, body, follow_up_date")
      .not("follow_up_date", "is", null)
      .order("follow_up_date"),
    // Separate from the main query so the dashboard still loads before
    // migration 0007 adds updated_at — only the ageing section is affected.
    supabase.from("apel").select("id, created_at, updated_at"),
  ]);

  if (learnersRes.error)
    return <QueryError message={learnersRes.error.message} />;
  const learners = (learnersRes.data ?? []) as Row[];
  const notes = (notesRes.data ?? []) as NoteRow[];

  const count = (fn: (l: Row) => boolean) => learners.filter(fn).length;

  // 12-month window health — only learners still in progress
  const now = Date.now();
  const inProgress = learners.filter(
    (l) => l.assessment_stage !== "COMPLETED" && l.assessment_stage !== "GRADUATED"
  );
  let onTrack = 0,
    nearing = 0,
    overdue = 0,
    noOffer = 0;
  for (const l of inProgress) {
    if (!l.offer_letter_issued_date) {
      noOffer++;
      continue;
    }
    const months =
      (now - new Date(l.offer_letter_issued_date).getTime()) /
      (1000 * 60 * 60 * 24 * AVG_DAYS_PER_MONTH);
    if (months >= 12) overdue++;
    else if (months >= 9) nearing++;
    else onTrack++;
  }

  // Lead ageing — in-progress learners, created → last update
  const ageingMissing = Boolean(ageingRes.error);
  const inProgressIds = new Set(inProgress.map((l) => l.id));
  const aged = (ageingRes.data ?? []).flatMap((r) => {
    if (!inProgressIds.has(r.id)) return [];
    const age = leadAge(r.created_at, r.updated_at, now);
    return age ? [{ id: r.id, ...age }] : [];
  });
  const ageBucketCounts = new Map<string, number>();
  for (const a of aged) {
    const { label } = ageBucket(a.ageDays);
    ageBucketCounts.set(label, (ageBucketCounts.get(label) ?? 0) + 1);
  }
  const oldestLeads = [...aged]
    .sort((a, b) => b.ageDays - a.ageDays)
    .slice(0, 5);
  const medianAge = median(aged.map((a) => a.ageDays));

  // Follow-ups
  const today = new Date().toISOString().slice(0, 10);
  const nameById = new Map(learners.map((l) => [l.id, l.name]));
  const overdueNotes = notes.filter((n) => n.follow_up_date < today);
  const upcomingNotes = notes
    .filter((n) => n.follow_up_date >= today)
    .slice(0, 8);

  // Advisor load
  const advisorCounts = new Map<string, number>();
  for (const l of learners) {
    if (l.advisor)
      advisorCounts.set(l.advisor, (advisorCounts.get(l.advisor) ?? 0) + 1);
  }

  const completed = count(
    (l) =>
      l.assessment_stage === "COMPLETED" || l.assessment_stage === "GRADUATED"
  );

  const STATUS_BAR: Record<string, string> = {
    ACTIVE: "bg-green-500",
    INACTIVE: "bg-gray-400",
    WITHDRAW: "bg-red-500",
    PENDING: "bg-amber-500",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Total learners" value={learners.length} />
        <StatTile
          label="Active"
          value={count((l) => l.learner_status === "ACTIVE")}
          accent="text-green-700"
        />
        <StatTile
          label="Pending"
          value={count((l) => l.learner_status === "PENDING")}
          accent="text-amber-700"
        />
        <StatTile label="Completed / Graduated" value={completed} />
        <StatTile
          label="Window overdue"
          value={overdue}
          accent={overdue > 0 ? "text-red-600" : "text-gray-900"}
        />
        <StatTile
          label="Unpaid registration"
          value={count((l) => l.registration_payment_status === "UNPAID")}
          accent="text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarList
          title="Pipeline by Assessment Stage"
          items={ASSESSMENT_STAGES.map((stage) => ({
            label: stage,
            count: count((l) => l.assessment_stage === stage),
          }))}
        />

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">
            12-Month Window Health{" "}
            <span className="font-normal normal-case text-gray-400">
              (in-progress learners)
            </span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md bg-green-50 p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{onTrack}</p>
              <p className="text-xs font-medium text-green-800">On track</p>
            </div>
            <div className="rounded-md bg-amber-50 p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{nearing}</p>
              <p className="text-xs font-medium text-amber-800">
                Nearing limit (9–12 mo)
              </p>
            </div>
            <div className="rounded-md bg-red-50 p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{overdue}</p>
              <p className="text-xs font-medium text-red-800">Overdue</p>
            </div>
            <div className="rounded-md bg-gray-50 p-3 text-center">
              <p className="text-2xl font-bold text-gray-600">{noOffer}</p>
              <p className="text-xs font-medium text-gray-600">
                No offer letter
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            {/* Pass/fail follows the furthest instrument each learner has
                been graded on. */}
            <BarRow label="Pass" count={count((l) => latestInstrumentResult(l) === "PASS")} total={learners.length} barClass="bg-green-500" />
            <BarRow label="Fail" count={count((l) => latestInstrumentResult(l) === "FAIL")} total={learners.length} barClass="bg-red-500" />
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">
            Lead Ageing{" "}
            <span className="font-normal normal-case text-gray-400">
              (in-progress learners — time in system at last update)
            </span>
          </h2>
          {ageingMissing ? (
            <p className="text-sm text-gray-400">
              Run migration 0007_learner_updated_at.sql to start tracking when
              learners were last updated.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-2.5">
                {AGE_BUCKETS.map((b) => (
                  <BarRow
                    key={b.label}
                    label={b.label}
                    count={ageBucketCounts.get(b.label) ?? 0}
                    total={aged.length}
                    barClass={b.barClass}
                  />
                ))}
                <p className="pt-1 text-xs text-gray-500">
                  Median lead age:{" "}
                  <span className="font-semibold text-gray-700">
                    {medianAge === null ? "—" : `${medianAge} days`}
                  </span>
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-600">
                  Oldest leads
                </p>
                {oldestLeads.length === 0 ? (
                  <p className="text-sm text-gray-400">No in-progress learners.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {oldestLeads.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 py-1.5 text-sm">
                        <span className="w-16 shrink-0 text-xs font-semibold text-gray-700">
                          {a.ageDays}d
                        </span>
                        <Link
                          href={`/learners/${a.id}`}
                          className="truncate font-medium text-blue-700 hover:underline"
                        >
                          {nameById.get(a.id) ?? `#${a.id}`}
                        </Link>
                        <span className="ml-auto shrink-0 text-xs text-gray-400">
                          updated {a.idleDays === 0 ? "today" : `${a.idleDays}d ago`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>

        <BarList
          title="Learner Status"
          items={LEARNER_STATUSES.map((s) => ({
            label: s,
            count: count((l) => l.learner_status === s),
            barClass: STATUS_BAR[s],
          }))}
        />

        <BarList
          title="Sponsor"
          items={["OPEN", "CAMFIL", "INTAN"].map((sp) => ({
            label: sp,
            count: count((l) => l.sponsor === sp),
          }))}
        />

        <BarList
          title="Advisor Load"
          items={[...advisorCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([label, c]) => ({ label, count: c }))}
        />

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">
            Follow-ups
          </h2>
          {overdueNotes.length === 0 && upcomingNotes.length === 0 && (
            <p className="text-sm text-gray-400">
              No follow-ups scheduled. Add follow-up dates to notes on learner
              pages.
            </p>
          )}
          {overdueNotes.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-semibold text-red-600">
                ⚠ Overdue ({overdueNotes.length})
              </p>
              <FollowUpList notes={overdueNotes} nameById={nameById} overdue />
            </div>
          )}
          {upcomingNotes.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-gray-600">
                Upcoming
              </p>
              <FollowUpList notes={upcomingNotes} nameById={nameById} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function BarRow({
  label,
  count,
  total,
  barClass,
}: {
  label: string;
  count: number;
  total: number;
  barClass: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-36 shrink-0 text-gray-600">{label}</span>
      <div className="h-2.5 flex-1 rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${total ? (count / total) * 100 : 0}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right font-semibold text-gray-800">
        {count}
      </span>
    </div>
  );
}

function FollowUpList({
  notes,
  nameById,
  overdue,
}: {
  notes: NoteRow[];
  nameById: Map<number, string>;
  overdue?: boolean;
}) {
  return (
    <ul className="divide-y divide-gray-100">
      {notes.map((n) => (
        <li key={n.id} className="flex items-center gap-2 py-1.5 text-sm">
          <span
            className={`w-24 shrink-0 text-xs ${overdue ? "font-semibold text-red-600" : "text-gray-500"}`}
          >
            {n.follow_up_date}
          </span>
          <Link
            href={`/learners/${n.learner_id}`}
            className="shrink-0 font-medium text-blue-700 hover:underline"
          >
            {nameById.get(n.learner_id) ?? `#${n.learner_id}`}
          </Link>
          <span className="truncate text-gray-500">— {n.body}</span>
        </li>
      ))}
    </ul>
  );
}
