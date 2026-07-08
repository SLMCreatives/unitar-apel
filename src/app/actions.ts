"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export async function createLearner(formData: FormData) {
  const payload = learnerPayload(formData);
  if (!payload.name) throw new Error("Learner name is required.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("apel")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/");
  redirect(`/learners/${data.id}`);
}

export async function updateLearner(id: number, formData: FormData) {
  const payload = learnerPayload(formData);
  if (!payload.name) throw new Error("Learner name is required.");

  const supabase = await createClient();
  const { error } = await supabase.from("apel").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath(`/learners/${id}`);
  revalidatePath("/advisors");
}

export async function deleteLearner(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("apel").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  redirect("/");
}

// --- Notes & follow-ups -----------------------------------------------------

export async function addNote(learnerId: number, formData: FormData) {
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
  const supabase = await createClient();
  const { error } = await supabase
    .from("apel_advisors")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/advisors");
}

// --- Assessors & moderators ---------------------------------------------------

export async function addAssessor(formData: FormData) {
  const name = str(formData, "name");
  const role = str(formData, "role");
  if (!name || !role) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("apel_assessors")
    .insert({ name, role });
  if (error) throw new Error(error.message);

  revalidatePath("/assessors");
}

export async function deleteAssessor(id: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("apel_assessors")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/assessors");
}
