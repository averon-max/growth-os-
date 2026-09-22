import {
  evidenceForClaim,
  isPublicationGradeClaimEvidence,
  sourceForEvidence,
  type EvidenceGraph,
  type EvidenceSource,
} from "./evidence-graph";

import {
  buildFactFreshnessPolicy,
  evaluateFactFreshness,
  type FactFreshnessType,
} from "./fact-freshness";


export type ClaimCategory =
  | "FACT"
  | "STATISTIC"
  | "FINANCIAL"
  | "LEGAL"
  | "PRODUCT"
  | "PRICE"
  | "COMPARISON";


export type ClaimRisk =
  | "LOW"
  | "MEDIUM"
  | "HIGH";


export type ClaimStatus =
  | "VERIFIED"
  | "PARTIAL"
  | "UNSUPPORTED"
  | "CONTRADICTED"
  | "STALE"
  | "JURISDICTION_MISMATCH";


export interface Claim {
  id:
    string;

  text:
    string;

  category:
    ClaimCategory;

  risk:
    ClaimRisk;

  jurisdiction?:
    string;

  evidenceIds:
    readonly string[];

  status:
    ClaimStatus;
}


export interface ClaimInput {
  id:
    string;

  text:
    string;

  category:
    ClaimCategory;

  risk:
    ClaimRisk;

  jurisdiction?:
    string;
}


export interface ClaimFreshnessRule {
  claimId:
    string;

  factType:
    FactFreshnessType;

  maxAgeDays?:
    number | null;
}


export interface ClaimLedger {
  version:
    "CLAIM_LEDGER_V1";

  claims:
    readonly Readonly<Claim>[];

  counts:
    Readonly<
      Record<
        ClaimStatus,
        number
      >
    >;

  verified:
    number;

  unsupported:
    number;

  blockingCandidateCount:
    number;
}


function normalizeJurisdiction(
  value:
    string |
    undefined
): string | null {
  const clean =
    value
      ?.trim()
      .toLowerCase();

  return clean
    ? clean
    : null;
}


function sourceJurisdictionCompatible({
  claimJurisdiction,
  source,
}: {
  claimJurisdiction:
    string |
    undefined;

  source:
    Readonly<EvidenceSource>;
}): boolean {
  const claim =
    normalizeJurisdiction(
      claimJurisdiction
    );

  const sourceValue =
    normalizeJurisdiction(
      source.jurisdiction
    );

  if (
    !claim ||
    !sourceValue
  ) {
    return true;
  }

  return (
    claim ===
    sourceValue
  );
}


function defaultFreshnessType(
  category:
    ClaimCategory
): FactFreshnessType | null {
  switch (
    category
  ) {
    case "STATISTIC":
      return "STATISTIC";

    case "PRICE":
      return "PRICE";

    case "LEGAL":
      return "LAW";

    case "PRODUCT":
      return "PRODUCT_FEATURE";

    case "FACT":
      return "DEFINITION";

    case "FINANCIAL":
    case "COMPARISON":
      return null;
  }
}


function resolveClaimStatus({
  claim,
  graph,
  freshnessRule,
  asOf,
}: {
  claim:
    ClaimInput;

  graph:
    Readonly<EvidenceGraph>;

  freshnessRule?:
    ClaimFreshnessRule;

  asOf:
    Date;
}): {
  status:
    ClaimStatus;

  evidenceIds:
    string[];
} {
  const allEvidence =
    evidenceForClaim({
      graph,
      claimId:
        claim.id,
    });

  const publicationEvidence =
    allEvidence.filter(
      isPublicationGradeClaimEvidence
    );

  const evidenceIds =
    publicationEvidence.map(
      (evidence) =>
        evidence.id
    );

  const resolved =
    publicationEvidence
      .map(
        (evidence) => ({
          evidence,

          source:
            sourceForEvidence({
              graph,
              evidence,
            }),
        })
      )
      .filter(
        (
          item
        ): item is {
          evidence:
            typeof item.evidence;

          source:
            Readonly<EvidenceSource>;
        } =>
          item.source !==
          null
      );

  if (
    resolved.some(
      (item) =>
        item.evidence
          .relation ===
        "CONTRADICTS"
    )
  ) {
    return {
      status:
        "CONTRADICTED",

      evidenceIds,
    };
  }

  const supportive =
    resolved.filter(
      (item) =>
        item.evidence
          .relation ===
          "SUPPORTS" ||
        item.evidence
          .relation ===
          "PARTIALLY_SUPPORTS"
    );

  if (
    claim.jurisdiction &&
    supportive.length >
      0 &&
    supportive.every(
      (item) =>
        !sourceJurisdictionCompatible({
          claimJurisdiction:
            claim.jurisdiction,

          source:
            item.source,
        })
    )
  ) {
    return {
      status:
        "JURISDICTION_MISMATCH",

      evidenceIds,
    };
  }

  const freshnessType =
    freshnessRule
      ?.factType ??
    defaultFreshnessType(
      claim.category
    );

  if (
    freshnessType &&
    supportive.length >
      0
  ) {
    const policy =
      buildFactFreshnessPolicy({
        factType:
          freshnessType,

        maxAgeDays:
          freshnessRule
            ?.maxAgeDays ??
          null,
      });

    if (
      policy.primarySourceRequired &&
      !supportive.some(
        (item) =>
          item.source
            .sourceType ===
          "PRIMARY_GOVERNMENT"
      )
    ) {
      return {
        status:
          "UNSUPPORTED",

        evidenceIds,
      };
    }

    const freshness =
      supportive.map(
        (item) =>
          evaluateFactFreshness({
            source:
              item.source,

            policy,

            asOf,
          })
      );

    const known =
      freshness.filter(
        (item) =>
          item.status !==
          "UNKNOWN"
      );

    if (
      known.length >
        0 &&
      known.every(
        (item) =>
          item.status ===
          "STALE"
      )
    ) {
      return {
        status:
          "STALE",

        evidenceIds,
      };
    }
  }

  if (
    supportive.some(
      (item) =>
        item.evidence
          .relation ===
        "SUPPORTS"
    )
  ) {
    return {
      status:
        "VERIFIED",

      evidenceIds,
    };
  }

  if (
    supportive.some(
      (item) =>
        item.evidence
          .relation ===
        "PARTIALLY_SUPPORTS"
    )
  ) {
    return {
      status:
        "PARTIAL",

      evidenceIds,
    };
  }

  return {
    status:
      "UNSUPPORTED",

    evidenceIds,
  };
}


export function buildClaimLedger({
  claims,
  graph,
  freshnessRules = [],
  asOf,
}: {
  claims:
    ClaimInput[];

  graph:
    Readonly<EvidenceGraph>;

  freshnessRules?:
    ClaimFreshnessRule[];

  asOf:
    Date;
}): Readonly<ClaimLedger> {
  if (
    Number.isNaN(
      asOf.getTime()
    )
  ) {
    throw new Error(
      "CLAIM_LEDGER_AS_OF_INVALID"
    );
  }

  const claimIds =
    new Set<string>();

  const freshnessMap =
    new Map(
      freshnessRules.map(
        (rule) => [
          rule.claimId,
          rule,
        ] as const
      )
    );

  const output:
    Claim[] =
      [];

  for (
    const input
    of claims
  ) {
    const id =
      input.id.trim();

    const text =
      input.text.trim();

    if (
      !id
    ) {
      throw new Error(
        "CLAIM_ID_REQUIRED"
      );
    }

    if (
      claimIds.has(
        id
      )
    ) {
      throw new Error(
        "CLAIM_DUPLICATE_ID"
      );
    }

    claimIds.add(
      id
    );

    if (
      !text
    ) {
      throw new Error(
        "CLAIM_TEXT_REQUIRED"
      );
    }

    const result =
      resolveClaimStatus({
        claim: {
          ...input,

          id,

          text,
        },

        graph,

        freshnessRule:
          freshnessMap.get(
            id
          ),

        asOf,
      });

    output.push(
      Object.freeze({
        ...input,

        id,

        text,

        jurisdiction:
          input.jurisdiction
            ?.trim() ||
          undefined,

        evidenceIds:
          Object.freeze(
            result.evidenceIds
          ),

        status:
          result.status,
      })
    );
  }

  const counts:
    Record<
      ClaimStatus,
      number
    > = {
      VERIFIED:
        0,

      PARTIAL:
        0,

      UNSUPPORTED:
        0,

      CONTRADICTED:
        0,

      STALE:
        0,

      JURISDICTION_MISMATCH:
        0,
    };

  for (
    const claim
    of output
  ) {
    counts[
      claim.status
    ] +=
      1;
  }

  const blockingCandidateCount =
    output.filter(
      (claim) =>
        (
          claim.status ===
            "UNSUPPORTED" &&
          claim.risk ===
            "HIGH"
        ) ||
        claim.status ===
          "CONTRADICTED" ||
        (
          claim.status ===
            "STALE" &&
          (
            claim.category ===
              "FINANCIAL" ||
            claim.category ===
              "LEGAL"
          )
        ) ||
        claim.status ===
          "JURISDICTION_MISMATCH"
    ).length;

  return Object.freeze({
    version:
      "CLAIM_LEDGER_V1" as const,

    claims:
      Object.freeze(
        output
      ),

    counts:
      Object.freeze(
        counts
      ),

    verified:
      counts.VERIFIED,

    unsupported:
      counts.UNSUPPORTED,

    blockingCandidateCount,
  });
}
