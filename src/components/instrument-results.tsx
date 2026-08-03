import { INPUT_CLASS } from "@/components/form-fields";
import { instrumentColumns, instrumentResults } from "@/lib/instruments";
import { RESULT_STATUSES, type Learner } from "@/lib/types";

// One row per assessment instrument, each with its own status, GPA and CGPA.
// Field names are the flat learner columns (portfolio_gpa, fvv_result_status,
// …) so the whole grid saves through the normal learner form submit — no
// separate action, no client-side state.
export function InstrumentResults({ learner }: { learner?: Learner }) {
  const rows = instrumentResults(learner);

  return (
    <div className="sm:col-span-2 lg:col-span-3">
      <p className="mb-2 text-xs font-medium text-gray-600">
        Results by assessment instrument
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" className="px-3 py-2">
                Instrument Level
              </th>
              <th scope="col" className="px-3 py-2">
                Status (Pass / Fail)
              </th>
              <th scope="col" className="px-3 py-2">
                GPA
              </th>
              <th scope="col" className="px-3 py-2">
                CGPA
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const cols = instrumentColumns(row.prefix);
              return (
                <tr key={row.prefix}>
                  <th
                    scope="row"
                    className="whitespace-nowrap px-3 py-2 text-left text-sm font-medium text-gray-700"
                  >
                    {row.level}
                  </th>
                  <td className="px-3 py-2">
                    <label className="sr-only" htmlFor={cols.resultStatus}>
                      {row.level} status
                    </label>
                    <select
                      id={cols.resultStatus}
                      name={cols.resultStatus}
                      defaultValue={row.resultStatus ?? ""}
                      className={INPUT_CLASS}
                    >
                      <option value="">— Not set —</option>
                      {RESULT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <label className="sr-only" htmlFor={cols.gpa}>
                      {row.level} GPA
                    </label>
                    <input
                      id={cols.gpa}
                      name={cols.gpa}
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      defaultValue={row.gpa ?? ""}
                      className={INPUT_CLASS}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <label className="sr-only" htmlFor={cols.cgpa}>
                      {row.level} CGPA
                    </label>
                    <input
                      id={cols.cgpa}
                      name={cols.cgpa}
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      defaultValue={row.cgpa ?? ""}
                      className={INPUT_CLASS}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-1 text-xs text-gray-400">
        Leave a row blank until that instrument has been assessed.
      </p>
    </div>
  );
}
