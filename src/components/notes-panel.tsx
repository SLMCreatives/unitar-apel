import { addNote, deleteNote } from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import type { LearnerNote } from "@/lib/types";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function NotesPanel({
  learnerId,
  notes,
  tableMissing,
}: {
  learnerId: number;
  notes: LearnerNote[];
  tableMissing?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);

  if (tableMissing) {
    return (
      <section className="rounded-lg border border-amber-300 bg-amber-50 p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-900">
          Notes &amp; Follow-ups
        </h2>
        <p className="text-sm text-amber-800">
          The notes table doesn&apos;t exist yet. Run{" "}
          <span className="font-mono">
            supabase/migrations/0001_assessors_and_notes.sql
          </span>{" "}
          in the Supabase SQL Editor to enable notes.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">
        Notes &amp; Follow-ups
      </h2>

      <form action={addNote.bind(null, learnerId)} className="mb-5 space-y-2">
        <textarea
          name="body"
          rows={3}
          required
          placeholder="Add a note (call, email, update)…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[8rem]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Follow-up date
            </label>
            <input
              type="date"
              name="follow_up_date"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900"
            />
          </div>
          <div className="flex-1 min-w-[8rem]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Your name
            </label>
            <input
              type="text"
              name="author"
              placeholder="Optional"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Add note
          </button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-gray-400">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => {
            const overdue =
              note.follow_up_date !== null && note.follow_up_date < today;
            return (
              <li
                key={note.id}
                className="rounded-md border border-gray-100 bg-gray-50 p-3"
              >
                <p className="whitespace-pre-wrap text-sm text-gray-800">
                  {note.body}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span>{formatDate(note.created_at)}</span>
                  {note.author && <span>by {note.author}</span>}
                  {note.follow_up_date && (
                    <span
                      className={
                        overdue
                          ? "font-semibold text-red-600"
                          : "text-blue-600"
                      }
                    >
                      {overdue ? "⚠ Follow-up overdue: " : "Follow-up: "}
                      {formatDate(note.follow_up_date)}
                    </span>
                  )}
                  <form
                    action={deleteNote.bind(null, note.id, learnerId)}
                    className="ml-auto"
                  >
                    <ConfirmButton
                      message="Delete this note?"
                      className="text-xs text-gray-400 hover:text-red-600"
                    >
                      Delete
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
