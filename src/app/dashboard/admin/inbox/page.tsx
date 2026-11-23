import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Topbar } from "@/components/dashboard/topbar";
import ui from "@/components/dashboard/ui.module.css";
import { prisma } from "@/lib/prisma";
import { adminOrNotFound, ago } from "@/lib/admin/core";
import { AdminNav, STATUS_TONE } from "../admin-nav";
import a from "../admin.module.css";

export const dynamic = "force-dynamic";

const STATUS = { open: "Open", pending: "Waiting on customer", closed: "Closed", all: "All" } as const;
const KIND = { all: "Everything", ticket: "Support", feedback: "Feedback" } as const;

export default async function AdminInbox({ searchParams }: { searchParams: Promise<{ status?: string; kind?: string; q?: string }> }) {
  await adminOrNotFound();
  const sp = await searchParams;
  const status = (sp.status && sp.status in STATUS ? sp.status : "open") as keyof typeof STATUS;
  const kind = (sp.kind && sp.kind in KIND ? sp.kind : "all") as keyof typeof KIND;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const num = /^#?\d+$/.test(q) ? Number(q.replace("#", "")) : null;

  const base: Prisma.SupportTicketWhereInput = {
    ...(kind === "all" ? {} : { kind }),
    ...(q
      ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { subject: { contains: q, mode: "insensitive" } }, { message: { contains: q, mode: "insensitive" } }, ...(num ? [{ number: num }] : [])] }
      : {}),
  };
  const [counts, kindCounts, tickets] = await Promise.all([
    prisma.supportTicket.groupBy({ by: ["status"], where: base, _count: true }),
    prisma.supportTicket.groupBy({ by: ["kind"], where: { ...(status === "all" ? {} : { status }) }, _count: true }),
    prisma.supportTicket.findMany({
      where: { ...base, ...(status === "all" ? {} : { status }) },
      orderBy: { createdAt: status === "closed" ? "desc" : "asc" },
      take: 200,
      include: { _count: { select: { messages: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true, internal: true } } },
    }),
  ]);
  const sc = (s: string) => (s === "all" ? counts.reduce((n, c) => n + c._count, 0) : counts.find((c) => c.status === s)?._count ?? 0);
  const kc = (k: string) => (k === "all" ? kindCounts.reduce((n, c) => n + c._count, 0) : kindCounts.find((c) => c.kind === k)?._count ?? 0);
  const href = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ status, kind, ...(q ? { q } : {}), ...patch });
    if (p.get("kind") === "all") p.delete("kind");
    if (p.get("status") === "open") p.delete("status");
    const s = p.toString();
    return `/dashboard/admin/inbox${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <Topbar title="Admin" subtitle="Inbox" />
      <div className={ui.pageBody}>
        <AdminNav active="/dashboard/admin/inbox" />

        <form className={a.toolbar} action="/dashboard/admin/inbox">
          <input className={a.search} type="search" name="q" defaultValue={q} placeholder="Search email, subject, text or #number" aria-label="Search inbox" />
          {status !== "open" ? <input type="hidden" name="status" value={status} /> : null}
          {kind !== "all" ? <input type="hidden" name="kind" value={kind} /> : null}
          <div className={a.chips}>
            {(Object.keys(STATUS) as (keyof typeof STATUS)[]).map((s) => (
              <Link key={s} href={href({ status: s })} className={a.chip} data-active={status === s ? "true" : "false"}>
                {STATUS[s]} <span className={a.chipCount}>{sc(s)}</span>
              </Link>
            ))}
          </div>
          <div className={a.chips}>
            {(Object.keys(KIND) as (keyof typeof KIND)[]).map((k) => (
              <Link key={k} href={href({ kind: k })} className={a.chip} data-active={kind === k ? "true" : "false"}>
                {KIND[k]} <span className={a.chipCount}>{kc(k)}</span>
              </Link>
            ))}
          </div>
        </form>

        <div className={a.panel}>
          <table className={a.table}>
            <thead>
              <tr>
                <th style={{ width: 70 }}>#</th>
                <th>Message</th>
                <th className={a.hideSm}>From</th>
                <th className={a.hideSm}>Type</th>
                <th>Status</th>
                <th className={a.hideSm}>Received</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td className={`${a.muted} ${a.num}`}>#{t.number}</td>
                  <td>
                    <div className={a.cellMain}>
                      <span className={a.cellTitle}><Link href={`/dashboard/admin/inbox/${t.number}`}>{t.subject}</Link></span>
                      <span className={a.cellSub}>
                        {t.message.replace(/\s+/g, " ").slice(0, 140)}
                      </span>
                    </div>
                  </td>
                  <td className={a.hideSm}><span className={a.cellSub} style={{ color: "#a0a4ab" }}>{t.email}</span></td>
                  <td className={a.hideSm}><span className={a.badge}>{t.kind === "feedback" ? t.category : `Support · ${t.category}`}</span></td>
                  <td><span className={a.badge} data-tone={STATUS_TONE[t.status]}>{t.status}</span>{t._count.messages ? <span className={a.muted} style={{ marginLeft: 8, fontSize: 12 }}>{t._count.messages} repl{t._count.messages === 1 ? "y" : "ies"}</span> : null}</td>
                  <td className={`${a.hideSm} ${a.muted}`}>{ago(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 ? <div className={a.empty}>{status === "open" ? "Inbox zero. Nothing is waiting for you." : "Nothing here."}</div> : null}
        </div>
      </div>
    </>
  );
}
