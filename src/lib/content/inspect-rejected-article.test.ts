import { it } from "vitest";
import { prisma } from "../prisma";

it("inspects saved rejected article without modifying it", async () => {
  const article = await prisma.contentArticle.findUnique({
    where: {
      id: "cmv1hjtyv06s7oaql3hgxdkxz",
    },
    include: {
      brief: {
        include: {
          evidenceSnapshot: true,
        },
      },
    },
  });

  if (!article) {
    console.log("ARTICLE_NOT_FOUND");
    return;
  }

  const keywords = [
    article.brief.primaryKeyword,
    ...article.brief.secondaryKeywords,
  ];

  const prose = article.bodyMarkdown
    .split(/\r?\n/)
    .filter((line) => !/^#{1,6}\s+/.test(line.trim()))
    .join("\n")
    .toLowerCase();


  const fs = await import("node:fs");
  const path = await import("node:path");

  const outputDir = path.resolve(".growth-os-tmp/article-recovery");
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(
    path.join(outputDir, "original-article.md"),
    article.bodyMarkdown,
    "utf8"
  );
  console.log("SAVED_ORIGINAL_ARTICLE:", outputDir);

  console.log("=== SAVED ARTICLE DIAGNOSTICS ===");

  console.log(JSON.stringify({
    articleId: article.id,
    status: article.status,
    title: article.title,
    primaryKeyword: article.brief.primaryKeyword,
    secondaryKeywords: article.brief.secondaryKeywords,
    keywordCoverage: keywords.map((keyword) => ({
      keyword,
      foundInProse: prose.includes(keyword.toLowerCase()),
    })),
    bodyMarkdown: article.bodyMarkdown,
    publishError: article.publishError,
    snapshotAvailable: Boolean(article.brief.evidenceSnapshot),
  }, null, 2));
}, 15000);
