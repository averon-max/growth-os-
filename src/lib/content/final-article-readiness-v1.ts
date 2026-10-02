import type {
  ArticleExecutionPlanV1,
} from "./article-execution-plan-v1";

import type {
  ArticleLengthContractV1,
} from "./article-length-contract-v1";

import type {
  ArticleBodyHeadingStructureV1,
} from "./article-structure-stats-v1";


export type FinalArticleReadinessStatusV1 =
  | "PASS"
  | "WARN"
  | "FAIL";


export interface FinalArticleSectionResultV1 {
  readonly sectionId:
    string;

  readonly heading:
    string;
}


export interface FinalArticleReadinessInputV1 {
  readonly plan:
    ArticleExecutionPlanV1;

  readonly articleWordCount:
    number;

  readonly renderedSections:
    readonly FinalArticleSectionResultV1[];

  readonly resolvedTopicIds:
    readonly string[];

  readonly resolvedQuestionIds:
    readonly string[];

  readonly resolvedEntityIds:
    readonly string[];

  readonly preservedEvidenceIds:
    readonly string[];

  readonly materialClaimsSupported:
    boolean;

  readonly riskPolicyCompliance:
    boolean;

  readonly intentComplete:
    boolean;

  readonly originalValueCompliance:
    boolean;

  readonly duplicateHeadingCheck:
    boolean;

  readonly majorSemanticFindingCount:
    number;

  readonly publicationPolicyPass:
    boolean;

  readonly serpReplayStatus:
    | "PASS"
    | "WARN"
    | "INSUFFICIENT_DATA"
    | "FAIL";

  /*
   * Explicit article-type length contract.
   * Omitted => no length gate (legacy callers only).
   */
  readonly lengthContract?:
    Readonly<ArticleLengthContractV1>;

  /*
   * Canonical heading structure of the persisted body.
   * Omitted => no structure gate (legacy callers only).
   */
  readonly bodyStructure?:
    Readonly<ArticleBodyHeadingStructureV1>;
}


export interface FinalArticleReadinessResultV1 {
  readonly version:
    "FINAL_ARTICLE_READINESS_V1";

  readonly status:
    FinalArticleReadinessStatusV1;

  readonly blockers:
    readonly string[];

  readonly warnings:
    readonly string[];

  readonly diagnostics:
    Readonly<{
      wordCount:
        number;

      expectedWritableSections:
        number;

      renderedSections:
        number;

      requiredTopics:
        number;

      requiredQuestions:
        number;

      requiredEntities:
        number;
    }>;
}


function setOf(
  values:
    readonly string[]
): Set<string> {
  return new Set(
    values.map(
      (value) =>
        value.trim()
    )
  );
}


export function evaluateFinalArticleReadinessV1(
  input:
    FinalArticleReadinessInputV1
): FinalArticleReadinessResultV1 {
  const blockers:
    string[] =
      [];

  const warnings:
    string[] =
      [];


  const writableSections =
    input.plan.sections.filter(
      (section) =>
        section.state ===
        "WRITABLE"
    );


  const renderedSectionIds =
    input.renderedSections.map(
      (section) =>
        section.sectionId
          .trim()
    );


  const renderedSectionSet =
    new Set(
      renderedSectionIds
    );


  if (
    renderedSectionSet.size !==
    renderedSectionIds.length
  ) {
    blockers.push(
      "FINAL_READINESS_DUPLICATE_SECTION_ID"
    );
  }


  for (
    const section
    of writableSections
  ) {
    if (
      !renderedSectionSet.has(
        section.id
      )
    ) {
      blockers.push(
        `WRITER_SECTION_LOSS:${section.id}`
      );
    }
  }


  const resolvedTopics =
    setOf(
      input.resolvedTopicIds
    );

  const resolvedQuestions =
    setOf(
      input.resolvedQuestionIds
    );

  const resolvedEntities =
    setOf(
      input.resolvedEntityIds
    );


  for (
    const requirement
    of input.plan.requiredTopics
  ) {
    if (
      requirement.priority ===
        "MUST" &&
      !resolvedTopics.has(
        requirement.id
      )
    ) {
      blockers.push(
        `FINAL_READINESS_REQUIRED_TOPIC_MISSING:${requirement.id}`
      );
    }
  }


  for (
    const requirement
    of input.plan.requiredQuestions
  ) {
    if (
      requirement.priority ===
        "MUST" &&
      !resolvedQuestions.has(
        requirement.id
      )
    ) {
      blockers.push(
        `FINAL_READINESS_REQUIRED_QUESTION_MISSING:${requirement.id}`
      );
    }
  }


  for (
    const requirement
    of input.plan.requiredEntities
  ) {
    if (
      requirement.priority ===
        "MUST" &&
      !resolvedEntities.has(
        requirement.id
      )
    ) {
      blockers.push(
        `FINAL_READINESS_REQUIRED_ENTITY_MISSING:${requirement.id}`
      );
    }
  }


  const preservedEvidence =
    setOf(
      input.preservedEvidenceIds
    );


  const expectedEvidence =
    new Set(
      writableSections.flatMap(
        (section) =>
          section.evidenceIds
      )
    );


  for (
    const evidenceId
    of expectedEvidence
  ) {
    if (
      !preservedEvidence.has(
        evidenceId
      )
    ) {
      blockers.push(
        `ARTICLE_EXECUTION_PLAN_EVIDENCE_LOSS:${evidenceId}`
      );
    }
  }


  if (
    !input.materialClaimsSupported
  ) {
    blockers.push(
      "FINAL_READINESS_MATERIAL_CLAIM_SUPPORT_FAILED"
    );
  }


  if (
    !input.riskPolicyCompliance
  ) {
    blockers.push(
      "FINAL_READINESS_RISK_POLICY_FAILED"
    );
  }


  if (
    !input.intentComplete
  ) {
    blockers.push(
      "FINAL_READINESS_INTENT_INCOMPLETE"
    );
  }


  if (
    !input.originalValueCompliance
  ) {
    blockers.push(
      "FINAL_READINESS_ORIGINAL_VALUE_FAILED"
    );
  }


  if (
    !input.duplicateHeadingCheck
  ) {
    blockers.push(
      "FINAL_READINESS_DUPLICATE_HEADING"
    );
  }


  if (
    input.majorSemanticFindingCount >
    0
  ) {
    blockers.push(
      `FINAL_READINESS_MAJOR_SEMANTIC_FINDINGS:${input.majorSemanticFindingCount}`
    );
  }


  if (
    !input.publicationPolicyPass
  ) {
    blockers.push(
      "FINAL_READINESS_PUBLICATION_POLICY_FAILED"
    );
  }


  if (
    input.serpReplayStatus ===
    "FAIL"
  ) {
    blockers.push(
      "FINAL_READINESS_SERP_REPLAY_FAILED"
    );
  }


  if (
    input.serpReplayStatus ===
    "WARN"
  ) {
    warnings.push(
      "FINAL_READINESS_SERP_REPLAY_WARNING"
    );
  }


  if (
    input.serpReplayStatus ===
    "INSUFFICIENT_DATA"
  ) {
    warnings.push(
      "SERP_REPLAY_INSUFFICIENT_COMPETITOR_DATA"
    );
  }


  /*
   * ARTICLE_LENGTH_AND_STRUCTURE_HARD_GATES_V1
   *
   * Replaces ARTICLE_WORD_COUNT_IS_DIAGNOSTIC_ONLY_V1.
   *
   * Length is NOT a keyword/ranking trick. For an explicitly
   * classified article type the product contract defines the
   * required range, and that range must come from FULL coverage
   * of the approved sections/topics/questions/evidence.
   *
   * keyword exact-phrase counts remain diagnostics elsewhere.
   */
  const lengthRange =
    input.lengthContract
      ?.targetWords ??
    null;

  if (lengthRange) {
    if (
      input.articleWordCount <
      lengthRange.min
    ) {
      blockers.push(
        `FINAL_READINESS_LENGTH_DEFICIT:${input.articleWordCount}<${lengthRange.min}`
      );
    } else if (
      input.articleWordCount >
      lengthRange.max
    ) {
      blockers.push(
        `FINAL_READINESS_LENGTH_EXCESS:${input.articleWordCount}>${lengthRange.max}`
      );
    }
  }

  const structure =
    input.bodyStructure;

  if (structure) {
    if (
      structure.bodyH1Count >
      0
    ) {
      blockers.push(
        `FINAL_READINESS_BODY_H1_PRESENT:${structure.bodyH1Count}`
      );
    }

    const plannedH2 =
      writableSections.filter(
        (section) =>
          section.level ===
          2
      ).length;

    const plannedH3 =
      writableSections.filter(
        (section) =>
          section.level ===
          3
      ).length;

    /*
     * planned sections != generated sections => FAIL
     */
    if (
      structure.h2Count <
      plannedH2
    ) {
      blockers.push(
        `FINAL_READINESS_H2_BELOW_PLAN:${structure.h2Count}<${plannedH2}`
      );
    }

    if (
      structure.h3Count <
      plannedH3
    ) {
      blockers.push(
        `FINAL_READINESS_H3_BELOW_PLAN:${structure.h3Count}<${plannedH3}`
      );
    }

    for (
      const heading
      of structure.duplicateHeadings
    ) {
      blockers.push(
        `FINAL_READINESS_DUPLICATE_NORMALIZED_HEADING:${heading}`
      );
    }
  }
  const status:
    FinalArticleReadinessStatusV1 =
      blockers.length >
      0
        ? "FAIL"
        : warnings.length >
            0
          ? "WARN"
          : "PASS";


  return Object.freeze({
    version:
      "FINAL_ARTICLE_READINESS_V1",

    status,

    blockers:
      Object.freeze([
        ...blockers,
      ]),

    warnings:
      Object.freeze([
        ...warnings,
      ]),

    diagnostics:
      Object.freeze({
        wordCount:
          input.articleWordCount,

        expectedWritableSections:
          writableSections.length,

        renderedSections:
          input
            .renderedSections
            .length,

        requiredTopics:
          input.plan
            .requiredTopics
            .length,

        requiredQuestions:
          input.plan
            .requiredQuestions
            .length,

        requiredEntities:
          input.plan
            .requiredEntities
            .length,
      }),
  });
}
