import { prisma } from "@/lib/prisma";

export interface RelatedKeywordResult {
  keyword: string;
  searchVolume: number | null;
  competitionLevel: string | null;
  cpc: number | null;
  keywordDifficulty: number | null;
  monthlySearches: { year: number; month: number; searchVolume: number }[];
  trend: { monthly: number | null; quarterly: number | null; yearly: number | null } | null;
}

/*
 * Бесплатные идеи ключевых слов: Google Autocomplete + всё, что уже сохранено в базе.
 * Никаких платных вызовов. Результат кэшируется в KeywordSuggestionCache на 30 дней.
 */

const DAY = 24 * 60 * 60 * 1000;
export const FREE_TTL = 30 * DAY;
const MODIFIERS = ["", " how", " what", " best", " vs", " for", " free", " without", " app", " cost", " near me"];
const PREFIXES = ["how to ", "best ", "is ", "why "];

export const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

async function autocomplete(q: string, hl: string, gl: string): Promise<string[]> {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=${hl}&gl=${gl}&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 GrowthOS" }, signal: AbortSignal.timeout(5000) });
    if (res.ok === false) return [];
    const data = (await res.json()) as [string, string[]];
    return Array.isArray(data?.[1]) ? data[1] : [];
  } catch {
    return [];
  }
}

/** Идеи из Google Autocomplete по сиду (с модификаторами), с кэшем в базе. */
export async function freeAutocomplete(seed: string, country = "US", lang = "en"): Promise<string[]> {
  const n = norm(seed);
  const key = `${n}:${country}:${lang}`;
  const hit = await prisma.keywordSuggestionCache.findUnique({ where: { normalized_source: { normalized: key, source: "GOOGLE_AUTOCOMPLETE" } } });
  if (hit && Date.now() - hit.fetchedAt.getTime() < FREE_TTL && Array.isArray(hit.payload)) return hit.payload as unknown as string[];

  const queries = [...MODIFIERS.map((m) => n + m), ...PREFIXES.map((p) => p + n)];
  const lists = await Promise.all(queries.map((q) => autocomplete(q, lang, country.toLowerCase())));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) for (const s of list) {
    const k = norm(s);
    if (k === n || seen.has(k) || k.length > 80) continue;
    seen.add(k);
    out.push(k);
  }
  if (out.length) {
    await prisma.keywordSuggestionCache.upsert({
      where: { normalized_source: { normalized: key, source: "GOOGLE_AUTOCOMPLETE" } },
      create: { normalized: key, source: "GOOGLE_AUTOCOMPLETE", payload: out },
      update: { payload: out, fetchedAt: new Date() },
    });
  }
  return out;
}

/** Последний сохранённый платный ответ DataForSEO по этому сиду — любой давности. */
export async function savedRelated(seed: string): Promise<RelatedKeywordResult[] | null> {
  const row = await prisma.keywordSuggestionCache.findFirst({
    where: { source: "DATAFORSEO_RELATED", normalized: { startsWith: `${norm(seed)}:` } },
    orderBy: { fetchedAt: "desc" },
  });
  return row && Array.isArray(row.payload) ? (row.payload as unknown as RelatedKeywordResult[]) : null;
}

/** Метрики, уже известные системе (сохранённые ответы + таблица Keyword), по тексту ключевого слова. */
export async function knownMetrics(workspaceId: string, keywords: string[]): Promise<Map<string, RelatedKeywordResult>> {
  const want = new Set(keywords.map(norm));
  const map = new Map<string, RelatedKeywordResult>();
  const rows = await prisma.keywordSuggestionCache.findMany({ where: { source: "DATAFORSEO_RELATED" }, orderBy: { fetchedAt: "asc" }, select: { payload: true } });
  for (const r of rows) {
    if (Array.isArray(r.payload) === false) continue;
    for (const item of r.payload as unknown as RelatedKeywordResult[]) {
      const k = norm(String(item?.keyword ?? ""));
      if (want.has(k)) map.set(k, item);
    }
  }
  const own = await prisma.keyword.findMany({ where: { workspaceId, normalized: { in: [...want] } }, select: { normalized: true, text: true, volume: true, cpc: true, difficulty: true } });
  for (const k of own) {
    if (map.has(k.normalized) || k.volume == null) continue;
    map.set(k.normalized, {
      keyword: k.text, searchVolume: k.volume, cpc: k.cpc == null ? null : Number(k.cpc), keywordDifficulty: k.difficulty,
      competitionLevel: null, monthlySearches: [], trend: null,
    });
  }
  return map;
}

/** Бесплатный список идей в формате RelatedKeywordResult. */
export async function freeRelated(workspaceId: string, seed: string, limit: number): Promise<RelatedKeywordResult[]> {
  const ideas = await freeAutocomplete(seed);
  const known = await knownMetrics(workspaceId, ideas);
  return ideas.slice(0, Math.max(limit, 50)).map((k) => known.get(k) ?? {
    keyword: k, searchVolume: null, cpc: null, keywordDifficulty: null, competitionLevel: null, monthlySearches: [], trend: null,
  }).slice(0, limit);
}
