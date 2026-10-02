import {
  prisma,
} from "@/lib/prisma";

import {
  normalizeKeyword,
} from "@/lib/keywords/normalize";

import {
  getWebsiteKeywordContext,
} from "./keyword-context";


export type ContentSuggestionSourceV1 =
  | "SITE_KEYWORD"
  | "GSC"
  | "CACHED_RELATED";


export interface ContentSuggestionV1 {
  readonly keyword:
    string;

  readonly source:
    ContentSuggestionSourceV1;

  readonly searchVolume:
    number | null;

  readonly difficulty:
    number | null;

  readonly position:
    number | null;

  readonly impressions:
    number;

  readonly clicks:
    number;
}


export interface ContentSuggestionsResultV1 {
  readonly version:
    "CONTENT_SUGGESTIONS_V1";

  readonly paidApiUsed:
    false;

  readonly recommended:
    readonly ContentSuggestionV1[];

  readonly related:
    readonly ContentSuggestionV1[];
}


function normalized(
  value:
    string
): string {
  return normalizeKeyword(
    value
  );
}


function queryTokens(
  value:
    string
): string[] {
  return normalized(
    value
  )
    .split(
      /\s+/
    )
    .filter(
      (
        token
      ) =>
        token.length >=
          3
    );
}


function relevantToSeed(
  keyword:
    string,
  seed:
    string
): boolean {
  const cleanSeed =
    normalized(
      seed
    );

  if (!cleanSeed) {
    return true;
  }

  const cleanKeyword =
    normalized(
      keyword
    );

  if (
    cleanKeyword.includes(
      cleanSeed
    ) ||
    cleanSeed.includes(
      cleanKeyword
    )
  ) {
    return true;
  }

  const tokens =
    queryTokens(
      cleanSeed
    );

  if (
    tokens.length ===
    0
  ) {
    return true;
  }

  return tokens.some(
    (
      token
    ) =>
      cleanKeyword.includes(
        token
      )
  );
}


function numeric(
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


function integer(
  value:
    unknown
): number {
  const result =
    numeric(
      value
    );

  return result ===
    null
    ? 0
    : Math.max(
        0,
        Math.round(
          result
        )
      );
}


function unique(
  values:
    readonly ContentSuggestionV1[]
): ContentSuggestionV1[] {
  const seen =
    new Set<string>();

  const output:
    ContentSuggestionV1[] =
      [];

  for (
    const value
    of values
  ) {
    const key =
      normalized(
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


function sortRecommended(
  left:
    ContentSuggestionV1,
  right:
    ContentSuggestionV1
): number {
  /*
   * No synthetic SEO score.
   *
   * Use observable metrics in deterministic priority:
   * impressions -> search volume -> clicks -> ranking position.
   */
  if (
    right.impressions !==
    left.impressions
  ) {
    return (
      right.impressions -
      left.impressions
    );
  }

  const leftVolume =
    left.searchVolume ??
    -1;

  const rightVolume =
    right.searchVolume ??
    -1;

  if (
    rightVolume !==
    leftVolume
  ) {
    return (
      rightVolume -
      leftVolume
    );
  }

  if (
    right.clicks !==
    left.clicks
  ) {
    return (
      right.clicks -
      left.clicks
    );
  }

  return (
    left.position ??
    Number.MAX_SAFE_INTEGER
  ) - (
    right.position ??
    Number.MAX_SAFE_INTEGER
  );
}


function parseCachedSuggestion(
  value:
    unknown
): ContentSuggestionV1 | null {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  const record =
    value as
      Record<
        string,
        unknown
      >;

  if (
    typeof record.keyword !==
      "string" ||
    !record.keyword.trim()
  ) {
    return null;
  }

  return {
    keyword:
      record.keyword.trim(),

    source:
      "CACHED_RELATED",

    searchVolume:
      numeric(
        record.searchVolume
      ),

    difficulty:
      numeric(
        record.keywordDifficulty
      ),

    position:
      null,

    impressions:
      0,

    clicks:
      0,
  };
}


export async function getZeroCostContentSuggestionsV1({
  websiteId,
  seed,
}: {
  readonly websiteId:
    string;

  readonly seed:
    string;
}): Promise<ContentSuggestionsResultV1> {
  const cleanSeed =
    seed.trim();

  /*
   * This function MUST NOT import or call DataForSEO providers.
   */
  const context =
    await getWebsiteKeywordContext(
      websiteId
    ).catch(
      () =>
        null
    );


  const siteCandidates:
    ContentSuggestionV1[] =
      (
        context
          ?.topKeywords ??
        []
      )
        .filter(
          (
            item
          ) =>
            relevantToSeed(
              item.keyword,
              cleanSeed
            )
        )
        .map(
          (
            item
          ): ContentSuggestionV1 => ({
            keyword:
              item.keyword,

            source:
              item.impressions >
                0 ||
              item.clicks >
                0
                ? "GSC"
                : "SITE_KEYWORD",

            searchVolume:
              numeric(
                item.volume
              ),

            difficulty:
              numeric(
                item.difficulty
              ),

            position:
              numeric(
                item.position
              ),

            impressions:
              integer(
                item.impressions
              ),

            clicks:
              integer(
                item.clicks
              ),
          })
        )
        .sort(
          sortRecommended
        );


  /*
   * CACHE-ONLY.
   *
   * CACHE-ONLY CONTRACT:
   * never use the network-backed related-keyword helper here,
   * because a cache miss may trigger a paid provider request.
   */
  const cacheRows =
    cleanSeed
      ? await prisma
          .keywordSuggestionCache
          .findMany({
            where: {
              source:
                "DATAFORSEO_RELATED",

              normalized: {
                startsWith:
                  `${normalized(cleanSeed)}:`,
              },
            },

            orderBy: {
              fetchedAt:
                "desc",
            },

            take:
              5,
          })
      : [];


  const cachedCandidates:
    ContentSuggestionV1[] =
      [];

  for (
    const row
    of cacheRows
  ) {
    if (
      !Array.isArray(
        row.payload
      )
    ) {
      continue;
    }

    for (
      const raw
      of row.payload
    ) {
      const parsed =
        parseCachedSuggestion(
          raw
        );

      if (
        parsed &&
        normalized(
          parsed.keyword
        ) !==
          normalized(
            cleanSeed
          )
      ) {
        cachedCandidates.push(
          parsed
        );
      }
    }
  }


  const recommended =
    unique(
      siteCandidates
    )
      .filter(
        (
          item
        ) =>
          normalized(
            item.keyword
          ) !==
            normalized(
              cleanSeed
            )
      )
      .slice(
        0,
        6
      );


  const recommendedKeys =
    new Set(
      recommended.map(
        (
          item
        ) =>
          normalized(
            item.keyword
          )
      )
    );


  const related =
    unique(
      cachedCandidates
    )
      .filter(
        (
          item
        ) =>
          !recommendedKeys.has(
            normalized(
              item.keyword
            )
          )
      )
      .slice(
        0,
        6
      );


  return {
    version:
      "CONTENT_SUGGESTIONS_V1",

    paidApiUsed:
      false,

    recommended,

    related,
  };
}
