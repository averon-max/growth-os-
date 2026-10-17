# Stage Plan ownership check — isolated refactor

Date: 2026-10-17
Baseline: `f15f715d5ccaeadcc3dc5c46b3c1f91febf65b7f`
Feature branch: `audit/full-repository-inventory-20261016`.

## Pre-change analysis

The >7,200-line `production-master-live-stage-planner.ts` combined AI orchestration and pure validation. Its `inspectStagePlanCoverageOwnership` is a 256-line deterministic **inspection-only** helper. It accepts a StagePlanModelOutput with `topics`, `questions`, and `sections`, and returns reasons for unknown, duplicate, missing and multiply-owned topics/questions. It neither calls providers nor reads/writes Prisma, filesystem, article state, sources, caches or checkpoints. It intentionally preserves **exact-string** identities; there is no fuzzy matching.

At the baseline, the function has one declaration and four call sites inside the Stage Planner (initial plan validation, after local required-question contraction, after localized claim-owner repair, after bounded whole-plan retry). It must continue to run at all four points. Some incomplete model outputs lack arrays; those must remain the responsibility of the other completeness inspector rather than causing extra validation exceptions.

## Change

- Extracted the original coverage ownership function into `src/lib/content/stage-plan-coverage-ownership-v1.ts` with type-only import of `StagePlanModelOutput`, exported as a type from the original planner.
- Removed the in-file declaration, imported the replacement and preserved all four call sites.
- Compared the baseline function and extracted module after stripping only the added `export` keyword: **4,070 / 4,070 body characters exactly identical**.
- Added six unit tests for valid ownership, missing ownership, unexpected identities, duplicate owners, exact-string matching, lack of mutation and completeness-inspector handoff on absent arrays.
- No production files were deleted; none of the OpenAI calls, repair budgets, model prompts, DB schemas, source confidence or SEO metrics changed.

## Expected invariants and caveats

Inspection is deterministic and pure; the extraction does not promise improved article quality by itself. Existing tests and production build must pass on the *exact final commit*. A full paid brief→article→review→publish execution was not run here.

Rollback: revert the extraction commits (new helper, planner import/removal, unit test) or restore only the original helper from baseline using Git. The baseline full planner can be retrieved without touching the user's Mac backup. Do not merge into `main` or overwrite the independent local Writer branch without reconciliation.
