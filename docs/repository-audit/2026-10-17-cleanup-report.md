# Growth OS repository cleanup — 17 October 2026

## Verified baseline and change boundary

- Source branch: `fix/writer-template-context-closure-20261016`
- Source commit: `8401ea4771dcf5bb579e9a0576b045764c229710`
- Working audit branch: `audit/full-repository-inventory-20261016`
- User's separate local Writer preservation branch: `backup/writer-local-before-full-cleanup-20261017`, commit `c8b81a7e020eebe657e6fa29544b07d527cb8b55`. It has **not** been merged into this branch.
- Every tracked baseline path was inventoried in `2026-10-16-all-tracked-files.tsv` with original Git blob SHA and final retain/untrack disposition.

## File hygiene

| Measure | Before | After |
|---|---:|---:|
| Tracked files | 1,281 | 810 |
| Original files excluded from audit branch | 0 | 477 |
| New audit/trace files | 0 | 6 |
| Historical backups in current tree | 280 | 0 |
| Tracked temporary run files | 23 | 0 |
| Claude/Windsurf/agent skill files and lockfile | 103 | 0 |

Removed: historical backups, old temp scripts/logs, stale cookie jars/diagnostics, agent skill symlinks, one-time patch scripts and old closure snapshots; unreachable marketing components, dashboard widgets and orphan audience/keyword adapters. Removed the obsolete Gemini/Groq HTTP transports and Gemini-only reliability module/test. Retained the Next-generated `AGENTS.md` and all canonical schema, migrations, API handlers, runtime publishing logic and supported test suites. One imported support script was restored after the compiler revealed its dependency.

Do not equate the difference in file count with a proportional reduction in execution complexity. The Content subsystem is still large; deeply merging production modules without evidence would risk creating another unmaintainable mega-file.

## Static source analysis

`node scripts/repository-audit.mjs` enumerates tracked files, parses local static imports, identifies likely unreachable sources, detects exact duplicates, and writes a read-only report to `.growth-os-tmp/repository-audit.json`.

The original analysis found 35 statically unreferenced application-source candidates. It did not interpret that list as a deletion command: `src/test-setup/prisma-mock.ts` is dynamically loaded by Vitest and `src/lib/__mocks__/prisma.ts` is test infrastructure. Both are retained.

The identical `public/world-110m.json` and `src/data/world-110m.json` are deliberately retained pending confirmation of runtime URL and bundled-import consumers. No `node_modules`, Prisma migration or public asset has been mass-deleted.

## AI transport and tracing

Content AI uses OpenAI for live structured generation. The old `gemini-generator.ts` implementation and `geminiGenerator` export were renamed to `openai-generator.ts` and `openAiGenerator` across their known call sites in one atomic commit. The obsolete Gemini and Groq HTTP transports were removed. The current OpenAI-only runtime is covered by branch validation.

Opt-in trace: `GROWTH_OS_WRITER_TRACE_DIR="$PWD/.growth-os-traces" npm run dev`.

This creates per-run append-only JSONL files and includes: selected query and supporting keyword cluster, observed SERP research counts/benchmarks, model stage and model, prompt/output digests, OpenAI-reported input/output/total tokens, generated draft heading counts, recovery status and error classes. Trace output is off unless explicitly enabled; full-text prompts and model responses require `GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT=1`. Full text may contain private data and must be protected and retained appropriately. It is bounded to 2 million characters per field.

This system logs **observable execution evidence**, not hidden chain-of-thought or invisible internal model tokens.

## Regression policy

Validation workflow: `.github/workflows/cleanup-branch-verification.yml`.
- `npm ci` with locally scoped fake CI environment variables
- Static dependency report
- `npx tsc --noEmit`
- `npx vitest run`
- `npm run build` production smoke check

An earlier regression run completed successfully after restoring an imported script, followed by a successful full suite after tracing was enabled. Always inspect the final workflow run for the exact current head SHA before merging.

Two existing unit failures involving an absent `searchBlueprint.pageType` were corrected with a noninventive optional access in `master-section-prompt.ts`. An overaggressive removal of `scripts/rebind-approved-direct-answer-v1.ts` initially caused TS2307; that imported file was restored.

## Risks and merge constraints

1. Changes exist only on the independent audit branch; production and local user files are not modified.
2. This branch descended from the October 16 Writer line and has diverged significantly from the user's October 10 local-backup branch. Do **not** blindly merge those histories or overwrite either version.
3. Removing cookie jars and audit files from the Git tip does **not** erase them from Git history. Assess and rotate any potentially live credentials; history cleanup is a separate security operation.
4. The audit does not claim every source file can safely be eliminated. Keep critical code and data until you have demonstrable unused reachability, tests and runtime verification.
5. Local test/CI success does not prove live publishing, production database access, authentication or third-party API correctness. Verify a real brief-to-article-to-review flow separately in an authorized test environment.
