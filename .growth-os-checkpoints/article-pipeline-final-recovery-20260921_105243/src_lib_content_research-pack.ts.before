import {
  filterEvidenceAwareQuestions,
} from "./evidence-aware-planning";

import type {
  BusinessFactRegistry,
} from "./business-facts";

export type ResearchPackReadiness =
  | "READY"
  | "REVIEW"
  | "BLOCKED";

export interface ResearchPack {
  version:
    "RESEARCH_PACK_V1";

  source:
    | "IMMUTABLE_EVIDENCE_SNAPSHOT"
    | "LEGACY_BRIEF_FALLBACK";

  readiness:
    ResearchPackReadiness;

  topic:
    string;

  primaryKeyword:
    string;

  searchIntent:
    string;

  pageAction:
    string;

  targetFormat:
    string | null;

  queryCluster: {
    secondaryKeywords:
      string[];

    supportingConcepts:
      string[];
  };

  searchEvidence: {
    searchVolume:
      number | null;

    difficulty:
      number | null;

    existingPosition:
      number | null;

    impressions:
      number | null;

    clicks:
      number | null;

    observedCtr:
      number | null;

    topicalAuthorityStrength:
      number | null;

    competitionShape:
      string | null;

    serpFeasibility:
      string | null;

    serpConfidence:
      string | null;
  };

  coverage: {
    requiredTopics:
      string[];

    questionsToAnswer:
      string[];

    observedContentGaps:
      string[];
  };

  informationGain: {
    status:
      | "EVIDENCE_CANDIDATES_PRESENT"
      | "INSUFFICIENT_EVIDENCE";

    candidates:
      string[];

    mustBeValidatedBeforeClaimingUniqueness:
      true;
  };

  evidencePolicy: {
    verifiedBusinessClaims:
      string[];

    verifiedBusinessClaimCount:
      number;

    onlyVerifiedProductClaims:
      true;

    neverInventStatistics:
      true;

    neverInventCapabilities:
      true;

    neverInventSources:
      true;
  };

  writingMandates:
    string[];

  blockers:
    string[];

  reviews:
    string[];
}

interface BriefResearchInput {
  topic:
    string;

  primaryKeyword:
    string;

  searchIntent:
    string;

  secondaryKeywords:
    string[];
}

type UnknownRecord =
  Record<
    string,
    unknown
  >;

function asRecord(
  value: unknown
): UnknownRecord | null {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  return value as
    UnknownRecord;
}

function readRecord(
  value: unknown,
  key: string
): UnknownRecord | null {
  const record =
    asRecord(
      value
    );

  if (!record) {
    return null;
  }

  return asRecord(
    record[key]
  );
}

function readString(
  value: unknown,
  key: string
): string | null {
  const record =
    asRecord(
      value
    );

  if (!record) {
    return null;
  }

  const candidate =
    record[key];

  return typeof candidate ===
      "string" &&
    candidate.trim()
    ? candidate.trim()
    : null;
}

function readNumber(
  value: unknown,
  key: string
): number | null {
  const record =
    asRecord(
      value
    );

  if (!record) {
    return null;
  }

  const candidate =
    record[key];

  return typeof candidate ===
      "number" &&
    Number.isFinite(
      candidate
    )
    ? candidate
    : null;
}

function readBoolean(
  value: unknown,
  key: string
): boolean {
  const record =
    asRecord(
      value
    );

  return Boolean(
    record?.[key]
  );
}

function readStrings(
  value: unknown,
  key: string
): string[] {
  const record =
    asRecord(
      value
    );

  const candidate =
    record?.[key];

  if (
    !Array.isArray(
      candidate
    )
  ) {
    return [];
  }

  return Array.from(
    new Set(
      candidate
        .filter(
          (
            item
          ): item is string =>
            typeof item ===
              "string"
        )
        .map(
          (item) =>
            item.trim()
        )
        .filter(
          Boolean
        )
    )
  );
}

function unique(
  values: string[]
): string[] {
  return Array.from(
    new Set(
      values
        .map(
          (value) =>
            value.trim()
        )
        .filter(
          Boolean
        )
    )
  );
}

export function buildResearchPack({
  brief,
  planSnapshot,
  businessFacts,
}: {
  brief:
    BriefResearchInput;

  planSnapshot:
    unknown;

  businessFacts:
    BusinessFactRegistry;
}): ResearchPack {
  const root =
    asRecord(
      planSnapshot
    );

  const blueprint =
    root
      ? readRecord(
          root,
          "searchBlueprintShadow"
        )
      : null;

  const blockers:
    string[] =
      [];

  const reviews:
    string[] =
      [];

  const writingMandates:
    string[] = [
      "ANSWER_PRIMARY_INTENT_DIRECTLY_NEAR_THE_BEGINNING",
      "ONE_PAGE_LEVEL_H1_ONLY",
      "NO_H1_INSIDE_BODY_MARKDOWN",
      "HEADINGS_MUST_EXIST_ONLY_FOR_REAL_INFORMATION_ARCHITECTURE",
      "NO_KEYWORD_STUFFING",
      "NO_COMPETITOR_TEXT_COPYING",
      "NO_WORD_COUNT_PADDING",
      "NO_HEADING_COUNT_PADDING",
      "EVERY_SECTION_MUST_ADVANCE_THE_USER_JOB",
      "DISTINGUISH_VERIFIED_BUSINESS_FACTS_FROM_GENERAL_EDUCATIONAL_EXPLANATION",
    ];

  let source:
    ResearchPack["source"] =
      "LEGACY_BRIEF_FALLBACK";

  let pageAction =
    "UNKNOWN";

  let targetFormat:
    string | null =
      null;

  let secondaryKeywords =
    [
      ...brief
        .secondaryKeywords,
    ];

  let supportingConcepts:
    string[] =
      [];

  let requiredTopics:
    string[] =
      [];

  let questionsToAnswer:
    string[] =
      [];

  let observedContentGaps:
    string[] =
      [];

  let informationGainCandidates:
    string[] =
      [];

  let searchVolume:
    number | null =
      null;

  let difficulty:
    number | null =
      null;

  let existingPosition:
    number | null =
      null;

  let impressions:
    number | null =
      null;

  let clicks:
    number | null =
      null;

  let observedCtr:
    number | null =
      null;

  let topicalAuthorityStrength:
    number | null =
      null;

  let competitionShape:
    string | null =
      null;

  let serpFeasibility:
    string | null =
      null;

  let serpConfidence:
    string | null =
      null;

  if (blueprint) {
    source =
      "IMMUTABLE_EVIDENCE_SNAPSHOT";

    const decision =
      readRecord(
        blueprint,
        "decision"
      );

    const coverage =
      readRecord(
        blueprint,
        "coverage"
      );

    const pageMission =
      readRecord(
        blueprint,
        "pageMission"
      );

    const searchEvidence =
      readRecord(
        blueprint,
        "searchEvidence"
      );

    const informationGain =
      readRecord(
        blueprint,
        "informationGain"
      );

    const governance =
      readRecord(
        blueprint,
        "governance"
      );

    pageAction =
      readString(
        decision,
        "action"
      ) ??
      "UNKNOWN";

    targetFormat =
      readString(
        pageMission,
        "targetFormat"
      ) ??
      readString(
        searchEvidence,
        "targetFormat"
      );

    secondaryKeywords =
      readStrings(
        coverage,
        "secondaryKeywords"
      );

    supportingConcepts =
      readStrings(
        coverage,
        "supportingConcepts"
      );

    requiredTopics =
      readStrings(
        coverage,
        "requiredTopics"
      );

    questionsToAnswer =
      readStrings(
        coverage,
        "questionsToAnswer"
      );

    observedContentGaps =
      readStrings(
        coverage,
        "contentGaps"
      );

    informationGainCandidates =
      readStrings(
        informationGain,
        "evidenceCandidates"
      );

    searchVolume =
      readNumber(
        searchEvidence,
        "searchVolume"
      );

    difficulty =
      readNumber(
        searchEvidence,
        "difficulty"
      );

    existingPosition =
      readNumber(
        searchEvidence,
        "existingPosition"
      );

    impressions =
      readNumber(
        searchEvidence,
        "impressions"
      );

    clicks =
      readNumber(
        searchEvidence,
        "clicks"
      );

    observedCtr =
      readNumber(
        searchEvidence,
        "observedCtr"
      );

    topicalAuthorityStrength =
      readNumber(
        searchEvidence,
        "topicalAuthorityStrength"
      );

    competitionShape =
      readString(
        searchEvidence,
        "competitionShape"
      );

    serpFeasibility =
      readString(
        decision,
        "serpFeasibility"
      );

    serpConfidence =
      readString(
        decision,
        "serpConfidence"
      );

    blockers.push(
      ...readStrings(
        governance,
        "blockers"
      )
    );

    reviews.push(
      ...readStrings(
        governance,
        "reviews"
      )
    );

    if (
      readString(
        blueprint,
        "readiness"
      ) ===
      "BLOCKED"
    ) {
      blockers.push(
        "SEARCH_BLUEPRINT_BLOCKED"
      );
    }

    if (
      readBoolean(
        pageMission,
        "directAnswerRequired"
      )
    ) {
      writingMandates.push(
        "DIRECT_ANSWER_BEFORE_FIRST_MAJOR_SECTION"
      );
    }

    if (
      readBoolean(
        pageMission,
        "toolFirstWhenAvailable"
      )
    ) {
      writingMandates.push(
        "REAL_TOOL_OR_INTERACTIVE_EXPERIENCE_PRECEDES_GENERIC_EXPLANATION"
      );
    }

    if (
      readBoolean(
        pageMission,
        "doNotCreateCompetingUrl"
      )
    ) {
      writingMandates.push(
        "PRESERVE_EXISTING_URL_AND_AVOID_CANNIBALIZATION"
      );
    }
  } else {
    reviews.push(
      "LEGACY_BRIEF_WITHOUT_SEARCH_BLUEPRINT"
    );
  }

  if (
    pageAction ===
      "CREATE_NEW" &&
    informationGainCandidates
      .length ===
      0 &&
    source ===
      "IMMUTABLE_EVIDENCE_SNAPSHOT"
  ) {
    blockers.push(
      "NO_INFORMATION_GAIN_EVIDENCE_FOR_NEW_PAGE"
    );
  }

  if (
    targetFormat &&
    targetFormat.includes(
      "TOOL"
    )
  ) {
    writingMandates.push(
      "DO_NOT_PRETEND_AN_INTERACTIVE_TOOL_EXISTS_UNLESS_VERIFIED"
    );
  }

  if (
    observedContentGaps
      .length >
    0
  ) {
    writingMandates.push(
      "COVER_OBSERVED_SERP_GAPS_ONLY_WHEN_FACTUALLY_SUPPORTABLE"
    );
  }

  if (
    questionsToAnswer
      .length >
    0
  ) {
    writingMandates.push(
      "ANSWER_SAME_INTENT_USER_QUESTIONS_CONCISELY"
    );
  }

  const verifiedClaims =
    unique(
      businessFacts
        .verifiedClaims
    );

  const informationGainStatus:
    ResearchPack["informationGain"]["status"] =
      informationGainCandidates
        .length >
      0
        ? "EVIDENCE_CANDIDATES_PRESENT"
        : "INSUFFICIENT_EVIDENCE";

  if (
    informationGainStatus ===
      "INSUFFICIENT_EVIDENCE" &&
    pageAction !==
      "CREATE_NEW"
  ) {
    reviews.push(
      "INFORMATION_GAIN_NEEDS_EDITORIAL_REVIEW"
    );
  }

  const readiness:
    ResearchPackReadiness =
      blockers.length >
      0
        ? "BLOCKED"
        : reviews.length >
            0
          ? "REVIEW"
          : "READY";

  const evidenceAwareQuestions =
    filterEvidenceAwareQuestions({
      questions:
        questionsToAnswer,

      externalEvidenceSources:
        root
          ? root[
              "externalEvidenceSources"
            ]
          : null,
    });

  if (
    evidenceAwareQuestions
      .deferredQuestions
      .length >
    0
  ) {
    questionsToAnswer =
      evidenceAwareQuestions
        .questions;

    reviews.push(
      "SENSITIVE_SERP_COVERAGE_DEFERRED_UNTIL_VERIFIED_EVIDENCE"
    );

    writingMandates.push(
      "SEARCH_SNIPPET_AND_REFERENCE_ONLY_ARE_DISCOVERY_NOT_CLAIM_EVIDENCE"
    );
  }

  return {
    version:
      "RESEARCH_PACK_V1",

    source,

    readiness,

    topic:
      brief.topic,

    primaryKeyword:
      brief.primaryKeyword,

    searchIntent:
      brief.searchIntent,

    pageAction,

    targetFormat,

    queryCluster: {
      secondaryKeywords:
        unique(
          secondaryKeywords
        ),

      supportingConcepts:
        unique(
          supportingConcepts
        ),
    },

    searchEvidence: {
      searchVolume,

      difficulty,

      existingPosition,

      impressions,

      clicks,

      observedCtr,

      topicalAuthorityStrength,

      competitionShape,

      serpFeasibility,

      serpConfidence,
    },

    coverage: {
      requiredTopics:
        unique(
          requiredTopics
        ),

      questionsToAnswer:
        unique(
          questionsToAnswer
        ),

      observedContentGaps:
        unique(
          observedContentGaps
        ),
    },

    informationGain: {
      status:
        informationGainStatus,

      candidates:
        unique(
          informationGainCandidates
        ),

      mustBeValidatedBeforeClaimingUniqueness:
        true,
    },

    evidencePolicy: {
      verifiedBusinessClaims:
        verifiedClaims,

      verifiedBusinessClaimCount:
        verifiedClaims.length,

      onlyVerifiedProductClaims:
        true,

      neverInventStatistics:
        true,

      neverInventCapabilities:
        true,

      neverInventSources:
        true,
    },

    writingMandates:
      unique(
        writingMandates
      ),

    blockers:
      unique(
        blockers
      ),

    reviews:
      unique(
        reviews
      ),
  };
}

function bullets(
  values:
    string[],
  max:
    number
): string {
  return values
    .slice(
      0,
      max
    )
    .map(
      (value) =>
        `- ${value}`
    )
    .join(
      "\n"
    );
}

export function researchPackPrompt(
  pack:
    ResearchPack
): string {
  return [
    "RESEARCH PACK V1 — AUTHORITATIVE GENERATION CONTEXT",

    `Readiness: ${pack.readiness}`,

    `Evidence source: ${pack.source}`,

    `Topic: ${pack.topic}`,

    `Primary query: ${pack.primaryKeyword}`,

    `Search intent: ${pack.searchIntent}`,

    `Page action: ${pack.pageAction}`,

    pack.targetFormat
      ? `Target format: ${pack.targetFormat}`
      : "",

    [
      "Observed search evidence:",
      `- Search volume: ${pack.searchEvidence.searchVolume ?? "unknown"}`,
      `- Keyword difficulty: ${pack.searchEvidence.difficulty ?? "unknown"}`,
      `- Existing position: ${pack.searchEvidence.existingPosition ?? "unranked/unknown"}`,
      `- Impressions: ${pack.searchEvidence.impressions ?? "unknown"}`,
      `- Clicks: ${pack.searchEvidence.clicks ?? "unknown"}`,
      `- Observed CTR: ${pack.searchEvidence.observedCtr ?? "unknown"}`,
      `- Internal topical-authority evidence: ${pack.searchEvidence.topicalAuthorityStrength ?? "unknown"}`,
      `- SERP competition shape: ${pack.searchEvidence.competitionShape ?? "unknown"}`,
      `- SERP feasibility: ${pack.searchEvidence.serpFeasibility ?? "unknown"} / ${pack.searchEvidence.serpConfidence ?? "unknown"}`,
    ].join(
      "\n"
    ),

    pack.queryCluster
      .secondaryKeywords
      .length
      ? `Same-page secondary query cluster:\n${bullets(
          pack.queryCluster
            .secondaryKeywords,
          12
        )}`
      : "",

    pack.queryCluster
      .supportingConcepts
      .length
      ? `Supporting concepts:\n${bullets(
          pack.queryCluster
            .supportingConcepts,
          12
        )}`
      : "",

    pack.coverage
      .requiredTopics
      .length
      ? `Required topical coverage:\n${bullets(
          pack.coverage
            .requiredTopics,
          12
        )}`
      : "",

    pack.coverage
      .questionsToAnswer
      .length
      ? `Same-intent questions that need useful answers:\n${bullets(
          pack.coverage
            .questionsToAnswer,
          12
        )}`
      : "",

    pack.coverage
      .observedContentGaps
      .length
      ? `Observed SERP content gaps:\n${bullets(
          pack.coverage
            .observedContentGaps,
          10
        )}`
      : "",

    pack.informationGain
      .candidates
      .length
      ? `Potential information-gain evidence candidates:\n${bullets(
          pack.informationGain
            .candidates,
          12
        )}`
      : "No evidence-backed information-gain candidate is currently available.",

    "IMPORTANT: an information-gain candidate is NOT proof that our page is unique. Use it only when the article can substantiate it.",

    pack.evidencePolicy
      .verifiedBusinessClaims
      .length
      ? `Verified first-party business claims that may be used:\n${bullets(
          pack.evidencePolicy
            .verifiedBusinessClaims,
          20
        )}`
      : "No verified first-party product claims are available. Do not invent or imply product capabilities.",

    `Writing mandates:\n${bullets(
      pack.writingMandates,
      30
    )}`,

    pack.reviews
      .length
      ? `Editorial review requirements:\n${bullets(
          pack.reviews,
          20
        )}`
      : "",

    "NON-NEGOTIABLE:",
    "- Do not fabricate numbers, studies, citations, customers, awards, guarantees, product capabilities, datasets, monitoring coverage, or security claims.",
    "- Do not copy competitor wording.",
    "- Do not pad the article to imitate competitor word counts.",
    "- Do not manufacture headings to imitate competitor structure.",
    "- Do not treat keyword difficulty, topical-authority strength, or SERP feasibility as Google ranking scores.",
    "- Satisfy the user intent first. SEO evidence constrains the answer; it does not replace editorial judgment.",
    "- Every paragraph must either answer, explain, demonstrate, compare, qualify, or move the user toward the requested task.",
  ]
    .filter(
      Boolean
    )
    .join(
      "\n\n"
    );
}
