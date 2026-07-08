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

export type LearnerStatus = (typeof LEARNER_STATUSES)[number];
export type Sponsor = (typeof SPONSORS)[number];
export type AssessmentStage = (typeof ASSESSMENT_STAGES)[number];
export type SelfAssessmentStatus = (typeof SELF_ASSESSMENT_STATUSES)[number];
export type InstrumentLevel = (typeof INSTRUMENT_LEVELS)[number];
export type ResultStatus = (typeof RESULT_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type AssessorRole = (typeof ASSESSOR_ROLES)[number];
export type AdvisorPaymentMode = (typeof ADVISOR_PAYMENT_MODES)[number];

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

// Mirrors public.apel_notes (see supabase/migrations)
export type LearnerNote = {
  id: number;
  learner_id: number;
  body: string;
  follow_up_date: string | null;
  author: string | null;
  created_at: string;
};
