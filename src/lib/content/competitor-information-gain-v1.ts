import type {
  CompetitorCoverageQuality,
} from "./gap-engine";

import type {
  CompetitorPageAnalysis,
} from "./serp-intelligence";


export type CompetitorInformationConfidenceV1 =
  | "INSUFFICIENT"
  | "LOW"
  | "MEDIUM"
  | "HIGH";


export type CompetitorObservedAssetSignalV1 =
  | "TABLE"
  | "VISUAL"
  | "VIDEO"
  | "FAQ_STRUCTURE"
  | "AUTHOR_SIGNAL"
  | "DATE_SIGNAL"
  | "EXTERNAL_REFERENCES";


export interface CompetitorPageFingerprintV1 {
  readonly version:
    "COMPETITOR_PAGE_FINGERPRINT_V1";

  readonly rank:
    number;

  readonly domain:
    string;

  readonly url:
    string;

  readonly pageType:
    CompetitorPageAnalysis["pageType"];

  readonly headings:
    readonly string[];

  readonly questionHeadings:
    readonly string[];

  readonly schemaTypes:
    readonly string[];

  readonly observedAssetSignals:
    readonly CompetitorObservedAssetSignalV1[];
}


export interface CompetitorTopicCoverageV1 {
  readonly topic:
    string;

  readonly fetchedPages:
    number;

  readonly matchedPages:
    number;

  readonly coveragePct:
    number | null;

  readonly coverage:
    CompetitorCoverageQuality;

  readonly matchingRanks:
    readonly number[];
}


export interface CompetitorAssetCoverageV1 {
  readonly signal:
    CompetitorObservedAssetSignalV1;

  readonly fetchedPages:
    number;

  readonly pagesWithSignal:
    number;

  readonly coveragePct:
    number | null;
}


export interface CompetitorInformationGainV1 {
  readonly version:
    "COMPETITOR_INFORMATION_GAIN_V1";

  readonly confidence:
    CompetitorInformationConfidenceV1;

  readonly fingerprints:
    readonly Readonly<CompetitorPageFingerprintV1>[];

  readonly topicCoverage:
    readonly Readonly<CompetitorTopicCoverageV1>[];

  /*
   * Mission topics only.
   *
   * This engine NEVER creates a new topic/query identity.
   */
  readonly informationGainTopics:
    readonly string[];

  /*
   * Observed SERP format gaps only.
   *
   * These are NOT claims that creating any asset will rank.
   */
  readonly assetCoverage:
    readonly Readonly<CompetitorAssetCoverageV1>[];
}


const STOP_WORDS =
  new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "the",
    "to",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "with",
    "you",
    "your",
  ]);


function normalize(
  value:
    string
): string {
  return value
    .toLowerCase()
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9\s]/g,
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
): string[] {
  return normalize(
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
          3 &&
        !STOP_WORDS.has(
          token
        )
    );
}


function semanticSimilarity(
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
    b
  ) {
    return 1;
  }


  if (
    a.includes(
      b
    ) ||
    b.includes(
      a
    )
  ) {
    return 0.9;
  }


  const leftTokens =
    new Set(
      tokens(
        a
      )
    );

  const rightTokens =
    new Set(
      tokens(
        b
      )
    );


  if (
    leftTokens.size ===
      0 ||
    rightTokens.size ===
      0
  ) {
    return 0;
  }


  let intersection =
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
      intersection +=
        1;
    }
  }


  const union =
    new Set([
      ...leftTokens,
      ...rightTokens,
    ]).size;


  return union >
    0
    ? intersection /
        union
    : 0;
}


function headingCoversTopicV1(
  topic:
    string,
  heading:
    string
): boolean {
  const cleanTopic =
    normalize(
      topic
    );

  const cleanHeading =
    normalize(
      heading
    );


  if (
    !cleanTopic ||
    !cleanHeading
  ) {
    return false;
  }


  /*
   * Exact/containment is strong evidence that the information job
   * is explicitly represented.
   */
  if (
    cleanTopic ===
      cleanHeading ||
    cleanHeading.includes(
      cleanTopic
    ) ||
    cleanTopic.includes(
      cleanHeading
    )
  ) {
    return true;
  }


  const topicTokens =
    new Set(
      tokens(
        cleanTopic
      )
    );

  const headingTokens =
    new Set(
      tokens(
        cleanHeading
      )
    );


  if (
    topicTokens.size ===
      0 ||
    headingTokens.size ===
      0
  ) {
    return false;
  }


  let topicTokensMatched =
    0;


  for (
    const token
    of topicTokens
  ) {
    if (
      headingTokens.has(
        token
      )
    ) {
      topicTokensMatched +=
        1;
    }
  }


  /*
   * Mission-topic coverage is deliberately stricter than loose
   * semantic similarity.
   *
   * Example:
   *
   *   "credit monitoring limitations"
   *   vs
   *   "credit monitoring explained"
   *
   * shares the parent entity but does NOT cover the limitations job.
   *
   * Require at least 75% of meaningful topic tokens plus adequate
   * overall overlap.
   */
  const topicCoverage =
    topicTokensMatched /
    topicTokens.size;


  return (
    topicCoverage >=
      0.75 &&
    semanticSimilarity(
      cleanTopic,
      cleanHeading
    ) >=
      0.6
  );
}


function looksLikeQuestion(
  value:
    string
): boolean {
  const clean =
    normalize(
      value
    );

  return (
    value.trim()
      .endsWith(
        "?"
      ) ||
    /^(how|what|why|when|where|who|which|can|could|should|does|do|is|are|will|would)\b/.test(
      clean
    )
  );
}


function observedSignals(
  page:
    Readonly<CompetitorPageAnalysis>
): CompetitorObservedAssetSignalV1[] {
  const output:
    CompetitorObservedAssetSignalV1[] =
      [];


  if (
    (
      page.tableCount ??
      0
    ) >
    0
  ) {
    output.push(
      "TABLE"
    );
  }


  if (
    (
      page.imageCount ??
      0
    ) >=
    2
  ) {
    output.push(
      "VISUAL"
    );
  }


  if (
    (
      page.videoCount ??
      0
    ) >
    0
  ) {
    output.push(
      "VIDEO"
    );
  }


  const schema =
    new Set(
      page.schemaTypes ??
      []
    );


  if (
    (
      page.detailsCount ??
      0
    ) >
      0 ||
    schema.has(
      "FAQPage"
    ) ||
    [
      ...page.h2,
      ...page.h3,
    ].filter(
      looksLikeQuestion
    ).length >=
      2
  ) {
    output.push(
      "FAQ_STRUCTURE"
    );
  }


  if (
    page.authorSignal ===
    true
  ) {
    output.push(
      "AUTHOR_SIGNAL"
    );
  }


  if (
    page.dateSignal ===
    true
  ) {
    output.push(
      "DATE_SIGNAL"
    );
  }


  if (
    (
      page.externalLinkCount ??
      0
    ) >
    0
  ) {
    output.push(
      "EXTERNAL_REFERENCES"
    );
  }


  return output;
}


export function buildCompetitorPageFingerprintsV1(
  competitors:
    readonly Readonly<CompetitorPageAnalysis>[]
): readonly Readonly<CompetitorPageFingerprintV1>[] {
  return Object.freeze(
    competitors
      .filter(
        (
          page
        ) =>
          page.fetched
      )
      .map(
        (
          page
        ) => {
          const headings =
            [
              page.title ??
                "",
              page.h1 ??
                "",
              ...page.h2,
              ...page.h3,
            ]
              .map(
                (
                  value
                ) =>
                  value.trim()
              )
              .filter(
                Boolean
              );


          return Object.freeze({
            version:
              "COMPETITOR_PAGE_FINGERPRINT_V1" as const,

            rank:
              page.rank,

            domain:
              page.domain,

            url:
              page.url,

            pageType:
              page.pageType,

            headings:
              Object.freeze(
                headings
              ),

            questionHeadings:
              Object.freeze(
                headings.filter(
                  looksLikeQuestion
                )
              ),

            schemaTypes:
              Object.freeze([
                ...new Set(
                  page.schemaTypes ??
                  []
                ),
              ]),

            observedAssetSignals:
              Object.freeze(
                observedSignals(
                  page
                )
              ),
          });
        }
      )
  );
}


function coverageQuality({
  matchedPages,
  fetchedPages,
}: {
  readonly matchedPages:
    number;

  readonly fetchedPages:
    number;
}): CompetitorCoverageQuality {
  /*
   * Never claim absence from an under-observed SERP.
   */
  if (
    fetchedPages <
    2
  ) {
    return "UNKNOWN";
  }


  if (
    matchedPages ===
    0
  ) {
    return "NONE";
  }


  const ratio =
    matchedPages /
    fetchedPages;


  return ratio >=
    0.6
    ? "STRONG"
    : "WEAK";
}


function confidenceForPages(
  fetchedPages:
    number
): CompetitorInformationConfidenceV1 {
  if (
    fetchedPages <
    2
  ) {
    return "INSUFFICIENT";
  }

  if (
    fetchedPages <=
    3
  ) {
    return "LOW";
  }

  if (
    fetchedPages <=
    6
  ) {
    return "MEDIUM";
  }

  return "HIGH";
}


export function buildCompetitorInformationGainV1({
  competitors,
  topics,
}: {
  readonly competitors:
    readonly Readonly<CompetitorPageAnalysis>[];

  /*
   * Must be upstream mission topics.
   * No new topics are generated in this function.
   */
  readonly topics:
    readonly string[];
}): Readonly<CompetitorInformationGainV1> {
  const fingerprints =
    buildCompetitorPageFingerprintsV1(
      competitors
    );


  const fetchedPages =
    fingerprints.length;


  const uniqueTopics =
    [
      ...new Map(
        topics
          .map(
            (
              topic
            ) => [
              normalize(
                topic
              ),
              topic.trim(),
            ] as const
          )
          .filter(
            (
              [
                key,
                topic,
              ]
            ) =>
              Boolean(
                key &&
                topic
              )
          )
      ).values(),
    ];


  const topicCoverage:
    CompetitorTopicCoverageV1[] =
      uniqueTopics.map(
        (
          topic
        ) => {
          const matchingRanks =
            fingerprints
              .filter(
                (
                  page
                ) =>
                  page.headings.some(
                    (
                      heading
                    ) =>
                      headingCoversTopicV1(
                        topic,
                        heading
                      )
                  )
              )
              .map(
                (
                  page
                ) =>
                  page.rank
              );


          const matchedPages =
            matchingRanks.length;


          const coveragePct =
            fetchedPages >
              0
              ? Math.round(
                  (
                    matchedPages /
                    fetchedPages
                  ) *
                    1000
                ) /
                10
              : null;


          return Object.freeze({
            topic,

            fetchedPages,

            matchedPages,

            coveragePct,

            coverage:
              coverageQuality({
                matchedPages,
                fetchedPages,
              }),

            matchingRanks:
              Object.freeze(
                matchingRanks
              ),
          });
        }
      );


  const informationGainTopics =
    topicCoverage
      .filter(
        (
          item
        ) =>
          item.coverage ===
            "NONE" ||
          item.coverage ===
            "WEAK"
      )
      .map(
        (
          item
        ) =>
          item.topic
      );


  const signalTypes:
    CompetitorObservedAssetSignalV1[] =
      [
        "TABLE",
        "VISUAL",
        "VIDEO",
        "FAQ_STRUCTURE",
        "AUTHOR_SIGNAL",
        "DATE_SIGNAL",
        "EXTERNAL_REFERENCES",
      ];


  const assetCoverage =
    signalTypes.map(
      (
        signal
      ) => {
        const pagesWithSignal =
          fingerprints.filter(
            (
              page
            ) =>
              page
                .observedAssetSignals
                .includes(
                  signal
                )
          ).length;


        return Object.freeze({
          signal,

          fetchedPages,

          pagesWithSignal,

          coveragePct:
            fetchedPages >
              0
              ? Math.round(
                  (
                    pagesWithSignal /
                    fetchedPages
                  ) *
                    1000
                ) /
                10
              : null,
        });
      }
    );


  return Object.freeze({
    version:
      "COMPETITOR_INFORMATION_GAIN_V1",

    confidence:
      confidenceForPages(
        fetchedPages
      ),

    fingerprints,

    topicCoverage:
      Object.freeze(
        topicCoverage
      ),

    informationGainTopics:
      Object.freeze(
        informationGainTopics
      ),

    assetCoverage:
      Object.freeze(
        assetCoverage
      ),
  });
}


export function applyCompetitorInformationGainV1<
  T extends {
    readonly topic:
      string;

    readonly competitorCoverage:
      CompetitorCoverageQuality;

    readonly originalValueOpportunity:
      boolean;
  }
>({
  opportunities,
  informationGain,
}: {
  readonly opportunities:
    readonly T[];

  readonly informationGain:
    Readonly<CompetitorInformationGainV1>;
}): T[] {
  const observations =
    new Map(
      informationGain
        .topicCoverage
        .map(
          (
            item
          ) => [
            normalize(
              item.topic
            ),
            item,
          ] as const
        )
    );


  return opportunities.map(
    (
      opportunity
    ) => {
      const observation =
        observations.get(
          normalize(
            opportunity.topic
          )
        );


      if (
        !observation ||
        observation.coverage ===
          "UNKNOWN"
      ) {
        return {
          ...opportunity,
        } as T;
      }


      return {
        ...opportunity,

        /*
         * Deterministic fetched-page observation supersedes
         * the model's competitorCoverage classification.
         *
         * Other semantic judgments such as clarity/evidence/action
         * remain untouched because DOM structure alone cannot prove them.
         */
        competitorCoverage:
          observation.coverage,

        /*
         * Existing true is never weakened.
         *
         * Rare/missing competitor coverage can only promote an
         * existing mission topic into Original Value consideration.
         * It never creates a new topic.
         */
        originalValueOpportunity:
          opportunity
            .originalValueOpportunity ||
          observation.coverage ===
            "NONE" ||
          observation.coverage ===
            "WEAK",
      } as T;
    }
  );
}
