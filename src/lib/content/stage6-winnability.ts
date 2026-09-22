import type {
  GapAnalysis,
} from "./gap-engine";

import type {
  OriginalValuePlan,
} from "./original-value";

import type {
  WinnabilityOverrides,
  WinnabilitySignal,
} from "./winnability";


function signal(
  level:
    WinnabilitySignal["level"],

  evidence:
    string[]
): WinnabilitySignal {
  return {
    level,

    evidence,
  };
}


export function buildStage6WinnabilityOverrides({
  gaps,
  originalValue,
}: {
  gaps:
    Readonly<GapAnalysis>;

  originalValue:
    Readonly<OriginalValuePlan>;
}): Pick<
  WinnabilityOverrides,
  | "contentOpportunity"
  | "originalValueOpportunity"
> {
  if (
    gaps.missionId !==
      originalValue.missionId
  ) {
    throw new Error(
      "STAGE6_WINNABILITY_MISSION_MISMATCH"
    );
  }

  const exploitableGapCount =
    gaps.gaps.filter(
      (gap) =>
        gap.type !==
        "EVIDENCE_GAP"
    ).length;

  const contentOpportunity:
    WinnabilitySignal =
      exploitableGapCount >=
        3
        ? signal(
            "FAVORABLE",
            [
              `EXPLOITABLE_GAPS:${exploitableGapCount}`,
              `CRITICAL_GAPS:${gaps.criticalCount}`,
              `MAJOR_GAPS:${gaps.majorCount}`,
            ]
          )
        : exploitableGapCount >
            0
          ? signal(
              "MIXED",
              [
                `EXPLOITABLE_GAPS:${exploitableGapCount}`,
              ]
            )
          : signal(
              "UNFAVORABLE",
              [
                "NO_MEANINGFUL_CONTENT_GAP_OBSERVED",
              ]
            );

  let originalValueOpportunity:
    WinnabilitySignal;

  switch (
    originalValue.strength
  ) {
    case "STRONG":
      originalValueOpportunity =
        signal(
          "FAVORABLE",
          [
            "ORIGINAL_VALUE_STRONG",
            ...originalValue.evidence,
          ]
        );
      break;

    case "DEFENSIBLE":
      originalValueOpportunity =
        signal(
          "FAVORABLE",
          [
            "ORIGINAL_VALUE_DEFENSIBLE",
            ...originalValue.evidence,
          ]
        );
      break;

    case "WEAK":
      originalValueOpportunity =
        signal(
          "UNFAVORABLE",
          [
            "ORIGINAL_VALUE_WEAK",
            ...originalValue.issues,
          ]
        );
      break;

    case "NONE":
      originalValueOpportunity =
        signal(
          "BLOCKED",
          [
            "NO_DEFENSIBLE_ORIGINAL_VALUE",
            ...originalValue.issues,
          ]
        );
      break;
  }

  return {
    contentOpportunity,

    originalValueOpportunity,
  };
}
