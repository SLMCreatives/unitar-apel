import Link from "next/link";

export const PAGE_SIZES = [10, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = PAGE_SIZES[0];

/** Falls back to the default for anything that is not one of PAGE_SIZES. */
export function parsePageSize(value: string | undefined): number {
  const n = Number(value);
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
}

/** 1-based; anything unparseable or out of bounds becomes page 1. */
export function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

// Page and size are omitted at their defaults so the first page keeps a clean URL.
function buildHref(
  basePath: string,
  params: Record<string, string | undefined>,
  page: number,
  pageSize: number
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (pageSize !== DEFAULT_PAGE_SIZE) search.set("per", String(pageSize));
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

// First, last, and the pages either side of the current one; gaps become "…".
function pageWindow(current: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7)
    return Array.from({ length: totalPages }, (_, i) => i + 1);

  const wanted = [1, current - 1, current, current + 1, totalPages]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const out: (number | "gap")[] = [];
  let previous = 0;
  for (const p of wanted) {
    if (p === previous) continue;
    if (previous && p - previous > 1) out.push("gap");
    out.push(p);
    previous = p;
  }
  return out;
}

const navLink =
  "rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50";
const navDisabled =
  "rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-300";

export function Pagination({
  basePath,
  params,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  /** Filters to carry across page changes, e.g. { q, status, stage }. */
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);
  const href = (p: number, size = pageSize) =>
    buildHref(basePath, params, p, size);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-3 py-2">
      <p className="text-xs text-gray-500">
        Showing{" "}
        <span className="font-medium text-gray-700">
          {firstRow}–{lastRow}
        </span>{" "}
        of <span className="font-medium text-gray-700">{total}</span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">Rows</span>
          <div className="flex overflow-hidden rounded-md border border-gray-300">
            {PAGE_SIZES.map((size) => (
              <Link
                key={size}
                // Changing page size restarts at page 1 so the offset stays valid.
                href={href(1, size)}
                aria-current={size === pageSize ? "true" : undefined}
                className={`border-l border-gray-300 px-2 py-1 text-xs first:border-l-0 ${
                  size === pageSize
                    ? "bg-blue-600 font-semibold text-white"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {size}
              </Link>
            ))}
          </div>
        </div>

        <nav aria-label="Pagination" className="flex items-center gap-1">
          {page > 1 ? (
            <Link href={href(page - 1)} className={navLink} rel="prev">
              Previous
            </Link>
          ) : (
            <span className={navDisabled}>Previous</span>
          )}

          {pageWindow(page, totalPages).map((entry, i) =>
            entry === "gap" ? (
              <span key={`gap-${i}`} className="px-1 text-xs text-gray-400">
                …
              </span>
            ) : (
              <Link
                key={entry}
                href={href(entry)}
                aria-current={entry === page ? "page" : undefined}
                className={
                  entry === page
                    ? "rounded-md border border-blue-600 bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white"
                    : `${navLink} px-2.5`
                }
              >
                {entry}
              </Link>
            )
          )}

          {page < totalPages ? (
            <Link href={href(page + 1)} className={navLink} rel="next">
              Next
            </Link>
          ) : (
            <span className={navDisabled}>Next</span>
          )}
        </nav>
      </div>
    </div>
  );
}
