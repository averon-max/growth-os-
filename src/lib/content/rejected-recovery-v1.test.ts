import {
  describe,
  expect,
  it,
} from "vitest";

import {
  classifyRejectedRecoveryV1,
  formatRejectedRecoveryForPersistenceV1,
} from "./rejected-recovery-v1";


describe(
  "Rejected Recovery V1",
  () => {
    it(
      "retries temporary provider infrastructure only",
      () => {
        expect(
          classifyRejectedRecoveryV1(
            new Error(
              "OpenAI API error 503: unavailable"
            )
          )
        ).toMatchObject({
          failureClass:
            "INFRA_FAILURE",

          owner:
            "TRANSPORT",

          nextAction:
            "RETRY_TRANSPORT",

          autoRetryAllowed:
            true,
        });
      }
    );


    it(
      "does not blind retry provider 413",
      () => {
        expect(
          classifyRejectedRecoveryV1(
            new Error(
              "OpenAI API error 413: request too large"
            )
          )
        ).toMatchObject({
          failureClass:
            "BUDGET_FAILURE",

          nextAction:
            "INSPECT_TELEMETRY",

          autoRetryAllowed:
            false,
        });
      }
    );


    it(
      "classifies hard run budget separately",
      () => {
        expect(
          classifyRejectedRecoveryV1(
            new Error(
              "CONTENT_ESTIMATED_INPUT_TOKEN_BUDGET_EXCEEDED"
            )
          )
        ).toMatchObject({
          failureClass:
            "BUDGET_FAILURE",

          owner:
            "BUDGET",

          autoRetryAllowed:
            false,
        });
      }
    );


    it(
      "returns evidence failures to evidence",
      () => {
        expect(
          classifyRejectedRecoveryV1(
            new Error(
              "NO_WRITABLE_SECTIONS"
            )
          )
        ).toMatchObject({
          failureClass:
            "EVIDENCE_FAILURE",

          owner:
            "EVIDENCE",

          nextAction:
            "RETURN_TO_EVIDENCE",
        });
      }
    );


    it(
      "keeps reconciliation repair bounded",
      () => {
        expect(
          classifyRejectedRecoveryV1(
            new Error(
              "SECTION_TARGETED_REPAIR_EXHAUSTED:RECONCILIATION"
            )
          )
        ).toMatchObject({
          failureClass:
            "RECONCILIATION_FAILURE",

          nextAction:
            "ONE_TARGETED_SECTION_REPAIR",

          autoRetryAllowed:
            false,
        });
      }
    );


    it(
      "distinguishes deterministic semantic cleanup",
      () => {
        expect(
          classifyRejectedRecoveryV1(
            new Error(
              "SECTION_DETERMINISTIC_SEMANTIC_NO_PROGRESS"
            )
          )
        ).toMatchObject({
          failureClass:
            "SEMANTIC_OPTIONAL_FAILURE",

          nextAction:
            "ONE_DETERMINISTIC_CLEANUP",
        });
      }
    );


    it(
      "classifies surviving semantic block as required work",
      () => {
        expect(
          classifyRejectedRecoveryV1(
            new Error(
              "SECTION_TARGETED_REPAIR_EXHAUSTED:SEMANTIC:UNSUPPORTED"
            )
          )
        ).toMatchObject({
          failureClass:
            "SEMANTIC_REQUIRED_FAILURE",

          nextAction:
            "RETURN_TO_EVIDENCE_OR_RECONCILIATION",
        });
      }
    );


    it(
      "routes Final Readiness to its owning stage",
      () => {
        expect(
          classifyRejectedRecoveryV1(
            new Error(
              "FINAL_READINESS_MISSING_REQUIRED_TOPIC"
            )
          )
        ).toMatchObject({
          failureClass:
            "FINAL_READINESS_FAILURE",

          nextAction:
            "REPAIR_OWNING_STAGE",
        });
      }
    );


    it(
      "fails unknown errors closed to engineering",
      () => {
        expect(
          classifyRejectedRecoveryV1(
            new Error(
              "impossible internal contract state"
            )
          )
        ).toMatchObject({
          failureClass:
            "PROGRAMMING_CONTRACT_FAILURE",

          owner:
            "ENGINEERING",

          autoRetryAllowed:
            false,
        });
      }
    );


    it(
      "preserves semantic stage ownership after persistence round-trip",
      () => {
        const original = classifyRejectedRecoveryV1(
          new Error("SECTION_TARGETED_REPAIR_EXHAUSTED:SEMANTIC")
        );
        const persisted = formatRejectedRecoveryForPersistenceV1(original);
        // The action metadata contains RECONCILIATION but the actual
        // failure is SEMANTIC. Metadata must not hijack reclassification.
        expect(persisted).toContain(
          "action=RETURN_TO_EVIDENCE_OR_RECONCILIATION"
        );
        expect(classifyRejectedRecoveryV1(persisted)).toMatchObject({
          failureClass: "SEMANTIC_REQUIRED_FAILURE",
          owner: "SEMANTIC",
          nextAction: "RETURN_TO_EVIDENCE_OR_RECONCILIATION",
          autoRetryAllowed: false,
          message: "SECTION_TARGETED_REPAIR_EXHAUSTED:SEMANTIC",
        });
      }
    );

    it(
      "retains the real stage owner for all serialized recovery classes",
      () => {
        const errors = [
          "OpenAI API error 503: unavailable",
          "CONTENT_REPAIR_BUDGET_EXCEEDED",
          "SECTION_TARGETED_REPAIR_EXHAUSTED:DEPTH:100<180",
          "SECTION_TARGETED_REPAIR_EXHAUSTED:RECONCILIATION",
          "SECTION_DETERMINISTIC_SEMANTIC_NO_PROGRESS",
          "FINAL_READINESS_MISSING_REQUIRED_TOPIC",
          "EVIDENCE_REQUIRED",
          "INSUFFICIENT_SERP_DATA",
          "internal programming contract state",
        ];
        for (const error of errors) {
          const first = classifyRejectedRecoveryV1(error);
          const second = classifyRejectedRecoveryV1(
            formatRejectedRecoveryForPersistenceV1(first)
          );
          expect(second).toMatchObject({
            failureClass: first.failureClass,
            owner: first.owner,
            nextAction: first.nextAction,
            autoRetryAllowed: first.autoRetryAllowed,
          });
        }
      }
    );

    it(
      "routes known evidence and editorial blockers to the owning stage",
      () => {
        const evidenceMessages = [
          "SECTION_EDITORIAL_EVIDENCE_CAPACITY_INSUFFICIENT:section-2",
          "ARTICLE_PREWRITER_REQUIRED_EVIDENCE_DEFERRED",
          "ARTICLE_PREWRITER_REQUIRED_COVERAGE_LOST",
          "LIVE_STAGE_PLAN_INFORMATION_GAIN_UNRESOLVED",
        ];
        for (const message of evidenceMessages) {
          expect(classifyRejectedRecoveryV1(message)).toMatchObject({
            owner: "EVIDENCE",
            failureClass: "EVIDENCE_FAILURE",
            autoRetryAllowed: false,
          });
        }
        for (const message of [
          "ARTICLE_NEEDS_EDITORIAL_IMPROVEMENT",
          "COMPREHENSIVE_EDITORIAL_SUBSECTION_STRUCTURE_MISSING",
        ]) {
          expect(classifyRejectedRecoveryV1(message)).toMatchObject({
            owner: "FINAL_READINESS",
            failureClass: "FINAL_READINESS_FAILURE",
            autoRetryAllowed: false,
          });
        }
      }
    );

    it(
      "persists machine-readable recovery metadata",
      () => {
        const value =
          formatRejectedRecoveryForPersistenceV1(
            classifyRejectedRecoveryV1(
              new Error(
                "CONTENT_LLM_CALL_BUDGET_EXCEEDED"
              )
            )
          );


        expect(
          value
        ).toContain(
          "REJECTED_RECOVERY_V1"
        );

        expect(
          value
        ).toContain(
          "class=BUDGET_FAILURE"
        );

        expect(
          value
        ).toContain(
          "autoRetry=0"
        );
      }
    );
  }
);
