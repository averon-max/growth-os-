import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * robots.txt for hyprlyx.com
 * - Private areas (app, API, admin) are disallowed to save crawl budget.
 * - Auth pages are NOT disallowed: they carry <meta name="robots" content="noindex">,
 *   and Google can only see that tag if it's allowed to fetch the page.
 * - /_next/ stays open so Google can render pages with their CSS/JS.
 * - Preview deployments block everything so *.vercel.app never gets indexed.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  const privatePaths = [
    "/api/",
    "/dashboard",
    "/dashboard/",
    "/admin",
    "/admin/",
    "/*?token=",
    "/*&token=",
    "/*?callbackUrl=",
    "/*&callbackUrl=",
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      // AI search and assistant crawlers: explicitly welcome on public pages.
      {
        userAgent: [
          "OAI-SearchBot",
          "ChatGPT-User",
          "GPTBot",
          "PerplexityBot",
          "Perplexity-User",
          "ClaudeBot",
          "Claude-SearchBot",
          "Claude-User",
          "Google-Extended",
          "Applebot-Extended",
        ],
        allow: "/",
        disallow: privatePaths,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
