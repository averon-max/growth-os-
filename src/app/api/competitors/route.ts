import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { DataForSEOError } from "@/lib/keywords/dataforseo-provider";
import { RateLimitError } from "@/lib/keywords/competitor-cache";
import { listCompetitors } from "@/lib/competitors/repository";
import { analyzeCompetitor } from "@/lib/competitors/service";

const CreateCompetitorSchema = z.object({
  websiteId: z.string().trim().min(1),
  domain: z.string().trim().min(1),
  name: z.string().trim().min(1).max(200).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const websiteId = req.nextUrl.searchParams.get("websiteId");
    if (!websiteId) {
      return NextResponse.json({ error: "websiteId is required." }, { status: 400 });
    }

    await requireWebsiteAccess(user.id, websiteId);

    const competitors = await listCompetitors(websiteId);
    return NextResponse.json({ competitors });
  } catch (err) {
    console.error("competitors GET error", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = CreateCompetitorSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { websiteId, domain, name } = parsed.data;

    const website = await requireWebsiteAccess(user.id, websiteId);

    const { competitor, snapshot } = await analyzeCompetitor({
      workspaceId: website.business.workspaceId,
      websiteId,
      domain,
      name,
    });

    return NextResponse.json({ competitor, snapshot }, { status: 201 });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (err instanceof DataForSEOError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("competitors POST error", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
