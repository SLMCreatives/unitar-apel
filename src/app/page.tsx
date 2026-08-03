import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { StageBadge, StatusBadge } from "@/components/badges";
import { ContactIcons } from "@/components/contact-buttons";
import { OfferProgress } from "@/components/offer-progress";
import { QueryError, SetupNotice, envReady } from "@/components/setup-notice";
import {
  ASSESSMENT_STAGES,
  LEARNER_STATUSES,
  type Learner,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LearnersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; stage?: string }>;
}) {
  if (!envReady()) return <SetupNotice />;
  await requirePermission("learners");

  const { q, status, stage } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("apel")
    .select("*")
    .order("created_at", { ascending: false });

  if (q) {
    const safe = q.replace(/[,()]/g, " ").trim();
    if (safe) {
      query = query.or(
        `name.ilike.%${safe}%,matric_no.ilike.%${safe}%,ic_passport_no.ilike.%${safe}%`
      );
    }
  }
  if (status) query = query.eq("learner_status", status);
  if (stage) query = query.eq("assessment_stage", stage);

  const { data, error } = await query;
  if (error) return <QueryError message={error.message} />;
  const learners = (data ?? []) as Learner[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">
          Learners{" "}
          <span className="text-sm font-normal text-gray-500">
            ({learners.length})
          </span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/learners/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + Add learner
          </Link>
          <Link
            href="/learners/bulk"
            className="rounded-md border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
          >
            Bulk upload
          </Link>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-white p-3">
        <div className="min-w-[14rem] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Search
          </label>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Name, matric no, or IC/passport…"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Status
          </label>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {LEARNER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
            {ASSESSMENT_STAGES.map((s) => (
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
        {(q || status || stage) && (
          <Link
            href="/"
            className="px-2 py-2 text-sm text-gray-500 hover:text-gray-800"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Programme</th>
              <th className="px-4 py-3">Counsellor</th>
              <th className="px-4 py-3">Advisor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Sponsor</th>
              <th className="px-4 py-3">12-month window</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Documents</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {learners.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  No learners found. Add your first learner to get started.
                </td>
              </tr>
            )}
            {learners.map((l) => (
              <tr key={l.id} className="hover:bg-blue-50/40">
                <td className="px-4 py-3">
                  <Link
                    href={`/learners/${l.id}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {l.name}
                  </Link>
                  {l.matric_no && (
                    <div className="text-xs text-gray-400">{l.matric_no}</div>
                  )}
                </td>
                <td className="max-w-[14rem] truncate px-4 py-3 text-gray-600">
                  {l.programme_details ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {l.assigned_counsellor ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">{l.advisor ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge value={l.learner_status} />
                </td>
                <td className="px-4 py-3">
                  <StageBadge value={l.assessment_stage} />
                </td>
                <td className="px-4 py-3 text-gray-600">{l.sponsor ?? "—"}</td>
                <td className="px-4 py-3">
                  <OfferProgress issuedDate={l.offer_letter_issued_date} />
                </td>
                <td className="px-4 py-3">
                  <ContactIcons
                    phone={l.contact_no_1 ?? l.contact_no_2}
                    email={l.email_1 ?? l.email_2}
                  />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/learners/${l.id}#documents`}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Upload
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
