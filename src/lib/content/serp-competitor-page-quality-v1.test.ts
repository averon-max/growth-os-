import {describe,expect,it} from "vitest";
import {assessSerpCompetitorPageQualityV1,isSubstantiveSerpHeadingV1} from "./serp-competitor-page-quality-v1";
const good={
  fetched:true,statusCode:200,
  title:"What is Credit Monitoring and How Does It Work?",
  h1:"How Credit Monitoring Works",
  wordCount:1800,h2:["How alerts work"],h3:["When to check"],error:null,
};
describe("real paid SERP competitor usability",()=>{
  it("rejects Cloudflare challenge as NOT a successfully fetched competitor",()=>{
    expect(assessSerpCompetitorPageQualityV1({
      ...good,title:"Attention Required! | Cloudflare",
      h1:"Sorry, you have been blocked",wordCount:123,
    }).usable).toBe(false);
  });
  it("rejects blank response, Reddit shell, status 403 or zero words",()=>{
    for(const page of [
      {...good,title:null,h1:null,wordCount:46},
      {...good,title:"Reddit",h1:null,wordCount:0},
      {...good,statusCode:403},
    ])expect(assessSerpCompetitorPageQualityV1(page).usable).toBe(false);
  });
  it("retains real readable government content even with no article headings",()=>{
    expect(assessSerpCompetitorPageQualityV1({
      ...good,title:"What is a credit monitoring service?",h1:null,
      h2:[],h3:[],wordCount:821,
    }).usable).toBe(true);
  });
  it("does not count footer/nav as recurring article subtopics",()=>{
    for(const label of ["Legal disclaimer","About us","Products","Page footer",
      "More Credit Resources","Search for your question","Company"])
      expect(isSubstantiveSerpHeadingV1(label)).toBe(false);
    for(const label of ["Cost","How does credit monitoring work?",
      "What should I do after a credit alert?"])
      expect(isSubstantiveSerpHeadingV1(label)).toBe(true);
  });
});