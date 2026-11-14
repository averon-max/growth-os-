import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser, isUserAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import styles from "@/components/dashboard/ui.module.css";
import TicketStatus from "./ticket-status";

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser();
  if (!(await isUserAdmin(user.id))) notFound();
  const { status = "open" } = await searchParams;
  const where = status === "all" ? {} : { status };
  const [tickets, counts] = await Promise.all([
    prisma.supportTicket.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.supportTicket.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const tab = (s: string, label: string) => (
    <Link href={`/dashboard/admin/tickets?status=${s}`} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 13, textDecoration: "none", color: status === s ? "var(--primary)" : "var(--secondary)", background: status === s ? "var(--surface-2)" : "transparent" }}>
      {label}{s !== "all" ? ` ${count(s)}` : ""}
    </Link>
  );

  return (
    <>
      <Topbar title="Support tickets" />
      <div className={styles.pageBody}>
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {tab("open", "Open")}{tab("pending", "Pending")}{tab("closed", "Closed")}{tab("all", "All")}
        </div>
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--surface)" }}>
          {tickets.length === 0 ? <p style={{ padding: 20, color: "var(--muted)", fontSize: 14, margin: 0 }}>No tickets here.</p> : null}
          {tickets.map((t) => (
            <details key={t.id} style={{ borderTop: "1px solid var(--border)" }}>
              <summary style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", cursor: "pointer", listStyle: "none", fontSize: 13.5 }}>
                <span style={{ color: "var(--muted)", width: 52, fontFamily: "var(--font-mono, monospace)" }}>#{t.number}</span>
                <span style={{ fontWeight: 500, color: "var(--primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</span>
                <span style={{ color: "var(--secondary)" }}>{t.category}</span>
                <span style={{ color: "var(--secondary)", width: 220, overflow: "hidden", textOverflow: "ellipsis" }}>{t.email}</span>
                <span style={{ color: "var(--muted)", width: 90 }}>{t.createdAt.toISOString().slice(0, 10)}</span>
                <TicketStatus id={t.id} status={t.status} />
              </summary>
              <div style={{ padding: "4px 16px 18px 80px" }}>
                <p style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6, color: "var(--secondary)", margin: "0 0 12px" }}>{t.message}</p>
                <a href={`mailto:${t.email}?subject=${encodeURIComponent(`Re: [#${t.number}] ${t.subject}`)}`} style={{ fontSize: 13, color: "var(--primary)" }}>Reply by email →</a>
              </div>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}
