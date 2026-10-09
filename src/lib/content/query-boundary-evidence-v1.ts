import type {
  QueryIntent,
} from "./intent-boundary";


function compactV1(
  value:
    string
): string {
  return value
    .trim()
    .toLocaleLowerCase(
      "en-US"
    )
    .replace(
      /[^\p{L}\p{N}]+/gu,
      ""
    );
}


function domainBrandV1(
  rawDomain:
    string
): string | null {
  const value =
    rawDomain
      .trim()
      .toLocaleLowerCase(
        "en-US"
      )
      .replace(
        /^https?:\/\//,
        ""
      )
      .split("/")[0]
      ?.replace(
        /^www\./,
        ""
      ) ??
    "";


  const label =
    value
      .split(".")
      .filter(
        Boolean
      )[0] ??
    "";


  const compact =
    compactV1(
      label
    );


  /*
   * Very short labels create unacceptable false positives.
   */
  return compact.length >=
    5
    ? compact
    : null;
}


export interface QueryBoundaryEvidenceV1 {
  readonly foreignEntityEvidence:
    boolean;

  readonly matchedForeignBrands:
    readonly string[];

  readonly sameMissionEvidence:
    boolean;
}


/*
 * QUERY_BOUNDARY_EVIDENCE_V1
 *
 * Semantic responsibility:
 * GPT may propose that an observed same-intent query belongs
 * to the current article by selecting it in plan.questions.
 *
 * Deterministic responsibility:
 * - query must actually be observed;
 * - intent must match;
 * - a foreign SERP brand/entity must veto same-page authority.
 *
 * No LLM.
 * No network.
 * No keyword-volume invention.
 */
export function deriveQueryBoundaryEvidenceV1({
  query,
  missionTopic,
  selectedQuestion,
  queryIntent,
  missionIntent,
  serpDomains,
}: {
  query:
    string;

  missionTopic:
    string;

  selectedQuestion:
    boolean;

  queryIntent:
    QueryIntent;

  missionIntent:
    QueryIntent;

  serpDomains:
    readonly string[];
}): Readonly<QueryBoundaryEvidenceV1> {
  const compactQuery =
    compactV1(
      query
    );

  const compactMission =
    compactV1(
      missionTopic
    );


  const foreignBrands =
    [
      ...new Set(
        serpDomains
          .map(
            domainBrandV1
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(
                value
              )
          )
          /*
           * A domain token already contained in the mission itself
           * is not evidence of a foreign entity.
           *
           * Example:
           * credit.com must not make every "credit monitoring"
           * query foreign merely because "credit" overlaps.
           */
          .filter(
            (
              brand
            ) =>
              !compactMission.includes(
                brand
              )
          )
          .filter(
            (
              brand
            ) =>
              compactQuery.includes(
                brand
              )
          )
      ),
    ];


  const foreignEntityEvidence =
    foreignBrands.length >
    0;


  return Object.freeze({
    foreignEntityEvidence,

    matchedForeignBrands:
      Object.freeze(
        foreignBrands
      ),

    sameMissionEvidence:
      selectedQuestion &&
      queryIntent ===
        missionIntent &&
      !foreignEntityEvidence,
  });
}


export function brandAwareSubIntentV1({
  subIntent,
  foreignEntityEvidence,
}: {
  subIntent:
    string;

  foreignEntityEvidence:
    boolean;
}): string {
  const normalized =
    subIntent.trim() ||
    "general";


  /*
   * QueryGraph already treats BRAND / COMPETITOR sub-intents
   * as foreignEntityEvidence.
   *
   * Preserve its existing authority instead of creating a new
   * boundary implementation.
   */
  return foreignEntityEvidence
    ? `BRAND ${normalized}`
    : normalized;
}
