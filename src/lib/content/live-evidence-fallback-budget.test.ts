import { describe, expect, it, vi } from "vitest";
import {
  buildClaimEvidenceFallbackQueriesV1,
  discoverClaimEvidenceFallbackSourcesV1,
} from "./live-evidence-verification";

describe("Evidence fallback query budget", () => {
  it("distributes four unique URLs across query variants", async () => {
    const claim = {
      id: "claim-test",
      text: "Credit monitoring tracks changes in your credit report.",
    };

    const expectedQueries = buildClaimEvidenceFallbackQueriesV1({
      primaryQuery: "free credit monitoring",
      claimText: claim.text,
    });

    expect(expectedQueries).toHaveLength(3);

    let queryIndex = 0;

    const search = vi.fn(async (_input: {
      keyword: string;
      locationName: string;
      languageName: string;
    }) => {
      const currentQuery = queryIndex++;

      return {
        organic: Array.from({ length: 10 }, (_, resultIndex) => ({
          url: `https://q${currentQuery}-source${resultIndex}.example.org/page`,
          title: `Result ${resultIndex}`,
        })),
      };
    });

    const sources = await discoverClaimEvidenceFallbackSourcesV1({
      claims: [claim],
      primaryQuery: "free credit monitoring",
      locationName: "United States",
      languageName: "English",
      search,
    });

    expect(search).toHaveBeenCalledTimes(3);
    expect(sources).toHaveLength(4);
    expect(search.mock.calls.map((call) => call[0].keyword))
      .toEqual(expectedQueries);

    const distribution = [0, 0, 0];

    for (const source of sources) {
      const match = source.url.match(/q(\d+)-source/);
      expect(match).not.toBeNull();

      const index = Number(match![1]);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(3);
      distribution[index]++;
    }

    expect(distribution).toEqual([2, 1, 1]);
    expect(new Set(sources.map((source) => source.url)).size).toBe(4);
  });
});
