import Link from "next/link";
import {
  ArrowUpRight,
  Globe,
  Plus,
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

export default async function WebsitesPage() {
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

  return (
    <>
      <Topbar
        title="Websites"
        subtitle={`${websites.length} sites`}
      />

      <div className={styles.pageBody}>
        <div className={styles.compactHeader}>
          <div>
            <h1 className={styles.compactTitle}>
              Websites
            </h1>

            <div className={styles.compactMeta}>
              Connected properties
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

        {!websites.length ? (
          <EmptyState
            icon={Globe}
            title="No websites"
            description="Add your first website."
            actionLabel="Add website"
            actionHref="/dashboard/add-website"
          />
        ) : (
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
                      <span
                        aria-hidden
                        style={{ width: 30, height: 30, flex: "0 0 auto", display: "grid", placeItems: "center", border: "1px solid #26282d", borderRadius: 7, background: "#141516" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(website.url.replace(/^https?:\/\//, "").split("/")[0])}&sz=64`}
                          alt=""
                          width={16}
                          height={16}
                          style={{ borderRadius: 3 }}
                        />
                      </span>

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
                        <>
                          <span className={styles.scorePill}>
                            {latest.overallScore ??
                              "—"}
                          </span>

                          <Link
                            href={`/dashboard/analysis/${latest.id}`}
                            className={styles.rowAction}
                          >
                            Analysis
                            <ArrowUpRight size={12} />
                          </Link>
                        </>
                      ) : (
                        <span className={styles.muted}>
                          Awaiting analysis
                        </span>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </>
  );
}
