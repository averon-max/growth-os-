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
  buildContentStrategy,
} from "@/lib/content/seo-strategy";


export async function GET(
  req: NextRequest
) {
  try {
    const user =
      await requireUser();

    const websiteId =
      req.nextUrl
        .searchParams
        .get("websiteId")
        ?.trim();

    const topic =
      req.nextUrl
        .searchParams
        .get("topic")
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

    const strategy =
      await buildContentStrategy({
        websiteId,
        topic,

        businessName:
          website.business
            .name,
      });

    return NextResponse.json({
      strategy,
    });
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
      "[content strategy]",
      error instanceof Error
        ? error.message
        : "Unknown strategy error"
    );

    return NextResponse.json(
      {
        error:
          "Could not build content strategy.",
      },
      {
        status: 500,
      }
    );
  }
}
