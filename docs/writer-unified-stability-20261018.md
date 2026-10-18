# Growth OS Writer — one pipeline, canonical preflight, actionable tracing

**Scope**: preserve existing modules and all 15 structural templates. No
replacement Writer, no blanket deletion, no new paid model path.

## One production route

`Keyword Research / Deep SERP → Search Mission → structural template →
 source-verified evidence → ArticleExecutionPlan → canonical preflight →
 executeMasterWriterV1 → deterministic + semantic critic →
 SERP/quality verification → IN_REVIEW`

Source-of-truth owners:
- Template policy and selection: `article-template-policy-v1.ts`.
- Model-independent generation boundaries: `article-generation-contract.ts`.
- Existing generation runtime: `master-writer-orchestrator.ts`, called by `service.ts`.
- Five pre-Writer authority gates: `canonical-writer-preflight-v1.ts`, wrapping
  the **existing** evidence, coverage, answer, capacity and mission functions.
- Run and model observability: `writer-trace-v1.ts`, with safe metadata
  and optional private forensic artifacts.
- Failure-to-owner classification: `writer-failure-diagnosis-v1.ts`.

The same checks now run **before a new brief is persisted**, in the
read-only `content-writer-closure.ts` CLI and immediately before production
generation. Changing a gate means changing one shared function, not
independently patching three entrypoints.

## Trace fields

With `GROWTH_OS_WRITER_TRACE_DIR` explicitly configured, a run records
`run.started`, `template.selected`, research/planner observations,
`writer.preflight.started/passed/blocked`, model exchange hashes, quality
artifacts, and `run.succeeded` or `run.failed`.

On failure, the safe JSONL includes a stable `reasonCode` and
`failureClass`, for example:

| Code family | Owner | Immediate action |
| --- | --- | --- |
| `SECTION_EDITORIAL_*`, `ARTICLE_PREWRITER_*` | RESEARCH_PLANNING | Repair source evidence or contract; don't spend Writer tokens |
| `MODEL_*`, `OPENAI_*`, budget | PROVIDER | Inspect budget/provider errors and reuse checkpoints |
| `WRITER_*`, `CRITIC_*`, quality | WRITER_EDITORIAL | Inspect stage/model hashes, selected section and critic |
| `PUBLISH_*`, `CMS_*` | CMS_PUBLICATION | Fix CMS; never regenerate approved article |
| `PRISMA_*`, `DATABASE_*` | PERSISTENCE | Inspect connection and article state |
| No stable error code | UNKNOWN | Inspect private trace, don't guess or auto-retry |

**Default diagnostic mode** stores **no raw prompt, response, article,
source URL or user keyword** in safe JSONL. Metadata strings outside an
allowlist are represented by cryptographic hashes and lengths.
`GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS=1` and
`GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT=1` are deliberately private opt-ins.
Forensic artifacts may contain business-sensitive data; do not upload them
into Git, send them in public bug reports or log them in CI.

## Failure closure

1. Check `run.failed.failureClass` and
   `writer.preflight.blocked.fields.reasonCode`.
2. When classified `RESEARCH_PLANNING`, fix the specific claim, evidence,
   question or section ownership **upstream**. Do not bypass the gate.
3. Confirm `template.selected.templateId` and that the frozen plan uses
   the same search intent and actual competitor research.
4. Validate the repaired brief with `content-writer-closure.ts --brief=ID`
   **without `--run`** before paying for another generation.
5. For provider/editorial failures, diagnose from checkpoints and model
   exchange hashes; do not restart a whole article or copy competitor prose.
6. Publishing remains a separately authorized human action.

## Safety and acceptance

Offline verification for this branch uses GitHub Actions:
`npx tsc --noEmit`, `npx vitest run src/lib/content src/lib/keywords`,
and `npm run build`. No paid DataForSEO/OpenAI calls, database mutations,
or CMS publications are part of those checks.

This is foundational hardening, not a claim that the entire SEO Writer
pipeline passes paid end-to-end article generation. A real existing brief
and market-specific research must be verified separately. Template word
ranges are planning guidance, **not ranking quotas**.
