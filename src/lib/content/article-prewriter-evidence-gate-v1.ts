import type {
  ArticleExecutionPlanV1,
} from "./article-execution-plan-v1";


export interface ArticlePreWriterEvidenceInspectionV1 {
  readonly version:
    "ARTICLE_PREWRITER_EVIDENCE_GATE_V1";

  readonly ready:
    boolean;

  readonly writableSectionCount:
    number;

  readonly deferredRequiredSectionIds:
    readonly string[];
}


export class ArticlePreWriterEvidenceGateErrorV1
  extends Error {
  readonly code:
    string;

  readonly sectionIds:
    readonly string[];

  constructor(
    code:
      string,
    sectionIds:
      readonly string[] = []
  ) {
    super(
      sectionIds.length
        ? `${code}:${sectionIds.join(",")}`
        : code
    );

    this.name =
      "ArticlePreWriterEvidenceGateErrorV1";

    this.code =
      code;

    this.sectionIds =
      Object.freeze(
        [...sectionIds]
      );
  }
}


export function inspectArticlePreWriterEvidenceV1(
  plan:
    Readonly<ArticleExecutionPlanV1>
): Readonly<ArticlePreWriterEvidenceInspectionV1> {
  const mustTopics =
    new Set(
      plan.requiredTopics
        .filter(
          (item) =>
            item.priority ===
            "MUST"
        )
        .map(
          (item) =>
            item.id
        )
    );


  const mustQuestions =
    new Set(
      plan.requiredQuestions
        .filter(
          (item) =>
            item.priority ===
            "MUST"
        )
        .map(
          (item) =>
            item.id
        )
    );


  const deferredRequiredSectionIds =
    plan.sections
      .filter(
        (section) => {
          if (
            section.state !==
            "DEFERRED_NO_EVIDENCE"
          ) {
            return false;
          }

          return (
            section.requiredTopicIds.some(
              (id) =>
                mustTopics.has(
                  id
                )
            ) ||
            section.requiredQuestionIds.some(
              (id) =>
                mustQuestions.has(
                  id
                )
            )
          );
        }
      )
      .map(
        (section) =>
          section.id
      );


  const writableSectionCount =
    plan.sections.filter(
      (section) =>
        section.state ===
        "WRITABLE"
    ).length;


  return Object.freeze({
    version:
      "ARTICLE_PREWRITER_EVIDENCE_GATE_V1",

    ready:
      writableSectionCount >
        0 &&
      deferredRequiredSectionIds
        .length ===
        0,

    writableSectionCount,

    deferredRequiredSectionIds:
      Object.freeze(
        deferredRequiredSectionIds
      ),
  });
}


export function assertArticlePreWriterEvidenceReadyV1(
  plan:
    Readonly<ArticleExecutionPlanV1>
): void {
  const result =
    inspectArticlePreWriterEvidenceV1(
      plan
    );


  if (
    result.writableSectionCount ===
    0
  ) {
    throw new ArticlePreWriterEvidenceGateErrorV1(
      "ARTICLE_PREWRITER_NO_WRITABLE_SECTIONS"
    );
  }


  if (
    result
      .deferredRequiredSectionIds
      .length >
    0
  ) {
    throw new ArticlePreWriterEvidenceGateErrorV1(
      "ARTICLE_PREWRITER_REQUIRED_EVIDENCE_DEFERRED",
      result
        .deferredRequiredSectionIds
    );
  }
}

/*
 * ARTICLE_PREWRITER_REQUIRED_COVERAGE_V1
 *
 * Post-evidence contraction is allowed to shrink OPTIONAL scope.
 *
 * It is NOT allowed to leave a MUST topic/question without at least
 * one WRITABLE execution-plan owner and then spend Writer tokens.
 *
 * This is the same completeness invariant enforced at final
 * readiness, moved to the earliest safe production boundary:
 *
 * final evidence
 * -> ArticleExecutionPlan
 * -> PREWRITER
 * -> Writer
 */
export class ArticlePreWriterRequiredCoverageErrorV1
  extends Error {
  readonly code =
    "ARTICLE_PREWRITER_REQUIRED_COVERAGE_LOST" as const;

  readonly missingRequiredTopicIds:
    readonly string[];

  readonly missingRequiredQuestionIds:
    readonly string[];

  constructor(input: {
    missingRequiredTopicIds:
      readonly string[];

    missingRequiredQuestionIds:
      readonly string[];
  }) {
    const topicPart =
      input.missingRequiredTopicIds
        .join(",") ||
      "NONE";

    const questionPart =
      input.missingRequiredQuestionIds
        .join(",") ||
      "NONE";

    super(
      [
        "ARTICLE_PREWRITER_REQUIRED_COVERAGE_LOST",
        `TOPICS=${topicPart}`,
        `QUESTIONS=${questionPart}`,
      ].join(":")
    );

    this.name =
      "ArticlePreWriterRequiredCoverageErrorV1";

    this.missingRequiredTopicIds =
      Object.freeze([
        ...input.missingRequiredTopicIds,
      ]);

    this.missingRequiredQuestionIds =
      Object.freeze([
        ...input.missingRequiredQuestionIds,
      ]);
  }
}


export function inspectArticlePreWriterRequiredCoverageV1(
  plan: Readonly<{
    requiredTopics:
      readonly Readonly<{
        id: string;
        priority: string;
      }>[];

    requiredQuestions:
      readonly Readonly<{
        id: string;
        priority: string;
      }>[];

    sections:
      readonly Readonly<{
        state: string;

        requiredTopicIds:
          readonly string[];

        requiredQuestionIds:
          readonly string[];
      }>[];
  }>
) {
  const writableTopicIds =
    new Set<string>();

  const writableQuestionIds =
    new Set<string>();

  for (
    const section
    of plan.sections
  ) {
    if (
      section.state !==
      "WRITABLE"
    ) {
      continue;
    }

    for (
      const topicId
      of section.requiredTopicIds
    ) {
      writableTopicIds.add(
        topicId
      );
    }

    for (
      const questionId
      of section.requiredQuestionIds
    ) {
      writableQuestionIds.add(
        questionId
      );
    }
  }

  const missingRequiredTopicIds =
    plan.requiredTopics
      .filter(
        (requirement) =>
          requirement.priority ===
          "MUST"
      )
      .map(
        (requirement) =>
          requirement.id
      )
      .filter(
        (id) =>
          !writableTopicIds.has(
            id
          )
      );

  const missingRequiredQuestionIds =
    plan.requiredQuestions
      .filter(
        (requirement) =>
          requirement.priority ===
          "MUST"
      )
      .map(
        (requirement) =>
          requirement.id
      )
      .filter(
        (id) =>
          !writableQuestionIds.has(
            id
          )
      );

  return Object.freeze({
    ready:
      missingRequiredTopicIds
        .length ===
        0 &&
      missingRequiredQuestionIds
        .length ===
        0,

    missingRequiredTopicIds:
      Object.freeze(
        missingRequiredTopicIds
      ),

    missingRequiredQuestionIds:
      Object.freeze(
        missingRequiredQuestionIds
      ),
  });
}


export function assertArticlePreWriterRequiredCoverageV1(
  plan: Parameters<
    typeof inspectArticlePreWriterRequiredCoverageV1
  >[0]
): void {
  const inspection =
    inspectArticlePreWriterRequiredCoverageV1(
      plan
    );

  if (
    inspection.ready
  ) {
    return;
  }

  throw new ArticlePreWriterRequiredCoverageErrorV1({
    missingRequiredTopicIds:
      inspection
        .missingRequiredTopicIds,

    missingRequiredQuestionIds:
      inspection
        .missingRequiredQuestionIds,
  });
}


/*
 * ARTICLE_PREWRITER_ANSWER_SUPPORT_V2
 *
 * Separate invariant from REQUIRED_COVERAGE_V1.
 *
 * REQUIRED_COVERAGE_V1 owns:
 *   MUST requirement -> WRITABLE section owner
 *
 * ANSWER_SUPPORT_V2 owns:
 *   MUST question with a WRITABLE owner
 *   -> post-contraction required claim exists
 *   -> post-contraction verified evidence exists
 *
 * Missing WRITABLE ownership is deliberately ignored here because
 * REQUIRED_COVERAGE_V1 already owns that defect.
 */
export interface ArticlePreWriterAnswerSupportInspectionV2 {
  readonly version:
    "ARTICLE_PREWRITER_ANSWER_SUPPORT_V2";

  readonly ready:
    boolean;

  readonly unsupportedRequiredQuestionIds:
    readonly string[];
}


export class ArticlePreWriterAnswerSupportErrorV2
  extends Error {
  readonly code =
    "ARTICLE_PREWRITER_REQUIRED_ANSWER_SUPPORT_LOST" as const;

  readonly unsupportedRequiredQuestionIds:
    readonly string[];

  constructor(
    unsupportedRequiredQuestionIds:
      readonly string[]
  ) {
    super(
      [
        "ARTICLE_PREWRITER_REQUIRED_ANSWER_SUPPORT_LOST",
        `QUESTIONS=${
          unsupportedRequiredQuestionIds.join(",") ||
          "NONE"
        }`,
      ].join(":")
    );

    this.name =
      "ArticlePreWriterAnswerSupportErrorV2";

    this.unsupportedRequiredQuestionIds =
      Object.freeze([
        ...unsupportedRequiredQuestionIds,
      ]);
  }
}


export function inspectArticlePreWriterAnswerSupportV2(
  plan: Readonly<{
    requiredQuestions:
      readonly Readonly<{
        id: string;
        priority: string;
      }>[];

    sections:
      readonly Readonly<{
        state: string;

        requiredQuestionIds:
          readonly string[];

        requiredClaimIds:
          readonly string[];

        evidenceIds:
          readonly string[];
      }>[];
  }>
): ArticlePreWriterAnswerSupportInspectionV2 {
  const unsupportedRequiredQuestionIds =
    plan.requiredQuestions
      .filter(
        (requirement) =>
          requirement.priority ===
          "MUST"
      )
      .map(
        (requirement) =>
          requirement.id
      )
      .filter(
        (questionId) => {
          const writableOwners =
            plan.sections.filter(
              (section) =>
                section.state ===
                  "WRITABLE" &&
                section
                  .requiredQuestionIds
                  .includes(
                    questionId
                  )
            );

          /*
           * Ownership loss belongs to
           * REQUIRED_COVERAGE_V1.
           */
          if (
            writableOwners.length ===
            0
          ) {
            return false;
          }

          /*
           * At least one surviving owner must retain
           * both claim authority and verified evidence.
           *
           * This is intentionally a structural continuity
           * invariant. It does NOT claim that any arbitrary
           * claim semantically answers the question.
           *
           * Semantic directness remains validated by the
           * claim/critic layer.
           */
          return !writableOwners.some(
            (section) =>
              section
                .requiredClaimIds
                .length >
                0 &&
              section
                .evidenceIds
                .length >
                0
          );
        }
      );

  return Object.freeze({
    version:
      "ARTICLE_PREWRITER_ANSWER_SUPPORT_V2",

    ready:
      unsupportedRequiredQuestionIds
        .length ===
      0,

    unsupportedRequiredQuestionIds:
      Object.freeze(
        unsupportedRequiredQuestionIds
      ),
  });
}


export function assertArticlePreWriterAnswerSupportV2(
  plan: Parameters<
    typeof inspectArticlePreWriterAnswerSupportV2
  >[0]
): void {
  const inspection =
    inspectArticlePreWriterAnswerSupportV2(
      plan
    );

  if (
    inspection.ready
  ) {
    return;
  }

  throw new ArticlePreWriterAnswerSupportErrorV2(
    inspection
      .unsupportedRequiredQuestionIds
  );
}
