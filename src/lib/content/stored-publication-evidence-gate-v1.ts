import { findVerifiedExcerptCandidateV1 } from "./live-evidence-verification";

type JsonRecord = Record<string, unknown>;

function fail(reason: string): never {
  throw new Error("PUBLICATION_EVIDENCE_INVALID:" + reason);
}

function requireRecord(value: unknown, reason: string): JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return fail(reason);
  }
  return value as JsonRecord;
}

function requireArray(value: unknown, reason: string): readonly unknown[] {
  if (!Array.isArray(value)) return fail(reason);
  return value;
}

function requireString(value: unknown, reason: string): string {
  if (typeof value !== "string" || !value.trim()) return fail(reason);
  return value;
}

/**
 * The persisted execution plan is authoritative for post-research section
 * scope. Deferred claims cannot block an article that does not use them.
 * Every claim and evidence referenced by a writable section must still
 * have publication-grade evidence in the immutable stored runtime.
 */
export function assertStoredPublicationEvidenceV1(plan: unknown): void {
  const snapshot = requireRecord(plan, "SNAPSHOT_MISSING");
  const runtime = requireRecord(snapshot.masterRuntime, "EVIDENCE_GRAPH_MISSING");
  const ledger = requireRecord(runtime.claimLedger, "EVIDENCE_GRAPH_MISSING");
  const graph = requireRecord(runtime.evidenceGraph, "EVIDENCE_GRAPH_MISSING");
  const execution = requireRecord(snapshot.articleExecutionPlan, "EXECUTION_PLAN_MISSING");
  const claimEntries = requireArray(ledger.claims, "EVIDENCE_GRAPH_MISSING");
  const evidenceEntries = requireArray(graph.claimEvidence, "EVIDENCE_GRAPH_MISSING");
  const sourceEntries = requireArray(graph.sources, "EVIDENCE_GRAPH_MISSING");
  const sectionEntries = requireArray(execution.sections, "EXECUTION_PLAN_MISSING");

  const claims = new Map<string, JsonRecord>();
  for (const entry of claimEntries) {
    const claim = requireRecord(entry, "CLAIM_INVALID");
    const id = requireString(claim.id, "CLAIM_INVALID");
    requireString(claim.text, "CLAIM_INVALID");
    if (claims.has(id)) fail("CLAIM_ID_DUPLICATED");
    claims.set(id, claim);
  }

  const evidenceById = new Map<string, JsonRecord>();
  for (const entry of evidenceEntries) {
    const evidence = requireRecord(entry, "EVIDENCE_INVALID");
    const id = requireString(evidence.id, "EVIDENCE_INVALID");
    if (evidenceById.has(id)) fail("EVIDENCE_ID_DUPLICATED");
    evidenceById.set(id, evidence);
  }

  const sourceIds = new Set<string>();
  for (const entry of sourceEntries) {
    const source = requireRecord(entry, "SOURCE_INVALID");
    const id = requireString(source.id, "SOURCE_INVALID");
    const url = requireString(source.url, "SOURCE_INVALID");
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      fail("SOURCE_URL_INVALID");
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      fail("SOURCE_URL_INVALID");
    }
    if (sourceIds.has(id)) fail("SOURCE_ID_DUPLICATED");
    sourceIds.add(id);
  }

  const writable: JsonRecord[] = [];
  for (const entry of sectionEntries) {
    const section = requireRecord(entry, "SECTION_INVALID");
    const state = requireString(section.state, "SECTION_INVALID");
    if (state === "WRITABLE") {
      writable.push(section);
    } else if (state !== "DEFERRED_NO_EVIDENCE" && state !== "NOT_APPLICABLE") {
      fail("SECTION_STATE_INVALID");
    }
  }
  if (writable.length === 0) fail("NO_WRITABLE_SECTIONS");

  const requiredClaimIds = new Set<string>();
  const referencedEvidenceIds = new Set<string>();
  for (const section of writable) {
    for (const value of requireArray(section.requiredClaimIds, "SECTION_AUTHORITY_INVALID")) {
      requiredClaimIds.add(requireString(value, "CLAIM_REFERENCE_INVALID"));
    }
    for (const value of requireArray(section.evidenceIds, "SECTION_AUTHORITY_INVALID")) {
      referencedEvidenceIds.add(requireString(value, "EVIDENCE_REFERENCE_INVALID"));
    }
  }

  const verifiedReferencedClaims = new Set<string>();
  for (const evidenceId of referencedEvidenceIds) {
    const evidence = evidenceById.get(evidenceId);
    if (!evidence) fail("EVIDENCE_REFERENCE_INVALID:" + evidenceId);
    const claimId = requireString(evidence.claimId, "EVIDENCE_REFERENCE_INVALID:" + evidenceId);
    const sourceId = requireString(evidence.sourceId, "EVIDENCE_REFERENCE_INVALID:" + evidenceId);
    if (!sourceIds.has(sourceId)) fail("EVIDENCE_REFERENCE_INVALID:" + evidenceId);

    const claim = claims.get(claimId);
    if (!claim || claim.status !== "VERIFIED") fail("CLAIM_UNVERIFIED:" + claimId);
    const claimText = requireString(claim.text, "CLAIM_UNVERIFIED:" + claimId);
    if (evidence.relation !== "SUPPORTS" || evidence.kind !== "VERIFIED_EXCERPT") {
      fail("EVIDENCE_UNSUPPORTED:" + evidenceId);
    }
    const excerpt = requireString(evidence.excerpt, "EVIDENCE_UNSUPPORTED:" + evidenceId);
    if (findVerifiedExcerptCandidateV1({ claimText, bodyText: excerpt }) === null) {
      fail("EVIDENCE_UNSUPPORTED:" + evidenceId);
    }
    verifiedReferencedClaims.add(claimId);
  }

  for (const claimId of requiredClaimIds) {
    const claim = claims.get(claimId);
    if (!claim || claim.status !== "VERIFIED" || !verifiedReferencedClaims.has(claimId)) {
      fail("REQUIRED_CLAIM_UNSUPPORTED:" + claimId);
    }
  }
}
