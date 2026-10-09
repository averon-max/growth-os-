import {
  classifySearchIntent,
} from "./seo-strategy";


export interface StagePlanQualityQueryV1 {
  readonly query:
    string;

  readonly intent:
    string;
}


export interface StagePlanQualitySectionV1 {
  readonly heading:
    string;

  readonly mission:
    string;

  readonly expectedOutcome:
    string;

  readonly topics?:
    readonly string[];

  readonly questions?:
    readonly string[];
}


const STOP_WORDS =
  new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "the",
    "to",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "with",
    "you",
    "your",
  ]);


function normalizeQualityTextV1(
  value:
    string
): string {
  return value
    .trim()
    .toLowerCase()
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^\p{L}\p{N}]+/gu,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


function qualityTokensV1(
  value:
    string
): Set<string> {
  return new Set(
    normalizeQualityTextV1(
      value
    )
      .split(
        " "
      )
      .filter(
        (
          token
        ) =>
          token &&
          !STOP_WORDS.has(
            token
          )
      )
  );
}


function lexicalOverlapV1(
  left:
    string,
  right:
    string
): number {
  const leftTokens =
    qualityTokensV1(
      left
    );

  const rightTokens =
    qualityTokensV1(
      right
    );


  if (
    leftTokens.size ===
      0 ||
    rightTokens.size ===
      0
  ) {
    return 0;
  }


  let intersection =
    0;


  for (
    const token
    of leftTokens
  ) {
    if (
      rightTokens.has(
        token
      )
    ) {
      intersection +=
        1;
    }
  }


  const union =
    new Set([
      ...leftTokens,
      ...rightTokens,
    ]).size;


  return union > 0
    ? intersection /
        union
    : 0;
}


/*
 * STAGE_PLAN_SAME_INTENT_QUESTION_GATE_V2
 *
 * A model cannot authorize its own adjacent intent merely by
 * labelling it with the same page intent.
 *
 * Required question admission needs:
 *
 * 1. observed query identity;
 * 2. model-declared intent agreement;
 * 3. deterministic existing SEO intent classification agreement.
 *
 * Cross-intent demand remains research evidence but does not
 * become mandatory article coverage.
 */
export function inspectStagePlanQuestionIntentBoundaryV1({
  pageIntent,
  queries,
  questions,
}: {
  pageIntent:
    string;

  queries:
    readonly StagePlanQualityQueryV1[];

  questions:
    readonly string[];
}): string[] {
  const issues:
    string[] =
      [];


  const normalizedPageIntent =
    pageIntent
      .trim()
      .toUpperCase();


  const intentsByQuery =
    new Map<
      string,
      Set<string>
    >();


  for (
    const query
    of queries
  ) {
    const identity =
      normalizeQualityTextV1(
        query.query
      );

    const intent =
      query.intent
        .trim()
        .toUpperCase();


    if (
      !identity ||
      !intent
    ) {
      continue;
    }


    const intents =
      intentsByQuery.get(
        identity
      ) ??
      new Set<string>();


    intents.add(
      intent
    );


    intentsByQuery.set(
      identity,
      intents
    );
  }


  for (
    const rawQuestion
    of questions
  ) {
    const question =
      rawQuestion.trim();


    if (!question) {
      continue;
    }


    const identity =
      normalizeQualityTextV1(
        question
      );


    const observedIntents =
      intentsByQuery.get(
        identity
      );


    if (
      !observedIntents ||
      observedIntents.size ===
        0
    ) {
      issues.push(
        `questions[].unobserved:${question}`
      );

      continue;
    }


    if (
      !observedIntents.has(
        normalizedPageIntent
      )
    ) {
      issues.push(
        [
          "questions[].cross-intent",
          question,
          [
            ...observedIntents,
          ]
            .sort()
            .join(
              "+"
            ),
          normalizedPageIntent,
        ].join(
          ":"
        )
      );

      continue;
    }


    /*
     * Existing deterministic classifier protects against model
     * self-report, e.g. model incorrectly calling "best X"
     * informational.
     *
     * LOCAL is excluded because the existing classifier does not
     * own LOCAL semantics.
     */
    if (
      normalizedPageIntent !==
      "LOCAL"
    ) {
      const deterministicIntent =
        classifySearchIntent(
          question
        )
          .trim()
          .toUpperCase();


      if (
        deterministicIntent !==
        normalizedPageIntent
      ) {
        issues.push(
          [
            "questions[].deterministic-cross-intent",
            question,
            deterministicIntent,
            normalizedPageIntent,
          ].join(
            ":"
          )
        );
      }
    }
  }


  return issues;
}


/*
 * DISTINCT_INFORMATION_JOBS_V1
 *
 * Deterministic and conservative.
 *
 * Reject obvious duplicated planning jobs, not merely related
 * sections.
 */
export function inspectStagePlanDistinctInformationJobsV1({
  sections,
}: {
  sections:
    readonly StagePlanQualitySectionV1[];
}): string[] {
  const issues:
    string[] =
      [];


  for (
    let leftIndex =
      0;
    leftIndex <
      sections.length;
    leftIndex++
  ) {
    const left =
      sections[
        leftIndex
      ];


    if (!left) {
      continue;
    }


    const leftHeading =
      normalizeQualityTextV1(
        left.heading
      );

    const leftMission =
      normalizeQualityTextV1(
        left.mission
      );


    const leftCoverage =
      [
        ...new Set(
          [
            ...(
              left.topics ??
              []
            ),
            ...(
              left.questions ??
              []
            ),
          ]
            .map(
              normalizeQualityTextV1
            )
            .filter(
              Boolean
            )
        ),
      ]
        .sort()
        .join(
          "|"
        );


    const leftSemantic =
      [
        left.heading,
        left.mission,
        left.expectedOutcome,
        ...(
          left.topics ??
          []
        ),
        ...(
          left.questions ??
          []
        ),
      ].join(
        " "
      );


    for (
      let rightIndex =
        leftIndex +
        1;
      rightIndex <
        sections.length;
      rightIndex++
    ) {
      const right =
        sections[
          rightIndex
        ];


      if (!right) {
        continue;
      }


      const rightHeading =
        normalizeQualityTextV1(
          right.heading
        );

      const rightMission =
        normalizeQualityTextV1(
          right.mission
        );


      const rightCoverage =
        [
          ...new Set(
            [
              ...(
                right.topics ??
                []
              ),
              ...(
                right.questions ??
                []
              ),
            ]
              .map(
                normalizeQualityTextV1
              )
              .filter(
                Boolean
              )
          ),
        ]
          .sort()
          .join(
            "|"
          );


      const rightSemantic =
        [
          right.heading,
          right.mission,
          right.expectedOutcome,
          ...(
            right.topics ??
            []
          ),
          ...(
            right.questions ??
            []
          ),
        ].join(
          " "
        );


      if (
        leftHeading &&
        leftHeading ===
          rightHeading
      ) {
        issues.push(
          `sections[].duplicate-heading:${leftIndex}:${rightIndex}`
        );

        continue;
      }


      if (
        leftMission &&
        leftMission ===
          rightMission
      ) {
        issues.push(
          `sections[].duplicate-information-job:${leftIndex}:${rightIndex}`
        );

        continue;
      }


      if (
        leftCoverage &&
        leftCoverage ===
          rightCoverage
      ) {
        issues.push(
          `sections[].duplicate-coverage-job:${leftIndex}:${rightIndex}`
        );

        continue;
      }


      if (
        lexicalOverlapV1(
          leftSemantic,
          rightSemantic
        ) >=
        0.92
      ) {
        issues.push(
          `sections[].near-duplicate-information-job:${leftIndex}:${rightIndex}`
        );
      }
    }
  }


  return issues;
}
