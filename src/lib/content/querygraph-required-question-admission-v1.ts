import type {
  QueryGraph,
} from "./query-graph";

import type {
  IntentBoundaryDecision,
} from "./intent-boundary";


export interface QueryGraphRequiredQuestionAdmissionV1 {
  readonly question:
    string;

  readonly normalizedQuestion:
    string;

  readonly queryNodeId:
    string | null;

  readonly decision:
    IntentBoundaryDecision | "UNOBSERVED";

  readonly admitted:
    boolean;
}


function normalizeQuestionV1(
  value:
    string
): string {
  return value
    .trim()
    .toLocaleLowerCase(
      "en-US"
    )
    .replace(
      /[^\p{L}\p{N}]+/gu,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


/*
 * QUERYGRAPH_REQUIRED_QUESTION_ADMISSION_V1
 *
 * QueryGraph remains the boundary authority.
 *
 * SAME_PAGE:
 *   eligible for mandatory ArticleExecutionPlan coverage.
 *
 * CLUSTER / SEPARATE_PAGE / MERGE / UNCERTAIN:
 *   preserved as research/search-strategy signals,
 *   but may not become mandatory Writer coverage.
 *
 * UNOBSERVED:
 *   fail-closed from mandatory execution.
 */
export function deriveQueryGraphRequiredQuestionAdmissionV1({
  queryGraph,
  questions,
}: {
  queryGraph:
    Readonly<QueryGraph>;

  questions:
    readonly string[];
}): readonly QueryGraphRequiredQuestionAdmissionV1[] {
  const boundaryByNodeId =
    new Map(
      queryGraph
        .boundaries
        .map(
          (
            boundary
          ) => [
            boundary.nodeId,
            boundary,
          ] as const
        )
    );


  const nodeByNormalizedQuery =
    new Map(
      queryGraph
        .nodes
        .map(
          (
            node
          ) => [
            normalizeQuestionV1(
              node.normalizedQuery ||
              node.query
            ),
            node,
          ] as const
        )
    );


  return Object.freeze(
    questions.map(
      (
        rawQuestion
      ) => {
        const question =
          rawQuestion.trim();

        const normalizedQuestion =
          normalizeQuestionV1(
            question
          );

        const node =
          nodeByNormalizedQuery.get(
            normalizedQuestion
          );


        if (!node) {
          return Object.freeze({
            question,
            normalizedQuestion,

            queryNodeId:
              null,

            decision:
              "UNOBSERVED" as const,

            admitted:
              false,
          });
        }


        const boundary =
          boundaryByNodeId.get(
            node.id
          );


        if (!boundary) {
          return Object.freeze({
            question,
            normalizedQuestion,

            queryNodeId:
              node.id,

            decision:
              "UNOBSERVED" as const,

            admitted:
              false,
          });
        }


        return Object.freeze({
          question,
          normalizedQuestion,

          queryNodeId:
            node.id,

          decision:
            boundary.decision,

          admitted:
            boundary.decision ===
              "SAME_PAGE",
        });
      }
    )
  );
}


export function queryGraphQuestionAdmissionSignatureV1({
  queryGraph,
  questions,
}: {
  queryGraph:
    Readonly<QueryGraph>;

  questions:
    readonly string[];
}): string {
  return JSON.stringify(
    deriveQueryGraphRequiredQuestionAdmissionV1({
      queryGraph,
      questions,
    })
      .map(
        (
          item
        ) => ({
          question:
            item.normalizedQuestion,

          decision:
            item.decision,

          admitted:
            item.admitted,
        })
      )
      .sort(
        (
          left,
          right
        ) =>
          left.question.localeCompare(
            right.question
          )
      )
  );
}
