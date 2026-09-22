import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireUser,
  requireWebsiteAccess,
  authErrorResponse,
} from "@/lib/auth-helpers";

import {
  prisma,
} from "@/lib/prisma";

import {
  createContentBrief,
} from "@/lib/content/service";

import {
  geminiGenerator,
} from "@/lib/content/gemini-generator";

import {
  getOutcomeActionById,
} from "@/lib/keywords/outcome-repository";

import {
  evaluateOutcomeCreateBriefPermission,
} from "@/lib/keywords/outcome-create-brief";

import {
  evaluateBusinessCompatibilityForWebsite,
} from "@/lib/keywords/business-compatibility";

export async function POST(
  req: NextRequest,
  {
    params,
  }: {
    params:
      Promise<{
        id:
          string;
      }>;
  }
) {
  try {
    const user =
      await requireUser();

    const {
      id,
    } =
      await params;

    const body =
      await req.json() as {
        websiteId?:
          string;
      };

    const websiteId =
      body.websiteId?.trim() ??
      "";

    if (
      !websiteId
    ) {
      return NextResponse.json(
        {
          error:
            "websiteId is required.",
        },
        {
          status:
            400,
        }
      );
    }

    const website =
      await requireWebsiteAccess(
        user.id,
        websiteId
      );

    const action =
      await getOutcomeActionById(
        website.business.workspaceId,
        id
      );

    if (
      !action ||
      action.websiteId !==
        websiteId
    ) {
      return NextResponse.json(
        {
          error:
            "Growth OS action not found.",
        },
        {
          status:
            404,
        }
      );
    }

    const existing =
      await prisma.contentBrief.findUnique({
        where: {
          outcomeActionId:
            action.id,
        },
      });

    if (
      existing
    ) {
      return NextResponse.json({
        brief:
          existing,

        reused:
          true,
      });
    }

    const permission =
      evaluateOutcomeCreateBriefPermission({
        decision:
          action.decision,

        status:
          action.status,

        compatibilityStatus:
          action.compatibilityStatus,
      });

    if (
      !permission.allowed
    ) {
      return NextResponse.json(
        {
          error:
            permission.reason,

          compatibilityStatus:
            action.compatibilityStatus,
        },
        {
          status:
            409,
        }
      );
    }

    const currentCompatibility =
      await evaluateBusinessCompatibilityForWebsite({
        websiteId,

        keyword:
          action.keywordText,
      });

    if (
      currentCompatibility.status !==
      action.compatibilityStatus
    ) {
      return NextResponse.json(
        {
          error:
            "Данные бизнеса изменились после создания плана. Обновите анализ перед выполнением.",

          storedCompatibilityStatus:
            action.compatibilityStatus,

          currentCompatibilityStatus:
            currentCompatibility.status,
        },
        {
          status:
            409,
        }
      );
    }

    const educationalOnly =
      action.compatibilityStatus ===
      "EDUCATIONAL_ONLY";

    const recommendation =
      educationalOnly
        ? [
            "Create an educational page only.",
            "Do not imply that the business provides this product, service, or capability.",
            "Use only claims supported by verified Business Facts and the immutable evidence snapshot.",
          ].join(
            " "
          )
        : [
            "Create the dedicated page described by the Growth OS Outcome Action.",
            "Keep the primary keyword aligned exactly with the Outcome Action.",
            "Use only verified business claims and evidence-backed content.",
          ].join(
            " "
          );

    const brief =
      await createContentBrief(
        geminiGenerator,
        {
          websiteId,

          outcomeActionId:
            action.id,

          requiredPrimaryKeyword:
            action.keywordText,

          topic:
            action.keywordText,

          reason:
            action.rationale,

          recommendation,

          businessName:
            website.business.name,

          websiteUrl:
            website.url,
        }
      );

    return NextResponse.json(
      {
        brief,

        reused:
          false,

        compatibilityStatus:
          action.compatibilityStatus,
      },
      {
        status:
          201,
      }
    );
  } catch (
    err
  ) {
    if (
      err instanceof Error &&
      err.message.startsWith(
        "Content plan primary keyword"
      )
    ) {
      return NextResponse.json(
        {
          error:
            err.message,
        },
        {
          status:
            409,
        }
      );
    }

    console.error(
      "outcome-actions/[id]/create-brief POST error",
      err
    );

    const {
      status,
      body,
    } =
      authErrorResponse(
        err
      );

    return NextResponse.json(
      body,
      {
        status,
      }
    );
  }
}
