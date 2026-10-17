import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  executeArticleRecoveryOrchestratorV1,
  shouldRunTier2ArticleRecoveryV1,
} from "./article-recovery-orchestrator-v1";

import {
  classifyRejectedRecoveryV1,
} from "./rejected-recovery-v1";


const DEPTH_REJECTED =
  "REJECTED_RECOVERY_V1|class=DEPTH_FAILURE|owner=DEPTH|action=REPAIR_OWNING_STAGE|autoRetry=0|message=SECTION_TARGETED_REPAIR_EXHAUSTED:DEPTH:120<180";


const SEMANTIC_REJECTED =
  "REJECTED_RECOVERY_V1|class=SEMANTIC_REQUIRED_FAILURE|owner=SEMANTIC|action=RETURN_TO_EVIDENCE_OR_RECONCILIATION|autoRetry=0|message=SECTION_TARGETED_REPAIR_EXHAUSTED:SEMANTIC";


const EVIDENCE_REJECTED =
  "REJECTED_RECOVERY_V1|class=EVIDENCE_FAILURE|owner=EVIDENCE|action=RETURN_TO_EVIDENCE|autoRetry=0|message=EVIDENCE_REQUIRED";


const BUDGET_REJECTED =
  "REJECTED_RECOVERY_V1|class=BUDGET_FAILURE|owner=BUDGET|action=INSPECT_TELEMETRY|autoRetry=0|message=CONTENT_REPAIR_BUDGET_EXCEEDED";


describe(
  "Article recovery final V1 boundary",
  () => {
    it(
      "returns immediately on successful production",
      async () => {
        const run =
          vi.fn()
            .mockResolvedValue({
              status:
                "IN_REVIEW",

              publishError:
                null,
            });


        const result =
          await executeArticleRecoveryOrchestratorV1({
            run,
          });


        expect(
          run
        ).toHaveBeenCalledTimes(
          1
        );


        expect(
          result.attempts
        ).toBe(
          1
        );


        expect(
          result.recoveryAttempted
        ).toBe(
          false
        );
      }
    );


    it(
      "preserves depth classification for telemetry",
      () => {
        const recovery =
          classifyRejectedRecoveryV1(
            new Error(
              "SECTION_TARGETED_REPAIR_EXHAUSTED:DEPTH:120<180"
            )
          );


        expect(
          recovery.failureClass
        ).toBe(
          "DEPTH_FAILURE"
        );


        expect(
          recovery.owner
        ).toBe(
          "DEPTH"
        );


        expect(
          recovery.nextAction
        ).toBe(
          "REPAIR_OWNING_STAGE"
        );
      }
    );


    it(
      "does not restart the whole article after exhausted depth work",
      async () => {
        const run =
          vi.fn()
            .mockResolvedValue({
              status:
                "REJECTED",

              publishError:
                DEPTH_REJECTED,
            });


        const result =
          await executeArticleRecoveryOrchestratorV1({
            run,
          });


        expect(
          run
        ).toHaveBeenCalledTimes(
          1
        );


        expect(
          result.attempts
        ).toBe(
          1
        );


        expect(
          result.recoveryAttempted
        ).toBe(
          false
        );
      }
    );


    it(
      "does not restart the whole article after exhausted semantic work",
      async () => {
        const run =
          vi.fn()
            .mockResolvedValue({
              status:
                "REJECTED",

              publishError:
                SEMANTIC_REJECTED,
            });


        const result =
          await executeArticleRecoveryOrchestratorV1({
            run,
          });


        expect(
          run
        ).toHaveBeenCalledTimes(
          1
        );


        expect(
          result.recoveryAttempted
        ).toBe(
          false
        );
      }
    );


    it(
      "does not restart the whole article after exhausted evidence work",
      async () => {
        const run =
          vi.fn()
            .mockResolvedValue({
              status:
                "REJECTED",

              publishError:
                EVIDENCE_REJECTED,
            });


        const result =
          await executeArticleRecoveryOrchestratorV1({
            run,
          });


        expect(
          run
        ).toHaveBeenCalledTimes(
          1
        );


        expect(
          result.recoveryAttempted
        ).toBe(
          false
        );
      }
    );


    it(
      "does not restart the whole article on budget failure",
      async () => {
        const run =
          vi.fn()
            .mockResolvedValue({
              status:
                "REJECTED",

              publishError:
                BUDGET_REJECTED,
            });


        const result =
          await executeArticleRecoveryOrchestratorV1({
            run,
          });


        expect(
          run
        ).toHaveBeenCalledTimes(
          1
        );


        expect(
          result.recoveryAttempted
        ).toBe(
          false
        );
      }
    );


    it(
      "preserves persisted semantic ownership without restarting the whole article",
      async () => {
        const original = classifyRejectedRecoveryV1(SEMANTIC_REJECTED);
        expect(original.failureClass).toBe("SEMANTIC_REQUIRED_FAILURE");
        expect(original.owner).toBe("SEMANTIC");
        expect(shouldRunTier2ArticleRecoveryV1(original)).toBe(false);

        const run = vi.fn().mockResolvedValue({
          status: "REJECTED",
          publishError: SEMANTIC_REJECTED,
        });
        const result = await executeArticleRecoveryOrchestratorV1({run});
        expect(run).toHaveBeenCalledTimes(1);
        expect(result.attempts).toBe(1);
        expect(result.recoveryAttempted).toBe(false);
        expect(result.article.publishError).toBe(SEMANTIC_REJECTED);
      }
    );

    it(
      "keeps automatic whole-article quality recovery disabled",
      () => {
        const cases = [
          new Error(
            "SECTION_TARGETED_REPAIR_EXHAUSTED:DEPTH:120<180"
          ),

          new Error(
            "SECTION_TARGETED_REPAIR_EXHAUSTED:SEMANTIC"
          ),

          new Error(
            "EVIDENCE_REQUIRED"
          ),

          new Error(
            "FINAL_READINESS_FAILED"
          ),
        ];


        for (
          const error
          of cases
        ) {
          expect(
            shouldRunTier2ArticleRecoveryV1(
              classifyRejectedRecoveryV1(
                error
              )
            )
          ).toBe(
            false
          );
        }
      }
    );
  }
);
