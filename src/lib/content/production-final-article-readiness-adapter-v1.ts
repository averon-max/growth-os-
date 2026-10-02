import type {
  ArticleExecutionPlanV1,
} from "./article-execution-plan-v1";

import {
  countWords,
} from "./article-analyzer";

import {
  resolveArticleLengthContractV1,
} from "./article-length-contract-v1";

import {
  deriveBodyHeadingStructureV1,
} from "./article-structure-stats-v1";

import {
  evaluateFinalArticleReadinessV1,
  type FinalArticleReadinessResultV1,
} from "./final-article-readiness-v1";


type UnknownRecord =
  Record<
    string,
    unknown
  >;


function record(
  value:
    unknown
): UnknownRecord | null {
  return value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
      ? value as
          UnknownRecord
      : null;
}


function stringValue(
  value:
    unknown
): string | null {
  return typeof value ===
      "string" &&
    value.trim()
      ? value.trim()
      : null;
}


function stringArray(
  value:
    unknown
): string[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return [
    ...new Set(
      value
        .map(
          stringValue
        )
        .filter(
          (
            item
          ): item is string =>
            Boolean(
              item
            )
        )
    ),
  ];
}


function articleFromWriterRun(
  writerRun:
    unknown
): UnknownRecord | null {
  const run =
    record(
      writerRun
    );

  return record(
    run?.article
  );
}


function renderedSectionsFromWriterRun({
  plan,
  writerRun,
}: {
  plan:
    ArticleExecutionPlanV1;

  writerRun:
    unknown;
}): readonly {
  sectionId:
    string;

  heading:
    string;
}[] {
  const run =
    record(
      writerRun
    );

  const article =
    articleFromWriterRun(
      writerRun
    );

  const rawSections =
    Array.isArray(
      run?.sections
    )
      ? run.sections
      : Array.isArray(
          article?.sections
        )
        ? article.sections
        : [];

  const writableSections =
    plan.sections.filter(
      (section) =>
        section.state ===
        "WRITABLE"
    );

  return rawSections
    .map(
      (
        raw
      ) => {
        const section =
          record(
            raw
          );

        if (!section) {
          return null;
        }

        const heading =
          stringValue(
            section.heading
          );

        if (!heading) {
          return null;
        }

        const provenance =
          record(
            section.provenance
          );

        const rawSectionIndex =
          provenance
            ?.sectionIndex;

        const explicitSectionId =
          stringValue(
            section.sectionId
          );

        /*
         * FINAL_READINESS_SECTION_IDENTITY_BRIDGE_V1
         *
         * Master Writer emits deterministic sectionIndex.
         * ArticleExecutionPlan owns canonical section IDs.
         *
         * Never invent IDs from headings or lexical matching.
         */
        const planSection =
          typeof rawSectionIndex ===
            "number" &&
          Number.isInteger(
            rawSectionIndex
          ) &&
          rawSectionIndex >=
            0
            ? writableSections[
                rawSectionIndex
              ]
            : explicitSectionId
              ? writableSections.find(
                  (
                    candidate
                  ) =>
                    candidate.id ===
                    explicitSectionId
                )
              : undefined;

        if (!planSection) {
          return null;
        }

        return {
          sectionId:
            planSection.id,

          heading,
        };
      }
    )
    .filter(
      (
        section
      ): section is {
        sectionId:
          string;

        heading:
          string;
      } =>
        Boolean(
          section
        )
    );
}


function preservedEvidenceIdsFromWriterRun(
  writerRun:
    unknown
): readonly string[] {
  const article =
    articleFromWriterRun(
      writerRun
    );

  if (
    !article
  ) {
    return [];
  }

  const ids =
    new Set<string>(
      stringArray(
        article
          .referencedEvidenceIds
      )
    );

  if (
    Array.isArray(
      article.sections
    )
  ) {
    for (
      const raw
      of article.sections
    ) {
      const section =
        record(
          raw
        );

      for (
        const id
        of stringArray(
          section
            ?.referencedEvidenceIds
        )
      ) {
        ids.add(
          id
        );
      }

      /*
       * Some deterministic section outputs expose evidenceIds
       * directly instead of referencedEvidenceIds.
       */
      for (
        const id
        of stringArray(
          section
            ?.evidenceIds
        )
      ) {
        ids.add(
          id
        );
      }
    }
  }

  return [
    ...ids,
  ];
}


function finalCriticRoot(
  finalCritics:
    unknown
): unknown {
  const root =
    record(
      finalCritics
    );

  if (!root) {
    return null;
  }

  /*
   * FINAL_MASTER_CRITIC_AUTHORITY_BRIDGE_V1
   *
   * Production passes MasterArticleCriticExecutionV1 directly.
   * Its authoritative final findings live under suite.
   *
   * finalCritics/critics fallbacks preserve deterministic
   * compatibility with older fixtures only.
   */
  return root.suite ??
    root.finalCritics ??
    root.critics ??
    null;
}


function countBlockingFinalCriticFindings(
  finalCritics:
    unknown
): number {
  const root =
    finalCriticRoot(
      finalCritics
    );

  if (!root) {
    /*
     * Fail closed when production cannot prove that final
     * semantic/deterministic critics exist.
     */
    return 1;
  }

  const seen =
    new WeakSet<object>();

  let count =
    0;

  function visit(
    value:
      unknown
  ): void {
    if (
      !value ||
      typeof value !==
        "object"
    ) {
      return;
    }

    if (
      seen.has(
        value
      )
    ) {
      return;
    }

    seen.add(
      value
    );

    if (
      Array.isArray(
        value
      )
    ) {
      for (
        const item
        of value
      ) {
        visit(
          item
        );
      }

      return;
    }

    const item =
      value as
        UnknownRecord;

    const severity =
      stringValue(
        item.severity
      );

    if (
      severity ===
        "BLOCK" ||
      severity ===
        "MAJOR"
    ) {
      count +=
        1;
    }

    for (
      const child
      of Object.values(
        item
      )
    ) {
      visit(
        child
      );
    }
  }

  visit(
    root
  );

  return count;
}


function resolvedCoverageFromRenderedSections({
  plan,
  renderedSectionIds,
}: {
  plan:
    ArticleExecutionPlanV1;

  renderedSectionIds:
    ReadonlySet<string>;
}) {
  const topics =
    new Set<string>();

  const questions =
    new Set<string>();

  const entities =
    new Set<string>();

  for (
    const section
    of plan.sections
  ) {
    if (
      section.state !==
        "WRITABLE" ||
      !renderedSectionIds.has(
        section.id
      )
    ) {
      continue;
    }

    for (
      const id
      of section.requiredTopicIds
    ) {
      topics.add(
        id
      );
    }

    for (
      const id
      of section.requiredQuestionIds
    ) {
      questions.add(
        id
      );
    }

    for (
      const id
      of section.requiredEntityIds
    ) {
      entities.add(
        id
      );
    }
  }

  return {
    topics: [
      ...topics,
    ],

    questions: [
      ...questions,
    ],

    entities: [
      ...entities,
    ],
  };
}


function duplicateHeadingCheck(
  rendered:
    readonly {
      heading:
        string;
    }[]
): boolean {
  const normalized =
    rendered.map(
      (
        section
      ) =>
        section.heading
          .trim()
          .toLocaleLowerCase(
            "en-US"
          )
          .replace(
            /\s+/g,
            " "
          )
    );

  return (
    normalized.length >
      0 &&
    new Set(
      normalized
    ).size ===
      normalized.length
  );
}


function mapSerpReplayStatus({
  replay,
  warning,
}: {
  replay:
    unknown;

  warning:
    unknown;
}):
  | "PASS"
  | "WARN"
  | "INSUFFICIENT_DATA"
  | "FAIL" {
  const replayRecord =
    record(
      replay
    );

  const rawStatus =
    stringValue(
      replayRecord?.status
    );

  if (
    rawStatus ===
      "PASS" ||
    rawStatus ===
      "WARN" ||
    rawStatus ===
      "FAIL" ||
    rawStatus ===
      "INSUFFICIENT_DATA"
  ) {
    return rawStatus;
  }

  const warningText =
    stringValue(
      warning
    ) ??
    "";

  if (
    /insufficient|missing.+competitor|missing.+serp|no.+competitor/i.test(
      warningText
    )
  ) {
    return "INSUFFICIENT_DATA";
  }

  /*
   * Unknown replay state must never become an implicit PASS.
   */
  return replay
    ? "FAIL"
    : "INSUFFICIENT_DATA";
}


function allMustRequirementsResolved({
  plan,
  topicIds,
  questionIds,
  entityIds,
}: {
  plan:
    ArticleExecutionPlanV1;

  topicIds:
    readonly string[];

  questionIds:
    readonly string[];

  entityIds:
    readonly string[];
}): boolean {
  const topics =
    new Set(
      topicIds
    );

  const questions =
    new Set(
      questionIds
    );

  const entities =
    new Set(
      entityIds
    );

  return (
    plan.requiredTopics
      .filter(
        (
          requirement
        ) =>
          requirement.priority ===
          "MUST"
      )
      .every(
        (
          requirement
        ) =>
          topics.has(
            requirement.id
          )
      ) &&

    plan.requiredQuestions
      .filter(
        (
          requirement
        ) =>
          requirement.priority ===
          "MUST"
      )
      .every(
        (
          requirement
        ) =>
          questions.has(
            requirement.id
          )
      ) &&

    plan.requiredEntities
      .filter(
        (
          requirement
        ) =>
          requirement.priority ===
          "MUST"
      )
      .every(
        (
          requirement
        ) =>
          entities.has(
            requirement.id
          )
      )
  );
}


export function buildProductionFinalArticleReadinessV1({
  plan,
  writerRun,
  finalCritics,
  articleBodyMarkdown,
  contentGatePass,
  publicationPolicyPass,
  serpReplay,
  serpReplayWarning,
}: {
  plan:
    ArticleExecutionPlanV1;

  writerRun:
    unknown;

  finalCritics?:
    unknown;

  articleBodyMarkdown:
    string;

  contentGatePass:
    boolean;

  publicationPolicyPass:
    boolean;

  serpReplay:
    unknown;

  serpReplayWarning:
    unknown;
}): FinalArticleReadinessResultV1 {
  const renderedSections =
    renderedSectionsFromWriterRun({
      plan,
      writerRun,
    });

  const renderedIds =
    new Set(
      renderedSections.map(
        (
          section
        ) =>
          section.sectionId
      )
    );

  const coverage =
    resolvedCoverageFromRenderedSections({
      plan,
      renderedSectionIds:
        renderedIds,
    });

  const semanticBlockCount =
    countBlockingFinalCriticFindings(
      finalCritics ??
      writerRun
    );

  const mustCoverageComplete =
    allMustRequirementsResolved({
      plan,

      topicIds:
        coverage.topics,

      questionIds:
        coverage.questions,

      entityIds:
        coverage.entities,
    });

  const upstreamSafetyPass =
    contentGatePass &&
    publicationPolicyPass &&
    semanticBlockCount ===
      0;

  return evaluateFinalArticleReadinessV1({
    plan,

    articleWordCount:
      countWords(
        articleBodyMarkdown
      ),

    /*
     * ARTICLE_LENGTH_AND_STRUCTURE_INPUTS_V1
     *
     * Same canonical analyzer as the UI. No private parser.
     */
    lengthContract:
      resolveArticleLengthContractV1(
        plan
      ),

    bodyStructure:
      deriveBodyHeadingStructureV1(
        articleBodyMarkdown
      ),

    renderedSections,

    resolvedTopicIds:
      coverage.topics,

    resolvedQuestionIds:
      coverage.questions,

    resolvedEntityIds:
      coverage.entities,

    preservedEvidenceIds:
      preservedEvidenceIdsFromWriterRun(
        writerRun
      ),

    /*
     * These are aggregation inputs, not new scoring systems.
     * Existing production gates remain the authorities that
     * establish claim/risk/original-value safety.
     */
    materialClaimsSupported:
      upstreamSafetyPass,

    riskPolicyCompliance:
      publicationPolicyPass,

    intentComplete:
      mustCoverageComplete &&
      contentGatePass,

    originalValueCompliance:
      publicationPolicyPass &&
      contentGatePass,

    duplicateHeadingCheck:
      duplicateHeadingCheck(
        renderedSections
      ),

    majorSemanticFindingCount:
      semanticBlockCount,

    publicationPolicyPass,

    serpReplayStatus:
      mapSerpReplayStatus({
        replay:
          serpReplay,

        warning:
          serpReplayWarning,
      }),
  });
}


export function formatProductionFinalArticleReadinessFailureV1(
  result:
    FinalArticleReadinessResultV1
): string {
  return [
    result.version,
    `STATUS=${result.status}`,

    ...result.blockers.map(
      (
        blocker
      ) =>
        `BLOCKER=${blocker}`
    ),

    ...result.warnings.map(
      (
        warning
      ) =>
        `WARNING=${warning}`
    ),
  ].join(
    " | "
  );
}
