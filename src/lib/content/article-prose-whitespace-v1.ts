/**
 * CANONICAL_PROSE_WHITESPACE_V1
 *
 * Shared by article composition and the final Content Audit.
 * Preserve Markdown indentation-sensitive content and inline code/URLs.
 * Normalization never changes textual meaning or inserts a keyword.
 */
export function normalizeMasterArticleProseSpacesV1(markdown: string): string {
  let inFence = false;
  return markdown.split("\n").map(line => {
    const trimmed = line.trimStart();
    if (/^(?:`{3,}|~{3,})/.test(trimmed)) {
      inFence = !inFence;
      return line;
    }
    if (
      inFence ||
      /^(?: {4,}|\t)/.test(line) ||
      /^\s*\|/.test(line) ||
      /^(?: {0,3}[-*_] {0,3}){3,}$/.test(line)
    ) {
      return line;
    }
    const pieces = line.split(/(`+[^`\n]*`+|https?:\/\/\S+)/g);
    return pieces.map((piece, index) =>
      index % 2 === 1 ? piece : piece.replace(/ {3,}/g, " ")
    ).join("");
  }).join("\n");
}
