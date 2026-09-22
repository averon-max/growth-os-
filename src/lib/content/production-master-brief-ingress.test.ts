import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ProductionMasterBriefArtifactInput,
} from "./production-master-brief-ingress";

import {
  prepareProductionMasterBriefRuntime,
} from "./production-master-brief-ingress";


const searchMission = {
  audience:
    "US consumers",

  readerGoal:
    "Understand what credit monitoring does.",

  businessRelationship:
    "DIRECT" as const,

  jurisdiction:
    "US",

  language:
    "en",

  location:
    "United States",

  riskClass:
    "YMYL_FINANCE" as const,
};


describe(
  "Production Master Brief Ingress",
  () => {
    it(
      "keeps legacy callers compatible but explicitly BLOCKED when no master artifacts were supplied",
      () => {
        const result =
          prepareProductionMasterBriefRuntime({
            websiteId:
              "website-1",

            topic:
              "what is credit monitoring",

            searchMissionInput:
              searchMission,
          });

        expect(
          result.masterRuntime
        ).toBeNull();

        expect(
          result.readiness
            .readiness
        ).toBe(
          "BLOCKED"
        );

        expect(
          result.readiness
            .blockers
        ).toContain(
          "MASTER_RUNTIME_NOT_PERSISTED"
        );
      }
    );


    it(
      "never synthesizes missing SearchMission when master artifacts are supplied",
      () => {
        expect(
          () =>
            prepareProductionMasterBriefRuntime({
              websiteId:
                "website-1",

              topic:
                "what is credit monitoring",

              searchMissionInput:
                null,

              masterArtifacts:
                {} as
                  ProductionMasterBriefArtifactInput,
            })
        ).toThrow(
          "PRODUCTION_MASTER_ARTIFACT_INPUT_REQUIRES_SEARCH_MISSION"
        );
      }
    );


    it(
      "blocks a master mission for another website before Stage 1-8 construction",
      () => {
        const masterArtifacts = {
          mission: {
            websiteId:
              "another-website",

            topic:
              "what is credit monitoring",

            ...searchMission,
          },
        } as unknown as
          ProductionMasterBriefArtifactInput;

        expect(
          () =>
            prepareProductionMasterBriefRuntime({
              websiteId:
                "website-1",

              topic:
                "what is credit monitoring",

              searchMissionInput:
                searchMission,

              masterArtifacts,
            })
        ).toThrow(
          "PRODUCTION_MASTER_MISSION_MISMATCH:websiteId"
        );
      }
    );


    it(
      "blocks a different topic before Stage 1-8 construction",
      () => {
        const masterArtifacts = {
          mission: {
            websiteId:
              "website-1",

            topic:
              "identity theft insurance",

            ...searchMission,
          },
        } as unknown as
          ProductionMasterBriefArtifactInput;

        expect(
          () =>
            prepareProductionMasterBriefRuntime({
              websiteId:
                "website-1",

              topic:
                "what is credit monitoring",

              searchMissionInput:
                searchMission,

              masterArtifacts,
            })
        ).toThrow(
          "PRODUCTION_MASTER_MISSION_MISMATCH:topic"
        );
      }
    );


    it(
      "blocks semantic SearchMission drift before Stage 1-8 construction",
      () => {
        const masterArtifacts = {
          mission: {
            websiteId:
              "website-1",

            topic:
              "what is credit monitoring",

            ...searchMission,

            audience:
              "enterprise security teams",
          },
        } as unknown as
          ProductionMasterBriefArtifactInput;

        expect(
          () =>
            prepareProductionMasterBriefRuntime({
              websiteId:
                "website-1",

              topic:
                "what is credit monitoring",

              searchMissionInput:
                searchMission,

              masterArtifacts,
            })
        ).toThrow(
          "PRODUCTION_MASTER_MISSION_MISMATCH:audience"
        );
      }
    );


    it(
      "rejects malformed explicit SearchMission input",
      () => {
        expect(
          () =>
            prepareProductionMasterBriefRuntime({
              websiteId:
                "website-1",

              topic:
                "what is credit monitoring",

              searchMissionInput: {
                audience:
                  "",
              },
            })
        ).toThrow(
          "SEARCH_MISSION_INPUT_INVALID"
        );
      }
    );
  }
);
