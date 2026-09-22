import type {
  ArticleGenerationContractV1,
} from "./article-generation-contract";

import type {
  ArticleShellV1,
} from "./master-article-composer";

import {
  buildArticleShellV1,
} from "./master-article-composer";

import {
  ContentGenerationError,
} from "./generator";


export interface GeneratedArticleShellCandidateV1 {
  title:
    string;

  metaDescription:
    string;

  h1:
    string;
}


export interface GeneratedArticleShellProvenanceV1 {
  sourceContractVersion:
    "ARTICLE_GENERATION_CONTRACT_V1";

  sourceRuntimeVersion:
    "MASTER_RUNTIME_SNAPSHOT_V1";

  modelName:
    string;

  /**
   * Preserve the authoritative H1 mission exactly.
   * Do not derive/rewrite it at the writer boundary.
   */
  h1Mission:
    ArticleGenerationContractV1["h1Mission"];
}


export interface GeneratedArticleShellV1
  extends ArticleShellV1 {
  provenance:
    Readonly<GeneratedArticleShellProvenanceV1>;
}


export interface MasterArticleShellGenerator {
  readonly modelName:
    string;

  generateArticleShell(
    input:
      Readonly<ArticleGenerationContractV1>
  ):
    Promise<
      Readonly<GeneratedArticleShellV1>
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
  error:
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
      error
    );
  }

  return value.trim();
}


function assertSingleLine({
  value,
  code,
}: {
  value:
    string;

  code:
    string;
}): void {
  if (
    /[\r\n]/.test(
      value
    )
  ) {
    throw new ContentGenerationError(
      code
    );
  }
}


function assertNoHeadingSyntax({
  value,
  code,
}: {
  value:
    string;

  code:
    string;
}): void {
  if (
    /^\s{0,3}#{1,6}\s+/m.test(
      value
    ) ||
    /<\/?h[1-6](?:\s[^>]*)?>/i.test(
      value
    )
  ) {
    throw new ContentGenerationError(
      code
    );
  }
}


export function finalizeGeneratedArticleShellV1({
  contract,
  modelName,
  candidate,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  modelName:
    string;

  candidate:
    unknown;
}): Readonly<GeneratedArticleShellV1> {
  if (
    contract.version !==
    "ARTICLE_GENERATION_CONTRACT_V1"
  ) {
    throw new ContentGenerationError(
      "ARTICLE_SHELL_GENERATION_BLOCKED:INVALID_GENERATION_CONTRACT"
    );
  }

  const cleanModelName =
    modelName.trim();

  if (!cleanModelName) {
    throw new ContentGenerationError(
      "ARTICLE_SHELL_GENERATION_MODEL_REQUIRED"
    );
  }

  const raw =
    record(
      candidate
    );

  if (!raw) {
    throw new ContentGenerationError(
      "ARTICLE_SHELL_GENERATION_INVALID_RESPONSE"
    );
  }

  const allowedKeys =
    new Set([
      "title",
      "metaDescription",
      "h1",
    ]);

  const unexpected =
    Object.keys(
      raw
    ).filter(
      (key) =>
        !allowedKeys.has(
          key
        )
    );

  if (
    unexpected.length >
    0
  ) {
    throw new ContentGenerationError(
      `ARTICLE_SHELL_GENERATION_UNEXPECTED_FIELD:${unexpected[0]}`
    );
  }

  const title =
    requiredString(
      raw,
      "title",
      "ARTICLE_SHELL_GENERATION_TITLE_REQUIRED"
    );

  const metaDescription =
    requiredString(
      raw,
      "metaDescription",
      "ARTICLE_SHELL_GENERATION_META_DESCRIPTION_REQUIRED"
    );

  const h1 =
    requiredString(
      raw,
      "h1",
      "ARTICLE_SHELL_GENERATION_H1_REQUIRED"
    );

  assertSingleLine({
    value:
      title,

    code:
      "ARTICLE_SHELL_GENERATION_TITLE_MULTILINE",
  });

  assertSingleLine({
    value:
      metaDescription,

    code:
      "ARTICLE_SHELL_GENERATION_META_MULTILINE",
  });

  assertSingleLine({
    value:
      h1,

    code:
      "ARTICLE_SHELL_GENERATION_H1_MULTILINE",
  });

  assertNoHeadingSyntax({
    value:
      title,

    code:
      "ARTICLE_SHELL_GENERATION_TITLE_CONTAINS_HEADING_MARKUP",
  });

  assertNoHeadingSyntax({
    value:
      metaDescription,

    code:
      "ARTICLE_SHELL_GENERATION_META_CONTAINS_HEADING_MARKUP",
  });

  assertNoHeadingSyntax({
    value:
      h1,

    code:
      "ARTICLE_SHELL_GENERATION_H1_CONTAINS_HEADING_MARKUP",
  });

  const shell =
    buildArticleShellV1({
      title,
      metaDescription,
      h1,
    });

  return Object.freeze({
    ...shell,

    provenance:
      Object.freeze({
        sourceContractVersion:
          "ARTICLE_GENERATION_CONTRACT_V1" as const,

        sourceRuntimeVersion:
          contract.sourceRuntimeVersion,

        modelName:
          cleanModelName,

        h1Mission:
          contract.h1Mission,
      }),
  });
}


export function supportsMasterArticleShellGenerator(
  value:
    unknown
): value is MasterArticleShellGenerator {
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
    typeof candidate
      .generateArticleShell ===
      "function"
  );
}
