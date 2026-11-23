import Link from "next/link";
import { prisma } from "@/lib/prisma";
import a from "./admin.module.css";

const TABS = [
  { href: "/dashboard/admin", label: "Overview" },
  { href: "/dashboard/admin/users", label: "Users" },
  { href: "/dashboard/admin/subscriptions", label: "Subscriptions" },
  { href: "/dashboard/admin/inbox", label: "Inbox" },
  { href: "/dashboard/admin/audit", label: "Audit log" },
];

/** Tabs at the top of every admin page. Inbox shows how many messages are still open. */
export async function AdminNav({ active }: { active: string }) {
  const open = await prisma.supportTicket.count({ where: { status: "open" } });
  return (
    <nav className={a.nav} aria-label="Admin">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={a.navLink} data-active={active === t.href ? "true" : "false"} aria-current={active === t.href ? "page" : undefined}>
          {t.label}
          {t.href.endsWith("/inbox") && open > 0 ? <span className={a.navCount}>{open}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export const PLAN_TONE: Record<string, string> = { FREE: "", STARTER: "accent", GROWTH: "success", AUTOPILOT: "violet" };
export const STATUS_TONE: Record<string, string> = { open: "warning", pending: "accent", closed: "" };
