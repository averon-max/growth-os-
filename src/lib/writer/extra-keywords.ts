/*
 * Extra keywords for one article. Each one gets its own Google search (one SERP request, saved and reused
 * like every DataForSEO answer) for its People Also Ask questions, related searches and the titles that rank.
 * Pages are not crawled for extra keywords: that is where research money goes, and the main keyword already does it.
 */

export interface ExtraKeywordSignals {
  keyword: string;
  questions: string[];
  related: string[];
  topTitles: string[];
}

export const MAX_EXTRA_KEYWORDS = 5;

/** Cleans what the user typed: trimmed, lowercased, unique, not the main keyword, at most 5. */
export function cleanExtraKeywords(raw: unknown, main: string): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[,\n]/) : [];
  const mainNorm = main.trim().toLowerCase();
  const out: string[] = [];
  for (const v of list) {
    if (typeof v !== "string") continue;
    const k = v.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 120);
    if (k.length < 2 || k === mainNorm || out.includes(k)) continue;
    out.push(k);
    if (out.length === MAX_EXTRA_KEYWORDS) break;
  }
  return out;
}

type Rec = Record<string, unknown>;

export async function researchExtraKeywords(keywords: string[], login: string, password: string): Promise<ExtraKeywordSignals[]> {
  const credentials = Buffer.from(`${login}:${password}`).toString("base64");
  return Promise.all(
    keywords.map(async (keyword): Promise<ExtraKeywordSignals> => {
      try {
        const res = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
          method: "POST",
          signal: AbortSignal.timeout(30000),
          headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
          body: JSON.stringify([{ keyword, language_code: "en", location_code: 2840, depth: 10 }]),
        });
        const data = (await res.json()) as Rec;
        const items = ((((data.tasks as Rec[] | undefined)?.[0]?.result as Rec[] | undefined)?.[0]?.items) as Rec[] | undefined) ?? [];
        const questions = items
          .filter((i) => i.type === "people_also_ask")
          .flatMap((i) => ((i.items as Rec[] | undefined) ?? []).map((q) => String(q.title ?? "").trim()))
          .filter((q) => q.length > 8)
          .slice(0, 6);
        const related = items
          .filter((i) => i.type === "related_searches")
          .flatMap((i) => ((i.items as unknown[] | undefined) ?? []).map((q) => (typeof q === "string" ? q : String((q as Rec)?.title ?? ""))))
          .map((q) => q.trim())
          .filter(Boolean)
          .slice(0, 8);
        const topTitles = items
          .filter((i) => i.type === "organic")
          .map((i) => String(i.title ?? "").trim())
          .filter(Boolean)
          .slice(0, 6);
        return { keyword, questions, related, topTitles };
      } catch {
        return { keyword, questions: [], related: [], topTitles: [] };
      }
    }),
  );
}

const tokens = (k: string) => k.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);

/** True when every meaningful word of the keyword appears in the text (prefix match, so "tires" counts for "tire"). */
export function mentions(text: string, keyword: string): boolean {
  const t = text.toLowerCase();
  const ws = tokens(keyword);
  return ws.length > 0 && ws.every((w) => t.includes(w.slice(0, Math.max(4, w.length - 2))));
}

export function keywordCoverage(body: string, keywords: string[]): { keyword: string; covered: boolean }[] {
  const headings = (body.match(/^#{2,3} .+$/gm) ?? []).join("\n");
  const paragraphs = body.split(/\n{2,}/);
  return keywords.map((keyword) => ({
    keyword,
    covered: mentions(headings, keyword) || paragraphs.some((p) => mentions(p, keyword)),
  }));
}
