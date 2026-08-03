// Bulk learner import: which spreadsheet columns map to which learner fields,
// and how a raw cell becomes a value the apel table accepts.
//
// Keep LEARNER_IMPORT_FIELDS in step with learnerPayload() in
// src/app/actions.ts — that function defines what a learner save writes, and
// this list defines what an import can fill in.

import {
  ASSESSMENT_STAGES,
  INSTRUMENT_LEVELS,
  LEARNER_STATUSES,
  PAYMENT_STATUSES,
  RESULT_STATUSES,
  SELF_ASSESSMENT_STATUSES,
  SPONSORS,
  type Learner,
} from "@/lib/types";

export type ImportFieldType = "text" | "date" | "number" | "enum";

export type ImportField = {
  key: keyof Learner & string;
  label: string;
  type: ImportFieldType;
  options?: readonly string[];
  // apel has NOT NULL on exactly these three columns.
  required?: boolean;
  // Extra spreadsheet headers that should map to this field, on top of the
  // key and the label. Matched after normalisation, so case and punctuation
  // don't matter.
  aliases?: readonly string[];
};

export const LEARNER_IMPORT_FIELDS: ImportField[] = [
  { key: "name", label: "Name", type: "text", required: true, aliases: ["learner name", "full name", "name as per ic passport"] },
  { key: "matric_no", label: "Matric Number", type: "text", aliases: ["matric", "matric no", "student id"] },
  { key: "ic_passport_no", label: "IC / Passport No", type: "text", required: true, aliases: ["ic", "ic no", "passport", "passport no", "ic passport", "nric"] },
  { key: "nationality", label: "Nationality", type: "text" },
  { key: "contact_no_1", label: "Contact No 1", type: "text", aliases: ["contact", "contact no", "phone", "phone no", "mobile"] },
  { key: "contact_no_2", label: "Contact No 2", type: "text" },
  { key: "email_1", label: "Email Address 1", type: "text", required: true, aliases: ["email", "email address", "e mail"] },
  { key: "email_2", label: "Email Address 2", type: "text" },
  { key: "company_details", label: "Company Details", type: "text", aliases: ["company", "employer"] },
  { key: "position_title", label: "Position / Title", type: "text", aliases: ["position", "title", "job title"] },
  { key: "external_links", label: "External Folder Links", type: "text", aliases: ["folder links", "folder link", "external links", "drive link"] },
  { key: "programme_details", label: "Programme Details", type: "text", aliases: ["programme", "program", "course"] },
  { key: "assigned_counsellor", label: "Assigned Counsellor", type: "text", aliases: ["counsellor", "counselor"] },
  { key: "mqa_approval_date", label: "MQA Approval Date", type: "date" },
  { key: "learner_status", label: "Learner Status", type: "enum", options: LEARNER_STATUSES, aliases: ["status"] },
  { key: "sponsor", label: "Sponsor", type: "enum", options: SPONSORS },
  { key: "assessment_stage", label: "Assessment Stage", type: "enum", options: ASSESSMENT_STAGES, aliases: ["stage"] },
  { key: "current_progress_remark", label: "Current Progress Remark", type: "text" },
  { key: "candidate_background", label: "Candidate Background", type: "text", aliases: ["background"] },
  { key: "years_of_experience", label: "Years of Experience", type: "number", aliases: ["experience", "years experience"] },
  { key: "registration_payment_status", label: "Registration Payment Status", type: "enum", options: PAYMENT_STATUSES, aliases: ["payment status"] },
  { key: "date_of_payment", label: "Date of Payment", type: "date", aliases: ["payment date"] },
  { key: "advisor", label: "Advisor", type: "text" },
  { key: "advisor_appointment_date", label: "Advisor Appointment Date", type: "date" },
  { key: "internal_assessor", label: "Internal Assessor", type: "text" },
  { key: "internal_assessor_appointment_date", label: "Internal Assessor Appointment Date", type: "date" },
  { key: "external_assessor", label: "External Assessor", type: "text" },
  { key: "external_assessor_appointment_date", label: "External Assessor Appointment Date", type: "date" },
  { key: "moderator", label: "Moderator", type: "text" },
  { key: "moderator_appointment_date", label: "Moderator Appointment Date", type: "date" },
  { key: "self_assessment_status", label: "Self-Assessment Status", type: "enum", options: SELF_ASSESSMENT_STATUSES },
  { key: "self_assessment_date_completed", label: "Self-Assessment Date Completed", type: "date" },
  { key: "offer_letter_issued_date", label: "Offer Letter Issued Date", type: "date" },
  { key: "assessment_instrument_level", label: "Assessment Instrument Level", type: "enum", options: INSTRUMENT_LEVELS },
  { key: "result_status", label: "Status (Pass / Fail)", type: "enum", options: RESULT_STATUSES, aliases: ["result", "pass fail"] },
  { key: "gpa", label: "GPA", type: "number" },
  { key: "cgpa", label: "CGPA", type: "number" },
  { key: "apel_examination_board_date", label: "AEB Date", type: "date", aliases: ["apel examination board date", "aeb"] },
  { key: "senate_date", label: "Senate Date", type: "date" },
  { key: "progress_remark", label: "Progress Remark", type: "text", aliases: ["remark"] },
  { key: "portfolio_date", label: "Portfolio Date", type: "date" },
  { key: "fvv_date", label: "FVV Date", type: "date" },
  { key: "claim_submission_1_amount", label: "Claim Submission 1 (RM)", type: "number", aliases: ["claim submission 1 to apel centre rm", "claim 1"] },
  { key: "challenge_test_date", label: "Challenge Test Date", type: "date" },
  { key: "capstone_date", label: "Capstone Date", type: "date" },
  { key: "claim_submission_2_amount", label: "Claim Submission 2 (RM)", type: "number", aliases: ["claim submission 2 to apel centre rm", "claim 2"] },
];

export const REQUIRED_IMPORT_FIELDS = LEARNER_IMPORT_FIELDS.filter(
  (f) => f.required
);

// The column an imported row is matched against to decide create vs update.
export const IMPORT_MATCH_FIELD = "ic_passport_no";

export const IMPORT_MODES = ["SKIP_EXISTING", "UPDATE_EXISTING"] as const;
export type ImportMode = (typeof IMPORT_MODES)[number];

export function isImportMode(value: string): value is ImportMode {
  return (IMPORT_MODES as readonly string[]).includes(value);
}

export type ImportValue = string | number | null;

export type RowAction = "CREATE" | "UPDATE" | "SKIP";

export type PreviewRow = {
  // 1-based row number in the source sheet, so errors point at what the user sees.
  rowNumber: number;
  values: Record<string, ImportValue>;
  errors: string[];
  action: RowAction;
  // Why the row is skipped, when it is.
  note?: string;
};

// State returned by the two upload steps. Defined here rather than in the
// actions file so the client component can import the types without pulling
// the server module in.
export type PreviewState = {
  status: "idle" | "error" | "ready";
  message: string | null;
  fileName: string | null;
  mode: ImportMode;
  // Sheet columns that matched a learner field, and those that matched none.
  mappedHeaders: string[];
  ignoredHeaders: string[];
  rows: PreviewRow[];
};

export const EMPTY_PREVIEW: PreviewState = {
  status: "idle",
  message: null,
  fileName: null,
  mode: "SKIP_EXISTING",
  mappedHeaders: [],
  ignoredHeaders: [],
  rows: [],
};

export type CommitState = {
  status: "idle" | "error" | "done";
  message: string | null;
  created: number;
  updated: number;
  failures: { rowNumber: number; message: string }[];
};

export const EMPTY_COMMIT: CommitState = {
  status: "idle",
  message: null,
  created: 0,
  updated: 0,
  failures: [],
};

// --- header matching ---------------------------------------------------------

// Headers are matched loosely: case, punctuation, underscores and spacing all
// vary between the exported workbook, hand-made sheets and the template.
export function normaliseHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const HEADER_LOOKUP = new Map<string, ImportField>();
for (const field of LEARNER_IMPORT_FIELDS) {
  for (const candidate of [field.key, field.label, ...(field.aliases ?? [])]) {
    const norm = normaliseHeader(candidate);
    // First definition wins, so a field's own key/label beats another's alias.
    if (!HEADER_LOOKUP.has(norm)) HEADER_LOOKUP.set(norm, field);
  }
}

export function fieldForHeader(header: string): ImportField | null {
  return HEADER_LOOKUP.get(normaliseHeader(header)) ?? null;
}

// --- cell coercion -----------------------------------------------------------

// Excel serial dates count days from 1899-12-30 (the epoch Lotus 1-2-3 implied).
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;

function isoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  // Rejects impossible dates like 31/02 that Date would silently roll over.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

// Dates are stored as `date` columns, so everything normalises to YYYY-MM-DD.
// Ambiguous slash dates are read day-first (Malaysian convention) — noted in
// the template and on the upload page.
export function coerceDate(raw: unknown): { value: string | null; error?: string } {
  if (raw === null || raw === undefined) return { value: null };

  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return { value: null, error: "invalid date" };
    return {
      value: isoDate(
        raw.getUTCFullYear(),
        raw.getUTCMonth() + 1,
        raw.getUTCDate()
      ),
    };
  }

  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return { value: null, error: "invalid date" };
    const ms = EXCEL_EPOCH_MS + Math.round(raw) * MS_PER_DAY;
    const date = new Date(ms);
    return {
      value: isoDate(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate()
      ),
    };
  }

  const text = String(raw).trim();
  if (!text) return { value: null };

  // YYYY-MM-DD (also the ISO timestamps the export produces).
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(text);
  if (iso) {
    const value = isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    return value ? { value } : { value: null, error: `"${text}" is not a real date` };
  }

  // D/M/YYYY and D-M-YYYY, with 2- or 4-digit years.
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(text);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (dmy[3].length === 2) year += year >= 70 ? 1900 : 2000;
    if (day > 12 && month > 12) {
      return { value: null, error: `"${text}" is not a real date` };
    }
    const value = isoDate(year, month, day);
    return value
      ? { value }
      : {
          value: null,
          error: `"${text}" is not a real date (dates are read day-first, e.g. 31/12/2025)`,
        };
  }

  return {
    value: null,
    error: `"${text}" is not a date — use YYYY-MM-DD or DD/MM/YYYY`,
  };
}

export function coerceNumber(raw: unknown): { value: number | null; error?: string } {
  if (raw === null || raw === undefined) return { value: null };
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? { value: raw } : { value: null, error: "invalid number" };
  }

  const text = String(raw).trim();
  if (!text) return { value: null };

  // Tolerate the shapes a spreadsheet produces: "RM 1,200.00", "1 200", "(50)".
  const negative = /^\(.*\)$/.test(text);
  const cleaned = text
    .replace(/^\(|\)$/g, "")
    .replace(/(rm|myr)/gi, "")
    .replace(/[,\s]/g, "");
  if (!/^[+-]?\d*\.?\d+$/.test(cleaned)) {
    return { value: null, error: `"${text}" is not a number` };
  }
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return { value: null, error: `"${text}" is not a number` };
  return { value: negative ? -parsed : parsed };
}

function normaliseEnum(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
}

export function coerceEnum(
  raw: unknown,
  options: readonly string[]
): { value: string | null; error?: string } {
  if (raw === null || raw === undefined) return { value: null };
  const text = String(raw).trim();
  if (!text) return { value: null };

  const wanted = normaliseEnum(text);
  const match = options.find((o) => normaliseEnum(o) === wanted);
  if (match) return { value: match };

  // "WITHDRAWN" for WITHDRAW, "COMPLETE" for COMPLETED — accept a value that
  // unambiguously prefixes exactly one option.
  const prefixed = options.filter(
    (o) => normaliseEnum(o).startsWith(wanted) || wanted.startsWith(normaliseEnum(o))
  );
  if (prefixed.length === 1) return { value: prefixed[0] };

  return {
    value: null,
    error: `"${text}" is not valid — use one of: ${options.join(", ")}`,
  };
}

export function coerceText(raw: unknown): { value: string | null } {
  if (raw === null || raw === undefined) return { value: null };
  const text = String(raw).trim();
  return { value: text === "" ? null : text };
}

// Turns one spreadsheet row into a learner payload, collecting a readable
// error per bad cell rather than failing the whole import on the first one.
export function coerceRow(
  cells: Record<string, unknown>
): { values: Record<string, ImportValue>; errors: string[] } {
  const values: Record<string, ImportValue> = {};
  const errors: string[] = [];

  for (const field of LEARNER_IMPORT_FIELDS) {
    if (!(field.key in cells)) continue;
    const raw = cells[field.key];

    let result: { value: ImportValue; error?: string };
    switch (field.type) {
      case "date":
        result = coerceDate(raw);
        break;
      case "number":
        result = coerceNumber(raw);
        break;
      case "enum":
        result = coerceEnum(raw, field.options ?? []);
        break;
      default:
        result = coerceText(raw);
    }

    if (result.error) errors.push(`${field.label}: ${result.error}`);
    values[field.key] = result.value;
  }

  for (const field of REQUIRED_IMPORT_FIELDS) {
    if (values[field.key] === null || values[field.key] === undefined) {
      errors.push(`${field.label} is required`);
    }
  }

  return { values, errors };
}

// Match key for create-vs-update. IC / passport numbers get typed with stray
// spaces and dashes, so compare them stripped.
export function matchKey(value: ImportValue): string | null {
  if (value === null || value === undefined) return null;
  const key = String(value).replace(/[\s-]+/g, "").toUpperCase();
  return key === "" ? null : key;
}
