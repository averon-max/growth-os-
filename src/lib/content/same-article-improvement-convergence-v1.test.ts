import {describe,expect,it} from "vitest";
import {
  assessVerifiedDepthRevisionV1,
  selectRemainingQualityCompensationV1,
} from "./same-article-improvement-convergence-v1";

describe("same-ID verified global depth convergence",()=>{
  it("accepts actual source-verified 352-word section versus soft 361-word goal",()=>{
    const r=assessVerifiedDepthRevisionV1({
      originalWords:301,verifiedWords:352,
      plannedMinWords:361,maxWords:409,
    });
    expect(r).toMatchObject({
      accepted:true,gain:51,plannedLocalShortfall:9,
      reason:"ACCEPTED",
    });
  });
  it("refuses a long filler/no-value rewrite or words above evidence-bound max",()=>{
    expect(assessVerifiedDepthRevisionV1({
      originalWords:301,verifiedWords:306,
      plannedMinWords:361,maxWords:409,
    }).accepted).toBe(false);
    expect(assessVerifiedDepthRevisionV1({
      originalWords:301,verifiedWords:411,
      plannedMinWords:361,maxWords:409,
    }).reason).toBe("SECTION_EXCEEDS_SOURCE_BOUND_MAX");
  });
  it("selects spare verified capacity to compensate real underdelivered words",()=>{
    const sections=[
      {index:0,currentWords:352,maxWords:409,
        claimCount:3,evidenceCount:4,h3Count:0},
      {index:1,currentWords:327,maxWords:339,
        claimCount:3,evidenceCount:5,h3Count:1},
      {index:2,currentWords:276,maxWords:301,
        claimCount:2,evidenceCount:2,h3Count:0},
    ];
    const next=selectRemainingQualityCompensationV1({
      sections,usedIndices:[],minimumWords:2000,
      currentWords:1964,currentH3:1,
    });
    expect(next).toEqual({
      index:0,minWords:393,preferredWords:398,
      maxWords:409,remainingWords:36,remainingH3:1,
    });
  });
  it("permits H3-only structural repair only if it adds a verified useful H3",()=>{
    expect(assessVerifiedDepthRevisionV1({
      originalWords:310,verifiedWords:308,
      plannedMinWords:310,maxWords:340,
      h3Before:0,h3After:1,isCompensation:true,
    }).accepted).toBe(true);
    expect(assessVerifiedDepthRevisionV1({
      originalWords:310,verifiedWords:308,
      plannedMinWords:310,maxWords:340,
      h3Before:0,h3After:0,isCompensation:true,
    }).accepted).toBe(false);
  });
  it("limits compensation sections to evidenced capacity, never looping same section",()=>{
    const sections=[
      {index:0,currentWords:300,maxWords:360,
        claimCount:3,evidenceCount:2,h3Count:0},
      {index:1,currentWords:190,maxWords:300,
        claimCount:1,evidenceCount:5,h3Count:0},
    ];
    expect(selectRemainingQualityCompensationV1({
      sections,usedIndices:[0],minimumWords:2000,
      currentWords:1900,currentH3:0,
    })).toBeNull();
  });
});
