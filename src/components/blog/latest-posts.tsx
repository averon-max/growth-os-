import Link from "next/link";
import { ArrowRight } from "lucide-react";
import b from "./blog.module.css";
import { formatDate, getAllPosts } from "@/lib/blog";

/** Landing page: the three newest published posts. Renders nothing until the first post is published. */
export function LatestPosts() {
  const posts = getAllPosts().filter((p) => !p.draft).slice(0, 3);
  if (posts.length === 0) return null;
  return (
    <section className={b.latest}>
      <div className={b.wrap}>
        <div className={b.latestHead}>
          <h2 className={b.latestTitle}>From the blog</h2>
          <Link href="/blog" className={b.latestAll}>All articles <ArrowRight size={15} /></Link>
        </div>
        <div className={b.cards}>
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className={b.card}>
              <time className={b.cardDate} dateTime={p.date}>{formatDate(p.date)} · {p.minutes} min read</time>
              <h3 className={b.cardTitle}>{p.title}</h3>
              {p.description ? <p className={b.cardDesc}>{p.description}</p> : null}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
