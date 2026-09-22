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
  checkVerifiedBusinessFactEvidence,
} from "@/lib/content/evidence-drift";


export async function POST(
  req: NextRequest
) {
  try {
    const user =
      await requireUser();

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
          status:
            400,
        }
      );
    }

    const website =
      await requireWebsiteAccess(
        user.id,
        websiteId
      );

    const result =
      await checkVerifiedBusinessFactEvidence({
        businessId:
          website.businessId,
      });

    return NextResponse.json({
      result,
    });
  } catch (err) {
    console.error(
      "content/facts/check-evidence POST error",
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
