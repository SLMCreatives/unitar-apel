const BASE =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-600",
  WITHDRAW: "bg-red-100 text-red-700",
  PENDING: "bg-amber-100 text-amber-800",
};

const STAGE_STYLES: Record<string, string> = {
  "SELF ASSESSMENT": "bg-slate-100 text-slate-700",
  PORTFOLIO: "bg-blue-100 text-blue-800",
  FVV: "bg-violet-100 text-violet-800",
  "CHALLENGE TEST": "bg-orange-100 text-orange-800",
  CAPSTONE: "bg-cyan-100 text-cyan-800",
  COMPLETED: "bg-green-100 text-green-800",
  GRADUATED: "bg-emerald-100 text-emerald-800",
};

const PAYMENT_STYLES: Record<string, string> = {
  PAID: "bg-green-100 text-green-800",
  UNPAID: "bg-red-100 text-red-700",
  WAIVED: "bg-gray-100 text-gray-600",
};

const RESULT_STYLES: Record<string, string> = {
  PASS: "bg-green-100 text-green-800",
  FAIL: "bg-red-100 text-red-700",
};

const CLAIM_STYLES: Record<string, string> = {
  "NOT SUBMITTED": "bg-gray-100 text-gray-600",
  SUBMITTED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-amber-100 text-amber-800",
  PAID: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-700",
};

const LETTER_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  ISSUED: "bg-green-100 text-green-800",
};

function badge(value: string | null, styles: Record<string, string>) {
  if (!value) return <span className="text-xs text-gray-400">—</span>;
  return (
    <span className={`${BASE} ${styles[value] ?? "bg-gray-100 text-gray-600"}`}>
      {value}
    </span>
  );
}

export function StatusBadge({ value }: { value: string | null }) {
  return badge(value, STATUS_STYLES);
}

export function StageBadge({ value }: { value: string | null }) {
  return badge(value, STAGE_STYLES);
}

export function PaymentBadge({ value }: { value: string | null }) {
  return badge(value, PAYMENT_STYLES);
}

export function ResultBadge({ value }: { value: string | null }) {
  return badge(value, RESULT_STYLES);
}

export function ClaimStatusBadge({ value }: { value: string | null }) {
  return badge(value, CLAIM_STYLES);
}

export function AppointmentLetterStatusBadge({
  value,
}: {
  value: string | null;
}) {
  return badge(value, LETTER_STYLES);
}
