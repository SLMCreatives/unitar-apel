// Presentational building blocks for the user guide (src/app/guide). Kept
// separate from the page so the page reads as content, not markup.

export function GuideSection({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4 lg:scroll-mt-6">
      <h2 className="border-b border-gray-200 pb-2 text-lg font-bold text-gray-900">
        <span className="text-blue-600">{number}.</span> {title}
      </h2>
      {children}
    </section>
  );
}

export function SubSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3 pt-2 lg:scroll-mt-6">
      <h3 className="text-base font-semibold text-gray-900">
        <a href={`#${id}`} className="hover:underline">
          {title}
        </a>
      </h3>
      {children}
    </section>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-3 text-sm leading-6 text-gray-700">{children}</div>
  );
}

const CALLOUT_STYLES = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  tip: "border-green-200 bg-green-50 text-green-900",
  warning: "border-red-200 bg-red-50 text-red-900",
} as const;

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: keyof typeof CALLOUT_STYLES;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border p-4 text-sm leading-6 ${CALLOUT_STYLES[tone]}`}
    >
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// Anything the code and the brief don't settle. Deliberately loud so it gets
// answered rather than guessed at.
export function ToConfirm({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
      <p className="mb-1 flex items-center gap-1.5 font-semibold">
        <span aria-hidden>?</span> To confirm with APEL Centre
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

// Numbered how-to steps.
export function Steps({ children }: { children: React.ReactNode }) {
  return (
    <ol className="list-decimal space-y-2 pl-6 text-sm leading-6 text-gray-700 marker:font-semibold marker:text-blue-600">
      {children}
    </ol>
  );
}

export function Step({ children }: { children: React.ReactNode }) {
  return <li className="pl-1">{children}</li>;
}

// A label exactly as it appears in the app: field names, headings, links.
export function UI({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-gray-900">{children}</span>;
}

// A button as it appears in the app.
export function Btn({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-md border border-gray-300 bg-white px-1.5 py-px text-xs font-semibold text-gray-800 shadow-sm">
      {children}
    </span>
  );
}

// A dropdown value with no colour of its own in the app.
export function Val({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
      {children}
    </span>
  );
}

// A free value staff type in, e.g. a date or a name.
export function Entry({ children }: { children: React.ReactNode }) {
  return <span className="text-sm italic text-gray-600">{children}</span>;
}

// One "when this happens → update these fields → set to" card.
export function EventCard({
  id,
  when,
  where,
  rows,
  children,
}: {
  id: string;
  when: string;
  where: React.ReactNode;
  rows: { section: string; field: string; value: React.ReactNode }[];
  children?: React.ReactNode;
}) {
  return (
    <article
      id={id}
      className="scroll-mt-24 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm lg:scroll-mt-6"
    >
      <header className="border-b border-gray-200 bg-gray-50 px-5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          When this happens
        </p>
        <h3 className="text-base font-semibold text-gray-900">
          <a href={`#${id}`} className="hover:underline">
            {when}
          </a>
        </h3>
        <p className="mt-0.5 text-xs text-gray-500">{where}</p>
      </header>

      <div className="px-5 py-3">
        <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 sm:grid">
          <span>Update these fields</span>
          <span>Set to</span>
        </div>
        <ul className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <li
              key={`${row.field}-${i}`}
              className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-4"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {row.field}
                </p>
                <p className="text-xs text-gray-500">{row.section}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-sm text-gray-700">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 sm:hidden">
                  Set to
                </span>
                {row.value}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {children && (
        <div className="space-y-3 border-t border-gray-100 px-5 py-4 text-sm leading-6 text-gray-700">
          {children}
        </div>
      )}
    </article>
  );
}

// A fixed-value copy of the 12-month meter (src/components/offer-progress.tsx)
// for examples. The real one reads today's date, so it can't show a chosen
// state. Thresholds match it: amber from 9 months, red from 12.
export function WindowMeter({ months }: { months: number }) {
  const overdue = months >= 12;
  const warning = !overdue && months >= 9;
  const pct = Math.max(0, Math.min(100, (months / 12) * 100));
  return (
    <div className="flex min-w-[8rem] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full ${overdue ? "bg-red-500" : warning ? "bg-amber-500" : "bg-green-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`whitespace-nowrap text-xs ${overdue ? "font-semibold text-red-700" : warning ? "text-amber-700" : "text-gray-500"}`}
      >
        {overdue ? `Overdue ${Math.floor(months - 12)} mo` : `${Math.floor(months)}/12 mo`}
      </span>
    </div>
  );
}

// Static checklist row for the weekly routine. The page is read-only, so the
// box is a picture of a checkbox, not a control.
export function CheckItem({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 py-3">
      <span
        aria-hidden
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-gray-300 bg-white"
      />
      <div className="text-sm leading-6 text-gray-700">
        <p className="font-semibold text-gray-900">{title}</p>
        {children}
      </div>
    </li>
  );
}
