"use client";

import { useState } from "react";
import type { ReportField } from "@/lib/report-fields";

const BUTTON_CLASS =
  "rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50";

// Checkbox picker for report fields. Submits as a plain GET form to
// /api/export, so the selected keys arrive as repeated ?fields= params.
export function ReportFieldSelector({ fields }: { fields: ReportField[] }) {
  const recommended = fields.filter((f) => f.recommended).map((f) => f.key);
  const [selected, setSelected] = useState<string[]>(recommended);

  const toggle = (key: string) =>
    setSelected((current) =>
      current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key]
    );

  return (
    <form
      action="/api/export"
      onSubmit={(e) => {
        if (selected.length === 0) e.preventDefault();
      }}
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={BUTTON_CLASS}
          onClick={() => setSelected(fields.map((f) => f.key))}
        >
          Select all
        </button>
        <button
          type="button"
          className={BUTTON_CLASS}
          onClick={() => setSelected([])}
        >
          Clear all
        </button>
        <button
          type="button"
          className={BUTTON_CLASS}
          onClick={() => setSelected(recommended)}
        >
          Recommended
        </button>
        <span className="ml-auto text-xs text-gray-500">
          {selected.length} of {fields.length} fields selected
        </span>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <label
            key={field.key}
            className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
          >
            <input
              type="checkbox"
              name="fields"
              value={field.key}
              checked={selected.includes(field.key)}
              onChange={() => toggle(field.key)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              {field.label}
              {field.recommended && (
                <span className="ml-1 text-[10px] font-medium uppercase text-blue-500">
                  ★
                </span>
              )}
            </span>
          </label>
        ))}
      </div>

      {selected.length === 0 && (
        <p className="text-sm text-red-600">
          Select at least one field to generate the report.
        </p>
      )}

      <button
        type="submit"
        disabled={selected.length === 0}
        className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Download Excel report
      </button>
    </form>
  );
}
