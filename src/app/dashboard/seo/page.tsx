import Link from "next/link";
import {
  ArrowUpRight,
  Globe,
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
  RunAnalysisButton,
} from "@/components/dashboard/run-analysis-button";

import styles from "@/components/dashboard/ui.module.css";

function scoreTone(
  score:
    number | null
) {
  if (score === null) {
    return "muted";
  }

  if (score >= 70) {
    return "good";
  }

  if (score >= 50) {
    return "warn";
  }

  return "bad";
}

export default async function SeoPage() {
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

  const websites =
    membership
      ? await prisma.website.findMany({
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
        })
      : [];

  if (!websites.length) {
    return (
      <>
        <Topbar title="SEO" />

        <div className={styles.pageBody}>
          <EmptyState
            icon={Globe}
            title="No websites"
            description="Add a website to run an audit."
            actionLabel="Add website"
            actionHref="/dashboard/add-website"
          />
        </div>
      </>
    );
  }

  const analyzed =
    websites.filter(
      (website) =>
        website.analyses[0]
    );

  const scores =
    analyzed
      .map(
        (website) =>
          website.analyses[0]!
            .overallScore
      )
      .filter(
        (
          score
        ): score is number =>
          score != null
      );

  const average =
    scores.length
      ? Math.round(
          scores.reduce(
            (
              total,
              score
            ) =>
              total +
              score,
            0
          ) /
            scores.length
        )
      : null;

  return (
    <>
      <Topbar
        title="SEO"
        subtitle={`${websites.length} sites`}
      />

      <div className={styles.pageBody}>
        <div className={styles.compactHeader}>
          <div>
            <h1 className={styles.compactTitle}>
              Technical SEO
            </h1>

            <div className={styles.compactMeta}>
              Latest crawl health
            </div>
          </div>

          <div className={styles.inlineMetric}>
            <span>
              Average
            </span>
            <strong>
              {average ??
                "—"}
            </strong>
          </div>
        </div>

        <div className={styles.dataList}>
          {websites.map(
            (website) => {
              const latest =
                website.analyses[0];

              const running =
                latest &&
                (
                  latest.status ===
                    "QUEUED" ||
                  latest.status ===
                    "RUNNING"
                );

              return (
                <div
                  key={website.id}
                  className={styles.dataRow}
                >
                  <div className={styles.dataIdentity}>
                    <div
                      className={`${styles.statusMark} ${styles[`status${scoreTone(latest?.overallScore ?? null)}`]}`}
                    />

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
                    {latest?.overallScore != null ? (
                      <span className={styles.bigScore}>
                        {latest.overallScore}
                      </span>
                    ) : null}

                    {running ? (
                      <span className={styles.muted}>
                        Running…
                      </span>
                    ) : latest ? (
                      <>
                        <Link
                          href={`/dashboard/analysis/${latest.id}`}
                          className={styles.rowAction}
                        >
                          Open
                          <ArrowUpRight size={12} />
                        </Link>

                        <RunAnalysisButton
                          websiteId={website.id}
                        />
                      </>
                    ) : (
                      <RunAnalysisButton
                        websiteId={website.id}
                      />
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
