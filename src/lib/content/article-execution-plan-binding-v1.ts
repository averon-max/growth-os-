import {
  deriveSectionBudgetsForLengthContractV1,
  resolveArticleLengthContractV1,
} from "./article-length-contract-v1";

import type {
  ArticleExecutionPlanV1,
  CoverageRequirementV1,
  SectionExecutionContractV1,
  SectionWordBudgetV1,
} from "./article-execution-plan-v1";

import type {
  ArticleGenerationContractV1,
  SectionGenerationContractV1,
} from "./article-generation-contract";


import {
  parseMediaRequirementsV1,
  type MediaRequirementV1,
} from "./media-requirements-v1";


export interface BoundCoverageRequirementV1 {
  readonly id:
    string;

  readonly label:
    string;
}


export interface SectionExecutionPlanAuthorityV1 {
  readonly version:
    "SECTION_EXECUTION_PLAN_AUTHORITY_V1";

  readonly sectionId:
    string;

  readonly requiredTopics:
    readonly BoundCoverageRequirementV1[];

  readonly requiredQuestions:
    readonly BoundCoverageRequirementV1[];

  readonly requiredEntities:
    readonly BoundCoverageRequirementV1[];

  readonly requiredClaimIds:
    readonly string[];

  readonly evidenceIds:
    readonly string[];

  readonly mediaRequirements:
    readonly Readonly<MediaRequirementV1>[];

  /*
   * Editorial depth guidance.
   *
   * This is NOT a ranking threshold and NOT a publication
   * word-count gate.
   */
  readonly targetWords:
    Readonly<SectionWordBudgetV1>;
}


export type BoundSectionGenerationContractV1 =
  Readonly<
    SectionGenerationContractV1 & {
      readonly executionPlanAuthority:
        Readonly<SectionExecutionPlanAuthorityV1>;
    }
  >;


export type BoundArticleGenerationContractV1 =
  Readonly<
    Omit<
      ArticleGenerationContractV1,
      "sectionContracts"
    > & {
      readonly sectionContracts:
        readonly BoundSectionGenerationContractV1[];
    }
  >;


export class ArticleExecutionPlanBindingErrorV1
  extends Error {
  constructor(
    readonly code:
      string,
    detail?:
      string
  ) {
    super(
      detail
        ? `${code}:${detail}`
        : code
    );

    this.name =
      "ArticleExecutionPlanBindingErrorV1";
  }
}


function record(
  value:
    unknown
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  return value as
    Record<string, unknown>;
}


function requiredString(
  source:
    Record<string, unknown>,
  key:
    string
): string {
  const value =
    source[key];

  if (
    typeof value !==
      "string" ||
    value.trim().length ===
      0
  ) {
    throw new ArticleExecutionPlanBindingErrorV1(
      "ARTICLE_EXECUTION_PLAN_PERSISTED_STRING_INVALID",
      key
    );
  }

  return value.trim();
}


function requiredStringArray(
  source:
    Record<string, unknown>,
  key:
    string
): readonly string[] {
  const value =
    source[key];

  if (
    !Array.isArray(
      value
    ) ||
    !value.every(
      (
        item
      ): item is string =>
        typeof item ===
          "string" &&
        item.trim().length >
          0
    )
  ) {
    throw new ArticleExecutionPlanBindingErrorV1(
      "ARTICLE_EXECUTION_PLAN_PERSISTED_STRING_ARRAY_INVALID",
      key
    );
  }


  return Object.freeze(
    [
      ...new Set(
        value.map(
          (
            item
          ) =>
            item.trim()
        )
      ),
    ]
  );
}


function parseCoverageRequirements(
  value:
    unknown,
  kind:
    string
): readonly CoverageRequirementV1[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    throw new ArticleExecutionPlanBindingErrorV1(
      "ARTICLE_EXECUTION_PLAN_PERSISTED_COVERAGE_INVALID",
      kind
    );
  }


  return Object.freeze(
    value.map(
      (
        raw,
        index
      ) => {
        const item =
          record(
            raw
          );

        if (!item) {
          throw new ArticleExecutionPlanBindingErrorV1(
            "ARTICLE_EXECUTION_PLAN_PERSISTED_COVERAGE_ITEM_INVALID",
            `${kind}:${index}`
          );
        }


        const priority =
          requiredString(
            item,
            "priority"
          );


        if (
          priority !==
            "MUST" &&
          priority !==
            "SHOULD"
        ) {
          throw new ArticleExecutionPlanBindingErrorV1(
            "ARTICLE_EXECUTION_PLAN_PERSISTED_PRIORITY_INVALID",
            `${kind}:${index}`
          );
        }


        return Object.freeze({
          id:
            requiredString(
              item,
              "id"
            ),

          label:
            requiredString(
              item,
              "label"
            ),

          priority,
        });
      }
    )
  );
}


function requiredFiniteNumber(
  source:
    Record<string, unknown>,
  key:
    string
): number {
  const value =
    source[key];

  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value
    )
  ) {
    throw new ArticleExecutionPlanBindingErrorV1(
      "ARTICLE_EXECUTION_PLAN_PERSISTED_NUMBER_INVALID",
      key
    );
  }

  return value;
}


function parseTargetWords(
  value:
    unknown,
  sectionId:
    string
): Readonly<SectionWordBudgetV1> {
  const source =
    record(
      value
    );

  if (!source) {
    throw new ArticleExecutionPlanBindingErrorV1(
      "ARTICLE_EXECUTION_PLAN_TARGET_WORDS_INVALID",
      sectionId
    );
  }


  const min =
    requiredFiniteNumber(
      source,
      "min"
    );

  const preferred =
    requiredFiniteNumber(
      source,
      "preferred"
    );

  const max =
    requiredFiniteNumber(
      source,
      "max"
    );


  if (
    min <=
      0 ||
    preferred <
      min ||
    max <
      preferred
  ) {
    throw new ArticleExecutionPlanBindingErrorV1(
      "ARTICLE_EXECUTION_PLAN_TARGET_WORDS_ORDER_INVALID",
      sectionId
    );
  }


  return Object.freeze({
    min,
    preferred,
    max,
  });
}


function parseSection(
  value:
    unknown,
  index:
    number
): Readonly<SectionExecutionContractV1> {
  const source =
    record(
      value
    );

  if (!source) {
    throw new ArticleExecutionPlanBindingErrorV1(
      "ARTICLE_EXECUTION_PLAN_PERSISTED_SECTION_INVALID",
      String(
        index
      )
    );
  }


  const state =
    requiredString(
      source,
      "state"
    );


  if (
    state !==
      "WRITABLE" &&
    state !==
      "DEFERRED_NO_EVIDENCE" &&
    state !==
      "NOT_APPLICABLE"
  ) {
    throw new ArticleExecutionPlanBindingErrorV1(
      "ARTICLE_EXECUTION_PLAN_PERSISTED_SECTION_STATE_INVALID",
      `${index}:${state}`
    );
  }


  const level =
    source.level;

  if (
    level !==
      2 &&
    level !==
      3
  ) {
    throw new ArticleExecutionPlanBindingErrorV1(
      "ARTICLE_EXECUTION_PLAN_PERSISTED_SECTION_LEVEL_INVALID",
      String(
        index
      )
    );
  }


  const id =
    requiredString(
      source,
      "id"
    );


  return Object.freeze({
    id,

    heading:
      requiredString(
        source,
        "heading"
      ),

    level,

    mission:
      requiredString(
        source,
        "mission"
      ),

    requiredTopicIds:
      requiredStringArray(
        source,
        "requiredTopicIds"
      ),

    requiredQuestionIds:
      requiredStringArray(
        source,
        "requiredQuestionIds"
      ),

    requiredEntityIds:
      requiredStringArray(
        source,
        "requiredEntityIds"
      ),

    requiredClaimIds:
      requiredStringArray(
        source,
        "requiredClaimIds"
      ),

    evidenceIds:
      requiredStringArray(
        source,
        "evidenceIds"
      ),

    targetWords:
      parseTargetWords(
        source.targetWords,
        id
      ),

    state,
  });
}


/*
 * PERSISTED_ARTICLE_EXECUTION_PLAN_READER_V1
 *
 * Never reconstruct Writer coverage from legacy brief.outline.
 * The exact persisted Research -> Writer contract is authoritative.
 */
export function parsePersistedArticleExecutionPlanV1(
  value:
    unknown
): Readonly<ArticleExecutionPlanV1> {
  const source =
    record(
      value
    );

  if (!source) {
    throw new ArticleExecutionPlanBindingErrorV1(
      "ARTICLE_EXECUTION_PLAN_MISSING"
    );
  }


  if (
    source.version !==
    "ARTICLE_EXECUTION_PLAN_V1"
  ) {
    throw new ArticleExecutionPlanBindingErrorV1(
      "ARTICLE_EXECUTION_PLAN_VERSION_INVALID"
    );
  }


  const rawSections =
    source.sections;

  if (
    !Array.isArray(
      rawSections
    ) ||
    rawSections.length ===
      0
  ) {
    throw new ArticleExecutionPlanBindingErrorV1(
      "ARTICLE_EXECUTION_PLAN_SECTIONS_INVALID"
    );
  }


  const lengthPlan =
    record(
      source.lengthPlan
    );

  if (!lengthPlan) {
    throw new ArticleExecutionPlanBindingErrorV1(
      "ARTICLE_EXECUTION_PLAN_LENGTH_PLAN_INVALID"
    );
  }


  const preferredMin =
    requiredFiniteNumber(
      lengthPlan,
      "preferredMin"
    );

  const preferredMax =
    requiredFiniteNumber(
      lengthPlan,
      "preferredMax"
    );


  if (
    preferredMin <
      0 ||
    preferredMax <
      preferredMin
  ) {
    throw new ArticleExecutionPlanBindingErrorV1(
      "ARTICLE_EXECUTION_PLAN_LENGTH_RANGE_INVALID"
    );
  }


  return Object.freeze({
    version:
      "ARTICLE_EXECUTION_PLAN_V1",

    websiteId:
      requiredString(
        source,
        "websiteId"
      ),

    topic:
      requiredString(
        source,
        "topic"
      ),

    primaryQuery:
      requiredString(
        source,
        "primaryQuery"
      ),

    intent:
      requiredString(
        source,
        "intent"
      ),

    pageType:
      requiredString(
        source,
        "pageType"
      ),

    riskClass:
      requiredString(
        source,
        "riskClass"
      ),

    pageAction:
      requiredString(
        source,
        "pageAction"
      ),

    requiredTopics:
      parseCoverageRequirements(
        source.requiredTopics,
        "topics"
      ),

    requiredQuestions:
      parseCoverageRequirements(
        source.requiredQuestions,
        "questions"
      ),

    requiredEntities:
      parseCoverageRequirements(
        source.requiredEntities,
        "entities"
      ),

    verifiedEvidenceIds:
      requiredStringArray(
        source,
        "verifiedEvidenceIds"
      ),

    ...(
      source.mediaRequirements !==
        undefined
        ? {
            mediaRequirements:
              parseMediaRequirementsV1(
                source.mediaRequirements
              ),
          }
        : {}
    ),

    sections:
      Object.freeze(
        rawSections.map(
          (
            section,
            index
          ) =>
            parseSection(
              section,
              index
            )
        )
      ),

    lengthPlan:
      Object.freeze({
        preferredMin,
        preferredMax,

        rationale:
          requiredString(
            lengthPlan,
            "rationale"
          ),
      }),
  });
}


function normalizedStrings(
  values:
    readonly string[] |
    undefined
): readonly string[] {
  return Object.freeze(
    [
      ...new Set(
        (
          values ??
          []
        )
          .map(
            (
              value
            ) =>
              value.trim()
          )
          .filter(Boolean)
      ),
    ].sort()
  );
}


function assertSameIds({
  expected,
  actual,
  code,
  sectionId,
}: {
  expected:
    readonly string[];

  actual:
    readonly string[];

  code:
    string;

  sectionId:
    string;
}): void {
  const a =
    normalizedStrings(
      expected
    );

  const b =
    normalizedStrings(
      actual
    );


  if (
    a.length !==
      b.length ||
    a.some(
      (
        value,
        index
      ) =>
        value !==
        b[index]
    )
  ) {
    throw new ArticleExecutionPlanBindingErrorV1(
      code,
      sectionId
    );
  }
}


function coverageForSection(
  all:
    readonly CoverageRequirementV1[],
  ids:
    readonly string[],
  kind:
    string,
  sectionId:
    string
): readonly BoundCoverageRequirementV1[] {
  const byId =
    new Map(
      all.map(
        (
          requirement
        ) => [
          requirement.id,
          requirement,
        ] as const
      )
    );


  return Object.freeze(
    ids.map(
      (
        id
      ) => {
        const requirement =
          byId.get(
            id
          );

        if (!requirement) {
          throw new ArticleExecutionPlanBindingErrorV1(
            "ARTICLE_EXECUTION_PLAN_BINDING_UNKNOWN_COVERAGE_ID",
            `${sectionId}:${kind}:${id}`
          );
        }


        return Object.freeze({
          id:
            requirement.id,

          label:
            requirement.label,
        });
      }
    )
  );
}


/*
 * ARTICLE_EXECUTION_PLAN_WRITER_BINDING_V1
 *
 * This does NOT create another Writer or another generation
 * contract.
 *
 * It validates and enriches the EXISTING
 * ARTICLE_GENERATION_CONTRACT_V1 with immutable execution
 * authority.
 */
export function bindArticleExecutionPlanToGenerationContractV1({
  plan,
  contract,
}: {
  plan:
    Readonly<ArticleExecutionPlanV1>;

  contract:
    Readonly<ArticleGenerationContractV1>;
}): BoundArticleGenerationContractV1 {
  const writableSections =
    plan.sections.filter(
      (
        section
      ) =>
        section.state ===
        "WRITABLE"
    );


  if (
    writableSections.length !==
    contract.sectionContracts
      .length
  ) {
    throw new ArticleExecutionPlanBindingErrorV1(
      "ARTICLE_EXECUTION_PLAN_WRITER_SECTION_COUNT_MISMATCH",
      `plan=${writableSections.length};contract=${contract.sectionContracts.length}`
    );
  }


  /*
   * ARTICLE_LENGTH_CONTRACT_SECTION_BUDGETS_V1
   *
   * The plan stays the only structural authority. Budgets are
   * redistributed across the SAME sections; nothing is added.
   */
  const scaledSectionBudgets =
    deriveSectionBudgetsForLengthContractV1(
      plan.sections,
      resolveArticleLengthContractV1(
        plan
      )
    );


  const boundSections =
    contract.sectionContracts.map(
      (
        sectionContract,
        index
      ): BoundSectionGenerationContractV1 => {
        const executionSection =
          writableSections[
            index
          ];


        if (!executionSection) {
          throw new ArticleExecutionPlanBindingErrorV1(
            "ARTICLE_EXECUTION_PLAN_WRITER_SECTION_MISSING",
            String(
              index
            )
          );
        }


        const blueprintHeading =
          sectionContract
            .blueprint
            .heading
            ?.trim() ??
          "";


        if (
          blueprintHeading !==
          executionSection
            .heading
            .trim()
        ) {
          throw new ArticleExecutionPlanBindingErrorV1(
            "ARTICLE_EXECUTION_PLAN_WRITER_HEADING_MISMATCH",
            `${executionSection.id}:${blueprintHeading}`
          );
        }


        assertSameIds({
          expected:
            executionSection
              .requiredClaimIds,

          actual:
            sectionContract
              .blueprint
              .requiredClaims ??
            [],

          code:
            "ARTICLE_EXECUTION_PLAN_WRITER_CLAIM_DRIFT",

          sectionId:
            executionSection.id,
        });


        assertSameIds({
          expected:
            executionSection
              .evidenceIds,

          actual:
            sectionContract
              .blueprint
              .evidenceIds ??
            [],

          code:
            "ARTICLE_EXECUTION_PLAN_WRITER_EVIDENCE_DRIFT",

          sectionId:
            executionSection.id,
        });


        const sectionMediaRequirements =
          Object.freeze(
            (
              plan.mediaRequirements ??
              []
            ).filter(
              (
                requirement
              ) =>
                requirement.sectionId ===
                executionSection.id
            )
          );


        const blueprintAsset =
          typeof sectionContract
            .blueprint
            .asset ===
            "string" &&
          sectionContract
            .blueprint
            .asset
            .trim()
            .length >
            0
            ? sectionContract
                .blueprint
                .asset
                .trim()
            : null;


        for (
          const requirement
          of sectionMediaRequirements
        ) {
          if (
            !blueprintAsset ||
            requirement.assetId !==
              blueprintAsset
          ) {
            throw new ArticleExecutionPlanBindingErrorV1(
              "ARTICLE_EXECUTION_PLAN_WRITER_MEDIA_ASSET_DRIFT",
              `${executionSection.id}:${requirement.assetId}`
            );
          }
        }


        const authority:
          Readonly<SectionExecutionPlanAuthorityV1> =
            Object.freeze({
              version:
                "SECTION_EXECUTION_PLAN_AUTHORITY_V1",

              sectionId:
                executionSection.id,

              requiredTopics:
                coverageForSection(
                  plan.requiredTopics,
                  executionSection
                    .requiredTopicIds,
                  "topic",
                  executionSection.id
                ),

              requiredQuestions:
                coverageForSection(
                  plan.requiredQuestions,
                  executionSection
                    .requiredQuestionIds,
                  "question",
                  executionSection.id
                ),

              requiredEntities:
                coverageForSection(
                  plan.requiredEntities,
                  executionSection
                    .requiredEntityIds,
                  "entity",
                  executionSection.id
                ),

              requiredClaimIds:
                Object.freeze([
                  ...executionSection
                    .requiredClaimIds,
                ]),

              evidenceIds:
                Object.freeze([
                  ...executionSection
                    .evidenceIds,
                ]),

              mediaRequirements:
                sectionMediaRequirements,

              targetWords:
                scaledSectionBudgets.get(
                  executionSection.id
                ) ??
                executionSection
                  .targetWords,
            });


        return Object.freeze({
          ...sectionContract,

          executionPlanAuthority:
            authority,
        });
      }
    );


  return Object.freeze({
    ...contract,

    sectionContracts:
      Object.freeze(
        boundSections
      ),
  });
}
