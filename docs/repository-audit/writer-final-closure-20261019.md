# Growth OS Writer — closure investigation, 2026-10-19

## Evidence examined

- User-provided local CLI outputs, including October 19 article QA, query-owner preview and persisted approval, postcommit editorial preflight, actual text diff, byte-level join inspection, V2 offline/DB preflight, and the section-scoped research evidence review.
- The current GitHub repository's production service, one Master Writer, section-repair logic, run-budget policy, editorial release policy, evidence validation, explicit publish gate, legacy publication gate and safe JSONL trace reporter.
- Available Editorial V2 file and its pinned manifest: SHA256 41a3925afe4a671077ac4e377e7ecfd1329c87ee46f14fb1c0d5b7b7b7a5f442.

**Not available to the investigator:** raw private files in the user's Mac-only \`.growth-os-traces\`; actual production critic verdicts for Editorial V2; any successful latest SERP Replay for Editorial V2; persisted signed source excerpts for V2 supplements. Do not claim those were inspected or passed.

## Confirmed state

| Component | What logs prove | Do not infer |
|---|---|---|
| Production code | One MasterWriter plus bounded section repair and a shared release helper exist | Entire Writer is fully production-tested |
| Local technical checks | \`tsc --noEmit\` passed and 27/27 selected Vitest tests passed on earlier d26b5e2 code | New branch tests have passed |
| Saved article | Article remains \`IN_REVIEW\`, saved fingerprint \`99cff...\`; original replay matches original; original human query ownership approved for \`query_crcbh1\` | Original SEO-ready: replay had WARN |
| Current V2 file | Offline manifest hash passes; 1986 words; H1=1 H2=6 H3=6; technical=100; original H2 and URLs preserved | V2 ready for publication |
| V2 source scope | 7 out-of-scope section links at 5 distinct URLs; 1 URL exists elsewhere in source ledger without qualifying verified claim | URL appearance or government domain automatically verifies the claim |
| Latest V2 replay | \`SERP_REPLAY_CURRENT_VERSION_MISSING\` | Old replay may be reused |
| V2 human query owner | Prior approval fingerprint no longer matches | Auto-transfer human attestation |

### Historical issue details

1. Technical score of 100 was previously presented as a proxy for editorial/SEO readiness. **Fixed on earlier branch** by separate search readiness status.
2. A genuine observed DataForSEO same-page query was initially unowned despite an exact source-backed H2. Approved append-only review \`cmvbkpbw40000oyqlup5h51gn\` resolved old article ownership. That approval is **not transferable to changed bytes**.
3. Old article originally had 13 editorial issues (inline \`[Source: ...]\` labels + circular justification), 6 H2 and only 2 H3 in one H2. Local deterministic editorial candidate cleared those scanner findings while preserving signed same-H2 source URLs.
4. The user-supplied terminal diff rendered missing word spaces such as \`achange\`; separate byte tests on original and candidate found none of the specified missing spaces. Treat copy/paste representation as suspect, not as proof of saved data corruption.
5. Original SERP Replay was successful but WARN because \`https://money.com/best-credit-monitoring-services\` was missing comparison data. It had no blockers; do not retry paid research solely for this missing competitor URL.
6. Editorial V2 added FTC and related navigational links. The existing signed evidence/section map does NOT cover all the new claims, even if the external facts are accurate.
7. A ZIP file initially failed because it was absent on the user's Mac. A GitHub transfer initially lost a final LF, causing SHA mismatch; restored LF solved this. These were transfer issues, not Writer generation bugs.
8. Old query approval command reported \`newReviewInserted:false\`, a correct idempotent reuse, and originally exposed pg overlapping-query deprecation. Earlier branch serialized transaction reads.

## Verified risk in approval/publish flow (fixed in this branch)

The shared \`requireArticleReadyForReleaseV1\` validated the **snapshot's** VERIFIED_EXCERPT and the latest replay fingerprint but did not itself validate each **visible external citation** against that H2's signed VERIFIED_EXCERPT assignments. Consequently an article could have unauthorized or wrong-section external citations despite a valid technical score and replay.

This branch adds \`assertReleaseArticleCitationScopeV1\` after immutable snapshot validation in that shared release function, **before** approval persistence or CMS call. It rejects:
- Any external citation absent from the exact section's signed VERIFIED_EXCERPT authority.
- A globally verified source cited in the wrong H2.
- Zero visible citations or evidence-rich H2s with no section-owned visible citation.

A valid URL match is a **necessary** provenance condition and NOT automatic semantic claim-to-excerpt proof. No AI, new Research, publisher or DB write occurs in the helper.

The shared release path now also resolves Query Owner through the existing signed human-review overlay and checks observed query-to-H2 binding using the same Search Readiness engine used by dashboard and CLI. Unapproved/missing/query-to-section-bridge findings block approval and publication. A human review on a different article/replay fingerprint remains historic and cannot be reused.

## Remaining blockers to finish Editorial V2

The seven unmatched section links in five URL groups:

Use `scripts/content-writer-final-state.mjs` to consume the local V2 DB preflight, section evidence report and optional privacy-safe trace report in one read-only decision summary. This is a triage tool, not an auto-publisher.

- FTC identity theft education, H2 #3: already in global source ledger but no target section's verified claim.
- AnnualCreditReport.com, H2 #3 and #5: navigational official site; verify via FTC authority and clarify navigational/evidentiary function.
- FTC free credit reports, H2 #3 and #5: authoritative evidence still requires verified exact sentences and per-section claim assignment.
- FTC freeze or fraud alert, H2 #6: government evidence and per-section verified claim.
- IdentityTheft.gov, H2 #6: recovery-plan navigation backed by FTC source, distinguish link destination from verified evidence.

For each new **material factual claim**, stage source identity, source URL, retrieved/captured passage, exact claim text, VERIFIED_EXCERPT match, target section index, fingerprint of evidence revision, and semantic verdict. A source already in global ledger needs new **section-owned** claim-to-evidence review, not blindly added QueryGraph edges. Stage an append-only immutable candidate plan; never mutate existing masterRuntime.

Follow by one controlled bounded critique and fresh SERP Replay of the candidate fingerprint. If successful, require explicit version-matched human review of query owner; preserve article's original metadata, sources and version lineage. Old replay and human query approval must remain historic. DB commit requires explicit user authorization and an atomic compare-and-swap against the original saved article fingerprint, not silent overwrite.

### Done conditions for Writer product, not just this article

1. Existing single MasterWriter is canonical and all paths use it; no whole-article rewrite/research loops, only bounded section-level attempts.
2. Research before writing; no invented keywords/volumes/evidence.
3. Content final readiness is separate from technical score; no unconditional READY/SEO-ready labels from 100/100.
4. A versioned claim-to-source Section Contract prevents forged or wrong-section links at **approval and publish**.
5. Each saved article's final critics and replay belong to exact **same text fingerprint**, Query Owner approvals also match exact versions.
6. All critical boundaries are reproducibly covered by tests on the **user's** repo, with trace summaries of real runs; no invented test pass claims.
7. The article stays IN_REVIEW until all required gates pass and the user explicitly approves publication.

## Operator next step, no paid calls or DB writes

From a clean \`test/writer-trace\` checkout fast-forward to this branch, run TS + scoped Vitest tests, re-extract the transferred Editorial V2 files, run the offline and DB preflight and print summary, then get a privacy-safe trace summary:

\`\`\`bash
node scripts/writer-trace-report.mjs .growth-os-traces > .growth-os-tmp/writer-trace-report.json
\`\`\`

Don't use \`--raw\`; it exposes private research, model input and user content. The JSONL files do not exist in this GitHub tree; inspect on Mac only. Existing V2 and signed source mapping failures mean completion cannot be honestly claimed yet.
