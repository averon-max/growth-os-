import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {selectPostSemanticSourceNarrowingV1,
  isReaderInitiatedResponseStepV1,
} from "./post-semantic-source-narrowing-v1";
import {
  isServiceChoiceSectionV1,
  isServiceChoiceSourceFactV1,
  scoreServiceChoiceDecisionFactV1,
  rankCreditMonitoringComparisonSentencesV1,
} from "./live-evidence-verification";
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
  it("reproduces the current cached preview: the FTC step still qualifies with only one topic token",()=>{
    const source=ftc("disputing-errors-your-credit-reports");
    const trueSentence="To correct mistakes in your report, contact the credit bureau and the business that reported the inaccurate information.";
    const narrowMission={
      id:"section-6",
      heading:"What should you do after a credit monitoring alert?",
      mission:"Explain actionable next steps and avoid unnecessary delays",
    };
    const result=selectPostSemanticSourceNarrowingV1({
      sections:[narrowMission],
      claims:[contents[2],contents[3]],
      sources:[source],originalEvidence:[],
      demotedEvidenceIds:[],approvedClaimIds:[contents[2].id],
      officialAlternatives:[{
        sectionId:"section-6",sourceId:source.id,
        sourceUrl:source.url,text:trueSentence,
      }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe(trueSentence);
    expect(result[0].claimId).toBe(contents[3].id);
  });
  it("recognizes the exact saved section-5 question and ranks real service-scope facts",()=>{
    const heading="What should you look for in a credit monitoring service?";
    const mission="Help readers identify service-scope questions before choosing or using a service.";
    expect(isServiceChoiceSectionV1(heading)).toBe(true);
    expect(isServiceChoiceSectionV1("What should you do after a credit monitoring alert?"))
      .toBe(false);
    const alertScope="Credit monitoring services may send alerts about new accounts and inquiries added to your credit report.";
    const costScope="Some credit monitoring services charge monthly fees, while other service plans offer free monitoring features.";
    const oldBureau="Some credit monitoring services with premium features cover all three bureaus instead of only one bureau.";
    const unknown="Insurance companies offer premium features and different policy discounts for vehicle ownership.";
    const ranked=rankCreditMonitoringComparisonSentencesV1({
      heading,mission,
      bodyText:[unknown,alertScope,costScope,oldBureau].join(" "),
    });
    expect(ranked).toContain(alertScope);
    expect(ranked).toContain(costScope);
    expect(ranked).not.toContain(unknown);
    const source=ftc("service-selection");
    const selected=selectPostSemanticSourceNarrowingV1({
      sections:[{id:"section-5",heading,mission}],
      claims:[contents[0],contents[1]],sources:[source],
      originalEvidence:[],demotedEvidenceIds:[],
      approvedClaimIds:[contents[0].id],
      comparisonAlternatives:[{
        sectionId:"section-5",sourceId:source.id,
        sourceUrl:source.url,text:oldBureau,
      },{
        sectionId:"section-5",sourceId:source.id,
        sourceUrl:source.url,text:alertScope,
      }],
    });
    expect(selected).toHaveLength(1);
    expect(selected[0].claimId).toBe(contents[1].id);
    expect(selected[0].text).toBe(alertScope);
    expect(selected[0].sourceEvidenceId)
      .toBe("UNVERIFIED_TRUSTED_COMPARISON_ALTERNATIVE");
  });
  it("chooses exact free-vs-paid functionality fact from the eight REAL section5 source previews",()=>{
    const heading="What should you look for in a credit monitoring service?";
    const mission="Help readers identify service-scope questions before choosing or using a service.";
    const equifax=ftc("educational-credit-monitoring");
    const chase=ftc("credit-journey");
    const quotes=[
      "Some things to consider when comparing credit monitoring services include: Cost.",
      "Credit monitoring services check for changes to your credit reports, including hard inquiries.",
      "Many credit monitoring services offer free trials, and this may be a good way to test out a service before paying for it.",
      "While you can get some basic credit monitoring services for free, you typically need to pay for more functionality.",
      "It's a good idea to combine credit monitoring with other protective measures, such as security freezes and fraud alerts, to help best protect yourself.",
      "Reading Time: 3 minutes Highlights In this article Highlights: Credit monitoring services track changes to your credit reports and alert you about the changes.",
      "We monitor changes to your credit limits, utilization and balances so you can help maintain your credit health.",
      "Consider signing up for Chase Credit Journey to help track and monitor activities that affect your credit score and credit report for free.",
    ];
    const flags=quotes.map(isServiceChoiceSourceFactV1);
    expect(flags).toEqual([false,true,true,true,false,false,false,false]);
    expect(scoreServiceChoiceDecisionFactV1(quotes[3]))
      .toBeGreaterThan(scoreServiceChoiceDecisionFactV1(quotes[2]));
    expect(rankCreditMonitoringComparisonSentencesV1({
      heading,mission,bodyText:quotes.join(" "),
    })).toContain(quotes[3]);
    const chosen=selectPostSemanticSourceNarrowingV1({
      sections:[{id:"section-5",heading,mission}],
      claims:[contents[0],contents[1]],
      sources:[equifax,chase],
      originalEvidence:[],demotedEvidenceIds:[],
      approvedClaimIds:[contents[0].id],
      comparisonAlternatives:quotes.map((text,i)=>({
        sectionId:"section-5",
        sourceId:i>=6?chase.id:equifax.id,
        sourceUrl:i>=6?chase.url:equifax.url,text,
      })),
    });
    expect(chosen).toHaveLength(1);
    expect(chosen[0].claimId).toBe(contents[1].id);
    expect(chosen[0].text).toBe(quotes[3]);
    expect(chosen[0].sourceEvidenceId)
      .toBe("UNVERIFIED_TRUSTED_COMPARISON_ALTERNATIVE");
  });
  it("recovers price and feature differences for choosing monitoring services",()=>{
    const source=ftc("monitoring-costs");
    const sentence="Credit monitoring services often charge monthly fees and different plans may provide different monitoring features.";
    const result=selectPostSemanticSourceNarrowingV1({
      sections:[sections[0]],claims:[contents[0],contents[1]],
      sources:[source],originalEvidence:[],demotedEvidenceIds:[],
      approvedClaimIds:[contents[0].id],
      comparisonAlternatives:[{
        sectionId:"section-5",sourceId:source.id,
        sourceUrl:source.url,text:sentence,
      }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].claimId).toBe(contents[1].id);
    expect(result[0].text).toBe(sentence);
    expect(result[0].sourceEvidenceId)
      .toBe("UNVERIFIED_TRUSTED_COMPARISON_ALTERNATIVE");
  });
  it("rejects off-topic prices and already-covered bureau-only statements",()=>{
    const source=ftc("costs");
    const invalid=[
      "Insurance services often charge monthly fees and different plans may provide various added features.",
      "Some monitoring services cover one bureau while other monitoring services cover all three bureaus.",
    ];
    const result=selectPostSemanticSourceNarrowingV1({
      sections:[sections[0]],claims:[contents[0],contents[1]],
      sources:[source],originalEvidence:[],demotedEvidenceIds:[],
      approvedClaimIds:[contents[0].id],
      comparisonAlternatives:invalid.map(text=>({
        sectionId:"section-5",sourceId:source.id,
        sourceUrl:source.url,text,
      })),
    });
    expect(result).toEqual([]);
  });
  it("chooses the actual FTC correction instruction from the eight real audited candidates",()=>{
    const ftcDispute=ftc("disputing-errors-your-credit-reports");
    const ftcIdentity=ftc("what-know-about-identity-theft");
    const cfpb:EvidenceSource={
      ...ftc("how-do-i-dispute"),
      id:"cfpb",publisher:"CFPB",
      url:"https://www.consumerfinance.gov/ask-cfpb/how-do-i-dispute-an-error-on-my-credit-report-en-314/",
    };
    // Real quotes from the user's free source diagnostic, in ranking order.
    const snippets=[
      {source:ftcDispute,text:"How To Correct Mistakes Your In Credit Reports Monitor Your Credit Reports Report Scams Is Your Credit Report Accurate?"},
      {source:ftcDispute,text:"Monitor Your Credit Reports Review your credit report to confirm that the credit bureau removed the inaccurate information from your report."},
      {source:ftcDispute,text:"If the business finds the information they reported is inaccurate, it must notify all three nationwide credit bureaus so they can correct the information in yourfile."},
      {source:ftcDispute,text:"If the credit bureau considers your request to be “frivolous” or “irrelevant,” they will stop investigating, but they need to notify you of that and give the reason."},
      {source:ftcIdentity,text:"Identity monitoring services Companies that offer identity monitoring services check databases that collect different types of information to see if they containnew or inaccurate information about you — including things that might not show up on your credit report."},
      {source:ftcIdentity,text:"Credit monitoring services Credit monitoring services keep an eye on your credit report and let you know if anything suspicious pops up."},
      {source:cfpb,text:"If the investigation shows the furnisher provided wrong information about you, or the information cannot be verified, the furnisher must update or remove the information and notify all the credit reporting companies after correcting it."},
      {source:ftcDispute,text:"To correct mistakes in your report, contact the credit bureau and the business that reported the inaccurate information."},
    ];
    expect(snippets.map(c=>isReaderInitiatedResponseStepV1(c.text)))
      .toEqual([false,false,false,false,false,false,false,true]);
    const chosen=selectPostSemanticSourceNarrowingV1({
      sections:[sections[1]],claims:[contents[2],contents[3]],
      sources:[ftcDispute,ftcIdentity,cfpb],
      originalEvidence:[],
      demotedEvidenceIds:[],
      approvedClaimIds:[contents[2].id],
      officialAlternatives:snippets.map(({source,text})=>({
        sectionId:"section-6",sourceId:source.id,
        sourceUrl:source.url,text,
      })),
    });
    expect(chosen).toHaveLength(1);
    expect(chosen[0].text).toBe(snippets[7].text);
    expect(chosen[0].sourceEvidenceId)
      .toBe("UNVERIFIED_OFFICIAL_PROCEDURE_ALTERNATIVE");
    expect(chosen[0].claimId).toBe(contents[3].id);
  });
  it("accepts clear reader-directed steps but rejects headings and institutional duties",()=>{
    expect(isReaderInitiatedResponseStepV1(
      "If you find an incorrect account on your credit report, you should contact the credit bureau to dispute the mistake."
    )).toBe(true);
    expect(isReaderInitiatedResponseStepV1(
      "Review your credit report to confirm that inaccurate information has been removed."
    )).toBe(true);
    expect(isReaderInitiatedResponseStepV1(
      "If the credit bureau finds an error, it must notify the other reporting agencies to correct the record."
    )).toBe(false);
    expect(isReaderInitiatedResponseStepV1(
      "Review Your Credit Report Contact Other Agencies Report Fraud?"
    )).toBe(false);
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
  it("keeps the official step preview read-only and excludes paid calls",()=>{
    const script=readFileSync(new URL(
      "../../../scripts/content-existing-article-official-response-facts-audit.ts",
      import.meta.url),"utf8");
    expect(script).toContain("collectOfficialPostSemanticProcedureAlternativesV1({");
    expect(script).toContain('id==="section-6"');
    expect(script).toContain("UNVERIFIED_SOURCE_CANDIDATE_ONLY");
    expect(script).toContain("aiCalls:0,dataForSeoCalls:0,databaseUnchanged:true");
    expect(script).not.toContain("buildSerpIntelligence(");
    expect(script).not.toContain("callContentAiJson(");
    expect(script).not.toContain("prisma.contentArticle.update(");
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
