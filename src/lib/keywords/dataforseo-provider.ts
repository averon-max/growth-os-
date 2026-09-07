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
  limit: number
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
  limit = 30
): Promise<RelatedKeywordResult[]> {
  if (!keyword.trim()) return [];

  const auth = buildAuthHeader();
  const res = await requestRelatedWithRetry(auth, keyword, locationName, languageName, depth, limit);

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
