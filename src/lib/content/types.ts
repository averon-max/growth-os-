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

export interface ContentBriefInput {
  topic: string;
  reason: string;
  recommendation: string;
  businessName: string;
  websiteUrl: string;
  topKeywords?: KeywordContextItem[];
  relatedKeywords?: RelatedKeywordContextItem[];
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
