import {describe,expect,it} from "vitest";
import {mkdtemp,mkdir,rm,readFile,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {
  rebindCachedSourceReplanToCurrentQuotesV1,
  findCompatibleSourceReplanCheckpointV1,
} from "./source-replan-drift-checkpoint-v1";
import {saveExistingResearchPlanningCheckpointV1}
  from "./existing-article-research-checkpoint-v1";
import type {SourceGroundedReplanSectionV1}
  from "./source-grounded-claim-replan-v1";
import type {ResearchExpansionClaimV1}
  from "./existing-article-research-plan-v1";

const factual="While some credit monitoring services offer free basic monitoring, consumers may need to pay for extra features.";
const falseFact="All credit monitoring services protect every bank account against identity theft.";
const claims:ResearchExpansionClaimV1[]=[
  {id:"research-section-5-2",sectionId:"section-5",
    text:falseFact,risk:"LOW",category:"FACT"},
];
const packet=(text=factual,quoteId="quote-updated"):
  readonly SourceGroundedReplanSectionV1[]=>[{
  sectionId:"section-5",
  heading:"What should you look for in a credit monitoring service?",
  mission:"Identify scope and differences before selecting a service",
  claimIds:[claims[0].id],
  quotes:[{
    quoteId,claimId:claims[0].id,sourceId:"equifax-a",
    sourceUrl:"https://www.equifax.com/personal/education/credit-monitoring/",
    excerpt:text,coverage:0.94,
  }],
}];
const oldResponse=(quoteId="quote-archived",text=factual)=>JSON.stringify({
  replacements:[{claimId:claims[0].id,quoteId,text}],
});
describe("immutable paid source-model response across changes to live page excerpts",()=>{
  it("rebinding requires SAME claim ID, strict source matching and existing section owner",()=>{
    const result=rebindCachedSourceReplanToCurrentQuotesV1({
      cachedResponse:oldResponse(),packet:packet(),originalClaims:claims,
    });
    expect(result).not.toBeNull();
    expect(result?.reusedExistingQuoteIds).toBe(0);
    expect(result?.reboundStrictQuoteIds).toBe(1);
    expect(JSON.parse(result!.response).replacements[0].quoteId)
      .toBe("quote-updated");
  });
  it("preserves unchanged quote ID and never calls a model",()=>{
    const result=rebindCachedSourceReplanToCurrentQuotesV1({
      cachedResponse:oldResponse("quote-updated"),
      packet:packet(),originalClaims:claims,
    });
    expect(result?.reusedExistingQuoteIds).toBe(1);
    expect(result?.reboundStrictQuoteIds).toBe(0);
  });
  it("fails closed on unrelated claims and unsupported new quotes",()=>{
    const unrelated=JSON.stringify({
      replacements:[{claimId:"research-section-4-0",
        quoteId:"quote-archived",text:factual}],
    });
    expect(rebindCachedSourceReplanToCurrentQuotesV1({
      cachedResponse:unrelated,packet:packet(),originalClaims:claims,
    })).toBeNull();
    expect(rebindCachedSourceReplanToCurrentQuotesV1({
      cachedResponse:oldResponse(),
      packet:packet(
        "A credit monitoring provider may notify customers about a change to a credit report.",
        "quote-updated"),originalClaims:claims,
    })).toBeNull();
  });
  it("loads only integrity-verified old checkpoints scoped to unchanged article/brief/version",async()=>{
    const root=await mkdtemp(join(tmpdir(),"source-grounded-drift-"));
    const scope={
      articleId:"cmv606xg60006siqlir66uq23",
      briefId:"cmv606xbp0004siqlh7pbecns",
      updatedAt:"2026-10-13T02:38:04.855Z",
    };
    const oldHash="a".repeat(64);
    const dir=join(root,oldHash.slice(0,20));
    try{
      await mkdir(dir,{recursive:true});
      await saveExistingResearchPlanningCheckpointV1({
        ...scope,evidenceSha256:oldHash,directory:dir,
      },oldResponse());
      const found=await findCompatibleSourceReplanCheckpointV1({
        scope,packet:packet(),originalClaims:claims,
        sourceRootDirectory:root,
      });
      expect(found?.reboundStrictQuoteIds).toBe(1);
      const wrongVersion=await findCompatibleSourceReplanCheckpointV1({
        scope:{...scope,updatedAt:"2026-10-13T02:38:05.855Z"},
        packet:packet(),originalClaims:claims,sourceRootDirectory:root,
      });
      expect(wrongVersion).toBeNull();
      const path=join(dir,scope.articleId+"-planning.json");
      const modified=JSON.parse(await readFile(path,"utf8"));
      modified.payload.response=oldResponse("quote-archived",
        "All fraud alerts and identity theft protections are entirely free.");
      await writeFile(path,JSON.stringify(modified),"utf8");
      const tampered=await findCompatibleSourceReplanCheckpointV1({
        scope,packet:packet(),originalClaims:claims,
        sourceRootDirectory:root,
      });
      expect(tampered).toBeNull();
    }finally{
      await rm(root,{force:true,recursive:true});
    }
  });
});
