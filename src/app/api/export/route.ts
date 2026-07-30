import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { REPORT_FIELDS } from "@/lib/report-fields";

export const dynamic = "force-dynamic";

type Rows = Record<string, unknown>[];

function addSheet(workbook: ExcelJS.Workbook, name: string, rows: Rows) {
  const sheet = workbook.addWorksheet(name);
  if (rows.length === 0) return;

  const keys = Object.keys(rows[0]);
  sheet.columns = keys.map((key) => ({
    header: key.replace(/_/g, " ").toUpperCase(),
    key,
    width: Math.min(40, Math.max(12, key.length + 4)),
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.addRows(rows);
}

export async function GET(request: Request) {
  // Export is a data-exposing endpoint — same guard as the Reports page.
  await requirePermission("reports");

  // The Reports page submits the chosen learner fields as repeated ?fields=
  // params. No params → full export (the header's Export to Excel link).
  const url = new URL(request.url);
  const requested = new Set(url.searchParams.getAll("fields"));
  const selectedFields =
    requested.size > 0
      ? REPORT_FIELDS.filter((f) => requested.has(f.key))
      : null;
  if (requested.size > 0 && (!selectedFields || selectedFields.length === 0)) {
    return new Response("Select at least one valid report field.", {
      status: 400,
    });
  }

  const supabase = await createClient();
  const [learners, advisors, assessors, notes, assignments, documents] =
    await Promise.all([
      supabase.from("apel").select("*").order("id"),
      supabase.from("apel_advisors").select("*").order("id"),
      supabase.from("apel_assessors").select("*").order("id"),
      supabase.from("apel_notes").select("*").order("id"),
      supabase.from("apel_assignments").select("*").order("id"),
      supabase.from("apel_documents").select("*").order("id"),
    ]);

  const firstError =
    learners.error ?? advisors.error ?? assessors.error ?? notes.error;
  if (firstError) {
    return new Response(`Export failed: ${firstError.message}`, {
      status: 500,
    });
  }

  // Keep only the selected learner fields, in the report's field order.
  let learnerRows = (learners.data ?? []) as Rows;
  if (selectedFields) {
    learnerRows = learnerRows.map((row) => {
      const picked: Record<string, unknown> = {};
      for (const field of selectedFields) picked[field.key] = row[field.key];
      return picked;
    });
  }

  // Make the related sheets readable on their own
  const nameById = new Map(
    (learners.data ?? []).map((l) => [l.id as number, l.name as string])
  );
  const withLearnerName = (rows: Rows) =>
    rows.map((r) => ({
      ...r,
      learner_name: nameById.get(r.learner_id as number) ?? "",
    }));

  const assessorRows = (assessors.data ?? []) as Rows;
  const byRole = (role: string) =>
    assessorRows.filter((a) => a.role === role);

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  addSheet(workbook, "Learners", learnerRows);
  addSheet(workbook, "Advisors", advisors.data ?? []);
  addSheet(workbook, "Internal Assessors", byRole("INTERNAL"));
  addSheet(workbook, "External Assessors", byRole("EXTERNAL"));
  addSheet(workbook, "Moderators", byRole("MODERATOR"));
  // These tables arrive with migration 0002 — skip the sheets until it runs.
  if (!assignments.error) {
    addSheet(workbook, "Assignments", withLearnerName(assignments.data ?? []));
  }
  if (!documents.error) {
    addSheet(workbook, "Documents", withLearnerName(documents.data ?? []));
  }
  addSheet(workbook, "Notes", withLearnerName(notes.data ?? []));

  const buffer = await workbook.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="apel-tracker-${date}.xlsx"`,
    },
  });
}
