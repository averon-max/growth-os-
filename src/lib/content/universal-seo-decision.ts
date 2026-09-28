import {
  resolveUniversalPageArchetypeV2,
  type UniversalPageArchetype,
  type UniversalPageArchetypeDecisionV2,
} from "./universal-page-archetype";

import {
  evaluateCannibalizationPolicyV2,
  type CannibalizationMode,
  type CannibalizationPolicyDecisionV2,
} from "./cannibalization-policy";


export type UniversalEvidenceModeV2 =
  | "STANDARD_GROUNDED"
  | "STRICT_PRIMARY_SOURCES"
  | "PRIMARY_RESEARCH"
  | "FRESH_PRIMARY_SOURCES"
  | "PRIMARY_PLUS_FIRST_PARTY_TESTING";


export type UniversalOriginalValueStrategyV2 =
  | "SYNTHESIS_OR_DECISION_AID"
  | "PROCESS_EXPERIENCE"
  | "TESTING_OR_COMPARISON"
  | "BUYER_DECISION_FRAMEWORK"
  | "DATA_OR_SYNTHESIS"
  | "SERP_GAP_ASSET";


export type UniversalSeoRecommendedActionV2 =
  | "CREATE"
  | "UPDATE"
  | "MERGE"
  | "REPOSITION"
  | "REVIEW"
  | "KEEP_BOTH";


export interface UniversalSeoDecisionV2 {
  version:
    "UNIVERSAL_SEO_DECISION_V2";

  archetype:
    Readonly<
      UniversalPageArchetypeDecisionV2
    >;

  cannibalization:
    Readonly<
      CannibalizationPolicyDecisionV2
    >;

  evidenceMode:
    UniversalEvidenceModeV2;

  originalValueStrategy:
    UniversalOriginalValueStrategyV2;

  recommendedAction:
    UniversalSeoRecommendedActionV2;

  productionReady:
    boolean;

  reasons:
    readonly string[];
}


function evidenceMode({
  riskClass,
  archetype,
}: {
  riskClass:
    string;

  archetype:
    UniversalPageArchetype;
}): UniversalEvidenceModeV2 {
  if (
    riskClass.startsWith(
      "YMYL_"
    ) ||
    riskClass ===
      "OTHER_SENSITIVE"
  ) {
    return "STRICT_PRIMARY_SOURCES";
  }


  if (
    archetype ===
      "RESEARCH"
  ) {
    return "PRIMARY_RESEARCH";
  }


  if (
    archetype ===
      "FRESH_QUERY"
  ) {
    return "FRESH_PRIMARY_SOURCES";
  }


  if (
    archetype ===
      "PRODUCT_REVIEW" ||
    archetype ===
      "BEST_OF" ||
    archetype ===
      "COMPARISON" ||
    archetype ===
      "BUYING_GUIDE"
  ) {
    return "PRIMARY_PLUS_FIRST_PARTY_TESTING";
  }


  return "STANDARD_GROUNDED";
}


function originalValueStrategy(
  archetype:
    UniversalPageArchetype
): UniversalOriginalValueStrategyV2 {
  switch (
    archetype
  ) {
    case "BEST_OF":
    case "COMPARISON":
    case "PRODUCT_REVIEW":
    case "BUYING_GUIDE":
      return "TESTING_OR_COMPARISON";

    case "HOW_TO":
    case "TUTORIAL":
    case "TROUBLESHOOTING":
    case "CHECKLIST":
      return "PROCESS_EXPERIENCE";

    case "B2B_CATEGORY":
      return "BUYER_DECISION_FRAMEWORK";

    case "RESEARCH":
    case "CASE_STUDY":
      return "DATA_OR_SYNTHESIS";

    case "DEFINITION":
    case "EXPLAINER":
    case "REFERENCE":
      return "SYNTHESIS_OR_DECISION_AID";

    default:
      return "SERP_GAP_ASSET";
  }
}


export function buildUniversalSeoDecisionV2({
  topic,
  readerGoal,
  missionIntent,
  riskClass,
  serpResearch,
  urlOwnership,
  cannibalizationMode =
    "SMART",
}: {
  topic:
    string;

  readerGoal:
    string;

  missionIntent:
    string;

  riskClass:
    string;

  serpResearch:
    unknown;

  urlOwnership:
    unknown;

  cannibalizationMode?:
    CannibalizationMode;
}): Readonly<
  UniversalSeoDecisionV2
> {
  const archetype =
    resolveUniversalPageArchetypeV2({
      topic,
      readerGoal,
      missionIntent,
      serpResearch,
    });


  const cannibalization =
    evaluateCannibalizationPolicyV2({
      ownership:
        urlOwnership,

      mode:
        cannibalizationMode,
    });


  const recommendedAction:
    UniversalSeoRecommendedActionV2 =
      cannibalization
        .recommendedAction ===
          "NO_CHANGE"
        ? "CREATE"
        : cannibalization
            .recommendedAction;


  const mode =
    evidenceMode({
      riskClass,
      archetype:
        archetype.archetype,
    });


  const valueStrategy =
    originalValueStrategy(
      archetype.archetype
    );


  return Object.freeze({
    version:
      "UNIVERSAL_SEO_DECISION_V2",

    archetype,

    cannibalization,

    evidenceMode:
      mode,

    originalValueStrategy:
      valueStrategy,

    recommendedAction,

    productionReady:
      recommendedAction !==
        "REVIEW",

    reasons:
      Object.freeze([
        `ARCHETYPE:${archetype.archetype}`,
        `ARCHETYPE_SOURCE:${archetype.source}`,
        `EVIDENCE_MODE:${mode}`,
        `ORIGINAL_VALUE:${valueStrategy}`,
        `CANNIBALIZATION_MODE:${cannibalization.mode}`,
        `SEO_ACTION:${recommendedAction}`,
      ]),
  });
}
