import { leadAge } from "@/lib/lead-ageing";

/**
 * Lead age (created → last update) with time since that update beneath it.
 * Shows "—" until migration 0007 adds apel.updated_at.
 */
export function LeadAge({
  createdAt,
  updatedAt,
}: {
  createdAt: string | null;
  updatedAt: string | null | undefined;
}) {
  const age = leadAge(createdAt, updatedAt);
  if (!age) return <span className="text-xs text-gray-400">—</span>;

  return (
    <div className="whitespace-nowrap">
      <span className="text-xs font-medium text-gray-700">{age.ageDays}d</span>
      <div className="text-[11px] text-gray-400">
        updated {age.idleDays === 0 ? "today" : `${age.idleDays}d ago`}
      </div>
    </div>
  );
}
