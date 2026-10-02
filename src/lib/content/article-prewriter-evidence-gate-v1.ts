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
