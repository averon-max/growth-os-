# Scripts cleanup — dependency review 2026-10-17

Branch: `cleanup/category-pass-20261017`.

## Decision: do not mass-delete scripts

41 tracked files are under `scripts/` (39 original plus 2 previously added trace/report files). This folder contains entrypoints invoked by CLI, so an empty static-import count is **not proof of unused code**. Inspect `package.json`, workflow files, historic operator commands and downstream checkpoint formats first. The deletion gate in `scripts/repository-deletion-gate.mjs` requires a file-specific decision with the old blob SHA.

### Confirmed different contracts, NOT duplicates

| Script | Observed contract | Decision |
|---|---|---|
| `content-stage-score-evidence-revision.ts` | Produces a source-verified V1 staged revision from immutable checkpoint and review candidate; explicitly no AI/DB writes | RETAIN until checkpoint consumers are migrated |
| `content-stage-score-evidence-expansion-v2.ts` | Builds V2 factual evidence expansion from multiple named sources, no article-text change | RETAIN, consumed as V2 artifact |
| `content-stage-supported-score-section-v3.ts` | Requires **both** V1 and V2 staged artifacts and a prior failed review, preserves four unrelated sections, creates new candidate | RETAIN; deletion would break this recovery chain |
| `content-research-article-keyword-clusters.ts` | Keyword opportunity discovery; paid path explicitly opt-in, existing pipeline and cache | RETAIN; not same as question discovery |
| `content-research-article-questions.ts` | Question suggestion discovery; separate cache contract and paid opt-in | RETAIN; not same as keyword clusters |
| `repository-audit.mjs` | Static dependency inventory | RETAIN as cleanup evidence |
| `repository-deletion-gate.mjs` | Per-blob deletion review check | RETAIN as CI safety guard |
| `writer-module-map.mjs` | Writer dependency/reachability graph | RETAIN as cleanup evidence |

### Deferred and protected

- No Prisma migrations, persistent article records, runtime Writer code, asset URLs, or source-verified checkpoint contracts deleted.
- `writer-trace-report.mjs` and its test were created **before** the user changed the order of work. They are not wired into the runtime or package scripts. Do **not** extend or run logging work before cleanup closes.
- Remaining one-off scripts are `REVIEW_PENDING`; their titles alone are not deletion evidence. Next inspection must include usage references and per-script input/output and side-effect inventory.
- CI is configured for this branch but an exact-head passing GitHub Actions run has **not yet** been observed. Do not merge on this document alone.

## Follow-on cleanup

1. Produce a reference inventory covering all CLI entrypoints and external/manual callers.
2. Flag expired, superseded **operational** scripts after preserving input/output provenance and confirming no known operator calls.
3. Use the existing deletion gate with an explicit blob SHA and rollback for each removed file.
4. Run full TypeScript, Vitest, Next production build, then verify exact head.

## Second pass — operator and checkpoint entrypoints

Inspected the source entrypoints directly (not just filenames):

| File | Operational effect | Decision |
|---|---|---|
| `content-existing-candidate-final-review.ts` | Default read-only; opt-in paid semantic review and critics, writes exclusive local review artifacts, no DB persistence | RETAIN |
| `content-article-final-closure-preview.ts` | Checks source checkpoint hashes and writes a local preview; no AI/paid search/DB writes | RETAIN |
| `content-critic-checkpoint-audit.mjs` | Read-only diff of POST_WRITER and POST_MASTER_CRITIC checkpoints and local critic findings | RETAIN |
| `content-recover-existing-whitespace-rejection.ts` | Optional explicitly gated database mutation and replay invalidation for one rejected article | RETAIN / HIGH RISK; cannot remove before operational ownership review |
| `content-existing-article-research-recovery-live.ts` | Separate existing-article research recovery CLI, paid branch explicit opt-in, can resume existing Writer | RETAIN / HIGH RISK |
| `content-improve-existing-article-quality.ts` | Same-ID article revision with guarded write after quality/replay contracts | RETAIN / HIGH RISK |
| `content-writer-closure.ts` | Brief-based production generation, explicitly gated budgeted model run | RETAIN / HIGH RISK |

These are not interchangeable: they have different persisted artifact states, article ID handling, side effects and validation gates. No safe deletion is established for any of these seven files.

**Cleanup status:** 15 script contracts examined across passes; 0 approved for deletion. This is an intentionally fail-closed result, not a declaration that the Scripts category is completely clean.

## Third pass — approvals and cached-analysis entrypoints

| File | Directly verified contract | Decision |
|---|---|---|
| `content-approve-existing-query-owner.ts` | A human-attested query-owner approval; only the `--execute` path appends review data, not signed article/research snapshots | RETAIN; distinct provenance action |
| `content-article-quality-audit.ts` | Read-only inspection of existing persisted article, without AI or publication | RETAIN as diagnostic CLI |
| `content-audit-cached-keyword-topic-fit.ts` | Re-evaluates already paid source snapshots for market/topic-fit without paid API calls | RETAIN; distinct cached-data check |
| `content-commit-reviewed-candidate-v3.ts` | Explicit opt-in atomic commit of a reviewed candidate and replay provenance, transition to IN_REVIEW | RETAIN; critical persisted-data path |

**Progress:** 19 of 41 scripts checked at source-header and entrypoint level; 22 still pending. No deletion approved. This pass did not run scripts, make AI calls, or alter a database. Header checks do not substitute for full implementation/reference review; all four remain retained by default.

## Final first-pass inventory — remaining 22 scripts

The following were checked for their advertised invocation, argument guards, imported capability and side-effect boundaries by reading the entrypoint source. This is **not** proof that all downstream dynamic code was exhaustively inspected.

| Script | Observed purpose / boundary | Decision |
|---|---|---|
| `content-existing-article-citation-draft.ts` | Signed evidence-to-H2 citation draft; requires original article SHA; writes a local draft, never publishes | RETAIN |
| `content-existing-article-evidence-alignment-audit.ts` | Saved VERIFIED_EXCERPT lexical alignment, expressly not semantic entailment | RETAIN |
| `content-existing-article-evidence-rescue-audit.ts` | One article-specific credit monitoring source-rescue diagnosis; fetches two public source pages | RETAIN pending confirmed retirement of that recovery workflow |
| `content-existing-article-fact-coverage-audit.ts` | Claim-by-claim/section evidence coverage from locked stored research | RETAIN |
| `content-existing-article-official-response-facts-audit.ts` | Official US source fact review for saved `section-6`, public fetches permitted | RETAIN; tightly scoped |
| `content-existing-article-postcommit-audit.ts` | Verifies after CAS commit, latest replay, QueryGraph and optional local draft export | RETAIN |
| `content-existing-article-question-gap-audit.ts` | Match cached question research against article H2/verified sources | RETAIN |
| `content-existing-article-research-evidence-diagnose.ts` | Saved claim hypotheses and observed sources, SSRF-safe public refetch | RETAIN |
| `content-existing-article-search-readiness.ts` | Stored-article search-readiness evaluation, no paid provider calls | RETAIN |
| `content-existing-article-semantic-citation-review.ts` | Human-initiated, optionally paid OpenAI sentence/citation review; no DB writes | RETAIN |
| `content-existing-article-seo-depth-audit.ts` | Same-ID article depth, keyword and headings from persisted execution plan | RETAIN |
| `content-existing-article-writer-checkpoint-audit.ts` | Local research-recovery section progress checkpoint audit, no DB calls | RETAIN |
| `content-export-existing-article-review.ts` | Exact saved article Markdown output to stdout, fingerprint metadata to stderr | RETAIN |
| `content-review-candidate-audit.ts` | Check locally saved preview + manifest + POST_WRITER checkpoint gates | RETAIN |
| `content-review-existing-markdown-evidence.ts` | Diff externally edited Markdown with original and signed evidence scope | RETAIN |
| `content-section-authority-audit.ts` | Inspect one section's saved claim/evidence authority, no generation | RETAIN |
| `keyword-existing-article-paid-serp-reuse.ts` | Re-assess previously purchased SERP rows for existing article, no provider calls | RETAIN |
| `keyword-research-v2-cached-audit.ts` | Validate stored Keyword V2 caches and reuse eligibility, no network purchase | RETAIN |
| `keyword-research-v2-live.ts` | Distinct one-seed research CLI, paid provider calls and cache writes only with `--execute` | RETAIN |
| `rebind-approved-direct-answer-v1.ts` | Re-export required by temporary staging utility; earlier deletion broke TypeScript | RETAIN |
| `writer-trace-report.mjs` | **Newly introduced** local trace report intended for a later phase | REMOVED on cleanup branch |
| `writer-trace-report.test.mjs` | **Newly introduced** test only for postponed trace report | REMOVED on cleanup branch |

## Scripts phase disposition

- **41/41 examined at CLI-contract level** (39 original + 2 premature logging files).
- **2 intentionally removed**: deferred logging files added earlier in this cleanup branch. Exact blob SHA and rationale were placed in `deletion-decisions.json` prior to removal.
- **39 retained**: no other file has enough evidence for deletion. Some are historically specialized; prove lack of operational consumers *before* retiring them.
- **No production Writer or Prisma file deleted** and no article state/database operation executed in this Scripts pass.
- **Safety qualification:** this closes the initial Scripts inventory and low-risk cleanup, **not** a deep static+dynamic callsite audit for every operational CLI, nor proof of zero latent duplicates.
- **Next section:** `src/lib/content` architecture and policy duplication. Begin with existing Writer module map and the Stage Planner/Service ownership boundaries; preserve the Writer backup and all stored contracts.
- **Merge gate remains open:** exact-head TypeScript, Vitest, production build, and deletion guard results must be confirmed before merging.
