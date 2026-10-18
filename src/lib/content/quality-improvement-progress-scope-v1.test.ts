import {describe,expect,it} from "vitest";
import {qualityImprovementProgressDirectoryV1,
  classifyVerifiedQualitySectionsV1}
  from "./same-article-quality-improvement-v1";
const scope={
  root:"/tmp/quality-checkpoints",
  articleId:"cmv606xg60006siqlir66uq23",
  briefId:"cmv606xbp0004siqlh7pbecns",
  updatedAt:"2026-10-15T03:18:03.844Z",
  article:{title:"Credit monitoring",metaDescription:"A detailed guide",
    h1:"What is credit monitoring?",bodyMarkdown:"## Scope\n\nOld prose."},
  snapshot:{verifiedClaim:"c1",evidence:"e1"},
  contract:{sections:[{id:"s1",claims:["c1"]}]},
  modelName:"gpt-5.6-luna",
};
describe("quality improvement incremental progress scope",()=>{
  it("uses stable deterministic directory for exact unchanged version",()=>{
    const first=qualityImprovementProgressDirectoryV1(scope);
    expect(first).toBe(qualityImprovementProgressDirectoryV1(scope));
    expect(first).toMatch(/quality-improvement\/[a-f0-9]{20}$/);
  });
  it("never reuses after article edit, version, research, plan, or model change",()=>{
    const original=qualityImprovementProgressDirectoryV1(scope);
    const drift=[
      {...scope,updatedAt:"2026-10-16T03:18:03.844Z"},
      {...scope,article:{...scope.article,bodyMarkdown:"Changed"}},
      {...scope,snapshot:{verifiedClaim:"c2",evidence:"e2"}},
      {...scope,contract:{sections:[{id:"s1",claims:["c2"]}]}},
      {...scope,modelName:"different-model"},
    ];
    for(const item of drift)
      expect(qualityImprovementProgressDirectoryV1(item)).not.toBe(original);
  });
  it("finds only changed already-planned sections for safe skip on resume",()=>{
    expect(classifyVerifiedQualitySectionsV1({
      originalBodies:["First","Second","Third"],
      currentBodies:["First extended","Second","Third improved"],
      plannedIndices:[0,2],
    })).toEqual([0,2]);
  });
  it("refuses unplanned section rewrite and changed H2 count",()=>{
    expect(()=>classifyVerifiedQualitySectionsV1({
      originalBodies:["First","Second"],
      currentBodies:["First","Unauthorized"],
      plannedIndices:[0],
    })).toThrow("QUALITY_PROGRESS_UNPLANNED_SECTION_CHANGE:1");
    expect(()=>classifyVerifiedQualitySectionsV1({
      originalBodies:["First"],currentBodies:[],
      plannedIndices:[0],
    })).toThrow("QUALITY_PROGRESS_SECTION_COUNT_DRIFT");
  });
});
