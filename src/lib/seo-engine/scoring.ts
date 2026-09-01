import { SEOIssueResult, Severity } from "./rules";

export interface SEOScore {
  overallScore: number;
  technicalScore: number;
  contentScore: number;
  structureScore: number;
  indexabilityScore: number;
}

type Category = "technical" | "content" | "structure" | "indexability";

interface PenaltyConfig {
  category: Category;
  maxPenalty: number;
}

// Base points are driven by severity — the same severity level always costs
// the same amount, regardless of issue type. This is what makes scores
// explainable: a HIGH issue costs exactly SEVERITY_POINTS.HIGH, full stop.
const SEVERITY_POINTS: Record<Severity, number> = {
  CRITICAL: 25,
  HIGH: 12,
  MEDIUM: 5,
  LOW: 2,
};

// maxPenalty still varies per type: it caps how much *repetition* of the
// same issue across many pages can cost within its category, independent
// of severity. A site with THIN_CONTENT on 40 pages shouldn't zero out
// content score from one issue type alone.
const CATEGORY_AND_CAP: Record<string, PenaltyConfig> = {
  MISSING_TITLE:              { category: "technical",    maxPenalty: 50 },
  TITLE_TOO_LONG:             { category: "technical",    maxPenalty: 20 },
  TITLE_TOO_SHORT:            { category: "technical",    maxPenalty: 15 },
  DUPLICATE_TITLE:            { category: "technical",    maxPenalty: 30 },
  MISSING_META_DESCRIPTION:   { category: "content",      maxPenalty: 30 },
  META_DESCRIPTION_TOO_LONG:  { category: "content",      maxPenalty: 15 },
  DUPLICATE_META_DESCRIPTION: { category: "content",      maxPenalty: 25 },
  MISSING_H1:                 { category: "structure",    maxPenalty: 30 },
  MULTIPLE_H1:                { category: "structure",    maxPenalty: 20 },
  MISSING_CANONICAL:          { category: "indexability", maxPenalty: 30 },
  IMAGE_MISSING_ALT:          { category: "content",      maxPenalty: 20 },
  THIN_CONTENT:               { category: "content",      maxPenalty: 30 },
  MISSING_SCHEMA:             { category: "technical",    maxPenalty: 15 },
  ORPHAN_PAGE:                { category: "structure",    maxPenalty: 25 },
  BROKEN_INTERNAL_LINK:       { category: "technical",    maxPenalty: 35 },
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
    const config = CATEGORY_AND_CAP[issue.type];
    if (!config) continue;

    const points = SEVERITY_POINTS[issue.severity];
    const current = penaltyByType.get(issue.type) || 0;
    const newTotal = Math.min(current + points, config.maxPenalty);
    penaltyByType.set(issue.type, newTotal);
  }

  // Sum penalties by category
  let technicalPenalty = 0;
  let contentPenalty = 0;
  let structurePenalty = 0;
  let indexabilityPenalty = 0;

  for (const [type, penalty] of penaltyByType) {
    const config = CATEGORY_AND_CAP[type];
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
