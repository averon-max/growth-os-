import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site/site-shell";
import b from "./blog.module.css";
import { formatDate, getAllPosts } from "@/lib/blog";
import { SITE_URL, type PostInfo } from "@/lib/blog-meta";

/*
 * Layout for a blog post written as its own page (src/app/blog/<slug>/page.tsx).
 * Put the article inside <Article post={post}> … </Article>; use <H2> for sections so they get anchors and
 * appear in "On this page".
 */

const idOf = (text: string) => text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);

/** Section heading with an anchor. <H2>Why it matters</H2> → id="why-it-matters". */
export function H2({ children, id }: { children: string; id?: string }) {
  return <h2 id={id ?? idOf(children)}>{children}</h2>;
}

export function Article({ post, toc, children }: { post: PostInfo; toc?: string[]; children: ReactNode }) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const author = post.author ?? "Hyprlyx team";
  const more = getAllPosts().filter((p) => p.slug !== post.slug && !p.draft).slice(0, 3);
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
      author: { "@type": "Organization", name: author, url: SITE_URL },
      publisher: { "@type": "Organization", name: "Hyprlyx", url: SITE_URL },
      image: post.cover ? `${SITE_URL}${post.cover}` : undefined,
      keywords: post.tags?.join(", ") || undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
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
            <span>{post.tags?.[0] ?? "Article"}</span>
          </nav>
          <h1 className={b.postTitle}>
            {post.title}
            {post.draft ? <span className={b.draft}>Draft — not published</span> : null}
          </h1>
          <p className={b.postLede}>{post.description}</p>
          <div className={b.meta}>
            <span>By <b>{author}</b></span>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            {post.updated ? <span>Updated <time dateTime={post.updated}>{formatDate(post.updated)}</time></span> : null}
            {post.minutes ? <span>{post.minutes} min read</span> : null}
          </div>
          {post.cover ? (
            <div className={b.cover}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.cover} alt={post.coverAlt ?? post.title} width={1600} height={900} fetchPriority="high" />
            </div>
          ) : null}

          <div className={b.layout}>
            <div className={b.prose}>{children}</div>
            {toc && toc.length >= 3 ? (
              <aside className={b.toc} aria-label="On this page">
                <p>On this page</p>
                {toc.map((t) => <a key={t} href={`#${idOf(t)}`}>{t}</a>)}
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
