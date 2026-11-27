import Link from "next/link";
import { ArrowUpRight, Globe, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import { SitePreview } from "@/components/dashboard/site-preview";
import styles from "@/components/dashboard/ui.module.css";
import s from "./websites.module.css";

/* Websites as Vercel-style project cards: live preview, score, last audit, the two actions that matter. */

const host = (url: string) => url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
const ago = (d: Date) => {
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

export default async function WebsitesPage() {
  const user = await requireUser();
  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true } });
  const websites = membership
    ? await prisma.website.findMany({
        where: { business: { workspaceId: membership.workspaceId } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          url: true,
          createdAt: true,
          business: { select: { name: true } },
          analyses: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, status: true, overallScore: true, pagesCount: true, completedAt: true, createdAt: true } },
          cloudflareConnection: { select: { id: true } },
        },
      })
    : [];

  return (
    <>
      <Topbar title="Websites" subtitle={`${websites.length} ${websites.length === 1 ? "site" : "sites"}`} />
      <div className={styles.pageBody}>
        <header className={s.head}>
          <div>
            <h1 className={s.title}>Websites</h1>
            <p className={s.meta}>Every site in this workspace. Open one to see its overview.</p>
          </div>
          <Link href="/dashboard/add-website" className={s.primary}><Plus size={14} /> Add website</Link>
        </header>

        {websites.length === 0 ? (
          <EmptyState icon={Globe} title="No websites yet" description="Add a website and Hyprlyx audits it, tracks its keywords and connects its traffic." actionLabel="Add website" actionHref="/dashboard/add-website" />
        ) : (
          <div className={s.grid}>
            {websites.map((w) => {
              const a = w.analyses[0];
              const score = a?.overallScore ?? null;
              const version = (a?.completedAt ?? a?.createdAt ?? w.createdAt).toISOString().slice(0, 10);
              return (
                <article key={w.id} className={s.card}>
                  <Link href={`/dashboard?websiteId=${w.id}`} className={s.preview} aria-label={`Open ${host(w.url)}`}>
                    <SitePreview url={w.url} version={version} className={s.previewImg} />
                  </Link>
                  <div className={s.body}>
                    <div className={s.name}>
                      <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host(w.url))}&sz=32`} alt="" width={16} height={16} />
                      <Link href={`/dashboard?websiteId=${w.id}`}>{host(w.url)}</Link>
                    </div>
                    <dl className={s.facts}>
                      <div><dt>SEO score</dt><dd data-tone={score == null ? undefined : score >= 80 ? "good" : score >= 50 ? "warn" : "bad"}>{score ?? "—"}</dd></div>
                      <div><dt>Last audit</dt><dd>{a ? ago(a.completedAt ?? a.createdAt) : "never"}</dd></div>
                      <div><dt>Pages</dt><dd>{a?.pagesCount ?? "—"}</dd></div>
                    </dl>
                    <div className={s.actions}>
                      <Link href={`/dashboard/seo?websiteId=${w.id}`} className={s.button}>SEO audit</Link>
                      <a href={w.url} target="_blank" rel="noreferrer" className={s.button}>Visit <ArrowUpRight size={13} /></a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
