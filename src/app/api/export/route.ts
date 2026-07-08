import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";

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

export async function GET() {
  const supabase = await createClient();
  const [learners, advisors, assessors, notes] = await Promise.all([
    supabase.from("apel").select("*").order("id"),
    supabase.from("apel_advisors").select("*").order("id"),
    supabase.from("apel_assessors").select("*").order("id"),
    supabase.from("apel_notes").select("*").order("id"),
  ]);

  const firstError =
    learners.error ?? advisors.error ?? assessors.error ?? notes.error;
  if (firstError) {
    return new Response(`Export failed: ${firstError.message}`, {
      status: 500,
    });
  }

  // Make the notes sheet readable on its own
  const nameById = new Map(
    (learners.data ?? []).map((l) => [l.id as number, l.name as string])
  );
  const noteRows = (notes.data ?? []).map((n) => ({
    ...n,
    learner_name: nameById.get(n.learner_id as number) ?? "",
  }));

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  addSheet(workbook, "Learners", learners.data ?? []);
  addSheet(workbook, "Advisors", advisors.data ?? []);
  addSheet(workbook, "Assessors & Moderators", assessors.data ?? []);
  addSheet(workbook, "Notes", noteRows);

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
