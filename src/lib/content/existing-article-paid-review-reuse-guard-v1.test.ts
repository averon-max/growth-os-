import {describe,expect,it} from "vitest";
import {assessCompletedCitationReportReuseV1} from
  "./existing-article-paid-review-reuse-guard-v1";

const report={
  articleId:"existing-a",expectedSha:"a".repeat(64),
  status:"DRAFT_COMPLETE_SECTIONS_PENDING_CRITICS_AND_SERP_REPLAY",
  databaseUnchanged:true,commitAllowed:false,
  totalVisibleCitationLinks:13,stillUncitedSections:[],
};
const inspect=(saved:unknown,indices:number[])=>
  assessCompletedCitationReportReuseV1({
    articleId:"existing-a",originalSha256:"a".repeat(64),
    report:saved,outstandingRequiredSectionIndices:indices,
  });
describe("never repurchase a previously completed paid citation review",()=>{
  it("blocks duplicate billing if complete proposal survives but H2 checkpoints disappear",()=>{
    expect(inspect(report,[1,2,5])).toMatchObject({
      previouslyCompleted:true,blockNewModelCalls:true,
      unresolvedCheckpointIndices:[1,2,5],
    });
  });
  it("allows free replay of existing complete checkpoints",()=>{
    expect(inspect(report,[]).blockNewModelCalls).toBe(false);
  });
  it("does not trust another article, stale SHA or incomplete review",()=>{
    expect(inspect({...report,articleId:"other-a"},[1])
      .previouslyCompleted).toBe(false);
    expect(inspect({...report,expectedSha:"b".repeat(64)},[1])
      .previouslyCompleted).toBe(false);
    expect(inspect({...report,status:"NEEDS_ADDITIONAL_VERIFIED_SENTENCE_REVIEW"},[1])
      .previouslyCompleted).toBe(false);
    expect(inspect({...report,stillUncitedSections:[{sectionIndex:2}]},[1])
      .previouslyCompleted).toBe(false);
  });
  it("never uses the review report as actual signed evidence",()=>{
    const result=inspect(report,[1]);
    expect("proposedBodyMarkdown" in result).toBe(false);
    expect("commitAllowed" in result).toBe(false);
    expect(result.requiresManualCheckpointRecovery).toBe(true);
  });
});
