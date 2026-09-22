import {
  businessFactPrompt,
} from "./business-facts";

import {
  getBusinessFactRegistryForWebsite,
} from "./business-fact-repository";

import {
  createContentEvidenceSnapshot,
  getBusinessFactRegistryForBrief,
} from "./evidence-snapshot";

import {
  assertContentGatePassed,
  evaluateContentGate,
  formatContentGateFailure,
} from "./content-gate";

import {
  prisma,
} from "@/lib/prisma";

import type {
  Prisma,
} from "@prisma/client";

import type {
  ContentGenerator,
} from "./generator";

import type {
  CMSProvider,
} from "@/lib/cms/provider";

import {
  ContentGenerationError,
} from "./generator";

import type {
  ContentBriefInput,
  ContentStrategy,
} from "./types";

import {
  getWebsiteKeywordContext,
} from "./keyword-context";

import {
  normalizeOutline,
} from "./seo-strategy";

import {
  buildFinalContentPlan,
  finalPlanPrompt,
} from "./final-content-plan";

import {
  auditArticle,
  repairGeneratedArticle,
} from "./content-quality";

import {
  analyzeArticleAgainstPlan,
} from "./content-plan-analysis";


async function analyzeStoredContentPlan({
  briefId,
  title,
  metaDescription,
  h1,
  bodyMarkdown,
  primaryKeyword,
  secondaryKeywords,
}: {
  briefId: string;
  title: string;
  metaDescription?: string | null;
  h1: string;
  bodyMarkdown: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
}) {
  const evidence =
    await prisma.contentEvidenceSnapshot.findUnique({
      where: {
        briefId,
      },

      select: {
        plan:
          true,
      },
    });

  return analyzeArticleAgainstPlan({
    title,
    metaDescription,
    h1,
    bodyMarkdown,
    primaryKeyword,
    secondaryKeywords,

    plan:
      evidence?.plan ??
      null,
  });
}


function logContentIntelligence(
  briefId: string,
  intelligence: Awaited<
    ReturnType<
      typeof analyzeStoredContentPlan
    >
  >
): void {
  console.info(
    "[content intelligence]",
    {
      briefId,

      planAvailable:
        intelligence
          .planAvailable,

      confidence:
        intelligence
          .confidence,

      structure: {
        h1:
          intelligence
            .article
            .structure
            .totalH1,

        h2:
          intelligence
            .article
            .structure
            .h2,

        h3:
          intelligence
            .article
            .structure
            .h3,

        words:
          intelligence
            .article
            .wordCount,
      },

      plannedKeywords:
        intelligence
          .article
          .keywordCoverage
          .planned,

      usedPlannedKeywords:
        intelligence
          .article
          .keywordCoverage
          .used,

      missingPlannedKeywords:
        intelligence
          .article
          .keywordCoverage
          .missing,

      topicCoverage: {
        covered:
          intelligence
            .topics
            .covered,

        total:
          intelligence
            .topics
            .total,
      },

      questionCoverage: {
        covered:
          intelligence
            .questions
            .covered,

        total:
          intelligence
            .questions
            .total,
      },

      structurallyValid:
        intelligence
          .article
          .structurallyValid,

      warnings:
        intelligence
          .warnings,
    }
  );
}



export interface CreateBriefInput {
  outcomeActionId?: string;
  requiredPrimaryKeyword?: string;
  websiteId: string;
  opportunityId?: string;
  topic: string;
  reason: string;
  recommendation: string;
  businessName: string;
  websiteUrl: string;
}


function strategyPrompt(
  strategy:
    ContentStrategy
): string {
  const secondary =
    strategy.secondary
      .map(
        (item) =>
          item.keyword
      )
      .join(", ");

  const supporting =
    strategy.supporting
      .map(
        (item) =>
          item.keyword
      )
      .join(", ");

  return [
    "CONTENT STRATEGY:",
    `Intent: ${strategy.searchIntent}`,
    `Primary keyword: ${strategy.primary.keyword}`,
    secondary
      ? `Secondary keywords: ${secondary}`
      : "",
    supporting
      ? `Supporting concepts: ${supporting}`
      : "",
    `Page decision: ${strategy.action.type}`,
    "Use exactly one page-level H1.",
    "There is NO target number of H2 or H3 headings.",
    "Create an H2 only for a genuinely distinct major sub-intent, question, process stage, comparison, or concept required to satisfy the query.",
    "Create an H3 only when one specific H2 genuinely needs subdivision. Never add H3 headings merely to increase structure.",
    "Do not create headings solely to repeat keywords.",
    "Answer the main query directly near the beginning.",
    "Avoid keyword stuffing.",
    "Keep synonymous queries with the same intent on one page.",
    "Do not invent facts, statistics, sources, security claims, or studies.",
    "Prefer concise definitions, direct answers, lists, steps, comparisons, and extractable factual statements where appropriate.",
  ]
    .filter(Boolean)
    .join("\n");
}


export async function createContentBrief(
  generator:
    ContentGenerator,
  input:
    CreateBriefInput
) {
  const [
    finalPlan,
    context,
  ] =
    await Promise.all([
      buildFinalContentPlan({
        websiteId:
          input.websiteId,

        topic:
          input.topic,

        businessName:
          input.businessName,
      }),

      getWebsiteKeywordContext(
        input.websiteId
      ).catch(
        () => null
      ),
    ]);

  const strategy =
    finalPlan.strategy;

  if (
    input.requiredPrimaryKeyword
  ) {
    const requiredPrimaryKeyword =
      input.requiredPrimaryKeyword
        .trim()
        .toLowerCase()
        .replace(
          /\s+/g,
          " "
        );

    const plannedPrimaryKeyword =
      strategy.primary.keyword
        .trim()
        .toLowerCase()
        .replace(
          /\s+/g,
          " "
        );

    if (
      requiredPrimaryKeyword !==
      plannedPrimaryKeyword
    ) {
      throw new Error(
        `Content plan primary keyword "${strategy.primary.keyword}" does not match required Outcome Action keyword "${input.requiredPrimaryKeyword}".`
      );
    }
  }

  const factRegistry =
    await getBusinessFactRegistryForWebsite(
      input.websiteId
    );

  const relatedKeywords:
    ContentBriefInput["relatedKeywords"] =
      [
        strategy.primary,
        ...strategy.secondary,
        ...strategy.supporting,
      ]
        .slice(0, 15)
        .map(
          (keyword) => ({
            keyword:
              keyword.keyword,

            searchVolume:
              keyword.searchVolume,

            cpc:
              keyword.cpc,

            keywordDifficulty:
              keyword.difficulty,
          })
        );

  const briefInput:
    ContentBriefInput = {
      topic:
        input.topic,

      reason:
        input.reason,

      recommendation:
        [
          input.recommendation,
          strategyPrompt(
            strategy
          ),

          finalPlanPrompt(
            finalPlan
          ),

          businessFactPrompt(
            factRegistry
          ),
        ].join(
          "\n\n"
        ),

      businessName:
        input.businessName,

      websiteUrl:
        input.websiteUrl,

      topKeywords:
        context?.topKeywords,

      relatedKeywords,

      strategy,
    };

  const generated =
    await generator.generateBrief(
      briefInput
    );

  const outline =
    normalizeOutline(
      generated.outline,
      strategy
    );

  const createdBrief =
    await prisma.contentBrief.create({
      data: {
        websiteId:
          input.websiteId,

        opportunityId:
          input.opportunityId,

        outcomeActionId:
          input.outcomeActionId,

        topic:
          input.topic,

        searchIntent:
          strategy.searchIntent,

        primaryKeyword:
          strategy.primary
            .keyword,

        secondaryKeywords:
          strategy.secondary.map(
            (item) =>
              item.keyword
          ),

        outline:
          outline as unknown as
            Prisma.InputJsonValue,

        status:
          "READY",

        generatedBy:
          generator.modelName,
      },
    });

  try {
    await createContentEvidenceSnapshot({
      briefId:
        createdBrief.id,

      websiteId:
        input.websiteId,

      topic:
        input.topic,

      primaryKeyword:
        strategy.primary.keyword,

      searchIntent:
        strategy.searchIntent,

      plan:
        finalPlan,

      businessFacts:
        factRegistry,

      keywordContext:
        context,

      generatorModel:
        generator.modelName,
    });
  } catch (error) {
    await prisma.contentBrief.delete({
      where: {
        id:
          createdBrief.id,
      },
    }).catch(
      () => undefined
    );

    throw error;
  }

  return createdBrief;
}


export async function generateArticleFromBrief(
  generator:
    ContentGenerator,
  briefId:
    string
) {
  const brief =
    await prisma.contentBrief.findUnique({
      where: {
        id:
          briefId,
      },

      include: {
        website: {
          include: {
            business:
              true,
          },
        },
      },
    });

  if (!brief) {
    throw new Error(
      "Content brief not found"
    );
  }

  const factRegistry =
    await getBusinessFactRegistryForBrief({
      briefId:
        brief.id,

      websiteId:
        brief.websiteId,
    });


  const pendingArticle =
    await prisma.contentArticle.create({
      data: {
        briefId:
          brief.id,

        title:
          "",

        metaDescription:
          "",

        h1:
          "",

        bodyMarkdown:
          "",

        status:
          "GENERATING",

        generatedBy:
          generator.modelName,
      },
    });

  try {
    const generated =
      await generator.generateArticle({
        topic:
          brief.topic,

        reason:
          "Create the strongest single page for this exact search intent without cannibalizing closely related content.",

        recommendation: [
          `Primary keyword: ${brief.primaryKeyword}.`,
          `Search intent: ${brief.searchIntent}.`,
          "Exactly one H1 exists outside bodyMarkdown.",
          "Do not place an H1 inside bodyMarkdown.",
          "Use H2 for major intent sections.",
          "Use H3 only underneath a relevant H2.",
          "Answer the core question early.",
          "Use keywords naturally.",
          "Do not invent statistics, citations, claims, or sources.",
          businessFactPrompt(
            factRegistry
          ),
          "Write for humans first while making facts and answers easy for search engines and retrieval systems to extract.",
        ].join(
          "\n"
        ),

        businessName:
          brief.website
            .business
            .name,

        websiteUrl:
          brief.website.url,

        searchIntent:
          brief.searchIntent,

        primaryKeyword:
          brief.primaryKeyword,

        secondaryKeywords:
          brief.secondaryKeywords,

        outline:
          brief.outline as {
            heading: string;
            level: 2 | 3;
            summary: string;
          }[],
      });

    const repaired =
      repairGeneratedArticle(
        generated
      );

    const intelligence =
      await analyzeStoredContentPlan({
        briefId:
          brief.id,

        title:
          repaired.title,

        metaDescription:
          repaired.metaDescription,

        h1:
          repaired.h1,

        bodyMarkdown:
          repaired.bodyMarkdown,

        primaryKeyword:
          brief.primaryKeyword,

        secondaryKeywords:
          brief.secondaryKeywords,
      });

    logContentIntelligence(
      brief.id,
      intelligence
    );

    const audit =
      auditArticle({
        article:
          repaired,

        primaryKeyword:
          brief.primaryKeyword,
      });

    console.info(
      "[content quality]",
      {
        briefId:
          brief.id,

        score:
          audit.score,

        words:
          audit.wordCount,

        h2:
          audit.h2Count,

        h3:
          audit.h3Count,

        primaryKeywordDensityPct:
          audit.primaryKeywordDensityPct,

        issues:
          audit.issues,
      }
    );

    const gate =
      evaluateContentGate({
        article:
          repaired,

        primaryKeyword:
          brief.primaryKeyword,

        audit,

        registry:
          factRegistry,
      });

    console.info(
      "[content gate]",
      {
        briefId:
          brief.id,

        pass:
          gate.pass,

        blockingIssues:
          gate.blockingIssues,

        warnings:
          gate.warnings,

        topicAlignment:
          gate.topicAlignment,

        claims:
          gate.claimFindings.map(
            (finding) => ({
              code:
                finding.code,

              sentence:
                finding.sentence,
            })
          ),
      }
    );

    if (
      !gate.pass
    ) {
      return prisma.contentArticle.update({
        where: {
          id:
            pendingArticle.id,
        },

        data: {
          title:
            repaired.title,

          metaDescription:
            repaired.metaDescription,

          h1:
            repaired.h1,

          bodyMarkdown:
            repaired.bodyMarkdown,

          status:
            "REJECTED",

          publishError:
            formatContentGateFailure(
              gate
            ),
        },
      });
    }


    return prisma.contentArticle.update({
      where: {
        id:
          pendingArticle.id,
      },

      data: {
        title:
          repaired.title,

        metaDescription:
          repaired.metaDescription,

        h1:
          repaired.h1,

        bodyMarkdown:
          repaired.bodyMarkdown,

        status:
          "DRAFT",

        publishError:
          null,
      },
    });
  } catch (error) {
    const rawMessage =
      error instanceof Error
        ? error.message
        : "";

    const transientProviderFailure =
      /Gemini API error (429|500|502|503|504)\b/.test(
        rawMessage
      ) ||
      /AbortError|aborted|timeout/i.test(
        rawMessage
      );

    if (transientProviderFailure) {
      console.warn(
        "[content generation] temporary provider failure",
        {
          briefId:
            brief.id,

          articleId:
            pendingArticle.id,

          message:
            rawMessage.slice(
              0,
              240
            ),
        }
      );

      await prisma.contentArticle.delete({
        where: {
          id:
            pendingArticle.id,
        },
      }).catch(
        () => undefined
      );

      throw error;
    }

    const message =
      error instanceof
      ContentGenerationError
        ? error.message
        : "Article generation failed";

    return prisma.contentArticle.update({
      where: {
        id:
          pendingArticle.id,
      },

      data: {
        status:
          "REJECTED",

        publishError:
          message,
      },
    });
  }
}


export async function approveArticle(
  articleId:
    string
) {
  const article =
    await prisma.contentArticle.findUnique({
      where: {
        id:
          articleId,
      },

      include: {
        brief: {
          include: {
            website: {
              include: {
                business:
                  true,
              },
            },
          },
        },
      },
    });

  if (!article) {
    throw new Error(
      "Article not found"
    );
  }

  if (
    article.status !==
      "DRAFT" &&
    article.status !==
      "IN_REVIEW"
  ) {
    throw new Error(
      `Cannot approve article with status ${article.status}`
    );
  }

  const intelligence =
    await analyzeStoredContentPlan({
      briefId:
        article.briefId,

      title:
        article.title,

      metaDescription:
        article.metaDescription,

      h1:
        article.h1,

      bodyMarkdown:
        article.bodyMarkdown,

      primaryKeyword:
        article.brief
          .primaryKeyword,

      secondaryKeywords:
        article.brief
          .secondaryKeywords,
    });

  logContentIntelligence(
    article.briefId,
    intelligence
  );

  const audit =
    auditArticle({
      article: {
        title:
          article.title,

        metaDescription:
          article.metaDescription,

        h1:
          article.h1,

        bodyMarkdown:
          article.bodyMarkdown,
      },

      primaryKeyword:
        article.brief
          .primaryKeyword,
    });

  const registry =
    await getBusinessFactRegistryForWebsite(
      article.brief.websiteId
    );

  const gate =
    evaluateContentGate({
      article: {
        title:
          article.title,

        metaDescription:
          article.metaDescription,

        h1:
          article.h1,

        bodyMarkdown:
          article.bodyMarkdown,
      },

      primaryKeyword:
        article.brief
          .primaryKeyword,

      audit,

      registry,
    });

  assertContentGatePassed(
    gate
  );

  return prisma.contentArticle.update({
    where: {
      id:
        articleId,
    },

    data: {
      status:
        "APPROVED",

      publishError:
        null,
    },
  });
}


export async function publishArticle(
  provider:
    CMSProvider,
  articleId:
    string
) {
  const article =
    await prisma.contentArticle.findUnique({
      where: {
        id:
          articleId,
      },

      include: {
        brief: {
          include: {
            website: {
              include: {
                business:
                  true,
              },
            },
          },
        },
      },
    });

  if (!article) {
    throw new Error(
      "Article not found"
    );
  }

  if (
    article.status !==
    "APPROVED"
  ) {
    throw new Error(
      "Only approved articles can be published"
    );
  }

  const intelligence =
    await analyzeStoredContentPlan({
      briefId:
        article.briefId,

      title:
        article.title,

      metaDescription:
        article.metaDescription,

      h1:
        article.h1,

      bodyMarkdown:
        article.bodyMarkdown,

      primaryKeyword:
        article.brief
          .primaryKeyword,

      secondaryKeywords:
        article.brief
          .secondaryKeywords,
    });

  logContentIntelligence(
    article.briefId,
    intelligence
  );

  const audit =
    auditArticle({
      article: {
        title:
          article.title,

        metaDescription:
          article.metaDescription,

        h1:
          article.h1,

        bodyMarkdown:
          article.bodyMarkdown,
      },

      primaryKeyword:
        article.brief
          .primaryKeyword,
    });

  const registry =
    await getBusinessFactRegistryForWebsite(
      article.brief.websiteId
    );

  const gate =
    evaluateContentGate({
      article: {
        title:
          article.title,

        metaDescription:
          article.metaDescription,

        h1:
          article.h1,

        bodyMarkdown:
          article.bodyMarkdown,
      },

      primaryKeyword:
        article.brief
          .primaryKeyword,

      audit,

      registry,
    });

  assertContentGatePassed(
    gate
  );


  const result =
    await provider.publishContent(
      article.brief
        .websiteId,
      {
        title:
          article.title,

        metaDescription:
          article.metaDescription,

        h1:
          article.h1,

        bodyMarkdown:
          article.bodyMarkdown,
      }
    );

  return prisma.contentArticle.update({
    where: {
      id:
        articleId,
    },

    data: {
      status:
        result.status ===
        "SUCCESS"
          ? "PUBLISHED"
          : "PUBLISH_FAILED",

      publishedUrl:
        result.publishedUrl,

      publishedAt:
        result.status ===
        "SUCCESS"
          ? new Date()
          : null,

      publishError:
        result.errorMessage,
    },
  });
}
