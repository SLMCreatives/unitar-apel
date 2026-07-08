import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteLearner, updateLearner } from "@/app/actions";
import { StageBadge, StatusBadge } from "@/components/badges";
import { ConfirmButton } from "@/components/confirm-button";
import { ContactButtons } from "@/components/contact-buttons";
import { LearnerForm } from "@/components/learner-form";
import { NotesPanel } from "@/components/notes-panel";
import { OfferProgress } from "@/components/offer-progress";
import { QueryError, SetupNotice, envReady } from "@/components/setup-notice";
import { createClient } from "@/lib/supabase/server";
import type { Advisor, Assessor, Learner, LearnerNote } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LearnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!envReady()) return <SetupNotice />;

  const { id } = await params;
  const learnerId = Number(id);
  if (!Number.isInteger(learnerId)) notFound();

  const supabase = await createClient();
  const [learnerRes, advisorsRes, assessorsRes, notesRes] = await Promise.all([
    supabase.from("apel").select("*").eq("id", learnerId).maybeSingle(),
    supabase.from("apel_advisors").select("*").order("advisor_name"),
    supabase.from("apel_assessors").select("*").order("name"),
    supabase
      .from("apel_notes")
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
        <form action={deleteLearner.bind(null, learner.id)}>
          <ConfirmButton
            message={`Delete ${learner.name}? This also deletes their notes and cannot be undone.`}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete learner
          </ConfirmButton>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <LearnerForm
            learner={learner}
            advisors={(advisorsRes.data ?? []) as Advisor[]}
            assessors={(assessorsRes.data ?? []) as Assessor[]}
            action={updateLearner.bind(null, learner.id)}
            submitLabel="Save changes"
          />
        </div>
        <div className="xl:col-span-1">
          <div className="xl:sticky xl:top-6">
            <NotesPanel
              learnerId={learner.id}
              notes={notes}
              tableMissing={notesTableMissing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
