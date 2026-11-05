import { prisma } from "@/lib/prisma";
import { extractArticleHeadings } from "@/lib/content/article-analyzer";

export class ReleaseBlockedError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "ReleaseBlockedError";
  }
}

const MIN_WORDS = 300;
const LOCKED = new Set(["GENERATING", "PUBLISHED", "BLOCKED_EXTERNAL"]);

/** One plain release check for writer articles: replaces the legacy multi-gate chain. */
export async function requireArticleReleasable(articleId: string) {
  const article = await prisma.contentArticle.findUnique({ where: { id: articleId }, include: { brief: true } });
  if (article === null) throw new ReleaseBlockedError(["Article not found."]);
  const reasons: string[] = [];
  if (LOCKED.has(article.status)) reasons.push(`Article is ${article.status}.`);
  if (article.title.trim() === "") reasons.push("Title is empty.");
  if (article.h1.trim() === "") reasons.push("H1 is empty.");
  if (extractArticleHeadings(article.bodyMarkdown).some((h) => h.level === 1)) reasons.push("Body must not contain an H1.");
  const words = article.bodyMarkdown.split(/\s+/).filter(Boolean).length;
  if (words < MIN_WORDS) reasons.push(`Body has ${words} words; at least ${MIN_WORDS} required.`);
  if (reasons.length > 0) throw new ReleaseBlockedError(reasons);
  return article;
}
