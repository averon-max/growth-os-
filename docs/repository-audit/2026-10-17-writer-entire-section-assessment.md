# Growth OS Content / SEO Writer — whole-section cleanup assessment

Date: 2026-10-17. Branch: `cleanup/category-pass-20261017`.

## Scope and inventory (current Git tree)

This pass classified every tracked file under `src/lib/content/`, compared it with the earlier reachability audit, and inspected the source of major orchestration, evidence, replay and recovery modules. Counts are from the *current branch*, not the prior `audit/full-repository-inventory-20261016` snapshot:

- **411 tracked entries:** 212 non-test code files, 197 test files and 2 JSON fixtures.
- **0 exact-content duplicates** (no pair of Git files shares the same blob SHA within Content).
- **35 production `master-*` / `production-master-*` modules** and **34 tests**. The earlier static import graph found 34/35 Master production modules reachable from the live Writer/API, with one test-only file; this remains historical evidence, not a fresh current-head execution trace.

### Naming-only coverage map — NOT behavioral reachability

| Heuristic filename bucket | All files | Tests |
|---|---:|---:|
| Research / SERP / keyword / source / evidence | 130 | 66 |
| Quality gates / validators / replay | 62 | 30 |
| Planning / template / stage / policy | 56 | 26 |
| Draft / article / sections / prompt | 58 | 27 |
| Recovery / repair / replan | 33 | 16 |
| Persistence/service | 1 | 0 |
| Other/uncategorized | 71 | 32 |
| **Total** | **411** | **197** |

This is a mutually exclusive filename classification, not an assertion that the module's runtime ownership matches the bucket. For example, `service.ts` spans both planning and persistence.

## Source-level hotspots (updated size / line count)

| Module | Lines | Bytes | Verified structural concern |
|---|---:|---:|---|
| `production-master-live-stage-planner.ts` | 6,963 | 159,962 | 39 unique local imports; five source call sites of `callContentAiJson`, with conditional execution |
| `service.ts` | 4,466 | 99,295 | 54 unique local imports; brief, generation, approval and publishing entrypoints share one file |
| `existing-article-research-recovery-v1.ts` | 1,872 | 85,583 | 44 unique local imports; distinct existing-article recovery flow |
| `live-evidence-verification.ts` | 3,878 | 70,895 | 37 declared function implementations, several different evidence verification and rescue responsibilities |
| `existing-article-quality-improvement-v1.ts` | 1,354 | 65,608 | 43 unique local imports; same-article quality improvement with persisted-state boundaries |
| `master-section-repair.ts` | 2,395 | 53,067 | Specific semantic/depth repair and section identity checks |
| `serp-replay.ts` | 2,780 | 40,507 | Separate replay evidence/comparison and finalization authority |
| `seo-strategy.ts` | 2,254 | 36,261 | Strategy scoring, intent and candidate selection distinct from Writer stage plan |

Raw source sizes were measured on the current branch; unique imports are direct relative source imports in those files. Large file size is an architecture issue, **not** sufficient proof of dead code.

## Previously completed cleanups: no rework

- Stage Plan five-validator sequence was moved to `stage-plan-validation-collector-v1.ts`, preserving issue order and fail-closed behavior.
- Stage Plan recovery routing now has one deterministic source of truth in `stage-plan-recovery-route-v1.ts`, preserving one bounded recovery choice and existing terminal reasons.
- Two pure prompt/template functions were extracted without changing their original bodies to `stage-plan-semantic-prompt-v1.ts`.
- Source/query identity, observed metric registry, planning coverage, recovery decision boundaries were separately audited in `docs/repository-audit/`.
- The former Gemini/Groq HTTP transport cleanup and OpenAI runtime rename are already documented in the parent branch. Do not reverse or repeat these changes.

## Contracts that appear similar but are not safely interchangeable

1. **New-brief generation vs existing-article research recovery vs same-article improvement:** `service.ts`, `existing-article-research-recovery-v1.ts`, and `existing-article-quality-improvement-v1.ts` have different article identity, checkpoint, persisted-state and approval requirements. **KEEP.**
2. **Evidence discovery vs signed claim support vs editorial citation:** the evidence modules serve different stages. Merging based on lexical or URL matching would risk accepting unsupported claims. **KEEP until semantic-equivalence fixtures exist.**
3. **Stage Plan validators and route:** already consolidated. Replacing with another validator or bypassing the ordered five gates would create divergent authoritative policies. **KEEP current owners.**
4. **SERP Replay vs article readiness and critics:** distinct reference observations and release gates. Do not merge a cached keyword signal with a proof-of-ranking claim. **KEEP.**
5. **`master-writer-database-progress-v1.ts`:** a pure 80-line JSONB-stable checkpoint codec; its test alone imports it in the prior static dependency map. Production currently uses `master-writer-section-progress-v1.ts` local-file checkpoint logic. **REVIEW_PENDING, NOT DELETED**, because removing an intentionally future-facing codec loses a separately tested persistence contract without a product decision.
6. **`article-recovery-orchestrator-v1.ts`:** `RECOVERABLE_ARTICLE_FAILURES_V2` is an empty Set, so the Tier-2 automatic whole-article retry is deliberately disabled in the inspected code. This is a product/recovery-policy finding, *not* proof that the public module or its tests can be deleted. This also means automatic no-REJECT convergence cannot be claimed from this orchestrator alone.

## Cleanup disposition and risks

- **Whole-section initial audit completed:** all 411 tracked paths categorized, exact Git duplicate scan completed, 8 major modules inspected, previous owner/contract audits reconciled.
- **0 Writer production files removed in this pass.** No validated exact duplicate, no confirmed unused production file with verified runtime, dynamic-loader and data-compatibility proof exists from this read-only audit.
- **No Writer runtime or API behavior changed.** No new AI calls, Prisma mutation, SEO edits, checkpoint cleanup or article publication performed.
- Further safe source reduction is nontrivial: it requires per-function parity/contract tests, updated graph, and a working build on the exact head. Without that, replacing the 7K-line planner with wholesale rewrite is destructive, not cleanup.
- This closes **inventory and safety triage**, **not** full architectural consolidation. Keep structural refactoring open as separately verified engineering work. Do not assert that 411 files are all necessary or all redundant.

## Safe consolidation backlog (in dependency order)

1. Characterize pure Stage Planner parsing and claim/query normalization with fixtures; extract *without* modifying the sequence of calls, sources, retries or fail-closed outcomes.
2. Isolate Service request orchestration from persistence/approval/publish boundaries while retaining API signatures and transaction scopes.
3. Separate evidence source collection from deterministic support validation; keep verified excerpt provenance and exact section/claim owners.
4. Compare recovery ownership by failure class and exact stored checkpoint contract, consolidate only equivalent paths.
5. Evaluate whether test-only database-progress codec is an actual roadmap requirement; retain until resolved.
6. Run deletion review gate, `npx tsc --noEmit`, complete `npx vitest run`, `npm run build`, then one authorized real brief→draft→review flow before any high-risk merge.

## Verification status and next section

The earlier CI evidence applies only to its exact head, **not** to the latest cleanup-branch commit. Exact-head TypeScript, full Vitest, Next.js build and authorized end-to-end Writer still need confirmation. The local Writer preservation branch `backup/writer-local-before-full-cleanup-20261017` must not be overwritten or blindly merged.

**Next section started:** API/UI/other application source (`src/` excluding `src/lib/content/`). Separate inventory documented in `2026-10-17-app-api-cleanup-first-pass.md`.

**Observability remains deferred** by user instruction until all cleanup categories close. Existing traces are not part of this pass.
