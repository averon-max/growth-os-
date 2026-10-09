import {
  describe,
  expect,
  it,
} from "vitest";

import {
  selectDeterministicDefinitionReplanCandidateV1,
} from "./claim-replan-safety-v1";


const base = {
  originalText:
    "Credit monitoring is a service that tracks specified changes in a person's credit information.",

  primaryQuery:
    "what is credit monitoring",

  sectionHeading:
    "What Is Credit Monitoring?",

  sectionMission:
    "Define credit monitoring and establish its purpose.",

  sectionQuestions:
    [] as readonly string[],

  sectionExpectedOutcome:
    "The reader can explain what credit monitoring is.",
};


describe(
  "deterministic definition replan V1",
  () => {
    it(
      "selects safe same-subject definition wording from fetched evidence",
      () => {
        const result =
          selectDeterministicDefinitionReplanCandidateV1({
            ...base,

            candidates: [
              {
                sourceId:
                  "pricing",

                excerpt:
                  "Credit monitoring subscriptions can be expensive.",
              },

              {
                sourceId:
                  "definition",

                excerpt:
                  "Credit monitoring is a service that watches credit reports and alerts consumers to changes.",
              },
            ],
          });


        expect(
          result
        ).toEqual({
          sourceId:
            "definition",

          text:
            "Credit monitoring is a service that watches credit reports and alerts consumers to changes.",
        });
      }
    );


    it(
      "rejects feature-only wording for a definition job",
      () => {
        const result =
          selectDeterministicDefinitionReplanCandidateV1({
            ...base,

            candidates: [
              {
                sourceId:
                  "alerts",

                excerpt:
                  "Credit monitoring can provide alerts to consumers.",
              },
            ],
          });


        expect(
          result
        ).toBeNull();
      }
    );


    it(
      "does not run on a non-definition section",
      () => {
        const result =
          selectDeterministicDefinitionReplanCandidateV1({
            ...base,

            sectionHeading:
              "Free vs. Paid Options",

            sectionMission:
              "Compare pricing and feature differences.",

            sectionExpectedOutcome:
              "The reader understands plan tradeoffs.",

            candidates: [
              {
                sourceId:
                  "definition",

                excerpt:
                  "Credit monitoring is a service that watches credit reports.",
              },
            ],
          });


        expect(
          result
        ).toBeNull();
      }
    );
  }
);
