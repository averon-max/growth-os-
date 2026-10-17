import { describe, expect, it } from "vitest";
import {
  buildCanonicalObservedQueryRegistry,
  normalizeObservedQuery,
  resolveCanonicalObservedQueryMetricsV1,
} from "./production-observed-query-registry";

function pick(values: readonly unknown[], query: string) {
  return resolveCanonicalObservedQueryMetricsV1({
    registry: buildCanonicalObservedQueryRegistry(values),
    normalizedQuery: query,
  });
}

describe("canonical metric selection matches legacy planner behavior", () => {
  it("chooses first valid metric for each field, observing alias preference", () => {
    const values = [{
      rows: [
        { keyword: "Credit Monitoring", searchVolume: 480, volume: 999,
          cpc: 0, impressions: 1400, clicks: 0, position: 2.5 },
        { keyword: "credit monitoring", searchVolume: 800, cpc: 3.2,
          gscImpressions: 2200, gscClicks: 40, gscPosition: 5.1 },
      ],
    }];
    expect(pick(values, "credit monitoring")).toEqual({
      searchVolume: 480, cpc: 0,
      gscImpressions: 1400, gscClicks: 0, gscPosition: 2.5,
    });
  });

  it("preserves independently observed fields across keywordContext and DataForSEO", () => {
    const inputs = [
      { records: [{ keyword: "qué es crédito monitoring", impressions: 50,
        searchVolume: null, cpc: Number.NaN }] },
      { records: [{ keyword: "que es credito monitoring", volume: 30,
        cpc: 1.75, clicks: 8, position: 6.4 }] },
    ];
    expect(normalizeObservedQuery("QUÉ es crédito monitoring"))
      .toBe("que es credito monitoring");
    expect(pick(inputs, "que es credito monitoring")).toEqual({
      searchVolume: 30, cpc: 1.75,
      gscImpressions: 50, gscClicks: 8, gscPosition: 6.4,
    });
  });

  it("never assigns metrics to an unobserved or model-only query", () => {
    const registry = buildCanonicalObservedQueryRegistry([
      { model: { query: "invented query", volume: 9000 } },
      { searchFeature: { question: "Is monitoring useful?", volume: 200 } },
      { keyword: "observed", searchVolume: 75 },
    ]);
    expect(registry.queryStrings.has("invented query")).toBe(false);
    expect(resolveCanonicalObservedQueryMetricsV1({
      registry, normalizedQuery: "invented query",
    })).toEqual({});
    expect(resolveCanonicalObservedQueryMetricsV1({
      registry, normalizedQuery: "Is monitoring useful?",
    })).toEqual({});
  });

  it("preserves absent fields instead of making up zero, and handles finite zero", () => {
    expect(pick([{ keyword: "something" }], "something")).toEqual({});
    expect(pick([{ keyword: "something", volume: 0, cpc: 0,
      clicks: Number.POSITIVE_INFINITY, position: Number.NEGATIVE_INFINITY,
    }], "something")).toEqual({ searchVolume: 0, cpc: 0 });
  });

  it("does not collect values beyond the existing recursion-depth guard", () => {
    let tooDeep: unknown = { keyword: "deep query", searchVolume: 100 };
    for (let i = 0; i < 12; i++) tooDeep = { nested: tooDeep };
    expect(pick([tooDeep], "deep query")).toEqual({});
  });

  it("selects a fresh isolated set of values per registry and source order", () => {
    const a = [{ keyword: "test", volume: 10 }];
    const b = [{ keyword: "test", searchVolume: 20 }];
    expect(pick([a, b], "test")).toEqual({ searchVolume: 10 });
    expect(pick([b, a], "test")).toEqual({ searchVolume: 20 });
  });
});
