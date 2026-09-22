import type {
  GapAnalysis,
} from "./gap-engine";

import type {
  ClaimLedger,
} from "./claim-ledger";

import type {
  ClaimPublicationGate,
} from "./claim-publication-gate";

import type {
  WinnabilityOverrides,
  WinnabilitySignal,
} from "./winnability";


function signal(
  level:
    WinnabilitySignal["level"],

  evidence:
    string[]
): WinnabilitySignal {
  return {
    level,

    evidence,
  };
}


export function buildStage7WinnabilityOverrides({
  gaps,
  ledger,
  publicationGate,
}: {
  gaps:
    Readonly<GapAnalysis>;

  ledger:
    Readonly<ClaimLedger>;

  publicationGate:
    Readonly<ClaimPublicationGate>;
}): Pick<
  WinnabilityOverrides,
  "evidenceOpportunity"
> {
  const evidenceGapCount =
    gaps.byType
      .EVIDENCE_GAP;

  if (
    publicationGate.blockers
      .length >
    0
  ) {
    return {
      evidenceOpportunity:
        signal(
          "BLOCKED",
          [
            `CLAIM_BLOCKERS:${publicationGate.blockers.length}`,
            `VERIFIED_CLAIMS:${ledger.verified}`,
            `UNSUPPORTED_CLAIMS:${ledger.unsupported}`,
          ]
        ),
    };
  }

  if (
    evidenceGapCount >
      0 &&
    ledger.verified >
      0
  ) {
    return {
      evidenceOpportunity:
        signal(
          "FAVORABLE",
          [
            `EVIDENCE_GAPS:${evidenceGapCount}`,
            `VERIFIED_CLAIMS:${ledger.verified}`,
            "VERIFIED_EVIDENCE_CAN_EXPLOIT_COMPETITOR_GAP",
          ]
        ),
    };
  }

  if (
    evidenceGapCount >
      0
  ) {
    return {
      evidenceOpportunity:
        signal(
          "UNFAVORABLE",
          [
            `EVIDENCE_GAPS:${evidenceGapCount}`,
            "NO_VERIFIED_CLAIM_EVIDENCE_AVAILABLE",
          ]
        ),
    };
  }

  if (
    ledger.verified >
      0
  ) {
    return {
      evidenceOpportunity:
        signal(
          "MIXED",
          [
            "NO_OBSERVED_COMPETITOR_EVIDENCE_GAP",
            `VERIFIED_CLAIMS:${ledger.verified}`,
          ]
        ),
    };
  }

  return {
    evidenceOpportunity:
      signal(
        "UNKNOWN",
        [
          "NO_EVIDENCE_OPPORTUNITY_DATA",
        ]
      ),
  };
}
