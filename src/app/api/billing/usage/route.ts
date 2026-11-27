import { NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getWorkspaceBilling } from "@/lib/billing/subscription";
import { PLAN_RANK } from "@/lib/billing/access";
import { spentBy } from "@/lib/billing/data-budget";
import { articleKey, usageCount } from "@/lib/billing/usage";

export const dynamic = "force-dynamic";

/** What the user's plan includes and how much of it is used: websites, tracked keywords, AI drafts, data. */
export async function GET() {
  try {
    const user = await requireUser();
    const members = await prisma.workspaceMember.findMany({ where: { userId: user.id }, select: { workspaceId: true }, orderBy: { createdAt: "asc" } });
    let best: { id: string; billing: Awaited<ReturnType<typeof getWorkspaceBilling>> } | null = null;
    for (const m of members) {
      const billing = await getWorkspaceBilling(m.workspaceId);
      if (best === null || PLAN_RANK[billing.plan.id] > PLAN_RANK[best.billing.plan.id]) best = { id: m.workspaceId, billing };
    }
    if (!best) return NextResponse.json({ error: "No workspace." }, { status: 404 });
    const plan = best.billing.plan;
    const l = plan.limits;
    const inWs = { business: { workspaceId: best.id } };
    const [websites, tracked, articles, data] = await Promise.all([
      prisma.website.count({ where: inWs }),
      prisma.trackedKeyword.count({ where: { website: inWs } }),
      usageCount(articleKey(user.id)),
      spentBy(best.id),
    ]);
    // Data is shown as a share of the allowance, not in dollars: what it costs us is not the customer's price.
    const pct = (used: number, of: number) => (of > 0 ? Math.min(100, Math.round((used / of) * 100)) : 0);
    return NextResponse.json({
      plan: plan.name,
      rows: [
        { label: "Websites", used: websites, limit: l.websites },
        { label: "Tracked keywords", used: tracked, limit: l.trackedKeywords },
        { label: "AI article drafts this month", used: articles, limit: l.articlesPerMonth },
      ],
      data: { today: pct(data.today, l.dataPerDayUsd), month: pct(data.month, l.dataPerMonthUsd) },
    });
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
