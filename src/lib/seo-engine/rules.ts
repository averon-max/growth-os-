import { CrawledPage } from "../crawler/crawler";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface SEOIssueResult {
  type: string;
  severity: Severity;
  pageUrl: string | null;
  description: string;
  evidence: string | null;
  recommendation: string;
}

function isIndexable(page: CrawledPage): boolean {
  if (!page.parsed) return false;
  const robots = page.parsed.robots?.toLowerCase() || "";
  if (robots.includes("noindex")) return false;
  if (page.statusCode !== 200) return false;
  return true;
}

export function runSEORules(pages: CrawledPage[]): SEOIssueResult[] {
  const issues: SEOIssueResult[] = [];

  // Only analyze indexable pages
  const indexable = pages.filter(isIndexable);

  // Count duplicates
  const titleCounts = new Map<string, number>();
  const descCounts = new Map<string, number>();

  for (const page of indexable) {
    if (!page.parsed) continue;
    const { title, metaDescription } = page.parsed;
    if (title) titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
    if (metaDescription) descCounts.set(metaDescription, (descCounts.get(metaDescription) || 0) + 1);
  }

  // Build incoming link map
  const incomingLinks = new Map<string, number>();
  for (const page of pages) {
    if (!page.parsed) continue;
    for (const link of page.parsed.internalLinks) {
      incomingLinks.set(link, (incomingLinks.get(link) || 0) + 1);
    }
  }

  for (const page of indexable) {
    const p = page.parsed;
    if (!p) continue;
    const url = page.url;

    // ── TITLE ──
    if (!p.title) {
      issues.push({
        type: "MISSING_TITLE",
        severity: "CRITICAL",
        pageUrl: url,
        description: "Page is missing a title tag.",
        evidence: null,
        recommendation: "Add a descriptive title tag between 30–60 characters.",
      });
    } else {
      if (p.title.length > 60) {
        issues.push({
          type: "TITLE_TOO_LONG",
          severity: "MEDIUM",
          pageUrl: url,
          description: "Title tag exceeds 60 characters and may be truncated in search results.",
          evidence: `"${p.title}" (${p.title.length} chars)`,
          recommendation: "Shorten the title to 30–60 characters.",
        });
      } else if (p.title.length < 30) {
        issues.push({
          type: "TITLE_TOO_SHORT",
          severity: "LOW",
          pageUrl: url,
          description: "Title tag is shorter than 30 characters.",
          evidence: `"${p.title}" (${p.title.length} chars)`,
          recommendation: "Expand the title to 30–60 characters.",
        });
      }

      if ((titleCounts.get(p.title) || 0) > 1) {
        issues.push({
          type: "DUPLICATE_TITLE",
          severity: "HIGH",
          pageUrl: url,
          description: "This page shares its title tag with one or more other pages.",
          evidence: `"${p.title}"`,
          recommendation: "Write a unique title for every page.",
        });
      }
    }

    // ── META DESCRIPTION ──
    if (!p.metaDescription) {
      issues.push({
        type: "MISSING_META_DESCRIPTION",
        severity: "HIGH",
        pageUrl: url,
        description: "Page is missing a meta description.",
        evidence: null,
        recommendation: "Add a meta description between 120–160 characters.",
      });
    } else {
      if (p.metaDescription.length > 160) {
        issues.push({
          type: "META_DESCRIPTION_TOO_LONG",
          severity: "LOW",
          pageUrl: url,
          description: "Meta description exceeds 160 characters.",
          evidence: `${p.metaDescription.length} chars`,
          recommendation: "Shorten the meta description to under 160 characters.",
        });
      }
      if ((descCounts.get(p.metaDescription) || 0) > 1) {
        issues.push({
          type: "DUPLICATE_META_DESCRIPTION",
          severity: "MEDIUM",
          pageUrl: url,
          description: "This page shares its meta description with one or more other pages.",
          evidence: `"${p.metaDescription.substring(0, 80)}..."`,
          recommendation: "Write a unique meta description for every page.",
        });
      }
    }

    // ── H1 ──
    if (!p.h1) {
      issues.push({
        type: "MISSING_H1",
        severity: "HIGH",
        pageUrl: url,
        description: "Page is missing an H1 heading.",
        evidence: null,
        recommendation: "Add a single descriptive H1 tag that matches the page topic.",
      });
    }

    // Multiple H1
    const h1Count = (p as { h1: string | null; h2s: string[] } & { _h1Count?: number })._h1Count;
    if (h1Count && h1Count > 1) {
      issues.push({
        type: "MULTIPLE_H1",
        severity: "MEDIUM",
        pageUrl: url,
        description: `Page has ${h1Count} H1 tags. Only one H1 is recommended.`,
        evidence: `${h1Count} H1 tags found`,
        recommendation: "Use a single H1 tag per page.",
      });
    }

    // ── CANONICAL ──
    if (!p.canonical) {
      issues.push({
        type: "MISSING_CANONICAL",
        severity: "MEDIUM",
        pageUrl: url,
        description: "Page is missing a canonical tag.",
        evidence: null,
        recommendation: "Add a canonical link tag to prevent duplicate content issues.",
      });
    }

    // ── IMAGES ──
    if (p.imagesWithoutAlt > 0) {
      issues.push({
        type: "IMAGE_MISSING_ALT",
        severity: "MEDIUM",
        pageUrl: url,
        description: `${p.imagesWithoutAlt} image(s) are missing alt text.`,
        evidence: `${p.imagesWithoutAlt} of ${p.imagesCount} images missing alt`,
        recommendation: "Add descriptive alt text to all images.",
      });
    }

    // ── THIN CONTENT ──
    if (p.wordCount < 300) {
      issues.push({
        type: "THIN_CONTENT",
        severity: "MEDIUM",
        pageUrl: url,
        description: "Page has thin content (under 300 words).",
        evidence: `${p.wordCount} words`,
        recommendation: "Expand the page content to at least 300 words of meaningful text.",
      });
    }

    // ── SCHEMA ──
    if (!p.hasJsonLd) {
      issues.push({
        type: "MISSING_SCHEMA",
        severity: "LOW",
        pageUrl: url,
        description: "Page has no structured data (JSON-LD).",
        evidence: null,
        recommendation: "Add relevant JSON-LD structured data to improve rich result eligibility.",
      });
    }
  }

  // ── ORPHAN PAGES ──
  for (const page of indexable) {
    if (page.depth === 0) continue; // start page is never orphan
    const incoming = incomingLinks.get(page.url) || 0;
    if (incoming === 0) {
      issues.push({
        type: "ORPHAN_PAGE",
        severity: "MEDIUM",
        pageUrl: page.url,
        description: "Page has no internal links pointing to it.",
        evidence: "0 incoming internal links",
        recommendation: "Add internal links to this page from relevant pages on your site.",
      });
    }
  }

  // ── BROKEN INTERNAL LINKS ──
  for (const page of pages) {
    if (page.statusCode >= 400 || (page.statusCode === 0 && page.error)) {
      issues.push({
        type: "BROKEN_INTERNAL_LINK",
        severity: "HIGH",
        pageUrl: page.url,
        description: `Page returned an error status.`,
        evidence: page.statusCode > 0 ? `HTTP ${page.statusCode}` : page.error || "Connection failed",
        recommendation: "Fix or remove internal links pointing to this URL.",
      });
    }
  }

  return issues;
}
