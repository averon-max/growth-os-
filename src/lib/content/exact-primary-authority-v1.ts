import {
  normalizeQueryIdentityV1,
} from "./content-generation-mode-v1";

import type {
  ContentStrategy,
  ContentStrategyKeyword,
} from "./types";


export class ExactPrimaryAuthorityErrorV1
  extends Error {
  constructor(
    readonly code:
      string,
    detail?:
      string
  ) {
    super(
      detail
        ? `${code}:${detail}`
        : code
    );

    this.name =
      "ExactPrimaryAuthorityErrorV1";
  }
}


function sameQuery(
  left:
    string,
  right:
    string
): boolean {
  return (
    normalizeQueryIdentityV1(
      left
    ) ===
    normalizeQueryIdentityV1(
      right
    )
  );
}


function uniqueKeywords(
  values:
    readonly ContentStrategyKeyword[]
): ContentStrategyKeyword[] {
  const seen =
    new Set<string>();

  const output:
    ContentStrategyKeyword[] =
      [];

  for (
    const value
    of values
  ) {
    const key =
      normalizeQueryIdentityV1(
        value.keyword
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

    output.push(
      value
    );
  }

  return output;
}


/**
 * EXACT_PRIMARY_AUTHORITY_V1
 *
 * Exact mode is NOT another keyword scorer.
 *
 * The requested query must already exist somewhere inside
 * the strategy candidate result because buildContentStrategy()
 * starts from the requested topic.
 *
 * We simply promote that existing real candidate to primary
 * BEFORE SERP planning occurs.
 *
 * No search volume, KD, CPC, GSC or other metrics are invented.
 */
export function applyExactPrimaryAuthorityV1({
  strategy,
  requiredPrimaryKeyword,
}: {
  readonly strategy:
    ContentStrategy;

  readonly requiredPrimaryKeyword?:
    string | null;
}): ContentStrategy {
  const required =
    requiredPrimaryKeyword
      ?.trim();

  if (!required) {
    return strategy;
  }


    /*
     * EXACT_PRIMARY_ELIGIBLE_EXCLUDED_AUTHORITY_V3
     *
     * EXACT prefers active ContentStrategyKeyword candidates.
     *
     * A real typed candidate currently in strategy.excluded may
     * also be promoted, but ONLY when KeywordDecision.ranked
     * independently confirms the same query as eligible=true.
     *
     * This preserves hard query-ownership / brand / intent gates
     * while allowing EXACT to honor a legitimate requested query.
     */
    const activePool =
      uniqueKeywords([
        strategy.primary,
        ...strategy.secondary,
        ...strategy.supporting,
      ]);


    const eligibleExcluded =
      uniqueKeywords(
        (
          strategy.excluded ??
          []
        ).filter(
          (
            candidate
          ) =>
            Boolean(
              strategy
                .decisionIntelligence
                ?.ranked
                .some(
                  (
                    decision
                  ) =>
                    decision.eligible ===
                      true &&
                    sameQuery(
                      decision.keyword,
                      candidate.keyword
                    )
                )
            )
        )
      );


    const candidatePool =
      uniqueKeywords([
        ...activePool,
        ...eligibleExcluded,
      ]);


  const exact =
    candidatePool.find(
      (
        candidate
      ) =>
        sameQuery(
          candidate.keyword,
          required
        )
    );


  if (!exact) {
    throw new ExactPrimaryAuthorityErrorV1(
      "CONTENT_EXACT_PRIMARY_CANDIDATE_MISSING",
      required
    );
  }


  if (
    sameQuery(
      strategy.primary.keyword,
      required
    )
  ) {
    return strategy;
  }


  const remaining =
    activePool.filter(
      (
        candidate
      ) =>
        !sameQuery(
          candidate.keyword,
          required
        )
    );


  /*
   * Preserve existing keyword intelligence instead of discarding
   * the previously selected primary.
   *
   * Secondary ownership remains unchanged where possible;
   * all remaining candidates stay available as supporting coverage.
   */
  const secondary =
    uniqueKeywords(
      strategy.secondary.filter(
        (
          candidate
        ) =>
          !sameQuery(
            candidate.keyword,
            required
          )
      )
    );


  const secondaryKeys =
    new Set(
      secondary.map(
        (
          candidate
        ) =>
          normalizeQueryIdentityV1(
            candidate.keyword
          )
      )
    );


  const supporting =
    remaining.filter(
      (
        candidate
      ) =>
        !secondaryKeys.has(
          normalizeQueryIdentityV1(
            candidate.keyword
          )
        )
    );


    const excluded =
      uniqueKeywords(
        (
          strategy.excluded ??
          []
        ).filter(
          (
            candidate
          ) =>
            !sameQuery(
              candidate.keyword,
              required
            )
        )
      );


  return {
    ...strategy,

    primary:
      exact,

    secondary,

    supporting:
      uniqueKeywords(
        supporting
      ),

      excluded,
  };
}
