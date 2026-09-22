import type {
  MasterRuntimeSnapshotV1,
} from "./master-runtime-adapter";

import type {
  MasterWriterRunV1,
} from "./master-writer-orchestrator";

import type {
  SerpObservedResult,
  SerpSnapshot,
} from "./serp-observatory";

import {
  ContentGenerationError,
} from "./generator";


export const SERP_REPLAY_DIMENSIONS = [
  "INTENT_FULFILLMENT",
  "QUERY_COVERAGE",
  "ANSWER_COMPLETENESS",
  "EVIDENCE_STRENGTH",
  "ORIGINAL_VALUE",
  "STRUCTURAL_USEFULNESS",
] as const;


export type SerpReplayDimensionV1 =
  (
    typeof SERP_REPLAY_DIMENSIONS
  )[number];


export type SerpReplayDimensionVerdictV1 =
  | "ARTICLE_STRONGER"
  | "COMPETITOR_STRONGER"
  | "MIXED"
  | "INSUFFICIENT_EVIDENCE";


export type SerpReplayPairVerdictV1 =
  | "STRONGER"
  | "WEAKER"
  | "MIXED"
  | "INSUFFICIENT_EVIDENCE";


export type SerpReplayStatusV1 =
  | "READY"
  | "WARN"
  | "BLOCK"
  | "INSUFFICIENT_CONTEXT";


export interface SerpReplayEvidenceItemV1 {
  id:
    string;

  text:
    string;
}


export interface SerpReplayArticleSectionV1 {
  sectionIndex:
    number;

  heading:
    string;

  bodyMarkdown:
    string;

  coveredQueryNodeIds:
    readonly string[];

  referencedClaimIds:
    readonly string[];

  referencedEvidenceIds:
    readonly string[];

  assetUsed:
    string | null;
}


export interface SerpReplayArticleEvidenceV1 {
  title:
    string;

  h1:
    string;

  bodyMarkdown:
    string;

  sections:
    readonly Readonly<
      SerpReplayArticleSectionV1
    >[];

  evidenceCatalog:
    readonly Readonly<
      SerpReplayEvidenceItemV1
    >[];
}


export interface SerpReplayCompetitorEvidenceV1 {
  rank:
    number;

  url:
    string;

  domain:
    string;

  title:
    string | null;

  snippet:
    string | null;

  pageType:
    string | null;

  intent:
    string | null;

  evidenceCatalog:
    readonly Readonly<
      SerpReplayEvidenceItemV1
    >[];
}


export interface SerpReplayPairwiseInputV1 {
  version:
    "SERP_REPLAY_PAIRWISE_INPUT_V1";

  keyword:
    string;

  snapshotFingerprint:
    string;

  article:
    Readonly<
      SerpReplayArticleEvidenceV1
    >;

  competitor:
    Readonly<
      SerpReplayCompetitorEvidenceV1
    >;
}


export interface SerpReplayRawDimensionJudgmentV1 {
  dimension:
    SerpReplayDimensionV1;

  verdict:
    SerpReplayDimensionVerdictV1;

  reason:
    string;

  articleEvidenceIds:
    readonly string[];

  competitorEvidenceIds:
    readonly string[];

  missingData:
    readonly string[];
}


export interface SerpReplayRawPairwiseJudgmentV1 {
  dimensions:
    readonly Readonly<
      SerpReplayRawDimensionJudgmentV1
    >[];
}


export interface SerpReplayDimensionJudgmentV1
  extends SerpReplayRawDimensionJudgmentV1 {
  version:
    "SERP_REPLAY_DIMENSION_JUDGMENT_V1";
}


export interface SerpReplayPairComparisonV1 {
  version:
    "SERP_REPLAY_PAIR_COMPARISON_V1";

  competitor:
    Readonly<{
      rank:
        number;

      url:
        string;

      domain:
        string;

      title:
        string | null;

      pageType:
        string | null;
    }>;

  verdict:
    SerpReplayPairVerdictV1;

  dimensions:
    readonly Readonly<
      SerpReplayDimensionJudgmentV1
    >[];

  blockingDimensions:
    readonly SerpReplayDimensionV1[];

  missingData:
    readonly string[];
}


export interface SerpReplayV1 {
  version:
    "SERP_REPLAY_V1";

  status:
    SerpReplayStatusV1;

  keyword:
    string;

  serpSnapshotFingerprint:
    string | null;

  serpCapturedAt:
    Date | null;

  comparisons:
    readonly Readonly<
      SerpReplayPairComparisonV1
    >[];

  blockers:
    readonly string[];

  warnings:
    readonly string[];

  provenance:
    Readonly<{
      comparedResultCount:
        number;

      pairwiseModelName:
        string | null;

      rankingScoreUsed:
        false;

      rankingProbabilityUsed:
        false;

      wordCountAsQualitySignal:
        false;

      backlinksAsContentQualitySignal:
        false;
    }>;
}


export interface SerpReplayPairwiseGeneratorV1 {
  readonly modelName:
    string;

  compareSerpReplayPair(
    input:
      Readonly<
        SerpReplayPairwiseInputV1
      >
  ): Promise<
    unknown
  >;
}


function record(
  value:
    unknown
): Record<
  string,
  unknown
> | null {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  return value as
    Record<
      string,
      unknown
    >;
}


function cleanString(
  value:
    unknown
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const clean =
    value.trim();

  return clean ||
    null;
}


function finiteNumber(
  value:
    unknown
): number | null {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  )
    ? value
    : null;
}


function stringArray(
  value:
    unknown
): readonly string[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return Object.freeze(
      []
    );
  }

  return Object.freeze(
    Array.from(
      new Set(
        value
          .filter(
            (
              item
            ): item is string =>
              typeof item ===
                "string" &&
              item.trim()
                .length >
                0
          )
          .map(
            (item) =>
              item.trim()
          )
      )
    )
  );
}


function evidenceItem(
  id:
    string,
  text:
    string
): Readonly<
  SerpReplayEvidenceItemV1
> | null {
  const cleanId =
    id.trim();

  const cleanText =
    text.trim();

  if (
    !cleanId ||
    !cleanText
  ) {
    return null;
  }

  return Object.freeze({
    id:
      cleanId,

    text:
      cleanText,
  });
}


function pushEvidence(
  output:
    SerpReplayEvidenceItemV1[],
  id:
    string,
  text:
    string | null
): void {
  if (!text) {
    return;
  }

  const item =
    evidenceItem(
      id,
      text
    );

  if (item) {
    output.push(
      item
    );
  }
}


function uniqueEvidence(
  items:
    readonly SerpReplayEvidenceItemV1[]
): readonly Readonly<
  SerpReplayEvidenceItemV1
>[] {
  const seen =
    new Set<
      string
    >();

  const output:
    Readonly<
      SerpReplayEvidenceItemV1
    >[] =
      [];

  for (
    const item
    of items
  ) {
    if (
      seen.has(
        item.id
      )
    ) {
      continue;
    }

    seen.add(
      item.id
    );

    output.push(
      Object.freeze({
        ...item,
      })
    );
  }

  return Object.freeze(
    output
  );
}


function buildQueryEvidence(
  runtime:
    Readonly<
      MasterRuntimeSnapshotV1
    >
): Map<
  string,
  string
> {
  const output =
    new Map<
      string,
      string
    >();

  const graph =
    record(
      runtime.queryGraph as
        unknown
    );

  if (
    !graph ||
    !Array.isArray(
      graph.nodes
    )
  ) {
    return output;
  }

  for (
    const raw
    of graph.nodes
  ) {
    const node =
      record(
        raw
      );

    if (!node) {
      continue;
    }

    const id =
      cleanString(
        node.id
      );

    const query =
      cleanString(
        node.query
      ) ??
      cleanString(
        node.text
      );

    if (
      id &&
      query
    ) {
      output.set(
        id,
        query
      );
    }
  }

  return output;
}


function buildClaimMap(
  runtime:
    Readonly<
      MasterRuntimeSnapshotV1
    >
): Map<
  string,
  Record<
    string,
    unknown
  >
> {
  const output =
    new Map<
      string,
      Record<
        string,
        unknown
      >
    >();

  const ledger =
    record(
      runtime.claimLedger as
        unknown
    );

  if (
    !ledger ||
    !Array.isArray(
      ledger.claims
    )
  ) {
    return output;
  }

  for (
    const raw
    of ledger.claims
  ) {
    const claim =
      record(
        raw
      );

    const id =
      claim
        ? cleanString(
            claim.id
          )
        : null;

    if (
      claim &&
      id
    ) {
      output.set(
        id,
        claim
      );
    }
  }

  return output;
}


function buildEvidenceMap(
  runtime:
    Readonly<
      MasterRuntimeSnapshotV1
    >
): Map<
  string,
  Record<
    string,
    unknown
  >
> {
  const output =
    new Map<
      string,
      Record<
        string,
        unknown
      >
    >();

  const graph =
    record(
      runtime.evidenceGraph as
        unknown
    );

  if (
    !graph ||
    !Array.isArray(
      graph.claimEvidence
    )
  ) {
    return output;
  }

  for (
    const raw
    of graph.claimEvidence
  ) {
    const evidence =
      record(
        raw
      );

    const id =
      evidence
        ? cleanString(
            evidence.id
          )
        : null;

    if (
      evidence &&
      id
    ) {
      output.set(
        id,
        evidence
      );
    }
  }

  return output;
}


function buildSourceMap(
  runtime:
    Readonly<
      MasterRuntimeSnapshotV1
    >
): Map<
  string,
  Record<
    string,
    unknown
  >
> {
  const output =
    new Map<
      string,
      Record<
        string,
        unknown
      >
    >();

  const graph =
    record(
      runtime.evidenceGraph as
        unknown
    );

  if (
    !graph ||
    !Array.isArray(
      graph.sources
    )
  ) {
    return output;
  }

  for (
    const raw
    of graph.sources
  ) {
    const source =
      record(
        raw
      );

    const id =
      source
        ? cleanString(
            source.id
          )
        : null;

    if (
      source &&
      id
    ) {
      output.set(
        id,
        source
      );
    }
  }

  return output;
}


function buildAssetMap(
  runtime:
    Readonly<
      MasterRuntimeSnapshotV1
    >
): Map<
  string,
  Record<
    string,
    unknown
  >
> {
  const output =
    new Map<
      string,
      Record<
        string,
        unknown
      >
    >();

  const plan =
    record(
      runtime.originalValue as
        unknown
    );

  if (
    !plan ||
    !Array.isArray(
      plan.assets
    )
  ) {
    return output;
  }

  for (
    const raw
    of plan.assets
  ) {
    const asset =
      record(
        raw
      );

    const id =
      asset
        ? cleanString(
            asset.id
          )
        : null;

    /*
     * Only VERIFIED original-value assets become replay evidence.
     */
    if (
      asset &&
      id &&
      asset.verified ===
        true
    ) {
      output.set(
        id,
        asset
      );
    }
  }

  return output;
}


function buildArticleEvidence({
  runtime,
  run,
}: {
  runtime:
    Readonly<
      MasterRuntimeSnapshotV1
    >;

  run:
    Readonly<
      MasterWriterRunV1
    >;
}): Readonly<
  SerpReplayArticleEvidenceV1
> {
  const article =
    record(
      run.article as
        unknown
    );

  if (!article) {
    throw new ContentGenerationError(
      "SERP_REPLAY_ARTICLE_INVALID"
    );
  }

  const title =
    cleanString(
      article.title
    );

  const h1 =
    cleanString(
      article.h1
    );

  const bodyMarkdown =
    cleanString(
      article.bodyMarkdown
    );

  if (
    !title ||
    !h1 ||
    !bodyMarkdown
  ) {
    throw new ContentGenerationError(
      "SERP_REPLAY_ARTICLE_CONTENT_REQUIRED"
    );
  }


  const queryMap =
    buildQueryEvidence(
      runtime
    );

  const claimMap =
    buildClaimMap(
      runtime
    );

  const evidenceMap =
    buildEvidenceMap(
      runtime
    );

  const sourceMap =
    buildSourceMap(
      runtime
    );

  const assetMap =
    buildAssetMap(
      runtime
    );


  const catalog:
    SerpReplayEvidenceItemV1[] =
      [];


  pushEvidence(
    catalog,
    "ARTICLE_TITLE",
    title
  );

  pushEvidence(
    catalog,
    "ARTICLE_H1",
    h1
  );

  pushEvidence(
    catalog,
    "ARTICLE_BODY",
    bodyMarkdown
  );


  const sections:
    SerpReplayArticleSectionV1[] =
      [];


  run.sections.forEach(
    (
      rawSection,
      index
    ) => {
      const section =
        record(
          rawSection as
            unknown
        );

      if (!section) {
        throw new ContentGenerationError(
          `SERP_REPLAY_SECTION_INVALID:${index}`
        );
      }


      const heading =
        cleanString(
          section.heading
        );

      const body =
        cleanString(
          section.bodyMarkdown
        );


      if (
        !heading ||
        !body
      ) {
        throw new ContentGenerationError(
          `SERP_REPLAY_SECTION_CONTENT_REQUIRED:${index}`
        );
      }


      const queryIds =
        stringArray(
          section
            .coveredQueryNodeIds
        );

      const claimIds =
        stringArray(
          section
            .referencedClaimIds
        );

      const evidenceIds =
        stringArray(
          section
            .referencedEvidenceIds
        );

      const assetUsed =
        cleanString(
          section.assetUsed
        );


      pushEvidence(
        catalog,
        `ARTICLE_SECTION:${index}:HEADING`,
        heading
      );

      pushEvidence(
        catalog,
        `ARTICLE_SECTION:${index}:BODY`,
        body
      );


      for (
        const queryId
        of queryIds
      ) {
        const query =
          queryMap.get(
            queryId
          );

        if (query) {
          pushEvidence(
            catalog,
            `ARTICLE_QUERY:${queryId}`,
            query
          );
        }
      }


      for (
        const claimId
        of claimIds
      ) {
        const claim =
          claimMap.get(
            claimId
          );

        if (!claim) {
          continue;
        }

        const text =
          cleanString(
            claim.text
          );

        const status =
          cleanString(
            claim.status
          );

        const category =
          cleanString(
            claim.category
          );

        const risk =
          cleanString(
            claim.risk
          );


        pushEvidence(
          catalog,
          `ARTICLE_CLAIM:${claimId}`,
          [
            text,
            status
              ? `status=${status}`
              : null,
            category
              ? `category=${category}`
              : null,
            risk
              ? `risk=${risk}`
              : null,
          ]
            .filter(
              (
                value
              ): value is string =>
                Boolean(
                  value
                )
            )
            .join(
              " | "
            ) ||
            null
        );
      }


      for (
        const evidenceId
        of evidenceIds
      ) {
        const evidence =
          evidenceMap.get(
            evidenceId
          );

        if (!evidence) {
          continue;
        }

        const sourceId =
          cleanString(
            evidence.sourceId
          );

        const source =
          sourceId
            ? sourceMap.get(
                sourceId
              )
            : undefined;

        const excerpt =
          cleanString(
            evidence.excerpt
          );

        const kind =
          cleanString(
            evidence.kind
          );

        const relation =
          cleanString(
            evidence.relation
          );

        const publisher =
          source
            ? cleanString(
                source.publisher
              )
            : null;

        const sourceType =
          source
            ? cleanString(
                source.sourceType
              )
            : null;

        const sourceUrl =
          source
            ? cleanString(
                source.url
              )
            : null;


        pushEvidence(
          catalog,
          `ARTICLE_EVIDENCE:${evidenceId}`,
          [
            excerpt,
            kind
              ? `kind=${kind}`
              : null,
            relation
              ? `relation=${relation}`
              : null,
            publisher
              ? `publisher=${publisher}`
              : null,
            sourceType
              ? `sourceType=${sourceType}`
              : null,
            sourceUrl
              ? `source=${sourceUrl}`
              : null,
          ]
            .filter(
              (
                value
              ): value is string =>
                Boolean(
                  value
                )
            )
            .join(
              " | "
            ) ||
            null
        );
      }


      if (assetUsed) {
        const asset =
          assetMap.get(
            assetUsed
          );

        if (asset) {
          const assetTitle =
            cleanString(
              asset.title
            );

          const description =
            cleanString(
              asset.description
            );

          const type =
            cleanString(
              asset.type
            );

          const firstParty =
            asset.firstParty ===
            true;


          pushEvidence(
            catalog,
            `ARTICLE_ASSET:${assetUsed}`,
            [
              assetTitle,
              description,
              type
                ? `type=${type}`
                : null,
              `firstParty=${firstParty}`,
              "verified=true",
            ]
              .filter(
                (
                  value
                ): value is string =>
                  Boolean(
                    value
                  )
              )
              .join(
                " | "
              )
          );
        }
      }


      sections.push(
        Object.freeze({
          sectionIndex:
            index,

          heading,

          bodyMarkdown:
            body,

          coveredQueryNodeIds:
            queryIds,

          referencedClaimIds:
            claimIds,

          referencedEvidenceIds:
            evidenceIds,

          assetUsed,
        })
      );
    }
  );


  return Object.freeze({
    title,

    h1,

    bodyMarkdown,

    sections:
      Object.freeze(
        sections
      ),

    evidenceCatalog:
      uniqueEvidence(
        catalog
      ),
  });
}


function resultEvidence(
  result:
    Readonly<
      SerpObservedResult
    >
): readonly Readonly<
  SerpReplayEvidenceItemV1
>[] {
  const output:
    SerpReplayEvidenceItemV1[] =
      [];


  pushEvidence(
    output,
    "COMPETITOR_TITLE",
    cleanString(
      result.title
    )
  );

  pushEvidence(
    output,
    "COMPETITOR_SNIPPET",
    cleanString(
      result.snippet
    )
  );

  pushEvidence(
    output,
    "COMPETITOR_H1",
    cleanString(
      result.h1
    )
  );


  stringArray(
    result.h2
  ).forEach(
    (
      value,
      index
    ) =>
      pushEvidence(
        output,
        `COMPETITOR_H2:${index}`,
        value
      )
  );


  stringArray(
    result.h3
  ).forEach(
    (
      value,
      index
    ) =>
      pushEvidence(
        output,
        `COMPETITOR_H3:${index}`,
        value
      )
  );


  stringArray(
    result.topics
  ).forEach(
    (
      value,
      index
    ) =>
      pushEvidence(
        output,
        `COMPETITOR_TOPIC:${index}`,
        value
      )
  );


  stringArray(
    result.entities
  ).forEach(
    (
      value,
      index
    ) =>
      pushEvidence(
        output,
        `COMPETITOR_ENTITY:${index}`,
        value
      )
  );


  stringArray(
    result.questions
  ).forEach(
    (
      value,
      index
    ) =>
      pushEvidence(
        output,
        `COMPETITOR_QUESTION:${index}`,
        value
      )
  );


  stringArray(
    result.claims
  ).forEach(
    (
      value,
      index
    ) =>
      pushEvidence(
        output,
        `COMPETITOR_CLAIM:${index}`,
        value
      )
  );


  (
    result.sources ??
    []
  ).forEach(
    (
      source,
      index
    ) => {
      const label =
        cleanString(
          source.label
        );

      const url =
        cleanString(
          source.url
        );

      const domain =
        cleanString(
          source.domain
        );

      pushEvidence(
        output,
        `COMPETITOR_SOURCE:${index}`,
        [
          label,
          url
            ? `url=${url}`
            : null,
          domain
            ? `domain=${domain}`
            : null,
        ]
          .filter(
            (
              value
            ): value is string =>
              Boolean(
                value
              )
          )
          .join(
            " | "
          ) ||
          null
      );
    }
  );


  if (
    typeof result.tables ===
      "number" &&
    Number.isFinite(
      result.tables
    )
  ) {
    pushEvidence(
      output,
      "COMPETITOR_TABLES",
      `Observed tables: ${result.tables}`
    );
  }


  if (
    typeof result.tools ===
      "number" &&
    Number.isFinite(
      result.tools
    )
  ) {
    pushEvidence(
      output,
      "COMPETITOR_TOOLS",
      `Observed tools: ${result.tools}`
    );
  }


  if (
    typeof result.images ===
      "number" &&
    Number.isFinite(
      result.images
    )
  ) {
    pushEvidence(
      output,
      "COMPETITOR_IMAGES",
      `Observed images: ${result.images}`
    );
  }


  if (
    typeof result.videos ===
      "number" &&
    Number.isFinite(
      result.videos
    )
  ) {
    pushEvidence(
      output,
      "COMPETITOR_VIDEOS",
      `Observed videos: ${result.videos}`
    );
  }


  pushEvidence(
    output,
    "COMPETITOR_AUTHOR",
    cleanString(
      result.author
    )
  );

  pushEvidence(
    output,
    "COMPETITOR_REVIEWER",
    cleanString(
      result.reviewer
    )
  );


  if (
    result.datePublished instanceof
    Date &&
    !Number.isNaN(
      result.datePublished
        .getTime()
    )
  ) {
    pushEvidence(
      output,
      "COMPETITOR_DATE_PUBLISHED",
      result.datePublished
        .toISOString()
    );
  }


  if (
    result.dateModified instanceof
    Date &&
    !Number.isNaN(
      result.dateModified
        .getTime()
    )
  ) {
    pushEvidence(
      output,
      "COMPETITOR_DATE_MODIFIED",
      result.dateModified
        .toISOString()
    );
  }


  /*
   * Deliberately NOT included:
   *
   * - wordCount
   * - backlinks
   * - referringDomains
   * - rank as a quality signal
   *
   * Those are observations / authority context, not proof that
   * one article is better content.
   */


  return uniqueEvidence(
    output
  );
}


function competitorInput(
  result:
    Readonly<
      SerpObservedResult
    >
): Readonly<
  SerpReplayCompetitorEvidenceV1
> {
  return Object.freeze({
    rank:
      result.rank,

    url:
      result.url,

    domain:
      result.domain,

    title:
      cleanString(
        result.title
      ),

    snippet:
      cleanString(
        result.snippet
      ),

    pageType:
      cleanString(
        result.pageType
      ),

    intent:
      cleanString(
        result.intent
      ),

    evidenceCatalog:
      resultEvidence(
        result
      ),
  });
}


function meaningfulResult(
  result:
    Readonly<
      SerpObservedResult
    >
): boolean {
  return (
    Number.isFinite(
      result.rank
    ) &&
    result.rank >=
      1 &&
    result.rank <=
      10 &&
    result.url.trim()
      .length >
      0 &&
    result.domain.trim()
      .length >
      0
  );
}


function normalizeDomain(
  value:
    string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /^www\./,
      ""
    );
}


function comparisonResults({
  snapshot,
  siteDomain,
}: {
  snapshot:
    Readonly<
      SerpSnapshot
    >;

  siteDomain?:
    string | null;
}): readonly Readonly<
  SerpObservedResult
>[] {
  const excluded =
    siteDomain
      ? normalizeDomain(
          siteDomain
        )
      : null;


  return Object.freeze(
    [...snapshot.results]
      .filter(
        meaningfulResult
      )
      .filter(
        (result) =>
          !excluded ||
          normalizeDomain(
            result.domain
          ) !==
            excluded
      )
      .sort(
        (
          a,
          b
        ) =>
          a.rank -
          b.rank ||
          a.url.localeCompare(
            b.url
          )
      )
  );
}


function validateStringIds({
  value,
  allowed,
  code,
}: {
  value:
    unknown;

  allowed:
    ReadonlySet<
      string
    >;

  code:
    string;
}): readonly string[] {
  const ids =
    stringArray(
      value
    );

  for (
    const id
    of ids
  ) {
    if (
      !allowed.has(
        id
      )
    ) {
      throw new ContentGenerationError(
        `${code}:${id}`
      );
    }
  }

  return ids;
}


function validDimension(
  value:
    unknown
): value is SerpReplayDimensionV1 {
  return (
    typeof value ===
      "string" &&
    (
      SERP_REPLAY_DIMENSIONS as
        readonly string[]
    ).includes(
      value
    )
  );
}


function validVerdict(
  value:
    unknown
): value is SerpReplayDimensionVerdictV1 {
  return (
    value ===
      "ARTICLE_STRONGER" ||
    value ===
      "COMPETITOR_STRONGER" ||
    value ===
      "MIXED" ||
    value ===
      "INSUFFICIENT_EVIDENCE"
  );
}


export function finalizeSerpReplayPairwiseJudgmentV1({
  raw,
  input,
}: {
  raw:
    unknown;

  input:
    Readonly<
      SerpReplayPairwiseInputV1
    >;
}): readonly Readonly<
  SerpReplayDimensionJudgmentV1
>[] {
  const candidate =
    record(
      raw
    );

  if (
    !candidate ||
    !Array.isArray(
      candidate.dimensions
    )
  ) {
    throw new ContentGenerationError(
      "SERP_REPLAY_PAIR_INVALID"
    );
  }


  if (
    candidate.dimensions.length !==
    SERP_REPLAY_DIMENSIONS.length
  ) {
    throw new ContentGenerationError(
      "SERP_REPLAY_DIMENSION_COUNT_INVALID"
    );
  }


  const articleEvidenceIds =
    new Set(
      input.article
        .evidenceCatalog
        .map(
          (item) =>
            item.id
        )
    );


  const competitorEvidenceIds =
    new Set(
      input.competitor
        .evidenceCatalog
        .map(
          (item) =>
            item.id
        )
    );


  const seen =
    new Set<
      SerpReplayDimensionV1
    >();


  const output:
    Readonly<
      SerpReplayDimensionJudgmentV1
    >[] =
      [];


  for (
    const rawDimension
    of candidate.dimensions
  ) {
    const dimension =
      record(
        rawDimension
      );

    if (!dimension) {
      throw new ContentGenerationError(
        "SERP_REPLAY_DIMENSION_INVALID"
      );
    }


    if (
      !validDimension(
        dimension.dimension
      ) ||
      seen.has(
        dimension.dimension
      )
    ) {
      throw new ContentGenerationError(
        "SERP_REPLAY_DIMENSION_ID_INVALID"
      );
    }


    if (
      !validVerdict(
        dimension.verdict
      )
    ) {
      throw new ContentGenerationError(
        `SERP_REPLAY_VERDICT_INVALID:${dimension.dimension}`
      );
    }


    const reason =
      cleanString(
        dimension.reason
      );

    if (!reason) {
      throw new ContentGenerationError(
        `SERP_REPLAY_REASON_REQUIRED:${dimension.dimension}`
      );
    }


    const articleIds =
      validateStringIds({
        value:
          dimension
            .articleEvidenceIds,

        allowed:
          articleEvidenceIds,

        code:
          "SERP_REPLAY_ARTICLE_EVIDENCE_UNKNOWN",
      });


    const competitorIds =
      validateStringIds({
        value:
          dimension
            .competitorEvidenceIds,

        allowed:
          competitorEvidenceIds,

        code:
          "SERP_REPLAY_COMPETITOR_EVIDENCE_UNKNOWN",
      });


    const missingData =
      stringArray(
        dimension
          .missingData
      );


    /*
     * A directional judgment without evidence is invalid.
     */
    if (
      (
        dimension.verdict ===
          "ARTICLE_STRONGER" ||
        dimension.verdict ===
          "COMPETITOR_STRONGER"
      ) &&
      (
        articleIds.length ===
          0 ||
        competitorIds.length ===
          0
      )
    ) {
      throw new ContentGenerationError(
        `SERP_REPLAY_DIRECTIONAL_EVIDENCE_REQUIRED:${dimension.dimension}`
      );
    }


    /*
     * INSUFFICIENT_EVIDENCE must explain what is missing.
     */
    if (
      dimension.verdict ===
        "INSUFFICIENT_EVIDENCE" &&
      missingData.length ===
        0
    ) {
      throw new ContentGenerationError(
        `SERP_REPLAY_MISSING_DATA_REQUIRED:${dimension.dimension}`
      );
    }


    seen.add(
      dimension.dimension
    );


    output.push(
      Object.freeze({
        version:
          "SERP_REPLAY_DIMENSION_JUDGMENT_V1" as const,

        dimension:
          dimension.dimension,

        verdict:
          dimension.verdict,

        reason,

        articleEvidenceIds:
          articleIds,

        competitorEvidenceIds:
          competitorIds,

        missingData,
      })
    );
  }


  for (
    const dimension
    of SERP_REPLAY_DIMENSIONS
  ) {
    if (
      !seen.has(
        dimension
      )
    ) {
      throw new ContentGenerationError(
        `SERP_REPLAY_DIMENSION_MISSING:${dimension}`
      );
    }
  }


  return Object.freeze(
    output
  );
}


function pairVerdict(
  dimensions:
    readonly Readonly<
      SerpReplayDimensionJudgmentV1
    >[]
): SerpReplayPairVerdictV1 {
  const available =
    dimensions.filter(
      (item) =>
        item.verdict !==
        "INSUFFICIENT_EVIDENCE"
    );


  if (
    available.length ===
    0
  ) {
    return "INSUFFICIENT_EVIDENCE";
  }


  const articleStronger =
    available.some(
      (item) =>
        item.verdict ===
        "ARTICLE_STRONGER"
    );


  const competitorStronger =
    available.some(
      (item) =>
        item.verdict ===
        "COMPETITOR_STRONGER"
    );


  if (
    articleStronger &&
    !competitorStronger
  ) {
    return "STRONGER";
  }


  if (
    competitorStronger &&
    !articleStronger
  ) {
    return "WEAKER";
  }


  return "MIXED";
}


const BLOCKING_DIMENSIONS =
  new Set<
    SerpReplayDimensionV1
  >([
    "INTENT_FULFILLMENT",
    "EVIDENCE_STRENGTH",
  ]);


function blockingDimensions(
  dimensions:
    readonly Readonly<
      SerpReplayDimensionJudgmentV1
    >[]
): readonly SerpReplayDimensionV1[] {
  return Object.freeze(
    dimensions
      .filter(
        (item) =>
          item.verdict ===
            "COMPETITOR_STRONGER" &&
          BLOCKING_DIMENSIONS.has(
            item.dimension
          )
      )
      .map(
        (item) =>
          item.dimension
      )
  );
}


function comparisonMissingData(
  dimensions:
    readonly Readonly<
      SerpReplayDimensionJudgmentV1
    >[]
): readonly string[] {
  return Object.freeze(
    Array.from(
      new Set(
        dimensions.flatMap(
          (item) =>
            item.missingData
        )
      )
    )
  );
}


function replayStatus(
  comparisons:
    readonly Readonly<
      SerpReplayPairComparisonV1
    >[]
): {
  status:
    SerpReplayStatusV1;

  blockers:
    readonly string[];

  warnings:
    readonly string[];
} {
  if (
    comparisons.length ===
    0
  ) {
    return {
      status:
        "INSUFFICIENT_CONTEXT",

      blockers:
        Object.freeze([]),

      warnings:
        Object.freeze([
          "SERP_REPLAY_NO_COMPARABLE_RESULTS",
        ]),
    };
  }


  const anyAvailable =
    comparisons.some(
      (comparison) =>
        comparison.verdict !==
        "INSUFFICIENT_EVIDENCE"
    );


  if (!anyAvailable) {
    return {
      status:
        "INSUFFICIENT_CONTEXT",

      blockers:
        Object.freeze([]),

      warnings:
        Object.freeze([
          "SERP_REPLAY_ALL_COMPARISONS_INSUFFICIENT",
        ]),
    };
  }


  const blockers =
    comparisons.flatMap(
      (comparison) =>
        comparison
          .blockingDimensions
          .map(
            (dimension) =>
              [
                "SERP_REPLAY_BLOCK",
                dimension,
                comparison
                  .competitor
                  .url,
              ].join(
                ":"
              )
          )
    );


  if (
    blockers.length >
    0
  ) {
    return {
      status:
        "BLOCK",

      blockers:
        Object.freeze(
          blockers
        ),

      warnings:
        Object.freeze([]),
    };
  }


  const warnings:
    string[] =
      [];


  for (
    const comparison
    of comparisons
  ) {
    if (
      comparison.verdict ===
        "WEAKER"
    ) {
      warnings.push(
        `SERP_REPLAY_COMPETITOR_STRONGER:${comparison.competitor.url}`
      );
    }


    if (
      comparison.verdict ===
        "MIXED"
    ) {
      warnings.push(
        `SERP_REPLAY_MIXED:${comparison.competitor.url}`
      );
    }


    if (
      comparison.verdict ===
        "INSUFFICIENT_EVIDENCE"
    ) {
      warnings.push(
        `SERP_REPLAY_PAIR_INSUFFICIENT:${comparison.competitor.url}`
      );
    }


    if (
      comparison.missingData
        .length >
      0
    ) {
      warnings.push(
        `SERP_REPLAY_MISSING_DATA:${comparison.competitor.url}`
      );
    }
  }


  if (
    warnings.length >
    0
  ) {
    return {
      status:
        "WARN",

      blockers:
        Object.freeze([]),

      warnings:
        Object.freeze(
          Array.from(
            new Set(
              warnings
            )
          )
        ),
    };
  }


  return {
    status:
      "READY",

    blockers:
      Object.freeze([]),

    warnings:
      Object.freeze([]),
  };
}


export function supportsSerpReplayPairwiseGeneratorV1(
  value:
    unknown
): value is SerpReplayPairwiseGeneratorV1 {
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
    typeof candidate.compareSerpReplayPair ===
      "function"
  );
}


export async function executeSerpReplayV1({
  runtime,
  run,
  generator,
  siteDomain = null,
}: {
  runtime:
    Readonly<
      MasterRuntimeSnapshotV1
    >;

  run:
    Readonly<
      MasterWriterRunV1
    >;

  generator:
    unknown;

  siteDomain?:
    string | null;
}): Promise<
  Readonly<
    SerpReplayV1
  >
> {
  const snapshot =
    runtime.serpResearch;


  if (
    !snapshot
  ) {
    return Object.freeze({
      version:
        "SERP_REPLAY_V1" as const,

      status:
        "INSUFFICIENT_CONTEXT" as const,

      keyword:
        "",

      serpSnapshotFingerprint:
        null,

      serpCapturedAt:
        null,

      comparisons:
        Object.freeze([]),

      blockers:
        Object.freeze([]),

      warnings:
        Object.freeze([
          "SERP_REPLAY_SNAPSHOT_MISSING",
        ]),

      provenance:
        Object.freeze({
          comparedResultCount:
            0,

          pairwiseModelName:
            null,

          rankingScoreUsed:
            false as const,

          rankingProbabilityUsed:
            false as const,

          wordCountAsQualitySignal:
            false as const,

          backlinksAsContentQualitySignal:
            false as const,
        }),
    });
  }


  const competitors =
    comparisonResults({
      snapshot,

      siteDomain,
    });


  if (
    competitors.length ===
    0
  ) {
    return Object.freeze({
      version:
        "SERP_REPLAY_V1" as const,

      status:
        "INSUFFICIENT_CONTEXT" as const,

      keyword:
        snapshot.keyword,

      serpSnapshotFingerprint:
        snapshot.fingerprint,

      serpCapturedAt:
        new Date(
          snapshot.capturedAt
        ),

      comparisons:
        Object.freeze([]),

      blockers:
        Object.freeze([]),

      warnings:
        Object.freeze([
          "SERP_REPLAY_NO_COMPARABLE_RESULTS",
        ]),

      provenance:
        Object.freeze({
          comparedResultCount:
            0,

          pairwiseModelName:
            null,

          rankingScoreUsed:
            false as const,

          rankingProbabilityUsed:
            false as const,

          wordCountAsQualitySignal:
            false as const,

          backlinksAsContentQualitySignal:
            false as const,
        }),
    });
  }


  if (
    !supportsSerpReplayPairwiseGeneratorV1(
      generator
    )
  ) {
    throw new ContentGenerationError(
      "SERP_REPLAY_PAIRWISE_GENERATOR_REQUIRED"
    );
  }


  const article =
    buildArticleEvidence({
      runtime,
      run,
    });


  const comparisons:
    SerpReplayPairComparisonV1[] =
      [];


  for (
    const competitor
    of competitors
  ) {
    const competitorEvidence =
      competitorInput(
        competitor
      );


    const input:
      Readonly<
        SerpReplayPairwiseInputV1
      > =
        Object.freeze({
          version:
            "SERP_REPLAY_PAIRWISE_INPUT_V1" as const,

          keyword:
            snapshot.keyword,

          snapshotFingerprint:
            snapshot.fingerprint,

          article,

          competitor:
            competitorEvidence,
        });


    let raw:
      unknown;


    try {
      raw =
        await generator
          .compareSerpReplayPair(
            input
          );
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "SERP_REPLAY_PAIR_GENERATION_FAILED",
          competitor.url,
          error instanceof
            Error
            ? error.message
            : String(
                error
              ),
        ].join(
          ":"
        )
      );
    }


    const dimensions =
      finalizeSerpReplayPairwiseJudgmentV1({
        raw,
        input,
      });


    comparisons.push(
      Object.freeze({
        version:
          "SERP_REPLAY_PAIR_COMPARISON_V1" as const,

        competitor:
          Object.freeze({
            rank:
              competitor.rank,

            url:
              competitor.url,

            domain:
              competitor.domain,

            title:
              cleanString(
                competitor.title
              ),

            pageType:
              cleanString(
                competitor.pageType
              ),
          }),

        verdict:
          pairVerdict(
            dimensions
          ),

        dimensions,

        blockingDimensions:
          blockingDimensions(
            dimensions
          ),

        missingData:
          comparisonMissingData(
            dimensions
          ),
      })
    );
  }


  const decision =
    replayStatus(
      comparisons
    );


  return Object.freeze({
    version:
      "SERP_REPLAY_V1" as const,

    status:
      decision.status,

    keyword:
      snapshot.keyword,

    serpSnapshotFingerprint:
      snapshot.fingerprint,

    serpCapturedAt:
      new Date(
        snapshot.capturedAt
      ),

    comparisons:
      Object.freeze(
        comparisons
      ),

    blockers:
      decision.blockers,

    warnings:
      decision.warnings,

    provenance:
      Object.freeze({
        comparedResultCount:
          comparisons.length,

        pairwiseModelName:
          generator
            .modelName
            .trim(),

        rankingScoreUsed:
          false as const,

        rankingProbabilityUsed:
          false as const,

        wordCountAsQualitySignal:
          false as const,

        backlinksAsContentQualitySignal:
          false as const,
      }),
  });
}
