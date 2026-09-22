import type {
  Claim,
  ClaimLedger,
} from "./claim-ledger";


export type ClaimPublicationBlockerCode =
  | "UNSUPPORTED_HIGH_RISK_CLAIM"
  | "CONTRADICTED_CLAIM"
  | "STALE_FINANCIAL_OR_LEGAL_CLAIM"
  | "JURISDICTION_MISMATCH";


export interface ClaimPublicationBlocker {
  code:
    ClaimPublicationBlockerCode;

  claimId:
    string;

  claim:
    string;

  category:
    Claim["category"];

  status:
    Claim["status"];
}


export interface ClaimPublicationGate {
  version:
    "CLAIM_PUBLICATION_GATE_V1";

  pass:
    boolean;

  blockers:
    readonly Readonly<ClaimPublicationBlocker>[];

  warnings:
    readonly string[];
}


export function evaluateClaimPublicationGate(
  ledger:
    Readonly<ClaimLedger>
): Readonly<ClaimPublicationGate> {
  const blockers:
    ClaimPublicationBlocker[] =
      [];

  const warnings:
    string[] =
      [];

  for (
    const claim
    of ledger.claims
  ) {
    if (
      claim.status ===
        "UNSUPPORTED" &&
      claim.risk ===
        "HIGH"
    ) {
      blockers.push({
        code:
          "UNSUPPORTED_HIGH_RISK_CLAIM",

        claimId:
          claim.id,

        claim:
          claim.text,

        category:
          claim.category,

        status:
          claim.status,
      });

      continue;
    }

    if (
      claim.status ===
      "CONTRADICTED"
    ) {
      blockers.push({
        code:
          "CONTRADICTED_CLAIM",

        claimId:
          claim.id,

        claim:
          claim.text,

        category:
          claim.category,

        status:
          claim.status,
      });

      continue;
    }

    if (
      claim.status ===
        "STALE" &&
      (
        claim.category ===
          "FINANCIAL" ||
        claim.category ===
          "LEGAL"
      )
    ) {
      blockers.push({
        code:
          "STALE_FINANCIAL_OR_LEGAL_CLAIM",

        claimId:
          claim.id,

        claim:
          claim.text,

        category:
          claim.category,

        status:
          claim.status,
      });

      continue;
    }

    if (
      claim.status ===
      "JURISDICTION_MISMATCH"
    ) {
      blockers.push({
        code:
          "JURISDICTION_MISMATCH",

        claimId:
          claim.id,

        claim:
          claim.text,

        category:
          claim.category,

        status:
          claim.status,
      });

      continue;
    }

    if (
      claim.status ===
      "PARTIAL"
    ) {
      warnings.push(
        `PARTIAL_CLAIM:${claim.id}`
      );
    }

    if (
      claim.status ===
        "UNSUPPORTED" &&
      claim.risk !==
        "HIGH"
    ) {
      warnings.push(
        `UNSUPPORTED_NON_HIGH_RISK_CLAIM:${claim.id}`
      );
    }
  }

  return Object.freeze({
    version:
      "CLAIM_PUBLICATION_GATE_V1" as const,

    pass:
      blockers.length ===
      0,

    blockers:
      Object.freeze(
        blockers.map(
          (blocker) =>
            Object.freeze({
              ...blocker,
            })
        )
      ),

    warnings:
      Object.freeze(
        warnings
      ),
  });
}


export function assertClaimPublicationGatePassed(
  gate:
    Readonly<ClaimPublicationGate>
): void {
  if (
    gate.pass
  ) {
    return;
  }

  throw new Error(
    `CLAIM_PUBLICATION_BLOCKED:${gate.blockers
      .map(
        (blocker) =>
          `${blocker.code}:${blocker.claimId}`
      )
      .join(",")}`
  );
}
