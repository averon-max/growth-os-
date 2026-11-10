import type { MetadataRoute } from "next";

import { SITE_URL as SITE } from "@/lib/site";

// Индексируем только боевой сайт. Превью-деплои Vercel закрыты целиком,
// иначе в поиск попадут копии на *.vercel.app.
const isProduction =
  process.env.VERCEL_ENV === "production" ||
  (!process.env.VERCEL_ENV && process.env.NODE_ENV === "production");

const PRIVATE_PATHS = [
  "/dashboard",
  "/admin",
  "/api",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

// AI-краулеры (GPTBot, ClaudeBot, PerplexityBot) разрешены намеренно —
// продукт про видимость в AI-ответах.
export default function robots(): MetadataRoute.Robots {
  if (!isProduction) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
