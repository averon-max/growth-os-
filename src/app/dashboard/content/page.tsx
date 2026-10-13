import Link from "next/link";

import {
  FileText,
  Globe,
  ShieldCheck,
} from "lucide-react";

import {
  requireUser,
} from "@/lib/auth-helpers";

import {
  prisma,
} from "@/lib/prisma";

import {
  Topbar,
} from "@/components/dashboard/topbar";

import {
  EmptyState,
} from "@/components/dashboard/ui";

import {
  ContentExplorer,
} from "@/components/dashboard/content-explorer";

import {
  ContentCreateButton,
} from "@/components/dashboard/content-create-button";

import {
  ContentGovernancePanel,
} from "@/components/dashboard/content-governance-panel";

import {
  OutcomeActionResumePanel,
} from "@/components/dashboard/outcome-action-resume-panel";

import styles from "@/components/dashboard/ui.module.css";
import { groupContentArticlesV1 } from "@/lib/content/article-library-grouping-v1";

export default async function ContentPage({
  searchParams,
}: {
  searchParams:
    Promise<{
      websiteId?: string;
      outcomeActionId?: string;
    }>;
}) {
  const user =
    await requireUser();

  const {
    websiteId,
    outcomeActionId,
  } =
    await searchParams;

  const membership =
    await prisma.workspaceMember.findFirst({
      where: {
        userId:
          user.id,
      },
      select: {
        workspaceId:
          true,
      },
    });

  const website =
    membership
      ? websiteId
        ? await prisma.website.findFirst({
            where: {
              id:
                websiteId,
              business: {
                workspaceId:
                  membership.workspaceId,
              },
            },
          })
        : await prisma.website.findFirst({
            where: {
              business: {
                workspaceId:
                  membership.workspaceId,
              },
            },
            orderBy: {
              createdAt:
                "asc",
            },
          })
      : null;

  if (!website) {
    return (
      <>
        <Topbar title="Content" />

        <div className={styles.pageBody}>
          <EmptyState
            icon={Globe}
            title="No website"
            description="Add a website before creating content."
            actionLabel="Add website"
            actionHref="/dashboard/add-website"
          />
        </div>
      </>
    );
  }

  const resumeAction =
    outcomeActionId &&
    membership
      ? await prisma.keywordOutcomeAction.findFirst({
          where: {
            id:
              outcomeActionId,
            websiteId:
              website.id,
            workspaceId:
              membership.workspaceId,
          },
          select: {
            id:
              true,
            keywordText:
              true,
            decision:
              true,
            status:
              true,
            compatibilityStatus:
              true,
            compatibilityReason:
              true,
          },
        })
      : null;

  const analysis =
    await prisma.analysis.findFirst({
      where: {
        websiteId:
          website.id,
      },
      orderBy: {
        createdAt:
          "desc",
      },
    });

  const opportunities =
    analysis
      ? await prisma.opportunity.findMany({
          where: {
            analysisId:
              analysis.id,
          },
          orderBy: {
            score:
              "desc",
          },
          take:
            50,
        })
      : [];


  const articles =
    await prisma.contentArticle.findMany({
      where: {
        brief: {
          websiteId:
            website.id,
        },
      },

      select: {
        id:
          true,

        title:
          true,

        status:
          true,

        publishedUrl:
          true,

        updatedAt:
          true,

        brief: {
          select: {
            topic:
              true,

            primaryKeyword:
              true,
            searchIntent:
              true,
          },
        },
      },

      orderBy: {
        updatedAt:
          "desc",
      },

      take:
        100,
    });

  const articleCount=await prisma.contentArticle.count({
    where:{brief:{websiteId:website.id}},
  });
  const articleGroups=groupContentArticlesV1(articles);

  return (
    <>
      <Topbar
        title="Content"
        subtitle={website.url}
        websiteSwitcher={
          membership
            ? {
                workspaceId:
                  membership.workspaceId,
                currentWebsiteId:
                  website.id,
              }
            : undefined
        }
      />

      <div className={styles.pageBody}>
        <div className={styles.compactHeader}>
          <div>
            <h1 className={styles.compactTitle}>
              Content
            </h1>

            <div className={styles.compactMeta}>
              Plan, create, review and publish
            </div>
          </div>

          <ContentCreateButton
            websiteId={website.id}
          />
        </div>

        <div className={styles.contentTabs}>
          <a
            href="#content-workspace"
            className={styles.contentTab}
          >
            Pipeline
          </a>

          <a
            href="#content-opportunities"
            className={styles.contentTab}
          >
            Opportunities
            <span className={styles.tabCount}>
              {opportunities.length}
            </span>
          </a>

          <a
            href="#content-articles"
            className={styles.contentTab}
          >
            Articles

              <span className={styles.tabCount}>
                {articleCount}
              </span>
</a>

          <a
            href="#business-facts"
            className={styles.contentTab}
          >
            Business facts
          </a>
        </div>

        {resumeAction ? (
          <div className={styles.resumeSurface}>
            <OutcomeActionResumePanel
              websiteId={website.id}
              initialAction={resumeAction}
            />
          </div>
        ) : null}

        <section
          id="content-opportunities"
          className={styles.contentSection}
        >
          <div className={styles.contentSectionHeader}>
            <div>
              <div className={styles.contentSectionTitle}>
                Opportunities
              </div>

              <div className={styles.contentSectionMeta}>
                Pages and topics worth acting on
              </div>
            </div>

            <span className={styles.sectionCount}>
              {opportunities.length}
            </span>
          </div>

          {opportunities.length ? (
            <div className={styles.contentOpportunityList}>
              {opportunities
                .slice(0, 8)
                .map((opportunity) => (
                  <div
                    key={opportunity.id}
                    className={styles.contentOpportunityRow}
                  >
                    <div className={styles.contentOpportunityMain}>
                      <span
                        className={styles.contentPriorityDot}
                        data-priority={
                          opportunity.priority
                        }
                      />

                      <div>
                        <div className={styles.dataTitle}>
                          {opportunity.title}
                        </div>

                        <div className={styles.dataSecondary}>
                          {opportunity.reason}
                        </div>
                      </div>
                    </div>

                    <div className={styles.contentOpportunityMeta}>
                      <span>
                        {opportunity.priority}
                      </span>

                      <strong>
                        {opportunity.score}
                      </strong>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className={styles.contentEmptyRow}>
              No open opportunities
            </div>
          )}
        </section>

                  <section
            id="content-articles"
            className={styles.contentSection}
          >
            <div className={styles.contentSectionHeader}>
              <div>
                <div className={styles.contentSectionTitle}>
                  Articles
                </div>

                <div className={styles.contentSectionMeta}>
                  Drafts, reviews and published pages
                </div>
              </div>

              <span className={styles.sectionCount}>
                {articleCount}
              </span>
            </div>

            {articles.length ? (
              <div className={styles.contentArticleList}>

                {articleGroups.map(group=>(
                  <div key={group.key} className={styles.contentArticleGroup}>
                    <Link
                      href={`/dashboard/content/articles/${group.head.id}`}
                      className={styles.contentArticleRow}
                    >
                      <div className={styles.contentArticleMain}>
                        <FileText size={13} />
                        <div>
                          <strong>{group.head.title}</strong>
                          <span>
                            {group.head.brief.primaryKeyword ||
                              group.head.brief.topic}
                          </span>
                        </div>
                      </div>
                      <div className={styles.contentArticleMeta}>
                        <span
                          className={styles.contentArticleStatus}
                          data-status={group.head.status}
                        >
                          {group.head.status.toLowerCase().replaceAll("_"," ")}
                        </span>
                        <span>{group.head.updatedAt.toISOString().slice(0,10)}</span>
                      </div>
                    </Link>
                    {group.related.length>0 ? (
                      <details className={styles.contentRelatedDrafts}>
                        <summary>
                          {group.related.length} related drafts and previous attempts
                          <span>View history</span>
                        </summary>
                        {group.related.map(article=>(
                          <Link
                            key={article.id}
                            href={`/dashboard/content/articles/${article.id}`}
                            className={styles.contentArticleRow}
                          >
                            <div className={styles.contentArticleMain}>
                              <FileText size={13} />
                              <div>
                                <strong>{article.title}</strong>
                                <span>{article.brief.primaryKeyword}</span>
                              </div>
                            </div>
                            <div className={styles.contentArticleMeta}>
                              <span
                                className={styles.contentArticleStatus}
                                data-status={article.status}
                              >
                                {article.status.toLowerCase().replaceAll("_"," ")}
                              </span>
                              <span>{article.updatedAt.toISOString().slice(0,10)}</span>
                            </div>
                          </Link>
                        ))}
                      </details>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.contentEmptyRow}>
                No articles yet. Create your first article.
              </div>
            )}
          </section>

<section
          id="content-workspace"
          className={styles.contentSection}
        >
          <div className={styles.contentSectionHeader}>
            <div>
              <div className={styles.contentSectionTitle}>
                Content pipeline
              </div>

              <div className={styles.contentSectionMeta}>
                {opportunities.length} SEO opportunities available
              </div>
            </div>

            <FileText
              size={14}
              className={styles.sectionIcon}
            />
          </div>

          <div
            className={styles.contentSurface}
          >
            <ContentExplorer
              websiteId={website.id}
              opportunities={opportunities}
            />
          </div>
        </section>

        <details
          id="business-facts"
          className={styles.technicalDisclosure}
        >
          <summary className={styles.technicalSummary}>
            <div className={styles.summaryIdentity}>
              <ShieldCheck size={14} />

              <div>
                <strong>
                  Business facts & evidence
                </strong>

                <span>
                  Verification, provenance and evidence history
                </span>
              </div>
            </div>

            <span className={styles.summaryAction}>
              View evidence
            </span>
          </summary>

          <div className={styles.technicalBody}>
            <ContentGovernancePanel
              websiteId={website.id}
            />
          </div>
        </details>
      </div>
    </>
  );
}
