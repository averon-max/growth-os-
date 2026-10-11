const DATAFORSEO_API_BASE = "https://api.dataforseo.com/v3";
const DATAFORSEO_TIMEOUT_MS = 20000;
const DATAFORSEO_MAX_KEYWORDS_PER_REQUEST = 1000;

export class DataForSEOError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataForSEOError";
  }
}

interface DataForSEOResultItem {
  keyword: string;
  search_volume: number | null;
  competition_index: number | null;
  cpc: number | null;
}

interface DataForSEOTask {
  status_code: number;
  status_message: string;
  result: DataForSEOResultItem[] | null;
}

interface DataForSEOResponse {
  status_code: number;
  status_message: string;
  tasks: DataForSEOTask[];
}

export interface KeywordVolumeResult {
  keyword: string;
  searchVolume: number | null;
  competitionIndex: number | null;
  cpc: number | null;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function buildAuthHeader(): string {
  const login = requireEnv("DATAFORSEO_LOGIN");
  const password = requireEnv("DATAFORSEO_PASSWORD");
  return Buffer.from(`${login}:${password}`).toString("base64");
}

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRetry(auth: string, locationName: string, languageName: string, keywords: string[]): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DATAFORSEO_TIMEOUT_MS);

    try {
      const res = await fetch(`${DATAFORSEO_API_BASE}/keywords_data/google_ads/search_volume/live`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([{ location_name: locationName, language_name: languageName, keywords }]),
      });

      if (res.status !== 429 || attempt === MAX_RETRIES) {
        return res;
      }

      const retryAfterHeader = res.headers.get("Retry-After");
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : BASE_BACKOFF_MS * 2 ** attempt;
      await sleep(retryAfterMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new DataForSEOError("DataForSEO rate limit exceeded after retries");
}

export interface MonthlySearchPoint {
  year: number;
  month: number;
  searchVolume: number;
}

export interface SearchVolumeTrend {
  monthly: number | null;
  quarterly: number | null;
  yearly: number | null;
}

export interface RelatedKeywordResult {
  keyword: string;
  /** Optional lightweight SERP observations returned with the Labs query. */
  serpInfo?: {
    resultCount: number | null;
    features: string[];
    updatedAt: string | null;
  } | null;
  searchVolume: number | null;
  competitionLevel: string | null;
  cpc: number | null;
  keywordDifficulty: number | null;
  monthlySearches: MonthlySearchPoint[];
  trend: SearchVolumeTrend | null;
}

interface DataForSEOMonthlySearch {
  year: number;
  month: number;
  search_volume: number;
}

interface DataForSEOSearchVolumeTrend {
  monthly: number | null;
  quarterly: number | null;
  yearly: number | null;
}

interface DataForSEORelatedKeywordInfo {
  search_volume: number | null;
  competition_level: string | null;
  cpc: number | null;
  monthly_searches: DataForSEOMonthlySearch[] | null;
  search_volume_trend: DataForSEOSearchVolumeTrend | null;
}

interface DataForSEORelatedKeywordProperties {
  keyword_difficulty: number | null;
}

interface DataForSEORelatedKeywordData {
  keyword: string;
  serp_info?: {
    se_results_count: number | null;
    serp_item_types: string[] | null;
    last_updated_time: string | null;
  } | null;
  keyword_info: DataForSEORelatedKeywordInfo | null;
  keyword_properties: DataForSEORelatedKeywordProperties | null;
}

interface DataForSEORelatedItem {
  depth: number;
  keyword_data: DataForSEORelatedKeywordData;
}

interface DataForSEORelatedResult {
  items: DataForSEORelatedItem[] | null;
}

interface DataForSEORelatedTask {
  status_code: number;
  status_message: string;
  result: DataForSEORelatedResult[] | null;
}

interface DataForSEORelatedResponse {
  status_code: number;
  status_message: string;
  tasks: DataForSEORelatedTask[];
}

async function requestRelatedWithRetry(
  auth: string,
  keyword: string,
  locationName: string,
  languageName: string,
  depth: number,
  limit: number,
  includeSerpInfo: boolean
): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DATAFORSEO_TIMEOUT_MS);

    try {
      const res = await fetch(`${DATAFORSEO_API_BASE}/dataforseo_labs/google/related_keywords/live`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            keyword,
            location_name: locationName,
            language_name: languageName,
            depth,
            limit,
            ...(includeSerpInfo ? { include_serp_info: true } : {}),
          },
        ]),
      });

      if (res.status !== 429 || attempt === MAX_RETRIES) {
        return res;
      }

      const retryAfterHeader = res.headers.get("Retry-After");
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : BASE_BACKOFF_MS * 2 ** attempt;
      await sleep(retryAfterMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new DataForSEOError("DataForSEO rate limit exceeded after retries");
}

/**
 * Fetches related keywords with real search-volume/CPC/difficulty metrics
 * for each result. Uses depth=1 by default: the seed keyword itself is
 * excluded (depth 0), only its direct related keywords (depth 1) are
 * returned, each with full DataForSEO Labs metrics attached.
 */
export async function fetchRelatedKeywords(
  keyword: string,
  locationName = "United States",
  languageName = "English",
  depth = 1,
  limit = 30,
  includeSerpInfo = false
): Promise<RelatedKeywordResult[]> {
  if (!keyword.trim()) return [];

  const auth = buildAuthHeader();
  const res = await requestRelatedWithRetry(auth, keyword, locationName, languageName, depth, limit, includeSerpInfo);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new DataForSEOError(`DataForSEO HTTP error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as DataForSEORelatedResponse;

  if (data.status_code !== 20000) {
    throw new DataForSEOError(`DataForSEO API error: ${data.status_message}`);
  }

  const task = data.tasks[0];
  if (!task || task.status_code !== 20000) {
    throw new DataForSEOError(`DataForSEO task error: ${task?.status_message ?? "no task returned"}`);
  }

  const items = task.result?.[0]?.items ?? [];

  return items
    .filter((item) => item.depth > 0)
    .map((item) => {
      const info = item.keyword_data.keyword_info;
      return {
        keyword: item.keyword_data.keyword,
        ...(includeSerpInfo ? {
          serpInfo: item.keyword_data.serp_info ? {
            resultCount: item.keyword_data.serp_info.se_results_count ?? null,
            features: item.keyword_data.serp_info.serp_item_types ?? [],
            updatedAt: item.keyword_data.serp_info.last_updated_time ?? null,
          } : null,
        } : {}),
        searchVolume: info?.search_volume ?? null,
        competitionLevel: info?.competition_level ?? null,
        cpc: info?.cpc ?? null,
        keywordDifficulty: item.keyword_data.keyword_properties?.keyword_difficulty ?? null,
        monthlySearches: (info?.monthly_searches ?? []).map((m) => ({
          year: m.year,
          month: m.month,
          searchVolume: m.search_volume,
        })),
        trend: info?.search_volume_trend
          ? {
              monthly: info.search_volume_trend.monthly,
              quarterly: info.search_volume_trend.quarterly,
              yearly: info.search_volume_trend.yearly,
            }
          : null,
      };
    });
}


function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

export interface KeywordDifficultyResult {
  keyword: string;
  keywordDifficulty: number | null;
}

async function requestKeywordDifficultyWithRetry(
  auth: string,
  locationName: string,
  languageName: string,
  keywords: string[]
): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DATAFORSEO_TIMEOUT_MS);

    try {
      const res = await fetch(`${DATAFORSEO_API_BASE}/dataforseo_labs/google/bulk_keyword_difficulty/live`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([{ keywords, location_name: locationName, language_name: languageName }]),
      });

      if (res.status !== 429 || attempt === MAX_RETRIES) {
        return res;
      }

      const retryAfterHeader = res.headers.get("Retry-After");
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : BASE_BACKOFF_MS * 2 ** attempt;
      await sleep(retryAfterMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new DataForSEOError("DataForSEO rate limit exceeded after retries");
}

export async function fetchKeywordDifficulty(
  keywords: string[],
  locationName = "United States",
  languageName = "English"
): Promise<KeywordDifficultyResult[]> {
  if (keywords.length === 0) return [];

  const auth = buildAuthHeader();
  const batches = chunk(keywords, 1000);
  const output: KeywordDifficultyResult[] = [];

  for (const batch of batches) {
    const res = await requestKeywordDifficultyWithRetry(auth, locationName, languageName, batch);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new DataForSEOError(`DataForSEO HTTP error ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = await res.json();

    if (data.status_code !== 20000) {
      throw new DataForSEOError(`DataForSEO API error: ${data.status_message}`);
    }

    const task = data.tasks?.[0];
    if (!task || task.status_code !== 20000) {
      throw new DataForSEOError(`DataForSEO task error: ${task?.status_message ?? "no task returned"}`);
    }

    const rows = task.result?.[0]?.items ?? [];

    for (const item of rows) {
      output.push({
        keyword: item.keyword,
        keywordDifficulty: item.keyword_difficulty ?? null,
      });
    }
  }

  return output;
}

export async function fetchSearchVolume(
  keywords: string[],
  locationName = "United States",
  languageName = "English"
): Promise<KeywordVolumeResult[]> {
  if (keywords.length === 0) return [];
  if (keywords.length > DATAFORSEO_MAX_KEYWORDS_PER_REQUEST) {
    throw new DataForSEOError(`Cannot request more than ${DATAFORSEO_MAX_KEYWORDS_PER_REQUEST} keywords in one call`);
  }

  const auth = buildAuthHeader();
  const res = await requestWithRetry(auth, locationName, languageName, keywords);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new DataForSEOError(`DataForSEO HTTP error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as DataForSEOResponse;

  if (data.status_code !== 20000) {
    throw new DataForSEOError(`DataForSEO API error: ${data.status_message}`);
  }

  const task = data.tasks[0];
  if (!task || task.status_code !== 20000) {
    throw new DataForSEOError(`DataForSEO task error: ${task?.status_message ?? "no task returned"}`);
  }

  return (task.result ?? []).map((r) => ({
    keyword: r.keyword,
    searchVolume: r.search_volume,
    competitionIndex: r.competition_index,
    cpc: r.cpc,
  }));
}

export interface RankedKeywordResult {
  keyword: string;
  searchVolume: number | null;
  cpc: number | null;
  keywordDifficulty: number | null;
  rankGroup: number | null;
  relativeUrl: string | null;
}

interface DataForSEORankedSerpItem {
  type: string;
  rank_group: number | null;
  relative_url: string | null;
}

interface DataForSEORankedSerpElement {
  serp_item: DataForSEORankedSerpItem | null;
}

interface DataForSEORankedItem {
  keyword_data: DataForSEORelatedKeywordData;
  ranked_serp_element: DataForSEORankedSerpElement | null;
}

interface DataForSEORankedResult {
  items: DataForSEORankedItem[] | null;
}

interface DataForSEORankedTask {
  status_code: number;
  status_message: string;
  result: DataForSEORankedResult[] | null;
}

interface DataForSEORankedResponse {
  status_code: number;
  status_message: string;
  tasks: DataForSEORankedTask[];
}

async function requestRankedWithRetry(
  auth: string,
  targetDomain: string,
  locationName: string,
  languageName: string,
  limit: number
): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DATAFORSEO_TIMEOUT_MS);

    try {
      const res = await fetch(`${DATAFORSEO_API_BASE}/dataforseo_labs/google/ranked_keywords/live`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            target: targetDomain,
            location_name: locationName,
            language_name: languageName,
            item_types: ["organic"],
            filters: [["keyword_data.keyword_info.search_volume", ">", 0]],
            order_by: ["keyword_data.keyword_info.search_volume,desc"],
            limit,
          },
        ]),
      });

      if (res.status !== 429 || attempt === MAX_RETRIES) {
        return res;
      }

      const retryAfterHeader = res.headers.get("Retry-After");
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : BASE_BACKOFF_MS * 2 ** attempt;
      await sleep(retryAfterMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new DataForSEOError("DataForSEO rate limit exceeded after retries");
}

/**
 * Fetches the organic keywords a competitor domain currently ranks for,
 * sorted by search volume. `target` must be a bare domain (no https:///www)
 * to get whole-domain results rather than a single page -- see DataForSEO
 * Labs Ranked Keywords docs.
 */
export async function fetchRankedKeywords(
  targetDomain: string,
  locationName = "United States",
  languageName = "English",
  limit = 50
): Promise<RankedKeywordResult[]> {
  if (!targetDomain.trim()) return [];

  const auth = buildAuthHeader();
  const res = await requestRankedWithRetry(auth, targetDomain, locationName, languageName, limit);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new DataForSEOError(`DataForSEO HTTP error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as DataForSEORankedResponse;

  if (data.status_code !== 20000) {
    throw new DataForSEOError(`DataForSEO API error: ${data.status_message}`);
  }

  const task = data.tasks[0];
  if (!task || task.status_code !== 20000) {
    throw new DataForSEOError(`DataForSEO task error: ${task?.status_message ?? "no task returned"}`);
  }

  const items = task.result?.[0]?.items ?? [];

  return items.map((item) => ({
    keyword: item.keyword_data.keyword,
    searchVolume: item.keyword_data.keyword_info?.search_volume ?? null,
    cpc: item.keyword_data.keyword_info?.cpc ?? null,
    keywordDifficulty: item.keyword_data.keyword_properties?.keyword_difficulty ?? null,
    rankGroup: item.ranked_serp_element?.serp_item?.rank_group ?? null,
    relativeUrl: item.ranked_serp_element?.serp_item?.relative_url ?? null,
  }));
}
