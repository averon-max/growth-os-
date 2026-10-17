import {
  buildCanonicalObservedQueryRegistry,
  normalizeObservedQuery,
  resolveCanonicalObservedQueryMetricsV1,
} from "./production-observed-query-registry";

import type {
  CanonicalObservedQueryRegistry,
} from "./production-observed-query-registry";

import type { QuerySource } from "./query-graph";

/**
 * Query identity can be independently observed in the website's GSC-backed
 * KeywordSnapshot context or a live DataForSEO response.
 *
 * QuerySignalInput.source has one source, so a dual-observed keyword is
 * assigned DATAFORSEO for backward-compatible priority. Presence is recorded
 * separately: NEVER infer source solely from model-selected wording.
 *
 * This classifies QUERY IDENTITY only, not the origin of each metric.
 * Website KeywordContext also carries keyword table volume/difficulty,
 * which may have been imported from other providers.
 */
export interface ProductionQueryIdentityProvenanceV1 {
  readonly source: Extract<QuerySource, "DATAFORSEO" | "GSC">;
  readonly observedInDataForSeo: boolean;
  readonly observedInGscContext: boolean;
}

export interface ProductionQueryProvenanceRegistryV1 {
  readonly dataForSeo: CanonicalObservedQueryRegistry;
  readonly gscContext: CanonicalObservedQueryRegistry;
}

export function buildProductionQueryProvenanceRegistryV1({
  keywordContext,
  dataForSeo,
}: {
  keywordContext: unknown;
  dataForSeo: unknown;
}): Readonly<ProductionQueryProvenanceRegistryV1> {
  return Object.freeze({
    dataForSeo: buildCanonicalObservedQueryRegistry([dataForSeo]),
    gscContext: buildCanonicalObservedQueryRegistry([keywordContext]),
  });
}

export function resolveProductionQueryIdentityProvenanceV1({
  query,
  registry,
}: {
  query: string;
  registry: Readonly<ProductionQueryProvenanceRegistryV1>;
}): Readonly<ProductionQueryIdentityProvenanceV1> | null {
  const normalized = normalizeObservedQuery(query);
  if (!normalized) return null;

  const observedInDataForSeo = registry.dataForSeo.queryStrings.has(normalized);
  const observedInGscContext = registry.gscContext.queryStrings.has(normalized);
  if (!observedInDataForSeo && !observedInGscContext) return null;

  return Object.freeze({
    source: observedInDataForSeo ? "DATAFORSEO" : "GSC",
    observedInDataForSeo,
    observedInGscContext,
  });
}

/**
 * Provenance of the SELECTED metric value, not merely the query identity.
 *
 * The canonical merged metric registry chooses the first finite value from
 * website KeywordContext before DataForSEO, independently for each field.
 * This function documents which acquisition container supplied that exact
 * selected value. It NEVER changes selected metric values or QueryGraph
 * sourceConfidence.
 */
export type ProductionMetricKeyV1 =
  | "searchVolume"
  | "cpc"
  | "gscImpressions"
  | "gscClicks"
  | "gscPosition";

export type ProductionMetricContainerV1 =
  | "WEBSITE_KEYWORD_CONTEXT"
  | "DATAFORSEO_RESPONSE";

export type ProductionMetricMeaningV1 =
  | "GSC_SNAPSHOT"
  | "KEYWORD_TABLE_CACHED_PROVIDER_UNVERIFIED"
  | "KEYWORD_CONTEXT_FIELD_UNVERIFIED"
  | "DATAFORSEO_METRIC"
  | "DATAFORSEO_FIELD_NOT_GSC_VERIFIED";

export interface ProductionMetricLineageEntryV1 {
  readonly value: number;
  readonly container: ProductionMetricContainerV1;
  readonly meaning: ProductionMetricMeaningV1;
}

export type ProductionMetricLineageV1 = Readonly<
  Partial<Record<ProductionMetricKeyV1, Readonly<ProductionMetricLineageEntryV1>>>
>;

const OBSERVED_METRIC_KEYS_V1: readonly ProductionMetricKeyV1[] = [
  "searchVolume",
  "cpc",
  "gscImpressions",
  "gscClicks",
  "gscPosition",
];

export function resolveProductionMetricLineageV1({
  query,
  registry,
  selectedMetrics,
}: {
  query: string;
  registry: Readonly<ProductionQueryProvenanceRegistryV1>;
  selectedMetrics: Readonly<Partial<Record<ProductionMetricKeyV1, number>>>;
}): ProductionMetricLineageV1 {
  const normalizedQuery = normalizeObservedQuery(query);
  const contextMetrics = resolveCanonicalObservedQueryMetricsV1({
    registry: registry.gscContext,
    normalizedQuery,
  });
  const dataForSeoMetrics = resolveCanonicalObservedQueryMetricsV1({
    registry: registry.dataForSeo,
    normalizedQuery,
  });

  const entries: Partial<Record<ProductionMetricKeyV1, ProductionMetricLineageEntryV1>> = {};
  for (const key of OBSERVED_METRIC_KEYS_V1) {
    const value = selectedMetrics[key];
    if (value === undefined) continue;
    if (!Number.isFinite(value)) {
      throw new Error(`PRODUCTION_SELECTED_METRIC_NONFINITE:${key}`);
    }
    const fromContext = contextMetrics[key] === value;
    const fromDataForSeo = dataForSeoMetrics[key] === value;
    if (!fromContext && !fromDataForSeo) {
      throw new Error(`PRODUCTION_SELECTED_METRIC_SOURCE_NOT_FOUND:${key}`);
    }

    const isGscField =
      key === "gscImpressions" ||
      key === "gscClicks" ||
      key === "gscPosition";
    const container: ProductionMetricContainerV1 = fromContext
      ? "WEBSITE_KEYWORD_CONTEXT" : "DATAFORSEO_RESPONSE";
    const meaning: ProductionMetricMeaningV1 = fromContext
      ? isGscField
        ? "GSC_SNAPSHOT"
        : key === "searchVolume"
          ? "KEYWORD_TABLE_CACHED_PROVIDER_UNVERIFIED"
          : "KEYWORD_CONTEXT_FIELD_UNVERIFIED"
      : isGscField
        ? "DATAFORSEO_FIELD_NOT_GSC_VERIFIED"
        : "DATAFORSEO_METRIC";
    entries[key] = Object.freeze({ value, container, meaning });
  }

  return Object.freeze(entries);
}
