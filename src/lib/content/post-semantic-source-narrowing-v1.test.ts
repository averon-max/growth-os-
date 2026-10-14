import {describe,expect,it} from "vitest";
import {selectPostSemanticSourceNarrowingV1} from "./post-semantic-source-narrowing-v1";
import type {EvidenceSource,ClaimEvidence} from "./evidence-graph";
import type {ResearchExpansionClaimV1}
  from "./existing-article-research-plan-v1";

const ftc=(id:string):EvidenceSource=>({
  id,url:"https://consumer.ftc.gov/articles/"+id,publisher:"FTC",
  sourceType:"PRIMARY_GOVERNMENT",authorityTier:"A",
  retrievedAt:new Date("2026-10-14"),
});
const mkClaim=(id:string,sectionId:string,text:string):
  ResearchExpansionClaimV1=>({
  id,sectionId,text,risk:"LOW",category:"FACT",
});
const edge=(id:string,claimId:string,sourceId:string,excerpt:string):
  ClaimEvidence=>({
  id,claimId,sourceId,excerpt,kind:"VERIFIED_EXCERPT",
  relation:"SUPPORTS",
});
const report="Credit monitoring services regularly check credit reports "+
  "for changes and send notifications when new accounts appear.";
const comparison="Credit monitoring services usually charge a monthly or "+
  "annual fee, and the features of those services can vary.";
const correction="If you find an error on your credit report, you should "+
  "contact the credit reporting company and dispute the incorrect entry.";
const contents=[
  mkClaim("research-section-5-0","section-5",
    "Monitoring services may cover only one of the major credit bureaus."),
  mkClaim("research-section-5-2","section-5",
    "All credit monitoring products protect bank accounts beyond credit reports."),
  mkClaim("research-section-6-1","section-6",
    "The company that provided inaccurate information must investigate."),
  mkClaim("research-section-6-2","section-6",
    "Credit monitoring alerts automatically remove every fraudulent item."),
];
const sections=[
  {id:"section-5",heading:"How to choose credit monitoring services?",
    mission:"Compare the coverage, price and features of monitoring services"},
  {id:"section-6",heading:"What should you do after a credit monitoring alert?",
    mission:"Investigate unfamiliar credit report entries and dispute errors"},
];
describe("bounded post-semantic narrowing",()=>{
  it("rescues only unsupported claims using distinct literal government facts",()=>{
    const sources=[ftc("monitoring"),ftc("corrections")];
    const evidence=[
      edge("e1",contents[1].id,sources[0].id,comparison),
      edge("e2",contents[3].id,sources[1].id,correction),
      edge("e3",contents[1].id,sources[0].id,report),
    ];
    const found=selectPostSemanticSourceNarrowingV1({
      sections,claims:contents,sources,originalEvidence:evidence,
      demotedEvidenceIds:["e1","e2","e3"],
      approvedClaimIds:[contents[0].id,contents[2].id],
    });
    expect(found.map(x=>x.claimId))
      .toEqual([contents[1].id,contents[3].id]);
    expect(found.map(x=>x.text)).toEqual([comparison,correction]);
    expect(found.map(x=>x.sectionId)).toEqual(["section-5","section-6"]);
  });
  it("uses another official instruction for section-6 when the rejected excerpt is only headings",()=>{
    const source=ftc("disputing-errors-your-credit-reports");
    const headings="How monitoring works. What an alert means. "+
      "Common questions about the credit monitoring service.";
    const actionable="If you find an error on your credit report, "+
      "you should contact the credit reporting company to dispute "+
      "the incorrect item.";
    const found=selectPostSemanticSourceNarrowingV1({
      sections:[sections[1]],claims:[contents[2],contents[3]],
      sources:[source],
      originalEvidence:[edge("old",contents[3].id,source.id,headings)],
      demotedEvidenceIds:["old"],
      approvedClaimIds:[contents[2].id],
      officialAlternatives:[{
        sectionId:"section-6",sourceId:source.id,sourceUrl:source.url,
        text:actionable,
      }],
    });
    expect(found).toHaveLength(1);
    expect(found[0]).toEqual({
      claimId:contents[3].id,sectionId:"section-6",
      text:actionable,sourceId:source.id,
      sourceEvidenceId:"UNVERIFIED_OFFICIAL_PROCEDURE_ALTERNATIVE",
    });
  });
  it("does not grant fallback authority or accept marketing prose as recovery",()=>{
    const source=ftc("steps");
    const marketing="Credit monitoring services send your alerts whenever "+
      "the credit score changes in your credit reports.";
    const found=selectPostSemanticSourceNarrowingV1({
      sections:[sections[1]],claims:[contents[2],contents[3]],
      sources:[source],originalEvidence:[],demotedEvidenceIds:[],
      approvedClaimIds:[contents[2].id],
      officialAlternatives:[{
        sectionId:"section-6",sourceId:source.id,sourceUrl:source.url,
        text:marketing,
      }],
    });
    expect(found).toEqual([]);
    const untrusted=selectPostSemanticSourceNarrowingV1({
      sections:[sections[1]],claims:[contents[2],contents[3]],
      sources:[{...source,sourceType:"UGC",authorityTier:"F"}],
      originalEvidence:[],demotedEvidenceIds:[],
      approvedClaimIds:[contents[2].id],
      officialAlternatives:[{
        sectionId:"section-6",sourceId:source.id,sourceUrl:source.url,
        text:correction,
      }],
    });
    expect(untrusted).toEqual([]);
  });
  it("does not replace approved facts or use an alternate for a comparison section",()=>{
    const source=ftc("steps");
    const found=selectPostSemanticSourceNarrowingV1({
      sections:[sections[0]],claims:[contents[0],contents[1]],
      sources:[source],originalEvidence:[],demotedEvidenceIds:[],
      approvedClaimIds:[contents[0].id],
      officialAlternatives:[{
        sectionId:"section-5",sourceId:source.id,sourceUrl:source.url,
        text:correction,
      }],
    });
    expect(found).toEqual([]);
  });
  it("never selects unsupported or unreviewed source entries",()=>{
    const source=ftc("corrections");
    const result=selectPostSemanticSourceNarrowingV1({
      sections:[sections[1]],claims:[contents[3]],sources:[source],
      originalEvidence:[edge("e3",contents[3].id,source.id,correction)],
      demotedEvidenceIds:[],approvedClaimIds:[],
    });
    expect(result).toEqual([]);
  });
  it("rejects irrelevant notification descriptions as action steps",()=>{
    const source=ftc("alerts");
    const result=selectPostSemanticSourceNarrowingV1({
      sections:[sections[1]],claims:[contents[3]],sources:[source],
      originalEvidence:[edge("e3",contents[3].id,source.id,report)],
      demotedEvidenceIds:["e3"],approvedClaimIds:[],
    });
    expect(result).toEqual([]);
  });
  it("cannot rewrite an already-approved claim or reuse an untrusted source",()=>{
    const source:EvidenceSource={...ftc("choices"),
      sourceType:"UGC",authorityTier:"F"};
    const result=selectPostSemanticSourceNarrowingV1({
      sections:[sections[0]],claims:contents,sources:[source],
      originalEvidence:[edge("e1",contents[1].id,source.id,comparison)],
      demotedEvidenceIds:["e1"],
      approvedClaimIds:[contents[0].id,contents[1].id],
    });
    expect(result).toEqual([]);
  });
});
