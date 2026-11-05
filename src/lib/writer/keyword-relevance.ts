// Keeps only related searches that are about the topic itself (not brands, navigation or noise).
const STOP = new Set(["how", "what", "why", "the", "and", "for", "with", "your", "make", "can", "you", "does", "best", "is", "are", "to", "in", "of", "a"]);
const NAV = /\b(phone|number|login|log in|sign in|sign up|near me|contact|customer service|address|hours|reddit|youtube|tiktok|instagram|facebook|pdf|download|coupon|promo)\b/i;

export function filterRelevantSearches(list: string[] | undefined, keyword: string): string[] {
  if (!list?.length) return [];
  const kw = keyword.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
  return list.filter((q) => {
    if (NAV.test(q)) return false;
    const toks = q.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ");
    return toks.some((t) => kw.some((k) => t === k || t === k + "s" || t + "s" === k));
  });
}
