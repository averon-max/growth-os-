import {
  loadEnvConfig,
} from "@next/env";

loadEnvConfig(
  "/Users/user/growth-os"
);

const WEBSITE_ID =
  "cmtjl7vdm00010eqlnt1xbkhd";

function countWords(
  value:
    string
): number {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function headings(
  body:
    string
): string[] {
  return body
    .split("\n")
    .filter(
      (line) =>
        /^#{2,3}\s+/.test(
          line.trim()
        )
    )
    .map(
      (line) =>
        line.trim()
    );
}

function normalize(
  value:
    string
): string {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9\s]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function containsPhrase(
  value:
    string,
  phrase:
    string
): boolean {
  return normalize(
    value
  ).includes(
    normalize(
      phrase
    )
  );
}

function countPhrase(
  value:
    string,
  phrase:
    string
): number {
  const source =
    normalize(
      value
    );

  const needle =
    normalize(
      phrase
    );

  if (
    !needle
  ) {
    return 0;
  }

  return source
    .split(
      needle
    )
    .length -
    1;
}

async function main() {
  const {
    prisma,
  } = await import(
    "/Users/user/growth-os/src/lib/prisma"
  );

  const {
    auditArticle,
  } = await import(
    "/Users/user/growth-os/src/lib/content/content-quality"
  );

  const {
    evaluateContentGate,
  } = await import(
    "/Users/user/growth-os/src/lib/content/content-gate"
  );

  const {
    analyzeStoredContentPlan,
  } = await import(
    "/Users/user/growth-os/src/lib/content/content-plan-analysis"
  );

  const {
    getBusinessFactRegistryForWebsite,
  } = await import(
    "/Users/user/growth-os/src/lib/content/business-fact-repository"
  );

  try {
    const currentRegistry =
      await getBusinessFactRegistryForWebsite(
        WEBSITE_ID
      );

    const articles =
      await prisma.contentArticle.findMany({
        where: {
          brief: {
            websiteId:
              WEBSITE_ID,
          },
        },

        include: {
          brief: {
            include: {
              evidenceSnapshot:
                true,
            },
          },
        },

        orderBy: {
          id:
            "asc",
        },
      });

    console.log(
      `TOTAL_ARTICLES=${articles.length}`
    );

    console.log();

    for (
      const [
        index,
        article,
      ] of articles.entries()
    ) {
      const generated = {
        title:
          article.title,

        metaDescription:
          article.metaDescription,

        h1:
          article.h1,

        bodyMarkdown:
          article.bodyMarkdown,
      };

      const snapshot =
        article
          .brief
          .evidenceSnapshot;

      const rawPlan =
        snapshot?.plan;

      const plan =
        rawPlan &&
        typeof rawPlan ===
          "object" &&
        !Array.isArray(
          rawPlan
        )
          ? rawPlan as Record<
              string,
              unknown
            >
          : null;

      const blueprintRaw =
        plan?.[
          "searchBlueprintShadow"
        ];

      const blueprint =
        blueprintRaw &&
        typeof blueprintRaw ===
          "object" &&
        !Array.isArray(
          blueprintRaw
        )
          ? blueprintRaw as Record<
              string,
              any
            >
          : null;

      const snapshotFactsRaw =
        snapshot
          ?.businessFacts;

      const registry =
        snapshotFactsRaw &&
        typeof snapshotFactsRaw ===
          "object" &&
        !Array.isArray(
          snapshotFactsRaw
        )
          ? snapshotFactsRaw as
              typeof currentRegistry
          : currentRegistry;

      const audit =
        auditArticle({
          article:
            generated,

          primaryKeyword:
            article
              .brief
              .primaryKeyword,
        });

      const gate =
        evaluateContentGate({
          article:
            generated,

          primaryKeyword:
            article
              .brief
              .primaryKeyword,

          audit,

          registry,
        });

      let intelligence:
        Awaited<
          ReturnType<
            typeof analyzeStoredContentPlan
          >
        > |
        null =
          null;

      let intelligenceError:
        string |
        null =
          null;

      if (
        snapshot
      ) {
        try {
          intelligence =
            await analyzeStoredContentPlan({
              briefId:
                article
                  .brief
                  .id,

              title:
                article.title,

              metaDescription:
                article
                  .metaDescription,

              h1:
                article.h1,

              bodyMarkdown:
                article
                  .bodyMarkdown,

              primaryKeyword:
                article
                  .brief
                  .primaryKeyword,

              secondaryKeywords:
                article
                  .brief
                  .secondaryKeywords,
            });
        } catch (
          error
        ) {
          intelligenceError =
            error instanceof
              Error
              ? error.message
              : String(
                  error
                );
        }
      }

      const body =
        article
          .bodyMarkdown;

      const primary =
        article
          .brief
          .primaryKeyword;

      const firstParagraph =
        body
          .split(
            /\n\s*\n/
          )
          .map(
            (part) =>
              part.trim()
          )
          .find(
            (part) =>
              part &&
              !part.startsWith(
                "#"
              )
          ) ??
        "";

      const allText =
        [
          article.title,
          article.h1,
          body,
        ].join(
          "\n"
        );

      const titleChars =
        article
          .title
          .length;

      const metaChars =
        article
          .metaDescription
          .length;

      const h1Chars =
        article
          .h1
          .length;

      const structuralFlags: string[] =
        [];

      if (
        /^#\s+/m.test(
          body
        )
      ) {
        structuralFlags.push(
          "BODY_CONTAINS_H1"
        );
      }

      if (
        !containsPhrase(
          article.title,
          primary
        )
      ) {
        structuralFlags.push(
          "PRIMARY_NOT_EXACT_IN_TITLE"
        );
      }

      if (
        !containsPhrase(
          article.h1,
          primary
        )
      ) {
        structuralFlags.push(
          "PRIMARY_NOT_EXACT_IN_H1"
        );
      }

      if (
        !containsPhrase(
          body,
          primary
        )
      ) {
        structuralFlags.push(
          "PRIMARY_NOT_EXACT_IN_BODY"
        );
      }

      if (
        firstParagraph
          .length ===
        0
      ) {
        structuralFlags.push(
          "NO_DIRECT_ANSWER_PARAGRAPH"
        );
      }

      const blueprintReadiness =
        blueprint?.readiness ??
        null;

      const blueprintBlockers =
        blueprint
          ?.governance
          ?.blockers ??
        [];

      const blueprintReviews =
        blueprint
          ?.governance
          ?.reviews ??
        [];

      const requiredTopics =
        blueprint
          ?.coverage
          ?.requiredTopics ??
        [];

      const questions =
        blueprint
          ?.coverage
          ?.questionsToAnswer ??
        [];

      const infoGain =
        blueprint
          ?.informationGain
          ?.evidenceCandidates ??
        [];

      const requiredTopicCoverage =
        Array.isArray(
          requiredTopics
        )
          ? requiredTopics.map(
              (
                topic:
                  string
              ) => ({
                topic,

                exactLexicalMatch:
                  containsPhrase(
                    allText,
                    topic
                  ),
              })
            )
          : [];

      const questionCoverage =
        Array.isArray(
          questions
        )
          ? questions.map(
              (
                question:
                  string
              ) => ({
                question,

                exactLexicalMatch:
                  containsPhrase(
                    allText,
                    question
                  ),
              })
            )
          : [];

      console.log(
        "============================================================"
      );

      console.log(
        `ARTICLE_${index + 1}`
      );

      console.log(
        "============================================================"
      );

      console.log(
        JSON.stringify(
          {
            identity: {
              id:
                article.id,

              briefId:
                article
                  .briefId,

              status:
                article.status,

              topic:
                article
                  .brief
                  .topic,

              primaryKeyword:
                primary,

              searchIntent:
                article
                  .brief
                  .searchIntent,

              generatedBy:
                article
                  .generatedBy,
            },

            provenance: {
              plannerVersion:
                snapshot
                  ?.plannerVersion ??
                null,

              gateVersion:
                snapshot
                  ?.gateVersion ??
                null,

              generatorModel:
                snapshot
                  ?.generatorModel ??
                null,

              hasSearchBlueprint:
                Boolean(
                  blueprint
                ),

              blueprintReadiness,

              blueprintBlockers,

              blueprintReviews,

              pageAction:
                blueprint
                  ?.decision
                  ?.action ??
                null,
            },

            metadata: {
              title:
                article.title,

              titleChars,

              h1:
                article.h1,

              h1Chars,

              metaDescription:
                article
                  .metaDescription,

              metaChars,
            },

            structure: {
              words:
                countWords(
                  body
                ),

              headings:
                headings(
                  body
                ),

              bodyContainsH1:
                /^#\s+/m.test(
                  body
                ),

              structuralFlags,
            },

            keywordUse: {
              primary,

              occurrencesAcrossTitleH1Body:
                countPhrase(
                  allText,
                  primary
                ),

              exactInTitle:
                containsPhrase(
                  article.title,
                  primary
                ),

              exactInH1:
                containsPhrase(
                  article.h1,
                  primary
                ),

              exactInBody:
                containsPhrase(
                  body,
                  primary
                ),
            },

            directAnswer: {
              firstParagraphWords:
                countWords(
                  firstParagraph
                ),

              firstParagraph,
            },

            deterministicQuality: {
              score:
                audit.score,

              wordCount:
                audit.wordCount,

              h2Count:
                audit.h2Count,

              h3Count:
                audit.h3Count,

              primaryKeywordDensityPct:
                audit
                  .primaryKeywordDensityPct,

              issues:
                audit.issues,
            },

            contentGate: {
              pass:
                gate.pass,

              blockingIssues:
                gate
                  .blockingIssues,

              warnings:
                gate.warnings,

              topicAlignment:
                gate
                  .topicAlignment,

              claimFindings:
                gate
                  .claimFindings,
            },

            blueprintCoverage: {
              requiredTopics:
                requiredTopicCoverage,

              questions:
                questionCoverage,

              informationGainCandidates:
                infoGain,
            },

            intelligence:
              intelligence,

            intelligenceError,
          },
          null,
          2
        )
      );

      if (
        article.status ===
          "DRAFT" &&
        blueprint
      ) {
        console.log();
        console.log(
          "---------------- FULL ARTICLE ----------------"
        );

        console.log();
        console.log(
          `TITLE: ${article.title}`
        );

        console.log();
        console.log(
          `META: ${article.metaDescription}`
        );

        console.log();
        console.log(
          `H1: ${article.h1}`
        );

        console.log();
        console.log(
          article.bodyMarkdown
        );

        console.log();
        console.log(
          "-------------- END FULL ARTICLE --------------"
        );
      }

      console.log();
    }

    const currentArticles =
      articles.filter(
        (
          article
        ) => {
          const plan =
            article
              .brief
              .evidenceSnapshot
              ?.plan;

          return Boolean(
            plan &&
            typeof plan ===
              "object" &&
            !Array.isArray(
              plan
            ) &&
            (
              plan as Record<
                string,
                unknown
              >
            )[
              "searchBlueprintShadow"
            ]
          );
        }
      );

    const draftCurrent =
      currentArticles.filter(
        (
          article
        ) =>
          article.status ===
          "DRAFT"
      );

    console.log(
      "============================================================"
    );

    console.log(
      " DEEP AUDIT SUMMARY"
    );

    console.log(
      "============================================================"
    );

    console.log(
      `TOTAL=${articles.length}`
    );

    console.log(
      `BLUEPRINT_ARTICLES=${currentArticles.length}`
    );

    console.log(
      `BLUEPRINT_DRAFTS=${draftCurrent.length}`
    );

    console.log(
      `LEGACY_ARTICLES=${
        articles.length -
        currentArticles.length
      }`
    );

    console.log(
      `PUBLISHED=${
        articles.filter(
          (
            article
          ) =>
            article.status ===
            "PUBLISHED"
        ).length
      }`
    );

    console.log(
      "DATABASE_MUTATED=NO"
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(
  (
    error
  ) => {
    console.error(
      "DEEP_ARTICLE_AUDIT_ERROR",
      error
    );

    process.exitCode =
      1;
  }
);
