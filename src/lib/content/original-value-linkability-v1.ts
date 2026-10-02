import type {
  OriginalValueAsset,
  OriginalValueAssetType,
} from "./original-value";


export type LinkabilityStatusV1 =
  | "PASS"
  | "WARN";


export interface OriginalValueLinkabilityResultV1 {
  readonly version:
    "ORIGINAL_VALUE_LINKABILITY_V1";

  readonly status:
    LinkabilityStatusV1;

  /*
   * Planned means the article has an actual asset concept that
   * could give another publisher a reason to reference the page.
   *
   * Verified is intentionally stricter and remains evidence-bound.
   */
  readonly plannedLinkableAssetIds:
    readonly string[];

  readonly verifiedLinkableAssetIds:
    readonly string[];

  readonly firstPartyExperienceAssetIds:
    readonly string[];
}


const LINKABLE_TYPES:
  ReadonlySet<OriginalValueAssetType> =
    new Set([
      "FIRST_PARTY_DATASET",
      "ORIGINAL_CALCULATION",
      "ORIGINAL_RESEARCH",
      "INTERACTIVE_TOOL",
      "CALCULATOR",
      "DECISION_TREE",
      "COMPARISON_MATRIX",
      "ORIGINAL_DIAGRAM",
      "EXPERIMENT",
      "EXPERT_INTERPRETATION",
      "PRIMARY_SOURCE_SYNTHESIS",
      "REAL_SCREENSHOTS",
      "REAL_TEST",
      "FIRST_PARTY_TELEMETRY",
      "ORIGINAL_PROCESS",
      "CASE_STUDY",
    ]);


const FIRST_PARTY_EXPERIENCE_TYPES:
  ReadonlySet<OriginalValueAssetType> =
    new Set([
      "EXPERIMENT",
      "REAL_SCREENSHOTS",
      "REAL_TEST",
      "FIRST_PARTY_TELEMETRY",
      "ORIGINAL_PROCESS",
      "CASE_STUDY",
    ]);


function hasVerifiedEvidence(
  asset:
    Readonly<OriginalValueAsset>
): boolean {
  return (
    asset.verified ===
      true &&
    Array.isArray(
      asset.evidenceIds
    ) &&
    asset.evidenceIds.length >
      0
  );
}


export function evaluateOriginalValueLinkabilityV1(
  assets:
    readonly Readonly<OriginalValueAsset>[]
): Readonly<OriginalValueLinkabilityResultV1> {
  const planned =
    assets.filter(
      (
        asset
      ) =>
        LINKABLE_TYPES.has(
          asset.type
        )
    );


  const verified =
    planned.filter(
      hasVerifiedEvidence
    );


  const firstPartyExperience =
    assets.filter(
      (
        asset
      ) =>
        asset.firstParty ===
          true &&
        FIRST_PARTY_EXPERIENCE_TYPES.has(
          asset.type
        )
    );


  return Object.freeze({
    version:
      "ORIGINAL_VALUE_LINKABILITY_V1",

    status:
      planned.length >
      0
        ? "PASS"
        : "WARN",

    plannedLinkableAssetIds:
      Object.freeze(
        planned.map(
          (
            asset
          ) =>
            asset.id
        )
      ),

    verifiedLinkableAssetIds:
      Object.freeze(
        verified.map(
          (
            asset
          ) =>
            asset.id
        )
      ),

    firstPartyExperienceAssetIds:
      Object.freeze(
        firstPartyExperience.map(
          (
            asset
          ) =>
            asset.id
        )
      ),
  });
}
