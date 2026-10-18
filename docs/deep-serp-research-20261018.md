# Deep SERP competitor content research — 2026-10-18

## Scope

This branch extends the **existing** Growth OS SERP intelligence, Keyword Research V2,
SERP Snapshot/Consensus and competitive blueprint handoff. No new SEO provider,
Prisma migration, publishing, article rewrite or generation flow was added.

New observation path:

1. Existing DataForSEO Google Organic Live Advanced query (one billable task per keyword).
2. Existing bounded SSRF-checked top-ten organic HTML fetches, concurrency three.
3. HTML quality gate (block/challenge/empty-body detection).
4. `competitor-document-depth-v1.ts` reads only visible main/article content:
   heading order and H2/H3 hierarchy, *inclusive* H2 and local H3 word counts,
   question headings, body token phrases, exact query mentions in title, H1,
   headings and main content; navigational markup and boilerplate excluded.
5. `serp-intelligence.ts` attaches each real `contentDepth` and derives
   `commonBodyTerms` by **number of distinct observed pages**.
6. `keyword-research-v2.ts` preserves depth profiles for up to ten competitors
   per keyword cluster in the existing keyword research cache. Old cache items
   remain readable; explicitly deep mode now uses the new `deep-v2` key.
7. `keyword-deep-serp-readiness-v1.ts` requires five usable main-article
   profiles, including rank one, when deep SERP evidence is requested.
   A 200 OK page or a legacy `fetched:true` does not prove completeness.
8. `production-master-live-source-adapter.ts` places genuinely fetched profiles
   and observed heading questions into the existing immutable SERP snapshot.
9. `serp-consensus-v2.ts` aggregates repeated body terms only from actual main
   article profiles. `competitive-seo-blueprint-wiring.ts` exposes sufficiently
   recurring terms as **SERP_BODY_TERM_REVIEW** technical review hints.
   This is not factual evidence, claim authorization or mandatory keyword density.

## What this measures versus what it cannot establish

- Title/H1 and heading keyword counts are literal phrase observations, not search
  volumes, ranking factors, recommended repetition targets or keyword stuffing advice.
- Body terms are statistical n-grams from the observed article text. They are **not**
  confirmed customer keywords. Query volumes come from GSC/DataForSEO, not these n-grams.
- Word counts and heading distributions are competitor *observations*, never
  publication targets. Section H2 word counts include paragraphs under its H3 children.
- Question headings are observed questions. They do **not** become a verified
  factual answer or justify publishing a new article on their own.
- Pages with blocked fetches, JS-only or inaccessible main content remain missing.
  Do not guess competitor contents from search snippets.
- Separate claims must still be backed by source quotes, verified in the existing
  Evidence Graph and passed by production pre-Writer / editorial quality gates.
- No crawling around login or anti-bot controls; no copying article passages into
  generated text. Terms/short headings are retained as research observations.
- DataForSEO pricing/call quota depend on the account. Research invokes paid
  queries **only** from an explicitly authorized existing call path.

## Official documentation checked (2026-10-18)

- Google Search Central, people-first content:
  https://developers.google.com/search/docs/fundamentals/creating-helpful-content
  (original work, factual accuracy, YMYL caution, no preferred word count).
- Google SEO starter guide:
  https://developers.google.com/search/docs/fundamentals/seo-starter-guide
  (unique clear titles, readable headings, useful original content).
- Google spam policies:
  https://developers.google.com/search/docs/essentials/spam-policies
  (scaled unoriginal content and machine-generated queries).
- DataForSEO Live Google Organic SERP Advanced:
  https://docs.dataforseo.com/v3/serp/google/organic/live/advanced/
  (paid task, structured organic results, PAA, SERP features).
- Google Search Console Performance:
  https://developers.google.com/search/docs/monitor-debug/search-console-start
  (page/query clicks and impressions, not competitor traffic).

## Offline validation (no API/DB writes)

```bash
npx tsc --noEmit
npx vitest run src/lib/content/competitor-document-depth-v1.test.ts src/lib/content/serp-consensus-v2.test.ts src/lib/content/competitive-seo-blueprint-wiring.test.ts src/lib/keywords/keyword-deep-serp-readiness-v1.test.ts src/lib/keywords/keyword-research-v2.test.ts src/lib/content/production-master-live-source-adapter.test.ts
```

`requireDeepCompetitorEvidence=true` only passes when the collected competitor
pages are genuinely available, on-topic and sufficiently detailed. Never silently
downgrade to the old shallow `fetched` contract to force a success.

**Validation status:** source integration committed. This document does not assert
that user-local `tsc`, Vitest, full live research or real Writer generation passed.
Real paid live SERP collection is deliberately not started by this work.
