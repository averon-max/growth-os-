import {
  runWithContentProviderRequestContextV1,
  type ContentProviderRequestChargeV1,
} from "./content-provider-request-context-v1";

import {
  buildMasterArticleShellPrompt,
} from "./master-article-shell-prompt";

import {
  buildMasterArticleSemanticCriticPrompt,
} from "./master-article-semantic-critic-prompt";

import {
  buildMasterSectionSemanticVerificationPrompt,
} from "./master-section-semantic-prompt";

import {
  buildSerpReplayPairwisePrompt,
} from "./serp-replay-prompt";

import {
  buildMasterSectionPrompt,
} from "./master-section-prompt";

import {
  buildMasterSectionRepairPrompt,
} from "./master-section-repair-prompt";


export interface ContentRunBudgetLimitsV1 {
  readonly maxModelCalls:
    number;

  readonly maxEstimatedInputTokens:
    number;

  readonly maxRepairCalls:
    number;
}


export interface ContentRunBudgetSnapshotV1 {
  readonly version:
    "CONTENT_RUN_BUDGET_V1";

  readonly modelCalls:
    number;

  readonly estimatedInputTokens:
    number;

  readonly repairCalls:
    number;

  readonly limits:
    Readonly<ContentRunBudgetLimitsV1>;
}


export class ContentRunBudgetExceededErrorV1
  extends Error {
  constructor(
    readonly code:
      | "CONTENT_LLM_CALL_BUDGET_EXCEEDED"
      | "CONTENT_ESTIMATED_INPUT_TOKEN_BUDGET_EXCEEDED"
      | "CONTENT_REPAIR_BUDGET_EXCEEDED",
    readonly snapshot:
      Readonly<ContentRunBudgetSnapshotV1>
  ) {
    super(code);

    this.name =
      "ContentRunBudgetExceededErrorV1";
  }
}


/*
 * CONTENT_PROVIDER_PROMPT_ACCOUNTING_V1
 *
 * Budget the provider-visible prompt, not the size of the
 * deterministic orchestration object held in memory.
 *
 * Section generation and repair already project their large
 * immutable contracts into section-scoped prompts.
 *
 * Unknown methods remain conservatively estimated from args.
 */
function estimateRawArgsTokensV1(
  args:
    readonly unknown[]
): number {
  let chars =
    0;

  try {
    chars =
      JSON.stringify(
        args
      )?.length ??
      0;
  } catch {
    chars =
      String(
        args
      ).length;
  }

  return Math.ceil(
    chars /
    4
  );
}


export function estimateContentInputTokensForStageV1({
  stage,
  args,
}: {
  stage:
    string;

  args:
    readonly unknown[];
}): number {
  try {
    if (
      stage ===
      "generateSection"
    ) {
      const prompt =
        buildMasterSectionPrompt(
          args[0] as Parameters<
            typeof buildMasterSectionPrompt
          >[0]
        );

      return Math.ceil(
        prompt.length /
        4
      );
    }

    if (
      stage ===
      "repairSection"
    ) {
      const prompt =
        buildMasterSectionRepairPrompt(
          args[0] as Parameters<
            typeof buildMasterSectionRepairPrompt
          >[0]
        );

      return Math.ceil(
        prompt.length /
        4
      );
    }
    /*
     * MASTER_WRITER_PROVIDER_PROMPT_ACCOUNTING_COMPLETE_V1
     *
     * These are the remaining provider-backed methods in the
     * current Master Writer / semantic verification / critic /
     * SERP replay pipeline.
     */

    if (
      stage ===
      "generateArticleShell"
    ) {
      const prompt =
        buildMasterArticleShellPrompt(
          args[0] as Parameters<
            typeof buildMasterArticleShellPrompt
          >[0]
        );

      return Math.ceil(
        prompt.length /
        4
      );
    }

    if (
      stage ===
      "verifySectionClaims"
    ) {
      const prompt =
        buildMasterSectionSemanticVerificationPrompt(
          args[0] as Parameters<
            typeof buildMasterSectionSemanticVerificationPrompt
          >[0]
        );

      return Math.ceil(
        prompt.length /
        4
      );
    }

    if (
      stage ===
      "reviewMasterArticleSemantics"
    ) {
      const prompt =
        buildMasterArticleSemanticCriticPrompt(
          args[0] as Parameters<
            typeof buildMasterArticleSemanticCriticPrompt
          >[0]
        );

      return Math.ceil(
        prompt.length /
        4
      );
    }

    if (
      stage ===
      "compareSerpReplayPair"
    ) {
      const prompt =
        buildSerpReplayPairwisePrompt(
          args[0] as Parameters<
            typeof buildSerpReplayPairwisePrompt
          >[0]
        );

      return Math.ceil(
        prompt.length /
        4
      );
    }

  } catch {
    /*
     * Fail conservatively if a prompt cannot be projected.
     */
  }

  return estimateRawArgsTokensV1(
    args
  );
}


function freezeSnapshot({
  modelCalls,
  estimatedInputTokens,
  repairCalls,
  limits,
}: {
  modelCalls:
    number;

  estimatedInputTokens:
    number;

  repairCalls:
    number;

  limits:
    Readonly<ContentRunBudgetLimitsV1>;
}): Readonly<ContentRunBudgetSnapshotV1> {
  return Object.freeze({
    version:
      "CONTENT_RUN_BUDGET_V1",

    modelCalls,

    estimatedInputTokens,

    repairCalls,

    limits,
  });
}


export function createContentRunBudgetV1(
  limits:
    Readonly<ContentRunBudgetLimitsV1>
) {
  let modelCalls =
    0;

  let estimatedInputTokens =
    0;

  let repairCalls =
    0;


  let logicalCalls =
    0;

  function snapshot() {
    return freezeSnapshot({
      modelCalls,
      estimatedInputTokens,
      repairCalls,
      limits,
    });
  }

  function consume({
    stage,
    args,
  }: {
    stage:
      string;

    args:
      readonly unknown[];
  }): string {
    /*
     * CONTENT_LOGICAL_CALL_CONTEXT_V1
     *
     * A generator method is orchestration, not necessarily one
     * physical provider request.
     *
     * Do not charge modelCalls/tokens here.
     */
    logicalCalls +=
      1;

    /*
     * Preserve prompt projection as a diagnostic code path.
     * Hard budget accounting happens at transport boundary.
     */
    void estimateContentInputTokensForStageV1({
      stage,
      args,
    });


    /*
     * Repair attempts remain bounded by logical operation.
     */
    if (
      /repair/i.test(
        stage
      )
    ) {
      repairCalls +=
        1;
    }


    const current =
      snapshot();


    if (
      repairCalls >
      limits.maxRepairCalls
    ) {
      throw new ContentRunBudgetExceededErrorV1(
        "CONTENT_REPAIR_BUDGET_EXCEEDED",
        current
      );
    }


    return `${stage}:${logicalCalls}`;
  }


  function consumeProviderRequest(
    input:
      Readonly<ContentProviderRequestChargeV1>
  ): void {
    /*
     * CONTENT_PHYSICAL_PROVIDER_BUDGET_V1
     *
     * ONE outbound provider HTTP request = ONE model call.
     *
     * Retry, failover and semantic continuation therefore each
     * consume their real request cost independently.
     *
     * Preflight projected values first so a rejected request is
     * NOT counted as if it had actually been sent.
     */
    const projectedModelCalls =
      modelCalls +
      1;

    const projectedEstimatedInputTokens =
      estimatedInputTokens +
      input.estimatedInputTokens;


    const projected =
      freezeSnapshot({
        modelCalls:
          projectedModelCalls,

        estimatedInputTokens:
          projectedEstimatedInputTokens,

        repairCalls,

        limits,
      });


    if (
      projectedModelCalls >
      limits.maxModelCalls
    ) {
      throw new ContentRunBudgetExceededErrorV1(
        "CONTENT_LLM_CALL_BUDGET_EXCEEDED",
        projected
      );
    }


    if (
      projectedEstimatedInputTokens >
      limits.maxEstimatedInputTokens
    ) {
      throw new ContentRunBudgetExceededErrorV1(
        "CONTENT_ESTIMATED_INPUT_TOKEN_BUDGET_EXCEEDED",
        projected
      );
    }


    modelCalls =
      projectedModelCalls;

    estimatedInputTokens =
      projectedEstimatedInputTokens;
  }


  return Object.freeze({
    consume,
    consumeProviderRequest,
    snapshot,
  });
}


export function withContentRunBudgetV1<
  T extends object
>({
  generator,
  budget,
}: {
  generator:
    T;

  budget:
    ReturnType<
      typeof createContentRunBudgetV1
    >;
}): T {
  const functionCache =
    new Map<
      PropertyKey,
      unknown
    >();

  return new Proxy(
    generator,
    {
      get(
        target,
        property,
        receiver
      ) {
        const value =
          Reflect.get(
            target,
            property,
            receiver
          );

        if (
          typeof value !==
          "function"
        ) {
          return value;
        }

        if (
          functionCache.has(
            property
          )
        ) {
          return functionCache.get(
            property
          );
        }

        const wrapped =
          (
            ...args:
              unknown[]
          ) => {
            const stage =
              String(
                property
              );

            const logicalCallId =
              budget.consume({
                stage,
                args,
              });


            return runWithContentProviderRequestContextV1(
              {
                budget,
                stage,
                logicalCallId,
              },

              () =>
                value.apply(
                  target,
                  args
                )
            );
          };


        functionCache.set(
          property,
          wrapped
        );

        return wrapped;
      },
    }
  );
}


export const BRIEF_RESEARCH_BUDGET_V1 =
  Object.freeze({
    maxModelCalls:
      12,

    /*
     * Prevent one brief/research request from ballooning
     * into an enormous repeated-context session.
     */
    maxEstimatedInputTokens:
      20_000,

    maxRepairCalls:
      1,
  });


export const ARTICLE_GENERATION_BUDGET_V1 =
  Object.freeze({
    /*
     * ARTICLE_PHYSICAL_CALL_SAFETY_CEILING_V2
     *
     * This is a runaway-protection ceiling, not a generation target.
     * The production pipeline is independently bounded by stage
     * structure and repair limits. 64 allows the legitimate bounded
     * Master Writer + critics + pairwise SERP replay/repair path
     * without rejecting it merely because it requires >24 requests.
     */
    maxModelCalls:
      64,

    /*
     * ARTICLE_CUMULATIVE_INPUT_TOKEN_CAP_DISABLED_V1
     *
     * Physical request count and repair count remain bounded.
     * Provider/model per-request context limits remain authoritative.
     *
     * Do not reject a valid long article merely because cumulative
     * estimated input across independent requests exceeds 50k.
     */
    maxEstimatedInputTokens:
      Number.MAX_SAFE_INTEGER,

    maxRepairCalls:
      2,
  });
