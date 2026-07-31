import { parseExternalLinks, unparsedLinkLines } from "@/lib/external-links";

// Renders the saved contents of apel.external_links as clickable links, so the
// folder pointers are usable straight from the learner record. Lines that
// aren't http(s) links are called out rather than silently dropped.
export function ExternalLinkList({ value }: { value: string | null }) {
  const links = parseExternalLinks(value);
  const skipped = unparsedLinkLines(value);

  if (links.length === 0 && skipped.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {links.length > 0 && (
        <ul className="space-y-1">
          {links.map((link) => (
            <li key={link.url}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-baseline gap-1.5 text-sm text-blue-600 hover:underline"
                title={link.url}
              >
                <span aria-hidden>🗂</span>
                <span className="break-all">{link.label}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {skipped.length > 0 && (
        <p className="text-xs text-amber-700">
          Not shown as {skipped.length === 1 ? "a link" : "links"} — only{" "}
          <span className="font-mono">http://</span> and{" "}
          <span className="font-mono">https://</span> addresses are linked:{" "}
          {skipped.join(", ")}
        </p>
      )}
    </div>
  );
}
