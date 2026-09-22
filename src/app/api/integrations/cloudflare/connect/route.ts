import { NextRequest, NextResponse } from "next/server";
import {
  requireUser,
  requireWebsiteAccess,
  authErrorResponse,
} from "@/lib/auth-helpers";
import { upsertCloudflareConnection } from "@/lib/integrations/cloudflare/connection-service";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { websiteId, zoneId, apiToken } = body;

    if (!websiteId || !zoneId || !apiToken) {
      return NextResponse.json(
        { error: "websiteId, zoneId, and apiToken are required" },
        { status: 400 }
      );
    }

    await requireWebsiteAccess(user.id, websiteId);

    const connection = await upsertCloudflareConnection(websiteId, zoneId, apiToken);

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      zoneId: connection.zoneId,
    });
  } catch (error) {
    console.error("Cloudflare connect error:", error);
    const { status, body } = authErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
