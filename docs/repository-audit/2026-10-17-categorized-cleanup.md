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
2. **Scripts:** For each script, check references from `package.json`, CI, other scripts, imports, documentation, and manual operational runbooks. Delete only with explicit per-file evidence and deletion-gate record.
3. **Writer trace:** Add a local read-only summary of per-run JSONL traces (stage timings, errors, attempts, token totals and missing stages). Do not expose prompt bodies or API keys. No paid model calls.
4. **Writer consolidation:** Isolate runtime orchestrator boundaries and canonical recovery ownership; move pure code after parity tests. Do not delete tests or merge different recovery semantics based on filename similarity.
5. **Other app:** Check routes, components, integrations against Next.js route and dynamic import graph before removing anything.
6. **Assets:** Check URL consumers before deduplicating `world-110m.json` copies.
7. **Prisma:** Preserve complete migration history and schema unless an independently validated baseline/squash procedure exists for deployed and fresh DBs.

## Protected

The existing Writer backup branch, PostgreSQL data, Prisma migrations, content drafts/articles, credentials, CMS publication and existing API contracts remain unchanged.

Every removal requires the existing `scripts/repository-deletion-gate.mjs` evidence record, tests, TypeScript and production build checks. A green GitHub commit by itself is not a full verification of a runtime article-generation flow.
