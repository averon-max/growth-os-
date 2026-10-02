import type {
  ArticleTemplatePolicyV1,
} from "./article-template-policy-v1";

import type {
  OriginalValueAsset,
} from "./original-value";

import {
  evaluateOriginalValueLinkabilityV1,
} from "./original-value-linkability-v1";

import type {
  TemplateCoverageResultV1,
} from "./template-coverage-validator-v1";


export interface ProductionTemplateEvidenceGateResultV1 {
  readonly version:
    "PRODUCTION_TEMPLATE_EVIDENCE_GATE_V1";

  readonly status:
    "PASS"
    | "FAIL";

  readonly blockers:
    readonly string[];

  readonly warnings:
    readonly string[];

  readonly linkability:
    ReturnType<
      typeof evaluateOriginalValueLinkabilityV1
    >;
}


export class ProductionTemplateEvidenceGateErrorV1
  extends Error {
  constructor(
    readonly result:
      Readonly<ProductionTemplateEvidenceGateResultV1>
  ) {
    super(
      [
        "PRODUCTION_TEMPLATE_EVIDENCE_GATE_FAILED",
        ...result.blockers,
      ].join(
        ":"
      )
    );

    this.name =
      "ProductionTemplateEvidenceGateErrorV1";
  }
}


export function evaluateProductionTemplateEvidenceGateV1({
  policy,
  templateCoverage,
  rankingEvidenceAvailable,
  location,
  originalValueAssets,
}: {
  readonly policy:
    Readonly<ArticleTemplatePolicyV1>;

  readonly templateCoverage:
    Readonly<TemplateCoverageResultV1>;

  readonly rankingEvidenceAvailable:
    boolean;

  readonly location:
    string |
    null |
    undefined;

  readonly originalValueAssets:
    readonly Readonly<OriginalValueAsset>[];
}): Readonly<ProductionTemplateEvidenceGateResultV1> {
  const blockers:
    string[] =
      [];

  const warnings:
    string[] =
      [];


  if (
    templateCoverage.status !==
    "PASS"
  ) {
    blockers.push(
      "TEMPLATE_COVERAGE_NOT_PROVEN"
    );
  }


  /*
   * Ranking language requires a real methodology/evidence source.
   *
   * AUTO already downgrades unsupported "best/top" intent to
   * CURATED_LIST. This closes the manual override escape hatch.
   */
  if (
    policy.id ===
      "RANKED_LIST" &&
    !rankingEvidenceAvailable
  ) {
    blockers.push(
      "RANKED_LIST_REQUIRES_VERIFIED_RANKING_EVIDENCE"
    );
  }


  const linkability =
    evaluateOriginalValueLinkabilityV1(
      originalValueAssets
    );


  /*
   * Review content may not imply hands-on use unless production can
   * point to a planned first-party experience asset.
   *
   * Verification/publication is still controlled later by the
   * existing evidence/original-value gates.
   */
  if (
    policy.requiresFirstPartyExperience &&
    linkability
      .firstPartyExperienceAssetIds
      .length ===
      0
  ) {
    blockers.push(
      "PRODUCT_REVIEW_REQUIRES_FIRST_PARTY_EXPERIENCE"
    );
  }


  /*
   * Local directory pages are particularly vulnerable to doorway
   * and fabricated-list behavior.
   *
   * Require a real location plus an original/linkable data asset.
   */
  if (
    policy.id ===
    "LOCAL_DIRECTORY"
  ) {
    if (
      !location?.trim()
    ) {
      blockers.push(
        "LOCAL_DIRECTORY_REQUIRES_REAL_LOCATION"
      );
    }


    if (
      linkability
        .plannedLinkableAssetIds
        .length ===
      0
    ) {
      blockers.push(
        "LOCAL_DIRECTORY_REQUIRES_VERIFIABLE_DIRECTORY_ASSET"
      );
    }
  }


  /*
   * Most other templates may still be useful without a classic
   * backlink magnet. Do not invent a hard SEO rule.
   *
   * Surface it as a diagnostic instead.
   */
  if (
    linkability.status ===
    "WARN"
  ) {
    warnings.push(
      "NO_PLANNED_LINKABLE_ASSET"
    );
  }


  return Object.freeze({
    version:
      "PRODUCTION_TEMPLATE_EVIDENCE_GATE_V1",

    status:
      blockers.length ===
      0
        ? "PASS"
        : "FAIL",

    blockers:
      Object.freeze([
        ...blockers,
      ]),

    warnings:
      Object.freeze([
        ...warnings,
      ]),

    linkability,
  });
}


export function assertProductionTemplateEvidenceGateV1(
  input:
    Parameters<
      typeof evaluateProductionTemplateEvidenceGateV1
    >[0]
): Readonly<ProductionTemplateEvidenceGateResultV1> {
  const result =
    evaluateProductionTemplateEvidenceGateV1(
      input
    );


  if (
    result.status !==
    "PASS"
  ) {
    throw new ProductionTemplateEvidenceGateErrorV1(
      result
    );
  }


  return result;
}
