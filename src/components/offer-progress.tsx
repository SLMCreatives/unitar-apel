import {
  WINDOW_LIMIT_MONTHS,
  WINDOW_WARNING_MONTHS,
  isInProgress,
  monthsSince,
} from "@/lib/offer-window";

/**
 * 12-month completion window that starts at the offer letter issue date.
 * Shows elapsed months as a thin meter; the numeric label always accompanies
 * the color so state is never conveyed by color alone. Pass the learner's
 * stage and status to stop the meter once they have completed, graduated or
 * withdrawn.
 */
export function OfferProgress({
  issuedDate,
  stage,
  status,
}: {
  issuedDate: string | null;
  stage?: string | null;
  status?: string | null;
}) {
  if (!issuedDate) return <span className="text-xs text-gray-400">—</span>;

  if (!isInProgress({ assessment_stage: stage, learner_status: status })) {
    return (
      <span
        className="text-xs text-gray-400"
        title="No longer tracked: completed, graduated or withdrawn"
      >
        Closed
      </span>
    );
  }

  const elapsedMonths = monthsSince(issuedDate);
  const pct = Math.max(
    0,
    Math.min(100, (elapsedMonths / WINDOW_LIMIT_MONTHS) * 100)
  );

  const overdue = elapsedMonths >= WINDOW_LIMIT_MONTHS;
  const warning = !overdue && elapsedMonths >= WINDOW_WARNING_MONTHS;
  const barColor = overdue
    ? "bg-red-500"
    : warning
      ? "bg-amber-500"
      : "bg-green-500";
  const label = overdue
    ? `Overdue ${Math.floor(elapsedMonths - WINDOW_LIMIT_MONTHS)} mo`
    : `${Math.floor(elapsedMonths)}/${WINDOW_LIMIT_MONTHS} mo`;
  const labelColor = overdue
    ? "text-red-700 font-semibold"
    : warning
      ? "text-amber-700"
      : "text-gray-500";

  return (
    <div className="flex items-center gap-2 min-w-[8rem]">
      <div className="h-1.5 flex-1 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs whitespace-nowrap ${labelColor}`}>{label}</span>
    </div>
  );
}
