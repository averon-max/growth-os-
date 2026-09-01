import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { applyFix } from "@/lib/cms/service";
import { getProviderForType } from "@/lib/cms/registry";
import { getCMSConnection } from "@/lib/cms/repository";
import { UnsupportedFixTypeError, CMSNotConnectedError } from "@/lib/cms/provider";
import type { FixType } from "@/lib/cms/types";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { websiteId, opportunityId, issueId, pageUrl, fixType, newValue } = body as {
      websiteId?: string;
      opportunityId?: string;
      issueId?: string;
      pageUrl?: string;
      fixType?: FixType;
      newValue?: string;
    };

    if (!websiteId || !pageUrl || !fixType || !newValue) {
      return NextResponse.json({ error: "websiteId, pageUrl, fixType and newValue are required." }, { status: 400 });
    }

    await requireWebsiteAccess(user.id, websiteId);

    const connection = await getCMSConnection(websiteId);
    if (!connection) {
      return NextResponse.json({ error: "CMS is not connected for this website" }, { status: 409 });
    }
    const provider = getProviderForType(connection.cmsType);

    const result = await applyFix(provider, {
      websiteId,
      opportunityId,
      issueId,
      pageUrl,
      fixType,
      newValue,
    });

    return NextResponse.json({ fix: result }, { status: 201 });
  } catch (err) {
    if (err instanceof UnsupportedFixTypeError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    if (err instanceof CMSNotConnectedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("cms/apply-fix POST error", err);
    const { status, body: errBody } = authErrorResponse(err);
    return NextResponse.json(errBody, { status });
  }
}
