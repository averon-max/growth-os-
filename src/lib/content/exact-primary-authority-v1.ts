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


  const pool =
    uniqueKeywords([
      strategy.primary,
      ...strategy.secondary,
      ...strategy.supporting,
    ]);


  const exact =
    pool.find(
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
    pool.filter(
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


  return {
    ...strategy,

    primary:
      exact,

    secondary,

    supporting:
      uniqueKeywords(
        supporting
      ),
  };
}
