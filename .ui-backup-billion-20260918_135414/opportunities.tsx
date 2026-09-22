import { ArrowUpRight, Target, SlidersHorizontal } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import styles from "@/components/dashboard/ui.module.css";

const ORDER = ["HIGH", "MEDIUM", "LOW"] as const;
const TONE: Record<string, string> = { HIGH: "warning", MEDIUM: "accent", LOW: "muted" };

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ websiteId?: string }> }) {
  const user = await requireUser();
  const { websiteId } = await searchParams;
  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true } });
  const website = membership ? websiteId ? await prisma.website.findFirst({ where: { id: websiteId, business: { workspaceId: membership.workspaceId } } }) : await prisma.website.findFirst({ where: { business: { workspaceId: membership.workspaceId } }, orderBy: { createdAt: "asc" } }) : null;
  const analysis = website ? await prisma.analysis.findFirst({ where: { websiteId: website.id }, orderBy: { createdAt: "desc" } }) : null;
  const opportunities = analysis ? await prisma.opportunity.findMany({ where: { analysisId: analysis.id }, orderBy: { score: "desc" }, take: 500 }) : [];

  return (
    <>
      <Topbar title="Opportunities" subtitle={`${opportunities.length} opportunities`} websiteSwitcher={membership && website ? { workspaceId: membership.workspaceId, currentWebsiteId: website.id } : undefined} />
      <div className={styles.pageBody}>
        <div className={styles.workspaceIntro}>
          <div><div className={styles.eyebrow}>Growth queue</div><h1 className={styles.heroTitle}>Opportunities</h1><p className={styles.heroSubtitle}>Prioritize changes that can create measurable search growth.</p></div>
          <div className={styles.inlineMetric}><span>Open</span><strong>{opportunities.length}</strong></div>
        </div>

        {!opportunities.length ? <EmptyState icon={Target} title="No opportunities yet" description={analysis ? "This analysis didn't surface any opportunities." : "Run an analysis to surface growth opportunities."} actionLabel={website ? undefined : "Add Website"} actionHref={website ? undefined : "/dashboard/add-website"} /> : (
          <div className={styles.opportunityList}>
            {ORDER.flatMap((priority) => opportunities.filter((o) => o.priority === priority)).map((o) => (
              <div key={o.id} className={styles.opportunityRow}>
                <div className={`${styles.priorityRail} ${styles[`priority${TONE[o.priority]}`]}`} />
                <div className={styles.opportunityBody}>
                  <div className={styles.opportunityTop}><span className={styles.priorityLabel}>{o.priority}</span><span className={styles.opportunityScore}>{o.score}</span></div>
                  <div className={styles.dataTitle}>{o.title}</div>
                  <div className={styles.dataSecondary}>{o.reason}</div>
                  <div className={styles.recommendation}>{o.recommendation}</div>
                </div>
                <div className={styles.opportunityMeta}><span>{o.affectedPages} page{o.affectedPages === 1 ? "" : "s"}</span><ArrowUpRight size={14} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
