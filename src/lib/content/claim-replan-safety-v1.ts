
/*
 * CLAIM_REPLAN_SAFETY_V2
 *
 * This helper is ONLY a drift-prevention boundary.
 *
 * It does NOT grant evidence authority.
 *
 * A candidate that passes here must STILL pass the unchanged
 * enrichLiveEvidenceGraphV1() verifier and receive:
 *
 * VERIFIED_EXCERPT + SUPPORTS
 *
 * before production can use the rewritten claim.
 */


const STOP_TOKENS_V2 =
  new Set<string>([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "can",
    "could",
    "do",
    "does",
    "for",
    "from",
    "how",
    "in",
    "into",
    "is",
    "it",
    "its",
    "may",
    "of",
    "on",
    "or",
    "that",
    "the",
    "their",
    "this",
    "to",
    "what",
    "when",
    "which",
    "who",
    "why",
    "will",
    "with",
    "would",
  ]);


function canonicalTokenV2(
  value:
    string
): string {
  let token =
    value
      .toLowerCase()
      .replace(
        /^'+|'+$/g,
        ""
      );


  /*
   * Tiny deterministic morphology normalization.
   *
   * This exists specifically so semantic ownership does not
   * distinguish harmless forms such as:
   *
   * monitor / monitoring
   * service / services
   * report / reports
   * change / changes
   *
   * It is not fuzzy semantic matching.
   */
  if (
    token.endsWith(
      "ing"
    ) &&
    token.length >
      5
  ) {
    token =
      token.slice(
        0,
        -3
      );
  }


  if (
    token.endsWith(
      "ed"
    ) &&
    token.length >
      5
  ) {
    token =
      token.slice(
        0,
        -2
      );
  }


  if (
    token.endsWith(
      "s"
    ) &&
    !token.endsWith(
      "ss"
    ) &&
    token.length >
      4
  ) {
    token =
      token.slice(
        0,
        -1
      );
  }


  /*
   * SEMANTIC_RELATION_NORMALIZATION_V3
   *
   * Generic relation families used ONLY by the deterministic
   * mission-preservation drift check.
   *
   * This does not grant evidence authority.
   *
   * Examples:
   *
   * affect / impact / hurt / lower / change / control
   * all describe an EFFECT relation.
   *
   * track / watch / observe
   * all describe a MONITOR relation.
   *
   * notify / alert
   * describe the same notification relation.
   *
   * prevent / stop
   * describe the same prevention relation.
   */
  const relationAliases:
    Readonly<Record<string, string>> = {
      affect:
        "effect",

      effect:
        "effect",

      impact:
        "effect",

      hurt:
        "effect",

      lower:
        "effect",

      raise:
        "effect",

      alter:
        "effect",

      change:
        "effect",

      control:
        "effect",

      influence:
        "effect",

      track:
        "monitor",

      watch:
        "monitor",

      observe:
        "monitor",

      monitor:
        "monitor",

      notify:
        "alert",

      notification:
        "alert",

      alert:
        "alert",

      prevent:
        "prevent",

      stop:
        "prevent",

      prohibit:
        "prevent",
    };


  return (
    relationAliases[
      token
    ] ??
    token
  );
}


function semanticTokensV2(
  value:
    string
): Set<string> {
  return new Set(
    value
      .toLowerCase()

      /*
       * Split punctuation and hyphenated semantic units.
       *
       * Sentence punctuation must never become part of a semantic
       * token: score. == score, changes. == changes.
       */
      .replace(
        /[^a-z0-9%$]+/g,
        " "
      )

      .split(
        /\s+/
      )

      .map(
        canonicalTokenV2
      )

      .filter(
        (
          token
        ) =>
          token.length >
            1 &&
          !STOP_TOKENS_V2.has(
            token
          )
      )
  );
}


function intersectionSizeV2(
  left:
    ReadonlySet<string>,

  right:
    ReadonlySet<string>
): number {
  let count =
    0;


  for (
    const token
    of left
  ) {
    if (
      right.has(
        token
      )
    ) {
      count +=
        1;
    }
  }


  return count;
}


function numericTokensV2(
  value:
    string
): readonly string[] {
  return (
    value.match(
      /[$€£]?\d+(?:[.,]\d+)?%?/g
    ) ??
    []
  )
    .map(
      (
        token
      ) =>
        token.trim()
    )
    .sort();
}


function sameNumericContractV2(
  left:
    string,

  right:
    string
): boolean {
  return (
    JSON.stringify(
      numericTokensV2(
        left
      )
    ) ===
    JSON.stringify(
      numericTokensV2(
        right
      )
    )
  );
}


function hasNegativePolarityV2(
  value:
    string
): boolean {
  return (
    /\b(?:no|not|never|without|cannot|can't|doesn't|does\s+not|do\s+not|isn't|is\s+not|aren't|are\s+not|won't|will\s+not)\b/i.test(
      value
    )
  );
}


function preservesPolarityV2(
  left:
    string,

  right:
    string
): boolean {
  return (
    hasNegativePolarityV2(
      left
    ) ===
    hasNegativePolarityV2(
      right
    )
  );
}


function allTokensPresentV2(
  required:
    ReadonlySet<string>,

  actual:
    ReadonlySet<string>
): boolean {
  if (
    required.size ===
    0
  ) {
    return false;
  }


  for (
    const token
    of required
  ) {
    if (
      !actual.has(
        token
      )
    ) {
      return false;
    }
  }


  return true;
}


function withoutTokensV2(
  source:
    ReadonlySet<string>,

  excluded:
    ReadonlySet<string>
): Set<string> {
  const output =
    new Set<string>();


  for (
    const token
    of source
  ) {
    if (
      !excluded.has(
        token
      )
    ) {
      output.add(
        token
      );
    }
  }


  return output;
}


export function isSafeMissionPreservingClaimReplanCandidateV1({
  originalText,
  candidateText,
  primaryQuery,
  sectionHeading,
  sectionMission,
  sectionQuestions = [],
  sectionExpectedOutcome = "",
}: {
  originalText:
    string;

  candidateText:
    string;

  primaryQuery:
    string;

  sectionHeading:
    string;

  sectionMission:
    string;

  sectionQuestions?:
    readonly string[];

  sectionExpectedOutcome?:
    string;
}): boolean {

  /*
   * DEFINITION_MISSION_PRESERVATION_V3
   *
   * A definition claim must preserve the definition of the same
   * subject. It does NOT need to lexically restate every word from
   * the section-level mission such as:
   *
   *   "establish its purpose"
   *   "reader can explain..."
   *
   * Those are SECTION outcomes, not factual components that must
   * appear inside one atomic definition claim.
   *
   * This branch grants ZERO evidence authority.
   * The production caller must still obtain:
   *
   *   SUPPORTS + VERIFIED_EXCERPT
   *
   * from enrichLiveEvidenceGraphV1().
   */
  /*
   * DEFINITION_OWNER_SECTION_ONLY_V1
   *
   * primaryQuery is ARTICLE-wide and can remain:
   *
   *   "what is credit monitoring"
   *
   * while the owning section is limitations, pricing, comparison,
   * score impact, etc.
   *
   * Therefore definition classification belongs exclusively to
   * the owning section information job.
   */
  const definitionJobTextV3 =
    [
      sectionHeading,
      sectionMission,
      ...(
        sectionQuestions ??
        []
      ),
      sectionExpectedOutcome ??
        "",
    ]
      .join(
        " "
      );


  const isDefinitionJobV3 =
    /\bdefine\b|\bdefinition\b|\bwhat\s+(?:is|are)\b/i
      .test(
        definitionJobTextV3
      );


  if (
    isDefinitionJobV3
  ) {
    const original =
      originalText.trim();

    const candidate =
      candidateText.trim();


    if (
      !original ||
      !candidate ||
      candidate ===
        original ||
      candidate.length >
        500
    ) {
      return false;
    }


    /*
     * Definition recovery never changes numeric or polarity
     * contracts.
     */
    if (
      !sameNumericContractV2(
        original,
        candidate
      ) ||
      !preservesPolarityV2(
        original,
        candidate
      )
    ) {
      return false;
    }


    const rawSubject =
      primaryQuery
        .trim()
        .replace(
          /[?!.,;:]+$/g,
          ""
        )
        .replace(
          /^(?:what\s+(?:is|are)|define|definition\s+of)\s+/i,
          ""
        )
        .trim();


    if (!rawSubject) {
      return false;
    }


    const subjectTokens =
      new Set(
        (
          rawSubject
            .toLowerCase()
            .match(
              /[a-z0-9]+/g
            ) ??
          []
        )
          .map(
            canonicalTokenV2
          )
          .filter(
            (
              token
            ) =>
              token.length >
                1 &&
              !STOP_TOKENS_V2.has(
                token
              )
          )
      );


    if (
      subjectTokens.size ===
      0
    ) {
      return false;
    }


    const candidateTokens =
      semanticTokensV2(
        candidate
      );


    /*
     * Exact named subject must survive.
     */
    if (
      !allTokensPresentV2(
        subjectTokens,
        candidateTokens
      )
    ) {
      return false;
    }


    /*
     * It must remain an actual definition/monitoring proposition,
     * not pricing, recommendation, capability-only or unrelated
     * same-subject prose.
     */
    /*
     * DEFINITION_SUBJECT_PREDICATE_BINDING_V4
     *
     * A definition predicate must describe the PRIMARY SUBJECT.
     *
     * It is not enough for an unrelated noun elsewhere in the
     * sentence to use "is" or "are".
     *
     * Bad:
     *   "Businesses are now required to provide free credit monitoring..."
     *
     * Good:
     *   "Credit monitoring is a service..."
     *   "Credit monitoring watches credit reports..."
     */
    const escapedSubjectPattern =
      rawSubject
        .split(
          /\s+/
        )
        .filter(
          Boolean
        )
        .map(
          (
            token
          ) =>
            token.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            )
        )
        .join(
          "\\s+"
        );


    const subjectDefinitionPattern =
      new RegExp(
        [
          "\\b",
          escapedSubjectPattern,
          "\\b",
          "(?:\\s+(?:service|services|product|tool|system|process|practice))?",
          "\\s+",
          "(?:is|are|means|refers\\s+to|tracks?|watches?|monitors?|keeps\\s+track\\s+of)",
          "\\b",
        ].join(
          ""
        ),
        "i"
      );


    const hasDefinitionPredicate =
      subjectDefinitionPattern.test(
        candidate
      );


    if (
      !hasDefinitionPredicate
    ) {
      return false;
    }


    /*
     * Preserve at least one non-generic semantic component from
     * the original definition.
     *
     * Example:
     *
     * original:
     *   tracks specified changes in credit information
     *
     * candidate:
     *   watches credit reports and alerts consumers to changes
     *
     * shares normalized "change/effect".
     *
     * A cyber-insurance sentence may share "credit monitoring"
     * and "service", but does not preserve that semantic core.
     */
    const genericDefinitionTokens =
      new Set<string>([
        "service",
        "product",
        "tool",
        "system",
        "process",
        "method",
        "type",
        "form",
        "way",
      ]);


    const excludedTokens =
      new Set<string>([
        ...subjectTokens,
        ...genericDefinitionTokens,
      ]);


    const originalCore =
      withoutTokensV2(
        semanticTokensV2(
          original
        ),
        excludedTokens
      );


    const candidateCore =
      withoutTokensV2(
        candidateTokens,
        excludedTokens
      );


    if (
      originalCore.size ===
        0 ||
      candidateCore.size ===
        0 ||
      intersectionSizeV2(
        originalCore,
        candidateCore
      ) <
        1
    ) {
      return false;
    }


    return true;
  }


  const original =
    originalText.trim();

  const candidate =
    candidateText.trim();


  if (
    !original ||
    !candidate
  ) {
    return false;
  }


  if (
    candidate ===
    original
  ) {
    return false;
  }


  /*
   * Never permit numeric drift.
   */
  if (
    !sameNumericContractV2(
      original,
      candidate
    )
  ) {
    return false;
  }


  /*
   * Never turn a negative factual proposition into a positive
   * proposition (or vice versa).
   */
  if (
    !preservesPolarityV2(
      original,
      candidate
    )
  ) {
    return false;
  }


  const originalTokens =
    semanticTokensV2(
      original
    );

  const candidateTokens =
    semanticTokensV2(
      candidate
    );


  const sectionContext =
    [
      sectionHeading,
      sectionMission,
      sectionExpectedOutcome,
      ...sectionQuestions,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      );


  const sectionTokens =
    semanticTokensV2(
      sectionContext
    );


  /*
   * Query ownership:
   *
   * remove question scaffolding and keep only the actual
   * topic subject.
   */
  const primaryTokens =
    semanticTokensV2(
      primaryQuery
    );


  const subjectAnchored =
    allTokensPresentV2(
      primaryTokens,
      candidateTokens
    );


  const originalOverlap =
    intersectionSizeV2(
      originalTokens,
      candidateTokens
    );


  const sectionOverlap =
    intersectionSizeV2(
      sectionTokens,
      candidateTokens
    );


  /*
   * Definition claims are frequently short.
   *
   * Ratio-based overlap is unsafe here because perfectly valid,
   * evidence-grounded wording can change:
   *
   * "tracks specified changes in credit information"
   *
   * into:
   *
   * "watches credit reports and alerts consumers to changes"
   *
   * while preserving exactly the same definition mission.
   *
   * Require instead:
   *
   * 1. the primary subject remains explicit;
   * 2. at least one meaningful non-subject concept remains tied
   *    either to the original claim or owning section.
   *
   * The STRICT evidence verifier after this helper remains the
   * sole authority for factual support.
   */
  const originalNonSubject =
    withoutTokensV2(
      originalTokens,
      primaryTokens
    );


  const sectionNonSubject =
    withoutTokensV2(
      sectionTokens,
      primaryTokens
    );


  const originalConceptOverlap =
    intersectionSizeV2(
      originalNonSubject,
      candidateTokens
    );


  const sectionConceptOverlap =
    intersectionSizeV2(
      sectionNonSubject,
      candidateTokens
    );


  /*
   * DEFINITION_REPLAN_SEMANTIC_GUARD_V2
   *
   * The relaxed definition path is ONLY available when the owning
   * section itself has a definition information job.
   *
   * Merely mentioning the primary subject is never enough.
   */
  const definitionMission =
    /\\b(?:define|definition|what\\s+is|what\\s+are|meaning|means|refers?\\s+to)\\b/i.test(
      sectionContext
    );


  const definitionCandidateShape =
    /\\b(?:is|means|refers?\\s+to|service|process|system|tool|practice)\\b/i.test(
      candidate
    );


  /*
   * Require at least TWO non-subject concepts from the original
   * definition.
   *
   * Example:
   *
   * original:
   * "service ... tracks ... changes ... credit information"
   *
   * safe:
   * "service ... watches reports ... alerts ... changes"
   *
   * overlap:
   * service + change
   *
   * unsafe:
   * "Credit monitoring subscriptions can be expensive"
   *
   * overlap:
   * zero
   */
  const subjectPreservingDefinitionReplan =
    definitionMission &&
    definitionCandidateShape &&
    subjectAnchored &&
    originalConceptOverlap >=
      2;


  /*
   * GENERAL MISSION-PRESERVING PATH
   *
   * Primary-query words are intentionally excluded from
   * originalConceptOverlap / sectionConceptOverlap.
   *
   * Therefore:
   *
   * "credit monitoring" == "credit monitoring"
   *
   * does NOT by itself authorize a semantic rewrite.
   */
  const requiredOriginalConceptOverlap =
    hasNegativePolarityV2(
      original
    )
      ? 2
      : 1;


  const ordinaryMissionPreservingReplan =
    subjectAnchored &&
    originalOverlap >=
      2 &&
    sectionOverlap >=
      1 &&
    originalConceptOverlap >=
      requiredOriginalConceptOverlap &&
    sectionConceptOverlap >=
      1;


  return (
    subjectPreservingDefinitionReplan ||
    ordinaryMissionPreservingReplan
  );
}


/*
 * DETERMINISTIC_DEFINITION_REPLAN_FROM_FETCHED_EXCERPT_V1
 *
 * This helper has ZERO evidence authority.
 *
 * It may only select wording already present in a fetched excerpt.
 * The selected wording must still pass:
 *
 *   isSafeMissionPreservingClaimReplanCandidateV1()
 *   +
 *   enrichLiveEvidenceGraphV1()
 *
 * before production may use it.
 *
 * This exists to avoid asking an LLM to invent a new definition when
 * a safe same-subject definition is already present in fetched evidence.
 */
export interface DeterministicDefinitionExcerptCandidateV1 {
  readonly sourceId:
    string;

  readonly excerpt:
    string;
}


export function selectDeterministicDefinitionReplanCandidateV1({
  originalText,
  primaryQuery,
  sectionHeading,
  sectionMission,
  sectionExpectedOutcome,
  sectionQuestions,
  candidates,
}: {
  originalText:
    string;

  primaryQuery:
    string;

  sectionHeading:
    string;

  sectionMission:
    string;

  sectionExpectedOutcome?:
    string;

  
  sectionQuestions?:
    readonly string[];

  candidates:
    readonly Readonly<
      DeterministicDefinitionExcerptCandidateV1
    >[];
}):
  | Readonly<{
      text:
        string;

      sourceId:
        string;
    }>
  | null {
  const definitionJobText =
    [
      sectionHeading,
      sectionMission,
      sectionExpectedOutcome ??
        "",
    ]
      .join(
        " "
      )
      .toLowerCase();


  const isDefinitionJob =
    /\bdefine\b|\bdefinition\b|\bwhat\s+(?:is|are)\b/i
      .test(
        definitionJobText
      );


  if (!isDefinitionJob) {
    return null;
  }


  const rawSubject =
    primaryQuery
      .trim()
      .replace(
        /[?!.,;:]+$/g,
        ""
      )
      .replace(
        /^(?:what\s+(?:is|are)|define|definition\s+of)\s+/i,
        ""
      )
      .trim();


  if (!rawSubject) {
    return null;
  }


  const subjectTokens =
    (
      rawSubject
        .toLowerCase()
        .match(
          /[\p{L}\p{N}]+/gu
        ) ??
      []
    )
      .filter(
        (
          token
        ) =>
          token.length >=
          3
      );


  if (
    subjectTokens.length ===
    0
  ) {
    return null;
  }


  const sentenceCandidates =
    candidates
      .flatMap(
        (
          candidate
        ) => {
          const normalized =
            candidate.excerpt
              .replace(
                /\s+/g,
                " "
              )
              .trim();


          if (!normalized) {
            return [];
          }


          return (
            normalized.match(
              /[^.!?]+[.!?]?/g
            ) ??
            []
          )
            .map(
              (
                sentence
              ) => ({
                sourceId:
                  candidate.sourceId,

                text:
                  sentence
                    .replace(
                      /\s+/g,
                      " "
                    )
                    .trim(),
              })
            );
        }
      )
      .filter(
        (
          candidate
        ) =>
          candidate.text.length >=
            24 &&
          candidate.text.length <=
            360
      );


  /*
   * DEFINITION_CLAUSE_NARROWING_V1
   *
   * A fetched sentence can contain:
   *
   *   definition + secondary feature
   *
   * Example:
   *
   *   "X is a service that watches Y and alerts users..."
   *
   * The second feature can legitimately fail mission-preservation
   * for a narrow definition section even though the first clause is
   * exactly the evidence-backed definition we need.
   *
   * Therefore try the narrower clause FIRST.
   *
   * This does NOT create new factual wording:
   * every returned token comes directly from the fetched excerpt.
   *
   * Mission safety and strict VERIFIED_EXCERPT verification still
   * run afterwards.
   */
  const definitionSentenceCandidates =
    sentenceCandidates.flatMap(
      (
        candidate
      ) => {
        const narrowedMatch =
          candidate.text.match(
            /^(.+?)(?:,\s*)?\s+and\s+(?:alerts?|notifies?|sends?|provides?|offers?|helps?|allows?|includes?)\b/i
          );


        const narrowed =
          narrowedMatch?.[1]
            ?.trim() ??
          "";


        if (
          !narrowed ||
          narrowed.length <
            24
        ) {
          return [
            candidate,
          ];
        }


        const narrowedText =
          /[.!?]$/.test(
            narrowed
          )
            ? narrowed
            : `${narrowed}.`;


        return [
          {
            ...candidate,

            text:
              narrowedText,
          },

          candidate,
        ];
      }
    );


  for (
    const candidate
    of definitionSentenceCandidates
  ) {
    if (
      candidate.text ===
      originalText.trim()
    ) {
      continue;
    }


    const lower =
      candidate.text
        .toLowerCase();


    const sharedSubjectTokens =
      subjectTokens.filter(
        (
          token
        ) =>
          lower.includes(
            token
          )
      );


    /*
     * Require effectively the same named subject.
     * For a two-token subject such as "credit monitoring",
     * both tokens must survive.
     */
    if (
      sharedSubjectTokens.length <
      Math.max(
        1,
        Math.ceil(
          subjectTokens.length *
          0.8
        )
      )
    ) {
      continue;
    }


    /*
     * A definition candidate must actually describe what the
     * subject is/does at its defining level.
     *
     * Pure pricing, recommendation, benefit, or alert-only
     * sentences are intentionally not enough.
     */
    const hasDefinitionSemantics =
      /\b(?:is|are|means|refers\s+to|tracks|watches|monitors|keeps\s+track\s+of)\b/i
        .test(
          candidate.text
        );


    if (!hasDefinitionSemantics) {
      continue;
    }


    if (
      !isSafeMissionPreservingClaimReplanCandidateV1({
        originalText,

        candidateText:
          candidate.text,

        primaryQuery,

        sectionHeading,

        sectionMission,

        sectionQuestions:
          sectionQuestions ??
          [],

        sectionExpectedOutcome,
      })
    ) {
      continue;
    }


    return Object.freeze({
      text:
        candidate.text,

      sourceId:
        candidate.sourceId,
    });
  }


  return null;
}

