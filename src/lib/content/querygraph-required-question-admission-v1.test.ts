import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createSearchMission,
} from "./search-mission";

import {
  buildQueryGraph,
} from "./query-graph";

import {
  deriveQueryGraphRequiredQuestionAdmissionV1,
} from "./querygraph-required-question-admission-v1";


describe(
  "QueryGraph required-question admission V1",
  () => {
    it(
      "admits SAME_PAGE and rejects non-SAME_PAGE execution questions",
      () => {
        const mission =
          createSearchMission({
            id:
              "mission-question-admission",

            websiteId:
              "site-1",

            topic:
              "credit monitoring",

            audience:
              "US consumers",

            readerGoal:
              "Understand credit monitoring.",

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

            createdAt:
              new Date(
                "2026-10-07T00:00:00.000Z"
              ),

            version:
              1,
          });


        const graph =
          buildQueryGraph({
            mission,

            missionIntent:
              "INFORMATIONAL",

            signals: [
              {
                query:
                  "does credit monitoring affect credit score",

                intent:
                  "INFORMATIONAL",

                subIntent:
                  "credit score impact",

                cluster:
                  "credit monitoring basics",

                siteCoverage:
                  "WEAK",

                source:
                  "DATAFORSEO",

                sourceConfidence:
                  0.9,

                sameMissionEvidence:
                  true,
              },

              {
                query:
                  "what is credit monitoring on credit karma",

                intent:
                  "INFORMATIONAL",

                subIntent:
                  "BRAND service explanation",

                cluster:
                  "credit monitoring basics",

                siteCoverage:
                  "WEAK",

                source:
                  "DATAFORSEO",

                sourceConfidence:
                  0.9,

                sameMissionEvidence:
                  false,
              },
            ],
          });


        const admission =
          deriveQueryGraphRequiredQuestionAdmissionV1({
            queryGraph:
              graph,

            questions: [
              "does credit monitoring affect credit score",
              "what is credit monitoring on credit karma",
            ],
          });


        expect(
          admission[0]
        ).toMatchObject({
          decision:
            "SAME_PAGE",

          admitted:
            true,
        });


        expect(
          admission[1]
            ?.admitted
        ).toBe(
          false
        );
      }
    );
  }
);
