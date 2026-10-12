// The 12-month completion window, which starts at the offer letter issue date.
// One definition shared by the meter (src/components/offer-progress.tsx) and
// the Dashboard, so the two can't disagree about who is tracked.

export const AVG_DAYS_PER_MONTH = 30.44;
export const WINDOW_LIMIT_MONTHS = 12;
// From here the meter turns amber and the Dashboard says "Nearing limit".
export const WINDOW_WARNING_MONTHS = 9;

type LearnerLike = {
  assessment_stage?: string | null;
  learner_status?: string | null;
};

// In progress = still being tracked: not finished (COMPLETED / GRADUATED) and
// not withdrawn. Drives the 12-month window and lead ageing.
export function isInProgress(learner: LearnerLike): boolean {
  return (
    learner.assessment_stage !== "COMPLETED" &&
    learner.assessment_stage !== "GRADUATED" &&
    learner.learner_status !== "WITHDRAW"
  );
}

export function monthsSince(date: string, now = Date.now()): number {
  return (
    (now - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * AVG_DAYS_PER_MONTH)
  );
}
