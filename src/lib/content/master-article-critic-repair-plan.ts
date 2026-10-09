import type {
  ArticleGenerationContractV1,
} from "./article-generation-contract";

import type {
  MasterArticleCriticFindingV1,
  MasterArticleCriticSuiteV1,
} from "./master-article-critic";

import {
  ContentGenerationError,
} from "./generator";


export type MasterArticleCriticRepairDispositionV1 =
  | "NO_REPAIR_NEEDED"
  | "REPAIR_REQUIRED"
  | "BLOCK_UNREPAIRABLE";


export type MasterArticleCriticRepairabilityV1 =
  | "REPAIRABLE_SECTION"
  | "UNREPAIRABLE_CONTEXT"
  | "UNREPAIRABLE_EVIDENCE"
  | "UNREPAIRABLE_CANNIBALIZATION"
  | "UNREPAIRABLE_SCOPE"
  | "NO_REPAIR_REQUESTED";


export interface MasterArticleCriticRepairClassificationV1 {
  version:
    "MASTER_ARTICLE_CRITIC_REPAIR_CLASSIFICATION_V1";

  criticId:
    MasterArticleCriticFindingV1[
      "criticId"
    ];

  code:
    string;

  severity:
    MasterArticleCriticFindingV1[
      "severity"
    ];

  repairability:
    MasterArticleCriticRepairabilityV1;

  reason:
    string;

  finding:
    Readonly<
      MasterArticleCriticFindingV1
    >;
}


export interface MasterArticleSectionCriticRepairTaskV1 {
  version:
    "MASTER_ARTICLE_SECTION_CRITIC_REPAIR_TASK_V1";

  sectionIndex:
    number;

  sectionNumber:
    number;

  heading:
    string;

  findings:
    readonly Readonly<
      MasterArticleCriticFindingV1
    >[];
}


export interface MasterArticleCriticRepairPlanV1 {
  version:
    "MASTER_ARTICLE_CRITIC_REPAIR_PLAN_V1";

  disposition:
    MasterArticleCriticRepairDispositionV1;

  repairTasks:
    readonly Readonly<
      MasterArticleSectionCriticRepairTaskV1
    >[];

  classifications:
    readonly Readonly<
      MasterArticleCriticRepairClassificationV1
    >[];

  blockingUnrepairableFindings:
    readonly Readonly<
      MasterArticleCriticFindingV1
    >[];

  provenance:
    Readonly<{
      sourceCriticSuiteVersion:
        "MASTER_ARTICLE_CRITIC_SUITE_V1";

      findingCount:
        number;

      repairableFindingCount:
        number;

      blockingUnrepairableFindingCount:
        number;

      sectionRepairTaskCount:
        number;
    }>;
}


function classification({
  finding,
  repairability,
  reason,
}: {
  finding:
    Readonly<
      MasterArticleCriticFindingV1
    >;

  repairability:
    MasterArticleCriticRepairabilityV1;

  reason:
    string;
}): Readonly<
  MasterArticleCriticRepairClassificationV1
> {
  return Object.freeze({
    version:
      "MASTER_ARTICLE_CRITIC_REPAIR_CLASSIFICATION_V1" as const,

    criticId:
      finding.criticId,

    code:
      finding.code,

    severity:
      finding.severity,

    repairability,

    reason,

    finding,
  });
}


function isInsufficientContextFinding(
  finding:
    Readonly<
      MasterArticleCriticFindingV1
    >
): boolean {
  return (
    finding.code ===
      "ORIGINALITY_INSUFFICIENT_CONTEXT" ||
    finding.code ===
      "CANNIBALIZATION_INSUFFICIENT_CONTEXT" ||
    finding.code.endsWith(
      "_INSUFFICIENT_CONTEXT"
    )
  );
}


export function classifyMasterArticleCriticFindingRepairabilityV1(
  finding:
    Readonly<
      MasterArticleCriticFindingV1
    >
): Readonly<
  MasterArticleCriticRepairClassificationV1
> {
  /*
   * Missing authoritative context is an upstream research defect.
   * Rewriting prose cannot create legitimate evidence/context.
   */
  if (
    isInsufficientContextFinding(
      finding
    )
  ) {
    return classification({
      finding,

      repairability:
        "UNREPAIRABLE_CONTEXT",

      reason:
        "Authoritative critic context is missing; prose repair cannot create it.",
    });
  }


  /*
   * Evidence/YMYL failures are never repaired by an article critic.
   *
   * Stage 9I owns claim/evidence correctness. If the final critic
   * still blocks here, the correct response is fail closed or
   * repair upstream evidence/research — not ask the writer to
   * manufacture a safer-looking sentence.
   */
  if (
    finding.criticId ===
    "EVIDENCE_YMYL"
  ) {
    return classification({
      finding,

      repairability:
        "UNREPAIRABLE_EVIDENCE",

      reason:
        "Evidence/YMYL authority must be corrected upstream, not synthesized by prose repair.",
    });
  }


  /*
   * Cannibalization is a URL/search-intent ownership decision.
   * It may imply UPDATE/MERGE/REPOSITION/NO-GO.
   *
   * Do not hide a real ownership conflict by paraphrasing one
   * section.
   */
  if (
    finding.criticId ===
    "CANNIBALIZATION"
  ) {
    return classification({
      finding,

      repairability:
        "UNREPAIRABLE_CANNIBALIZATION",

      reason:
        "Cannibalization requires URL ownership or page-action resolution, not text-only repair.",
    });
  }


  if (
    finding.repairScope !==
    "SECTION"
  ) {
    return classification({
      finding,

      repairability:
        finding.repairScope ===
        "NONE"
          ? "NO_REPAIR_REQUESTED"
          : "UNREPAIRABLE_SCOPE",

      reason:
        "Only an explicitly section-scoped finding may enter targeted section repair.",
    });
  }


  if (
    finding.location.scope !==
    "SECTION"
  ) {
    return classification({
      finding,

      repairability:
        "UNREPAIRABLE_SCOPE",

      reason:
        "SECTION repair requires an exact SECTION location.",
    });
  }


  /*
   * At this point the finding is a real localized text defect.
   *
   * Typical examples:
   * - deep intent miss
   * - incomplete query coverage
   * - originality issue against real supplied references
   * - editorial weakness
   * - semantic drift
   * - approved internal-link omission/misuse
   *
   * Structural/evidence authority still gets revalidated after
   * any repair in 9J-E2.
   */
  return classification({
    finding,

    repairability:
      "REPAIRABLE_SECTION",

    reason:
      "Finding is explicitly localized to one approved section and does not require new upstream authority.",
  });
}


function exactSection({
  contract,
  finding,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  finding:
    Readonly<
      MasterArticleCriticFindingV1
    >;
}) {
  if (
    finding.location.scope !==
    "SECTION"
  ) {
    throw new ContentGenerationError(
      `MASTER_CRITIC_REPAIR_SECTION_LOCATION_REQUIRED:${finding.criticId}:${finding.code}`
    );
  }


  const section =
    contract.sectionContracts[
      finding.location
        .sectionIndex
    ];


  if (!section) {
    throw new ContentGenerationError(
      `MASTER_CRITIC_REPAIR_SECTION_NOT_FOUND:${finding.location.sectionIndex}`
    );
  }


  if (
    section.sectionIndex !==
    finding.location
      .sectionIndex ||
    section.sectionNumber !==
    finding.location
      .sectionNumber ||
    section.blueprint.heading !==
    finding.location
      .heading
  ) {
    throw new ContentGenerationError(
      `MASTER_CRITIC_REPAIR_SECTION_PROVENANCE_MISMATCH:${finding.location.sectionIndex}`
    );
  }


  return section;
}


export function buildMasterArticleCriticRepairPlanV1({
  contract,
  suite,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  suite:
    Readonly<
      MasterArticleCriticSuiteV1
    >;
}): Readonly<
  MasterArticleCriticRepairPlanV1
> {
  if (
    suite.version !==
    "MASTER_ARTICLE_CRITIC_SUITE_V1"
  ) {
    throw new ContentGenerationError(
      "MASTER_CRITIC_REPAIR_INVALID_SUITE_VERSION"
    );
  }


  const findings =
    suite.results.flatMap(
      (result) =>
        result.findings
    );


  const classifications =
    Object.freeze(
      findings.map(
        (
          finding
        ) =>
          classifyMasterArticleCriticFindingRepairabilityV1(
            finding
          )
      )
    );


  /*
   * MASTER_CRITIC_WARN_DIAGNOSTIC_ONLY_V1
   *
   * WARN is review telemetry, not an automatic authoring mandate.
   *
   * Spending Writer/repair calls on non-blocking cosmetic warnings
   * creates unnecessary model cost and can itself introduce new
   * semantic risk.
   *
   * Only a localized BLOCK may enter the bounded model-repair
   * transaction.
   *
   * WARN findings remain in the critic suite and therefore remain
   * visible to Final Readiness / human review.
   */
  const repairable =
    classifications.filter(
      (
        item
      ) =>
        item.severity ===
          "BLOCK" &&
        item.repairability ===
          "REPAIRABLE_SECTION"
    );


  /*
   * Any BLOCK that cannot be fixed by localized prose repair
   * prevents all repair attempts.
   *
   * This avoids wasting an LLM call when the real blocker is
   * missing research, evidence, ownership, or article/shell scope.
   */
  const blockingUnrepairable =
    Object.freeze(
      classifications
        .filter(
          (
            item
          ) =>
            item.severity ===
              "BLOCK" &&
            item.repairability !==
              "REPAIRABLE_SECTION"
        )
        .map(
          (
            item
          ) =>
            item.finding
        )
    );


  const grouped =
    new Map<
      number,
      {
        sectionNumber:
          number;

        heading:
          string;

        findings:
          MasterArticleCriticFindingV1[];
      }
    >();


  for (
    const item
    of repairable
  ) {
    const finding =
      item.finding;

    const section =
      exactSection({
        contract,
        finding,
      });


    const sectionIndex =
      section.sectionIndex;


    const existing =
      grouped.get(
        sectionIndex
      );


    if (existing) {
      existing.findings.push(
        finding
      );

      continue;
    }


    grouped.set(
      sectionIndex,
      {
        sectionNumber:
          section.sectionNumber,

        heading:
          section.blueprint
            .heading,

        findings: [
          finding,
        ],
      }
    );
  }


  const repairTasks =
    Object.freeze(
      Array.from(
        grouped.entries()
      )
        .sort(
          (
            [a],
            [b]
          ) =>
            a -
            b
        )
        .map(
          (
            [
              sectionIndex,
              task,
            ]
          ) =>
            Object.freeze({
              version:
                "MASTER_ARTICLE_SECTION_CRITIC_REPAIR_TASK_V1" as const,

              sectionIndex,

              sectionNumber:
                task.sectionNumber,

              heading:
                task.heading,

              findings:
                Object.freeze([
                  ...task.findings,
                ]),
            })
        )
    );


  let disposition:
    MasterArticleCriticRepairDispositionV1;


  if (
    blockingUnrepairable.length >
    0
  ) {
    disposition =
      "BLOCK_UNREPAIRABLE";
  } else if (
    repairTasks.length >
    0
  ) {
    disposition =
      "REPAIR_REQUIRED";
  } else {
    disposition =
      "NO_REPAIR_NEEDED";
  }


  return Object.freeze({
    version:
      "MASTER_ARTICLE_CRITIC_REPAIR_PLAN_V1" as const,

    disposition,

    repairTasks,

    classifications,

    blockingUnrepairableFindings:
      blockingUnrepairable,

    provenance:
      Object.freeze({
        sourceCriticSuiteVersion:
          "MASTER_ARTICLE_CRITIC_SUITE_V1" as const,

        findingCount:
          findings.length,

        repairableFindingCount:
          repairable.length,

        blockingUnrepairableFindingCount:
          blockingUnrepairable
            .length,

        sectionRepairTaskCount:
          repairTasks.length,
      }),
  });
}


export function assertMasterArticleCriticRepairPlanExecutableV1(
  plan:
    Readonly<
      MasterArticleCriticRepairPlanV1
    >
): void {
  if (
    plan.disposition ===
    "BLOCK_UNREPAIRABLE"
  ) {
    const summary =
      plan
        .blockingUnrepairableFindings
        .map(
          (
            finding
          ) =>
            [
              finding.criticId,
              finding.code,
              finding.location.scope,
            ].join(
              ":"
            )
        )
        .join(
          "|"
        );


    throw new ContentGenerationError(
      `MASTER_CRITIC_REPAIR_BLOCKED_UNREPAIRABLE:${summary}`
    );
  }
}
