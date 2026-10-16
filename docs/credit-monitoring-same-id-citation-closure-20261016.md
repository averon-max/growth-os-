# Growth OS — Signed source citation repair for saved Credit Monitoring

**Status: PR implementation, NOT yet locally validated or paid-executed.** 2026-10-16.

Article ID: `cmv606xg60006siqlir66uq23`, still `IN_REVIEW` on last user DB check. Previous confirmed exact article export SHA256: `b7b8a72bb9baedefb1358f204f8b3185f9214613d0d03d14f03ba78fd6b412df`. Existing article about 2078 words, so word-floor expansion always gives `NO_DEFICIT`. This is NOT a clean editorial pass: visible citations missing and QueryGraph query-to-H2 binding still unverified.

## Actual new capability

- `existing-article-source-citation-repair-v1.ts`: deterministic, **same-ID** candidate from the CURRENT DB article and persisted signed Research snapshot; uses only a `VERIFIED_EXCERPT` in the section's `evidenceIds` supporting a `VERIFIED` claim present in that section's `requiredClaimIds`. Exact full claim sentence must already exist as article prose; no semantic approximation, no invented facts, no new H1/H2. Only HTTPS links to signed evidence sources. A source being globally verified does NOT permit other H2s to cite it.
- `existing-article-citation-authority-v1.ts`: standalone candidate URL scope gate, blocks missing links and links outside signed H2 authority; semantic support and full quality are deliberately separate.
- `content-existing-article-citation-draft.ts`: SHA256-locked original, unpublished `IN_REVIEW` only, **no providers, models or DB writes**; locally exports an exact-source citation draft plus report if at least one full signed claim matches.
- `existing-article-quality-improvement-v1.ts`: new **`EXACT_SIGNED_CITATIONS`** mode, independent of word-floor check. Requires the source citation candidate to be nonempty and current provenance to match, uses isolated checkpoint directory, verifies each exact section via the existing paid source-grounded semantic/reconciliation verifier, rejects any verifier rewrite/URL scope drift, then invokes the existing nine critics, Content/Publication policy, live saved-research SERP Replay, exact fingerprint, and serializable CAS to update the SAME article, preserving prior article and replay in append-only provenance. Any failure before CAS leaves saved article unchanged.
- `scripts/content-improve-existing-article-quality.ts --article=ID --repair-signed-citations`: FREE preview with number of eligible claims and section citation proposals. Only `--execute --authorize-paid-improvement` opt-in can begin paid model verification. No implicit CMS publish.
- Regression tests for cross-section global citations, unsafe internal URL, paraphrase without verified anchor, heading mismatch, and owned-source draft. Tests still need local execution on Mac.

## Important limitations and release blockers

- A previously verified **claim is not necessarily copied verbatim** into editorial prose. The strict full-claim anchor deliberately refuses to insert a citation into a paraphrase. If zero additions, this release path stops *before* paid calls. The next action is a scoped semantic claim-to-sentence alignment workflow, not fuzzy text matching or fabricating references.
- An exact verified claim already present in an H2 is a conservative citation location, not proof that the entire paragraph is externally verified. The paid semantic gate, nine critics, and human editorial review remain necessary. An actual source excerpt might be stale; investigate as needed.
- Visible source citations alone do not formally version/rebind the QueryGraph node-to-H2 owner, nor prove ranking. The existing observed `does credit monitoring affect credit score` H2 still requires versioned ownership review. No blanket `SEO_READY` claim.
- The editorial V3 candidate with 14/16 citations outside section authority MUST NOT be directly imported as approved. No source laundering by trusting its manually added links.
- The previous `PUBLISH_FAILED` article for separate Data Broker topic is an unrelated CMS 404, NOT a reason to regenerate Credit Monitoring.

## Real original-article citation preview (user's 2026-10-16 Mac run)

- `tsc --noEmit` clean, three suites **12/12 tests PASSED**.
- Original SHA unchanged; article `IN_REVIEW`, 2078 words, six H2/two H3. Existing exact-source draft creates six links from *previously signed* excerpts, **zero off-section links**, but only 3/6 H2s have any cited source.
- Citations by H2 index: `0:1`, `1:0`, `2:0`, `3:2`, `4:3`, `5:0`. Sections 1,2,5 have signed evidence but paraphrased article sentences rather than literal claim text. Exact-claim citation insertion alone CANNOT finalize the article.
- Existing `same-article signed citation` free preview had `canBeginSameArticleSignedCitationRepair:true` despite this coverage defect. **Fixed**: the paid path now preflights ALL signed evidence-bearing H2s to have >=1 authorized visible citation and checks the same condition again before nine critics; this six-link-only draft is ineligible for paid persistence.
- Added `existing-article-semantic-citation-v1.ts` which prepares a bounded signed claim/excerpt → exact **existing** sentence worklist per H2, and verifies each model-chosen sentence ID exists in the unchanged stored article and evidence pair is section-owned. A reviewer cannot invent a claim, source, H2 or sentence. Model `SUPPORTED` results remain proposals, not certified publication evidence.
- Added `scripts/content-existing-article-semantic-citation-review.ts`: FREE by default, with no-cost worklist and counts of missing paraphrase alignments. Only `--execute --authorize-paid-semantic-review` explicitly authorizes at most one bounded semantic model review per eligible section. The optional paid review writes a local candidate Markdown+report only; **NEVER mutates DB**, never runs CMS, and cannot skip nine critics/new exact fingerprint SERP Replay. Model review is not legal or scientific fact verification.
- Further stage still required: connect reviewed, signed exact-sentence suggestions into the existing same-ID semantic verification + nine-critic+Replay+CAS engine with explicit proof of their provenance and stable version; do not read an untrusted Markdown candidate and write it directly. Also versioned Query Graph re-binding for `does credit monitoring affect credit score`.

**Important nuance:** Some observed source URLs are from publishers of different authority; signed evidence allocation does not imply that every paragraph is source-supported. Paid semantic review must reject any complete sentence that is not directly entailed by its exact signed excerpt, not simply topical overlap.

## Safe local acceptance sequence

1. Fetch PR and test all changed TypeScript and the specific pure verifier tests.
2. Run the no-cost SHA-locked `content-existing-article-citation-draft`. Output tells us exactly which signed claims already occur in the saved article, which sections have no match, and whether new valid citation Markdown can be proposed.
3. Run free `content-improve-existing-article-quality.ts --article=cmv606xg60006siqlir66uq23 --repair-signed-citations`. Confirm compatible signed baseline checkpoint and positive eligible citations. **Do not add --execute** until we inspect both reports.
4. If/only if preconditions are satisfied, one explicit paid same-ID execution may be authorized; all failures preserve the original. Independently verify final article source coverage, exact article fingerprint, new replay, signed query ownership and human review before any publish.

This work changes code and a PR document. It has NOT changed the user's database, purchased DataForSEO calls, invoked any paid verifier or completed a CMS publication.
