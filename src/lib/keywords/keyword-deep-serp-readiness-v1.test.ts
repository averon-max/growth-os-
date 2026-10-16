import {describe,expect,it} from "vitest";
import {auditDeepSerpReadinessV1} from "./keyword-deep-serp-readiness-v1";
import type {SerpOpportunityV2} from "./keyword-intelligence-v2";

const base:SerpOpportunityV2={
  query:"what is credit monitoring",clusterId:"cl_a",
  organicResults:10,uniqueDomains:9,
  dominantPageType:"blog",pagesAnalyzed:7,features:["organic"],
};
describe("deep competitor research coverage",()=>{
  it("does not pretend three SERPs or unavailable competitor content is deep",()=>{
    const result=auditDeepSerpReadinessV1(base);
    expect(result.status).toBe("DEEP_COMPETITOR_INCOMPLETE");
    expect(result.blockers).toContain("DEEP_COMPETITOR_SNAPSHOT_MISSING");
    expect(result.verifiedFactualClaims).toBe(false);
    expect(result.canGuaranteeRankOne).toBe(false);
  });
  it("keeps honest gaps when the number-one page blocks a crawler",()=>{
    const result=auditDeepSerpReadinessV1({...base,competitiveResearch:{
      fetchedCompetitorPages:6,fetchFailures:4,
      observedQuestions:["What does credit monitoring do?"],
      aiOverviewPresent:false,
      commonSections:[{topic:"Cost",pages:3,coveragePct:50}],
      commonTerms:[],
      benchmark:{medianWordCount:1800,medianH2:5,medianH3:8},
      competitorPages:[{rank:1,domain:"a.com",url:"https://a.com",
        fetched:false,pageType:"blog",title:null,h1:null,
        h2:[],h3:[],wordCount:null,schemaTypes:[],tableCount:0,
        authorSignal:false,dateSignal:false,error:"BLOCKED"}],
    }});
    expect(result.blockers).toContain("TOP_ONE_PAGE_NOT_USABLE");
    expect(result.status).toBe("DEEP_COMPETITOR_INCOMPLETE");
  });
  it("reclassifies historic Cloudflare pages and 46-word shells without a new paid SERP",()=>{
    const pages=Array.from({length:8},(_,i)=>({
      rank:i+1,domain:"site"+i+".com",url:"https://site"+i+".com",
      fetched:true,pageType:"blog",title:"Credit monitoring guide",
      h1:"Credit monitoring guide",h2:["Monitoring basics"],h3:[],
      wordCount:1500,schemaTypes:[],tableCount:0,
      authorSignal:false,dateSignal:false,error:null,
    }));
    pages[5]={...pages[5]!,title:"Attention Required! | Cloudflare",
      h1:"Sorry, you have been blocked",wordCount:123};
    pages[6]={...pages[6]!,title:"Reddit",h1:"",wordCount:0};
    pages[7]={...pages[7]!,title:"",h1:"",wordCount:46};
    const result=auditDeepSerpReadinessV1({...base,competitiveResearch:{
      fetchedCompetitorPages:8,fetchFailures:0,observedQuestions:[],
      aiOverviewPresent:false,commonSections:[{
        topic:"How credit monitoring works",pages:3,coveragePct:38,
      }],
      commonTerms:[],benchmark:{
        medianWordCount:1500,medianH2:5,medianH3:2,
      },competitorPages:pages,
    }},"credit monitoring");
    expect(result.fetchedCompetitorPages).toBe(5);
    expect(result.falselyFetchedOrUnusablePages).toHaveLength(3);
    expect(result.status).toBe("DEEP_COMPETITOR_OBSERVED");
  });

  it("flags wrong-task SERP even when eight pages appear fetched",()=>{
    const pages=Array.from({length:8},(_,i)=>({
      rank:i+1,domain:"site"+i+".com",url:"https://site"+i+".com",
      fetched:true,pageType:"blog",
      title:i<5?"Is identity theft insurance worth it?":
        "Should you use credit monitoring?",
      h1:i<5?"Identity theft protection":"Credit monitoring",
      h2:["Benefits and limitations"],h3:[],wordCount:800,
      schemaTypes:[],tableCount:0,authorSignal:true,dateSignal:true,error:null,
    }));
    const result=auditDeepSerpReadinessV1({...base,competitiveResearch:{
      fetchedCompetitorPages:8,fetchFailures:0,observedQuestions:[],
      aiOverviewPresent:false,commonSections:[{
        topic:"Benefits and limitations",pages:5,coveragePct:63,
      }],
      commonTerms:[],benchmark:{
        medianWordCount:900,medianH2:3,medianH3:1,
      },competitorPages:pages,
    }},"credit monitoring");
    expect(result.status).toBe("DEEP_COMPETITOR_INCOMPLETE");
    expect(result.blockers).toContain("TOP_ONE_PAGE_DIFFERENT_TASK");
    expect(result.blockers).toContain("SERP_DOMINATED_BY_DIFFERENT_TOPIC");
  });

  it("reports deep OBSERVATION only, never article SEO-READY",()=>{
    const result=auditDeepSerpReadinessV1({...base,competitiveResearch:{
      fetchedCompetitorPages:7,fetchFailures:3,observedQuestions:[],
      aiOverviewPresent:false,
      commonSections:[{topic:"Limitations",pages:5,coveragePct:71}],
      commonTerms:[],
      benchmark:{medianWordCount:1950,medianH2:6,medianH3:10},
      competitorPages:Array.from({length:7},(_,i)=>({
        rank:i+1,domain:"example.org",url:"https://example.org/page-"+i,
        fetched:true,pageType:"blog",title:"Monitoring",h1:"Monitoring",
        h2:["How it works"],h3:[],wordCount:2400,
        schemaTypes:[],tableCount:0,authorSignal:true,dateSignal:false,
        error:null,
      })),
    }});
    expect(result.status).toBe("DEEP_COMPETITOR_OBSERVED");
    expect(result.publisherReady).toBe(false);
    expect(result.canGuaranteeRankOne).toBe(false);
    expect(result.competitorMedianH2).toBe(6);
  });
});