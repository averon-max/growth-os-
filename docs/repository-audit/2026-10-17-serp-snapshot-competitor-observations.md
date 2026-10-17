## SERP Replay root cause — 2026-10-17

From the user's existing saved research for article `cmv606xg60006siqlir66uq23`, 9/9 competitor entries have URL/title/snippet but no parsed H1, H2, H3, questions, claims, source citations or observed page structure.

**Verified code-path defect:** `buildSerpIntelligence` already performs SSRF-safe competitor HTML requests and, when a usable page is received, generates `serpIntelligence.competitors` with page headings and DOM observations. However, `production-master-live-source-adapter.ts` had a `snapshotResults` mapper that copied **only** the organic SERP result's `rank,url,domain,title,snippet` into the canonical `serpSnapshot`, discarding acquired page observations. The source assembler then persisted this impoverished snapshot as `serpResearch`; SERP Replay judged only the snippet.

**Fix for future research:** reuse the existing competitor crawl output in the snapshot by a fail-closed rank+hostname match. Copy only directly observed `pageType,h1,h2,h3,wordCount,tables,images,videos,externalLinks` from pages that have `fetched:true`; keep title and snippet as original SERP observations. Never copy blocked/CAPTCHA/unusable pages; never infer body text, original assets, factual claims, citation strength, semantic answer completeness or arbitrary H3. No additional network calls or AI use. Two adapter parity/negative tests added.

**Limit:** This forward fix does not rewrite the user's immutable signed old Research Pack or original Replay. Even new snapshots can legitimately have sparse evidence when sites block crawling, and fuller claims/citations require separately sourced, independently verified content. A new signed research version + replay on the same saved article would require an explicit reviewed integration workflow, not ad-hoc SQL or a synthetic READY flag.

**Verification:** CI on the precise code head must pass full Vitest, TypeScript, Next build, clean Postgres migration replay and HTTP smoke. No live paid provider calls in CI.
