import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import ui from "@/components/dashboard/ui.module.css";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/billing/plans";
import { adminOrNotFound, ago, bestPlan, day } from "@/lib/admin/core";
import { AdminNav, PLAN_TONE } from "../../admin-nav";
import a from "../../admin.module.css";
import { TicketActions } from "./ticket-actions";

export const dynamic = "force-dynamic";

export default async function AdminTicket({ params }: { params: Promise<{ number: string }> }) {
  await adminOrNotFound();
  const { number } = await params;
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1) notFound();
  const t = await prisma.supportTicket.findUnique({ where: { number: n }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  if (!t) notFound();

  const user = await prisma.user.findFirst({
    where: t.userId ? { id: t.userId } : { email: t.email },
    select: { id: true, email: true, createdAt: true, memberships: { select: { workspace: { select: { subscription: true } } } } },
  });
  const plan = user ? bestPlan(user.memberships.map((m) => m.workspace.subscription)) : null;
  const [prev, next] = await Promise.all([
    prisma.supportTicket.findFirst({ where: { status: t.status, number: { lt: t.number } }, orderBy: { number: "desc" }, select: { number: true } }),
    prisma.supportTicket.findFirst({ where: { status: t.status, number: { gt: t.number } }, orderBy: { number: "asc" }, select: { number: true } }),
  ]);
  const canEmail = t.email.includes("@");

  return (
    <>
      <Topbar title="Admin" subtitle={`#${t.number}`} />
      <div className={ui.pageBody}>
        <AdminNav active="/dashboard/admin/inbox" />
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Link href="/dashboard/admin/inbox" className={a.back}>← Inbox</Link>
          <span className={a.spacer} />
          {prev ? <Link href={`/dashboard/admin/inbox/${prev.number}`} className={a.back}>← #{prev.number}</Link> : null}
          {next ? <Link href={`/dashboard/admin/inbox/${next.number}`} className={a.back}>#{next.number} →</Link> : null}
        </div>

        <div className={a.head}>
          <div>
            <h1 className={a.title}>{t.subject}</h1>
            <p className={a.sub}>#{t.number} · {t.kind === "feedback" ? `Feedback · ${t.category}` : `Support · ${t.category}`} · {day(t.createdAt)}</p>
          </div>
        </div>

        <div className={a.detail}>
          <div>
            <div className={a.thread}>
              <div className={a.msg} data-kind="customer">
                <div className={a.msgHead}><b>{t.name ?? t.email}</b><span>{ago(t.createdAt)}</span></div>
                <p className={a.msgBody}>{t.message}</p>
              </div>
              {t.messages.map((m) => (
                <div key={m.id} className={a.msg} data-kind={m.internal ? "note" : "reply"}>
                  <div className={a.msgHead}>
                    <b>{m.internal ? "Internal note" : "Reply"}</b>
                    <span>{m.authorEmail} · {ago(m.createdAt)}{!m.internal ? (m.emailed ? " · emailed" : " · not emailed") : ""}</span>
                  </div>
                  <p className={a.msgBody}>{m.body}</p>
                </div>
              ))}
            </div>
            <div className={a.divider} />
            <TicketActions id={t.id} status={t.status} canEmail={canEmail} email={t.email} />
            <p className={a.hint}>Replies are emailed from the support address. When the customer answers, the email arrives in the support mailbox.</p>
          </div>

          <aside>
            <section className={a.panel}>
              <div className={a.panelHead}><span className={a.panelTitle}>Sender</span></div>
              <div className={a.panelBody}>
                <dl className={a.kv}>
                  <dt>Email</dt><dd>{canEmail ? <a className={a.panelLink} style={{ marginLeft: 0 }} href={`mailto:${t.email}`}>{t.email}</a> : t.email}</dd>
                  {t.name ? (<><dt>Name</dt><dd>{t.name}</dd></>) : null}
                  <dt>Account</dt>
                  <dd>
                    {user ? (
                      <>
                        <Link className={a.panelLink} style={{ marginLeft: 0 }} href={`/dashboard/admin/users/${user.id}`}>Open user</Link>
                        {plan ? <> · <span className={a.badge} data-tone={PLAN_TONE[plan]}>{PLANS[plan].name}</span></> : null}
                      </>
                    ) : "Not signed in"}
                  </dd>
                  {user ? (<><dt>Joined</dt><dd>{day(user.createdAt)}</dd></>) : null}
                  {t.pageUrl ? (<><dt>Page</dt><dd>{t.pageUrl}</dd></>) : null}
                  {t.userAgent ? (<><dt>Browser</dt><dd className={a.muted} style={{ fontSize: 12 }}>{t.userAgent}</dd></>) : null}
                </dl>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
