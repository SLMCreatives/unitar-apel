"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { DEFAULT_PAGE_SIZE } from "@/components/pagination";

const SEARCH_DEBOUNCE_MS = 250;

type FilterState = {
  q: string;
  status: string;
  stage: string;
  pageSize: number;
};

// `page` is deliberately dropped: a changed filter restarts at the first page.
function buildUrl({ q, status, stage, pageSize }: FilterState) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (stage) params.set("stage", stage);
  if (pageSize !== DEFAULT_PAGE_SIZE) params.set("per", String(pageSize));
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin text-gray-400"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

const fieldClass =
  "rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "mb-0.5 block text-[11px] font-medium text-gray-500";

/**
 * Filter bar for the learners list. Search applies as the user types
 * (debounced) and the selects apply on change, so there is no submit step.
 * State lives in the URL, keeping the results server-rendered and shareable.
 */
export function LearnerFilters({
  q,
  status,
  stage,
  pageSize,
  statuses,
  stages,
}: {
  q: string;
  status: string;
  stage: string;
  pageSize: number;
  statuses: readonly string[];
  stages: readonly string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [term, setTerm] = useState(q);
  // The search term this component last wrote to the URL. Lets an externally
  // changed `q` (Clear link, browser back) be adopted without the round-trip
  // overwriting what the user is currently typing.
  const urlTerm = useRef(q);

  // Also flushes whatever is typed but not yet debounced, and records it so the
  // pending debounce doesn't fire a second, identical navigation afterwards.
  const navigate = (next: Partial<FilterState>) => {
    const merged = { q: term, status, stage, pageSize, ...next };
    urlTerm.current = merged.q;
    startTransition(() => router.replace(buildUrl(merged), { scroll: false }));
  };

  useEffect(() => {
    if (q !== urlTerm.current) {
      urlTerm.current = q;
      setTerm(q);
    }
  }, [q]);

  useEffect(() => {
    if (term === urlTerm.current) return;
    const timer = setTimeout(() => {
      urlTerm.current = term;
      startTransition(() =>
        router.replace(buildUrl({ q: term, status, stage, pageSize }), {
          scroll: false,
        })
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term, status, stage, pageSize, router]);

  const hasFilters = Boolean(q || status || stage);

  return (
    <form
      // Falls back to a plain GET submit without JS; with JS, Enter just
      // flushes the pending debounce instead of reloading.
      onSubmit={(e) => {
        e.preventDefault();
        navigate({});
      }}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-white p-2"
    >
      {pageSize !== DEFAULT_PAGE_SIZE && (
        <input type="hidden" name="per" value={pageSize} />
      )}
      <div className="min-w-[13rem] flex-1">
        <label htmlFor="learner-search" className={labelClass}>
          Search
        </label>
        <div className="relative">
          <input
            id="learner-search"
            type="search"
            name="q"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Name, matric no, or IC/passport…"
            className={`w-full pr-7 ${fieldClass}`}
          />
          {isPending && (
            <span className="absolute inset-y-0 right-2 flex items-center">
              <Spinner />
            </span>
          )}
        </div>
      </div>
      <div>
        <label htmlFor="learner-status" className={labelClass}>
          Status
        </label>
        <select
          id="learner-status"
          name="status"
          value={status}
          onChange={(e) => navigate({ status: e.target.value })}
          className={fieldClass}
        >
          <option value="">All</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="learner-stage" className={labelClass}>
          Stage
        </label>
        <select
          id="learner-stage"
          name="stage"
          value={stage}
          onChange={(e) => navigate({ stage: e.target.value })}
          className={fieldClass}
        >
          <option value="">All</option>
          {stages.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {/* Shown only without JS, where the live handlers never fire. */}
      <noscript>
        <button
          type="submit"
          className="rounded-md bg-gray-800 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700"
        >
          Filter
        </button>
      </noscript>
      {hasFilters && (
        <Link
          href="/"
          className="px-1.5 py-1 text-xs text-gray-500 hover:text-gray-800"
        >
          Clear
        </Link>
      )}
    </form>
  );
}
