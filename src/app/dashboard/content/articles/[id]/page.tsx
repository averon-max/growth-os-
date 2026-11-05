import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireUser, requireWebsiteAccess } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { ArticleWorkspace } from "@/components/dashboard/article-workspace";
import styles from "@/components/dashboard/article-workspace.module.css";
import s from "@/components/dashboard/article-stats.module.css";

const words = (t: string) => t.replace(/[#>*_`|\[\]()-]/g, " ").split(/\s+/).filter(Boolean).length;

function analyze(md: string, siteUrl: string) {
  const host = (() => { try { return new URL(siteUrl).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  const links = [...md.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);
  const internal = links.filter((u) => host && u.includes(host)).length + (md.match(/\]\(\/[^)]*\)/g) || []).length;
  const parts = md.split(/^## /m).slice(1);
  const sections = parts.map((p) => {
    const nl = p.indexOf("\n");
    const heading = (nl < 0 ? p : p.slice(0, nl)).trim();
    const body = nl < 0 ? "" : p.slice(nl + 1);
    return { heading, words: words(body), h3: (body.match(/^### .+$/gm) || []).map((h) => h.slice(4).trim()) };
  });
  const total = words(md);
  return {
    total,
    read: Math.max(1, Math.round(total / 230)),
    h2: sections.length,
    h3: sections.reduce((n, x) => n + x.h3.length, 0),
    faq: (md.match(/^#{2,4} .*\?\s*$/gm) || []).length,
    tables: (md.match(/^\|.*\|\s*\n\|[\s:|-]+\|/gm) || []).length,
    lists: (md.match(/^(\s*[-*]|\s*\d+\.) /gm) || []).length,
    external: links.length - links.filter((u) => host && u.includes(host)).length,
    internal,
    sections,
    maxSection: Math.max(1, ...sections.map((x) => x.words)),
  };
}

const tone = (n: number, lo: number, hi: number) => (n >= lo && n <= hi ? "good" : "warn");

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const article = await prisma.contentArticle.findUnique({
    where: { id },
    include: { brief: { select: { id: true, websiteId: true, topic: true, primaryKeyword: true, searchIntent: true, generatedBy: true, website: { select: { url: true } } } } },
  });
  if (article === null) notFound();
  await requireWebsiteAccess(user.id, article.brief.websiteId);

  const a = analyze(article.bodyMarkdown, article.brief.website.url);
  const tLen = article.title.length;
  const mLen = article.metaDescription.length;

  return (
    <>
      <Topbar title="Article" subtitle={article.brief.primaryKeyword} />
      <div className={styles.page}>
        <Link href={`/dashboard/content?websiteId=${encodeURIComponent(article.brief.websiteId)}`} className={styles.back}>
          <ArrowLeft size={13} />
          Content
        </Link>

        <ArticleWorkspace
          qualityMinimumWords={0}
          initialArticle={{
            id: article.id,
            websiteId: article.brief.websiteId,
            title: article.title,
            metaDescription: article.metaDescription,
            h1: article.h1,
            bodyMarkdown: article.bodyMarkdown,
            status: article.status,
            publishedUrl: article.publishedUrl,
            publishedAt: article.publishedAt?.toISOString() ?? null,
            updatedAt: article.updatedAt.toISOString(),
            topic: article.brief.topic,
            primaryKeyword: article.brief.primaryKeyword,
            searchIntent: article.brief.searchIntent,
          }}
        />

        <div className={s.wrap}>
          <section className={s.card} aria-label="Article statistics">
            <div className={s.head}><span>Article statistics</span><span className={s.badge}>{article.brief.searchIntent}</span></div>
            <div className={s.grid}>
              <div className={s.m}><span className={s.l}>Words</span><span className={s.v}>{a.total.toLocaleString()}</span><span className={s.s}>{a.read} min read</span></div>
              <div className={s.m}><span className={s.l}>Sections</span><span className={s.v}>{a.h2}</span><span className={s.s}>{a.h3} subsections</span></div>
              <div className={s.m}><span className={s.l}>FAQ</span><span className={s.v}>{a.faq}</span><span className={s.s}>question headings</span></div>
              <div className={s.m}><span className={s.l}>Tables · Lists</span><span className={s.v}>{a.tables} · {a.lists}</span><span className={s.s}>tables · list items</span></div>
              <div className={s.m}><span className={s.l}>Sources</span><span className={s.v}>{a.external}</span><span className={s.s}>{a.internal} internal links</span></div>
              <div className={s.m}><span className={s.l}>Title</span><span className={s.v} data-tone={tone(tLen, 30, 60)}>{tLen}</span><span className={s.s}>chars · 30–60</span></div>
              <div className={s.m}><span className={s.l}>Meta</span><span className={s.v} data-tone={tone(mLen, 120, 160)}>{mLen}</span><span className={s.s}>chars · 120–160</span></div>
            </div>
          </section>

          {a.sections.length > 0 ? (
            <section className={s.card} aria-label="Article outline">
              <div className={s.head}><span>Outline</span><span>{a.h2} H2 · {a.h3} H3</span></div>
              <div className={s.rows}>
                {a.sections.map((sec, i) => (
                  <div key={i} className={s.row}>
                    <span className={s.idx}>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <div className={s.h}>{sec.heading}</div>
                      {sec.h3.length > 0 ? <div className={s.sub}>{sec.h3.join(" · ")}</div> : null}
                      <div className={s.bar}><div className={s.fill} style={{ width: `${Math.round((sec.words / a.maxSection) * 100)}%` }} /></div>
                    </div>
                    <span className={s.meta}>{sec.words} w</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
