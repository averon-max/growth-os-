import {describe,expect,it} from "vitest";
import {inspectQualityKeywordRegressionV1,
  selectQualityKeywordRepairSectionV1}
  from "./same-article-quality-improvement-v1";
const original={
  title:"What is credit monitoring?",h1:"What is credit monitoring?",
  metaDescription:"Guide to credit monitoring",
  bodyMarkdown:"## Basics\n\nFree credit monitoring can provide notices.\n"+
    "## Coverage\n\n3 bureau credit monitoring may cover three bureaus.",
};
const keywords={primaryKeyword:"what is credit monitoring",
  secondaryKeywords:["free credit monitoring","3 bureau credit monitoring"]};
describe("source-bound keyword regression recovery",()=>{
  it("detects one lost exact secondary keyword with its original owning H2",()=>{
    const current={...original,
      bodyMarkdown:"## Basics\n\nFree credit monitoring can provide notices.\n"+
      "## Coverage\n\nMonitoring across all three bureaus may vary."};
    const r=inspectQualityKeywordRegressionV1({
      original,current,...keywords,
      originalSectionBodies:[
        "Free credit monitoring can provide notices.",
        "3 bureau credit monitoring may cover three bureaus.",
      ],editableSectionIndices:[0,1],
    });
    expect(r.originalUsed).toBe(3);
    expect(r.currentUsed).toBe(2);
    expect(r.restored).toBe(false);
    expect(r.losses).toEqual([expect.objectContaining({
      keyword:"3 bureau credit monitoring",
      originalOwningSections:[1],repairableOwningSections:[1],
    })]);
    expect(selectQualityKeywordRepairSectionV1(r.losses,[])).toBe(1);
    expect(selectQualityKeywordRepairSectionV1(r.losses,[1])).toBeNull();
  });
  it("refuses to insert a lost phrase into an unrelated new section",()=>{
    const missing={...original,
      bodyMarkdown:"## Basics\n\nA general notice.\n"+
        "## Coverage\n\nAll bureaus may be mentioned."};
    const r=inspectQualityKeywordRegressionV1({
      original,current:missing,...keywords,
      originalSectionBodies:[
        "Free credit monitoring can provide notices.",
        "3 bureau credit monitoring may cover three bureaus.",
      ],editableSectionIndices:[1],
    });
    expect(r.losses.find(x=>x.keyword==="free credit monitoring"))
      .toMatchObject({originalOwningSections:[0],
        repairableOwningSections:[]});
  });
  it("reconciles exact brief-keyword coverage without stuffing quotas",()=>{
    const r=inspectQualityKeywordRegressionV1({
      original,current:original,...keywords,
      originalSectionBodies:[
        "Free credit monitoring can provide notices.",
        "3 bureau credit monitoring may cover three bureaus.",
      ],editableSectionIndices:[0,1],
    });
    expect(r.restored).toBe(true);
    expect(r.losses).toHaveLength(0);
    expect(selectQualityKeywordRepairSectionV1([],[])).toBeNull();
  });
  it("fails closed on keyword that was never in original publication",()=>{
    const result=inspectQualityKeywordRegressionV1({
      original:{...original,
        bodyMarkdown:"## Basics\n\nGeneral details"},
      current:{...original,
        bodyMarkdown:"## Basics\n\nGeneral details"},
      ...keywords,originalSectionBodies:["General details"],
      editableSectionIndices:[0],
    });
    expect(result.restored).toBe(true);
    expect(result.losses).toEqual([]);
  });
});
