export interface SEOIssueLike {
  type: string;
  severity: string;
  pageUrl: string | null;
  description: string;
  recommendation: string;
}

export interface Suggestion {
  field: "title" | "metaDescription" | "h1";
  currentValue: string | null;
  suggestedValue: string;
  rationale: string;
}

const TITLE_MAX_LENGTH = 60;
const META_DESCRIPTION_MAX_LENGTH = 155;

export function generateSuggestion(issue: SEOIssueLike): Suggestion | null {
  switch (issue.type) {
    case "MISSING_TITLE":
    case "TITLE_TOO_LONG":
    case "TITLE_TOO_SHORT":
      return {
        field: "title",
        currentValue: null,
        suggestedValue: issue.recommendation.slice(0, TITLE_MAX_LENGTH),
        rationale: issue.description,
      };

    case "MISSING_META_DESCRIPTION":
    case "META_DESCRIPTION_TOO_LONG":
      return {
        field: "metaDescription",
        currentValue: null,
        suggestedValue: issue.recommendation.slice(0, META_DESCRIPTION_MAX_LENGTH),
        rationale: issue.description,
      };

    case "MISSING_H1":
      return {
        field: "h1",
        currentValue: null,
        suggestedValue: issue.recommendation,
        rationale: issue.description,
      };

    default:
      return null;
  }
}
