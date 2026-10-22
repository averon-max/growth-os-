# Growth OS Writer — simple, observable, single writer

## What changed
No new generator. The existing production \`generateArticleFromBrief\` continues to run the one canonical Master Writer with verified research, bounded section repairs, nine critics, fingerprinted SERP Replay and explicit release/publish gates.

We changed **observability only**:
- In \`NODE_ENV=development\`, a private \`.growth-os-traces/<run>.jsonl\` is recorded automatically (unless the trace env points elsewhere). In production, logging is opt-in with \`GROWTH_OS_WRITER_TRACE_DIR\`.
- Explicit CLI \`content-writer-closure --run\` automatically enables safe local trace and prints the one inspection command.
- The **actual production pipeline** emits compact events for draft, initial/final critics, last post-SERP-repair critics, replay (completed/skipped/failed), final readiness (PASS/WARN/FAIL), and terminal status.
- \`node scripts/writer-status.mjs\` prints the latest article run, stage by stage, and the actionable failure code. \`--json\` produces a compact machine-readable report.
- The JSONL file contains scrubbed metadata by default. For one controlled local run, set both `GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS=1` and `GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT=1`; the same file then embeds private research, prompt/output snapshots, the bounded keyword inventory, and the exact heading outline. These details can include confidential website/article data. Keep the file local; never commit or share it. Private artifacts are capped at 16 MiB each and their hashes are recorded.

## Commands

View the latest actual Writer article run — **read-only**, no model or database:

\`\`\`bash
cd /Users/user/growth-os
node scripts/writer-status.mjs
node scripts/writer-status.mjs --json
\`\`\`

For a **new brief with no existing IN_REVIEW article**, dry-run the exact canonical preflight before spending any money:

\`\`\`bash
npx tsx scripts/content-writer-closure.ts --brief=BRIEF_ID
\`\`\`

To explicitly generate only after preflight and budget review (**PAID, mutates DB**, requires operator action):

\`\`\`bash
GROWTH_OS_LIVE_WRITER=1 npx tsx scripts/content-writer-closure.ts --brief=BRIEF_ID --run
\`\`\`

Do not use generation again for an existing IN_REVIEW article; do not run it solely to create a log. Existing \`cmv606xg60006siqlir66uq23\` should finish through its V2 evidence+review/publish path, not whole-article regeneration.

Advanced *safe* all-runs diagnostics remain available in \`node scripts/writer-trace-report.mjs .growth-os-traces\`. Never share \`--raw\` unless you intend to expose private prompts and research.

## Status interpretation

- \`NOT_RECORDED\` means the event was absent from **that run's** log, not that the stage failed.
- \`SERP WARN\` is not automatically a broken article or a reason to rerun DataForSEO.
- \`READINESS PASS\` means eligible for the next explicit review, not approved/published.
- After any prose edit, previous fingerprinted Replay and Query Owner approval are historical, not transferable.
- Real publishability still depends on signed H2 evidence, version-matched critics/replay, human review, and CMS integration.

## Acceptance (offline)

\`\`\`bash
node --test scripts/writer-status.test.mjs scripts/writer-trace-report.test.mjs
npx vitest run src/lib/content/writer-trace-v1.test.ts src/lib/content/writer-trace-resilience-v1.test.ts src/lib/content/article-release-shared-gates.test.ts
npx tsc --noEmit
\`\`\`

The trace records the template selected during brief planning, links it to the article run using a one-way brief-ID hash, and records keyword/plan counts plus draft word/H2/H3/exact-phrase metrics. Full keyword terms and headings are available only in the explicit private-artifact mode. The existing 15-template policy remains the source of template rules; the trace is evidence for the next design step, not a new writer by itself.

This change does **not** fake new Writer generation, Critic approvals, replay, evidence signatures or CMS success. It makes actual future runs observable in one file.
