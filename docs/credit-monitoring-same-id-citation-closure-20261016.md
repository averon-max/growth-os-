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

## Safe local acceptance sequence

1. Fetch PR and test all changed TypeScript and the specific pure verifier tests.
2. Run the no-cost SHA-locked `content-existing-article-citation-draft`. Output tells us exactly which signed claims already occur in the saved article, which sections have no match, and whether new valid citation Markdown can be proposed.
3. Run free `content-improve-existing-article-quality.ts --article=cmv606xg60006siqlir66uq23 --repair-signed-citations`. Confirm compatible signed baseline checkpoint and positive eligible citations. **Do not add --execute** until we inspect both reports.
4. If/only if preconditions are satisfied, one explicit paid same-ID execution may be authorized; all failures preserve the original. Independently verify final article source coverage, exact article fingerprint, new replay, signed query ownership and human review before any publish.

This work changes code and a PR document. It has NOT changed the user's database, purchased DataForSEO calls, invoked any paid verifier or completed a CMS publication.
