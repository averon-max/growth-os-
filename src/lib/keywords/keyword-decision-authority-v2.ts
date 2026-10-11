import { normalizeKeywordV2 } from "./keyword-intelligence-v2";

export interface ApprovedKeywordResearchV2 {
  version: "KEYWORD_INTELLIGENCE_RESEARCH_V2";
  websiteId: string;
  decision: {
    status: "SELECTED" | "REVIEW" | "NO_GO";
    selectedClusterId: string | null;
  };
  clusters: Array<{
    id: string;
    primary: {
      keyword: string;
    };
  }>;
}

/**
 * Only a prior stored, server-generated research snapshot can authorize the
 * primary keyword that will reach the existing EXACT_PRIMARY authority gate.
 * Never trust a keyword or cluster supplied directly by a client.
 */
export function resolveApprovedKeywordPrimaryV2(
  snapshot: unknown,
  websiteId: string,
): string {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error("KEYWORD_V2_SNAPSHOT_INVALID");
  }
  const record = snapshot as Record<string, unknown>;
  if (record.version !== "KEYWORD_INTELLIGENCE_RESEARCH_V2" ||
      record.websiteId !== websiteId) {
    throw new Error("KEYWORD_V2_SNAPSHOT_MISMATCH");
  }
  const decision = record.decision;
  if (!decision || typeof decision !== "object" || Array.isArray(decision)) {
    throw new Error("KEYWORD_V2_SNAPSHOT_DECISION_MISSING");
  }
  const choice = decision as Record<string, unknown>;
  if (choice.status !== "SELECTED" || typeof choice.selectedClusterId !== "string") {
    throw new Error("KEYWORD_V2_SNAPSHOT_NOT_SELECTED");
  }
  if (!Array.isArray(record.clusters)) {
    throw new Error("KEYWORD_V2_SNAPSHOT_CLUSTERS_MISSING");
  }
  const match = record.clusters.find((raw: unknown) =>
    Boolean(raw && typeof raw === "object" && !Array.isArray(raw) &&
      (raw as Record<string, unknown>).id === choice.selectedClusterId));
  if (!match || !match.primary ||
      typeof match.primary !== "object" || Array.isArray(match.primary) ||
      typeof match.primary.keyword !== "string" ||
      normalizeKeywordV2(match.primary.keyword).length < 3) {
    throw new Error("KEYWORD_V2_SNAPSHOT_WINNER_INVALID");
  }
  return match.primary.keyword.trim();
}
