import {describe,expect,it} from "vitest";
import {planPostEditorialDepthRecoveryV1}
  from "./quality-improvement-post-editorial-depth-v1";
const sections=[
  {index:0,sectionWords:380,verifiedClaims:3,assignedEvidence:4},
  {index:1,sectionWords:310,verifiedClaims:3,assignedEvidence:5},
  {index:2,sectionWords:200,verifiedClaims:2,assignedEvidence:2},
  {index:3,sectionWords:421,verifiedClaims:4,assignedEvidence:5},
  {index:4,sectionWords:282,verifiedClaims:2,assignedEvidence:4},
  {index:5,sectionWords:310,verifiedClaims:2,assignedEvidence:2},
];
describe("post-editorial global depth recovery",()=>{
  it("recovers real 1952-word after-dedup case without replacing entire Writer",()=>{
    const result=planPostEditorialDepthRecoveryV1({
      articleWords:1952,minArticleWords:2000,
      maxArticleWords:3200,sections,
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      index:3,currentSectionWords:421,
      desiredAdditionalWords:72,targetSectionWords:493,
    });
    expect(result[1].index).toBe(0);
  });
  it("never adds filler if the whole article already meets its floor",()=>{
    expect(planPostEditorialDepthRecoveryV1({
      articleWords:2000,minArticleWords:2000,
      maxArticleWords:3200,sections,
    })).toEqual([]);
  });
  it("refuses to fabricate new facts when there is no assigned evidence",()=>{
    const out=planPostEditorialDepthRecoveryV1({
      articleWords:1952,minArticleWords:2000,maxArticleWords:3200,
      sections:sections.map(s=>({...s,assignedEvidence:0})),
    });
    expect(out).toEqual([]);
  });
  it("caps AI candidates, respects hard total max and rejects bad budgets",()=>{
    expect(planPostEditorialDepthRecoveryV1({
      articleWords:1952,minArticleWords:2000,
      maxArticleWords:3200,sections,maxAttempts:1,
    })).toHaveLength(1);
    expect(planPostEditorialDepthRecoveryV1({
      articleWords:1952,minArticleWords:2000,
      maxArticleWords:2005,sections,
    })).toEqual([]);
    expect(()=>planPostEditorialDepthRecoveryV1({
      articleWords:1952,minArticleWords:2000,
      maxArticleWords:3200,sections,maxAttempts:10,
    })).toThrow("POST_EDITORIAL_DEPTH_INVALID_CONSTRAINTS");
  });
});
