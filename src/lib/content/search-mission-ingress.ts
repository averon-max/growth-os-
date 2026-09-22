import type {
  SearchMission,
} from "./search-mission";


export type ExplicitSearchMissionInput =
  Readonly<
    Pick<
      SearchMission,
      | "audience"
      | "readerGoal"
      | "businessRelationship"
      | "jurisdiction"
      | "language"
      | "location"
      | "riskClass"
    >
  >;


export type SearchMissionIngressResult =
  | Readonly<{
      ok: true;
      value:
        ExplicitSearchMissionInput |
        undefined;
    }>
  | Readonly<{
      ok: false;
      code:
        "SEARCH_MISSION_INPUT_INVALID";
      error:
        string;
    }>;


const BUSINESS_RELATIONSHIPS =
  new Set([
    "CORE",
    "DIRECT",
    "ADJACENT",
    "WEAK",
  ]);


const RISK_CLASSES =
  new Set([
    "NORMAL",
    "YMYL_FINANCE",
    "YMYL_HEALTH",
    "YMYL_SAFETY",
    "YMYL_LEGAL",
    "OTHER_SENSITIVE",
  ]);


function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  );
}


function cleanRequiredString(
  value: unknown
): string | null {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const clean =
    value.trim();

  return clean.length >
    0
    ? clean
    : null;
}


export function parseOptionalExplicitSearchMissionInput(
  value: unknown
): SearchMissionIngressResult {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    /*
     * Legacy create-brief callers remain compatible during
     * the migration window.
     *
     * Missing mission data MUST NOT be synthesized here.
     */
    return Object.freeze({
      ok:
        true as const,

      value:
        undefined,
    });
  }

  if (
    !isRecord(
      value
    )
  ) {
    return Object.freeze({
      ok:
        false as const,

      code:
        "SEARCH_MISSION_INPUT_INVALID" as const,

      error:
        "searchMission must be an object.",
    });
  }

  const audience =
    cleanRequiredString(
      value.audience
    );

  const readerGoal =
    cleanRequiredString(
      value.readerGoal
    );

  const language =
    cleanRequiredString(
      value.language
    );

  const location =
    cleanRequiredString(
      value.location
    );

  const relationship =
    cleanRequiredString(
      value.businessRelationship
    );

  const riskClass =
    cleanRequiredString(
      value.riskClass
    );

  const jurisdiction =
    value.jurisdiction ===
      undefined ||
    value.jurisdiction ===
      null
      ? undefined
      : cleanRequiredString(
          value.jurisdiction
        );

  if (!audience) {
    return Object.freeze({
      ok:
        false as const,

      code:
        "SEARCH_MISSION_INPUT_INVALID" as const,

      error:
        "searchMission.audience is required.",
    });
  }

  if (!readerGoal) {
    return Object.freeze({
      ok:
        false as const,

      code:
        "SEARCH_MISSION_INPUT_INVALID" as const,

      error:
        "searchMission.readerGoal is required.",
    });
  }

  if (!language) {
    return Object.freeze({
      ok:
        false as const,

      code:
        "SEARCH_MISSION_INPUT_INVALID" as const,

      error:
        "searchMission.language is required.",
    });
  }

  if (!location) {
    return Object.freeze({
      ok:
        false as const,

      code:
        "SEARCH_MISSION_INPUT_INVALID" as const,

      error:
        "searchMission.location is required.",
    });
  }

  if (
    !relationship ||
    !BUSINESS_RELATIONSHIPS.has(
      relationship
    )
  ) {
    return Object.freeze({
      ok:
        false as const,

      code:
        "SEARCH_MISSION_INPUT_INVALID" as const,

      error:
        "searchMission.businessRelationship must be CORE, DIRECT, ADJACENT, or WEAK.",
    });
  }

  if (
    !riskClass ||
    !RISK_CLASSES.has(
      riskClass
    )
  ) {
    return Object.freeze({
      ok:
        false as const,

      code:
        "SEARCH_MISSION_INPUT_INVALID" as const,

      error:
        "searchMission.riskClass is invalid.",
    });
  }

  if (
    value.jurisdiction !==
      undefined &&
    value.jurisdiction !==
      null &&
    !jurisdiction
  ) {
    return Object.freeze({
      ok:
        false as const,

      code:
        "SEARCH_MISSION_INPUT_INVALID" as const,

      error:
        "searchMission.jurisdiction cannot be empty when provided.",
    });
  }

  const parsed:
    ExplicitSearchMissionInput = {
      audience,

      readerGoal,

      businessRelationship:
        relationship as
          SearchMission[
            "businessRelationship"
          ],

      jurisdiction:
        jurisdiction ??
        undefined,

      language,

      location,

      riskClass:
        riskClass as
          SearchMission[
            "riskClass"
          ],
    };

  return Object.freeze({
    ok:
      true as const,

    value:
      Object.freeze(
        parsed
      ),
  });
}
