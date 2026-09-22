import { NextRequest, NextResponse } from "next/server";
import {
  requireUser,
  requireWorkspaceAccess,
  authErrorResponse,
} from "@/lib/auth-helpers";
import {
  getMarketBreakdown,
} from "@/lib/keywords/market-breakdown";
import { DataForSEOError } from "@/lib/keywords/dataforseo-provider";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    const workspaceId =
      req.nextUrl.searchParams.get("workspaceId");

    const keyword =
      req.nextUrl.searchParams.get("keyword");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required." },
        { status: 400 },
      );
    }

    if (!keyword?.trim()) {
      return NextResponse.json(
        { error: "keyword is required." },
        { status: 400 },
      );
    }

    await requireWorkspaceAccess(user.id, workspaceId);

    const markets = await getMarketBreakdown(keyword.trim());

    return NextResponse.json({
      keyword: keyword.trim(),
      markets,
    });
  } catch (err) {
    if (err instanceof DataForSEOError) {
      return NextResponse.json(
        { error: err.message },
        { status: 502 },
      );
    }

    console.error(
      "[keywords/market-breakdown error]",
      err,
    );

    const { status, body } =
      authErrorResponse(err);

    return NextResponse.json(body, { status });
  }
}
