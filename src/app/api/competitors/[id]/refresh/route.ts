import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { DataForSEOError } from "@/lib/keywords/dataforseo-provider";
import { RateLimitError } from "@/lib/keywords/competitor-cache";
import { getCompetitor } from "@/lib/competitors/repository";
import { analyzeCompetitor } from "@/lib/competitors/service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const competitor = await getCompetitor(id);
    if (!competitor) {
      return NextResponse.json({ error: "Competitor not found." }, { status: 404 });
    }

    await requireWebsiteAccess(user.id, competitor.websiteId);

    const { snapshot } = await analyzeCompetitor({
      workspaceId: competitor.website.business.workspaceId,
      websiteId: competitor.websiteId,
      domain: competitor.domain,
      name: competitor.name ?? undefined,
    });

    return NextResponse.json({ snapshot });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (err instanceof DataForSEOError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("competitors/refresh POST error", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
