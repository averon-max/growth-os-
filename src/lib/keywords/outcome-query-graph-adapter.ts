import {
  normalizeQueryGraphObservedQueryV1,
  type QueryGraph,
} from "../content/query-graph";

import {
  buildQueryGroupCheckpointOutcomeV1,
  type QueryGroupObservedSignalV1,
} from "./outcome-query-groups";

import type {
  OutcomeCheckpoint,
} from "./outcome-service";


export const QUERY_OUTCOME_GRAPH_ADAPTER_VERSION =
  "QUERY_OUTCOME_GRAPH_ADAPTER_V1" as const;


export interface ObservedGscQueryRowV1 {
  query:
    string;

  pageUrl:
    string | null;

  impressions:
    number | null;

  clicks:
    number | null;

  ctr:
    number | null;

  position:
    number | null;
}


export interface QueryOutcomeSectionV1 {
  /*
   * SectionBlueprint currently has no canonical section ID.
   *
   * We intentionally do NOT manufacture one.
   */
  heading:
    string;

  queryNodeIds:
    readonly string[];
}


export interface UnmappedObservedQueryV1 {
  query:
    string;

  normalizedQuery:
    string;

  pageUrl:
    string | null;

  impressions:
    number | null;

  clicks:
    number | null;

  ctr:
    number | null;

  position:
    number | null;
}


interface AggregatedObservedQuery {
  query:
    string;

  normalizedQuery:
    string;

  pageUrl:
    string | null;

  impressions:
    number | null;

  clicks:
    number | null;

  ctr:
    number | null;

  position:
    number | null;
}


function finiteOrNull(
  value:
    number | null
): number | null {
  return (
    value !==
      null &&
    Number.isFinite(
      value
    )
  )
    ? value
    : null;
}


function aggregateObservedRows(
  rows:
    readonly Readonly<
      ObservedGscQueryRowV1
    >[]
):
  readonly Readonly<
    AggregatedObservedQuery
  >[] {
  const buckets =
    new Map<
      string,
      {
        query:
          string;

        normalizedQuery:
          string;

        pageUrl:
          string | null;

        impressions:
          number;

        impressionsObserved:
          boolean;

        clicks:
          number;

        clicksObserved:
          boolean;

        allCtrPresent:
          boolean;

        ctrValues:
          number[];

        weightedPosition:
          number;

        positionWeight:
          number;
      }
    >();


  const ordered =
    [...rows]
      .map(
        (
          row
        ) => ({
          ...row,

          query:
            row.query.trim(),

          normalizedQuery:
            normalizeQueryGraphObservedQueryV1(
              row.query
            ),
        })
      )
      .filter(
        (
          row
        ) =>
          row.query.length >
            0 &&
          row.normalizedQuery.length >
            0
      )
      .sort(
        (
          a,
          b
        ) =>
          a.normalizedQuery.localeCompare(
            b.normalizedQuery
          ) ||
          (
            a.pageUrl ??
            ""
          ).localeCompare(
            b.pageUrl ??
            ""
          ) ||
          a.query.localeCompare(
            b.query
          )
      );


  for (
    const row
    of ordered
  ) {
    const key =
      [
        row.normalizedQuery,
        row.pageUrl ??
          "",
      ].join(
        "\u0000"
      );


    const bucket =
      buckets.get(
        key
      ) ?? {
        query:
          row.query,

        normalizedQuery:
          row.normalizedQuery,

        pageUrl:
          row.pageUrl,

        impressions:
          0,

        impressionsObserved:
          false,

        clicks:
          0,

        clicksObserved:
          false,

        allCtrPresent:
          true,

        ctrValues:
          [],

        weightedPosition:
          0,

        positionWeight:
          0,
      };


    const impressions =
      finiteOrNull(
        row.impressions
      );

    if (
      impressions !==
      null
    ) {
      bucket.impressions +=
        impressions;

      bucket.impressionsObserved =
        true;
    }


    const clicks =
      finiteOrNull(
        row.clicks
      );

    if (
      clicks !==
      null
    ) {
      bucket.clicks +=
        clicks;

      bucket.clicksObserved =
        true;
    }


    const ctr =
      finiteOrNull(
        row.ctr
      );

    if (
      ctr ===
      null
    ) {
      bucket.allCtrPresent =
        false;
    } else {
      bucket.ctrValues.push(
        ctr
      );
    }


    const position =
      finiteOrNull(
        row.position
      );

    if (
      position !==
      null
    ) {
      const weight =
        impressions !==
          null &&
        impressions >
          0
          ? impressions
          : 1;

      bucket.weightedPosition +=
        position *
        weight;

      bucket.positionWeight +=
        weight;
    }


    buckets.set(
      key,
      bucket
    );
  }


  return Object.freeze(
    Array.from(
      buckets.values()
    ).map(
      (
        bucket
      ) => {
        const impressions =
          bucket
            .impressionsObserved
            ? bucket.impressions
            : null;

        const clicks =
          bucket
            .clicksObserved
            ? bucket.clicks
            : null;


        /*
         * Missing CTR remains missing.
         *
         * We only aggregate CTR when every underlying row
         * actually supplied CTR.
         */
        const ctr =
          bucket
              .allCtrPresent &&
          bucket
            .ctrValues.length >
            0
            ? (
                impressions !==
                  null &&
                impressions >
                  0 &&
                clicks !==
                  null
                  ? clicks /
                    impressions
                  : bucket
                      .ctrValues
                      .reduce(
                        (
                          sum,
                          value
                        ) =>
                          sum +
                          value,
                        0
                      ) /
                    bucket
                      .ctrValues
                      .length
              )
            : null;


        const position =
          bucket
            .positionWeight >
          0
            ? bucket
                .weightedPosition /
              bucket
                .positionWeight
            : null;


        return Object.freeze({
          query:
            bucket.query,

          normalizedQuery:
            bucket
              .normalizedQuery,

          pageUrl:
            bucket.pageUrl,

          impressions,

          clicks,

          ctr,

          position,
        });
      }
    )
  );
}


export function buildQueryOutcomeCheckpointFromGraphV1({
  checkpoint,
  queryGraph,
  sections,
  rows,
}: {
  checkpoint:
    OutcomeCheckpoint;

  queryGraph:
    Readonly<QueryGraph>;

  sections:
    readonly Readonly<
      QueryOutcomeSectionV1
    >[];

  rows:
    readonly Readonly<
      ObservedGscQueryRowV1
    >[];
}) {
  const nodeByNormalized =
    new Map<
      string,
      QueryGraph["nodes"][number]
    >();


  for (
    const node
    of queryGraph.nodes
  ) {
    const existing =
      nodeByNormalized.get(
        node.normalizedQuery
      );

    if (
      existing &&
      existing.id !==
        node.id
    ) {
      throw new Error(
        `QUERY_OUTCOME_DUPLICATE_NORMALIZED_GRAPH_NODE:${node.normalizedQuery}`
      );
    }

    nodeByNormalized.set(
      node.normalizedQuery,
      node
    );
  }


  const samePageNodeIds =
    new Set(
      queryGraph
        .samePageNodeIds
    );


  const sectionHeadingsByNode =
    new Map<
      string,
      string[]
    >();


  for (
    const section
    of sections
  ) {
    for (
      const queryNodeId
      of section
        .queryNodeIds
    ) {
      const values =
        sectionHeadingsByNode.get(
          queryNodeId
        ) ?? [];

      values.push(
        section.heading
      );

      sectionHeadingsByNode.set(
        queryNodeId,
        values
      );
    }
  }


  const aggregated =
    aggregateObservedRows(
      rows
    );


  const signals:
    QueryGroupObservedSignalV1[] =
      [];

  const unmappedQueries:
    UnmappedObservedQueryV1[] =
      [];

  const ambiguousSectionNodeIds =
    new Set<string>();


  for (
    const row
    of aggregated
  ) {
    const node =
      nodeByNormalized.get(
        row.normalizedQuery
      );


    /*
     * Critical invariant:
     *
     * An observed GSC query that was not present in the
     * persisted QueryGraph remains unmapped.
     *
     * No nearest-neighbour, lexical, fuzzy or AI inference.
     */
    if (
      !node
    ) {
      unmappedQueries.push({
        query:
          row.query,

        normalizedQuery:
          row.normalizedQuery,

        pageUrl:
          row.pageUrl,

        impressions:
          row.impressions,

        clicks:
          row.clicks,

        ctr:
          row.ctr,

        position:
          row.position,
      });

      continue;
    }


    const sectionHeadings =
      sectionHeadingsByNode.get(
        node.id
      ) ?? [];


    let sectionHeading:
      string | null =
        null;


    if (
      sectionHeadings.length ===
      1
    ) {
      sectionHeading =
        sectionHeadings[0] ??
        null;
    } else if (
      sectionHeadings.length >
      1
    ) {
      /*
       * Do not arbitrarily pick a section if the persisted
       * blueprint assigns the same node more than once.
       */
      ambiguousSectionNodeIds.add(
        node.id
      );
    }


    signals.push({
      checkpoint,

      query:
        row.query,

      intent:
        node.intent,

      cluster:
        node.cluster,

      subIntent:
        node.subIntent,

      /*
       * Mission attribution comes only from the persisted
       * QueryGraph boundary decision.
       */
      sameMissionEvidence:
        samePageNodeIds.has(
          node.id
        ),

      sourceConfidence:
        node.sourceConfidence,

      pageUrl:
        row.pageUrl,

      queryNodeId:
        node.id,

      /*
       * SectionBlueprint has no canonical section ID.
       * Never manufacture one.
       */
      sectionId:
        null,

      sectionHeading,

      impressions:
        row.impressions,

      clicks:
        row.clicks,

      ctr:
        row.ctr,

      position:
        row.position,
    });
  }


  const outcome =
    buildQueryGroupCheckpointOutcomeV1({
      checkpoint,
      signals,
    });


  return Object.freeze({
    version:
      QUERY_OUTCOME_GRAPH_ADAPTER_VERSION,

    checkpoint,

    outcome,

    mappedQueryCount:
      signals.length,

    mappedSignals:
      Object.freeze([
        ...signals,
      ]),

    unmappedQueryCount:
      unmappedQueries.length,

    unmappedQueries:
      Object.freeze(
        unmappedQueries
      ),

    ambiguousSectionQueryNodeIds:
      Object.freeze(
        Array.from(
          ambiguousSectionNodeIds
        ).sort()
      ),

    provenance:
      Object.freeze({
        queryMatch:
          "EXACT_QUERY_GRAPH_NORMALIZED_QUERY_ONLY" as const,

        missionAttribution:
          "QUERY_GRAPH_SAME_PAGE_NODE_IDS" as const,

        sectionAttribution:
          "PERSISTED_SECTION_BLUEPRINT_QUERY_NODE_IDS" as const,

        inventedQueryNodeIds:
          false as const,

        inventedSectionIds:
          false as const,

        fuzzyMatching:
          false as const,

        semanticInference:
          false as const,
      }),
  });
}
