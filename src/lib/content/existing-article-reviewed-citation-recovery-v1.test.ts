import {describe,expect,it} from "vitest";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {loadReviewedSignedCitationDraftV1} from "./existing-article-reviewed-citation-recovery-v1";
import {draftExistingArticleSignedCitationsV1} from
  "./existing-article-source-citation-repair-v1";
import {buildSignedSemanticCitationWorklistV1} from
  "./existing-article-semantic-citation-v1";
import {semanticCitationCheckpointKeyV1} from
  "./existing-article-semantic-citation-checkpoint-v1";
import type {ArticleExecutionPlanV1} from "./article-execution-plan-v1";
import type {MasterRuntimeSnapshotV1} from "./master-runtime-adapter";

const articleId="existing-review-article";
const text="## What happens after a credit alert?\n\n"+
  "If your credit report has an incorrect entry, you can dispute that item with the reporting agency.";
const plan={sections:[{
  state:"WRITABLE",heading:"What happens after a credit alert?",
  evidenceIds:["ev1"],requiredClaimIds:["claim1"],
}]} as unknown as ArticleExecutionPlanV1;
const runtime={
  claimLedger:{claims:[{
    id:"claim1",status:"VERIFIED",
    text:"Consumers may dispute inaccurate entries on their credit reports.",
  }]},
  evidenceGraph:{
    sources:[{id:"source1",url:"https://consumer.ftc.gov/report-errors",
      publisher:"FTC"}],
    claimEvidence:[{id:"ev1",sourceId:"source1",claimId:"claim1",
      kind:"VERIFIED_EXCERPT",relation:"SUPPORTS",
      excerpt:"You may dispute inaccurate information on your credit report."}],
  },
} as unknown as MasterRuntimeSnapshotV1;
describe("reviewed signed same-article recovery cannot trust loose markdown",()=>{
  it("requires exact saved article + signed source checkpoints and assembles only linked sentences",async()=>{
    const directory=await mkdtemp(join(tmpdir(),"reviewed-citation-"));
    try{
      const exact=draftExistingArticleSignedCitationsV1({
        bodyMarkdown:text,plan,runtime,
      });
      const worklist=buildSignedSemanticCitationWorklistV1({
        bodyMarkdown:exact.proposedBodyMarkdown,plan,runtime,
      });
      expect(worklist[0]!.availableSources).toHaveLength(1);
      const key=semanticCitationCheckpointKeyV1({
        articleId,
        originalArticleSha256:createHash("sha256")
          .update(text+"\n").digest("hex"),
        section:worklist[0]!,
      });
      await writeFile(join(directory,"0-"+key+".json"),JSON.stringify({
        reviewKey:key,sectionIndex:0,choices:[{
          claimId:"claim1",evidenceId:"ev1",sentenceId:0,
          verdict:"SUPPORTED",reason:"The verified excerpt entails disputing a credit error.",
        }],
      }));
      const report=await loadReviewedSignedCitationDraftV1({
        articleId,bodyMarkdown:text,plan,runtime,
        checkpointDirectory:directory,
      });
      expect(report.totalAddedCitations).toBe(1);
      expect(report.evidenceSourceScope.completeSectionCitationCoverage)
        .toBe(true);
      expect(report.proposedBodyMarkdown).toContain(
        "[Source: FTC](https://consumer.ftc.gov/report-errors)");
      expect(report.commitAllowed).toBe(false);
      await expect(loadReviewedSignedCitationDraftV1({
        articleId,bodyMarkdown:text.replace("incorrect","unexpected"),
        plan,runtime,checkpointDirectory:directory,
      })).rejects.toThrow(
        "SIGNED_CITATION_REVIEW_CHECKPOINT_MISSING_OR_UNREADABLE_H2");
    }finally{await rm(directory,{recursive:true,force:true});}
  });
  it("fails with missing review checkpoint rather than making a paid request",async()=>{
    const directory=await mkdtemp(join(tmpdir(),"reviewed-citation-empty-"));
    try{
      await expect(loadReviewedSignedCitationDraftV1({
        articleId,bodyMarkdown:text,plan,runtime,
        checkpointDirectory:directory,
      })).rejects.toThrow("SIGNED_CITATION_REVIEW_CHECKPOINT_MISSING_OR_UNREADABLE_H2");
    }finally{await rm(directory,{recursive:true,force:true});}
  });
});
