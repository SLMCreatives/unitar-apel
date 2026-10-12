"use server";

import { revalidatePath } from "next/cache";
import {
  ASSIGNMENT_SOURCE_COLUMNS,
  syncAssignments,
  type AssignmentSource,
} from "@/lib/assignments";
import { requirePermission } from "@/lib/auth";
import {
  EMPTY_COMMIT,
  EMPTY_PREVIEW,
  IMPORT_MATCH_FIELD,
  LEARNER_IMPORT_FIELDS,
  REQUIRED_IMPORT_FIELDS,
  coerceRow,
  fieldForHeader,
  isImportMode,
  matchKey,
  type CommitState,
  type ImportMode,
  type ImportValue,
  type PreviewRow,
  type PreviewState,
} from "@/lib/bulk-import";
import {
  MAX_IMPORT_ROWS,
  parseImportFile,
  validateImportFile,
} from "@/lib/bulk-parse";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function readMode(formData: FormData): ImportMode {
  const raw = formData.get("mode");
  return typeof raw === "string" && isImportMode(raw) ? raw : "SKIP_EXISTING";
}

function previewError(message: string, mode: ImportMode): PreviewState {
  return { ...EMPTY_PREVIEW, status: "error", message, mode };
}

// Existing learners keyed by their IC / passport, for create-vs-update. Read
// fresh in both steps — the preview is only a proposal, never the authority.
async function existingByMatchKey(supabase: Supabase) {
  const { data, error } = await supabase
    .from("apel")
    .select(`id, ${IMPORT_MATCH_FIELD}`);
  if (error) throw new Error(error.message);

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const key = matchKey(
      (row as Record<string, ImportValue>)[IMPORT_MATCH_FIELD]
    );
    // First wins: if the table already holds duplicates, updating the oldest
    // is at least deterministic.
    if (key && !map.has(key)) map.set(key, row.id as number);
  }
  return map;
}

// Step 1 — read the file and report exactly what an import would do, without
// writing anything.
export async function previewBulkUpload(
  _prev: PreviewState,
  formData: FormData
): Promise<PreviewState> {
  await requirePermission("learners");

  const mode = readMode(formData);
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name) {
    return previewError("Choose a .csv or .xlsx file to upload.", mode);
  }

  const invalid = validateImportFile(file);
  if (invalid) return previewError(invalid, mode);

  let sheet;
  try {
    sheet = await parseImportFile(file);
  } catch (error) {
    return previewError(
      `Could not read the file: ${error instanceof Error ? error.message : "unknown error"}`,
      mode
    );
  }

  if (sheet.headers.length === 0) {
    return previewError("The file has no header row.", mode);
  }

  // Map each sheet column onto a learner field, positionally.
  const columnFields = sheet.headers.map((h) => (h ? fieldForHeader(h) : null));
  const mappedHeaders: string[] = [];
  const ignoredHeaders: string[] = [];
  const usedKeys = new Set<string>();
  sheet.headers.forEach((header, i) => {
    const field = columnFields[i];
    if (!header.trim()) return;
    if (!field || usedKeys.has(field.key)) {
      // A repeated column would silently overwrite the first — ignore it.
      if (field) columnFields[i] = null;
      ignoredHeaders.push(header);
      return;
    }
    usedKeys.add(field.key);
    mappedHeaders.push(`${header} → ${field.label}`);
  });

  const missing = REQUIRED_IMPORT_FIELDS.filter((f) => !usedKeys.has(f.key));
  if (missing.length > 0) {
    return previewError(
      `The file is missing required column${missing.length > 1 ? "s" : ""}: ${missing
        .map((f) => f.label)
        .join(", ")}. Download the template to see the expected headers.`,
      mode
    );
  }

  if (sheet.rows.length > MAX_IMPORT_ROWS) {
    return previewError(
      `The file has ${sheet.rows.length} rows — the limit is ${MAX_IMPORT_ROWS} per upload. Split it into smaller files.`,
      mode
    );
  }

  const supabase = await createClient();
  let existing: Map<string, number>;
  try {
    existing = await existingByMatchKey(supabase);
  } catch (error) {
    return previewError(
      `Could not check for existing learners: ${error instanceof Error ? error.message : "unknown error"}`,
      mode
    );
  }

  const rows: PreviewRow[] = [];
  const seenInFile = new Map<string, number>();

  sheet.rows.forEach((cells, index) => {
    // Sheet row number: header row + offset, so it lines up with Excel.
    const rowNumber = sheet.headerRowNumber + index + 1;
    if (cells.every((c) => c === null || c === undefined || String(c).trim() === "")) {
      return; // blank spacer row
    }

    const named: Record<string, unknown> = {};
    columnFields.forEach((field, col) => {
      if (field) named[field.key] = cells[col] ?? null;
    });

    const { values, errors } = coerceRow(named);
    const key = matchKey(values[IMPORT_MATCH_FIELD]);

    const row: PreviewRow = { rowNumber, values, errors, action: "CREATE" };

    if (errors.length > 0) {
      row.action = "SKIP";
      row.note = "has errors";
    } else if (key && seenInFile.has(key)) {
      row.action = "SKIP";
      row.note = `same ${IMPORT_MATCH_FIELD.replace(/_/g, " ")} as row ${seenInFile.get(key)}`;
    } else if (key && existing.has(key)) {
      row.action = mode === "UPDATE_EXISTING" ? "UPDATE" : "SKIP";
      if (row.action === "SKIP") row.note = "already in the tracker";
    }

    if (key && !seenInFile.has(key)) seenInFile.set(key, rowNumber);
    rows.push(row);
  });

  if (rows.length === 0) {
    return previewError("The file has a header row but no data rows.", mode);
  }

  const importable = rows.filter((r) => r.action !== "SKIP").length;
  return {
    status: "ready",
    message:
      importable === 0
        ? "Nothing to import — every row is skipped. Check the errors below."
        : null,
    fileName: file.name,
    mode,
    mappedHeaders,
    ignoredHeaders,
    rows,
  };
}

// Step 2 — write the rows the user confirmed. Everything is re-validated and
// re-matched here; the submitted rows are treated as untrusted input.
export async function commitBulkUpload(
  _prev: CommitState,
  formData: FormData
): Promise<CommitState> {
  await requirePermission("learners");

  const mode = readMode(formData);
  const raw = formData.get("rows");
  if (typeof raw !== "string" || !raw) {
    return { ...EMPTY_COMMIT, status: "error", message: "Nothing to import — upload a file first." };
  }

  let submitted: PreviewRow[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("expected a list of rows");
    submitted = parsed as PreviewRow[];
  } catch {
    return { ...EMPTY_COMMIT, status: "error", message: "The upload preview could not be read. Upload the file again." };
  }

  if (submitted.length > MAX_IMPORT_ROWS) {
    return {
      ...EMPTY_COMMIT,
      status: "error",
      message: `Too many rows (limit ${MAX_IMPORT_ROWS} per upload).`,
    };
  }

  const supabase = await createClient();
  let existing: Map<string, number>;
  try {
    existing = await existingByMatchKey(supabase);
  } catch (error) {
    return {
      ...EMPTY_COMMIT,
      status: "error",
      message: `Could not check for existing learners: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }

  const failures: CommitState["failures"] = [];
  let created = 0;
  let updated = 0;

  const seen = new Set<string>();
  for (const row of submitted) {
    const rowNumber = Number(row?.rowNumber) || 0;
    const values = (row?.values ?? {}) as Record<string, unknown>;

    // Re-coercing canonical values is a no-op, so this re-checks required
    // fields and enum membership without depending on the preview's verdict.
    const { values: clean, errors } = coerceRow(values);
    if (errors.length > 0) {
      failures.push({ rowNumber, message: errors.join("; ") });
      continue;
    }

    const key = matchKey(clean[IMPORT_MATCH_FIELD]);
    if (key && seen.has(key)) continue; // duplicate inside the same submission
    if (key) seen.add(key);

    const existingId = key ? existing.get(key) : undefined;

    if (existingId !== undefined) {
      if (mode !== "UPDATE_EXISTING") continue;
      const before = await supabase
        .from("apel")
        .select(ASSIGNMENT_SOURCE_COLUMNS)
        .eq("id", existingId)
        .maybeSingle();
      // Returns the learner as saved — the update only touches the filled-in
      // cells, so the file alone doesn't say what the assessors now are.
      const { data: after, error } = await supabase
        .from("apel")
        .update(toUpdatePayload(clean))
        .eq("id", existingId)
        .select(ASSIGNMENT_SOURCE_COLUMNS)
        .single();
      if (error) {
        failures.push({ rowNumber, message: error.message });
        continue;
      }
      await syncAssignments(
        supabase,
        existingId,
        after as unknown as AssignmentSource,
        (before.data ?? null) as AssignmentSource | null
      );
      updated++;
      revalidatePath(`/learners/${existingId}`);
      continue;
    }

    const payload = toLearnerPayload(clean);
    const { data, error } = await supabase
      .from("apel")
      .insert(payload)
      .select("id")
      .single();
    if (error) {
      failures.push({ rowNumber, message: error.message });
      continue;
    }
    await syncAssignments(supabase, data.id, payload);
    created++;
    if (key) existing.set(key, data.id);
  }

  revalidatePath("/");
  revalidatePath("/dashboard");

  const total = created + updated;
  return {
    status: failures.length > 0 && total === 0 ? "error" : "done",
    message:
      total === 0
        ? "No learners were imported."
        : `Imported ${total} learner${total === 1 ? "" : "s"}.`,
    created,
    updated,
    failures,
  };
}

// A new learner: only the known learner columns reach the database, with
// anything absent from the file left empty.
function toLearnerPayload(values: Record<string, ImportValue>) {
  const payload: Record<string, ImportValue> = {};
  for (const field of LEARNER_IMPORT_FIELDS) {
    payload[field.key] = values[field.key] ?? null;
  }
  return payload;
}

// An existing learner: only the cells that are filled in are written. Blank
// cells and columns missing from the file keep the learner's current values,
// so a sheet with a few columns can't wipe the rest of the record. Clearing a
// field is done on the learner record instead.
function toUpdatePayload(values: Record<string, ImportValue>) {
  const payload: Record<string, ImportValue> = {};
  for (const field of LEARNER_IMPORT_FIELDS) {
    const value = values[field.key];
    if (value !== null && value !== undefined) payload[field.key] = value;
  }
  return payload;
}
