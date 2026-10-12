import type { ContentStrategy, ContentStrategyKeyword } from "./types";
import type { ContentGenerationPolicyV1 } from "./content-generation-mode-v1";

export type ResearchDecisionV2 = Readonly<{
  version: "RESEARCH_DECISION_V2";
  mode: ContentGenerationPolicyV1["mode"];
  primary: Readonly<{
    keyword: string;
    intent: ContentStrategyKeyword["intent"];
    observedSearchVolume: number | null;
    observedDifficulty: number | null;
    observedCpc: number | null;
    gscPosition: number | null;
    gscImpressions: number;
    gscClicks: number;
    sources: readonly string[];
  }>;
  secondary: readonly string[];
  supporting: readonly string[];
  pageAction: ContentStrategy["action"]["type"];
  warnings: readonly string[];
}>;

/** One read-only projection of the EXISTING keyword decision.
 * This module neither scores/selects another winner nor invents metrics.
 */
export function buildResearchDecisionV2({
  policy,
  strategy,
}: {
  policy: Readonly<ContentGenerationPolicyV1>;
  strategy: Readonly<ContentStrategy>;
}): ResearchDecisionV2 {
  const keyword = strategy.primary;
  const warnings: string[] = [];
  if (keyword.searchVolume === null) warnings.push("SEARCH_VOLUME_NOT_OBSERVED");
  if (keyword.difficulty === null) warnings.push("DIFFICULTY_NOT_OBSERVED");
  if (keyword.existingPosition === null) warnings.push("GSC_POSITION_NOT_OBSERVED");
  if (policy.mode === "EXACT_KEYWORD") {
    const expected = (policy.exactKeyword ?? policy.requestedTopic)
      .trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
    const actual = keyword.keyword.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
    if (actual !== expected) throw new Error("RESEARCH_DECISION_EXACT_PRIMARY_DRIFT");
  }
  return Object.freeze({
    version: "RESEARCH_DECISION_V2",
    mode: policy.mode,
    primary: Object.freeze({
      keyword: keyword.keyword,
      intent: keyword.intent,
      observedSearchVolume: keyword.searchVolume,
      observedDifficulty: keyword.difficulty,
      observedCpc: keyword.cpc,
      gscPosition: keyword.existingPosition,
      gscImpressions: keyword.impressions,
      gscClicks: keyword.clicks,
      sources: Object.freeze([...keyword.source]),
    }),
    secondary: Object.freeze(strategy.secondary.map(item => item.keyword)),
    supporting: Object.freeze(strategy.supporting.map(item => item.keyword)),
    pageAction: strategy.action.type,
    warnings: Object.freeze(warnings),
  });
}
