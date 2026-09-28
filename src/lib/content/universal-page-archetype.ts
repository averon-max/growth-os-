export type UniversalPageArchetype =
  | "DEFINITION"
  | "EXPLAINER"
  | "HOW_TO"
  | "TUTORIAL"
  | "TROUBLESHOOTING"
  | "COMPARISON"
  | "BEST_OF"
  | "PRODUCT_REVIEW"
  | "BUYING_GUIDE"
  | "LIST"
  | "REFERENCE"
  | "CHECKLIST"
  | "CASE_STUDY"
  | "RESEARCH"
  | "B2B_CATEGORY"
  | "LANDING_PAGE"
  | "PROGRAMMATIC_PAGE"
  | "FRESH_QUERY"
  | "GENERIC_ARTICLE";


export type ArchetypeConfidence =
  | "HIGH"
  | "MEDIUM"
  | "LOW";


export interface UniversalPageArchetypeDecisionV2 {
  version:
    "UNIVERSAL_PAGE_ARCHETYPE_V2";

  archetype:
    UniversalPageArchetype;

  confidence:
    ArchetypeConfidence;

  source:
    | "SERP_DOMINANT"
    | "SERP_MIXED"
    | "QUERY_FALLBACK";

  dominantObservedPageType:
    string | null;

  observedResultCount:
    number;

  archetypeShare:
    number | null;

  reasons:
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
    ? value
        .trim()
        .toLowerCase()
        .replace(
          /\s+/g,
          " "
        )
    : "";
}


function upper(
  value:
    unknown
): string {
  return typeof value ===
    "string"
    ? value
        .trim()
        .toUpperCase()
    : "";
}


function lexicalArchetype({
  topic,
  readerGoal,
  missionIntent,
}: {
  topic:
    string;

  readerGoal:
    string;

  missionIntent:
    string;
}): UniversalPageArchetype {
  const text =
    [
      topic,
      readerGoal,
    ]
      .join(
        " "
      )
      .toLowerCase();


  if (
    /\b(latest|news|today|breaking|update|2026|recent)\b/.test(
      text
    )
  ) {
    return "FRESH_QUERY";
  }


  if (
    /\b(best|top \d+|top |best-in-class)\b/.test(
      text
    )
  ) {
    return "BEST_OF";
  }


  if (
    /\b(vs\.?|versus|compare|comparison|difference between)\b/.test(
      text
    )
  ) {
    return "COMPARISON";
  }


  if (
    /\b(review|hands-on|tested|testing)\b/.test(
      text
    )
  ) {
    return "PRODUCT_REVIEW";
  }


  if (
    /\b(buying guide|buyer'?s guide|how to choose|which .* should i buy)\b/.test(
      text
    )
  ) {
    return "BUYING_GUIDE";
  }


  if (
    /\b(how to|step by step|steps to|setup|install|configure|implementation)\b/.test(
      text
    )
  ) {
    return "HOW_TO";
  }


  if (
    /\b(tutorial|walkthrough)\b/.test(
      text
    )
  ) {
    return "TUTORIAL";
  }


  if (
    /\b(fix|troubleshoot|not working|error|problem|why .* not|failed)\b/.test(
      text
    )
  ) {
    return "TROUBLESHOOTING";
  }


  if (
    /\b(checklist|check list)\b/.test(
      text
    )
  ) {
    return "CHECKLIST";
  }


  if (
    /\b(case study|case studies)\b/.test(
      text
    )
  ) {
    return "CASE_STUDY";
  }


  if (
    /\b(statistics|study|research|data analysis|survey|report)\b/.test(
      text
    )
  ) {
    return "RESEARCH";
  }


  if (
    /\b(what is|what are|meaning of|definition of)\b/.test(
      text
    )
  ) {
    return "DEFINITION";
  }


  if (
    /\b(reference|documentation|docs|specification|api reference)\b/.test(
      text
    )
  ) {
    return "REFERENCE";
  }


  if (
    /\b(software|platform|tools|solutions|vendors)\b/.test(
      text
    ) &&
    (
      missionIntent ===
        "COMMERCIAL" ||
      missionIntent ===
        "TRANSACTIONAL"
    )
  ) {
    return "B2B_CATEGORY";
  }


  if (
    missionIntent ===
      "TRANSACTIONAL"
  ) {
    return "LANDING_PAGE";
  }


  return "EXPLAINER";
}


function resultArchetype({
  pageType,
  text,
  fallback,
}: {
  pageType:
    string;

  text:
    string;

  fallback:
    UniversalPageArchetype;
}): UniversalPageArchetype {
  if (
    pageType.includes(
      "CATEGORY"
    ) ||
    pageType.includes(
      "DIRECTORY"
    ) ||
    pageType.includes(
      "LISTING"
    )
  ) {
    return "B2B_CATEGORY";
  }


  if (
    pageType.includes(
      "PRODUCT"
    ) ||
    pageType.includes(
      "LANDING"
    ) ||
    pageType.includes(
      "HOMEPAGE"
    )
  ) {
    return "LANDING_PAGE";
  }


  if (
    pageType.includes(
      "REVIEW"
    )
  ) {
    return "PRODUCT_REVIEW";
  }


  if (
    pageType.includes(
      "COMPARISON"
    )
  ) {
    return "COMPARISON";
  }


  if (
    pageType.includes(
      "NEWS"
    )
  ) {
    return "FRESH_QUERY";
  }


  if (
    pageType.includes(
      "RESEARCH"
    ) ||
    pageType.includes(
      "PAPER"
    )
  ) {
    return "RESEARCH";
  }


  if (
    pageType.includes(
      "GUIDE"
    ) ||
    pageType.includes(
      "TUTORIAL"
    )
  ) {
    if (
      /\b(best|top \d+|top )\b/.test(
        text
      )
    ) {
      return "BEST_OF";
    }

    if (
      /\b(vs\.?|versus|compare|comparison)\b/.test(
        text
      )
    ) {
      return "COMPARISON";
    }

    if (
      /\b(how to|step by step|tutorial|setup|install)\b/.test(
        text
      )
    ) {
      return "HOW_TO";
    }

    if (
      /\b(buying guide|how to choose)\b/.test(
        text
      )
    ) {
      return "BUYING_GUIDE";
    }
  }


  if (
    pageType.includes(
      "ARTICLE"
    ) ||
    pageType.includes(
      "BLOG"
    ) ||
    pageType.includes(
      "OTHER"
    )
  ) {
    if (
      /\b(best|top \d+|top )\b/.test(
        text
      )
    ) {
      return "BEST_OF";
    }

    if (
      /\b(review|tested)\b/.test(
        text
      )
    ) {
      return "PRODUCT_REVIEW";
    }

    if (
      /\b(vs\.?|versus|compare|comparison)\b/.test(
        text
      )
    ) {
      return "COMPARISON";
    }

    if (
      /\b(how to|step by step|tutorial)\b/.test(
        text
      )
    ) {
      return "HOW_TO";
    }

    if (
      /\b(what is|what are)\b/.test(
        text
      )
    ) {
      return "DEFINITION";
    }
  }


  return fallback;
}


export function resolveUniversalPageArchetypeV2({
  topic,
  readerGoal,
  missionIntent,
  serpResearch,
}: {
  topic:
    string;

  readerGoal:
    string;

  missionIntent:
    string;

  serpResearch:
    unknown;
}): Readonly<
  UniversalPageArchetypeDecisionV2
> {
  const fallback =
    lexicalArchetype({
      topic,
      readerGoal,
      missionIntent,
    });


  const snapshot =
    record(
      serpResearch
    );


  const results =
    Array.isArray(
      snapshot?.results
    )
      ? snapshot.results
      : [];


  if (
    results.length ===
      0
  ) {
    return Object.freeze({
      version:
        "UNIVERSAL_PAGE_ARCHETYPE_V2",

      archetype:
        fallback,

      confidence:
        "LOW",

      source:
        "QUERY_FALLBACK",

      dominantObservedPageType:
        null,

      observedResultCount:
        0,

      archetypeShare:
        null,

      reasons:
        Object.freeze([
          "SERP_RESULTS_UNAVAILABLE",
          "QUERY_SEMANTICS_USED_AS_FALLBACK",
        ]),
    });
  }


  const pageTypeCounts =
    new Map<
      string,
      number
    >();


  const archetypeScores =
    new Map<
      UniversalPageArchetype,
      number
    >();


  let totalWeight =
    0;


  for (
    let index = 0;
    index <
      results.length;
    index += 1
  ) {
    const result =
      record(
        results[index]
      );

    if (
      !result
    ) {
      continue;
    }


    const rank =
      typeof result.rank ===
        "number" &&
      Number.isFinite(
        result.rank
      ) &&
      result.rank >
        0
        ? result.rank
        : index +
          1;


    const weight =
      1 /
      Math.sqrt(
        rank
      );


    const pageType =
      upper(
        result.pageType
      ) ||
      "UNKNOWN";


    pageTypeCounts.set(
      pageType,
      (
        pageTypeCounts.get(
          pageType
        ) ??
        0
      ) +
        1
    );


    const text =
      [
        clean(
          result.title
        ),
        clean(
          result.snippet
        ),
        clean(
          result.url
        ),
      ]
        .filter(
          Boolean
        )
        .join(
          " "
        );


    const archetype =
      resultArchetype({
        pageType,
        text,
        fallback,
      });


    archetypeScores.set(
      archetype,
      (
        archetypeScores.get(
          archetype
        ) ??
        0
      ) +
        weight
    );


    totalWeight +=
      weight;
  }


  const dominantPageType =
    [
      ...pageTypeCounts
        .entries(),
    ]
      .sort(
        (
          left,
          right
        ) =>
          right[1] -
          left[1]
      )[0];


  const dominantArchetype =
    [
      ...archetypeScores
        .entries(),
    ]
      .sort(
        (
          left,
          right
        ) =>
          right[1] -
          left[1]
      )[0];


  if (
    !dominantArchetype ||
    totalWeight <=
      0
  ) {
    return Object.freeze({
      version:
        "UNIVERSAL_PAGE_ARCHETYPE_V2",

      archetype:
        fallback,

      confidence:
        "LOW",

      source:
        "QUERY_FALLBACK",

      dominantObservedPageType:
        dominantPageType?.[0] ??
        null,

      observedResultCount:
        results.length,

      archetypeShare:
        null,

      reasons:
        Object.freeze([
          "SERP_ARCHETYPE_SIGNAL_INSUFFICIENT",
          "QUERY_SEMANTICS_USED_AS_FALLBACK",
        ]),
    });
  }


  const share =
    dominantArchetype[1] /
    totalWeight;


  const confidence:
    ArchetypeConfidence =
      share >=
      0.67
        ? "HIGH"
        : share >=
            0.45
          ? "MEDIUM"
          : "LOW";


  return Object.freeze({
    version:
      "UNIVERSAL_PAGE_ARCHETYPE_V2",

    archetype:
      dominantArchetype[0],

    confidence,

    source:
      share >=
        0.45
        ? "SERP_DOMINANT"
        : "SERP_MIXED",

    dominantObservedPageType:
      dominantPageType?.[0] ??
      null,

    observedResultCount:
      results.length,

    archetypeShare:
      Number(
        share.toFixed(
          4
        )
      ),

    reasons:
      Object.freeze([
        "LIVE_SERP_PAGE_TYPES_OBSERVED",
        "TOP_RESULTS_WEIGHTED_BY_RANK",
        confidence ===
          "LOW"
          ? "SERP_FORMAT_MIXED"
          : "SERP_FORMAT_PATTERN_DETECTED",
      ]),
  });
}
