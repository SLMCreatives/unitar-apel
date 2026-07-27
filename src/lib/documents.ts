// Document-upload rules. Edit these lists to change what the app accepts —
// forms and server actions both read from here.

export const DOCUMENTS_BUCKET = "apel-documents";

export const MAX_DOCUMENT_SIZE_MB = 10;
export const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024;

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
] as const;

export const DOCUMENT_CATEGORIES = [
  "APPOINTMENT LETTER",
  "CLAIM FORM",
  "ASSESSMENT EVIDENCE",
  "CERTIFICATE",
  "IC / PASSPORT",
  "OTHER",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

// Value for a file input's `accept` attribute.
export const DOCUMENT_ACCEPT = ALLOWED_DOCUMENT_EXTENSIONS.join(",");

// Returns an error message, or null when the file is acceptable.
export function validateDocument(file: File): string | null {
  if (!file.name) return "Choose a file to upload.";
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!(ALLOWED_DOCUMENT_EXTENSIONS as readonly string[]).includes(ext)) {
    return `File type not allowed. Accepted: ${ALLOWED_DOCUMENT_EXTENSIONS.join(", ")}`;
  }
  if (file.size === 0) return "The selected file is empty.";
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return `File is too large (max ${MAX_DOCUMENT_SIZE_MB} MB).`;
  }
  return null;
}

// All of a learner's files live under one folder so they can be cleaned up
// when the learner is deleted.
export function documentStoragePath(learnerId: number, fileName: string) {
  const safe = fileName.replace(/[^\w.-]+/g, "_");
  return `learners/${learnerId}/${Date.now()}-${safe}`;
}

export function formatFileSize(bytes: number | null) {
  if (bytes === null || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
