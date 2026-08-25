import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWorkspaceAccess, authErrorResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { detectSignals } from "@/lib/keywords/signals";
import type { ProviderType } from "@/lib/keywords/types";

const SIGNAL_LOOKBACK_DAYS = 60; // two DECLINING_DAYS windows plus buffer
const SIGNALS_DEFAULT_PAGE_SIZE = 200;
const SIGNALS_MAX_PAGE_SIZE = 500;

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
    }
    await requireWorkspaceAccess(user.id, workspaceId);

    const page = Math.max(1, Number.parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(
      SIGNALS_MAX_PAGE_SIZE,
      Math.max(
        1,
        Number.parseInt(req.nextUrl.searchParams.get("limit") ?? String(SIGNALS_DEFAULT_PAGE_SIZE), 10) ||
          SIGNALS_DEFAULT_PAGE_SIZE
      )
    );

    const since = new Date();
    since.setDate(since.getDate() - SIGNAL_LOOKBACK_DAYS);

    const keywords = await prisma.keyword.findMany({
      where: { workspaceId },
      orderBy: { text: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        snapshots: {
          where: { date: { gte: since } },
          orderBy: { date: "asc" },
        },
      },
    });

    const signals = detectSignals(
      keywords.map((k) => ({
        id: k.id,
        workspaceId: k.workspaceId,
        text: k.text,
        normalized: k.normalized,
        snapshots: k.snapshots.map((s) => ({
          date: s.date,
          position: s.position !== null ? Number(s.position) : undefined,
          clicks: s.clicks ?? undefined,
          impressions: s.impressions ?? undefined,
          ctr: s.ctr !== null ? Number(s.ctr) : undefined,
          device: s.device,
          country: s.country,
          source: s.source as ProviderType,
          retrievedAt: s.retrievedAt,
        })),
      }))
    );

    return NextResponse.json({ signals, page, limit, keywordsScanned: keywords.length });
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
