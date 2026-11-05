// Verified official documentation. URLs confirmed on Google's own sites (Oct 2026).
// Only add a URL after confirming it exists: the writer is told these are real.
export interface AuthoritativeSource {
  title: string;
  url: string;
  tags: string[];
}

export const AUTHORITATIVE_SOURCES: AuthoritativeSource[] = [
  { title: "Google Search Central: Creating helpful, reliable, people-first content", url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content", tags: ["seo", "content", "helpful", "quality", "e-e-a-t", "eeat", "expertise", "authority", "topical", "mistake", "ranking"] },
  { title: "Google Search Central: In-depth guide to how Google Search works", url: "https://developers.google.com/search/docs/fundamentals/how-search-works", tags: ["seo", "how it works", "crawl", "index", "ranking", "works"] },
  { title: "Google Search Central: SEO Starter Guide", url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide", tags: ["seo", "basics", "beginner", "on-page", "what is seo"] },
  { title: "Google Search Essentials", url: "https://developers.google.com/search/docs/essentials", tags: ["seo", "guidelines", "spam", "quality"] },
  { title: "Google Search Central: AI features and your website", url: "https://developers.google.com/search/docs/appearance/ai-features", tags: ["ai overview", "ai mode", "aeo", "geo", "answer engine", "generative", "ai search", "zero-click"] },
  { title: "Google Search Central: Optimizing for generative AI features on Google Search", url: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide", tags: ["ai overview", "aeo", "geo", "answer engine", "generative", "ai search", "citation"] },
  { title: "Google Search Central Blog: Top ways to ensure your content performs well in Google's AI experiences (2025)", url: "https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search", tags: ["ai overview", "aeo", "geo", "ai search", "generative", "answer engine"] },
  { title: "Google Search Central Blog: Search generative AI performance reports in Search Console (2026)", url: "https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports", tags: ["measure", "aeo", "geo", "ai overview", "search console", "metrics", "visibility"] },
  { title: "Google Search Central: Guidance on generative AI content on your website", url: "https://developers.google.com/search/docs/fundamentals/using-gen-ai-content", tags: ["ai content", "ai-generated", "generative", "mistake", "scale"] },
  { title: "Google Search Central: Spam policies for Google web search", url: "https://developers.google.com/search/docs/essentials/spam-policies", tags: ["spam", "backlink", "link", "mistake", "penalty", "manipulat"] },
  { title: "Google Search Central: SEO link best practices", url: "https://developers.google.com/search/docs/crawling-indexing/links-crawlable", tags: ["internal link", "link", "anchor", "topical", "cluster", "backlink"] },
  { title: "Google Search Central: Introduction to structured data markup", url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data", tags: ["schema", "structured data", "rich result", "markup", "entity", "aeo", "geo"] },
  { title: "Google Search Central: Influencing title links in Google Search", url: "https://developers.google.com/search/docs/appearance/title-link", tags: ["title", "ctr", "snippet", "on-page"] },
  { title: "Search Console Help: Performance report (Search results)", url: "https://support.google.com/webmasters/answer/7576553", tags: ["measure", "search console", "ctr", "impressions", "clicks", "position", "metrics"] },
  { title: "Search Console Help: Page indexing report", url: "https://support.google.com/webmasters/answer/7440203", tags: ["index", "crawl", "technical", "measure", "search console"] },
  { title: "Search Console Help: URL Inspection tool", url: "https://support.google.com/webmasters/answer/9012289", tags: ["index", "technical", "inspection", "crawl", "search console", "in practice"] },
  { title: "Google Analytics Help: About key events (GA4)", url: "https://support.google.com/analytics/answer/9267568", tags: ["ga4", "analytics", "conversion", "key event", "measure", "roi"] },
  { title: "Google Search Quality Rater Guidelines (September 2025)", url: "https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf", tags: ["e-e-a-t", "eeat", "quality rater", "expertise", "authority", "trust", "topical", "quality"] },
  { title: "Google Search Central Blog: Understanding news topic authority (2023)", url: "https://developers.google.com/search/blog/2023/05/understanding-news-topic-authority", tags: ["topical authority", "topical", "authority"] },
];

export function pickAuthoritativeSources(keyword: string, headings: string[], max = 6): AuthoritativeSource[] {
  const hay = `${keyword} ${headings.join(" ")}`.toLowerCase();
  return AUTHORITATIVE_SOURCES
    .map((s) => ({ s, score: s.tags.filter((t) => hay.includes(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.s);
}
