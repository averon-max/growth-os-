import {
  buildProductionMasterArtifacts,
  type ProductionMasterArtifactPipelineInput,
} from "./production-master-artifact-builders";

import {
  parseOptionalExplicitSearchMissionInput,
  type ExplicitSearchMissionInput,
} from "./search-mission-ingress";

import {
  inspectProductionMasterRuntimePlan,
  type ProductionMasterRuntimeInspection,
} from "./production-master-runtime-readiness";


export type ProductionMasterBriefArtifactInput =
  ProductionMasterArtifactPipelineInput;


export interface ProductionMasterBriefRuntimeV1 {
  version:
    "PRODUCTION_MASTER_BRIEF_RUNTIME_V1";

  searchMissionInput:
    ExplicitSearchMissionInput |
    null;

  masterRuntime:
    unknown |
    null;

  readiness:
    Readonly<
      ProductionMasterRuntimeInspection
    >;
}


function optionalString(
  value:
    string |
    undefined |
    null
): string | null {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return null;
  }

  const clean =
    value.trim();

  return clean ||
    null;
}


function assertEqual({
  field,
  explicitValue,
  masterValue,
}: {
  field:
    string;

  explicitValue:
    unknown;

  masterValue:
    unknown;
}): void {
  if (
    explicitValue !==
    masterValue
  ) {
    throw new Error(
      `PRODUCTION_MASTER_MISSION_MISMATCH:${field}`
    );
  }
}


function assertMasterMissionMatchesIngress({
  websiteId,
  topic,
  explicitMission,
  masterArtifacts,
}: {
  websiteId:
    string;

  topic:
    string;

  explicitMission:
    ExplicitSearchMissionInput;

  masterArtifacts:
    ProductionMasterArtifactPipelineInput;
}): void {
  const mission =
    masterArtifacts.mission;

  assertEqual({
    field:
      "websiteId",

    explicitValue:
      websiteId.trim(),

    masterValue:
      mission.websiteId.trim(),
  });

  assertEqual({
    field:
      "topic",

    explicitValue:
      topic.trim(),

    masterValue:
      mission.topic.trim(),
  });

  assertEqual({
    field:
      "audience",

    explicitValue:
      explicitMission.audience,

    masterValue:
      mission.audience,
  });

  assertEqual({
    field:
      "readerGoal",

    explicitValue:
      explicitMission.readerGoal,

    masterValue:
      mission.readerGoal,
  });

  assertEqual({
    field:
      "businessRelationship",

    explicitValue:
      explicitMission
        .businessRelationship,

    masterValue:
      mission.businessRelationship,
  });

  assertEqual({
    field:
      "jurisdiction",

    explicitValue:
      optionalString(
        explicitMission
          .jurisdiction
      ),

    masterValue:
      optionalString(
        mission.jurisdiction
      ),
  });

  assertEqual({
    field:
      "language",

    explicitValue:
      explicitMission.language,

    masterValue:
      mission.language,
  });

  assertEqual({
    field:
      "location",

    explicitValue:
      explicitMission.location,

    masterValue:
      mission.location,
  });

  assertEqual({
    field:
      "riskClass",

    explicitValue:
      explicitMission.riskClass,

    masterValue:
      mission.riskClass,
  });
}


export function prepareProductionMasterBriefRuntime({
  websiteId,
  topic,
  searchMissionInput,
  masterArtifacts,
}: {
  websiteId:
    string;

  topic:
    string;

  searchMissionInput:
    unknown;

  masterArtifacts?:
    ProductionMasterArtifactPipelineInput;
}): Readonly<
  ProductionMasterBriefRuntimeV1
> {
  const parsedMission =
    parseOptionalExplicitSearchMissionInput(
      searchMissionInput
    );

  if (
    !parsedMission.ok
  ) {
    throw new Error(
      [
        parsedMission.code,
        parsedMission.error,
      ].join(
        ":"
      )
    );
  }

  const explicitMission =
    parsedMission.value ??
    null;


  /*
   * Migration compatibility:
   *
   * Legacy callers may still create a brief without the
   * Stage 1-8 pipeline input.
   *
   * We do NOT reconstruct the master runtime from finalPlan,
   * keyword strings, outline, searchBlueprintShadow, or other
   * legacy observations.
   *
   * The persisted readiness remains BLOCKED instead.
   */
  if (
    !masterArtifacts
  ) {
    const readiness =
      inspectProductionMasterRuntimePlan({
        searchMissionInput:
          explicitMission,
      });

    return Object.freeze({
      version:
        "PRODUCTION_MASTER_BRIEF_RUNTIME_V1" as const,

      searchMissionInput:
        explicitMission,

      masterRuntime:
        null,

      readiness,
    });
  }


  /*
   * A master runtime cannot exist without an explicit
   * auditable SearchMission ingress record.
   */
  if (
    !explicitMission
  ) {
    throw new Error(
      "PRODUCTION_MASTER_ARTIFACT_INPUT_REQUIRES_SEARCH_MISSION"
    );
  }


  /*
   * Prevent split-brain provenance:
   *
   * SearchMission persisted for audit must describe the same
   * mission used to construct Stage 1-8.
   */
  assertMasterMissionMatchesIngress({
    websiteId,
    topic,
    explicitMission,
    masterArtifacts,
  });


  /*
   * This is the ONLY Stage 1-8 construction call here.
   *
   * It invokes the real deterministic production builders
   * and performs the master-runtime JSON persistence
   * round-trip guard.
   */
  const build =
    buildProductionMasterArtifacts(
      masterArtifacts
    );

  const masterRuntime =
    build.persistence
      .masterRuntime;


  const readiness =
    inspectProductionMasterRuntimePlan({
      searchMissionInput:
        explicitMission,

      masterRuntime,
    });


  /*
   * If a caller explicitly supplied a master artifact bundle,
   * silently persisting a BLOCKED runtime would hide a broken
   * production pipeline. Fail closed.
   */
  if (
    readiness.readiness !==
    "READY"
  ) {
    throw new Error(
      [
        "PRODUCTION_MASTER_RUNTIME_BLOCKED",
        ...readiness.blockers,
        ...readiness.adapterBlockers,
      ].join(
        ":"
      )
    );
  }


  return Object.freeze({
    version:
      "PRODUCTION_MASTER_BRIEF_RUNTIME_V1" as const,

    searchMissionInput:
      explicitMission,

    masterRuntime,

    readiness,
  });
}
