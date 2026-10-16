import {describe,expect,it} from "vitest";
import {auditExistingArticleQuestionGapsV1}
  from "./article-question-gap-audit-v1";
import type {ArticleQuestionGroupForGapV1}
  from "./article-question-gap-audit-v1";

const draft=[
"# What Is Credit Monitoring?",
"## What is credit monitoring?",
"Credit monitoring is a service that tracks some changes to credit reports.",
"## How does credit monitoring work?",
"Monitoring services may send alerts. Notifications do not prevent fraud.",
"### What an alert can show",
"Read each alert and investigate suspicious account activity.",
"## What are its limitations?",
"Some credit monitoring does not prevent identity theft or other fraud.",
"## Does credit monitoring affect your credit score?",
"Monitoring your own reports typically involves a soft inquiry.",
"## What should you look for in a service?",
"Compare coverage options rather than assuming every alert is the same.",
"## What should you do after an alert?",
"Read alert details and check whether the new credit account is yours.",
].join("\n\n");
const group=(family:ArticleQuestionGroupForGapV1["family"],query:string,
  searchVolume:number|null):ArticleQuestionGroupForGapV1=>({
  family,highestObservedSearchVolume:searchVolume,
  questions:[{query,searchVolume,keywordDifficulty:null}],
});
describe("read-only article meaning/fact review is NOT keyword-count gate",()=>{
  it("suggests existing evidential H2 for a relational credit-score question",()=>{
    const r=auditExistingArticleQuestionGapsV1({
      bodyMarkdown:draft,
      groups:[group("CREDIT_SCORE_RELATION",
        "does credit monitoring affect credit score",40)],
      sources:[{sectionIndex:3,
        heading:"Does credit monitoring affect your credit score?",
        verifiedExternalSources:2,
        sourceUrls:["https://www.consumerfinance.gov/",
          "https://consumer.ftc.gov/"]}],
    });
    expect(r.h2Count).toBe(6);
    expect(r.groups[0].action).toBe("REVIEW_EXISTING_SECTION");
    expect(r.groups[0].candidateExistingSections[0]).toMatchObject({
      h2:"Does credit monitoring affect your credit score?",
      evidenceUrlCount:2,bodySignal:true,headingSignal:true,
      reviewStatus:"POSSIBLE_ANSWER_NEEDS_REVIEW",
    });
    expect(r.groups[0].candidateExistingSections[0].representativePassage)
      .toContain("soft inquiry");
    expect(r.noAutomaticCoverageClaims).toBe(true);
  });
  it("does NOT mark heading alone as complete answer; flags missing topic",()=>{
    const r=auditExistingArticleQuestionGapsV1({
      bodyMarkdown:draft,
      groups:[
        group("COST","how much does credit monitoring cost",50),
        group("FREEZE_AND_PROTECTION",
          "do i need monitoring if credit is frozen",10),
      ],
      sources:[],
    });
    expect(r.contentGapReviews).toBe(2);
    expect(r.groups.map(g=>g.action))
      .toEqual(["REVIEW_CONTENT_GAP","REVIEW_CONTENT_GAP"]);
  });
  it("does not fabricate source URLs where no verified claim evidence exists",()=>{
    const r=auditExistingArticleQuestionGapsV1({
      bodyMarkdown:draft,
      groups:[group("OPERATION_AND_ALERTS",
        "what is a credit monitoring alert",90)],
      sources:[],
    });
    expect(r.groups[0].candidateExistingSections[0].evidenceUrls).toEqual([]);
    expect(r.groups[0].nextAction).toContain("Read the passage");
  });
  it("retains real null demand and never adds variant volumes",()=>{
    const r=auditExistingArticleQuestionGapsV1({
      bodyMarkdown:draft,groups:[{
        family:"DEFINITION",highestObservedSearchVolume:480,
        questions:[
          {query:"what is credit monitoring",searchVolume:480,
            keywordDifficulty:19},
          {query:"what does credit monitoring mean",searchVolume:null,
            keywordDifficulty:null},
        ],
      }],sources:[],
    });
    expect(r.groups[0].highestObservedSearchVolume).toBe(480);
    expect(r.groups[0].queryCount).toBe(2);
    expect(r.groups[0].representativeQuestions[1].searchVolume).toBeNull();
  });
});
