/**
 * Conservative canonical spelling repair.
 *
 * Only replaces an already-present equivalent keyword phrase.
 * Does not invent facts, append SEO filler or add headings.
 * Missing concepts remain owned by targeted Section Repair.
 */
export function tryRecoverMissingKeywordV1({
  markdown,
  findings,
  maxWords,
}: {
  markdown: string;
  findings: readonly Readonly<{
    code: string;
    message: string;
  }>[];
  maxWords?: number;
}): string | null {
  if (
    findings.length !== 1 ||
    findings[0]?.code !==
      "RANK_READY_PLANNED_KEYWORD_MISSING"
  ) {
    return null;
  }

  const match = findings[0].message.match(
    /Production-planned keyword "([^"]+)" is missing/
  );
  const keyword = match?.[1]?.trim() ?? "";

  if (
    !/^[a-z0-9][a-z0-9 &'/-]{2,100}$/i.test(keyword)
  ) {
    return null;
  }

  const words = keyword
    .split(/[\s-]+/)
    .filter(Boolean);

  if (words.length < 2) {
    return null;
  }

  const escapeRegex = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Match an existing equivalent phrase with different
  // whitespace or hyphenation only.
  const pattern = new RegExp(
    "(?<![\\p{L}\\p{N}])" +
      words.map(escapeRegex).join("[\\s-]+") +
      "(?![\\p{L}\\p{N}])",
    "iu"
  );

  const lines = markdown.split(/\r?\n/);
  let changed = false;

  const result = lines.map(line => {
    if (
      changed ||
      /^\s*#{1,6}\s+/.test(line) ||
      /^\s*(```|~~~)/.test(line)
    ) {
      return line;
    }

    const found = pattern.exec(line);

    if (!found || found[0] === keyword) {
      return line;
    }

    changed = true;

    return line.slice(0, found.index) +
      keyword +
      line.slice(found.index + found[0].length);
  });

  if (!changed) {
    return null;
  }

  const candidate = result.join("\n");
  const count = candidate.trim().split(/\s+/).length;

  if (
    maxWords !== undefined &&
    count > maxWords
  ) {
    return null;
  }

  return candidate;
}
