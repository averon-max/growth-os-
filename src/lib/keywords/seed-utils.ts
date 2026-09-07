/**
 * DataForSEO's related_keywords endpoint needs a phrase people actually
 * search -- a compound business description like "credit monitoring and
 * identity protection" returns zero results, because nobody searches that
 * whole sentence. This derives a short, realistic seed from free-text
 * industry/description fields: split on "and"/commas, take the first
 * segment, cap at 4 words.
 */
export function deriveSearchSeed(industry: string): string {
  const firstSegment = industry
    .split(/\s+and\s+|,/i)[0]
    .trim();

  const words = firstSegment.split(/\s+/).filter(Boolean);
  return words.slice(0, 4).join(" ");
}
