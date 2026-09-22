import {
  ContentGenerationError,
} from "./generator";


export const MASTER_ARTICLE_CRITIC_IDS = [
  "INTENT",
  "COVERAGE",
  "EVIDENCE_YMYL",
  "ORIGINALITY",
  "EDITORIAL",
  "SEMANTIC_DRIFT",
  "CANNIBALIZATION",
  "INTERNAL_LINKS",
  "TECHNICAL_SEO",
] as const;


export type MasterArticleCriticId =
  (
    typeof MASTER_ARTICLE_CRITIC_IDS
  )[number];


export type MasterArticleCriticStatus =
  | "PASS"
  | "WARN"
  | "BLOCK";


export type MasterArticleCriticSeverity =
  | "WARN"
  | "BLOCK";


export type MasterArticleCriticLocation =
  | Readonly<{
      scope:
        "ARTICLE";
    }>
  | Readonly<{
      scope:
        "SHELL";

      field:
        | "TITLE"
        | "META_DESCRIPTION"
        | "H1";
    }>
  | Readonly<{
      scope:
        "SECTION";

      sectionIndex:
        number;

      sectionNumber:
        number;

      heading:
        string;
    }>;


export type MasterArticleRepairScope =
  | "NONE"
  | "SECTION";


export interface MasterArticleCriticEvidenceV1 {
  claimIds:
    readonly string[];

  evidenceIds:
    readonly string[];

  queryNodeIds:
    readonly string[];

  sourceIds:
    readonly string[];
}


export interface MasterArticleCriticFindingV1 {
  version:
    "MASTER_ARTICLE_CRITIC_FINDING_V1";

  criticId:
    MasterArticleCriticId;

  code:
    string;

  severity:
    MasterArticleCriticSeverity;

  location:
    MasterArticleCriticLocation;

  message:
    string;

  recommendation:
    string;

  repairScope:
    MasterArticleRepairScope;

  evidence:
    Readonly<
      MasterArticleCriticEvidenceV1
    >;
}


export interface MasterArticleCriticResultV1 {
  version:
    "MASTER_ARTICLE_CRITIC_RESULT_V1";

  criticId:
    MasterArticleCriticId;

  status:
    MasterArticleCriticStatus;

  findings:
    readonly Readonly<
      MasterArticleCriticFindingV1
    >[];

  modelName:
    string | null;
}


export interface MasterArticleCriticSuiteV1 {
  version:
    "MASTER_ARTICLE_CRITIC_SUITE_V1";

  status:
    MasterArticleCriticStatus;

  requiredCritics:
    readonly MasterArticleCriticId[];

  results:
    readonly Readonly<
      MasterArticleCriticResultV1
    >[];

  findings:
    readonly Readonly<
      MasterArticleCriticFindingV1
    >[];

  counts:
    Readonly<{
      critics:
        number;

      passedCritics:
        number;

      warnedCritics:
        number;

      blockedCritics:
        number;

      findings:
        number;

      warnFindings:
        number;

      blockFindings:
        number;

      sectionRepairableFindings:
        number;
    }>;
}


function cleanRequiredString(
  value:
    string,
  code:
    string
): string {
  const clean =
    value.trim();

  if (!clean) {
    throw new ContentGenerationError(
      code
    );
  }

  return clean;
}


function uniqueStrings(
  values:
    readonly string[]
): readonly string[] {
  return Object.freeze(
    Array.from(
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
    )
  );
}


function freezeEvidence(
  evidence:
    MasterArticleCriticEvidenceV1
): Readonly<
  MasterArticleCriticEvidenceV1
> {
  return Object.freeze({
    claimIds:
      uniqueStrings(
        evidence.claimIds
      ),

    evidenceIds:
      uniqueStrings(
        evidence.evidenceIds
      ),

    queryNodeIds:
      uniqueStrings(
        evidence.queryNodeIds
      ),

    sourceIds:
      uniqueStrings(
        evidence.sourceIds
      ),
  });
}


function freezeLocation(
  location:
    MasterArticleCriticLocation
): MasterArticleCriticLocation {
  if (
    location.scope ===
    "ARTICLE"
  ) {
    return Object.freeze({
      scope:
        "ARTICLE" as const,
    });
  }


  if (
    location.scope ===
    "SHELL"
  ) {
    return Object.freeze({
      scope:
        "SHELL" as const,

      field:
        location.field,
    });
  }


  if (
    !Number.isInteger(
      location.sectionIndex
    ) ||
    location.sectionIndex <
      0
  ) {
    throw new ContentGenerationError(
      "MASTER_CRITIC_SECTION_INDEX_INVALID"
    );
  }


  if (
    !Number.isInteger(
      location.sectionNumber
    ) ||
    location.sectionNumber <
      1
  ) {
    throw new ContentGenerationError(
      "MASTER_CRITIC_SECTION_NUMBER_INVALID"
    );
  }


  return Object.freeze({
    scope:
      "SECTION" as const,

    sectionIndex:
      location.sectionIndex,

    sectionNumber:
      location.sectionNumber,

    heading:
      cleanRequiredString(
        location.heading,
        "MASTER_CRITIC_SECTION_HEADING_REQUIRED"
      ),
  });
}


export function createMasterArticleCriticFindingV1({
  criticId,
  code,
  severity,
  location,
  message,
  recommendation,
  repairScope,
  evidence = {
    claimIds:
      [],

    evidenceIds:
      [],

    queryNodeIds:
      [],

    sourceIds:
      [],
  },
}: {
  criticId:
    MasterArticleCriticId;

  code:
    string;

  severity:
    MasterArticleCriticSeverity;

  location:
    MasterArticleCriticLocation;

  message:
    string;

  recommendation:
    string;

  repairScope:
    MasterArticleRepairScope;

  evidence?:
    MasterArticleCriticEvidenceV1;
}): Readonly<
  MasterArticleCriticFindingV1
> {
  const frozenLocation =
    freezeLocation(
      location
    );


  if (
    repairScope ===
      "SECTION" &&
    frozenLocation.scope !==
      "SECTION"
  ) {
    throw new ContentGenerationError(
      "MASTER_CRITIC_SECTION_REPAIR_REQUIRES_SECTION_LOCATION"
    );
  }


  return Object.freeze({
    version:
      "MASTER_ARTICLE_CRITIC_FINDING_V1" as const,

    criticId,

    code:
      cleanRequiredString(
        code,
        "MASTER_CRITIC_FINDING_CODE_REQUIRED"
      ),

    severity,

    location:
      frozenLocation,

    message:
      cleanRequiredString(
        message,
        "MASTER_CRITIC_FINDING_MESSAGE_REQUIRED"
      ),

    recommendation:
      cleanRequiredString(
        recommendation,
        "MASTER_CRITIC_FINDING_RECOMMENDATION_REQUIRED"
      ),

    repairScope,

    evidence:
      freezeEvidence(
        evidence
      ),
  });
}


function statusFromFindings(
  findings:
    readonly Readonly<
      MasterArticleCriticFindingV1
    >[]
): MasterArticleCriticStatus {
  if (
    findings.some(
      (finding) =>
        finding.severity ===
        "BLOCK"
    )
  ) {
    return "BLOCK";
  }

  if (
    findings.length >
    0
  ) {
    return "WARN";
  }

  return "PASS";
}


export function finalizeMasterArticleCriticResultV1({
  criticId,
  findings,
  modelName = null,
}: {
  criticId:
    MasterArticleCriticId;

  findings:
    readonly Readonly<
      MasterArticleCriticFindingV1
    >[];

  modelName?:
    string |
    null;
}): Readonly<
  MasterArticleCriticResultV1
> {
  for (
    const finding
    of findings
  ) {
    if (
      finding.version !==
      "MASTER_ARTICLE_CRITIC_FINDING_V1"
    ) {
      throw new ContentGenerationError(
        "MASTER_CRITIC_FINDING_VERSION_INVALID"
      );
    }

    if (
      finding.criticId !==
      criticId
    ) {
      throw new ContentGenerationError(
        [
          "MASTER_CRITIC_FINDING_CRITIC_MISMATCH",
          criticId,
          finding.criticId,
        ].join(
          ":"
        )
      );
    }
  }


  const cleanModelName =
    modelName ===
      null
      ? null
      : cleanRequiredString(
          modelName,
          "MASTER_CRITIC_MODEL_NAME_INVALID"
        );


  return Object.freeze({
    version:
      "MASTER_ARTICLE_CRITIC_RESULT_V1" as const,

    criticId,

    status:
      statusFromFindings(
        findings
      ),

    findings:
      Object.freeze([
        ...findings,
      ]),

    modelName:
      cleanModelName,
  });
}


function criticRank(
  criticId:
    MasterArticleCriticId
): number {
  return MASTER_ARTICLE_CRITIC_IDS.indexOf(
    criticId
  );
}


function findingLocationRank(
  finding:
    Readonly<
      MasterArticleCriticFindingV1
    >
): number {
  if (
    finding.location.scope ===
    "ARTICLE"
  ) {
    return -2;
  }

  if (
    finding.location.scope ===
    "SHELL"
  ) {
    return -1;
  }

  return finding.location
    .sectionIndex;
}


export function aggregateMasterArticleCriticSuiteV1({
  results,
}: {
  results:
    readonly Readonly<
      MasterArticleCriticResultV1
    >[];
}): Readonly<
  MasterArticleCriticSuiteV1
> {
  const byCritic =
    new Map<
      MasterArticleCriticId,
      Readonly<
        MasterArticleCriticResultV1
      >
    >();


  for (
    const result
    of results
  ) {
    if (
      result.version !==
      "MASTER_ARTICLE_CRITIC_RESULT_V1"
    ) {
      throw new ContentGenerationError(
        "MASTER_CRITIC_RESULT_VERSION_INVALID"
      );
    }


    if (
      byCritic.has(
        result.criticId
      )
    ) {
      throw new ContentGenerationError(
        `MASTER_CRITIC_DUPLICATE:${result.criticId}`
      );
    }


    /*
     * Never trust a caller-supplied result status.
     * Re-derive it from immutable findings.
     */
    const derivedStatus =
      statusFromFindings(
        result.findings
      );

    if (
      derivedStatus !==
      result.status
    ) {
      throw new ContentGenerationError(
        `MASTER_CRITIC_STATUS_MISMATCH:${result.criticId}`
      );
    }


    byCritic.set(
      result.criticId,
      result
    );
  }


  const missing =
    MASTER_ARTICLE_CRITIC_IDS
      .filter(
        (criticId) =>
          !byCritic.has(
            criticId
          )
      );


  if (
    missing.length >
    0
  ) {
    throw new ContentGenerationError(
      [
        "MASTER_CRITIC_SUITE_INCOMPLETE",
        ...missing,
      ].join(
        ":"
      )
    );
  }


  if (
    byCritic.size !==
    MASTER_ARTICLE_CRITIC_IDS
      .length
  ) {
    throw new ContentGenerationError(
      "MASTER_CRITIC_SUITE_CARDINALITY_INVALID"
    );
  }


  const orderedResults =
    Object.freeze(
      MASTER_ARTICLE_CRITIC_IDS
        .map(
          (criticId) =>
            byCritic.get(
              criticId
            )
        )
        .filter(
          (
            result
          ): result is Readonly<
            MasterArticleCriticResultV1
          > =>
            Boolean(
              result
            )
        )
    );


  const findings =
    Object.freeze(
      orderedResults
        .flatMap(
          (result) =>
            result.findings
        )
        .sort(
          (
            left,
            right
          ) => {
            const criticDelta =
              criticRank(
                left.criticId
              ) -
              criticRank(
                right.criticId
              );

            if (
              criticDelta !==
              0
            ) {
              return criticDelta;
            }

            return (
              findingLocationRank(
                left
              ) -
              findingLocationRank(
                right
              )
            );
          }
        )
    );


  const blockedCritics =
    orderedResults.filter(
      (result) =>
        result.status ===
        "BLOCK"
    ).length;


  const warnedCritics =
    orderedResults.filter(
      (result) =>
        result.status ===
        "WARN"
    ).length;


  const passedCritics =
    orderedResults.filter(
      (result) =>
        result.status ===
        "PASS"
    ).length;


  const blockFindings =
    findings.filter(
      (finding) =>
        finding.severity ===
        "BLOCK"
    ).length;


  const warnFindings =
    findings.filter(
      (finding) =>
        finding.severity ===
        "WARN"
    ).length;


  const status:
    MasterArticleCriticStatus =
      blockedCritics >
      0
        ? "BLOCK"
        : warnedCritics >
          0
          ? "WARN"
          : "PASS";


  return Object.freeze({
    version:
      "MASTER_ARTICLE_CRITIC_SUITE_V1" as const,

    status,

    requiredCritics:
      Object.freeze([
        ...MASTER_ARTICLE_CRITIC_IDS,
      ]),

    results:
      orderedResults,

    findings,

    counts:
      Object.freeze({
        critics:
          orderedResults.length,

        passedCritics,

        warnedCritics,

        blockedCritics,

        findings:
          findings.length,

        warnFindings,

        blockFindings,

        sectionRepairableFindings:
          findings.filter(
            (finding) =>
              finding.repairScope ===
              "SECTION"
          ).length,
      }),
  });
}


export function assertMasterArticleCriticSuitePassed(
  suite:
    Readonly<
      MasterArticleCriticSuiteV1
    >
): void {
  if (
    suite.status !==
    "BLOCK"
  ) {
    return;
  }


  const blocking =
    suite.findings
      .filter(
        (finding) =>
          finding.severity ===
          "BLOCK"
      )
      .map(
        (finding) => {
          const location =
            finding.location.scope ===
            "SECTION"
              ? `SECTION_${finding.location.sectionIndex}`
              : finding.location.scope;

          return [
            finding.criticId,
            finding.code,
            location,
          ].join(
            ":"
          );
        }
      );


  throw new ContentGenerationError(
    [
      "MASTER_ARTICLE_CRITIC_SUITE_BLOCKED",
      ...blocking,
    ].join(
      ":"
    )
  );
}
