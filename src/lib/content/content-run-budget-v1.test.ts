import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ContentRunBudgetExceededErrorV1,
  createContentRunBudgetV1,
  withContentRunBudgetV1,
} from "./content-run-budget-v1";


function providerRequest({
  stage = "generateSection",
  logicalCallId = "generateSection:1",
  provider = "openai" as const,
  model = "test-model",
  attempt = 1,
  retry = false,
  continuation = false,
  failover = false,
  promptChars = 400,
  estimatedInputTokens = 100,
} = {}) {
  return {
    stage,
    logicalCallId,
    provider,
    model,
    attempt,
    retry,
    continuation,
    failover,
    promptChars,
    estimatedInputTokens,
  };
}


describe(
  "ContentRunBudgetV1 — physical provider request accounting",
  () => {
    it(
      "does not count logical generator calls as model calls or input tokens",
      () => {
        const budget =
          createContentRunBudgetV1({
            maxModelCalls:
              1,

            maxEstimatedInputTokens:
              1,

            maxRepairCalls:
              10,
          });


        const generator =
          withContentRunBudgetV1({
            generator: {
              generate(
                value:
                  string
              ) {
                return value;
              },
            },

            budget,
          });


        expect(
          generator.generate(
            "one"
          )
        ).toBe(
          "one"
        );


        expect(
          generator.generate(
            "two"
          )
        ).toBe(
          "two"
        );


        expect(
          budget.snapshot()
        ).toMatchObject({
          modelCalls:
            0,

          estimatedInputTokens:
            0,

          repairCalls:
            0,
        });
      }
    );


    it(
      "counts one physical provider request exactly once",
      () => {
        const budget =
          createContentRunBudgetV1({
            maxModelCalls:
              10,

            maxEstimatedInputTokens:
              1000,

            maxRepairCalls:
              10,
          });


        budget.consumeProviderRequest(
          providerRequest({
            estimatedInputTokens:
              123,

            promptChars:
              492,
          })
        );


        expect(
          budget.snapshot()
        ).toMatchObject({
          modelCalls:
            1,

          estimatedInputTokens:
            123,

          repairCalls:
            0,
        });
      }
    );


    it(
      "blocks the next physical request before mutating the accepted budget snapshot",
      () => {
        const budget =
          createContentRunBudgetV1({
            maxModelCalls:
              1,

            maxEstimatedInputTokens:
              10000,

            maxRepairCalls:
              10,
          });


        budget.consumeProviderRequest(
          providerRequest()
        );


        let thrown:
          unknown;


        try {
          budget.consumeProviderRequest(
            providerRequest({
              logicalCallId:
                "generateSection:2",
            })
          );
        } catch (
          error
        ) {
          thrown =
            error;
        }


        expect(
          thrown
        ).toBeInstanceOf(
          ContentRunBudgetExceededErrorV1
        );


        expect(
          (
            thrown as
              ContentRunBudgetExceededErrorV1
          ).code
        ).toBe(
          "CONTENT_LLM_CALL_BUDGET_EXCEEDED"
        );


        /*
         * Error snapshot shows the projected request that was refused.
         */
        expect(
          (
            thrown as
              ContentRunBudgetExceededErrorV1
          ).snapshot.modelCalls
        ).toBe(
          2
        );


        /*
         * Live budget only contains the request that was actually allowed.
         */
        expect(
          budget.snapshot()
            .modelCalls
        ).toBe(
          1
        );
      }
    );


    it(
      "blocks an oversized physical prompt before charging it",
      () => {
        const budget =
          createContentRunBudgetV1({
            maxModelCalls:
              10,

            maxEstimatedInputTokens:
              100,

            maxRepairCalls:
              10,
          });


        expect(
          () =>
            budget.consumeProviderRequest(
              providerRequest({
                estimatedInputTokens:
                  101,

                promptChars:
                  404,
              })
            )
        ).toThrow(
          /CONTENT_ESTIMATED_INPUT_TOKEN_BUDGET_EXCEEDED/
        );


        expect(
          budget.snapshot()
        ).toMatchObject({
          modelCalls:
            0,

          estimatedInputTokens:
            0,
        });
      }
    );


    it(
      "keeps repair attempts bounded at the logical operation layer",
      () => {
        const budget =
          createContentRunBudgetV1({
            maxModelCalls:
              10,

            maxEstimatedInputTokens:
              10000,

            maxRepairCalls:
              1,
          });


        const generator =
          withContentRunBudgetV1({
            generator: {
              repairSection() {
                return true;
              },
            },

            budget,
          });


        expect(
          generator
            .repairSection()
        ).toBe(
          true
        );


        expect(
          budget.snapshot()
            .repairCalls
        ).toBe(
          1
        );


        expect(
          () =>
            generator
              .repairSection()
        ).toThrow(
          /CONTENT_REPAIR_BUDGET_EXCEEDED/
        );


        expect(
          budget.snapshot()
            .modelCalls
        ).toBe(
          0
        );
      }
    );
  }
);
