export interface ContentOutlineSection {
  heading: string;
  level: 2 | 3;
  summary: string;
}

export interface KeywordContextItem {
  keyword: string;
  volume: number | null;
  difficulty: number | null;
  position: number | null;
  clicks: number;
  impressions: number;
}

export interface RelatedKeywordContextItem {
  keyword: string;
  searchVolume: number | null;
  cpc: number | null;
  keywordDifficulty: number | null;
}

export type ContentSearchIntent =
  | "INFORMATIONAL"
  | "COMMERCIAL"
  | "TRANSACTIONAL"
  | "NAVIGATIONAL";

export type ContentAction =
  | "CREATE_NEW"
  | "UPDATE_EXISTING"
  | "MERGE_OR_UPDATE";

export interface MonthlySearchPoint {
  year: number;
  month: number;
  searchVolume: number;
}

export interface KeywordTrendAnalysis {
  points: MonthlySearchPoint[];
  average12m: number | null;
  average3m: number | null;
  previous3mAverage: number | null;
  momentumPct: number | null;
  peakVolume: number | null;
  latestVolume: number | null;
  seasonal: boolean;
}

export interface KeywordScoreBreakdown {
  intentMatch: number;
  businessRelevance: number;
  rankability: number;
  demand: number;
  trendMomentum: number;
  gscOpportunity: number;
  commercialValue: number;
  topicalAuthority: number;
  penalties: number;
}

export interface ContentStrategyKeyword {
  keyword: string;
  score: number;
  source: string[];
  searchVolume: number | null;
  difficulty: number | null;
  cpc: number | null;
  existingPosition: number | null;
  impressions: number;
  clicks: number;
  intent: ContentSearchIntent;
  trend: KeywordTrendAnalysis;
  breakdown: KeywordScoreBreakdown;
  reasons: string[];
}

export interface ContentStrategy {
  topic: string;
  searchIntent: ContentSearchIntent;

  action: {
    type: ContentAction;
    existingBriefId: string | null;
    existingTopic: string | null;
    similarity: number;
    reason: string;
  };

  primary: ContentStrategyKeyword;
  secondary: ContentStrategyKeyword[];
  supporting: ContentStrategyKeyword[];
  excluded: ContentStrategyKeyword[];

  headingPolicy: {
    h1: 1;
    h2: "AS_NEEDED";
    h3: "ONLY_WHEN_NEEDED";
    maxDepth: 3;
    noOrphanH3: true;
    noDuplicateHeadings: true;
    noHeadingForKeywordStuffing: true;
  };

  qualityRequirements: {
    oneH1: true;
    directAnswer: true;
    noKeywordStuffing: true;
    semanticHeadings: true;
    internalLinks: true;
    sourceEvidenceWhenNeeded: true;
    articleSchema: true;
    breadcrumbSchema: true;
    authorMetadata: true;
    datePublished: true;
    dateModified: true;
  };

  measurementPlan: {
    searchConsole: true;
    rankTracking: true;
    ga4: true;
    cloudflareVerifiedBots: true;
    aiCrawlerReadiness: true;
  };
}

export interface ContentBriefInput {
  topic: string;
  reason: string;
  recommendation: string;
  businessName: string;
  websiteUrl: string;
  topKeywords?: KeywordContextItem[];
  relatedKeywords?: RelatedKeywordContextItem[];
  strategy?: ContentStrategy;
}

export interface GeneratedBrief {
  searchIntent: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  outline: ContentOutlineSection[];
}

export interface GeneratedArticle {
  title: string;
  metaDescription: string;
  h1: string;
  bodyMarkdown: string;
}
