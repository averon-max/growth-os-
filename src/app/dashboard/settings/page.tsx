import Link from "next/link";
import { Building2 } from "lucide-react";

import {
  requireUser,
} from "@/lib/auth-helpers";

import {
  prisma,
} from "@/lib/prisma";

import {
  getProviderConnection,
} from "@/lib/keywords/repository";

import { SettingsShell } from "@/components/dashboard/settings/settings-shell";
import { ghost } from "@/components/dashboard/settings/settings-ui";
import shell from "@/components/dashboard/settings/settings-shell.module.css";
import {
  Topbar,
} from "@/components/dashboard/topbar";

import {
  EmptyState,
} from "@/components/dashboard/ui";

import styles from "@/components/dashboard/ui.module.css";
import { CloudflareSettings } from "@/components/dashboard/cloudflare-settings";

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

  const gscConnectHref =
    websites[0]
      ? `/api/integrations/google/connect?websiteId=${encodeURIComponent(
          websites[0].id
        )}`
      : `/api/integrations/google/connect?workspaceId=${encodeURIComponent(
          workspace.id
        )}`;

  const gscActionLabel =
    gscConnection?.status ===
    "CONNECTED"
      ? "Reconnect"
      : gscConnection?.status ===
          "ERROR"
        ? "Reconnect"
        : "Connect";

  return (
    <SettingsShell
      active="general"
      title="General"
      description={`${workspace.name} · workspace, connections and websites.`}
    >
        <div className={shell.stack}>
          <div className={`${styles.group} ${shell.card}`}>
            <div className={`${styles.groupHeader} ${shell.cardHead}`}>
              <span className={styles.groupLabel}>
                Workspace
              </span>
            </div>

            <div className={`${styles.issueRow} ${shell.cardRow}`}>
              <div className={styles.issueMain}>

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

          <div className={`${styles.group} ${shell.card}`}>
            <div className={`${styles.groupHeader} ${shell.cardHead}`}>
              <span className={styles.groupLabel}>
                Integrations
              </span>
            </div>

            <div className={`${styles.issueRow} ${shell.cardRow}`}>
              <div className={styles.issueMain}>

                <div>
                  <div className={styles.issueTitle}>
                    Google Search Console
                  </div>

                  <div className={styles.issueDesc}>
                    Search performance
                  </div>
                </div>
              </div>

              <div className={styles.issueMeta}>
                <span style={{ color: gscConnection?.status === "CONNECTED" ? "#ededed" : gscConnection?.status === "ERROR" ? "#ff6369" : "#8f8f8f", fontSize: 13 }}>
                  {gscConnection?.status === "CONNECTED" ? "Connected" : gscConnection?.status === "ERROR" ? "Needs reconnect" : "Not connected"}
                </span>

                <Link
                  href={gscConnectHref}
                  style={ghost}
                >
                  {gscActionLabel}
                </Link>
              </div>
            </div>

            <CloudflareSettings websites={websites.map((w) => ({ id: w.id, name: w.business.name, url: w.url }))} />
          </div>

          <div className={`${styles.group} ${styles.settingsWide} ${shell.card}`}>
            <div className={`${styles.groupHeader} ${shell.cardHead}`}>
              <span className={styles.groupLabel}>
                Websites
              </span>

              <span className={styles.groupCount}>
                {websites.length}
              </span>
            </div>

            {!websites.length ? (
              <div className={`${styles.issueRow} ${shell.cardRow}`}>
                <div className={styles.issueDesc}>
                  No websites
                </div>

                <Link
                  href="/dashboard/add-website"
                  style={ghost}
                >
                  Add website
                </Link>
              </div>
            ) : (
              websites.map(
                (website) => {

                  return (
                    <div
                      key={website.id}
                      className={`${styles.issueRow} ${shell.cardRow}`}
                    >
                      <div className={styles.issueMain}>

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
                        <Link
                          href={`/dashboard/seo?websiteId=${website.id}`}
                          style={ghost}
                        >
                          SEO audit
                        </Link>
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        </div>
    </SettingsShell>
  );
}
