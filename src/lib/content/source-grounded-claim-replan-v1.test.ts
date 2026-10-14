import {describe,expect,it} from "vitest";
import {
  buildSourceGroundedReplanPacketV1,
  validateSourceGroundedClaimReplanV1,
} from "./source-grounded-claim-replan-v1";
import type {EvidenceSource}
  from "./evidence-graph";
import type {ResearchExpansionClaimV1}
  from "./existing-article-research-plan-v1";
const src=(id:string,sourceType:EvidenceSource["sourceType"],
  tier:EvidenceSource["authorityTier"]):EvidenceSource=>({
  id,url:"https://"+id+".example.org/article",publisher:id,
  sourceType,authorityTier:tier,retrievedAt:new Date("2026-10-12"),
});
const claims:ResearchExpansionClaimV1[]=[{
  id:"c1",sectionId:"s1",
  text:"A monitoring service reviews continuous device data from banks.",
  risk:"LOW",category:"FACT",
},{
  id:"c2",sectionId:"s2",
  text:"After credit monitoring alerts users check an unfamiliar account.",
  risk:"LOW",category:"FACT",
}];
const quote1="Credit monitoring services usually alert you of changes "+
  "to your accounts by email, text message, or phone.";
const quote2="Tell the credit reporting company that you are disputing "+
  "an item in your credit report.";
function packet(){
  return buildSourceGroundedReplanPacketV1({
    sections:[{id:"s1",heading:"How does credit monitoring work?",
      mission:"Explain notification mechanisms"},
    {id:"s2",heading:"What to do after an unexpected credit alert?",
      mission:"Explain responding to an inaccurate record"}],
    claims,candidates:[{
      claimId:"c1",sourceId:"ftc",sourceUrl:src("ftc","PRIMARY_GOVERNMENT","A").url,
      excerpt:quote1,coverage:0.45,
    },{
      claimId:"c2",sourceId:"ftc",sourceUrl:src("ftc","PRIMARY_GOVERNMENT","A").url,
      excerpt:quote2,coverage:0.45,
    },{
      claimId:"c2",sourceId:"low",sourceUrl:src("low","UGC","F").url,
      excerpt:"Credit monitoring sometimes causes alert notifications.",coverage:0.8,
    }],
    sources:[src("ftc","PRIMARY_GOVERNMENT","A"),src("low","UGC","F")],
  });
}
describe("source-first grounded claim restatement",()=>{
  it("preserves section/claim identities and only offers real source excerpts",()=>{
    const result=packet();
    expect(result).toHaveLength(2);
    expect(result.map(section=>section.quotes.length)).toEqual([1,1]);
    expect(result[0].quotes[0].sourceId).toBe("ftc");
    expect(result[1].quotes[0].sourceId).toBe("ftc");
    expect(result[1].quotes.some(q=>q.sourceId==="low")).toBe(false);
  });
  it("only accepts a quote-matching atomic restatement, never creates a new claim id",()=>{
    const result=packet();
    const replacements=[{
      claimId:"c1",quoteId:result[0].quotes[0].quoteId,text:
        "Credit monitoring services usually alert you of changes to your accounts by email, text message, or phone.",
    },{
      claimId:"c2",quoteId:result[1].quotes[0].quoteId,text:
        "Tell the credit reporting company that you are disputing an item in your credit report.",
    }];
    const output=validateSourceGroundedClaimReplanV1({
      packet:result,replacements,originalClaims:claims,
    });
    expect(output).toHaveLength(2);
    expect(output.map(c=>c.id)).toEqual(["c1","c2"]);
    expect(output[0].text).toBe(replacements[0].text);
  });
  it("recovers TWO different evidence-backed facts within one existing H2",()=>{
    const additional={
      id:"c1b",sectionId:"s1",category:"FACT" as const,
      risk:"LOW" as const,
      text:"Credit monitoring sends an alert only when lenders call users.",
    };
    const secondQuote="While credit monitoring helps identify changes, it does not "+
      "stop someone from attempting to open an account.";
    const secClaims=[claims[0],additional,claims[1]];
    const packet=buildSourceGroundedReplanPacketV1({
      sections:[
        {id:"s1",heading:"Credit monitoring details",mission:"Explain scope and limits"},
        {id:"s2",heading:"Respond to alerts",mission:"What to do after an alert"},
      ],
      claims:secClaims,
      candidates:[
        {claimId:"c1",sourceId:"ftc",sourceUrl:src("ftc","PRIMARY_GOVERNMENT","A").url,
          excerpt:quote1,coverage:0.45},
        {claimId:"c1b",sourceId:"cfpb",sourceUrl:src("cfpb","PRIMARY_GOVERNMENT","A").url,
          excerpt:secondQuote,coverage:0.48},
        {claimId:"c2",sourceId:"ftc",sourceUrl:src("ftc","PRIMARY_GOVERNMENT","A").url,
          excerpt:quote2,coverage:0.45},
      ],
      sources:[
        src("ftc","PRIMARY_GOVERNMENT","A"),
        src("cfpb","PRIMARY_GOVERNMENT","A"),
      ],
    });
    expect(new Set(packet[0].quotes.map(q=>q.claimId)))
      .toEqual(new Set(["c1","c1b"]));
    const first=packet[0].quotes.find(q=>q.claimId==="c1")!;
    const second=packet[0].quotes.find(q=>q.claimId==="c1b")!;
    const result=validateSourceGroundedClaimReplanV1({
      packet,originalClaims:secClaims,replacements:[
        {claimId:"c1",quoteId:first.quoteId,text:quote1},
        {claimId:"c1b",quoteId:second.quoteId,text:secondQuote},
        {claimId:"c2",quoteId:packet[1].quotes[0].quoteId,text:quote2},
      ],
    });
    expect(result.map(c=>c.id)).toEqual(["c1","c1b","c2"]);
    expect(result.find(c=>c.id==="c1b")?.text).toBe(secondQuote);
  });
  it("does not allow the same claim/quote to masquerade as two facts",()=>{
    const result=packet();
    expect(()=>validateSourceGroundedClaimReplanV1({
      packet:result,originalClaims:claims,replacements:[
        {claimId:"c1",quoteId:result[0].quotes[0].quoteId,text:quote1},
        {claimId:"c1",quoteId:result[0].quotes[0].quoteId,text:quote1},
        {claimId:"c2",quoteId:result[1].quotes[0].quoteId,text:quote2},
      ],
    })).toThrow("UNAUTHORIZED_CLAIM_OR_QUOTE");
  });

  it("does not accept invented or cross-section quote ownership",()=>{
    const result=packet();
    expect(()=>validateSourceGroundedClaimReplanV1({
      packet:result,originalClaims:claims,
      replacements:[{
        claimId:"c1",quoteId:result[1].quotes[0].quoteId,text:quote2,
      },{
        claimId:"c2",quoteId:result[0].quotes[0].quoteId,text:quote1,
      }],
    })).toThrow("UNAUTHORIZED_CLAIM_OR_QUOTE");
  });
  it("does not relax literal verified excerpt matching for a topic-adjacent claim",()=>{
    const result=packet();
    expect(()=>validateSourceGroundedClaimReplanV1({
      packet:result,originalClaims:claims,
      replacements:[{
        claimId:"c1",quoteId:result[0].quotes[0].quoteId,
        text:"Credit monitoring prevents unauthorized account access before it occurs.",
      },{
        claimId:"c2",quoteId:result[1].quotes[0].quoteId,text:quote2,
      }],
    })).toThrow("PROPOSED_TEXT_NOT_STRICTLY_SUPPORTED_BY_EXCERPT");
  });
  it("requires a proven source for every targeted section",()=>{
    const result=packet();
    expect(()=>validateSourceGroundedClaimReplanV1({
      packet:result,originalClaims:claims,replacements:[],
    })).toThrow("REPLACEMENT_SECTION_COVERAGE");
  });
});
