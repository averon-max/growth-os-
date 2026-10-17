# Growth OS — Keyword Intelligence → Content Writer release closure

Status: **DRAFT, NOT PRODUCTION-VERIFIED**. Date: 2026-10-16. Scope: one website, one explicitly chosen market/language. Avoid unbounded provider calls.

## Outcome contract

Given a real website + business context + market, discover measured search demand and site visibility, choose the best defensible *page opportunity*, pass a locked source-backed strategy to Content Writer, publish only after human approval, and measure actual search outcomes.

**Separation of authority**
- Search-market observations: DataForSEO, GSC, Google Trends, organic SERP. AI may classify, NEVER invent KD, volume, CPC, position, trend, SERP URLs or observed queries. Null means unknown, not zero.
- Topic/Page intent: one page must serve one dominant task; synonyms and genuinely related questions belong to it; navigational, product, local, transactional and unrelated-intent queries usually require separate pages.
- Factual claims: research excerpts must be independently verified; SERP titles/snippets are discovery context, not factual sources.
- Publication: no auto-approval, SEO guarantees or CMS push from keyword selection.

## Existing implementation verified by code inspection

- `src/lib/keywords/keyword-research-v2.ts`: one seed, one DataForSEO Related Keywords depth-3 discovery capped at 500, GSC/Trends observations, topic/intent gate, score/cluster shortlist, up to 10 paid deep-SERP checks, optional GPT decision, 24-hour reusable checkpoints and result cache. This is NOT yet site-wide multi-seed discovery.
- `keyword-intelligence-v2.ts`: dedup, demand/KD/GSC near-win weighting, scores and clusters. Difficulty is DataForSEO organic KD, not Google Ads competition. Scores are *internal prioritization*, NOT ranking probabilities.
- `keyword-topic-intent-gate-v1.ts`: conservative lexical topic and page-type boundary, not a fully semantic or SERP-overlap clustering engine. Properly keeps mixed-intent cases for review.
- `keyword-decision.ts`, `topic-authority.ts`, `live-rank-service.ts`, GSC outcome modules: deeper existing methods to reuse; avoid a second ranking engine.
- `src/lib/content/production-ranking-inputs.ts`, `query-graph.ts` and `production-master-live-research-assembler.ts`: observed-query lineage, competitive context, and downstream signed research authority.
- `src/app/api/keywords/opportunities-v2/route.ts`: server-side authenticated explicit-paid-research endpoint. Main Keywords page currently renders IndustryTopKeywords/KeywordSuggestions/LiveRankIntelligence etc., but no clearly exposed UI for this V2 endpoint; verify end-user availability before release.

## Defects fixed in draft PR #53, still require Mac tests

1. Content Writer handoff used all archived raw candidateSnapshots, including excluded other-intent terms. Handoff now enforces membership in approved shortlist clusters, places actual observed winner first and preserves historical DataForSEO volumes/trends.
2. GSC keyword context historically mixed country samples, used a fixed take 50 and trusted substring page URL matches. Research now requests market-specific up-to-250 site observations, guarded by exact/www host match. **Remaining:** GSC latest daily snapshot is not the same as a 28/90-day window or a real-time rank.
3. No-GPT mode historically only returned REVIEW, even with qualified organic SERP and measured demand. It can now SELECT a uniquely stronger grounded cluster deterministically, or stop at REVIEW if no evidence or close scores. Cached deterministic decisions must be reproducible from saved SERP/clusters.
4. Added read-only `scripts/keyword-research-v2-cached-audit.ts`: inspect actually cached keyword universe, measured KD/volume coverage, GSC positions, organic SERP proof, selection result and Writer-allowed cluster members at **zero new cost**.
5. The existing paid SERP result now records **observed top-10 competitor URLs and own organic rank** (if actually present in fetched SERP); it does not confuse missing rank with zero or request an extra provider call. Old cached SERPs may not have these optional fields and are not secretly refreshed.

## Post-audit bounded discovery extension (PR-only, not yet locally verified)

The real archive has 59 candidates but just **three** same-page informational questions, all with null volume/KD. This is not a Writer failure. DataForSEO Related Keywords can return SERP-related navigational/vendor topics; relying on Related alone is poor recall for page-intent questions.

Added a second provider only on individual, explicit authorization:
- `keyword-suggestions-provider-v1.ts`: DataForSEO Labs Google Keyword Suggestions; documented full-text retrieval of terms containing the **core subject**, distinct from SERP-derived related keywords. Brings measured search volume, organic KD, CPC, monthly history/trends, lightweight SERP metadata.
- `keywordCoreTopicV1` ensures a seed like `what is credit monitoring` purchases suggestions for `credit monitoring`, not the awkward whole question.
- `keyword-research-v2.ts` enables Suggestions ONLY when `authorizeExpandedDiscovery:true` on top of `authorizePaidResearch:true`. The second discovery is durable-checkpointed; all observations pass existing topic/intent/cannibalization, then bounded deep SERP and selected-cluster evaluation. The v4 result cache key distinguishes paid consent and new logic.
- Existing API `/api/keywords/opportunities-v2` validates a separate Boolean `authorizeExpandedDiscovery` flag.
- New `scripts/keyword-research-v2-live.ts` FREE preflight by default. Only `--execute` performs provider requests and caches results; `--expanded` selects second provider; `--serp=3` caps up to three SERPs. NO Writer/article creation, CMS publication or grant of SEO readiness.
- **Use this preflight first**: `GROWTH_OS_ENV_DIR=/Users/user/growth-os NODE_OPTIONS=--conditions=react-server npx tsx scripts/keyword-research-v2-live.ts --website=cmtjl7vdm00010eqlnt1xbkhd --seed="what is credit monitoring" --market=US --limit=300 --serp=3 --expanded`.
- Then, only after a local green test run and explicit approval of provider charges, adding `--execute` performs a bounded live run. If result is REVIEW, diagnose source coverage vs semantic mismatch; do not force model choice or regenerate Writer.

DataForSEO docs: https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live/ (response uses `items[].keyword`, `keyword_info`, `keyword_properties.keyword_difficulty`) and https://docs.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live/ (SERP-related, different retrieval objective).

**Still missing for entire-industry scope:** business-verified multi-seed discovery and site/topic entity expansion; don't falsely claim one seed + full-text suggestion yields all niche keywords. A production acceptance test needs this before calling the system finished.

## Historical cached research forensic result — real Mac audit 2026-10-16

The single saved `momentum-v1` US run for `what is credit monitoring` showed 77 observed queries, 59 archived candidates, 10 historically marked 'approved' and three paid SERP summaries — all for the WRONG page intents (`credit karma phone number hours`, `equifax credit monitoring`, `equifax core credit`). It had no observed GSC average positions, decision REVIEW and no authorized primary. This was an **old cached run**, not a new current v3 live discovery, so do not assert the current pipeline would replicate it.

Root cause: the cache parser and Writer handoff previously trusted historical 'approved' cluster labels. New code rechecks current topic/intent for selected AND supporting terms at the trust boundary and invalidates contaminated cached decisions. Free forensic audit still examines the raw archive and recovers only legitimately observed, topic-compatible candidates for fresh SERP confirmation without turning them into approved keywords.

Acceptance for this defect: original bad cache reports `HISTORICAL_CACHE_WRONG_TOPIC_OR_INTENT`, lists rejected historical SERPs, and `allowedToWriter:false`. A new run must show zero paid SERPs for provider support/login/brand navigation under an informational seed; no unverified keywords may cross into the Writer.

## Deep SERP / top-one competitive intelligence (new draft code)

The first preflight with `--limit=300 --serp=3 --expanded` returned zero calls, not proof of SERP coverage. Focused tests 67/67 plus TS passed at commit `d110d08` prior to this new draft; later changes need another local test.

**Implemented:** the existing `buildSerpIntelligence` already observes organic top-10, crawls competitor pages with safety/timeouts, parses H1/H2/H3, word counts, author/date/schema/tables, common sections/terms, related PAA questions, and AI Overview presence. The old `summarizeSerp` discarded nearly all of it. New `SerpOpportunityV2.competitiveResearch` retains a bounded observational snapshot, with actual fetch-success and fetch-failure counts. No extra provider request is purchased beyond the pre-existing SERP check.

**New explicit `--deep` mode:** `requireDeepCompetitorEvidence:true` enables a fail-closed evidence gate before `SELECTED`. Each candidate needs seven organic results, five distinct domains, >=five fetched competitor pages, observed repeating section structure, and an accessible organic #1 competitor page. If competitor crawls fail, decision remains REVIEW. The decision is rechecked when replaying the cache, with distinct paid SERP checkpoint keys for deep vs standard sessions. This is content/competition observability, NOT backlink authority scoring or a guarantee of Google ranking #1.

Example read-only preflight: `GROWTH_OS_ENV_DIR=/Users/user/growth-os NODE_OPTIONS=--conditions=react-server npx tsx scripts/keyword-research-v2-live.ts --website=cmtjl7vdm00010eqlnt1xbkhd --seed="what is credit monitoring" --market=US --limit=500 --serp=10 --expanded --deep`.

This budgets up to **1 Related + 1 Suggestions + 10 organic SERPs**, with each SERP already configured to inspect up to ten competing pages. At most 100 competitor document observations; successful pages may be fewer due to crawl blocks. All still **zero new calls** without `--execute`. Actual DataForSEO fees are provider-defined and can change; show pricing before authorization. Do not select based on median word count or artificial H3 targets.

**Top-one editorial acceptance is separate:**
- Pick business-relevant page intent and user jobs; use source-observed questions and semantic overlap to map possible H2/H3.
- Identify distinct value *not* present in the competitor pages (original analysis, actionable examples, real user outcome), not just recombine copied headings.
- Prove YMYL claims with authoritative source excerpts and show relevant citations in the article; SERP titles and AI Overview are NOT proof.
- Assess on-page title, direct answers, page technical crawlability, canonical, internal links, page ownership, off-page competitive authority and GSC progress. A better article alone does not guarantee ranking ahead of stronger domains.
- New body fingerprint → full editorial QA/nine critics + fresh SERP Replay; keep human IN_REVIEW gate and publication verification.

**Not yet implemented:** true website-wide multi-seed market research with category-level Keyword Ideas and competitor Ranked Keywords; GSC 28/90-day by country/page/device; SERP overlap clustering across page families; validated competitor backlink authority comparison; actual live deep research acceptance + 3 end-to-end samples. Treat those as independent release requirements, not accomplishments.

## What remains — priority order, NO parallel refactor

### Phase A — prove existing saved research end-to-end (free)

1. Local `tsc --noEmit` and focused tests: keyword-context, keyword-intelligence-v2, keyword-research-v2, keyword-writer-handoff-v2, cache, topic gate, relevant writer handoff.
2. Run free cache audit on known test website ID; collect seed, market, observed count, on-topic count, exclusions, measured KD/volume, 4–20 GSC near-win counts, SERP-check count, selected keyword, projected supporting keywords, provenance. Missing cache is not proof of functionality; find an existing valid V2 session or run *one explicitly authorized budgeted research*.
3. Verify US research uses US-specific GSC rows and no domain spillover; validate query/page matching and duplicate live/publication intents.
4. Verify selected source-backed keyword reaches brief/Writer without reintroducing raw excluded queries. A previous IN_REVIEW article is NOT proof for a newly modified handoff.

### Phase B — complete market-wide discovery (only if free audit shows insufficiency)

1. Reuse existing provider; layer in **explicit, limited** multiple real seeds based on business's services and verified site topics. Do not generate seeds solely from an LLM: candidate seeds can be proposed but must be checked against business offering/site and actual provider observations.
2. Use DataForSEO Labs Google **Keyword Ideas** (adjacent/category terms), **Related Keywords** (SERP relatives) and **Keyword Suggestions** (long-tail). Optional **Keywords For Site / Ranked Keywords** from observed competitors. Normalize, dedupe and preserve source provenance before limit/top-volume truncation. Hard cap per session e.g. 500–1,000 candidates and provider calls budget. Additional endpoints require opt-in and cached fingerprints.
3. Get KD via existing bulk endpoint only for real candidates whose KD is unknown, prioritized by qualified intent. Never reuse Google Ads `competition_index` as organic KD.
4. GSC should provide 28/90-day query+page+country+device aggregates, CTR and impression-weighted average position rather than treating one daily last snapshot as full 28-day data. Position remains average, not a guaranteed rank.
5. Cluster by SERP-overlap/intent/page-type and site URL ownership; lexical similarity alone is insufficient. Distinguish **new page**, **improve existing page**, **merge/canonicalize** or **NO_GO**. Never generate a duplicate article because another brief is READY.

### Phase C — close research → Writer → measurement

1. Choose one primary per page and only supported secondary questions, entities and terms from approved groups. Do NOT demand 20 exact keyword matches or fixed H3 quotas. Record why selected and known missing signals.
2. Writer gets source-verified evidence/claim ledger and verified query-to-section ownership; perform scoped repairs, final QA, 9 critics, fingerprinted SERP Replay, human approval, CMS publish, fetch verification.
3. After publication, compare GSC 14/28/60/90 day **observed** impressions, clicks, CTR, page/query ownership and indexed URLs, and classify action as adjust content, recover evidence, or leave untouched. No promise of rank 1.
4. Acceptance: 3 real missions (informational YMYL, comparison/transactional, and local service) complete on distinct eligible, evidenced briefs. No fabricated metrics, cross-market positions, unapproved keyword leakage, shared snapshot corruption, duplicate publication, or uncontrolled paid reruns.

## Official external references (checked 2026-10-16)
- Google people-first content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google SEO Starter Guide (no magical word count): https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- GSC Search Analytics API and top-row limitations: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- DataForSEO Google related keywords: https://docs.dataforseo.com/v3/dataforseo_labs-google-related_keywords-live/
- DataForSEO Google keyword ideas: https://docs.dataforseo.com/v3/dataforseo_labs-google-keyword_ideas-live/
- DataForSEO Google bulk organic KD: https://docs.dataforseo.com/v3/dataforseo_labs-google-bulk_keyword_difficulty-live/
- DataForSEO Google ranked keywords: https://docs.dataforseo.com/v3/dataforseo_labs-google-ranked_keywords-live/

## Do not prematurely declare production done
No live research was executed by this PR. No real provider metrics were guessed. Draft is not merged. Previous credit-monitoring revision candidate still awaits scoped claims evidence and NEW SERP Replay.
