import { load, CheerioAPI } from "cheerio";

export interface ParsedPage {
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  h2s: string[];
  h3s: string[];
  canonical: string | null;
  robots: string | null;
  wordCount: number;
  internalLinks: string[];
  externalLinks: string[];
  imagesCount: number;
  imagesWithoutAlt: number;
  hasJsonLd: boolean;
  jsonLdTypes: string[];
}

export function parsePage(html: string, baseUrl: string): ParsedPage {
  const $: CheerioAPI = load(html);
  const base = new URL(baseUrl);

  // Title — use first non-empty
  const title = $("title").first().text().trim() || null;

  // Meta description
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    null;

  // H1 — first only
  const h1Raw = $("h1").first().text().trim();
  const h1 = h1Raw || null;

  // H2s
  const h2s: string[] = [];
  $("h2").each((_i, el) => {
    const text = $(el).text().trim();
    if (text) h2s.push(text);
  });

  // H3s
  const h3s: string[] = [];
  $("h3").each((_i, el) => {
    const text = $(el).text().trim();
    if (text) h3s.push(text);
  });

  // Canonical
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() || null;

  // Robots
  const robots =
    $('meta[name="robots"]').attr("content")?.trim() ||
    $('meta[name="googlebot"]').attr("content")?.trim() ||
    null;

  // Word count — exclude script and style
  $("script, style, noscript").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;

  // Links
  const internalLinks: string[] = [];
  const externalLinks: string[] = [];

  $("a[href]").each((_i, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    // Skip non-http links
    if (
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("javascript:") ||
      href.startsWith("#")
    ) return;

    try {
      const resolved = new URL(href, baseUrl);
      if (!["http:", "https:"].includes(resolved.protocol)) return;
      resolved.hash = "";
      if (resolved.hostname === base.hostname) {
        internalLinks.push(resolved.toString());
      } else {
        externalLinks.push(resolved.toString());
      }
    } catch {
      // skip malformed
    }
  });

  // Images
  let imagesCount = 0;
  let imagesWithoutAlt = 0;

  $("img").each((_i, el) => {
    imagesCount++;
    const alt = $(el).attr("alt");
    if (alt === undefined || alt === null || alt.trim() === "") {
      imagesWithoutAlt++;
    }
  });

  // JSON-LD
  const jsonLdTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_i, el) => {
    try {
      const content = $(el).html() || "";
      const parsed = JSON.parse(content);
      const type = parsed["@type"];
      if (type) {
        if (Array.isArray(type)) jsonLdTypes.push(...type);
        else jsonLdTypes.push(type);
      }
    } catch {
      // malformed JSON-LD
    }
  });

  const hasJsonLd = jsonLdTypes.length > 0;

  return {
    title,
    metaDescription,
    h1,
    h2s,
    h3s,
    canonical,
    robots,
    wordCount,
    internalLinks: [...new Set(internalLinks)],
    externalLinks: [...new Set(externalLinks)],
    imagesCount,
    imagesWithoutAlt,
    hasJsonLd,
    jsonLdTypes,
  };
}
