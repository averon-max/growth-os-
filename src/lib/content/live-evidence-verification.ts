import {
  fetchSinglePage,
} from "../crawler/crawler";

import { findExactSourceSentenceV1 } from "./exact-source-sentence-v1";
import { inspectClaimMaterialQualifiersV1 } from "./claim-material-qualifier-v1";

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
   * EVIDENCE_TOKEN_BOUNDARY_PUNCTUATION_V1
   *
   * Semantic words must not retain sentence punctuation.
   *
   * information. -> information
   * appears.     -> appears
   *
   * Internal decimal punctuation remains intact:
   * 3.5 -> 3.5
   */
  token =
    token.replace(
      /^[^a-z0-9$%]+|[^a-z0-9$%]+$/gu,
      ""
    );


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
   * EVIDENCE_MONITORING_PARAPHRASE_V1
   *
   * "watch", "track", and "monitor" describe the same
   * observation action in evidence statements such as:
   *
   * "credit monitoring watches for changes"
   * "credit monitoring tracks changes"
   *
   * Morphology normalization has already reduced:
   * watches -> watch
   * watching -> watch
   * tracks -> track
   * tracking -> track
   *
   * This preserves the existing coverage threshold,
   * polarity gate, numeric gate, and negative-target gate.
   */
  if (
    token ===
      "watch" ||
    token ===
      "track"
  ) {
    token =
      "monitor";
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

      /*
       * SELF_HEALING_EVIDENCE_ALIASES_V1
       *
       * Small deterministic equivalence classes for
       * common factual paraphrases.
       */
      checking:
        "check",

      reviewing:
        "check",

      review:
        "check",

      check:
        "check",

      constitute:
        "cause",

      create:
        "cause",

      creates:
        "cause",

      trigger:
        "cause",

      cause:
        "cause",

      cover:
        "scope",

      coverage:
        "scope",

      include:
        "scope",

      includ:
        "scope",

      depend:
        "scope",

      differ:
        "scope",

      vary:
        "scope",

      pull:
        "inquiry",

      inquiry:
        "inquiry",

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



/*
 * EVIDENCE_VERIFICATION_CONTEXT_TOKENS_V1
 *
 * Generic wrapper nouns must not dominate factual identity.
 * This does NOT relax:
 * - numeric identity
 * - polarity
 * - negative target preservation
 * - real-page VERIFIED_EXCERPT requirement
 */
const EVIDENCE_VERIFICATION_CONTEXT_TOKENS_V1 =
  new Set([
    "service",
    "consumer",
    "person",
    "user",
    "information",
    "product",
    "option",
  ]);


function evidenceVerificationTokensV1(
  value:
    string
): string[] {
  const semantic =
    semanticTokens(
      value
    );

  const focused =
    semantic.filter(
      (
        token
      ) =>
        !EVIDENCE_VERIFICATION_CONTEXT_TOKENS_V1.has(
          token
        )
    );

  /*
   * Never reduce a short claim below the existing
   * minimum semantic-identity requirement.
   */
  return focused.length >=
    3
    ? focused
    : semantic;
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
    evidenceVerificationTokensV1(
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
        evidenceVerificationTokensV1(
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
     * MATERIAL_SCOPE_AND_ORDER_VERIFICATION_V1
     *
     * The same topic words do not support an unsupported condition
     * ("unexpected", "before deciding", "only"), even when lexical
     * overlap, numeric values, and polarity already match.
     * No model, new sources, or weaker fallback is used here.
     */
    if(!inspectClaimMaterialQualifiersV1({
      claimText,excerpt,
    }).passed)continue;

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

    /*
     * NEGATIVE_CLAIM_LOCAL_POLARITY_V2
     * A negation elsewhere in a long source window
     * must not verify an unrelated negative claim.
     */
    if (claimNegation) {
      const anchors =
        negativeClaimTargetAnchorsV1(claimText);

      const localStatements =
        excerpt.split(
          /(?<=[.!?])(?=\s|[A-Z])/
        );

      const locallySupported =
        localStatements.some((statement) => {
          if (!hasNegation(statement)) {
            return false;
          }

          const tokens = new Set(
            semanticTokens(statement)
              .map(normalizeNegativeTargetTokenV1)
              .filter(Boolean)
          );

          return anchors.every((anchor) =>
            tokens.has(anchor)
          );
        });

      if (!locallySupported) {
        continue;
      }
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
    EvidenceGraphInput,
  maxSources=MAX_EVIDENCE_FETCH_SOURCES
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
      Math.max(1,Math.min(72,Math.floor(maxSources)))
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
  maxQueriesPerClaim = MAX_EVIDENCE_FALLBACK_QUERIES_PER_CLAIM,
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

  maxQueriesPerClaim?: number;
}): Promise<
  EvidenceGraphInput[
    "sources"
  ]
> {
  if (
    !Number.isInteger(maxQueriesPerClaim) ||
    maxQueriesPerClaim < 1 ||
    maxQueriesPerClaim > MAX_EVIDENCE_FALLBACK_QUERIES_PER_CLAIM
  ) {
    throw new Error("EVIDENCE_FALLBACK_QUERY_LIMIT_INVALID");
  }

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
    /*
     * DEFINITION_EVIDENCE_QUERY_V1
     *
     * Claims shaped as:
     *
     *   X is a/an/the ...
     *
     * are definition jobs.
     *
     * Search those with the natural definition query BEFORE the
     * existing lexical fallbacks. This keeps retrieval generic and
     * avoids hard-coding industries, publishers or domains.
     *
     * Evidence authority does not change: discovered URLs must still
     * pass fetch + deterministic claim-specific VERIFIED_EXCERPT
     * verification before they can support the claim.
     */
    const definitionMatch =
      claim.text
        .trim()
        .match(
          /^(.+?)\s+is\s+(?:a|an|the)\s+/i
        );


    const definitionSubject =
      definitionMatch?.[1]
        ?.trim()
        .toLocaleLowerCase(
          "en-US"
        ) ??
      "";


    const definitionQueries =
      definitionSubject
        ? [
            `what is ${definitionSubject}`,
            `${definitionSubject} definition`,
          ]
        : [];


    const queries =
      Array.from(
        new Set([
          ...definitionQueries,

          ...buildClaimEvidenceFallbackQueriesV1({
            primaryQuery,

            claimText:
              claim.text,
          }),
        ])
      ).slice(0, maxQueriesPerClaim);


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
          10
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


/*
 * EVIDENCE_GROUNDED_CLAIM_RECONCILIATION_V1
 *
 * IMPORTANT:
 * These excerpts are NOT VERIFIED_EXCERPT authority.
 *
 * They are real-page recovery candidates used only to help
 * conservatively restate an unresolved canonical claim.
 *
 * A reconciled claim is accepted ONLY if it subsequently passes
 * the normal findVerifiedExcerptCandidateV1 -> VERIFIED_EXCERPT
 * pipeline without lower thresholds.
 */

export interface EvidenceClaimRecoveryCandidateV1 {
  readonly provenance?:"SECTION_FIRST_GOVERNMENT_PROCEDURE";
  readonly claimId:
    string;

  readonly sourceId:
    string;

  readonly sourceUrl:
    string;

  readonly excerpt:
    string;

  readonly coverage:
    number;
}


function sameStringSetV1(
  left:
    readonly string[],
  right:
    readonly string[]
): boolean {
  const a =
    [
      ...new Set(
        left
      ),
    ].sort();

  const b =
    [
      ...new Set(
        right
      ),
    ].sort();

  return (
    a.length ===
      b.length &&
    a.every(
      (
        value,
        index
      ) =>
        value ===
        b[index]
    )
  );
}


function lexicalRecoveryCoverageV1({
  claimText,
  excerpt,
}: {
  claimText:
    string;

  excerpt:
    string;
}): number {
  const claimTokens =
    evidenceVerificationTokensV1(
      claimText
    );

  if (
    claimTokens.length ===
    0
  ) {
    return 0;
  }

  const excerptTokens =
    new Set(
      evidenceVerificationTokensV1(
        excerpt
      )
    );

  const shared =
    claimTokens.filter(
      (
        token
      ) =>
        excerptTokens.has(
          token
        )
    ).length;

  return (
    shared /
    claimTokens.length
  );
}



/*
 * COMPOUND_NEGATIVE_CLAIM_NARROWING_V1
 *
 * Stage-plan models are instructed to emit atomic claims, but a
 * bounded recovery still has to defend against an occasional compound
 * negative claim such as:
 *
 *   "X does not resolve A or B."
 *
 * A conservative reconciliation is allowed to narrow that claim to
 * one ORIGINAL negative target:
 *
 *   "X does not resolve A."
 *
 * This helper is ONLY a reconciliation-safety exception.
 *
 * It does NOT create VERIFIED_EXCERPT evidence.
 * It does NOT change findVerifiedExcerptCandidateV1().
 * It does NOT lower lexical evidence thresholds.
 *
 * The candidate must still pass the normal strict
 * enrichLiveEvidenceGraphV1() verification before it can become
 * publication authority.
 */
export function isSafeCompoundNegativeClaimNarrowingV1(
  input:
    Readonly<Record<string, unknown>>
): boolean {
  const entries =
    Object.entries(
      input
    );


  const explicitOriginal =
    [
      "originalText",
      "originalClaimText",
      "claimText",
    ]
      .map(
        (key) =>
          input[key]
      )
      .find(
        (value):
          value is string =>
            typeof value ===
              "string"
      );


  const explicitCandidate =
    [
      "candidateText",
      "candidateClaimText",
      "proposedText",
      "reconciledText",
    ]
      .map(
        (key) =>
          input[key]
      )
      .find(
        (value):
          value is string =>
            typeof value ===
              "string"
      );


  const stringEntries =
    entries.filter(
      (
        entry
      ): entry is [
        string,
        string,
      ] =>
        typeof entry[1] ===
          "string"
    );


  const originalText =
    explicitOriginal ??
    stringEntries.find(
      ([key]) =>
        /original|claim/i.test(
          key
        ) &&
        !/candidate|proposed|reconciled/i.test(
          key
        )
    )?.[1] ??
    null;


  const candidateText =
    explicitCandidate ??
    stringEntries.find(
      ([key]) =>
        /candidate|proposed|reconciled/i.test(
          key
        )
    )?.[1] ??
    null;


  if (
    !originalText ||
    !candidateText
  ) {
    return false;
  }


  const original =
    originalText.trim();

  const candidate =
    candidateText.trim();


  if (
    !original ||
    !candidate ||
    candidate.length >
      500 ||
    candidate ===
      original
  ) {
    return false;
  }


  /*
   * This recovery is deliberately limited to OR-coordinated
   * negative targets. "not A and B" can be scope-ambiguous and is
   * therefore not eligible for this deterministic exception.
   */
  const originalNegation =
    NEGATIVE_CLAIM_PATTERN_V1.exec(
      original
    );


  const candidateNegation =
    NEGATIVE_CLAIM_PATTERN_V1.exec(
      candidate
    );


  if (
    !originalNegation ||
    originalNegation.index ===
      undefined ||
    !candidateNegation ||
    candidateNegation.index ===
      undefined ||
    hasNegation(
      original
    ) !==
      hasNegation(
        candidate
      )
  ) {
    return false;
  }


  const originalTail =
    original.slice(
      originalNegation.index +
        originalNegation[0].length
    );


  if (
    !/\bor\b/i.test(
      originalTail
    )
  ) {
    return false;
  }


  /*
   * Preserve every numeric condition exactly.
   */
  const originalNumbers =
    [
      ...new Set(
        numericTokens(
          original
        )
      ),
    ].sort();


  const candidateNumbers =
    [
      ...new Set(
        numericTokens(
          candidate
        )
      ),
    ].sort();


  if (
    originalNumbers.length !==
      candidateNumbers.length ||
    originalNumbers.some(
      (
        value,
        index
      ) =>
        value !==
        candidateNumbers[
          index
        ]
    )
  ) {
    return false;
  }


  /*
   * Preserve substantial semantic identity.
   * This is candidate-safety only; it is NOT evidence verification.
   */
  const originalTokens =
    evidenceVerificationTokensV1(
      original
    );


  const candidateTokens =
    evidenceVerificationTokensV1(
      candidate
    );


  if (
    originalTokens.length <
      3 ||
    candidateTokens.length <
      3 ||
    candidateTokens.length >
      originalTokens.length +
        4
  ) {
    return false;
  }


  const originalTokenSet =
    new Set(
      originalTokens
    );


  const shared =
    candidateTokens.filter(
      (token) =>
        originalTokenSet.has(
          token
        )
    ).length;


  if (
    shared <
      Math.min(
        3,
        originalTokens.length
      ) ||
    shared /
      candidateTokens.length <
      0.5
  ) {
    return false;
  }


  const anchorsForBranch =
    ({
      fullText,
      branch,
      negationIndex,
    }: {
      fullText:
        string;

      branch:
        string;

      negationIndex:
        number;
    }): readonly string[] => {
      const prefixTokens =
        new Set(
          semanticTokens(
            fullText.slice(
              0,
              negationIndex
            )
          )
            .map(
              (token) =>
                normalizeNegativeTargetTokenV1(
                  token
                )
            )
            .filter(
              Boolean
            )
        );


      const anchors =
        semanticTokens(
          branch
        )
          .map(
            (token) =>
              normalizeNegativeTargetTokenV1(
                token
              )
          )
          .filter(
            (token) =>
              Boolean(
                token
              ) &&
              !NEGATIVE_CLAIM_NON_TARGET_TOKENS_V1.has(
                token
              ) &&
              !prefixTokens.has(
                token
              )
          );


      return anchors.slice(
        -2
      );
    };


  const originalBranches =
    originalTail
      .split(
        /\bor\b/i
      )
      .map(
        (branch) =>
          branch.trim()
      )
      .filter(
        Boolean
      )
      .map(
        (branch) =>
          anchorsForBranch({
            fullText:
              original,

            branch,

            negationIndex:
              originalNegation.index!,
          })
      )
      .filter(
        (anchors) =>
          anchors.length >
            0
      );


  const candidateTail =
    candidate.slice(
      candidateNegation.index +
        candidateNegation[0].length
    );


  /*
   * A narrowing candidate should describe one negative target.
   * A newly compound candidate is not a narrowing.
   */
  if (
    /\bor\b/i.test(
      candidateTail
    )
  ) {
    return false;
  }


  const candidateAnchors =
    anchorsForBranch({
      fullText:
        candidate,

      branch:
        candidateTail,

      negationIndex:
        candidateNegation.index!,
    });


  if (
    candidateAnchors.length ===
      0
  ) {
    return false;
  }


  /*
   * The new target must be wholly contained in one original target
   * branch. No target substitution is allowed.
   */
  return originalBranches.some(
    (
      originalAnchors
    ) =>
      candidateAnchors.every(
        (anchor) =>
          originalAnchors.includes(
            anchor
          )
      )
  );
}


export function isSafeClaimReconciliationCandidateV1({
  originalText,
  candidateText,
}: {
  originalText:
    string;

  candidateText:
    string;
}): boolean {
  const original =
    originalText.trim();

  const candidate =
    candidateText.trim();

  if (
    !original ||
    !candidate ||
    candidate.length >
      500
  ) {
    return false;
  }

  /*
   * Polarity is immutable during this recovery.
   *
   * A negative claim cannot silently become positive, or vice versa.
   */
  if (
    hasNegation(
      original
    ) !==
    hasNegation(
      candidate
    )
  ) {
    return false;
  }

  /*
   * Numeric identity is immutable.
   *
   * Reconciliation cannot add, remove, or alter a number.
   */
  if (
    !sameStringSetV1(
      numericTokens(
        original
      ),
      numericTokens(
        candidate
      )
    )
  ) {
    return false;
  }

  const originalTokens =
    evidenceVerificationTokensV1(
      original
    );

  const candidateTokens =
    evidenceVerificationTokensV1(
      candidate
    );

  if (
    originalTokens.length ===
      0 ||
    candidateTokens.length ===
      0
  ) {
    return false;
  }

  const originalTokenSet =
    new Set(
      originalTokens
    );

  const shared =
    candidateTokens.filter(
      (
        token
      ) =>
        originalTokenSet.has(
          token
        )
    ).length;

  /*
   * Claim recovery may narrow or conservatively paraphrase.
   * It may not jump to an unrelated proposition.
   */
  if (
    shared <
      Math.min(
        3,
        originalTokens.length
      )
  ) {
    return false;
  }

  if (
    shared /
      candidateTokens.length <
    0.5
  ) {
    return false;
  }

  /*
   * Do not permit a "narrowing" that materially expands
   * semantic surface area.
   */
  if (
    candidateTokens.length >
      originalTokens.length +
        4
  ) {
    return false;
  }

  /*
   * For negative claims preserve the denied material target.
   *
   * Example:
   *   does not create a hard inquiry
   *
   * must not become:
   *   does not change account information
   */
  const negativeTargets =
    negativeClaimTargetAnchorsV1(
      original
    );

  if (
    negativeTargets.length >
    0
  ) {
    const candidateTokenSet =
      new Set(
        candidateTokens
      );

    if (
      !negativeTargets.every(
        (
          token
        ) =>
          candidateTokenSet.has(
            token
          )
      )
    ) {
      return false;
    }
  }

  return true;
}


export function rankEvidenceRecoveryExcerptsV1({
  claimText,
  bodyText,
  maxCandidates = 3,
}: {
  claimText:
    string;

  bodyText:
    string;

  maxCandidates?:
    number;
}): readonly Readonly<{
  excerpt:
    string;

  coverage:
    number;
}>[] {
  const claimNumeric =
    numericTokens(
      claimText
    );

  const claimNegated =
    hasNegation(
      claimText
    );

  const negativeTargets =
    negativeClaimTargetAnchorsV1(
      claimText
    );

  const candidates =
    sentenceWindows(
      bodyText
    )
      .map(
        (
          excerpt
        ) => {
          const coverage =
            lexicalRecoveryCoverageV1({
              claimText,
              excerpt,
            });

          return {
            excerpt,
            coverage,
          };
        }
      )
      .filter(
        (
          candidate
        ) => {
          /*
           * This is only discovery for a possible conservative
           * restatement, so 0.35 is NOT a verification threshold.
           *
           * Final verification still uses the unchanged strict
           * VERIFIED_EXCERPT matcher.
           */
          if (
            candidate.coverage <
            0.35
          ) {
            return false;
          }

          if (
            claimNegated !==
            hasNegation(
              candidate.excerpt
            )
          ) {
            return false;
          }

          if (
            !claimNumeric.every(
              (
                token
              ) =>
                numericTokens(
                  candidate.excerpt
                ).includes(
                  token
                )
            )
          ) {
            return false;
          }

          if (
            negativeTargets.length >
            0
          ) {
            const excerptTokens =
              new Set(
                evidenceVerificationTokensV1(
                  candidate.excerpt
                )
              );

            /*
             * Candidate discovery needs at least one target anchor.
             * Final strict verification still decides authority.
             */
            if (
              !negativeTargets.some(
                (
                  token
                ) =>
                  excerptTokens.has(
                    token
                  )
              )
            ) {
              return false;
            }
          }

          return true;
        }
      )
      .sort(
        (
          a,
          b
        ) =>
          b.coverage -
          a.coverage
      );

  const unique:
    {
      excerpt:
        string;

      coverage:
        number;
    }[] =
      [];

  const seen =
    new Set<
      string
    >();

  for (
    const candidate
    of candidates
  ) {
    const key =
      normalize(
        candidate.excerpt
      );

    if (
      !key ||
      seen.has(
        key
      )
    ) {
      continue;
    }

    seen.add(
      key
    );

    unique.push(
      candidate
    );

    if (
      unique.length >=
      Math.max(
        1,
        Math.min(
          5,
          maxCandidates
        )
      )
    ) {
      break;
    }
  }

  return unique;
}


/**
 * SOURCE-FIRST PROCEDURAL FACT CANDIDATES
 *
 * For a practical "what should I do / how to" section, discover
 * literal, actionable sentences on explicitly seeded government
 * pages independently of speculative LLM claim wording.
 * This creates CANDIDATES only. Existing live re-fetch, strict
 * lexical validation and semantic entailment still own authority.
 */
export function rankOfficialProceduralFactSentencesV1({
  heading,mission,bodyText,maxCandidates=5,
}:{
  heading:string;mission:string;bodyText:string;maxCandidates?:number;
}):readonly Readonly<{excerpt:string;coverage:number;score:number}>[]{
  if(!/\b(?:what (?:should|do|can)|how (?:to|do|can)|steps? to)\b/i
    .test(heading))return [];
  const topic=new Set(semanticTokens(heading+" "+mission).filter(
    t=>!new Set(["what","should","after","before","how","when","step",
      "do","does","action","take","first","next"]).has(t)));
  if(topic.size===0)return [];
  const action=/\b(?:contact|dispute|review|check|report|verify|request|file|correct|investigate|compare|send|call|notify|provide|submit|look for)\b/i;
  const reader=/\b(?:you|your|should|must|if you|to (?:dispute|report|contact|check|review|file|request))\b/i;
  const ranked=sentenceWindows(bodyText)
    .filter(sentence=>sentence.length>=65&&sentence.length<=320&&
      /[.!?]$/.test(sentence)&&
      sentence.split(/(?<=[.!?])\s+/).length===1&&
      action.test(sentence)&&reader.test(sentence))
    .map(excerpt=>{
      const shared=semanticTokens(excerpt)
        .filter(t=>topic.has(t)).length;
      const actionMatches=excerpt.match(new RegExp(action.source,"gi"))??[];
      return {
        excerpt,score:shared*5+Math.min(3,actionMatches.length),
        coverage:Math.min(0.95,0.35+shared*0.11),
        shared,
      };
    })
    .filter(item=>item.shared>=1)
    .sort((a,b)=>b.score-a.score||
      a.excerpt.length-b.excerpt.length);
  const result:Readonly<{excerpt:string;coverage:number;score:number}>[]=[];
  const seen=new Set<string>();
  for(const item of ranked){
    const key=normalize(item.excerpt);
    if(!key||seen.has(key))continue;
    seen.add(key);
    result.push({excerpt:item.excerpt,coverage:item.coverage,score:item.score});
    if(result.length>=Math.max(1,Math.min(8,maxCandidates)))break;
  }
  return result;
}

export async function collectOfficialSectionProcedureCandidatesV1({
  graph,sections,claims,governmentSourceIds,
}:{
  graph:EvidenceGraphInput;
  sections:readonly Readonly<{id:string;heading:string;mission:string}>[];
  claims:readonly MinimalClaim[];
  governmentSourceIds:readonly string[];
}):Promise<readonly EvidenceClaimRecoveryCandidateV1[]>{
  if(sections.length===0||governmentSourceIds.length===0)return [];
  const governmentIds=new Set(governmentSourceIds);
  const government=graph.sources.filter(source=>
    governmentIds.has(source.id)&&
    source.sourceType==="PRIMARY_GOVERNMENT"&&
    source.authorityTier==="A").slice(0,6);
  if(government.length===0)return [];
  const bodies=await fetchSourceBodies({
    sources:government,claimEvidence:[],
  },6);
  const result:EvidenceClaimRecoveryCandidateV1[]=[];
  for(const section of sections){
    const owned=claims.filter(c=>c.id&&
      c.id.startsWith("research-"+section.id+"-"));
    if(owned.length===0)continue;
    const ranked=government.flatMap(source=>{
      const body=bodies.get(source.id);
      if(!body)return [];
      return rankOfficialProceduralFactSentencesV1({
        heading:section.heading,mission:section.mission,bodyText:body,
        maxCandidates:6,
      }).map(candidate=>({...candidate,source}));
    }).sort((a,b)=>b.score-a.score||
      a.source.url.localeCompare(b.source.url));
    const usedHosts=new Set<string>(),usedTexts=new Set<string>();
    const available=[...owned],count=Math.min(2,owned.length);
    for(const entry of ranked){
      const host=new URL(entry.source.url).hostname;
      const sentence=normalize(entry.excerpt);
      if(usedHosts.has(host)||usedTexts.has(sentence))continue;
      // Match a different EXISTING claim ID to each literal source
      // fact. The claim wording is a hypothesis and is replaced
      // only by a separately strictly-verified restatement.
      const eligible=available
        .map(c=>({c,score:lexicalRecoveryCoverageV1({
          claimText:c.text,excerpt:entry.excerpt,
        })}))
        .sort((a,b)=>b.score-a.score||
          a.c.id.localeCompare(b.c.id));
      const assigned=eligible[0]?.c;
      if(!assigned)break;
      result.push({
        claimId:assigned.id,sourceId:entry.source.id,
        sourceUrl:entry.source.url,excerpt:entry.excerpt,
        coverage:entry.coverage,
        provenance:"SECTION_FIRST_GOVERNMENT_PROCEDURE",
      });
      available.splice(available.findIndex(c=>c.id===assigned.id),1);
      usedHosts.add(host);usedTexts.add(sentence);
      if(usedHosts.size>=count)break;
    }
  }
  return result;
}

/**
 * Secondary official procedure sentences for one post-semantic rescue.
 * A previous speculative claim can be rejected even though another
 * actionable sentence exists in the SAME government page. We return
 * LITERAL sentences only (never evidence authority); the caller must
 * re-fetch and re-check before allowing the Writer to use them.
 */
export interface OfficialPostSemanticProcedureAlternativeV1{
  readonly sectionId:string;
  readonly sourceId:string;
  readonly sourceUrl:string;
  readonly text:string;
}
export async function collectOfficialPostSemanticProcedureAlternativesV1({
  graph,sections,governmentSourceIds,
}:{
  graph:EvidenceGraphInput;
  sections:readonly Readonly<{id:string;heading:string;mission:string}>[];
  governmentSourceIds:readonly string[];
}):Promise<readonly OfficialPostSemanticProcedureAlternativeV1[]>{
  if(sections.length===0||governmentSourceIds.length===0)return [];
  const allowed=new Set(governmentSourceIds);
  const government=graph.sources.filter(source=>
    allowed.has(source.id)&&source.sourceType==="PRIMARY_GOVERNMENT"&&
    source.authorityTier==="A").slice(0,6);
  if(government.length===0)return [];
  const bodies=await fetchSourceBodies({
    sources:government,claimEvidence:[],
  },6);
  const result:OfficialPostSemanticProcedureAlternativeV1[]=[];
  for(const section of sections){
    const ranked=government.flatMap(source=>{
      const body=bodies.get(source.id);
      if(!body)return [];
      return rankOfficialProceduralFactSentencesV1({
        heading:section.heading,mission:section.mission,
        bodyText:body,maxCandidates:8,
      }).map(sentence=>({...sentence,source}));
    }).sort((a,b)=>b.score-a.score||
      a.source.url.localeCompare(b.source.url));
    const seen=new Set<string>();
    for(const item of ranked){
      const key=normalize(item.excerpt);
      if(!key||seen.has(key))continue;
      seen.add(key);
      result.push({
        sectionId:section.id,sourceId:item.source.id,
        sourceUrl:item.source.url,text:item.excerpt,
      });
      // At most eight existing-source suggestions PER section.
      if(seen.size>=8)break;
    }
  }
  return result;
}

/**
 * Comparison sections can fail semantic review even when the fetched
 * page contains OTHER, narrower facts about price, features, or alert
 * differences. Look only at a bounded set of the same rejected-claim
 * source pages and return complete source sentences, NOT authority.
 *
 * This does not use SERP search, AI, or new source URLs. The caller
 * must re-fetch and semantically review every proposed replacement.
 */
export interface PostSemanticComparisonAlternativeV1 {
  readonly sectionId:string;
  readonly sourceId:string;
  readonly sourceUrl:string;
  readonly text:string;
}
/**
 * Shared with post-semantic claim selection. A "what should you look
 * for in ..." service-scope question is a comparison, NOT an action
 * plan to fix a credit file.
 */
export function isServiceChoiceSectionV1(heading:string):boolean{
  return /\b(?:how\s+(?:(?:to|do\s+you|should\s+you)\s+)?(?:choose|compare|select)|what\s+(?:(?:should|can|do)\s+you\s+)?(?:look\s+for|compare|consider)|which\s+(?:features?|factors?)\s+(?:should|do)\s+you\s+(?:compare|consider))\b/i
    .test(heading);
}
/**
 * Selection information must describe a concrete service dimension,
 * not merely restate the definition of monitoring or number of bureaus.
 * This selects source candidates only, never fact authority.
 */
export function isServiceChoiceSourceFactV1(sentence:string):boolean{
  if(!/\b(?:credit|monitoring|service|services|report|reports)\b/i.test(sentence))
    return false;
  const costOrFeatures=/\b(?:costs?|prices?|fees?|free|paid|premium|features?|subscriptions?|plans?)\b/i;
  const alertTypes=/\b(?:alerts?|notifications?|notifies|notify)\b/i.test(sentence)&&
    /\b(?:changes?|accounts?|inquir(?:y|ies)|activities?|events?|reports?|fraud|identity|suspicious)\b/i.test(sentence);
  const scopeDifference=/\b(?:includes?|covers?|tracks?|monitors?|detects?|checks?|does not cover|does not include)\b/i.test(sentence)&&
    /\b(?:inquir(?:y|ies)|new accounts?|identity|fraud|changes? to|types? of|account activity)\b/i.test(sentence);
  return costOrFeatures.test(sentence)||alertTypes||scopeDifference;
}
export function rankCreditMonitoringComparisonSentencesV1({
  heading,mission,bodyText,
}:{
  heading:string;mission:string;bodyText:string;
}):readonly string[]{
  if(!isServiceChoiceSectionV1(heading))return [];
  const topic=new Set(semanticTokens(heading+" "+mission));
  const comparison=/\b(?:costs?|prices?|fees?|free|paid|premium|features?|alerts?|plans?|subscription|coverage|notifications?)\b/i;
  const subject=/\b(?:credit|monitoring|services?|reports?|bureaus?)\b/i;
  const ranked=sentenceWindows(bodyText)
    .filter(s=>s.length>=65&&s.length<=320&&
      /[.!]$/.test(s)&&!s.includes("?")&&
      s.split(/(?<=[.!?])\s+/).length===1&&
      comparison.test(s)&&subject.test(s)&&
      isServiceChoiceSourceFactV1(s))
    .map(text=>({
      text,shared:semanticTokens(text).filter(t=>topic.has(t)).length,
      specific:/\b(?:cost|price|fee|free|paid|premium|subscription|feature|alerts?|notifications?|accounts?|inquir(?:y|ies))\b/i.test(text),
    }))
    .filter(x=>x.shared>=1&&x.specific)
    .sort((a,b)=>b.shared-a.shared||a.text.length-b.text.length);
  const seen=new Set<string>(),out:string[]=[];
  for(const x of ranked){
    const key=normalize(x.text);
    if(!key||seen.has(key))continue;
    seen.add(key);out.push(x.text);
    if(out.length>=6)break;
  }
  return out;
}
export async function collectPostSemanticComparisonAlternativesV1({
  graph,sections,demotedEvidenceIds,targetClaimIds,
}:{
  graph:EvidenceGraphInput;
  sections:readonly Readonly<{id:string;heading:string;mission:string}>[];
  demotedEvidenceIds:readonly string[];
  targetClaimIds:readonly string[];
}):Promise<readonly PostSemanticComparisonAlternativeV1[]>{
  const demoted=new Set(demotedEvidenceIds);
  const target=new Set(targetClaimIds);
  const trusted=new Map(graph.sources.filter(s=>
    ["A","B","C"].includes(s.authorityTier)&&
    ["PRIMARY_GOVERNMENT","PRIMARY_OFFICIAL","REPUTABLE_SECONDARY",
      "ACADEMIC"].includes(s.sourceType)).map(s=>[s.id,s] as const));
  const selected=graph.claimEvidence.filter(e=>
    demoted.has(e.id)&&target.has(e.claimId)&&
    trusted.has(e.sourceId)&&e.kind==="VERIFIED_EXCERPT"&&e.relation==="SUPPORTS");
  const unique=new Set<string>(),sources:EvidenceGraphInput["sources"][number][]=[];
  for(const e of selected){
    if(unique.has(e.sourceId))continue;
    const s=trusted.get(e.sourceId);
    if(!s)continue;
    unique.add(e.sourceId);sources.push(s);
    if(sources.length>=6)break;
  }
  if(!sources.length)return [];
  const bodies=await fetchSourceBodies({
    sources,claimEvidence:[],
  },6);
  const out:PostSemanticComparisonAlternativeV1[]=[];
  for(const section of sections){
    for(const source of sources){
      const body=bodies.get(source.id);
      if(!body)continue;
      for(const text of rankCreditMonitoringComparisonSentencesV1({
        heading:section.heading,mission:section.mission,bodyText:body,
      })){
        out.push({sectionId:section.id,sourceId:source.id,
          sourceUrl:source.url,text});
        if(out.filter(x=>x.sectionId===section.id).length>=12)break;
      }
      if(out.filter(x=>x.sectionId===section.id).length>=12)break;
    }
  }
  return out;
}

export async function collectEvidenceClaimRecoveryCandidatesV1({
  graph,
  claims,
  maxPerClaim = 3,
  maxSources = MAX_EVIDENCE_FETCH_SOURCES,
}: {
  graph:
    EvidenceGraphInput;

  claims:
    readonly MinimalClaim[];

  maxPerClaim?:
    number;
  maxSources?:number;
}): Promise<
  readonly Readonly<
    EvidenceClaimRecoveryCandidateV1
  >[]
> {
  const bodies =
    await fetchSourceBodies(
      graph,maxSources
    );

  const output:
    EvidenceClaimRecoveryCandidateV1[] =
      [];

  for (
    const claim
    of claims
  ) {
    const ranked:
      EvidenceClaimRecoveryCandidateV1[] =
        [];

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

      const candidates =
        rankEvidenceRecoveryExcerptsV1({
          claimText:
            claim.text,

          bodyText,

          maxCandidates:
            maxPerClaim,
        });

      for (
        const candidate
        of candidates
      ) {
        ranked.push({
          claimId:
            claim.id,

          sourceId:
            source.id,

          sourceUrl:
            source.url,

          excerpt:
            candidate.excerpt,

          coverage:
            candidate.coverage,
        });
      }
    }

    ranked.sort(
      (
        a,
        b
      ) =>
        b.coverage -
        a.coverage
    );

    const seenExcerpt =
      new Set<
        string
      >();

    let count =
      0;

    for (
      const candidate
      of ranked
    ) {
      const key =
        normalize(
          candidate.excerpt
        );

      if (
        !key ||
        seenExcerpt.has(
          key
        )
      ) {
        continue;
      }

      seenExcerpt.add(
        key
      );

      output.push(
        candidate
      );

      count +=
        1;

      if (
        count >=
        Math.max(
          1,
          Math.min(
            5,
            maxPerClaim
          )
        )
      ) {
        break;
      }
    }
  }

  return output;
}


/*
 * Preserve more than one independently fetched, deterministically
 * verified source per factual claim. The previous single-winner
 * selection discarded all but one valid excerpt even when real
 * independent sources were present.
 *
 * This ranks existing VERIFIED candidates; it does not alter the
 * strict numeric, negation or lexical evidence verifier.
 */
function evidenceHostV1(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

export function selectVerifiedClaimSourcesV1({
  claimText,
  sources,
  bodies,
  maxSources = 3,
}: {
  claimText: string;
  sources: readonly Readonly<{ id: string; url: string }>[];
  bodies: ReadonlyMap<string, string>;
  maxSources?: number;
}): readonly Readonly<{
  sourceId: string;
  sourceHost: string;
  excerpt: string;
  coverage: number;
}>[] {
  const candidates: {
    sourceId: string;
    sourceHost: string;
    excerpt: string;
    coverage: number;
  }[] = [];

  for (const source of sources) {
    const bodyText = bodies.get(source.id);
    const sourceHost = evidenceHostV1(source.url);
    if (!bodyText || !sourceHost) continue;

    // Prefer a short verbatim sentence when the source contains the
    // literal claim. The exact candidate MUST pass the same strict
    // lexical, polarity, numeric and negative-target verifier.
    const exactSentence = findExactSourceSentenceV1({
      claimText,
      bodyText,
    });
    const exactVerified = exactSentence
      ? findVerifiedExcerptCandidateV1({
          claimText,
          bodyText: exactSentence,
        })
      : null;
    const candidate = exactVerified ?? findVerifiedExcerptCandidateV1({
      claimText,
      bodyText,
    });
    if (!candidate) continue;

    candidates.push({
      sourceId: source.id,
      sourceHost,
      excerpt: candidate.excerpt,
      coverage: candidate.coverage,
    });
  }

  candidates.sort((left, right) =>
    right.coverage - left.coverage ||
    left.sourceId.localeCompare(right.sourceId)
  );

  const selected: typeof candidates = [];
  const seenHosts = new Set<string>();
  const limit = Math.max(1, Math.min(3, Math.floor(maxSources) || 1));

  for (const candidate of candidates) {
    if (seenHosts.has(candidate.sourceHost)) continue;
    selected.push(candidate);
    seenHosts.add(candidate.sourceHost);
    if (selected.length >= limit) break;
  }

  return selected;
}

export async function enrichLiveEvidenceGraphV1({
  graph,
  claims,
  maxSources=MAX_EVIDENCE_FETCH_SOURCES,
}: {
  graph:
    EvidenceGraphInput;

  claims:
    readonly MinimalClaim[];
  maxSources?:number;
}): Promise<EvidenceGraphInput> {
  const bodies =
    await fetchSourceBodies(
      graph,maxSources
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


  for (const claim of claims) {
    const priorVerifiedHosts = new Set(
      verified
        .filter(
          (item) =>
            item.claimId === claim.id &&
            item.kind === "VERIFIED_EXCERPT" &&
            item.relation === "SUPPORTS" &&
            Boolean(item.excerpt?.trim())
        )
        .map((item) => {
          const source = graph.sources.find(
            (candidate) => candidate.id === item.sourceId
          );
          return source ? evidenceHostV1(source.url) : null;
        })
        .filter((host): host is string => Boolean(host))
    );

    if (priorVerifiedHosts.size >= 3) continue;

    const candidates = selectVerifiedClaimSourcesV1({
      claimText: claim.text,
      sources: graph.sources,
      bodies,
      maxSources: 3,
    });

    for (const candidate of candidates) {
      if (priorVerifiedHosts.has(candidate.sourceHost)) continue;

      const id = `verified-excerpt-${stableHash(
        [claim.id, candidate.sourceId, candidate.excerpt].join("\u0000")
      )}`;

      if (existingIds.has(id)) continue;

      existingIds.add(id);
      priorVerifiedHosts.add(candidate.sourceHost);
      verified.push({
        id,
        claimId: claim.id,
        sourceId: candidate.sourceId,
        relation: "SUPPORTS",
        kind: "VERIFIED_EXCERPT",
        excerpt: candidate.excerpt,
      });

      if (priorVerifiedHosts.size >= 3) break;
    }
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
