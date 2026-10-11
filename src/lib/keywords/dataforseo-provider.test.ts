import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchSearchVolume, fetchRelatedKeywords, fetchKeywordDifficulty, DataForSEOError } from "./dataforseo-provider";

describe("fetchSearchVolume", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("DATAFORSEO_LOGIN", "test-login");
    vi.stubEnv("DATAFORSEO_PASSWORD", "test-password");
  });

  it("returns an empty array for an empty keyword list without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchSearchVolume([]);
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws DataForSEOError when more than 1000 keywords are requested", async () => {
    const tooMany = Array.from({ length: 1001 }, (_, i) => `kw-${i}`);
    await expect(fetchSearchVolume(tooMany)).rejects.toThrow(DataForSEOError);
  });

  it("parses a successful response into normalized results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status_code: 20000,
          status_message: "Ok.",
          tasks: [
            {
              status_code: 20000,
              status_message: "Ok.",
              result: [
                { keyword: "buy laptop", search_volume: 2900, competition_index: 100, cpc: 7.95 },
              ],
            },
          ],
        }),
      })
    );

    const result = await fetchSearchVolume(["buy laptop"]);
    expect(result).toEqual([
      { keyword: "buy laptop", searchVolume: 2900, competitionIndex: 100, cpc: 7.95 },
    ]);
  });

  it("throws DataForSEOError on a non-ok HTTP response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "Unauthorized" }));
    await expect(fetchSearchVolume(["kw"])).rejects.toThrow(DataForSEOError);
  });

  it("throws DataForSEOError when the top-level status_code is not 20000", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status_code: 40000, status_message: "Bad request.", tasks: [] }),
      })
    );
    await expect(fetchSearchVolume(["kw"])).rejects.toThrow(DataForSEOError);
  });

  it("throws DataForSEOError when the task-level status_code is not 20000", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status_code: 20000,
          status_message: "Ok.",
          tasks: [{ status_code: 40501, status_message: "Invalid Field.", result: null }],
        }),
      })
    );
    await expect(fetchSearchVolume(["kw"])).rejects.toThrow(DataForSEOError);
  });
});

describe("fetchRelatedKeywords", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("DATAFORSEO_LOGIN", "test-login");
    vi.stubEnv("DATAFORSEO_PASSWORD", "test-password");
  });

  it("returns an empty array for a blank keyword without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchRelatedKeywords("   ");
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parses a successful response, excluding the depth-0 seed item", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status_code: 20000,
          status_message: "Ok.",
          tasks: [
            {
              status_code: 20000,
              status_message: "Ok.",
              result: [
                {
                  items: [
                    {
                      depth: 0,
                      keyword_data: {
                        keyword: "seo audit",
                        keyword_info: { search_volume: 1000, competition_level: "MEDIUM", cpc: 5.0 },
                        keyword_properties: { keyword_difficulty: 40 },
                      },
                    },
                    {
                      depth: 1,
                      keyword_data: {
                        keyword: "free seo audit",
                        keyword_info: {
                          search_volume: 480,
                          competition_level: "LOW",
                          cpc: 3.2,
                          monthly_searches: [{ year: 2026, month: 8, search_volume: 480 }],
                          search_volume_trend: { monthly: 2, quarterly: 5, yearly: 10 },
                        },
                        keyword_properties: { keyword_difficulty: 28 },
                      },
                    },
                    {
                      depth: 1,
                      keyword_data: {
                        keyword: "seo audit tool",
                        keyword_info: {
                          search_volume: 320,
                          competition_level: "MEDIUM",
                          cpc: 4.1,
                          monthly_searches: null,
                          search_volume_trend: null,
                        },
                        keyword_properties: { keyword_difficulty: 35 },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        }),
      })
    );

    const result = await fetchRelatedKeywords("seo audit");
    expect(result).toEqual([
      {
        keyword: "free seo audit",
        searchVolume: 480,
        competitionLevel: "LOW",
        cpc: 3.2,
        keywordDifficulty: 28,
        monthlySearches: [{ year: 2026, month: 8, searchVolume: 480 }],
        trend: { monthly: 2, quarterly: 5, yearly: 10 },
      },
      {
        keyword: "seo audit tool",
        searchVolume: 320,
        competitionLevel: "MEDIUM",
        cpc: 4.1,
        keywordDifficulty: 35,
        monthlySearches: [],
        trend: null,
      },
    ]);
  });

  it("parses DataForSEO string SERP result counts without inventing metrics", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status_code: 20000,
        tasks: [{
          status_code: 20000,
          result: [{ items: [{
            depth: 1,
            keyword_data: {
              keyword: "credit monitoring guide",
              keyword_info: null,
              keyword_properties: null,
              serp_info: {
                se_results_count: "1,234",
                serp_item_types: ["organic", "people_also_ask"],
                last_updated_time: "2026-10-11 00:00:00 +00:00",
              },
            },
          }] }],
        }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchRelatedKeywords("credit monitoring", "United States", "English", 1, 20, true);
    expect(result[0]?.serpInfo).toEqual({
      resultCount: 1234,
      features: ["organic", "people_also_ask"],
      updatedAt: "2026-10-11 00:00:00 +00:00",
    });
    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request[0].include_serp_info).toBe(true);
  });

  it("handles missing keyword_info/keyword_properties as nulls", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status_code: 20000,
          status_message: "Ok.",
          tasks: [
            {
              status_code: 20000,
              status_message: "Ok.",
              result: [
                {
                  items: [
                    { depth: 1, keyword_data: { keyword: "orphan keyword", keyword_info: null, keyword_properties: null } },
                  ],
                },
              ],
            },
          ],
        }),
      })
    );

    const result = await fetchRelatedKeywords("seo audit");
    expect(result).toEqual([
      {
        keyword: "orphan keyword",
        searchVolume: null,
        competitionLevel: null,
        cpc: null,
        keywordDifficulty: null,
        monthlySearches: [],
        trend: null,
      },
    ]);
  });

  it("throws DataForSEOError on a non-ok HTTP response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "Unauthorized" }));
    await expect(fetchRelatedKeywords("seo audit")).rejects.toThrow(DataForSEOError);
  });

  it("throws DataForSEOError when the top-level status_code is not 20000", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status_code: 40000, status_message: "Bad request.", tasks: [] }),
      })
    );
    await expect(fetchRelatedKeywords("seo audit")).rejects.toThrow(DataForSEOError);
  });

  it("throws DataForSEOError when the task-level status_code is not 20000", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status_code: 20000,
          status_message: "Ok.",
          tasks: [{ status_code: 40501, status_message: "Invalid Field.", result: null }],
        }),
      })
    );
    await expect(fetchRelatedKeywords("seo audit")).rejects.toThrow(DataForSEOError);
  });

  it("returns an empty array when result/items are missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status_code: 20000,
          status_message: "Ok.",
          tasks: [{ status_code: 20000, status_message: "Ok.", result: null }],
        }),
      })
    );
    const result = await fetchRelatedKeywords("seo audit");
    expect(result).toEqual([]);
  });
});

describe("fetchKeywordDifficulty", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("DATAFORSEO_LOGIN", "test-login");
    vi.stubEnv("DATAFORSEO_PASSWORD", "test-password");
  });

  it("returns an empty array for an empty keyword list without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchKeywordDifficulty([]);
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parses a successful response into normalized results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status_code: 20000,
          status_message: "Ok.",
          tasks: [
            {
              status_code: 20000,
              status_message: "Ok.",
              result: [
                {
                  items: [
                    { keyword: "buy laptop", keyword_difficulty: 72 },
                    { keyword: "laptop deals", keyword_difficulty: 45 },
                  ],
                },
              ],
            },
          ],
        }),
      })
    );

    const result = await fetchKeywordDifficulty(["buy laptop", "laptop deals"]);
    expect(result).toEqual([
      { keyword: "buy laptop", keywordDifficulty: 72 },
      { keyword: "laptop deals", keywordDifficulty: 45 },
    ]);
  });

  it("maps null keyword_difficulty to null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status_code: 20000,
          status_message: "Ok.",
          tasks: [
            {
              status_code: 20000,
              status_message: "Ok.",
              result: [{ items: [{ keyword: "obscure kw", keyword_difficulty: null }] }],
            },
          ],
        }),
      })
    );

    const result = await fetchKeywordDifficulty(["obscure kw"]);
    expect(result).toEqual([{ keyword: "obscure kw", keywordDifficulty: null }]);
  });

  it("returns empty array when result/items are missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status_code: 20000,
          status_message: "Ok.",
          tasks: [{ status_code: 20000, status_message: "Ok.", result: null }],
        }),
      })
    );

    const result = await fetchKeywordDifficulty(["kw"]);
    expect(result).toEqual([]);
  });

  it("throws DataForSEOError on a non-ok HTTP response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "Unauthorized" }));
    await expect(fetchKeywordDifficulty(["kw"])).rejects.toThrow(DataForSEOError);
  });

  it("throws DataForSEOError when the top-level status_code is not 20000", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status_code: 40000, status_message: "Bad request.", tasks: [] }),
      })
    );
    await expect(fetchKeywordDifficulty(["kw"])).rejects.toThrow(DataForSEOError);
  });

  it("throws DataForSEOError when the task-level status_code is not 20000", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status_code: 20000,
          status_message: "Ok.",
          tasks: [{ status_code: 40501, status_message: "Invalid Field.", result: null }],
        }),
      })
    );
    await expect(fetchKeywordDifficulty(["kw"])).rejects.toThrow(DataForSEOError);
  });

  it("batches keywords into chunks of 1000 and merges results", async () => {
    const keywords = Array.from({ length: 1500 }, (_, i) => `kw-${i}`);
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status_code: 20000,
            status_message: "Ok.",
            tasks: [
              {
                status_code: 20000,
                status_message: "Ok.",
                result: [{ items: [{ keyword: `batch-${callCount}`, keyword_difficulty: callCount * 10 }] }],
              },
            ],
          }),
        });
      })
    );

    const result = await fetchKeywordDifficulty(keywords);
    expect(callCount).toBe(2);
    expect(result).toEqual([
      { keyword: "batch-1", keywordDifficulty: 10 },
      { keyword: "batch-2", keywordDifficulty: 20 },
    ]);
  });
});
