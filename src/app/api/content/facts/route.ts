import {
  NextRequest,
  NextResponse,
} from "next/server";

import type {
  BusinessFactType,
} from "@prisma/client";

import {
  requireUser,
  requireWebsiteAccess,
  authErrorResponse,
} from "@/lib/auth-helpers";

import {
  prisma,
} from "@/lib/prisma";

const TYPES = new Set([
  "CAPABILITY",
  "METRIC",
  "DATA_SOURCE",
  "POLICY",
  "DIFFERENTIATOR",
  "COMPLIANCE",
  "OTHER",
]);

export async function GET(
  req: NextRequest
) {
  try {
    const user =
      await requireUser();

    const websiteId =
      req.nextUrl.searchParams
        .get("websiteId")
        ?.trim();

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

    const items =
      await prisma.businessFact.findMany({
        where: {
          businessId:
            website.businessId,
        },
        include: {
          events: {
            orderBy: {
              createdAt:
                "desc",
            },
          },
        },
        orderBy: {
          createdAt:
            "desc",
        },
      });

    return NextResponse.json({
      items,
    });
  } catch (err) {
    const {
      status,
      body,
    } = authErrorResponse(err);

    return NextResponse.json(
      body,
      {
        status,
      }
    );
  }
}

export async function POST(
  req: NextRequest
) {
  try {
    const user =
      await requireUser();

    const body =
      await req.json() as {
        websiteId?: string;
        type?: string;
        claim?: string;
        sourceUrl?: string;
        sourceLabel?: string;
        evidence?: string;
        confidence?: number;
      };

    const websiteId =
      body.websiteId?.trim();

    const claim =
      body.claim?.trim();

    const type =
      body.type
        ?.trim()
        .toUpperCase();

    if (
      !websiteId ||
      !claim ||
      !type
    ) {
      return NextResponse.json(
        {
          error:
            "websiteId, type, and claim are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!TYPES.has(type)) {
      return NextResponse.json(
        {
          error:
            "Invalid fact type.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      body.confidence !== undefined &&
      (
        typeof body.confidence !== "number" ||
        body.confidence < 0 ||
        body.confidence > 1
      )
    ) {
      return NextResponse.json(
        {
          error:
            "confidence must be between 0 and 1.",
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

    let sourceUrl:
      string | null =
      null;

    if (
      body.sourceUrl?.trim()
    ) {
      try {
        const parsed =
          new URL(
            body.sourceUrl.trim()
          );

        if (
          parsed.protocol !== "https:" &&
          parsed.protocol !== "http:"
        ) {
          throw new Error(
            "bad protocol"
          );
        }

        sourceUrl =
          parsed.toString();
      } catch {
        return NextResponse.json(
          {
            error:
              "sourceUrl must be a valid HTTP or HTTPS URL.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const fact =
      await prisma.businessFact.create({
        data: {
          businessId:
            website.businessId,

          type:
            type as BusinessFactType,

          claim,

          status:
            "PROPOSED",

          sourceUrl,

          sourceLabel:
            body.sourceLabel
              ?.trim() ||
            null,

          evidence:
            body.evidence
              ?.trim() ||
            null,

          confidence:
            body.confidence ??
            null,

          createdByUserId:
            user.id,

          events: {
            create: {
              action:
                "CREATED",

              actorUserId:
                user.id,

              nextStatus:
                "PROPOSED",
            },
          },
        },

        include: {
          events:
            true,
        },
      });

    return NextResponse.json(
      {
        fact,
      },
      {
        status: 201,
      }
    );
  } catch (err) {
    console.error(
      "content/facts POST error",
      err
    );

    const {
      status,
      body,
    } = authErrorResponse(err);

    return NextResponse.json(
      body,
      {
        status,
      }
    );
  }
}
