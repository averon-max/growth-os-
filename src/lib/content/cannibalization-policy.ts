export type CannibalizationMode =
  | "SMART"
  | "PREVENT"
  | "ALLOW"
  | "IGNORE";


export type CannibalizationSeoAction =
  | "CREATE"
  | "UPDATE"
  | "MERGE"
  | "REPOSITION"
  | "REVIEW"
  | "KEEP_BOTH"
  | "NO_CHANGE";


export interface CannibalizationPolicyDecisionV2 {
  version:
    "CANNIBALIZATION_POLICY_V2";

  mode:
    CannibalizationMode;

  observedStatus:
    string;

  observedCannibalization:
    string;

  recommendedAction:
    CannibalizationSeoAction;

  blockingNewUrl:
    boolean;

  primaryOwnerUrl:
    string | null;

  warnings:
    readonly string[];

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


function text(
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


function url(
  value:
    unknown
): string | null {
  return typeof value ===
      "string" &&
    value.trim()
      .length >
      0
    ? value.trim()
    : null;
}


export function evaluateCannibalizationPolicyV2({
  ownership,
  mode =
    "SMART",
}: {
  ownership:
    unknown;

  mode?:
    CannibalizationMode;
}): Readonly<
  CannibalizationPolicyDecisionV2
> {
  const value =
    record(
      ownership
    );


  const status =
    text(
      value?.status
    ) ||
    "NO_OWNER";


  const cannibalization =
    text(
      value
        ?.cannibalization
    ) ||
    "NONE";


  const actionHint =
    text(
      value?.actionHint
    );


  const primaryOwnerUrl =
    url(
      value
        ?.primaryOwnerUrl
    );


  const overlap =
    cannibalization ===
      "CONFIRMED" ||
    cannibalization ===
      "POTENTIAL" ||
    status ===
      "MULTIPLE_OWNERS";


  if (
    mode ===
      "IGNORE"
  ) {
    return Object.freeze({
      version:
        "CANNIBALIZATION_POLICY_V2",

      mode,

      observedStatus:
        status,

      observedCannibalization:
        cannibalization,

      recommendedAction:
        "NO_CHANGE",

      blockingNewUrl:
        false,

      primaryOwnerUrl,

      warnings:
        Object.freeze([]),

      reasons:
        Object.freeze([
          "CANNIBALIZATION_POLICY_IGNORED_BY_USER",
        ]),
    });
  }


  if (
    mode ===
      "ALLOW"
  ) {
    return Object.freeze({
      version:
        "CANNIBALIZATION_POLICY_V2",

      mode,

      observedStatus:
        status,

      observedCannibalization:
        cannibalization,

      recommendedAction:
        overlap
          ? "KEEP_BOTH"
          : "CREATE",

      blockingNewUrl:
        false,

      primaryOwnerUrl,

      warnings:
        Object.freeze(
          overlap
            ? [
                "OVERLAPPING_SEARCH_OWNERSHIP_ALLOWED",
              ]
            : []
        ),

      reasons:
        Object.freeze([
          overlap
            ? "USER_POLICY_PERMITS_OVERLAP"
            : "NO_MEANINGFUL_OVERLAP_DETECTED",
        ]),
    });
  }


  if (
    mode ===
      "PREVENT"
  ) {
    if (
      status ===
        "MULTIPLE_OWNERS" ||
      cannibalization ===
        "CONFIRMED"
    ) {
      return Object.freeze({
        version:
          "CANNIBALIZATION_POLICY_V2",

        mode,

        observedStatus:
          status,

        observedCannibalization:
          cannibalization,

        recommendedAction:
          "MERGE",

        blockingNewUrl:
          true,

        primaryOwnerUrl,

        warnings:
          Object.freeze([
            "NEW_URL_BLOCKED_BY_PREVENT_POLICY",
          ]),

        reasons:
          Object.freeze([
            "MULTIPLE_SEARCH_OWNERS_EXIST",
          ]),
      });
    }


    if (
      status ===
        "SINGLE_OWNER"
    ) {
      return Object.freeze({
        version:
          "CANNIBALIZATION_POLICY_V2",

        mode,

        observedStatus:
          status,

        observedCannibalization:
          cannibalization,

        recommendedAction:
          "UPDATE",

        blockingNewUrl:
          true,

        primaryOwnerUrl,

        warnings:
          Object.freeze([
            "NEW_URL_BLOCKED_BY_PREVENT_POLICY",
          ]),

        reasons:
          Object.freeze([
            "EXISTING_SEARCH_OWNER_PRESENT",
          ]),
      });
    }


    if (
      status ===
        "INTENT_CONFLICT" ||
      cannibalization ===
        "POTENTIAL"
    ) {
      return Object.freeze({
        version:
          "CANNIBALIZATION_POLICY_V2",

        mode,

        observedStatus:
          status,

        observedCannibalization:
          cannibalization,

        recommendedAction:
          "REPOSITION",

        blockingNewUrl:
          true,

        primaryOwnerUrl,

        warnings:
          Object.freeze([
            "OVERLAP_REQUIRES_MANUAL_SEPARATION",
          ]),

        reasons:
          Object.freeze([
            "AGGRESSIVE_PREVENTION_POLICY_ACTIVE",
          ]),
      });
    }
  }


  /*
   * SMART is the production default.
   *
   * Confirmed same-mission ownership:
   *   MERGE / UPDATE instead of producing another URL.
   *
   * Different intent:
   *   Separate URL may be valid.
   *
   * Uncertain/potential overlap:
   *   Warn and review, but do not fabricate certainty.
   */
  if (
    status ===
      "MULTIPLE_OWNERS" ||
    cannibalization ===
      "CONFIRMED" ||
    actionHint ===
      "MERGE_INVESTIGATION"
  ) {
    return Object.freeze({
      version:
        "CANNIBALIZATION_POLICY_V2",

      mode:
        "SMART",

      observedStatus:
        status,

      observedCannibalization:
        cannibalization,

      recommendedAction:
        "MERGE",

      blockingNewUrl:
        true,

      primaryOwnerUrl,

      warnings:
        Object.freeze([
          "CONFIRMED_OR_MULTI_OWNER_CANNIBALIZATION",
        ]),

      reasons:
        Object.freeze([
          "SHARED_SEARCH_OWNERSHIP",
          "DO_NOT_CREATE_COMPETING_URL",
        ]),
    });
  }


  if (
    status ===
      "SINGLE_OWNER" ||
    actionHint ===
      "UPDATE_CANDIDATE"
  ) {
    return Object.freeze({
      version:
        "CANNIBALIZATION_POLICY_V2",

      mode:
        "SMART",

      observedStatus:
        status,

      observedCannibalization:
        cannibalization,

      recommendedAction:
        "UPDATE",

      blockingNewUrl:
        true,

      primaryOwnerUrl,

      warnings:
        Object.freeze([]),

      reasons:
        Object.freeze([
          "EXISTING_URL_ALREADY_OWNS_MISSION",
        ]),
    });
  }


  if (
    status ===
      "INTENT_CONFLICT" ||
    actionHint ===
      "REPOSITION_INVESTIGATION"
  ) {
    return Object.freeze({
      version:
        "CANNIBALIZATION_POLICY_V2",

      mode:
        "SMART",

      observedStatus:
        status,

      observedCannibalization:
        cannibalization,

      recommendedAction:
        "CREATE",

      blockingNewUrl:
        false,

      primaryOwnerUrl,

      warnings:
        Object.freeze([
          "RELATED_QUERY_HAS_DIFFERENT_INTENT",
        ]),

      reasons:
        Object.freeze([
          "INTENT_SEPARATION_JUSTIFIES_DISTINCT_URL",
        ]),
    });
  }


  if (
    cannibalization ===
      "POTENTIAL" ||
    status ===
      "UNCERTAIN" ||
    actionHint ===
      "REVIEW_EXISTING_PAGE"
  ) {
    return Object.freeze({
      version:
        "CANNIBALIZATION_POLICY_V2",

      mode:
        "SMART",

      observedStatus:
        status,

      observedCannibalization:
        cannibalization,

      recommendedAction:
        "REVIEW",

      blockingNewUrl:
        false,

      primaryOwnerUrl,

      warnings:
        Object.freeze([
          "CANNIBALIZATION_SIGNAL_UNCERTAIN",
        ]),

      reasons:
        Object.freeze([
          "DO_NOT_INVENT_URL_OWNERSHIP",
          "REVIEW_BEFORE_CREATION",
        ]),
    });
  }


  return Object.freeze({
    version:
      "CANNIBALIZATION_POLICY_V2",

    mode:
      mode ===
        "PREVENT"
        ? "PREVENT"
        : "SMART",

    observedStatus:
      status,

    observedCannibalization:
      cannibalization,

    recommendedAction:
      "CREATE",

    blockingNewUrl:
      false,

    primaryOwnerUrl,

    warnings:
      Object.freeze([]),

    reasons:
      Object.freeze([
        "NO_EXISTING_MISSION_OWNER_FOUND",
      ]),
  });
}
