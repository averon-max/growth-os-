import {
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
  AudienceIntelligence,
} from "@/components/dashboard/audience-intelligence";

import {
  EmptyState,
} from "@/components/dashboard/ui";

import styles from "@/components/dashboard/ui.module.css";
import map from "./audience.module.css";
import { CountryMap } from "@/components/dashboard/country-map";
import { buildTrafficReport } from "@/lib/traffic/report";


export default async function AudiencePage({
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

  if (!website) {
    return (
      <>
        <Topbar
          title="Audience"
        />

        <div
          className={
            styles.pageBody
          }
        >
          <EmptyState
            icon={Globe}
            title="Add a website first"
            description="Connect a website before viewing audience data."
            actionLabel="Add Website"
            actionHref="/dashboard/add-website"
          />
        </div>
      </>
    );
  }

  // Countries come from the one traffic report (28 days), like every other page.
  const report = membership
    ? await buildTrafficReport({ websiteId: website.id, workspaceId: membership.workspaceId, url: website.url, days: 28 }).catch(() => null)
    : null;

  return (
    <>
      <Topbar
        title="Audience"
        subtitle={
          website.url
        }
        websiteSwitcher={
          membership
            ? {
                workspaceId:
                  membership.workspaceId,

                currentWebsiteId:
                  website.id,
              }
            : undefined
        }
      />

      <div
        className={
          styles.pageBody
        }
      >
        {report ? (
          <section className={map.panel}>
            <div className={map.head}>
              <h2 className={map.title}>Countries</h2>
              <span className={map.hint}>last 28 days · the same numbers as the Overview and Traffic report</span>
            </div>
            <CountryMap rows={report.countries} />
          </section>
        ) : null}
        <AudienceIntelligence
          websiteId={
            website.id
          }
        />
      </div>
    </>
  );
}
