import {
  createSearchMission,
} from "./search-mission";

import {
  buildQueryGraph,
} from "./query-graph";

import {
  buildExpectedCoverageModel,
} from "./expected-coverage";

import {
  buildGapAnalysis,
} from "./gap-engine";

import {
  buildOriginalValuePlan,
} from "./original-value";

import {
  buildEvidenceGraph,
} from "./evidence-graph";

import {
  buildClaimLedger,
} from "./claim-ledger";

import {
  buildMasterSearchBlueprint,
} from "./master-search-blueprint";

import {
  buildSectionBlueprintSet,
} from "./section-blueprint";

import {
  buildMasterRuntimePersistenceEnvelope,
  type MasterRuntimeArtifacts,
  type MasterRuntimePersistenceEnvelope,
} from "./master-runtime-orchestrator";


import {
  buildUniversalSeoDecisionV2,
} from "./universal-seo-decision";

import {
  buildSerpConsensusV2,
} from "./serp-consensus-v2";

import {
  buildCompetitiveGapV2,
} from "./competitive-gap-v2";

import {
  applyCompetitiveSeoToMasterBlueprintV2,
} from "./competitive-seo-blueprint-wiring";

import type {
  CannibalizationMode,
} from "./cannibalization-policy";

import {
  applyUniversalSeoDecisionToMasterBlueprintV2,
  applyUniversalSeoDecisionToSectionsV2,
  buildUniversalSeoWriterRulesV2,
} from "./universal-seo-blueprint-wiring";



/*
 * IMPORTANT
 * ---------
 *
 * Every production input below is derived from the real
 * builder signature.
 *
 * We do NOT redefine Stage 1-8 contracts here.
 *
 * If an upstream builder changes, TypeScript forces this
 * production pipeline to change with it.
 */


export type ProductionSearchMissionInput =
  Parameters<
    typeof createSearchMission
  >[0];


export type ProductionQueryGraphInput =
  Omit<
    Parameters<
      typeof buildQueryGraph
    >[0],
    "mission"
  >;


export type ProductionExpectedCoverageInput =
  Omit<
    Parameters<
      typeof buildExpectedCoverageModel
    >[0],
    | "mission"
    | "queryGraph"
  >;


export type ProductionGapAnalysisInput =
  Omit<
    Parameters<
      typeof buildGapAnalysis
    >[0],
    "expectedCoverage"
  >;


export type ProductionOriginalValueInput =
  Omit<
    Parameters<
      typeof buildOriginalValuePlan
    >[0],
    | "missionId"
    | "gaps"
  >;


export type ProductionEvidenceGraphInput =
  Parameters<
    typeof buildEvidenceGraph
  >[0];


export type ProductionClaimLedgerInput =
  Omit<
    Parameters<
      typeof buildClaimLedger
    >[0],
    "graph"
  >;


export type ProductionMasterBlueprintInput =
  Omit<
    Parameters<
      typeof buildMasterSearchBlueprint
    >[0],
    | "mission"
    | "queryGraph"
    | "expectedCoverage"
    | "gaps"
    | "originalValue"
    | "claimLedger"
    | "evidenceGraph"
  >;


export type ProductionSectionBlueprintInput =
  Omit<
    Parameters<
      typeof buildSectionBlueprintSet
    >[0],
    | "blueprint"
    | "queryGraph"
    | "claimLedger"
    | "evidenceGraph"
    | "originalValue"
  >;


export interface ProductionMasterArtifactPipelineInput {
  mission:
    ProductionSearchMissionInput;

  queryGraph:
    ProductionQueryGraphInput;

  /*
   * Real Stage-3 URL ownership result.
   *
   * Optional only during persistence migration.
   * No fallback ownership is synthesized here.
   */
  urlOwnership?:
    MasterRuntimeArtifacts[
      "urlOwnership"
    ];

  serpResearch:
    MasterRuntimeArtifacts[
      "serpResearch"
    ];

  expectedCoverage:
    ProductionExpectedCoverageInput;

  gaps:
    ProductionGapAnalysisInput;

  originalValue:
    ProductionOriginalValueInput;

  evidenceGraph:
    ProductionEvidenceGraphInput;

  claimLedger:
    ProductionClaimLedgerInput;

  masterBlueprint:
    ProductionMasterBlueprintInput;

  sectionBlueprints:
    ProductionSectionBlueprintInput;

  /*
   * Universal SEO V2.
   *
   * SMART is the default. API/UI may override this with:
   * PREVENT / ALLOW / IGNORE.
   */
  cannibalizationMode?:
    CannibalizationMode;

  internalLinkPlan:
    MasterRuntimeArtifacts[
      "internalLinkPlan"
    ];

  styleRules:
    MasterRuntimeArtifacts[
      "styleRules"
    ];
}


export interface ProductionMasterArtifactBuildResult {
  artifacts:
    Readonly<
      MasterRuntimeArtifacts
    >;

  persistence:
    Readonly<
      MasterRuntimePersistenceEnvelope
    >;
}


/*
 * Stage 1
 *
 * SearchMission semantics must already be explicit.
 * This function performs zero semantic inference.
 */
export function buildProductionSearchMission(
  input:
    ProductionSearchMissionInput
) {
  return createSearchMission(
    input
  );
}


/*
 * Stage 2
 *
 * Query signals are supplied by real upstream research.
 * Missing metrics remain missing; this layer creates no
 * search-volume / GSC / SERP defaults.
 */
export function buildProductionQueryGraph({
  mission,
  input,
}: {
  mission:
    ReturnType<
      typeof createSearchMission
    >;

  input:
    ProductionQueryGraphInput;
}) {
  return buildQueryGraph({
    ...input,

    mission,
  });
}


/*
 * Stage 6A
 */
export function buildProductionExpectedCoverage({
  mission,
  queryGraph,
  input,
}: {
  mission:
    ReturnType<
      typeof createSearchMission
    >;

  queryGraph:
    ReturnType<
      typeof buildQueryGraph
    >;

  input:
    ProductionExpectedCoverageInput;
}) {
  return buildExpectedCoverageModel({
    ...input,

    mission,

    queryGraph,
  });
}


/*
 * Stage 6B
 */
export function buildProductionGapAnalysis({
  expectedCoverage,
  input,
}: {
  expectedCoverage:
    ReturnType<
      typeof buildExpectedCoverageModel
    >;

  input:
    ProductionGapAnalysisInput;
}) {
  return buildGapAnalysis({
    ...input,

    expectedCoverage,
  });
}


/*
 * Stage 6C
 */
export function buildProductionOriginalValue({
  missionId,
  gaps,
  input,
}: {
  missionId:
    string;

  gaps:
    ReturnType<
      typeof buildGapAnalysis
    >;

  input:
    ProductionOriginalValueInput;
}) {
  return buildOriginalValuePlan({
    ...input,

    missionId,

    gaps,
  });
}


/*
 * Stage 7A
 */
export function buildProductionEvidenceGraph(
  input:
    ProductionEvidenceGraphInput
) {
  return buildEvidenceGraph(
    input
  );
}


/*
 * Stage 7B
 */
export function buildProductionClaimLedger({
  evidenceGraph,
  input,
}: {
  evidenceGraph:
    ReturnType<
      typeof buildEvidenceGraph
    >;

  input:
    ProductionClaimLedgerInput;
}) {
  return buildClaimLedger({
    ...input,

    graph:
      evidenceGraph,
  });
}


/*
 * Stage 8A
 */
export function buildProductionMasterBlueprint({
  mission,
  queryGraph,
  expectedCoverage,
  gaps,
  originalValue,
  evidenceGraph,
  claimLedger,
  input,
}: {
  mission:
    ReturnType<
      typeof createSearchMission
    >;

  queryGraph:
    ReturnType<
      typeof buildQueryGraph
    >;

  expectedCoverage:
    ReturnType<
      typeof buildExpectedCoverageModel
    >;

  gaps:
    ReturnType<
      typeof buildGapAnalysis
    >;

  originalValue:
    ReturnType<
      typeof buildOriginalValuePlan
    >;

  evidenceGraph:
    ReturnType<
      typeof buildEvidenceGraph
    >;

  claimLedger:
    ReturnType<
      typeof buildClaimLedger
    >;

  input:
    ProductionMasterBlueprintInput;
}) {
  return buildMasterSearchBlueprint({
    ...input,

    mission,

    queryGraph,

    expectedCoverage,

    gaps,

    originalValue,

    evidenceGraph,

    claimLedger,
  });
}


/*
 * Stage 8B
 */
export function buildProductionSectionBlueprints({
  blueprint,
  queryGraph,
  claimLedger,
  evidenceGraph,
  originalValue,
  input,
}: {
  blueprint:
    ReturnType<
      typeof buildMasterSearchBlueprint
    >;

  queryGraph:
    ReturnType<
      typeof buildQueryGraph
    >;

  claimLedger:
    ReturnType<
      typeof buildClaimLedger
    >;

  evidenceGraph:
    ReturnType<
      typeof buildEvidenceGraph
    >;

  originalValue:
    ReturnType<
      typeof buildOriginalValuePlan
    >;

  input:
    ProductionSectionBlueprintInput;
}) {
  return buildSectionBlueprintSet({
    ...input,

    blueprint,

    queryGraph,

    claimLedger,

    evidenceGraph,

    originalValue,
  });
}


/*
 * Complete deterministic production pipeline.
 *
 * This receives real upstream inputs and invokes the existing
 * verified Stage 1-8 builders.
 *
 * It does NOT:
 * - read finalPlan
 * - read searchBlueprintShadow
 * - infer mission semantics
 * - invent SERP results
 * - invent query metrics
 * - invent coverage
 * - invent evidence
 * - invent claims
 * - invent original-value assets
 */
export function buildProductionMasterArtifacts(
  input:
    ProductionMasterArtifactPipelineInput
): Readonly<ProductionMasterArtifactBuildResult> {
  const mission =
    buildProductionSearchMission(
      input.mission
    );

  const queryGraph =
    buildProductionQueryGraph({
      mission,

      input:
        input.queryGraph,
    });

  /*
   * UNIVERSAL_SEO_V2
   *
   * This is the production decision point.
   *
   * Inputs:
   * - immutable mission
   * - live SERP snapshot
   * - real Stage-3 URL ownership when available
   * - explicit cannibalization policy
   *
   * It does not invent ranking metrics.
   */
  const universalSeoDecision =
    buildUniversalSeoDecisionV2({
      topic:
        mission.topic,

      readerGoal:
        mission.readerGoal,

      /*
       * SearchMission intentionally does not own intent.
       * Canonical intent lives on QueryGraph.
       */
      missionIntent:
        queryGraph.missionIntent,

      riskClass:
        mission.riskClass,

      serpResearch:
        input.serpResearch,

      urlOwnership:
        input.urlOwnership ??
        null,

      cannibalizationMode:
        input.cannibalizationMode ??
        "SMART",
    });


  const expectedCoverage =
    buildProductionExpectedCoverage({
      mission,

      queryGraph,

      input:
        input.expectedCoverage,
    });

  const gaps =
    buildProductionGapAnalysis({
      expectedCoverage,

      input:
        input.gaps,
    });

  const originalValue =
    buildProductionOriginalValue({
      missionId:
        mission.id,

      gaps,

      input:
        input.originalValue,
    });

  const evidenceGraph =
    buildProductionEvidenceGraph(
      input.evidenceGraph
    );

  const claimLedger =
    buildProductionClaimLedger({
      evidenceGraph,

      input:
        input.claimLedger,
    });

  /*
   * COMPETITIVE_SEO_V2
   *
   * SERP consensus is deterministic observation.
   * It does not override Search Mission.
   * It does not turn competitor word/H2 counts into targets.
   */
  const serpConsensus =
    buildSerpConsensusV2(
      input.serpResearch
    );


  const competitiveGap =
    buildCompetitiveGapV2({
      consensus:
        serpConsensus,

      expectedCoverage,
    });


  const universalMasterBlueprintInput =
    applyUniversalSeoDecisionToMasterBlueprintV2({
      input:
        input.masterBlueprint,

      decision:
        universalSeoDecision,
    });


  const competitiveMasterBlueprintInput =
    applyCompetitiveSeoToMasterBlueprintV2({
      input:
        universalMasterBlueprintInput,

      consensus:
        serpConsensus,

      competitiveGap,
    });


  const searchBlueprint =
    buildProductionMasterBlueprint({
      mission,

      queryGraph,

      expectedCoverage,

      gaps,

      originalValue,

      evidenceGraph,

      claimLedger,

      input:
        competitiveMasterBlueprintInput,
    });

  const universalSectionBlueprintInput =
    applyUniversalSeoDecisionToSectionsV2({
      input:
        input.sectionBlueprints,

      decision:
        universalSeoDecision,
    });


  const sectionBlueprints =
    buildProductionSectionBlueprints({
      blueprint:
        searchBlueprint,

      queryGraph,

      claimLedger,

      evidenceGraph,

      originalValue,

      input:
        universalSectionBlueprintInput,
    });

  const artifacts:
    MasterRuntimeArtifacts = {
      mission,

      queryGraph,

      urlOwnership:
        input.urlOwnership ??
        null,

      serpResearch:
        input.serpResearch,

      expectedCoverage,

      gaps,

      originalValue,

      evidenceGraph,

      claimLedger,

      searchBlueprint,

      sectionBlueprints,

      internalLinkPlan:
        input.internalLinkPlan,

      styleRules:
        Object.freeze([
          ...input.styleRules,

          ...buildUniversalSeoWriterRulesV2(
            universalSeoDecision
          ),
        ]),
    };

  const persistence =
    buildMasterRuntimePersistenceEnvelope(
      artifacts
    );

  return Object.freeze({
    artifacts:
      Object.freeze(
        artifacts
      ),

    persistence,
  });
}
