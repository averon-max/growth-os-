import Link from "next/link";
import {
  ArrowUpRight,
  Globe,
  Plus,
  ScanSearch,
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

export default async function DashboardOverview() {
  const user =
    await requireUser();

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

  if (!membership) {
    return (
      <>
        <Topbar title="Overview" />

        <div className={styles.pageBody}>
          <EmptyState
            icon={Globe}
            title="No workspace"
            description="This account is not connected to a workspace."
          />
        </div>
      </>
    );
  }

  const websites =
    await prisma.website.findMany({
      where: {
        business: {
          workspaceId:
            membership.workspaceId,
        },
      },
      include: {
        business: {
          select: {
            name:
              true,
          },
        },
        analyses: {
          orderBy: {
            createdAt:
              "desc",
          },
          take:
            1,
        },
      },
      orderBy: {
        createdAt:
          "asc",
      },
    });

  if (!websites.length) {
    return (
      <>
        <Topbar title="Overview" />

        <div className={styles.pageBody}>
          <EmptyState
            icon={Globe}
            title="No websites"
            description="Add a website to start."
            actionLabel="Add website"
            actionHref="/dashboard/add-website"
          />
        </div>
      </>
    );
  }

  const latestAnalyses =
    websites
      .map(
        (website) =>
          website.analyses[0]
      )
      .filter(
        (
          analysis
        ): analysis is NonNullable<
          typeof analysis
        > =>
          Boolean(
            analysis
          )
      );

  const latestOverall =
    latestAnalyses.length
      ? latestAnalyses.reduce(
          (
            latest,
            analysis
          ) =>
            analysis.createdAt >
            latest.createdAt
              ? analysis
              : latest
        )
      : null;

  const latestAnalysisIds =
    latestAnalyses.map(
      (analysis) =>
        analysis.id
    );

  const [
    criticalIssueCount,
    opportunityCount,
  ] =
    latestAnalysisIds.length
      ? await Promise.all([
          prisma.sEOIssue.count({
            where: {
              analysisId: {
                in:
                  latestAnalysisIds,
              },
              severity:
                "CRITICAL",
            },
          }),
          prisma.opportunity.count({
            where: {
              analysisId: {
                in:
                  latestAnalysisIds,
              },
            },
          }),
        ])
      : [
          0,
          0,
        ];

  return (
    <>
      <Topbar
        title="Overview"
        subtitle={`${websites.length} sites`}
      />

      <div className={styles.pageBody}>
        <div className={styles.compactHeader}>
          <div>
            <h1 className={styles.compactTitle}>
              Overview
            </h1>

            <div className={styles.compactMeta}>
              Workspace health and active work
            </div>
          </div>

          <Link
            href="/dashboard/add-website"
            className={styles.primaryButton}
          >
            <Plus size={13} />
            Add website
          </Link>
        </div>

        <div className={styles.metricRow}>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>
              Websites
            </span>
            <strong>
              {websites.length}
            </strong>
          </div>

          <div className={styles.metric}>
            <span className={styles.metricLabel}>
              SEO score
            </span>
            <strong>
              {latestOverall?.overallScore ??
                "—"}
            </strong>
          </div>

          <div className={styles.metric}>
            <span className={styles.metricLabel}>
              Critical
            </span>
            <strong
              data-danger={
                criticalIssueCount >
                0
              }
            >
              {criticalIssueCount}
            </strong>
          </div>

          <div className={styles.metric}>
            <span className={styles.metricLabel}>
              Opportunities
            </span>
            <strong>
              {opportunityCount}
            </strong>
          </div>
        </div>

        <div className={styles.sectionBar}>
          <div>
            <span className={styles.sectionTitle}>
              Websites
            </span>

            <span className={styles.sectionCount}>
              {websites.length}
            </span>
          </div>

          <Link
            href="/dashboard/websites"
            className={styles.textButton}
          >
            View all
            <ArrowUpRight size={12} />
          </Link>
        </div>

        <div className={styles.dataList}>
          {websites.map(
            (website) => {
              const latest =
                website.analyses[0];

              return (
                <div
                  key={website.id}
                  className={styles.dataRow}
                >
                  <div className={styles.dataIdentity}>
                    <div className={styles.siteIcon}>
                      <Globe size={13} />
                    </div>

                    <div>
                      <div className={styles.dataTitle}>
                        {website.business.name}
                      </div>

                      <div className={styles.dataSecondary}>
                        {website.url}
                      </div>
                    </div>
                  </div>

                  <div className={styles.dataValue}>
                    {latest ? (
                      <span className={styles.scorePill}>
                        {latest.overallScore ??
                          "—"}
                      </span>
                    ) : (
                      <span className={styles.muted}>
                        Not analyzed
                      </span>
                    )}

                    {latest ? (
                      <Link
                        href={`/dashboard/analysis/${latest.id}`}
                        className={styles.rowAction}
                      >
                        Open
                        <ArrowUpRight size={12} />
                      </Link>
                    ) : (
                      <Link
                        href="/dashboard/seo"
                        className={styles.rowAction}
                      >
                        <ScanSearch size={12} />
                        Analyze
                      </Link>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
    </>
  );
}
