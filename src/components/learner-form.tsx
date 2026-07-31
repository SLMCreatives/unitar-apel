import { COUNTRIES } from "@/lib/countries";
import {
  ASSESSMENT_STAGES,
  INSTRUMENT_LEVELS,
  LEARNER_STATUSES,
  PAYMENT_STATUSES,
  RESULT_STATUSES,
  SELF_ASSESSMENT_STATUSES,
  SPONSORS,
  type Advisor,
  type Assessor,
  type Learner,
} from "@/lib/types";
import {
  DateInput,
  FileInput,
  FormSection,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/form-fields";
import { ExternalLinkList } from "@/components/external-link-list";
import { OfferProgress } from "@/components/offer-progress";
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_CATEGORIES,
  MAX_DOCUMENT_SIZE_MB,
} from "@/lib/documents";

export function LearnerForm({
  learner,
  advisors,
  assessors,
  action,
  submitLabel,
  showDocumentUpload,
}: {
  learner?: Learner;
  advisors: Advisor[];
  assessors: Assessor[];
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  // Shown on the Add Learner form — the file is stored and attached only
  // after the learner record is created successfully.
  showDocumentUpload?: boolean;
}) {
  // The apel table stores people as names, so options use names as values.
  const namesByRole = (role: string) =>
    assessors.filter((a) => a.role === role).map((a) => a.name);

  const advisorOptions = advisors.map((a) => a.advisor_name);
  const internalOptions = namesByRole("INTERNAL");
  const externalOptions = namesByRole("EXTERNAL");
  const moderatorOptions = namesByRole("MODERATOR");

  return (
    <form action={action} className="space-y-6">
      <FormSection title="Learner Details Information">
        <TextInput
          label="Name (as per IC / Passport)"
          name="name"
          defaultValue={learner?.name}
          required
        />
        <TextInput
          label="Assigned Counsellor"
          name="assigned_counsellor"
          defaultValue={learner?.assigned_counsellor}
        />
        <TextInput
          label="Programme Details"
          name="programme_details"
          defaultValue={learner?.programme_details}
        />
        <DateInput
          label="MQA Approval Date"
          name="mqa_approval_date"
          defaultValue={learner?.mqa_approval_date}
        />
        <SelectInput
          label="Learner Status"
          name="learner_status"
          options={LEARNER_STATUSES}
          defaultValue={learner?.learner_status}
        />
        <SelectInput
          label="Sponsor"
          name="sponsor"
          options={SPONSORS}
          defaultValue={learner?.sponsor}
        />
        <SelectInput
          label="Assessment Stage"
          name="assessment_stage"
          options={ASSESSMENT_STAGES}
          defaultValue={learner?.assessment_stage}
        />
        <TextInput
          label="Matric Number"
          name="matric_no"
          defaultValue={learner?.matric_no}
        />
        {/* Required because apel.ic_passport_no is NOT NULL — see the guard in
            createLearner/updateLearner. */}
        <TextInput
          label="IC / Passport No"
          name="ic_passport_no"
          defaultValue={learner?.ic_passport_no}
          required
        />
        <SelectInput
          label="Nationality"
          name="nationality"
          options={COUNTRIES}
          defaultValue={learner?.nationality}
        />
        <TextInput
          label="Contact No 1"
          name="contact_no_1"
          defaultValue={learner?.contact_no_1}
        />
        <TextInput
          label="Contact No 2"
          name="contact_no_2"
          defaultValue={learner?.contact_no_2}
        />
        {/* Required because apel.email_1 is NOT NULL (email_2 is optional). */}
        <TextInput
          label="Email Address 1"
          name="email_1"
          type="email"
          defaultValue={learner?.email_1}
          required
        />
        <TextInput
          label="Email Address 2"
          name="email_2"
          type="email"
          defaultValue={learner?.email_2}
        />
        <TextInput
          label="Company Details"
          name="company_details"
          defaultValue={learner?.company_details}
        />
        <TextInput
          label="Position / Title"
          name="position_title"
          defaultValue={learner?.position_title}
        />
        <TextArea
          label="Current Progress Remark"
          name="current_progress_remark"
          defaultValue={learner?.current_progress_remark}
        />
      </FormSection>

      <FormSection title="Screening Outcome">
        <TextInput
          label="Years of Experience"
          name="years_of_experience"
          type="number"
          defaultValue={learner?.years_of_experience}
        />
        <TextArea
          label="Candidate Background"
          name="candidate_background"
          defaultValue={learner?.candidate_background}
        />
      </FormSection>

      <FormSection title="Payment Records">
        <SelectInput
          label="Registration Payment Status"
          name="registration_payment_status"
          options={PAYMENT_STATUSES}
          defaultValue={learner?.registration_payment_status}
        />
        <DateInput
          label="Date of Payment"
          name="date_of_payment"
          defaultValue={learner?.date_of_payment}
        />
      </FormSection>

      <FormSection title="Assessor Details">
        <SelectInput
          label="Advisor"
          name="advisor"
          options={advisorOptions}
          defaultValue={learner?.advisor}
          emptyLabel="— Not assigned —"
        />
        <DateInput
          label="Advisor Appointment Date"
          name="advisor_appointment_date"
          defaultValue={learner?.advisor_appointment_date}
        />
        <div className="hidden lg:block" />
        <SelectInput
          label="Internal Assessor"
          name="internal_assessor"
          options={internalOptions}
          defaultValue={learner?.internal_assessor}
          emptyLabel="— Not assigned —"
        />
        <DateInput
          label="Internal Assessor Appointment Date"
          name="internal_assessor_appointment_date"
          defaultValue={learner?.internal_assessor_appointment_date}
        />
        <div className="hidden lg:block" />
        <SelectInput
          label="External Assessor"
          name="external_assessor"
          options={externalOptions}
          defaultValue={learner?.external_assessor}
          emptyLabel="— Not assigned —"
        />
        <DateInput
          label="External Assessor Appointment Date"
          name="external_assessor_appointment_date"
          defaultValue={learner?.external_assessor_appointment_date}
        />
        <div className="hidden lg:block" />
        <SelectInput
          label="Moderator"
          name="moderator"
          options={moderatorOptions}
          defaultValue={learner?.moderator}
          emptyLabel="— Not assigned —"
        />
        <DateInput
          label="Moderator Appointment Date"
          name="moderator_appointment_date"
          defaultValue={learner?.moderator_appointment_date}
        />
      </FormSection>

      <FormSection title="Learner Progress Information">
        <SelectInput
          label="Self-Assessment Status"
          name="self_assessment_status"
          options={SELF_ASSESSMENT_STATUSES}
          defaultValue={learner?.self_assessment_status}
        />
        <DateInput
          label="Self-Assessment Date Completed"
          name="self_assessment_date_completed"
          defaultValue={learner?.self_assessment_date_completed}
        />
        <div>
          <DateInput
            label="Offer Letter Issued Date"
            name="offer_letter_issued_date"
            defaultValue={learner?.offer_letter_issued_date}
          />
          {learner?.offer_letter_issued_date && (
            <div className="mt-2">
              <OfferProgress issuedDate={learner.offer_letter_issued_date} />
            </div>
          )}
        </div>
        <SelectInput
          label="Assessment Instrument Level"
          name="assessment_instrument_level"
          options={INSTRUMENT_LEVELS}
          defaultValue={learner?.assessment_instrument_level}
        />
        <SelectInput
          label="Status (Pass / Fail)"
          name="result_status"
          options={RESULT_STATUSES}
          defaultValue={learner?.result_status}
        />
        <div className="hidden lg:block" />
        <TextInput
          label="GPA"
          name="gpa"
          type="number"
          step="0.01"
          defaultValue={learner?.gpa}
        />
        <TextInput
          label="CGPA"
          name="cgpa"
          type="number"
          step="0.01"
          defaultValue={learner?.cgpa}
        />
        <div className="hidden lg:block" />
        <DateInput
          label="APEL Examination Board (AEB) Date"
          name="apel_examination_board_date"
          defaultValue={learner?.apel_examination_board_date}
        />
        <DateInput
          label="Senate Date"
          name="senate_date"
          defaultValue={learner?.senate_date}
        />
        <TextArea
          label="Remark"
          name="progress_remark"
          defaultValue={learner?.progress_remark}
        />
      </FormSection>

      <FormSection title="Milestones & Claims (dates based on AEB)">
        <DateInput
          label="Portfolio Date"
          name="portfolio_date"
          defaultValue={learner?.portfolio_date}
        />
        <DateInput
          label="FVV Date"
          name="fvv_date"
          defaultValue={learner?.fvv_date}
        />
        <TextInput
          label="Claim Submission 1 to APEL Centre (RM)"
          name="claim_submission_1_amount"
          type="number"
          step="0.01"
          defaultValue={learner?.claim_submission_1_amount}
        />
        <DateInput
          label="Challenge Test Date"
          name="challenge_test_date"
          defaultValue={learner?.challenge_test_date}
        />
        <DateInput
          label="Capstone Date"
          name="capstone_date"
          defaultValue={learner?.capstone_date}
        />
        <TextInput
          label="Claim Submission 2 to APEL Centre (RM)"
          name="claim_submission_2_amount"
          type="number"
          step="0.01"
          defaultValue={learner?.claim_submission_2_amount}
        />
      </FormSection>

      <FormSection title="External Folder Links">
        <TextArea
          label="Folder Links"
          name="external_links"
          rows={4}
          defaultValue={learner?.external_links}
          placeholder={
            "Portfolio evidence | https://drive.google.com/drive/folders/…\nhttps://unitar.sharepoint.com/sites/apel/…"
          }
          hint="One link per line. Add an optional name before a | to label it. Saved links become clickable below."
        >
          <ExternalLinkList value={learner?.external_links ?? null} />
        </TextArea>
      </FormSection>

      {showDocumentUpload && (
        <FormSection title="Documents (optional)">
          <FileInput
            label="Document"
            name="document"
            accept={DOCUMENT_ACCEPT}
            hint={`Attached after the learner is created. Max ${MAX_DOCUMENT_SIZE_MB} MB.`}
          />
          <SelectInput
            label="Document Category"
            name="document_category"
            options={DOCUMENT_CATEGORIES}
            emptyLabel="— Optional —"
          />
          <TextInput
            label="Uploaded By"
            name="document_uploaded_by"
            placeholder="Optional"
          />
        </FormSection>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
