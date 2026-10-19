# Editorial V2 — staged official evidence, no DB mutation

## Current verified state
- Candidate `41a3925afe4a671077ac4e377e7ecfd1329c87ee46f14fb1c0d5b7b7b7a5f442` (1,986 words, 6 H2, 6 H3) is **not** saved in the article table.
- The real Mac CLI fetched all three FTC sources: 3 × HTTP 200, all requested exact fragments present, official navigation anchors present, 5/5 URL-to-H2 locations matched.
- The original article remains IN_REVIEW; new full 9-critic verdict, new SERP Replay and new human Query Owner decision do **not** exist.
- `writer-status` existing old runs report NO_LOCAL_WRITER_TRACES; don't regenerate the article just to get logs.

## New stage
`scripts/content-v2-stage-evidence.ts` is read-only with respect to PostgreSQL:
- Reads the exact original ContentArticle and original EvidenceSnapshot, confirms source fingerprint, section ordering, 2026-10-19 candidate SHA and successful local FTC-fetch proof.
- Refetches only the 3 signed-off FTC origin URLs (HTTP, no paid model or search). Captures **exact text from the fetched FTC pages**, never model-constructed quotations.
- Clones the original snapshot; proposes five additional exact-source claim/evidence pairs with original research types and source ownership.
- Rebuilds ClaimLedger through its existing `buildClaimLedger` policy and rejects any change in old claim status. Runs `assertStoredPublicationEvidenceV1` and `inspectMasterRuntimeSnapshot` on the staged clone.
- Verifies all fact citations belong to the same H2; any remaining unmatched URLs must be the exactly reviewed official navigation URLs, each backed by a matching FTC source in that H2.
- Writes a PRIVATE local `.growth-os-tmp/v2-review/staged-evidence-snapshot.json`. The exact source sentences and old research remain in the user's local file only. GitHub receives no private snapshot or article data.

**Important:** a FTC quotation being lexically verified as a source sentence is NOT the same as a semantic entailment verdict for a paraphrased sentence in the editorial article. The staged snapshot is a proposal, not a signed Research Pack or release authorization. Navigation links are reviewed but NOT enabled for publication by this branch.

## Operator test, no paid calls, no database writes

```bash
cd /Users/user/growth-os
git fetch origin fix/v2-staged-evidence-snapshot-20261019
git merge --ff-only FETCH_HEAD
npx tsc --noEmit
NODE_OPTIONS=--conditions=react-server npx tsx scripts/content-v2-stage-evidence.ts
```

## Pending after that check
1. If stage validation fails, fix the **specific** existing source/claim/plan invariant without bypassing it.
2. Review paraphrased candidate sentences against captured exact quotes; persist reviewed section evidence to a versioned, authorized EvidenceSnapshot only on explicit approval.
3. Build the general reviewed official-action link contract: source-backed, same H2, exact candidate fingerprint, explicit human approval (never allow arbitrary external links).
4. Run the existing bounded critics and true new-fingerprint replay on the exact unchanged V2 text. Require new human Query Owner approval and explicit atomic save/publish.
