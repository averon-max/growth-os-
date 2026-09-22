import {
  Search,
  SlidersHorizontal,
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

import {
  ApplyFixControl,
} from "@/components/dashboard/apply-fix-control";

import styles from "@/components/dashboard/ui.module.css";

const SEVERITY_ORDER = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
] as const;

const SEVERITY_TONE:
  Record<
    string,
    string
  > = {
    CRITICAL:
      "danger",
    HIGH:
      "warning",
    MEDIUM:
      "accent",
    LOW:
      "muted",
  };

const FIXABLE_TYPES =
  new Set([
    "MISSING_TITLE",
    "TITLE_TOO_LONG",
    "TITLE_TOO_SHORT",
  ]);

function titleCase(
  value:
    string
) {
  return (
    value.charAt(0) +
    value
      .slice(1)
      .toLowerCase()
  );
}

export default async function IssuesPage({
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
            include: {
              cmsConnection:
                true,
            },
          })
        : await prisma.website.findFirst({
            where: {
              business: {
                workspaceId:
                  membership.workspaceId,
              },
            },
            include: {
              cmsConnection:
                true,
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

  if (!analysis) {
    return (
      <>
        <Topbar title="Issues" />

        <div className={styles.pageBody}>
          <EmptyState
            icon={Search}
            title="No analysis"
            description={
              website
                ? "Run an SEO analysis first."
                : "Add a website first."
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
        </div>
      </>
    );
  }

  const issues =
    await prisma.sEOIssue.findMany({
      where: {
        analysisId:
          analysis.id,
      },
      orderBy: {
        createdAt:
          "desc",
      },
      take:
        500,
    });

  const cmsConnected =
    website
      ?.cmsConnection
      ?.status ===
    "CONNECTED";

  const critical =
    issues.filter(
      (issue) =>
        issue.severity ===
        "CRITICAL"
    ).length;

  return (
    <>
      <Topbar
        title="Issues"
        subtitle={`${issues.length} issues`}
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
            All issues
          </div>

          <div className={styles.toolbarMeta}>
            {critical} critical
          </div>
        </div>

        {!issues.length ? (
          <EmptyState
            icon={Search}
            title="No issues"
            description="Latest analysis is clean."
          />
        ) : (
          <div className={styles.issueTable}>
            <div className={styles.issueTableHead}>
              <span>Issue</span>
              <span>Severity</span>
              <span>Page / action</span>
            </div>

            {SEVERITY_ORDER
              .flatMap(
                (severity) =>
                  issues.filter(
                    (issue) =>
                      issue.severity ===
                      severity
                  )
              )
              .map(
                (issue) => (
                  <div
                    key={issue.id}
                    className={styles.issueTableRow}
                  >
                    <div className={styles.issueIdentity}>
                      <span
                        className={`${styles.statusMark} ${styles[`status${SEVERITY_TONE[issue.severity]}`]}`}
                      />

                      <div>
                        <div className={styles.dataTitle}>
                          {issue.type}
                        </div>

                        <div className={styles.dataSecondary}>
                          {issue.description}
                        </div>
                      </div>
                    </div>

                    <div>
                      <span
                        className={`${styles.severityLabel} ${styles[`severity${SEVERITY_TONE[issue.severity]}`]}`}
                      >
                        {titleCase(
                          issue.severity
                        )}
                      </span>
                    </div>

                    <div className={styles.issueAction}>
                      {issue.pageUrl ? (
                        <span className={styles.pageUrl}>
                          {issue.pageUrl}
                        </span>
                      ) : null}

                      {FIXABLE_TYPES.has(
                        issue.type
                      ) &&
                      issue.pageUrl &&
                      website ? (
                        <ApplyFixControl
                          issueId={issue.id}
                          issueType={issue.type}
                          pageUrl={issue.pageUrl}
                          websiteId={website.id}
                          cmsConnected={cmsConnected}
                        />
                      ) : null}
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
