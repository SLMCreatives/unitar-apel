"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import {
  ASSIGNMENT_SOURCE_COLUMNS,
  syncAssignments,
  type AssignmentSource,
} from "@/lib/assignments";
import { createClient } from "@/lib/supabase/server";
import {
  DOCUMENTS_BUCKET,
  documentStoragePath,
  validateDocument,
} from "@/lib/documents";
import { instrumentColumns } from "@/lib/instruments";
import type { LearnerSaveState } from "@/lib/learner-save";
import { ROLE_CONFIG, roleConfigForAssessorRole } from "@/lib/roles";
import { type SectionKey } from "@/lib/permissions";
import {
  ASSESSMENT_INSTRUMENTS,
  PERSONNEL_ROLES,
  type PersonnelRole,
} from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Advisor management lives under the "advisors" section; the three assessor
// roles under "assessors". Used to guard the assignment actions by section.
function sectionForRole(role: string): SectionKey {
  return role === "ADVISOR" ? "advisors" : "assessors";
}

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function num(fd: FormData, key: string): number | null {
  const s = str(fd, key);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// One status/GPA/CGPA per assessment instrument, from the results grid in the
// learner form. Built from ASSESSMENT_INSTRUMENTS so adding an instrument
// there is the only change needed.
function instrumentResultsPayload(fd: FormData) {
  const payload: Record<string, string | number | null> = {};
  for (const { prefix } of ASSESSMENT_INSTRUMENTS) {
    const cols = instrumentColumns(prefix);
    payload[cols.resultStatus] = str(fd, cols.resultStatus);
    payload[cols.gpa] = num(fd, cols.gpa);
    payload[cols.cgpa] = num(fd, cols.cgpa);
  }
  return payload;
}

function learnerPayload(fd: FormData) {
  return {
    // Learner details information
    name: str(fd, "name"),
    assigned_counsellor: str(fd, "assigned_counsellor"),
    programme_details: str(fd, "programme_details"),
    mqa_approval_date: str(fd, "mqa_approval_date"),
    learner_status: str(fd, "learner_status"),
    sponsor: str(fd, "sponsor"),
    current_progress_remark: str(fd, "current_progress_remark"),
    assessment_stage: str(fd, "assessment_stage"),
    matric_no: str(fd, "matric_no"),
    ic_passport_no: str(fd, "ic_passport_no"),
    nationality: str(fd, "nationality"),
    contact_no_1: str(fd, "contact_no_1"),
    contact_no_2: str(fd, "contact_no_2"),
    email_1: str(fd, "email_1"),
    email_2: str(fd, "email_2"),
    company_details: str(fd, "company_details"),
    position_title: str(fd, "position_title"),
    external_links: str(fd, "external_links"),
    // Screening outcome
    candidate_background: str(fd, "candidate_background"),
    years_of_experience: num(fd, "years_of_experience"),
    // Payment records
    registration_payment_status: str(fd, "registration_payment_status"),
    date_of_payment: str(fd, "date_of_payment"),
    // Assessor details (stored as names)
    advisor: str(fd, "advisor"),
    advisor_appointment_date: str(fd, "advisor_appointment_date"),
    internal_assessor: str(fd, "internal_assessor"),
    internal_assessor_appointment_date: str(fd, "internal_assessor_appointment_date"),
    external_assessor: str(fd, "external_assessor"),
    external_assessor_appointment_date: str(fd, "external_assessor_appointment_date"),
    moderator: str(fd, "moderator"),
    moderator_appointment_date: str(fd, "moderator_appointment_date"),
    // Learner progress information
    self_assessment_status: str(fd, "self_assessment_status"),
    self_assessment_date_completed: str(fd, "self_assessment_date_completed"),
    offer_letter_issued_date: str(fd, "offer_letter_issued_date"),
    ...instrumentResultsPayload(fd),
    // apel_examination_board_date is deliberately absent: the form no longer
    // has that field, so including it here would write null on every save and
    // wipe the AEB dates already recorded. The column keeps its history and
    // stays available in Reports.
    senate_date: str(fd, "senate_date"),
    progress_remark: str(fd, "progress_remark"),
    // Milestones / claims
    portfolio_date: str(fd, "portfolio_date"),
    fvv_date: str(fd, "fvv_date"),
    claim_submission_1_amount: num(fd, "claim_submission_1_amount"),
    challenge_test_date: str(fd, "challenge_test_date"),
    capstone_date: str(fd, "capstone_date"),
    claim_submission_2_amount: num(fd, "claim_submission_2_amount"),
  };
}

// apel has NOT NULL on exactly these three columns, so a blank value otherwise
// surfaces as an opaque Postgres error ("null value in column ... violates
// not-null constraint"). The form marks all three required as well.
function assertRequired(payload: ReturnType<typeof learnerPayload>) {
  if (!payload.name) throw new Error("Learner name is required.");
  if (!payload.ic_passport_no) throw new Error("IC / Passport No is required.");
  if (!payload.email_1) throw new Error("Email Address 1 is required.");
}

// Learner columns arrive with migrations run by hand in the Supabase SQL
// Editor, so a skipped migration surfaces as an opaque Postgres error on save
// ("column apel.external_links does not exist"). Name the migration instead.
const COLUMN_MIGRATIONS: Record<string, string> = {
  external_links: "0005_learner_external_links.sql",
  portfolio_result_status: "0006_instrument_results.sql",
  fvv_result_status: "0006_instrument_results.sql",
  challenge_test_result_status: "0006_instrument_results.sql",
  capstone_result_status: "0006_instrument_results.sql",
};

function describeSaveError(message: string): string {
  for (const [column, migration] of Object.entries(COLUMN_MIGRATIONS)) {
    if (message.includes(column)) {
      return `${message} — run supabase/migrations/${migration} in the Supabase SQL Editor.`;
    }
  }
  return message;
}

function fileField(fd: FormData, key: string): File | null {
  const v = fd.get(key);
  if (!(v instanceof File) || !v.name || v.size === 0) return null;
  return v;
}

export async function createLearner(formData: FormData) {
  await requirePermission("learners");
  const payload = learnerPayload(formData);
  assertRequired(payload);

  // Validate the optional document before creating the learner, so a bad file
  // never leaves a half-finished record or an orphaned upload behind.
  const file = fileField(formData, "document");
  if (file) {
    const invalid = validateDocument(file);
    if (invalid) throw new Error(invalid);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("apel")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(describeSaveError(error.message));

  await syncAssignments(supabase, data.id, payload);

  // The file is only stored once the learner exists — nothing to clean up if
  // the insert above fails.
  let docFailed = false;
  if (file) {
    try {
      await storeDocument(supabase, {
        file,
        learnerId: data.id,
        category: str(formData, "document_category"),
        uploadedBy: str(formData, "document_uploaded_by"),
      });
    } catch {
      docFailed = true;
    }
  }

  revalidatePath("/");
  redirect(`/learners/${data.id}${docFailed ? "?doc_error=1" : ""}`);
}

// Backs the learner editor's Save buttons. Failures come back as state rather
// than thrown errors, so a rejected save reports itself in the form instead of
// throwing the user into the error boundary and losing what they typed.
export async function saveLearner(
  id: number,
  prev: LearnerSaveState,
  formData: FormData
): Promise<LearnerSaveState> {
  // Outside the try: this may redirect, which throws a control-flow error that
  // must not be swallowed as a save failure.
  await requirePermission("learners");

  try {
    const payload = learnerPayload(formData);
    assertRequired(payload);

    const supabase = await createClient();
    // The learner as it was, so only Assessor Details that actually changed
    // are copied onto assignments.
    const before = await supabase
      .from("apel")
      .select(ASSIGNMENT_SOURCE_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    const previous = (before.data ?? null) as AssignmentSource | null;

    const { error } = await supabase.from("apel").update(payload).eq("id", id);
    if (error) throw new Error(describeSaveError(error.message));

    await syncAssignments(supabase, id, payload, previous);

    // Saving is a deliberate click, so refresh everything rather than guessing
    // which pages a change touched: this purges the client cache and
    // invalidates every route, and re-renders this one into the same response
    // so the fields come back showing exactly what was stored.
    revalidatePath("/", "layout");

    return { status: "saved", message: null, savedAt: Date.now() };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not save the learner.",
      savedAt: prev.savedAt,
    };
  }
}

export async function deleteLearner(id: number) {
  await requirePermission("learners");
  const supabase = await createClient();

  // Best-effort cleanup of the learner's uploaded files; the metadata rows go
  // with the learner via ON DELETE CASCADE.
  const files = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .list(`learners/${id}`);
  if (files.data && files.data.length > 0) {
    await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .remove(files.data.map((f) => `learners/${id}/${f.name}`));
  }

  const { error } = await supabase.from("apel").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  redirect("/");
}

// --- Notes & follow-ups -----------------------------------------------------

export async function addNote(learnerId: number, formData: FormData) {
  await requirePermission("learners");
  const body = str(formData, "body");
  if (!body) return;

  const supabase = await createClient();
  const { error } = await supabase.from("apel_notes").insert({
    learner_id: learnerId,
    body,
    follow_up_date: str(formData, "follow_up_date"),
    author: str(formData, "author"),
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/learners/${learnerId}`);
}

export async function deleteNote(noteId: number, learnerId: number) {
  await requirePermission("learners");
  const supabase = await createClient();
  const { error } = await supabase
    .from("apel_notes")
    .delete()
    .eq("id", noteId);
  if (error) throw new Error(error.message);

  revalidatePath(`/learners/${learnerId}`);
}

// Closes (or reopens) a note's follow-up. The note and its date are kept, so
// the history stays; the Dashboard stops listing it.
export async function setFollowUpDone(
  noteId: number,
  learnerId: number,
  done: boolean
) {
  await requirePermission("learners");
  const supabase = await createClient();
  const { error } = await supabase
    .from("apel_notes")
    .update({ follow_up_done_at: done ? new Date().toISOString() : null })
    .eq("id", noteId);
  if (error) {
    throw new Error(
      error.message.includes("follow_up_done_at")
        ? `${error.message} — run supabase/migrations/0008_note_follow_up_done.sql in the Supabase SQL Editor.`
        : error.message
    );
  }

  revalidatePath(`/learners/${learnerId}`);
  revalidatePath("/dashboard");
}

// --- Advisors ----------------------------------------------------------------

export async function addAdvisor(formData: FormData) {
  await requirePermission("advisors");
  const name = str(formData, "advisor_name");
  if (!name) return;

  const supabase = await createClient();
  const { error } = await supabase.from("apel_advisors").insert({
    advisor_name: name,
    advisor_remark: str(formData, "advisor_remark"),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/advisors");
}

export async function updateAdvisor(id: number, formData: FormData) {
  await requirePermission("advisors");
  const name = str(formData, "advisor_name");
  if (!name) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("apel_advisors")
    .update({
      advisor_name: name,
      advisor_remark: str(formData, "advisor_remark"),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/advisors");
}

export async function deleteAdvisor(id: number) {
  await requirePermission("advisors");
  const supabase = await createClient();
  const { error } = await supabase
    .from("apel_advisors")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/advisors");
}

// --- Internal/external assessors & moderators ---------------------------------

function revalidateAssessorPage(assessorRole: string | null) {
  const config = roleConfigForAssessorRole(assessorRole);
  if (config) revalidatePath(config.route);
}

export async function addAssessor(formData: FormData) {
  await requirePermission("assessors");
  const name = str(formData, "name");
  const role = str(formData, "role");
  if (!name || !role) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("apel_assessors")
    .insert({ name, role });
  if (error) throw new Error(error.message);

  revalidateAssessorPage(role);
}

export async function updateAssessor(id: number, formData: FormData) {
  await requirePermission("assessors");
  const name = str(formData, "name");
  if (!name) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("apel_assessors")
    .update({ name })
    .eq("id", id)
    .select("role")
    .maybeSingle();
  if (error) throw new Error(error.message);

  revalidateAssessorPage(data?.role ?? null);
}

export async function deleteAssessor(id: number) {
  await requirePermission("assessors");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("apel_assessors")
    .delete()
    .eq("id", id)
    .select("role")
    .maybeSingle();
  if (error) throw new Error(error.message);

  revalidateAssessorPage(data?.role ?? null);
}

// --- Personnel assignments ------------------------------------------------------

function assignmentPayload(fd: FormData) {
  return {
    stage: str(fd, "stage"),
    payment_mode: str(fd, "payment_mode"),
    claim_status: str(fd, "claim_status"),
    appointment_date: str(fd, "appointment_date"),
    appointment_letter_status: str(fd, "appointment_letter_status") ?? "PENDING",
    remarks: str(fd, "remarks"),
  };
}

// Moderators are not paid through this process — reject claim/payment values
// even if a crafted request supplies them (the forms never render the fields).
function assertClaimAllowed(
  role: string,
  payload: { claim_status: string | null; payment_mode: string | null }
) {
  const config = ROLE_CONFIG[role as PersonnelRole];
  if (!config?.claimEnabled && (payload.claim_status || payload.payment_mode)) {
    throw new Error(
      `Claim/payment tracking does not apply to ${config?.label ?? role} assignments.`
    );
  }
}

function revalidateAssignmentPages(role: string, learnerId: number) {
  const config = ROLE_CONFIG[role as PersonnelRole];
  if (config) revalidatePath(config.route);
  revalidatePath(`/learners/${learnerId}`);
}

export async function addAssignment(formData: FormData) {
  const learnerId = num(formData, "learner_id");
  const role = str(formData, "role");
  const personnelName = str(formData, "personnel_name");
  if (!learnerId || !personnelName) return;
  if (!role || !(PERSONNEL_ROLES as readonly string[]).includes(role)) {
    throw new Error("Unknown personnel role.");
  }
  await requirePermission(sectionForRole(role));

  const payload = assignmentPayload(formData);
  assertClaimAllowed(role, payload);

  const supabase = await createClient();

  // A learner has at most one assignment per role and stage (unique index in
  // migration 0002). Adding one that already exists updates it rather than
  // failing on the index.
  let lookup = supabase
    .from("apel_assignments")
    .select("id")
    .eq("learner_id", learnerId)
    .eq("role", role);
  lookup = payload.stage ? lookup.eq("stage", payload.stage) : lookup.is("stage", null);
  const existing = await lookup.maybeSingle();
  if (existing.error) throw new Error(existing.error.message);

  const { error } = existing.data
    ? await supabase
        .from("apel_assignments")
        .update({ personnel_name: personnelName, ...payload })
        .eq("id", existing.data.id)
    : await supabase.from("apel_assignments").insert({
        learner_id: learnerId,
        personnel_name: personnelName,
        role,
        ...payload,
      });
  if (error) throw new Error(error.message);

  revalidateAssignmentPages(role, learnerId);
}

export async function updateAssignment(id: number, formData: FormData) {
  const supabase = await createClient();
  const existing = await supabase
    .from("apel_assignments")
    .select("id, role, learner_id")
    .eq("id", id)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (!existing.data) throw new Error("Assignment not found.");
  await requirePermission(sectionForRole(existing.data.role));

  const payload = assignmentPayload(formData);
  assertClaimAllowed(existing.data.role, payload);

  const { error } = await supabase
    .from("apel_assignments")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidateAssignmentPages(existing.data.role, existing.data.learner_id);
}

export async function deleteAssignment(id: number) {
  const supabase = await createClient();
  const existing = await supabase
    .from("apel_assignments")
    .select("id, role, learner_id")
    .eq("id", id)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (!existing.data) return;
  await requirePermission(sectionForRole(existing.data.role));

  // Metadata rows cascade with the assignment; the stored files do not, so
  // remove them first.
  const docs = await supabase
    .from("apel_documents")
    .select("storage_path")
    .eq("assignment_id", id);
  if (docs.data && docs.data.length > 0) {
    await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .remove(docs.data.map((d) => d.storage_path));
  }

  const { error } = await supabase
    .from("apel_assignments")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidateAssignmentPages(existing.data.role, existing.data.learner_id);
}

// --- Documents ------------------------------------------------------------------

async function storeDocument(
  supabase: Supabase,
  opts: {
    file: File;
    learnerId: number;
    assignmentId?: number | null;
    personnelRole?: string | null;
    category?: string | null;
    uploadedBy?: string | null;
  }
) {
  const path = documentStoragePath(opts.learnerId, opts.file.name);
  const upload = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, await opts.file.arrayBuffer(), {
      contentType: opts.file.type || "application/octet-stream",
    });
  if (upload.error) throw new Error(upload.error.message);

  const { error } = await supabase.from("apel_documents").insert({
    learner_id: opts.learnerId,
    assignment_id: opts.assignmentId ?? null,
    personnel_role: opts.personnelRole ?? null,
    document_category: opts.category ?? null,
    original_file_name: opts.file.name,
    storage_path: path,
    mime_type: opts.file.type || null,
    file_size: opts.file.size,
    uploaded_by: opts.uploadedBy ?? null,
  });
  if (error) {
    // Don't leave an unreferenced file behind.
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
    throw new Error(error.message);
  }
}

function revalidateDocumentPages(
  learnerId: number,
  personnelRole: string | null
) {
  revalidatePath(`/learners/${learnerId}`);
  const config = ROLE_CONFIG[personnelRole as PersonnelRole];
  if (config) revalidatePath(config.route);
}

export async function uploadDocument(formData: FormData) {
  const learnerId = num(formData, "learner_id");
  if (!learnerId) throw new Error("Missing learner.");

  const file = fileField(formData, "document");
  if (!file) throw new Error("Choose a file to upload.");
  const invalid = validateDocument(file);
  if (invalid) throw new Error(invalid);

  const personnelRole = str(formData, "personnel_role");
  await requirePermission(
    personnelRole ? sectionForRole(personnelRole) : "learners"
  );
  const supabase = await createClient();
  await storeDocument(supabase, {
    file,
    learnerId,
    assignmentId: num(formData, "assignment_id"),
    personnelRole,
    category: str(formData, "document_category"),
    uploadedBy: str(formData, "uploaded_by"),
  });

  revalidateDocumentPages(learnerId, personnelRole);
}

export async function replaceDocument(id: number, formData: FormData) {
  const file = fileField(formData, "document");
  if (!file) throw new Error("Choose a replacement file.");
  const invalid = validateDocument(file);
  if (invalid) throw new Error(invalid);

  const supabase = await createClient();
  const existing = await supabase
    .from("apel_documents")
    .select("id, learner_id, personnel_role, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (!existing.data) throw new Error("Document not found.");
  await requirePermission(
    existing.data.personnel_role
      ? sectionForRole(existing.data.personnel_role)
      : "learners"
  );

  const path = documentStoragePath(existing.data.learner_id, file.name);
  const upload = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type || "application/octet-stream",
    });
  if (upload.error) throw new Error(upload.error.message);

  const { error } = await supabase
    .from("apel_documents")
    .update({
      original_file_name: file.name,
      storage_path: path,
      mime_type: file.type || null,
      file_size: file.size,
      uploaded_by: str(formData, "uploaded_by"),
    })
    .eq("id", id);
  if (error) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
    throw new Error(error.message);
  }

  // Remove the replaced file last — losing this cleanup is harmless.
  await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([existing.data.storage_path]);

  revalidateDocumentPages(
    existing.data.learner_id,
    existing.data.personnel_role
  );
}

export async function deleteDocument(id: number) {
  const supabase = await createClient();
  const existing = await supabase
    .from("apel_documents")
    .select("id, learner_id, personnel_role, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (!existing.data) return;
  await requirePermission(
    existing.data.personnel_role
      ? sectionForRole(existing.data.personnel_role)
      : "learners"
  );

  const { error } = await supabase
    .from("apel_documents")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([existing.data.storage_path]);

  revalidateDocumentPages(
    existing.data.learner_id,
    existing.data.personnel_role
  );
}
