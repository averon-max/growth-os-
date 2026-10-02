import type {
  MediaRequirementV1,
} from "./media-requirements-v1";

export type CoveragePriorityV1 =
  | "MUST"
  | "SHOULD";


export interface CoverageRequirementV1 {
  readonly id:
    string;

  readonly label:
    string;

  readonly priority:
    CoveragePriorityV1;
}


export interface EntityRequirementV1
  extends CoverageRequirementV1 {}


export type SectionExecutionStateV1 =
  | "WRITABLE"
  | "DEFERRED_NO_EVIDENCE"
  | "NOT_APPLICABLE";


export interface SectionWordBudgetV1 {
  readonly min:
    number;

  readonly preferred:
    number;

  readonly max:
    number;
}


export interface SectionExecutionContractV1 {
  readonly id:
    string;

  readonly heading:
    string;

  readonly level:
    2 | 3;

  readonly mission:
    string;

  readonly requiredTopicIds:
    readonly string[];

  readonly requiredQuestionIds:
    readonly string[];

  readonly requiredEntityIds:
    readonly string[];

  readonly requiredClaimIds:
    readonly string[];

  readonly evidenceIds:
    readonly string[];

  readonly targetWords:
    Readonly<SectionWordBudgetV1>;

  readonly state:
    SectionExecutionStateV1;
}


export interface ArticleLengthPlanV1 {
  readonly preferredMin:
    number;

  readonly preferredMax:
    number;

  readonly rationale:
    string;
}


export interface ArticleExecutionPlanV1 {
  readonly version:
    "ARTICLE_EXECUTION_PLAN_V1";

  readonly websiteId:
    string;

  readonly topic:
    string;

  readonly primaryQuery:
    string;

  readonly intent:
    string;

  readonly pageType:
    string;

  readonly riskClass:
    string;

  readonly pageAction:
    string;

  readonly requiredTopics:
    readonly CoverageRequirementV1[];

  readonly requiredQuestions:
    readonly CoverageRequirementV1[];

  readonly requiredEntities:
    readonly EntityRequirementV1[];

  readonly verifiedEvidenceIds:
    readonly string[];

  /*
   * Derived from existing OriginalValueAsset assignments.
   *
   * Optional only for persisted pre-Pass-4B compatibility.
   */
  readonly mediaRequirements?:
    readonly Readonly<MediaRequirementV1>[];

  readonly sections:
    readonly SectionExecutionContractV1[];

  readonly lengthPlan:
    Readonly<ArticleLengthPlanV1>;
}


export interface ArticleExecutionSectionInputV1 {
  readonly id:
    string;

  readonly heading:
    string;

  readonly level:
    2 | 3;

  readonly mission:
    string;

  readonly requiredTopicIds?:
    readonly string[];

  readonly requiredQuestionIds?:
    readonly string[];

  readonly requiredEntityIds?:
    readonly string[];

  readonly requiredClaimIds?:
    readonly string[];

  readonly evidenceIds?:
    readonly string[];

  readonly state:
    SectionExecutionStateV1;
}


export interface BuildArticleExecutionPlanInputV1 {
  readonly websiteId:
    string;

  readonly topic:
    string;

  readonly primaryQuery:
    string;

  readonly intent:
    string;

  readonly pageType:
    string;

  readonly riskClass:
    string;

  readonly pageAction:
    string;

  readonly requiredTopics:
    readonly CoverageRequirementV1[];

  readonly requiredQuestions:
    readonly CoverageRequirementV1[];

  readonly requiredEntities?:
    readonly EntityRequirementV1[];

  readonly verifiedEvidenceIds?:
    readonly string[];

  readonly sections:
    readonly ArticleExecutionSectionInputV1[];
}


export class ArticleExecutionPlanErrorV1
  extends Error {
  constructor(
    readonly code:
      string,
    message?:
      string
  ) {
    super(
      message
        ? `${code}:${message}`
        : code
    );

    this.name =
      "ArticleExecutionPlanErrorV1";
  }
}


function unique(
  values:
    readonly string[]
): string[] {
  return [
    ...new Set(
      values
        .map(
          (value) =>
            value.trim()
        )
        .filter(Boolean)
    ),
  ];
}


function assertUniqueRequirementIds(
  kind:
    string,
  requirements:
    readonly CoverageRequirementV1[]
): void {
  const ids =
    requirements.map(
      (requirement) =>
        requirement.id.trim()
    );

  if (
    ids.some(
      (id) =>
        id.length ===
        0
    )
  ) {
    throw new ArticleExecutionPlanErrorV1(
      `ARTICLE_EXECUTION_PLAN_${kind}_ID_EMPTY`
    );
  }


  if (
    new Set(ids).size !==
    ids.length
  ) {
    throw new ArticleExecutionPlanErrorV1(
      `ARTICLE_EXECUTION_PLAN_${kind}_ID_DUPLICATE`
    );
  }
}


function clamp(
  value:
    number,
  min:
    number,
  max:
    number
): number {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}


/*
 * ADAPTIVE_SECTION_DEPTH_V1
 *
 * This is NOT an SEO ranking formula.
 *
 * The budget exists only to prevent a complex information job
 * from collapsing into a shallow paragraph.
 *
 * It is derived from the section's information burden,
 * never from topic-specific rules or keyword quotas.
 */
export function deriveSectionWordBudgetV1({
  requiredTopics,
  requiredQuestions,
  requiredEntities,
  requiredClaims,
}: {
  readonly requiredTopics:
    number;

  readonly requiredQuestions:
    number;

  readonly requiredEntities:
    number;

  readonly requiredClaims:
    number;
}): SectionWordBudgetV1 {
  const informationLoad =
    requiredTopics * 42 +
    requiredQuestions * 52 +
    requiredEntities * 22 +
    requiredClaims * 28;


  const preferred =
    clamp(
      125 +
        informationLoad,
      110,
      420
    );


  return Object.freeze({
    min:
      Math.max(
        80,
        Math.round(
          preferred *
            0.68
        )
      ),

    preferred,

    max:
      Math.round(
        preferred *
          1.35
      ),
  });
}


function requirementOwnershipCount(
  id:
    string,
  sections:
    readonly SectionExecutionContractV1[],
  select:
    (
      section:
        SectionExecutionContractV1
    ) => readonly string[]
): number {
  return sections.filter(
    (section) =>
      section.state !==
        "NOT_APPLICABLE" &&
      select(
        section
      ).includes(
        id
      )
  ).length;
}


function assertMustOwnership(
  kind:
    "TOPIC" |
    "QUESTION" |
    "ENTITY",
  requirements:
    readonly CoverageRequirementV1[],
  sections:
    readonly SectionExecutionContractV1[],
  select:
    (
      section:
        SectionExecutionContractV1
    ) => readonly string[]
): void {
  for (
    const requirement
    of requirements
  ) {
    if (
      requirement.priority !==
      "MUST"
    ) {
      continue;
    }


    const owners =
      requirementOwnershipCount(
        requirement.id,
        sections,
        select
      );


    if (
      owners ===
      0
    ) {
      throw new ArticleExecutionPlanErrorV1(
        `ARTICLE_EXECUTION_PLAN_REQUIRED_${kind}_LOSS`,
        requirement.id
      );
    }


    if (
      owners >
      1
    ) {
      throw new ArticleExecutionPlanErrorV1(
        `ARTICLE_EXECUTION_PLAN_REQUIRED_${kind}_MULTIPLE_OWNERS`,
        requirement.id
      );
    }
  }
}


function assertKnownOwnershipIds(
  kind:
    "TOPIC" |
    "QUESTION" |
    "ENTITY",
  known:
    readonly CoverageRequirementV1[],
  sections:
    readonly SectionExecutionContractV1[],
  select:
    (
      section:
        SectionExecutionContractV1
    ) => readonly string[]
): void {
  const knownIds =
    new Set(
      known.map(
        (item) =>
          item.id
      )
    );


  for (
    const section
    of sections
  ) {
    for (
      const id
      of select(
        section
      )
    ) {
      if (
        !knownIds.has(
          id
        )
      ) {
        throw new ArticleExecutionPlanErrorV1(
          `ARTICLE_EXECUTION_PLAN_UNKNOWN_${kind}_OWNER`,
          `${section.id}:${id}`
        );
      }
    }
  }
}


export function buildArticleExecutionPlanV1(
  input:
    BuildArticleExecutionPlanInputV1
): ArticleExecutionPlanV1 {
  if (
    input.websiteId.trim()
      .length ===
      0 ||
    input.topic.trim()
      .length ===
      0 ||
    input.primaryQuery.trim()
      .length ===
      0
  ) {
    throw new ArticleExecutionPlanErrorV1(
      "ARTICLE_EXECUTION_PLAN_CORE_IDENTITY_INVALID"
    );
  }


  assertUniqueRequirementIds(
    "TOPIC",
    input.requiredTopics
  );

  assertUniqueRequirementIds(
    "QUESTION",
    input.requiredQuestions
  );

  const requiredEntities =
    input.requiredEntities ??
    [];

  assertUniqueRequirementIds(
    "ENTITY",
    requiredEntities
  );


  const sectionIds =
    input.sections.map(
      (section) =>
        section.id.trim()
    );


  if (
    sectionIds.some(
      (id) =>
        id.length ===
        0
    ) ||
    new Set(
      sectionIds
    ).size !==
      sectionIds.length
  ) {
    throw new ArticleExecutionPlanErrorV1(
      "ARTICLE_EXECUTION_PLAN_SECTION_ID_INVALID"
    );
  }


  const sections:
    SectionExecutionContractV1[] =
      input.sections.map(
        (section) => {
          const requiredTopicIds =
            unique(
              section
                .requiredTopicIds ??
                []
            );

          const requiredQuestionIds =
            unique(
              section
                .requiredQuestionIds ??
                []
            );

          const requiredEntityIds =
            unique(
              section
                .requiredEntityIds ??
                []
            );

          const requiredClaimIds =
            unique(
              section
                .requiredClaimIds ??
                []
            );

          const evidenceIds =
            unique(
              section
                .evidenceIds ??
                []
            );


          return Object.freeze({
            id:
              section.id.trim(),

            heading:
              section.heading.trim(),

            level:
              section.level,

            mission:
              section.mission.trim(),

            requiredTopicIds:
              Object.freeze(
                requiredTopicIds
              ),

            requiredQuestionIds:
              Object.freeze(
                requiredQuestionIds
              ),

            requiredEntityIds:
              Object.freeze(
                requiredEntityIds
              ),

            requiredClaimIds:
              Object.freeze(
                requiredClaimIds
              ),

            evidenceIds:
              Object.freeze(
                evidenceIds
              ),

            targetWords:
              Object.freeze(
                deriveSectionWordBudgetV1({
                  requiredTopics:
                    requiredTopicIds.length,

                  requiredQuestions:
                    requiredQuestionIds.length,

                  requiredEntities:
                    requiredEntityIds.length,

                  requiredClaims:
                    requiredClaimIds.length,
                })
              ),

            state:
              section.state,
          });
        }
      );


  assertKnownOwnershipIds(
    "TOPIC",
    input.requiredTopics,
    sections,
    (section) =>
      section.requiredTopicIds
  );

  assertKnownOwnershipIds(
    "QUESTION",
    input.requiredQuestions,
    sections,
    (section) =>
      section.requiredQuestionIds
  );

  assertKnownOwnershipIds(
    "ENTITY",
    requiredEntities,
    sections,
    (section) =>
      section.requiredEntityIds
  );


  assertMustOwnership(
    "TOPIC",
    input.requiredTopics,
    sections,
    (section) =>
      section.requiredTopicIds
  );

  assertMustOwnership(
    "QUESTION",
    input.requiredQuestions,
    sections,
    (section) =>
      section.requiredQuestionIds
  );

  assertMustOwnership(
    "ENTITY",
    requiredEntities,
    sections,
    (section) =>
      section.requiredEntityIds
  );


  const writableSections =
    sections.filter(
      (section) =>
        section.state ===
        "WRITABLE"
    );


  if (
    writableSections.length ===
    0
  ) {
    throw new ArticleExecutionPlanErrorV1(
      "ARTICLE_EXECUTION_PLAN_NO_WRITABLE_SECTIONS"
    );
  }


  const preferredMin =
    writableSections.reduce(
      (
        total,
        section
      ) =>
        total +
        section.targetWords.min,
      0
    );


  const preferredMax =
    writableSections.reduce(
      (
        total,
        section
      ) =>
        total +
        section.targetWords.max,
      0
    );


  return Object.freeze({
    version:
      "ARTICLE_EXECUTION_PLAN_V1",

    websiteId:
      input.websiteId.trim(),

    topic:
      input.topic.trim(),

    primaryQuery:
      input.primaryQuery.trim(),

    intent:
      input.intent.trim(),

    pageType:
      input.pageType.trim(),

    riskClass:
      input.riskClass.trim(),

    pageAction:
      input.pageAction.trim(),

    requiredTopics:
      Object.freeze([
        ...input.requiredTopics,
      ]),

    requiredQuestions:
      Object.freeze([
        ...input.requiredQuestions,
      ]),

    requiredEntities:
      Object.freeze([
        ...requiredEntities,
      ]),

    verifiedEvidenceIds:
      Object.freeze(
        unique(
          input
            .verifiedEvidenceIds ??
            []
        )
      ),

    sections:
      Object.freeze(
        sections
      ),

    lengthPlan:
      Object.freeze({
        preferredMin,
        preferredMax,

        rationale:
          [
            `writableSections=${writableSections.length}`,
            "derivedFrom=information-jobs",
            "wordCountIsNotARankingGate",
          ].join(
            ";"
          ),
      }),
  });
}
