import {
  ArrowUpRight,
  SlidersHorizontal,
  Target,
} from "lucide-react";

import {
  requireUser,
} from "@/lib/auth-helpers";

import {
  prisma,
} from "@/lib/prisma";

import {
  Topbar,
} from "@/components/dashboard/topbar";

import {
  EmptyState,
} from "@/components/dashboard/ui";

import styles from "@/components/dashboard/ui.module.css";

const ORDER = [
  "HIGH",
  "MEDIUM",
  "LOW",
] as const;

const TONE:
  Record<
    string,
    string
  > = {
    HIGH:
      "warning",
    MEDIUM:
      "accent",
    LOW:
      "muted",
  };

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams:
    Promise<{
      websiteId?: string;
    }>;
}) {
  const user =
    await requireUser();

  const {
    websiteId,
  } =
    await searchParams;

  const membership =
    await prisma.workspaceMember.findFirst({
      where: {
        userId:
          user.id,
      },
      select: {
        workspaceId:
          true,
      },
    });

  const website =
    membership
      ? websiteId
        ? await prisma.website.findFirst({
            where: {
              id:
                websiteId,
              business: {
                workspaceId:
                  membership.workspaceId,
              },
            },
          })
        : await prisma.website.findFirst({
            where: {
              business: {
                workspaceId:
                  membership.workspaceId,
              },
            },
            orderBy: {
              createdAt:
                "asc",
            },
          })
      : null;

  const analysis =
    website
      ? await prisma.analysis.findFirst({
          where: {
            websiteId:
              website.id,
          },
          orderBy: {
            createdAt:
              "desc",
          },
        })
      : null;

  const opportunities =
    analysis
      ? await prisma.opportunity.findMany({
          where: {
            analysisId:
              analysis.id,
          },
          orderBy: {
            score:
              "desc",
          },
          take:
            500,
        })
      : [];

  return (
    <>
      <Topbar
        title="Opportunities"
        subtitle={`${opportunities.length} open`}
        websiteSwitcher={
          membership &&
          website
            ? {
                workspaceId:
                  membership.workspaceId,
                currentWebsiteId:
                  website.id,
              }
            : undefined
        }
      />

      <div className={styles.pageBody}>
        <div className={styles.workspaceToolbar}>
          <div className={styles.filterControl}>
            <SlidersHorizontal size={12} />
            All opportunities
          </div>

          <div className={styles.toolbarMeta}>
            {opportunities.length} open
          </div>
        </div>

        {!opportunities.length ? (
          <EmptyState
            icon={Target}
            title="No opportunities"
            description={
              analysis
                ? "Nothing surfaced in the latest analysis."
                : "Run an analysis first."
            }
            actionLabel={
              website
                ? undefined
                : "Add website"
            }
            actionHref={
              website
                ? undefined
                : "/dashboard/add-website"
            }
          />
        ) : (
          <div className={styles.opportunityList}>
            {ORDER
              .flatMap(
                (priority) =>
                  opportunities.filter(
                    (opportunity) =>
                      opportunity.priority ===
                      priority
                  )
              )
              .map(
                (opportunity) => (
                  <div
                    key={opportunity.id}
                    className={styles.opportunityRow}
                  >
                    <div
                      className={`${styles.priorityRail} ${styles[`priority${TONE[opportunity.priority]}`]}`}
                    />

                    <div className={styles.opportunityBody}>
                      <div className={styles.opportunityTop}>
                        <span className={styles.priorityLabel}>
                          {opportunity.priority}
                        </span>

                        <span className={styles.opportunityScore}>
                          {opportunity.score}
                        </span>
                      </div>

                      <div className={styles.dataTitle}>
                        {opportunity.title}
                      </div>

                      <div className={styles.dataSecondary}>
                        {opportunity.reason}
                      </div>
                    </div>

                    <div className={styles.opportunityMeta}>
                      <span>
                        {opportunity.affectedPages} pages
                      </span>

                      <ArrowUpRight size={13} />
                    </div>
                  </div>
                )
              )}
          </div>
        )}
      </div>
    </>
  );
}
