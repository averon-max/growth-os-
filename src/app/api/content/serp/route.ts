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
  buildSerpIntelligence,
  SerpIntelligenceError,
} from "@/lib/content/serp-intelligence";


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

    const keyword =
      req.nextUrl
        .searchParams
        .get(
          "keyword"
        )
        ?.trim();

    const locationName =
      req.nextUrl
        .searchParams
        .get(
          "locationName"
        )
        ?.trim() ||
      "United States";

    const languageName =
      req.nextUrl
        .searchParams
        .get(
          "languageName"
        )
        ?.trim() ||
      "English";

    if (
      !websiteId ||
      !keyword
    ) {
      return NextResponse.json(
        {
          error:
            "websiteId and keyword are required.",
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

    const intelligence =
      await buildSerpIntelligence({
        keyword,
        locationName,
        languageName,
      });

    return NextResponse.json(
      {
        intelligence,
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

    if (
      error instanceof
      SerpIntelligenceError
    ) {
      console.error(
        "[content SERP]",
        error.message
      );

      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 502,
        }
      );
    }

    console.error(
      "[content SERP]",
      error instanceof Error
        ? error.message
        : "Unknown SERP intelligence error"
    );

    return NextResponse.json(
      {
        error:
          "Could not build SERP intelligence.",
      },
      {
        status: 500,
      }
    );
  }
}
