export type ArticleCategory =
  | "informational"
  | "comparison"
  | "listicle"
  | "how-to"
  | "review"
  | "landing";

export interface ArticleTemplate {
  category: ArticleCategory;
  minWords: number;
  maxWords: number;
  h2Count: { min: number; max: number };
  h3PerH2: { min: number; max: number };
  mustHaveSections: string[];
  metaDescriptionLength: number;
  introWords: { min: number; max: number };
  conclusionWords: { min: number; max: number };
}

export const TEMPLATES: Record<ArticleCategory, ArticleTemplate> = {
  informational: {
    category: "informational",
    minWords: 1500,
    maxWords: 2500,
    h2Count: { min: 4, max: 7 },
    h3PerH2: { min: 0, max: 3 },
    mustHaveSections: ["What is", "How it works", "Key benefits", "FAQ"],
    metaDescriptionLength: 155,
    introWords: { min: 80, max: 150 },
    conclusionWords: { min: 80, max: 150 },
  },
  comparison: {
    category: "comparison",
    minWords: 2000,
    maxWords: 3500,
    h2Count: { min: 5, max: 8 },
    h3PerH2: { min: 2, max: 4 },
    mustHaveSections: ["Overview", "Key differences", "Pros and cons", "Which to choose", "FAQ"],
    metaDescriptionLength: 155,
    introWords: { min: 100, max: 180 },
    conclusionWords: { min: 100, max: 180 },
  },
  listicle: {
    category: "listicle",
    minWords: 1800,
    maxWords: 3000,
    h2Count: { min: 7, max: 15 },
    h3PerH2: { min: 0, max: 2 },
    mustHaveSections: ["Quick picks", "Detailed reviews", "How we chose", "FAQ"],
    metaDescriptionLength: 155,
    introWords: { min: 80, max: 130 },
    conclusionWords: { min: 60, max: 120 },
  },
  "how-to": {
    category: "how-to",
    minWords: 1200,
    maxWords: 2000,
    h2Count: { min: 4, max: 8 },
    h3PerH2: { min: 0, max: 3 },
    mustHaveSections: ["What you need", "Step-by-step", "Tips", "Common mistakes", "FAQ"],
    metaDescriptionLength: 155,
    introWords: { min: 60, max: 120 },
    conclusionWords: { min: 60, max: 100 },
  },
  review: {
    category: "review",
    minWords: 1500,
    maxWords: 2500,
    h2Count: { min: 5, max: 8 },
    h3PerH2: { min: 1, max: 3 },
    mustHaveSections: ["Overview", "Features", "Pricing", "Pros and cons", "Verdict"],
    metaDescriptionLength: 155,
    introWords: { min: 80, max: 150 },
    conclusionWords: { min: 80, max: 150 },
  },
  landing: {
    category: "landing",
    minWords: 800,
    maxWords: 1500,
    h2Count: { min: 3, max: 5 },
    h3PerH2: { min: 0, max: 2 },
    mustHaveSections: ["Hero", "Benefits", "How it works", "CTA"],
    metaDescriptionLength: 155,
    introWords: { min: 50, max: 100 },
    conclusionWords: { min: 50, max: 80 },
  },
};

export function getTemplate(category: ArticleCategory): ArticleTemplate {
  return TEMPLATES[category];
}
