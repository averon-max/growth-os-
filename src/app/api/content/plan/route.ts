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
  buildFinalContentPlan,
} from "@/lib/content/final-content-plan";


export const dynamic =
  "force-dynamic";


export async function GET(
  req:
    NextRequest
) {
  try {
    const user =
      await requireUser();

    const websiteId =
      req.nextUrl
        .searchParams
        .get(
          "websiteId"
        )
        ?.trim();

    const topic =
      req.nextUrl
        .searchParams
        .get(
          "topic"
        )
        ?.trim();

    if (
      !websiteId ||
      !topic
    ) {
      return NextResponse.json(
        {
          error:
            "websiteId and topic are required.",
        },
        {
          status: 400,
        }
      );
    }

    await requireWebsiteAccess(
      user.id,
      websiteId
    );

    const website =
      await prisma.website.findUnique({
        where: {
          id:
            websiteId,
        },

        select: {
          business: {
            select: {
              name:
                true,
            },
          },
        },
      });

    if (!website) {
      return NextResponse.json(
        {
          error:
            "Website not found.",
        },
        {
          status: 404,
        }
      );
    }

    const plan =
      await buildFinalContentPlan({
        websiteId,
        topic,

        businessName:
          website.business
            .name,
      });

    return NextResponse.json(
      {
        plan,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    const {
      status,
      body,
    } =
      authErrorResponse(
        error
      );

    if (
      status !== 500
    ) {
      return NextResponse.json(
        body,
        {
          status,
        }
      );
    }

    console.error(
      "[content plan]",
      error instanceof Error
        ? error.message
        : "Unknown content plan error"
    );

    return NextResponse.json(
      {
        error:
          "Could not build final content plan.",
      },
      {
        status: 500,
      }
    );
  }
}
