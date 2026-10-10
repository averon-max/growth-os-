import {
  findVerifiedExcerptCandidateV1,
} from "./live-evidence-verification";

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : null;
}

/**
 * The stored execution plan is the post-evidence-contraction authority.
 * Claims belonging only to DEFERRED_NO_EVIDENCE or NOT_APPLICABLE
 * sections are not part of the final article and must not veto approval.
 *
 * Fail closed for EVERY factual claim/evidence reference actually owned
 * by a WRITABLE section. Do not treat a loose graph excerpt as enough:
 * the section must reference the matching verified evidence ID.
 */
export function assertStoredPublicationEvidenceV1(plan: unknown): void {
  const fail = (reason: string): never => {
    throw new Error(`PUBLICATION_EVIDENCE_INVALID:${reason}`);
  };

  const snapshot = asRecord(plan);
  if (!snapshot) fail("SNAPSHOT_MISSING");

  const runtime = asRecord(snapshot.masterRuntime);
  const ledger = asRecord(runtime?.claimLedger);
  const graph = asRecord(runtime?.evidenceGraph);
  const execution = asRecord(snapshot.articleExecutionPlan);

  if (
    !Array.isArray(ledger?.claims) ||
    !Array.isArray(graph?.claimEvidence) ||
    !Array.isArray(graph?.sources)
  ) {
    fail("EVIDENCE_GRAPH_MISSING");
  }
  if (!execution || !Array.isArray(execution.sections)) {
    fail("EXECUTION_PLAN_MISSING");
  }

  const claims = new Map<string, RecordValue>();
  for (const value of ledger.claims) {
    const claim = asRecord(value);
    if (!claim || typeof claim.id !== "string" ||
        !claim.id.trim() || typeof claim.text !== "string") {
      fail("CLAIM_INVALID");
    }
    if (claims.has(claim.id)) fail("CLAIM_ID_DUPLICATED");
    claims.set(claim.id, claim);
  }

  const evidenceById = new Map<string, RecordValue>();
  for (const value of graph.claimEvidence) {
    const evidence = asRecord(value);
    if (!evidence || typeof evidence.id !== "string" ||
        !evidence.id.trim()) fail("EVIDENCE_INVALID");
    if (evidenceById.has(evidence.id)) fail("EVIDENCE_ID_DUPLICATED");
    evidenceById.set(evidence.id, evidence);
  }

  const sourceIds = new Set<string>();
  for (const value of graph.sources) {
    const source = asRecord(value);
    if (!source || typeof source.id !== "string" ||
        !source.id.trim() || typeof source.url !== "string") {
      fail("SOURCE_INVALID");
    }
    let parsed: URL;
    try {
      parsed = new URL(source.url);
    } catch {
      fail("SOURCE_URL_INVALID");
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      fail("SOURCE_URL_INVALID");
    }
    sourceIds.add(source.id);
  }

  const writable = execution.sections.filter((value: unknown) => {
    const section = asRecord(value);
    if (!section || typeof section.state !== "string") {
      fail("SECTION_INVALID");
    }
    return section.state === "WRITABLE";
  });

  if (writable.length === 0) fail("NO_WRITABLE_SECTIONS");

  const requiredClaimIds = new Set<string>();
  const referencedEvidenceIds = new Set<string>();

  for (const value of writable) {
    const section = asRecord(value);
    if (!section || !Array.isArray(section.requiredClaimIds) ||
        !Array.isArray(section.evidenceIds)) {
      fail("SECTION_AUTHORITY_INVALID");
    }

    for (const id of section.requiredClaimIds) {
      if (typeof id !== "string" || !id.trim()) fail("CLAIM_REFERENCE_INVALID");
      requiredClaimIds.add(id);
    }
    for (const id of section.evidenceIds) {
      if (typeof id !== "string" || !id.trim()) fail("EVIDENCE_REFERENCE_INVALID");
      referencedEvidenceIds.add(id);
    }
  }

  const validReferencedClaims = new Set<string>();

  for (const evidenceId of referencedEvidenceIds) {
    const evidence = evidenceById.get(evidenceId);
    if (!evidence || typeof evidence.claimId !== "string" ||
        typeof evidence.sourceId !== "string" ||
        !sourceIds.has(evidence.sourceId)) {
      fail(`EVIDENCE_REFERENCE_INVALID:${evidenceId}`);
    }

    const claim = claims.get(evidence.claimId);
    if (!claim || claim.status !== "VERIFIED" ||
        typeof claim.text !== "string") {
      fail(`CLAIM_UNVERIFIED:${evidence.claimId}`);
    }

    if (
      evidence.relation !== "SUPPORTS" ||
      evidence.kind !== "VERIFIED_EXCERPT" ||
      typeof evidence.excerpt !== "string" ||
      findVerifiedExcerptCandidateV1({
        claimText: claim.text,
        bodyText: evidence.excerpt,
      }) === null
    ) {
      fail(`EVIDENCE_UNSUPPORTED:${evidenceId}`);
    }

    validReferencedClaims.add(evidence.claimId);
  }

  for (const claimId of requiredClaimIds) {
    const claim = claims.get(claimId);
    if (!claim || claim.status !== "VERIFIED" ||
        !validReferencedClaims.has(claimId)) {
      fail(`REQUIRED_CLAIM_UNSUPPORTED:${claimId}`);
    }
  }
}
