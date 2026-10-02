import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  authErrorResponse,
  requireUser,
  requireWebsiteAccess,
} from "@/lib/auth-helpers";

import {
  getZeroCostContentSuggestionsV1,
} from "@/lib/content/content-suggestions-v1";


export async function GET(
  request:
    NextRequest
) {
  try {
    const user =
      await requireUser();


    const websiteId =
      request.nextUrl
        .searchParams
        .get(
          "websiteId"
        )
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


    const seed =
      request.nextUrl
        .searchParams
        .get(
          "seed"
        )
        ?.trim()
      ?? "";


    const result =
      await getZeroCostContentSuggestionsV1({
        websiteId,
        seed,
      });


    return NextResponse.json(
      result
    );
  } catch (
    error
  ) {
    const {
      status,
      body,
    } =
      authErrorResponse(
        error
      );

    return NextResponse.json(
      body,
      {
        status,
      }
    );
  }
}
