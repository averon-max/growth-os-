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
  hashEvidenceText,
} from "@/lib/content/evidence-drift";



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
      fact.status ===
      "VERIFIED"
    ) {
      return NextResponse.json({
        fact,
      });
    }

    if (
      fact.status !==
      "PROPOSED"
    ) {
      return NextResponse.json(
        {
          error:
            `Only PROPOSED facts can be verified. Current status: ${fact.status}.`,
        },
        {
          status: 409,
        }
      );
    }

    if (
      !fact.sourceUrl ||
      !fact.evidence?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Source URL and evidence are required before a business fact can be verified.",
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
              "VERIFIED",

            verifiedAt:
              new Date(),

            verifiedByUserId:
              user.id,

              evidenceStatus:
                "UNCHECKED",

              evidenceHash:
                hashEvidenceText(
                  fact.evidence ??
                    ""
                ),

              sourceContentHash:
                null,

              lastEvidenceCheckedAt:
                null,

              lastEvidenceSeenAt:
                null,

              evidenceCheckError:
                null,

          },
        }),

        prisma.businessFactEvent.create({
          data: {
            businessFactId:
              id,

            action:
              "VERIFIED",

            actorUserId:
              user.id,

            previousStatus:
              fact.status,

            nextStatus:
              "VERIFIED",
          },
        }),
      ]);

    return NextResponse.json({
      fact:
        updated,
    });
  } catch (err) {
    console.error(
      "content/facts/[id]/verify POST error",
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
