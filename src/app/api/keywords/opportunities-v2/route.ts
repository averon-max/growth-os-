import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { researchKeywordOpportunitiesV2 } from "@/lib/keywords/keyword-research-v2";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Expected object" }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    if (typeof input.websiteId !== "string" || !input.websiteId ||
        typeof input.seed !== "string" || !input.seed.trim()) {
      return NextResponse.json({ error: "websiteId and seed required" }, { status: 400 });
    }
    await requireWebsiteAccess(user.id, input.websiteId);
    if (input.authorizePaidResearch !== true) {
      return NextResponse.json({
        code: "KEYWORD_V2_PAID_RESEARCH_NOT_AUTHORIZED",
        error: "Explicit paid research authorization required",
      }, { status: 403 });
    }
    const limit = input.limit === undefined ? undefined : Number(input.limit);
    const deepSerpLimit = input.deepSerpLimit === undefined ? undefined : Number(input.deepSerpLimit);
    if (input.useGptDecision !== undefined && typeof input.useGptDecision !== "boolean") {
      return NextResponse.json({ error: "useGptDecision must be boolean" }, { status: 400 });
    }
    const market = input.market === undefined ? "US" : input.market;
    if (market !== "US" && market !== "CA" && market !== "GB" && market !== "AU") {
      return NextResponse.json({ error: "Invalid market" }, { status: 400 });
    }
    const report = await researchKeywordOpportunitiesV2({
      websiteId: input.websiteId,
      seed: input.seed,
      market,
      limit,
      deepSerpLimit,
      authorizePaidResearch: true,
      useGptDecision: input.useGptDecision === true,
    });
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("KEYWORD_V2_")) {
      return NextResponse.json({ code: error.message, error: error.message }, { status: 422 });
    }
    const { status, body } = authErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
