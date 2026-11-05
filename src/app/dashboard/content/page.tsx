import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { ContentLibrary, type LibraryArticle } from "@/components/dashboard/content-library";

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ websiteId?: string }> }) {
  const user = await requireUser();
  const { websiteId } = await searchParams;

  const workspace = await prisma.workspaceMember
    .findFirst({ where: { userId: user.id }, select: { workspace: { select: { id: true, name: true } } } })
    .then((m) => m?.workspace ?? null);

  const websites = workspace
    ? await prisma.website.findMany({ where: { business: { workspaceId: workspace.id } }, select: { id: true } })
    : [];
  // Only a website from the user's own workspace is accepted (no IDOR via ?websiteId=).
  const activeWebsiteId = websites.some((w) => w.id === websiteId) ? (websiteId as string) : websites[0]?.id ?? "";

  const [rows, latestAnalysis] = activeWebsiteId
    ? await Promise.all([
        prisma.contentArticle.findMany({
          where: { brief: { websiteId: activeWebsiteId } },
          orderBy: { updatedAt: "desc" },
          take: 300,
          select: {
            id: true, title: true, h1: true, status: true, bodyMarkdown: true, updatedAt: true, publishError: true, publishedUrl: true,
            brief: { select: { primaryKeyword: true, searchIntent: true } },
          },
        }),
        prisma.analysis.findFirst({ where: { websiteId: activeWebsiteId }, orderBy: { createdAt: "desc" }, select: { id: true } }),
      ])
    : [[], null];

  const opportunities = latestAnalysis
    ? await prisma.opportunity.findMany({
        where: { analysisId: latestAnalysis.id },
        orderBy: { score: "desc" },
        take: 25,
        select: { id: true, title: true, reason: true, score: true },
      })
    : [];

  const articles: LibraryArticle[] = rows.map((r) => ({
    id: r.id,
    title: r.title || r.h1,
    status: r.status,
    keyword: r.brief.primaryKeyword,
    intent: r.brief.searchIntent,
    words: r.bodyMarkdown.split(/\s+/).filter(Boolean).length,
    updated: r.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    publishError: r.publishError,
    publishedUrl: r.publishedUrl,
  }));

  return (
    <div>
      <Topbar
        title="Content"
        subtitle={workspace?.name ?? ""}
        websiteSwitcher={workspace && activeWebsiteId ? { workspaceId: workspace.id, currentWebsiteId: activeWebsiteId } : undefined}
      />
      <ContentLibrary websiteId={activeWebsiteId} articles={articles} opportunities={opportunities} />
    </div>
  );
}
