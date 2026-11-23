import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import ui from "@/components/dashboard/ui.module.css";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/billing/plans";
import { adminOrNotFound, ago, day, effectivePlan } from "@/lib/admin/core";
import { AdminNav, PLAN_TONE, STATUS_TONE } from "../../admin-nav";
import a from "../../admin.module.css";
import { PlanForm, UserActions } from "./user-actions";

export const dynamic = "force-dynamic";

const host = (u: string) => { try { return new URL(u).hostname; } catch { return u; } };

export default async function AdminUser({ params }: { params: Promise<{ id: string }> }) {
  const me = await adminOrNotFound();
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, name: true, isAdmin: true, createdAt: true, updatedAt: true, passwordChangedAt: true,
      memberships: {
        select: {
          role: true,
          workspace: {
            select: {
              id: true, name: true, createdAt: true, subscription: true,
              members: { select: { role: true, user: { select: { id: true, email: true } } } },
              businesses: { select: { websites: { select: { id: true, url: true, createdAt: true } } } },
            },
          },
        },
      },
    },
  });
  if (!user) notFound();

  const [tickets, history] = await Promise.all([
    prisma.supportTicket.findMany({ where: { OR: [{ userId: user.id }, { email: user.email }] }, orderBy: { createdAt: "desc" }, take: 20, select: { number: true, subject: true, status: true, kind: true, createdAt: true } }),
    prisma.adminAuditLog.findMany({
      where: { OR: [{ targetType: "user", targetId: user.id }, { targetType: "workspace", targetId: { in: user.memberships.map((m) => m.workspace.id) } }] },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <>
      <Topbar title="Admin" subtitle={user.email} />
      <div className={ui.pageBody}>
        <AdminNav active="/dashboard/admin/users" />
        <Link href="/dashboard/admin/users" className={a.back}>← All users</Link>

        <div className={a.head}>
          <div>
            <h1 className={a.title}>{user.email}</h1>
            <p className={a.sub}>{user.name ?? "No name"} · joined {day(user.createdAt)}{user.isAdmin ? " · admin" : ""}</p>
          </div>
        </div>

        <div className={a.detail}>
          <div>
            {user.memberships.length === 0 ? <div className={`${a.panel} ${a.empty}`}>This user has no workspace.</div> : null}
            {user.memberships.map(({ role, workspace: w }) => {
              const sub = w.subscription;
              const plan = effectivePlan(sub);
              const sites = w.businesses.flatMap((b) => b.websites);
              return (
                <section key={w.id} className={a.panel}>
                  <div className={a.panelHead}>
                    <span className={a.panelTitle}>{w.name}</span>
                    <span className={a.panelCount}>{role.toLowerCase()} · {w.members.length} member{w.members.length === 1 ? "" : "s"}</span>
                    <span style={{ marginLeft: "auto" }} className={a.badge} data-tone={PLAN_TONE[plan]}>{PLANS[plan].name}</span>
                  </div>
                  <div className={a.panelBody}>
                    <dl className={a.kv}>
                      <dt>Plan</dt>
                      <dd>
                        {sub ? (
                          <>
                            {PLANS[plan].name} · {sub.source === "stripe" ? "Stripe" : "manual"} · {sub.status}
                            {sub.currentPeriodEnd ? ` · until ${day(sub.currentPeriodEnd)}` : sub.source === "manual" && plan !== "FREE" ? " · no end date" : ""}
                            {sub.cancelAtPeriodEnd ? " · cancels at period end" : ""}
                          </>
                        ) : "Free — never subscribed"}
                      </dd>
                      {sub?.note ? (<><dt>Note</dt><dd>{sub.note}</dd></>) : null}
                      {sub?.stripeCustomerId ? (
                        <>
                          <dt>Stripe</dt>
                          <dd><a className={a.panelLink} style={{ marginLeft: 0 }} href={`https://dashboard.stripe.com/customers/${sub.stripeCustomerId}`} target="_blank" rel="noopener">Open customer in Stripe ↗</a></dd>
                        </>
                      ) : null}
                      <dt>Websites</dt>
                      <dd>{sites.length ? sites.map((s) => host(s.url)).join(", ") : "None"}</dd>
                      {w.members.length > 1 ? (
                        <>
                          <dt>Members</dt>
                          <dd>{w.members.map((m) => `${m.user.email} (${m.role.toLowerCase()})`).join(", ")}</dd>
                        </>
                      ) : null}
                    </dl>
                    <div className={a.divider} />
                    <PlanForm workspaceId={w.id} plan={plan} source={sub?.source ?? "none"} stripeActive={sub?.source === "stripe" && !!sub.stripeSubscriptionId && plan !== "FREE"} cancelAtPeriodEnd={sub?.cancelAtPeriodEnd ?? false} />
                  </div>
                </section>
              );
            })}

            <section className={a.panel}>
              <div className={a.panelHead}>
                <span className={a.panelTitle}>Messages</span>
                <span className={a.panelCount}>{tickets.length}</span>
              </div>
              <div className={a.list}>
                {tickets.length === 0 ? <div className={a.empty}>No support messages or feedback.</div> : null}
                {tickets.map((t) => (
                  <Link key={t.number} href={`/dashboard/admin/inbox/${t.number}`} className={a.item}>
                    <span className={a.dot} data-tone={t.status} />
                    <div className={a.itemMain}>
                      <div className={a.cellTitle}>{t.subject}</div>
                      <div className={a.cellSub}>#{t.number} · {t.kind === "feedback" ? "Feedback" : "Support"}</div>
                    </div>
                    <span className={a.badge} data-tone={STATUS_TONE[t.status]}>{t.status}</span>
                    <span className={a.itemMeta}>{ago(t.createdAt)}</span>
                  </Link>
                ))}
              </div>
            </section>

            <section className={a.panel}>
              <div className={a.panelHead}><span className={a.panelTitle}>History</span></div>
              <div className={a.list}>
                {history.length === 0 ? <div className={a.empty}>No admin actions on this user yet.</div> : null}
                {history.map((e) => (
                  <div key={e.id} className={a.item}>
                    <div className={a.itemMain}>
                      <div className={a.cellTitle}>{e.action}</div>
                      <div className={a.cellSub}>by {e.adminEmail}{e.details ? ` · ${JSON.stringify(e.details).slice(0, 140)}` : ""}</div>
                    </div>
                    <span className={a.itemMeta}>{ago(e.createdAt)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside>
            <section className={a.panel}>
              <div className={a.panelHead}><span className={a.panelTitle}>Account</span></div>
              <div className={a.panelBody}>
                <dl className={a.kv}>
                  <dt>User ID</dt><dd className={a.muted}>{user.id}</dd>
                  <dt>Joined</dt><dd>{day(user.createdAt)}</dd>
                  <dt>Updated</dt><dd>{ago(user.updatedAt)}</dd>
                  <dt>Sessions reset</dt><dd>{user.passwordChangedAt && user.passwordChangedAt.getTime() > 0 ? ago(user.passwordChangedAt) : "never"}</dd>
                </dl>
                <div className={a.divider} />
                <UserActions userId={user.id} email={user.email} isAdmin={user.isAdmin} self={user.id === me.id} />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
