/**
 * Единственное место, где живёт адрес сайта.
 * Локально берётся localhost, на проде — NEXT_PUBLIC_SITE_URL.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production" ? "https://hyprlyx.com" : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "Hyprlyx";

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
