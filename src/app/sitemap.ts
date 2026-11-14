import type { MetadataRoute } from "next";

import { SITE_URL as SITE } from "@/lib/site";

type ChangeFrequency = MetadataRoute.Sitemap[number]["changeFrequency"];

// Только публичные страницы. updated — дата реального изменения содержимого:
// обновляйте её, когда правите страницу, а не на каждый деплой.
const PAGES: { path: string; updated: string; changeFrequency: ChangeFrequency; priority: number }[] = [
  { path: "/", updated: "2026-11-10", changeFrequency: "weekly", priority: 1 },
  { path: "/pricing", updated: "2026-11-10", changeFrequency: "monthly", priority: 0.8 },
    { path: "/support", updated: "2026-11-13", changeFrequency: "yearly", priority: 0.3 },
    { path: "/privacy", updated: "2026-11-10", changeFrequency: "yearly", priority: 0.2 },
    { path: "/terms", updated: "2026-11-10", changeFrequency: "yearly", priority: 0.2 },
    { path: "/cookies", updated: "2026-11-10", changeFrequency: "yearly", priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((page) => ({
    url: `${SITE}${page.path}`,
    lastModified: new Date(page.updated),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
