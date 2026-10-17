# Writer module ownership and consolidation audit

Date: 2026-10-17
Source: `node scripts/writer-module-map.mjs` on `audit/full-repository-inventory-20261016`. Full per-file JSON is an artifact of GitHub Actions and locally written to `.growth-os-tmp/writer-module-map.json`.

## What the names actually mean

| Measured category | Count |
|---|---:|
| Content TS/JS files | 396 |
| Content production files | 207 |
| Content tests | 189 |
| Master/production-master files | 69 |
| Master production files | 35 |
| Master tests | 34 |
| Master production files statically reachable from Writer/API | 34 |
| Master production files used only by tests in the static graph | 1 |
| Master production files unreferenced by runtime, scripts and tests | 0 |
| Content production modules over 1,000 lines | 26 |

Two non-TS/JS fixture assets account for the earlier 398 overall Content files.

**Do not mass-delete the 35 master modules.** The module dependency graph indicates that 34 participate in the production Writer/API import graph. This is reachability, not proof that every exported function executes.

The one Master module with test-only import reachability is `src/lib/content/master-writer-database-progress-v1.ts` (80 lines). Its dedicated test validates a future-facing PostgreSQL JSONB-stable checkpoint codec. The current section progress mechanism uses local filesystem checkpoints instead. Decide whether to wire up the DB checkpoint as an explicit product feature or retire this unused module and its test; do not quietly count it as production resilience.

## Current roles

- **Research and evidence:** `master-search-blueprint.ts`, `production-master-live-source-adapter.ts`, `production-master-live-research-assembler.ts`, `production-master-source-assembler.ts`.
- **Plan and contracts:** `master-runtime-adapter.ts`, `master-runtime-orchestrator.ts`, `master-runtime-hydration.ts`, `production-master-artifact-builders.ts`, `production-master-brief-ingress.ts`.
- **Generation:** `master-article-shell-generator.ts`, `master-article-generator.ts`, `master-article-composer.ts`, `master-writer-orchestrator.ts`, `master-section-context.ts`, `master-section-prompt.ts`.
- **Critics, verified repairs:** `master-article-deterministic-critics.ts`, `master-article-semantic-critics.ts`, `master-article-critic-fusion.ts`, `master-article-critic-repair-plan.ts`, `master-article-critic-repair-execution.ts`, `master-section-semantic-verifier.ts`, `master-section-repair.ts`.
- **Checkpointing:** `master-writer-section-progress-v1.ts` (active static dependency), `master-writer-database-progress-v1.ts` (test-only).

These classifications describe responsibility, not a claim that similarly named files contain no overlapping implementation.

## Actual complexity hotspots

| Module | Approx. LOC | Why it needs ownership review |
|---|---:|---|
| `production-master-live-stage-planner.ts` | 7,518 | 36 direct internal Content dependencies; multiple planning responsibilities |
| `service.ts` | 4,466 | Coordinates both brief creation and article generation, persistence and repair |
| `live-evidence-verification.ts` | 3,878 | Large evidence verification surface |
| `serp-replay.ts` | 2,780 | Replay and ranking-evidence comparison |
| `master-section-repair.ts` | 2,395 | Section repair boundary |
| `master-article-deterministic-critics.ts` | 1,900 | Multiple deterministic criticism rules |
| `master-article-critic-repair-execution.ts` | 1,499 | Critic repair execution and attempts |

High fan-in boundaries must remain stable during refactoring: `master-runtime-adapter.ts` has 20 direct production importers; `master-writer-orchestrator.ts` has 13, and `master-section-repair.ts` has 9.

## Consolidation plan

1. Freeze the current working Writer/API contract and tests. Preserve evidence provenance, exact claim and source ownership, repair limits, checkpoints, approval and publishing boundaries.
2. Make the stage graph explicit. Each production decision belongs to exactly one stage owner; instrument inputs, outputs, validation, cost, retries and reason codes with a per-run correlation ID.
3. **Start with the 7.5K-line planner, not the small validators.** Extract pure plan-candidate parsing, bounded retries, static contracts, evidence/keyword validation and prompt assembly into logically owned modules; retain a small orchestration entrypoint. This may initially *increase file count* but should reduce coupling and long-term defects.
4. Consolidate genuine duplicate policy implementations only after call-site and semantic test comparison. Never use filename similarity or line count as proof of duplication.
5. Make repair routing explicit: issue code → owning upstream stage → bounded repair → revalidation → persistence or an actionable STOP reason. No hidden failover or silent REJECTED cycles.
6. Remove or integrate test-only checkpoint code only with a deliberate decision and rollback plan.
7. Verify real brief-to-draft-to-critic-to-review execution with optional per-stage Writer tracing; TypeScript/Vitest/build alone do not prove runtime correctness.

## Scope and limitations

This audit is static, read-only and reports import reachability. Runtime selectors, lazy module paths and nonliteral dynamic imports can evade the graph. Further code-level proof and a full live pipeline run are needed before safely eliminating more master modules. The local backup branch `backup/writer-local-before-full-cleanup-20261017` is not included in the audit branch and must be reconciled separately.
