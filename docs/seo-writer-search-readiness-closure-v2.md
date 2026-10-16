# Growth OS — Search Readiness Closure V2

## Reproduced production case (October 15–16, 2026)

Existing article cmv606xg60006siqlir66uq23 — What Is Credit Monitoring.
The same-ID Writer repair was finally committed with 2,078 words,
1 H1, 6 H2, 2 H3, and 3/3 brief phrases. Six verified sections and
SERP Replay were saved.

This was a technical persistence win, NOT proof of SEO competitiveness.

- Assigned observed supporting queries: zero.
- All H3 are in the limitations H2.
- Critic, Replay, and Readiness were all WARN.
- Visible pasted article text had glued words: ormultiple,
  servicesoffer, caninclude, monitoringprocess, reportinformation,
  phone,depending, separateconfirmed.
- No visible external source links in the Markdown; internal
  verified evidence is not a reader-visible citation.

## Root cause of the repeated repair loop

1. Topic near-duplicates and typo bypassed a brief collision and wasted
   research before failing on unsupported mandatory claims.
2. Recovery used a historical signed checkpoint hash; the new reader
   expected a current hash, even though the original sources were valid.
3. Per-section editorial allocation minimums and maximums accidentally
   became hard transaction gates, conflicting with the global range.
4. Incorrect H3 regex failed to recognize real heading whitespace.
5. Successful deduplication lowered the article to 1,952 words without
   a source-safe continuation to recover useful depth.
6. Depth expansion dropped a previously used secondary phrase, and
   full section regeneration for three words was costly and unstable.
7. The final quality system checked three exact phrases instead of real
   market query coverage and competitor differentiation.

## New system and what it does

- Read-only Article Search Readiness V2 inspects only grounded
  market queries from DataForSEO, GSC, Google Trends, PAA, Related
  Searches, SERP questions and observed competitor queries. AI and
  MANUAL suggestions do not count as observed keyword demand.
- Source-matched queries retain real, nullable search metrics,
  intent, cluster, same-page scope and H2 ownership. No volume
  or SEO score is fabricated.
- Visible alerts show lack of observed supporting queries, missing
  section ownership, wrong SERP country, absent competitor sample,
  current-fingerprint SERP Replay WARN, source citation review and
  copyedit requirements.
- The per-H2 source list includes URLs only for original publication-
  grade verified excerpt evidence supporting that section. A link is
  reviewable evidence, not permission to invent a claim.
- Article UI now distinguishes SEO search readiness from the
  exact lexical brief-keyword count.
- A separate free read-only audit CLI does not call providers or
  mutate article, Postgres or checkpoints.
- Optional paid keyword research CLI uses the existing bounded
  cached Keyword Intelligence V2 with explicit market and spend
  authorization; it DOES NOT automatically rewrite article facts or
  promote an unclassified query to same-page ownership.
- Approval and CMS publication reject high-confidence malformed
  joined-word prose with HTTP 409, independent of internal SEO score.

## Acceptance standards

1. Show real market, language and supporting queries, including
   unknown/null search volume when provider data is missing.
2. Review search intent and cannibalization before assigning queries
   to the article. Distinguish same-page, separate-page and uncertain.
3. Bind every new material claim to authoritative, compatible,
   verified evidence. Keep YMYL caveats and public source references.
4. Create unique reader value across H1/H2/H3, without repeated
   padding, fake keyword densities or glued words.
5. Re-run critic, publication/evidence gates and new SERP Replay on
   the same exact fingerprint whenever content changes.
6. Show all WARN reasons; never imply a WARN is a clean win.
7. Measure actual rankings, queries, impressions and CTR with GSC
   after publishing. Rank #1 cannot be guaranteed.

## Commands

Free, no provider cost, same saved Article ID:

    GROWTH_OS_ENV_DIR=/Users/user/growth-os NODE_OPTIONS=--conditions=react-server npx tsx scripts/content-existing-article-search-readiness.ts --article=cmv606xg60006siqlir66uq23

Free provider research preflight:

    GROWTH_OS_ENV_DIR=/Users/user/growth-os NODE_OPTIONS=--conditions=react-server npx tsx scripts/content-research-article-keyword-clusters.ts --article=cmv606xg60006siqlir66uq23 --market=US

Paid discovery requires adding --authorize-paid-research.
Paid discovery can update a research cache but does not replace
the article, original brief, verified query graph or source ledger.

## Explicitly not completed yet

The market research candidate-to-new approved immutable Writer blueprint
and safe same-ID subsequent rewrite are NOT yet automated. Reclassifying
query intent and binding it to verified claims must be explicitly
reviewed and tested to prevent new research or content hallucination.
Passing TypeScript and tests alone does not validate the real
DataForSEO, GSC, SERP and Postgres pipeline on the user's Mac.
