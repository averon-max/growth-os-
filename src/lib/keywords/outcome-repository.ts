import {
  prisma,
} from "@/lib/prisma";

export async function getOutcomeActionById(
  workspaceId: string,
  actionId: string
) {
  return prisma.keywordOutcomeAction.findFirst({
    where: {
      id: actionId,
      workspaceId,
    },

    include: {
      observations: {
        orderBy: {
          observedAt: "asc",
        },
      },
    },
  });
}

export async function listOutcomeActionsForWebsite({
  workspaceId,
  websiteId,
  limit = 50,
}: {
  workspaceId: string;
  websiteId: string;
  limit?: number;
}) {
  return prisma.keywordOutcomeAction.findMany({
    where: {
      workspaceId,
      websiteId,
    },

    orderBy: {
      createdAt: "desc",
    },

    take: Math.min(
      100,
      Math.max(
        1,
        limit
      )
    ),

    include: {
      observations: {
        orderBy: {
          observedAt: "asc",
        },
      },
    },
  });
}

export async function findLatestOutcomeAction({
  workspaceId,
  websiteId,
  normalizedKeyword,
  market,
}: {
  workspaceId: string;
  websiteId: string;
  normalizedKeyword: string;
  market: string;
}) {
  return prisma.keywordOutcomeAction.findFirst({
    where: {
      workspaceId,
      websiteId,
      normalizedKeyword,
      market: market.toUpperCase(),
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      observations: {
        orderBy: {
          observedAt: "asc",
        },
      },
    },
  });
}

export async function countOutcomeActions(
  workspaceId: string,
  websiteId: string
) {
  return prisma.keywordOutcomeAction.count({
    where: {
      workspaceId,
      websiteId,
    },
  });
}
