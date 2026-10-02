import {
  inspectMasterRuntimeSnapshot,
  type MasterRuntimeBlocker,
} from "./master-runtime-adapter";

import {
  parseOptionalExplicitSearchMissionInput,
} from "./search-mission-ingress";


export type ProductionMasterRuntimeReadiness =
  | "READY"
  | "BLOCKED";


export type ProductionMasterRuntimeBlocker =
  | "CONTENT_EVIDENCE_PLAN_INVALID"
  | "EXPLICIT_SEARCH_MISSION_REQUIRED"
  | "EXPLICIT_SEARCH_MISSION_INVALID"
  | "STAGE_2_8_ARTIFACT_PIPELINE_NOT_CONNECTED"
  | "MASTER_RUNTIME_NOT_PERSISTED"
  | "MASTER_RUNTIME_INVALID";


export interface ProductionMasterRuntimeInspection {
  version:
    "PRODUCTION_MASTER_RUNTIME_READINESS_V1";

  readiness:
    ProductionMasterRuntimeReadiness;

  blockers:
    readonly ProductionMasterRuntimeBlocker[];

  adapterBlockers:
    readonly MasterRuntimeBlocker[];

  /**
   * This is intentionally false for legacy finalPlan /
   * searchBlueprintShadow snapshots.
   */
  masterRuntimePresent:
    boolean;
}


function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  );
}


export function inspectProductionMasterRuntimePlan(
  plan:
    unknown
): Readonly<ProductionMasterRuntimeInspection> {
  if (
    !isRecord(
      plan
    )
  ) {
    return Object.freeze({
      version:
        "PRODUCTION_MASTER_RUNTIME_READINESS_V1" as const,

      readiness:
        "BLOCKED" as const,

      blockers:
        Object.freeze([
          "CONTENT_EVIDENCE_PLAN_INVALID" as const,
        ]),

      adapterBlockers:
        Object.freeze([]),

      masterRuntimePresent:
        false,
    });
  }


  const blockers:
    ProductionMasterRuntimeBlocker[] =
      [];


  // ----------------------------------------------------------
  // Explicit SearchMission provenance
  // ----------------------------------------------------------

  if (
    plan.searchMissionInput ===
      undefined ||
    plan.searchMissionInput ===
      null
  ) {
    blockers.push(
      "EXPLICIT_SEARCH_MISSION_REQUIRED"
    );
  } else {
    const parsedMission =
      parseOptionalExplicitSearchMissionInput(
        plan.searchMissionInput
      );

    if (
      !parsedMission.ok ||
      !parsedMission.value
    ) {
      blockers.push(
        "EXPLICIT_SEARCH_MISSION_INVALID"
      );
    }
  }


  // ----------------------------------------------------------
  // Master runtime
  // ----------------------------------------------------------

  const masterRuntimePresent =
    plan.masterRuntime !==
      undefined &&
    plan.masterRuntime !==
      null;


  if (
    !masterRuntimePresent
  ) {
    /*
     * IMPORTANT:
     *
     * Do not reconstruct Stage 2–8 from:
     *
     * - finalPlan
     * - searchBlueprintShadow
     * - informationGain
     * - architecture
     * - generated outline
     * - keyword score
     * - SERP snippets
     *
     * Those are observations / legacy artifacts, not the
     * immutable Stage 1–8 research chain.
     */

    blockers.push(
      "STAGE_2_8_ARTIFACT_PIPELINE_NOT_CONNECTED"
    );

    blockers.push(
      "MASTER_RUNTIME_NOT_PERSISTED"
    );

    return Object.freeze({
      version:
        "PRODUCTION_MASTER_RUNTIME_READINESS_V1" as const,

      readiness:
        "BLOCKED" as const,

      blockers:
        Object.freeze([
          ...new Set(
            blockers
          ),
        ]),

      adapterBlockers:
        Object.freeze([]),

      masterRuntimePresent:
        false,
    });
  }


  const masterInspection =
    inspectMasterRuntimeSnapshot(
      plan
    );


  /*
   * CLAIM_GATE_DEFERRED_TO_PUBLICATION_SCOPE_V1
   *
   * The Master Runtime adapter intentionally distinguishes:
   *
   * STRUCTURAL INVALIDITY
   * -> runtime = null
   *
   * WRITER/PUBLICATION CLAIM BLOCK
   * -> readiness = BLOCKED
   * -> runtime remains fully persisted
   *
   * Claim publication blockers must survive into the later
   * publication-evidence section scope where unsupported
   * sections are removed before Writer execution.
   *
   * Do NOT soften:
   * - MASTER_RUNTIME_NO_GO
   * - MASTER_RUNTIME_ORIGINAL_VALUE_BLOCKED
   * - structural / hydration / fingerprint failures
   */
  const claimGateOnlyBlockedRuntime =
    Boolean(
      masterInspection.runtime
    ) &&
    masterInspection.readiness ===
      "BLOCKED" &&
    masterInspection.blockers.length >
      0 &&
    masterInspection.blockers.every(
      (blocker) =>
        blocker ===
        "MASTER_RUNTIME_CLAIM_GATE_BLOCKED"
    );


  if (
    !masterInspection.runtime ||
    (
      masterInspection.readiness !==
        "READY" &&
      !claimGateOnlyBlockedRuntime
    )
  ) {
    blockers.push(
      "MASTER_RUNTIME_INVALID"
    );

    return Object.freeze({
      version:
        "PRODUCTION_MASTER_RUNTIME_READINESS_V1" as const,

      readiness:
        "BLOCKED" as const,

      blockers:
        Object.freeze([
          ...new Set(
            blockers
          ),
        ]),

      adapterBlockers:
        Object.freeze([
          ...masterInspection
            .blockers,
        ]),

      masterRuntimePresent:
        true,
    });
  }


  /*
   * A valid masterRuntime is still not enough if the explicit
   * SearchMission ingress/audit record is missing or malformed.
   *
   * This prevents silent promotion of a legacy snapshot.
   */
  if (
    blockers.length >
    0
  ) {
    return Object.freeze({
      version:
        "PRODUCTION_MASTER_RUNTIME_READINESS_V1" as const,

      readiness:
        "BLOCKED" as const,

      blockers:
        Object.freeze([
          ...new Set(
            blockers
          ),
        ]),

      adapterBlockers:
        Object.freeze([]),

      masterRuntimePresent:
        true,
    });
  }


  return Object.freeze({
    version:
      "PRODUCTION_MASTER_RUNTIME_READINESS_V1" as const,

    readiness:
      "READY" as const,

    blockers:
      Object.freeze([]),

    adapterBlockers:
      Object.freeze([]),

    masterRuntimePresent:
      true,
  });
}
