# Stage Plan recovery routing — pre-change audit and bounded extraction

Date: 2026-10-17. Working branch: `audit/full-repository-inventory-20261016`.
Reviewed baseline: `792956997f9a9e64190b654ca5cbd9589022bcfa`.

## Original runtime behavior verified before refactor

The ~6,900-line Stage Planner accepts a model-produced JSON Stage Plan, forces the user's SearchMission page intent, then runs the ordered five-gate validator shared in `stage-plan-validation-collector-v1.ts`. It can contract unowned/cross-intent required questions locally before deciding whether a model call is justified.

The **existing routing policy** was two independently embedded booleans:

1. `issues.length > 0 && issues.every(x => x.startsWith("sections[].requiredClaimIds duplicate-owner:"))` selected local owner-choice repair.
2. Any remaining nonempty issue set with `!localClaimOwnerRepairAttemptedV1` selected a single whole-Stage-Plan regeneration.
3. Local owner-choice repair consumed a semantic recovery slot. If its subsequent validator still found issues, it threw `LIVE_STAGE_PLAN_CLAIM_OWNER_REPAIR_INCOMPLETE` without calling the whole-plan model. That guard must remain.
4. The bounded full regeneration could be followed by the *existing* deterministic post-retry required-question contraction, then terminal fail-closed. There was no second full regeneration.
5. An isolated `sections[].informationGainClaimBreadth` terminal issue produced `LIVE_STAGE_PLAN_INFORMATION_GAIN_UNRESOLVED`, distinct from generic `LIVE_STAGE_PLAN_MODEL_OUTPUT_INCOMPLETE`.

Other constraints: malformed owner-choice payloads fail with `LIVE_STAGE_PLAN_CLAIM_OWNER_REPAIR_FAILED`, incompatible observed owner sets with `LIVE_STAGE_PLAN_CLAIM_OWNER_CONFLICT_MISMATCH`, and model transport failures preserve their original codes. A local repair must choose only among currently legitimate claim owners.

**Original model-call source count:** five separate `callContentAiJson` call sites in this planner, in different conditional branches. This count is a static upper-bound map of call sites, **not** a promise of five requests per article or a cost cap for all nested systems. No model execution was run in this extraction.

## New isolated contract

Created `src/lib/content/stage-plan-recovery-route-v1.ts`, a pure deterministic function taking only validation issues and whether either recovery slot is consumed.

| Conditions | Action |
|---|---|
| No issues, regardless of previously used slots | `ACCEPT` |
| Only `sections[].requiredClaimIds duplicate-owner:` codes and no used slot | `LOCAL_CLAIM_OWNER_REPAIR` |
| Any other or mixed issues and no used slot | `FULL_REGENERATION` |
| Nonempty issues after any model recovery slot was consumed | `STOP` |

The production planner now uses this route at the initial owner-repair decision and just before its single full-regeneration decision. The initial prefix literal still feeds exact conflict extraction. A final route is diagnostic only; the **same original terminal code and messages** remain authoritative, including information-gain-specific failure.

Three opt-in `stage_plan.recovery.route` trace events record the actual reason codes, route, and whether each recovery slot was consumed. Trace writing is asynchronous and failure-tolerant, and cannot generate an extra provider call. Their phases are `after_initial_question_contraction`, `before_full_plan_retry`, and `terminal_stage_plan_boundary`.

## Pre-deletion impact and rollback

Zero tracked files deleted. This work removes only the previous inline routing booleans; it does not delete or replace source validators, stored schemas, applied fixes, archived checkpoints or source-evidence packages. Input mission intent and exact query identities remain authoritative.

New tests validate the full policy truth table, the distinction between local and mixed issues, no cascade after local/full attempts, immutable issue lists, five unchanged provider-call source sites, original error codes, and all three trace locations.

Any future file removal still requires `repository-deletion-gate.mjs` review tied to its exact Git blob and human inspection of dynamic imports, DB schema, tests and rollback.

Rollback: revert the branch commits that add the route helper and its tests and modify the Stage Planner, or restore the previous inline boolean conditions from `7929569`. Do not overwrite the user's `backup/writer-local-before-full-cleanup-20261017` branch.

## Mandatory final verification

GitHub Actions must pass per-file deletion guard, TypeScript, full Vitest and Next.js production build on the **exact head** after the report is committed. This validates correctness against existing tests but is *not* a production integration proof. A recorded end-to-end Writer run with actual acquired evidence, controlled model charges, recovery and a complete trace is still required before merge/public rollout.
