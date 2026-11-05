// Removes sentences that repeat wording already present earlier in the article.
// Prose lines only: headings, tables, lists, quotes and code fences are never touched.

const NGRAM = 7;
const MIN_SENTENCE_WORDS = 9;
const MIN_SHARED_SHARE = 0.35; // remove only near-duplicate sentences, not shared stock phrases

function wordsOf(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
}

function gramsOf(w: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i + NGRAM <= w.length; i++) {
    out.push(w.slice(i, i + NGRAM).join(" "));
  }
  return out;
}

function isProseLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return !/^(#|\||>|\x60{3}|[-*+]\s|\d+[.)]\s)/.test(t);
}

// Lossless: parts.join("") === line
function splitSentences(line: string): string[] {
  const parts: string[] = [];
  const re = /[.!?]["'\u201D\u2019)\]]*\s+/g;
  let start = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const end = m.index + m[0].length;
    const next = line.charAt(end);
    if (next !== "" && /[A-Z0-9"\u201C(*]/.test(next)) {
      parts.push(line.slice(start, end));
      start = end;
    }
  }
  if (start < line.length) parts.push(line.slice(start));
  return parts;
}

export interface DedupeResult {
  text: string;
  applied: boolean;
  removed: { sentence: string; sharedPhrase: string }[];
}

export function removeRepeatedSentences(
  text: string,
  priorText: string,
  maxRemovedShare = 0.4
): DedupeResult {
  const seen = new Set<string>();
  for (const line of priorText.split("\n")) {
    if (!isProseLine(line)) continue;
    for (const g of gramsOf(wordsOf(line))) seen.add(g);
  }

  const removed: DedupeResult["removed"] = [];
  let removedWords = 0;
  let totalWords = 0;

  const lines = text.split("\n").map((line) => {
    if (!isProseLine(line)) return line;
    const kept: string[] = [];
    let changed = false;
    for (const sentence of splitSentences(line)) {
      const w = wordsOf(sentence);
      totalWords += w.length;
      const g = gramsOf(w);
      const hits = w.length >= MIN_SENTENCE_WORDS ? g.filter((x) => seen.has(x)) : [];
      const hit = hits.length > 0 && hits.length / Math.max(1, g.length) >= MIN_SHARED_SHARE ? hits[0] : undefined;
      if (hit) {
        removed.push({ sentence: sentence.trim(), sharedPhrase: hit });
        removedWords += w.length;
        changed = true;
        continue;
      }
      for (const x of g) seen.add(x);
      kept.push(sentence);
    }
    return changed ? kept.join("").replace(/\s+$/, "") : line;
  });

  if (removed.length === 0) return { text, applied: false, removed };
  if (totalWords > 0 && removedWords / totalWords > maxRemovedShare) {
    return { text, applied: false, removed };
  }
  return { text: lines.join("\n").replace(/\n{3,}/g, "\n\n"), applied: true, removed };
}
