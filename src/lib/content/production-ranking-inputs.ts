import {
  buildCanonicalObservedQueryRegistry,
} from "./production-observed-query-registry";

import type {
  ProductionMasterLiveSourceResearch,
} from "./production-master-live-source-adapter";


function normalize(
  value:
    string
): string {
  return value
    .toLowerCase()
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9\s]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


function record(
  value:
    unknown
): Record<
  string,
  unknown
> | null {
  return (
    value !==
      null &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  )
    ? value as
        Record<
          string,
          unknown
        >
    : null;
}


export function collectObservedQueryUniverse({
  dataForSeo,
  keywordContext,
}: {
  dataForSeo:
    unknown;

  keywordContext?:
    unknown;
}): readonly string[] {
  /*
   * CANONICAL_OBSERVED_QUERY_UNIVERSE_V1
   *
   * Query identity is resolved by the exact same registry used
   * by production-master-live-research-assembler.
   *
   * Generic "query" fields are not keyword acquisition evidence.
   */
  const registry =
    buildCanonicalObservedQueryRegistry([
      keywordContext,
      dataForSeo,
    ]);


  return Object.freeze(
    [
      ...registry
        .queryTexts
        .values(),
    ]
  );
}


const STOP_WORDS =
  new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "what",
    "when",
    "with",
    "your",
  ]);


function contentTerms(
  value:
    string
): readonly string[] {
  return Object.freeze(
    normalize(
      value
    )
      .split(
        " "
      )
      .filter(
        (
          term
        ) =>
          term.length >=
            3 &&
          !STOP_WORDS.has(
            term
          )
      )
  );
}


export interface SerpCompetitiveResult {
  rank:
    number;

  domain:
    string;

  url:
    string;

  title:
    string;

  description:
    string;

  featuredSnippet:
    boolean;
}


export interface SerpCompetitiveCoverageMap {
  version:
    "SERP_COMPETITIVE_COVERAGE_V1";

  analyzedResults:
    number;

  uniqueDomains:
    number;

  governmentResults:
    number;

  academicResults:
    number;

  featuredSnippetPresent:
    boolean;

  dominantTitleTerms:
    readonly Readonly<{
      term:
        string;

      resultFrequency:
        number;
    }>[];

  observedQuestions:
    readonly string[];

  topResults:
    readonly Readonly<
      SerpCompetitiveResult
    >[];
}


function collectQuestionStrings(
  value:
    unknown
): readonly string[] {
  const found =
    new Set<string>();


  const walk = (
    current:
      unknown
  ): void => {
    if (
      typeof current ===
        "string"
    ) {
      const clean =
        current.trim();

      if (
        clean
      ) {
        found.add(
          clean
        );
      }

      return;
    }

    if (
      Array.isArray(
        current
      )
    ) {
      current.forEach(
        walk
      );

      return;
    }

    const item =
      record(
        current
      );

    if (
      !item
    ) {
      return;
    }

    for (
      const [
        key,
        nested,
      ] of Object.entries(
        item
      )
    ) {
      if (
        (
          key ===
            "question" ||
          key ===
            "text"
        ) &&
        typeof nested ===
          "string"
      ) {
        const clean =
          nested.trim();

        if (
          clean
        ) {
          found.add(
            clean
          );
        }

        continue;
      }

      if (
        nested !==
          null &&
        typeof nested ===
          "object"
      ) {
        walk(
          nested
        );
      }
    }
  };


  walk(
    value
  );


  return Object.freeze(
    [
      ...found,
    ].slice(
      0,
      20
    )
  );
}


export function buildSerpCompetitiveCoverageMap(
  serp:
    unknown
): Readonly<
  SerpCompetitiveCoverageMap
> {
  /*
   * This is competitive/search-intent evidence.
   *
   * Titles/descriptions/questions help determine coverage and
   * information architecture.
   *
   * They are NOT VERIFIED_EXCERPT evidence for factual claims.
   */

  const root =
    record(
      serp
    );

  const rawOrganic =
    Array.isArray(
      root?.organic
    )
      ? root.organic
      : [];


  const topResults:
    SerpCompetitiveResult[] =
      rawOrganic
        .slice(
          0,
          10
        )
        .map(
          (
            raw,
            index
          ) => {
            const item =
              record(
                raw
              ) ??
              {};

            const rank =
              typeof item.rank ===
                "number"
                ? item.rank
                : index +
                  1;

            const domain =
              typeof item.domain ===
                "string"
                ? item.domain
                    .trim()
                    .toLowerCase()
                    .replace(
                      /^www\./,
                      ""
                    )
                : "";

            return {
              rank,

              domain,

              url:
                typeof item.url ===
                  "string"
                  ? item.url.trim()
                  : "",

              title:
                typeof item.title ===
                  "string"
                  ? item.title.trim()
                  : "",

              description:
                typeof item.description ===
                  "string"
                  ? item.description
                      .trim()
                      .slice(
                        0,
                        300
                      )
                  : "",

              featuredSnippet:
                item.featuredSnippet ===
                  true,
            };
          }
        )
        .filter(
          (
            item
          ) =>
            Boolean(
              item.url ||
              item.title
            )
        );


  const termResultFrequency =
    new Map<
      string,
      number
    >();


  for (
    const result
    of topResults
  ) {
    const resultTerms =
      new Set(
        contentTerms(
          result.title
        )
      );

    for (
      const term
      of resultTerms
    ) {
      termResultFrequency.set(
        term,
        (
          termResultFrequency.get(
            term
          ) ??
          0
        ) +
          1
      );
    }
  }


  const dominantTitleTerms =
    [
      ...termResultFrequency
        .entries(),
    ]
      .filter(
        (
          [
            ,
            frequency,
          ]
        ) =>
          frequency >=
          2
      )
      .sort(
        (
          a,
          b
        ) =>
          b[1] -
            a[1] ||
          a[0].localeCompare(
            b[0]
          )
      )
      .slice(
        0,
        25
      )
      .map(
        (
          [
            term,
            resultFrequency,
          ]
        ) =>
          Object.freeze({
            term,

            resultFrequency,
          })
      );


  const domains =
    new Set(
      topResults
        .map(
          (
            result
          ) =>
            result.domain
        )
        .filter(
          Boolean
        )
    );


  const observedQuestions =
    collectQuestionStrings(
      root?.questions
    );


  return Object.freeze({
    version:
      "SERP_COMPETITIVE_COVERAGE_V1",

    analyzedResults:
      topResults.length,

    uniqueDomains:
      domains.size,

    governmentResults:
      topResults.filter(
        (
          result
        ) =>
          result.domain.endsWith(
            ".gov"
          )
      ).length,

    academicResults:
      topResults.filter(
        (
          result
        ) =>
          result.domain.endsWith(
            ".edu"
          )
      ).length,

    featuredSnippetPresent:
      topResults.some(
        (
          result
        ) =>
          result.featuredSnippet
      ),

    dominantTitleTerms:
      Object.freeze(
        dominantTitleTerms
      ),

    observedQuestions,

    topResults:
      Object.freeze(
        topResults.map(
          (
            result
          ) =>
            Object.freeze(
              result
            )
        )
      ),
  });
}


export function buildSerpCompetitiveCoveragePrompt(
  coverage:
    Readonly<
      SerpCompetitiveCoverageMap
    >
): string {
  return [
    "LIVE TOP-10 SERP COMPETITIVE COVERAGE MAP:",
    JSON.stringify(
      coverage,
      null,
      2
    ),
    "",
    "Use this only for search-intent, competitive coverage, information architecture, and gap decisions.",
    "SERP titles, snippets, and questions are NOT verified factual evidence.",
    "Do not create factual claims from snippets.",
  ].join(
    "\n"
  );
}


export function buildProductionRankingInputs(
  research:
    Pick<
      ProductionMasterLiveSourceResearch,
      | "keyword"
      | "keywordContext"
      | "dataForSeo"
      | "serpIntelligence"
    >
): Readonly<{
  observedQueries:
    readonly string[];

  serpCoverage:
    Readonly<
      SerpCompetitiveCoverageMap
    >;
}> {
  return Object.freeze({
    observedQueries:
      collectObservedQueryUniverse({
        keywordContext:
          research.keywordContext,

        dataForSeo:
          research.dataForSeo,
      }),

    serpCoverage:
      buildSerpCompetitiveCoverageMap(
        research
          .serpIntelligence
      ),
  });
}
