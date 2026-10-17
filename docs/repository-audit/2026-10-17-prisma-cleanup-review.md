# Prisma schema and migration safety review — 2026-10-17

Branch: `cleanup/category-pass-20261017`. Read-only repository inspection; no database access.

## Complete tracked Prisma inventory

- **35 Git-tracked files**: `prisma/schema.prisma`, `prisma/migrations/migration_lock.toml`, and **33 ordered SQL migration files**, from `20260821050652_init` through `20261016230000_content_query_owner_review`.
- The schema declares **36 models and 23 enums**; all Prisma Git blobs are unique (no exact duplicate SQL file).
- Migration lock provider: `postgresql`, matching the application's PostgreSQL setup.
- No committed generated Prisma Client or local database dumps were found in the earlier whole-tree cleanup audit. The configured package `postinstall` generates Prisma Client from the schema.
- The two ordered `20260924100301_01` and `_02` migration directories are distinct steps; do not collapse them as duplicate timestamps.
- The latest query-owner-review migration may be required by current Keyword/Content features. Preserve it and the full history.

## Safe-cleanup conclusion

**No migration, schema model, enum, primary key, relation or datasource definition should be deleted as part of code housekeeping.** SQL migration history is a deployed-database compatibility contract even if individual migrations have become superseded by later updates. A migration squash/baseline would require an independently verified procedure for both existing deployments and fresh databases, which has not been authorized.

**CI hardening:** `cleanup-branch-verification.yml` now runs `npx prisma validate` before TypeScript/Vitest/build. This is offline schema validation with a dummy CI datasource URL; it does not run migrations or touch PostgreSQL.

## Limits, required before production merge

- A successful `prisma validate` checks schema validity only, **not** successful replay of all 33 migrations on a fresh PostgreSQL instance or migration drift on any already-deployed database.
- No production or local database, migrations table, secrets, content records or credentials were inspected or changed in this audit.
- Production migration status and a clean baseline replay must be checked separately in a controlled environment before schema/deployment changes.
- A green GitHub Actions run for the **exact** branch head is required before merging the cleanup branch.

**Section disposition:** Prisma Git-level cleanup reviewed; preserve all 35 paths. Schema validation added to CI. Next: public/bundled assets and packages, with logging still deferred.
