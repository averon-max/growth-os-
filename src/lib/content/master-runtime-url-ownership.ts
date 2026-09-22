import type {
  evaluateUrlOwnership,
} from "./url-ownership";


export type MasterRuntimeUrlOwnershipV1 =
  Readonly<
    ReturnType<
      typeof evaluateUrlOwnership
    >
  >;


const OWNERSHIP_STATUSES =
  new Set([
    "NO_OWNER",
    "SINGLE_OWNER",
    "MULTIPLE_OWNERS",
    "INTENT_CONFLICT",
    "UNCERTAIN",
  ]);


const CANNIBALIZATION_STATUSES =
  new Set([
    "NONE",
    "POTENTIAL",
    "CONFIRMED",
  ]);


const ACTION_HINTS =
  new Set([
    "CREATE_CANDIDATE",
    "UPDATE_CANDIDATE",
    "MERGE_INVESTIGATION",
    "REPOSITION_INVESTIGATION",
    "REVIEW_EXISTING_PAGE",
  ]);


function isRecord(
  value:
    unknown
): value is Record<
  string,
  unknown
> {
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


function requiredString(
  value:
    unknown,
  code:
    string
): string {
  if (
    typeof value !==
      "string" ||
    value.trim().length ===
      0
  ) {
    throw new Error(
      code
    );
  }

  return value.trim();
}


function nullableString(
  value:
    unknown,
  code:
    string
): string | null {
  if (
    value ===
    null
  ) {
    return null;
  }

  return requiredString(
    value,
    code
  );
}


function finiteNumber(
  value:
    unknown,
  code:
    string
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value
    )
  ) {
    throw new Error(
      code
    );
  }

  return value;
}


function stringArray(
  value:
    unknown,
  code:
    string
): readonly string[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    throw new Error(
      code
    );
  }

  const result =
    value.map(
      (
        item
      ) =>
        requiredString(
          item,
          code
        )
    );

  return Object.freeze(
    result
  );
}


function normalizeCandidate(
  value:
    unknown
): Readonly<
  Record<
    string,
    unknown
  >
> {
  if (
    !isRecord(
      value
    )
  ) {
    throw new Error(
      "MASTER_RUNTIME_URL_OWNERSHIP_CANDIDATE_INVALID"
    );
  }


  const url =
    requiredString(
      value.url,
      "MASTER_RUNTIME_URL_OWNERSHIP_CANDIDATE_URL_INVALID"
    );


  const matchedQueries =
    stringArray(
      value.matchedQueries,
      "MASTER_RUNTIME_URL_OWNERSHIP_MATCHED_QUERIES_INVALID"
    );


  if (
    typeof value.intentMatch !==
    "boolean"
  ) {
    throw new Error(
      "MASTER_RUNTIME_URL_OWNERSHIP_INTENT_MATCH_INVALID"
    );
  }


  const queryOverlap =
    finiteNumber(
      value.queryOverlap,
      "MASTER_RUNTIME_URL_OWNERSHIP_QUERY_OVERLAP_INVALID"
    );


  const matchedImpressions =
    finiteNumber(
      value.matchedImpressions,
      "MASTER_RUNTIME_URL_OWNERSHIP_IMPRESSIONS_INVALID"
    );


  const missionAffinity =
    finiteNumber(
      value.missionAffinity,
      "MASTER_RUNTIME_URL_OWNERSHIP_AFFINITY_INVALID"
    );


  return Object.freeze({
    ...value,

    url,

    matchedQueries,

    intentMatch:
      value.intentMatch,

    queryOverlap,

    matchedImpressions,

    missionAffinity,
  });
}


export function normalizeMasterRuntimeUrlOwnershipV1(
  value:
    unknown
): Readonly<
  MasterRuntimeUrlOwnershipV1
> | null {
  /*
   * Backward compatibility:
   *
   * old persisted master runtimes predate URL Ownership
   * persistence. They remain readable/auditable as null.
   *
   * The production critic gate will later treat null as
   * insufficient cannibalization context and BLOCK acceptance.
   */
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return null;
  }


  if (
    !isRecord(
      value
    )
  ) {
    throw new Error(
      "MASTER_RUNTIME_URL_OWNERSHIP_INVALID"
    );
  }


  if (
    value.version !==
    "URL_OWNERSHIP_V1"
  ) {
    throw new Error(
      "MASTER_RUNTIME_URL_OWNERSHIP_VERSION_INVALID"
    );
  }


  const missionId =
    requiredString(
      value.missionId,
      "MASTER_RUNTIME_URL_OWNERSHIP_MISSION_INVALID"
    );


  const status =
    requiredString(
      value.status,
      "MASTER_RUNTIME_URL_OWNERSHIP_STATUS_INVALID"
    );


  if (
    !OWNERSHIP_STATUSES.has(
      status
    )
  ) {
    throw new Error(
      "MASTER_RUNTIME_URL_OWNERSHIP_STATUS_INVALID"
    );
  }


  const cannibalization =
    requiredString(
      value.cannibalization,
      "MASTER_RUNTIME_URL_OWNERSHIP_CANNIBALIZATION_INVALID"
    );


  if (
    !CANNIBALIZATION_STATUSES.has(
      cannibalization
    )
  ) {
    throw new Error(
      "MASTER_RUNTIME_URL_OWNERSHIP_CANNIBALIZATION_INVALID"
    );
  }


  const actionHint =
    requiredString(
      value.actionHint,
      "MASTER_RUNTIME_URL_OWNERSHIP_ACTION_INVALID"
    );


  if (
    !ACTION_HINTS.has(
      actionHint
    )
  ) {
    throw new Error(
      "MASTER_RUNTIME_URL_OWNERSHIP_ACTION_INVALID"
    );
  }


  const primaryOwnerUrl =
    nullableString(
      value.primaryOwnerUrl,
      "MASTER_RUNTIME_URL_OWNERSHIP_PRIMARY_URL_INVALID"
    );


  if (
    !Array.isArray(
      value.candidates
    )
  ) {
    throw new Error(
      "MASTER_RUNTIME_URL_OWNERSHIP_CANDIDATES_INVALID"
    );
  }


  const candidates =
    Object.freeze(
      value.candidates.map(
        normalizeCandidate
      )
    );


  const targetQueries =
    stringArray(
      value.targetQueries,
      "MASTER_RUNTIME_URL_OWNERSHIP_TARGET_QUERIES_INVALID"
    );


  const evidence =
    stringArray(
      value.evidence,
      "MASTER_RUNTIME_URL_OWNERSHIP_EVIDENCE_INVALID"
    );


  return Object.freeze({
    ...value,

    version:
      "URL_OWNERSHIP_V1",

    missionId,

    status,

    cannibalization,

    actionHint,

    primaryOwnerUrl,

    candidates,

    targetQueries,

    evidence,
  }) as unknown as
    Readonly<
      MasterRuntimeUrlOwnershipV1
    >;
}
