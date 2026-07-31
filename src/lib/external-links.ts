// Learners keep pointers to external evidence folders (Drive, SharePoint,
// OneDrive…) in the single apel.external_links text column — one link per
// line, optionally labelled as "Label | URL". A text column rather than a
// table because the links are just references; nothing is tracked about them.

export type ExternalLink = { label: string; url: string };

// Only http(s) links are ever rendered. Anything else — javascript:, data: —
// would turn a saved text field into a click-to-run payload for the next
// person who opens the learner.
function safeUrl(value: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return parsed.href;
}

export function parseExternalLinks(
  value: string | null | undefined
): ExternalLink[] {
  if (!value) return [];

  const links: ExternalLink[] = [];
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Split on the last "|" so a label may itself contain one.
    const sep = trimmed.lastIndexOf("|");
    const url = safeUrl(sep === -1 ? trimmed : trimmed.slice(sep + 1).trim());
    if (!url) continue; // Unparseable lines stay in the textarea, just unlinked.

    const label = sep === -1 ? "" : trimmed.slice(0, sep).trim();
    links.push({ label: label || url, url });
  }
  return links;
}

// Lines that are not usable links, so the form can say so instead of silently
// dropping them from the list below the textarea.
export function unparsedLinkLines(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      const sep = line.lastIndexOf("|");
      return safeUrl(sep === -1 ? line : line.slice(sep + 1).trim()) === null;
    });
}
