import { redirect } from "next/navigation";
import { Globe, ScanSearch } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import { RunAnalysisButton } from "@/components/dashboard/run-analysis-button";
import styles from "@/components/dashboard/ui.module.css";
import s from "./seo.module.css";

/*
 * One audit page for the whole app: "SEO audit" opens the full report of the latest crawl of the chosen site
 * (the same page as "Open report" on the overview). Without a crawl yet, it offers to run the first one.
 */
export default async function SeoPage({ searchParams }: { searchParams: Promise<{ websiteId?: string }> }) {
  const user = await requireUser();
  const { websiteId } = await searchParams;
  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true } });
  const workspaceId = membership?.workspaceId ?? null;
  const website = workspaceId
    ? await prisma.website.findFirst({
        where: { business: { workspaceId }, ...(websiteId ? { id: websiteId } : {}) },
        orderBy: { createdAt: "asc" },
        select: { id: true, url: true },
      })
    : null;

  if (!workspaceId || !website) {
    return (
      <>
        <Topbar title="SEO audit" />
        <div className={styles.pageBody}>
          <EmptyState icon={Globe} title="No websites" description="Add a website to run an audit." actionLabel="Add website" actionHref="/dashboard/add-website" />
        </div>
      </>
    );
  }

  const latest = await prisma.analysis.findFirst({ where: { websiteId: website.id }, orderBy: { createdAt: "desc" }, select: { id: true } });
  if (latest) redirect(`/dashboard/analysis/${latest.id}`);

  return (
    <>
      <Topbar title="SEO audit" websiteSwitcher={{ workspaceId, currentWebsiteId: website.id }} />
      <div className={styles.pageBody}>
        <header className={s.head}>
          <div>
            <h1 className={s.title}>SEO audit</h1>
            <p className={s.meta}>{new URL(website.url).hostname.replace(/^www\./, "")} · not crawled yet</p>
          </div>
          <div className={s.actions}>
            <RunAnalysisButton websiteId={website.id} className={s.primary} label="Run first audit" />
          </div>
        </header>
        <EmptyState icon={ScanSearch} title="No audit yet" description="Hyprlyx crawls the site and checks titles, descriptions, headings, links, images and structured data on every page." />
      </div>
    </>
  );
}
