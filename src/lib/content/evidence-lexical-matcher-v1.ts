/**
 * Deterministic lexical claim-to-source matching, preserved from
 * live-evidence-verification.ts. Evidence support gates remain strict:
 * numeric values, polarity, negative target, material qualifiers.
 */
import { inspectClaimMaterialQualifiersV1 } from "./claim-material-qualifier-v1";

export interface VerifiedExcerptCandidateV1 {
  excerpt: string;
  coverage: number;
}

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

export {
  normalize,
  semanticTokens,
  evidenceVerificationTokensV1,
  numericTokens,
  hasNegation,
  sentenceWindows,
  NEGATIVE_CLAIM_PATTERN_V1,
  normalizeNegativeTargetTokenV1,
};
