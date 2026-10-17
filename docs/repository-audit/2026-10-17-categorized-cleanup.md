# Growth OS — fast categorized cleanup (2026-10-17)

Baseline: `audit/full-repository-inventory-20261016` at `da8a1485d99d1b88abdd8973982552f53b16763b`. Counts are Git blob entries only, excluding directories.

| Category | Tracked files | Tests | Approx size |
|---|---:|---:|---:|
| Writer engine (`src/lib/content`) | 411 | 197 | 3,363 KiB |
| Other application (`src`) | 310 | 68 | 2,180 KiB |
| Prisma | 35 | 0 | 68 KiB |
| Scripts | 39 | 0 | 338 KiB |
| Documentation | 17 | 0 | 303 KiB |
| Static assets | 10 | 0 | 1,024 KiB |
| CI | 2 | 0 | 9 KiB |
| Root and misc | 12 | 0 | 452 KiB |
| **Total** | **836** | **265** | **~7,737 KiB** |

## Verified findings

- No committed `node_modules/`, `.next/`, `coverage/`, `dist/`, `.growth-os-tmp/` or `.growth-os-traces/` entries exist in this Git tree.
- The only pair sharing the same Git blob SHA is `public/world-110m.json` and `src/data/world-110m.json`. **Do not remove** either until both URL access and bundler import usage have been checked.
- Prisma's 35 tracked files are one `schema.prisma`, 33 migration SQL files and `migration_lock.toml`. No migrations have been removed.
- Largest Writer production modules: `production-master-live-stage-planner.ts` (~160 kB), `service.ts` (~99 kB), `existing-article-research-recovery-v1.ts` (~86 kB), `live-evidence-verification.ts` (~71 kB). Size does not prove redundancy.
- A repeated `*.backup_*` ignore pattern was removed in this branch. This is a no-runtime-behavior cleanup.

## Decision queue — execute in this order

1. **Clean, low risk:** Normalize redundant ignore entries and verify generated outputs remain untracked. No user data or runtime changes. [Started.]
2. **Scripts:** Initial contract-level inventory completed for all 41 files observed in the working branch; removed two prematurely added trace-report files. The 39 original scripts remain until deeper per-file evidence justifies removal. [INITIAL PASS COMPLETE; CI PENDING].
3. **Writer consolidation — ACTIVE, closure requires implementation + verified tests:** Isolate runtime orchestrator boundaries and canonical recovery ownership; move pure code after parity tests. Do not delete tests or merge different recovery semantics based on filename similarity.
4. **Other app:** Check routes, components, integrations against Next.js route and dynamic import graph before removing anything.
5. **Assets:** Check URL consumers before deduplicating `world-110m.json` copies.
6. **Prisma:** Preserve complete migration history and schema unless an independently validated baseline/squash procedure exists for deployed and fresh DBs.


## Current cleanup-branch snapshot

- At commit `4e0f260`: 838 tracked files, 39 scripts, 411 `src/lib/content` entries, 310 other application files, 35 Prisma files and 19 documentation files. Two premature logging-specific script files were removed, with exact-blob deletion decisions recorded.
- **Logging intentionally deferred until all cleanup sections and validation are complete**. Previously existing opt-in Writer runtime tracing is out of scope for now; it must not be expanded during cleanup.
- Next section: Writer, beginning with the existing static module reachability map and the large Stage Planner / `service.ts` boundary.
- These numbers reflect committed Git files, not ignored local generated files.

## Section progress as of 2026-10-17

- **Scripts:** all 41 CLI contracts initially examined, 2 premature logging-only additions removed, original 39 kept. The deeper dynamic/operational consumer audit remains a precondition to further deletion.
- **Content/Writer:** CODE REFACTOR PASS VERIFIED; production integration NOT YET PROVEN. Three large helper extractions and one shared approval/publish release-gate consolidation landed. Exact code head `1e6ef43` passed TypeScript, full Vitest, production build and deletion gate. **Do not call the Writer production-closed until an authorized E2E run passes.** See `2026-10-17-writer-cleanup-execution.md`.
- **API/UI/other libraries:** VERIFIED SAFE-CLEANUP PASS: identical Audience pagination helpers, three UTC-window calculations and pure formatters/selectors of three dashboard components consolidated with tests. Exact code head `d08ce64e` passed TypeScript, full Vitest, Next production build and deletion gate. No production provider, route or widget was deleted. See `2026-10-17-app-api-cleanup-execution.md`. Live API/browser integrations remain unverified.
- **CI:** latest cleanup branch head must still pass deletion gate, TypeScript, full Vitest and production build. A previously passing head is insufficient.
- **Prisma:** read-only Git-level inventory completed (35 files: 33 migrations, one schema, one lock; 36 models, 23 enums), all migration history intentionally retained. `npx prisma validate` added to CI; current-head CI needs confirmation. See `2026-10-17-prisma-cleanup-review.md`.
- **Logging:** explicitly deferred until completion of all cleanup sections and verification. No runtime instrumentation work in this phase.

## Protected

The existing Writer backup branch, PostgreSQL data, Prisma migrations, content drafts/articles, credentials, CMS publication and existing API contracts remain unchanged.

Every removal requires the existing `scripts/repository-deletion-gate.mjs` evidence record, tests, TypeScript and production build checks. A green GitHub commit by itself is not a full verification of a runtime article-generation flow.
