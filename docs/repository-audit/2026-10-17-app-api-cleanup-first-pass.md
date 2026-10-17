# API / UI / other application — initial section inventory

Date 2026-10-17; branch `cleanup/category-pass-20261017`. This is the section **after** Content/Writer.

## Current tree inventory

310 tracked paths in `src/` excluding `src/lib/content/`:

| Area | Tracked files | Tests | Approx bytes |
|---|---:|---:|---:|
| `src/app/api/` | 73 | 6 | 275,142 |
| Other `src/app/` pages, layouts and icons | 29 | 0 | 164,085 |
| `src/components/` | 60 | 1 | 787,787 |
| Other `src/lib/` (auth, SEO, keywords, integrations, shared services) | 146 | 61 | 896,899 |
| `src/data/` | 1 | 0 | 107,761 |
| Test support | 1 | 0 | 595 |
| **Total** | **310** | **68** | **2,232,269** |

This tree scan found **no exact blob duplicates within the 310 files**; cross-boundary duplication is a separate question, especially `src/data/world-110m.json` versus `public/world-110m.json`, which share a blob but have different URL/import roles.

## Workstream / ownership boundary

- **API:** 73 tracked items under API, most Next.js route entrypoints; routes are dynamic framework entrypoints and MUST NOT be declared unused because they have no direct importers.
- **UI:** 60 components, including high-complexity `article-workspace.tsx` (~100.6 KB), `content-governance-panel.tsx` (~77.8 KB), `content-explorer.tsx` (~61.1 KB), and `traffic-intelligence.tsx` (~53.2 KB).
- **Services:** 146 non-Content lib files include 61 tests and critical auth, PostgreSQL, CMS, keyword/audience and provider integration contracts.
- **Shared assets:** world-110m URL endpoint vs bundler data import consumers require actual reference check before deduplication.

## Early inspected route contracts

- `src/app/api/content/briefs/route.ts` calls `createContentBrief` and production readiness, auth and keyword authority. It is not interchangeable with article generation.
- `src/app/api/content/briefs/[id]/generate-article/route.ts` uses `generateArticleFromBrief`, access control and the existing recovery wrapper. Its route path is a public API contract.
- `src/app/api/keywords/analytics/route.ts` uses workspace access and shared keyword-rank calculations, not an unowned replica of Content analytics.
- `src/app/api/audience/route.ts` uses website access, pagination and audience repository; no cleanup permitted until query/header behavior and consumers checked.
- `src/lib/auth.ts` contains active Credentials/NextAuth setup, not a disposable adapter.
- `src/components/dashboard/article-workspace.tsx` is a 100 KB client component with runtime Content analyzer/reader helpers and chart integration. Consider extracting pure view models *after* snapshot and UI acceptance tests.

## Risk-ranked order for the next complete pass

1. Inventory route handlers and check API path, method, authorization, HTTP status, and response schema consumers before changing any file.
2. Inspect page→component imports and dynamic render/Next entrypoints. Remove only proven unreachable widgets.
3. Compare shared utilities: query/date/number parsing, keyword rank calculations and token helpers; consolidate when error codes and user-facing output semantics are equivalent.
4. Audit integrations (Cloudflare, Google, CMS, keywords) for real provider contracts and token encryption; never mass-delete.
5. Check `world-110m.json` public URL and bundler importer usage separately.
6. Run deletion gate + full TS/Vitest/build on exact head.

## Current decision

**Inventory started, not finished. Zero API/UI/lib files deleted in this pass.** The Writer audit remains in `2026-10-17-writer-entire-section-assessment.md`; unverified Writer refactors are retained as technical debt rather than falsely declared complete.

No paid requests, database writes, CMS publication or logging implementation performed.
