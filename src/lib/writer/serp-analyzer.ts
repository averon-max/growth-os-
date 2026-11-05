import OpenAI from "openai";
import { tracked } from "./usage";
import { log, logError } from "./logger";
import { chatJson, hasArray } from "./llm-json";

const JUNK_H2_PATTERNS: RegExp[] = [
  /^(contents?|about cookies|related articles?|suggested|keep reading|sign up|join|let's connect|ready to|more .+ solutions?|no comments)/i,
  /^\d+\s+(comments?|replies?)/i,
  /^(faq|home|menu|navigation|search|subscribe|newsletter|follow us)/i,
  /^(final thoughts|conclusion|wrapping up|summary|related posts?|about the author|recent posts|categories|share this|let's get social|where to go from here|how useful was this post|get started with)/i,
  /^(services|resources|results|contact( us)?|about( us)?|insights|industries|pricing|careers|blog|our work|get in touch|speak to .+|book a .+)$/i,
  /^(learn more|don'?t see|need (more )?help|still have questions|explore more|more (articles|resources|about)|you (may|might) also like|related (reading|topics|posts))/i,
];

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function isJunkH2(h: string): boolean {
  return h.trim().length < 4 || JUNK_H2_PATTERNS.some(p => p.test(h.trim()));
}


export interface SerpResult {
  position: number;
  url: string;
  title: string;
  description: string;
}

export interface PageStructure {
  excerpt?: string;
  position?: number; // Google rank of the page, kept for research audits
  url: string;
  title: string;
  h1: string;
  h2s: string[];
  h3s: string[];
  wordCountEstimate: number;
  hasTable: boolean;
  hasFaq: boolean;
}

export interface SerpAnalysis {
  keyword: string;
  topResults: SerpResult[];
  pageStructures: PageStructure[];
  authoritySources?: SerpResult[];
  authorityExcerpts?: { url: string; title: string; excerpt: string }[];
  authorityDomains?: string[];
  peopleAlsoAsk?: string[];
  relatedSearches?: string[];
  consensus: {
    detectedCategory?: string;
    topicSubtopics?: Record<string, string[]>;
    avgWordCount: number;
    commonH2Themes: string[];
    mustCoverTopics: string[];
  missingTopics?: string[];
    h2CountRange: { min: number; max: number };
  };
}

const ALLOWED_CATEGORIES = ["definition", "how-it-works", "how-to", "troubleshooting", "comparison", "best-options", "alternatives", "review", "pricing", "benefits-risks", "beginners-guide", "checklist", "case-study", "statistics", "industry-analysis"];
// FORMAT_HINTS: names alone made close formats easy to confuse (definition vs how-it-works, comparison vs best-options)
const CATEGORY_HINTS: Record<string, string> = {
  "definition": "what X is", "how-it-works": "the mechanism behind X", "how-to": "steps to do a task", "troubleshooting": "why a problem happens and how to fix it",
  "comparison": "X vs Y on the same criteria", "best-options": "a ranked roundup of products or services", "alternatives": "options instead of one named product",
  "review": "an evaluation of one product", "pricing": "what X costs", "benefits-risks": "pros and cons, benefits and risks", "beginners-guide": "a complete introduction for newcomers",
  "checklist": "a scannable list of actions", "case-study": "how one real organization got a result", "statistics": "numbers and data about a topic", "industry-analysis": "trends and the outlook of a market",
};

async function inferTopicsWithGPT(
  keyword: string,
  topResults: SerpResult[],
  parsedPages: Array<{ url: string; h2s: string[]; h3s?: string[] }> = [],
  peopleAlsoAsk: string[] = [],
  relatedSearches: string[] = [],
  topicCount = 9
): Promise<{ topics: string[]; category: string | null; subtopics: Record<string, string[]> }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { topics: [], category: null, subtopics: {} };
  const client = tracked(new OpenAI({ maxRetries: 5, timeout: 180000,  apiKey }));

  const serpContext = topResults
    .slice(0, 10)
    .map((r, i) => `${i + 1}. "${r.title}" — ${r.description ?? ""}`)
    .join("\n");

  const competitorContext = parsedPages
    .filter((p) => p.h2s && p.h2s.length >= 2)
    .slice(0, 6)
    .map((p) => {
      const h2List = p.h2s.filter((h) => h.length > 5 && h.length < 140).slice(0, 15).join(" | ");
      const h3List = (p.h3s ?? []).filter((h) => h.length > 5 && h.length < 120).slice(0, 15).join(" | ");
      return `- ${p.url}\n  H2: ${h2List}${h3List ? `\n  H3: ${h3List}` : ""}`;
    })
    .join("\n");

  const prompt = `Keyword: "${keyword}"

TOP GOOGLE RESULTS (title — snippet):
${serpContext}
${competitorContext ? `\nACTUAL OUTLINES OF TOP-RANKING PAGES (primary signal):\n${competitorContext}\n` : ""}${peopleAlsoAsk.length ? `\nPEOPLE ALSO ASK (real user questions):\n${peopleAlsoAsk.map((q) => `- ${q}`).join("\n")}\n` : ""}${relatedSearches.length ? `\nRELATED SEARCHES:\n${relatedSearches.join(", ")}\n` : ""}
TASK 1 — FORMAT: Decide which article format best matches what Google ranks for this keyword. Look at titles and outlines: numbered strategy/tip lists, step-by-step guides, definitions, comparisons, tool roundups, trend analyses, etc. Pick exactly one of: ${ALLOWED_CATEGORIES.map((c) => `${c} (${CATEGORY_HINTS[c]})`).join(", ")}.

TASK 2 — TOPICS: List exactly ${topicCount} section topics an article must cover to beat these pages (TOPIC_BUDGET: this count matches the length that ranks; never pad it). Merge overlapping competitor sections into one topic, merge adjacent steps a reader does together into one topic, and put a narrow question that needs only 2-3 sentences into another topic's subtopics instead of making it a section, keep every subject at least 2 competitors cover, add 1-2 important gaps none of them cover, and make sure the People Also Ask questions that match the main intent can be answered from these sections (ignore off-intent or trivia questions). Always include the practical next-steps topic the searcher needs after the basics (what to do, how to act, how to fix). Order topics as the ideal reading flow: the FIRST topic must directly answer the searcher's main question for this keyword. PROCEDURE_ORDER: for a how-to or any procedure, the remaining topics follow the exact order in which the reader performs the work, so every check or preparation comes before the step that depends on it (for example, checking a part comes before installing it); otherwise order them by importance to the searcher. Each topic is a specific, search-friendly heading of 3-8 words (e.g. "How AI Overviews Change Clicks", never "Implications"): no "Introduction", "Conclusion", "Final thoughts", "Outlook", "Drivers", "Current State", no competitor brand names.

Return ONLY JSON: {"category": "<one format>", "topics": [{"heading": "...", "subtopics": ["2-3 specific sub-questions this section must answer"]}]}`;

  try {
    log("serp-analyzer", "GPT_TOPIC_INFERENCE_START", {
      keyword,
      serpResultsCount: topResults.length,
      competitorPages: parsedPages.length,
      paa: peopleAlsoAsk.length,
      related: relatedSearches.length,
    });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_CONTENT_MODEL ?? "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert content strategist who reverse-engineers what ranks on Google. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 3000,
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as { category?: string; topics?: Array<string | { heading?: string; subtopics?: string[] }> };
    const subtopics: Record<string, string[]> = {};
    const topics = (Array.isArray(parsed.topics) ? parsed.topics : [])
      .map((t) => {
        if (typeof t === "string") return t;
        const h = String(t?.heading ?? "").trim();
        if (h && Array.isArray(t?.subtopics)) subtopics[h] = t.subtopics.filter((x) => typeof x === "string").slice(0, 3);
        return h;
      })
      .filter(Boolean)
      .slice(0, 10);
    const category = parsed.category && ALLOWED_CATEGORIES.includes(parsed.category) ? parsed.category : null;
    log("serp-analyzer", "GPT_TOPIC_INFERENCE_DONE", { category, topicsCount: topics.length, topics });
    return { topics, category, subtopics };
  } catch (err) {
    logError("serp-analyzer", "GPT_TOPIC_INFERENCE_FAILED", err, { keyword });
    return { topics: [], category: null, subtopics: {} };
  }
}

const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const isGoogleRedirect = (u: string) => /google\.[a-z.]+\/(goto|url)\?/i.test(u);
const isGoogleHost = (u: string) => { try { return /(^|\.)google\.|gstatic\.com|googleusercontent\.com/i.test(new URL(u).hostname); } catch { return true; } };

async function resolveRedirect(url: string): Promise<string> {
  if (!isGoogleRedirect(url)) return url;
  try {
    const u = new URL(url);
    for (const k of ["q", "url", "u"]) {
      const v = u.searchParams.get(k);
      if (v && /^https?:\/\//.test(v) && !isGoogleHost(v)) return v;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { redirect: "manual", signal: ctrl.signal, headers: { "User-Agent": BROWSER_UA } });
    clearTimeout(timer);
    const loc = res.headers.get("location");
    if (loc && /^https?:\/\//.test(loc)) {
      if (!isGoogleHost(loc)) return loc;
      const res2 = await fetch(loc, { redirect: "follow", headers: { "User-Agent": BROWSER_UA } });
      if (!isGoogleHost(res2.url)) return res2.url;
    }
    const html = (await res.text().catch(() => "")).replace(/&amp;/g, "&");
    const candidates = Array.from(html.matchAll(/https?:\/\/[^"'<>\s\\]+/g)).map((m) => m[0])
      .filter((x) => !isGoogleHost(x) && !/schema\.org|w3\.org|gstatic/i.test(x));
    if (candidates[0]) return candidates[0];
  } catch {
    // fall through: canonical-based resolution during page fetch remains as backup
  }
  return url;
}

const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };

// AUTHORITY_DOMAINS: ask which bodies publish PRIMARY information on this topic, then
// find their real pages through a site: search. URLs therefore always come from Google, never from the model.
async function suggestAuthorityDomains(keyword: string): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];
  try {
    const client = tracked(new OpenAI({ maxRetries: 3, timeout: 60000, apiKey }));
    const parsed = await chatJson<{ domains?: unknown[] }>(client, "AUTHORITY_DOMAINS", `Topic: "${keyword}" (audience: United States).\nList up to 5 website domains that publish PRIMARY, authoritative information on this exact topic: the responsible government agency or regulator, the official safety or standards body, the recognized professional or industry association, or the official documentation of the product, platform or manufacturer the topic is about. Never list blogs, news or media sites, affiliate or review sites, marketplaces or forums. Return bare domains only (for example "example-agency.gov", "docs.example.com"). Return JSON {"domains": [...]}, or {"domains": []} if no such body exists.`, { maxTokens: 2000, validate: hasArray("domains") });
    return (Array.isArray(parsed.domains) ? parsed.domains : [])
      .map((d) => String(d).toLowerCase().trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, ""))
      .filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d))
      .slice(0, 5);
  } catch (err) {
    logError("serp-analyzer", "AUTHORITY_DOMAINS_FAILED", err, { keyword });
    return [];
  }
}

/** Main text of a page via DataForSEO content parsing; one retry, because parallel calls sometimes come back empty. */
// AUTHORITY_URLS: in the 2026-11-04 matrix 13 of 15 runs found no official page: Google ignored site:, the goto
// breadcrumbs pointed to other sites, Bing returned nothing. The model now proposes exact pages on the official
// domains and each one is KEPT ONLY when its real text is fetched and is about the topic (no URL is trusted unseen).
async function proposeAuthorityUrls(keyword: string, domains: string[]): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];
  try {
    const client = tracked(new OpenAI({ maxRetries: 3, timeout: 60000, apiKey }));
    const parsed = await chatJson<{ urls?: unknown[] }>(client, "AUTHORITY_URLS", `Topic: "${keyword}" (audience: United States).\nList up to 8 exact URLs of existing pages that explain this topic on these official domains: ${domains.join(", ")}, or on other US government (.gov) or university (.edu) sites. Prefer long-lived overview or guidance pages over news releases. Only URLs you are confident exist. Return JSON {"urls": [...]}.`, { maxTokens: 3000, validate: hasArray("urls") });
    return (Array.isArray(parsed.urls) ? parsed.urls : []).map((u) => String(u).trim()).filter((u) => /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}\//i.test(u));
  } catch (err) {
    logError("serp-analyzer", "AUTHORITY_URLS_FAILED", err, { keyword });
    return [];
  }
}

export async function fetchMainText(url: string, credentials: string, maxChars = 4000): Promise<string> {
  const once = await fetchMainTextOnce(url, credentials, maxChars);
  if (once) return once;
  await new Promise((r) => setTimeout(r, 1500));
  const again = await fetchMainTextOnce(url, credentials, maxChars);
  if (!again) log("serp-analyzer", "MAIN_TEXT_EMPTY", { url });
  return again;
}

async function fetchMainTextOnce(url: string, credentials: string, maxChars: number): Promise<string> {
  try {
    const cpRes = await fetch("https://api.dataforseo.com/v3/on_page/content_parsing/live", {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
      body: JSON.stringify([{ url, enable_javascript: true }]),
    });
    const cp = (await cpRes.json()) as Record<string, unknown>;
    const cpItem = ((((cp.tasks as Record<string, unknown>[])?.[0]?.result as Record<string, unknown>[])?.[0]?.items) as Record<string, unknown>[])?.[0];
    const main = (((cpItem?.page_content as Record<string, unknown>)?.main_topic) as Record<string, unknown>[]) ?? [];
    return main
      .flatMap((t) => [String(t.h_title ?? ""), ...((t.primary_content as Record<string, unknown>[]) ?? []).map((c) => String(c.text ?? ""))])
      .join(" ").replace(/\s+/g, " ").trim().slice(0, maxChars);
  } catch {
    return "";
  }
}

/** Organic results from the "regular" endpoint (real result URLs, unlike the advanced endpoint's google.com/goto links). */
/** GOTO_RESOLVE: DataForSEO sometimes returns google.com/goto links that cannot be followed from our side
 * (both SERP endpoints did in the last run: 9 of 10 authority results). Its crawler can: read the redirect
 * target (location) or the landing page's canonical. Used only for a few on-domain authority candidates. */
export async function resolveGotoViaDataForSeo(url: string, credentials: string): Promise<string | null> {
  try {
    const r = await fetch("https://api.dataforseo.com/v3/on_page/instant_pages", {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
      body: JSON.stringify([{ url, enable_javascript: true, enable_browser_rendering: true }]),
    });
    const d = (await r.json()) as Record<string, unknown>;
    const item = ((((d.tasks as Record<string, unknown>[])?.[0]?.result as Record<string, unknown>[])?.[0]?.items) as Record<string, unknown>[])?.[0];
    const meta = (item?.meta ?? {}) as Record<string, unknown>;
    for (const c of [item?.location, meta.canonical, item?.url]) {
      if (typeof c === "string" && /^https?:\/\//.test(c) && !isGoogleHost(c)) return c;
    }
  } catch {
    // unresolved: the candidate is dropped
  }
  return null;
}

export interface OrganicSearchResult {
  results: SerpResult[];
  raw: number;
  unresolved: number;
  resolvedViaCrawler: number;
  crawlerTries: number;
  /** what DataForSEO returned for links we could not resolve (to see which fields carry the real site) */
  unresolvedSamples: { domain: string; breadcrumb: string }[];
  /** DataForSEO task status ("20000 Ok." or the error), so an empty result is never a silent failure */
  status?: string;
}

export async function searchOrganicRegular(query: string, credentials: string, depth = 10, opts: { accept?: (host: string) => boolean; resolveMax?: number; engine?: "google" | "bing" } = {}): Promise<OrganicSearchResult> {
  // BING_FALLBACK: Bing results carry real URLs; Google results for site: queries came back as unresolvable goto links
  const res = await fetch(`https://api.dataforseo.com/v3/serp/${opts.engine ?? "google"}/organic/live/regular`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
    body: JSON.stringify([{ keyword: query, language_code: "en", location_code: 2840, depth }]),
  });
  const data = (await res.json()) as Record<string, unknown>;
  const task = (data.tasks as Record<string, unknown>[])?.[0];
  const status = `${task?.status_code ?? data.status_code ?? "?"} ${String(task?.status_message ?? data.status_message ?? "")}`.trim();
  const items = ((((data.tasks as Record<string, unknown>[])?.[0]?.result as Record<string, unknown>[])?.[0]?.items) as Record<string, unknown>[]) ?? [];
  const results: SerpResult[] = [];
  const unresolvedSamples: { domain: string; breadcrumb: string }[] = [];
  let raw = 0, unresolved = 0, resolvedViaCrawler = 0, crawlerTries = 0;
  for (const i of items) {
    if (i.type !== "organic" || typeof i.url !== "string") continue;
    raw++;
    let url = await resolveRedirect(i.url as string);
    if (isGoogleRedirect(url)) {
      // for a goto link the domain field can be google's own; the breadcrumb starts with the real site
      const domainField = String(i.domain ?? "").toLowerCase().replace(/^www\./, "");
      const crumbHost = (String(i.breadcrumb ?? "").match(/^\s*(?:https?:\/\/)?([a-z0-9.-]+\.[a-z]{2,})/i)?.[1] ?? "").toLowerCase().replace(/^www\./, "");
      const host = domainField && !/(^|\.)google\./.test(domainField) ? domainField : crumbHost;
      const real = host && opts.accept?.(host) && crawlerTries < (opts.resolveMax ?? 0) ? (crawlerTries++, await resolveGotoViaDataForSeo(i.url as string, credentials)) : null;
      if (!real) {
        unresolved++;
        if (unresolvedSamples.length < 3) unresolvedSamples.push({ domain: String(i.domain ?? ""), breadcrumb: String(i.breadcrumb ?? "").slice(0, 80) });
        continue;
      }
      url = real;
      resolvedViaCrawler++;
    }
    results.push({ position: i.rank_absolute as number, url, title: String(i.title ?? ""), description: String(i.description ?? "") });
  }
  return { results, raw, unresolved, resolvedViaCrawler, crawlerTries, unresolvedSamples, status };
}

export async function analyzeSERP(
  keyword: string,
  dataForSeoLogin: string,
  dataForSeoPassword: string
): Promise<SerpAnalysis> {
  log("serp-analyzer", "START", { keyword });

  const credentials = Buffer.from(`${dataForSeoLogin}:${dataForSeoPassword}`).toString("base64");

  let serpData: unknown;
  try {
    const res = await fetch(
      "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([{ keyword, language_code: "en", location_code: 2840, depth: 20 }]),
      }
    );
    serpData = await res.json();
    log("serp-analyzer", "SERP_FETCHED", { status: (serpData as Record<string, unknown>).status_code });
  } catch (err) {
    logError("serp-analyzer", "SERP_FETCH_FAILED", err, { keyword });
    throw err;
  }

  const tasks = ((serpData as Record<string, unknown>).tasks as Record<string, unknown>[]) ?? [];
  const result = (tasks[0]?.result as Record<string, unknown>[])?.[0];
  const rawItems = (result?.items as Record<string, unknown>[]) ?? [];

  const topResults: SerpResult[] = rawItems
    .filter((i) => i.type === "organic")
    .slice(0, 20)
    .map((i) => ({
      position: i.rank_absolute as number,
      url: i.url as string,
      title: i.title as string,
      description: i.description as string,
    }));

  log("serp-analyzer", "TOP_RESULTS_PARSED", { count: topResults.length, urls: topResults.map((r) => r.url) });

  const peopleAlsoAsk: string[] = rawItems
    .filter((i) => i.type === "people_also_ask")
    .flatMap((i) => ((i.items as Record<string, unknown>[]) ?? []).map((q) => String(q.title ?? "").trim()))
    .filter((q) => q.length > 8)
    .slice(0, 8);
  const relatedSearches: string[] = rawItems
    .filter((i) => i.type === "related_searches")
    .flatMap((i) => ((i.items as unknown[]) ?? []).map((q) => (typeof q === "string" ? q : String((q as Record<string, unknown>)?.title ?? ""))))
    .map((q) => q.trim())
    .filter(Boolean)
    .slice(0, 10);
  log("serp-analyzer", "SERP_FEATURES", { peopleAlsoAsk, relatedSearches });

  await Promise.all(topResults.map(async (r) => {
    const resolved = await resolveRedirect(r.url);
    if (resolved !== r.url) {
      log("serp-analyzer", "REDIRECT_RESOLVED_HTTP", { to: resolved });
      r.url = resolved;
    }
  }));
  log("serp-analyzer", "REDIRECTS_SUMMARY", {
    total: topResults.length,
    unresolved: topResults.filter((r) => isGoogleRedirect(r.url)).length,
  });

  const stillGoto = topResults.filter((r) => isGoogleRedirect(r.url));
  if (stillGoto.length) {
    try {
      const regRes = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/regular", {
        method: "POST",
        headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
        body: JSON.stringify([{ keyword, language_code: "en", location_code: 2840, depth: 20 }]),
      });
      const reg = (await regRes.json()) as Record<string, unknown>;
      const regItems = ((((reg.tasks as Record<string, unknown>[])?.[0]?.result as Record<string, unknown>[])?.[0]?.items) as Record<string, unknown>[]) ?? [];
      const normT = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      for (const r of stillGoto) {
        const hit = regItems.find((i) => i.type === "organic" && typeof i.url === "string" && !isGoogleRedirect(i.url as string) && normT(String(i.title ?? "")) === normT(r.title ?? ""));
        if (hit) { r.url = hit.url as string; log("serp-analyzer", "REDIRECT_RESOLVED_REGULAR", { to: r.url }); }
      }
    } catch (err) {
      logError("serp-analyzer", "REGULAR_SERP_FALLBACK_FAILED", err, { keyword });
    }
    log("serp-analyzer", "REDIRECTS_AFTER_FALLBACK", { unresolved: topResults.filter((r) => isGoogleRedirect(r.url)).length });
  }

  // AUTHORITY_SEARCH: the "regular" endpoint returns real result URLs; the advanced endpoint often returns
  // google.com/goto links that cannot be resolved, which left the official-source pool empty (authority: 0).
  const searchOrganic = (query: string, depth = 10, accept?: (host: string) => boolean, engine: "google" | "bing" = "google") => searchOrganicRegular(query, credentials, depth, { accept, resolveMax: accept && engine === "google" ? 4 : 0, engine });
  const diag = (x: OrganicSearchResult, kept: number, extra: Record<string, unknown> = {}) => ({ status: x.status, raw: x.raw, unresolved: x.unresolved, crawlerTries: x.crawlerTries, resolvedViaCrawler: x.resolvedViaCrawler, kept, ...extra, ...(x.unresolvedSamples.length ? { unresolvedSamples: x.unresolvedSamples } : {}) });
  const isGovEdu = (host: string) => /\.(gov|edu)$/i.test(host);
  let authoritySources: SerpResult[] = [];
  const authorityDiag: Record<string, unknown> = {};
  try {
    const g = await searchOrganic(`${keyword} (site:.gov OR site:.edu)`, 10, isGovEdu);
    // TOPICAL_AUTHORITY: a .gov/.edu page counts only if it is about the topic (a university survey tool or a town
    // newsletter archive is not an official source on "Mailchimp alternatives")
    const kwWords = keyword.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !/^(what|does|that|this|with|from|your|keep|best|much|cost|work|works|guide|safely)$/.test(w));
    const onTopic = (r: SerpResult) => { const t = `${r.title} ${r.description ?? ""} ${r.url}`.toLowerCase(); return kwWords.filter((w) => t.includes(w.slice(0, 5))).length >= Math.min(2, Math.max(1, kwWords.length)); };
    authoritySources = g.results.filter((r) => isGovEdu(hostOf(r.url)) && onTopic(r)).slice(0, 5);
    authorityDiag.govEdu = diag(g, authoritySources.length);
  } catch (err) {
    logError("serp-analyzer", "AUTHORITY_SOURCES_FAILED", err, { keyword });
  }
  // AUTHORITY_DOMAINS: topic-specific official bodies (agency, standards body, manufacturer docs) come first.
  let authorityDomains: string[] = [];
  try {
    const domains = await suggestAuthorityDomains(keyword);
    authorityDomains = domains;
    let discovered: SerpResult[] = [];
    const onDomainHost = (host: string) => domains.some((d) => host === d || host.endsWith(`.${d}`));
    const onDomain = (r: SerpResult) => onDomainHost(hostOf(r.url));
    if (domains.length) {
      const d1 = await searchOrganic(`${keyword} (${domains.map((d) => `site:${d}`).join(" OR ")})`, 10, onDomainHost);
      discovered = d1.results.filter(onDomain);
      authorityDiag.domainQuery = diag(d1, discovered.length, { offDomain: d1.results.length - discovered.length });
      if (!discovered.length) {
        // some engines ignore OR between site: operators; fall back to one query per domain
        const empty: OrganicSearchResult = { results: [], raw: 0, unresolved: 0, resolvedViaCrawler: 0, crawlerTries: 0, unresolvedSamples: [] };
        const per = await Promise.all(domains.slice(0, 3).map((d) => searchOrganic(`${keyword} site:${d}`, 5, onDomainHost).catch(() => empty)));
        discovered = per.flatMap((x) => x.results.filter(onDomain).slice(0, 2));
        authorityDiag.perDomain = per.map((x, i) => ({ domain: domains[i], ...diag(x, x.results.filter(onDomain).length) }));
      }
      if (discovered.length + authoritySources.length < 2) {
        // BING_FALLBACK: same official domains, real URLs
        const empty: OrganicSearchResult = { results: [], raw: 0, unresolved: 0, resolvedViaCrawler: 0, crawlerTries: 0, unresolvedSamples: [] };
        const [bd, bg] = await Promise.all([
          searchOrganic(`${keyword} (${domains.map((d) => `site:${d}`).join(" OR ")})`, 10, undefined, "bing").catch(() => empty),
          authoritySources.length ? Promise.resolve(empty) : searchOrganic(`${keyword} (site:gov OR site:edu)`, 10, undefined, "bing").catch(() => empty),
        ]);
        discovered = [...discovered, ...bd.results.filter(onDomain)];
        const bingGovEdu = bg.results.filter((r) => isGovEdu(hostOf(r.url))).slice(0, 3);
        authoritySources = [...authoritySources, ...bingGovEdu];
        authorityDiag.bing = { domainQuery: diag(bd, bd.results.filter(onDomain).length), govEdu: diag(bg, bingGovEdu.length) };
      }
      // at most 2 pages per domain so one body cannot crowd out the others
      const perHost: Record<string, number> = {};
      discovered = discovered.filter((r) => ((perHost[hostOf(r.url)] = (perHost[hostOf(r.url)] ?? 0) + 1) <= 2)).slice(0, 4);
    }
    const seenUrl = new Set<string>();
    authoritySources = [...discovered, ...authoritySources]
      .filter((r) => { const k = r.url.replace(/[#?].*$/, "").replace(/\/+$/, "").toLowerCase(); if (seenUrl.has(k)) return false; seenUrl.add(k); return true; })
      .slice(0, 6);
    log("serp-analyzer", "AUTHORITY_DOMAINS", { domains, discovered: discovered.map((r) => r.url) });
  } catch (err) {
    logError("serp-analyzer", "AUTHORITY_DOMAINS_SEARCH_FAILED", err, { keyword });
  }
  // official pages that already rank for the keyword itself count too
  const officialHost = (h: string) => isGovEdu(h) || authorityDomains.some((d) => h === d || h.endsWith(`.${d}`));
  for (const r of topResults) if (officialHost(hostOf(r.url)) && !isGoogleRedirect(r.url) && !authoritySources.some((a) => a.url === r.url)) authoritySources.push(r);
  const prefetched = new Map<string, string>();
  if (authoritySources.length < 2) {
    const kw = keyword.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !/^(what|does|that|this|with|from|your|keep|best|much|cost|work|works|how|why)$/.test(w));
    const proposals = (await proposeAuthorityUrls(keyword, authorityDomains)).filter((u) => officialHost(hostOf(u)));
    const tried: { url: string; chars: number; kept: boolean }[] = [];
    for (const u of proposals.slice(0, 8)) {
      if (authoritySources.length >= 4) break;
      const text = await fetchMainText(u, credentials).catch(() => "");
      const lc = text.toLowerCase();
      const kept = text.length > 400 && kw.filter((w) => lc.includes(w.slice(0, 5))).length >= Math.min(2, Math.max(1, kw.length));
      tried.push({ url: u, chars: text.length, kept });
      if (!kept) continue;
      prefetched.set(u, text);
      const path = decodeURIComponent(new URL(u).pathname).replace(/[-_/]+/g, " ").trim();
      authoritySources.push({ position: 0, url: u, title: `${hostOf(u)}: ${path || "official page"}`, description: text.slice(0, 160) });
    }
    authorityDiag.urlProposals = tried;
  }
  log("serp-analyzer", "AUTHORITY_SOURCES", { count: authoritySources.length, urls: authoritySources.map((r) => r.url), diagnostics: authorityDiag });
  // AUTHORITY_EXCERPTS: real text from the official pages so the writer can cite them for specific facts
  const authorityExcerpts: { url: string; title: string; excerpt: string }[] = [];
  for (const r of authoritySources.slice(0, 4)) {
    const excerpt = prefetched.get(r.url) ?? await fetchMainText(r.url, credentials);
    if (excerpt.length > 300) authorityExcerpts.push({ url: r.url, title: r.title, excerpt });
  }
  log("serp-analyzer", "AUTHORITY_EXCERPTS", { count: authorityExcerpts.length, urls: authorityExcerpts.map((x) => x.url) });

  const pageStructures: PageStructure[] = [];

  const pageCandidates = topResults.filter((r) => !/youtube\.com|youtu\.be|reddit\.com|blackhatworld\.com|quora\.com|linkedin\.com|medium\.com/.test(r.url)).slice(0, 16);
  // PARALLEL_PAGES: pages are fetched in rank-ordered batches of 8 (was one by one); the first 6 usable pages by Google position are kept
  const fetchStructure = async (result: SerpResult): Promise<PageStructure | null | "RETRY"> => {
    log("serp-analyzer", "FETCHING_PAGE_STRUCTURE", { url: result.url, position: result.position });
    try {
      const pageRes = await fetch(
        "https://api.dataforseo.com/v3/on_page/instant_pages",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([{
            url: result.url,
            fetch_page_content: true,
            enable_javascript: true,
            enable_browser_rendering: true,
          }]),
        }
      );
      const pageData = await pageRes.json() as Record<string, unknown>;
      const pageTasks = (pageData.tasks as Record<string, unknown>[]) ?? [];
      const pageResult = (pageTasks[0]?.result as Record<string, unknown>[])?.[0];
      const pageItem = (pageResult?.items as Record<string, unknown>[])?.[0];

      if (!pageItem) {
        log("serp-analyzer", "PAGE_STRUCTURE_EMPTY", { url: result.url, position: result.position, status: pageTasks[0]?.status_code ?? pageData.status_code ?? null, message: pageTasks[0]?.status_message ?? pageData.status_message ?? null });
        return "RETRY";
      }

      const meta = (pageItem.meta ?? {}) as Record<string, unknown>;
      const canonical = typeof meta.canonical === "string" ? meta.canonical : "";
      if (/google\.[a-z.]+\/(goto|url)\?/i.test(result.url) && /^https?:\/\//.test(canonical) && !/google\./i.test(canonical)) {
        log("serp-analyzer", "REDIRECT_RESOLVED", { from: result.url.slice(0, 60), to: canonical });
        result.url = canonical;
      }
      // FORUM_FILTER_AFTER_REDIRECT: the forum/video filter ran on the goto link; check the real URL again
      if (/(^|\.)(quora\.com|reddit\.com|youtube\.com|youtu\.be|linkedin\.com|medium\.com|facebook\.com|tiktok\.com|instagram\.com|blackhatworld\.com)$/i.test(hostOf(result.url))) {
        log("serp-analyzer", "PAGE_SKIPPED", { url: result.url.slice(0, 80), position: result.position, reason: "forum, social or video page (after redirect)" });
        return null;
      }
      const htags = (meta.htags ?? {}) as Record<string, string[]>;
      log("serp-analyzer", "PAGE_ITEM_KEYS", {
        url: result.url,
        itemKeys: Object.keys(pageItem),
        metaKeys: Object.keys(meta),
        htagKeys: Object.keys(htags),
      });
      const rawH2 = (htags.h2 ?? []).map((h) => String(h).trim()).filter(Boolean);
      const h2Seen: Record<string, number> = {};
      for (const h of rawH2) h2Seen[h.toLowerCase()] = (h2Seen[h.toLowerCase()] ?? 0) + 1;
      // nav/footer headings repeat (header + footer) and are 1-2 words: drop them
      const h2s = rawH2.filter((h) => !isJunkH2(h) && h2Seen[h.toLowerCase()] === 1 && h.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length >= 3 && !/\n/.test(h) && !/!\s*$/.test(h) && !/^(do you want|want more|get (your|a) free|free (seo |marketing )?(audit|review|consultation)|hiya|hi,|i'?m |what about you|latest case studies|keep up with|download|book a|schedule a|claim your)/i.test(h));
      const h3s = (htags.h3 ?? []).map((h) => String(h).trim()).filter(Boolean);
      let h2Source = "htags";
      let pageExcerpt = "";
      for (let cpTry = 0; cpTry < 2 && !pageExcerpt; cpTry++) try {
        if (cpTry) await new Promise((r) => setTimeout(r, 1500));
        const cpRes = await fetch("https://api.dataforseo.com/v3/on_page/content_parsing/live", {
          method: "POST",
          headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
          body: JSON.stringify([{ url: result.url, enable_javascript: true }]),
        });
        const cp = (await cpRes.json()) as Record<string, unknown>;
        const cpItem = ((((cp.tasks as Record<string, unknown>[])?.[0]?.result as Record<string, unknown>[])?.[0]?.items) as Record<string, unknown>[])?.[0];
        const main = (((cpItem?.page_content as Record<string, unknown>)?.main_topic) as Record<string, unknown>[]) ?? [];
        const mainH2 = main.filter((t) => Number(t.level) === 2).map((t) => String(t.h_title ?? "").trim()).filter((h) => h && !isJunkH2(h) && !/\n/.test(h) && !/!\s*$/.test(h) && h.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length >= 3 && !/^(do you want|want more|get (your|a) free|free (seo |marketing )?(audit|review|consultation)|hiya|hi,|i'?m |what about you|latest case studies|keep up with|download|book a|schedule a|claim your|about the author|meet )/i.test(h));
        if (mainH2.length >= 2) { h2s.splice(0, h2s.length, ...mainH2); h2Source = "main_content"; }
        pageExcerpt = main.flatMap((t) => ((t.primary_content as Record<string, unknown>[]) ?? []).map((c) => String(c.text ?? ""))).join(" ").replace(/\s+/g, " ").slice(0, 6000);
        if (!pageExcerpt) log("serp-analyzer", "CONTENT_PARSING_EMPTY", { url: result.url, attempt: cpTry + 1, status: (cp.tasks as Record<string, unknown>[])?.[0]?.status_code ?? cp.status_code ?? null, message: (cp.tasks as Record<string, unknown>[])?.[0]?.status_message ?? cp.status_message ?? null });
      } catch {
        // keep htags-based headings
      }
      log("serp-analyzer", "H2_SOURCE", { url: result.url, source: h2Source, count: h2s.length });
      const wordCount =
        (((meta.content ?? {}) as Record<string, unknown>).plain_text_word_count as number) ?? 0;

      if (/\/undefined\/?$/i.test(result.url) || /(^|\.)(youtube\.com|youtu\.be|facebook\.com|instagram\.com|tiktok\.com)$/i.test((() => { try { return new URL(result.url).hostname; } catch { return ""; } })())) {
        log("serp-analyzer", "PAGE_SKIPPED", { url: result.url.slice(0, 80), position: result.position, wordCount, reason: "invalid url or video/social page" });
        return null;
      }
      // OFFTOPIC_H2: drop a page's H2s when none of them is about the keyword (related-posts widgets etc.)
      {
        const norm = (x: string) => x.toLowerCase().replace(/tyre/g, "tire");
        const GENERIC = new Set(["how", "what", "make", "change", "build", "create", "best", "guide", "does", "with", "your", "from", "that", "this", "when", "into"]);
        const kwT = norm(keyword).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !GENERIC.has(w) && !/^\d+$/.test(w)).map((w) => w.replace(/s$/, ""));
        if (kwT.length && h2s.length >= 2 && !h2s.some((h) => kwT.some((k) => norm(h).includes(k)))) {
          log("serp-analyzer", "OFFTOPIC_H2", { url: result.url.slice(0, 80), dropped: h2s.slice(0, 5) });
          h2s.splice(0, h2s.length);
        }
      }
      if (wordCount < 300 || /google\.[a-z.]+\/(goto|url)\?/i.test(result.url)) {
        log("serp-analyzer", "PAGE_SKIPPED", { url: result.url.slice(0, 80), position: result.position, wordCount, reason: wordCount < 300 ? "too thin" : "unresolved redirect" });
        return null;
      }
      const structure: PageStructure = {
        url: result.url,
        position: result.position,
        excerpt: pageExcerpt,
        title: result.title,
        h1: (htags.h1?.[0] as string) ?? (meta.title as string) ?? "",
        h2s,
        h3s,
        wordCountEstimate: wordCount,
        hasTable: ((pageItem.page_content as string) ?? "").includes("<table"),
        hasFaq: [...(htags.h2 ?? []), ...(htags.h3 ?? [])].some((h) => /faq|frequently asked|question/i.test(String(h))),
      };

      log("serp-analyzer", "PAGE_STRUCTURE_PARSED", {
        url: result.url,
        position: result.position,
        excerptChars: pageExcerpt.length,
        h2Count: h2s.length,
        h3Count: h3s.length,
        wordCount,
        hasFaq: structure.hasFaq,
        h2s,
      });

      return structure;
    } catch (err) {
      logError("serp-analyzer", "PAGE_STRUCTURE_FAILED", err, { url: result.url });
      return "RETRY";
    }
  };
  // PAGE_POOL: at most WRITER_PAGE_CONCURRENCY (default 3) pages in flight; 8 at once made DataForSEO return
  // empty pages (only 2 of 6 analyzed). A transient failure is retried once. Rank order is preserved.
  const concurrency = Math.max(1, Number(process.env.WRITER_PAGE_CONCURRENCY ?? 3));
  const fetched: (PageStructure | null | undefined)[] = new Array(pageCandidates.length).fill(undefined);
  let nextIdx = 0;
  const okCount = () => fetched.filter(Boolean).length;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (nextIdx < pageCandidates.length && okCount() < 6) {
      const idx = nextIdx++;
      let r = await fetchStructure(pageCandidates[idx]);
      if (r === "RETRY") { await new Promise((res) => setTimeout(res, 2000)); r = await fetchStructure(pageCandidates[idx]); }
      fetched[idx] = r === "RETRY" ? null : r;
    }
  }));
  for (const st of fetched) if (st && pageStructures.length < 6) pageStructures.push(st);
  log("serp-analyzer", "PAGES_SUMMARY", { candidates: pageCandidates.length, attempted: fetched.filter((x) => x !== undefined).length, analyzed: pageStructures.length, withMainText: pageStructures.filter((p) => (p.excerpt ?? "").length > 300).length, concurrency });

  const wordCounts = pageStructures.map((p) => p.wordCountEstimate).filter((w) => w > 0);
  const avgWordCount = (() => {
    if (!wordCounts.length) return 1800;
    const wSorted = [...wordCounts].sort((a, b) => a - b);
    const wMid = Math.floor(wSorted.length / 2);
    return wSorted.length % 2 === 1
      ? wSorted[wMid]
      : Math.round((wSorted[wMid - 1] + wSorted[wMid]) / 2);
  })();

  const allH2s = pageStructures.flatMap((p) => p.h2s.map((h) => h.toLowerCase()));
  const h2Freq: Record<string, number> = {};
  for (const h of allH2s) {
    h2Freq[h] = (h2Freq[h] ?? 0) + 1;
  }
  const commonH2Themes = Object.entries(h2Freq)
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([theme]) => theme);

  const h2Counts = pageStructures.map((p) => p.h2s.length);
  const h2CountRange = {
    min: Math.max(4, Math.min(...h2Counts, 3)),
    max: Math.min(12, Math.max(...h2Counts, 8)),
  };

  // TOPIC_BUDGET: section count follows the length that ranks (~180 words per section at 1.3x the SERP median)
  const plannedWords = Math.round(avgWordCount * 1.3);
  const topicCount = Math.max(5, Math.min(9, Math.round(plannedWords / 180)));
  log("serp-analyzer", "TOPIC_BUDGET", { avgWordCount, plannedWords, topicCount });
  const inferred = await inferTopicsWithGPT(keyword, topResults, pageStructures, peopleAlsoAsk, relatedSearches, topicCount);
  let mustCoverTopics: string[] = inferred.topics.slice(0, 10);
  if (mustCoverTopics.length === 0) mustCoverTopics = commonH2Themes.slice(0, 5);
  log("serp-analyzer", "MUST_COVER_TOPICS", { source: inferred.topics.length ? "gpt+competitors" : "common-h2", mustCoverTopics });

  const consensus = { avgWordCount, commonH2Themes, mustCoverTopics,
      missingTopics: mustCoverTopics, h2CountRange, detectedCategory: inferred.category ?? undefined, topicSubtopics: inferred.subtopics };

  log("serp-analyzer", "CONSENSUS", {
    avgWordCount,
    commonH2Themes,
    mustCoverTopics,
      missingTopics: mustCoverTopics,
    h2CountRange,
    pagesAnalyzed: pageStructures.length,
  });

  return { keyword, topResults, pageStructures, authoritySources, authorityExcerpts, authorityDomains, peopleAlsoAsk, relatedSearches, consensus };
}
