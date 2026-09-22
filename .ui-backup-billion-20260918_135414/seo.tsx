import Link from "next/link";
import { ArrowUpRight, Globe, Play, Search } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import { RunAnalysisButton } from "@/components/dashboard/run-analysis-button";
import styles from "@/components/dashboard/ui.module.css";

function scoreTone(score: number | null) {
  if (score === null) return "muted";
  if (score >= 70) return "good";
  if (score >= 50) return "warn";
  return "bad";
}

export default async function SeoPage() {
  const user = await requireUser();
  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true } });

  const websites = membership
    ? await prisma.website.findMany({
        where: { business: { workspaceId: membership.workspaceId } },
        include: { business: { select: { name: true } }, analyses: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  if (websites.length === 0) {
    return (
      <>
        <Topbar title="SEO" />
        <div className={styles.pageBody}><EmptyState icon={Globe} title="Add your first website" description="Connect a website to start running real SEO analysis." actionLabel="Add Website" actionHref="/dashboard/add-website" /></div>
      </>
    );
  }

  const analyzed = websites.filter((w) => w.analyses[0]);
  const scores = analyzed.map((w) => w.analyses[0]!.overallScore).filter((s): s is number => s != null);
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return (
    <>
      <Topbar title="SEO" subtitle={`${websites.length} website${websites.length === 1 ? "" : "s"}`} />
      <div className={styles.pageBody}>
        <div className={styles.workspaceIntro}>
          <div>
            <div className={styles.eyebrow}>Technical health</div>
            <h1 className={styles.heroTitle}>SEO workspace</h1>
            <p className={styles.heroSubtitle}>Run audits and inspect the technical health of every connected site.</p>
          </div>
          <div className={styles.inlineMetric}><span>Average score</span><strong>{average ?? "—"}</strong></div>
        </div>

        <div className={styles.sectionBar}>
          <div><span className={styles.sectionTitle}>Sites</span><span className={styles.sectionCount}>{websites.length}</span></div>
        </div>

        <div className={styles.dataList}>
          {websites.map((w) => {
            const latest = w.analyses[0];
            const running = latest && (latest.status === "QUEUED" || latest.status === "RUNNING");
            return (
              <div key={w.id} className={styles.dataRow}>
                <div className={styles.dataIdentity}>
                  <div className={`${styles.statusMark} ${styles[`status${scoreTone(latest?.overallScore ?? null)}`]}`} />
                  <div><div className={styles.dataTitle}>{w.business.name}</div><div className={styles.dataSecondary}>{w.url}</div></div>
                </div>
                <div className={styles.dataValue}>
                  {latest?.overallScore != null && <span className={styles.bigScore}>{latest.overallScore}</span>}
                  {running ? (
                    <span className={styles.muted}>Running…</span>
                  ) : latest ? (
                    <><Link href={`/dashboard/analysis/${latest.id}`} className={styles.rowAction}>Open <ArrowUpRight size={13} /></Link><RunAnalysisButton websiteId={w.id} /></>
                  ) : (
                    <RunAnalysisButton websiteId={w.id} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
