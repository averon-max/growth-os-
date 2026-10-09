import {
  describe,
  expect,
  it,
} from "vitest";

import {
  isSafeMissionPreservingClaimReplanCandidateV1,
} from "./claim-replan-safety-v1";

const base = {
  originalText:
    "Credit monitoring does not directly control a person's credit score.",

  primaryQuery:
    "what is credit monitoring",

  sectionHeading:
    "Important limitations of credit monitoring",

  sectionMission:
    "Clarify what monitoring cannot do and address credit-score concerns",
};

describe(
  "claim replan safety V1",
  () => {
    it(
      "accepts a same-mission evidence-grounded score proposition",
      () => {
        expect(
          isSafeMissionPreservingClaimReplanCandidateV1({
            ...base,
            candidateText:
              "Checking your credit through a credit monitoring service does not hurt your credit score.",
          })
        ).toBe(true);
      }
    );

    it(
      "uses required questions as part of the owning section semantic job",
      () => {
        expect(
          isSafeMissionPreservingClaimReplanCandidateV1({
            originalText:
              "Credit monitoring is distinct from checking whether an action affects a credit score.",

            candidateText:
              "Credit monitoring can track a credit score and alert users about score changes.",

            primaryQuery:
              "what is credit monitoring",

            sectionHeading:
              "Important Limits to Understand",

            sectionMission:
              "Clarify coverage differences and avoid overestimating what monitoring does",

            sectionQuestions: [
              "How does credit monitoring relate to changes in a credit score?",
            ],

            sectionExpectedOutcome:
              "The reader understands monitoring coverage and score-related limits.",
          })
        ).toBe(true);
      }
    );



    it(
      "rejects unrelated limitation drift",
      () => {
        expect(
          isSafeMissionPreservingClaimReplanCandidateV1({
            ...base,
            candidateText:
              "Credit monitoring does not prevent phishing emails.",
          })
        ).toBe(false);
      }
    );

    it(
      "rejects polarity inversion",
      () => {
        expect(
          isSafeMissionPreservingClaimReplanCandidateV1({
            ...base,
            candidateText:
              "Credit monitoring improves a person's credit score.",
          })
        ).toBe(false);
      }
    );

    it(
      "rejects invented numeric specificity",
      () => {
        expect(
          isSafeMissionPreservingClaimReplanCandidateV1({
            ...base,
            candidateText:
              "Credit monitoring does not hurt a credit score within 30 days.",
          })
        ).toBe(false);
      }
    );
  }
);
