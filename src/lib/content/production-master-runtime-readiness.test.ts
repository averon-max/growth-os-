import {
  describe,
  expect,
  it,
} from "vitest";

import {
  inspectProductionMasterRuntimePlan,
} from "./production-master-runtime-readiness";


const explicitMission = {
  audience:
    "US consumers concerned about fraud and identity theft",

  readerGoal:
    "Understand what credit monitoring does, its limitations, and what action to take after an alert.",

  businessRelationship:
    "DIRECT",

  jurisdiction:
    "US",

  language:
    "en",

  location:
    "United States",

  riskClass:
    "YMYL_FINANCE",
} as const;


describe(
  "Production Master Runtime Readiness V1",
  () => {
    it(
      "fails closed for an invalid evidence plan",
      () => {
        const result =
          inspectProductionMasterRuntimePlan(
            null
          );

        expect(
          result.readiness
        ).toBe(
          "BLOCKED"
        );

        expect(
          result.blockers
        ).toEqual([
          "CONTENT_EVIDENCE_PLAN_INVALID",
        ]);
      }
    );


    it(
      "does not promote a legacy finalPlan without explicit SearchMission",
      () => {
        const result =
          inspectProductionMasterRuntimePlan({
            version:
              "CONTENT_PLAN_V2",

            searchBlueprintShadow: {
              version:
                "SEARCH_BLUEPRINT_V1",

              mode:
                "SHADOW",
            },

            architecture: {
              requiredTopics: [
                "Definition",
              ],
            },

            informationGain: [
              "SERP_GAP:limitations",
            ],
          });

        expect(
          result.readiness
        ).toBe(
          "BLOCKED"
        );

        expect(
          result.blockers
        ).toContain(
          "EXPLICIT_SEARCH_MISSION_REQUIRED"
        );

        expect(
          result.blockers
        ).toContain(
          "STAGE_2_8_ARTIFACT_PIPELINE_NOT_CONNECTED"
        );

        expect(
          result.blockers
        ).toContain(
          "MASTER_RUNTIME_NOT_PERSISTED"
        );

        expect(
          result.masterRuntimePresent
        ).toBe(
          false
        );
      }
    );


    it(
      "accepts explicit SearchMission provenance but still blocks when Stage 2-8 artifacts are absent",
      () => {
        const result =
          inspectProductionMasterRuntimePlan({
            searchMissionInput:
              explicitMission,

            searchBlueprintShadow: {
              version:
                "SEARCH_BLUEPRINT_V1",

              mode:
                "SHADOW",
            },
          });

        expect(
          result.readiness
        ).toBe(
          "BLOCKED"
        );

        expect(
          result.blockers
        ).not.toContain(
          "EXPLICIT_SEARCH_MISSION_REQUIRED"
        );

        expect(
          result.blockers
        ).toContain(
          "STAGE_2_8_ARTIFACT_PIPELINE_NOT_CONNECTED"
        );

        expect(
          result.blockers
        ).toContain(
          "MASTER_RUNTIME_NOT_PERSISTED"
        );
      }
    );


    it(
      "fails closed for malformed explicit SearchMission",
      () => {
        const result =
          inspectProductionMasterRuntimePlan({
            searchMissionInput: {
              audience:
                "US consumers",

              readerGoal:
                "",

              businessRelationship:
                "DIRECT",

              language:
                "en",

              location:
                "United States",

              riskClass:
                "YMYL_FINANCE",
            },
          });

        expect(
          result.readiness
        ).toBe(
          "BLOCKED"
        );

        expect(
          result.blockers
        ).toContain(
          "EXPLICIT_SEARCH_MISSION_INVALID"
        );
      }
    );


    it(
      "does not treat searchBlueprintShadow as masterRuntime",
      () => {
        const result =
          inspectProductionMasterRuntimePlan({
            searchMissionInput:
              explicitMission,

            searchBlueprintShadow: {
              version:
                "MASTER_SEARCH_BLUEPRINT_V1",

              revision:
                1,

              fingerprint:
                "fake-promotion",
            },
          });

        expect(
          result.masterRuntimePresent
        ).toBe(
          false
        );

        expect(
          result.readiness
        ).toBe(
          "BLOCKED"
        );
      }
    );


    it(
      "delegates malformed persisted masterRuntime to the verified adapter",
      () => {
        const result =
          inspectProductionMasterRuntimePlan({
            searchMissionInput:
              explicitMission,

            masterRuntime: {
              version:
                "MASTER_RUNTIME_SNAPSHOT_V1",
            },
          });

        expect(
          result.readiness
        ).toBe(
          "BLOCKED"
        );

        expect(
          result.masterRuntimePresent
        ).toBe(
          true
        );

        expect(
          result.blockers
        ).toContain(
          "MASTER_RUNTIME_INVALID"
        );

        expect(
          result.adapterBlockers
            .length
        ).toBeGreaterThan(
          0
        );
      }
    );
  }
);
