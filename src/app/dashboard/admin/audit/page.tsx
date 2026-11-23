import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Topbar } from "@/components/dashboard/topbar";
import ui from "@/components/dashboard/ui.module.css";
import { prisma } from "@/lib/prisma";
import { adminOrNotFound, ago, day } from "@/lib/admin/core";
import { AdminNav } from "../admin-nav";
import a from "../admin.module.css";

export const dynamic = "force-dynamic";
const PAGE = 100;

const LABEL: Record<string, string> = {
  "plan.grant": "Gave plan",
  "plan.remove": "Removed plan",
  "admin.grant": "Made admin",
  "admin.remove": "Removed admin",
  "user.signout_all": "Signed out everywhere",
  "user.send_reset": "Sent reset link",
  "user.delete": "Deleted account",
  "ticket.reply": "Replied",
  "ticket.note": "Added note",
  "ticket.status": "Changed status",
  "cleanup.run": "Ran cleanup",
};
const TONE: Record<string, string> = { "user.delete": "danger", "plan.remove": "warning", "admin.grant": "violet", "admin.remove": "warning", "plan.grant": "success", "ticket.reply": "accent" };

function targetHref(type: string, id: string | null, label: string | null): string | null {
  if (!id) return null;
  if (type === "user") return `/dashboard/admin/users/${id}`;
  if (type === "ticket" && label?.startsWith("#")) return `/dashboard/admin/inbox/${label.slice(1)}`;
  return null;
}

/** Read-only: admins cannot edit or delete entries. */
export default async function AdminAudit({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await adminOrNotFound();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));
  const where: Prisma.AdminAuditLogWhereInput = q
    ? { OR: [{ adminEmail: { contains: q, mode: "insensitive" } }, { targetLabel: { contains: q, mode: "insensitive" } }, { action: { contains: q, mode: "insensitive" } }] }
    : {};
  const [total, rows] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (p: number) => `/dashboard/admin/audit?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <>
      <Topbar title="Admin" subtitle="Audit log" />
      <div className={ui.pageBody}>
        <AdminNav active="/dashboard/admin/audit" />
        <form className={a.toolbar} action="/dashboard/admin/audit">
          <input className={a.search} type="search" name="q" defaultValue={q} placeholder="Search admin, target or action" aria-label="Search audit log" />
          <span className={a.spacer} />
          <span className={a.muted} style={{ fontSize: 12 }}>{total} entries · kept permanently</span>
        </form>

        <div className={a.panel}>
          <table className={a.table}>
            <thead>
              <tr><th>When</th><th>Action</th><th>Target</th><th className={a.hideSm}>Details</th><th className={a.hideSm}>By</th></tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const link = targetHref(e.targetType, e.targetId, e.targetLabel);
                const label = e.targetLabel ?? e.targetId ?? e.targetType;
                return (
                  <tr key={e.id}>
                    <td className={a.muted} title={e.createdAt.toISOString()}>{ago(e.createdAt)}<div className={a.cellSub}>{day(e.createdAt)}</div></td>
                    <td><span className={a.badge} data-tone={TONE[e.action] ?? ""}>{LABEL[e.action] ?? e.action}</span></td>
                    <td><span className={a.cellTitle}>{link ? <Link href={link}>{label}</Link> : label}</span></td>
                    <td className={a.hideSm}><span className={a.cellSub} style={{ maxWidth: 360 }}>{e.details ? JSON.stringify(e.details) : "—"}</span></td>
                    <td className={`${a.hideSm} ${a.muted}`}>{e.adminEmail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 ? <div className={a.empty}>No admin actions recorded yet.</div> : null}
          {pages > 1 ? (
            <div className={a.pager}>
              <span>Page {page} of {pages}</span>
              {page > 1 ? <Link className={a.btn} href={href(page - 1)}>Previous</Link> : null}
              {page < pages ? <Link className={a.btn} href={href(page + 1)}>Next</Link> : null}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
