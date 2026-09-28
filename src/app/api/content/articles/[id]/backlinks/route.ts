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
  getContentArticleById,
} from "@/lib/content/repository";

import {
  BacklinkServiceError,
  getArticleBacklinkState,
  scanPublishedArticleBacklinks,
} from "@/lib/backlinks/service";


export async function GET(
  _request:
    NextRequest,
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
    const {
      id,
    } =
      await params;


    const user =
      await requireUser();


    const article =
      await getContentArticleById(
        id
      );


    if (
      !article
    ) {
      return NextResponse.json(
        {
          error:
            "Article not found.",
        },
        {
          status:
            404,
        }
      );
    }


    await requireWebsiteAccess(
      user.id,
      article
        .brief
        .websiteId
    );


    return NextResponse.json({
      backlinks:
        await getArticleBacklinkState(
          id
        ),
    });
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


export async function POST(
  request:
    NextRequest,
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
    const {
      id,
    } =
      await params;


    const user =
      await requireUser();


    const article =
      await getContentArticleById(
        id
      );


    if (
      !article
    ) {
      return NextResponse.json(
        {
          error:
            "Article not found.",
        },
        {
          status:
            404,
        }
      );
    }


    await requireWebsiteAccess(
      user.id,
      article
        .brief
        .websiteId
    );


    const body =
      await request
        .json()
        .catch(
          () => ({})
        ) as {
          maxPages?:
            number;
        };


    const maxPages =
      body.maxPages ??
      3;


    if (
      !Number.isInteger(
        maxPages
      ) ||
    maxPages <
      1 ||
    maxPages >
      20
    ) {
      return NextResponse.json(
        {
          error:
            "maxPages must be an integer from 1 to 20.",
        },
        {
          status:
            400,
        }
      );
    }


    return NextResponse.json(
      await scanPublishedArticleBacklinks({
        contentArticleId:
          id,

        maxPages,
      })
    );
  } catch (
    error
  ) {
    if (
      error instanceof
        BacklinkServiceError
    ) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status:
            error.message ===
            "BACKLINK_ARTICLE_NOT_FOUND"
              ? 404
              : 409,
        }
      );
    }


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
