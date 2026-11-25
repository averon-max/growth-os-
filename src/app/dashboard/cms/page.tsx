import Link from "next/link";
import { ArrowUpRight, Globe } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import { KpiStrip } from "@/components/dashboard/insights";
import styles from "@/components/dashboard/ui.module.css";
import s from "./cms.module.css";

/*
 * CMS: where Hyprlyx publishes approved articles and fixes.
 * One card per website with its connection, what was pushed through it, and how to connect.
 */

const PLATFORM: Record<string, string> = { WORDPRESS: "WordPress", CUSTOM_API: "Custom API" };
const STATE = {
  CONNECTED: { label: "Connected", color: "#16a34a" },
  ERROR: { label: "Error", color: "#f43f5e" },
  DISCONNECTED: { label: "Disconnected", color: "#d97706" },
  NONE: { label: "Not set up", color: "#8f8f8f" },
} as const;
const when = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

export default async function CMSPage() {
  const user = await requireUser();
  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true } });
  const websites = membership
    ? await prisma.website.findMany({
        where: { business: { workspaceId: membership.workspaceId } },
        include: { cmsConnection: { include: { _count: { select: { appliedFixes: true } } } } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  if (!websites.length) {
    return (
      <>
        <Topbar title="CMS" />
        <div className={styles.pageBody}>
          <EmptyState icon={Globe} title="Add a website first" description="Connect a website before setting up publishing." actionLabel="Add website" actionHref="/dashboard/add-website" />
        </div>
      </>
    );
  }

  const connected = websites.filter((w) => w.cmsConnection?.status === "CONNECTED").length;
  const fixes = websites.reduce((a, w) => a + (w.cmsConnection?._count.appliedFixes ?? 0), 0);
  const errors = websites.filter((w) => w.cmsConnection?.status === "ERROR").length;

  return (
    <>
      <Topbar title="CMS" subtitle="Publishing" />
      <div className={styles.pageBody}>
        <header className={s.head}>
          <h1 className={s.title}>CMS</h1>
          <p className={s.meta}>Connect a site&apos;s CMS so approved articles and SEO fixes are published for you. Nothing is changed without your approval.</p>
        </header>

        <KpiStrip
          items={[
            { key: "sites", label: "Websites", value: websites.length, sub: "in this workspace", color: "#0a84ff" },
            { key: "connected", label: "Connected", value: connected, sub: connected ? "ready to publish" : "none yet", tone: connected ? "good" : undefined, color: "#16a34a" },
            { key: "fixes", label: "Changes published", value: fixes, sub: "approved fixes applied", color: "#a855f7" },
            { key: "errors", label: "Connection errors", value: errors, sub: errors ? "reconnect below" : "all good", tone: errors ? "bad" : undefined, color: "#f43f5e" },
          ]}
        />

        <div className={s.sites}>
          {websites.map((w) => {
            const c = w.cmsConnection;
            const st = c ? STATE[c.status as keyof typeof STATE] ?? STATE.DISCONNECTED : STATE.NONE;
            const host = new URL(w.url).hostname.replace(/^www\./, "");
            return (
              <section key={w.id} className={s.site}>
                <header className={s.siteHead}>
                  <img className={s.favicon} src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`} alt="" width={16} height={16} />
                  <div className={s.siteName}>
                    <strong>{host}</strong>
                    <span>{w.url}</span>
                  </div>
                  <span className={s.status} style={{ color: st.color }}><i style={{ background: st.color }} />{st.label}</span>
                  <Link className={c ? s.button : s.primary} href={`/dashboard/cms/${w.id}`}>
                    {c ? "Manage" : "Connect"} <ArrowUpRight size={14} />
                  </Link>
                </header>
                <dl className={s.facts}>
                  <div><dt>Platform</dt><dd>{c ? PLATFORM[c.cmsType] ?? c.cmsType : "—"}</dd></div>
                  <div><dt>Publishes to</dt><dd>{c?.siteUrl ?? "—"}</dd></div>
                  <div><dt>Last connected</dt><dd>{when(c?.lastConnectedAt)}</dd></div>
                  <div><dt>Changes published</dt><dd>{c?._count.appliedFixes ?? 0}</dd></div>
                </dl>
                {c?.lastError ? <p className={s.error}>{c.lastError}</p> : null}
              </section>
            );
          })}
        </div>

        <section className={s.howto}>
          <h2 className={s.howTitle}>Ways to connect</h2>
          <div className={s.options}>
            <div className={s.option}>
              <strong>WordPress</strong>
              <p>Create an Application Password in WordPress (Users → Profile → Application Passwords) and paste it with your username. Hyprlyx publishes posts and applies approved fixes (titles, descriptions, headings, alt text, canonicals) through the WordPress REST API.</p>
            </div>
            <div className={s.option}>
              <strong>Custom API</strong>
              <p>For any other stack: give Hyprlyx an HTTPS endpoint and a secret token. Approved articles and fixes are sent as JSON; your site decides how to apply them.</p>
            </div>
            <div className={s.option}>
              <strong>No CMS</strong>
              <p>Skip it. Articles stay in Content where you can copy or download them, and the SEO audit lists fixes to make by hand.</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
