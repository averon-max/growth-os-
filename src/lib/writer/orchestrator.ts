import { initLogger, log, logError } from "./logger";
import { pickBestKeyword } from "./keyword-picker";
import { analyzeSERP } from "./serp-analyzer";
import { writeArticle } from "./article-writer";
import { getTemplate } from "./templates";
import type { ArticleCategory } from "./templates";
import type { ArticleBrief } from "./article-writer";

export interface WriterInput {
  seedKeyword: string;
  category: ArticleCategory;
  dataForSeoLogin: string;
  dataForSeoPassword: string;
  openAiKey: string;
}

export interface WriterOutput {
  logFile: string;
  article: {
    title: string;
    metaDescription: string;
    h1: string;
    body: string;
    totalWordCount: number;
    keyword: string;
  };
}

function buildOutlineFromSerp(serpTopics: string[], template: ReturnType<typeof getTemplate>) {
  const must = template.mustHaveSections;
  const fromSerp = serpTopics.filter(t => !must.some(m => t.includes(m.toLowerCase())));
  const merged = [...must, ...fromSerp].slice(0, template.h2Count.max);

  return merged.map((h2) => ({
    h2,
    h3s: [],
    keyPoints: [`Cover ${h2} thoroughly`, `Include keyword naturally`, `Be specific with examples`],
  }));
}

function articleToMarkdown(article: Awaited<ReturnType<typeof writeArticle>>): string {
  const lines: string[] = [];
  lines.push(`# ${article.h1}`);
  lines.push("");
  for (const section of article.sections) {
    const prefix = section.level === 2 ? "##" : "###";
    lines.push(`${prefix} ${section.heading}`);
    lines.push("");
    lines.push(section.content);
    lines.push("");
  }
  return lines.join("\n");
}

export async function runWriter(input: WriterInput): Promise<WriterOutput> {
  const logFile = initLogger(input.seedKeyword);

  log("orchestrator", "PIPELINE_START", {
    seedKeyword: input.seedKeyword,
    category: input.category,
  });

  // STEP 1: keyword picker
  log("orchestrator", "STEP_1_KEYWORD_PICKER", { seedKeyword: input.seedKeyword });
  let keywordResult;
  try {
    keywordResult = await pickBestKeyword(
      input.seedKeyword,
      input.dataForSeoLogin,
      input.dataForSeoPassword
    );
    log("orchestrator", "STEP_1_DONE", {
      winner: keywordResult.winner.keyword,
      score: keywordResult.winner.score,
      volume: keywordResult.winner.volume,
      difficulty: keywordResult.winner.difficulty,
      reason: keywordResult.reason,
    });
  } catch (err) {
    logError("orchestrator", "STEP_1_FAILED", err);
    throw err;
  }

  // STEP 2: SERP analysis
  log("orchestrator", "STEP_2_SERP_ANALYZER", { keyword: keywordResult.winner.keyword });
  let serpAnalysis;
  try {
    serpAnalysis = await analyzeSERP(
      keywordResult.winner.keyword,
      input.dataForSeoLogin,
      input.dataForSeoPassword
    );
    log("orchestrator", "STEP_2_DONE", {
      topResultsCount: serpAnalysis.topResults.length,
      pagesAnalyzed: serpAnalysis.pageStructures.length,
      avgWordCount: serpAnalysis.consensus.avgWordCount,
      mustCoverTopics: serpAnalysis.consensus.mustCoverTopics,
      h2CountRange: serpAnalysis.consensus.h2CountRange,
    });
  } catch (err) {
    logError("orchestrator", "STEP_2_FAILED", err);
    throw err;
  }

  // STEP 3: build outline from template + SERP
  const template = getTemplate(input.category);
  const targetWordCount = Math.max(
    template.minWords,
    Math.min(template.maxWords, serpAnalysis.consensus.avgWordCount)
  );
  const outline = buildOutlineFromSerp(serpAnalysis.consensus.mustCoverTopics, template);

  log("orchestrator", "STEP_3_OUTLINE_BUILT", {
    category: input.category,
    targetWordCount,
    templateMin: template.minWords,
    templateMax: template.maxWords,
    serpAvg: serpAnalysis.consensus.avgWordCount,
    sectionsCount: outline.length,
    outline: outline.map(s => s.h2),
  });

  const brief: ArticleBrief = {
    primaryKeyword: keywordResult.winner,
    template,
    serpAnalysis,
    targetWordCount,
    outline,
  };

  // STEP 4: write article
  log("orchestrator", "STEP_4_ARTICLE_WRITER", {
    keyword: keywordResult.winner.keyword,
    sectionsCount: outline.length,
    targetWordCount,
  });
  let article;
  try {
    article = await writeArticle(brief, input.openAiKey);
    log("orchestrator", "STEP_4_DONE", {
      totalWordCount: article.totalWordCount,
      targetWordCount,
      delta: article.totalWordCount - targetWordCount,
      h1: article.title,
      sectionsWritten: article.sections.length,
    });
  } catch (err) {
    logError("orchestrator", "STEP_4_FAILED", err);
    throw err;
  }

  log("orchestrator", "PIPELINE_COMPLETE", {
    keyword: article.keyword,
    h1: article.title,
    totalWordCount: article.totalWordCount,
    logFile,
  });

  return {
    logFile,
    article: {
      title: article.title,
      metaDescription: article.metaDescription,
      h1: article.h1,
      body: articleToMarkdown(article),
      totalWordCount: article.totalWordCount,
      keyword: article.keyword,
    },
  };
}
