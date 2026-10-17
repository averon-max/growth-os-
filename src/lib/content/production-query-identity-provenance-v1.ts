import {
  buildCanonicalObservedQueryRegistry,
  normalizeObservedQuery,
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
