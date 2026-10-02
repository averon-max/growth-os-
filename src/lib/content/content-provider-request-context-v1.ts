import {
  AsyncLocalStorage,
} from "node:async_hooks";


export type ContentProviderNameV1 =
  | "openai"
  | "gemini"
  | "groq";


export interface ContentProviderRequestChargeV1 {
  readonly stage:
    string;

  readonly logicalCallId:
    string;

  readonly provider:
    ContentProviderNameV1;

  readonly model:
    string;

  /*
   * One-based physical HTTP attempt.
   */
  readonly attempt:
    number;

  readonly retry:
    boolean;

  readonly continuation:
    boolean;

  readonly failover:
    boolean;

  readonly promptChars:
    number;

  readonly estimatedInputTokens:
    number;
}


export interface ContentProviderRequestBudgetSinkV1 {
  consumeProviderRequest(
    input:
      Readonly<ContentProviderRequestChargeV1>
  ): void;
}


interface LogicalProviderContextV1 {
  readonly budget:
    ContentProviderRequestBudgetSinkV1;

  readonly stage:
    string;

  readonly logicalCallId:
    string;
}


interface ProviderDispatchMetaV1 {
  readonly continuation:
    boolean;
}


const logicalContext =
  new AsyncLocalStorage<
    LogicalProviderContextV1
  >();


const dispatchContext =
  new AsyncLocalStorage<
    ProviderDispatchMetaV1
  >();


export function runWithContentProviderRequestContextV1<
  T
>({
  budget,
  stage,
  logicalCallId,
}: {
  readonly budget:
    ContentProviderRequestBudgetSinkV1;

  readonly stage:
    string;

  readonly logicalCallId:
    string;
}, fn: () => T): T {
  return logicalContext.run(
    {
      budget,
      stage,
      logicalCallId,
    },
    fn
  );
}


export function runWithContentProviderDispatchMetaV1<
  T
>(
  input:
    Readonly<
      Partial<ProviderDispatchMetaV1>
    >,
  fn:
    () => T
): T {
  const previous =
    dispatchContext
      .getStore();


  return dispatchContext.run(
    {
      continuation:
        input.continuation ??
        previous?.continuation ??
        false,
    },
    fn
  );
}


function configuredPrimaryProviderV1():
ContentProviderNameV1 | null {
  const value =
    process.env
      .CONTENT_AI_PROVIDER
      ?.trim()
      .toLowerCase();


  if (
    value ===
      "openai" ||
    value ===
      "gemini" ||
    value ===
      "groq"
  ) {
    return value;
  }


  return null;
}


export function recordContentProviderRequestV1({
  provider,
  model,
  attempt,
  prompt,
}: {
  readonly provider:
    ContentProviderNameV1;

  readonly model:
    string;

  readonly attempt:
    number;

  readonly prompt:
    string;
}): void {
  const logical =
    logicalContext
      .getStore();


  /*
   * Provider transport is also used by isolated tooling/tests.
   *
   * If no run budget is active, preserve existing behavior.
   */
  if (!logical) {
    return;
  }


  const dispatch =
    dispatchContext
      .getStore();


  const primaryProvider =
    configuredPrimaryProviderV1();


  const cleanAttempt =
    Math.max(
      1,
      Math.trunc(
        attempt
      )
    );


  const promptChars =
    prompt.length;


  const estimatedInputTokens =
    Math.ceil(
      promptChars /
      4
    );


  const charge:
    Readonly<ContentProviderRequestChargeV1> =
      Object.freeze({
        stage:
          logical.stage,

        logicalCallId:
          logical.logicalCallId,

        provider,

        model:
          model.trim() ||
          "unknown",

        attempt:
          cleanAttempt,

        retry:
          cleanAttempt >
          1,

        continuation:
          dispatch
            ?.continuation ??
          false,

        /*
         * This also correctly surfaces forced alternate-provider
         * recovery as a provider switch.
         */
        failover:
          primaryProvider !==
            null &&
          provider !==
            primaryProvider,

        promptChars,

        estimatedInputTokens,
      });


  /*
   * Charge BEFORE fetch.
   *
   * If the hard budget would be exceeded, no provider request
   * is sent.
   */
  logical
    .budget
    .consumeProviderRequest(
      charge
    );


  if (
    process.env
      .CONTENT_PROVIDER_TELEMETRY !==
    "0"
  ) {
    console.info(
      "[content provider request]",
      charge
    );
  }
}
