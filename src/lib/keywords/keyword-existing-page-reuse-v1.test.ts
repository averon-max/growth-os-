import {describe,expect,it} from "vitest";
import {auditPaidSerpReuseForExistingPageV1} from "./keyword-existing-page-reuse-v1";
import type {SerpOpportunityV2,KeywordCandidateV2} from "./keyword-intelligence-v2";

const existing={
  id:"article-review",websiteId:"website-one",
  title:"What Is Credit Monitoring? How It Works and Its Limits",
  status:"IN_REVIEW",primaryKeyword:"credit monitoring",
  bodyMarkdown:"## What is credit monitoring?\nExplanation\n"+
    "## How does credit monitoring work?\nText\n"+
    "## Does credit monitoring affect your credit score?\nNo",
};
function serp(query:string):SerpOpportunityV2 {
  return {
    clusterId:"cl_"+query,query,organicResults:9,
    uniqueDomains:8,dominantPageType:"ARTICLE",pagesAnalyzed:7,
    features:["organic"],
    competitiveResearch:{
      fetchedCompetitorPages:7,fetchFailures:2,
      observedQuestions:[],aiOverviewPresent:false,
      commonSections:[{
        topic:"How credit monitoring works",pages:5,coveragePct:70,
      }],
      commonTerms:[],
      benchmark:{medianWordCount:1700,medianH2:7,medianH3:8},
      competitorPages:Array.from({length:7},(_,i)=>({
        rank:i+1,url:"https://source"+i+".example/article",
        domain:"source"+i+".example",fetched:true,statusCode:200,
        pageType:"ARTICLE",title:"Credit monitoring guide",
        h1:"What is credit monitoring",h2:["How credit monitoring works"],
        h3:[],wordCount:1700,
        contentDepth:{
          version:"OBSERVED_COMPETITOR_DOCUMENT_DEPTH_V1" as const,
          extraction:"MAIN_ARTICLE" as const,
          wordCount:1700,
          sections:[{heading:"How credit monitoring works",level:2 as const,
            wordCount:630,exactQueryMentions:3}],
          headingQuestions:[],
          bodyTerms:[{term:"credit monitoring",occurrences:12}],
          keywordUsage:{query, title:1,h1:1,headings:1,mainContent:12},
        },
        schemaTypes:[],tableCount:1,
        authorSignal:true,dateSignal:true,error:null,
      })),
    },
  };
}
function candidate(keyword:string):KeywordCandidateV2{
  return {
    id:"kw_"+keyword,keyword,normalized:keyword,
    clusterId:"cl_"+keyword,intent:"INFORMATIONAL",
    searchVolume:40,keywordDifficulty:22,cpc:1.3,
    opportunityScore:73,source:"DATAFORSEO",sources:["DATAFORSEO"],
  } as KeywordCandidateV2;
}
const base={
  seed:"what is credit monitoring",market:"US",websiteId:"website-one",
  article:existing,
  candidateSnapshots:[
    candidate("what is credit monitoring"),
    candidate("does credit monitoring affect credit score"),
    candidate("what is credit monitoring services"),
    candidate("is kroll credit monitoring legit"),
  ],
  serpResults:[
    serp("what is credit monitoring"),
    serp("does credit monitoring affect credit score"),
    serp("what is credit monitoring services"),
    serp("is kroll credit monitoring legit"),
  ],
};
describe("reuse paid keyword SERPs for the SAME saved article",()=>{
  it("routes verified same-topic queries to existing page without approving or generating another",()=>{
    const r=auditPaidSerpReuseForExistingPageV1(base);
    expect(r.reuseCandidateCount).toBe(3);
    expect(r.existingArticleId).toBe("article-review");
    expect(r.route).toBe("REVIEW_SAME_ARTICLE_RESEARCH_ENRICHMENT");
    expect(r.newArticleAllowed).toBe(false);
    expect(r.publishAllowed).toBe(false);
    expect(r.reuseCandidates[0]).toMatchObject({
      query:"what is credit monitoring",
      existingArticleRoute:"EXISTING_PAGE_PRIMARY_TOPIC",
      signedQueryOwnershipVerified:false,
    });
    expect(r.reuseCandidates[1]).toMatchObject({
      query:"does credit monitoring affect credit score",
      existingArticleRoute:"EXISTING_H2_POSSIBLE_SUPPORT",
      closestExistingH2:"Does credit monitoring affect your credit score?",
      observedVolume:40,observedOrganicKD:22,
    });
    expect(r.rejectedOrUnverifiedSerps[0].query)
      .toBe("is kroll credit monitoring legit");
    expect(r.providerCalls).toBe(0);
  });
  it("cannot silently use a different site's article",()=>{
    expect(()=>auditPaidSerpReuseForExistingPageV1({
      ...base,article:{...existing,websiteId:"another-site"},
    })).toThrow("ARTICLE_RESEARCH_WEBSITE_MISMATCH");
  });
  it("cannot route unrelated article content or a semantically different page",()=>{
    expect(()=>auditPaidSerpReuseForExistingPageV1({
      ...base,article:{...existing,title:"Sports roundup",
        primaryKeyword:"sports results"},
    })).toThrow("ARTICLE_DOES_NOT_OWN_RESEARCH_TOPIC");
  });
  it("does not promote non-deep observations or challenge pages",()=>{
    const corrupted=serp("what is credit monitoring");
    corrupted.competitiveResearch!.competitorPages[0]!.title=
      "Attention Required! | Cloudflare";
    corrupted.competitiveResearch!.competitorPages[0]!.h1=
      "Sorry, you have been blocked";
    const r=auditPaidSerpReuseForExistingPageV1({
      ...base,serpResults:[corrupted],
    });
    expect(r.reuseCandidateCount).toBe(0);
    expect(r.rejectedOrUnverifiedSerps[0]?.deepBlockers)
      .toContain("TOP_ONE_PAGE_NOT_USABLE");
  });
});