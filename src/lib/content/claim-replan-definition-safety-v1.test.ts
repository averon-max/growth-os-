
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  isSafeMissionPreservingClaimReplanCandidateV1,
} from "./claim-replan-safety-v1";


describe(
  "definition claim replan safety V1",
  () => {
    it(
      "allows evidence-grounded definition wording while preserving the primary subject",
      () => {
        expect(
          isSafeMissionPreservingClaimReplanCandidateV1({
            originalText:
              "Credit monitoring is a service that tracks specified changes in a person's credit information.",

            candidateText:
              "Credit monitoring is a service that watches credit reports and alerts consumers to changes.",

            primaryQuery:
              "what is credit monitoring",

            sectionHeading:
              "What Is Credit Monitoring?",

            sectionMission:
              "Define credit monitoring and explain what the service monitors.",

            sectionQuestions:
              [],

            sectionExpectedOutcome:
              "The reader understands what credit monitoring is.",
          })
        ).toBe(
          true
        );
      }
    );


    it(
      "still rejects unrelated same-subject drift",
      () => {
        expect(
          isSafeMissionPreservingClaimReplanCandidateV1({
            originalText:
              "Credit monitoring is a service that tracks specified changes in a person's credit information.",

            candidateText:
              "Credit monitoring subscriptions can be expensive.",

            primaryQuery:
              "what is credit monitoring",

            sectionHeading:
              "What Is Credit Monitoring?",

            sectionMission:
              "Define credit monitoring and explain what the service monitors.",

            sectionQuestions:
              [],

            sectionExpectedOutcome:
              "The reader understands what credit monitoring is.",
          })
        ).toBe(
          false
        );
      }
    );


    it(
      "still rejects polarity drift",
      () => {
        expect(
          isSafeMissionPreservingClaimReplanCandidateV1({
            originalText:
              "Credit monitoring does not prevent identity theft.",

            candidateText:
              "Credit monitoring prevents identity theft.",

            primaryQuery:
              "what is credit monitoring",

            sectionHeading:
              "Important limitations",

            sectionMission:
              "Explain what credit monitoring cannot prevent.",

            sectionQuestions:
              [],

            sectionExpectedOutcome:
              "The reader understands the limits of monitoring.",
          })
        ).toBe(
          false
        );
      }
    );

    it(
      "accepts a definition when the section mission also says establish its purpose",
      () => {
        expect(
          isSafeMissionPreservingClaimReplanCandidateV1({
            originalText:
              "Credit monitoring is a service that tracks specified changes in a person's credit information.",

            candidateText:
              "Credit monitoring is a service that watches credit reports and alerts consumers to changes.",

            primaryQuery:
              "what is credit monitoring",

            sectionHeading:
              "What Is Credit Monitoring?",

            sectionMission:
              "Define credit monitoring and establish its purpose.",

            sectionQuestions:
              [],

            sectionExpectedOutcome:
              "The reader can explain credit monitoring in plain language.",
          })
        ).toBe(
          true
        );
      }
    );


    it(
      "rejects an unrelated same-subject insurance definition",
      () => {
        expect(
          isSafeMissionPreservingClaimReplanCandidateV1({
            originalText:
              "Credit monitoring is a service that tracks specified changes in a person's credit information.",

            candidateText:
              "Credit monitoring is a service provided within the privacy notification and crisis management insuring agreement of a cyber and privacy insurance policy.",

            primaryQuery:
              "what is credit monitoring",

            sectionHeading:
              "What Is Credit Monitoring?",

            sectionMission:
              "Define credit monitoring and establish its purpose.",

            sectionQuestions:
              [],

            sectionExpectedOutcome:
              "The reader can explain credit monitoring in plain language.",
          })
        ).toBe(
          false
        );
      }
    );



    it(
      "rejects Delaware data-breach legal prose as a credit-monitoring definition",
      () => {
        expect(
          isSafeMissionPreservingClaimReplanCandidateV1({
            originalText:
              "Credit monitoring is a service that tracks specified changes in a person's credit information.",

            candidateText:
              "Subscribe Close State Businesses are now required to provide free credit monitoring after data breaches in Delaware A host of consumer protections are included in a new law designed to update the state's cybersecurity definitions and requirements for those storing personal information.",

            primaryQuery:
              "what is credit monitoring",

            sectionHeading:
              "What Is Credit Monitoring?",

            sectionMission:
              "Define credit monitoring and establish its purpose.",

            sectionQuestions:
              [],

            sectionExpectedOutcome:
              "The reader can explain credit monitoring in plain language.",
          })
        ).toBe(
          false
        );
      }
    );

  }
);
