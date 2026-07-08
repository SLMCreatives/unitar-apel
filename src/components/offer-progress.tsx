const AVG_DAYS_PER_MONTH = 30.44;
const LIMIT_MONTHS = 12;

/**
 * 12-month completion window that starts at the offer letter issue date.
 * Shows elapsed months as a thin meter; the numeric label always accompanies
 * the color so state is never conveyed by color alone.
 */
export function OfferProgress({ issuedDate }: { issuedDate: string | null }) {
  if (!issuedDate) return <span className="text-xs text-gray-400">—</span>;

  const start = new Date(issuedDate).getTime();
  const elapsedMonths =
    (Date.now() - start) / (1000 * 60 * 60 * 24 * AVG_DAYS_PER_MONTH);
  const pct = Math.max(0, Math.min(100, (elapsedMonths / LIMIT_MONTHS) * 100));

  const overdue = elapsedMonths >= LIMIT_MONTHS;
  const warning = !overdue && elapsedMonths >= 9;
  const barColor = overdue
    ? "bg-red-500"
    : warning
      ? "bg-amber-500"
      : "bg-green-500";
  const label = overdue
    ? `Overdue ${Math.floor(elapsedMonths - LIMIT_MONTHS)} mo`
    : `${Math.floor(elapsedMonths)}/${LIMIT_MONTHS} mo`;
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
