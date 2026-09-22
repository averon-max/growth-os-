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
  getGa4Context,
  getGa4AccessToken,
  listAccessibleGa4Properties,
  verifyGa4PropertyAccess,
  saveGa4Property,
  getGa4Intelligence,
} from "@/lib/audience/ga4-intelligence";

const ALLOWED_DAYS =
  new Set([
    1,
    7,
    15,
    30,
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

    const days =
      Number(
        req.nextUrl.searchParams
          .get("days") ??
        "30"
      );

    const mode =
      req.nextUrl.searchParams
        .get("mode") ??
      "history";

    const country =
      req.nextUrl.searchParams
        .get("country")
        ?.trim() ||
      null;

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

    if (
      !ALLOWED_DAYS.has(
        days
      )
    ) {
      return NextResponse.json(
        {
          error:
            "days must be 1, 7, 15, or 30.",
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

    const context =
      await getGa4Context(
        websiteId
      );

    const token =
      await getGa4AccessToken(
        context.workspaceId
      );

    if (!token) {
      return NextResponse.json({
        connected:
          false,

        source:
          "GOOGLE_ANALYTICS_4",

        connectUrl:
          `/api/integrations/google-analytics/connect?workspaceId=${encodeURIComponent(
            context.workspaceId
          )}&websiteId=${encodeURIComponent(
            websiteId
          )}`,
      });
    }

    if (
      !context.ga4PropertyId
    ) {
      const properties =
        await listAccessibleGa4Properties(
          token
        );

      return NextResponse.json({
        connected:
          true,

        source:
          "GOOGLE_ANALYTICS_4",

        needsProperty:
          true,

        properties,
      });
    }

    const report =
      await getGa4Intelligence({
        propertyId:
          context.ga4PropertyId,

        token,

        days,

        mode,

        country,
      });

    return NextResponse.json({
      connected:
        true,

      source:
        "GOOGLE_ANALYTICS_4",

      needsProperty:
        false,

      ...report,
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

    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    console.error(
      "[GA4 intelligence]",
      message
    );

    return NextResponse.json(
      {
        error:
          `Google Analytics request failed: ${message}`,
      },
      {
        status: 502,
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
        websiteId?:
          string;

        propertyId?:
          string;
      };

    const websiteId =
      body.websiteId
        ?.trim();

    const propertyId =
      body.propertyId
        ?.trim()
        .replace(
          /^properties\//,
          ""
        );

    if (
      !websiteId ||
      !propertyId
    ) {
      return NextResponse.json(
        {
          error:
            "websiteId and propertyId are required.",
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

    const context =
      await getGa4Context(
        websiteId
      );

    const token =
      await getGa4AccessToken(
        context.workspaceId
      );

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Google Analytics is not connected.",
        },
        {
          status: 409,
        }
      );
    }

    await verifyGa4PropertyAccess(
      propertyId,
      token
    );

    await saveGa4Property(
      websiteId,
      propertyId
    );

    return NextResponse.json({
      success:
        true,

      propertyId,
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

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not save GA4 property.",
      },
      {
        status: 502,
      }
    );
  }
}
