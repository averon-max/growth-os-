import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWorkspaceAccess, authErrorResponse } from "@/lib/auth-helpers";
import { getKeywords } from "@/lib/keywords/repository";
import type { KeywordIntent } from "@/lib/keywords/types";
import type { KeywordSortField, SortDir } from "@/lib/keywords/repository";

const VALID_INTENTS: KeywordIntent[] = ["INFORMATIONAL", "COMMERCIAL", "TRANSACTIONAL", "NAVIGATIONAL"];
const VALID_SORT_FIELDS: KeywordSortField[] = ["text", "position", "volume", "difficulty", "cpc", "impressions", "clicks"];

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseNonNegInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function parseNonNegFloat(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sp = req.nextUrl.searchParams;
    const workspaceId = sp.get("workspaceId");
    if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
    await requireWorkspaceAccess(user.id, workspaceId);

    const page = parsePositiveInt(sp.get("page")) ?? 1;
    const limit = parsePositiveInt(sp.get("limit")) ?? 25;
    const filter = sp.get("filter") ?? undefined;
    const intentParam = sp.get("intent");
    const intent = intentParam && VALID_INTENTS.includes(intentParam as KeywordIntent) ? (intentParam as KeywordIntent) : undefined;
    const minPosition = parsePositiveInt(sp.get("minPosition"));
    const maxPosition = parsePositiveInt(sp.get("maxPosition"));
    const market = sp.get("market") ?? undefined;
    const language = sp.get("language") ?? undefined;
    const sortByParam = sp.get("sortBy");
    const sortBy = sortByParam && VALID_SORT_FIELDS.includes(sortByParam as KeywordSortField) ? (sortByParam as KeywordSortField) : undefined;
    const sortDirParam = sp.get("sortDir");
    const sortDir: SortDir = sortDirParam === "asc" ? "asc" : "desc";
    const minVolume = parseNonNegInt(sp.get("minVolume"));
    const maxVolume = parseNonNegInt(sp.get("maxVolume"));
    const minKd = parseNonNegInt(sp.get("minKd"));
    const maxKd = parseNonNegInt(sp.get("maxKd"));
    const minCpc = parseNonNegFloat(sp.get("minCpc"));
    const maxCpc = parseNonNegFloat(sp.get("maxCpc"));
    const hasVolume = sp.get("hasVolume") === "1" ? true : undefined;

    const minCompetition = parseNonNegInt(sp.get("minCompetition"));
    const maxCompetition = parseNonNegInt(sp.get("maxCompetition"));
    const minImpressions = parseNonNegInt(sp.get("minImpressions"));
    const maxImpressions = parseNonNegInt(sp.get("maxImpressions"));
    const minClicks = parseNonNegInt(sp.get("minClicks"));
    const maxClicks = parseNonNegInt(sp.get("maxClicks"));
    const minCtr = parseNonNegFloat(sp.get("minCtr"));
    const maxCtr = parseNonNegFloat(sp.get("maxCtr"));
    const minWords = parsePositiveInt(sp.get("minWords"));
    const maxWords = parsePositiveInt(sp.get("maxWords"));
    const include = sp.get("include") ?? undefined;
    const exclude = sp.get("exclude") ?? undefined;
    const exact = sp.get("exact") ?? undefined;
    const hasRanking = sp.get("hasRanking") === "1" ? true : undefined;

    const result = await getKeywords(workspaceId, {
      page,
      limit,
      filter,
      intent,
      minPosition,
      maxPosition,
      market,
      language,
      sortBy,
      sortDir,
      minVolume,
      maxVolume,
      minKd,
      maxKd,
      hasVolume,
      minCpc,
      maxCpc,
      minCompetition,
      maxCompetition,
    });
    return NextResponse.json(result);
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
