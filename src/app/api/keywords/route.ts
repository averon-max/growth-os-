import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWorkspaceAccess, authErrorResponse } from "@/lib/auth-helpers";
import { getKeywords } from "@/lib/keywords/repository";
import type { KeywordIntent } from "@/lib/keywords/types";

const VALID_INTENTS: KeywordIntent[] = ["INFORMATIONAL", "COMMERCIAL", "TRANSACTIONAL", "NAVIGATIONAL"];

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
    }
    await requireWorkspaceAccess(user.id, workspaceId);

    const page = parsePositiveInt(req.nextUrl.searchParams.get("page")) ?? 1;
    const limit = parsePositiveInt(req.nextUrl.searchParams.get("limit")) ?? 25;
    const filter = req.nextUrl.searchParams.get("filter") ?? undefined;
    const intentParam = req.nextUrl.searchParams.get("intent");
    const intent =
      intentParam && VALID_INTENTS.includes(intentParam as KeywordIntent)
        ? (intentParam as KeywordIntent)
        : undefined;
    const minPosition = parsePositiveInt(req.nextUrl.searchParams.get("minPosition"));
    const maxPosition = parsePositiveInt(req.nextUrl.searchParams.get("maxPosition"));

    const result = await getKeywords(workspaceId, { page, limit, filter, intent, minPosition, maxPosition });
    return NextResponse.json(result);
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
