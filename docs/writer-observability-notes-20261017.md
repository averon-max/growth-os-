# Growth OS Writer — Forensic Observability Contract (2026-10-17)

Status: **diagnostic design and read-only report only**. Do not fix, regenerate, delete, publish, change quality gates, or change how the production Writer decides anything. Source branch: `test/writer-trace`. This diagnostic branch is isolated.

## What can and cannot be captured

OpenAI does **not** expose raw hidden chain-of-thought. On supported models, `reasoning.summary: "auto"` can request an externally available summary, but this requires a separate API request change and is NOT enabled by these files. Never label a generated explanation as hidden reasoning.

We CAN observe: complete submitted request messages, model outputs, explicitly returned decision explanations, candidate lists, rule-based transformations, hashes, provider IDs, source provenance, usage, errors, validator findings, repair attempts and intermediate article versions — only where the production code is instrumented to emit them.

## Current repository findings

- Existing `src/lib/content/writer-trace-v1.ts` writes append-only JSONL under `GROWTH_OS_WRITER_TRACE_DIR` when the trace context is active.
- Default: model prompt/output hashes and sizes only. `GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT=1` opts into model prompt/output text, capped at 2,000,000 characters per field.
- Generic fields currently truncate strings after 1,600 chars, arrays after 50 items, objects after 60 keys, nesting after depth 5. A trace is not automatically a complete snapshot.
- Current model exchange trace does not separately record every request field or developer message.
- Existing `production-master-live-stage-planner.ts` traces research counts, query metric provenance, stage-plan validation and recovery routes. It does not by itself prove full coverage of keyword selection, every SERP competitor, evidence continuity, section edits, critics or final audit.
- The wrapper must actually be entered through `withWriterTraceV1`. Setting environment variables alone does not prove any given entry point is traced.
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
