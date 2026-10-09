import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  isSafeMissionPreservingClaimReplanCandidateV1,
} from "./claim-replan-safety-v1";


const planner =
  readFileSync(
    new URL(
      "./production-master-live-stage-planner.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "required-question direct-answer recovery V2",
  () => {
    it(
      "proves the exact failed adjacent claim is misaligned",
      () => {
        const bad =
          "Using a credit monitoring service does not itself constitute a credit application.";

        expect(
          isSafeMissionPreservingClaimReplanCandidateV1({
            originalText:
              bad,

            candidateText:
              `${bad}.`,

            primaryQuery:
              "what is credit monitoring",

            sectionHeading:
              "Does Credit Monitoring Affect Your Credit Score?",

            sectionMission:
              "Explain whether credit monitoring affects the reader's credit score.",

            sectionQuestions: [
              "Does Credit Monitoring Affect Your Credit Score?",
            ],

            sectionExpectedOutcome:
              "The reader knows whether credit monitoring affects a credit score.",
          })
        ).toBe(
          false
        );
      }
    );


    it(
      "proves the desired direct-answer transformation remains allowed",
      () => {
        expect(
          isSafeMissionPreservingClaimReplanCandidateV1({
            originalText:
              "Using a credit monitoring service does not itself constitute a credit application.",

            candidateText:
              "Checking your credit through a credit monitoring service does not hurt your credit score.",

            primaryQuery:
              "what is credit monitoring",

            sectionHeading:
              "Does Credit Monitoring Affect Your Credit Score?",

            sectionMission:
              "Explain whether credit monitoring affects the reader's credit score.",

            sectionQuestions: [
              "Does Credit Monitoring Affect Your Credit Score?",
            ],

            sectionExpectedOutcome:
              "The reader knows whether credit monitoring affects a credit score.",
          })
        ).toBe(
          true
        );
      }
    );


    it(
      "routes VERIFIED-but-misaligned required claims into the existing recovery candidates",
      () => {
        expect(
          planner
        ).toContain(
          "REQUIRED_QUESTION_DIRECT_ANSWER_RECOVERY_V2"
        );

        expect(
          planner
        ).toContain(
          "directAnswerRepairClaimIdsV2"
        );

        expect(
          planner
        ).toContain(
          "finallyVerifiedClaimIds.delete"
        );

        expect(
          planner
        ).toContain(
          "requiredClaimRecoveryCandidatesV2"
        );
      }
    );


    it(
      "does not create another claim-replan loop",
      () => {
        expect(
          planner
        ).toContain(
          "MISSION_PRESERVING_REQUIRED_CLAIM_REPLAN_V1"
        );

        expect(
          planner
        ).not.toContain(
          "MISSION_PRESERVING_REQUIRED_CLAIM_REPLAN_V2"
        );
      }
    );


    it(
      "makes the existing replan explicitly direct-answer aware",
      () => {
        expect(
          planner
        ).toContain(
          "MANDATORY_QUESTION_DIRECT_ANSWER_REPLAN_V2"
        );

        expect(
          planner
        ).toContain(
          "MUST directly answer at least one assigned question"
        );
      }
    );


    it(
      "removes stale old claimEvidence before strict re-verification",
      () => {
        const marker =
          planner.indexOf(
            "REQUIRED_QUESTION_DIRECT_ANSWER_RECOVERY_V2"
          );

        const target =
          planner.indexOf(
            "const unresolvedRequiredClaimReplanTargets",
            marker
          );

        const revoke =
          planner.indexOf(
            "finallyVerifiedClaimIds.delete",
            marker
          );

        expect(
          marker
        ).toBeGreaterThan(
          -1
        );

        expect(
          revoke
        ).toBeGreaterThan(
          marker
        );

        expect(
          target
        ).toBeGreaterThan(
          revoke
        );
      }
    );
  }
);
