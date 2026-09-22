import type {
  EvidenceSource,
} from "./evidence-graph";


export type FactFreshnessType =
  | "DEFINITION"
  | "STATISTIC"
  | "PRICE"
  | "LAW"
  | "PRODUCT_FEATURE"
  | "CURRENT_SERVICE_TERMS";


export type FactTtlClass =
  | "LONG"
  | "SOURCE_DEPENDENT"
  | "SHORT";


export type FactFreshnessStatus =
  | "FRESH"
  | "STALE"
  | "UNKNOWN";


export interface FactFreshnessPolicy {
  factType:
    FactFreshnessType;

  ttlClass:
    FactTtlClass;

  primarySourceRequired:
    boolean;

  /*
   * Master defines symbolic TTL classes, not invented fixed durations.
   * maxAgeDays must therefore come from explicit policy/config/evidence.
   */
  maxAgeDays:
    number | null;
}


export interface FactFreshnessAssessment {
  status:
    FactFreshnessStatus;

  factType:
    FactFreshnessType;

  ttlClass:
    FactTtlClass;

  primarySourceRequired:
    boolean;

  sourceIsPrimary:
    boolean;

  freshnessAnchor:
    Date | null;

  ageDays:
    number | null;

  maxAgeDays:
    number | null;

  evidence:
    readonly string[];
}


export function defaultFactFreshnessPolicy(
  factType:
    FactFreshnessType
): Readonly<FactFreshnessPolicy> {
  switch (
    factType
  ) {
    case "DEFINITION":
      return Object.freeze({
        factType,

        ttlClass:
          "LONG",

        primarySourceRequired:
          false,

        maxAgeDays:
          null,
      });

    case "STATISTIC":
      return Object.freeze({
        factType,

        ttlClass:
          "SOURCE_DEPENDENT",

        primarySourceRequired:
          false,

        maxAgeDays:
          null,
      });

    case "LAW":
      return Object.freeze({
        factType,

        ttlClass:
          "SHORT",

        primarySourceRequired:
          true,

        maxAgeDays:
          null,
      });

    case "PRICE":
    case "PRODUCT_FEATURE":
    case "CURRENT_SERVICE_TERMS":
      return Object.freeze({
        factType,

        ttlClass:
          "SHORT",

        primarySourceRequired:
          false,

        maxAgeDays:
          null,
      });
  }
}


export function buildFactFreshnessPolicy({
  factType,
  maxAgeDays,
}: {
  factType:
    FactFreshnessType;

  maxAgeDays?:
    number | null;
}): Readonly<FactFreshnessPolicy> {
  const base =
    defaultFactFreshnessPolicy(
      factType
    );

  if (
    maxAgeDays !==
      undefined &&
    maxAgeDays !==
      null &&
    (
      !Number.isFinite(
        maxAgeDays
      ) ||
      maxAgeDays <=
        0
    )
  ) {
    throw new Error(
      "FACT_FRESHNESS_MAX_AGE_INVALID"
    );
  }

  return Object.freeze({
    ...base,

    maxAgeDays:
      maxAgeDays ??
      null,
  });
}


function daysBetween(
  later:
    Date,

  earlier:
    Date
): number {
  return Math.max(
    0,
    Math.floor(
      (
        later.getTime() -
        earlier.getTime()
      ) /
        86_400_000
    )
  );
}


export function evaluateFactFreshness({
  source,
  policy,
  asOf,
}: {
  source:
    Readonly<EvidenceSource>;

  policy:
    Readonly<FactFreshnessPolicy>;

  asOf:
    Date;
}): Readonly<FactFreshnessAssessment> {
  if (
    Number.isNaN(
      asOf.getTime()
    )
  ) {
    throw new Error(
      "FACT_FRESHNESS_AS_OF_INVALID"
    );
  }

  const sourceIsPrimary =
    source.sourceType ===
      "PRIMARY_GOVERNMENT" ||
    source.sourceType ===
      "PRIMARY_OFFICIAL";

  const freshnessAnchor =
    source.updatedAt ??
    source.publishedAt ??
    null;

  const evidence:
    string[] = [
      `TTL_CLASS:${policy.ttlClass}`,
      `SOURCE_TYPE:${source.sourceType}`,
    ];

  if (
    policy.primarySourceRequired
  ) {
    evidence.push(
      "PRIMARY_SOURCE_REQUIRED"
    );
  }

  if (
    !freshnessAnchor ||
    policy.maxAgeDays ===
      null
  ) {
    return Object.freeze({
      status:
        "UNKNOWN" as const,

      factType:
        policy.factType,

      ttlClass:
        policy.ttlClass,

      primarySourceRequired:
        policy.primarySourceRequired,

      sourceIsPrimary,

      freshnessAnchor,

      ageDays:
        null,

      maxAgeDays:
        policy.maxAgeDays,

      evidence:
        Object.freeze([
          ...evidence,
          !freshnessAnchor
            ? "SOURCE_DATE_UNAVAILABLE"
            : "NUMERIC_TTL_NOT_CONFIGURED",
        ]),
    });
  }

  const ageDays =
    daysBetween(
      asOf,
      freshnessAnchor
    );

  const status:
    FactFreshnessStatus =
      ageDays >
      policy.maxAgeDays
        ? "STALE"
        : "FRESH";

  return Object.freeze({
    status,

    factType:
      policy.factType,

    ttlClass:
      policy.ttlClass,

    primarySourceRequired:
      policy.primarySourceRequired,

    sourceIsPrimary,

    freshnessAnchor:
      new Date(
        freshnessAnchor
      ),

    ageDays,

    maxAgeDays:
      policy.maxAgeDays,

    evidence:
      Object.freeze([
        ...evidence,
        `AGE_DAYS:${ageDays}`,
        `MAX_AGE_DAYS:${policy.maxAgeDays}`,
      ]),
  });
}
