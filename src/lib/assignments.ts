import { revalidatePath } from "next/cache";
import { ROLE_CONFIG } from "@/lib/roles";
import type { createClient } from "@/lib/supabase/server";
import { ASSIGNMENT_STAGES, PERSONNEL_ROLES } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Just the learner fields this needs: the four personnel-name columns, their
// appointment dates, and the stage. Accepts any learner-shaped record so both
// the form save and the bulk import can call it.
export type AssignmentSource = Record<string, string | number | null | undefined>;

// The learner columns syncAssignments reads, as a select list — so callers can
// load a learner's state before a save and pass it in as `previous`.
export const ASSIGNMENT_SOURCE_COLUMNS = [
  "assessment_stage",
  ...PERSONNEL_ROLES.flatMap((role) => [
    ROLE_CONFIG[role].learnerNameColumn,
    ROLE_CONFIG[role].learnerDateColumn,
  ]),
].join(", ");

function assignmentStage(value: unknown): string | null {
  return (ASSIGNMENT_STAGES as readonly string[]).includes((value as string) ?? "")
    ? (value as string)
    : null;
}

function text(value: unknown): string | null {
  return value === null || value === undefined || value === "" ? null : String(value);
}

// Mirrors a learner's Assessor Details into apel_assignments so the role pages
// can track stage, claims and appointment letters per assignment.
//
// `previous` is the learner as it was before this save (null for a new
// learner). With it, a role is only synced when its name, its date or the
// stage actually changed — so routine saves of a learner no longer undo edits
// made directly on an assignment. An existing assignment's date is only
// replaced when the Assessor Details date was changed, or when the
// assignment has no date yet; it is never blanked as a side effect of a stage
// change.
//
// Best-effort: learner saves must keep working if migration 0002 has not been
// run yet, so errors are swallowed here.
export async function syncAssignments(
  supabase: Supabase,
  learnerId: number,
  payload: AssignmentSource,
  previous: AssignmentSource | null = null
) {
  const stage = assignmentStage(payload.assessment_stage);
  const stageChanged =
    !previous || assignmentStage(previous.assessment_stage) !== stage;

  for (const role of PERSONNEL_ROLES) {
    const config = ROLE_CONFIG[role];
    const name = text(payload[config.learnerNameColumn]);
    if (!name) continue;
    const appointmentDate = text(payload[config.learnerDateColumn]);

    const nameChanged = !previous || text(previous[config.learnerNameColumn]) !== name;
    const dateChanged =
      !previous || text(previous[config.learnerDateColumn]) !== appointmentDate;
    if (!nameChanged && !dateChanged && !stageChanged) continue;

    const existing = await supabase
      .from("apel_assignments")
      .select("id, stage, appointment_date")
      .eq("learner_id", learnerId)
      .eq("role", role);
    if (existing.error) return; // table missing — migration 0002 not run yet

    const match = (existing.data ?? []).find((a) => (a.stage ?? null) === stage);
    if (match) {
      const update: { personnel_name: string; appointment_date?: string | null } = {
        personnel_name: name,
      };
      if (dateChanged || !match.appointment_date) {
        update.appointment_date = appointmentDate;
      }
      await supabase.from("apel_assignments").update(update).eq("id", match.id);
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
