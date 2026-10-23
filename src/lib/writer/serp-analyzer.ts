import { log, logError } from "./logger";

export interface SerpResult {
  position: number;
  url: string;
  title: string;
  description: string;
}

export interface PageStructure {
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
  consensus: {
    avgWordCount: number;
    commonH2Themes: string[];
    mustCoverTopics: string[];
    h2CountRange: { min: number; max: number };
  };
}

export async function analyzeSERP(
  keyword: string,
  dataForSeoLogin: string,
  dataForSeoPassword: string
): Promise<SerpAnalysis> {
  log("serp-analyzer", "START", { keyword });

  const credentials = Buffer.from(`${dataForSeoLogin}:${dataForSeoPassword}`).toString("base64");

  // 1. Получаем SERP топ-10
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
        body: JSON.stringify([
          {
            keyword,
            language_code: "en",
            location_code: 2840,
            depth: 10,
          },
        ]),
      }
    );
    serpData = await res.json();
    log("serp-analyzer", "SERP_FETCHED", {
      status: (serpData as Record<string, unknown>).status_code,
    });
  } catch (err) {
    logError("serp-analyzer", "SERP_FETCH_FAILED", err, { keyword });
    throw err;
  }

  // 2. Парсим топ результаты
  const tasks = ((serpData as Record<string, unknown>).tasks as Record<string, unknown>[]) ?? [];
  const result = (tasks[0]?.result as Record<string, unknown>[])?.[0];
  const rawItems = (result?.items as Record<string, unknown>[]) ?? [];

  const topResults: SerpResult[] = rawItems
    .filter((i) => i.type === "organic")
    .slice(0, 10)
    .map((i) => ({
      position: i.rank_absolute as number,
      url: i.url as string,
      title: i.title as string,
      description: i.description as string,
    }));

  log("serp-analyzer", "TOP_RESULTS_PARSED", {
    count: topResults.length,
    urls: topResults.map((r) => r.url),
  });

  // 3. Для каждого URL получаем структуру через DataForSEO On-Page
  const pageStructures: PageStructure[] = [];

  for (const result of topResults.slice(0, 5)) {
    log("serp-analyzer", "FETCHING_PAGE_STRUCTURE", { url: result.url });
    try {
      const pageRes = await fetch(
        "https://api.dataforseo.com/v3/on_page/instant_pages",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([
            {
              url: result.url,
              fetch_page_content: false,
              enable_javascript: false,
            },
          ]),
        }
      );
      const pageData = await pageRes.json() as Record<string, unknown>;
      const pageTasks = (pageData.tasks as Record<string, unknown>[]) ?? [];
      const pageResult = (pageTasks[0]?.result as Record<string, unknown>[])?.[0];
      const pageItem = (pageResult?.items as Record<string, unknown>[])?.[0];

      if (!pageItem) {
        log("serp-analyzer", "PAGE_STRUCTURE_EMPTY", { url: result.url });
        continue;
      }

      const h2s = ((pageItem.headings as Record<string, unknown>[]) ?? [])
        .filter((h) => h.level === 2)
        .map((h) => h.text as string);

      const h3s = ((pageItem.headings as Record<string, unknown>[]) ?? [])
        .filter((h) => h.level === 3)
        .map((h) => h.text as string);

      const wordCount = (pageItem.content_info as Record<string, unknown>)?.words_count as number ?? 0;

      const structure: PageStructure = {
        url: result.url,
        title: result.title,
        h1: (pageItem.main_headline as string) ?? "",
        h2s,
        h3s,
        wordCountEstimate: wordCount,
        hasTable: ((pageItem.page_content as string) ?? "").includes("<table"),
        hasFaq: h2s.some((h) => h.toLowerCase().includes("faq") || h.toLowerCase().includes("question")),
      };

      log("serp-analyzer", "PAGE_STRUCTURE_PARSED", {
        url: result.url,
        h2Count: h2s.length,
        h3Count: h3s.length,
        wordCount,
        hasFaq: structure.hasFaq,
        h2s,
      });

      pageStructures.push(structure);
    } catch (err) {
      logError("serp-analyzer", "PAGE_STRUCTURE_FAILED", err, { url: result.url });
    }
  }

  // 4. Консенсус по структуре
  const wordCounts = pageStructures.map((p) => p.wordCountEstimate).filter((w) => w > 0);
  const avgWordCount = wordCounts.length
    ? Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length)
    : 1800;

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
    min: Math.min(...h2Counts, 3),
    max: Math.max(...h2Counts, 8),
  };

  const mustCoverTopics = commonH2Themes.slice(0, 5);

  const consensus = { avgWordCount, commonH2Themes, mustCoverTopics, h2CountRange };

  log("serp-analyzer", "CONSENSUS", {
    avgWordCount,
    commonH2Themes,
    mustCoverTopics,
    h2CountRange,
    pagesAnalyzed: pageStructures.length,
  });

  return { keyword, topResults, pageStructures, consensus };
}
