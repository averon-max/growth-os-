# Growth OS Writer — Forensic Observability Contract (2026-10-17)

Status: **isolated, opt-in diagnostic instrumentation + read-only report; NOT production-validated**. Do not fix, regenerate, delete, publish, change quality gates, or change how the production Writer decides anything. Source branch: `test/writer-trace`. This diagnostic branch is isolated.

## What can and cannot be captured

OpenAI does **not** expose raw hidden chain-of-thought. On supported models, `reasoning.summary: "auto"` requests an externally available summary. This is available only with explicit `GROWTH_OS_WRITER_TRACE_REASONING_SUMMARY=1` on this branch. That flag changes the API request and may change costs/latency. It is OFF by default. Never label a generated explanation as hidden reasoning.

We CAN observe: complete submitted request messages, model outputs, explicitly returned decision explanations, candidate lists, rule-based transformations, hashes, provider IDs, source provenance, usage, errors, validator findings, repair attempts and intermediate article versions — only where the production code is instrumented to emit them.

## Current repository findings

- Existing `src/lib/content/writer-trace-v1.ts` writes append-only JSONL under `GROWTH_OS_WRITER_TRACE_DIR` when the trace context is active.
- Default: model prompt/output hashes and sizes only. `GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT=1` opts into model prompt/output text, capped at 2,000,000 characters per field.
- Generic fields truncate strings after 1,600 chars, arrays after 50 items, objects after 60 keys, nesting after depth 5. Forensic artifacts are opt-in, redacted by key, bounded to 16 MiB each, and written to the same JSONL run file. On oversize/serialization failure, the logger records an omitted/failure event instead of claiming complete capture.
- This branch adds request configuration, developer-message diagnostic copy, provider response envelope, response ID/status, unsuccessful attempts and optional available reasoning summary. The provider request itself is unchanged unless the user opts into reasoning summaries.
- Existing `production-master-live-stage-planner.ts` traces research counts, query metric provenance, stage-plan validation and recovery routes. It does not by itself prove full coverage of keyword selection, every SERP competitor, evidence continuity, section edits, critics or final audit.
- This diagnostics branch wraps `createContentBrief` and `generateArticleFromBrief` with `withWriterTraceV1`. Other independently invoked entrypoints are NOT necessarily traced. Setting environment variables alone does not prove any given entry point is traced.
- Trace write failures are swallowed by design; add explicit diagnostic health validation later without changing generation outcome.

## Mandatory trace domains for future additive instrumentation

1. **RUN:** run/article/brief IDs, commit SHA, configuration, market, model, budget, caller, start/end, stage timings, request IDs, retries, error categories.
2. **KEYWORDS:** raw GSC/DataForSEO candidates and source timestamps; normalized identity; intent, volume, difficulty, relevance, winnability, cannibalization, URL ownership; retained/rejected candidates with explicit reason codes; primary and all secondary query-node IDs; each selected query's downstream destination.
3. **SERP:** exact search query, market, capture time, top-result URLs/ranks; response status and retrieval reliability; competitor article title, word count, heading tree, content coverage, strengths/weaknesses and explicit absence of content; distinction between fetched full text and SERP snippet.
4. **EVIDENCE:** source URLs and trustworthy authority category, retrieval and verification, exact excerpt, claim IDs, evidence IDs, source version, section ownership, rejected excerpt reason, and all count deltas between research → runtime → writer contract → generated section → final audit.
5. **STRATEGY / PLAN:** complete inputs and outputs, each candidate plan, selected plan and explicit explanation, search intent, required user questions, internal linking plan, blueprint section ownership, validation findings and decision transitions.
6. **WRITING:** full request parameters/messages, raw JSON response, model/provider/version, section contract, input evidence IDs, produced text, covered query IDs, exact H1/H2/H3 tree and before/after word counts.
7. **CRITICS / REPAIR:** finding code, severity, exact location, evidence, allowed repair scope, retry number, model input/output, exact before/after diff, improved/regressed invariants, unresolved blockers.
8. **FINAL:** fact support, search intent, keyword-to-section map, topical depth, originality, cannibalization, title/meta, article word count, headings, SERP Replay by competitor, publication readiness; never conflate missing telemetry with an actual quality failure.

## Decision record (explicit output, not hidden thoughts)

For each observed model decision, preserve: `decisionId`, `stage`, `inputArtifactIds`, `candidateIds`, `selectedId`, `rejectedCandidateReasons`, `evidenceIds`, `explicitExplanation`, `uncertainties`, `modelRequestId`, `downstreamArtifactIds`. Do not synthesize missing reasons in the logger. If absent, mark `NOT_PROVIDED`.

## Control contract

- **OFF:** no tracing.
- **METADATA:** current `GROWTH_OS_WRITER_TRACE_DIR` enablement; existing hashed exchanges.
- **FULL_TEXT:** add `GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT=1`; sensitive local diagnostics only.
- **OBSERVE_ONLY:** instrumentation may record, but cannot alter selection, approve/reject, retry, write to database, publish, or affect the Writer's outputs.
- **APPROVAL / STOP / REPLAY:** future, separate feature requiring explicit production integration and tests. NOT implemented here. No fake claims that a read-only report can pause the pipeline.

Existing active article-specific editorial target (not a universal Google ranking threshold): **1 H1, 6 H2, 11 useful H3**, with query coverage and verified factual support. Record any deviation and its exact origin; do not force irrelevant headings.

## Read-only inspection

`node scripts/writer-trace-report.mjs .growth-os-traces`

The inspector reports actual event names, response fingerprints, token usage and missing visibility. `VISIBILITY_GAP` means **not observed**; it is not proof the underlying stage did not execute.

Never commit `.growth-os-traces/` or live unredacted prompts, excerpts, article content, credentials or personal data. Current gitignore excludes local traces. Keep local files private.

## Acceptance before claiming full end-to-end observability

A single future real run must show correlated events for all 8 domains, raw prompt/response fidelity checks, no unexplained artifact-count losses, preserved evidence links, exact section/heading changes, every retry, every critic and replay finding, final disposition, visible instrumentation errors, and `no behavior changes` regression tests. Until then, the system is **partial logging**, not a complete cognitive trace.

## Implemented on `diagnostics/writer-observability-20261017`

### Runtime switches (all off by default)

```bash
export GROWTH_OS_WRITER_TRACE_DIR="$PWD/.growth-os-traces"
export GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT=1
export GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS=1
# Optional: alters API request; supported model and extra token/cost risk
export GROWTH_OS_WRITER_TRACE_REASONING_SUMMARY=1
```

Do not set these until ready for a deliberate *future* controlled run. Forensic data may include unpublished drafts, source excerpts, proprietary strategy, personal details, and passwords embedded inside free-text prompts (field-name redaction is not a guarantee). Keep logs local, private and never push them to GitHub.

### Coverage

- Brief entrypoint, primary/secondary/supporting keyword strategies and full final plan.
- Original DataForSEO/GSC/site research payloads, SERP organic results and competitor analysis, source provenance and snapshots.
- Stage planning inputs/outputs, validator issues, recovery routes and assembled execution artifacts.
- OpenAI GPT request configuration, prompt/response, model IDs, provider retries, available response usage, optional reasoning summary.
- Full Writer section contract and draft, original/final critic suite, repair execution, competitive SERP replay and final readiness.
- Article statuses distinguish `REJECTED`/`BLOCKED_EXTERNAL` from success in trace terminology. NO change to persisted status or publication gate.
- Brief/article correlation by SHA-256 of brief ID.

`recordWriterForensicArtifactV1` does not infer a reason the model never supplied. It records actual outputs and decisions; missing reasons must remain missing. These logs are the maximum available **observed** model evidence, not raw private chain-of-thought.

### Read-only inspection and explicit controls

```bash
node scripts/writer-trace-report.mjs .growth-os-traces
node scripts/writer-trace-report.mjs .growth-os-traces --run EXACT_RUN_ID
node scripts/writer-trace-report.mjs .growth-os-traces --run EXACT_RUN_ID --stage forensic.
# WARNING: prints raw recorded content to your terminal
node scripts/writer-trace-report.mjs .growth-os-traces --run EXACT_RUN_ID --stage forensic. --raw
```

These are local read operations only. The files must already exist from another run. `--raw` prints private data; never paste unredacted results into public tickets.

### Verification (no production generation and no paid API calls)

```bash
npx tsc --noEmit
npx vitest run src/lib/content/writer-trace-v1.test.ts src/lib/content/writer-forensic-trace-v1.test.ts
node --test scripts/writer-trace-report.test.mjs
```

Those tests still require execution in a checked-out repository with dependencies installed. The branch is **not certified** until they pass. No CMS action, source deletion, database schema migration, or live generation was performed during this instrumentation.

### Not implemented

Manual pause/approve/resume, automatic budget circuit breaker, guaranteed full capture of all independent entrypoints, no-drop/durable telemetry on disk failure, and direct causal analysis of evidence loss remain future work. Missing telemetry is not evidence a stage did not execute.
