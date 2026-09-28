import {
  SERP_REPLAY_DIMENSIONS,
  type SerpReplayDimensionV1,
  type SerpReplayDimensionVerdictV1,
  type SerpReplayPairwiseInputV1,
  type SerpReplayRawDimensionJudgmentV1,
  type SerpReplayRawPairwiseJudgmentV1,
} from "./serp-replay";

import {
  ContentGenerationError,
} from "./generator";


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


function exactKeys({
  value,
  expected,
  code,
}: {
  value:
    Record<
      string,
      unknown
    >;

  expected:
    readonly string[];

  code:
    string;
}): void {
  const actual =
    Object.keys(
      value
    ).sort();

  const wanted =
    [...expected].sort();


  if (
    actual.length !==
      wanted.length ||
    actual.some(
      (
        key,
        index
      ) =>
        key !==
        wanted[
          index
        ]
    )
  ) {
    throw new ContentGenerationError(
      code
    );
  }
}


function requiredText(
  value:
    unknown,
  code:
    string
): string {
  if (
    typeof value !==
    "string" ||
    value.trim()
      .length ===
      0
  ) {
    throw new ContentGenerationError(
      code
    );
  }

  return value.trim();
}


function strictStringArray(
  value:
    unknown,
  code:
    string
): readonly string[] {
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
        item.trim()
          .length >
          0
    )
  ) {
    throw new ContentGenerationError(
      code
    );
  }

  return Object.freeze(
    value.map(
      (item) =>
        item.trim()
    )
  );
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


export function parseSerpReplayPairwiseCandidateV1(
  value:
    unknown
): Readonly<
  SerpReplayRawPairwiseJudgmentV1
> {
  const candidate =
    record(
      value
    );

  if (!candidate) {
    throw new ContentGenerationError(
      "SERP_REPLAY_AI_RESPONSE_NOT_OBJECT"
    );
  }


  /*
   * Exact top-level shape.
   *
   * No score.
   * No winner.
   * No probability.
   * No hidden aggregate recommendation.
   */
  exactKeys({
    value:
      candidate,

    expected: [
      "dimensions",
    ],

    code:
      "SERP_REPLAY_AI_RESPONSE_TOP_LEVEL_INVALID",
  });


  if (
    !Array.isArray(
      candidate.dimensions
    ) ||
    candidate.dimensions.length !==
      SERP_REPLAY_DIMENSIONS.length
  ) {
    throw new ContentGenerationError(
      "SERP_REPLAY_AI_RESPONSE_DIMENSIONS_INVALID"
    );
  }


  const dimensions:
    Readonly<
      SerpReplayRawDimensionJudgmentV1
    >[] =
      [];


  const seen =
    new Set<
      SerpReplayDimensionV1
    >();


  for (
    const raw
    of candidate.dimensions
  ) {
    const dimension =
      record(
        raw
      );

    if (!dimension) {
      throw new ContentGenerationError(
        "SERP_REPLAY_AI_DIMENSION_NOT_OBJECT"
      );
    }


    exactKeys({
      value:
        dimension,

      expected: [
        "dimension",
        "verdict",
        "reason",
        "articleEvidenceIds",
        "competitorEvidenceIds",
        "missingData",
      ],

      code:
        "SERP_REPLAY_AI_DIMENSION_SHAPE_INVALID",
    });


    if (
      !validDimension(
        dimension.dimension
      ) ||
      seen.has(
        dimension.dimension
      )
    ) {
      throw new ContentGenerationError(
        "SERP_REPLAY_AI_DIMENSION_ID_INVALID"
      );
    }


    if (
      !validVerdict(
        dimension.verdict
      )
    ) {
      throw new ContentGenerationError(
        `SERP_REPLAY_AI_VERDICT_INVALID:${dimension.dimension}`
      );
    }


    const reason =
      requiredText(
        dimension.reason,
        `SERP_REPLAY_AI_REASON_REQUIRED:${dimension.dimension}`
      );


    const articleEvidenceIds =
      strictStringArray(
        dimension
          .articleEvidenceIds,
        `SERP_REPLAY_AI_ARTICLE_EVIDENCE_IDS_INVALID:${dimension.dimension}`
      );


    const competitorEvidenceIds =
      strictStringArray(
        dimension
          .competitorEvidenceIds,
        `SERP_REPLAY_AI_COMPETITOR_EVIDENCE_IDS_INVALID:${dimension.dimension}`
      );


    const missingData =
      strictStringArray(
        dimension
          .missingData,
        `SERP_REPLAY_AI_MISSING_DATA_INVALID:${dimension.dimension}`
      );


    seen.add(
      dimension.dimension
    );


    dimensions.push(
      Object.freeze({
        dimension:
          dimension.dimension,

        verdict:
          dimension.verdict,

        reason,

        articleEvidenceIds,

        competitorEvidenceIds,

        missingData,
      })
    );
  }


  for (
    const required
    of SERP_REPLAY_DIMENSIONS
  ) {
    if (
      !seen.has(
        required
      )
    ) {
      throw new ContentGenerationError(
        `SERP_REPLAY_AI_DIMENSION_MISSING:${required}`
      );
    }
  }


  return Object.freeze({
    dimensions:
      Object.freeze(
        dimensions
      ),
  });
}


function articlePayload(
  input:
    Readonly<
      SerpReplayPairwiseInputV1
    >
) {
  return {
    title:
      input.article.title,

    h1:
      input.article.h1,

    bodyMarkdown:
      input.article.bodyMarkdown,

    sections:
      input.article.sections.map(
        (section) => ({
          sectionIndex:
            section.sectionIndex,

          heading:
            section.heading,

          bodyMarkdown:
            section.bodyMarkdown,

          coveredQueryNodeIds:
            section.coveredQueryNodeIds,

          referencedClaimIds:
            section.referencedClaimIds,

          referencedEvidenceIds:
            section.referencedEvidenceIds,

          assetUsed:
            section.assetUsed,
        })
      ),

    evidenceCatalog:
      input.article
        .evidenceCatalog,
  };
}


function competitorPayload(
  input:
    Readonly<
      SerpReplayPairwiseInputV1
    >
) {
  /*
   * Rank is intentionally NOT sent to the semantic judge.
   *
   * Rank remains stored in SerpReplayPairComparisonV1 as
   * provenance, but cannot bias the content comparison.
   */
  return {
    url:
      input.competitor.url,

    domain:
      input.competitor.domain,

    title:
      input.competitor.title,

    snippet:
      input.competitor.snippet,

    pageType:
      input.competitor.pageType,

    intent:
      input.competitor.intent,

    evidenceCatalog:
      input.competitor
        .evidenceCatalog,
  };
}


export function buildSerpReplayPairwisePrompt(
  input:
    Readonly<
      SerpReplayPairwiseInputV1
    >
): string {
  return [
    /* SERP_REPLAY_DIRECTIONAL_EVIDENCE_RULE_V2 */
    "STRICT DIRECTIONAL EVIDENCE RULE:",
    "- ARTICLE_STRONGER or COMPETITOR_STRONGER is allowed only when supplied evidence directly establishes that direction.",
    "- Directional judgments must use the supplied articleEvidenceIds and competitorEvidenceIds.",
    "- If direction cannot be justified from supplied evidence, return INSUFFICIENT_EVIDENCE for that dimension.",
    "- For INSUFFICIENT_EVIDENCE, state exactly what information is missing in missingData.",
    "- Never invent evidence IDs, metrics, observations, rankings, facts, source authority, or comparative advantages.",
    "- Missing evidence is not evidence that either side is stronger.",
    "",

    "You are the pairwise SERP replay judge for a high-stakes SEO publishing system.",
    "",
    "Your job is NOT to predict Google rankings.",
    "Your job is NOT to choose a winner.",
    "Your job is to compare one accepted article against one observed SERP result using ONLY supplied evidence.",
    "",
    `SEARCH MISSION QUERY: ${input.keyword}`,
    `SERP SNAPSHOT FINGERPRINT: ${input.snapshotFingerprint}`,
    "",
    "NON-NEGOTIABLE RULES:",
    "- Do not estimate ranking probability.",
    "- Do not produce an SEO score, content score, quality score, numeric grade, percentage, confidence percentage, or winner.",
    "- Do not assume the higher-ranking URL has better content.",
    "- SERP rank is intentionally withheld and must not be inferred.",
    "- Do not use brand fame, domain reputation, company size, perceived authority, popularity, or name recognition as evidence unless the supplied evidence explicitly establishes the relevant fact.",
    "- Do not use word count as evidence that either side is better.",
    "- Do not use backlinks or referring-domain counts as content-quality evidence.",
    "- Do not invent page content that is absent from the competitor evidence catalog.",
    "- Do not infer a competitor claim, source, author, tool, table, heading, question, topic, or entity unless it appears in the supplied competitor evidence.",
    "- Do not infer article support that is absent from the supplied article evidence catalog.",
    "- Evidence IDs are closed-world identifiers. Cite ONLY IDs that appear in the corresponding supplied catalog.",
    "- A directional verdict requires real evidence for BOTH sides.",
    "- If the available observations are not enough to compare a dimension, use INSUFFICIENT_EVIDENCE and state exactly what data is missing.",
    "- Missing full competitor body text is a legitimate reason for INSUFFICIENT_EVIDENCE where the dimension cannot be established from observed data.",
    "- Do not reward keyword stuffing, exact-match repetition, heading count, or content length.",
    "",
    "DIMENSIONS:",
    "",
    "INTENT_FULFILLMENT",
    "- Which page better satisfies the actual search job represented by the query and supplied intent evidence?",
    "- Use observed purpose, title/H1/snippet/topics/questions and article evidence.",
    "",
    "QUERY_COVERAGE",
    "- Compare meaningful query/job coverage, not keyword frequency.",
    "- Article query-node evidence is authoritative for declared article coverage.",
    "- Competitor coverage may be inferred only from supplied observed title/snippet/headings/topics/questions.",
    "",
    "ANSWER_COMPLETENESS",
    "- Compare whether the available evidence shows the important user questions/jobs are actually answered.",
    "- Do not assume unobserved competitor body content.",
    "",
    "EVIDENCE_STRENGTH",
    "- Compare factual support actually visible in supplied evidence.",
    "- Article verified claim/evidence/source provenance may be used.",
    "- Competitor claims/sources may be used only when explicitly observed.",
    "- Never convert brand reputation into evidence strength.",
    "",
    "ORIGINAL_VALUE",
    "- Article original-value evidence must come from supplied verified ARTICLE_ASSET evidence.",
    "- Competitor original value must be explicitly observable from supplied tools/tables/questions/claims/sources or other evidence.",
    "- If competitor uniqueness cannot be established from observations, use INSUFFICIENT_EVIDENCE rather than guessing.",
    "",
    "STRUCTURAL_USEFULNESS",
    "- Compare information architecture and useful observed structures.",
    "- Headings, questions, tools, tables and media may be considered when supplied.",
    "- More headings or more media is not automatically better.",
    "",
    "ARTICLE:",
    JSON.stringify(
      articlePayload(
        input
      ),
      null,
      2
    ),
    "",
    "COMPETITOR OBSERVATIONS:",
    JSON.stringify(
      competitorPayload(
        input
      ),
      null,
      2
    ),
    "",
    "Return JSON only.",
    "Return exactly this top-level shape and no additional fields:",
    "{",
    '  "dimensions": [',
    "    {",
    '      "dimension": "INTENT_FULFILLMENT | QUERY_COVERAGE | ANSWER_COMPLETENESS | EVIDENCE_STRENGTH | ORIGINAL_VALUE | STRUCTURAL_USEFULNESS",',
    '      "verdict": "ARTICLE_STRONGER | COMPETITOR_STRONGER | MIXED | INSUFFICIENT_EVIDENCE",',
    '      "reason": "specific evidence-based explanation",',
    '      "articleEvidenceIds": ["ONLY supplied ARTICLE_* IDs"],',
    '      "competitorEvidenceIds": ["ONLY supplied COMPETITOR_* IDs"],',
    '      "missingData": ["specific missing observation when applicable"]',
    "    }",
    "  ]",
    "}",
    "",
    "Return every dimension exactly once.",
    "Do not add an aggregate verdict.",
    "Do not add a score.",
    "Do not add a ranking prediction.",
    "Do not add a recommendation to publish.",
  ].join(
    "\n"
  );
}
