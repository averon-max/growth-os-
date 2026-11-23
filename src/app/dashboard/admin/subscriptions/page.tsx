import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Topbar } from "@/components/dashboard/topbar";
import ui from "@/components/dashboard/ui.module.css";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/billing/plans";
import { ACTIVE_STATUSES, adminOrNotFound, ago, day, effectivePlan } from "@/lib/admin/core";
import { AdminNav, PLAN_TONE } from "../admin-nav";
import a from "../admin.module.css";

export const dynamic = "force-dynamic";

const now = () => new Date();
const FILTERS: Record<string, { label: string; where: () => Prisma.SubscriptionWhereInput }> = {
  active: { label: "Active", where: () => ({ status: { in: ACTIVE_STATUSES }, plan: { not: "FREE" }, OR: [{ source: "stripe" }, { currentPeriodEnd: null }, { currentPeriodEnd: { gt: now() } }] }) },
  trial: { label: "Free trial", where: () => ({ status: "trialing" }) },
  stripe: { label: "Stripe", where: () => ({ source: "stripe", status: { in: ACTIVE_STATUSES }, plan: { not: "FREE" } }) },
  manual: { label: "Manual", where: () => ({ source: "manual", status: { in: ACTIVE_STATUSES }, plan: { not: "FREE" }, OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now() } }] }) },
  ending: { label: "Ending soon", where: () => ({ status: { in: ACTIVE_STATUSES }, plan: { not: "FREE" }, OR: [{ cancelAtPeriodEnd: true }, { source: "manual", currentPeriodEnd: { gt: now(), lt: new Date(Date.now() + 14 * 864e5) } }] }) },
  pastdue: { label: "Past due", where: () => ({ status: "past_due" }) },
  ended: { label: "Ended", where: () => ({ OR: [{ status: { notIn: ACTIVE_STATUSES } }, { source: "manual", currentPeriodEnd: { lt: now() } }] }) },
};

export default async function AdminSubscriptions({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  await adminOrNotFound();
  const sp = await searchParams;
  const f = sp.f && sp.f in FILTERS ? sp.f : "active";
  const q = (sp.q ?? "").trim().slice(0, 100);
  const search: Prisma.SubscriptionWhereInput = q
    ? { workspace: { OR: [{ name: { contains: q, mode: "insensitive" } }, { members: { some: { user: { email: { contains: q, mode: "insensitive" } } } } }] } }
    : {};

  const [counts, subs] = await Promise.all([
    Promise.all(Object.entries(FILTERS).map(async ([k, v]) => [k, await prisma.subscription.count({ where: { AND: [search, v.where()] } })] as const)),
    prisma.subscription.findMany({
      where: { AND: [search, FILTERS[f].where()] },
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: { workspace: { select: { id: true, name: true, members: { where: { role: "OWNER" }, take: 1, select: { user: { select: { id: true, email: true } } } } } } },
    }),
  ]);
  const count = Object.fromEntries(counts);
  const granted = await prisma.user.findMany({ where: { id: { in: subs.map((s) => s.grantedByUserId).filter((x): x is string => !!x) } }, select: { id: true, email: true } });
  const by = new Map(granted.map((u) => [u.id, u.email]));
  const href = (k: string) => `/dashboard/admin/subscriptions?f=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <Topbar title="Admin" subtitle="Subscriptions" />
      <div className={ui.pageBody}>
        <AdminNav active="/dashboard/admin/subscriptions" />

        <form className={a.toolbar} action="/dashboard/admin/subscriptions">
          <input className={a.search} type="search" name="q" defaultValue={q} placeholder="Search by email or workspace" aria-label="Search subscriptions" />
          <input type="hidden" name="f" value={f} />
          <div className={a.chips}>
            {Object.entries(FILTERS).map(([k, v]) => (
              <Link key={k} href={href(k)} className={a.chip} data-active={f === k ? "true" : "false"}>
                {v.label} <span className={a.chipCount}>{count[k]}</span>
              </Link>
            ))}
          </div>
        </form>

        <div className={a.panel}>
          <table className={a.table}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan</th>
                <th>Source</th>
                <th className={a.hideSm}>Status</th>
                <th className={a.hideSm}>Renews / ends</th>
                <th className={a.hideSm}>Changed</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => {
                const owner = s.workspace.members[0]?.user;
                const plan = effectivePlan(s);
                const shown = plan === "FREE" ? (s.plan in PLANS ? (s.plan as keyof typeof PLANS) : "FREE") : plan;
                const expired = s.source === "manual" && s.currentPeriodEnd !== null && s.currentPeriodEnd < new Date();
                return (
                  <tr key={s.id}>
                    <td>
                      <div className={a.cellMain}>
                        <span className={a.cellTitle}>{owner ? <Link href={`/dashboard/admin/users/${owner.id}`}>{owner.email}</Link> : "No owner"}</span>
                        <span className={a.cellSub}>{s.workspace.name}{s.note ? ` · ${s.note}` : ""}</span>
                      </div>
                    </td>
                    <td><span className={a.badge} data-tone={plan === "FREE" ? "" : PLAN_TONE[plan]}>{PLANS[shown].name}</span></td>
                    <td>
                      {s.source === "stripe" ? (
                        s.stripeCustomerId ? <a className={a.badge} href={`https://dashboard.stripe.com/customers/${s.stripeCustomerId}`} target="_blank" rel="noopener">Stripe ↗</a> : <span className={a.badge}>Stripe</span>
                      ) : (
                        <span className={a.cellSub} style={{ maxWidth: 200 }}>Manual{s.grantedByUserId ? ` · ${by.get(s.grantedByUserId) ?? "admin"}` : ""}</span>
                      )}
                    </td>
                    <td className={a.hideSm}>
                      <span className={a.badge} data-tone={expired || !ACTIVE_STATUSES.includes(s.status) ? "danger" : s.status === "past_due" || s.status === "trialing" ? "warning" : s.cancelAtPeriodEnd ? "warning" : "success"}>
                        {expired ? "expired" : s.status === "trialing" ? "free trial" : s.cancelAtPeriodEnd && ACTIVE_STATUSES.includes(s.status) ? "canceling" : s.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className={`${a.hideSm} ${a.muted}`}>{s.currentPeriodEnd ? day(s.currentPeriodEnd) : s.source === "manual" ? "no end date" : "—"}</td>
                    <td className={`${a.hideSm} ${a.muted}`}>{ago(s.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {subs.length === 0 ? <div className={a.empty}>Nothing here.</div> : null}
        </div>
        <p className={a.hint} style={{ marginTop: 10 }}>To give or remove a plan, open the customer and use the plan form. Stripe subscriptions are changed or refunded in Stripe.</p>
      </div>
    </>
  );
}
