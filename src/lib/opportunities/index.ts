import { SEOIssueResult } from "../seo-engine/rules";

export interface OpportunityResult {
  title: string;
  type: string;
  priority: string;
  score: number;
  reason: string;
  recommendation: string;
  affectedPages: number;
}

const OPPORTUNITY_DEFINITIONS: Array<{
  type: string;
  issueTypes: string[];
  title: string;
  oppType: string;
  priority: string;
  score: number;
  reason: string;
  recommendation: string;
}> = [
  {
    type: "fix_missing_titles",
    issueTypes: ["MISSING_TITLE"],
    title: "Add missing title tags",
    oppType: "TECHNICAL",
    priority: "HIGH",
    score: 90,
    reason: "Pages without title tags are invisible to search engines and get no clicks.",
    recommendation: "Write a unique descriptive title (30–60 chars) for each affected page.",
  },
  {
    type: "fix_duplicate_titles",
    issueTypes: ["DUPLICATE_TITLE"],
    title: "Fix duplicate title tags",
    oppType: "TECHNICAL",
    priority: "HIGH",
    score: 82,
    reason: "Duplicate titles confuse search engines about which page to rank.",
    recommendation: "Write a unique title for each page reflecting its specific content.",
  },
  {
    type: "fix_broken_links",
    issueTypes: ["BROKEN_INTERNAL_LINK"],
    title: "Fix broken internal links",
    oppType: "TECHNICAL",
    priority: "HIGH",
    score: 85,
    reason: "Broken links waste crawl budget and create a poor user experience.",
    recommendation: "Update or remove all internal links pointing to broken URLs.",
  },
  {
    type: "add_meta_descriptions",
    issueTypes: ["MISSING_META_DESCRIPTION"],
    title: "Add missing meta descriptions",
    oppType: "CONTENT",
    priority: "MEDIUM",
    score: 70,
    reason: "Missing meta descriptions reduce click-through rates from search results.",
    recommendation: "Write a compelling meta description (120–160 chars) for each affected page.",
  },
  {
    type: "fix_duplicate_descriptions",
    issueTypes: ["DUPLICATE_META_DESCRIPTION"],
    title: "Fix duplicate meta descriptions",
    oppType: "CONTENT",
    priority: "MEDIUM",
    score: 62,
    reason: "Duplicate meta descriptions reduce uniqueness and click-through rates.",
    recommendation: "Write a unique meta description for every page.",
  },
  {
    type: "add_h1_headings",
    issueTypes: ["MISSING_H1"],
    title: "Add missing H1 headings",
    oppType: "STRUCTURE",
    priority: "HIGH",
    score: 78,
    reason: "H1 tags help search engines understand the topic of each page.",
    recommendation: "Add a single descriptive H1 tag to each affected page.",
  },
  {
    type: "expand_thin_content",
    issueTypes: ["THIN_CONTENT"],
    title: "Expand thin content pages",
    oppType: "CONTENT",
    priority: "MEDIUM",
    score: 72,
    reason: "Pages with fewer than 300 words rarely rank well in competitive searches.",
    recommendation: "Expand content to at least 300 words with relevant, helpful information.",
  },
  {
    type: "fix_orphan_pages",
    issueTypes: ["ORPHAN_PAGE"],
    title: "Fix orphan pages",
    oppType: "STRUCTURE",
    priority: "MEDIUM",
    score: 64,
    reason: "Orphan pages receive no link equity and are difficult for search engines to discover.",
    recommendation: "Add internal links to orphan pages from relevant pages on your site.",
  },
  {
    type: "add_canonical_tags",
    issueTypes: ["MISSING_CANONICAL"],
    title: "Add canonical tags",
    oppType: "INDEXABILITY",
    priority: "MEDIUM",
    score: 60,
    reason: "Missing canonical tags can lead to duplicate content issues.",
    recommendation: "Add a canonical link tag to every page pointing to the preferred URL.",
  },
  {
    type: "add_image_alt_text",
    issueTypes: ["IMAGE_MISSING_ALT"],
    title: "Fix images missing alt text",
    oppType: "CONTENT",
    priority: "LOW",
    score: 45,
    reason: "Images without alt text miss keyword opportunities and hurt accessibility.",
    recommendation: "Add descriptive alt text to all images.",
  },
  {
    type: "add_structured_data",
    issueTypes: ["MISSING_SCHEMA"],
    title: "Add structured data",
    oppType: "TECHNICAL",
    priority: "LOW",
    score: 48,
    reason: "Structured data helps search engines display rich results.",
    recommendation: "Add relevant JSON-LD schema markup to key pages.",
  },
];

export function generateOpportunities(issues: SEOIssueResult[]): OpportunityResult[] {
  const issuesByType = new Map<string, SEOIssueResult[]>();
  for (const issue of issues) {
    const existing = issuesByType.get(issue.type) || [];
    existing.push(issue);
    issuesByType.set(issue.type, existing);
  }

  const opportunities: OpportunityResult[] = [];

  for (const def of OPPORTUNITY_DEFINITIONS) {
    let affectedPages = 0;
    for (const issueType of def.issueTypes) {
      affectedPages += issuesByType.get(issueType)?.length || 0;
    }

    if (affectedPages === 0) continue;

    opportunities.push({
      title: def.title,
      type: def.oppType,
      priority: def.priority,
      score: def.score,
      reason: def.reason,
      recommendation: def.recommendation,
      affectedPages,
    });
  }

  return opportunities.sort((a, b) => b.score - a.score);
}
