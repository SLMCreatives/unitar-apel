import Link from "next/link";
import { deleteAssignment, updateAssignment } from "@/app/actions";
import {
  AppointmentLetterStatusBadge,
  ClaimStatusBadge,
  StageBadge,
  StatusBadge,
} from "@/components/badges";
import { ConfirmButton } from "@/components/confirm-button";
import { DocumentList, DocumentUpload } from "@/components/document-upload";
import { DateInput, SelectInput, TextInput } from "@/components/form-fields";
import type { RoleConfig } from "@/lib/roles";
import {
  ADVISOR_PAYMENT_MODES,
  APPOINTMENT_LETTER_STATUSES,
  ASSIGNMENT_STAGES,
  CLAIM_STATUSES,
  type ApelDocument,
  type AssignmentWithLearner,
} from "@/lib/types";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <div className="mt-0.5 text-sm text-gray-700">{children}</div>
    </div>
  );
}

// One learner–personnel assignment, with status/stage/claim/letter tracking
// and its attached documents. Role-specific fields (claims) are switched on
// and off via `config` rather than per-role card variants.
export function AssignmentCard({
  assignment,
  config,
  documents,
  showLearner = true,
}: {
  assignment: AssignmentWithLearner;
  config: RoleConfig;
  documents: ApelDocument[];
  showLearner?: boolean;
}) {
  const learner = assignment.learner;

  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        {showLearner ? (
          <Link
            href={`/learners/${assignment.learner_id}`}
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            {learner?.name ?? `Learner #${assignment.learner_id}`}
          </Link>
        ) : (
          <p className="text-sm font-semibold text-gray-900">
            {assignment.personnel_name}{" "}
            <span className="font-normal text-gray-400">({config.label})</span>
          </p>
        )}
        <form action={deleteAssignment.bind(null, assignment.id)}>
          <ConfirmButton
            message={`Remove this ${config.label.toLowerCase()} assignment? Its documents are deleted too.`}
            className="text-xs text-gray-400 hover:text-red-600"
          >
            Remove
          </ConfirmButton>
        </form>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Status">
          <StatusBadge value={learner?.learner_status ?? null} />
        </Field>
        <Field label="Stage">
          <StageBadge value={assignment.stage} />
        </Field>
        {config.claimEnabled && (
          <Field label="Claim status">
            <ClaimStatusBadge value={assignment.claim_status} />
          </Field>
        )}
        {config.claimEnabled && (
          <Field label="Payment mode">{assignment.payment_mode ?? "—"}</Field>
        )}
        <Field label="Appointment date">
          {formatDate(assignment.appointment_date)}
        </Field>
        <Field label="Appointment letter">
          <AppointmentLetterStatusBadge
            value={assignment.appointment_letter_status}
          />
        </Field>
      </div>

      {assignment.remarks && (
        <p className="mt-2 text-xs text-gray-500">
          Remarks: {assignment.remarks}
        </p>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-blue-600 hover:underline">
          Edit assignment
        </summary>
        <form
          action={updateAssignment.bind(null, assignment.id)}
          className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <SelectInput
            label="Stage"
            name="stage"
            options={ASSIGNMENT_STAGES}
            defaultValue={assignment.stage}
          />
          <DateInput
            label="Appointment Date"
            name="appointment_date"
            defaultValue={assignment.appointment_date}
          />
          <SelectInput
            label="Appointment Letter Status"
            name="appointment_letter_status"
            options={APPOINTMENT_LETTER_STATUSES}
            defaultValue={assignment.appointment_letter_status ?? "PENDING"}
            emptyLabel="PENDING (default)"
          />
          {config.claimEnabled && (
            <SelectInput
              label="Payment Mode"
              name="payment_mode"
              options={ADVISOR_PAYMENT_MODES}
              defaultValue={assignment.payment_mode}
            />
          )}
          {config.claimEnabled && (
            <SelectInput
              label="Claim Status"
              name="claim_status"
              options={CLAIM_STATUSES}
              defaultValue={assignment.claim_status}
            />
          )}
          <TextInput
            label="Remarks"
            name="remarks"
            defaultValue={assignment.remarks}
          />
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Save
            </button>
          </div>
        </form>
      </details>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-medium text-blue-600 hover:underline">
          Documents ({documents.length})
        </summary>
        <div className="mt-3 space-y-3">
          <DocumentList documents={documents} />
          <DocumentUpload
            learnerId={assignment.learner_id}
            assignmentId={assignment.id}
            personnelRole={config.role}
          />
        </div>
      </details>
    </div>
  );
}
