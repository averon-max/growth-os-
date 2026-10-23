import OpenAI from "openai";
import { log, logError } from "./logger";
import type { ArticleTemplate } from "./templates";
import type { KeywordCandidate } from "./keyword-picker";
import type { SerpAnalysis } from "./serp-analyzer";

export interface ArticleBrief {
  primaryKeyword: KeywordCandidate;
  template: ArticleTemplate;
  serpAnalysis: SerpAnalysis;
  targetWordCount: number;
  outline: { h2: string; h3s: string[]; keyPoints: string[] }[];
}

export interface GeneratedArticle {
  title: string;
  metaDescription: string;
  h1: string;
  sections: { heading: string; level: 2 | 3; content: string; wordCount: number }[];
  totalWordCount: number;
  keyword: string;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function generateSection(
  client: OpenAI,
  keyword: string,
  sectionHeading: string,
  keyPoints: string[],
  articleContext: string,
  targetWords: number
): Promise<string> {
  const prompt = `You are writing a section of an SEO article about "${keyword}".

Section heading: "${sectionHeading}"
Target length: ${targetWords} words
Key points to cover: ${keyPoints.join(", ")}

Article context so far:
${articleContext}

Write ONLY the body text for this section (no heading). Be specific, helpful, and avoid filler.`;

  log("article-writer", "SECTION_PROMPT_SENT", {
    heading: sectionHeading,
    targetWords,
    keyPointsCount: keyPoints.length,
  });

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_CONTENT_MODEL ?? "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: Math.round(targetWords * 2),
  });

  const text = completion.choices[0]?.message?.content ?? "";
  const words = countWords(text);

  log("article-writer", "SECTION_GENERATED", {
    heading: sectionHeading,
    wordsGenerated: words,
    targetWords,
    delta: words - targetWords,
    tokensUsed: completion.usage?.total_tokens,
  });

  return text;
}

export async function writeArticle(
  brief: ArticleBrief,
  openAiKey: string
): Promise<GeneratedArticle> {
  const client = new OpenAI({ apiKey: openAiKey });
  const { primaryKeyword, template, serpAnalysis, outline, targetWordCount } = brief;
  const keyword = primaryKeyword.keyword;

  log("article-writer", "START", {
    keyword,
    category: template.category,
    targetWordCount,
    sectionsCount: outline.length,
    serpAvgWordCount: serpAnalysis.consensus.avgWordCount,
    mustCoverTopics: serpAnalysis.consensus.mustCoverTopics,
  });

  log("article-writer", "GENERATING_H1_META", { keyword });
  const h1Meta = await client.chat.completions.create({
    model: process.env.OPENAI_CONTENT_MODEL ?? "gpt-4o",
    messages: [{
      role: "user",
      content: `Create H1 and meta description for an article about "${keyword}".
Top competitor titles:
${serpAnalysis.topResults.slice(0, 5).map((r, i) => `${i + 1}. ${r.title}`).join("\n")}
Requirements:
- H1: includes keyword naturally, 50-65 chars
- Meta: 145-155 chars, includes keyword
Respond in JSON: {"h1": "...", "meta": "..."}`
    }],
    response_format: { type: "json_object" },
  });

  const h1MetaData = JSON.parse(h1Meta.choices[0]?.message?.content ?? "{}") as { h1: string; meta: string };
  log("article-writer", "H1_META_GENERATED", {
    h1: h1MetaData.h1,
    h1Length: h1MetaData.h1?.length,
    meta: h1MetaData.meta,
    metaLength: h1MetaData.meta?.length,
  });

  const sections: GeneratedArticle["sections"] = [];
  const wordsPerSection = Math.round(targetWordCount / outline.length);
  let articleContext = `Title: ${h1MetaData.h1}\nKeyword: ${keyword}\n`;

  for (let i = 0; i < outline.length; i++) {
    const section = outline[i];
    log("article-writer", "SECTION_START", {
      index: i + 1,
      total: outline.length,
      heading: section.h2,
      h3Count: section.h3s.length,
      keyPoints: section.keyPoints,
    });

    try {
      const content = await generateSection(client, keyword, section.h2, section.keyPoints, articleContext, wordsPerSection);
      sections.push({ heading: section.h2, level: 2, content, wordCount: countWords(content) });
      articleContext += `\n## ${section.h2}\n${content.slice(0, 300)}...\n`;

      for (const h3 of section.h3s) {
        log("article-writer", "H3_START", { h3, parentH2: section.h2 });
        const h3Content = await generateSection(client, keyword, h3, [], articleContext, Math.round(wordsPerSection / 2));
        sections.push({ heading: h3, level: 3, content: h3Content, wordCount: countWords(h3Content) });
        articleContext += `\n### ${h3}\n${h3Content.slice(0, 200)}...\n`;
      }
    } catch (err) {
      logError("article-writer", "SECTION_FAILED", err, { heading: section.h2, index: i });
      throw err;
    }
  }

  const totalWordCount = sections.reduce((sum, s) => sum + s.wordCount, 0);
  log("article-writer", "COMPLETE", {
    keyword,
    totalWordCount,
    targetWordCount,
    delta: totalWordCount - targetWordCount,
    sectionsWritten: sections.length,
    h1: h1MetaData.h1,
  });

  return {
    title: h1MetaData.h1,
    metaDescription: h1MetaData.meta,
    h1: h1MetaData.h1,
    sections,
    totalWordCount,
    keyword,
  };
}
