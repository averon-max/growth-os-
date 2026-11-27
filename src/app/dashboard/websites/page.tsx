import Link from "next/link";
import { ArrowUpRight, Check, Globe, Minus, Plus, Tag } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import { SitePreview } from "@/components/dashboard/site-preview";
import { KpiStrip, StackBar } from "@/components/dashboard/insights";
import { SEVERITY } from "@/components/dashboard/insights-tokens";
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
          _count: { select: { trackedKeywords: true } },
        },
      })
    : [];
  const latestIds = websites.flatMap((w) => (w.analyses[0] ? [w.analyses[0].id] : []));
  const [issueRows, gsc] = await Promise.all([
    latestIds.length
      ? prisma.sEOIssue.groupBy({ by: ["analysisId", "severity"], where: { analysisId: { in: latestIds } }, _count: { _all: true } })
      : Promise.resolve([] as { analysisId: string; severity: string; _count: { _all: number } }[]),
    membership
      ? prisma.providerConnection.findUnique({ where: { workspaceId_provider: { workspaceId: membership.workspaceId, provider: "GOOGLE_SEARCH_CONSOLE" } }, select: { status: true } })
      : Promise.resolve(null),
  ]);
  const gscOn = gsc?.status === "CONNECTED";
  const sev = (id: string | undefined, level: string) => issueRows.filter((r) => r.analysisId === id && r.severity === level).reduce((a, r) => a + r._count._all, 0);
  const scores = websites.flatMap((w) => (w.analyses[0]?.overallScore != null ? [w.analyses[0].overallScore] : []));
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const issuesTotal = issueRows.reduce((a, r) => a + r._count._all, 0);
  const pagesTotal = websites.reduce((a, w) => a + (w.analyses[0]?.pagesCount ?? 0), 0);
  const tracked = websites.reduce((a, w) => a + w._count.trackedKeywords, 0);

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
          <>
          <KpiStrip
            items={[
              { key: "sites", label: "Websites", value: websites.length, sub: "in this workspace" },
              { key: "score", label: "Average SEO score", value: avg ?? "—", sub: "latest audits", tone: avg == null ? undefined : avg >= 80 ? "good" : avg >= 50 ? "warn" : "bad" },
              { key: "issues", label: "Open issues", value: issuesTotal.toLocaleString("en-US"), sub: "found by the last audits" },
              { key: "pages", label: "Pages checked", value: pagesTotal.toLocaleString("en-US"), sub: "across all sites" },
              { key: "kw", label: "Tracked keywords", value: tracked.toLocaleString("en-US"), sub: "in the Keyword Planner" },
            ]}
          />
          <div className={s.grid} data-one={websites.length === 1 || undefined}>
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
                    <div className={s.issues}>
                      <div className={s.issuesHead}><span>Issues</span><span>{a ? (sev(a.id, "CRITICAL") + sev(a.id, "HIGH") + sev(a.id, "MEDIUM") + sev(a.id, "LOW")).toLocaleString("en-US") : "—"}</span></div>
                      <StackBar
                        parts={[
                          { key: "c", label: "Critical", value: sev(a?.id, "CRITICAL"), color: SEVERITY.critical },
                          { key: "h", label: "High", value: sev(a?.id, "HIGH"), color: SEVERITY.high },
                          { key: "m", label: "Medium", value: sev(a?.id, "MEDIUM"), color: SEVERITY.medium },
                          { key: "l", label: "Low", value: sev(a?.id, "LOW"), color: SEVERITY.low },
                        ]}
                        compact
                      />
                    </div>
                    <ul className={s.links}>
                      <li data-on={gscOn || undefined}>{gscOn ? <Check size={13} /> : <Minus size={13} />}Search Console</li>
                      <li data-on={Boolean(w.cloudflareConnection) || undefined}>{w.cloudflareConnection ? <Check size={13} /> : <Minus size={13} />}Cloudflare</li>
                      <li data-on={w._count.trackedKeywords > 0 || undefined}><Tag size={13} />{w._count.trackedKeywords} tracked keywords</li>
                    </ul>
                    <div className={s.actions}>
                      <Link href={`/dashboard/seo?websiteId=${w.id}`} className={s.button}>SEO audit</Link>
                      <a href={w.url} target="_blank" rel="noreferrer" className={s.button}>Visit <ArrowUpRight size={13} /></a>
                    </div>
                  </div>
                </article>
              );
            })}
            <Link href="/dashboard/add-website" className={s.addCard}>
              <Plus size={18} />
              <span>Add website</span>
              <small>Audit it, track its keywords and connect its traffic.</small>
            </Link>
          </div>
          </>
        )}
      </div>
    </>
  );
}
