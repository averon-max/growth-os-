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


export async function POST(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
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
        websiteId?: string;
      };

    const websiteId =
      body.websiteId?.trim();

    if (!websiteId) {
      return NextResponse.json(
        {
          error:
            "websiteId is required.",
        },
        {
          status: 400,
        }
      );
    }

    const website =
      await requireWebsiteAccess(
        user.id,
        websiteId
      );

    const fact =
      await prisma.businessFact.findUnique({
        where: {
          id,
        },
      });

    if (
      !fact ||
      fact.businessId !==
        website.businessId
    ) {
      return NextResponse.json(
        {
          error:
            "Business fact not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      fact.status !==
      "PROPOSED"
    ) {
      return NextResponse.json(
        {
          error:
            `Only PROPOSED facts can be rejected. Current status: ${fact.status}.`,
        },
        {
          status: 409,
        }
      );
    }

    const [
      updated,
    ] =
      await prisma.$transaction([
        prisma.businessFact.update({
          where: {
            id,
          },

          data: {
            status:
              "REJECTED",
          },
        }),

        prisma.businessFactEvent.create({
          data: {
            businessFactId:
              id,

            action:
              "REJECTED",

            actorUserId:
              user.id,

            previousStatus:
              fact.status,

            nextStatus:
              "REJECTED",
          },
        }),
      ]);

    return NextResponse.json({
      fact:
        updated,
    });
  } catch (err) {
    console.error(
      "content/facts/[id]/reject POST error",
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
