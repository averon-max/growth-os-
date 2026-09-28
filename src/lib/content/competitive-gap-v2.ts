import type {
  SerpConsensusSignalV2,
  SerpConsensusV2,
} from "./serp-consensus-v2";


export type CompetitiveGapConfidenceV2 =
  | "HIGH"
  | "MEDIUM"
  | "LOW";


export interface CompetitiveTopicAssessmentV2 {
  topic:
    string;

  role:
    | "REQUIRED"
    | "SUPPORTING";

  consensusMatch:
    string | null;

  consensusShare:
    number | null;

  status:
    | "SERP_CONSENSUS"
    | "LOW_CONSENSUS_OPPORTUNITY";
}


export interface CompetitiveGapV2 {
  version:
    "COMPETITIVE_GAP_V2";

  confidence:
    CompetitiveGapConfidenceV2;

  topicAssessments:
    readonly Readonly<
      CompetitiveTopicAssessmentV2
    >[];

  consensusStrengths:
    readonly string[];

  lowConsensusMissionTopics:
    readonly string[];

  reviewOnlyConsensusTopics:
    readonly string[];

  recurringQuestions:
    readonly string[];

  recurringEntities:
    readonly string[];

  rules:
    readonly string[];
}


interface ExpectedCoverageLike {
  requiredTopics:
    readonly string[];

  supportingTopics:
    readonly string[];
}


function normalize(
  value:
    string
): string {
  return value
    .toLowerCase()
    .replace(
      /[^\p{L}\p{N}]+/gu,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


function tokens(
  value:
    string
): Set<string> {
  return new Set(
    normalize(
      value
    )
      .split(
        " "
      )
      .filter(
        (
          token
        ) =>
          token.length >=
          3
      )
  );
}


function similarity(
  left:
    string,
  right:
    string
): number {
  const a =
    normalize(
      left
    );

  const b =
    normalize(
      right
    );

  if (
    !a ||
    !b
  ) {
    return 0;
  }

  if (
    a ===
      b ||
    a.includes(
      b
    ) ||
    b.includes(
      a
    )
  ) {
    return 1;
  }

  const leftTokens =
    tokens(
      a
    );

  const rightTokens =
    tokens(
      b
    );

  if (
    leftTokens.size ===
      0 ||
    rightTokens.size ===
      0
  ) {
    return 0;
  }

  let overlap =
    0;

  for (
    const token
    of leftTokens
  ) {
    if (
      rightTokens.has(
        token
      )
    ) {
      overlap +=
        1;
    }
  }

  return (
    overlap /
    Math.min(
      leftTokens.size,
      rightTokens.size
    )
  );
}


function bestMatch(
  topic:
    string,
  signals:
    readonly Readonly<
      SerpConsensusSignalV2
    >[]
): Readonly<
  SerpConsensusSignalV2
> | null {
  let best:
    Readonly<
      SerpConsensusSignalV2
    > |
    null =
      null;

  let bestScore =
    0;

  for (
    const signal
    of signals
  ) {
    const score =
      similarity(
        topic,
        signal.value
      );

    if (
      score >
      bestScore
    ) {
      best =
        signal;

      bestScore =
        score;
    }
  }

  return bestScore >=
    0.5
    ? best
    : null;
}


function unique(
  values:
    readonly string[]
): readonly string[] {
  const seen =
    new Set<string>();

  const output:
    string[] =
      [];

  for (
    const raw
    of values
  ) {
    const value =
      raw.trim();

    const key =
      normalize(
        value
      );

    if (
      !value ||
      !key ||
      seen.has(
        key
      )
    ) {
      continue;
    }

    seen.add(
      key
    );

    output.push(
      value
    );
  }

  return Object.freeze(
    output
  );
}


export function buildCompetitiveGapV2({
  consensus,
  expectedCoverage,
}: {
  consensus:
    Readonly<
      SerpConsensusV2
    >;

  expectedCoverage:
    Readonly<
      ExpectedCoverageLike
    >;
}): Readonly<
  CompetitiveGapV2
> {
  const expected = [
    ...expectedCoverage
      .requiredTopics
      .map(
        (
          topic
        ) => ({
          topic,
          role:
            "REQUIRED" as const,
        })
      ),

    ...expectedCoverage
      .supportingTopics
      .map(
        (
          topic
        ) => ({
          topic,
          role:
            "SUPPORTING" as const,
        })
      ),
  ];


  const topicAssessments =
    expected.map(
      (
        item
      ) => {
        const match =
          bestMatch(
            item.topic,
            consensus.topics
          ) ??
          bestMatch(
            item.topic,
            consensus.headingThemes
          );

        return Object.freeze({
          topic:
            item.topic,

          role:
            item.role,

          consensusMatch:
            match?.value ??
            null,

          consensusShare:
            match?.weightedShare ??
            null,

          status:
            match
              ? "SERP_CONSENSUS" as const
              : "LOW_CONSENSUS_OPPORTUNITY" as const,
        });
      }
    );


  const lowConsensusMissionTopics =
    unique(
      topicAssessments
        .filter(
          (
            item
          ) =>
            item.status ===
            "LOW_CONSENSUS_OPPORTUNITY"
        )
        .map(
          (
            item
          ) =>
            item.topic
        )
    );


  const consensusStrengths =
    unique([
      ...consensus.topics
        .slice(
          0,
          8
        )
        .map(
          (
            item
          ) =>
            `Recurring SERP topic: ${item.value}`
        ),

      ...consensus.pageTypes
        .slice(
          0,
          3
        )
        .map(
          (
            item
          ) =>
            `Recurring SERP page type: ${item.value}`
        ),

      ...consensus.headingThemes
        .slice(
          0,
          5
        )
        .map(
          (
            item
          ) =>
            `Recurring information job: ${item.value}`
        ),
    ]);


  /*
   * Recurring SERP topics outside mission coverage are REVIEW ONLY.
   * SERP consensus must not silently expand the user's Search Mission.
   */
  const reviewOnlyConsensusTopics =
    unique(
      consensus.topics
        .filter(
          (
            signal
          ) =>
            !expected.some(
              (
                item
              ) =>
                similarity(
                  item.topic,
                  signal.value
                ) >=
                0.5
            )
        )
        .map(
          (
            signal
          ) =>
            signal.value
        )
    );


  return Object.freeze({
    version:
      "COMPETITIVE_GAP_V2",

    confidence:
      consensus.confidence,

    topicAssessments:
      Object.freeze(
        topicAssessments
      ),

    consensusStrengths,

    lowConsensusMissionTopics,

    reviewOnlyConsensusTopics,

    recurringQuestions:
      unique(
        consensus.questions
          .slice(
            0,
            10
          )
          .map(
            (
              item
            ) =>
              item.value
          )
      ),

    recurringEntities:
      unique(
        consensus.entities
          .slice(
            0,
            10
          )
          .map(
            (
              item
            ) =>
              item.value
          )
      ),

    rules:
      Object.freeze([
        "MISSION_COVERAGE_HAS_PRIORITY_OVER_SERP_CONSENSUS",
        "UNMODELED_SERP_TOPICS_ARE_REVIEW_ONLY",
        "LOW_CONSENSUS_IS_OPPORTUNITY_NOT_AUTOMATIC_REQUIREMENT",
        "NO_COMPETITOR_STRUCTURE_COPYING",
      ]),
  });
}
