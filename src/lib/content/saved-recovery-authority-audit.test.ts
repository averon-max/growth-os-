import { it, expect } from "vitest";
import { prisma } from "../prisma";
import { readFileSync, existsSync } from "node:fs";

const ARTICLE_ID = "cmv1hjtyv06s7oaql3hgxdkxz";

const keys = (value: unknown): string[] =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value).sort()
    : [];

const shape = (value: unknown): string =>
  Array.isArray(value)
    ? `array(${value.length})`
    : value === null
      ? "null"
      : typeof value;

it("audits real persisted recovery authority without modification", async () => {
  const article = await prisma.contentArticle.findUnique({
    where: { id: ARTICLE_ID },
    include: {
      brief: {
        include: { evidenceSnapshot: true },
      },
    },
  });

  expect(article).not.toBeNull();
  if (!article) return;

  const snapshot = article.brief.evidenceSnapshot;
  const plan = snapshot?.plan;

  const candidatePath =
    ".growth-os-tmp/article-recovery/repaired-article.md";

  expect(existsSync(candidatePath)).toBe(true);

  const candidate = readFileSync(candidatePath, "utf8");

  const keywords = [
    article.brief.primaryKeyword,
    ...article.brief.secondaryKeywords,
  ].filter(Boolean);

  const prose = candidate
    .split(/\r?\n/)
    .filter(line => !/^#{1,6}\s+/.test(line.trim()))
    .join("\n")
    .toLocaleLowerCase("en-US");

  const coverage = keywords.map(keyword => ({
    keyword,
    present: prose.includes(keyword.toLocaleLowerCase("en-US")),
  }));

  const briefShape = {
    columns: Object.keys(article.brief).filter(
      key => key !== "evidenceSnapshot"
    ).sort(),
  };

  console.log("=== REAL PERSISTED RECOVERY AUTHORITY ===");
  console.log(JSON.stringify({
    articleId: article.id,
    status: article.status,
    originalWords: article.bodyMarkdown.trim().split(/\s+/).length,
    candidateWords: candidate.trim().split(/\s+/).length,
    keywordCount: keywords.length,
    keywordCoverage: coverage,
    brief: briefShape,
    snapshotPresent: Boolean(snapshot),
    snapshotColumns: keys(snapshot),
    snapshotPlanType: shape(plan),
    snapshotPlanKeys: keys(plan),
    nestedPlanShapes:
      Object.fromEntries(
        keys(plan).map(key => {
          const record = plan as Record<string, unknown>;
          return [key, shape(record[key])];
        })
      ),
    databaseModified: false,
    candidateOnly: true,
  }, null, 2));
}, 15000);
