import { NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/auth-helpers";
import { checkRequest } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { DFS_CATEGORIES, DFS_CATEGORY_KEYS, SETTINGS_KEY, categoryOf, normalizeDfs, type DfsCategory } from "@/lib/dataforseo/cache-settings";
import { lastCleanup } from "@/lib/retention";

export const dynamic = "force-dynamic";

/** Saved DataForSEO answers are shared by every workspace and paid from the owner's balance: admins only. */
async function admin() {
  const user = await requireUser();
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { isAdmin: true } });
  return u?.isAdmin === true;
}

async function load() {
  const row = await prisma.appSetting.findUnique({ where: { key: SETTINGS_KEY } });
  return normalizeDfs(row?.value);
}

async function report() {
  const settings = await load();
  const stats = await prisma.$queryRawUnsafe<{ category: string; rows: number; bytes: bigint; saved: number; last: Date | null }[]>(
    `SELECT category, COUNT(*)::int AS rows, COALESCE(SUM(pg_column_size(response)), 0)::bigint AS bytes,
            COALESCE(SUM(cost * hits), 0)::float AS saved, MAX("createdAt") AS last
     FROM "ApiCache" GROUP BY category`,
  );
  const since = new Date(Date.now() - 30 * 864e5);
  const spend = await prisma.dfsSpend.findMany({ where: { date: { gte: new Date(since.toISOString().slice(0, 10)) } } });
  const todayKey = new Date().toISOString().slice(0, 10);
  const spent30 = {} as Record<DfsCategory, number>;
  let today = 0;
  for (const r of spend) {
    const c = DFS_CATEGORY_KEYS.includes(r.category as DfsCategory) ? (r.category as DfsCategory) : categoryOf(r.endpoint);
    spent30[c] = (spent30[c] ?? 0) + r.cost;
    if (r.date.toISOString().slice(0, 10) === todayKey && c !== "ai") today += r.cost;
  }
  const last = await lastCleanup();
  return {
    dailyBudget: settings.dailyBudget,
    spentToday: Math.round(today * 10000) / 10000,
    lastCleanup: last
      ? {
          at: last.at,
          removedSaved: Object.entries(last.deleted).filter(([k]) => k.startsWith("apiCache") && !k.endsWith(":error")).reduce((n, [, v]) => n + v, 0),
          errors: Object.keys(last.deleted).filter((k) => k.endsWith(":error")).map((k) => k.replace(":error", "")),
        }
      : null,
    categories: DFS_CATEGORY_KEYS.map((key) => {
      const s = stats.find((x) => x.category === key);
      return {
        key,
        ...DFS_CATEGORIES[key],
        days: settings.days[key],
        rows: s?.rows ?? 0,
        mb: Math.round((Number(s?.bytes ?? 0) / 1048576) * 10) / 10,
        saved: Math.round((s?.saved ?? 0) * 100) / 100,
        spent30: Math.round((spent30[key] ?? 0) * 100) / 100,
        last: s?.last ?? null,
      };
    }),
  };
}

export async function GET() {
  try {
    if (!(await admin())) return NextResponse.json({ error: "Admins only." }, { status: 403 });
    return NextResponse.json(await report());
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const bad = checkRequest(req);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    if (!(await admin())) return NextResponse.json({ error: "Admins only." }, { status: 403 });
    const body = (await req.json().catch(() => null)) as { days?: unknown } | null;
    // The daily budget is no longer set here; the stored value (default $3) is kept.
    const value = normalizeDfs({ days: body?.days, dailyBudget: (await load()).dailyBudget });
    await prisma.appSetting.upsert({ where: { key: SETTINGS_KEY }, create: { key: SETTINGS_KEY, value }, update: { value } });
    return NextResponse.json(await report());
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

/** DELETE ?category=serp — removes that kind of saved data now. The next request for it is paid again. */
export async function DELETE(req: Request) {
  try {
    const bad = checkRequest(req);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    if (!(await admin())) return NextResponse.json({ error: "Admins only." }, { status: 403 });
    const category = new URL(req.url).searchParams.get("category") ?? "";
    if (!DFS_CATEGORY_KEYS.includes(category as DfsCategory)) return NextResponse.json({ error: "Unknown category." }, { status: 400 });
    await prisma.apiCache.deleteMany({ where: { category } });
    return NextResponse.json(await report());
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
