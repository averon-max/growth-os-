import type {
  ArticleGenerationContractV1,
  SectionGenerationContractV1,
} from "./article-generation-contract";

import type {
  MasterWriterRunV1,
} from "./master-writer-orchestrator";

import type {
  MasterArticleCriticLocation,
  MasterArticleRepairScope,
} from "./master-article-critic";

import {
  ContentGenerationError,
} from "./generator";


export const MASTER_ARTICLE_SEMANTIC_REVIEW_IDS = [
  "DEEP_INTENT",
  "ORIGINALITY",
  "EDITORIAL",
  "SEMANTIC_DRIFT",
  "CANNIBALIZATION",
] as const;


export type MasterArticleSemanticReviewId =
  (
    typeof MASTER_ARTICLE_SEMANTIC_REVIEW_IDS
  )[number];


export type MasterArticleSemanticStatusV1 =
  | "PASS"
  | "WARN"
  | "BLOCK"
  | "INSUFFICIENT_CONTEXT";


export type MasterArticleSemanticSeverityV1 =
  | "WARN"
  | "BLOCK";


export interface MasterArticleOriginalityReferenceV1 {
  id:
    string;

  label:
    string;

  text:
    string;
}


export interface MasterArticleCannibalizationCandidateV1 {
  id:
    string;

  url:
    string;

  /*
   * These may be unavailable in URL Ownership V1.
   * Never substitute URL text as a fake title/H1.
   */
  title:
    string | null;

  h1:
    string | null;

  /*
   * Only real query-node IDs belong here.
   * Ownership matchedQueries are literal query strings and
   * must never be silently converted into node IDs.
   */
  queryNodeIds:
    readonly string[];

  matchedQueries:
    readonly string[];

  intentMatch:
    boolean | null;

  queryOverlap:
    number | null;

  matchedImpressions:
    number | null;

  missionAffinity:
    number | null;

  summary:
    string | null;
}


export interface MasterArticleSemanticCriticContextV1 {
  /*
   * RANK_READY_KEYWORD_EXECUTION_V1
   *
   * Final production primary + approved same-page secondaries.
   *
   * Execution only:
   * - no density quota
   * - no repetition quota
   * - no new factual authority
   */
  rankReadyKeywords?:
    readonly string[];

  originalityReferences:
    readonly Readonly<
      MasterArticleOriginalityReferenceV1
    >[];

  cannibalizationCandidates:
    readonly Readonly<
      MasterArticleCannibalizationCandidateV1
    >[];

  /*
   * EVIDENCE_DEFERRED_SEMANTIC_CONTEXT_V1
   *
   * Topics intentionally removed by the evidence-aware planner.
   * Their absence alone is not an intent failure.
   */
  evidenceDeferredSections?:
    readonly Readonly<{
      heading:
        string;

      sourceDeferredHeading:
        string;

      summary:
        string | null;

      reason:
        "MISSING_PUBLICATION_GRADE_EVIDENCE";
    }>[];

}


export interface MasterArticleSemanticFindingCandidateV1 {
  code:
    string;

  severity:
    MasterArticleSemanticSeverityV1;

  location:
    MasterArticleCriticLocation;

  message:
    string;

  recommendation:
    string;

  repairScope:
    MasterArticleRepairScope;

  claimIds:
    string[];

  evidenceIds:
    string[];

  queryNodeIds:
    string[];

  sourceIds:
    string[];
}


export interface MasterArticleSemanticReviewCandidateV1 {
  reviewId:
    MasterArticleSemanticReviewId;

  findings:
    MasterArticleSemanticFindingCandidateV1[];
}


export interface MasterArticleSemanticCriticCandidateV1 {
  reviews:
    MasterArticleSemanticReviewCandidateV1[];
}


export interface MasterArticleSemanticFindingV1 {
  version:
    "MASTER_ARTICLE_SEMANTIC_FINDING_V1";

  reviewId:
    MasterArticleSemanticReviewId;

  code:
    string;

  severity:
    MasterArticleSemanticSeverityV1;

  location:
    MasterArticleCriticLocation;

  message:
    string;

  recommendation:
    string;

  repairScope:
    MasterArticleRepairScope;

  claimIds:
    readonly string[];

  evidenceIds:
    readonly string[];

  queryNodeIds:
    readonly string[];

  sourceIds:
    readonly string[];
}


export interface MasterArticleSemanticReviewV1 {
  version:
    "MASTER_ARTICLE_SEMANTIC_REVIEW_V1";

  reviewId:
    MasterArticleSemanticReviewId;

  status:
    MasterArticleSemanticStatusV1;

  contextSufficient:
    boolean;

  findings:
    readonly Readonly<
      MasterArticleSemanticFindingV1
    >[];
}


export interface MasterArticleSemanticCriticRunV1 {
  version:
    "MASTER_ARTICLE_SEMANTIC_CRITIC_RUN_V1";

  reviews:
    readonly Readonly<
      MasterArticleSemanticReviewV1
    >[];

  modelName:
    string;
}


export interface MasterArticleSemanticCriticGenerator {
  readonly modelName:
    string;

  reviewMasterArticleSemantics(
    input: {
      contract:
        Readonly<ArticleGenerationContractV1>;

      run:
        Readonly<MasterWriterRunV1>;

      context:
        Readonly<MasterArticleSemanticCriticContextV1>;
    }
  ):
    Promise<
      Readonly<MasterArticleSemanticCriticRunV1>
    >;
}


function clean(
  value:
    string,
  code:
    string
): string {
  const result =
    value.trim();

  if (!result) {
    throw new ContentGenerationError(
      code
    );
  }

  return result;
}


function unique(
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


function sectionForLocation({
  contract,
  location,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  location:
    MasterArticleCriticLocation;
}): Readonly<
  SectionGenerationContractV1
> | null {
  if (
    location.scope !==
    "SECTION"
  ) {
    return null;
  }

  const section =
    contract.sectionContracts[
      location.sectionIndex
    ];

  if (!section) {
    throw new ContentGenerationError(
      `MASTER_SEMANTIC_CRITIC_SECTION_NOT_FOUND:${location.sectionIndex}`
    );
  }

  if (
    section.sectionNumber !==
    location.sectionNumber
  ) {
    throw new ContentGenerationError(
      `MASTER_SEMANTIC_CRITIC_SECTION_NUMBER_MISMATCH:${location.sectionIndex}`
    );
  }

  if (
    section.blueprint
      .heading !==
    location.heading
  ) {
    throw new ContentGenerationError(
      `MASTER_SEMANTIC_CRITIC_SECTION_HEADING_MISMATCH:${location.sectionIndex}`
    );
  }

  return section;
}


function unionAuthority(
  contract:
    Readonly<ArticleGenerationContractV1>
) {
  const claimIds =
    new Set<string>();

  const evidenceIds =
    new Set<string>();

  const queryNodeIds =
    new Set<string>();

  const sourceIds =
    new Set<string>();

  for (
    const section
    of contract.sectionContracts
  ) {
    for (
      const claim
      of section.claimLedger.claims
    ) {
      claimIds.add(
        claim.id
      );
    }

    for (
      const evidence
      of section.evidenceGraph
        .claimEvidence
    ) {
      evidenceIds.add(
        evidence.id
      );
    }

    /*
     * SEMANTIC_CRITIC_SOURCE_REFERENCE_ALIAS_V1
     *
     * Canonical source references are source.id.
     *
     * The semantic model may occasionally echo the exact source URL
     * visible in authoritative evidence instead of its internal ID.
     *
     * Permit ONLY the exact URL of an already-authorized source.
     * Invented / unrelated URLs remain fail-closed.
     */
    for (
      const source
      of section.evidenceGraph
        .sources
    ) {
      sourceIds.add(
        source.id
      );

      sourceIds.add(
        source.url
      );
    }

    for (
      const queryNodeId
      of section.blueprint
        .queryNodeIds ??
      []
    ) {
      queryNodeIds.add(
        queryNodeId
      );
    }
  }

  return {
    claimIds,
    evidenceIds,
    queryNodeIds,
    sourceIds,
  };
}


function sectionAuthority(
  section:
    Readonly<SectionGenerationContractV1>
) {
  return {
    claimIds:
      new Set(
        section.claimLedger
          .claims
          .map(
            (claim) =>
              claim.id
          )
      ),

    evidenceIds:
      new Set(
        section.evidenceGraph
          .claimEvidence
          .map(
            (evidence) =>
              evidence.id
          )
      ),

    queryNodeIds:
      new Set(
        section.blueprint
          .queryNodeIds ??
        []
      ),

    sourceIds:
      new Set(
        section.evidenceGraph
          .sources
          .flatMap(
            (source) => [
              source.id,
              source.url,
            ]
          )
      ),
  };
}


function assertIdsKnown({
  values,
  allowed,
  code,
}: {
  values:
    readonly string[];

  allowed:
    ReadonlySet<string>;

  code:
    string;
}): void {
  for (
    const value
    of values
  ) {
    if (
      !allowed.has(
        value
      )
    ) {
      throw new ContentGenerationError(
        `${code}:${value}`
      );
    }
  }
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

  return Object.freeze({
    scope:
      "SECTION" as const,

    sectionIndex:
      location.sectionIndex,

    sectionNumber:
      location.sectionNumber,

    heading:
      location.heading,
  });
}


function contextAvailable({
  reviewId,
  context,
}: {
  reviewId:
    MasterArticleSemanticReviewId;

  context:
    Readonly<MasterArticleSemanticCriticContextV1>;
}): boolean {
  if (
    reviewId ===
    "ORIGINALITY"
  ) {
    return (
      context.originalityReferences
        .length >
      0
    );
  }

  if (
    reviewId ===
    "CANNIBALIZATION"
  ) {
    return (
      context.cannibalizationCandidates
        .length >
      0
    );
  }

  return true;
}


function deriveStatus(
  findings:
    readonly Readonly<
      MasterArticleSemanticFindingV1
    >[]
): MasterArticleSemanticStatusV1 {
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



/*
 * MASTER_SEMANTIC_CRITIC_REFERENCE_SELF_HEAL_V1
 *
 * Semantic critic output is diagnostic metadata.
 * It may NEVER expand factual/query/source authority.
 *
 * Provider models occasionally emit an identifier that resembles
 * a real verified-excerpt id but is not part of the canonical
 * ArticleGenerationContract.
 *
 * That is recoverable provider-output noise, not a reason to throw
 * away an already generated article.
 *
 * Unknown references are deterministically removed BEFORE the
 * existing strict finalizer runs.
 *
 * Important:
 * - no unknown id becomes trusted;
 * - no claim/evidence/source/query is invented;
 * - finding severity/message/repair scope are preserved;
 * - structural/location validation remains strict;
 * - canonical finalizer remains fail-closed.
 */
export function normalizeMasterArticleSemanticCriticCandidateV1({
  contract,
  candidate,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  candidate:
    Readonly<MasterArticleSemanticCriticCandidateV1>;
}): MasterArticleSemanticCriticCandidateV1 {

  const knownOnly = (
    values:
      string[],

    allowed:
      ReadonlySet<string>
  ): string[] =>
    Array.isArray(
      values
    )
      ? values
          .filter(
            (
              value
            ): value is string =>
              typeof value ===
                "string"
          )
          .map(
            (
              value
            ) =>
              value.trim()
          )
          .filter(
            (
              value
            ) =>
              value.length >
                0 &&
              allowed.has(
                value
              )
          )
      : values;


  return {
    ...candidate,

    reviews:
      candidate.reviews.map(
        (
          review
        ) => ({
          ...review,

          findings:
            review.findings.map(
              (
                finding
              ) => {
                const section =
                  finding.location
                    .scope ===
                    "SECTION"
                    ? contract
                        .sectionContracts[
                          finding
                            .location
                            .sectionIndex
                        ]
                    : null;


                /*
                 * Unknown SECTION locations remain untouched.
                 * The strict canonical finalizer must reject those.
                 */
                if (
                  finding.location
                    .scope ===
                      "SECTION" &&
                  !section
                ) {
                  return {
                    ...finding,
                  };
                }


                const authority =
                  section
                    ? sectionAuthority(
                        section
                      )
                    : unionAuthority(
                        contract
                      );


                return {
                  ...finding,

                  claimIds:
                    knownOnly(
                      finding.claimIds,
                      authority.claimIds
                    ),

                  evidenceIds:
                    knownOnly(
                      finding.evidenceIds,
                      authority.evidenceIds
                    ),

                  queryNodeIds:
                    knownOnly(
                      finding.queryNodeIds,
                      authority.queryNodeIds
                    ),

                  sourceIds:
                    knownOnly(
                      finding.sourceIds,
                      authority.sourceIds
                    ),
                };
              }
            ),
        })
      ),
  };
}


function validateFinding({
  reviewId,
  finding,
  contract,
}: {
  reviewId:
    MasterArticleSemanticReviewId;

  finding:
    MasterArticleSemanticFindingCandidateV1;

  contract:
    Readonly<ArticleGenerationContractV1>;
}): Readonly<
  MasterArticleSemanticFindingV1
> {
  const section =
    sectionForLocation({
      contract,
      location:
        finding.location,
    });

  if (
    finding.repairScope ===
      "SECTION" &&
    finding.location.scope !==
      "SECTION"
  ) {
    throw new ContentGenerationError(
      "MASTER_SEMANTIC_CRITIC_SECTION_REPAIR_REQUIRES_SECTION_LOCATION"
    );
  }

  const claimIds =
    unique(
      finding.claimIds
    );

  const evidenceIds =
    unique(
      finding.evidenceIds
    );

  const queryNodeIds =
    unique(
      finding.queryNodeIds
    );

  const sourceIds =
    unique(
      finding.sourceIds
    );


  const authority =
    section
      ? sectionAuthority(
          section
        )
      : unionAuthority(
          contract
        );


  assertIdsKnown({
    values:
      claimIds,

    allowed:
      authority.claimIds,

    code:
      "MASTER_SEMANTIC_CRITIC_UNKNOWN_CLAIM",
  });

  assertIdsKnown({
    values:
      evidenceIds,

    allowed:
      authority.evidenceIds,

    code:
      "MASTER_SEMANTIC_CRITIC_UNKNOWN_EVIDENCE",
  });

  assertIdsKnown({
    values:
      queryNodeIds,

    allowed:
      authority.queryNodeIds,

    code:
      "MASTER_SEMANTIC_CRITIC_UNKNOWN_QUERY_NODE",
  });

  assertIdsKnown({
    values:
      sourceIds,

    allowed:
      authority.sourceIds,

    code:
      "MASTER_SEMANTIC_CRITIC_UNKNOWN_SOURCE",
  });


  return Object.freeze({
    version:
      "MASTER_ARTICLE_SEMANTIC_FINDING_V1" as const,

    reviewId,

    code:
      clean(
        finding.code,
        "MASTER_SEMANTIC_CRITIC_CODE_REQUIRED"
      ),

    severity:
      finding.severity,

    location:
      freezeLocation(
        finding.location
      ),

    message:
      clean(
        finding.message,
        "MASTER_SEMANTIC_CRITIC_MESSAGE_REQUIRED"
      ),

    recommendation:
      clean(
        finding.recommendation,
        "MASTER_SEMANTIC_CRITIC_RECOMMENDATION_REQUIRED"
      ),

    repairScope:
      finding.repairScope,

    claimIds,

    evidenceIds,

    queryNodeIds,

    sourceIds,
  });
}


export function finalizeMasterArticleSemanticCriticRunV1({
  contract,
  context,
  modelName,
  candidate,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  context:
    Readonly<MasterArticleSemanticCriticContextV1>;

  modelName:
    string;

  candidate:
    unknown;
}): Readonly<
  MasterArticleSemanticCriticRunV1
> {
  const cleanModelName =
    clean(
      modelName,
      "MASTER_SEMANTIC_CRITIC_MODEL_REQUIRED"
    );


  if (
    typeof candidate !==
      "object" ||
    candidate ===
      null ||
    !(
      "reviews" in
      candidate
    ) ||
    !Array.isArray(
      (
        candidate as {
          reviews?: unknown;
        }
      ).reviews
    )
  ) {
    throw new ContentGenerationError(
      "MASTER_SEMANTIC_CRITIC_RESPONSE_INVALID"
    );
  }


  const rawReviews =
    (
      candidate as
        MasterArticleSemanticCriticCandidateV1
    ).reviews;


  if (
    rawReviews.length !==
    MASTER_ARTICLE_SEMANTIC_REVIEW_IDS
      .length
  ) {
    throw new ContentGenerationError(
      "MASTER_SEMANTIC_CRITIC_REVIEW_COUNT_INVALID"
    );
  }


  const byId =
    new Map<
      MasterArticleSemanticReviewId,
      MasterArticleSemanticReviewCandidateV1
    >();


  for (
    const review
    of rawReviews
  ) {
    if (
      !MASTER_ARTICLE_SEMANTIC_REVIEW_IDS
        .includes(
          review.reviewId
        )
    ) {
      throw new ContentGenerationError(
        `MASTER_SEMANTIC_CRITIC_UNKNOWN_REVIEW:${String(review.reviewId)}`
      );
    }


    if (
      byId.has(
        review.reviewId
      )
    ) {
      throw new ContentGenerationError(
        `MASTER_SEMANTIC_CRITIC_DUPLICATE_REVIEW:${review.reviewId}`
      );
    }


    if (
      !Array.isArray(
        review.findings
      )
    ) {
      throw new ContentGenerationError(
        `MASTER_SEMANTIC_CRITIC_FINDINGS_INVALID:${review.reviewId}`
      );
    }


    byId.set(
      review.reviewId,
      review
    );
  }


  const reviews:
    Readonly<
      MasterArticleSemanticReviewV1
    >[] =
      [];


  for (
    const reviewId
    of MASTER_ARTICLE_SEMANTIC_REVIEW_IDS
  ) {
    const raw =
      byId.get(
        reviewId
      );

    if (!raw) {
      throw new ContentGenerationError(
        `MASTER_SEMANTIC_CRITIC_MISSING_REVIEW:${reviewId}`
      );
    }


    const sufficient =
      contextAvailable({
        reviewId,
        context,
      });


    if (
      !sufficient
    ) {
      /*
       * The model is not allowed to pretend it can evaluate
       * originality/cannibalization without comparison data.
       */
      if (
        raw.findings.length >
        0
      ) {
        throw new ContentGenerationError(
          `MASTER_SEMANTIC_CRITIC_FINDINGS_WITHOUT_CONTEXT:${reviewId}`
        );
      }


      reviews.push(
        Object.freeze({
          version:
            "MASTER_ARTICLE_SEMANTIC_REVIEW_V1" as const,

          reviewId,

          status:
            "INSUFFICIENT_CONTEXT" as const,

          contextSufficient:
            false,

          findings:
            Object.freeze([]),
        })
      );

      continue;
    }


    const findings =
      Object.freeze(
        raw.findings
          .map(
            (finding) =>
              validateFinding({
                reviewId,
                finding,
                contract,
              })
          )
      );


    reviews.push(
      Object.freeze({
        version:
          "MASTER_ARTICLE_SEMANTIC_REVIEW_V1" as const,

        reviewId,

        status:
          deriveStatus(
            findings
          ),

        contextSufficient:
          true,

        findings,
      })
    );
  }


  return Object.freeze({
    version:
      "MASTER_ARTICLE_SEMANTIC_CRITIC_RUN_V1" as const,

    reviews:
      Object.freeze([
        ...reviews,
      ]),

    modelName:
      cleanModelName,
  });
}


export function supportsMasterArticleSemanticCriticGenerator(
  value:
    unknown
): value is MasterArticleSemanticCriticGenerator {
  if (
    typeof value !==
      "object" ||
    value ===
      null
  ) {
    return false;
  }

  const candidate =
    value as
      Partial<
        MasterArticleSemanticCriticGenerator
      >;

  return (
    typeof candidate.modelName ===
      "string" &&
    candidate.modelName
      .trim()
      .length >
      0 &&
    typeof candidate
      .reviewMasterArticleSemantics ===
      "function"
  );
}
