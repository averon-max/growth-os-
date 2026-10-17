/** Pure content strategy prompt projection; identical output to prior service implementation. */
import type { ContentStrategy } from "./types";

export function strategyPrompt(
  strategy:
    ContentStrategy
): string {
  const secondary =
    strategy.secondary
      .map(
        (item) =>
          item.keyword
      )
      .join(", ");

  /*
   * SECONDARY_CLUSTER_PRODUCTION_PROJECTION_V2
   *
   * Supporting discovery candidates remain research-only.
   * They are not promoted into article keywords.
   *
   * Production keyword authority:
   * primary + Keyword Decision secondary.
   *
   * QueryGraph remains downstream SAME_PAGE authority.
   */
  return [
    "CONTENT STRATEGY:",
    `Intent: ${strategy.searchIntent}`,
    `Primary keyword: ${strategy.primary.keyword}`,
    secondary
      ? `Secondary keywords: ${secondary}`
      : "",
    `Page decision: ${strategy.action.type}`,
    "Use exactly one page-level H1.",
    "There is NO target number of H2 or H3 headings.",
    "Create an H2 only for a genuinely distinct major sub-intent, question, process stage, comparison, or concept required to satisfy the query.",
    "Create an H3 only when one specific H2 genuinely needs subdivision. Never add H3 headings merely to increase structure.",
    "Do not create headings solely to repeat keywords.",
    "Answer the main query directly near the beginning.",
    "Avoid keyword stuffing.",
    "Keep synonymous queries with the same intent on one page.",
    "Do not invent facts, statistics, sources, security claims, or studies.",
    "Prefer concise definitions, direct answers, lists, steps, comparisons, and extractable factual statements where appropriate.",
  ]
    .filter(Boolean)
    .join("\n");
}
