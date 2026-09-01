import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { upsertCMSConnection, getCMSConnection, markCMSConnectionStatus } from "@/lib/cms/repository";
import { getProviderForType } from "@/lib/cms/registry";
import type { CMSType } from "@/lib/cms/types";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { websiteId, cmsType, siteUrl, username, password } = body as {
      websiteId?: string;
      cmsType?: CMSType;
      siteUrl?: string;
      username?: string;
      password?: string;
    };

    if (!websiteId || !cmsType || !siteUrl || !password) {
      return NextResponse.json({ error: "websiteId, cmsType, siteUrl and password (or API key) are required." }, { status: 400 });
    }

    if (cmsType === "WORDPRESS" && !username) {
      return NextResponse.json({ error: "username is required for WordPress connections." }, { status: 400 });
    }

    await requireWebsiteAccess(user.id, websiteId);

    await upsertCMSConnection({ websiteId, cmsType, siteUrl, username, password });

    const provider = getProviderForType(cmsType);
    const verification = await provider.verifyCredentials(siteUrl, username ?? "", password);

    const connection = verification.valid
      ? await markCMSConnectionStatus(websiteId, "CONNECTED")
      : await markCMSConnectionStatus(websiteId, "ERROR", verification.error ?? undefined);

    return NextResponse.json({ connection, verified: verification.valid }, { status: 201 });
  } catch (err) {
    console.error("cms/connect POST error", err);
    const { status, body: errBody } = authErrorResponse(err);
    return NextResponse.json(errBody, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const websiteId = req.nextUrl.searchParams.get("websiteId");
    if (!websiteId) {
      return NextResponse.json({ error: "websiteId query parameter is required." }, { status: 400 });
    }

    await requireWebsiteAccess(user.id, websiteId);

    const connection = await getCMSConnection(websiteId);
    return NextResponse.json({ connection });
  } catch (err) {
    console.error("cms/connect GET error", err);
    const { status, body: errBody } = authErrorResponse(err);
    return NextResponse.json(errBody, { status });
  }
}
