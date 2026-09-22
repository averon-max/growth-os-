import type {
  MasterRuntimeSnapshotV1,
} from "./master-runtime-adapter";

import type {
  MasterArticleCannibalizationCandidateV1,
  MasterArticleOriginalityReferenceV1,
  MasterArticleSemanticCriticContextV1,
} from "./master-article-semantic-critics";


function isRecord(
  value:
    unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  );
}


function cleanString(
  value:
    unknown
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const clean =
    value.trim();

  return clean ||
    null;
}


function finiteNumber(
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


function stringArray(
  value:
    unknown
): readonly string[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return Object.freeze(
      []
    );
  }

  return Object.freeze(
    value
      .filter(
        (
          item
        ): item is string =>
          typeof item ===
            "string" &&
          item.trim().length >
            0
      )
      .map(
        (item) =>
          item.trim()
      )
  );
}


function textArray(
  value:
    unknown
): readonly string[] {
  return stringArray(
    value
  );
}


function firstStringArray(
  record:
    Record<string, unknown>,
  keys:
    readonly string[]
): readonly string[] {
  for (
    const key
    of keys
  ) {
    const values =
      textArray(
        record[
          key
        ]
      );

    if (
      values.length >
      0
    ) {
      return values;
    }
  }

  return Object.freeze(
    []
  );
}


function buildSerpReferenceText(
  result:
    Record<string, unknown>
): string | null {
  /*
   * IMPORTANT:
   * only actual persisted SERP fields are used.
   *
   * We accept multiple historical field names because
   * snapshots evolved over time, but never manufacture text.
   */
  const scalarFields = [
    cleanString(
      result.title
    ),
    cleanString(
      result.snippet
    ),
    cleanString(
      result.description
    ),
    cleanString(
      result.h1
    ),
  ].filter(
    (
      value
    ): value is string =>
      Boolean(
        value
      )
  );


  const h2 =
    firstStringArray(
      result,
      [
        "h2",
        "h2s",
      ]
    );


  const h3 =
    firstStringArray(
      result,
      [
        "h3",
        "h3s",
      ]
    );


  const topics =
    firstStringArray(
      result,
      [
        "topics",
        "entities",
        "questions",
      ]
    );


  const parts = [
    ...scalarFields,

    ...h2.map(
      (value) =>
        `H2: ${value}`
    ),

    ...h3.map(
      (value) =>
        `H3: ${value}`
    ),

    ...topics.map(
      (value) =>
        `Topic: ${value}`
    ),
  ];


  const unique =
    Array.from(
      new Set(
        parts
      )
    );


  const text =
    unique.join(
      "\n"
    ).trim();


  /*
   * A URL or tiny title alone is not enough to claim that
   * originality was actually compared.
   */
  return text.length >=
    80
    ? text
    : null;
}


function buildOriginalityReferences(
  runtime:
    Readonly<MasterRuntimeSnapshotV1>
): readonly Readonly<
  MasterArticleOriginalityReferenceV1
>[] {
  const serp =
    runtime.serpResearch;

  if (!serp) {
    return Object.freeze(
      []
    );
  }


  const record =
    serp as unknown as
      Record<string, unknown>;


  if (
    !Array.isArray(
      record.results
    )
  ) {
    return Object.freeze(
      []
    );
  }


  const output:
    Readonly<
      MasterArticleOriginalityReferenceV1
    >[] =
      [];


  for (
    const raw
    of record.results
  ) {
    if (
      !isRecord(
        raw
      )
    ) {
      continue;
    }


    const url =
      cleanString(
        raw.url
      );

    if (!url) {
      continue;
    }


    const text =
      buildSerpReferenceText(
        raw
      );

    if (!text) {
      continue;
    }


    const title =
      cleanString(
        raw.title
      );


    output.push(
      Object.freeze({
        /*
         * URL is already the canonical identity of this
         * observed SERP result. No invented database ID.
         */
        id:
          url,

        label:
          title ??
          url,

        text,
      })
    );
  }


  return Object.freeze(
    output
  );
}


function buildCannibalizationCandidates(
  runtime:
    Readonly<MasterRuntimeSnapshotV1>
): readonly Readonly<
  MasterArticleCannibalizationCandidateV1
>[] {
  const ownership =
    runtime.urlOwnership;

  if (!ownership) {
    return Object.freeze(
      []
    );
  }


  const record =
    ownership as unknown as
      Record<string, unknown>;


  if (
    !Array.isArray(
      record.candidates
    )
  ) {
    return Object.freeze(
      []
    );
  }


  const output:
    Readonly<
      MasterArticleCannibalizationCandidateV1
    >[] =
      [];


  for (
    const raw
    of record.candidates
  ) {
    if (
      !isRecord(
        raw
      )
    ) {
      continue;
    }


    const url =
      cleanString(
        raw.url
      );

    const matchedQueries =
      stringArray(
        raw.matchedQueries
      );

    const intentMatch =
      typeof raw.intentMatch ===
      "boolean"
        ? raw.intentMatch
        : null;

    const queryOverlap =
      finiteNumber(
        raw.queryOverlap
      );

    const matchedImpressions =
      finiteNumber(
        raw.matchedImpressions
      );

    const missionAffinity =
      finiteNumber(
        raw.missionAffinity
      );


    /*
     * normalizeMasterRuntimeUrlOwnershipV1 already rejects
     * malformed persisted candidates. These guards ensure this
     * adapter itself still fails closed if called with a forged
     * runtime object in a unit test.
     */
    if (
      !url ||
      intentMatch ===
        null ||
      queryOverlap ===
        null ||
      matchedImpressions ===
        null ||
      missionAffinity ===
        null
    ) {
      continue;
    }


    const title =
      cleanString(
        raw.title
      );

    const h1 =
      cleanString(
        raw.h1
      );


    /*
     * DO NOT map matchedQueries -> queryNodeIds.
     * One is observed query text; the other is graph identity.
     */
    const queryNodeIds =
      stringArray(
        raw.queryNodeIds
      );


    const summaryParts = [
      matchedQueries.length >
        0
        ? `Observed matched queries: ${matchedQueries.join(", ")}`
        : null,

      `Intent match: ${intentMatch ? "yes" : "no"}`,

      `Query overlap: ${queryOverlap}`,

      `Matched impressions: ${matchedImpressions}`,

      `Mission affinity: ${missionAffinity}`,
    ].filter(
      (
        value
      ): value is string =>
        Boolean(
          value
        )
    );


    output.push(
      Object.freeze({
        id:
          url,

        url,

        title,

        h1,

        queryNodeIds,

        matchedQueries,

        intentMatch,

        queryOverlap,

        matchedImpressions,

        missionAffinity,

        summary:
          summaryParts.join(
            "\n"
          ),
      })
    );
  }


  return Object.freeze(
    output
  );
}


export function buildMasterArticleSemanticCriticContextV1(
  runtime:
    Readonly<MasterRuntimeSnapshotV1>
): Readonly<
  MasterArticleSemanticCriticContextV1
> {
  return Object.freeze({
    originalityReferences:
      buildOriginalityReferences(
        runtime
      ),

    cannibalizationCandidates:
      buildCannibalizationCandidates(
        runtime
      ),
  });
}
