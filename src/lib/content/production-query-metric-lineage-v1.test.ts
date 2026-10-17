import { describe, expect, it } from "vitest";
import {
  buildProductionQueryProvenanceRegistryV1,
  resolveProductionMetricLineageV1,
} from "./production-query-identity-provenance-v1";
import {
  buildCanonicalObservedQueryRegistry,
  resolveCanonicalObservedQueryMetricsV1,
} from "./production-observed-query-registry";

function inspect(
  query: string,
  keywordContext: unknown,
  dataForSeo: unknown,
) {
  const sourceRegistry = buildProductionQueryProvenanceRegistryV1({
    keywordContext, dataForSeo,
  });
  const selectedMetrics = resolveCanonicalObservedQueryMetricsV1({
    registry: buildCanonicalObservedQueryRegistry([keywordContext, dataForSeo]),
    normalizedQuery: query,
  });
  const lineage = resolveProductionMetricLineageV1({
    query, registry: sourceRegistry, selectedMetrics,
  });
  return { lineage, selectedMetrics };
}

describe("production per-metric observed provenance", () => {
  it("distinguishes GSC snapshot metrics from live DataForSEO volume and CPC", () => {
    const { lineage, selectedMetrics } = inspect(
      "credit monitoring",
      { topKeywords: [{ keyword: "credit monitoring",
        position: 4.2, clicks: 12, impressions: 250, volume: null }] },
      { searchVolume: [{ keyword: "credit monitoring",
        searchVolume: 480, cpc: 2.4 }] },
    );
    expect(selectedMetrics).toEqual({
      searchVolume: 480, cpc: 2.4,
      gscImpressions: 250, gscClicks: 12, gscPosition: 4.2,
    });
    expect(lineage.searchVolume).toEqual({
      value: 480, container: "DATAFORSEO_RESPONSE", meaning: "DATAFORSEO_METRIC",
    });
    expect(lineage.cpc?.container).toBe("DATAFORSEO_RESPONSE");
    expect(lineage.gscImpressions?.meaning).toBe("GSC_SNAPSHOT");
    expect(lineage.gscClicks?.meaning).toBe("GSC_SNAPSHOT");
    expect(lineage.gscPosition?.meaning).toBe("GSC_SNAPSHOT");
  });

  it("does not mislabel cached Keyword table volume as a GSC observation", () => {
    const { lineage, selectedMetrics } = inspect(
      "credit monitoring",
      { topKeywords: [{ keyword: "credit monitoring", volume: 1500,
        clicks: 0, impressions: 0, position: 0 }] },
      { searchVolume: [{ keyword: "credit monitoring", searchVolume: 480,
        cpc: 1.1 }] },
    );
    expect(selectedMetrics.searchVolume).toBe(1500);
    expect(lineage.searchVolume).toEqual({
      value: 1500,
      container: "WEBSITE_KEYWORD_CONTEXT",
      meaning: "KEYWORD_TABLE_CACHED_PROVIDER_UNVERIFIED",
    });
    expect(lineage.gscClicks?.value).toBe(0);
    expect(lineage.gscPosition?.value).toBe(0);
    expect(lineage.cpc?.meaning).toBe("DATAFORSEO_METRIC");
  });

  it("preserves existing source-order precedence with an identical value in both containers", () => {
    const { lineage } = inspect("test",
      { topKeywords: [{ keyword: "TEST", volume: 100 }] },
      { searchVolume: [{ keyword: "test", searchVolume: 100 }] },
    );
    expect(lineage.searchVolume?.container).toBe("WEBSITE_KEYWORD_CONTEXT");
    expect(lineage.searchVolume?.value).toBe(100);
  });

  it("does not claim unverified DataForSEO-position fields are actual GSC snapshots", () => {
    const { lineage } = inspect("test", { topKeywords: [] },
      { relatedKeywords: [{ keyword: "test", position: 8, impressions: 90 }] },
    );
    expect(lineage.gscImpressions?.meaning).toBe("DATAFORSEO_FIELD_NOT_GSC_VERIFIED");
    expect(lineage.gscPosition?.meaning).toBe("DATAFORSEO_FIELD_NOT_GSC_VERIFIED");
  });

  it("preserves missing metrics as missing lineage entries", () => {
    const { lineage, selectedMetrics } = inspect("test",
      { topKeywords: [{ keyword: "test" }] }, { searchVolume: [] },
    );
    expect(selectedMetrics).toEqual({});
    expect(lineage).toEqual({});
  });

  it("refuses a selected number that neither acquisition record supports", () => {
    const registry = buildProductionQueryProvenanceRegistryV1({
      keywordContext: { topKeywords: [] },
      dataForSeo: { searchVolume: [{ keyword: "test", searchVolume: 40 }] },
    });
    expect(() => resolveProductionMetricLineageV1({
      query: "test", registry, selectedMetrics: { searchVolume: 9000 },
    })).toThrow("PRODUCTION_SELECTED_METRIC_SOURCE_NOT_FOUND:searchVolume");
    expect(() => resolveProductionMetricLineageV1({
      query: "test", registry, selectedMetrics: { searchVolume: Infinity },
    })).toThrow("PRODUCTION_SELECTED_METRIC_NONFINITE:searchVolume");
  });
});
