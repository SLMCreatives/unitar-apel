import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteLearner, saveLearner } from "@/app/actions";
import { AssignmentCard } from "@/components/assignment-card";
import { StageBadge, StatusBadge } from "@/components/badges";
import { ConfirmButton } from "@/components/confirm-button";
import { ContactButtons } from "@/components/contact-buttons";
import { DocumentList, DocumentUpload } from "@/components/document-upload";
import {
  LearnerEditForm,
  LearnerEditor,
  LearnerSaveBar,
} from "@/components/learner-editor";
import { LearnerFormFields } from "@/components/learner-form";
import { NotesPanel } from "@/components/notes-panel";
import { OfferProgress } from "@/components/offer-progress";
import { QueryError, SetupNotice, envReady } from "@/components/setup-notice";
import { requirePermission } from "@/lib/auth";
import { ROLE_CONFIG } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import {
  PERSONNEL_ROLES,
  type Advisor,
  type ApelDocument,
  type Assessor,
  type Assignment,
  type Learner,
  type LearnerNote,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LearnerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ doc_error?: string }>;
}) {
  if (!envReady()) return <SetupNotice />;
  await requirePermission("learners");

  const { id } = await params;
  const { doc_error } = await searchParams;
  const learnerId = Number(id);
  if (!Number.isInteger(learnerId)) notFound();

  const supabase = await createClient();
  const [learnerRes, advisorsRes, assessorsRes, notesRes, assignmentsRes, documentsRes] =
    await Promise.all([
      supabase.from("apel").select("*").eq("id", learnerId).maybeSingle(),
      supabase.from("apel_advisors").select("*").order("advisor_name"),
      supabase.from("apel_assessors").select("*").order("name"),
      supabase
        .from("apel_notes")
        .select("*")
        .eq("learner_id", learnerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("apel_assignments")
        .select("*")
        .eq("learner_id", learnerId),
      supabase
        .from("apel_documents")
        .select("*")
        .eq("learner_id", learnerId)
        .order("created_at", { ascending: false }),
    ]);

  if (learnerRes.error)
    return <QueryError message={learnerRes.error.message} />;
  if (!learnerRes.data) notFound();

  const learner = learnerRes.data as Learner;
  const notes = (notesRes.data ?? []) as LearnerNote[];
  const notesTableMissing = Boolean(notesRes.error);

  // These tables arrive with migration 0002 — the page still works without.
  const assignmentsTableMissing = Boolean(assignmentsRes.error);
  const assignments = ((assignmentsRes.data ?? []) as Assignment[])
    .map((a) => ({
      ...a,
      learner: {
        id: learner.id,
        name: learner.name,
        learner_status: learner.learner_status,
        sponsor: learner.sponsor,
      },
    }))
    .sort(
      (a, b) =>
        PERSONNEL_ROLES.indexOf(a.role) - PERSONNEL_ROLES.indexOf(b.role)
    );
  const documents = (documentsRes.data ?? []) as ApelDocument[];
  const learnerDocuments = documents.filter((d) => d.assignment_id === null);
  const docsByAssignment = new Map<number, ApelDocument[]>();
  for (const doc of documents) {
    if (doc.assignment_id === null) continue;
    const list = docsByAssignment.get(doc.assignment_id) ?? [];
    list.push(doc);
    docsByAssignment.set(doc.assignment_id, list);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Back to learners
          </Link>
          <h1 className="mt-1 text-xl font-bold text-gray-900">
            {learner.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge value={learner.learner_status} />
            <StageBadge value={learner.assessment_stage} />
            {learner.offer_letter_issued_date && (
              <div className="w-44">
                <OfferProgress issuedDate={learner.offer_letter_issued_date} />
              </div>
            )}
          </div>
          <div className="mt-3">
            <ContactButtons
              phone={learner.contact_no_1 ?? learner.contact_no_2}
              email={learner.email_1 ?? learner.email_2}
            />
          </div>
        </div>
      </div>

      {doc_error && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          The learner was created, but the document upload failed. Try
          uploading it again in the Documents section below.
        </div>
      )}

      {/* Spans both columns so Save and Delete sit above Notes & Follow-ups
          as well as the form. */}
      <LearnerEditor action={saveLearner.bind(null, learner.id)}>
        <LearnerSaveBar
          deleteSlot={
            <form action={deleteLearner.bind(null, learner.id)}>
              <ConfirmButton
                message={`Delete ${learner.name}? This also deletes their notes and cannot be undone.`}
                className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Delete learner
              </ConfirmButton>
            </form>
          }
        />

        <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <LearnerEditForm>
              <LearnerFormFields
                learner={learner}
                advisors={(advisorsRes.data ?? []) as Advisor[]}
                assessors={(assessorsRes.data ?? []) as Assessor[]}
              />
            </LearnerEditForm>

            <section
              id="assignments"
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">
                Personnel Assignments
              </h2>
              {assignmentsTableMissing ? (
                <p className="text-sm text-amber-800">
                  The assignments table doesn&apos;t exist yet. Run{" "}
                  <span className="font-mono">
                    supabase/migrations/0002_assignments_and_documents.sql
                  </span>{" "}
                  in the Supabase SQL Editor to enable per-stage claim and
                  appointment-letter tracking.
                </p>
              ) : assignments.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No assignments yet. Assign personnel in the Assessor Details
                  section above and save — the records appear here and on the
                  role pages.
                </p>
              ) : (
                <div className="space-y-3">
                  {assignments.map((a) => (
                    <AssignmentCard
                      key={a.id}
                      assignment={a}
                      config={ROLE_CONFIG[a.role]}
                      documents={docsByAssignment.get(a.id) ?? []}
                      showLearner={false}
                    />
                  ))}
                </div>
              )}
            </section>

            <section
              id="documents"
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">
                Documents
              </h2>
              {documentsRes.error ? (
                <p className="text-sm text-amber-800">
                  The documents table doesn&apos;t exist yet. Run{" "}
                  <span className="font-mono">
                    supabase/migrations/0002_assignments_and_documents.sql
                  </span>{" "}
                  in the Supabase SQL Editor to enable document uploads.
                </p>
              ) : (
                <div className="space-y-4">
                  <DocumentList documents={learnerDocuments} />
                  <DocumentUpload learnerId={learner.id} />
                </div>
              )}
            </section>
          </div>
          <div className="xl:col-span-1">
            {/* top-24 clears the sticky action bar above. */}
            <div className="xl:sticky xl:top-24">
              <NotesPanel
                learnerId={learner.id}
                notes={notes}
                tableMissing={notesTableMissing}
              />
            </div>
          </div>
        </div>
      </LearnerEditor>
    </div>
  );
}
