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
