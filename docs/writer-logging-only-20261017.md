# Growth OS — logging first, no Writer repair

Status: **implementation only; not tested or merged**. The cleaned working branch `test/writer-trace` remains unchanged.

## Scope

The separate branch `diagnostics/writer-logging-only-20261017` keeps current instrumented Writer stages and improves ONLY diagnostics. No new SEO rules, no regeneration, no provider calls, no CMS publish, no database migration, no cleanup, no Writer quality changes.

Captures **observable model inputs, outputs and explicit decisions**, NOT private hidden chain-of-thought. Summary requests remain a separate API-affecting option from the parent branch; **do not set `GROWTH_OS_WRITER_TRACE_REASONING_SUMMARY`** during logging-only evaluation.

## Storage (when tracing is enabled)

```
.growth-os-traces/
  <run-id>.jsonl                    # SAFE metadata only
  <run-id>.artifacts/               # created only if opted into forensic snapshots
    000005-<random-uuid>.json
    000006-<random-uuid>.json
```

The run begins with its own unique ID. AsyncLocalStorage associates events with the same run, including concurrent requests. Nested trace wrappers share the parent context. JSONL writes are queued in event order. File permissions: run directory 0700, event/artifact files 0600 on POSIX. Trace initialization fails before the action if the directory cannot be opened privately; subsequent write errors are reported to stderr and become visible as incomplete or missing records. This is diagnostic storage, **not a guarantee of zero data loss on abrupt process termination**.

## Enablement (do not activate before the future diagnostic run)

```bash
export GROWTH_OS_WRITER_TRACE_DIR="$PWD/.growth-os-traces"
# Optional sensitive artifacts, including full model request/response envelopes:
export GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS=1
# Optional redundant complete prompt/output pair artifacts (requires artifacts=1):
export GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT=1
```

If `GROWTH_OS_WRITER_TRACE_DIR` is unset, no tracing runs. If only it is set, the JSONL records metadata, counters, safe enum-like strings and hashes; free-text values are suppressed in favour of hashes/length. A SHA-256 digest of a low-entropy value is not anonymization.

**Sensitive warning:** forensic artifacts may contain unpublished content, client information and credentials embedded inside free text. Key-name redaction is only best effort and cannot make such data safe for sharing. Keep them local, never push or paste them without manual inspection and redaction.

## Current captured boundaries

- Original keyword candidates, scored candidates, source observations, primary/secondary/supporting choices.
- SERP research results, competitors and provenance.
- Planner source inputs, GPT response, stage validation and final execution plan.
- GPT request configuration, provider response ID, SDK HTTP request ID, token usage including reasoning tokens when supplied, latency, incomplete status and retries. Incomplete/empty responses are observed before the original empty-output exception is thrown.
- Article generation contract, written draft, original and final critic suites, repair replay, SERP replay, publication policy and final readiness.
- All forensic snapshots are separately stored with SHA-256 and size recorded in the JSONL, instead of embedding sensitive text in normal events.

## Read-only report

```bash
node scripts/writer-trace-report.mjs .growth-os-traces
node scripts/writer-trace-report.mjs .growth-os-traces --run EXACT_RUN_ID
node scripts/writer-trace-report.mjs .growth-os-traces --run EXACT_RUN_ID --stage forensic.
# Private output — never paste without redaction:
node scripts/writer-trace-report.mjs .growth-os-traces --run EXACT_RUN_ID --stage forensic. --raw
```

The report checks detached artifact SHA-256 and size, malformed JSONL and missing terminal events. Missing events indicate observability gaps; they do **not** prove that the corresponding production stage never ran.

## Deferred deliberately

No real article generation, paid provider requests, Writer fixes, publishing or test execution in this stage. Forensic and report unit tests have been migrated to the separated-file format and expanded with isolation, corruption, tampering, disabled-mode and privacy scenarios, but **have not been executed on this new commit**. Neither the present worktree nor this document claims that TypeScript, tests or end-to-end recording are passing on this branch.

Next step after logging implementation is frozen: check static compatibility and run isolated unit/integration tests, then exactly one budget-limited diagnostic run, then analyze the logs BEFORE modifying the Writer.

## Immediate offline validation command

Use a clean local worktree, then run:

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run src/lib/content/writer-trace-v1.test.ts src/lib/content/writer-forensic-trace-v1.test.ts
node --test scripts/writer-trace-report.test.mjs
```

No article generation or provider calls are invoked by these targeted tests. Do not promote or run the Writer until all checks pass and any logging-specific failure is addressed.
