/**
 * Normalizes raw keyword text into a canonical form used for the
 * [workspaceId, normalized] uniqueness constraint. Lowercases, trims,
 * collapses whitespace, strips punctuation except hyphens.
 */
export function normalizeKeyword(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
