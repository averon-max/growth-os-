import {describe,expect,it} from "vitest";
import {detectHighConfidenceEditorialRepetitionV1,
  type EditorialRepetitionFindingV1}
  from "./editorial-repetition-guard-v1";
import {selectQualityEditorialRepairSectionsV1,
  isQualityEditorialFindingResolvedV1}
  from "./same-article-quality-improvement-v1";
const finding:EditorialRepetitionFindingV1={
  code:"EDITORIAL_REPHRASED_BOILERPLATE_ACROSS_SECTIONS",
  sectionIndex:4,
  affectedSections:[0,2,4,5],
  repeatedPhrases:["the same repeated advice across parts"],
};
describe("source-bound incremental editorial convergence",()=>{
  it("can repair only preselected Writer sections, not arbitrary unchanged H2",()=>{
    expect(selectQualityEditorialRepairSectionsV1({
      finding,plannedIndices:[0,1,2,3,5],alreadyAttempted:[],
    })).toEqual([0,2,5]);
  });
  it("skips tried sections and never rewrites an unplanned topic",()=>{
    expect(selectQualityEditorialRepairSectionsV1({
      finding,plannedIndices:[0,1,2,3,5],alreadyAttempted:[0,2],
    })).toEqual([5]);
    expect(selectQualityEditorialRepairSectionsV1({
      finding,plannedIndices:[1,3],alreadyAttempted:[],
    })).toEqual([]);
  });
  it("requires real detectable editorial improvement, no guard bypass",()=>{
    expect(isQualityEditorialFindingResolvedV1({
      before:[finding],after:[],
    })).toBe(true);
    expect(isQualityEditorialFindingResolvedV1({
      before:[finding],after:[{...finding,repeatedPhrases:["different"]}],
    })).toBe(false);
    expect(isQualityEditorialFindingResolvedV1({
      before:[],after:[],
    })).toBe(false);
  });
  it("still catches substantive verbatim paragraph reuse across sections",()=>{
    const copied="The action should be considered only after confirming "+
      "which account is affected and reviewing the verified source, "+
      "because alerts can be incomplete and some changes require "+
      "additional investigation before contacting the relevant institution.";
    const r=detectHighConfidenceEditorialRepetitionV1([
      {heading:"Part 1",bodyMarkdown:copied},
      {heading:"Part 2",bodyMarkdown:copied},
    ]);
    expect(r[0].code).toBe("EDITORIAL_REPEATED_PARAGRAPH_ACROSS_SECTIONS");
    expect(r[0].affectedSections).toEqual([0,1]);
  });
});
