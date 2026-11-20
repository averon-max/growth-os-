import { SITE, getAllPosts } from "@/lib/blog";

export const dynamic = "force-static";

/** /blog/sitemap.xml — the blog index and every published post, with the date it last changed. */
export function GET() {
  const posts = getAllPosts().filter((p) => !p.draft);
  const urls = [
    `<url><loc>${SITE}/blog</loc>${posts[0] ? `<lastmod>${posts[0].updated ?? posts[0].date}</lastmod>` : ""}</url>`,
    ...posts.map((p) => `<url><loc>${SITE}/blog/${p.slug}</loc><lastmod>${p.updated ?? p.date}</lastmod></url>`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
