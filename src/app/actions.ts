"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  DOCUMENTS_BUCKET,
  documentStoragePath,
  validateDocument,
} from "@/lib/documents";
import { ROLE_CONFIG, roleConfigForAssessorRole } from "@/lib/roles";
import { type SectionKey } from "@/lib/permissions";
import {
  ASSIGNMENT_STAGES,
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
    assessment_instrument_level: str(fd, "assessment_instrument_level"),
    result_status: str(fd, "result_status"),
    gpa: num(fd, "gpa"),
    cgpa: num(fd, "cgpa"),
    apel_examination_board_date: str(fd, "apel_examination_board_date"),
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

function fileField(fd: FormData, key: string): File | null {
  const v = fd.get(key);
  if (!(v instanceof File) || !v.name || v.size === 0) return null;
  return v;
}

// Mirrors the learner form's Assessor Details into apel_assignments so the
// role pages can track stage, claims and appointment letters per assignment.
// Best-effort: learner saves must keep working if migration 0002 has not been
// run yet, so errors are swallowed here.
async function syncAssignments(
  supabase: Supabase,
  learnerId: number,
  payload: ReturnType<typeof learnerPayload>
) {
  const fields = payload as Record<string, string | number | null>;
  const stage = (ASSIGNMENT_STAGES as readonly string[]).includes(
    payload.assessment_stage ?? ""
  )
    ? payload.assessment_stage
    : null;

  for (const role of PERSONNEL_ROLES) {
    const config = ROLE_CONFIG[role];
    const name = fields[config.learnerNameColumn] as string | null;
    if (!name) continue;
    const appointmentDate = fields[config.learnerDateColumn] as string | null;

    const existing = await supabase
      .from("apel_assignments")
      .select("id, stage")
      .eq("learner_id", learnerId)
      .eq("role", role);
    if (existing.error) return; // table missing — migration 0002 not run yet

    const match = (existing.data ?? []).find(
      (a) => (a.stage ?? null) === stage
    );
    if (match) {
      await supabase
        .from("apel_assignments")
        .update({ personnel_name: name, appointment_date: appointmentDate })
        .eq("id", match.id);
    } else {
      await supabase.from("apel_assignments").insert({
        learner_id: learnerId,
        personnel_name: name,
        role,
        stage,
        appointment_date: appointmentDate,
      });
    }
    revalidatePath(config.route);
  }
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
  if (error) throw new Error(error.message);

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

export async function updateLearner(id: number, formData: FormData) {
  await requirePermission("learners");
  const payload = learnerPayload(formData);
  assertRequired(payload);

  const supabase = await createClient();
  const { error } = await supabase.from("apel").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  await syncAssignments(supabase, id, payload);

  revalidatePath("/");
  revalidatePath(`/learners/${id}`);
  revalidatePath("/advisors");
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

// --- Advisors ----------------------------------------------------------------

export async function addAdvisor(formData: FormData) {
  await requirePermission("advisors");
  const name = str(formData, "advisor_name");
  if (!name) return;

  const supabase = await createClient();
  const { error } = await supabase.from("apel_advisors").insert({
    advisor_name: name,
    advisor_payment_mode: str(formData, "advisor_payment_mode"),
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
      advisor_payment_mode: str(formData, "advisor_payment_mode"),
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
  const { error } = await supabase.from("apel_assignments").insert({
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
