type UnknownRecord =
  Record<string, unknown>;


function record(
  value:
    unknown
): UnknownRecord | null {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  )
    ? value as UnknownRecord
    : null;
}


function array(
  value:
    unknown
): readonly unknown[] {
  return Array.isArray(value)
    ? value
    : [];
}


function clipped(
  value:
    unknown,
  max:
    number
): unknown {
  if (
    typeof value !==
    "string"
  ) {
    return value;
  }

  if (
    value.length <=
    max
  ) {
    return value;
  }

  return (
    value.slice(
      0,
      max
    ) +
    "…"
  );
}


function pick(
  value:
    unknown,
  keys:
    readonly string[],
  maxString =
    1200
): UnknownRecord {
  const source =
    record(value);

  if (
    !source
  ) {
    return {};
  }

  const output:
    UnknownRecord = {};

  for (
    const key
    of keys
  ) {
    if (
      source[key] ===
      undefined
    ) {
      continue;
    }

    output[key] =
      clipped(
        source[key],
        maxString
      );
  }

  return output;
}


function stringArray(
  value:
    unknown,
  maxItems:
    number
): readonly string[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .filter(
      (
        item
      ): item is string =>
        typeof item ===
        "string" &&
        item.trim().length >
        0
    )
    .slice(
      0,
      maxItems
    )
    .map(
      (
        item
      ) =>
        item.trim()
    );
}


function sectionBlueprints(
  contract:
    UnknownRecord
): readonly UnknownRecord[] {
  const raw =
    contract
      .sectionBlueprints;

  const list =
    Array.isArray(raw)
      ? raw
      : array(
          record(raw)
            ?.sections
        );

  return list
    .map(
      (
        item
      ) =>
        record(item)
    )
    .filter(
      (
        item
      ): item is UnknownRecord =>
        Boolean(item)
    )
    .map(
      (
        section
      ) => {
        const blueprint =
          record(
            section.blueprint
          ) ??
          section;

        return {
          ...pick(
            blueprint,
            [
              "heading",
              "mission",
              "expectedOutcome",
              "asset",
            ],
            800
          ),

          queryNodeIds:
            stringArray(
              blueprint
                .queryNodeIds,
              12
            ),

          requiredClaims:
            stringArray(
              blueprint
                .requiredClaims,
              12
            ),

          forbiddenClaims:
            stringArray(
              blueprint
                .forbiddenClaims,
              12
            ),

          evidenceIds:
            stringArray(
              blueprint
                .evidenceIds,
              16
            ),

          internalLinks:
            stringArray(
              blueprint
                .internalLinks,
              12
            ),
        };
      }
    );
}


/*
 * MASTER_ARTICLE_SEMANTIC_CRITIC_BUDGET_V1
 *
 * Persisted Master Runtime and ArticleGenerationContract remain
 * complete and immutable.
 *
 * This is only the provider-facing semantic critic projection.
 *
 * The semantic critic needs:
 * - final reader-facing article
 * - page/search mission
 * - canonical section jobs
 * - real originality comparison references
 * - real cannibalization candidates
 *
 * It does NOT need duplicate copies of the full QueryGraph,
 * EvidenceGraph, ClaimLedger, ExpectedCoverage, gaps, etc.
 *
 * Those were already enforced by section generation,
 * deterministic reconciliation and semantic section verification.
 */
export function buildMasterArticleSemanticCriticBudgetV1({
  contract,
  run,
  context,
}: {
  contract:
    unknown;

  run:
    unknown;

  context:
    unknown;
}): Readonly<
  UnknownRecord
> {
  const c =
    record(contract) ??
    {};

  const r =
    record(run) ??
    {};

  const x =
    record(context) ??
    {};

  const sections =
    sectionBlueprints(c);

  const firstSection =
    sections.length >
      0
      ? (
          record(
            Array.isArray(
              c.sectionBlueprints
            )
              ? c
                  .sectionBlueprints[0]
              : array(
                  record(
                    c.sectionBlueprints
                  )?.sections
                )[0]
          ) ??
          {}
        )
      : {};

  const mission =
    record(
      c.mission
    ) ??
    record(
      firstSection
        .mission
    ) ??
    {};

  const searchBlueprint =
    record(
      c.searchBlueprint
    ) ??
    record(
      firstSection
        .searchBlueprint
    ) ??
    {};

  const article =
    record(
      r.article
    ) ??
    {};

  const provenance =
    record(
      r.provenance
    ) ??
    {};


  const originalityReferences =
    array(
      x.originalityReferences
    )
      .slice(
        0,
        8
      )
      .map(
        (
          item
        ) => {
          const ref =
            record(item) ??
            {};

          return {
            ...pick(
              ref,
              [
                "id",
                "label",
              ],
              300
            ),

            text:
              clipped(
                ref.text,
                900
              ),
          };
        }
      );


  const cannibalizationCandidates =
    array(
      x.cannibalizationCandidates
    )
      .slice(
        0,
        10
      )
      .map(
        (
          item
        ) => {
          const candidate =
            record(item) ??
            {};

          return {
            ...pick(
              candidate,
              [
                "id",
                "url",
                "title",
                "h1",
                "intentMatch",
                "queryOverlap",
                "matchedImpressions",
                "missionAffinity",
              ],
              600
            ),

            queryNodeIds:
              stringArray(
                candidate
                  .queryNodeIds,
                12
              ),

            matchedQueries:
              stringArray(
                candidate
                  .matchedQueries,
                12
              ),

            summary:
              clipped(
                candidate
                  .summary,
                700
              ),
          };
        }
      );


  return Object.freeze({
    version:
      "MASTER_ARTICLE_SEMANTIC_CRITIC_BUDGET_V1",

    mission:
      pick(
        mission,
        [
          "audience",
          "readerGoal",
          "businessRelationship",
          "riskClass",
          "language",
          "jurisdiction",
          "location",
        ],
        600
      ),

    pageStrategy: {
      ...pick(
        searchBlueprint,
        [
          "action",
          "primaryQuery",
          "intent",
          "pageType",
        ],
        500
      ),

      requiredTopics:
        stringArray(
          searchBlueprint
            .requiredTopics,
          20
        ),

      supportingTopics:
        stringArray(
          searchBlueprint
            .supportingTopics,
          20
        ),

      excludedTopics:
        stringArray(
          searchBlueprint
            .excludedTopics,
          16
        ),

      requiredEntities:
        stringArray(
          searchBlueprint
            .requiredEntities,
          20
        ),

      questions:
        stringArray(
          searchBlueprint
            .questions,
          16
        ),

      gaps:
        stringArray(
          searchBlueprint
            .gaps,
          16
        ),
    },

    sections,

    article: {
      title:
        clipped(
          article.title,
          400
        ),

      metaDescription:
        clipped(
          article
            .metaDescription,
          600
        ),

      h1:
        clipped(
          article.h1,
          400
        ),

      /*
       * Keep the actual article intact.
       * We remove duplicated runtime bulk instead of hiding
       * reader-facing prose from semantic critics.
       */
      bodyMarkdown:
        article
          .bodyMarkdown,
    },

    comparisonContext: {
      originalityReferences,
      cannibalizationCandidates,
    },

    writerProvenance:
      pick(
        provenance,
        [
          "sectionCount",
          "reconciliationWarnCount",
          "semanticWarnCount",
          "repairedSectionCount",
          "repairAttemptCount",
          "executionMode",
        ],
        300
      ),
  });
}


export function serializeMasterArticleSemanticCriticBudgetV1({
  contract,
  run,
  context,
}: {
  contract:
    unknown;

  run:
    unknown;

  context:
    unknown;
}): string {
  /*
   * Minified JSON intentionally reduces provider tokens.
   */
  return JSON.stringify(
    buildMasterArticleSemanticCriticBudgetV1({
      contract,
      run,
      context,
    })
  );
}
