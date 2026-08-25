import { SEOIssueResult, Severity } from "./rules";

export interface SEOScore {
  overallScore: number;
  technicalScore: number;
  contentScore: number;
  structureScore: number;
  indexabilityScore: number;
}

interface PenaltyConfig {
  category: "technical" | "content" | "structure" | "indexability";
  points: number;
  maxPenalty?: number;
}

const PENALTIES: Record<string, PenaltyConfig> = {
  MISSING_TITLE:              { category: "technical",     points: 15, maxPenalty: 30 },
  TITLE_TOO_LONG:             { category: "technical",     points: 2,  maxPenalty: 10 },
  TITLE_TOO_SHORT:            { category: "technical",     points: 1,  maxPenalty: 5  },
  DUPLICATE_TITLE:            { category: "technical",     points: 5,  maxPenalty: 20 },
  MISSING_META_DESCRIPTION:   { category: "content",       points: 4,  maxPenalty: 20 },
  META_DESCRIPTION_TOO_LONG:  { category: "content",       points: 1,  maxPenalty: 5  },
  DUPLICATE_META_DESCRIPTION: { category: "content",       points: 3,  maxPenalty: 15 },
  MISSING_H1:                 { category: "structure",     points: 8,  maxPenalty: 20 },
  MULTIPLE_H1:                { category: "structure",     points: 3,  maxPenalty: 10 },
  MISSING_CANONICAL:          { category: "indexability",  points: 4,  maxPenalty: 20 },
  IMAGE_MISSING_ALT:          { category: "content",       points: 2,  maxPenalty: 10 },
  THIN_CONTENT:               { category: "content",       points: 5,  maxPenalty: 20 },
  MISSING_SCHEMA:             { category: "technical",     points: 1,  maxPenalty: 10 },
  ORPHAN_PAGE:                { category: "structure",     points: 4,  maxPenalty: 15 },
  BROKEN_INTERNAL_LINK:       { category: "technical",     points: 8,  maxPenalty: 25 },
};

const WEIGHTS = {
  technical:    0.35,
  content:      0.30,
  structure:    0.20,
  indexability: 0.15,
};

export function calculateScore(issues: SEOIssueResult[]): SEOScore {
  // Group penalties by type to respect maxPenalty
  const penaltyByType = new Map<string, number>();

  for (const issue of issues) {
    const config = PENALTIES[issue.type];
    if (!config) continue;

    const current = penaltyByType.get(issue.type) || 0;
    const max = config.maxPenalty ?? 100;
    const newTotal = Math.min(current + config.points, max);
    penaltyByType.set(issue.type, newTotal);
  }

  // Sum penalties by category
  let technicalPenalty = 0;
  let contentPenalty = 0;
  let structurePenalty = 0;
  let indexabilityPenalty = 0;

  for (const [type, penalty] of penaltyByType) {
    const config = PENALTIES[type];
    if (!config) continue;
    switch (config.category) {
      case "technical":    technicalPenalty    += penalty; break;
      case "content":      contentPenalty      += penalty; break;
      case "structure":    structurePenalty    += penalty; break;
      case "indexability": indexabilityPenalty += penalty; break;
    }
  }

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  const technicalScore    = clamp(100 - technicalPenalty);
  const contentScore      = clamp(100 - contentPenalty);
  const structureScore    = clamp(100 - structurePenalty);
  const indexabilityScore = clamp(100 - indexabilityPenalty);

  const overallScore = clamp(
    technicalScore    * WEIGHTS.technical +
    contentScore      * WEIGHTS.content +
    structureScore    * WEIGHTS.structure +
    indexabilityScore * WEIGHTS.indexability
  );

  return {
    overallScore,
    technicalScore,
    contentScore,
    structureScore,
    indexabilityScore,
  };
}

export function getSeverityCounts(issues: SEOIssueResult[]): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };
  for (const issue of issues) {
    counts[issue.severity] = (counts[issue.severity] || 0) + 1;
  }
  return counts;
}
