import type {
  Prisma,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  evaluateBusinessCompatibilityForWebsite,
} from "./business-compatibility";

export function shouldCreateOutcomeRevision(
  storedStatus: string,
  currentStatus: string
): boolean {
  return (
    storedStatus !==
    currentStatus
  );
}

export async function refreshOutcomeActionCompatibility({
  workspaceId,
  websiteId,
  actionId,
}: {
  workspaceId: string;
  websiteId: string;
  actionId: string;
}) {
  const action =
    await prisma.keywordOutcomeAction.findFirst({
      where: {
        id:
          actionId,

        workspaceId,

        websiteId,
      },

      include: {
        observations: {
          orderBy: {
            observedAt:
              "asc",
          },
        },

        supersededBy:
          true,
      },
    });

  if (
    !action
  ) {
    throw new Error(
      "Outcome action not found."
    );
  }

  if (
    action.supersededBy
  ) {
    return {
      action:
        action.supersededBy,

      changed:
        true,

      reused:
        true,
    };
  }

  if (
    action.status !==
    "PLANNED"
  ) {
    throw new Error(
      "Only a planned outcome action can be revalidated."
    );
  }

  const compatibility =
    await evaluateBusinessCompatibilityForWebsite({
      websiteId,

      keyword:
        action.keywordText,
    });

  if (
    !shouldCreateOutcomeRevision(
      action.compatibilityStatus,
      compatibility.status
    )
  ) {
    return {
      action,

      changed:
        false,

      reused:
        true,
    };
  }

  const baseline =
    action.observations.find(
      (
        observation
      ) =>
        observation.checkpoint ===
        "BASELINE"
    );

  const next =
    await prisma.$transaction(
      async (
        tx
      ) => {
        const cancelled =
          await tx.keywordOutcomeAction.updateMany({
            where: {
              id:
                action.id,

              workspaceId,

              websiteId,

              status:
                "PLANNED",
            },

            data: {
              status:
                "CANCELLED",
            },
          });

        if (
          cancelled.count !==
          1
        ) {
          throw new Error(
            "Outcome action changed while compatibility was being refreshed."
          );
        }

        const created =
          await tx.keywordOutcomeAction.create({
            data: {
              workspaceId:
                action.workspaceId,

              websiteId:
                action.websiteId,

              keywordId:
                action.keywordId,

              keywordText:
                action.keywordText,

              normalizedKeyword:
                action.normalizedKeyword,

              market:
                action.market,

              language:
                action.language,

              device:
                action.device,

              decision:
                action.decision,

              compatibilityStatus:
                compatibility.status,

              compatibilityReason:
                compatibility.reason,

              compatibilitySnapshot:
                compatibility as unknown as Prisma.InputJsonValue,

              compatibilityCheckedAt:
                new Date(),

              status:
                "PLANNED",

              targetPageUrl:
                action.targetPageUrl,

              rationale:
                action.rationale,

              evidence:
                action.evidence as Prisma.InputJsonValue,

              planSnapshot:
                action.planSnapshot as Prisma.InputJsonValue,

              source:
                "GROWTH_OS_ACTION_REVALIDATION_V1",

              baselineLiveRank:
                action.baselineLiveRank,

              baselineLiveRankState:
                action.baselineLiveRankState,

              baselineImpressions:
                action.baselineImpressions,

              baselineClicks:
                action.baselineClicks,

              baselineCtr:
                action.baselineCtr,

              baselineAveragePosition:
                action.baselineAveragePosition,

              baselineGscSnapshotDate:
                action.baselineGscSnapshotDate,

              supersedesActionId:
                action.id,
            },
          });

        await tx.keywordOutcomeObservation.create({
          data: {
            actionId:
              created.id,

            checkpoint:
              "BASELINE",

            source:
              baseline?.source ??
              (
                action.baselineGscSnapshotDate
                  ? "COMBINED"
                  : "ACTION_BASELINE"
              ),

            liveRank:
              baseline?.liveRank ??
              action.baselineLiveRank,

            liveRankState:
              baseline?.liveRankState ??
              action.baselineLiveRankState,

            impressions:
              baseline?.impressions ??
              action.baselineImpressions,

            clicks:
              baseline?.clicks ??
              action.baselineClicks,

            ctr:
              baseline?.ctr ??
              action.baselineCtr,

            averagePosition:
              baseline?.averagePosition ??
              action.baselineAveragePosition,

            gscSnapshotDate:
              baseline?.gscSnapshotDate ??
              action.baselineGscSnapshotDate,

            pageUrl:
              baseline?.pageUrl ??
              null,
          },
        });

        return created;
      }
    );

  return {
    action:
      next,

    changed:
      true,

    reused:
      false,
  };
}
