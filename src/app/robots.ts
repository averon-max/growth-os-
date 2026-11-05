import type { MetadataRoute } from "next";

const SITE = (process.env.SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Public pages are crawlable, AI crawlers included (GPTBot, ClaudeBot, PerplexityBot).
// To block AI crawlers add a rule: { userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "CCBot"], disallow: "/" }
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/api", "/login", "/signup"] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
