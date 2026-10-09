export interface StagePlanQuestionContractionInputV1 {
  readonly questions:
    readonly string[];

  readonly sectionQuestions:
    readonly (
      readonly string[]
    )[];

  readonly issues:
    readonly string[];
}


export interface StagePlanQuestionContractionDropV1 {
  readonly question:
    string;

  readonly reasons:
    readonly string[];
}


export interface StagePlanQuestionContractionResultV1 {
  readonly questions:
    readonly string[];

  readonly sectionQuestions:
    readonly (
      readonly string[]
    )[];

  readonly dropped:
    readonly StagePlanQuestionContractionDropV1[];
}


function normalizedQuestionV1(
  value:
    string
): string {
  return value
    .trim()
    .replace(
      /\s+/g,
      " "
    );
}


function issueTargetsQuestionV1({
  issue,
  prefix,
  question,
}: {
  issue:
    string;

  prefix:
    string;

  question:
    string;
}): boolean {
  const target =
    `${prefix}${question}`;


  return (
    issue ===
      target ||
    issue.startsWith(
      `${target}:`
    )
  );
}


/*
 * STAGE_PLAN_LOCAL_REQUIRED_QUESTION_CONTRACTION_V1
 *
 * Required coverage is stricter than research evidence.
 *
 * A query can remain available to research while being removed
 * from mandatory article coverage when deterministic validation
 * proves that it:
 *
 * - was not observed;
 * - crosses the authoritative page intent deterministically; or
 * - was never owned by any section.
 *
 * We intentionally do NOT contract:
 *
 * - duplicate ownership;
 * - ordinary model-declared cross-intent disagreement.
 *
 * Those may represent a repairable planning mistake rather than
 * proof that the question itself does not belong.
 */
export function contractStagePlanRequiredQuestionsV1({
  questions,
  sectionQuestions,
  issues,
}: StagePlanQuestionContractionInputV1): StagePlanQuestionContractionResultV1 {
  const dropped:
    StagePlanQuestionContractionDropV1[] =
      [];


  const dropIdentities =
    new Set<string>();


  for (
    const rawQuestion
    of questions
  ) {
    const question =
      normalizedQuestionV1(
        rawQuestion
      );


    if (!question) {
      continue;
    }


    const reasons:
      string[] =
        [];


    for (
      const issue
      of issues
    ) {
      if (
        issueTargetsQuestionV1({
          issue,

          prefix:
            "questions[].unobserved:",

          question,
        })
      ) {
        reasons.push(
          "UNOBSERVED"
        );
      }


      if (
        issueTargetsQuestionV1({
          issue,

          prefix:
            "questions[].deterministic-cross-intent:",

          question,
        })
      ) {
        reasons.push(
          "DETERMINISTIC_CROSS_INTENT"
        );
      }


      if (
        issueTargetsQuestionV1({
          issue,

          prefix:
            "plan.questions unowned:",

          question,
        })
      ) {
        reasons.push(
          "UNOWNED"
        );
      }
    }


    if (
      reasons.length ===
      0
    ) {
      continue;
    }


    dropIdentities.add(
      question
    );


    dropped.push({
      question,

      reasons: [
        ...new Set(
          reasons
        ),
      ],
    });
  }


  const keptQuestions =
    questions
      .map(
        normalizedQuestionV1
      )
      .filter(
        (
          question
        ) =>
          question &&
          !dropIdentities.has(
            question
          )
      );


  const contractedSections =
    sectionQuestions.map(
      (
        ownedQuestions
      ) =>
        ownedQuestions
          .map(
            normalizedQuestionV1
          )
          .filter(
            (
              question
            ) =>
              question &&
              !dropIdentities.has(
                question
              )
          )
    );


  return {
    questions:
      keptQuestions,

    sectionQuestions:
      contractedSections,

    dropped,
  };
}
