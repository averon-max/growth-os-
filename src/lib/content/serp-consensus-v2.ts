export type SerpConsensusConfidenceV2 =
  | "HIGH"
  | "MEDIUM"
  | "LOW";


export interface SerpConsensusSignalV2 {
  value:
    string;

  normalizedValue:
    string;

  supportCount:
    number;

  observedResultCount:
    number;

  weightedShare:
    number;

  sourceRanks:
    readonly number[];
}


export interface SerpConsensusV2 {
  version:
    "SERP_CONSENSUS_V2";

  observedResultCount:
    number;

  analyzedResultCount:
    number;

  confidence:
    SerpConsensusConfidenceV2;

  pageTypes:
    readonly Readonly<
      SerpConsensusSignalV2
    >[];

  topics:
    readonly Readonly<
      SerpConsensusSignalV2
    >[];

  entities:
    readonly Readonly<
      SerpConsensusSignalV2
    >[];

  questions:
    readonly Readonly<
      SerpConsensusSignalV2
    >[];

  headingThemes:
    readonly Readonly<
      SerpConsensusSignalV2
    >[];

  /** Repeated factual DOM phrases; never a keyword-density prescription. */
  bodyTermThemes:
    readonly Readonly<SerpConsensusSignalV2>[];

  wordCountObservation:
    Readonly<{
      observedCount:
        number;

      median:
        number | null;

      generationTarget:
        false;
    }>;

  rules:
    readonly string[];
}


type UnknownRecord =
  Record<string, unknown>;


interface Accumulator {
  display:
    string;

  count:
    number;

  weight:
    number;

  ranks:
    number[];
}


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
    ? value
        .replace(
          /\s+/g,
          " "
        )
        .trim()
    : "";
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
    const display =
      clean(
        raw
      );

    const key =
      normalize(
        display
      );

    if (
      !display ||
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
      display
    );
  }

  return output;
}


function finitePositiveInteger(
  value:
    unknown
): number | null {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    ) &&
    value >
      0
  )
    ? Math.floor(
        value
      )
    : null;
}


function addSignals({
  accumulator,
  values,
  rank,
  weight,
}: {
  accumulator:
    Map<
      string,
      Accumulator
    >;

  values:
    readonly string[];

  rank:
    number;

  weight:
    number;
}): void {
  for (
    const display
    of values
  ) {
    const key =
      normalize(
        display
      );

    if (!key) {
      continue;
    }

    const existing =
      accumulator.get(
        key
      );

    if (existing) {
      existing.count +=
        1;

      existing.weight +=
        weight;

      existing.ranks.push(
        rank
      );

      continue;
    }

    accumulator.set(
      key,
      {
        display,
        count:
          1,
        weight,
        ranks: [
          rank,
        ],
      }
    );
  }
}


function consensusSignals({
  accumulator,
  analyzedResultCount,
  totalWeight,
}: {
  accumulator:
    ReadonlyMap<
      string,
      Accumulator
    >;

  analyzedResultCount:
    number;

  totalWeight:
    number;
}): readonly Readonly<
  SerpConsensusSignalV2
>[] {
  if (
    analyzedResultCount <
      2 ||
    totalWeight <=
      0
  ) {
    return Object.freeze(
      []
    );
  }

  /*
   * Consensus means repeated observation.
   *
   * We intentionally do NOT turn a one-off competitor feature
   * into a requirement.
   */
  const minimumCount =
    Math.max(
      2,
      Math.ceil(
        analyzedResultCount *
        0.3
      )
    );

  return Object.freeze(
    [
      ...accumulator
        .entries(),
    ]
      .filter(
        (
          [
            ,
            value,
          ]
        ) =>
          value.count >=
          minimumCount
      )
      .map(
        (
          [
            normalizedValue,
            value,
          ]
        ) =>
          Object.freeze({
            value:
              value.display,

            normalizedValue,

            supportCount:
              value.count,

            observedResultCount:
              analyzedResultCount,

            weightedShare:
              Number(
                (
                  value.weight /
                  totalWeight
                ).toFixed(
                  4
                )
              ),

            sourceRanks:
              Object.freeze([
                ...value.ranks,
              ]),
          })
      )
      .sort(
        (
          left,
          right
        ) =>
          right.weightedShare -
            left.weightedShare ||
          right.supportCount -
            left.supportCount ||
          left.value.localeCompare(
            right.value
          )
      )
  );
}


function median(
  values:
    readonly number[]
): number | null {
  if (
    values.length ===
      0
  ) {
    return null;
  }

  const sorted =
    [
      ...values,
    ].sort(
      (
        left,
        right
      ) =>
        left -
        right
    );

  const middle =
    Math.floor(
      sorted.length /
      2
    );

  if (
    sorted.length %
      2 ===
      1
  ) {
    return (
      sorted[
        middle
      ] ??
      null
    );
  }

  const left =
    sorted[
      middle -
      1
    ];

  const right =
    sorted[
      middle
    ];

  if (
    left ===
      undefined ||
    right ===
      undefined
  ) {
    return null;
  }

  return Number(
    (
      (
        left +
        right
      ) /
      2
    ).toFixed(
      1
    )
  );
}


export function buildSerpConsensusV2(
  serpResearch:
    unknown
): Readonly<
  SerpConsensusV2
> {
  const snapshot =
    record(
      serpResearch
    );

  const rawResults =
    Array.isArray(
      snapshot?.results
    )
      ? snapshot.results
      : [];


  const pageTypes =
    new Map<
      string,
      Accumulator
    >();

  const topics =
    new Map<
      string,
      Accumulator
    >();

  const entities =
    new Map<
      string,
      Accumulator
    >();

  const questions =
    new Map<
      string,
      Accumulator
    >();

  const headingThemes =
    new Map<
      string,
      Accumulator
    >();
  const bodyTermThemes = new Map<string,Accumulator>();

  const wordCounts:
    number[] =
      [];

  let analyzedResultCount =
    0;

  let totalWeight =
    0;


  for (
    let index =
      0;
    index <
      rawResults.length;
    index +=
      1
  ) {
    const result =
      record(
        rawResults[
          index
        ]
      );

    if (!result) {
      continue;
    }


    const rank =
      finitePositiveInteger(
        result.rank
      ) ??
      index +
        1;


    /*
     * Rank influences confidence slightly.
     * It NEVER becomes a ranking probability.
     */
    const weight =
      1 /
      Math.sqrt(
        rank
      );


    analyzedResultCount +=
      1;

    totalWeight +=
      weight;


    const pageType =
      clean(
        result.pageType
      );

    if (pageType) {
      addSignals({
        accumulator:
          pageTypes,

        values: [
          pageType,
        ],

        rank,

        weight,
      });
    }


    addSignals({
      accumulator:
        topics,

      values:
        strings(
          result.topics
        ),

      rank,

      weight,
    });


    addSignals({
      accumulator:
        entities,

      values:
        strings(
          result.entities
        ),

      rank,

      weight,
    });


    addSignals({
      accumulator:
        questions,

      values:
        strings(
          result.questions
        ),

      rank,

      weight,
    });


    /*
     * H2 is used only as a recurring information-job signal.
     * Exact competitor heading counts are never copied.
     */
    addSignals({
      accumulator:
        headingThemes,

      values:
        strings(
          result.h2
        ),

      rank,

      weight,
    });


    // Only observed, usable main article profiles can vote on body terms.
    const depth = record(result.contentDepth);
    if(depth?.version === "OBSERVED_COMPETITOR_DOCUMENT_DEPTH_V1" &&
       depth.extraction === "MAIN_ARTICLE" && Array.isArray(depth.bodyTerms)){
      const values = depth.bodyTerms.flatMap(item => {
        const row = record(item);
        const term = clean(row?.term);
        const count = finitePositiveInteger(row?.occurrences);
        return term && count !== null && count >= 2 ? [term] : [];
      });
      addSignals({accumulator:bodyTermThemes,values,rank,weight});
    }

    const wordCount =
      finitePositiveInteger(
        result.wordCount
      );

    if (
      wordCount !==
        null
    ) {
      wordCounts.push(
        wordCount
      );
    }
  }


  const confidence:
    SerpConsensusConfidenceV2 =
      analyzedResultCount >=
        5
        ? "HIGH"
        : analyzedResultCount >=
            3
          ? "MEDIUM"
          : "LOW";


  return Object.freeze({
    version:
      "SERP_CONSENSUS_V2",

    observedResultCount:
      rawResults.length,

    analyzedResultCount,

    confidence,

    pageTypes:
      consensusSignals({
        accumulator:
          pageTypes,

        analyzedResultCount,

        totalWeight,
      }),

    topics:
      consensusSignals({
        accumulator:
          topics,

        analyzedResultCount,

        totalWeight,
      }),

    entities:
      consensusSignals({
        accumulator:
          entities,

        analyzedResultCount,

        totalWeight,
      }),

    questions:
      consensusSignals({
        accumulator:
          questions,

        analyzedResultCount,

        totalWeight,
      }),

    headingThemes:
      consensusSignals({
        accumulator:
          headingThemes,

        analyzedResultCount,

        totalWeight,
      }),

    bodyTermThemes:
      consensusSignals({
        accumulator:bodyTermThemes,
        analyzedResultCount,
        totalWeight,
      }),

    wordCountObservation:
      Object.freeze({
        observedCount:
          wordCounts.length,

        median:
          median(
            wordCounts
          ),

        generationTarget:
          false as const,
      }),

    rules:
      Object.freeze([
        "SERP_CONSENSUS_IS_OBSERVATION_NOT_COPYING",
        "NO_COMPETITOR_WORD_COUNT_TARGET",
        "NO_COMPETITOR_HEADING_COUNT_TARGET",
        "RECURRING_TOPICS_REQUIRE_MULTIPLE_OBSERVATIONS",
        "MISSION_AND_EVIDENCE_REMAIN_AUTHORITATIVE",
      ]),
  });
}
