import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createSearchMission,
} from "./search-mission";

import {
  evaluateIntentBoundary,
  lexicalQueryOverlap,
} from "./intent-boundary";


const mission =
  createSearchMission({
    id:
      "mission-credit-monitoring-v1",

    websiteId:
      "website-scanmycreds",

    topic:
      "what is credit monitoring",

    audience:
      "US consumers concerned about fraud and identity theft",

    readerGoal:
      "Understand what credit monitoring is and how it works.",

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
        "2026-09-21T00:00:00.000Z"
      ),

    version:
      1,
  });


describe(
  "IntentBoundary V1",
  () => {
    it(
      "keeps a same-intent same-mission query on the same page",
      () => {
        const result =
          evaluateIntentBoundary({
            mission,

            missionIntent:
              "INFORMATIONAL",

            query:
              "how does credit monitoring work",

            queryIntent:
              "INFORMATIONAL",

            evidence: {
              sameMissionEvidence:
                true,
            },
          });

        expect(
          result.decision
        ).toBe(
          "SAME_PAGE"
        );

        expect(
          result.primaryEligible
        ).toBe(
          true
        );
      }
    );


    it(
      "separates commercial investigation from informational mission",
      () => {
        const result =
          evaluateIntentBoundary({
            mission,

            missionIntent:
              "INFORMATIONAL",

            query:
              "best credit monitoring services",

            queryIntent:
              "COMMERCIAL",
          });

        expect(
          result.decision
        ).toBe(
          "SEPARATE_PAGE"
        );

        expect(
          result.primaryEligible
        ).toBe(
          false
        );
      }
    );


    it(
      "never lets an unrequested foreign entity own the mission",
      () => {
        const result =
          evaluateIntentBoundary({
            mission,

            missionIntent:
              "INFORMATIONAL",

            query:
              "experian credit monitoring",

            queryIntent:
              "INFORMATIONAL",

            evidence: {
              missionOverlap:
                1,

              queryOverlap:
                1,

              serpUrlOverlap:
                1,

              serpPageTypeOverlap:
                1,

              foreignEntityEvidence:
                true,
            },
          });

        expect(
          result.primaryEligible
        ).toBe(
          false
        );

        expect(
          result.decision
        ).toBe(
          "UNCERTAIN"
        );

        expect(
          result.reasons
        ).toContain(
          "UNREQUESTED_ENTITY_MODIFIER"
        );
      }
    );


    it(
      "detects multiple existing owners as merge investigation",
      () => {
        const result =
          evaluateIntentBoundary({
            mission,

            missionIntent:
              "INFORMATIONAL",

            query:
              "credit monitoring meaning",

            queryIntent:
              "INFORMATIONAL",

            evidence: {
              missionOverlap:
                0.9,

              queryOverlap:
                0.8,

              existingOwnerUrls: [
                "/credit-monitoring",
                "/credit-monitoring-guide",
              ],
            },
          });

        expect(
          result.decision
        ).toBe(
          "MERGE"
        );

        expect(
          result.reasons
        ).toContain(
          "CANNIBALIZATION_INVESTIGATION_REQUIRED"
        );
      }
    );


    it(
      "keeps weak evidence provisional instead of pretending certainty",
      () => {
        const result =
          evaluateIntentBoundary({
            mission,

            missionIntent:
              "INFORMATIONAL",

            query:
              "credit monitoring limitations",

            queryIntent:
              "INFORMATIONAL",
          });

        expect(
          result.provisional
        ).toBe(
          true
        );

        expect(
          result.confidence
        ).toBeLessThan(
          1
        );
      }
    );


    it(
      "uses lexical overlap only as an explicitly labelled fallback",
      () => {
        expect(
          lexicalQueryOverlap(
            "what is credit monitoring",
            "credit monitoring limitations"
          )
        ).toBeGreaterThan(
          0
        );

        expect(
          lexicalQueryOverlap(
            "what is credit monitoring",
            "car insurance rates"
          )
        ).toBe(
          0
        );
      }
    );
  }
);
