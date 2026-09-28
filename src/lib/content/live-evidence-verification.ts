import {
  fetchSinglePage,
} from "../crawler/crawler";

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
  16;


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
    .replace(
      /\s+/g,
      " "
    )
    .trim();
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
          token.trim()
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
         * Critical boundary:
         *
         * Planner intent alone cannot authorize publication.
         * Only claims with real SUPPORTS + VERIFIED_EXCERPT
         * become required writer claims.
         */
        const verifiedEvidence =
          verifiedByClaim.get(
            claimId
          ) ??
          [];


        if (
          verifiedEvidence.length ===
          0
        ) {
          continue;
        }


        requiredClaims.push(
          claimId
        );


        evidenceIds.push(
          ...verifiedEvidence
        );
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
