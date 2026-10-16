import type {
  ArticleGenerationContractV1,
} from "./article-generation-contract";

import type {
  GeneratedSectionV1,
} from "./master-article-generator";

import type {
  GeneratedArticle,
} from "./types";

import {
  ContentGenerationError,
} from "./generator";


export interface ArticleShellV1 {
  version:
    "ARTICLE_SHELL_V1";

  title:
    string;

  metaDescription:
    string;

  h1:
    string;
}


export interface MasterArticleCompositionProvenanceV1 {
  sourceContractVersion:
    "ARTICLE_GENERATION_CONTRACT_V1";

  sourceRuntimeVersion:
    "MASTER_RUNTIME_SNAPSHOT_V1";

  sectionCount:
    number;

  modelNames:
    readonly string[];
}


export interface ComposedMasterArticleV1
  extends GeneratedArticle {
  version:
    "COMPOSED_MASTER_ARTICLE_V1";

  sections:
    readonly Readonly<GeneratedSectionV1>[];

  provenance:
    Readonly<MasterArticleCompositionProvenanceV1>;
}


import {
  normalizeMasterArticleProseSpacesV1,
} from "./article-prose-whitespace-v1";

export {
  normalizeMasterArticleProseSpacesV1,
} from "./article-prose-whitespace-v1";

function nonEmpty(
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


function containsMarkdownHeading(
  value:
    string
): boolean {
  return /^\s{0,3}#{1,6}\s+/m.test(
    value
  );
}


export function buildArticleShellV1({
  title,
  metaDescription,
  h1,
}: {
  title:
    string;

  metaDescription:
    string;

  h1:
    string;
}): Readonly<ArticleShellV1> {
  const cleanTitle =
    nonEmpty(
      title,
      "ARTICLE_SHELL_TITLE_REQUIRED"
    );

  const cleanMetaDescription =
    nonEmpty(
      metaDescription,
      "ARTICLE_SHELL_META_DESCRIPTION_REQUIRED"
    );

  const cleanH1 =
    nonEmpty(
      h1,
      "ARTICLE_SHELL_H1_REQUIRED"
    );

  if (
    containsMarkdownHeading(
      cleanH1
    )
  ) {
    throw new ContentGenerationError(
      "ARTICLE_SHELL_H1_MUST_NOT_CONTAIN_MARKDOWN_MARKER"
    );
  }

  return Object.freeze({
    version:
      "ARTICLE_SHELL_V1" as const,

    title:
      cleanTitle,

    metaDescription:
      cleanMetaDescription,

    h1:
      cleanH1,
  });
}


function expectedHeading(
  contract:
    Readonly<ArticleGenerationContractV1>,
  index:
    number
): string {
  const sectionContract =
    contract.sectionContracts[
      index
    ];

  if (!sectionContract) {
    throw new ContentGenerationError(
      `ARTICLE_COMPOSER_SECTION_CONTRACT_MISSING:${index}`
    );
  }

  const blueprint =
    sectionContract.blueprint as
      unknown as
      Record<
        string,
        unknown
      >;

  const heading =
    blueprint.heading;

  if (
    typeof heading !==
      "string" ||
    heading.trim().length ===
      0
  ) {
    throw new ContentGenerationError(
      `ARTICLE_COMPOSER_BLUEPRINT_HEADING_MISSING:${index}`
    );
  }

  return heading.trim();
}


function validateSectionAgainstContract({
  contract,
  section,
  index,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  section:
    Readonly<GeneratedSectionV1>;

  index:
    number;
}): void {
  const expected =
    contract.sectionContracts[
      index
    ];

  if (!expected) {
    throw new ContentGenerationError(
      `ARTICLE_COMPOSER_UNEXPECTED_SECTION:${index}`
    );
  }

  if (
    section.version !==
      "GENERATED_SECTION_V1"
  ) {
    throw new ContentGenerationError(
      `ARTICLE_COMPOSER_INVALID_SECTION_VERSION:${index}`
    );
  }

  if (
    section.provenance
      .sourceContractVersion !==
    "SECTION_GENERATION_CONTRACT_V1"
  ) {
    throw new ContentGenerationError(
      `ARTICLE_COMPOSER_INVALID_SECTION_PROVENANCE:${index}`
    );
  }

  if (
    section.provenance
      .sectionIndex !==
    index
  ) {
    throw new ContentGenerationError(
      `ARTICLE_COMPOSER_SECTION_ORDER_MISMATCH:${index}`
    );
  }

  if (
    section.provenance
      .sectionNumber !==
    index + 1
  ) {
    throw new ContentGenerationError(
      `ARTICLE_COMPOSER_SECTION_NUMBER_MISMATCH:${index}`
    );
  }

  if (
    section.provenance
      .totalSections !==
    contract.sectionContracts.length
  ) {
    throw new ContentGenerationError(
      `ARTICLE_COMPOSER_TOTAL_SECTION_COUNT_MISMATCH:${index}`
    );
  }

  const canonicalHeading =
    expectedHeading(
      contract,
      index
    );

  if (
    section.heading !==
    canonicalHeading
  ) {
    throw new ContentGenerationError(
      `ARTICLE_COMPOSER_HEADING_MISMATCH:${index}`
    );
  }

  if (
    section.provenance
      .blueprintHeading !==
    canonicalHeading
  ) {
    throw new ContentGenerationError(
      `ARTICLE_COMPOSER_PROVENANCE_HEADING_MISMATCH:${index}`
    );
  }

  const body =
    section.bodyMarkdown
      .trim();

  if (!body) {
    throw new ContentGenerationError(
      `ARTICLE_COMPOSER_EMPTY_SECTION:${index}`
    );
  }

  if (
    /^\s{0,3}#\s+/m.test(
      body
    )
  ) {
    throw new ContentGenerationError(
      `ARTICLE_COMPOSER_SECTION_CONTAINS_H1:${index}`
    );
  }

  if (
    /^\s{0,3}##\s+/m.test(
      body
    )
  ) {
    throw new ContentGenerationError(
      `ARTICLE_COMPOSER_SECTION_CONTAINS_H2:${index}`
    );
  }
}



/* CONTENT_V1_H1_H2_COMPOSITION_GUARD */
export function assertDistinctArticleHeadingsV1(
  shell: Readonly<ArticleShellV1>,
  contract: Readonly<ArticleGenerationContractV1>
): void {
  const normalize = (value: string): string =>
    value.normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .replace(/\s+/g, " ");

  const h1 = normalize(shell.h1);
  const seen = new Set<string>();

  for (const section of contract.sectionContracts) {
    const heading = section.blueprint.heading;
    const key = normalize(heading);

    if (!key) {
      throw new ContentGenerationError("ARTICLE_COMPOSER_EMPTY_H2");
    }

    if (key === h1) {
      throw new ContentGenerationError("ARTICLE_COMPOSER_DUPLICATE_H1_H2");
    }

    if (seen.has(key)) {
      throw new ContentGenerationError("ARTICLE_COMPOSER_DUPLICATE_H2");
    }

    seen.add(key);
  }
}

export function composeMasterArticleV1({
  contract,
  shell,
  sections,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  shell:
    Readonly<ArticleShellV1>;

  sections:
    readonly Readonly<GeneratedSectionV1>[];
}): Readonly<ComposedMasterArticleV1> {
  assertDistinctArticleHeadingsV1(shell, contract);

  if (
    contract.version !==
    "ARTICLE_GENERATION_CONTRACT_V1"
  ) {
    throw new ContentGenerationError(
      "ARTICLE_COMPOSER_INVALID_GENERATION_CONTRACT"
    );
  }

  if (
    shell.version !==
    "ARTICLE_SHELL_V1"
  ) {
    throw new ContentGenerationError(
      "ARTICLE_COMPOSER_INVALID_ARTICLE_SHELL"
    );
  }

  const expectedCount =
    contract.sectionContracts
      .length;

  if (
    sections.length !==
    expectedCount
  ) {
    throw new ContentGenerationError(
      `ARTICLE_COMPOSER_SECTION_COUNT_MISMATCH:EXPECTED_${expectedCount}:ACTUAL_${sections.length}`
    );
  }

  sections.forEach(
    (
      section,
      index
    ) => {
      validateSectionAgainstContract({
        contract,
        section,
        index,
      });
    }
  );

  const bodyMarkdown =
    sections
      .map(
        (
          section
        ) => [
          `## ${section.heading}`,
          "",
          normalizeMasterArticleProseSpacesV1(section.bodyMarkdown.trim()),
        ].join(
          "\n"
        )
      )
      .join(
        "\n\n"
      )
      .trim();

  const modelNames =
    Object.freeze(
      Array.from(
        new Set(
          sections.map(
            (
              section
            ) =>
              section.provenance
                .modelName
          )
        )
      )
    );

  const frozenSections =
    Object.freeze([
      ...sections,
    ]);

  return Object.freeze({
    version:
      "COMPOSED_MASTER_ARTICLE_V1" as const,

    title:
      shell.title,

    metaDescription:
      shell.metaDescription,

    h1:
      shell.h1,

    bodyMarkdown,

    sections:
      frozenSections,

    provenance:
      Object.freeze({
        sourceContractVersion:
          "ARTICLE_GENERATION_CONTRACT_V1" as const,

        sourceRuntimeVersion:
          contract.sourceRuntimeVersion,

        sectionCount:
          sections.length,

        modelNames,
      }),
  });
}
