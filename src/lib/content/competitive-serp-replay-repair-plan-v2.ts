import type {
  ArticleGenerationContractV1,
} from "./article-generation-contract";


export type CompetitiveReplayRepairDispositionV2 =
  | "NO_REPAIR_NEEDED"
  | "REPAIRABLE_SECTIONS"
  | "BLOCK_UNLOCALIZED"
  | "INSUFFICIENT_CONTEXT";


export interface CompetitiveReplaySectionRepairTaskV2 {
  sectionIndex:
    number;

  sectionNumber:
    number;

  heading:
    string;

  dimensions:
    readonly string[];

  competitorUrls:
    readonly string[];

  reasons:
    readonly string[];

  articleEvidenceIds:
    readonly string[];
}


export interface CompetitiveReplayUnlocalizedFindingV2 {
  dimension:
    string;

  competitorUrl:
    string | null;

  reason:
    string;

  articleEvidenceIds:
    readonly string[];
}


export interface CompetitiveReplayRepairPlanV2 {
  version:
    "COMPETITIVE_REPLAY_REPAIR_PLAN_V2";

  replayStatus:
    string | null;

  disposition:
    CompetitiveReplayRepairDispositionV2;

  tasks:
    readonly Readonly<
      CompetitiveReplaySectionRepairTaskV2
    >[];

  unlocalized:
    readonly Readonly<
      CompetitiveReplayUnlocalizedFindingV2
    >[];

  rules:
    readonly string[];
}


type UnknownRecord =
  Record<string, unknown>;


function record(
  value:
    unknown
): UnknownRecord | null {
  return (
    value !== null &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  )
    ? value as UnknownRecord
    : null;
}


function clean(
  value:
    unknown
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}


function strings(
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

  const output:
    string[] =
      [];

  const seen =
    new Set<string>();


  for (
    const raw
    of value
  ) {
    const item =
      clean(
        raw
      );

    if (
      !item ||
      seen.has(
        item
      )
    ) {
      continue;
    }

    seen.add(
      item
    );

    output.push(
      item
    );
  }


  return output;
}


function unique(
  values:
    readonly string[]
): readonly string[] {
  return Object.freeze(
    Array.from(
      new Set(
        values
          .map(
            (
              value
            ) =>
              value.trim()
          )
          .filter(
            Boolean
          )
      )
    )
  );
}


interface ReplayIssue {
  dimension:
    string;

  competitorUrl:
    string | null;

  reason:
    string;

  articleEvidenceIds:
    readonly string[];
}


interface ContractSection {
  sectionIndex:
    number;

  sectionNumber:
    number;

  heading:
    string;

  evidenceIds:
    readonly string[];
}


function contractSections(
  contract:
    Readonly<
      ArticleGenerationContractV1
    >
): readonly ContractSection[] {
  return Object.freeze(
    contract
      .sectionContracts
      .map(
        (
          section,
          fallbackIndex
        ) =>
          Object.freeze({
            sectionIndex:
              section.sectionIndex ??
              fallbackIndex,

            sectionNumber:
              section.sectionNumber ??
              fallbackIndex +
                1,

            heading:
              section.blueprint
                .heading,

            evidenceIds:
              Object.freeze([
                ...(
                  section
                    .blueprint
                    .evidenceIds ??
                  []
                ),
              ]),
          })
      )
  );
}


function issueFromDimension({
  dimension,
  competitorUrl,
}: {
  dimension:
    UnknownRecord;

  competitorUrl:
    string | null;
}): ReplayIssue | null {
  const dimensionId =
    clean(
      dimension.dimension
    );

  const verdict =
    clean(
      dimension.verdict
    );

  if (
    !dimensionId ||
    verdict !==
      "COMPETITOR_STRONGER"
  ) {
    return null;
  }


  return {
    dimension:
      dimensionId,

    competitorUrl,

    reason:
      clean(
        dimension.reason
      ) ||
      `Competitor is stronger on ${dimensionId}.`,

    articleEvidenceIds:
      Object.freeze(
        strings(
          dimension
            .articleEvidenceIds
        )
      ),
  };
}


function replayIssues(
  replay:
    UnknownRecord
): readonly ReplayIssue[] {
  if (
    !Array.isArray(
      replay.comparisons
    )
  ) {
    return Object.freeze(
      []
    );
  }


  const output:
    ReplayIssue[] =
      [];


  for (
    const rawComparison
    of replay.comparisons
  ) {
    const comparison =
      record(
        rawComparison
      );

    if (!comparison) {
      continue;
    }


    const competitor =
      record(
        comparison.competitor
      );

    const competitorUrl =
      clean(
        competitor?.url
      ) ||
      null;


    const blockingDimensions =
      new Set(
        strings(
          comparison
            .blockingDimensions
        )
      );


    const dimensions =
      Array.isArray(
        comparison.dimensions
      )
        ? comparison.dimensions
        : [];


    for (
      const rawDimension
      of dimensions
    ) {
      const dimension =
        record(
          rawDimension
        );

      if (!dimension) {
        continue;
      }


      const issue =
        issueFromDimension({
          dimension,
          competitorUrl,
        });


      if (!issue) {
        continue;
      }


      /*
       * BLOCK replay:
       * use only dimensions explicitly identified by the
       * existing SERP Replay engine as blocking.
       *
       * WARN replay:
       * COMPETITOR_STRONGER is actionable diagnostic evidence,
       * but still must localize deterministically.
       */
      if (
        blockingDimensions.size >
          0 &&
        !blockingDimensions.has(
          issue.dimension
        )
      ) {
        continue;
      }


      output.push(
        issue
      );
    }


    /*
     * Fail closed if the replay says a dimension blocks but its
     * structured dimension judgment is absent.
     */
    for (
      const dimension
      of blockingDimensions
    ) {
      const exists =
        output.some(
          (
            issue
          ) =>
            issue.dimension ===
              dimension &&
            issue.competitorUrl ===
              competitorUrl
        );


      if (!exists) {
        output.push({
          dimension,

          competitorUrl,

          reason:
            `SERP Replay marked ${dimension} as blocking but supplied no localizable COMPETITOR_STRONGER dimension judgment.`,

          articleEvidenceIds:
            Object.freeze(
              []
            ),
        });
      }
    }
  }


  return Object.freeze(
    output
  );
}


function intersect(
  left:
    readonly string[],
  right:
    readonly string[]
): readonly string[] {
  const rightSet =
    new Set(
      right
    );

  return unique(
    left.filter(
      (
        value
      ) =>
        rightSet.has(
          value
        )
    )
  );
}


export function buildCompetitiveReplayRepairPlanV2({
  contract,
  replay,
}: {
  contract:
    Readonly<
      ArticleGenerationContractV1
    >;

  replay:
    unknown;
}): Readonly<
  CompetitiveReplayRepairPlanV2
> {
  const rawReplay =
    record(
      replay
    );


  if (!rawReplay) {
    return Object.freeze({
      version:
        "COMPETITIVE_REPLAY_REPAIR_PLAN_V2",

      replayStatus:
        null,

      disposition:
        "INSUFFICIENT_CONTEXT",

      tasks:
        Object.freeze([]),

      unlocalized:
        Object.freeze([]),

      rules:
        RULES,
    });
  }


  const replayStatus =
    clean(
      rawReplay.status
    ) ||
    clean(
      rawReplay.replayStatus
    ) ||
    null;


  if (
    replayStatus ===
      "READY"
  ) {
    return Object.freeze({
      version:
        "COMPETITIVE_REPLAY_REPAIR_PLAN_V2",

      replayStatus,

      disposition:
        "NO_REPAIR_NEEDED",

      tasks:
        Object.freeze([]),

      unlocalized:
        Object.freeze([]),

      rules:
        RULES,
    });
  }


  if (
    replayStatus ===
      "INSUFFICIENT_CONTEXT"
  ) {
    return Object.freeze({
      version:
        "COMPETITIVE_REPLAY_REPAIR_PLAN_V2",

      replayStatus,

      disposition:
        "INSUFFICIENT_CONTEXT",

      tasks:
        Object.freeze([]),

      unlocalized:
        Object.freeze([]),

      rules:
        RULES,
    });
  }


  const sections =
    contractSections(
      contract
    );


  const issues =
    replayIssues(
      rawReplay
    );


  const grouped =
    new Map<
      number,
      {
        section:
          ContractSection;

        dimensions:
          string[];

        competitorUrls:
          string[];

        reasons:
          string[];

        articleEvidenceIds:
          string[];
      }
    >();


  const unlocalized:
    CompetitiveReplayUnlocalizedFindingV2[] =
      [];


  for (
    const issue
    of issues
  ) {
    /*
     * Critical rule:
     *
     * Replay evidence IDs are the only deterministic bridge from
     * a pairwise SERP judgment back into a section contract.
     *
     * We do NOT use fuzzy heading matching to guess a repair
     * target.
     */
    if (
      issue
        .articleEvidenceIds
        .length ===
      0
    ) {
      unlocalized.push({
        dimension:
          issue.dimension,

        competitorUrl:
          issue.competitorUrl,

        reason:
          issue.reason,

        articleEvidenceIds:
          issue.articleEvidenceIds,
      });

      continue;
    }


    const candidates =
      sections.filter(
        (
          section
        ) =>
          intersect(
            issue
              .articleEvidenceIds,
            section
              .evidenceIds
          ).length >
          0
      );


    /*
     * Exactly one section must own the evidence bridge.
     *
     * Zero = no deterministic localization.
     * >1   = ambiguous localization.
     */
    if (
      candidates.length !==
      1
    ) {
      unlocalized.push({
        dimension:
          issue.dimension,

        competitorUrl:
          issue.competitorUrl,

        reason:
          issue.reason,

        articleEvidenceIds:
          issue.articleEvidenceIds,
      });

      continue;
    }


    const section =
      candidates[
        0
      ];


    if (!section) {
      continue;
    }


    const existing =
      grouped.get(
        section.sectionIndex
      );


    if (existing) {
      existing.dimensions.push(
        issue.dimension
      );

      if (
        issue.competitorUrl
      ) {
        existing
          .competitorUrls
          .push(
            issue.competitorUrl
          );
      }

      existing.reasons.push(
        issue.reason
      );

      existing
        .articleEvidenceIds
        .push(
          ...issue
            .articleEvidenceIds
        );

      continue;
    }


    grouped.set(
      section.sectionIndex,
      {
        section,

        dimensions: [
          issue.dimension,
        ],

        competitorUrls:
          issue.competitorUrl
            ? [
                issue
                  .competitorUrl,
              ]
            : [],

        reasons: [
          issue.reason,
        ],

        articleEvidenceIds: [
          ...issue
            .articleEvidenceIds,
        ],
      }
    );
  }


  const tasks =
    Object.freeze(
      [
        ...grouped.values(),
      ]
        .sort(
          (
            left,
            right
          ) =>
            left.section
              .sectionIndex -
            right.section
              .sectionIndex
        )
        .map(
          (
            item
          ) =>
            Object.freeze({
              sectionIndex:
                item.section
                  .sectionIndex,

              sectionNumber:
                item.section
                  .sectionNumber,

              heading:
                item.section
                  .heading,

              dimensions:
                unique(
                  item.dimensions
                ),

              competitorUrls:
                unique(
                  item
                    .competitorUrls
                ),

              reasons:
                unique(
                  item.reasons
                ),

              articleEvidenceIds:
                unique(
                  item
                    .articleEvidenceIds
                ),
            })
        )
    );


  const frozenUnlocalized =
    Object.freeze(
      unlocalized.map(
        (
          item
        ) =>
          Object.freeze({
            ...item,

            articleEvidenceIds:
              Object.freeze([
                ...item
                  .articleEvidenceIds,
              ]),
          })
      )
    );


  let disposition:
    CompetitiveReplayRepairDispositionV2;


  /*
   * A BLOCK replay with anything we cannot localize must remain
   * blocked. We must never guess a section merely to get READY.
   */
  if (
    replayStatus ===
      "BLOCK" &&
    frozenUnlocalized.length >
      0
  ) {
    disposition =
      "BLOCK_UNLOCALIZED";
  } else if (
    tasks.length >
      0
  ) {
    disposition =
      "REPAIRABLE_SECTIONS";
  } else if (
    replayStatus ===
      "WARN"
  ) {
    disposition =
      "NO_REPAIR_NEEDED";
  } else {
    disposition =
      "BLOCK_UNLOCALIZED";
  }


  return Object.freeze({
    version:
      "COMPETITIVE_REPLAY_REPAIR_PLAN_V2",

    replayStatus,

    disposition,

    tasks,

    unlocalized:
      frozenUnlocalized,

    rules:
      RULES,
  });
}


const RULES =
  Object.freeze([
    "NO_WHOLE_ARTICLE_REWRITE",
    "SECTION_LOCALIZATION_REQUIRES_EXISTING_EVIDENCE_ID",
    "NO_FUZZY_SECTION_GUESSING",
    "NO_NEW_FACTUAL_AUTHORITY_FROM_SERP_REPLAY",
    "NO_RANKING_SCORE",
    "NO_RANKING_PROBABILITY",
    "BLOCK_REMAINS_BLOCK_IF_LOCALIZATION_IS_AMBIGUOUS",
  ]);
