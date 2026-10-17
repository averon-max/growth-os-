# Assets and package dependencies — safety assessment (2026-10-17)

Scope: tracked static assets and the current `package.json` on `cleanup/category-pass-20261017`. This is a repository-level read-only assessment, not a local production runtime audit.

## Assets

- Public assets: 10 (6 SVG, 4 landing PNG, 1 world atlas JSON; counted individually: 5 SVG? `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`; 4 PNG; 1 JSON = 10).
- `public/world-110m.json` and `src/data/world-110m.json` are **byte-identical** (Git blob `055d19ffcf3133435978527737ff8ad37a568c59`, each 107,761 bytes).
- The runtime `src/components/dashboard/audience-geo-intelligence.tsx` passes `geography="/world-110m.json"` to `react-simple-maps`: **retain the public URL**. Removing it would break the geo map.
- The bundled `src/data/world-110m.json` has no confirmed current importer from this review; this is a candidate for a deeper import/dynamic-consumer search, not approval for deletion.
- Landing images `hero-keywords.png` and `feature-keywords.png` are referenced by `src/app/page.tsx`. The other landing images may have dynamic or responsive consumers not established here. Do not delete based on filename.
- The original `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` look like framework starter assets, but public URL consumers and external links are not fully auditable from static module references alone. Mark **review pending**.
- No assets removed: the only exact duplicate crosses bundled-import vs public-URL semantics, and a safe deletion requires the existing per-blob deletion gate, a complete reference search, and browser/map smoke testing.

## Dependencies

Current declared production packages: 23. Dev dependencies: 13. `postinstall` invokes `prisma generate`; Prisma-specific script allow-list retained.

Confirmed direct uses in inspected application modules:
- `react-simple-maps`: geographic display.
- `recharts`: dashboard charts.
- `lucide-react`: dashboard icons.
- `next`, `react`, `next-auth`, `@prisma/client`: framework, auth and data access.
- `openai`, DataForSEO and Google integration packages have protected production routes/services documented in preceding audits.

No package removal is approved from the present evidence. A package can be used dynamically, through build plugins, code generation, Prisma adapters, type declarations or CLI scripts without a simple bare module import. Before removing any declared dependency, run a full import/callsite search, `npm ls`, generated Prisma client/build checks, Vitest and route smoke tests; update `package-lock.json` atomically and run exact-head CI.

## Work remaining

1. Exhaustive local reference scan for assets including JSX `src`, CSS `url(...)`, string literals, dynamic data imports, and external URL contracts.
2. Exact package import/require/CLI usage inventory covering app, scripts, configs, and tests. Remove only confirmed unused packages after a lockfile update in a reproducible checkout.
3. Final category gate: full TypeScript, Vitest, Prisma validate, production build and manual representative API/UI/browser/Writer run. GitHub CI cannot establish live provider validity on its own.

**Status: reviewed and protected, not claimed fully optimized.** No logging/observability changes.

## Verified reference scan and safe asset removal

Exact CI inventory produced at code head `94b2d2cd`, run [39062546563](https://github.com/averon-max/growth-os-/actions/runs/39062546563) found zero application TS/TSX/JS/CSS references to `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`, `feature-audience.png`, or `hero-audience.png`. Each appears to be an unused boilerplate or superseded marketing asset. Existing rendered landing images `feature-keywords.png` and `hero-keywords.png` are intentionally protected and retained.

`src/data/world-110m.json` has no direct application or import reference; the only direct text reference was the audit script enumerating that path (self-reference, excluded in updated audit). Its SHA `055d19ffcf3133435978527737ff8ad37a568c59` equals the served copy at `public/world-110m.json`. The public copy is referenced by Audience Geo Intelligence and is **retained**.

Eight redundant files are approved for deletion in one atomic reviewed commit, with exact Git object SHA and rollback instructions in `deletion-decisions.json`. There is residual uncertainty about undocumented external direct URLs to discarded assets, but no known app, CSS, Next server entrypoint, script or data contract references them.

Validation requirements: deletion gate, `npx prisma validate`, `npx tsc --noEmit`, complete `npx vitest run`, Next production build and browser smoke for Audience geo map and homepage. GitHub CI exercises the first five checks; browser smoke remains outstanding.
