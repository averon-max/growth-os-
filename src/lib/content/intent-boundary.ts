import {
  analyzeQueryOwnership,
} from "@/lib/keywords/query-ownership";

import type {
  SearchMission,
} from "./search-mission";


export type QueryIntent =
  | "INFORMATIONAL"
  | "COMMERCIAL"
  | "TRANSACTIONAL"
  | "NAVIGATIONAL"
  | "LOCAL";


export type IntentBoundaryDecision =
  | "SAME_PAGE"
  | "SEPARATE_PAGE"
  | "CLUSTER"
  | "MERGE"
  | "UNCERTAIN";


export interface IntentBoundaryEvidence {
  missionOverlap?:
    number | null;

  queryOverlap?:
    number | null;

  serpUrlOverlap?:
    number | null;

  serpPageTypeOverlap?:
    number | null;

  existingOwnerUrls?:
    string[];

  sameMissionEvidence?:
    boolean | null;

  foreignEntityEvidence?:
    boolean | null;
}


export interface IntentBoundaryResult {
  decision:
    IntentBoundaryDecision;

  primaryEligible:
    boolean;

  ownershipStatus:
    string;

  confidence:
    number;

  provisional:
    boolean;

  reasons:
    readonly string[];
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
    "been",
    "by",
    "do",
    "does",
    "for",
    "from",
    "how",
    "i",
    "if",
    "in",
    "is",
    "it",
    "my",
    "of",
    "on",
    "or",
    "the",
    "to",
    "was",
    "were",
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
  value: string
): string {
  return value
    .trim()
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
  value: string
): Set<string> {
  return new Set(
    normalize(
      value
    )
      .split(" ")
      .filter(
        (token) =>
          token &&
          !STOP_WORDS.has(
            token
          )
      )
  );
}


export function lexicalQueryOverlap(
  left: string,
  right: string
): number {
  const a =
    tokens(
      left
    );

  const b =
    tokens(
      right
    );

  if (
    a.size ===
      0 ||
    b.size ===
      0
  ) {
    return (
      normalize(
        left
      ) ===
      normalize(
        right
      )
        ? 1
        : 0
    );
  }

  let intersection =
    0;

  for (
    const token
    of a
  ) {
    if (
      b.has(
        token
      )
    ) {
      intersection +=
        1;
    }
  }

  const union =
    new Set([
      ...a,
      ...b,
    ]).size;

  return Number(
    (
      intersection /
      union
    ).toFixed(
      4
    )
  );
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


export function evaluateIntentBoundary({
  mission,
  missionIntent,
  query,
  queryIntent,
  evidence = {},
}: {
  mission:
    Readonly<SearchMission>;

  missionIntent:
    QueryIntent;

  query:
    string;

  queryIntent:
    QueryIntent;

  evidence?:
    IntentBoundaryEvidence;
}): IntentBoundaryResult {
  const reasons:
    string[] =
      [];

  const ownership =
    analyzeQueryOwnership({
      topic:
        mission.topic,

      keyword:
        query,
    });

  if (
    ownership.status ===
      "UNREQUESTED_ENTITY_MODIFIER" &&
    evidence.foreignEntityEvidence ===
      true
  ) {
    return {
      decision:
        "UNCERTAIN",

      primaryEligible:
        false,

      ownershipStatus:
        ownership.status,

      confidence:
        1,

      provisional:
        false,

      reasons:
        Object.freeze([
          "UNREQUESTED_ENTITY_MODIFIER",
          "CONFIRMED_FOREIGN_ENTITY",
          "QUERY_CANNOT_OWN_GENERIC_MISSION",
        ]),
    };
  }

  const ownerUrls = [
    ...new Set(
      evidence.existingOwnerUrls ??
      []
    ),
  ];

  const lexicalOverlap =
    lexicalQueryOverlap(
      mission.topic,
      query
    );

  const missionOverlap =
    clamp01(
      evidence.missionOverlap ??
      lexicalOverlap
    );

  const queryOverlap =
    clamp01(
      evidence.queryOverlap ??
      lexicalOverlap
    );

  const hasSerpEvidence =
    evidence.serpUrlOverlap !==
      undefined &&
    evidence.serpUrlOverlap !==
      null &&
    evidence.serpPageTypeOverlap !==
      undefined &&
    evidence.serpPageTypeOverlap !==
      null;

  const provisional =
    !hasSerpEvidence;

  if (
    ownership.status ===
      "UNREQUESTED_ENTITY_MODIFIER" &&
    evidence.foreignEntityEvidence !==
      true
  ) {
    reasons.push(
      "ENTITY_STATUS_UNCONFIRMED_FOR_QUERY_GRAPH"
    );
  }

  if (
    evidence.missionOverlap ===
      undefined ||
    evidence.missionOverlap ===
      null
  ) {
    reasons.push(
      "MISSION_OVERLAP_LEXICAL_ONLY"
    );
  }

  if (
    evidence.queryOverlap ===
      undefined ||
    evidence.queryOverlap ===
      null
  ) {
    reasons.push(
      "QUERY_OVERLAP_LEXICAL_ONLY"
    );
  }

  if (
    ownerUrls.length >
      1 &&
    queryIntent ===
      missionIntent &&
    missionOverlap >=
      0.5
  ) {
    return {
      decision:
        "MERGE",

      primaryEligible:
        true,

      ownershipStatus:
        ownership.status,

      confidence:
        clamp01(
          0.7 +
          Math.min(
            0.2,
            missionOverlap *
              0.2
          )
        ),

      provisional,

      reasons:
        Object.freeze([
          ...reasons,
          "MULTIPLE_EXISTING_OWNERS",
          "CANNIBALIZATION_INVESTIGATION_REQUIRED",
        ]),
    };
  }

  if (
    queryIntent !==
    missionIntent
  ) {
    return {
      decision:
        "SEPARATE_PAGE",

      primaryEligible:
        false,

      ownershipStatus:
        ownership.status,

      confidence:
        hasSerpEvidence
          ? 0.95
          : 0.82,

      provisional,

      reasons:
        Object.freeze([
          ...reasons,
          "DISTINCT_PRIMARY_INTENT",
        ]),
    };
  }

  if (
    evidence.sameMissionEvidence ===
    true
  ) {
    return {
      decision:
        "SAME_PAGE",

      primaryEligible:
        true,

      ownershipStatus:
        ownership.status,

      confidence:
        hasSerpEvidence
          ? 0.95
          : 0.85,

      provisional,

      reasons:
        Object.freeze([
          ...reasons,
          "EXPLICIT_SAME_MISSION_EVIDENCE",
        ]),
    };
  }

  const serpUrlOverlap =
    clamp01(
      evidence.serpUrlOverlap ??
      0
    );

  const pageTypeOverlap =
    clamp01(
      evidence.serpPageTypeOverlap ??
      0
    );

  if (
    missionOverlap >=
      0.7 &&
    queryOverlap >=
      0.5 &&
    (
      !hasSerpEvidence ||
      (
        serpUrlOverlap >=
          0.35 &&
        pageTypeOverlap >=
          0.5
      )
    )
  ) {
    return {
      decision:
        "SAME_PAGE",

      primaryEligible:
        true,

      ownershipStatus:
        ownership.status,

      confidence:
        hasSerpEvidence
          ? clamp01(
              (
                missionOverlap +
                queryOverlap +
                serpUrlOverlap +
                pageTypeOverlap
              ) /
              4
            )
          : clamp01(
              (
                missionOverlap +
                queryOverlap
              ) /
              2 *
              0.8
            ),

      provisional,

      reasons:
        Object.freeze([
          ...reasons,
          "SAME_INTENT",
          "HIGH_MISSION_OVERLAP",
        ]),
    };
  }

  if (
    missionOverlap >=
      0.3 ||
    queryOverlap >=
      0.3
  ) {
    return {
      decision:
        "CLUSTER",

      primaryEligible:
        true,

      ownershipStatus:
        ownership.status,

      confidence:
        hasSerpEvidence
          ? 0.75
          : 0.55,

      provisional:

        true,

      reasons:
        Object.freeze([
          ...reasons,
          "RELATED_SUPPORTING_MISSION",
        ]),
    };
  }

  return {
    decision:
      "UNCERTAIN",

    primaryEligible:
      false,

    ownershipStatus:
      ownership.status,

    confidence:
      0.25,

    provisional:
      true,

    reasons:
      Object.freeze([
        ...reasons,
        "INSUFFICIENT_MISSION_OVERLAP",
        "REQUIRES_SERP_RESEARCH",
      ]),
  };
}
