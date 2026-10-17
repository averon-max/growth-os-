# Observed SEO metric consolidation — verified scope and risks

Date: 2026-10-17. Cleanup branch: `audit/full-repository-inventory-20261016`.

## Duplicate ownership found

Before this change, `production-master-live-stage-planner.ts` contained `resolveMetricsForQuery`, a recursive depth-limited scanner that walks `research.keywordContext` and `research.dataForSeo` once per grounded query. It chooses the **first finite** observation per field and uses exact normalized `keyword` identity.

The production Research Assembler already consumes `production-observed-query-registry.ts`. It recursively collects keyword identities and *sets* of observed finite metrics, with the same source traversal order and the same normalized keyword rule. This registry is also the canonical input to `production-ranking-inputs.ts`. The assembler independently checks that any metric attached to a QueryGraph signal was actually observed.

The two paths had the same intent but were different implementations of one provenance rule. That creates drift risk and repeatedly traverses the same data when many queries are planned.

## Refactor

- Added `resolveCanonicalObservedQueryMetricsV1({registry,normalizedQuery})`, which selects the **first observed value** per metric from the canonical registry, without inferring, inventing or transforming the number.
- The planner now constructs **one** canonical registry from `[research.keywordContext,research.dataForSeo]` before mapping its grounded queries, and selects metrics from that registry instead of scanning research for every query.
- Removed the now-unused local `ResolvedMetrics`, `finiteNumber` and recursive `resolveMetricsForQuery` declarations from the planner. Kept `asRecord` because it is used to parse verified business facts; removing it would damage source verification.
- Did not modify the canonical assembler's fail-closed assertions, query identities, SERP frequency logic, evidence graph, stored article state or any database schema.
- **Zero production files were deleted.** The mandatory deletion gate remains in place for future work.

## Equivalence rationale

Both implementations visit the first research input before the second, recurse into array/record values, stop beyond depth 10, use `keyword` (not arbitrary `query`) as identity, and normalize via NFD/diacritic stripping/lowercase/punctuation/whitespace normalization. The registry inserts `searchVolume` before `volume`, `gscImpressions` before `impressions`, `gscClicks` before `clicks`, and `gscPosition` before `position`. JavaScript Set iteration preserves insertion order, so selecting its first finite value reproduces the old preference.

The new selector returns no metric for unknown queries and no value for missing or nonfinite observations; literal finite zero remains valid. The original assembler metric validation remains an independent barrier.

Six new regression tests check:
1. Field-by-field first finite metric and alias order.
2. KeywordContext followed by DataForSEO, including accented query normalization.
3. Ignoring generic model-output `query` and SERP question fields as keyword evidence.
4. Missing metrics vs real observed zeros and NaN/Infinity.
5. The original recursive maximum depth.
6. Sensitivity to actual source order without nondeterministic selection.

## Explicit remaining limitations and risks

- The static tests cover representative cases, not a formal proof for every possible nested object. Product correctness also requires a real captured keyword research replay and a verified end-to-end article cycle.
- A hard-coded `source: "DATAFORSEO"` and `sourceConfidence: 0.9` still appear in the planner's QueryGraph signal. Since the observed universe can also include keyword context and SERP questions, the provenance labels need **a separate source-origin audit before changing them**. The metric selector change does not address or worsen these labels.
- The registry still accepts any nested record with a `keyword` key. Ensure upstream acquisition snapshots remain trusted; this code alone does not authenticate the origin of arbitrarily nested inputs.
- `normalizeText` in planning and `normalize` in the assembler also have equivalent lexical transformations, but some callers normalize topic/section labels rather than observed keywords. Do not mechanically replace every normalization function until those semantic boundaries are tested.
- The user’s separate local backup Writer branch is not merged into the cleanup branch.

## Validation required

For the exact final commit: deletion gate self-test + check, static dependency graph, `npx tsc --noEmit`, `npx vitest run`, `npm run build`. No live provider calls or database writes are part of this change.
