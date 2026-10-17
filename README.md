# Growth OS

SEO intelligence and content operations SaaS built with Next.js App Router, React, TypeScript, Prisma/PostgreSQL and an OpenAI-powered Content Writer.

## Development

Run from the repository root, with your own environment variables configured locally:

```bash
npm ci
npx prisma generate
npm run dev
```

Do not commit secrets or production database credentials. Schema migrations in `prisma/migrations` are historical and must not be deleted as “unused files.”

## Verification

```bash
npx tsc --noEmit
npx vitest run
```

The cleanup audit also provides a read-only dependency/reachability report:

```bash
node scripts/repository-audit.mjs
```

The report is written to the Git-ignored `.growth-os-tmp/repository-audit.json`. Static “unreferenced” results need human review; test setup, framework routes and dynamic imports can be legitimate.

## Writer execution trace (opt-in)

An append-only **per-run JSONL file** can capture observable execution, from brief research and keyword selection to model exchanges and article generation:

```bash
GROWTH_OS_WRITER_TRACE_DIR="$PWD/.growth-os-traces" npm run dev
```

Each request creates a separate `.jsonl` file. It records run stages, factual research summaries, keyword decisions, prompt/response SHA-256 hashes, characters, model identity, reported token usage and article structure.

Raw model prompts and generated outputs are **off by default**. To include them explicitly for local debugging:

```bash
GROWTH_OS_WRITER_TRACE_DIR="$PWD/.growth-os-traces" GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT=1 npm run dev
```

**Sensitive-data warning:** full prompts and responses can contain private business information. Trace files are Git-ignored, created with restricted permissions and should remain local, with access and retention controlled by the operator. Full-text capture is bounded to 2 million characters per field; oversized payloads are marked truncated.

This captures **observable inputs, outputs and deterministic decisions**, not private model reasoning or hidden internal tokens. Provider usage counts reflect OpenAI's reported token accounting; the trace does not reveal hidden reasoning content.

## Source of truth

Runtime code is in `src/`, database definitions in `prisma/`, and supported operational commands in `scripts/`. Old backups and agent-specific tooling were untracked from the cleanup branch; Git history preserves their earlier versions.
