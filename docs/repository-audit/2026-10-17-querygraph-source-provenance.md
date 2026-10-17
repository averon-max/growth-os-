# QueryGraph source provenance and GSC market isolation

Date: 2026-10-17
Branch: `audit/full-repository-inventory-20261016`

## Problem verified at the actual source boundaries

The Writer Stage Plan previously attached `source: "DATAFORSEO"` and `sourceConfidence: 0.9` **unconditionally** to every grounded QueryGraph signal.

The selected query universe actually combines two separately acquired sources:

1. `research.keywordContext` comes from `getWebsiteKeywordContext()`, backed by workspace keywords with page-associated `KeywordSnapshot` data in PostgreSQL. Snapshot country, source and page host matter. The context includes cached keyword-table volume/difficulty alongside GSC snapshot position/clicks/impressions.
2. `research.dataForSeo` comes from separate `fetchRelatedKeywords`, `fetchSearchVolume` and `fetchKeywordDifficulty` calls to DataForSEO, scoped by location/language.
3. The live SERP snapshot, competitor pages and PAA questions are **not** promoted into the observed keyword registry merely because they appear in search results. Only recursively observed `keyword` acquisition records enter the registry, not arbitrary model `query` or search feature `question` fields.

The unconditional label therefore misstated the acquisition source for query identities found only in the site's saved keyword snapshots. `QuerySignalInput.source` is a single source; in dual-observed cases it cannot describe all metric-level origins.

## Provenance fix

Added `production-query-identity-provenance-v1.ts` and its six tests, built on the **already canonical** observed-query registry.

- If a query is observed only in DataForSEO, source = `DATAFORSEO`.
- If observed only in website GSC-backed keyword context, source = `GSC`.
- If in both, source = `DATAFORSEO` for backward-compatible primary identity priority, but the local execution trace records **both observed-presence flags**.
- If neither registry contains the query, resolution returns `null`; the planner refuses to manufacture a source.
- Identity uses the same normalized keyword spelling and recursive source-acquisition boundary as the assembler.

The production planner now calls this helper rather than hard-coding the label. It emits a trace event with query, selected identity source, and both presence booleans when the Writer trace is explicitly enabled.

**Deliberate nonchanges:** no changes to numeric metric selection, `sourceConfidence: 0.9` (an existing heuristic rather than a proven statistical confidence), QueryGraph aggregation, the evidence graph, article text, retries or Prisma schema. The original separately verified metric selection remains first observed finite value, preferring website context before DataForSEO.

## Market/source isolation in GSC context

A separate source-boundary review found the live source adapter called `getWebsiteKeywordContext(websiteId)` **without** the article target country. That function already supported optional market filtering, but the Writer path did not supply it. Saved GSC positions for another country could therefore contaminate country-specific decisions.

Changes:
- Live adapter passes the target `countryCode` explicitly as the third parameter.
- Keyword-context query now filters `KeywordSnapshot.source = "GOOGLE_SEARCH_CONSOLE"` and applies the provided lowercase country to both the `some` and the selected snapshot `where`.
- Market validation requires exactly two Latin letters; existing callers without an explicit market remain supported.
- Existing website host verification, workspace access, and sorted/sliced snapshots remain unchanged.

These changes do **not** backfill missing market data. A query with no relevant GSC snapshot is absent rather than being replaced by an unrelated country's position. That can reduce observed query coverage compared with the old unscoped behavior, which is intentional and requires live workflow verification.

## Known limitations / next decisions

- Query identity source is **not** per-metric provenance. The website keyword table's cached `volume` can originally come from DataForSEO or another provider, even when its keyword identity was selected via a GSC snapshot. Do not attribute every metric to the displayed QuerySignal source.
- `sourceConfidence: 0.9` remains unchanged to avoid altering downstream QueryGraph merge/ranking semantics without a calibration study. It is a heuristic, not a probability that a query ranks or a provider is correct.
- A dual-observed query currently emits one QuerySignal, not two, preserving existing persistence and planned query ownership. Multi-source provenance would require a separate contract review to avoid duplicate graph nodes or confidence-based metric replacement.
- Some exact snapshot origin/source labels may be legacy defaults. The source and market filters are evidence boundaries, not verification of freshness or data quality.
- Unit/build success does not prove Google Search Console credentials, DataForSEO delivery, or country-specific SERP equivalence in production. A non-mutating recorded-research integration replay should precede rollout.
- No production file, migration or article was removed or rewritten.

## Verification

CI runs the exact-head deletion evidence gate, import inventory, TypeScript, full Vitest unit tests and Next.js production build.

New tests cover GSC-only, DataForSEO-only and dual-observed query origins, Unicode normalization, rejection of invented model/PAA query identities, empty and unobserved inputs. Updated keyword-context and source-adapter tests assert the actual Prisma snapshot source/country filtering, argument forwarding and invalid market codes.

All changes are isolated to the draft cleanup PR and are not automatically merged with the user's independent local Writer backup.
