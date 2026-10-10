import {
  findVerifiedExcerptCandidateV1,
} from "./live-evidence-verification";

export function assertStoredPublicationEvidenceV1(
  plan: unknown
): void {
  const fail = (reason: string): never => {
    throw new Error(
      `PUBLICATION_EVIDENCE_INVALID:${reason}`
    );
  };

  if (!plan || typeof plan !== "object") {
    fail("SNAPSHOT_MISSING");
  }

  const runtime = (
    plan as Record<string, unknown>
  ).masterRuntime as Record<string, any> | undefined;

  const claims = runtime?.claimLedger?.claims;
  const evidence = runtime?.evidenceGraph?.claimEvidence;

  if (!Array.isArray(claims) || !Array.isArray(evidence)) {
    fail("EVIDENCE_GRAPH_MISSING");
  }

  for (const claim of claims) {
    if (!claim || typeof claim.id !== "string" ||
        typeof claim.text !== "string") {
      fail("CLAIM_INVALID");
    }

    if (claim.status !== "VERIFIED") {
      fail(claim.id);
    }

    const accepted = evidence.some((item: any) =>
      item?.claimId === claim.id &&
      item?.relation === "SUPPORTS" &&
      item?.kind === "VERIFIED_EXCERPT" &&
      typeof item.excerpt === "string" &&
      findVerifiedExcerptCandidateV1({
        claimText: claim.text,
        bodyText: item.excerpt,
      }) !== null
    );

    if (!accepted) {
      fail(claim.id);
    }
  }
}
