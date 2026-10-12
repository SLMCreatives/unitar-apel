import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { StageBadge, StatusBadge } from "@/components/badges";
import { ContactIcons } from "@/components/contact-buttons";
import { LeadAge } from "@/components/lead-age";
import { LearnerFilters } from "@/components/learner-filters";
import { OfferProgress } from "@/components/offer-progress";
import {
  Pagination,
  parsePage,
  parsePageSize,
} from "@/components/pagination";
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
  searchParams: Promise<{
    q?: string;
    status?: string;
    stage?: string;
    page?: string;
    per?: string;
  }>;
}) {
  if (!envReady()) return <SetupNotice />;
  await requirePermission("learners");

  const { q, status, stage, page, per } = await searchParams;
  const supabase = await createClient();

  const pageSize = parsePageSize(per);

  // Described as data rather than a helper so the same filters can be applied
  // to both the count and the row query without losing the builder's types.
  const filters: (
    | { kind: "or"; value: string }
    | { kind: "eq"; column: string; value: string }
  )[] = [];
  if (q) {
    const safe = q.replace(/[,()]/g, " ").trim();
    if (safe) {
      filters.push({
        kind: "or",
        value: `name.ilike.%${safe}%,matric_no.ilike.%${safe}%,ic_passport_no.ilike.%${safe}%`,
      });
    }
  }
  if (status) filters.push({ kind: "eq", column: "learner_status", value: status });
  if (stage) filters.push({ kind: "eq", column: "assessment_stage", value: stage });

  // Counted first because PostgREST errors on a range past the last row, so
  // the requested page has to be clamped before the rows are fetched.
  let countQuery = supabase
    .from("apel")
    .select("id", { count: "exact", head: true });
  for (const f of filters) {
    countQuery =
      f.kind === "or" ? countQuery.or(f.value) : countQuery.eq(f.column, f.value);
  }
  const countRes = await countQuery;
  if (countRes.error) return <QueryError message={countRes.error.message} />;

  const total = countRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(parsePage(page), totalPages);
  const from = (currentPage - 1) * pageSize;

  let rowsQuery = supabase
    .from("apel")
    .select("*")
    .order("created_at", { ascending: false });
  for (const f of filters) {
    rowsQuery =
      f.kind === "or" ? rowsQuery.or(f.value) : rowsQuery.eq(f.column, f.value);
  }

  const { data, error } = await rowsQuery.range(from, from + pageSize - 1);
  if (error) return <QueryError message={error.message} />;
  const learners = (data ?? []) as Learner[];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-base font-bold text-gray-900">
          Learners{" "}
          <span className="text-xs font-normal text-gray-500">({total})</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/learners/new"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + Add learner
          </Link>
          <Link
            href="/learners/bulk"
            className="rounded-md border border-blue-600 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
          >
            Bulk upload
          </Link>
        </div>
      </div>

      <LearnerFilters
        q={q ?? ""}
        status={status ?? ""}
        stage={stage ?? ""}
        pageSize={pageSize}
        statuses={LEARNER_STATUSES}
        stages={ASSESSMENT_STAGES}
      />

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Programme</th>
                <th className="px-3 py-2">Counsellor</th>
                <th className="px-3 py-2">Advisor</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2">Sponsor</th>
                <th className="px-3 py-2">12-month window</th>
                <th className="px-3 py-2">Lead age</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Documents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {learners.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-3 py-8 text-center text-gray-400"
                  >
                    No learners found. Add your first learner to get started.
                  </td>
                </tr>
              )}
              {learners.map((l) => (
                <tr key={l.id} className="hover:bg-blue-50/40">
                  <td className="px-3 py-1.5">
                    <Link
                      href={`/learners/${l.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {l.name}
                    </Link>
                    {l.matric_no && (
                      <div className="text-[11px] text-gray-400">{l.matric_no}</div>
                    )}
                  </td>
                  <td className="max-w-[14rem] truncate px-3 py-1.5 text-gray-600">
                    {l.programme_details ?? "—"}
                  </td>
                  <td className="px-3 py-1.5 text-gray-600">
                    {l.assigned_counsellor ?? "—"}
                  </td>
                  <td className="px-3 py-1.5 text-gray-600">{l.advisor ?? "—"}</td>
                  <td className="px-3 py-1.5">
                    <StatusBadge value={l.learner_status} />
                  </td>
                  <td className="px-3 py-1.5">
                    <StageBadge value={l.assessment_stage} />
                  </td>
                  <td className="px-3 py-1.5 text-gray-600">{l.sponsor ?? "—"}</td>
                  <td className="px-3 py-1.5">
                    <OfferProgress
                      issuedDate={l.offer_letter_issued_date}
                      stage={l.assessment_stage}
                      status={l.learner_status}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <LeadAge createdAt={l.created_at} updatedAt={l.updated_at} />
                  </td>
                  <td className="px-3 py-1.5">
                    <ContactIcons
                      phone={l.contact_no_1 ?? l.contact_no_2}
                      email={l.email_1 ?? l.email_2}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Link
                      href={`/learners/${l.id}#documents`}
                      className="text-[11px] font-medium text-blue-600 hover:underline"
                    >
                      Upload
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <Pagination
            basePath="/"
            params={{ q, status, stage }}
            page={currentPage}
            pageSize={pageSize}
            total={total}
          />
        )}
      </div>
    </div>
  );
}
