const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type LeadAge = {
  // How long the learner had been in the system at their last update.
  ageDays: number;
  // How long since that last update.
  idleDays: number;
};

// Lead ageing runs from apel.created_at to apel.updated_at, which migration
// 0007 keeps current. Returns null when updated_at is missing (migration not
// run yet) or either timestamp is unreadable.
export function leadAge(
  createdAt: string | null | undefined,
  updatedAt: string | null | undefined,
  now = Date.now()
): LeadAge | null {
  if (!createdAt || !updatedAt) return null;
  const created = new Date(createdAt).getTime();
  const updated = new Date(updatedAt).getTime();
  if (Number.isNaN(created) || Number.isNaN(updated)) return null;
  return {
    ageDays: Math.max(0, Math.floor((updated - created) / MS_PER_DAY)),
    idleDays: Math.max(0, Math.floor((now - updated) / MS_PER_DAY)),
  };
}

// Dashboard buckets, youngest first. Each covers ageDays up to and including
// maxDays; the last is open-ended.
export const AGE_BUCKETS = [
  { label: "Under 30 days", maxDays: 29, barClass: "bg-green-500" },
  { label: "30–89 days", maxDays: 89, barClass: "bg-lime-500" },
  { label: "90–179 days", maxDays: 179, barClass: "bg-amber-500" },
  { label: "180–364 days", maxDays: 364, barClass: "bg-orange-500" },
  { label: "365+ days", maxDays: Infinity, barClass: "bg-red-500" },
] as const;

export function ageBucket(ageDays: number) {
  return AGE_BUCKETS.find((b) => ageDays <= b.maxDays) ?? AGE_BUCKETS.at(-1)!;
}
