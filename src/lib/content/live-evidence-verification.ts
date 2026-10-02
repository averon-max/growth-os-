import {
  fetchSinglePage,
} from "../crawler/crawler";

import {
  defaultAuthorityTier,
  type EvidenceSourceType,
} from "./evidence-graph";

import type {
  ProductionMasterArtifactPipelineInput,
} from "./production-master-artifact-builders";


type EvidenceGraphInput =
  ProductionMasterArtifactPipelineInput[
    "evidenceGraph"
  ];


type MinimalClaim =
  Readonly<{
    id: string;
    text: string;
  }>;


type MinimalSection =
  Readonly<{
    heading: string;
    mission: string;
    expectedOutcome?: string;
  }>;


export interface VerifiedExcerptCandidateV1 {
  excerpt: string;
  coverage: number;
}


export interface SectionEvidenceAssignmentV1 {
  requiredClaims: string[];
  evidenceIds: string[];
}


const MAX_EVIDENCE_FETCH_SOURCES =
  24;


const STOP_WORDS =
  new Set([
    "the",
    "and",
    "for",
    "that",
    "with",
    "from",
    "this",
    "your",
    "you",
    "are",
    "was",
    "were",
    "has",
    "have",
    "had",
    "into",
    "its",
    "their",
    "they",
    "them",
    "what",
    "when",
    "where",
    "which",
    "while",
    "about",
    "through",
    "can",
    "may",
    "will",
    "would",
    "could",
    "should",
    "how",
    "why",
    "who",
    "does",
    "did",
    "doing",
  ]);


/*
 * EVIDENCE_LEXICAL_CANONICALIZATION_V1
 *
 * Deterministic normalization only.
 *
 * It does NOT:
 * - lower verification thresholds
 * - bypass negation
 * - bypass numeric matching
 * - promote SEARCH_SNIPPET
 * - establish factual truth
 */
function normalize(
  value:
    string
): string {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9$%.-]+/g,
      " "
    )
    /*
     * Hyphenation must not change semantic identity:
     *
     * credit-report
     * credit report
     *
     * become the same token sequence.
     */
    .replace(
      /-+/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


export function canonicalEvidenceTokenV1(
  input:
    string
): string {
  let token =
    input
      .trim()
      .toLowerCase();


  /*
   * Small deterministic morphology normalization.
   */
  if (
    token.length >
      5 &&
    token.endsWith(
      "ies"
    )
  ) {
    token =
      `${token.slice(
        0,
        -3
      )}y`;
  } else if (
    token.length >
      5 &&
    token.endsWith(
      "ing"
    )
  ) {
    token =
      token.slice(
        0,
        -3
      );
  } else if (
    token.length >
      5 &&
    /(?:ches|shes|xes|zes)$/u.test(
      token
    )
  ) {
    token =
      token.slice(
        0,
        -2
      );
  } else if (
    token.length >
      4 &&
    token.endsWith(
      "ed"
    )
  ) {
    token =
      token.slice(
        0,
        -2
      );
  } else if (
    token.length >
      4 &&
    token.endsWith(
      "s"
    ) &&
    !token.endsWith(
      "ss"
    )
  ) {
    token =
      token.slice(
        0,
        -1
      );
  }


  /*
   * Small controlled synonym set for obvious factual
   * paraphrases.
   *
   * These aliases only affect lexical comparison.
   */
  const aliases:
    Readonly<
      Record<
        string,
        string
      >
    > = {
      watch:
        "monitor",

      track:
        "monitor",

      monitor:
        "monitor",

      notify:
        "alert",

      notification:
        "alert",

      alert:
        "alert",

      fix:
        "repair",

      correct:
        "repair",

      correction:
        "repair",

      repair:
        "repair",

      update:
        "change",

      change:
        "change",

      error:
        "inaccuracy",

      inaccurate:
        "inaccuracy",

      incorrect:
        "inaccuracy",
    };


  return (
    aliases[token] ??
    token
  );
}


function semanticTokens(
  value:
    string
): string[] {
  const tokens =
    normalize(
      value
    )
      .split(
        " "
      )
      .map(
        (token) =>
          canonicalEvidenceTokenV1(
            token
          )
      )
      .filter(
        (token) =>
          token.length >=
            3 &&
          !STOP_WORDS.has(
            token
          )
      );


  return [
    ...new Set(
      tokens
    ),
  ];
}


function numericTokens(
  value:
    string
): string[] {
  return (
    value.match(
      /\$?\d+(?:[.,]\d+)?%?/g
    ) ??
    []
  );
}


function hasNegation(
  value:
    string
): boolean {
  return /\b(?:no|not|never|without|cannot|can't|doesn't|does not|isn't|is not|aren't|are not)\b/i.test(
    value
  );
}


function sentenceWindows(
  bodyText:
    string
): string[] {
  const clean =
    bodyText
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  if (!clean) {
    return [];
  }


  const sentences =
    clean
      .split(
        /(?<=[.!?])\s+/
      )
      .map(
        (value) =>
          value.trim()
      )
      .filter(
        Boolean
      );


  const windows:
    string[] =
      [];


  for (
    let index = 0;
    index <
    sentences.length;
    index++
  ) {
    const current =
      sentences[
        index
      ];


    if (
      current &&
      current.length >=
        40 &&
      current.length <=
        1200
    ) {
      windows.push(
        current
      );
    }


    const next =
      sentences[
        index +
        1
      ];


    if (
      current &&
      next
    ) {
      const combined =
        `${current} ${next}`;


      if (
        combined.length >=
          60 &&
        combined.length <=
          1200
      ) {
        windows.push(
          combined
        );
      }
    }
  }


  return windows;
}



/*
 * NEGATIVE_CLAIM_TARGET_PRESERVATION_V1
 *
 * Existing evidence matching already requires:
 * - semantic lexical coverage
 * - matching negation polarity
 * - exact numeric preservation
 *
 * That is necessary but not sufficient for negative factual claims.
 *
 * A thematically related excerpt can contain enough shared words and
 * an unrelated negation while omitting the actual object/predicate
 * being denied.
 *
 * Example:
 *
 * claim:
 *   "Checking a credit monitoring service does not itself
 *    change a credit score."
 *
 * unrelated excerpt:
 *   discusses monitoring services, credit, and balance changes,
 *   but never says anything about a credit score.
 *
 * This gate deterministically preserves the tail semantic target of
 * negative claims. No LLM, topic-specific vocabulary, or weaker
 * threshold is introduced.
 */


const NEGATIVE_CLAIM_PATTERN_V1 =
  /\b(?:does\s+not|do\s+not|did\s+not|is\s+not|are\s+not|was\s+not|were\s+not|cannot|can't|doesn't|don't|didn't|isn't|aren't|wasn't|weren't|not|never|without|no)\b/i;


const NEGATIVE_CLAIM_NON_TARGET_TOKENS_V1 =
  new Set([
    "itself",
    "himself",
    "herself",
    "yourself",
    "ourselves",
    "themselves",

    /*
     * Generic container noun: carries no denied target of its own.
     * Polarity, numbers and coverage thresholds are unchanged.
     */
    "information",
  ]);


/*
 * NEGATIVE_CLAIM_TARGET_TOKEN_NORMALIZATION_V1
 *
 * semanticTokens intentionally preserves "." for existing
 * evidence/numeric behavior. Do not change that global contract.
 *
 * Target-anchor comparison is lexical identity only, so strip
 * punctuation from the edges locally.
 */
function normalizeNegativeTargetTokenV1(
  token:
    string
): string {
  return token
    .replace(
      /^[^a-z0-9$%]+/i,
      ""
    )
    .replace(
      /[^a-z0-9$%]+$/i,
      ""
    );
}


export function negativeClaimTargetAnchorsV1(
  claimText:
    string
): readonly string[] {
  const match =
    NEGATIVE_CLAIM_PATTERN_V1.exec(
      claimText
    );


  if (
    !match ||
    match.index ===
      undefined
  ) {
    return [];
  }


  const prefix =
    claimText.slice(
      0,
      match.index
    );


  const tail =
    claimText.slice(
      match.index +
        match[0].length
    );


  const prefixTokens =
    new Set(
      semanticTokens(
        prefix
      )
    );


  const candidates =
    semanticTokens(
      tail
    )
      .map(
        (
          token
        ) =>
          normalizeNegativeTargetTokenV1(
            token
          )
      )
      .filter(
        (
          token
        ) =>
          token.length >
            0 &&
          !NEGATIVE_CLAIM_NON_TARGET_TOKENS_V1.has(
            token
          ) &&
          !prefixTokens.has(
            token
          )
      );


  /*
   * Last two distinctive tail tokens represent the material
   * object/target conservatively:
   *
   *   credit score
   *   identity theft
   *   transunion data
   *
   * Fewer than two is allowed only when the negative claim has
   * one genuinely distinctive tail token.
   */
  return candidates.slice(
    -2
  );
}


function preservesNegativeClaimTargetV1({
  claimText,
  excerpt,
}: {
  claimText:
    string;

  excerpt:
    string;
}): boolean {
  if (
    !hasNegation(
      claimText
    )
  ) {
    /*
     * Positive claims retain the existing matcher unchanged.
     */
    return true;
  }


  const anchors =
    negativeClaimTargetAnchorsV1(
      claimText
    );


  /*
   * Negative claim with no deterministic target identity:
   * fail closed rather than invent support.
   */
  if (
    anchors.length ===
    0
  ) {
    return false;
  }


  const excerptTokens =
    new Set(
      semanticTokens(
        excerpt
      )
        .map(
          (
            token
          ) =>
            normalizeNegativeTargetTokenV1(
              token
            )
        )
        .filter(
          Boolean
        )
    );


  return anchors.every(
    (
      anchor
    ) =>
      excerptTokens.has(
        anchor
      )
  );
}


export function findVerifiedExcerptCandidateV1({
  claimText,
  bodyText,
}: {
  claimText:
    string;

  bodyText:
    string;
}): VerifiedExcerptCandidateV1 | null {
  const claimTokens =
    semanticTokens(
      claimText
    );


  /*
   * Too little semantic identity means deterministic
   * matching is unsafe.
   */
  if (
    claimTokens.length <
    3
  ) {
    return null;
  }


  const claimNumbers =
    numericTokens(
      claimText
    );


  const claimNegation =
    hasNegation(
      claimText
    );


  let best:
    VerifiedExcerptCandidateV1 |
    null =
      null;


  for (
    const excerpt
    of sentenceWindows(
      bodyText
    )
  ) {
    /*
     * Never verify a positive claim from a negated sentence,
     * or vice versa.
     */
    if (
      hasNegation(
        excerpt
      ) !==
      claimNegation
    ) {
      continue;
    }


    const excerptNumbers =
      new Set(
        numericTokens(
          excerpt
        )
      );


    if (
      !claimNumbers.every(
        (number) =>
          excerptNumbers.has(
            number
          )
      )
    ) {
      continue;
    }


    const excerptTokens =
      new Set(
        semanticTokens(
          excerpt
        )
      );


    let covered =
      0;


    for (
      const token
      of claimTokens
    ) {
      if (
        excerptTokens.has(
          token
        )
      ) {
        covered++;
      }
    }


    const coverage =
      covered /
      claimTokens.length;


    const minimumCoverage =
      claimTokens.length <=
        5
        ? 0.8
        : 0.7;


    const minimumCovered =
      Math.min(
        claimTokens.length,
        Math.max(
          3,
          Math.ceil(
            claimTokens.length *
            0.65
          )
        )
      );


    if (
      coverage <
        minimumCoverage ||
      covered <
        minimumCovered
    ) {
      continue;
    }



    /*
     * VERIFIED_EXCERPT_NEGATIVE_TARGET_GATE_V1
     *
     * Topical overlap + matching negation is not enough.
     * The evidence window must preserve the material target
     * of a negative factual claim.
     */
    if (
      !preservesNegativeClaimTargetV1({
        claimText,
        excerpt,
      })
    ) {
      continue;
    }


    if (
      !best ||
      coverage >
        best.coverage ||
      (
        coverage ===
          best.coverage &&
        excerpt.length <
          best.excerpt.length
      )
    ) {
      best = {
        excerpt,
        coverage,
      };
    }
  }


  return best;
}


function stableHash(
  value:
    string
): string {
  let hash =
    2166136261;


  for (
    let index = 0;
    index <
    value.length;
    index++
  ) {
    hash ^=
      value.charCodeAt(
        index
      );

    hash =
      Math.imul(
        hash,
        16777619
      );
  }


  return (
    hash >>>
    0
  ).toString(
    36
  );
}


async function fetchSourceBodies(
  graph:
    EvidenceGraphInput
): Promise<
  Map<
    string,
    string
  >
> {
  const output =
    new Map<
      string,
      string
    >();


  /*
   * Bound provider/network cost and attack surface.
   * Existing EvidenceGraph ordering already prefers
   * first-party / observed research sources.
   */
  const sources =
    graph.sources.slice(
      0,
      MAX_EVIDENCE_FETCH_SOURCES
    );


  const concurrency =
    3;


  for (
    let offset = 0;
    offset <
    sources.length;
    offset +=
      concurrency
  ) {
    const batch =
      sources.slice(
        offset,
        offset +
          concurrency
      );


    await Promise.all(
      batch.map(
        async (
          source
        ) => {
          try {
            const page =
              await fetchSinglePage(
                source.url,
                {
                  timeoutMs:
                    8000,

                  maxResponseSize:
                    2 *
                    1024 *
                    1024,
                }
              );


            if (
              page.error ||
              page.statusCode <
                200 ||
              page.statusCode >=
                300 ||
              !page.parsed
            ) {
              return;
            }


            const bodyText =
              page.parsed
                .bodyText
                .trim();


            if (
              bodyText.length <
              200
            ) {
              return;
            }


            output.set(
              source.id,
              bodyText
            );
          } catch {
            /*
             * Individual external sources are allowed to fail
             * closed. Failure never upgrades discovery evidence.
             */
          }
        }
      )
    );
  }


  return output;
}



/*
 * CLAIM_SPECIFIC_EVIDENCE_FALLBACK_V1
 *
 * Initial EvidenceGraph discovery is article-level:
 * live SERP + AI overview + verified first-party sources.
 *
 * That is useful for strategy but can miss an authoritative page
 * for one specific MUST-support claim.
 *
 * This helper performs ONE bounded fallback discovery pass for
 * unresolved claims.
 *
 * Important:
 * - search snippets NEVER become VERIFIED_EXCERPT
 * - discovered URLs still go through fetchSinglePage()
 * - fetched page text still goes through
 *   findVerifiedExcerptCandidateV1()
 * - no claim with zero verified evidence is authorized
 * - no retry loop exists here
 */

const MAX_EVIDENCE_FALLBACK_CLAIMS =
  6;

const MAX_EVIDENCE_FALLBACK_QUERIES_PER_CLAIM =
  3;

const MAX_EVIDENCE_FALLBACK_SOURCES_PER_CLAIM =
  4;


export interface EvidenceFallbackOrganicResultV1 {
  url:
    string;

  title?:
    string | null;

  domain?:
    string | null;
}


export type EvidenceFallbackSearchV1 =
  (
    input: {
      keyword:
        string;

      locationName:
        string;

      languageName:
        string;
    }
  ) => Promise<{
    organic:
      readonly EvidenceFallbackOrganicResultV1[];
  }>;


export function buildClaimEvidenceFallbackQueriesV1({
  primaryQuery,
  claimText,
}: {
  primaryQuery:
    string;

  claimText:
    string;
}): string[] {
  const primary =
    primaryQuery
      .trim();

  const claim =
    claimText
      .trim();

  const primaryTokens =
    new Set(
      semanticTokens(
        primary
      )
    );

  const claimTokens =
    [
      ...new Set(
        semanticTokens(
          claim
        )
      ),
    ];


  const conceptTokens =
    claimTokens
      .filter(
        (
          token
        ) =>
          !primaryTokens.has(
            token
          )
      )
      .slice(
        0,
        6
      );


  const simplifiedClaim =
    claimTokens
      .slice(
        0,
        10
      )
      .join(
        " "
      );


  const topicConceptQuery =
    [
      primary,

      ...conceptTokens.slice(
        0,
        4
      ),
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      )
      .trim();


  return [
    claim,
    simplifiedClaim,
    topicConceptQuery,
  ]
    .map(
      (
        value
      ) =>
        value
          .replace(
            /\s+/g,
            " "
          )
          .trim()
    )
    .filter(
      (
        value,
        index,
        values
      ) =>
        value.length >
          0 &&
        values.indexOf(
          value
        ) ===
          index
    )
    .slice(
      0,
      MAX_EVIDENCE_FALLBACK_QUERIES_PER_CLAIM
    );
}


function evidenceFallbackSourceTypeV1(
  hostname:
    string
): EvidenceSourceType {
  const lower =
    hostname
      .toLowerCase();

  if (
    lower.endsWith(
      ".gov"
    ) ||
    lower.includes(
      ".gov."
    )
  ) {
    return "PRIMARY_GOVERNMENT";
  }


  if (
    lower.endsWith(
      ".edu"
    ) ||
    lower.includes(
      ".edu."
    )
  ) {
    return "ACADEMIC";
  }


  return "REPUTABLE_SECONDARY";
}


function normalizeEvidenceSourceUrlV1(
  raw:
    string
): string | null {
  try {
    const url =
      new URL(
        raw
      );

    if (
      url.protocol !==
        "https:" &&
      url.protocol !==
        "http:"
    ) {
      return null;
    }


    url.hash =
      "";


    return url
      .toString()
      .replace(
        /\/$/,
        ""
      );
  } catch {
    return null;
  }
}


export async function discoverClaimEvidenceFallbackSourcesV1({
  claims,
  primaryQuery,
  locationName,
  languageName,
  existingUrls = [],
  search,
}: {
  claims:
    readonly MinimalClaim[];

  primaryQuery:
    string;

  locationName:
    string;

  languageName:
    string;

  existingUrls?:
    readonly string[];

  search?:
    EvidenceFallbackSearchV1;
}): Promise<
  EvidenceGraphInput[
    "sources"
  ]
> {
  const runSearch:
    EvidenceFallbackSearchV1 =
      search ??
      (
        async (
          input
        ) => {
          /*
           * LAZY_SERVER_ONLY_SERP_IMPORT_V1
           *
           * live-evidence-verification contains pure helpers that are
           * imported directly by Vitest.
           *
           * serp-intelligence is server-only, so importing it at module
           * initialization would make every pure evidence test fail
           * before execution.
           *
           * Load it only on the real production fallback path.
           * Tests that inject `search` never execute this import.
           */
          const {
            buildSerpIntelligence,
          } =
            await import(
              "./serp-intelligence"
            );


          const serp =
            await buildSerpIntelligence({
              keyword:
                input.keyword,

              locationName:
                input.locationName,

              languageName:
                input.languageName,
            });


          const organic =
            (
              serp.organic ??
              []
            ) as unknown as
              readonly EvidenceFallbackOrganicResultV1[];


          return {
            organic,
          };
        }
      );


  const seenUrls =
    new Set(
      existingUrls
        .map(
          (
            url
          ) =>
            normalizeEvidenceSourceUrlV1(
              url
            )
        )
        .filter(
          (
            url
          ): url is string =>
            Boolean(
              url
            )
        )
    );


  const output:
    EvidenceGraphInput[
      "sources"
    ] =
      [];


  const diagnostics:
    Array<{
      claimId:
        string;

      queries:
        string[];

      discoveredSources:
        number;
    }> =
      [];


  for (
    const claim
    of claims.slice(
      0,
      MAX_EVIDENCE_FALLBACK_CLAIMS
    )
  ) {
    const queries =
      buildClaimEvidenceFallbackQueriesV1({
        primaryQuery,
        claimText:
          claim.text,
      });


    let sourcesForClaim =
      0;


    for (
      const query
      of queries
    ) {
      if (
        sourcesForClaim >=
        MAX_EVIDENCE_FALLBACK_SOURCES_PER_CLAIM
      ) {
        break;
      }


      let results:
        readonly EvidenceFallbackOrganicResultV1[] =
          [];


      try {
        const response =
          await runSearch({
            keyword:
              query,

            locationName,

            languageName,
          });


        results =
          response.organic;
      } catch (
        error
      ) {
        console.warn(
          "[content evidence fallback search failed]",
          {
            claimId:
              claim.id,

            query,

            error:
              error instanceof
              Error
                ? error.message
                : String(
                    error
                  ),
          }
        );

        continue;
      }


      for (
        const result
        of results.slice(
          0,
          5
        )
      ) {
        if (
          sourcesForClaim >=
          MAX_EVIDENCE_FALLBACK_SOURCES_PER_CLAIM
        ) {
          break;
        }


        const normalizedUrl =
          normalizeEvidenceSourceUrlV1(
            result.url
          );


        if (
          !normalizedUrl ||
          seenUrls.has(
            normalizedUrl
          )
        ) {
          continue;
        }


        let hostname:
          string;


        try {
          hostname =
            new URL(
              normalizedUrl
            ).hostname;
        } catch {
          continue;
        }


        const sourceType =
          evidenceFallbackSourceTypeV1(
            hostname
          );


        seenUrls.add(
          normalizedUrl
        );


        output.push({
          id:
            `claim-fallback-source-${stableHash(
              normalizedUrl
            )}`,

          url:
            normalizedUrl,

          publisher:
            result.domain
              ?.trim() ||
            hostname,

          sourceType,

          authorityTier:
            defaultAuthorityTier(
              sourceType
            ),

          retrievedAt:
            new Date(),
        });


        sourcesForClaim +=
          1;
      }
    }


    diagnostics.push({
      claimId:
        claim.id,

      queries,

      discoveredSources:
        sourcesForClaim,
    });
  }


  console.info(
    "[content evidence fallback discovery]",
    diagnostics
  );


  return output;
}


export async function enrichLiveEvidenceGraphV1({
  graph,
  claims,
}: {
  graph:
    EvidenceGraphInput;

  claims:
    readonly MinimalClaim[];
}): Promise<EvidenceGraphInput> {
  const bodies =
    await fetchSourceBodies(
      graph
    );


  const existingIds =
    new Set(
      graph
        .claimEvidence
        .map(
          (item) =>
            item.id
        )
    );


  const verified =
    [
      ...graph
        .claimEvidence,
    ];


  for (
    const claim
    of claims
  ) {
    let best:
      | {
          sourceId:
            string;

          excerpt:
            string;

          coverage:
            number;
        }
      | null =
        null;


    for (
      const source
      of graph.sources
    ) {
      const bodyText =
        bodies.get(
          source.id
        );


      if (!bodyText) {
        continue;
      }


      const candidate =
        findVerifiedExcerptCandidateV1({
          claimText:
            claim.text,

          bodyText,
        });


      if (!candidate) {
        continue;
      }


      if (
        !best ||
        candidate.coverage >
          best.coverage
      ) {
        best = {
          sourceId:
            source.id,

          excerpt:
            candidate.excerpt,

          coverage:
            candidate.coverage,
        };
      }
    }


    if (!best) {
      continue;
    }


    const id =
      `verified-excerpt-${stableHash(
        [
          claim.id,
          best.sourceId,
          best.excerpt,
        ].join(
          "\u0000"
        )
      )}`;


    if (
      existingIds.has(
        id
      )
    ) {
      continue;
    }


    existingIds.add(
      id
    );


    verified.push({
      id,

      claimId:
        claim.id,

      sourceId:
        best.sourceId,

      relation:
        "SUPPORTS",

      kind:
        "VERIFIED_EXCERPT",

      excerpt:
        best.excerpt,
    });
  }


  return {
    sources:
      [
        ...graph.sources,
      ],

    claimEvidence:
      verified,
  };
}


function sectionAffinity({
  claimText,
  section,
}: {
  claimText:
    string;

  section:
    MinimalSection;
}): number {
  const claimTokens =
    semanticTokens(
      claimText
    );


  if (
    claimTokens.length ===
    0
  ) {
    return 0;
  }


  const sectionTokens =
    new Set(
      semanticTokens(
        [
          section.heading,
          section.mission,
          section
            .expectedOutcome ??
            "",
        ].join(
          " "
        )
      )
    );


  let shared =
    0;


  for (
    const token
    of claimTokens
  ) {
    if (
      sectionTokens.has(
        token
      )
    ) {
      shared++;
    }
  }


  return (
    shared /
    claimTokens.length
  );
}


export function assignVerifiedEvidenceToSectionsV1({
  sections,
  claims,
  evidenceGraph,
}: {
  sections:
    readonly MinimalSection[];

  claims:
    readonly MinimalClaim[];

  evidenceGraph:
    EvidenceGraphInput;
}): SectionEvidenceAssignmentV1[] {
  const assignments =
    sections.map(
      () => ({
        requiredClaims:
          [] as string[],

        evidenceIds:
          [] as string[],
      })
    );


  const verifiedByClaim =
    new Map<
      string,
      string[]
    >();


  for (
    const evidence
    of evidenceGraph
      .claimEvidence
  ) {
    if (
      evidence.kind !==
        "VERIFIED_EXCERPT" ||
      evidence.relation !==
        "SUPPORTS" ||
      !evidence.excerpt
        ?.trim()
    ) {
      continue;
    }


    const ids =
      verifiedByClaim.get(
        evidence.claimId
      ) ??
      [];


    ids.push(
      evidence.id
    );


    verifiedByClaim.set(
      evidence.claimId,
      ids
    );
  }


  for (
    const claim
    of claims
  ) {
    const evidenceIds =
      verifiedByClaim.get(
        claim.id
      );


    if (
      !evidenceIds ||
      evidenceIds.length ===
        0
    ) {
      continue;
    }


    let bestIndex =
      -1;

    let bestScore =
      0;


    sections.forEach(
      (
        section,
        index
      ) => {
        const score =
          sectionAffinity({
            claimText:
              claim.text,

            section,
          });


        if (
          score >
          bestScore
        ) {
          bestScore =
            score;

          bestIndex =
            index;
        }
      }
    );


    /*
     * Do not force an unrelated verified claim into a section.
     */
    if (
      bestIndex <
        0 ||
      bestScore <
        0.2
    ) {
      continue;
    }


    assignments[
      bestIndex
    ]?.requiredClaims.push(
      claim.id
    );


    assignments[
      bestIndex
    ]?.evidenceIds.push(
      ...evidenceIds
    );
  }


  for (
    const assignment
    of assignments
  ) {
    assignment.requiredClaims =
      [
        ...new Set(
          assignment
            .requiredClaims
        ),
      ];


    assignment.evidenceIds =
      [
        ...new Set(
          assignment
            .evidenceIds
        ),
      ];
  }


  return assignments;
}


/*
 * EXPLICIT_SECTION_CLAIM_ASSIGNMENT_V2
 *
 * Stage Planner owns semantic claim placement.
 * Evidence verification owns whether that claim is actually
 * publication-grade.
 *
 * There is deliberately NO lexical claim→section guessing here.
 */
export function assignVerifiedEvidenceToExplicitSectionsV2({
  sections,
  claims,
  evidenceGraph,
}: {
  sections:
    readonly Readonly<{
      requiredClaimIds:
        readonly string[];
    }>[];

  claims:
    readonly Readonly<{
      id:
        string;

      text:
        string;
    }>[];

  evidenceGraph:
    EvidenceGraphInput;
}): SectionEvidenceAssignmentV1[] {
  const knownClaims =
    new Set(
      claims.map(
        (
          claim
        ) =>
          claim.id
      )
    );


  const verifiedByClaim =
    new Map<
      string,
      string[]
    >();


  for (
    const evidence
    of evidenceGraph.claimEvidence
  ) {
    if (
      evidence.kind !==
        "VERIFIED_EXCERPT" ||
      evidence.relation !==
        "SUPPORTS" ||
      !evidence.excerpt
        ?.trim()
    ) {
      continue;
    }


    const ids =
      verifiedByClaim.get(
        evidence.claimId
      ) ??
      [];


    ids.push(
      evidence.id
    );


    verifiedByClaim.set(
      evidence.claimId,
      ids
    );
  }


  const ownerByClaim =
    new Map<
      string,
      number
    >();


  return sections.map(
    (
      section,
      sectionIndex
    ) => {
      const requested =
        [
          ...new Set(
            section
              .requiredClaimIds
              .map(
                (
                  id
                ) =>
                  id.trim()
              )
              .filter(
                Boolean
              )
          ),
        ];


      const requiredClaims:
        string[] =
          [];


      const evidenceIds:
        string[] =
          [];


      for (
        const claimId
        of requested
      ) {
        if (
          !knownClaims.has(
            claimId
          )
        ) {
          throw new Error(
            `SECTION_CLAIM_ASSIGNMENT_UNKNOWN_CLAIM:${claimId}`
          );
        }


        const existingOwner =
          ownerByClaim.get(
            claimId
          );


        if (
          existingOwner !==
            undefined &&
          existingOwner !==
            sectionIndex
        ) {
          throw new Error(
            `SECTION_CLAIM_ASSIGNMENT_DUPLICATE_OWNER:${claimId}`
          );
        }


        ownerByClaim.set(
          claimId,
          sectionIndex
        );


        /*
         * CLAIM_OWNERSHIP_PUBLICATION_AUTHORITY_SPLIT_V1
         *
         * requiredClaims records semantic ownership.
         *
         * evidenceIds records publication authority.
         *
         * These MUST NOT be collapsed into one concept.
         *
         * A required claim with zero verified evidence remains
         * owned by this section, but downstream publication scope
         * must defer the section before Writer execution.
         */
        requiredClaims.push(
          claimId
        );


        const verifiedEvidence =
          verifiedByClaim.get(
            claimId
          ) ??
          [];


        if (
          verifiedEvidence.length >
          0
        ) {
          evidenceIds.push(
            ...verifiedEvidence
          );
        }
      }


      return {
        requiredClaims,

        evidenceIds: [
          ...new Set(
            evidenceIds
          ),
        ],
      };
    }
  );
}
