import type {
  FinalContentPlan,
} from "./final-content-plan";

export type SerpCompetitionShape =
  | "DIVERSE"
  | "MIXED"
  | "CONCENTRATED"
  | "UNKNOWN";

export type SerpStructuralFeasibility =
  | "FAVORABLE"
  | "PLAUSIBLE"
  | "CHALLENGING"
  | "UNKNOWN";

export type SerpFeasibilityConfidence =
  | "HIGH"
  | "MEDIUM"
  | "LOW";

export interface SerpFeasibilityReport {
  scope:
    "SERP_STRUCTURE_ONLY";

  keyword:
    string;

  feasibility:
    SerpStructuralFeasibility;

  confidence:
    SerpFeasibilityConfidence;

  competitionShape:
    SerpCompetitionShape;

  targetFormat:
    string;

  evidence: {
    organicResults:
      number;

    eligiblePages:
      number;

    uniqueDomains:
      number;

    uniqueDomainRatio:
      number | null;

    repeatedDomainShare:
      number | null;

    exactTitleMatchShare:
      number | null;

    dominantPageType:
      string | null;

    dominantPageTypeShare:
      number | null;

    pageTypeMix:
      Record<string, number>;

    aiOverview:
      boolean;

    peopleAlsoAsk:
      boolean;

    questionCount:
      number;

    contentGapCount:
      number;
  };

  requirements:
    string[];

  blockers:
    string[];

  reasons:
    string[];
}

function clamp01(
  value: number
): number {
  return Math.max(
    0,
    Math.min(
      1,
      value
    )
  );
}

function round(
  value: number,
  digits = 4
): number {
  const scale =
    10 ** digits;

  return (
    Math.round(
      value *
        scale
    ) /
    scale
  );
}

function normalize(
  value: string
): string {
  return value
    .toLocaleLowerCase(
      "en-US"
    )
    .normalize(
      "NFKD"
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

function domainKey(
  value: string
): string {
  return value
    .toLocaleLowerCase(
      "en-US"
    )
    .replace(
      /^www\./,
      ""
    )
    .trim();
}

function ratio(
  numerator: number,
  denominator: number
): number | null {
  if (
    denominator <=
    0
  ) {
    return null;
  }

  return round(
    clamp01(
      numerator /
        denominator
    )
  );
}

function dominantPageType(
  pageTypeMix:
    Record<string, number>
): {
  type:
    string | null;

  count:
    number;

  share:
    number | null;
} {
  const entries =
    Object.entries(
      pageTypeMix
    )
      .filter(
        (
          [, count]
        ) =>
          Number.isFinite(
            count
          ) &&
          count >
            0
      )
      .sort(
        (
          a,
          b
        ) =>
          b[1] -
          a[1]
      );

  if (
    entries.length ===
    0
  ) {
    return {
      type:
        null,

      count:
        0,

      share:
        null,
    };
  }

  const total =
    entries.reduce(
      (
        sum,
        [, count]
      ) =>
        sum +
        count,
      0
    );

  const [
    type,
    count,
  ] =
    entries[0];

  return {
    type,

    count,

    share:
      ratio(
        count,
        total
      ),
  };
}

function confidenceForPlan(
  plan:
    FinalContentPlan
): SerpFeasibilityConfidence {
  if (
    !plan.serpAvailable ||
    plan.benchmark
      .organicResults <
      5 ||
    plan.benchmark
      .eligiblePages ===
      0
  ) {
    return "LOW";
  }

  if (
    plan.benchmark
      .organicResults >=
      8 &&
    plan.benchmark
      .eligiblePages >=
      3 &&
    plan.confidence ===
      "HIGH"
  ) {
    return "HIGH";
  }

  return "MEDIUM";
}

export function analyzeSerpFeasibility({
  keyword,
  plan,
}: {
  keyword: string;

  plan:
    FinalContentPlan;
}): SerpFeasibilityReport {
  const blockers:
    string[] =
      [];

  const reasons:
    string[] =
      [];

  const requirements:
    string[] =
      [];

  const organic =
    (
      plan.serpSnapshot
        ?.organic ??
      []
    ).slice(
      0,
      10
    );

  const organicCount =
    organic.length;

  const normalizedKeyword =
    normalize(
      keyword
    );

  const domains =
    organic
      .map(
        (item) =>
          domainKey(
            item.domain
          )
      )
      .filter(
        Boolean
      );

  const uniqueDomains =
    new Set(
      domains
    ).size;

  const uniqueDomainRatio =
    ratio(
      uniqueDomains,
      organicCount
    );

  const repeatedDomainShare =
    uniqueDomainRatio ===
      null
      ? null
      : round(
          1 -
            uniqueDomainRatio
        );

  const exactTitleMatches =
    normalizedKeyword
      ? organic.filter(
          (item) =>
            normalize(
              item.title
            ).includes(
              normalizedKeyword
            )
        ).length
      : 0;

  const exactTitleMatchShare =
    ratio(
      exactTitleMatches,
      organicCount
    );

  const dominant =
    dominantPageType(
      plan.benchmark
        .pageTypeMix
    );

  if (
    !plan.serpAvailable
  ) {
    blockers.push(
      "SERP_UNAVAILABLE"
    );
  }

  if (
    plan.benchmark
      .organicResults <
    5
  ) {
    blockers.push(
      "INSUFFICIENT_ORGANIC_SAMPLE"
    );
  }

  if (
    plan.benchmark
      .eligiblePages ===
    0
  ) {
    blockers.push(
      "NO_BENCHMARK_ELIGIBLE_PAGES"
    );
  }

  if (
    dominant.type
  ) {
    requirements.push(
      `MATCH_SERP_PAGE_TYPE:${dominant.type}`
    );
  }

  const targetFormat =
    String(
      plan.targetFormat
    );

  if (
    targetFormat.includes(
      "TOOL"
    )
  ) {
    requirements.push(
      "REAL_INTERACTIVE_CAPABILITY_REQUIRED"
    );

    reasons.push(
      "SERP_REWARDS_INTERACTIVE_EXPERIENCE"
    );
  }

  if (
    plan.searchFeatures
      .aiOverview
  ) {
    requirements.push(
      "RETRIEVAL_READY_DIRECT_ANSWERS"
    );

    requirements.push(
      "VERIFIABLE_STANDALONE_CLAIMS"
    );

    reasons.push(
      "AI_OVERVIEW_PRESENT"
    );
  }

  if (
    plan.searchFeatures
      .peopleAlsoAsk
  ) {
    requirements.push(
      "SAME_INTENT_QUESTION_COVERAGE"
    );

    reasons.push(
      "PEOPLE_ALSO_ASK_PRESENT"
    );
  }

  if (
    plan.architecture
      .contentGaps
      .length >
    0
  ) {
    requirements.push(
      "EVIDENCE_BACKED_CONTENT_GAPS"
    );
  }

  if (
    plan.pageDecision
      .type ===
      "UPDATE_EXISTING" ||
    plan.pageDecision
      .type ===
      "MERGE_OR_UPDATE"
  ) {
    requirements.push(
      "DO_NOT_CREATE_COMPETING_URL"
    );

    reasons.push(
      "EXISTING_CONTENT_OVERLAP"
    );
  }

  let competitionShape:
    SerpCompetitionShape =
      "UNKNOWN";

  if (
    organicCount >=
    5
  ) {
    const concentratedDomains =
      uniqueDomainRatio !==
        null &&
      uniqueDomainRatio <=
        0.6;

    const concentratedType =
      dominant.share !==
        null &&
      dominant.share >=
        0.8;

    const exactTitleSaturation =
      exactTitleMatchShare !==
        null &&
      exactTitleMatchShare >=
        0.8;

    const diverseDomains =
      uniqueDomainRatio !==
        null &&
      uniqueDomainRatio >=
        0.8;

    const noSingleFormatLock =
      dominant.share ===
        null ||
      dominant.share <
        0.7;

    if (
      concentratedDomains ||
      concentratedType ||
      exactTitleSaturation
    ) {
      competitionShape =
        "CONCENTRATED";

      reasons.push(
        "SERP_COMPETITION_CONCENTRATED"
      );
    } else if (
      diverseDomains &&
      noSingleFormatLock
    ) {
      competitionShape =
        "DIVERSE";

      reasons.push(
        "SERP_HAS_DOMAIN_AND_FORMAT_DIVERSITY"
      );
    } else {
      competitionShape =
        "MIXED";

      reasons.push(
        "SERP_COMPETITION_MIXED"
      );
    }
  }

  let feasibility:
    SerpStructuralFeasibility =
      "UNKNOWN";

  if (
    blockers.length >
    0
  ) {
    feasibility =
      "UNKNOWN";
  } else if (
    competitionShape ===
    "CONCENTRATED"
  ) {
    feasibility =
      "CHALLENGING";
  } else if (
    competitionShape ===
    "DIVERSE"
  ) {
    feasibility =
      "FAVORABLE";
  } else {
    feasibility =
      "PLAUSIBLE";
  }

  /*
   * IMPORTANT:
   *
   * This is NOT a Google ranking probability.
   * It evaluates observable SERP structure only.
   *
   * Site-specific win probability must later combine:
   * - Keyword Decision
   * - Topic Authority
   * - GSC traction
   * - business capability
   * - backlink / authority evidence
   * - content information gain
   * - execution quality
   */
  return {
    scope:
      "SERP_STRUCTURE_ONLY",

    keyword,

    feasibility,

    confidence:
      confidenceForPlan(
        plan
      ),

    competitionShape,

    targetFormat,

    evidence: {
      organicResults:
        plan.benchmark
          .organicResults,

      eligiblePages:
        plan.benchmark
          .eligiblePages,

      uniqueDomains,

      uniqueDomainRatio,

      repeatedDomainShare,

      exactTitleMatchShare,

      dominantPageType:
        dominant.type,

      dominantPageTypeShare:
        dominant.share,

      pageTypeMix:
        plan.benchmark
          .pageTypeMix,

      aiOverview:
        plan.searchFeatures
          .aiOverview,

      peopleAlsoAsk:
        plan.searchFeatures
          .peopleAlsoAsk,

      questionCount:
        plan.searchFeatures
          .questions
          .length,

      contentGapCount:
        plan.architecture
          .contentGaps
          .length,
    },

    requirements:
      Array.from(
        new Set(
          requirements
        )
      ),

    blockers:
      Array.from(
        new Set(
          blockers
        )
      ),

    reasons:
      Array.from(
        new Set(
          reasons
        )
      ),
  };
}
