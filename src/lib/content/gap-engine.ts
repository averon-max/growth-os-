import type {
  ExpectedCoverageModel,
  ExpectedCoverageRole,
} from "./expected-coverage";


export type SearchGapType =
  | "MISSION_GAP"
  | "EXPECTED_GAP"
  | "DEPTH_GAP"
  | "CLARITY_GAP"
  | "EVIDENCE_GAP"
  | "ACTION_GAP"
  | "ORIGINAL_VALUE_GAP";


export type GapSeverity =
  | "CRITICAL"
  | "MAJOR"
  | "MINOR"
  | "INFO";


export type CompetitorCoverageQuality =
  | "NONE"
  | "WEAK"
  | "STRONG"
  | "UNKNOWN";


export type CompetitorClarityQuality =
  | "WEAK"
  | "STRONG"
  | "UNKNOWN";


export type CompetitorEvidenceQuality =
  | "WEAK"
  | "STRONG"
  | "UNKNOWN";


export type CompetitorActionQuality =
  | "WEAK"
  | "STRONG"
  | "NOT_APPLICABLE"
  | "UNKNOWN";


export interface GapTopicObservation {
  topic:
    string;

  competitorCoverage:
    CompetitorCoverageQuality;

  competitorClarity:
    CompetitorClarityQuality;

  competitorEvidence:
    CompetitorEvidenceQuality;

  competitorAction:
    CompetitorActionQuality;

  originalValueOpportunity:
    boolean | null;
}


export interface SearchGap {
  type:
    SearchGapType;

  topic:
    string;

  severity:
    GapSeverity;

  coverageRole:
    ExpectedCoverageRole;

  evidence:
    readonly string[];

  opportunity:
    string;
}


export interface GapAnalysis {
  version:
    "GAP_ENGINE_V1";

  missionId:
    string;

  gaps:
    readonly SearchGap[];

  byType:
    Readonly<
      Record<
        SearchGapType,
        number
      >
    >;

  criticalCount:
    number;

  majorCount:
    number;

  evidence:
    readonly string[];
}


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


function severityFor({
  type,
  role,
}: {
  type:
    SearchGapType;

  role:
    ExpectedCoverageRole;
}): GapSeverity {
  if (
    type ===
      "MISSION_GAP" &&
    role ===
      "REQUIRED"
  ) {
    return "CRITICAL";
  }

  if (
    (
      type ===
        "EXPECTED_GAP" ||
      type ===
        "EVIDENCE_GAP"
    ) &&
    role ===
      "REQUIRED"
  ) {
    return "MAJOR";
  }

  if (
    type ===
      "ORIGINAL_VALUE_GAP"
  ) {
    return "MAJOR";
  }

  if (
    role ===
      "REQUIRED" ||
    role ===
      "SUPPORTING"
  ) {
    return "MAJOR";
  }

  return "MINOR";
}


function makeGap({
  type,
  topic,
  role,
  evidence,
  opportunity,
}: {
  type:
    SearchGapType;

  topic:
    string;

  role:
    ExpectedCoverageRole;

  evidence:
    string[];

  opportunity:
    string;
}): Readonly<SearchGap> {
  return Object.freeze({
    type,

    topic,

    severity:
      severityFor({
        type,
        role,
      }),

    coverageRole:
      role,

    evidence:
      Object.freeze(
        evidence
      ),

    opportunity,
  });
}


export function buildGapAnalysis({
  expectedCoverage,
  observations,
}: {
  expectedCoverage:
    Readonly<ExpectedCoverageModel>;

  observations:
    GapTopicObservation[];
}): Readonly<GapAnalysis> {
  const observationMap =
    new Map(
      observations.map(
        (observation) => [
          normalize(
            observation.topic
          ),
          observation,
        ] as const
      )
    );

  const gaps:
    SearchGap[] =
      [];

  for (
    const item
    of expectedCoverage.items
  ) {
    if (
      item.role ===
      "EXCLUDED"
    ) {
      continue;
    }

    const observation =
      observationMap.get(
        normalize(
          item.topic
        )
      );

    if (
      !observation
    ) {
      continue;
    }

    if (
      item.role ===
        "REQUIRED" &&
      observation.competitorCoverage ===
        "NONE"
    ) {
      gaps.push(
        makeGap({
          type:
            "MISSION_GAP",

          topic:
            item.topic,

          role:
            item.role,

          evidence: [
            "MISSION_REQUIRED_TOPIC",
            "COMPETITOR_COVERAGE_NONE",
          ],

          opportunity:
            "Satisfy a required part of the reader mission that current observed results do not adequately cover.",
        })
      );
    }

    if (
      (
        item.role ===
          "REQUIRED" ||
        item.role ===
          "SUPPORTING"
      ) &&
      item.serpFrequency !==
        null &&
      item.serpFrequency >=
        0.4 &&
      observation.competitorCoverage ===
        "NONE"
    ) {
      gaps.push(
        makeGap({
          type:
            "EXPECTED_GAP",

          topic:
            item.topic,

          role:
            item.role,

          evidence: [
            `SERP_FREQUENCY:${item.serpFrequency.toFixed(4)}`,
            "EXPECTED_INFORMATION_ABSENT",
          ],

          opportunity:
            "Cover information repeatedly expected by the SERP without copying competitor structure.",
        })
      );
    }

    if (
      observation.competitorCoverage ===
      "WEAK"
    ) {
      gaps.push(
        makeGap({
          type:
            "DEPTH_GAP",

          topic:
            item.topic,

          role:
            item.role,

          evidence: [
            "COMPETITOR_COVERAGE_WEAK",
          ],

          opportunity:
            "Provide a more complete and useful explanation rather than merely mentioning the topic.",
        })
      );
    }

    if (
      observation.competitorClarity ===
      "WEAK"
    ) {
      gaps.push(
        makeGap({
          type:
            "CLARITY_GAP",

          topic:
            item.topic,

          role:
            item.role,

          evidence: [
            "COMPETITOR_CLARITY_WEAK",
          ],

          opportunity:
            "Explain the concept more clearly with better reasoning, structure, examples, or visual organization.",
        })
      );
    }

    if (
      item.evidenceRequirement !==
        "NONE" &&
      observation.competitorEvidence ===
        "WEAK"
    ) {
      gaps.push(
        makeGap({
          type:
            "EVIDENCE_GAP",

          topic:
            item.topic,

          role:
            item.role,

          evidence: [
            `EVIDENCE_REQUIREMENT:${item.evidenceRequirement}`,
            "COMPETITOR_EVIDENCE_WEAK",
          ],

          opportunity:
            "Use stronger verifiable evidence than currently observed competing coverage.",
        })
      );
    }

    if (
      observation.competitorAction ===
      "WEAK"
    ) {
      gaps.push(
        makeGap({
          type:
            "ACTION_GAP",

          topic:
            item.topic,

          role:
            item.role,

          evidence: [
            "READER_ACTION_COVERAGE_WEAK",
          ],

          opportunity:
            "Make the next reader action explicit and useful.",
        })
      );
    }

    if (
      observation.originalValueOpportunity ===
      true
    ) {
      gaps.push(
        makeGap({
          type:
            "ORIGINAL_VALUE_GAP",

          topic:
            item.topic,

          role:
            item.role,

          evidence: [
            "DEFENSIBLE_UNIQUE_ASSET_OPPORTUNITY",
          ],

          opportunity:
            "Create an original asset or synthesis that materially improves the answer.",
        })
      );
    }
  }

  const byType:
    Record<
      SearchGapType,
      number
    > = {
      MISSION_GAP:
        0,

      EXPECTED_GAP:
        0,

      DEPTH_GAP:
        0,

      CLARITY_GAP:
        0,

      EVIDENCE_GAP:
        0,

      ACTION_GAP:
        0,

      ORIGINAL_VALUE_GAP:
        0,
    };

  for (
    const gap
    of gaps
  ) {
    byType[
      gap.type
    ] +=
      1;
  }

  return Object.freeze({
    version:
      "GAP_ENGINE_V1" as const,

    missionId:
      expectedCoverage.missionId,

    gaps:
      Object.freeze(
        gaps
      ),

    byType:
      Object.freeze(
        byType
      ),

    criticalCount:
      gaps.filter(
        (gap) =>
          gap.severity ===
          "CRITICAL"
      ).length,

    majorCount:
      gaps.filter(
        (gap) =>
          gap.severity ===
          "MAJOR"
      ).length,

    evidence:
      Object.freeze([
        "EXPECTED_COVERAGE_MODEL",
        "OBSERVED_COMPETITOR_QUALITY",
        "GAPS_ARE_OPPORTUNITIES_NOT_COPY_INSTRUCTIONS",
      ]),
  });
}
