import { NextRequest, NextResponse } from "next/server";
import {
  requireUser,
  requireWebsiteAccess,
  authErrorResponse,
} from "@/lib/auth-helpers";
import { syncCloudflareTraffic } from "@/lib/integrations/cloudflare/sync";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { websiteId, days = 7 } = body;

    if (!websiteId) {
      return NextResponse.json(
        { error: "websiteId is required" },
        { status: 400 }
      );
    }

    if (
      typeof days !== "number" ||
      !Number.isInteger(days) ||
      days < 1 ||
      days > 90
    ) {
      return NextResponse.json(
        { error: "days must be an integer between 1 and 90" },
        { status: 400 }
      );
    }

    await requireWebsiteAccess(user.id, websiteId);

    const until = new Date().toISOString().slice(0, 10);
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - (days - 1));
    const since = sinceDate.toISOString().slice(0, 10);

    const result = await syncCloudflareTraffic({ websiteId, since, until });

    return NextResponse.json({
      success: true,
      connectionId: result.connectionId,
      requestedDays: result.requestedDays,
      syncedDays: result.syncedDays,
      skippedDays: result.skippedDays,
      availableFrom: result.availableFrom,
      availableTo: result.availableTo,
    });
  } catch (error) {
    console.error("Cloudflare sync error:", error);
    const { status, body } = authErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
