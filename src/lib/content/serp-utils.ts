export type SerpPageType =
  | "ARTICLE"
  | "GUIDE"
  | "LISTICLE"
  | "COMPARISON"
  | "PRODUCT"
  | "TOOL"
  | "CATEGORY"
  | "HOMEPAGE"
  | "OTHER";


export function classifyPageType(
  url: string,
  title: string
): SerpPageType {
  let pathname =
    "";

  try {
    pathname =
      new URL(url)
        .pathname
        .toLowerCase();
  } catch {
    pathname =
      url.toLowerCase();
  }

  const normalizedTitle =
    title.toLowerCase();

  const text =
    `${pathname} ${normalizedTitle}`;

  const strongToolPath =
    /(?:^|\/)(?:checker|scanner|calculator|generator|hackcheck|breach-detection|identity-theft-checker|dark-web-scan)(?:\/|$|-)/.test(
      pathname
    );

  const strongToolTitle =
    /\b(?:checker|scanner|calculator|generator)\b/.test(
      normalizedTitle
    ) ||
    /\b(?:free )?(?:data breach|data leak|dark web) (?:check|scan)\b/.test(
      normalizedTitle
    );

  if (
    strongToolPath ||
    strongToolTitle
  ) {
    return "TOOL";
  }

  if (
    /\b(vs|versus|compare|comparison)\b/.test(
      text
    )
  ) {
    return "COMPARISON";
  }

  if (
    /\b(best|top\s+\d+|top ten)\b/.test(
      text
    )
  ) {
    return "LISTICLE";
  }

  if (
    /\/(product|products|pricing|plans|buy|shop)(\/|$)/.test(
      pathname
    )
  ) {
    return "PRODUCT";
  }

  if (
    /\/(category|categories|topics)(\/|$)/.test(
      pathname
    )
  ) {
    return "CATEGORY";
  }

  if (
    /\b(how to|guide|tutorial|steps|explained|signs)\b/.test(
      normalizedTitle
    )
  ) {
    return "GUIDE";
  }

  if (
    /\/(blog|article|articles|learn|news|resources)\//.test(
      pathname
    )
  ) {
    return "ARTICLE";
  }

  if (
    pathname === "/" ||
    pathname === ""
  ) {
    return "HOMEPAGE";
  }

  return "OTHER";
}
