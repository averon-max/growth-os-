# Growth OS — API / UI / application cleanup execution

Date: 2026-10-17. Branch: `cleanup/category-pass-20261017`.

## Reviewed scope and source inventory

At the original section baseline there were 310 tracked non-Content `src/` files: 73 API, 29 other Next App files, 60 components, 146 non-Content `src/lib`, one data file and one test support file. The branch had already introduced 2 Audience pagination files before this phase. The current code head `d08ce64eec3d53baf3ab6610b6ad0dbaa5f0bfb4` contains **320** such files because pure helpers and their tests were added.

The repository static source inventory produced by GitHub CI on the prior verified head listed **only two potential unreferenced source files**: `src/lib/__mocks__/prisma.ts` and `src/test-setup/prisma-mock.ts`. Both are test infrastructure and are retained. Next.js `route.ts`/`page.tsx` framework entrypoints are not safe to delete solely from import reachability. The exact content duplicate of `world-110m.json` crosses the public URL and bundled source data boundary and is reserved for the Assets section.

## Changes made and why

1. **Audience API pagination:** identical `parsePositiveInt` implementations in `/api/audience` and `/api/audience/segments/[id]` were moved to `src/lib/audience/pagination.ts`. The permissive legacy `parseInt` behavior, default page/limit and authorization remain unchanged. Added parity tests.
2. **UTC reporting-window normalization:** `/api/traffic`, `/api/traffic/sync`, and `/api/audience/search-queries` each calculated the last complete UTC days independently. They now reuse `src/lib/audience/completed-day-range.ts` while retaining their distinct 7/15/30-day validation, sync 30-day constant, response payload, auth checks, provider calls and DB writes. Tests include leap-day, month/year transition and timezone-offset cases.
3. **Article Workspace presentation:** extracted six pure formatting, slug, label and movement functions to `article-workspace-formatters.ts`, with tests; removed ~115 net lines from the `article-workspace.tsx` client component.
4. **Traffic Intelligence presentation:** extracted six deterministic display functions to `traffic-intelligence-formatters.ts`, with tests; removed ~134 net lines from the client component. Country-meta mapping, requests, caching, map and charts remain unchanged.
5. **Content Explorer selectors:** extracted numeric fallbacks, keyword score/volume/difficulty, money and trend projections from `content-explorer.tsx` into `content-explorer-selectors.ts`. Moved type-only KeywordPlan/TrendPoint declarations; added tests to preserve fallback precedence and trend point selection. Removed ~311 net lines from this large client component.

Across this section's changes, **18 files** were added or modified (including the already made pagination extraction), with **789 added and 673 deleted lines** per GitHub compare against `e94a11c`; most added lines are relocated source and tests, not new runtime behavior. Eight new files were added in the present continuation (four modules + four tests). No original API route, UI feature, CMS provider, OAuth state, credential handler or data record was deleted.

## Providers / auth retention

Inspected the route/API boundaries and relevant supporting providers: `src/lib/auth.ts`, `src/lib/integrations/token-crypto.ts` AES-256-GCM, Cloudflare encrypted token connection service, WordPress/Custom CMS registry, and DataForSEO explicit provider transport. None may be retired based on naming or import-count similarity. Route-level auth and workspace/website ownership must be preserved. The mixed responsibilities in the largest components are a longer-term UI architecture backlog, not a proof of dead code.

## CI and risk boundary

**Exact code head `d08ce64e` passed GitHub Actions run `39060015124`:** deletion gate, repository import and Writer module scans, TypeScript, full Vitest, and Next.js production build.

Run: https://github.com/averon-max/growth-os-/actions/runs/39060015124

This demonstrates static/type/unit/build parity only. It does not demonstrate live Google/Cloudflare/DataForSEO calls, actual CMS publishing or authenticated browser UI interactions; no such calls were made.

## Section closure decision

**Safe code-cleanup scope completed:** all confirmed in-scope duplicate helpers were consolidated and tested; no runtime/module deletion without supporting ownership evidence. The repository contains additional large UI surfaces that should be refactored only with dedicated browser/regression coverage. **This is not a claim that every API/UI line is minimal or that a full production E2E has been exercised.**

**Next category:** Prisma schema and migration-history safety audit, then static assets and package dependencies. Observability is explicitly deferred.
