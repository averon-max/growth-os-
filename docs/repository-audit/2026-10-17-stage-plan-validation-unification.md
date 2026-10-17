# Stage Plan validation unification — no behavior-altering retry refactor

Date: 17 October 2026
PR: #54, `audit/full-repository-inventory-20261016`
Prior validated head: `b2847cb1077560ef5b72b761eafb6b9e2b12ac6f`.

## What was compared before changing code

The 7,028-line `src/lib/content/production-master-live-stage-planner.ts` repeated an identical **five-validator list** at four points. Whitespace-insensitive comparison of all four arrays confirmed exact same call sequence and arguments:

1. `inspectStagePlanCompleteness(plan)` — required schema/semantic fields and template planning checks.
2. `inspectStagePlanClaimOwnership(plan)` — no duplicate claim ownership, unknown claims and malformed assignments.
3. `inspectStagePlanCoverageOwnership(plan)` — known topics/questions and exactly one section owner each.
4. `inspectStagePlanQuestionIntentBoundaryV1({pageIntent: mission.missionIntent,queries: plan.queries,questions: plan.questions})`.
5. `inspectStagePlanDistinctInformationJobsV1({sections: plan.sections})`.

The four original evaluation sites were: (a) initial model JSON parse plus authoritative mission intent, (b) after deterministic question contraction, (c) after model-selected local claim-owner repair, and (d) after one bounded complete Stage Plan regeneration.

A second question-contraction invocation exists **after full regeneration**; the same local closure performs validation conditionally. It was intentionally not turned into a new complete regeneration.

Before this change all five inspectors already existed; this is **not** deletion of any gate or relaxation of any condition. The original list's raw issue strings, relative order, duplication and error propagation matter to the existing retry/fail-closed logic.

## Minimal changes

- Created `stage-plan-validation-collector-v1.ts`: one pure, deterministic, synchronous concatenation of those five inspectors, preserving their order and all returned issue codes. The two validators nested in the planner are passed as synchronous functions so their existing external research/mission closures remain unchanged.
- Replaced the four repeated lists with four calls to one local `inspectCurrentStagePlanV1` adapter that always inspects the **current mutable plan**. It does not store or cache results; it preserves subsequent local repair/retry decisions unchanged.
- Appended opt-in trace event `stage_plan.validation` with phase, pass/fail, issue count, original reasons, and current structural counts. It does not log hidden model reasoning, change retry budgets, or trigger new model calls.
- Distinguished `after_required_question_contraction` from `after_post_retry_question_contraction` even though both run the same deterministic closure.
- New tests verify exact original concatenation and issue multiplicity, current-plan freshness after repair, no mutation by inspection, unmodified exception propagation, all four validation sites, and distinguishing the two local contraction phases.

## Explicit invariants

- Mission intent is assigned before the initial and retried evaluations.
- Exactly the same five validators execute in the same order on the same stage-plan object.
- Invalid plan arrays remain subject to the same fail-closed behavior and subsequent bounded retry.
- Original AI invocation count, model prompt text, source evidence, SEO metrics, query graph, Prisma models and persisted article content are unchanged.
- No production files or tests removed; no migrations, DB writes or paid AI requests performed.

## Validation and deployment boundary

Require CI on **exact final commit**: deletion gate, TypeScript, full Vitest, Next.js production build. Unit/build tests are not substitutes for a recorded full real research-to-article run. The change remains in draft PR #54 and is **not** merged with the user's local October 10 Writer backup.

Rollback: revert the collector creation and both corresponding planner and test commits; the previous repeated lists are available in the parent commit via Git history.
