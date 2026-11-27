import Link from "next/link";
import { Topbar } from "@/components/dashboard/topbar";
import ui from "@/components/dashboard/ui.module.css";
import { prisma } from "@/lib/prisma";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { ACTIVE_STATUSES, adminOrNotFound, ago, bestPlan, day, effectivePlan } from "@/lib/admin/core";
import { AdminNav, PLAN_TONE, STATUS_TONE } from "./admin-nav";
import a from "./admin.module.css";
import { CleanupButton } from "./cleanup-button";
import { planPrices } from "@/lib/billing/prices";
import { lastCleanup } from "@/lib/retention";
import { DFS_CATEGORIES, SETTINGS_KEY, normalizeDfs, type DfsCategory } from "@/lib/dataforseo/cache-settings";
import { BarList, Columns, InsightCard, InsightGrid } from "@/components/dashboard/insights";

export const dynamic = "force-dynamic";

const DAY = 864e5;
const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export default async function AdminOverview() {
  await adminOrNotFound();
  const now = Date.now();
  const today = new Date(new Date().toISOString().slice(0, 10));

  const [users, new7, new30, subs, openTickets, newTickets, spendToday, spend30, recentUsers, recentTickets, recentAudit] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: new Date(now - 7 * DAY) } } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(now - 30 * DAY) } } }),
    prisma.subscription.findMany({ where: { status: { in: ACTIVE_STATUSES }, plan: { not: "FREE" } }, select: { plan: true, status: true, source: true, currentPeriodEnd: true } }),
    prisma.supportTicket.count({ where: { status: "open" } }),
    prisma.supportTicket.count({ where: { createdAt: { gte: new Date(now - 7 * DAY) } } }),
    prisma.dfsSpend.aggregate({ where: { date: today }, _sum: { cost: true } }).catch(() => ({ _sum: { cost: 0 } })),
    prisma.dfsSpend.aggregate({ where: { date: { gte: new Date(now - 30 * DAY) } }, _sum: { cost: true } }).catch(() => ({ _sum: { cost: 0 } })),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, email: true, name: true, createdAt: true, memberships: { select: { workspace: { select: { subscription: true } } } } },
    }),
    prisma.supportTicket.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { number: true, subject: true, email: true, status: true, kind: true, createdAt: true } }),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  const [cleanup, dfsRow, cacheRows, prices] = await Promise.all([
    lastCleanup(),
    prisma.appSetting.findUnique({ where: { key: SETTINGS_KEY } }).catch(() => null),
    prisma.apiCache.count().catch(() => 0),
    planPrices(),
  ]);
  const budget = normalizeDfs(dfsRow?.value).dailyBudget;

  const live = subs.map((s) => ({ ...s, plan: effectivePlan(s) })).filter((s) => s.plan !== "FREE");
  const trials = live.filter((s) => s.status === "trialing").sort((x, y) => (x.currentPeriodEnd?.getTime() ?? 0) - (y.currentPeriodEnd?.getTime() ?? 0));
  const paying = live.filter((s) => s.source === "stripe" && s.status !== "trialing");
  const mrr = paying.reduce((sum, s) => sum + prices[s.plan as PlanId], 0);
  const manual = live.filter((s) => s.source !== "stripe").length;

  const spendRows = await prisma.dfsSpend.findMany({ where: { date: { gte: new Date(Date.now() - 30 * 86_400_000) } }, select: { date: true, category: true, cost: true } });
  const spendDays = Array.from({ length: 30 }, (_, k) => {
    const d = new Date(Date.now() - (29 - k) * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    return { key, label: k % 5 === 4 ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "", cost: spendRows.filter((r) => r.date.toISOString().slice(0, 10) === key).reduce((n, r) => n + r.cost, 0) };
  });

  const stats = [
    { label: "Users", href: "/dashboard/admin/users", value: users.toLocaleString(), note: <><span className={a.up}>+{new7}</span> this week · +{new30} in 30 days</> },
    { label: "Paying", href: "/dashboard/admin/subscriptions", value: paying.length.toLocaleString(), note: `${users ? Math.round((paying.length / users) * 1000) / 10 : 0}% of users · ${manual} manual` },
    { label: "MRR", href: "/dashboard/admin/subscriptions", value: money(mrr), note: "from Stripe subscriptions" },
    { label: "Free trials", href: "/dashboard/admin/subscriptions", value: trials.length.toLocaleString(), note: trials[0]?.currentPeriodEnd ? `next ends ${day(trials[0].currentPeriodEnd)}` : "7 days, card on file" },
    { label: "Open inbox", href: "/dashboard/admin/inbox", value: openTickets.toLocaleString(), note: `${newTickets} new this week` },
    { label: "Data spend", href: "/dashboard/settings/data", value: `$${(spendToday._sum.cost ?? 0).toFixed(2)}`, note: `today, limit $${budget} · $${(spend30._sum.cost ?? 0).toFixed(2)} in 30 days` },
  ];

  return (
    <>
      <Topbar title="Admin" subtitle="Overview" />
      <div className={ui.pageBody}>
        <AdminNav active="/dashboard/admin" />

        <div className={a.stats}>
          {stats.map((s) => (
            <Link key={s.label} href={s.href} className={a.stat} style={{ textDecoration: "none" }}>
              <div className={a.statLabel}>{s.label}</div>
              <div className={a.statValue}>{s.value}</div>
              <div className={a.statNote}>{s.note}</div>
            </Link>
          ))}
        </div>

        <InsightGrid cols={2}>
          <InsightCard title="Paid data, last 30 days" meta={`$${spendRows.reduce((n, r) => n + r.cost, 0).toFixed(2)} total`} action={<Link href="/dashboard/settings/data">Limits and pause</Link>}>
            <Columns
              height={100}
              unit="USD"
              cols={spendDays.map((d) => ({ key: d.key, label: d.label, value: Math.round(d.cost * 100) / 100, color: d.cost > budget ? "#f43f5e" : "#0a84ff", hint: `$${d.cost.toFixed(3)}` }))}
            />
          </InsightCard>
          <InsightCard title="Where the money went" meta="30 days, by kind">
            <BarList
              unit="USD"
              empty="Nothing paid in 30 days."
              rows={Object.entries(spendRows.reduce<Record<string, number>>((acc, r) => { acc[r.category] = (acc[r.category] ?? 0) + r.cost; return acc; }, {}))
                .sort((x, y) => y[1] - x[1])
                .map(([cat, cost]) => ({ key: cat, label: DFS_CATEGORIES[cat as DfsCategory]?.label ?? cat, value: Math.round(cost * 100) / 100 }))}
            />
          </InsightCard>
        </InsightGrid>

        <div className={a.cols}>
          <section className={a.panel}>
            <div className={a.panelHead}>
              <span className={a.panelTitle}>New users</span>
              <Link href="/dashboard/admin/users" className={a.panelLink}>All users</Link>
            </div>
            <div className={a.list}>
              {recentUsers.length === 0 ? <div className={a.empty}>No users yet.</div> : null}
              {recentUsers.map((u) => {
                const plan = bestPlan(u.memberships.map((m) => m.workspace.subscription));
                return (
                  <Link key={u.id} href={`/dashboard/admin/users/${u.id}`} className={a.item}>
                    <div className={a.itemMain}>
                      <div className={a.cellTitle}>{u.email}</div>
                      {u.name ? <div className={a.cellSub}>{u.name}</div> : null}
                    </div>
                    <span className={a.badge} data-tone={PLAN_TONE[plan]}>{PLANS[plan].name}</span>
                    <span className={a.itemMeta}>{ago(u.createdAt)}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className={a.panel}>
            <div className={a.panelHead}>
              <span className={a.panelTitle}>Latest messages</span>
              <Link href="/dashboard/admin/inbox" className={a.panelLink}>Inbox</Link>
            </div>
            <div className={a.list}>
              {recentTickets.length === 0 ? <div className={a.empty}>No messages yet.</div> : null}
              {recentTickets.map((t) => (
                <Link key={t.number} href={`/dashboard/admin/inbox/${t.number}`} className={a.item}>
                  <span className={a.dot} data-tone={t.status} />
                  <div className={a.itemMain}>
                    <div className={a.cellTitle}>{t.subject}</div>
                    <div className={a.cellSub}>#{t.number} · {t.kind === "feedback" ? "Feedback" : "Support"} · {t.email}</div>
                  </div>
                  <span className={a.badge} data-tone={STATUS_TONE[t.status]}>{t.status}</span>
                  <span className={a.itemMeta}>{ago(t.createdAt)}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <section className={a.panel} style={{ marginTop: 16 }}>
          <div className={a.panelHead}>
            <span className={a.panelTitle}>Data cleanup</span>
            <span className={a.panelCount}>runs every night · {cacheRows.toLocaleString()} saved answers now</span>
            <CleanupButton />
          </div>
          <div className={a.panelBody}>
            {cleanup ? (
              <dl className={a.kv}>
                <dt>Last run</dt>
                <dd>{ago(new Date(cleanup.at))} · {cleanup.trigger === "admin" ? "started by an admin" : "nightly"} · {Math.round(cleanup.ms / 100) / 10}s · database {cleanup.databaseMB} MB</dd>
                <dt>Removed</dt>
                <dd>
                  {Object.entries(cleanup.deleted).filter(([k, v]) => !k.endsWith(":error") && v > 0).map(([k, v]) => `${k} ${v.toLocaleString()}`).join(" · ") || "nothing was expired"}
                </dd>
                <dt>Errors</dt>
                <dd className={Object.keys(cleanup.deleted).some((k) => k.endsWith(":error")) ? a.err : a.ok}>
                  {Object.keys(cleanup.deleted).filter((k) => k.endsWith(":error")).map((k) => k.replace(":error", "")).join(", ") || "none"}
                </dd>
              </dl>
            ) : (
              <div className={a.muted} style={{ fontSize: 13 }}>No cleanup recorded yet. Press “Run cleanup now” to run it and see what it removes.</div>
            )}
          </div>
        </section>

        <section className={a.panel} style={{ marginTop: 16 }}>
          <div className={a.panelHead}>
            <span className={a.panelTitle}>Recent admin actions</span>
            <Link href="/dashboard/admin/audit" className={a.panelLink}>Audit log</Link>
          </div>
          <div className={a.list}>
            {recentAudit.length === 0 ? <div className={a.empty}>Nothing yet. Every grant, reply and account change made here will be listed.</div> : null}
            {recentAudit.map((e) => (
              <div key={e.id} className={a.item}>
                <div className={a.itemMain}>
                  <div className={a.cellTitle}>{e.action} <span className={a.muted}>→ {e.targetLabel ?? e.targetId ?? e.targetType}</span></div>
                  <div className={a.cellSub}>by {e.adminEmail}</div>
                </div>
                <span className={a.itemMeta}>{ago(e.createdAt)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
