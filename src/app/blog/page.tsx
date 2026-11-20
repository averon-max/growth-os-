import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site/site-shell";
import b from "@/components/blog/blog.module.css";
import { SITE, formatDate, getAllPosts } from "@/lib/blog";

const TITLE = "SEO Blog — Keyword Research, Rankings & Content | Hyprlyx";
const DESCRIPTION = "Practical guides on keyword research, rank tracking, technical SEO and content that ranks, from the team behind Hyprlyx.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/blog", types: { "application/rss+xml": "/blog/rss.xml" } },
  openGraph: { type: "website", url: `${SITE}/blog`, title: TITLE, description: DESCRIPTION, siteName: "Hyprlyx" },
};

export default function BlogIndex() {
  const posts = getAllPosts();
  const ld = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Hyprlyx Blog",
    url: `${SITE}/blog`,
    blogPost: posts.slice(0, 20).map((p) => ({ "@type": "BlogPosting", headline: p.title, url: `${SITE}/blog/${p.slug}`, datePublished: p.date })),
  };

  return (
    <>
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <main className={b.wrap}>
        <header className={b.head}>
          <h1 className={b.title}>Blog</h1>
          <p className={b.lede}>Practical guides on keyword research, rankings and content that earns clicks.</p>
        </header>
        {posts.length === 0 ? (
          <p className={b.empty}>The first articles are on their way.</p>
        ) : (
          <ul className={b.list}>
            {posts.map((p) => (
              <li key={p.slug} className={b.item}>
                <Link href={`/blog/${p.slug}`} className={b.itemLink}>
                  <time className={b.itemDate} dateTime={p.date}>{formatDate(p.date)}</time>
                  <div>
                    <h2 className={b.itemTitle}>
                      {p.title}
                      {p.draft ? <span className={b.draft}>Draft</span> : null}
                    </h2>
                    {p.description ? <p className={b.itemDesc}>{p.description}</p> : null}
                  </div>
                  <ArrowRight className={b.itemArrow} size={18} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
