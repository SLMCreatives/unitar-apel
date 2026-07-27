// Enum values used by the form dropdowns. The database columns are plain
// text, so these lists are the single source of truth for allowed values.

export const LEARNER_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "WITHDRAW",
  "PENDING",
] as const;

export const SPONSORS = ["OPEN", "CAMFIL", "INTAN"] as const;

export const ASSESSMENT_STAGES = [
  "SELF ASSESSMENT",
  "PORTFOLIO",
  "FVV",
  "CHALLENGE TEST",
  "CAPSTONE",
  "COMPLETED",
  "GRADUATED",
] as const;

export const SELF_ASSESSMENT_STATUSES = [
  "COMPLETED",
  "NOT COMPLETED",
  "ONGOING",
] as const;

export const INSTRUMENT_LEVELS = [
  "PORTFOLIO",
  "FVV",
  "CHALLENGE TEST",
  "CAPSTONE",
  "COMPLETED",
] as const;

export const RESULT_STATUSES = ["PASS", "FAIL"] as const;

export const PAYMENT_STATUSES = ["PAID", "UNPAID", "WAIVED"] as const;

export const ASSESSOR_ROLES = ["INTERNAL", "EXTERNAL", "MODERATOR"] as const;

export const ADVISOR_PAYMENT_MODES = ["TEACHING LOAD", "PAYMENT"] as const;

// Roles a person can hold on a learner assignment (apel_assignments.role).
export const PERSONNEL_ROLES = [
  "ADVISOR",
  "INTERNAL_ASSESSOR",
  "EXTERNAL_ASSESSOR",
  "MODERATOR",
] as const;

// Stages an assignment can apply to. A learner can have one assignment per
// role per stage, each with its own claim and appointment-letter tracking.
export const ASSIGNMENT_STAGES = [
  "SELF ASSESSMENT",
  "PORTFOLIO",
  "FVV",
  "CHALLENGE TEST",
  "CAPSTONE",
] as const;

// Claim/payment progress for an assignment. Edit this list to change the
// options everywhere — the database column is plain text.
export const CLAIM_STATUSES = [
  "NOT SUBMITTED",
  "SUBMITTED",
  "PROCESSING",
  "PAID",
  "REJECTED",
] as const;

export const APPOINTMENT_LETTER_STATUSES = ["PENDING", "ISSUED"] as const;

export type LearnerStatus = (typeof LEARNER_STATUSES)[number];
export type Sponsor = (typeof SPONSORS)[number];
export type AssessmentStage = (typeof ASSESSMENT_STAGES)[number];
export type SelfAssessmentStatus = (typeof SELF_ASSESSMENT_STATUSES)[number];
export type InstrumentLevel = (typeof INSTRUMENT_LEVELS)[number];
export type ResultStatus = (typeof RESULT_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type AssessorRole = (typeof ASSESSOR_ROLES)[number];
export type AdvisorPaymentMode = (typeof ADVISOR_PAYMENT_MODES)[number];
export type PersonnelRole = (typeof PERSONNEL_ROLES)[number];
export type AssignmentStage = (typeof ASSIGNMENT_STAGES)[number];
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export type AppointmentLetterStatus =
  (typeof APPOINTMENT_LETTER_STATUSES)[number];

// Mirrors public.apel_advisors
export type Advisor = {
  id: number;
  created_at: string;
  advisor_name: string;
  total_learners_assigned: number | null;
  learner_assign: string | null;
  advisor_assigned_date: string | null;
  learner_current_status: string | null;
  learner_fees_sponsor: string | null;
  advisor_remark: string | null;
  advisor_payment_mode: AdvisorPaymentMode | null;
};

// Mirrors public.apel_assessors (see supabase/migrations)
export type Assessor = {
  id: number;
  name: string;
  role: AssessorRole;
  created_at: string;
};

// Mirrors public.apel
export type Learner = {
  id: number;
  created_at: string;
  // Learner details information
  name: string;
  assigned_counsellor: string | null;
  programme_details: string | null;
  mqa_approval_date: string | null;
  learner_status: LearnerStatus | null;
  sponsor: Sponsor | null;
  current_progress_remark: string | null;
  assessment_stage: AssessmentStage | null;
  matric_no: string | null;
  ic_passport_no: string | null;
  nationality: string | null;
  contact_no_1: string | null;
  contact_no_2: string | null;
  email_1: string | null;
  email_2: string | null;
  company_details: string | null;
  position_title: string | null;
  // Screening outcome
  candidate_background: string | null;
  years_of_experience: number | null;
  // Payment records
  registration_payment_status: PaymentStatus | null;
  date_of_payment: string | null;
  // Assessor details (names selected from apel_advisors / apel_assessors)
  advisor: string | null;
  advisor_appointment_date: string | null;
  internal_assessor: string | null;
  internal_assessor_appointment_date: string | null;
  external_assessor: string | null;
  external_assessor_appointment_date: string | null;
  moderator: string | null;
  moderator_appointment_date: string | null;
  // Learner progress information
  self_assessment_status: SelfAssessmentStatus | null;
  self_assessment_date_completed: string | null;
  offer_letter_issued_date: string | null;
  assessment_instrument_level: InstrumentLevel | null;
  result_status: ResultStatus | null;
  gpa: number | null;
  cgpa: number | null;
  apel_examination_board_date: string | null;
  senate_date: string | null;
  progress_remark: string | null;
  // Milestones / claims
  portfolio_date: string | null;
  fvv_date: string | null;
  claim_submission_1_amount: number | null;
  challenge_test_date: string | null;
  capstone_date: string | null;
  claim_submission_2_amount: number | null;
};

// Mirrors public.apel_assignments (see supabase/migrations). One row per
// learner + role + stage; claim fields stay null for MODERATOR rows.
export type Assignment = {
  id: number;
  learner_id: number;
  personnel_name: string;
  role: PersonnelRole;
  stage: string | null;
  payment_mode: string | null;
  claim_status: string | null;
  appointment_date: string | null;
  appointment_letter_status: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
};

export type AssignmentLearner = Pick<
  Learner,
  "id" | "name" | "learner_status" | "sponsor"
>;

export type AssignmentWithLearner = Assignment & {
  learner: AssignmentLearner | null;
};

// Mirrors public.apel_documents (see supabase/migrations). Files live in the
// private 'apel-documents' storage bucket; this row holds the metadata.
export type ApelDocument = {
  id: number;
  learner_id: number;
  assignment_id: number | null;
  personnel_role: PersonnelRole | null;
  document_category: string | null;
  original_file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

// Mirrors public.apel_notes (see supabase/migrations)
export type LearnerNote = {
  id: number;
  learner_id: number;
  body: string;
  follow_up_date: string | null;
  author: string | null;
  created_at: string;
};
