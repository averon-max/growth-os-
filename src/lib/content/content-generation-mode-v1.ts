export type ContentGenerationModeV1 =
  | "EXACT_KEYWORD"
  | "BEST_OPPORTUNITY";


export interface ContentGenerationPolicyV1 {
  readonly version:
    "CONTENT_GENERATION_POLICY_V1";

  readonly mode:
    ContentGenerationModeV1;

  readonly requestedTopic:
    string;

  readonly exactKeyword:
    string | null;
}


export class ContentGenerationPolicyErrorV1
  extends Error {
  constructor(
    readonly code: string,
    detail?: string
  ) {
    super(
      detail
        ? `${code}:${detail}`
        : code
    );

    this.name =
      "ContentGenerationPolicyErrorV1";
  }
}


function clean(
  value:
    unknown
): string | null {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const result =
    value.trim();

  return result ||
    null;
}


export function parseContentGenerationPolicyV1(
  value:
    unknown
): Readonly<ContentGenerationPolicyV1> {
  const source =
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
      ? value as
          Record<
            string,
            unknown
          >
      : {};

  const rawMode =
    clean(
      source.generationMode
    );

  /*
   * Preserve historical behavior unless the UI explicitly
   * requests automatic opportunity selection.
   */
  const mode:
    ContentGenerationModeV1 =
      rawMode ===
        "BEST_OPPORTUNITY"
        ? "BEST_OPPORTUNITY"
        : "EXACT_KEYWORD";

  if (
    rawMode &&
    rawMode !==
      "EXACT_KEYWORD" &&
    rawMode !==
      "BEST_OPPORTUNITY"
  ) {
    throw new ContentGenerationPolicyErrorV1(
      "CONTENT_GENERATION_MODE_INVALID",
      rawMode
    );
  }

  const topic =
    clean(
      source.topic
    );

  const exactKeyword =
    clean(
      source.exactKeyword
    );

  const requestedTopic =
    mode ===
      "EXACT_KEYWORD"
      ? exactKeyword ??
        topic
      : topic ??
        exactKeyword;

  if (!requestedTopic) {
    throw new ContentGenerationPolicyErrorV1(
      mode ===
        "EXACT_KEYWORD"
        ? "CONTENT_EXACT_KEYWORD_REQUIRED"
        : "CONTENT_SEED_TOPIC_REQUIRED"
    );
  }

  return Object.freeze({
    version:
      "CONTENT_GENERATION_POLICY_V1",

    mode,

    requestedTopic,

    exactKeyword:
      mode ===
        "EXACT_KEYWORD"
        ? exactKeyword ??
          requestedTopic
        : null,
  });
}


export function resolveGenerationTopicV1(
  policy:
    Readonly<ContentGenerationPolicyV1>
): string {
  /*
   * EXACT_KEYWORD:
   * the query supplied by the user is the production mission.
   *
   * BEST_OPPORTUNITY:
   * this is only a seed. Existing Keyword Intelligence is
   * responsible for resolving the winning production query.
   */
  return policy.requestedTopic;
}


export function normalizeQueryIdentityV1(
  value:
    string
): string {
  return value
    .trim()
    .toLocaleLowerCase(
      "en-US"
    )
    .replace(
      /\s+/g,
      " "
    );
}


export function assertExactKeywordDidNotDriftV1({
  policy,
  productionPrimary,
}: {
  policy:
    Readonly<ContentGenerationPolicyV1>;

  productionPrimary:
    string;
}): void {
  if (
    policy.mode !==
    "EXACT_KEYWORD"
  ) {
    return;
  }

  const expected =
    normalizeQueryIdentityV1(
      policy.exactKeyword ??
      policy.requestedTopic
    );

  const actual =
    normalizeQueryIdentityV1(
      productionPrimary
    );

  if (
    expected !==
    actual
  ) {
    throw new ContentGenerationPolicyErrorV1(
      "CONTENT_EXACT_KEYWORD_PRIMARY_DRIFT",
      `expected=${expected};actual=${actual}`
    );
  }
}


/*
 * BEST_OPPORTUNITY_PRODUCTION_WINNER_V1
 *
 * BEST_OPPORTUNITY does NOT introduce another keyword engine.
 *
 * finalPlan.strategy.primary is the result of the EXISTING
 * Content/Keyword Intelligence strategy.
 *
 * The generated production brief must use that winner.
 */
export function assertBestOpportunityWinnerAppliedV1({
  policy,
  strategyPrimary,
  productionPrimary,
}: {
  policy:
    Readonly<ContentGenerationPolicyV1>;

  strategyPrimary:
    string;

  productionPrimary:
    string;
}): void {
  if (
    policy.mode !==
    "BEST_OPPORTUNITY"
  ) {
    return;
  }

  const expected =
    normalizeQueryIdentityV1(
      strategyPrimary
    );

  const actual =
    normalizeQueryIdentityV1(
      productionPrimary
    );

  if (
    expected !==
    actual
  ) {
    throw new ContentGenerationPolicyErrorV1(
      "CONTENT_BEST_OPPORTUNITY_PRIMARY_DRIFT",
      `expected=${expected};actual=${actual}`
    );
  }
}
