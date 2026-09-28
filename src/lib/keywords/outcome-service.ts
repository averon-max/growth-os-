import type {
  Prisma,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import type {
  OpportunityActionPlan,
} from "./opportunity-action-plan";

import type {
  OpportunityDiagnosis,
} from "./opportunity-diagnosis";

import {
  evaluateBusinessCompatibilityForWebsite,
} from "./business-compatibility";

export type OutcomeCheckpoint =
  | "DAY_7"
  | "DAY_14"
  | "DAY_28"
  | "DAY_60"
  | "DAY_90";

export type OutcomeLiveRankState =
  | "FOUND"
  | "NOT_TOP_100"
  | "UNAVAILABLE";

export type OutcomeObservationSource =
  | "LIVE_SERP"
  | "GOOGLE_SEARCH_CONSOLE"
  | "COMBINED"
  | "MANUAL"
  | "NO_DATA";

export interface OutcomeObservationInput {
  liveRank: number | null;
  liveRankState: OutcomeLiveRankState;
  impressions?: number | null;
  clicks?: number | null;
  ctr?: number | null;
  averagePosition?: number | null;
  gscSnapshotDate?: Date | null;
  pageUrl?: string | null;
  observedAt?: Date;
}

export type RankMovement =
  | "ENTERED_TOP_100"
  | "LEFT_TOP_100"
  | "MOVED_UP"
  | "MOVED_DOWN"
  | "UNCHANGED"
  | "UNKNOWN";

function normalizeKeyword(
  input: string
): string {
  return input
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      " "
    );
}

function assertLiveRankState(
  liveRank: number | null,
  state: OutcomeLiveRankState
) {
  if (
    state === "FOUND" &&
    (
      liveRank === null ||
      liveRank < 1
    )
  ) {
    throw new Error(
      "FOUND requires a positive numeric live rank."
    );
  }

  if (
    state !== "FOUND" &&
    liveRank !== null
  ) {
    throw new Error(
      "NOT_TOP_100 and UNAVAILABLE must not contain a numeric live rank."
    );
  }
}

function diagnosisRankState(
  diagnosis: OpportunityDiagnosis
): OutcomeLiveRankState {
  if (
    diagnosis.liveRank !== null
  ) {
    return "FOUND";
  }

  if (
    diagnosis.rankingStatus ===
    "NOT_TOP_100"
  ) {
    return "NOT_TOP_100";
  }

  return "UNAVAILABLE";
}

async function getLatestGscBaseline({
  keywordId,
  market,
}: {
  keywordId: string | null;
  market: string;
}) {
  if (
    !keywordId
  ) {
    return null;
  }

  return prisma.keywordSnapshot.findFirst({
    where: {
      keywordId,

      country:
        market.toLowerCase(),

      device:
        "DESKTOP",

      source:
        "GOOGLE_SEARCH_CONSOLE",
    },

    orderBy: [
      {
        date:
          "desc",
      },
      {
        retrievedAt:
          "desc",
      },
    ],
  });
}

export async function recordOutcomeAction({
  workspaceId,
  websiteId,
  diagnosis,
  actionPlan,
  source = "GROWTH_OS_ACTION_PLAN_V1",
}: {
  workspaceId: string;
  websiteId: string;
  diagnosis: OpportunityDiagnosis;
  actionPlan: OpportunityActionPlan;
  source?: string;
}) {
  const normalizedKeyword =
    normalizeKeyword(
      diagnosis.keyword
    );

  if (
    normalizedKeyword !==
      normalizeKeyword(
        actionPlan.keyword
      ) ||
    diagnosis.market.toUpperCase() !==
      actionPlan.market.toUpperCase()
  ) {
    throw new Error(
      "Diagnosis and action plan mismatch."
    );
  }

  const website =
    await prisma.website.findUnique({
      where: {
        id:
          websiteId,
      },

      include: {
        business: {
          select: {
            workspaceId:
              true,
          },
        },
      },
    });

  if (
    !website ||
    website.business.workspaceId !==
      workspaceId
  ) {
    throw new Error(
      "Website does not belong to this workspace."
    );
  }

  const keyword =
    await prisma.keyword.findUnique({
      where: {
        workspaceId_normalized: {
          workspaceId,
          normalized:
            normalizedKeyword,
        },
      },

      select: {
        id:
          true,
      },
    });

  const gsc =
    await getLatestGscBaseline({
      keywordId:
        keyword?.id ??
        null,

      market:
        diagnosis.market,
    });

  const liveRankState =
    diagnosisRankState(
      diagnosis
    );

  assertLiveRankState(
    diagnosis.liveRank,
    liveRankState
  );

  const compatibility =
    await evaluateBusinessCompatibilityForWebsite({
      websiteId,

      keyword:
        diagnosis.keyword,
    });

  return prisma.$transaction(
    async (
      tx
    ) => {
      const action =
        await tx.keywordOutcomeAction.create({
          data: {
            workspaceId,
            websiteId,

            keywordId:
              keyword?.id ??
              null,

            keywordText:
              diagnosis.keyword,

            normalizedKeyword,

            market:
              diagnosis.market.toUpperCase(),

            decision:
              actionPlan.decision,

            compatibilityStatus:
              compatibility.status,

            compatibilityReason:
              compatibility.reason,

            compatibilitySnapshot:
              compatibility as unknown as Prisma.InputJsonValue,

            compatibilityCheckedAt:
              new Date(),

            targetPageUrl:
              actionPlan.targetPageUrl,

            rationale:
              actionPlan.rationale,

            evidence:
              actionPlan.evidence as Prisma.InputJsonValue,

            planSnapshot:
              actionPlan as unknown as Prisma.InputJsonValue,

            source,

            baselineLiveRank:
              diagnosis.liveRank,

            baselineLiveRankState:
              liveRankState,

            baselineImpressions:
              gsc?.impressions ??
              null,

            baselineClicks:
              gsc?.clicks ??
              null,

            baselineCtr:
              gsc?.ctr ??
              null,

            baselineAveragePosition:
              gsc?.position ??
              null,

            baselineGscSnapshotDate:
              gsc?.date ??
              null,
          },
        });

      await tx.keywordOutcomeObservation.create({
        data: {
          actionId:
            action.id,

          checkpoint:
            "BASELINE",

          source:
            gsc
              ? "COMBINED"
              : "ACTION_BASELINE",

          liveRank:
            diagnosis.liveRank,

          liveRankState,

          impressions:
            gsc?.impressions ??
              null,

          clicks:
            gsc?.clicks ??
              null,

          ctr:
            gsc?.ctr ??
              null,

          averagePosition:
            gsc?.position ??
              null,

          gscSnapshotDate:
            gsc?.date ??
              null,

          pageUrl:
            diagnosis.ownPage?.url ??
              null,
        },
      });

      return tx.keywordOutcomeAction.findUniqueOrThrow({
        where: {
          id:
            action.id,
        },

        include: {
          observations: {
            orderBy: {
              observedAt:
                "asc",
            },
          },
        },
      });
    }
  );
}

export async function recordOutcomeObservation({
  workspaceId,
  actionId,
  checkpoint,
  source,
  observation,
}: {
  workspaceId: string;
  actionId: string;
  checkpoint: OutcomeCheckpoint;
  source: OutcomeObservationSource;
  observation: OutcomeObservationInput;
}) {
  assertLiveRankState(
    observation.liveRank,
    observation.liveRankState
  );

  const action =
    await prisma.keywordOutcomeAction.findFirst({
      where: {
        id:
          actionId,

        workspaceId,
      },

      select: {
        id:
          true,
      },
    });

  if (
    !action
  ) {
    throw new Error(
      "Outcome action not found in this workspace."
    );
  }

  return prisma.keywordOutcomeObservation.create({
    data: {
      actionId,

      checkpoint,

      source,

      liveRank:
        observation.liveRank,

      liveRankState:
        observation.liveRankState,

      impressions:
        observation.impressions ??
        null,

      clicks:
        observation.clicks ??
        null,

      ctr:
        observation.ctr ??
        null,

      averagePosition:
        observation.averagePosition ??
        null,

      gscSnapshotDate:
        observation.gscSnapshotDate ??
        null,

      pageUrl:
        observation.pageUrl ??
        null,

      observedAt:
        observation.observedAt ??
        new Date(),
    },
  });
}

export type OutcomeExecutionKind =
  | "CMS_FIX"
  | "CONTENT_PUBLISH";

function normalizeExecutionUrl(
  input: string
): string {
  try {
    const url =
      new URL(
        input
      );

    url.hash =
      "";

    url.search =
      "";

    let pathname =
      url.pathname ||
      "/";

    if (
      pathname.length >
        1 &&
      pathname.endsWith(
        "/"
      )
    ) {
      pathname =
        pathname.slice(
          0,
          -1
        );
    }

    return `${url.protocol}//${url.host}${pathname}`;
  } catch {
    return input
      .trim()
      .replace(
        /\/+$/,
        ""
      );
  }
}

export function evaluateOutcomeExecutionPermission({
  decision,
  compatibilityStatus,
  executionKind,
  normalizedKeyword,
  primaryKeyword,
  targetPageUrl,
  requestedPageUrl,
}: {
  decision:
    "CREATE" |
    "UPDATE" |
    "SKIP";

  compatibilityStatus:
    "SUPPORTED" |
    "EDUCATIONAL_ONLY" |
    "UNVERIFIED" |
    "CONFLICT";

  executionKind:
    OutcomeExecutionKind;

  normalizedKeyword:
    string;

  primaryKeyword?:
    string | null;

  targetPageUrl?:
    string | null;

  requestedPageUrl?:
    string | null;
}): {
  allowed:
    boolean;

  reason:
    string;
} {
  if (
    decision ===
    "SKIP"
  ) {
    return {
      allowed:
        false,

      reason:
        "SKIP actions cannot be executed.",
    };
  }

  if (
    compatibilityStatus ===
    "UNVERIFIED"
  ) {
    return {
      allowed:
        false,

      reason:
        "Business compatibility is unverified.",
    };
  }

  if (
    compatibilityStatus ===
    "CONFLICT"
  ) {
    return {
      allowed:
        false,

      reason:
        "Verified Business Facts conflict with this action.",
    };
  }

  if (
    compatibilityStatus ===
      "EDUCATIONAL_ONLY" &&
    executionKind !==
      "CONTENT_PUBLISH"
  ) {
    return {
      allowed:
        false,

      reason:
        "Educational-only opportunities cannot execute direct product or CMS changes.",
    };
  }

  if (
    decision ===
      "CREATE" &&
    executionKind !==
      "CONTENT_PUBLISH"
  ) {
    return {
      allowed:
        false,

      reason:
        "CREATE decisions must be fulfilled through a published content/page workflow.",
    };
  }

  if (
    executionKind ===
    "CMS_FIX"
  ) {
    if (
      !targetPageUrl ||
      !requestedPageUrl
    ) {
      return {
        allowed:
          false,

        reason:
          "CMS execution requires the planned target page.",
      };
    }

    if (
      normalizeExecutionUrl(
        targetPageUrl
      ) !==
      normalizeExecutionUrl(
        requestedPageUrl
      )
    ) {
      return {
        allowed:
          false,

        reason:
          "CMS execution target does not match the page stored in the Outcome Action.",
      };
    }
  }

  if (
    executionKind ===
    "CONTENT_PUBLISH"
  ) {
    if (
      !primaryKeyword
    ) {
      return {
        allowed:
          false,

        reason:
          "Content execution requires a primary keyword.",
      };
    }

    if (
      normalizeKeyword(
        primaryKeyword
      ) !==
      normalizedKeyword
    ) {
      return {
        allowed:
          false,

        reason:
          "Published content keyword does not match the Outcome Action keyword.",
      };
    }
  }

  return {
    allowed:
      true,

    reason:
      compatibilityStatus ===
      "EDUCATIONAL_ONLY"
        ? "Educational content may proceed, subject to the Content Quality Gate."
        : "Execution is supported by the stored Outcome Action and Business Facts.",
  };
}

export async function assertOutcomeActionExecutable({
  workspaceId,
  websiteId,
  actionId,
  executionKind,
  primaryKeyword,
  requestedPageUrl,
}: {
  workspaceId:
    string;

  websiteId:
    string;

  actionId:
    string;

  executionKind:
    OutcomeExecutionKind;

  primaryKeyword?:
    string | null;

  requestedPageUrl?:
    string | null;
}) {
  const action =
    await prisma.keywordOutcomeAction.findFirst({
      where: {
        id:
          actionId,

        workspaceId,

        websiteId,
      },

      select: {
        id:
          true,

        decision:
          true,

        status:
          true,

        websiteId:
          true,

        compatibilityStatus:
          true,

        normalizedKeyword:
          true,

        targetPageUrl:
          true,
      },
    });

  if (
    !action
  ) {
    throw new Error(
      "Outcome action not found for this website and workspace."
    );
  }

  if (
    action.status !==
    "PLANNED"
  ) {
    throw new Error(
      "Only a planned outcome action can be executed."
    );
  }

  const permission =
    evaluateOutcomeExecutionPermission({
      decision:
        action.decision,

      compatibilityStatus:
        action.compatibilityStatus,

      executionKind,

      normalizedKeyword:
        action.normalizedKeyword,

      primaryKeyword,

      targetPageUrl:
        action.targetPageUrl,

      requestedPageUrl,
    });

  if (
    !permission.allowed
  ) {
    throw new Error(
      permission.reason
    );
  }

  return action;
}

export async function markOutcomeActionExecuted({
  workspaceId,
  websiteId,
  actionId,
  executionKind,
  primaryKeyword,
  requestedPageUrl,
  appliedFixId,
  contentArticleId,
}: {
  workspaceId:
    string;

  websiteId:
    string;

  actionId:
    string;

  executionKind:
    OutcomeExecutionKind;

  primaryKeyword?:
    string | null;

  requestedPageUrl?:
    string | null;

  appliedFixId?:
    string | null;

  contentArticleId?:
    string | null;
}) {
  const executionReferenceCount =
    Number(
      Boolean(
        appliedFixId
      )
    ) +
    Number(
      Boolean(
        contentArticleId
      )
    );

  if (
    executionReferenceCount !==
    1
  ) {
    throw new Error(
      "Exactly one execution reference is required."
    );
  }

  await assertOutcomeActionExecutable({
    workspaceId,
    websiteId,
    actionId,
    executionKind,
    primaryKeyword,
    requestedPageUrl,
  });

  const update =
    await prisma.keywordOutcomeAction.updateMany({
      where: {
        id:
          actionId,

        workspaceId,

        websiteId,

        status:
          "PLANNED",
      },

      data: {
        status:
          "EXECUTED",

        appliedFixId:
          appliedFixId ??
          null,

        contentArticleId:
          contentArticleId ??
          null,

        executedAt:
          new Date(),
      },
    });

  if (
    update.count !==
    1
  ) {
    throw new Error(
      "Outcome action was changed before execution could be recorded."
    );
  }

  return prisma.keywordOutcomeAction.findUniqueOrThrow({
    where: {
      id:
        actionId,
    },
  });
}

export function calculateRankMovement({
  baselineState,
  baselineRank,
  currentState,
  currentRank,
}: {
  baselineState: OutcomeLiveRankState;
  baselineRank: number | null;
  currentState: OutcomeLiveRankState;
  currentRank: number | null;
}): {
  movement: RankMovement;
  positionsGained: number | null;
} {
  assertLiveRankState(
    baselineRank,
    baselineState
  );

  assertLiveRankState(
    currentRank,
    currentState
  );

  if (
    baselineState === "UNAVAILABLE" ||
    currentState === "UNAVAILABLE"
  ) {
    return {
      movement:
        "UNKNOWN",

      positionsGained:
        null,
    };
  }

  if (
    baselineState === "NOT_TOP_100" &&
    currentState === "FOUND"
  ) {
    return {
      movement:
        "ENTERED_TOP_100",

      positionsGained:
        null,
    };
  }

  if (
    baselineState === "FOUND" &&
    currentState === "NOT_TOP_100"
  ) {
    return {
      movement:
        "LEFT_TOP_100",

      positionsGained:
        null,
    };
  }

  if (
    baselineState === "NOT_TOP_100" &&
    currentState === "NOT_TOP_100"
  ) {
    return {
      movement:
        "UNCHANGED",

      positionsGained:
        null,
    };
  }

  if (
    baselineRank === null ||
    currentRank === null
  ) {
    return {
      movement:
        "UNKNOWN",

      positionsGained:
        null,
    };
  }

  const positionsGained =
    baselineRank -
    currentRank;

  return {
    movement:
      positionsGained > 0
        ? "MOVED_UP"
        : positionsGained < 0
          ? "MOVED_DOWN"
          : "UNCHANGED",

    positionsGained,
  };
}

export function numericDelta(
  baseline: number | null,
  current: number | null
): number | null {
  if (
    baseline === null ||
    current === null
  ) {
    return null;
  }

  return current - baseline;
}
