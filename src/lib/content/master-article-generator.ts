import type {
  SectionGenerationContractV1,
} from "./article-generation-contract";

import {
  ContentGenerationError,
} from "./generator";


export interface GeneratedSectionCandidateV1 {
  bodyMarkdown:
    string;

  coveredQueryNodeIds?:
    readonly string[];

  referencedClaimIds?:
    readonly string[];

  referencedEvidenceIds?:
    readonly string[];

  usedInternalLinks?:
    readonly string[];

  assetUsed?:
    string |
    null;
}


export interface GeneratedSectionProvenanceV1 {
  sourceContractVersion:
    "SECTION_GENERATION_CONTRACT_V1";

  sectionIndex:
    number;

  sectionNumber:
    number;

  totalSections:
    number;

  blueprintHeading:
    string;

  modelName:
    string;
}


export interface GeneratedSectionV1 {
  version:
    "GENERATED_SECTION_V1";

  /**
   * Canonical section heading comes from the deterministic
   * Section Blueprint — never from the model response.
   */
  heading:
    string;

  /**
   * Markdown for the section body only.
   *
   * The article composer owns the H2 heading.
   * The section writer may use H3+ when useful.
   */
  bodyMarkdown:
    string;

  coveredQueryNodeIds:
    readonly string[];

  referencedClaimIds:
    readonly string[];

  referencedEvidenceIds:
    readonly string[];

  usedInternalLinks:
    readonly string[];

  assetUsed:
    string |
    null;

  provenance:
    Readonly<GeneratedSectionProvenanceV1>;
}


export interface MasterArticleGenerator {
  readonly modelName:
    string;

  generateSection(
    input:
      Readonly<SectionGenerationContractV1>
  ):
    Promise<
      Readonly<GeneratedSectionV1>
    >;
}


function record(
  value:
    unknown
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  return value as
    Record<string, unknown>;
}


function requiredString(
  source:
    Record<string, unknown>,
  key:
    string,
  errorCode:
    string
): string {
  const value =
    source[key];

  if (
    typeof value !==
      "string" ||
    value.trim().length ===
      0
  ) {
    throw new ContentGenerationError(
      errorCode
    );
  }

  return value.trim();
}


function optionalStringArray(
  source:
    Record<string, unknown>,
  key:
    string,
  errorCode:
    string
): readonly string[] {
  const value =
    source[key];

  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return Object.freeze(
      []
    );
  }

  if (
    !Array.isArray(
      value
    ) ||
    !value.every(
      (
        item
      ): item is string =>
        typeof item ===
          "string" &&
        item.trim().length >
          0
    )
  ) {
    throw new ContentGenerationError(
      errorCode
    );
  }

  return Object.freeze(
    Array.from(
      new Set(
        value.map(
          (item) =>
            item.trim()
        )
      )
    )
  );
}


function optionalNullableString(
  source:
    Record<string, unknown>,
  key:
    string,
  errorCode:
    string
): string | null {
  const value =
    source[key];

  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return null;
  }

  if (
    typeof value !==
      "string" ||
    value.trim().length ===
      0
  ) {
    throw new ContentGenerationError(
      errorCode
    );
  }

  return value.trim();
}


function blueprintRecord(
  contract:
    Readonly<SectionGenerationContractV1>
): Record<string, unknown> {
  const value =
    record(
      contract.blueprint
    );

  if (!value) {
    throw new ContentGenerationError(
      "SECTION_GENERATION_BLOCKED:INVALID_BLUEPRINT"
    );
  }

  return value;
}


function blueprintStringArray(
  blueprint:
    Record<string, unknown>,
  key:
    string
): readonly string[] {
  const value =
    blueprint[key];

  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return [];
  }

  if (
    !Array.isArray(
      value
    )
  ) {
    throw new ContentGenerationError(
      `SECTION_GENERATION_BLOCKED:INVALID_BLUEPRINT_${key.toUpperCase()}`
    );
  }

  const result =
    value.filter(
      (
        item
      ): item is string =>
        typeof item ===
          "string" &&
        item.trim().length >
          0
    )
      .map(
        (item) =>
          item.trim()
      );

  return Array.from(
    new Set(
      result
    )
  );
}


function assertSubset({
  actual,
  allowed,
  errorPrefix,
}: {
  actual:
    readonly string[];

  allowed:
    readonly string[];

  errorPrefix:
    string;
}): void {
  const allowedSet =
    new Set(
      allowed
    );

  for (
    const value
    of actual
  ) {
    if (
      !allowedSet.has(
        value
      )
    ) {
      throw new ContentGenerationError(
        `${errorPrefix}:${value}`
      );
    }
  }
}


function containsMarkdownHeading(
  markdown:
    string,
  level:
    number
): boolean {
  const hashes =
    "#".repeat(
      level
    );

  const pattern =
    new RegExp(
      `^\\s{0,3}${hashes}\\s+`,
      "m"
    );

  return pattern.test(
    markdown
  );
}


export function finalizeGeneratedSectionV1({
  contract,
  modelName,
  candidate,
}: {
  contract:
    Readonly<SectionGenerationContractV1>;

  modelName:
    string;

  candidate:
    unknown;
}): Readonly<GeneratedSectionV1> {
  const raw =
    record(
      candidate
    );

  if (!raw) {
    throw new ContentGenerationError(
      "SECTION_GENERATION_INVALID_RESPONSE"
    );
  }

  const cleanModelName =
    modelName.trim();

  if (!cleanModelName) {
    throw new ContentGenerationError(
      "SECTION_GENERATION_MODEL_REQUIRED"
    );
  }

  const bodyMarkdown =
    requiredString(
      raw,
      "bodyMarkdown",
      "SECTION_GENERATION_BODY_REQUIRED"
    );

  /**
   * H1 belongs exclusively to the article shell.
   */
  if (
    containsMarkdownHeading(
      bodyMarkdown,
      1
    )
  ) {
    throw new ContentGenerationError(
      "SECTION_GENERATION_BODY_CONTAINS_H1"
    );
  }

  /**
   * H2 also belongs to the deterministic composer.
   *
   * The section writer generates the BODY underneath
   * its canonical blueprint heading. H3+ is allowed.
   */
  if (
    containsMarkdownHeading(
      bodyMarkdown,
      2
    )
  ) {
    throw new ContentGenerationError(
      "SECTION_GENERATION_BODY_CONTAINS_H2"
    );
  }

  const coveredQueryNodeIds =
    optionalStringArray(
      raw,
      "coveredQueryNodeIds",
      "SECTION_GENERATION_INVALID_QUERY_REFERENCES"
    );

  const referencedClaimIds =
    optionalStringArray(
      raw,
      "referencedClaimIds",
      "SECTION_GENERATION_INVALID_CLAIM_REFERENCES"
    );

  const referencedEvidenceIds =
    optionalStringArray(
      raw,
      "referencedEvidenceIds",
      "SECTION_GENERATION_INVALID_EVIDENCE_REFERENCES"
    );

  const usedInternalLinks =
    optionalStringArray(
      raw,
      "usedInternalLinks",
      "SECTION_GENERATION_INVALID_INTERNAL_LINK_REFERENCES"
    );

  const assetUsed =
    optionalNullableString(
      raw,
      "assetUsed",
      "SECTION_GENERATION_INVALID_ASSET_REFERENCE"
    );

  const blueprint =
    blueprintRecord(
      contract
    );

  const heading =
    requiredString(
      blueprint,
      "heading",
      "SECTION_GENERATION_BLOCKED:BLUEPRINT_HEADING_REQUIRED"
    );

  const allowedQueryNodeIds =
    blueprintStringArray(
      blueprint,
      "queryNodeIds"
    );

  const requiredClaimIds =
    blueprintStringArray(
      blueprint,
      "requiredClaims"
    );

  const forbiddenClaimIds =
    blueprintStringArray(
      blueprint,
      "forbiddenClaims"
    );

  const allowedEvidenceIds =
    blueprintStringArray(
      blueprint,
      "evidenceIds"
    );

  const allowedInternalLinks =
    blueprintStringArray(
      blueprint,
      "internalLinks"
    );

  const blueprintAssetRaw =
    blueprint.asset;

  const allowedAsset =
    typeof blueprintAssetRaw ===
      "string" &&
    blueprintAssetRaw.trim()
      .length >
      0
      ? blueprintAssetRaw.trim()
      : null;

  assertSubset({
    actual:
      coveredQueryNodeIds,

    allowed:
      allowedQueryNodeIds,

    errorPrefix:
      "SECTION_GENERATION_QUERY_OUTSIDE_BLUEPRINT",
  });

  assertSubset({
    actual:
      referencedClaimIds,

    allowed:
      requiredClaimIds,

    errorPrefix:
      "SECTION_GENERATION_CLAIM_OUTSIDE_BLUEPRINT",
  });

  assertSubset({
    actual:
      referencedEvidenceIds,

    allowed:
      allowedEvidenceIds,

    errorPrefix:
      "SECTION_GENERATION_EVIDENCE_OUTSIDE_BLUEPRINT",
  });

  assertSubset({
    actual:
      usedInternalLinks,

    allowed:
      allowedInternalLinks,

    errorPrefix:
      "SECTION_GENERATION_INTERNAL_LINK_OUTSIDE_BLUEPRINT",
  });

  const referencedClaimSet =
    new Set(
      referencedClaimIds
    );

  for (
    const forbiddenClaimId
    of forbiddenClaimIds
  ) {
    if (
      referencedClaimSet.has(
        forbiddenClaimId
      )
    ) {
      throw new ContentGenerationError(
        `SECTION_GENERATION_FORBIDDEN_CLAIM:${forbiddenClaimId}`
      );
    }
  }

  /**
   * Required claims are not optional at the generation boundary.
   * If the blueprint requires them, the writer must explicitly
   * declare them in its structured result.
   */
  for (
    const requiredClaimId
    of requiredClaimIds
  ) {
    if (
      !referencedClaimSet.has(
        requiredClaimId
      )
    ) {
      throw new ContentGenerationError(
        `SECTION_GENERATION_REQUIRED_CLAIM_MISSING:${requiredClaimId}`
      );
    }
  }

  if (
    assetUsed !==
      null
  ) {
    if (
      allowedAsset ===
        null ||
      assetUsed !==
        allowedAsset
    ) {
      throw new ContentGenerationError(
        `SECTION_GENERATION_ASSET_OUTSIDE_BLUEPRINT:${assetUsed}`
      );
    }
  }

  const provenance =
    Object.freeze({
      sourceContractVersion:
        "SECTION_GENERATION_CONTRACT_V1" as const,

      sectionIndex:
        contract.sectionIndex,

      sectionNumber:
        contract.sectionNumber,

      totalSections:
        contract.totalSections,

      blueprintHeading:
        heading,

      modelName:
        cleanModelName,
    });

  return Object.freeze({
    version:
      "GENERATED_SECTION_V1" as const,

    heading,

    bodyMarkdown,

    coveredQueryNodeIds,

    referencedClaimIds,

    referencedEvidenceIds,

    usedInternalLinks,

    assetUsed,

    provenance,
  });
}


export function supportsMasterArticleGenerator(
  value:
    unknown
): value is MasterArticleGenerator {
  const candidate =
    record(
      value
    );

  return Boolean(
    candidate &&
    typeof candidate.modelName ===
      "string" &&
    candidate.modelName.trim()
      .length >
      0 &&
    typeof candidate.generateSection ===
      "function"
  );
}
