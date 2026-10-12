/**
 * EXACT_SOURCE_SENTENCE_V1
 *
 * Some crawled websites flatten navigation, bylines and article content
 * into one long DOM bodyText. The general lexical verifier can then
 * return a large cross-boundary excerpt whose beginning is menu text.
 *
 * This narrow helper extracts ONLY an exact sentence-sized claim that
 * actually occurs in the fetched page. It never generates missing words,
 * promotes SERP snippets or weakens the canonical claim verifier.
 *
 * Exact-quote support is a special case; paraphrases continue through
 * the existing verified-excerpt pipeline.
 */
export function findExactSourceSentenceV1({
  claimText,
  bodyText,
}: {
  claimText: string;
  bodyText: string;
}): string | null {
  const text = bodyText.replace(/\s+/g, " ").trim();
  const exactClaim = claimText.replace(/\s+/g, " ").trim();
  const needle = exactClaim.replace(/[.!?]+$/g, "").trim();
  if (needle.length < 40 || text.length < needle.length) return null;

  const hay = text.toLocaleLowerCase("en-US");
  const seek = needle.toLocaleLowerCase("en-US");
  let searchAt = 0;
  while (searchAt < hay.length) {
    const at = hay.indexOf(seek, searchAt);
    if (at < 0) return null;
    const end = at + needle.length;
    const before = at > 0 ? text[at - 1] : "";
    const after = text[end] ?? "";
    searchAt = at + 1;

    // Refuse a partial-word substring; never reconstruct missing text.
    if ((before && /[\p{L}\p{N}]/u.test(before)) ||
        (after && /[\p{L}\p{N}]/u.test(after))) {
      continue;
    }

    const quoteEnd = /[.!?]/.test(after) ? end + 1 : end;
    const quote = text.slice(at, quoteEnd).trim();
    // Keep a tightly localized, literal source sentence.
    if (quote.length > 450) continue;
    return quote;
  }
  return null;
}
