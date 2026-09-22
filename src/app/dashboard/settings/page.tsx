import Link from "next/link";
import {
  Building2,
  Cable,
  Globe,
} from "lucide-react";

import {
  requireUser,
} from "@/lib/auth-helpers";

import {
  prisma,
} from "@/lib/prisma";

import {
  getProviderConnection,
} from "@/lib/keywords/repository";

import {
  Topbar,
} from "@/components/dashboard/topbar";

import {
  Badge,
  EmptyState,
} from "@/components/dashboard/ui";

import styles from "@/components/dashboard/ui.module.css";

const CMS_STATUS_TONE:
  Record<
    string,
    "success" |
    "danger" |
    "muted"
  > = {
    CONNECTED:
      "success",
    ERROR:
      "danger",
    DISCONNECTED:
      "muted",
  };

export default async function SettingsPage() {
  const user =
    await requireUser();

  const membership =
    await prisma.workspaceMember.findFirst({
      where: {
        userId:
          user.id,
      },
      select: {
        role:
          true,
        workspace: {
          select: {
            id:
              true,
            name:
              true,
            createdAt:
              true,
          },
        },
      },
    });

  if (!membership) {
    return (
      <>
        <Topbar title="Settings" />

        <div className={styles.pageBody}>
          <EmptyState
            icon={Building2}
            title="No workspace"
            description="This account is not connected to a workspace."
          />
        </div>
      </>
    );
  }

  const {
    workspace,
    role,
  } =
    membership;

  const websites =
    await prisma.website.findMany({
      where: {
        business: {
          workspaceId:
            workspace.id,
        },
      },
      include: {
        business: {
          select: {
            name:
              true,
          },
        },
        cmsConnection:
          true,
      },
      orderBy: {
        createdAt:
          "asc",
      },
    });

  const gscConnection =
    await getProviderConnection(
      workspace.id,
      "GOOGLE_SEARCH_CONSOLE"
    );

  return (
    <>
      <Topbar
        title="Settings"
        subtitle={workspace.name}
      />

      <div className={styles.pageBody}>
        <div className={styles.settingsGrid}>
          <div className={styles.group}>
            <div className={styles.groupHeader}>
              <span className={styles.groupLabel}>
                Workspace
              </span>
            </div>

            <div className={styles.issueRow}>
              <div className={styles.issueMain}>
                <Building2
                  size={14}
                  className={styles.rowIcon}
                />

                <div>
                  <div className={styles.issueTitle}>
                    {workspace.name}
                  </div>

                  <div className={styles.issueDesc}>
                    {role} · {workspace.createdAt.toISOString().slice(0, 10)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.group}>
            <div className={styles.groupHeader}>
              <span className={styles.groupLabel}>
                Integrations
              </span>
            </div>

            <div className={styles.issueRow}>
              <div className={styles.issueMain}>
                <Cable
                  size={14}
                  className={styles.rowIcon}
                />

                <div>
                  <div className={styles.issueTitle}>
                    Google Search Console
                  </div>

                  <div className={styles.issueDesc}>
                    Search performance
                  </div>
                </div>
              </div>

              <Badge
                tone={
                  gscConnection?.status ===
                  "CONNECTED"
                    ? "success"
                    : "muted"
                }
              >
                {gscConnection?.status ??
                  "DISCONNECTED"}
              </Badge>
            </div>
          </div>

          <div className={`${styles.group} ${styles.settingsWide}`}>
            <div className={styles.groupHeader}>
              <span className={styles.groupLabel}>
                Websites
              </span>

              <span className={styles.groupCount}>
                {websites.length}
              </span>
            </div>

            {!websites.length ? (
              <div className={styles.issueRow}>
                <div className={styles.issueDesc}>
                  No websites
                </div>

                <Link
                  href="/dashboard/add-website"
                  className={styles.link}
                >
                  Add website →
                </Link>
              </div>
            ) : (
              websites.map(
                (website) => {
                  const cmsStatus =
                    website
                      .cmsConnection
                      ?.status ??
                    "DISCONNECTED";

                  return (
                    <div
                      key={website.id}
                      className={styles.issueRow}
                    >
                      <div className={styles.issueMain}>
                        <Globe
                          size={14}
                          className={styles.rowIcon}
                        />

                        <div>
                          <div className={styles.issueTitle}>
                            {website.business.name}
                          </div>

                          <div className={styles.issueDesc}>
                            {website.url}
                          </div>
                        </div>
                      </div>

                      <div className={styles.issueMeta}>
                        <Badge
                          tone={
                            CMS_STATUS_TONE[
                              cmsStatus
                            ]
                          }
                        >
                          {cmsStatus}
                        </Badge>

                        <Link
                          href={`/dashboard/cms/${website.id}`}
                          className={styles.link}
                        >
                          Manage →
                        </Link>
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}
