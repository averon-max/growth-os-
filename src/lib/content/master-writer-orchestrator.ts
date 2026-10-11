import type {
  ArticleGenerationContractV1,
} from "./article-generation-contract";

import type {
  GeneratedSectionV1,
  MasterArticleGenerator,
} from "./master-article-generator";

import {
  supportsMasterArticleGenerator,
} from "./master-article-generator";

import type {
  GeneratedArticleShellV1,
  MasterArticleShellGenerator,
} from "./master-article-shell-generator";

import {
  supportsMasterArticleShellGenerator,
} from "./master-article-shell-generator";

import type {
  ArticleShellV1,
  ComposedMasterArticleV1,
} from "./master-article-composer";

import {
  assertDistinctArticleHeadingsV1,
  composeMasterArticleV1,
} from "./master-article-composer";

import type {
  SectionClaimReconciliationV1,
} from "./section-claim-reconciliation";

import type {
  MasterSectionSemanticVerifier,
  SectionSemanticVerificationV1,
} from "./master-section-semantic-verifier";

import {
  supportsMasterSectionSemanticVerifier,
} from "./master-section-semantic-verifier";

import type {
  MasterSectionRepairGenerator,
  SectionRepairAuditV1,
} from "./master-section-repair";

import {
  supportsMasterSectionRepairGenerator,
  verifyAndRepairGeneratedSectionV1,
} from "./master-section-repair";

import {
  ContentGenerationError,
} from "./generator";
import {
  assertSectionClaimReconciliationPassed,
  reconcileGeneratedSectionClaimsV1,
} from "./section-claim-reconciliation";
import {
  assertSectionSemanticVerificationPassed,
  finalizeSectionSemanticVerificationV1,
} from "./master-section-semantic-verifier";
import type { VerifiedMasterSectionV1 } from "./master-section-repair";
import {
  fingerprintMasterWriterContractV1,
  type MasterWriterSectionProgressV1,
} from "./master-writer-section-progress-v1";


export interface MasterWriterGenerator
  extends
    MasterArticleGenerator,
    MasterArticleShellGenerator,
    MasterSectionSemanticVerifier,
    MasterSectionRepairGenerator {}


export interface MasterWriterRunProvenanceV1 {
  sourceContractVersion:
    "ARTICLE_GENERATION_CONTRACT_V1";

  sourceRuntimeVersion:
    "MASTER_RUNTIME_SNAPSHOT_V1";

  generatorModelName:
    string;

  shellModelName:
    string;

  sectionModelNames:
    readonly string[];

  sectionCount:
    number;

  reconciliationCount:
    number;

  reconciliationWarnCount:
    number;

  reconciliationBlockCount:
    0;

  semanticVerificationCount:
    number;

  semanticWarnCount:
    number;

  semanticBlockCount:
    0;

  repairedSectionCount:
    number;

  repairAttemptCount:
    number;

  executionMode:
    "SEQUENTIAL";
}


export interface MasterWriterRunV1 {
  version:
    "MASTER_WRITER_RUN_V1";

  shell:
    Readonly<GeneratedArticleShellV1>;

  sections:
    readonly Readonly<GeneratedSectionV1>[];

  reconciliations:
    readonly Readonly<
      SectionClaimReconciliationV1
    >[];

  semanticVerifications:
    readonly Readonly<
      SectionSemanticVerificationV1
    >[];

  repairs:
    readonly Readonly<
      SectionRepairAuditV1
    >[];

  article:
    Readonly<ComposedMasterArticleV1>;

  provenance:
    Readonly<MasterWriterRunProvenanceV1>;
}


function failureMessage(
  error:
    unknown
): string {
  if (
    error instanceof
    Error
  ) {
    return error.message;
  }

  return String(
    error
  );
}


function assertContractExecutionOrder(
  contract:
    Readonly<ArticleGenerationContractV1>
): void {
  const sections =
    contract.sectionContracts;

  if (
    sections.length ===
    0
  ) {
    throw new ContentGenerationError(
      "MASTER_WRITER_BLOCKED:NO_SECTION_CONTRACTS"
    );
  }

  sections.forEach(
    (
      section,
      index
    ) => {
      if (
        section.version !==
        "SECTION_GENERATION_CONTRACT_V1"
      ) {
        throw new ContentGenerationError(
          `MASTER_WRITER_BLOCKED:INVALID_SECTION_CONTRACT_VERSION:${index}`
        );
      }

      if (
        section.sectionIndex !==
        index
      ) {
        throw new ContentGenerationError(
          `MASTER_WRITER_BLOCKED:SECTION_INDEX_MISMATCH:${index}`
        );
      }

      if (
        section.sectionNumber !==
        index + 1
      ) {
        throw new ContentGenerationError(
          `MASTER_WRITER_BLOCKED:SECTION_NUMBER_MISMATCH:${index}`
        );
      }

      if (
        section.totalSections !==
        sections.length
      ) {
        throw new ContentGenerationError(
          `MASTER_WRITER_BLOCKED:TOTAL_SECTION_COUNT_MISMATCH:${index}`
        );
      }
    }
  );
}


function assertShellProvenance({
  shell,
  contract,
  generator,
}: {
  shell:
    Readonly<GeneratedArticleShellV1>;

  contract:
    Readonly<ArticleGenerationContractV1>;

  generator:
    Readonly<MasterWriterGenerator>;
}): void {
  if (
    shell.version !==
    "ARTICLE_SHELL_V1"
  ) {
    throw new ContentGenerationError(
      "MASTER_WRITER_SHELL_INVALID_VERSION"
    );
  }

  if (
    shell.provenance
      .sourceContractVersion !==
    "ARTICLE_GENERATION_CONTRACT_V1"
  ) {
    throw new ContentGenerationError(
      "MASTER_WRITER_SHELL_INVALID_CONTRACT_PROVENANCE"
    );
  }

  if (
    shell.provenance
      .sourceRuntimeVersion !==
    contract.sourceRuntimeVersion
  ) {
    throw new ContentGenerationError(
      "MASTER_WRITER_SHELL_RUNTIME_PROVENANCE_MISMATCH"
    );
  }

  if (
    shell.provenance
      .modelName !==
    generator.modelName
  ) {
    throw new ContentGenerationError(
      "MASTER_WRITER_SHELL_MODEL_PROVENANCE_MISMATCH"
    );
  }

  if (
    shell.provenance
      .h1Mission !==
    contract.h1Mission
  ) {
    throw new ContentGenerationError(
      "MASTER_WRITER_SHELL_H1_MISSION_MISMATCH"
    );
  }
}


function assertSectionProvenance({
  section,
  index,
  contract,
  generator,
}: {
  section:
    Readonly<GeneratedSectionV1>;

  index:
    number;

  contract:
    Readonly<ArticleGenerationContractV1>;

  generator:
    Readonly<MasterWriterGenerator>;
}): void {
  if (
    section.version !==
    "GENERATED_SECTION_V1"
  ) {
    throw new ContentGenerationError(
      `MASTER_WRITER_SECTION_INVALID_VERSION:${index}`
    );
  }

  if (
    section.provenance
      .sourceContractVersion !==
    "SECTION_GENERATION_CONTRACT_V1"
  ) {
    throw new ContentGenerationError(
      `MASTER_WRITER_SECTION_INVALID_CONTRACT_PROVENANCE:${index}`
    );
  }

  if (
    section.provenance
      .sectionIndex !==
    index
  ) {
    throw new ContentGenerationError(
      `MASTER_WRITER_SECTION_PROVENANCE_MISMATCH:${index}`
    );
  }

  if (
    section.provenance
      .sectionNumber !==
    index + 1
  ) {
    throw new ContentGenerationError(
      `MASTER_WRITER_SECTION_NUMBER_PROVENANCE_MISMATCH:${index}`
    );
  }

  if (
    section.provenance
      .totalSections !==
    contract.sectionContracts
      .length
  ) {
    throw new ContentGenerationError(
      `MASTER_WRITER_SECTION_TOTAL_PROVENANCE_MISMATCH:${index}`
    );
  }

  if (
    section.provenance
      .modelName !==
    generator.modelName
  ) {
    throw new ContentGenerationError(
      `MASTER_WRITER_SECTION_MODEL_PROVENANCE_MISMATCH:${index}`
    );
  }
}


export function supportsMasterWriterGenerator(
  value:
    unknown
): value is MasterWriterGenerator {
  return (
    supportsMasterArticleGenerator(
      value
    ) &&
    supportsMasterArticleShellGenerator(
      value
    ) &&
    supportsMasterSectionSemanticVerifier(
      value
    ) &&
    supportsMasterSectionRepairGenerator(
      value
    )
  );
}


export function recoverConflictingArticleH1V1<
  T extends ArticleShellV1
>(
  shell: Readonly<T>,
  contract: Readonly<ArticleGenerationContractV1>
): Readonly<T> {
  try {
    assertDistinctArticleHeadingsV1(shell, contract);
    return shell;
  } catch (error) {
    if (
      !(error instanceof Error) ||
      error.message !== "ARTICLE_COMPOSER_DUPLICATE_H1_H2"
    ) {
      throw error;
    }

    const recovered = {
      ...shell,
      h1: shell.title,
    } as T;

    assertDistinctArticleHeadingsV1(recovered, contract);
    return recovered;
  }
}

export async function executeMasterWriterV1({
  contract,
  generator,
  resumeProgress = null,
  onProgress,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  generator:
    unknown;
  resumeProgress?: Readonly<MasterWriterSectionProgressV1> | null;
  onProgress?: (state: {
    shell: Readonly<GeneratedArticleShellV1>;
    accepted: readonly Readonly<VerifiedMasterSectionV1>[];
  }) => Promise<void>;
}): Promise<
  Readonly<MasterWriterRunV1>
> {
  if (
    contract.version !==
    "ARTICLE_GENERATION_CONTRACT_V1"
  ) {
    throw new ContentGenerationError(
      "MASTER_WRITER_BLOCKED:INVALID_ARTICLE_GENERATION_CONTRACT"
    );
  }

  if (
    !supportsMasterWriterGenerator(
      generator
    )
  ) {
    throw new ContentGenerationError(
      "MASTER_WRITER_BLOCKED:FULL_MASTER_GENERATOR_UNAVAILABLE"
    );
  }

  assertContractExecutionOrder(
    contract
  );


  // ========================================================
  // ARTICLE SHELL
  // ========================================================

  if (resumeProgress && (
    resumeProgress.version !== "MASTER_WRITER_SECTION_PROGRESS_V1" ||
    resumeProgress.contractHash !== fingerprintMasterWriterContractV1(contract, generator.modelName) ||
    resumeProgress.modelName !== generator.modelName ||
    resumeProgress.accepted.length > contract.sectionContracts.length
  )) {
    throw new ContentGenerationError("MASTER_WRITER_PROGRESS_CONTRACT_MISMATCH");
  }

  let shell: Readonly<GeneratedArticleShellV1>;
  if (resumeProgress) {
    shell = resumeProgress.shell;
  } else {
    try {
      shell = await generator.generateArticleShell(contract);
    } catch (error) {
      throw new ContentGenerationError(
        ["MASTER_WRITER_SHELL_GENERATION_FAILED", failureMessage(error)].join(":")
      );
    }
  }

  assertShellProvenance({
    shell,
    contract,
    generator,
  });

  /*
   * Validate heading uniqueness before generating expensive sections.
   * Composer retains its independent final integrity check.
   */
  /*
   * Recover a conflicting generated H1 without changing the
   * authoritative H2 section plan or its execution bindings.
   * The article title is an existing shell value, not a new
   * generated claim or heading.
   */
  shell = recoverConflictingArticleH1V1(shell, contract);

  const acceptedProgress: VerifiedMasterSectionV1[] = [];
  if (onProgress && !resumeProgress) {
    await onProgress({ shell, accepted: [] });
  }


  // ========================================================
  // SECTIONS
  //
  // Deliberately sequential.
  //
  // A generated section is NOT accepted merely because the
  // provider returned structurally valid JSON.
  //
  // It must pass:
  //
  // generation validation
  // → provenance validation
  // → deterministic claim/evidence reconciliation
  //
  // before it can enter deterministic composition.
  // ========================================================

  const generatedSections:
    Readonly<GeneratedSectionV1>[] =
      [];

  const reconciliations:
    Readonly<
      SectionClaimReconciliationV1
    >[] =
      [];

  const semanticVerifications:
    Readonly<
      SectionSemanticVerificationV1
    >[] =
      [];

  const repairs:
    Readonly<
      SectionRepairAuditV1
    >[] =
      [];


  for (
    let index = 0;
    index <
    contract.sectionContracts.length;
    index +=
      1
  ) {
    const sectionContract =
      contract.sectionContracts[
        index
      ];

    if (
      !sectionContract
    ) {
      throw new ContentGenerationError(
        `MASTER_WRITER_BLOCKED:SECTION_CONTRACT_MISSING:${index}`
      );
    }


    // Reuse ONLY a fully verified contiguous prefix with matching
    // immutable contract/evidence and model identity.
    const cached = resumeProgress?.accepted[index];
    if (cached) {
      assertSectionProvenance({ section: cached.section, index, contract, generator });
      if (cached.repair?.sectionIndex !== index ||
          cached.semanticVerification?.sectionIndex !== index ||
          cached.semanticVerification?.provenance?.modelName !== generator.modelName) {
        throw new ContentGenerationError("MASTER_WRITER_PROGRESS_SECTION_INVALID");
      }
      const canonicalReconciliation = reconcileGeneratedSectionClaimsV1({
        contract: sectionContract, section: cached.section,
      });
      assertSectionClaimReconciliationPassed(canonicalReconciliation);
      // Recompute the semantic finalizer against CURRENT claim/evidence authority
      // without a second paid verifier request.
      const canonicalSemantic = finalizeSectionSemanticVerificationV1({
        contract: sectionContract,
        section: cached.section,
        modelName: generator.modelName,
        candidate: {
          units: cached.semanticVerification.units.map((unit) => ({
            unitId: unit.unitId,
            classification: unit.classification,
            matchedClaimId: unit.matchedClaimId,
            evidenceIds: unit.evidenceIds,
            rationale: unit.rationale,
          })),
        },
      });
      assertSectionSemanticVerificationPassed(canonicalSemantic);
      const checked: VerifiedMasterSectionV1 = {
        section: cached.section,
        reconciliation: canonicalReconciliation,
        semanticVerification: canonicalSemantic,
        repair: cached.repair,
      };
      generatedSections.push(checked.section);
      reconciliations.push(checked.reconciliation);
      semanticVerifications.push(checked.semanticVerification);
      repairs.push(checked.repair);
      acceptedProgress.push(checked);
      console.info("[writer resumed verified section]", { index });
      continue;
    }

    // ------------------------------------------------------
    // 1. GENERATE EXACTLY ONE SECTION
    // ------------------------------------------------------

    let generated:
      Readonly<GeneratedSectionV1>;

    try {
      generated =
        await generator
          .generateSection(
            sectionContract
          );

      assertSectionProvenance({
        section:
          generated,

        index,

        contract,

        generator,
      });
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "MASTER_WRITER_SECTION_GENERATION_FAILED",
          String(
            index
          ),
          failureMessage(
            error
          ),
        ].join(
          ":"
        )
      );
    }



    // ------------------------------------------------------
    // 2. VERIFY + OPTIONALLY REPAIR EXACTLY THIS SECTION
    //
    // Transaction:
    //
    // deterministic reconciliation
    // -> semantic prose verification
    // -> if BLOCK: one targeted section repair
    // -> structural identity check
    // -> reconciliation AGAIN
    // -> semantic verification AGAIN
    // -> second BLOCK = fail closed
    //
    // Other sections, shell, H1 and canonical H2 are untouched.
    // ------------------------------------------------------

    let verifiedSection;

    try {
      verifiedSection =
        await verifyAndRepairGeneratedSectionV1({
          contract:
            sectionContract,

          section:
            generated,

          generator,
        });

      /*
       * The repair engine verifies section identity internally.
       * Re-run the master-writer provenance assertion as a
       * separate orchestration boundary before acceptance.
       */
      assertSectionProvenance({
        section:
          verifiedSection.section,

        index,

        contract,

        generator,
      });
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "MASTER_WRITER_SECTION_VERIFICATION_FAILED",
          String(
            index
          ),
          failureMessage(
            error
          ),
        ].join(
          ":"
        )
      );
    }


    // ------------------------------------------------------
    // 3. ACCEPT ONLY THE FINAL VERIFIED SECTION
    // ------------------------------------------------------

    generatedSections.push(
      verifiedSection.section
    );

    reconciliations.push(
      verifiedSection
        .reconciliation
    );

    semanticVerifications.push(
      verifiedSection
        .semanticVerification
    );

    repairs.push(
      verifiedSection
        .repair
    );

    acceptedProgress.push(verifiedSection);
    if (onProgress) {
      await onProgress({ shell, accepted: [...acceptedProgress] });
    }

  }


  // ========================================================
  // FREEZE ACCEPTED SECTIONS / RECONCILIATIONS
  // ========================================================

  const frozenSections =
    Object.freeze([
      ...generatedSections,
    ]);

  const frozenReconciliations =
    Object.freeze([
      ...reconciliations,
    ]);

  const frozenSemanticVerifications =
    Object.freeze([
      ...semanticVerifications,
    ]);

  const frozenRepairs =
    Object.freeze([
      ...repairs,
    ]);


  if (
    frozenSections.length !==
    frozenReconciliations.length
  ) {
    throw new ContentGenerationError(
      "MASTER_WRITER_RECONCILIATION_COUNT_MISMATCH"
    );
  }

  if (
    frozenSections.length !==
    frozenSemanticVerifications.length
  ) {
    throw new ContentGenerationError(
      "MASTER_WRITER_SEMANTIC_VERIFICATION_COUNT_MISMATCH"
    );
  }

  if (
    frozenSections.length !==
    frozenRepairs.length
  ) {
    throw new ContentGenerationError(
      "MASTER_WRITER_REPAIR_AUDIT_COUNT_MISMATCH"
    );
  }


  // ========================================================
  // COMPOSITION
  //
  // Composition can only see sections that survived the
  // deterministic reconciliation boundary.
  // ========================================================

  const article =
    composeMasterArticleV1({
      contract,

      shell,

      sections:
        frozenSections,
    });


  const sectionModelNames =
    Object.freeze(
      Array.from(
        new Set(
          frozenSections.map(
            (
              section
            ) =>
              section.provenance
                .modelName
          )
        )
      )
    );


  const reconciliationWarnCount =
    frozenReconciliations
      .filter(
        (result) =>
          result.status ===
          "WARN"
      )
      .length;

  const semanticWarnCount =
    frozenSemanticVerifications
      .filter(
        (result) =>
          result.status ===
          "WARN"
      )
      .length;

  const repairedSectionCount =
    frozenRepairs
      .filter(
        (repair) =>
          repair.attempted
      )
      .length;

  const repairAttemptCount =
    frozenRepairs
      .reduce(
        (
          total,
          repair
        ) =>
          total +
          repair.attemptCount,
        0
      );


  return Object.freeze({
    version:
      "MASTER_WRITER_RUN_V1" as const,

    shell,

    sections:
      frozenSections,

    reconciliations:
      frozenReconciliations,

    semanticVerifications:
      frozenSemanticVerifications,

    repairs:
      frozenRepairs,

    article,

    provenance:
      Object.freeze({
        sourceContractVersion:
          "ARTICLE_GENERATION_CONTRACT_V1" as const,

        sourceRuntimeVersion:
          contract.sourceRuntimeVersion,

        generatorModelName:
          generator.modelName,

        shellModelName:
          shell.provenance
            .modelName,

        sectionModelNames,

        sectionCount:
          frozenSections.length,

        reconciliationCount:
          frozenReconciliations.length,

        reconciliationWarnCount,

        reconciliationBlockCount:
          0 as const,

        semanticVerificationCount:
          frozenSemanticVerifications
            .length,

        semanticWarnCount,

        semanticBlockCount:
          0 as const,

        repairedSectionCount,

        repairAttemptCount,

        executionMode:
          "SEQUENTIAL" as const,
      }),
  });
}
