import { NextRequest, NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/auth-helpers";
import { fetchDailyTrends } from "@/lib/keywords/trends-provider";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const geo = req.nextUrl.searchParams.get("geo") || "US";
    const trends = await fetchDailyTrends(geo);
    return NextResponse.json({ geo, trends: trends ?? [] });
  } catch (err) {
    console.error("[trends/daily error]", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
