import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildArticleExecutionPlanV1,
} from "./article-execution-plan-v1";

import {
  buildProductionFinalArticleReadinessV1,
} from "./production-final-article-readiness-adapter-v1";

import {
  buildCompliantArticleBody,
} from "./article-readiness-test-body";

import {
  deriveBodyHeadingStructureV1,
  computeArticleStructureStatsV1,
} from "./article-structure-stats-v1";

import {
  extractArticleHeadings,
  countWords,
} from "./article-analyzer";

import {
  COMPREHENSIVE_INFORMATIONAL_TARGET_WORDS_V1,
  deriveSectionBudgetsForLengthContractV1,
  resolveArticleLengthContractV1,
} from "./article-length-contract-v1";


const INCIDENT_BODY = [
  "## What is credit monitoring?",
  "",
  "Credit monitoring watches your credit files for changes and sends alerts about new activity on your accounts.",
  "",
  "## What credit monitoring cannot do",
  "",
  "It does not prevent fraud on its own. It only tells you after something changed in the file.",
  "",
  "## Should you enable credit monitoring?",
  "",
  "That depends on how much you value early alerts compared with a credit freeze.",
].join("\n");


function incidentPlan(
  intent = "INFORMATIONAL",
  pageType = "GUIDE"
) {
  return buildArticleExecutionPlanV1({
    websiteId: "site",
    topic: "credit monitoring",
    primaryQuery: "what is credit monitoring",
    intent,
    pageType,
    riskClass: "STANDARD",
    pageAction: "CREATE",

    requiredTopics: [
      { id: "topic-1", label: "definition", priority: "MUST" },
      { id: "topic-2", label: "limits", priority: "MUST" },
    ],

    requiredQuestions: [
      { id: "question-1", label: "should you enable it", priority: "MUST" },
    ],

    sections: [
      {
        id: "section-1",
        heading: "What is credit monitoring?",
        level: 2,
        mission: "Define.",
        requiredTopicIds: ["topic-1"],
        state: "WRITABLE",
      },
      {
        id: "section-2",
        heading: "What credit monitoring cannot do",
        level: 2,
        mission: "Limits.",
        requiredTopicIds: ["topic-2"],
        state: "WRITABLE",
      },
      {
        id: "section-3",
        heading: "Should you enable credit monitoring?",
        level: 2,
        mission: "Decide.",
        requiredQuestionIds: ["question-1"],
        state: "WRITABLE",
      },
    ],
  });
}


function writerRunFor(
  plan: ReturnType<typeof incidentPlan>
) {
  return {
    finalCritics: { findings: [] },

    article: {
      sections:
        plan.sections.map(
          (section) => ({
            sectionId: section.id,
            heading: section.heading,
            referencedEvidenceIds: [],
          })
        ),
    },
  };
}


function readiness(
  plan: ReturnType<typeof incidentPlan>,
  body: string
) {
  return buildProductionFinalArticleReadinessV1({
    plan,
    writerRun: writerRunFor(plan),
    articleBodyMarkdown: body,
    contentGatePass: true,
    publicationPolicyPass: true,
    serpReplay: { status: "PASS" },
    serpReplayWarning: null,
  });
}


describe(
  "CONTENT V1 closure regressions",
  () => {
    it(
      "short article length is surfaced as guidance rather than a hard rejection",
      () => {
        const result =
          readiness(
            incidentPlan(),
            INCIDENT_BODY
          );

        expect(result.status).toBe("WARN");

        expect(
          result.warnings.some(
            (blocker) =>
              blocker.startsWith(
                "FINAL_READINESS_LENGTH_DEFICIT:"
              )
          )
        ).toBe(true);
      }
    );

    it(
      "a complete comprehensive article inside 1800-2350 passes",
      () => {
        const plan = incidentPlan();

        const result =
          readiness(
            plan,
            buildCompliantArticleBody(plan)
          );

        expect(result.blockers).toEqual([]);
        expect(result.status).toBe("PASS");
      }
    );

    it(
      "surfaces excess length as guidance instead of a hard rejection",
      () => {
        const plan = incidentPlan();

        const result =
          readiness(
            plan,
            buildCompliantArticleBody(plan, 2600)
          );

        expect(
          result.warnings.some(
            (blocker) =>
              blocker.startsWith(
                "FINAL_READINESS_LENGTH_EXCESS:"
              )
          )
        ).toBe(true);
      }
    );

    it(
      "planned sections != generated headings => FAIL",
      () => {
        const plan = incidentPlan();

        const body =
          buildCompliantArticleBody(plan)
            .replace("## Should you enable credit monitoring?", "");

        const result =
          readiness(plan, body);

        expect(
          result.blockers.some(
            (blocker) =>
              blocker.startsWith(
                "FINAL_READINESS_H2_BELOW_PLAN:"
              )
          )
        ).toBe(true);
      }
    );

    it(
      "duplicate normalized headings fail",
      () => {
        const plan = incidentPlan();

        const body =
          `${buildCompliantArticleBody(plan)}\n\n## WHAT IS CREDIT MONITORING!\n\nmore`;

        const result =
          readiness(plan, body);

        expect(
          result.blockers.some(
            (blocker) =>
              blocker.startsWith(
                "FINAL_READINESS_DUPLICATE_NORMALIZED_HEADING:"
              )
          )
        ).toBe(true);
      }
    );

    it(
      "an extra H1 inside the body fails",
      () => {
        const plan = incidentPlan();

        const body =
          `# Second title\n\n${buildCompliantArticleBody(plan)}`;

        const result =
          readiness(plan, body);

        expect(
          result.blockers.some(
            (blocker) =>
              blocker.startsWith(
                "FINAL_READINESS_BODY_H1_PRESENT:"
              )
          )
        ).toBe(true);
      }
    );

    it(
      "an explicitly different article type is not silently held to the comprehensive range",
      () => {
        const plan =
          incidentPlan(
            "HOW_TO",
            "HOW_TO"
          );

        const result =
          readiness(
            plan,
            buildCompliantArticleBody(plan, 500)
          );

        expect(
          result.blockers.some(
            (blocker) =>
              blocker.includes("LENGTH")
          )
        ).toBe(false);
      }
    );
  }
);


describe(
  "ARTICLE_LENGTH_CONTRACT_V1",
  () => {
    it(
      "classifies only informational long-form pages as comprehensive",
      () => {
        expect(
          resolveArticleLengthContractV1({
            intent: "informational",
            pageType: "GUIDE",
          }).targetWords
        ).toEqual(
          COMPREHENSIVE_INFORMATIONAL_TARGET_WORDS_V1
        );

        expect(
          resolveArticleLengthContractV1({
            intent: "INFORMATIONAL",
            pageType: "FAQ",
          }).targetWords
        ).toBeNull();

        expect(
          resolveArticleLengthContractV1({
            intent: "COMMERCIAL_INVESTIGATION",
            pageType: "COMPARISON",
          }).targetWords
        ).toBeNull();

        expect(
          resolveArticleLengthContractV1({}).targetWords
        ).toBeNull();
      }
    );

    it(
      "redistributes budgets over the SAME sections into the range without adding sections",
      () => {
        const plan = incidentPlan();

        const budgets =
          deriveSectionBudgetsForLengthContractV1(
            plan.sections,
            resolveArticleLengthContractV1(plan)
          );

        expect(budgets.size).toBe(
          plan.sections.length
        );

        const preferred =
          [...budgets.values()].reduce(
            (sum, budget) =>
              sum + budget.preferred,
            0
          );

        expect(preferred).toBeGreaterThanOrEqual(
          COMPREHENSIVE_INFORMATIONAL_TARGET_WORDS_V1.min
        );

        expect(preferred).toBeLessThanOrEqual(
          COMPREHENSIVE_INFORMATIONAL_TARGET_WORDS_V1.max
        );
      }
    );

    it(
      "does nothing for other article types",
      () => {
        const plan =
          incidentPlan("HOW_TO", "HOW_TO");

        expect(
          deriveSectionBudgetsForLengthContractV1(
            plan.sections,
            resolveArticleLengthContractV1(plan)
          ).size
        ).toBe(0);
      }
    );
  }
);


describe(
  "ARTICLE_STRUCTURE_CANONICAL_V1 (renderer/analyzer consistency)",
  () => {
    it(
      "REGRESSION: Article Intelligence sees the same 3 H2 the renderer sees",
      () => {
        const rendererH2 =
          INCIDENT_BODY
            .split("\n")
            .filter(
              (line) =>
                /^##\s+/.test(line)
            ).length;

        expect(rendererH2).toBe(3);

        const stats =
          computeArticleStructureStatsV1({
            title: "What Is Credit Monitoring? How It Works and Its Limits",
            h1: "What Is Credit Monitoring?",
            bodyMarkdown: INCIDENT_BODY,
            keywords: [
              "what is credit monitoring",
              "free credit monitoring",
              "3 bureau credit monitoring",
            ],
          });

        expect(stats.h1).toBe(1);
        expect(stats.h2).toBe(3);
        expect(stats.h3).toBe(0);
        expect(stats.words).toBe(
          countWords(INCIDENT_BODY)
        );

        expect(
          deriveBodyHeadingStructureV1(
            INCIDENT_BODY
          ).h2Count
        ).toBe(stats.h2);

        expect(
          extractArticleHeadings(
            INCIDENT_BODY
          ).filter(
            (heading) =>
              heading.level === 2
          ).length
        ).toBe(stats.h2);
      }
    );

    it(
      "the old private regex could never match (documents the root cause)",
      () => {
        const prefix = "##";

        const broken =
          new RegExp(
            `^${prefix}\\\\s+`,
            "gmu"
          );

        expect(
          INCIDENT_BODY.match(broken)
        ).toBeNull();
      }
    );
  }
);
