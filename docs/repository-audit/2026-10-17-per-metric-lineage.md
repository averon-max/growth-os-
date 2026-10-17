# Writer per-metric SEO lineage — 17 October 2026

## Question and source-level findings

The prior QueryGraph provenance refactor correctly classifies **query identity** as `GSC` or `DATAFORSEO`. That source label is not, and cannot be, proof of the origin of **every attached metric**.

Grounding was checked against:

- `keyword-context.ts`, which loads `WebsiteKeywordContext.topKeywords` from workspace Keyword rows and market/source-filtered GSC `KeywordSnapshot` rows.
- `production-master-live-source-adapter.ts`, which calls DataForSEO `fetchRelatedKeywords`, `fetchSearchVolume`, `fetchKeywordDifficulty` separately for the current market, and retrieves GSC-backed keyword context.
- `production-observed-query-registry.ts`, which deterministically selects the **first finite** numeric observation per field from website keyword context *before* DataForSEO; 0 is a valid observed value, and missing values stay missing.
- `production-master-live-stage-planner.ts`, which uses those selected numbers in QueryGraph. Changing provider-confidence heuristics or numeric ranking would be a separate risky refactor.

The important distinction is that a `WebsiteKeywordContextItem.volume` value comes from the cached `Keyword.volume` table column. Its original data provider is **not established by the GSC snapshot** used to associate that keyword with this website. It would be misleading to label that cached volume as a GSC-derived search volume. Conversely, the `KeywordSnapshot` position, clicks and impressions are GSC-backed, subject to the earlier source/country isolation check.

## Minimal extension without changing ranking behavior

Added `resolveProductionMetricLineageV1` to the existing `production-query-identity-provenance-v1.ts` boundary. For an already-selected metric it compares the selected finite value to the separately acquired context and DataForSEO registries. The union registry's existing first-value rule remains unchanged. The origin is described by two fields:

- `container` = `WEBSITE_KEYWORD_CONTEXT` or `DATAFORSEO_RESPONSE`.
- `meaning` = `GSC_SNAPSHOT`, `KEYWORD_TABLE_CACHED_PROVIDER_UNVERIFIED`, `KEYWORD_CONTEXT_FIELD_UNVERIFIED`, `DATAFORSEO_METRIC` or `DATAFORSEO_FIELD_NOT_GSC_VERIFIED`.

For identical values present in both containers, website keyword context takes precedence, matching the existing selection order.

This is **acquisition-container lineage**, not independent cryptographic verification of the upstream provider. In particular, `Keyword.volume` remains provider-unverified and any GSC-named field nested in a DataForSEO response is explicitly *not* certified as GSC data.

The Writer's existing opt-in JSONL trace gains `query.metric.lineage`, containing observed query, selected values and per-field lineage. Inconsistent metric-source reconstruction produces `query.metric.lineage_inconsistent` rather than changing a live article generation decision. The current JSONL trace remains off until `GROWTH_OS_WRITER_TRACE_DIR` is supplied.

**Intentionally unchanged:**
- Selected numbers and their precedence.
- QueryGraph source labels, `sourceConfidence: 0.9`, merge/ranking policy.
- Search volume, CPC, GSC snapshot fields, unknown-value semantics and business facts.
- Prisma schema/migrations, saved article state, generation/recovery loops.
- No production file was deleted.

## Verification

Six tests added in `production-query-metric-lineage-v1.test.ts` cover:

1. Mixed GSC snapshot and DataForSEO metric sources.
2. Correct labeling of cached `Keyword.volume` and finite zero.
3. Identical-value source order priority.
4. A GSC-named field in another provider's response is not automatically GSC-verified.
5. Absent metrics generate no lineage.
6. Selected nonfinite or unattributable values are rejected by the diagnostic helper.

CI requires the exact-head deletion guard, `npx tsc --noEmit`, full Vitest suite and Next.js production build.

## Deferred decisions

Do **not** reassign `sourceConfidence` from these labels or mutate stored QueryGraph and related ranking decisions without a dedicated test corpus and an explicit confidence calibration policy.

Do **not** claim that a cached `Keyword.volume` has provider-level provenance until its ingestion records carry a trustworthy field-level source, country, device, date and unit. That would be a separate schema/contract change with migration and backwards-compatibility review.

The real GSC/DataForSEO integration and a full paid-generation lifecycle have not been executed in this step; CI validates static and mocked behavior. The local Writer backup branch remains separate from this draft refactor.
