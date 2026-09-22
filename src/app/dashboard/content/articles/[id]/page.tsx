import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  requireUser,
  requireWebsiteAccess,
} from "@/lib/auth-helpers";

import {
  prisma,
} from "@/lib/prisma";

import {
  Topbar,
} from "@/components/dashboard/topbar";

import {
  ArticleWorkspace,
} from "@/components/dashboard/article-workspace";

import styles from "@/components/dashboard/article-workspace.module.css";

export default async function ArticlePage({
  params,
}: {
  params:
    Promise<{
      id: string;
    }>;
}) {
  const {
    id,
  } =
    await params;

  const user =
    await requireUser();

  const article =
    await prisma.contentArticle.findUnique({
      where: {
        id,
      },

      include: {
        brief: {
          select: {
            id:
              true,

            websiteId:
              true,

            topic:
              true,

            primaryKeyword:
              true,

            searchIntent:
              true,
          },
        },
      },
    });

  if (!article) {
    notFound();
  }

  await requireWebsiteAccess(
    user.id,
    article.brief
      .websiteId
  );

  return (
    <>
      <Topbar
        title="Article"
        subtitle={
          article.brief
            .primaryKeyword
        }
      />

      <div
        className={
          styles.page
        }
      >
        <Link
          href={`/dashboard/content?websiteId=${encodeURIComponent(
            article.brief
              .websiteId
          )}`}
          className={
            styles.back
          }
        >
          <ArrowLeft
            size={13}
          />

          Content
        </Link>

        <ArticleWorkspace
          initialArticle={{
            id:
              article.id,

            websiteId:
              article.brief
                .websiteId,

            title:
              article.title,

            metaDescription:
              article.metaDescription,

            h1:
              article.h1,

            bodyMarkdown:
              article.bodyMarkdown,

            status:
              article.status,

            publishedUrl:
              article.publishedUrl,

            publishedAt:
              article.publishedAt
                ?.toISOString() ??
              null,

            updatedAt:
              article.updatedAt.toISOString(),

            topic:
              article.brief
                .topic,

            primaryKeyword:
              article.brief
                .primaryKeyword,

            searchIntent:
              article.brief
                .searchIntent,
          }}
        />
      </div>
    </>
  );
}
