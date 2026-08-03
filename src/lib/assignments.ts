import { revalidatePath } from "next/cache";
import { ROLE_CONFIG } from "@/lib/roles";
import type { createClient } from "@/lib/supabase/server";
import { ASSIGNMENT_STAGES, PERSONNEL_ROLES } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Just the learner fields this needs: the four personnel-name columns, their
// appointment dates, and the stage. Accepts any learner-shaped record so both
// the form save and the bulk import can call it.
export type AssignmentSource = Record<string, string | number | null | undefined>;

// Mirrors a learner's Assessor Details into apel_assignments so the role pages
// can track stage, claims and appointment letters per assignment.
// Best-effort: learner saves must keep working if migration 0002 has not been
// run yet, so errors are swallowed here.
export async function syncAssignments(
  supabase: Supabase,
  learnerId: number,
  payload: AssignmentSource
) {
  const stage = (ASSIGNMENT_STAGES as readonly string[]).includes(
    (payload.assessment_stage as string) ?? ""
  )
    ? (payload.assessment_stage as string)
    : null;

  for (const role of PERSONNEL_ROLES) {
    const config = ROLE_CONFIG[role];
    const name = payload[config.learnerNameColumn] as string | null | undefined;
    if (!name) continue;
    const appointmentDate =
      (payload[config.learnerDateColumn] as string | null | undefined) ?? null;

    const existing = await supabase
      .from("apel_assignments")
      .select("id, stage")
      .eq("learner_id", learnerId)
      .eq("role", role);
    if (existing.error) return; // table missing — migration 0002 not run yet

    const match = (existing.data ?? []).find((a) => (a.stage ?? null) === stage);
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
