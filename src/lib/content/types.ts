export interface ContentOutlineSection {
  heading: string;
  level: 2 | 3;
  summary: string;
}

export interface ContentBriefInput {
  topic: string;
  reason: string;
  recommendation: string;
  businessName: string;
  websiteUrl: string;
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
