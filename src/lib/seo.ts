import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/site";

/**
 * Metadata for a public page: title, description, canonical, Open Graph and Twitter in one call,
 * so every page ships the full set and none falls back to old defaults.
 * Keep titles under ~60 characters and descriptions around 140–160.
 */
export function pageMeta(title: string, description: string, path: string, extra: Partial<Metadata> = {}): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", url, title, description },
    twitter: { card: "summary_large_image", title, description },
    ...extra,
  };
}

/** Breadcrumb JSON-LD for nested public pages. */
export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
  };
}

export const ORGANIZATION = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#org`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  email: "support@hyprlyx.com",
};
