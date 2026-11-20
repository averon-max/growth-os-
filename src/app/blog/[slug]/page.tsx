import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site/site-shell";
import b from "@/components/blog/blog.module.css";
import { SITE, formatDate, getAllPosts, getPost } from "@/lib/blog";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().filter((p) => p.source === "md").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  const url = `${SITE}/blog/${post.slug}`;
  return {
    title: `${post.title} | Hyprlyx`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    robots: post.draft ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.description,
      siteName: "Hyprlyx",
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: [post.author],
      tags: post.tags,
      images: post.cover ? [{ url: post.cover, alt: post.coverAlt }] : undefined,
    },
    twitter: { card: post.cover ? "summary_large_image" : "summary", title: post.title, description: post.description },
  };
}

export default async function BlogPost({ params }: Params) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const url = `${SITE}/blog/${post.slug}`;
  const more = getAllPosts().filter((p) => p.slug !== post.slug).slice(0, 3);
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      url,
      mainEntityOfPage: url,
      datePublished: post.date,
      dateModified: post.updated ?? post.date,
      author: { "@type": "Organization", name: post.author, url: SITE },
      publisher: { "@type": "Organization", name: "Hyprlyx", url: SITE },
      image: post.cover ? `${SITE}${post.cover}` : undefined,
      keywords: post.tags.join(", ") || undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];

  return (
    <>
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <main className={b.wrap}>
        <article className={b.article}>
          <nav className={b.crumbs} aria-label="Breadcrumb">
            <Link href="/blog">Blog</Link>
            <span aria-hidden="true">/</span>
            <span>{post.tags[0] ?? "Article"}</span>
          </nav>
          <h1 className={b.postTitle}>
            {post.title}
            {post.draft ? <span className={b.draft}>Draft — not published</span> : null}
          </h1>
          {post.description ? <p className={b.postLede}>{post.description}</p> : null}
          <div className={b.meta}>
            <span>By <b>{post.author}</b></span>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            {post.updated ? <span>Updated <time dateTime={post.updated}>{formatDate(post.updated)}</time></span> : null}
            <span>{post.minutes} min read</span>
          </div>
          {post.cover ? (
            <div className={b.cover}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.cover} alt={post.coverAlt} width={1600} height={900} fetchPriority="high" />
            </div>
          ) : null}

          <div className={b.layout}>
            <div className={b.prose} dangerouslySetInnerHTML={{ __html: post.html }} />
            {post.toc.length >= 3 ? (
              <aside className={b.toc} aria-label="On this page">
                <p>On this page</p>
                {post.toc.map((t) => <a key={t.id} href={`#${t.id}`}>{t.text}</a>)}
              </aside>
            ) : null}
          </div>

          <section className={b.end}>
            <h2 className={b.endTitle}>Try it on your own site</h2>
            <p className={b.endText}>Hyprlyx shows your keywords, rankings and what to publish next. One website is free.</p>
            <Link href="/signup" className={b.cta}>Start free <ArrowRight size={16} /></Link>
          </section>

          {more.length ? (
            <section className={b.more}>
              <p className={b.moreTitle}>More from the blog</p>
              <ul className={b.list}>
                {more.map((p) => (
                  <li key={p.slug} className={b.item}>
                    <Link href={`/blog/${p.slug}`} className={b.itemLink}>
                      <time className={b.itemDate} dateTime={p.date}>{formatDate(p.date)}</time>
                      <div><h3 className={b.itemTitle}>{p.title}</h3></div>
                      <ArrowRight className={b.itemArrow} size={18} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
