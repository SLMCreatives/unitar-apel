import { ReportFieldSelector } from "@/components/report-field-selector";
import { REPORT_FIELDS } from "@/lib/report-fields";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Choose which learner fields to include, then download the Excel
          report. Fields marked ★ are the recommended defaults. The export
          also includes Advisors, Internal/External Assessors, Moderators,
          Assignments, Documents and Notes sheets in full.
        </p>
      </div>
      <ReportFieldSelector fields={REPORT_FIELDS} />
    </div>
  );
}
