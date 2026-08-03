import ExcelJS from "exceljs";
import { requirePermission } from "@/lib/auth";
import {
  LEARNER_IMPORT_FIELDS,
  REQUIRED_IMPORT_FIELDS,
} from "@/lib/bulk-import";

export const dynamic = "force-dynamic";

// A ready-to-fill workbook for the bulk upload: one column per importable
// learner field, plus a reference sheet listing the values the dropdown-style
// columns accept. Generated from LEARNER_IMPORT_FIELDS so it can never drift
// from what the importer actually reads.
export async function GET() {
  await requirePermission("learners");

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Learners");
  sheet.columns = LEARNER_IMPORT_FIELDS.map((field) => ({
    header: field.required ? `${field.label} *` : field.label,
    key: field.key,
    width: Math.min(38, Math.max(14, field.label.length + 4)),
  }));

  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: "middle", wrapText: true };
  header.height = 30;
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  // One example row so the expected formats are obvious. Delete before import
  // — or leave it: the row is only a sample, so it imports as a learner.
  sheet.addRow({
    name: "Nurul binti Ahmad",
    matric_no: "APEL2026001",
    ic_passport_no: "900101-14-5678",
    nationality: "Malaysia",
    contact_no_1: "0123456789",
    email_1: "nurul@example.com",
    company_details: "Contoh Sdn Bhd",
    position_title: "Operations Executive",
    external_links: "Portfolio | https://drive.google.com/drive/folders/example",
    programme_details: "Bachelor of Management",
    assigned_counsellor: "Siti",
    learner_status: "ACTIVE",
    sponsor: "OPEN",
    assessment_stage: "PORTFOLIO",
    years_of_experience: 8,
    registration_payment_status: "PAID",
    date_of_payment: "2026-01-15",
  });

  const reference = workbook.addWorksheet("Accepted values");
  reference.columns = [
    { header: "Column", key: "column", width: 34 },
    { header: "Type", key: "type", width: 12 },
    { header: "Required", key: "required", width: 10 },
    { header: "Accepted values", key: "values", width: 70 },
  ];
  reference.getRow(1).font = { bold: true };

  for (const field of LEARNER_IMPORT_FIELDS) {
    reference.addRow({
      column: field.label,
      type: field.type,
      required: field.required ? "Yes" : "",
      values:
        field.type === "enum"
          ? (field.options ?? []).join(" / ")
          : field.type === "date"
            ? "YYYY-MM-DD or DD/MM/YYYY (day first)"
            : field.type === "number"
              ? "A number, e.g. 8 or 1200.50"
              : "",
    });
  }

  reference.addRow({});
  reference.addRow({
    column: "Note",
    values: `Required columns: ${REQUIRED_IMPORT_FIELDS.map((f) => f.label).join(", ")}. Header names are matched loosely, so case and punctuation don't matter. Extra columns are ignored.`,
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="apel-learner-upload-template.xlsx"',
    },
  });
}
