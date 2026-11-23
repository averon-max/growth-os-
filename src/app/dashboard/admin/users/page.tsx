import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Topbar } from "@/components/dashboard/topbar";
import ui from "@/components/dashboard/ui.module.css";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/billing/plans";
import { ACTIVE_STATUSES, adminOrNotFound, ago, bestPlan } from "@/lib/admin/core";
import { AdminNav, PLAN_TONE } from "../admin-nav";
import a from "../admin.module.css";

export const dynamic = "force-dynamic";
const PAGE = 50;

const PAID: Prisma.SubscriptionWhereInput = { status: { in: ACTIVE_STATUSES }, plan: { not: "FREE" } };
const FILTERS: Record<string, { label: string; where: Prisma.UserWhereInput }> = {
  all: { label: "All", where: {} },
  paying: { label: "Paying", where: { memberships: { some: { workspace: { subscription: { ...PAID, source: "stripe" } } } } } },
  manual: { label: "Manual plan", where: { memberships: { some: { workspace: { subscription: { ...PAID, source: "manual" } } } } } },
  free: { label: "Free", where: { NOT: { memberships: { some: { workspace: { subscription: PAID } } } } } },
  admins: { label: "Admins", where: { isAdmin: true } },
};

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; f?: string; page?: string }> }) {
  const me = await adminOrNotFound();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const f = sp.f && sp.f in FILTERS ? sp.f : "all";
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));
  const search: Prisma.UserWhereInput = q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {};
  const where: Prisma.UserWhereInput = { AND: [search, FILTERS[f].where] };

  const [total, counts, users] = await Promise.all([
    prisma.user.count({ where }),
    Promise.all(Object.entries(FILTERS).map(async ([k, v]) => [k, await prisma.user.count({ where: { AND: [search, v.where] } })] as const)),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: {
        id: true, email: true, name: true, isAdmin: true, createdAt: true, passwordChangedAt: true,
        memberships: { select: { role: true, workspace: { select: { name: true, subscription: true, businesses: { select: { _count: { select: { websites: true } } } } } } } },
      },
    }),
  ]);
  const count = Object.fromEntries(counts);
  const href = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const next = { q, f, page: 1, ...patch };
    if (next.q) p.set("q", String(next.q));
    if (next.f !== "all") p.set("f", String(next.f));
    if (Number(next.page) > 1) p.set("page", String(next.page));
    const s = p.toString();
    return `/dashboard/admin/users${s ? `?${s}` : ""}`;
  };
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <>
      <Topbar title="Admin" subtitle="Users" />
      <div className={ui.pageBody}>
        <AdminNav active="/dashboard/admin/users" />

        <form className={a.toolbar} action="/dashboard/admin/users">
          <input className={a.search} type="search" name="q" defaultValue={q} placeholder="Search by email or name" aria-label="Search users" />
          {f !== "all" ? <input type="hidden" name="f" value={f} /> : null}
          <div className={a.chips} role="tablist" aria-label="Filter">
            {Object.entries(FILTERS).map(([k, v]) => (
              <Link key={k} href={href({ f: k })} className={a.chip} data-active={f === k ? "true" : "false"}>
                {v.label} <span className={a.chipCount}>{count[k]}</span>
              </Link>
            ))}
          </div>
        </form>

        <div className={a.panel}>
          <table className={a.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Plan</th>
                <th className={a.hideSm}>Workspaces</th>
                <th className={a.hideSm}>Websites</th>
                <th className={a.hideSm}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const subs = u.memberships.map((m) => m.workspace.subscription);
                const plan = bestPlan(subs);
                const sources = new Set(subs.filter(Boolean).map((s) => s!.source));
                const sites = u.memberships.reduce((n, m) => n + m.workspace.businesses.reduce((k, b) => k + b._count.websites, 0), 0);
                return (
                  <tr key={u.id}>
                    <td>
                      <div className={a.cellMain}>
                        <span className={a.cellTitle}><Link href={`/dashboard/admin/users/${u.id}`}>{u.email}</Link></span>
                        <span className={a.cellSub}>
                          {u.name ?? "No name"}
                          {u.isAdmin ? " · admin" : ""}
                          {u.id === me.id ? " · you" : ""}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={a.badges}>
                        <span className={a.badge} data-tone={PLAN_TONE[plan]}>{PLANS[plan].name}</span>
                        {plan !== "FREE" ? <span className={a.badge}>{sources.has("stripe") ? "Stripe" : "Manual"}</span> : null}
                      </span>
                    </td>
                    <td className={`${a.num} ${a.hideSm}`}>{u.memberships.length}</td>
                    <td className={`${a.num} ${a.hideSm}`}>{sites}</td>
                    <td className={`${a.muted} ${a.hideSm}`}>{ago(u.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {users.length === 0 ? <div className={a.empty}>No users match.</div> : null}
          {pages > 1 ? (
            <div className={a.pager}>
              <span>Page {page} of {pages} · {total} users</span>
              {page > 1 ? <Link className={a.btn} href={href({ page: page - 1 })}>Previous</Link> : null}
              {page < pages ? <Link className={a.btn} href={href({ page: page + 1 })}>Next</Link> : null}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
