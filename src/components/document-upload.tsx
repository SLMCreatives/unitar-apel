import { deleteDocument, replaceDocument, uploadDocument } from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { FileInput, SelectInput, TextInput } from "@/components/form-fields";
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_CATEGORIES,
  MAX_DOCUMENT_SIZE_MB,
  formatFileSize,
} from "@/lib/documents";
import type { ApelDocument, PersonnelRole } from "@/lib/types";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const UPLOAD_HINT = `Allowed: ${DOCUMENT_ACCEPT.replace(/\./g, "").replace(/,/g, ", ")} · max ${MAX_DOCUMENT_SIZE_MB} MB`;

export function DocumentUpload({
  learnerId,
  assignmentId,
  personnelRole,
}: {
  learnerId: number;
  assignmentId?: number;
  personnelRole?: PersonnelRole;
}) {
  return (
    <form
      action={uploadDocument}
      className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-gray-300 bg-white p-3"
    >
      <input type="hidden" name="learner_id" value={learnerId} />
      {assignmentId && (
        <input type="hidden" name="assignment_id" value={assignmentId} />
      )}
      {personnelRole && (
        <input type="hidden" name="personnel_role" value={personnelRole} />
      )}
      <div className="min-w-[14rem] flex-1">
        <FileInput
          label="Document"
          name="document"
          accept={DOCUMENT_ACCEPT}
          hint={UPLOAD_HINT}
          required
        />
      </div>
      <div className="min-w-[10rem]">
        <SelectInput
          label="Category"
          name="document_category"
          options={DOCUMENT_CATEGORIES}
          emptyLabel="— Optional —"
        />
      </div>
      <div className="min-w-[8rem]">
        <TextInput label="Your name" name="uploaded_by" placeholder="Optional" />
      </div>
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Upload
      </button>
    </form>
  );
}

export function DocumentList({ documents }: { documents: ApelDocument[] }) {
  if (documents.length === 0) {
    return <p className="text-sm text-gray-400">No documents uploaded yet.</p>;
  }

  return (
    <ul className="divide-y divide-gray-100">
      {documents.map((doc) => (
        <li key={doc.id} className="py-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a
              href={`/api/documents/${doc.id}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              {doc.original_file_name}
            </a>
            <span className="text-xs text-gray-400">
              {formatFileSize(doc.file_size)}
            </span>
            {doc.document_category && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                {doc.document_category}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span>{formatDate(doc.created_at)}</span>
            {doc.uploaded_by && <span>by {doc.uploaded_by}</span>}
            <a
              href={`/api/documents/${doc.id}`}
              className="text-blue-600 hover:underline"
            >
              Download
            </a>
            <details className="inline-block">
              <summary className="cursor-pointer text-blue-600 hover:underline">
                Replace
              </summary>
              <form
                action={replaceDocument.bind(null, doc.id)}
                className="mt-2 flex flex-wrap items-end gap-2"
              >
                <div className="min-w-[12rem] flex-1">
                  <FileInput
                    label="New file"
                    name="document"
                    accept={DOCUMENT_ACCEPT}
                    hint={UPLOAD_HINT}
                    required
                  />
                </div>
                <div className="min-w-[8rem]">
                  <TextInput
                    label="Your name"
                    name="uploaded_by"
                    placeholder="Optional"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-md bg-gray-800 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700"
                >
                  Replace file
                </button>
              </form>
            </details>
            <form action={deleteDocument.bind(null, doc.id)} className="inline">
              <ConfirmButton
                message={`Delete ${doc.original_file_name}? This cannot be undone.`}
                className="text-xs text-gray-400 hover:text-red-600"
              >
                Delete
              </ConfirmButton>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
