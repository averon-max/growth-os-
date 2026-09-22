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
  getContentBriefById,
} from "@/lib/content/repository";

import {
  prisma,
} from "@/lib/prisma";


export async function GET(
  _req: NextRequest,
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
    } = await params;

    const brief =
      await getContentBriefById(
        id
      );

    if (!brief) {
      return NextResponse.json(
        {
          error:
            "Content brief not found.",
        },
        {
          status: 404,
        }
      );
    }

    await requireWebsiteAccess(
      user.id,
      brief.websiteId
    );

    const evidence =
      await prisma.contentEvidenceSnapshot.findUnique({
        where: {
          briefId:
            brief.id,
        },
      });

    return NextResponse.json({
      evidence,
    });
  } catch (err) {
    console.error(
      "content/briefs/[id]/evidence GET error",
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
