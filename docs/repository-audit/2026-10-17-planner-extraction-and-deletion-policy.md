# Growth OS — first Writer consolidation and deletion safety gate

Date: 17 October 2026
Branch: `audit/full-repository-inventory-20261016`

## Mandatory pre-deletion decision

No further file removal solely on filename similarity, number of lines, age, or a static “unused” tag.

For **every single tracked file removal**, perform and record:
1. **Exact baseline content:** path and Git blob SHA; identify purpose and owner.
2. **Dependency graph:** production importers, scripts, tests, external or dynamic loads, package/setup conventions, environmental selectors, persisted imports.
3. **Semantics:** what actual function or contract is removed or replaced and how runtime behavior changes (or proof it cannot).
4. **Data compatibility:** Prisma schemas and migrations, database checkpoints, serialized contracts, signed evidence/fingerprints, replay archives, public URLs and original article state.
5. **Verification:** targeted unit/integration tests, `npx tsc --noEmit`, full `npx vitest run`, production build, and live smoke tests where necessary. Passing unit tests alone is not sufficient proof of dynamic-runtime compatibility.
6. **Recovery:** parent commit and exact `git show`/revert path; perform the removal on a dedicated branch and allow rollback.

This is enforced mechanically by `scripts/repository-deletion-gate.mjs` in GitHub Actions using `docs/repository-audit/deletion-decisions.json` and comparing the deleted file's **old** Git blob to the review record. Missing decisions fail CI. Reviews themselves remain a human/engineering responsibility; descriptive evidence fields cannot mathematically prove runtime safety.

For a current file, use `node scripts/repository-deletion-gate.mjs --inspect src/lib/content/example.ts`. This tool is read-only. The GitHub workflow checks each commit against its first parent, including merge commits.

## Concrete planner investigation

Original `src/lib/content/production-master-live-stage-planner.ts` was **7,518 lines** and contains one main async orchestration function spanning approximately lines 1,273–7,517 (>6,200 lines). There are five source-level occurrences of `callContentAiJson(...)` at roughly 1498, 2316, 2616, 4414, 5631 (conditional executions; not five guaranteed paid requests). An original comment claiming “exactly one AI inference call” was outdated and has been corrected.

The planner combines:
- Live SERP/keyword acquisition, grounding and observed metric anchoring.
- Template policy choice and semantic prompt construction.
- Model-produced claim/query/topic/section proposal and bounded repairs.
- Query/topic/question ownership checks and evidence-sensitive claim classification.
- Evidence graph construction, verification, fallback source discovery and bounded recovery.
- Claim replan/reconciliation and semantic review.
- Final source-backed section assignments, ArticleExecutionPlan and runtime artifacts.

**Do not remove `master-*` in bulk.** The previous dependency map found 34 of 35 production Master modules statically reachable from real Writer/API. The one test-only module (`master-writer-database-progress-v1.ts`) is a distinct integrity-preserving PostgreSQL JSONB checkpoint codec; retain until a separate product-level decision to integrate or remove it.

## Safely completed extraction

Moved two *pure* helpers from the monolith to:
`src/lib/content/stage-plan-semantic-prompt-v1.ts`

- `resolveSelectedTemplatePolicyV1`
- `buildStagePlanPrompt`

Both were copied without altering the function bodies, then exported and imported from the original planner. A direct byte-character comparison after reversing the two added `export ` keywords verified **10,004 out of 10,004 characters exactly identical** to the original source block. The planner still invokes the same functions with the same arguments. Approximately 221 lines were removed from the monolith, but **no production file was deleted**.

Added `stage-plan-semantic-prompt-v1.test.ts` to exercise fixed-template selection, the evidence-bounded prompt, trustworthy risk instructions and deterministic output. CI exercises additional existing Writer and full-repository contracts.

## Next candidates — require individual investigation

1. Split remaining planning stages into explicit immutable typed stage artifacts and verify stage-to-stage signatures and hashes. Prefer existing canonical policy modules rather than creating duplicate policy authorities.
2. Audit `resolveMetricsForQuery` in the planner against `collectObservedQueryEvidence` in `production-master-live-research-assembler.ts`. They intentionally traverse similar nested research shapes. Do **not** merge until equivalent query normalization, traceable numeric source fields, edge cases and anchoring guarantees are proven with tests.
3. Isolate source/claim recovery in bounded stages with one per-run trace: reason code, source hashes, number of attempts, validation outcomes, costs and final artifact fingerprint.
4. Consolidate truly redundant implementations only after equivalence tests. Keep distinct claim/evidence contracts and historic stored-article compatibility.

## Verification and safety limits

- Automated deletion-review gate and its self-test run before TypeScript in GitHub Actions.
- TypeScript, full Vitest suite and production build run on the cleanup branch after each change; evaluate the **exact head SHA**.
- No live article generation, API charges, Prisma migrations, CMS publish or PostgreSQL mutations were performed by this extraction.
- This audit branch must not be blindly merged with the separate local Writer backup (`c8b81a7`); account for their divergent commit histories.
