import type {
  SectionGenerationContractV1,
} from "./article-generation-contract";

import type {
  GeneratedSectionV1,
} from "./master-article-generator";


export type SectionClaimReconciliationStatus =
  | "PASS"
  | "WARN"
  | "BLOCK";


export type SectionClaimReconciliationSeverity =
  | "WARN"
  | "BLOCK";


export type SectionClaimReconciliationCode =
  | "REQUIRED_CLAIM_NOT_REFERENCED"
  | "REQUIRED_CLAIM_NOT_FOUND"
  | "REFERENCED_CLAIM_NOT_FOUND"
  | "FORBIDDEN_CLAIM_REFERENCED"
  | "CONTRADICTED_CLAIM"
  | "UNSUPPORTED_HIGH_RISK_CLAIM"
  | "STALE_FINANCIAL_OR_LEGAL_CLAIM"
  | "JURISDICTION_MISMATCH"
  | "PARTIAL_CLAIM"
  | "UNSUPPORTED_NON_HIGH_RISK_CLAIM"
  | "VERIFIED_CLAIM_SUPPORT_NOT_RECONCILED"
  | "PARTIAL_CLAIM_SUPPORT_NOT_RECONCILED"
  | "REFERENCED_EVIDENCE_NOT_FOUND"
  | "EVIDENCE_REFERENCES_UNDECLARED_CLAIM"
  | "CONTRADICTING_EVIDENCE_REFERENCED"
  | "NON_PUBLICATION_GRADE_EVIDENCE_REFERENCED";


export interface SectionClaimReconciliationFindingV1 {
  code:
    SectionClaimReconciliationCode;

  severity:
    SectionClaimReconciliationSeverity;

  claimId?:
    string;

  evidenceId?:
    string;

  message:
    string;
}


export interface SectionClaimVerifiedSupportV1 {
  claimId:
    string;

  evidenceIds:
    readonly string[];

  sourceIds:
    readonly string[];
}


export interface SectionClaimReconciliationV1 {
  version:
    "SECTION_CLAIM_RECONCILIATION_V1";

  status:
    SectionClaimReconciliationStatus;

  sectionIndex:
    number;

  sectionNumber:
    number;

  requiredClaimIds:
    readonly string[];

  referencedClaimIds:
    readonly string[];

  referencedEvidenceIds:
    readonly string[];

  verifiedSupport:
    readonly Readonly<
      SectionClaimVerifiedSupportV1
    >[];

  findings:
    readonly Readonly<
      SectionClaimReconciliationFindingV1
    >[];
}


function unique(
  values:
    readonly string[]
): readonly string[] {
  return Object.freeze(
    Array.from(
      new Set(
        values
          .map(
            (value) =>
              value.trim()
          )
          .filter(
            Boolean
          )
      )
    )
  );
}


function finding({
  code,
  severity,
  claimId,
  evidenceId,
  message,
}: SectionClaimReconciliationFindingV1):
Readonly<SectionClaimReconciliationFindingV1> {
  return Object.freeze({
    code,
    severity,
    claimId,
    evidenceId,
    message,
  });
}


export function reconcileGeneratedSectionClaimsV1({
  contract,
  section,
}: {
  contract:
    Readonly<SectionGenerationContractV1>;

  section:
    Readonly<GeneratedSectionV1>;
}): Readonly<
  SectionClaimReconciliationV1
> {
  const requiredClaimIds =
    unique(
      contract.blueprint
        .requiredClaims ??
      []
    );

  const forbiddenClaimIds =
    new Set(
      unique(
        contract.blueprint
          .forbiddenClaims ??
        []
      )
    );

  const assignedEvidenceIds =
    new Set(
      unique(
        contract.blueprint
          .evidenceIds ??
        []
      )
    );

  const referencedClaimIds =
    unique(
      section
        .referencedClaimIds
    );

  const referencedEvidenceIds =
    unique(
      section
        .referencedEvidenceIds
    );


  const claimMap =
    new Map(
      contract.claimLedger
        .claims
        .map(
          (claim) =>
            [
              claim.id,
              claim,
            ] as const
        )
    );

  const claimEvidenceMap =
    new Map(
      contract.evidenceGraph
        .claimEvidence
        .map(
          (evidence) =>
            [
              evidence.id,
              evidence,
            ] as const
        )
    );

  const sourceIds =
    new Set(
      contract.evidenceGraph
        .sources
        .map(
          (source) =>
            source.id
        )
    );

  const referencedClaimSet =
    new Set(
      referencedClaimIds
    );

  const referencedEvidenceSet =
    new Set(
      referencedEvidenceIds
    );

  const findings:
    SectionClaimReconciliationFindingV1[] =
      [];

  const verifiedSupport:
    SectionClaimVerifiedSupportV1[] =
      [];


  // ----------------------------------------------------------
  // Required claims must exist and must be declared as used.
  // ----------------------------------------------------------

  for (
    const claimId
    of requiredClaimIds
  ) {
    if (
      !referencedClaimSet.has(
        claimId
      )
    ) {
      findings.push(
        finding({
          code:
            "REQUIRED_CLAIM_NOT_REFERENCED",

          severity:
            "BLOCK",

          claimId,

          message:
            `Required claim ${claimId} was not declared by the generated section.`,
        })
      );
    }

    const claim =
      claimMap.get(
        claimId
      );

    if (!claim) {
      findings.push(
        finding({
          code:
            "REQUIRED_CLAIM_NOT_FOUND",

          severity:
            "BLOCK",

          claimId,

          message:
            `Required claim ${claimId} does not exist in the authoritative Claim Ledger.`,
        })
      );

      continue;
    }


    // --------------------------------------------------------
    // Reuse existing publication-grade claim status policy.
    // --------------------------------------------------------

    if (
      claim.status ===
      "CONTRADICTED"
    ) {
      findings.push(
        finding({
          code:
            "CONTRADICTED_CLAIM",

          severity:
            "BLOCK",

          claimId,

          message:
            `Claim ${claimId} is contradicted by the authoritative evidence graph.`,
        })
      );
    }

    if (
      claim.status ===
        "UNSUPPORTED" &&
      claim.risk ===
        "HIGH"
    ) {
      findings.push(
        finding({
          code:
            "UNSUPPORTED_HIGH_RISK_CLAIM",

          severity:
            "BLOCK",

          claimId,

          message:
            `High-risk claim ${claimId} is unsupported.`,
        })
      );
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
      findings.push(
        finding({
          code:
            "STALE_FINANCIAL_OR_LEGAL_CLAIM",

          severity:
            "BLOCK",

          claimId,

          message:
            `Financial/legal claim ${claimId} is stale.`,
        })
      );
    }

    if (
      claim.status ===
      "JURISDICTION_MISMATCH"
    ) {
      findings.push(
        finding({
          code:
            "JURISDICTION_MISMATCH",

          severity:
            "BLOCK",

          claimId,

          message:
            `Claim ${claimId} does not match the approved jurisdiction.`,
        })
      );
    }

    if (
      claim.status ===
      "PARTIAL"
    ) {
      findings.push(
        finding({
          code:
            "PARTIAL_CLAIM",

          severity:
            "WARN",

          claimId,

          message:
            `Claim ${claimId} has only partial support.`,
        })
      );
    }

    if (
      claim.status ===
        "UNSUPPORTED" &&
      claim.risk !==
        "HIGH"
    ) {
      findings.push(
        finding({
          code:
            "UNSUPPORTED_NON_HIGH_RISK_CLAIM",

          severity:
            "WARN",

          claimId,

          message:
            `Claim ${claimId} is unsupported but is not classified HIGH risk.`,
        })
      );
    }


    // --------------------------------------------------------
    // Reconcile claim -> evidence -> verified excerpt.
    //
    // Evidence counts as publication-grade support ONLY when:
    //
    // - it belongs to this claim
    // - it is listed by the ledger for this claim
    // - it was assigned to this section
    // - the generated section explicitly declared reliance on it
    // - relation === SUPPORTS
    // - kind === VERIFIED_EXCERPT
    // - excerpt is non-empty
    // --------------------------------------------------------

    const validSupport =
      claim.evidenceIds
        .map(
          (evidenceId) =>
            claimEvidenceMap.get(
              evidenceId
            )
        )
        .filter(
          (
            evidence
          ): evidence is NonNullable<
            typeof evidence
          > =>
            Boolean(
              evidence &&
              evidence.claimId ===
                claimId &&
              assignedEvidenceIds.has(
                evidence.id
              ) &&
              referencedEvidenceSet.has(
                evidence.id
              ) &&
              evidence.relation ===
                "SUPPORTS" &&
              evidence.kind ===
                "VERIFIED_EXCERPT" &&
              typeof evidence.excerpt ===
                "string" &&
              evidence.excerpt
                .trim()
                .length >
                0
            )
        );


    if (
      validSupport.length >
      0
    ) {
      verifiedSupport.push({
        claimId,

        evidenceIds:
          unique(
            validSupport.map(
              (evidence) =>
                evidence.id
            )
          ),

        sourceIds:
          unique(
            validSupport.map(
              (evidence) =>
                evidence.sourceId
            )
          ),
      });
    }


    if (
      claim.status ===
        "VERIFIED" &&
      validSupport.length ===
        0
    ) {
      findings.push(
        finding({
          code:
            "VERIFIED_CLAIM_SUPPORT_NOT_RECONCILED",

          severity:
            "BLOCK",

          claimId,

          message:
            `Verified claim ${claimId} has no section-declared SUPPORTS + VERIFIED_EXCERPT evidence.`,
        })
      );
    }


    if (
      claim.status ===
        "PARTIAL" &&
      validSupport.length ===
        0
    ) {
      findings.push(
        finding({
          code:
            "PARTIAL_CLAIM_SUPPORT_NOT_RECONCILED",

          severity:
            "WARN",

          claimId,

          message:
            `Partial claim ${claimId} has no section-declared publication-grade supporting excerpt.`,
        })
      );
    }
  }


  // ----------------------------------------------------------
  // Every referenced claim must exist and must not be forbidden.
  // ----------------------------------------------------------

  for (
    const claimId
    of referencedClaimIds
  ) {
    if (
      !claimMap.has(
        claimId
      )
    ) {
      findings.push(
        finding({
          code:
            "REFERENCED_CLAIM_NOT_FOUND",

          severity:
            "BLOCK",

          claimId,

          message:
            `Generated section referenced unknown claim ${claimId}.`,
        })
      );
    }

    if (
      forbiddenClaimIds.has(
        claimId
      )
    ) {
      findings.push(
        finding({
          code:
            "FORBIDDEN_CLAIM_REFERENCED",

          severity:
            "BLOCK",

          claimId,

          message:
            `Generated section referenced forbidden claim ${claimId}.`,
        })
      );
    }
  }


  // ----------------------------------------------------------
  // Reconcile every evidence declaration.
  //
  // A source ID may be assigned/referenced for general context,
  // but it cannot satisfy claim verification by itself.
  // ----------------------------------------------------------

  for (
    const evidenceId
    of referencedEvidenceIds
  ) {
    const evidence =
      claimEvidenceMap.get(
        evidenceId
      );

    if (!evidence) {
      if (
        sourceIds.has(
          evidenceId
        ) &&
        assignedEvidenceIds.has(
          evidenceId
        )
      ) {
        continue;
      }

      findings.push(
        finding({
          code:
            "REFERENCED_EVIDENCE_NOT_FOUND",

          severity:
            "BLOCK",

          evidenceId,

          message:
            `Referenced evidence ${evidenceId} does not exist in the authoritative Evidence Graph.`,
        })
      );

      continue;
    }


    if (
      !referencedClaimSet.has(
        evidence.claimId
      )
    ) {
      findings.push(
        finding({
          code:
            "EVIDENCE_REFERENCES_UNDECLARED_CLAIM",

          severity:
            "BLOCK",

          claimId:
            evidence.claimId,

          evidenceId:

            evidence.id,

          message:
            `Evidence ${evidence.id} belongs to claim ${evidence.claimId}, but that claim was not declared by the section.`,
        })
      );
    }


    if (
      evidence.relation ===
      "CONTRADICTS"
    ) {
      findings.push(
        finding({
          code:
            "CONTRADICTING_EVIDENCE_REFERENCED",

          severity:
            "BLOCK",

          claimId:
            evidence.claimId,

          evidenceId:
            evidence.id,

          message:
            `Section declared reliance on contradicting evidence ${evidence.id}.`,
        })
      );
    }


    if (
      evidence.relation ===
        "SUPPORTS" &&
      (
        evidence.kind !==
          "VERIFIED_EXCERPT" ||
        typeof evidence.excerpt !==
          "string" ||
        evidence.excerpt
          .trim()
          .length ===
          0
      )
    ) {
      findings.push(
        finding({
          code:
            "NON_PUBLICATION_GRADE_EVIDENCE_REFERENCED",

          severity:
            "WARN",

          claimId:
            evidence.claimId,

          evidenceId:
            evidence.id,

          message:
            `Evidence ${evidence.id} is not a non-empty VERIFIED_EXCERPT and cannot independently verify a claim.`,
        })
      );
    }
  }


  const frozenSupport =
    Object.freeze(
      verifiedSupport.map(
        (support) =>
          Object.freeze({
            ...support,

            evidenceIds:
              Object.freeze([
                ...support
                  .evidenceIds,
              ]),

            sourceIds:
              Object.freeze([
                ...support
                  .sourceIds,
              ]),
          })
      )
    );

  const frozenFindings =
    Object.freeze([
      ...findings,
    ]);


  const status:
    SectionClaimReconciliationStatus =
      frozenFindings.some(
        (item) =>
          item.severity ===
          "BLOCK"
      )
        ? "BLOCK"
        : frozenFindings.length >
          0
          ? "WARN"
          : "PASS";


  return Object.freeze({
    version:
      "SECTION_CLAIM_RECONCILIATION_V1" as const,

    status,

    sectionIndex:
      contract.sectionIndex,

    sectionNumber:
      contract.sectionNumber,

    requiredClaimIds,

    referencedClaimIds,

    referencedEvidenceIds,

    verifiedSupport:
      frozenSupport,

    findings:
      frozenFindings,
  });
}


export function assertSectionClaimReconciliationPassed(
  result:
    Readonly<SectionClaimReconciliationV1>
): void {
  if (
    result.status !==
    "BLOCK"
  ) {
    return;
  }

  const codes =
    result.findings
      .filter(
        (item) =>
          item.severity ===
          "BLOCK"
      )
      .map(
        (item) =>
          [
            item.code,
            item.claimId,
            item.evidenceId,
          ]
            .filter(
              Boolean
            )
            .join(
              ":"
            )
      );

  throw new Error(
    [
      "SECTION_CLAIM_RECONCILIATION_BLOCKED",
      ...codes,
    ].join(
      ":"
    )
  );
}
