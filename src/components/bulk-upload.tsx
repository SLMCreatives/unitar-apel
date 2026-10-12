"use client";

import Link from "next/link";
import { useActionState } from "react";
import { commitBulkUpload, previewBulkUpload } from "@/app/learners/bulk/actions";
import {
  EMPTY_COMMIT,
  EMPTY_PREVIEW,
  LEARNER_IMPORT_FIELDS,
  REQUIRED_IMPORT_FIELDS,
  type PreviewRow,
} from "@/lib/bulk-import";
import { IMPORT_ACCEPT, MAX_IMPORT_ROWS, MAX_IMPORT_SIZE_MB } from "@/lib/bulk-parse";

const ACTION_STYLES: Record<PreviewRow["action"], string> = {
  CREATE: "bg-green-50 text-green-700",
  UPDATE: "bg-blue-50 text-blue-700",
  SKIP: "bg-gray-100 text-gray-500",
};

// Columns worth showing in the preview table — enough to recognise a learner
// without rendering all 45 importable fields.
const PREVIEW_COLUMNS = [
  "name",
  "ic_passport_no",
  "email_1",
  "programme_details",
  "learner_status",
  "assessment_stage",
] as const;

function columnLabel(key: string) {
  return LEARNER_IMPORT_FIELDS.find((f) => f.key === key)?.label ?? key;
}

export function BulkUpload() {
  const [preview, previewAction, previewPending] = useActionState(
    previewBulkUpload,
    EMPTY_PREVIEW
  );
  const [commit, commitAction, commitPending] = useActionState(
    commitBulkUpload,
    EMPTY_COMMIT
  );

  const rows = preview.rows;
  const toCreate = rows.filter((r) => r.action === "CREATE");
  const toUpdate = rows.filter((r) => r.action === "UPDATE");
  const skipped = rows.filter((r) => r.action === "SKIP");
  const importable = [...toCreate, ...toUpdate];
  // Once the import has run, the preview describes work already done.
  const imported = commit.status === "done";

  return (
    <div className="space-y-6">
      {/* Step 1 — choose the file */}
      <form
        action={previewAction}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
            1. Choose a file
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Excel (.xlsx) or CSV, one learner per row, with a header row naming
            the columns. Max {MAX_IMPORT_ROWS} rows and {MAX_IMPORT_SIZE_MB} MB
            per upload.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="file"
              className="mb-1 block text-xs font-medium text-gray-600"
            >
              Spreadsheet
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept={IMPORT_ACCEPT}
              required
              className="w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <div>
            <label
              htmlFor="mode"
              className="mb-1 block text-xs font-medium text-gray-600"
            >
              If a learner already exists
            </label>
            <select
              id="mode"
              name="mode"
              defaultValue={preview.mode}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"
            >
              <option value="SKIP_EXISTING">Skip the row (safest)</option>
              <option value="UPDATE_EXISTING">
                Update the existing learner
              </option>
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Matched on {columnLabel("ic_passport_no")}. An update writes only
              the filled-in cells — blank cells and missing columns keep the
              learner&apos;s current values.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={previewPending}
            className="rounded-md bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {previewPending ? "Reading file…" : "Preview import"}
          </button>
          <a
            href="/api/learners/bulk-template"
            className="text-sm text-blue-600 hover:underline"
          >
            Download template
          </a>
        </div>

        {preview.status === "error" && preview.message && (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {preview.message}
          </p>
        )}
      </form>

      {/* Step 2 — check what will happen, then import */}
      {preview.status === "ready" && (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
              2. Check and import
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {preview.fileName} — {rows.length} data row
              {rows.length === 1 ? "" : "s"} read. Nothing has been saved yet.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-green-50 px-3 py-1 font-medium text-green-700">
              {toCreate.length} to create
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
              {toUpdate.length} to update
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600">
              {skipped.length} skipped
            </span>
          </div>

          {preview.ignoredHeaders.length > 0 && (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              These columns don&apos;t match a learner field and are ignored:{" "}
              {preview.ignoredHeaders.join(", ")}.
            </p>
          )}

          {preview.message && (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {preview.message}
            </p>
          )}

          <div className="max-h-96 overflow-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Action</th>
                  {PREVIEW_COLUMNS.map((key) => (
                    <th key={key} className="px-3 py-2">
                      {columnLabel(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={row.errors.length > 0 ? "bg-red-50/50" : undefined}
                  >
                    <td className="px-3 py-2 text-gray-400">{row.rowNumber}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STYLES[row.action]}`}
                      >
                        {row.action}
                      </span>
                      {row.note && (
                        <span className="ml-1 text-xs text-gray-400">
                          {row.note}
                        </span>
                      )}
                    </td>
                    {PREVIEW_COLUMNS.map((key) => (
                      <td
                        key={key}
                        className="max-w-[12rem] truncate px-3 py-2 text-gray-700"
                      >
                        {row.values[key] === null ||
                        row.values[key] === undefined
                          ? "—"
                          : String(row.values[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {skipped.some((r) => r.errors.length > 0) && (
            <details className="rounded-md border border-red-200 bg-red-50 p-3">
              <summary className="cursor-pointer text-sm font-medium text-red-700">
                {skipped.filter((r) => r.errors.length > 0).length} row
                {skipped.filter((r) => r.errors.length > 0).length === 1
                  ? ""
                  : "s"}{" "}
                with errors
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-red-700">
                {skipped
                  .filter((r) => r.errors.length > 0)
                  .map((row) => (
                    <li key={row.rowNumber}>
                      <span className="font-semibold">Row {row.rowNumber}:</span>{" "}
                      {row.errors.join("; ")}
                    </li>
                  ))}
              </ul>
            </details>
          )}

          <form action={commitAction} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="mode" value={preview.mode} />
            <input
              type="hidden"
              name="rows"
              value={JSON.stringify(importable)}
            />
            <button
              type="submit"
              disabled={commitPending || importable.length === 0 || imported}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {commitPending
                ? "Importing…"
                : imported
                  ? "Imported"
                  : `Import ${importable.length} learner${importable.length === 1 ? "" : "s"}`}
            </button>
            {!imported && importable.length > 0 && (
              <span className="text-xs text-gray-500">
                Skipped rows are not written.
              </span>
            )}
          </form>
        </div>
      )}

      {/* Result */}
      {commit.status !== "idle" && (
        <div
          className={`space-y-2 rounded-lg border p-5 shadow-sm ${
            commit.status === "error"
              ? "border-red-200 bg-red-50"
              : "border-green-200 bg-green-50"
          }`}
        >
          <p
            className={`text-sm font-semibold ${
              commit.status === "error" ? "text-red-800" : "text-green-800"
            }`}
          >
            {commit.message}
          </p>
          {commit.status === "done" && (
            <p className="text-sm text-green-800">
              {commit.created} created, {commit.updated} updated.{" "}
              <Link href="/" className="font-medium underline">
                View learners
              </Link>
            </p>
          )}
          {commit.failures.length > 0 && (
            <ul className="space-y-1 text-xs text-red-700">
              {commit.failures.map((f) => (
                <li key={f.rowNumber}>
                  <span className="font-semibold">Row {f.rowNumber}:</span>{" "}
                  {f.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Reference */}
      <details className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-gray-700">
          Accepted columns ({LEARNER_IMPORT_FIELDS.length})
        </summary>
        <p className="mt-2 text-xs text-gray-500">
          Column headers are matched loosely — case, spacing and punctuation
          don&apos;t matter. Required:{" "}
          {REQUIRED_IMPORT_FIELDS.map((f) => f.label).join(", ")}. Dates accept
          YYYY-MM-DD or DD/MM/YYYY (day first). Unrecognised columns are ignored.
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-gray-600 sm:grid-cols-2 lg:grid-cols-3">
          {LEARNER_IMPORT_FIELDS.map((field) => (
            <li key={field.key}>
              {field.label}
              {field.required && <span className="text-red-500"> *</span>}
              {field.options && (
                <span className="text-gray-400"> — {field.options.join(" / ")}</span>
              )}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
