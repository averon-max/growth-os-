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
  discoverBusinessFacts,
} from "@/lib/content/fact-discovery";


export async function POST(
  req:
    NextRequest
) {
  try {
    const user =
      await requireUser();

    const body =
      await req.json() as {
        websiteId?:
          string;
      };

    const websiteId =
      body.websiteId
        ?.trim();

    if (!websiteId) {
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

    await requireWebsiteAccess(
      user.id,
      websiteId
    );

    const result =
      await discoverBusinessFacts({
        websiteId,
        actorUserId:
          user.id,
      });

    return NextResponse.json({
      result,
    });
  } catch (err) {
    console.error(
      "[fact-discovery] route error",
      err
    );

    const {
      status,
      body,
    } =
      authErrorResponse(
        err
      );

    if (
      process.env.NODE_ENV !==
        "production" &&
      status >= 500
    ) {
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? `${err.name}: ${err.message}`
              : "Unknown fact discovery error",
        },
        {
          status,
        }
      );
    }

    return NextResponse.json(
      body,
      {
        status,
      }
    );
  }
}
