import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { planFor } from "@/lib/billing/plans";

import GrantForm from "./grant-form";
import AdminToggle from "./admin-toggle";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

function formatDate(value: Date | null): string {
  if (!value) return "no end date";
  return value.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  let me: { id: string; email: string };
  try {
    me = await requireAdmin();
  } catch {
    notFound();
    return null;
  }

  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const workspaces = await prisma.workspace.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { members: { some: { user: { email: { contains: query, mode: "insensitive" } } } } },
          ],
        }
      : undefined,
    include: {
      subscription: true,
      members: {
        include: { user: { select: { email: true, name: true } } },
        orderBy: { role: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const users = await prisma.user.findMany({
    where: query ? { email: { contains: query, mode: "insensitive" } } : undefined,
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      createdAt: true,
      memberships: { select: { workspaceId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <span className={styles.eyebrow}>Admin</span>
        <h1 className={styles.title}>Subscriptions & access</h1>
        <a href="/dashboard/admin/tickets" style={{ display: "inline-block", marginTop: 8, fontSize: 13, color: "var(--accent)" }}>Support tickets →</a>
        <p className={styles.lede}>
          Grant access manually, without payment. These subscriptions are marked as manual
          and are never overwritten by Stripe payments.
        </p>
      </div>

      <form className={styles.search}>
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by email or workspace name"
          className={styles.searchInput}
        />
        <button type="submit" className={styles.button}>
          Search
        </button>
      </form>

      <div>
        <h2 className={styles.sectionTitle}>Workspaces</h2>

        <div className={styles.list}>
          {workspaces.length === 0 ? (
            <div className={styles.rows}>
              <p className={styles.empty}>Nothing found.</p>
            </div>
          ) : null}

          {workspaces.map((workspace) => {
            const sub = workspace.subscription;
            const active = sub ? ACTIVE_STATUSES.includes(sub.status) : false;
            const plan = planFor(active ? sub?.plan : "FREE");
            const owner = workspace.members.find((m) => m.role === "OWNER") ?? workspace.members[0];

            return (
              <div key={workspace.id} className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={styles.cardTitle}>
                    <span className={styles.cardName}>{workspace.name}</span>
                    <span className={styles.cardMeta}>
                      {owner?.user.email ?? "no members"}
                      {workspace.members.length > 1
                        ? ` · +${workspace.members.length - 1}`
                        : ""}
                    </span>
                  </div>

                  <div className={styles.cardHead}>
                    <span
                      className={
                        plan.id === "FREE" ? styles.badge : `${styles.badge} ${styles.badgePaid}`
                      }
                    >
                      {plan.name}
                    </span>
                    {sub ? (
                      <span className={styles.cardMeta}>
                        {sub.source === "manual" ? "manual" : "Stripe"} ·{" "}
                        {formatDate(sub.currentPeriodEnd)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {sub?.note ? <p className={styles.note}>{sub.note}</p> : null}

                <div className={styles.divider}>
                  <GrantForm workspaceId={workspace.id} currentPlan={plan.id} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className={styles.sectionTitle}>Users</h2>

        <div className={styles.rows}>
          {users.map((u) => (
            <div key={u.id} className={styles.row}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>{u.email}</span>
                <span className={styles.rowMeta}>
                  {u.name ?? "no name"} · workspaces: {u.memberships.length} · since{" "}
                  {u.createdAt.toLocaleDateString("ru-RU")}
                </span>
              </div>
              <AdminToggle userId={u.id} isAdmin={u.isAdmin} self={u.id === me.id} />
            </div>
          ))}

          {users.length === 0 ? <p className={styles.empty}>No users found.</p> : null}
        </div>
      </div>
    </div>
  );
}
