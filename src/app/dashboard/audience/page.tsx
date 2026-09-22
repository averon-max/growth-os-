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
        <AudienceIntelligence
          websiteId={
            website.id
          }
        />
      </div>
    </>
  );
}
