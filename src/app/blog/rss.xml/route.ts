import { SITE, getAllPosts } from "@/lib/blog";

export const dynamic = "force-static";

const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** RSS feed: readers, newsletters and some search tools pick up new posts from here. */
export function GET() {
  const posts = getAllPosts().filter((p) => !p.draft).slice(0, 50);
  const items = posts
    .map((p) => `<item><title>${x(p.title)}</title><link>${SITE}/blog/${p.slug}</link><guid>${SITE}/blog/${p.slug}</guid><pubDate>${new Date(`${p.date}T12:00:00Z`).toUTCString()}</pubDate><description>${x(p.description)}</description></item>`)
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Hyprlyx Blog</title><link>${SITE}/blog</link><description>Practical SEO guides from Hyprlyx.</description><language>en</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
