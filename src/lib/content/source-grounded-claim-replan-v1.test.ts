import {describe,expect,it} from "vitest";
import {
  buildSourceGroundedReplanPacketV1,
  validateSourceGroundedClaimReplanV1,
  recoverSourceGroundedClaimReplanFromCachedModelV1,
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
  it("fills a second fact in a shallow section using an unused authoritative quote",()=>{
    const additional:ResearchExpansionClaimV1={
      id:"c1-more",sectionId:"s1",category:"FACT",risk:"LOW",
      text:"Credit monitoring prevents every fraudulent account before it opens.",
    };
    const secondSource="Credit monitoring can notify consumers when a new "+
      "credit inquiry appears, but it does not prevent fraudulent accounts.";
    const localClaims=[claims[0],additional,claims[1]];
    const result=buildSourceGroundedReplanPacketV1({
      sections:[
        {id:"s1",heading:"Credit monitoring and alerts",
          mission:"Explain alerts and limits"},
        {id:"s2",heading:"After credit alerts",
          mission:"What to do with inaccurate accounts"},
      ],claims:localClaims,
      candidates:[
        {claimId:"c1",sourceId:"ftc",
          sourceUrl:src("ftc","PRIMARY_GOVERNMENT","A").url,
          excerpt:quote1,coverage:0.5},
        {claimId:"c1-more",sourceId:"cfpb",
          sourceUrl:src("cfpb","PRIMARY_GOVERNMENT","A").url,
          excerpt:secondSource,coverage:0.5},
        {claimId:"c2",sourceId:"ftc",
          sourceUrl:src("ftc","PRIMARY_GOVERNMENT","A").url,
          excerpt:quote2,coverage:0.5},
      ],sources:[
        src("ftc","PRIMARY_GOVERNMENT","A"),
        src("cfpb","PRIMARY_GOVERNMENT","A"),
      ],
    });
    const modelQuote=result[0].quotes.find(q=>q.claimId==="c1")!;
    const otherQuote=result[0].quotes.find(q=>q.claimId==="c1-more")!;
    expect(modelQuote.quoteId).not.toBe(otherQuote.quoteId);
    const recovered=recoverSourceGroundedClaimReplanFromCachedModelV1({
      packet:result,originalClaims:localClaims,replacements:[
        {claimId:"c1",quoteId:modelQuote.quoteId,text:quote1},
        {claimId:"c2",quoteId:result[1].quotes[0].quoteId,text:quote2},
      ],
    });
    expect(recovered.claims.find(c=>c.id==="c1-more")?.text)
      .toBe(secondSource);
    expect(recovered.acceptedModelRestatements).toBe(2);
    expect(recovered.literalSourceFallbacks).toBe(1);
    expect(recovered.fallbackDetails).toContainEqual({
      sectionId:"s1",claimId:"c1-more",sourceId:"cfpb",
      reason:"SECOND_SECTION_FACT_FROM_DISTINCT_LITERAL_SOURCE",
    });
  });
  it("refuses to fake a second fact from a duplicate source sentence",()=>{
    const additional:ResearchExpansionClaimV1={
      id:"c1-more",sectionId:"s1",category:"FACT",risk:"LOW",
      text:"Credit monitoring prevents every fraudulent account before it opens.",
    };
    const result=buildSourceGroundedReplanPacketV1({
      sections:[
        {id:"s1",heading:"Credit monitoring",mission:"How alerts work"},
        {id:"s2",heading:"Responding to alerts",mission:"Dispute incorrect items"},
      ],claims:[claims[0],additional,claims[1]],
      candidates:[
        {claimId:"c1",sourceId:"ftc",
          sourceUrl:src("ftc","PRIMARY_GOVERNMENT","A").url,
          excerpt:quote1,coverage:0.5},
        {claimId:"c1-more",sourceId:"cfpb",
          sourceUrl:src("cfpb","PRIMARY_GOVERNMENT","A").url,
          excerpt:quote1,coverage:0.5},
        {claimId:"c2",sourceId:"ftc",
          sourceUrl:src("ftc","PRIMARY_GOVERNMENT","A").url,
          excerpt:quote2,coverage:0.5},
      ],sources:[
        src("ftc","PRIMARY_GOVERNMENT","A"),
        src("cfpb","PRIMARY_GOVERNMENT","A"),
      ],
    });
    const recovered=recoverSourceGroundedClaimReplanFromCachedModelV1({
      packet:result,originalClaims:[claims[0],additional,claims[1]],
      replacements:[
        {claimId:"c1",quoteId:result[0].quotes.find(q=>q.claimId==="c1")!.quoteId,
          text:quote1},
        {claimId:"c2",quoteId:result[1].quotes[0].quoteId,text:quote2},
      ],
    });
    expect(recovered.literalSourceFallbacks).toBe(0);
    expect(recovered.claims.find(c=>c.id==="c1-more")?.text)
      .toBe(additional.text);
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

  it("rescues a cached paid paraphrase with its EXACT sourced sentence without a model call",()=>{
    const result=packet();
    const recovered=recoverSourceGroundedClaimReplanFromCachedModelV1({
      packet:result,originalClaims:claims,
      replacements:[
        {claimId:"c1",quoteId:result[0].quotes[0].quoteId,
          text:"Credit monitoring always prevents identity theft before it happens."},
        {claimId:"c2",quoteId:result[1].quotes[0].quoteId,text:quote2},
      ],
    });
    expect(recovered.literalSourceFallbacks).toBe(1);
    expect(recovered.acceptedModelRestatements).toBe(1);
    expect(recovered.claims[0].id).toBe("c1");
    expect(recovered.claims[0].text).toBe(quote1);
    expect(recovered.fallbackDetails[0].sourceId).toBe("ftc");
  });
  it("reuses a cached source sentence for the ONE model-omitted section of four",()=>{
    const c3:ResearchExpansionClaimV1={
      id:"c3",sectionId:"s3",category:"FACT",risk:"LOW",
      text:"Credit monitoring prevents all account fraud.",
    };
    const c4:ResearchExpansionClaimV1={
      id:"c4",sectionId:"s4",category:"FACT",risk:"LOW",
      text:"Monitoring only checks changes to current bank balances.",
    };
    const quote3="Credit monitoring may alert you to changes in a credit "+
      "report, but it does not prevent identity theft.";
    const quote4="A credit monitoring service can alert you when a new "+
      "inquiry appears in your credit report.";
    const allClaims=[...claims,c3,c4];
    const four=buildSourceGroundedReplanPacketV1({
      sections:[
        {id:"s1",heading:"How monitoring works",mission:"Alert delivery"},
        {id:"s2",heading:"After credit alerts",mission:"Disputing errors"},
        {id:"s3",heading:"Monitoring limits",mission:"Does not prevent theft"},
        {id:"s4",heading:"Credit monitoring coverage",mission:"New credit inquiries"},
      ],claims:allClaims,
      candidates:[
        {claimId:"c1",sourceId:"ftc",sourceUrl:src("ftc","PRIMARY_GOVERNMENT","A").url,
          excerpt:quote1,coverage:0.45},
        {claimId:"c2",sourceId:"cfpb",sourceUrl:src("cfpb","PRIMARY_GOVERNMENT","A").url,
          excerpt:quote2,coverage:0.45},
        {claimId:"c3",sourceId:"gov3",sourceUrl:src("gov3","PRIMARY_GOVERNMENT","A").url,
          excerpt:quote3,coverage:0.45},
        {claimId:"c4",sourceId:"gov4",sourceUrl:src("gov4","PRIMARY_GOVERNMENT","A").url,
          excerpt:quote4,coverage:0.45},
      ],sources:["ftc","cfpb","gov3","gov4"].map(id=>
        src(id,"PRIMARY_GOVERNMENT","A")),
    });
    const recovered=recoverSourceGroundedClaimReplanFromCachedModelV1({
      packet:four,originalClaims:allClaims,replacements:[
        {claimId:"c1",quoteId:four[0].quotes[0].quoteId,text:quote1},
        {claimId:"c2",quoteId:four[1].quotes[0].quoteId,text:quote2},
        {claimId:"c3",quoteId:four[2].quotes[0].quoteId,text:quote3},
      ],
    });
    expect(recovered.acceptedModelRestatements).toBe(3);
    expect(recovered.literalSourceFallbacks).toBe(1);
    expect(recovered.claims).toHaveLength(4);
    expect(recovered.claims.find(c=>c.id==="c4")?.text).toBe(quote4);
    expect(recovered.fallbackDetails).toContainEqual({
      sectionId:"s4",claimId:"c4",sourceId:"gov4",
      reason:"MODEL_OMITTED_SECTION_RECOVERED_FROM_LITERAL_SOURCE",
    });
  });
  it("fails closed if an omitted section has only off-topic literal text",()=>{
    const result=packet().map((section,index)=>index===1
      ?{...section,quotes:section.quotes.map(q=>({
        ...q,excerpt:"The weather in Calgary is usually cold and windy "+
          "during the winter months.",
      }))}:section);
    expect(()=>recoverSourceGroundedClaimReplanFromCachedModelV1({
      packet:result,originalClaims:claims,replacements:[
        {claimId:"c1",quoteId:result[0].quotes[0].quoteId,text:quote1},
      ],
    })).toThrow("MISSING_SECTION_WITHOUT_STRICT_RELEVANT_QUOTE:s2");
  });
  it("never treats a completely omitted model response as verified research",()=>{
    expect(()=>recoverSourceGroundedClaimReplanFromCachedModelV1({
      packet:packet(),originalClaims:claims,replacements:[],
    })).toThrow("NO_MODEL_SECTION_REPLACEMENTS");
  });

  it("cannot rescue an invented source/claim cross-link or make up a missing quote",()=>{
    const result=packet();
    expect(()=>recoverSourceGroundedClaimReplanFromCachedModelV1({
      packet:result,originalClaims:claims,
      replacements:[
        {claimId:"c1",quoteId:result[1].quotes[0].quoteId,
          text:"Credit monitoring prevents identity theft."},
        {claimId:"c2",quoteId:result[0].quotes[0].quoteId,text:quote2},
      ],
    })).toThrow("MODEL_UNAUTHORIZED_CLAIM_OR_QUOTE");
    const unusable=result.map((section,index)=>index===0
      ?{...section,quotes:section.quotes.map((quote,quoteIndex)=>
        quoteIndex===0?{...quote,excerpt:"Unknown fact."}:quote)}
      :section);
    expect(()=>recoverSourceGroundedClaimReplanFromCachedModelV1({
      packet:unusable,originalClaims:claims,
      replacements:[
        {claimId:"c1",quoteId:unusable[0].quotes[0].quoteId,
          text:"Credit monitoring prevents identity theft."},
        {claimId:"c2",quoteId:unusable[1].quotes[0].quoteId,text:quote2},
      ],
    })).toThrow("NO_STRICT_LITERAL_SOURCE_FACT_FOR:c1");
  });
  it("recovers two assigned fact sentences without inventing a third",()=>{
    const extra:ResearchExpansionClaimV1={
      id:"c1more",sectionId:"s1",category:"FACT",risk:"LOW",
      text:"All credit monitoring services stop new-account fraud.",
    };
    const source2="Credit monitoring tools may send notifications when "+
      "changes appear in your credit report.";
    const localClaims=[claims[0],extra,claims[1]];
    const result=buildSourceGroundedReplanPacketV1({
      sections:[
        {id:"s1",heading:"Credit monitoring",mission:"What the service does"},
        {id:"s2",heading:"Responding to alerts",mission:"Disputing errors"},
      ],
      claims:localClaims,
      candidates:[
        {claimId:"c1",sourceId:"ftc",sourceUrl:src("ftc","PRIMARY_GOVERNMENT","A").url,
          excerpt:quote1,coverage:0.5},
        {claimId:"c1more",sourceId:"cfpb",sourceUrl:src("cfpb","PRIMARY_GOVERNMENT","A").url,
          excerpt:source2,coverage:0.5},
        {claimId:"c2",sourceId:"ftc",sourceUrl:src("ftc","PRIMARY_GOVERNMENT","A").url,
          excerpt:quote2,coverage:0.5},
      ],
      sources:[src("ftc","PRIMARY_GOVERNMENT","A"),
        src("cfpb","PRIMARY_GOVERNMENT","A")],
    });
    const quoteMore=result[0].quotes.find(q=>q.claimId==="c1more")!;
    const quoteFirst=result[0].quotes.find(q=>q.claimId==="c1")!;
    const recovered=recoverSourceGroundedClaimReplanFromCachedModelV1({
      packet:result,originalClaims:localClaims,
      replacements:[
        {claimId:"c1",quoteId:quoteFirst.quoteId,
          text:"The service prevents all unauthorized changes."},
        {claimId:"c1more",quoteId:quoteMore.quoteId,
          text:"Credit monitoring always stops financial fraud."},
        {claimId:"c2",quoteId:result[1].quotes[0].quoteId,text:quote2},
      ],
    });
    expect(recovered.literalSourceFallbacks).toBe(2);
    expect(recovered.claims).toHaveLength(3);
    expect(recovered.claims[0].text).toBe(quote1);
    expect(recovered.claims[1].text).toBe(source2);
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
