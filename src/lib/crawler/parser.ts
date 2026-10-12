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
  bodyText: string;
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

  /*
   * CRAWLER_READING_TEXT_BLOCK_BOUNDARIES_V1
   *
   * Cheerio .text() concatenates adjacent block element text without
   * spaces: <h2>Quick Answer</h2><p>Credit...</p> becomes
   * "Quick AnswerCredit...". That breaks exact sentence-level evidence
   * verification and can merge unrelated navigation with a factual
   * assertion. Preserve readable boundaries from the fetched DOM.
   *
   * A clone avoids changing link/image/structured-data extraction.
   * Do not break inline <em>/<strong>/<span> because these may split
   * an ordinary sentence at word boundaries.
   */
  const readingBody = $("body").clone();
  readingBody.find("script, style, noscript, template, svg").remove();
  readingBody.find("br, hr").replaceWith(" ");
  readingBody
    .find("p, div, section, article, main, nav, aside, header, footer, h1, h2, h3, h4, h5, h6, li, ul, ol, blockquote, tr, td, th")
    .prepend(" ")
    .append(" ");
  const bodyText = readingBody.text().replace(/\s+/g, " ").trim();
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
    bodyText,
    internalLinks: [...new Set(internalLinks)],
    externalLinks: [...new Set(externalLinks)],
    imagesCount,
    imagesWithoutAlt,
    hasJsonLd,
    jsonLdTypes,
  };
}
