import {
  analyzeQueryOwnership,
  isExplicitInformationalTopic,
} from "./query-ownership";

import {
  topicAffinity,
  type TopicAuthorityProfile,
} from "./topic-authority";

export type KeywordDecisionIntent =
  | "INFORMATIONAL"
  | "COMMERCIAL"
  | "TRANSACTIONAL"
  | "NAVIGATIONAL";

export type KeywordDecisionStatus =
  | "SELECTED"
  | "NO_GO";

export type KeywordDecisionConfidence =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export interface KeywordDecisionCandidateInput {
  keyword: string;
  score: number;

  intent:
    KeywordDecisionIntent;

  searchVolume:
    number | null;

  difficulty:
    number | null;

  existingPosition:
    number | null;

  impressions:
    number;

  clicks:
    number;

  businessRelevance:
    number;

  authority:
    TopicAuthorityProfile;
}

export interface KeywordDecisionCandidate {
  keyword: string;

  eligible:
    boolean;

  decisionScore:
    number;

  originalScore:
    number;

  intent:
    KeywordDecisionIntent;

  topicAffinity:
    number;

  evidenceConfidence:
    KeywordDecisionConfidence;

  metrics: {
    searchVolume:
      number | null;

    difficulty:
      number | null;

    existingPosition:
      number | null;

    impressions:
      number;

    clicks:
      number;

    observedCtr:
      number | null;

    authorityStrength:
      number;

    authorityConfidence:
      KeywordDecisionConfidence;
  };

  components: {
    base:
      number;

    intent:
      number;

    business:
      number;

    topicalFit:
      number;

    topicalAuthority:
      number;

    gscOpportunity:
      number;

    difficulty:
      number;

    demand:
      number;

    evidencePenalty:
      number;
  };

  blockers:
    string[];

  reasons:
    string[];
}

export interface KeywordDecisionResult {
  status:
    KeywordDecisionStatus;

  confidence:
    KeywordDecisionConfidence;

  primary:
    KeywordDecisionCandidate | null;

  secondary:
    KeywordDecisionCandidate[];

  ranked:
    KeywordDecisionCandidate[];

  reasons:
    string[];
}

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}

function clamp01(
  value: number
): number {
  return clamp(
    value,
    0,
    1
  );
}

function round(
  value: number,
  digits = 2
): number {
  const multiplier =
    10 ** digits;

  return (
    Math.round(
      value *
        multiplier
    ) /
    multiplier
  );
}

function logarithmicScore(
  value: number,
  reference: number
): number {
  if (
    value <= 0
  ) {
    return 0;
  }

  return clamp01(
    Math.log1p(
      value
    ) /
      Math.log1p(
        reference
      )
  );
}

function evidenceConfidence(
  candidate:
    KeywordDecisionCandidateInput
): KeywordDecisionConfidence {
  let points =
    0;

  if (
    candidate.searchVolume !==
      null
  ) {
    points +=
      1;
  }

  if (
    candidate.difficulty !==
      null
  ) {
    points +=
      1;
  }

  if (
    candidate.impressions >
      0
  ) {
    points +=
      2;
  }

  if (
    candidate.existingPosition !==
      null
  ) {
    points +=
      2;
  }

  if (
    candidate.authority
      .confidence ===
    "HIGH"
  ) {
    points +=
      2;
  } else if (
    candidate.authority
      .confidence ===
    "MEDIUM"
  ) {
    points +=
      1;
  }

  if (
    candidate.authority
      .relevantQueries >
      0
  ) {
    points +=
      1;
  }

  if (
    points >=
    6
  ) {
    return "HIGH";
  }

  if (
    points >=
    3
  ) {
    return "MEDIUM";
  }

  return "LOW";
}

function gscOpportunityScore({
  impressions,
  clicks,
  position,
}: {
  impressions: number;
  clicks: number;
  position: number | null;
}): number {
  if (
    impressions <=
      0 &&
    position ===
      null
  ) {
    return 0;
  }

  const impressionComponent =
    logarithmicScore(
      impressions,
      5000
    ) *
    4;

  const clickComponent =
    logarithmicScore(
      clicks,
      500
    ) *
    1.5;

  let positionComponent =
    0;

  if (
    position !==
      null &&
    position > 0
  ) {
    if (
      position <=
      3
    ) {
      positionComponent =
        1.5;
    } else if (
      position <=
      10
    ) {
      positionComponent =
        6;
    } else if (
      position <=
      20
    ) {
      positionComponent =
        5;
    } else if (
      position <=
      50
    ) {
      positionComponent =
        2.5;
    } else if (
      position <=
      100
    ) {
      positionComponent =
        1;
    }
  }

  return round(
    clamp(
      impressionComponent +
        clickComponent +
        positionComponent,
      0,
      11.5
    )
  );
}

function difficultyScore({
  difficulty,
  position,
  authorityStrength,
}: {
  difficulty: number | null;
  position: number | null;
  authorityStrength: number;
}): number {
  if (
    difficulty ===
    null
  ) {
    return 0;
  }

  if (
    difficulty <=
    25
  ) {
    return 6;
  }

  if (
    difficulty <=
    40
  ) {
    return 4;
  }

  if (
    difficulty <=
    55
  ) {
    return 2;
  }

  if (
    difficulty <=
    65
  ) {
    return 0;
  }

  const hasTraction =
    position !==
      null &&
    position <=
      20;

  const hasAuthority =
    authorityStrength >=
      0.6;

  if (
    difficulty <=
    75
  ) {
    return hasTraction ||
      hasAuthority
      ? -1
      : -4;
  }

  return hasTraction ||
    hasAuthority
    ? -3
    : -8;
}

function demandScore(
  volume: number | null
): number {
  if (
    volume ===
      null ||
    volume <=
      0
  ) {
    return 0;
  }

  return round(
    logarithmicScore(
      volume,
      10000
    ) *
      5
  );
}

function scoreCandidate({
  topic,
  topicIntent,
  candidate,
}: {
  topic: string;

  topicIntent:
    KeywordDecisionIntent;

  candidate:
    KeywordDecisionCandidateInput;
}): KeywordDecisionCandidate {
  const ownership =
    analyzeQueryOwnership({
      topic,
      keyword:
        candidate.keyword,
    });
  const blockers:
    string[] =
      [];

  if (
    ownership.status ===
    "UNREQUESTED_ENTITY_MODIFIER"
  ) {
    blockers.push(
      "UNREQUESTED_ENTITY_MODIFIER"
    );
  }

  const reasons:
    string[] =
      [];

  const normalizedKeyword =
    candidate.keyword.trim();

  const affinity =
    topicAffinity(
      topic,
      normalizedKeyword
    );

  const confidence =
    evidenceConfidence(
      candidate
    );

  if (
    normalizedKeyword.length ===
    0
  ) {
    blockers.push(
      "EMPTY_KEYWORD"
    );
  }

  if (
    candidate.intent !==
    topicIntent
  ) {
    blockers.push(
      "INTENT_MISMATCH"
    );
  } else {
    reasons.push(
      "SEARCH_INTENT_MATCH"
    );
  }

  if (
    candidate.businessRelevance <=
    0
  ) {
    blockers.push(
      "NO_BUSINESS_RELEVANCE"
    );
  } else {
    reasons.push(
      "BUSINESS_RELEVANCE_PRESENT"
    );
  }

  const base =
    clamp(
      candidate.score,
      0,
      100
    ) *
    0.45;

  const intent =
    candidate.intent ===
    topicIntent
      ? 12
      : 0;

  const business =
    clamp01(
      candidate.businessRelevance /
        20
    ) *
    8;

  const topicalFit =
    affinity *
    8;

  const topicalAuthority =
    candidate.authority
      .strength *
    12;

  const gscOpportunity =
    gscOpportunityScore({
      impressions:
        candidate.impressions,

      clicks:
        candidate.clicks,

      position:
        candidate.existingPosition,
    });

  const difficulty =
    difficultyScore({
      difficulty:
        candidate.difficulty,

      position:
        candidate.existingPosition,

      authorityStrength:
        candidate.authority
          .strength,
    });

  const demand =
    demandScore(
      candidate.searchVolume
    );

  const noDemandEvidence =
    (
      candidate.searchVolume ===
        null ||
      candidate.searchVolume <=
        0
    ) &&
    candidate.impressions <=
      0;

  const noAuthorityEvidence =
    candidate.authority
      .strength <
      0.15;

  const evidencePenalty =
    confidence ===
        "LOW" &&
      noDemandEvidence &&
      noAuthorityEvidence
      ? -10
      : 0;

  if (
    candidate.impressions >
    0
  ) {
    reasons.push(
      "GSC_IMPRESSIONS_PRESENT"
    );
  }

  if (
    candidate.existingPosition !==
      null &&
    candidate.existingPosition >
      3 &&
    candidate.existingPosition <=
      20
  ) {
    reasons.push(
      "GSC_NEAR_WIN"
    );
  }

  if (
    candidate.authority
      .strength >=
    0.5
  ) {
    reasons.push(
      "TOPICAL_AUTHORITY_PRESENT"
    );
  }

  if (
    candidate.searchVolume !==
      null &&
    candidate.searchVolume >
      0
  ) {
    reasons.push(
      "SEARCH_DEMAND_PRESENT"
    );
  }

  if (
    candidate.difficulty !==
      null &&
    candidate.difficulty >=
      76
  ) {
    reasons.push(
      "HIGH_KEYWORD_DIFFICULTY"
    );
  }

  if (
    confidence ===
    "LOW"
  ) {
    reasons.push(
      "LOW_EVIDENCE_CONFIDENCE"
    );
  }

  const rawScore =
    base +
    intent +
    business +
    topicalFit +
    topicalAuthority +
    gscOpportunity +
    difficulty +
    demand +
    evidencePenalty;

  const observedCtr =
    candidate.impressions >
      0
      ? candidate.clicks /
        candidate.impressions
      : null;

  return {
    keyword:
      candidate.keyword,

    eligible:
      blockers.length ===
      0,

    decisionScore:
      round(
        clamp(
          rawScore,
          0,
          100
        )
      ),

    originalScore:
      candidate.score,

    intent:
      candidate.intent,

    topicAffinity:
      affinity,

    evidenceConfidence:
      confidence,

    metrics: {
      searchVolume:
        candidate.searchVolume,

      difficulty:
        candidate.difficulty,

      existingPosition:
        candidate.existingPosition,

      impressions:
        candidate.impressions,

      clicks:
        candidate.clicks,

      observedCtr:
        observedCtr ===
          null
          ? null
          : round(
              observedCtr,
              4
            ),

      authorityStrength:
        candidate.authority
          .strength,

      authorityConfidence:
        candidate.authority
          .confidence,
    },

    components: {
      base:
        round(
          base
        ),

      intent:
        round(
          intent
        ),

      business:
        round(
          business
        ),

      topicalFit:
        round(
          topicalFit
        ),

      topicalAuthority:
        round(
          topicalAuthority
        ),

      gscOpportunity:
        round(
          gscOpportunity
        ),

      difficulty:
        round(
          difficulty
        ),

      demand:
        round(
          demand
        ),

      evidencePenalty:
        round(
          evidencePenalty
        ),
    },

    blockers,

    reasons:
      Array.from(
        new Set(
          reasons
        )
      ),
  };
}

function decisionConfidence(
  primary:
    KeywordDecisionCandidate,
  runnerUp:
    KeywordDecisionCandidate | null
): KeywordDecisionConfidence {
  const margin =
    runnerUp
      ? primary.decisionScore -
        runnerUp.decisionScore
      : primary.decisionScore;

  if (
    primary.evidenceConfidence ===
      "HIGH" &&
    margin >=
      7
  ) {
    return "HIGH";
  }

  if (
    primary.evidenceConfidence !==
      "LOW" &&
    margin >=
      3
  ) {
    return "MEDIUM";
  }

  return "LOW";
}

export function buildKeywordDecisionShadow({
  topic,
  topicIntent,
  candidates,
}: {
  topic: string;

  topicIntent:
    KeywordDecisionIntent;

  candidates:
    KeywordDecisionCandidateInput[];
}): KeywordDecisionResult {
  const ranked =
    candidates
      .map(
        (candidate) =>
          scoreCandidate({
            topic,
            topicIntent,
            candidate,
          })
      )
      .sort(
        (
          a,
          b
        ) => {
          if (
            a.eligible !==
            b.eligible
          ) {
            return a.eligible
              ? -1
              : 1;
          }

          return (
            b.decisionScore -
            a.decisionScore
          );
        }
      );

  const eligible =
    ranked.filter(
      (item) =>
        item.eligible
    );

  /*
   * COLD_START_EXACT_INFORMATIONAL_MISSION_V2
   *
   * On a new site, missing GSC/rank/authority history must not let
   * a modifier such as "free ..." displace the safe exact mission.
   *
   * Ownership, entity and intent hard gates already ran before here.
   */
  const exactTopicMissionCandidates =
    eligible.filter(
      (item) =>
        analyzeQueryOwnership({
          topic,

          keyword:
            item.keyword,
        }).status ===
        "EXACT_TOPIC"
    );


  const exactInformationalMission =
    isExplicitInformationalTopic(
      topic
    )
      ? exactTopicMissionCandidates[0] ??
        null
      : exactTopicMissionCandidates.find(
          (item) =>
            isExplicitInformationalTopic(
              item.keyword
            ) &&
            item.evidenceConfidence ===
              "LOW" &&
            item.metrics.impressions ===
              0 &&
            item.metrics.existingPosition ===
              null &&
            item.metrics.authorityStrength <
              0.25 &&
            (
              (
                item.metrics.searchVolume ??
                0
              ) >
                0 ||
              item.metrics.difficulty !==
                null
            )
        ) ??
        null;


  const best =
    exactInformationalMission ??
    eligible[0] ??
    null;

  if (
    !best
  ) {
    return {
      status:
        "NO_GO",

      confidence:
        "LOW",

      primary:
        null,

      secondary:
        [],

      ranked,

      reasons: [
        "NO_ELIGIBLE_KEYWORD",
      ],
    };
  }

  const runnerUp =
    eligible.find(
      (item) =>
        item.keyword !==
        best.keyword
    ) ??
    null;

  const hasEvidence =
    best.evidenceConfidence !==
      "LOW" ||
    best.metrics.impressions >
      0 ||
    (
      best.metrics
        .searchVolume !==
        null &&
      best.metrics
        .searchVolume >
        0
    ) ||
    best.metrics
      .authorityStrength >=
      0.25;

  const exactInformationalMissionWithLimitedEvidence =
    exactInformationalMission !==
      null &&
    exactInformationalMission.keyword ===
      best.keyword &&
    (
      best.decisionScore <
        55 ||
      !hasEvidence
    );

  if (
    (
      best.decisionScore <
        55 ||
      !hasEvidence
    ) &&
    !exactInformationalMissionWithLimitedEvidence
  ) {
    return {
      status:
        "NO_GO",

      confidence:
        "LOW",

      primary:
        best,

      secondary:
        [],

      ranked,

      reasons: [
        best.decisionScore <
        55
          ? "INSUFFICIENT_DECISION_SCORE"
          : "INSUFFICIENT_EVIDENCE",
      ],
    };
  }

  /*
   * MINIMAL_SECONDARY_COVERAGE_SET_V1
   *
   * No fixed keyword count.
   * No arbitrary "8 secondary keywords".
   * No arbitrary secondary score >= 50.
   *
   * Start with eligible, same-intent, topically-related observed
   * queries. Add a secondary only when it contributes a distinct
   * search concept not already represented by the primary or by
   * an earlier selected secondary.
   */
  const secondaryCoverageStopWords =
    new Set([
      "a",
      "an",
      "and",
      "are",
      "for",
      "from",
      "how",
      "in",
      "is",
      "of",
      "on",
      "or",
      "the",
      "to",
      "what",
      "when",
      "where",
      "which",
      "with",
      "your",
    ]);


  const coverageTerms = (
    value:
      string
  ): string[] =>
    (
      value
        .toLowerCase()
        .match(
          /[a-z0-9]+/g
        ) ??
      []
    )
      .filter(
        (
          token
        ) =>
          token.length >=
            2 &&
          !secondaryCoverageStopWords.has(
            token
          )
      );


  const representedTerms =
    new Set(
      coverageTerms(
        best.keyword
      )
    );


  const secondary:
    typeof eligible =
      [];


  for (
    const item
    of eligible
  ) {
    if (
      item.keyword ===
        best.keyword ||
      item.intent !==
        best.intent ||
      topicAffinity(
        best.keyword,
        item.keyword
      ) <
        0.34
    ) {
      continue;
    }


    const terms =
      coverageTerms(
        item.keyword
      );


    const addsDistinctCoverage =
      terms.some(
        (
          term
        ) =>
          !representedTerms.has(
            term
          )
      );


    if (
      !addsDistinctCoverage
    ) {
      continue;
    }


    if (secondary.length >= 8) {
      break;
    }

    secondary.push(
      item
    );


    for (
      const term
      of terms
    ) {
      representedTerms.add(
        term
      );
    }
  }

  /*
   * SECONDARY_QUERY_COVERAGE_V2
   *
   * Preserve concept-first selection above, then allow distinct
   * same-intent search formulations even when all individual
   * tokens have already appeared. Never add ineligible queries,
   * different intents, or weakly related topics.
   */
  const maxSecondaryKeywords = 8;

  const selectedNormalizedKeywords =
    new Set(
      [best, ...secondary].map(
        (item) =>
          item.keyword
            .normalize("NFKC")
            .toLowerCase()
            .replace(/\\s+/g, " ")
            .trim()
      )
    );

  for (const item of eligible) {
    if (secondary.length >= maxSecondaryKeywords) {
      break;
    }

    if (
      item.keyword === best.keyword ||
      item.intent !== best.intent ||
      topicAffinity(best.keyword, item.keyword) < 0.34
    ) {
      continue;
    }

    const normalized =
      item.keyword
        .normalize("NFKC")
        .toLowerCase()
        .replace(/\\s+/g, " ")
        .trim();

    if (selectedNormalizedKeywords.has(normalized)) {
      continue;
    }

    const terms = coverageTerms(item.keyword);

    if (terms.length < 2) {
      continue;
    }

    // Keep alternative formulations that have meaningful
    // evidence, rather than adding weak suggestions to fill a quota.
    const hasObservedDemand =
      (item.metrics.searchVolume ?? 0) > 0 ||
      item.metrics.impressions > 0;

    if (!hasObservedDemand) {
      continue;
    }

    secondary.push(item);
    selectedNormalizedKeywords.add(normalized);
  }

  return {
    status:
      "SELECTED",

    confidence:
      decisionConfidence(
        best,
        runnerUp
      ),

    primary:
      best,

    secondary,

    ranked,

    reasons:
      exactInformationalMissionWithLimitedEvidence
        ? [
            "PRIMARY_PASSED_HARD_GATES",
            "EXACT_INFORMATIONAL_MISSION_SELECTED_WITH_LIMITED_EVIDENCE",
          ]
        : [
            "PRIMARY_PASSED_HARD_GATES",
            "PRIMARY_HAS_SUFFICIENT_EVIDENCE",
          ],
  };
}
