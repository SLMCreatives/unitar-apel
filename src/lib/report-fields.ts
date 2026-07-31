import type { Learner } from "@/lib/types";

// Learner fields available to the report builder, in display and export
// order. Add new fields here — the Reports page and /api/export pick them up
// automatically without further changes.
export type ReportField = {
  key: keyof Learner & string;
  label: string;
  recommended?: boolean;
};

export const REPORT_FIELDS: ReportField[] = [
  { key: "name", label: "Name", recommended: true },
  { key: "matric_no", label: "Matric Number", recommended: true },
  { key: "ic_passport_no", label: "IC / Passport No" },
  { key: "nationality", label: "Nationality" },
  { key: "contact_no_1", label: "Contact No 1" },
  { key: "contact_no_2", label: "Contact No 2" },
  { key: "email_1", label: "Email Address 1" },
  { key: "email_2", label: "Email Address 2" },
  { key: "company_details", label: "Company Details" },
  { key: "position_title", label: "Position / Title" },
  { key: "external_links", label: "External Folder Links" },
  { key: "programme_details", label: "Programme Details", recommended: true },
  { key: "assigned_counsellor", label: "Assigned Counsellor" },
  { key: "mqa_approval_date", label: "MQA Approval Date" },
  { key: "learner_status", label: "Learner Status", recommended: true },
  { key: "sponsor", label: "Sponsor", recommended: true },
  { key: "assessment_stage", label: "Assessment Stage", recommended: true },
  { key: "current_progress_remark", label: "Current Progress Remark" },
  { key: "candidate_background", label: "Candidate Background" },
  { key: "years_of_experience", label: "Years of Experience" },
  { key: "registration_payment_status", label: "Registration Payment Status" },
  { key: "date_of_payment", label: "Date of Payment" },
  { key: "advisor", label: "Advisor", recommended: true },
  { key: "advisor_appointment_date", label: "Advisor Appointment Date" },
  { key: "internal_assessor", label: "Internal Assessor", recommended: true },
  {
    key: "internal_assessor_appointment_date",
    label: "Internal Assessor Appointment Date",
  },
  { key: "external_assessor", label: "External Assessor", recommended: true },
  {
    key: "external_assessor_appointment_date",
    label: "External Assessor Appointment Date",
  },
  { key: "moderator", label: "Moderator", recommended: true },
  { key: "moderator_appointment_date", label: "Moderator Appointment Date" },
  { key: "self_assessment_status", label: "Self-Assessment Status" },
  {
    key: "self_assessment_date_completed",
    label: "Self-Assessment Date Completed",
  },
  {
    key: "offer_letter_issued_date",
    label: "Offer Letter Issued Date",
    recommended: true,
  },
  { key: "assessment_instrument_level", label: "Assessment Instrument Level" },
  { key: "result_status", label: "Status (Pass / Fail)", recommended: true },
  { key: "gpa", label: "GPA" },
  { key: "cgpa", label: "CGPA" },
  { key: "apel_examination_board_date", label: "AEB Date" },
  { key: "senate_date", label: "Senate Date" },
  { key: "progress_remark", label: "Progress Remark" },
  { key: "portfolio_date", label: "Portfolio Date" },
  { key: "fvv_date", label: "FVV Date" },
  { key: "claim_submission_1_amount", label: "Claim Submission 1 (RM)" },
  { key: "challenge_test_date", label: "Challenge Test Date" },
  { key: "capstone_date", label: "Capstone Date" },
  { key: "claim_submission_2_amount", label: "Claim Submission 2 (RM)" },
  { key: "created_at", label: "Record Created At" },
];
