import Link from "next/link";
import { createLearner } from "@/app/actions";
import { LearnerForm } from "@/components/learner-form";
import { QueryError, SetupNotice, envReady } from "@/components/setup-notice";
import { createClient } from "@/lib/supabase/server";
import type { Advisor, Assessor } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewLearnerPage() {
  if (!envReady()) return <SetupNotice />;

  const supabase = await createClient();
  const [advisorsRes, assessorsRes] = await Promise.all([
    supabase.from("apel_advisors").select("*").order("advisor_name"),
    supabase.from("apel_assessors").select("*").order("name"),
  ]);

  if (advisorsRes.error)
    return <QueryError message={advisorsRes.error.message} />;
  // apel_assessors may not exist until the migration is run — the form still
  // works, the assessor dropdowns are just empty.
  const assessors = (assessorsRes.data ?? []) as Assessor[];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to learners
        </Link>
        <h1 className="mt-1 text-xl font-bold text-gray-900">Add learner</h1>
      </div>
      <LearnerForm
        advisors={(advisorsRes.data ?? []) as Advisor[]}
        assessors={assessors}
        action={createLearner}
        submitLabel="Create learner"
      />
    </div>
  );
}
