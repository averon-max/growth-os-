# SEO Writer — executed refactoring and validation, 2026-10-17

Branch: `cleanup/category-pass-20261017`
Before this execution: `372ea7053a19e846e3af523989d5cc22fa1eb3b3`
Code-validation head: `1e6ef436055dd3dfaa3edcb93488f531d2ec1810`
GitHub Actions: https://github.com/averon-max/growth-os-/actions/runs/39023211644

## Implemented changes

1. **Source discovery ownership:** moved the original `buildEvidenceFromLiveResearch` (329-line body) plus its private record helper from `production-master-live-stage-planner.ts` into `production-live-evidence-source-registry-v1.ts`. Previous export still exists; source discovery never creates a `VERIFIED_EXCERPT`.
2. **Prompt projection:** moved the exact `strategyPrompt` implementation (45-line body) out of `service.ts` into `content-strategy-prompt-v1.ts`. Rules against keyword stuffing and arbitrary H2/H3 quotas remain unchanged.
3. **Lexical claim matcher:** extracted 1,012 lines of deterministic tokenization and verified-excerpt matching from `live-evidence-verification.ts` to `evidence-lexical-matcher-v1.ts`. Existing public exports preserved. Polarity, numeric, negative-target and material-qualifier checks remain fail-closed. Updated the original scope-enforcement wiring regression test to inspect the correct implementation module.
4. **Release gate deduplication:** approval and publishing repeated the same checking sequence (confirmed by whitespace-/variable-normalized equivalence of common gate blocks). One local `requireArticleReadyForReleaseV1` helper in `service.ts` now runs that exact sequence for both phases. The original `IN_REVIEW` → `APPROVED` and `APPROVED` → CMS publication status preconditions, replay lookup, logging labels, side-effect ordering and separate status outcomes remain. This removes approximately 254 duplicated lines and has a wiring regression test.

Files changed are limited to Writer source/test files, with **no runtime database operation, API/model call, publish request or migration** executed by the refactor.

### Code-size measurements

| Main source file | Before lines | After lines |
|---|---:|---:|
| `production-master-live-stage-planner.ts` | 6,963 | 6,621 |
| `service.ts` | 4,466 | 4,165 |
| `live-evidence-verification.ts` | 3,878 | 2,878 |

The largest legacy file is still over 6,600 lines. Extracted modules have their own unit tests; total tracked Content files grew from 411 to 418, and tests from 197 to 201. **Fewer files is not an engineering success criterion** when separate responsibilities and tests improve maintainability.

## CI evidence and fixes

- `9cc083c`: TypeScript, full Vitest and production build passed.
- `1791035`: TypeScript, full Vitest and production build passed.
- `64b963b`: TypeScript failed due to a missing negative-claim token-set import after extraction.
- `8c0d1be`: TypeScript passed, but a location-based policy wiring test needed updating to inspect the new lexical module.
- `1e6ef43`: **SUCCESS** on GitHub Actions run `39023211644`: deletion gate, source inventory, writer module map, TypeScript, full Vitest and Next.js production build all passed.
- Additional source-verification, excerpt rejection, URL deduplication, strategy prompt and shared release-gate wiring tests were added.

## Decision and residual risks

**Completed in this iteration:** the pre-agreed safe cleanup/refactor pass and regression verification on the exact code head. No further files were proved safe to delete based on the static inventory, and no protected migrations/articles/assets or local backup branches were modified.

**Not yet proven:** a real end-to-end `brief → source acquisition → Stage Plan → article → review` against an authorized configured environment, and a CMS publish smoke run. GitHub's test/build success does not establish these. Any claim of full production Writer closure must wait for those checks.

Remaining architectural hotspots include the 6,621-line Stage Planner, 4,165-line Service, research-recovery orchestration, SERP replay and section repair. Further splitting them is a distinct high-risk refactor requiring its own parity tests and live proof. The intentionally test-only JSONB checkpoint codec remains retained, pending a product decision to use or retire it.

**Next-section rule:** the API/UI initial inventory exists, but no API or UI files should be removed or modified under the claim that the Writer is production-proven. The user has asked for cleanup before any additional logging; no logging implementation is part of this report.
