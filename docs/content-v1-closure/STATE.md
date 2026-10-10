# STATE — Growth OS Content Engine v1

Updated: 2026-10-10

## Repository
- Branch: wip/checkpoint-before-security
- .ts files in src/lib/content: 285 (down from 436)
- Production source files: 147
- Unit test files: 133 (all pass)
- Integration test files: 7 (excluded — require live DATABASE_URL)

## Test Results
- Unit: 133/133 files pass, 717/717 tests pass
- TypeScript: tsc --noEmit exits 0
- Integration (excluded): 7 files need real DB

## Pipeline Architecture — VERIFIED CORRECT
Entry: generateArticleFromBrief(generator, briefId)
  → prisma.contentBrief.findUnique (DB)
  → executeMasterWriterV1({ contract, generator }) [L2332]
  → POST_WRITER_CHECKPOINT: prisma.contentArticle.update [L2356]
  → critics / critic repair / SERP replay
  → evaluateContentGate [L3291]
  → evaluateArticlePublicationPolicy [L3370]
  → assertFinalArticleVersionIntegrityV1 [L3502]
  → buildProductionFinalArticleReadinessV1 [L3509]
  → PASS → IN_REVIEW (ONLY path)
  → WARN → IN_REVIEW with diagnostics
  → FAIL → REJECTED (fail closed)

Approve: approveArticle → evaluateExplicitPublishGateV1 [L3889]
Publish: publishArticle → evaluateExplicitPublishGateV1 [L4143]

## Key Invariants (DO NOT BREAK)
- RECOVERABLE_ARTICLE_FAILURES_V2 = empty Set (intentional)
- serp-replay-fingerprint.ts has zero Prisma imports
- IN_REVIEW can only be set by buildProductionFinalArticleReadinessV1
- No fake DATABASE_URL in tests
- 7 integration tests excluded, not deleted

## Files Changed This Session
- DELETED: 253 files (orphan tests, backups, stage6/7)
- ADDED: src/lib/__mocks__/prisma.ts
- ADDED: src/test-setup/prisma-mock.ts
- MODIFIED: vitest.config.ts (setupFiles + exclude)
- ADDED: docs/content-v1-closure/

## Remaining Work
- Phase 7 (Offline E2E): needs seeded DB or full service mock fixture
- Phase 8 (Final): merge to main, tag v1
- git config --global user.email / user.name (committer shows hostname)
